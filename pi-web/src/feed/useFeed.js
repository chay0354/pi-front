import {useEffect, useMemo, useState} from 'react';
import {getListings} from '../api/client';
import {
  excludeSalesImageCompanionListings,
  hasFeedContent,
  isFeedPost,
  isNewConditionListing,
  isVideoAdListing,
  mergeListingRows,
  toFeedItem,
} from './listingRules';
import {applyFeedFilters} from './feedFilters';
import {
  isNewsSidebarFilterDef,
  isRenderingsSidebarFilterDef,
  sidebarFiltersForCategory,
} from './sidebarFilters';

const isCompany = l => String(l?.subscription_type || '').toLowerCase() === 'company';
const hasVideo = l =>
  Boolean(l?.video_url || l?.video_playback_url || (l?.listing_videos || []).length);

/** Same request plan as the mobile feed (TikTokFeedScreen loadListings). */
async function fetchRows(category, filter, videoOnly, signal) {
  const newsActive = isNewsSidebarFilterDef(filter);
  const renderingsActive = isRenderingsSidebarFilterDef(filter);

  if (renderingsActive) {
    const res = await getListings({
      status: 'published',
      subscription_type: 'company',
      has_video: true,
      signal,
    });
    return res?.listings || [];
  }

  if (newsActive && category != null) {
    const res = await getListings({
      category,
      status: 'published',
      subscription_type: 'company',
      has_video: videoOnly,
      signal,
    });
    const rows = [...(res?.listings || [])];
    if (res?.success && !res?.offline) {
      const [cat1, regularNew] = await Promise.all([
        getListings({category: 1, status: 'published', has_video: videoOnly, signal}),
        getListings({
          status: 'published',
          subscription_type: 'user',
          condition: 'new',
          has_video: videoOnly,
          signal,
        }),
      ]);
      if (cat1?.success) mergeListingRows(rows, cat1.listings);
      if (regularNew?.success) mergeListingRows(rows, regularNew.listings);
    }
    return rows;
  }

  const res = await getListings({
    category,
    status: 'published',
    subscription_type: filter?.subscription_type,
    has_video: filter?.has_video === true || videoOnly,
    condition: filter?.condition,
    search_purpose: filter?.search_purpose,
    feed_post: filter?.feed_post === true,
    hospitality_nature: filter?.hospitality_nature,
    land_in_mortgage: filter?.land_in_mortgage,
    permit: filter?.permit,
    plan_approval: filter?.plan_approval,
    signal,
  });
  return res?.listings || [];
}

function applySidebarRules(rows, filter) {
  if (!filter) return rows;
  let out = rows;
  if (filter.feed_post === true) out = out.filter(isFeedPost);
  else if (filter.ads_only === true) out = out.filter(l => !isFeedPost(l));

  if (filter.feed_post === true && String(filter.subscription_type) === 'professional') {
    out = out.filter(l => String(l.subscription_type || '').toLowerCase() === 'professional');
  }
  if (filter.id === 'new' && !isNewsSidebarFilterDef(filter)) {
    out = out.filter(isNewConditionListing);
  }
  if (filter.id === 'presale') {
    out = out.filter(l => isCompany(l) && l.sale_at_presale === true);
  } else if (filter.id === 'built') {
    out = out.filter(l => isCompany(l) && constructionStatusMatches(l, 'built'));
  } else if (filter.id === 'under_construction') {
    out = out.filter(l => isCompany(l) && constructionStatusMatches(l, 'beginning_of_construction'));
  } else if (isRenderingsSidebarFilterDef(filter)) {
    out = out.filter(l => isCompany(l) && !isFeedPost(l) && hasVideo(l));
  }
  for (const key of ['land_in_mortgage', 'permit', 'hospitality_nature', 'search_purpose']) {
    if (!filter[key]) continue;
    const need = String(filter[key]).trim();
    out = out.filter(l => l[key] != null && String(l[key]).trim() === need);
  }
  return out;
}

/** Mobile companyConstructionStatusMatches. */
function constructionStatusMatches(listing, target) {
  const raw = String(listing?.construction_status ?? '').trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (target === 'built') return lower === 'built' || raw === 'בנוי';
  return lower === 'beginning_of_construction' || lower === 'start_of_construction' || raw === 'תחילת בנייה';
}

/**
 * Loads the feed for a category + right-panel filter, then applies the left-rail
 * purpose checkboxes (להשכרה / למכירה), filter sheets and text search client-side like mobile.
 */
export function useFeed({category, sidebarFilterId, purposes, feedFilters, videoOnly = false}) {
  const [state, setState] = useState({status: 'loading', rows: [], error: null});

  const filter = useMemo(
    () => sidebarFiltersForCategory(category).find(f => f.id === sidebarFilterId) || null,
    [category, sidebarFilterId],
  );

  useEffect(() => {
    const controller = new AbortController();
    setState(s => ({...s, status: 'loading', error: null}));
    fetchRows(category, filter, videoOnly, controller.signal)
      .then(rows => {
        let cleaned = excludeSalesImageCompanionListings(rows).filter(hasFeedContent);
        if (videoOnly) cleaned = cleaned.filter(isVideoAdListing);
        setState({status: 'ready', rows: applySidebarRules(cleaned, filter), error: null});
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setState({status: 'error', rows: [], error: error?.message || 'שגיאה בטעינת מודעות'});
      });
    return () => controller.abort();
  }, [category, filter, videoOnly]);

  const items = useMemo(() => {
    const onlyOne = purposes.rent !== purposes.sale;
    const wanted = purposes.rent ? 'rent' : 'sale';
    const byPurpose = state.rows.filter(row => {
      if (videoOnly && !isVideoAdListing(row)) return false;
      if (!onlyOne) return true;
      if (isFeedPost(row)) return false;
      return (row.purpose === 'rent' ? 'rent' : 'sale') === wanted;
    });
    return applyFeedFilters(byPurpose, feedFilters, category).map(toFeedItem);
  }, [state.rows, purposes, feedFilters, category, videoOnly]);

  return {status: state.status, error: state.error, items, filter};
}
