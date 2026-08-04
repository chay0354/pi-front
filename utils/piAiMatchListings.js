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
 * Compact whitelisted fields sent to the Pi AI (Gemini) search endpoint.
 * Keeps the payload/prompt small: only fields useful for matching, clipped.
 * @param {Record<string, unknown>} listing
 * @returns {Record<string, string>}
 */
export function buildListingAiSummary(listing) {
  const out = {id: listing.id};
  const set = (key, value, max) => {
    if (value == null || value === '') return;
    const s = String(value).trim();
    if (s) out[key] = s.length > max ? s.slice(0, max) : s;
  };
  set('purpose', listing.purpose, 30);
  set('category', listing.category, 10);
  set('property_type', listing.property_type, 40);
  set('apartment_type', listing.apartment_type, 40);
  set(
    'address',
    listing.address || listing.search_address || listing.land_address,
    120,
  );
  set('project_name', listing.project_name, 80);
  set('price', listing.price, 20);
  set('budget', listing.budget, 20);
  set('rooms', listing.rooms, 10);
  set('area', listing.area, 12);
  set('floor', listing.floor, 10);
  set('search_purpose', listing.search_purpose || listing.searchPurposeKey, 20);
  set('description', listing.description, 240);
  return out;
}

/** Major Israeli cities — longest alias matches first. */
const ISRAELI_CITIES = [
  {label: 'תל אביב', keys: ['תל אביב', 'תל-אביב', 'tel aviv', 'tel-aviv', 'ת״א', 'ת"א']},
  {label: 'ראשון לציון', keys: ['ראשון לציון', 'ראשל״צ', 'ראשל"צ']},
  {label: 'פתח תקווה', keys: ['פתח תקווה', 'פתח-תקווה', 'פ״ת', 'פ"ת']},
  {label: 'באר שבע', keys: ['באר שבע', 'beer sheva', 'beersheba']},
  {label: 'כפר סבא', keys: ['כפר סבא', 'כפר-סבא']},
  {label: 'ירושלים', keys: ['ירושלים', 'jerusalem']},
  {label: 'חיפה', keys: ['חיפה', 'haifa']},
  {label: 'נתניה', keys: ['נתניה', 'netanya']},
  {label: 'הרצליה', keys: ['הרצליה', 'herzliya']},
  {label: 'רמת גן', keys: ['רמת גן']},
  {label: 'גבעתיים', keys: ['גבעתיים']},
  {label: 'חולון', keys: ['חולון']},
  {label: 'רעננה', keys: ['רעננה']},
  {label: 'אשדוד', keys: ['אשדוד']},
  {label: 'אשקלון', keys: ['אשקלון']},
  {label: 'מודיעין', keys: ['מודיעין', 'modiin']},
  {label: 'רחובות', keys: ['רחובות']},
  {label: 'בני ברק', keys: ['בני ברק']},
  {label: 'נצרת', keys: ['נצרת']},
  {label: 'עפולה', keys: ['עפולה']},
  {label: 'אילת', keys: ['אילת', 'eilat']},
  {label: 'טבריה', keys: ['טבריה']},
  {label: 'נהריה', keys: ['נהריה']},
  {label: 'קרית גת', keys: ['קרית גת', 'קריית גת']},
];

/**
 * @param {string} s
 * @returns {string}
 */
