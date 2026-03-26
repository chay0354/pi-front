/**
 * Client-side “similar listing” matching for Pi AI (no server AI required).
 * Scores published listings by overlap between user query and listing text fields.
 */

const STOP_HE = new Set([
  'של',
  'על',
  'עם',
  'את',
  'זה',
  'או',
  'גם',
  'לא',
  'כל',
  'יש',
  'הוא',
  'היא',
  'אני',
  'שלי',
  'אבל',
  'כי',
  'מה',
  'איך',
  'איפה',
  'מתי',
]);

/**
 * @param {Record<string, unknown>} listing
 * @returns {string}
 */
export function buildListingSearchText(listing) {
  const parts = [];
  const push = v => {
    if (v == null || v === '') return;
    const s = String(v).trim();
    if (s) parts.push(s);
  };

  push(listing.description);
  push(listing.address);
  push(listing.search_address);
  push(listing.land_address);
  push(listing.land_parcel);
  push(listing.land_block);
  push(listing.project_name);
  push(listing.purpose);
  push(listing.property_type);
  push(listing.apartment_type);
  push(listing.preferred_apartment_type);
  push(listing.display_option);
  if (listing.price != null && listing.price !== '') push(String(listing.price));
  if (listing.budget != null && listing.budget !== '') push(String(listing.budget));
  if (listing.rooms != null && listing.rooms !== '') {
    push(String(listing.rooms));
    push(`${listing.rooms} חדרים`);
  }
  if (listing.area != null && listing.area !== '') push(String(listing.area));
  if (listing.floor != null && listing.floor !== '') push(String(listing.floor));

  try {
    if (listing.additional_fields && typeof listing.additional_fields === 'object') {
      push(JSON.stringify(listing.additional_fields));
    }
  } catch (_) {
    /* ignore */
  }

  return parts.join(' ');
}

/**
 * @param {string} q
 * @returns {string[]}
 */
export function tokenizeQuery(q) {
  const s = String(q || '').trim();
  if (!s) return [];
  return s
    .split(/\s+/)
    .map(w => w.replace(/^[,;:!?'"()[\]״׳]+|[,;:!?'"()[\]״׳]+$/g, ''))
    .filter(w => w.length >= 2 && !STOP_HE.has(w));
}

/**
 * @param {string} query
 * @param {string} blobLower
 * @param {string[]} queryTokens
 * @returns {number}
 */
function scoreMatch(query, blobLower, queryTokens) {
  let score = 0;
  for (const t of queryTokens) {
    const tl = t.toLowerCase();
    if (blobLower.includes(tl) || blobLower.includes(t)) {
      score += 2 + Math.min(t.length, 10) * 0.15;
    }
  }

  const ql = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (ql.length > 4 && blobLower.includes(ql)) {
    score += 18;
  }

  const nums = query.match(/\d+/g);
  if (nums && nums.length) {
    for (const n of nums) {
      if (blobLower.includes(n)) score += 1.2;
    }
  }

  return score;
}

/**
 * @param {string} query
 * @param {Record<string, unknown>[]} listings
 * @param {{ topN?: number }} [opts]
 * @returns {{ ranked: { listing: object; score: number }[]; queryTokens: string[] }}
 */
export function rankListingsByQuery(query, listings, opts = {}) {
  const topN = opts.topN ?? 6;
  let queryTokens = tokenizeQuery(query);
  const trimmed = String(query || '').trim();
  if (queryTokens.length === 0 && trimmed.length >= 2) {
    queryTokens = [trimmed];
  }
  const ranked = (listings || [])
    .map(listing => {
      const blob = buildListingSearchText(listing);
      const blobLower = blob.toLowerCase();
      const score =
        trimmed.length < 2 ? 0 : scoreMatch(query, blobLower, queryTokens);
      return {listing, score};
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return {ranked, queryTokens};
}

/**
 * @param {Record<string, unknown>} listing
 * @param {number} index 1-based
 * @returns {string}
 */
export function formatListingLineHebrew(listing, index) {
  const purposeRaw = String(listing.purpose || '').toLowerCase();
  const purpose =
    purposeRaw === 'rent' || purposeRaw === 'להשכרה'
      ? 'להשכרה'
      : 'למכירה';
  const priceNum =
    listing.price != null && listing.price !== ''
      ? Number(listing.price)
      : listing.budget != null && listing.budget !== ''
        ? Number(listing.budget)
        : NaN;
  const priceStr =
    !Number.isNaN(priceNum) && Number.isFinite(priceNum)
      ? `₪${Math.round(priceNum).toLocaleString('he-IL')}`
      : 'מחיר לא צוין';
  const addr = (
    listing.address ||
    listing.search_address ||
    listing.land_address ||
    listing.project_name ||
    '—'
  )
    .toString()
    .trim();
  const desc = (listing.description || '').toString().trim();
  const shortDesc =
    desc.length > 180 ? `${desc.slice(0, 177).trim()}…` : desc;

  let line = `${index}. ${purpose} · ${priceStr}\n   📍 ${addr}`;
  if (shortDesc) line += `\n   ${shortDesc}`;
  line += `\n   מזהה מודעה: ${listing.id || '—'}`;
  return line;
}

/**
 * @param {string} query
 * @param {{ ranked: { listing: object; score: number }[]; queryTokens: string[] }} rankResult
 * @param {number} totalFetched
 * @returns {string}
 */
export function buildAnswerText(query, rankResult, totalFetched) {
  const {ranked, queryTokens} = rankResult;
  const q = String(query || '').trim();

  if (!q) {
    return 'תאר בקצרה איזו נכס אתה מחפש (עיר, שכונה, מחיר, חדרים, סוג נכס וכו׳), ואז לחץ על חיפוש.';
  }

  if (!ranked.length) {
    return `חיפשתי ב-${totalFetched} מודעות שפורסמו במערכת ולא מצאתי התאמה ברורה למילות המפתח: ${queryTokens.join(', ') || '(קצר מדי)'}\n\nנסה לפרט יותר — למשל שם עיר, טווח מחיר, או מספר חדרים.`;
  }

  const intro = `לפי התיאור שלך, אלה המודעות הקרובות ביותר (מתוך ${totalFetched} מודעות במערכת):\n\n`;
  const body = ranked
    .map((r, i) => formatListingLineHebrew(r.listing, i + 1))
    .join('\n\n');
  const footer =
    '\n\n— Pi AI (התאמה לפי מילות מפתח בטקסט המודעות; לא ייעוץ משפטי או סוכנות).';

  return intro + body + footer;
}
