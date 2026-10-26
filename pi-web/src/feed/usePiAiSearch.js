import {useEffect, useState} from 'react';
import {getListings, piAiSearchListings} from '../api/client';
import {hasFeedContent} from './listingRules';
import {
  buildListingAiSummary,
  buildPiAiFilterEmptyMessage,
  buildPiAiSearchingMessage,
  filterListingsByParsedQuery,
  filterPiAiSearchListings,
  inferPiAiQueryConstraints,
  parsePiAiQuery,
  rankListingsByQuery,
} from './piAiMatchListings';

const IDLE = {status: 'idle', query: '', rows: [], message: ''};

let catalogPromise = null;

/** Every published ad (all categories), loaded once — like PiAiSearchModal's allListings. */
function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = getListings({status: 'published', timeoutMs: 45000})
      .then(res => filterPiAiSearchListings(res?.listings || []).filter(hasFeedContent))
      .catch(error => {
        catalogPromise = null;
        throw error;
      });
  }
  return catalogPromise;
}

/** PiAiSearchModal.runSearch: local hard constraints → Gemini ranking → keyword fallback. */
async function runPiAiSearch(q, signal) {
  const listings = await loadCatalog();
  const parsed = parsePiAiQuery(q);
  const searchPool = filterListingsByParsedQuery(listings, parsed, q);
  if (searchPool.length === 0) {
    return {
      rows: [],
      message:
        buildPiAiFilterEmptyMessage(parsed, listings.length, q) || `חיפשתי ב-${listings.length} מודעות ולא מצאתי התאמה.`,
    };
  }

  let rows = null;
  let aiSaidNoMatch = false;
  const ai = await piAiSearchListings(q, searchPool.map(buildListingAiSummary), {signal});
  if (ai.success) {
    const byId = new Map(searchPool.filter(l => l?.id != null).map(l => [String(l.id), l]));
    const matched = (ai.ids || []).map(id => byId.get(String(id))).filter(Boolean);
    if (matched.length) rows = matched;
    else aiSaidNoMatch = true;
  }
  if (rows == null && !aiSaidNoMatch) {
    rows = rankListingsByQuery(q, searchPool, {topN: 20})
      .ranked.filter(r => r.score >= 6)
      .map(r => r.listing);
  }

  if ((!rows || rows.length === 0) && searchPool.length) {
    const c = inferPiAiQueryConstraints(q);
    // The pool already satisfies every hard constraint, so it is a valid answer.
    const hasHardNumbers =
      c.rooms != null || c.area != null || c.floor != null || c.price != null || c.amenities != null;
    if (hasHardNumbers) {
      const ranked = rankListingsByQuery(q, searchPool, {topN: 20}).ranked;
      rows = ranked.length ? ranked.map(r => r.listing) : searchPool.slice(0, 20);
    }
  }

  if (!rows || rows.length === 0) {
    return {
      rows: [],
      message: `חיפשתי ב-${searchPool.length} מודעות ולא מצאתי התאמה ברורה. נסה לפרט יותר — שם עיר, טווח מחיר, או מספר חדרים.`,
    };
  }
  return {rows, message: ''};
}

/** "חיפוש מודעה" — the mobile Pi AI search over the whole catalog. */
export function usePiAiSearch(query) {
  const [state, setState] = useState(IDLE);
  const q = String(query || '').trim();

  useEffect(() => {
    if (!q) {
      setState(IDLE);
      return undefined;
    }
    const controller = new AbortController();
    setState({status: 'loading', query: q, rows: [], message: buildPiAiSearchingMessage(q, parsePiAiQuery(q))});
    runPiAiSearch(q, controller.signal)
      .then(({rows, message}) => {
        if (!controller.signal.aborted) setState({status: 'ready', query: q, rows, message});
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({status: 'error', query: q, rows: [], message: 'החיפוש נכשל. בדוק את החיבור ונסה שוב.'});
        }
      });
    return () => controller.abort();
  }, [q]);

  return state;
}