export function normalizeHebrewQuery(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\u0591-\u05c7]/g, '')
    .replace(/["'״׳]/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CITY_ALIAS_ENTRIES = ISRAELI_CITIES.flatMap(city =>
  city.keys.map(key => ({
    label: city.label,
    keyNorm: normalizeHebrewQuery(key),
  })),
).sort((a, b) => b.keyNorm.length - a.keyNorm.length);

const CITY_BY_LABEL = new Map(ISRAELI_CITIES.map(c => [c.label, c]));

/**
 * @param {string} query
 * @returns {{ raw: string, city: string|null, purpose: 'rent'|'sale'|null, searchPurpose: 'enter'|'bring_in'|null }}
 */
export function parsePiAiQuery(query) {
  const raw = String(query || '').trim();
  const q = normalizeHebrewQuery(raw);

  let purpose = null;
  const wantsRent =
    /(?:^|\s)(?:דיר(?:ות|ה|ת)?\s*)?(?:ל)?(?:השכ|שכיר|שכור|לשכ)/.test(q) ||
    q.includes('להשכרה') ||
    q.includes('לשכור');
  const wantsSale =
    /(?:^|\s)(?:דיר(?:ות|ה|ת)?\s*)?(?:ל)?(?:קנ|מכיר)/.test(q) ||
    q.includes('למכירה') ||
    q.includes('לקנייה') ||
    q.includes('לקנות');
  if (wantsRent && !wantsSale) purpose = 'rent';
  else if (wantsSale && !wantsRent) purpose = 'sale';

  let searchPurpose = null;
  if (
    /(?:^|\s)(?:דיר(?:ה|ת)?\s*)?(?:ל)?(?:הכנס|היכנס)|מחפש(?:\s+דיר(?:ה|ת))?\s+להכנס/.test(
      q,
    )
  ) {
    searchPurpose = 'enter';
  } else if (
    /(?:^|\s)(?:דיר(?:ה|ת)?\s*)?(?:ל)?(?:הכניס)|מחפש(?:\s+דיר(?:ה|ת))?\s+להכניס|שותפ/.test(
      q,
    )
  ) {
    searchPurpose = 'bring_in';
  }

  let city = null;
  for (const entry of CITY_ALIAS_ENTRIES) {
    if (entry.keyNorm.length >= 2 && q.includes(entry.keyNorm)) {
      city = entry.label;
      break;
    }
  }
  if (!city) {
    const inline = raw.match(/(?:^|\s)ב([\u0590-\u05FF][\u0590-\u05FF\s\-"]{1,24})/);
    if (inline?.[1]) {
      const guess = normalizeHebrewQuery(inline[1]);
      if (guess.length >= 3) {
        for (const entry of CITY_ALIAS_ENTRIES) {
          if (
            entry.keyNorm.includes(guess) ||
            guess.includes(entry.keyNorm)
          ) {
            city = entry.label;
            break;
          }
        }
      }
    }
  }

  return {raw, city, purpose, searchPurpose};
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {string}
 */
function listingLocationBlob(listing) {
  return normalizeHebrewQuery(
    [
      listing.address,
      listing.search_address,
      listing.land_address,
      listing.project_name,
      listing.description,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {'rent'|'sale'}
 */
function listingPurposeKind(listing) {
  const raw = String(listing.purpose || '')
    .trim()
    .toLowerCase();
  if (raw === 'rent' || raw === 'להשכרה' || raw.includes('השכר')) {
    return 'rent';
  }
  return 'sale';
}

/**
 * @param {Record<string, unknown>} listing
 * @param {string} cityLabel
 * @returns {boolean}
 */
function listingMatchesCity(listing, cityLabel) {
  const blob = listingLocationBlob(listing);
  const cityDef = CITY_BY_LABEL.get(cityLabel);
  const needles = cityDef
    ? [normalizeHebrewQuery(cityLabel), ...cityDef.keys.map(normalizeHebrewQuery)]
    : [normalizeHebrewQuery(cityLabel)];
  return needles.some(n => n.length >= 2 && blob.includes(n));
}

/**
 * @param {Record<string, unknown>} listing
 * @param {'rent'|'sale'} purpose
 * @returns {boolean}
 */
function listingMatchesPurpose(listing, purpose) {
  if (Number(listing.category) === 3) return false;
  return listingPurposeKind(listing) === purpose;
}

/**
 * @param {Record<string, unknown>} listing
 * @param {'enter'|'bring_in'} searchPurpose
 * @returns {boolean}
 */
function listingMatchesSearchPurpose(listing, searchPurpose) {
  if (Number(listing.category) !== 3) return false;
  const sp = String(
    listing.search_purpose || listing.searchPurposeKey || '',
  )
    .trim()
    .toLowerCase();
  if (searchPurpose === 'enter') {
    return sp === 'enter';
  }
  return sp === 'bring_in' || sp === 'partner';
}

/**
 * Hard filters extracted from the Hebrew query (city, rent/sale, שותפים patterns).
 * @param {Record<string, unknown>[]} listings
 * @param {ReturnType<typeof parsePiAiQuery>} parsed
 * @returns {Record<string, unknown>[]}
 */
export function filterListingsByParsedQuery(listings, parsed) {
  if (!parsed) return listings || [];
  return (listings || []).filter(listing => {
    if (parsed.city && !listingMatchesCity(listing, parsed.city)) {
      return false;
    }
    if (parsed.searchPurpose) {
      return listingMatchesSearchPurpose(listing, parsed.searchPurpose);
    }
    if (parsed.purpose && !listingMatchesPurpose(listing, parsed.purpose)) {
      return false;
    }
    return true;
  });
}

/**
 * @param {ReturnType<typeof parsePiAiQuery>} parsed
 * @param {number} totalBefore
 * @returns {string|null}
 */
export function buildPiAiFilterEmptyMessage(parsed, totalBefore) {
  const parts = [];
  if (parsed?.city) parts.push(`ב${parsed.city}`);
  if (parsed?.searchPurpose === 'enter') parts.push('מחפש להכנס');
  if (parsed?.searchPurpose === 'bring_in') parts.push('מחפש להכניס / שותף');
  if (parsed?.purpose === 'rent') parts.push('להשכרה');
  if (parsed?.purpose === 'sale') parts.push('למכירה');
  if (!parts.length) return null;
  return `לא נמצאו מודעות ${parts.join(' · ')} מתוך ${totalBefore} מודעות שפורסמו.`;
}

/**
 * Dynamic loading copy while Pi AI ranks results.
 * @param {string} query
 * @param {ReturnType<typeof parsePiAiQuery>} [parsed]
 * @returns {string}
 */
export function buildPiAiSearchingMessage(query, parsed) {
  const q = String(query || '').trim();
  if (!q) return 'מחפש עבורך';

  if (parsed?.searchPurpose === 'enter') {
    return parsed.city
      ? `מחפש דירה להכנס ב${parsed.city}`
      : 'מחפש את ההכנס הנכון עבורך';
  }
  if (parsed?.searchPurpose === 'bring_in') {
    return parsed.city
      ? `מחפש שותף / להכניס ב${parsed.city}`
      : 'מחפש את השותף המתאים עבורך';
  }
  if (parsed?.city && parsed?.purpose === 'rent') {
    return `מחפש דירה להשכרה ב${parsed.city}`;
  }
  if (parsed?.city && parsed?.purpose === 'sale') {
    return `מחפש דירה למכירה ב${parsed.city}`;
  }
  if (parsed?.city) {
    return `מחפש ב${parsed.city}`;
  }
  if (parsed?.purpose === 'rent') {
    return 'מחפש דירות להשכרה';
  }
  if (parsed?.purpose === 'sale') {
    return 'מחפש דירות למכירה';
  }

  const snippet = q.length > 56 ? `${q.slice(0, 53).trim()}…` : q;
  return `מחפש ${snippet}`;
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
