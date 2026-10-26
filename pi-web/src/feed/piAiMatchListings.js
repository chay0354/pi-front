/**
 * Client-side “similar listing” matching for Pi AI (no server AI required).
 * Scores published listings by overlap between user query and listing text fields.
 * Copied from pi-front/utils/piAiMatchListings.js — keep in sync with mobile.
 */

import {isFeedPost as isFeedPostListingRecord} from './listingRules';

/** pi-front/utils/chatListingCategory.js */
const CHAT_LISTING_CATEGORY_LABELS = {
  1: 'חדש מקבלן',
  2: 'משרדים',
  3: 'שותפים',
  4: 'גלובל',
  5: 'BNB',
  6: 'מגזר דתי',
  7: 'קרקעות',
  8: 'מסחרי',
  9: 'נכסים',
  10: 'דירות',
  12: 'יוקרה',
};

function getChatListingCategoryLabel(category) {
  const n = category != null ? Number(category) : NaN;
  if (Number.isNaN(n)) return null;
  return CHAT_LISTING_CATEGORY_LABELS[n] || null;
}

/**
 * Pi AI searches real-estate ads only — never TikTok feed posts.
 * @param {Record<string, unknown>} listing
 * @returns {boolean}
 */
export function isPiAiSearchExcludedListing(listing) {
  if (isFeedPostListingRecord(listing)) return true;
  const description = String(listing?.description || '')
    .trim()
    .toLowerCase();
  return description === 'פוסט' || description === 'post';
}

/**
 * @param {Record<string, unknown>[]} listings
 * @returns {Record<string, unknown>[]}
 */
export function filterPiAiSearchListings(listings) {
  return (Array.isArray(listings) ? listings : []).filter(
    listing => listing && !isPiAiSearchExcludedListing(listing),
  );
}

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

function getProjectOffers(listing) {
  let po = listing?.project_offers ?? listing?.projectOffers;
  if (typeof po === 'string') {
    try {
      po = JSON.parse(po);
    } catch (_) {
      return null;
    }
  }
  return po && typeof po === 'object' ? po : null;
}

function offerLineActive(po, name) {
  if (!po || typeof po !== 'object') return false;
  const area = Number(po[`${name}_area`]);
  const price = Number(po[`${name}_price`]);
  return (Number.isFinite(area) && area > 0) || (Number.isFinite(price) && price > 0);
}

/**
 * Company / חדש מקבלן ads store 3/4/5-room types in `project_offers`,
 * while `listing.rooms` is often a dummy 1.
 * @returns {{ labels: string[], roomNums: number[] }}
 */
export function projectOfferRoomTypes(listing) {
  const po = getProjectOffers(listing);
  const labels = [];
  const roomNums = [];
  const addNum = n => {
    const x = Number(n);
    if (Number.isFinite(x) && x > 0 && !roomNums.includes(x)) roomNums.push(x);
  };
  if (po) {
    for (const n of [3, 4, 5]) {
      if (offerLineActive(po, `rooms_${n}`)) {
        labels.push(`${n} חדרים`);
        addNum(n);
      }
    }
    if (offerLineActive(po, 'garden')) {
      labels.push('דירת גן');
      addNum(po.garden_rooms);
    }
    if (offerLineActive(po, 'penthouse')) {
      labels.push('פנטהאוז');
      addNum(po.penthouse_rooms);
    }
    if (offerLineActive(po, 'private')) {
      labels.push('בית פרטי');
      addNum(po.private_rooms);
    }
  }
  const roomsRaw = listing?.rooms != null ? String(listing.rooms).trim() : '';
  if (roomsRaw.includes(',')) {
    for (const bit of roomsRaw.split(',')) addNum(bit.trim());
  } else {
    const listingRooms = Number(listing?.rooms);
    if (Number.isFinite(listingRooms) && listingRooms > 0) {
      const dummyOne = listingRooms === 1 && roomNums.length > 0;
      if (!dummyOne) addNum(listingRooms);
    }
  }
  return {labels, roomNums};
}

function listingPublisherName(listing) {
  const parts = [
    listing?.creator_name,
    listing?.creator_business_name,
    listing?.business_name,
    listing?.broker_office_name,
    listing?.publisher,
    listing?.company_name,
  ];
  const seen = new Set();
  const out = [];
  for (const v of parts) {
    const s = v != null ? String(v).trim() : '';
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function listingSubscriberNumber(listing) {
  const v =
    listing?.creator_subscriber_number ??
    listing?.subscriber_number ??
    listing?.created_by_subscriber_number;
  const s = v != null ? String(v).trim() : '';
  return s;
}

export function listingOffersRoomCount(listing, want) {
  const n = Number(want);
  if (!Number.isFinite(n) || n <= 0) return true;
  const {roomNums, labels} = projectOfferRoomTypes(listing);
  if (roomNums.some(x => Number(x) === n)) return true;
  const compact = `${listing?.rooms || ''} ${listing?.rooms_offered || ''} ${labels.join(' ')}`;
  const nums = String(compact).match(/\d+(?:\.\d+)?/g) || [];
  if (nums.some(x => Number(x) === n)) return true;
  const blob = [
    listing?.description,
    listing?.project_name,
    listing?.rooms_offered,
    typeof listing?.general_details === 'string'
      ? listing.general_details
      : listing?.general_details
        ? JSON.stringify(listing.general_details)
        : '',
  ]
    .filter(Boolean)
    .join(' ');
  return new RegExp(`(?:^|\\D)${n}(?:\\.0+)?\\s*-?\\s*חדר`).test(blob);
}

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
  const offered = projectOfferRoomTypes(listing);
  if (offered.roomNums.length) {
    for (const n of offered.roomNums) {
      push(String(n));
      push(`${n} חדרים`);
    }
  } else if (listing.rooms != null && listing.rooms !== '') {
    push(String(listing.rooms));
    push(`${listing.rooms} חדרים`);
  }
  for (const label of offered.labels) push(label);
  if (listing.area != null && listing.area !== '') push(String(listing.area));
  if (listing.floor != null && listing.floor !== '') push(String(listing.floor));

  for (const name of listingPublisherName(listing)) {
    push(name);
    push(`חברה ${name}`);
    push(`חברת ${name}`);
  }
  const subNum = listingSubscriberNumber(listing);
  if (subNum) push(subNum);

  const catNum = Number(listing.category);
  if (catNum === 1) {
    push('חדש מקבלן');
    push('דירה חדשה');
    push('חדשה');
    push('קבלן');
  }
  push(listing.construction_status);
  if (
    listing.sale_at_presale === true ||
    listing.sale_at_presale === 'true' ||
    listing.sale_at_presale === 't'
  ) {
    push('פריסייל');
  }

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
 * @param {Record<string, unknown>} listing
 * @returns {'rent'|'sale'|''}
 */
function listingPurposeKindForAi(listing) {
  const raw = String(listing?.purpose || '')
    .trim()
    .toLowerCase();
  if (raw === 'rent' || raw === 'להשכרה' || raw.includes('השכר')) {
    return 'rent';
  }
  if (raw === 'sale' || raw === 'למכירה' || raw.includes('מכיר')) {
    return 'sale';
  }
  return '';
}

/** Amenities arrive as an object, an array, or a JSON string. */
function parseAmenities(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;
  if (s.startsWith('{') || s.startsWith('[')) {
    try {
      return JSON.parse(s);
    } catch (_) {
      return s;
    }
  }
  return s;
}

const AMENITY_OFF_VALUES = /^(?:false|לא|ללא|אין|0)$/i;

/**
 * Flatten amenities to readable text ("מעלית, כמות חניות 2"). The object form
 * used to serialize to nothing, which hid parking / elevator from Pi AI.
 */
function amenitiesTextForAi(listing) {
  const a = parseAmenities(listing?.amenities);
  if (Array.isArray(a)) {
    return a
      .map(x => String(x || '').trim())
      .filter(Boolean)
      .join(', ');
  }
  if (a && typeof a === 'object') {
    const out = [];
    for (const [key, value] of Object.entries(a)) {
      const label = String(key || '').trim();
      if (!label) continue;
      if (value === true || value === 'true' || value === 'כן') {
        out.push(label);
        continue;
      }
      if (typeof value === 'number' && value > 0) {
        out.push(`${label} ${value}`);
        continue;
      }
      const s = value != null ? String(value).trim() : '';
      if (s && !AMENITY_OFF_VALUES.test(s)) out.push(`${label} ${s}`);
    }
    return out.join(', ');
  }
  if (typeof a === 'string') return a.trim();
  return '';
}

function preferencesTextForAi(listing) {
  const p = listing?.preferences;
  if (Array.isArray(p)) {
    return p
      .map(x => String(x || '').trim())
      .filter(Boolean)
      .join(', ');
  }
  if (p && typeof p === 'object') {
    try {
      return JSON.stringify(p);
    } catch (_) {
      return '';
    }
  }
  if (typeof p === 'string') return p.trim();
  return '';
}

/**
 * Compact whitelisted fields sent to the Pi AI (Gemini) search endpoint.
 * Keeps the payload useful for matching while clipped for prompt size.
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

  set('category', listing.category, 10);
  const catLabel = getChatListingCategoryLabel(listing.category);
  if (catLabel) set('category_label', catLabel, 30);

  set('purpose', listing.purpose, 30);
  const purposeKind = listingPurposeKindForAi(listing);
  if (purposeKind) set('purpose_kind', purposeKind, 10);

  set('property_type', listing.property_type, 40);
  set('apartment_type', listing.apartment_type, 40);
  set(
    'address',
    listing.address || listing.search_address || listing.land_address,
    160,
  );
  set('land_address', listing.land_address, 120);
  set('land_parcel', listing.land_parcel, 40);
  set('land_block', listing.land_block, 40);
  set('project_name', listing.project_name, 80);
  const publishers = listingPublisherName(listing);
  if (publishers.length) {
    set('publisher', publishers.join(', '), 80);
    set('company_name', publishers[0], 80);
  }
  set(
    'subscriber_number',
    listingSubscriberNumber(listing) || listing.subscriber_number,
    20,
  );
  // חדש מקבלן ads price/size each unit type separately — send them all so a
  // "עד 2 מיליון" or "100 מ״ר" query can match on any single offer.
  const offerPrices = projectOfferNumbers(listing, '_price');
  set('price', offerPrices.length ? offerPrices.join('/') : listing.price, 80);
  set('budget', listing.budget, 20);
  set('price_per_night', listing.price_per_night, 20);
  const offered = projectOfferRoomTypes(listing);
  if (offered.labels.length) {
    set('rooms_offered', offered.labels.join(', '), 80);
  } else {
    set('rooms_offered', listing.rooms_offered, 80);
  }
  if (offered.roomNums.length) {
    set('rooms', offered.roomNums.join(','), 20);
  } else {
    set('rooms', listing.rooms, 20);
  }
  const offerAreas = projectOfferNumbers(listing, '_area');
  set('area', offerAreas.length ? offerAreas.join('/') : listing.area, 60);
  set('floor', listing.floor, 10);
  set('search_purpose', listing.search_purpose || listing.searchPurposeKey, 20);
  set('condition', listing.condition, 30);
  set('construction_status', listing.construction_status, 30);
  if (Number(listing.category) === 1) {
    set('new_from_contractor', 'חדש מקבלן דירה חדשה', 40);
  }
  set('permit', listing.permit, 30);
  set('hospitality_nature', listing.hospitality_nature, 40);
  set('service_facility', listing.service_facility, 40);
  set('preferred_gender', listing.preferred_gender, 20);
  set('preferred_apartment_type', listing.preferred_apartment_type, 40);
  if (listing.preferred_age_min != null && listing.preferred_age_min !== '') {
    set('preferred_age_min', listing.preferred_age_min, 6);
  }
  if (listing.preferred_age_max != null && listing.preferred_age_max !== '') {
    set('preferred_age_max', listing.preferred_age_max, 6);
  }
  set('preferences', preferencesTextForAi(listing), 120);
  set('amenities', amenitiesTextForAi(listing), 200);
  const descExtra = [];
  for (const name of publishers) descExtra.push(`חברת ${name}`);
  const subForDesc = listingSubscriberNumber(listing);
  if (subForDesc) descExtra.push(subForDesc);
  if (offered.labels.length) descExtra.push(offered.labels.join(', '));
  const descBase = listing.description != null ? String(listing.description).trim() : '';
  const descCombined = [descBase, ...descExtra].filter(Boolean).join(' · ');
  set('description', descCombined, 400);
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
 * @returns {{ raw: string, city: string|null, purpose: 'rent'|'sale'|null }}
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

  return {raw, city, purpose};
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
      listing.creator_name,
      listing.business_name,
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

const HOME_CATS = new Set(['1', '6', '10', '12']);

/**
 * Hard type/purpose constraints inferred from the Hebrew query.
 * @param {string} query
 * @returns {{ cats: string[]|null, purpose: 'rent'|'sale'|null }}
 */
const HE_ROOM_WORDS = {
  שלושה: 3,
  שלוש: 3,
  שלושת: 3,
  ארבעה: 4,
  ארבע: 4,
  חמישה: 5,
  חמש: 5,
  שישה: 6,
  שש: 6,
  שני: 2,
  שתיים: 2,
  שתי: 2,
};

function inferRoomsFromQuery(query) {
  const q = String(query || '').trim().toLowerCase();
  const withNoun = q.match(/(\d+(?:\.\d+)?)\s*-?\s*חדר/);
  if (withNoun) {
    const n = Number(withNoun[1]);
    if (Number.isFinite(n) && n > 0 && n < 20) return n;
  }
  for (const [word, n] of Object.entries(HE_ROOM_WORDS)) {
    if (new RegExp(`${word}\\s*חדר`).test(q) || q.includes(`${word} חדרים`)) {
      return n;
    }
  }
  return null;
}

const NUM_RE = '(\\d[\\d,]*(?:\\.\\d+)?)';
const MONEY_UNIT_RE = '(מיליון|מליון|אלף|אלפים|k)';
const CURRENCY_RE = '(?:₪|שח|שקלים|שקל)';
/** A number is only read as money when a unit or a currency follows it. */
const MONEY_RE = `${NUM_RE}\\s*(?:${MONEY_UNIT_RE}\\s*(?:${CURRENCY_RE})?|${CURRENCY_RE})`;
/** normalizeHebrewQuery strips quotes, so מ"ר and מ״ר both arrive as מר. */
const SQM_RE = '(?:מר|מ2|sqm|מטר(?:ים)?(?:\\s*(?:רבוע(?:ים)?|מרובע(?:ים)?))?)';

function toPlainNumber(raw) {
  if (raw == null) return null;
  const n = Number(String(raw).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function moneyValue(numStr, unitStr) {
  const n = toPlainNumber(numStr);
  if (n == null) return null;
  const unit = String(unitStr || '');
  if (/מיליון|מליון/.test(unit)) return n * 1000000;
  if (/אלף|אלפים|k/.test(unit)) return n * 1000;
  return n;
}

function boundedRange(min, max) {
  const lo = Number.isFinite(min) ? min : null;
  const hi = Number.isFinite(max) ? max : null;
  if (lo == null && hi == null) return null;
  if (lo != null && hi != null && lo > hi) return {min: hi, max: lo};
  return {min: lo, max: hi};
}

/** "בין 80 ל-100 מ״ר" · "עד 120 מ״ר" · "מעל 90 מ״ר" · "100 מ״ר" */
export function inferAreaFromQuery(q) {
  const span = q.match(
    new RegExp(`בין\\s*${NUM_RE}\\s*(?:ל|עד|לבין)\\s*-?\\s*${NUM_RE}\\s*${SQM_RE}`),
  );
  if (span) {
    const lo = toPlainNumber(span[1]);
    const hi = toPlainNumber(span[2]);
    if (lo != null && hi != null) return boundedRange(lo, hi);
  }
  const upTo = q.match(
    new RegExp(`(?:עד|מקסימום|לא יותר מ|פחות מ)\\s*-?\\s*${NUM_RE}\\s*${SQM_RE}`),
  );
  if (upTo) {
    const v = toPlainNumber(upTo[1]);
    if (v != null) return boundedRange(null, v);
  }
  const from = q.match(
    new RegExp(
      `(?:מעל|לפחות|יותר מ|החל מ|מינימום)\\s*-?\\s*${NUM_RE}\\s*${SQM_RE}`,
    ),
  );
  if (from) {
    const v = toPlainNumber(from[1]);
    if (v != null) return boundedRange(v, null);
  }
  const bare = q.match(new RegExp(`${NUM_RE}\\s*${SQM_RE}`));
  if (bare) {
    const v = toPlainNumber(bare[1]);
    // A plain "100 מ״ר" is an approximation, not a spec — keep a band.
    if (v != null && v > 0) {
      return {...boundedRange(Math.floor(v * 0.85), Math.ceil(v * 1.15)), about: v};
    }
  }
  return null;
}

/** "קומת קרקע" · "קומה 3" · "עד קומה 4" · "מקומה 5 ומעלה" */
export function inferFloorFromQuery(q) {
  if (/קומת\s*קרקע/.test(q) || /קומה\s*0(?!\d)/.test(q)) {
    return boundedRange(0, 0);
  }
  const upTo = q.match(new RegExp(`(?:עד|מתחת ל|לא מעל)\\s*קומה\\s*${NUM_RE}`));
  if (upTo) {
    const v = toPlainNumber(upTo[1]);
    if (v != null) return boundedRange(null, v);
  }
  const fromUp = q.match(
    new RegExp(`מ?קומה\\s*${NUM_RE}\\s*(?:ומעלה|ומעל|והלאה)`),
  );
  if (fromUp) {
    const v = toPlainNumber(fromUp[1]);
    if (v != null) return boundedRange(v, null);
  }
  const above = q.match(new RegExp(`מעל\\s*קומה\\s*${NUM_RE}`));
  if (above) {
    const v = toPlainNumber(above[1]);
    if (v != null) return boundedRange(v + 1, null);
  }
  const exact = q.match(new RegExp(`קומה\\s*${NUM_RE}`));
  if (exact) {
    const v = toPlainNumber(exact[1]);
    if (v != null) return boundedRange(v, v);
  }
  return null;
}

/** "עד 2 מיליון" · "בין 1.5 ל-2 מיליון" · "מעל 850 אלף" · "5000 ש״ח" */
export function inferPriceFromQuery(q) {
  const span = q.match(
    new RegExp(
      `בין\\s*${NUM_RE}\\s*${MONEY_UNIT_RE}?\\s*(?:${CURRENCY_RE})?\\s*(?:ל|עד|לבין)\\s*-?\\s*${MONEY_RE}`,
    ),
  );
  if (span) {
    const hi = moneyValue(span[3], span[4]);
    // "בין 1.5 ל-2 מיליון": the unit is stated once, at the end.
    const lo = moneyValue(span[1], span[2] || span[4]);
    if (lo != null && hi != null) return boundedRange(lo, hi);
  }
  const upTo = q.match(
    new RegExp(
      `(?:עד|מקסימום|לא יותר מ|פחות מ|מתחת ל|תקציב(?:\\s*של)?)\\s*-?\\s*${MONEY_RE}`,
    ),
  );
  if (upTo) {
    const v = moneyValue(upTo[1], upTo[2]);
    if (v != null) return boundedRange(null, v);
  }
  const from = q.match(
    new RegExp(`(?:מעל|לפחות|יותר מ|החל מ)\\s*-?\\s*${MONEY_RE}`),
  );
  if (from) {
    const v = moneyValue(from[1], from[2]);
    if (v != null) return boundedRange(v, null);
  }
  const bare = q.match(new RegExp(MONEY_RE));
  if (bare) {
    const v = moneyValue(bare[1], bare[2]);
    // A bare budget reads as a ceiling; leave a little headroom.
    if (v != null) return {...boundedRange(null, Math.round(v * 1.1)), about: v};
  }
  return null;
}

/** Amenities the query explicitly asks for (never the "בלי מעלית" case). */
const AMENITY_QUERY_RULES = [
  {
    id: 'parking',
    label: 'חניה',
    ask: 'חני(?:ה|יה|ות|ון)',
    keys: ['חני', 'parking'],
  },
  {id: 'elevator', label: 'מעלית', ask: 'מעלית', keys: ['מעלית', 'elevator']},
  {id: 'balcony', label: 'מרפסת', ask: 'מרפס', keys: ['מרפס', 'balcony']},
  {
    id: 'mamad',
    label: 'ממ"ד',
    ask: 'ממד|מרחב מוגן',
    keys: ['ממד', 'mamad', 'מרחב מוגן'],
  },
];

export function inferAmenitiesFromQuery(q) {
  const out = [];
  for (const rule of AMENITY_QUERY_RULES) {
    if (!new RegExp(rule.ask).test(q)) continue;
    if (new RegExp(`(?:בלי|ללא)\\s+(?:${rule.ask})`).test(q)) continue;
    out.push(rule);
  }
  return out.length ? out : null;
}

/** Splits the "/"-joined lists the summary uses for חדש מקבלן unit types. */
function numericListValues(raw) {
  if (raw == null || raw === '') return [];
  return String(raw)
    .split(/[/|;]/)
    .map(part => Number(String(part).replace(/,/g, '').trim()))
    .filter(n => Number.isFinite(n) && n > 0);
}

function projectOfferNumbers(listing, suffix) {
  const po = getProjectOffers(listing);
  if (!po) return [];
  const out = [];
  for (const [key, value] of Object.entries(po)) {
    if (!key.endsWith(suffix)) continue;
    const n = Number(value);
    if (Number.isFinite(n) && n > 0 && !out.includes(n)) out.push(n);
  }
  return out;
}

/** Every m² the ad offers — one per unit type on חדש מקבלן projects. */
export function listingAreaValues(listing) {
  return [
    ...numericListValues(listing?.area),
    ...projectOfferNumbers(listing, '_area'),
  ];
}

export function listingPriceValues(listing) {
  return [
    ...numericListValues(listing?.price),
    ...numericListValues(listing?.budget),
    ...numericListValues(listing?.price_per_night),
    ...projectOfferNumbers(listing, '_price'),
  ];
}

export function listingFloorValues(listing) {
  const raw = listing?.floor;
  if (raw == null || raw === '') return [];
  const s = String(raw).trim();
  if (/קרקע|ground/i.test(s)) return [0];
  return (s.match(/-?\d+(?:\.\d+)?/g) || [])
    .map(Number)
    .filter(n => Number.isFinite(n));
}

/**
 * No value on the ad → keep it and let Gemini judge; a value outside the
 * requested range → drop it. Dropping silent ads would gut the results,
 * since plenty of listings never fill in area or floor.
 */
function valuesFitRange(values, range) {
  if (!range) return true;
  if (!values.length) return true;
  return values.some(
    v =>
      (range.min == null || v >= range.min) &&
      (range.max == null || v <= range.max),
  );
}

/** true / false / null when the ad simply does not mention it. */
function listingHasAmenity(listing, keys) {
  const hit = text => {
    const norm = normalizeHebrewQuery(text);
    return keys.some(k => norm.includes(k));
  };
  const a = parseAmenities(listing?.amenities);
  if (Array.isArray(a)) {
    return a.some(x => hit(String(x || '')));
  }
  if (a && typeof a === 'object') {
    let mentioned = false;
    for (const [key, value] of Object.entries(a)) {
      if (!hit(key)) continue;
      mentioned = true;
      if (value === true || value === 'true' || value === 'כן') return true;
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) return true;
    }
    return mentioned ? false : null;
  }
  if (typeof a === 'string' && a.trim()) return hit(a);
  return null;
}

export function inferPiAiQueryConstraints(query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  const norm = normalizeHebrewQuery(q);
  // "קומת קרקע" is a floor, not a land ad — drop it before the type keywords.
  const typeQ = q.replace(/קומת\s*קרקע/g, ' ');
  let cats = null;
  if (/שותפ/.test(typeQ)) cats = ['3'];
  else if (/(?:צימר|\bbnb\b|לינה)/i.test(typeQ)) cats = ['5'];
  else if (/משרד/.test(typeQ)) cats = ['2'];
  else if (/(?:מגרש|קרקע|גוש|חלקה)/.test(typeQ)) cats = ['7'];
  else if (/מסחר/.test(typeQ)) cats = ['8'];
  else if (/(?:דיר|בית|יוקר|פנטהאוז)/.test(typeQ)) cats = [...HOME_CATS];

  let purpose = null;
  const rent = /להשכרה|לשכור|שכירות|השכרה/.test(q);
  const sale = /למכירה|לקנות|קנייה|קניה/.test(q);
  if (rent && !sale) purpose = 'rent';
  else if (sale && !rent) purpose = 'sale';

  return {
    cats,
    purpose,
    rooms: inferRoomsFromQuery(q),
    area: inferAreaFromQuery(norm),
    floor: inferFloorFromQuery(norm),
    price: inferPriceFromQuery(norm),
    amenities: inferAmenitiesFromQuery(norm),
  };
}

function listingFitsPiAiConstraints(listing, constraints) {
  if (!listing || !constraints) return true;
  if (constraints.cats && constraints.cats.length) {
    const c = String(listing.category != null ? listing.category : '');
    if (!constraints.cats.includes(c)) return false;
  }
  if (constraints.purpose) {
    if (listingPurposeKind(listing) !== constraints.purpose) return false;
  }
  if (constraints.rooms != null) {
    if (!listingOffersRoomCount(listing, constraints.rooms)) return false;
  }
  if (!valuesFitRange(listingAreaValues(listing), constraints.area)) {
    return false;
  }
  if (!valuesFitRange(listingFloorValues(listing), constraints.floor)) {
    return false;
  }
  if (!valuesFitRange(listingPriceValues(listing), constraints.price)) {
    return false;
  }
  if (constraints.amenities) {
    for (const rule of constraints.amenities) {
      if (listingHasAmenity(listing, rule.keys) === false) return false;
    }
  }
  return true;
}

/**
 * Local pre-filter before Gemini (city / rent-sale / asset type).
 * @param {Record<string, unknown>[]} listings
 * @param {ReturnType<typeof parsePiAiQuery>} parsed
 * @param {string} [query]
 * @returns {Record<string, unknown>[]}
 */
export function filterListingsByParsedQuery(listings, parsed, query) {
  if (!parsed && !query) return listings || [];
  const constraints = inferPiAiQueryConstraints(query || parsed?.raw || '');
  return (listings || []).filter(listing => {
    if (parsed?.city && !listingMatchesCity(listing, parsed.city)) {
      return false;
    }
    if (parsed?.purpose && !listingMatchesPurpose(listing, parsed.purpose)) {
      return false;
    }
    if (!listingFitsPiAiConstraints(listing, constraints)) {
      return false;
    }
    return true;
  });
}

/** "עד 120 מ״ר" / "מ-80 מ״ר" / "80–120 מ״ר" for the empty-state copy. */
function describeRange(range, suffix) {
  if (!range) return null;
  const fmt = n => Math.round(n).toLocaleString('he-IL');
  // Echo the number the user typed, not the tolerance band around it.
  if (range.about != null) return `כ-${fmt(range.about)}${suffix}`;
  if (range.min != null && range.max != null) {
    return range.min === range.max
      ? `${fmt(range.min)}${suffix}`
      : `${fmt(range.min)}–${fmt(range.max)}${suffix}`;
  }
  if (range.max != null) return `עד ${fmt(range.max)}${suffix}`;
  return `מ-${fmt(range.min)}${suffix}`;
}

/**
 * @param {ReturnType<typeof parsePiAiQuery>} parsed
 * @param {number} totalBefore
 * @param {string} [query]
 * @returns {string|null}
 */
export function buildPiAiFilterEmptyMessage(parsed, totalBefore, query) {
  const parts = [];
  if (parsed?.city) parts.push(`ב${parsed.city}`);
  if (parsed?.purpose === 'rent') parts.push('להשכרה');
  if (parsed?.purpose === 'sale') parts.push('למכירה');

  const constraints = inferPiAiQueryConstraints(query || parsed?.raw || '');
  if (constraints.rooms != null) parts.push(`${constraints.rooms} חדרים`);
  const area = describeRange(constraints.area, ' מ"ר');
  if (area) parts.push(area);
  const floor = describeRange(constraints.floor, '');
  if (floor) parts.push(`קומה ${floor}`);
  const price = describeRange(constraints.price, ' ₪');
  if (price) parts.push(price);
  if (constraints.amenities) {
    for (const rule of constraints.amenities) parts.push(rule.label);
  }

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
  const tokens = s
    .split(/\s+/)
    .map(w => w.replace(/^[,;:!?'"()[\]״׳]+|[,;:!?'"()[\]״׳]+$/g, ''))
    .filter(w => w.length >= 2 && !STOP_HE.has(w));
  const extra = [];
  for (const t of tokens) {
    const n = HE_ROOM_WORDS[t];
    if (n) {
      extra.push(String(n), `${n} חדרים`);
    }
  }
  const roomsN = inferRoomsFromQuery(s);
  if (roomsN != null) {
    extra.push(String(roomsN), `${roomsN} חדרים`);
  }
  return [...tokens, ...extra];
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
