/**
 * Feed filter sheets (עיר / סוג / חדרים / מחיר …) ported from the mobile feed:
 * pi-front/components/FeedBottomBar.js (slots), pi-front/screens/*FilterScreen.js
 * (options) and TikTokFeedScreen.applyFeedFilters (matching). Keep in sync with mobile.
 */
import {isFeedPost, parseListingGeneralDetails, subscriptionType} from './listingRules';

export const EMPTY_FEED_FILTERS = {
  price: null,
  rooms: null,
  city: null,
  apartmentType: null,
  type: null,
  meter: null,
  donam: null,
  office: null,
  preferences: null,
};

export const APARTMENT_TYPES = [
  {id: 'apartment', label: 'דירה'},
  {id: 'studio', label: 'דירת סטודיו'},
  {id: 'garden', label: 'דירת גן'},
  {id: 'private_house', label: 'בית פרטי'},
  {id: 'duplex', label: 'דופלקס'},
  {id: 'penthouse', label: 'פנטהאוז'},
];

const LUXURY_APARTMENT_TYPES = [
  {id: 'apartment', label: 'דירה'},
  {id: 'private_house', label: 'בית פרטי'},
  {id: 'villa', label: 'וילה'},
  {id: 'penthouse', label: 'פנטהאוז'},
];

const TYPE_OPTIONS_GLOBAL = [
  {id: 'apartments', label: 'דירות'},
  {id: 'penthouses', label: 'פנטאוזים'},
  {id: 'private_houses', label: 'בתים פרטיים'},
  {id: 'villas', label: 'וילות'},
  {id: 'estates', label: 'אחוזות'},
  {id: 'multi_family', label: 'Multi-family'},
  {id: 'offices', label: 'משרדים'},
  {id: 'commercial', label: 'מסחר'},
  {id: 'land', label: 'קרקעות'},
];

const TYPE_OPTIONS_COMMERCE = [
  {id: 'store', label: 'חנות'},
  {id: 'shopping_center', label: 'מרכז קניות'},
  {id: 'industrial_buildings', label: 'מבני תעשייה'},
  {id: 'warehouse', label: 'מחסן'},
  {id: 'commercial_space', label: 'שטח מסחרי'},
  {id: 'whole_floor', label: 'קומה שלמה'},
];

const TYPE_OPTIONS_BNB = [
  {id: 'room', label: 'חדר'},
  {id: 'housing_unit', label: 'יחידת דיור'},
  {id: 'house', label: 'בית'},
  {id: 'b&b', label: 'צימר'},
  {id: 'holiday_apartment', label: 'דירת נופש'},
  {id: 'villa', label: 'וילה'},
  {id: 'special', label: 'מיוחדים'},
];

const TYPE_OPTIONS_LAND = [
  {id: 'own_private', label: 'קרקע פרטית'},
  {id: 'agri_yes', label: 'קרקע חקלאית'},
  {id: 'mortgage_yes', label: 'קרקע במושע'},
  {id: 'permit_there_is', label: 'קרקע עם היתר'},
  {id: 'plan_there_is', label: 'קרקע עם תב״ע'},
  {id: 'plan_happy', label: 'קרקע עם תב״ע מאושרת'},
];

const TYPE_OPTIONS_NEW_FROM_DEVELOPER = [
  {id: 'apartment', label: 'דירה'},
  {id: 'garden', label: 'דירת גן'},
  {id: 'penthouses', label: 'פנטהאוז'},
  {id: 'private_houses', label: 'בית פרטי'},
  {id: 'villas', label: 'וילה'},
  {id: 'offices', label: 'משרדים'},
  {id: 'commercial', label: 'מסחר'},
  {id: 'religious_sector', label: 'מגזר דתי'},
];

export const BNB_REGIONS = [
  {id: 'north', label: 'צפון'},
  {id: 'south', label: 'דרום'},
  {id: 'center', label: 'מרכז'},
  {id: 'east', label: 'מזרח'},
  {id: 'west', label: 'מערב'},
];

const num = c => Number(c);

export function apartmentTypeOptions(category) {
  return num(category) === 12 ? LUXURY_APARTMENT_TYPES : APARTMENT_TYPES;
}

export function typeOptions(category) {
  switch (num(category)) {
    case 8:
      return TYPE_OPTIONS_COMMERCE;
    case 5:
      return TYPE_OPTIONS_BNB;
    case 7:
      return TYPE_OPTIONS_LAND;
    case 1:
      return TYPE_OPTIONS_NEW_FROM_DEVELOPER;
    default:
      return TYPE_OPTIONS_GLOBAL;
  }
}

const typeIds = type =>
  Array.isArray(type)
    ? type.map(v => String(v || '').trim()).filter(Boolean)
    : type != null && String(type).trim() !== ''
      ? [String(type).trim()]
      : [];

const SLOT = {
  rooms: {kind: 'rooms', label: 'חדרים', filterKey: 'rooms'},
  meter: {kind: 'meter', label: 'מטר', filterKey: 'meter'},
  preferences: {kind: 'preferences', label: 'העדפות', filterKey: 'preferences'},
  landType: {kind: 'type', label: 'סוג', filterKey: 'type'},
  apartmentType: {kind: 'apartmentType', label: 'בית', filterKey: 'apartmentType'},
  type: {kind: 'type', label: 'סוג', filterKey: 'type'},
  office: {kind: 'office', label: 'סוג', filterKey: 'office'},
  donam: {kind: 'donam', label: 'דונם', filterKey: 'donam'},
};

const RESIDENTIAL_TYPES = new Set(['apartments', 'private_houses', 'estates', 'villas', 'hotels', 'hotel']);
const OFFICE_COMMERCIAL_TYPES = new Set([
  'offices',
  'commercial',
  'land',
  'store',
  'shopping_center',
  'industrial_buildings',
  'warehouse',
  'commercial_space',
  'whole_floor',
]);

/**
 * Which sheet the "בית" (mobile 4th column) and "חדרים" (mobile 2nd column) pills open
 * for a category — FeedBottomBar.getSlotsForCategory + its type-driven מטר swap.
 */
export function filterSlotsForCategory(category, filters) {
  const c = num(category);
  let slots;
  switch (c) {
    case 2:
      slots = {rooms: SLOT.meter, home: SLOT.office};
      break;
    case 3:
      slots = {rooms: SLOT.preferences, home: SLOT.apartmentType};
      break;
    case 4:
    case 5:
    case 1:
      slots = {rooms: SLOT.rooms, home: SLOT.type};
      break;
    case 7:
      slots = {rooms: SLOT.landType, home: SLOT.donam};
      break;
    case 8:
      slots = {rooms: SLOT.meter, home: SLOT.type};
      break;
    default:
      slots = {rooms: SLOT.rooms, home: SLOT.apartmentType};
  }
  const selected = typeIds(filters?.type);
  const meterFromType =
    (c === 4 || c === 5) &&
    !selected.some(t => RESIDENTIAL_TYPES.has(t)) &&
    selected.some(t => OFFICE_COMMERCIAL_TYPES.has(t));
  const meterFromNewDeveloper = c === 1 && selected.some(t => t === 'offices' || t === 'commercial');
  if (meterFromType || meterFromNewDeveloper) slots = {...slots, rooms: SLOT.meter};
  return slots;
}

export function isFilterValueActive(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return false;
}

export function priceLimits(category) {
  const c = num(category);
  if (c === 5) return {cap: 10000, step: 100, defaultMax: 1000};
  if (c === 7) return {cap: 100000000, step: 1000000, defaultMax: 100000000};
  return {cap: 10000000, step: 1000, defaultMax: 10000000};
}

/* ---------- listing view (TikTokFeedScreen listing → feed item mapping) ---------- */

function normalizeLandYesNot(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (s === 'כן') return 'yes';
  if (s === 'לא') return 'not';
  return s;
}

function normalizeLandOwnership(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (s === 'פרטי') return 'private';
  if (s === 'מינהל') return 'administration';
  return s;
}

function normalizeLandThreeState(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (s === 'מאושרת') return 'happy';
  if (s === 'אין') return 'nothing';
  if (s === 'יש') return 'there_is';
  return s;
}

const parseObject = raw => parseListingGeneralDetails(raw);

function parsePrice(listing, category) {
  const raw =
    category === 5
      ? listing.price_per_night ?? listing.pricePerNight ?? listing.price ?? listing.budget
      : listing.price || listing.budget;
  const n = parseFloat(String(raw ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function listingView(listing) {
  const category = num(listing.category);
  const gd = parseObject(listing.general_details);
  const accommodation = parseObject(listing.accommodation_offers);
  return {
    raw: listing,
    category,
    isPost: isFeedPost(listing),
    subscriptionType: subscriptionType(listing),
    rawPrice: parsePrice(listing, category),
    listingPurpose: listing.purpose === 'rent' ? 'rent' : 'sale',
    apartmentTypeId: listing.property_type || listing.apartment_type || listing.preferred_apartment_type || '',
    propertyTypeRaw: listing.property_type || '',
    area: listing.area,
    rooms: listing.rooms,
    floor: listing.floor,
    amenities: parseObject(listing.amenities),
    projectOffers: parseObject(listing.project_offers),
    searchBlob: [
      listing.address,
      listing.location || listing.land_address || listing.address,
      listing.search_address,
      listing.land_address,
      listing.name,
      listing.title,
      listing.project_name,
      listing.property_name,
    ]
      .map(s => String(s ?? '').toLowerCase())
      .filter(Boolean)
      .join(' '),
    landOwnership: normalizeLandOwnership(listing.land_ownership),
    agriculturalLand: normalizeLandYesNot(listing.agricultural_land),
    planApproval: normalizeLandThreeState(listing.plan_approval),
    landInMortgage: normalizeLandYesNot(listing.land_in_mortgage),
    permit: normalizeLandThreeState(listing.permit),
    hotDeal: [true, 'true', 't', 1].includes(listing.hot_deal),
    checkInDate: listing.check_in_date || accommodation?.check_in_date || null,
    checkOutDate: listing.check_out_date || accommodation?.check_out_date || null,
    cancellationPolicy: listing.cancellation_policy || listing.cancellationPolicy || gd?.cancellation_policy || null,
    preferredGender:
      listing.preferred_gender === 'female' ? 'אישה' : listing.preferred_gender === 'male' ? 'גבר' : null,
    preferredAgeMin: listing.preferred_age_min,
    preferredAgeMax: listing.preferred_age_max,
    preferences: parseObject(listing.preferences) || {},
    sharedSpacesCompany: gd?.shared_spaces_company === true,
  };
}

/* ---------- חדש מקבלן helpers (project_offers) ---------- */

const sqm = v => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
};
const roomNum = v => {
  const x = Math.floor(Number(v));
  return Number.isFinite(x) && x > 0 ? x : 0;
};
const normalizeNfdIds = ids => ids.map(s => (s === 'apartments' ? 'apartment' : s));

function newDeveloperMeterComparableSqm(l, ids) {
  const po = l.projectOffers;
  const fallback = sqm(l.area);
  const maxOfKeys = keys => (po ? Math.max(0, ...keys.map(k => sqm(po[k]))) : 0);
  const areasMax = test => {
    if (!po) return 0;
    let m = 0;
    for (const k of Object.keys(po)) {
      if (!k.endsWith('_area') || k.includes('balcony')) continue;
      if (test && !test(k)) continue;
      m = Math.max(m, sqm(po[k]));
    }
    return m;
  };
  const byType = id => {
    switch (id) {
      case 'apartment':
        return maxOfKeys(['rooms_3_area', 'rooms_4_area', 'rooms_5_area']);
      case 'garden':
        return sqm(po?.garden_area);
      case 'penthouses':
        return sqm(po?.penthouse_area);
      case 'private_houses':
        return sqm(po?.private_area);
      case 'villas':
        return Math.max(sqm(po?.private_area), sqm(po?.penthouse_area), sqm(po?.garden_area));
      case 'offices':
      case 'commercial':
        return areasMax(k => /(office|whole_floor|store|warehouse|commercial|industrial|shopping)/i.test(k));
      case 'religious_sector':
        return areasMax();
      default:
        return 0;
    }
  };
  const best = Math.max(0, ...normalizeNfdIds(ids).map(byType));
  if (best > 0) return best;
  const all = areasMax();
  return all > 0 ? all : fallback;
}

function newDeveloperComparableMaxRooms(l, ids) {
  const po = l.projectOffers;
  const listingRooms = roomNum(l.rooms);
  const lineOn = name => Boolean(po) && (sqm(po[`${name}_area`]) > 0 || sqm(po[`${name}_price`]) > 0);
  const aptMax = () => [3, 4, 5].reduce((m, n) => (lineOn(`rooms_${n}`) ? Math.max(m, n) : m), 0);
  const line = name => (lineOn(name) ? roomNum(po?.[`${name}_rooms`]) || listingRooms : 0);
  const everything = () => Math.max(aptMax(), line('garden'), line('penthouse'), line('private'), listingRooms);
  const byType = id => {
    switch (id) {
      case 'apartment':
        return aptMax();
      case 'garden':
        return line('garden');
      case 'penthouses':
        return line('penthouse');
      case 'private_houses':
        return line('private');
      case 'villas':
        return Math.max(line('private'), line('penthouse'), line('garden'), aptMax());
      case 'offices':
      case 'commercial':
        return listingRooms;
      case 'religious_sector':
        return everything();
      default:
        return 0;
    }
  };
  const best = Math.max(0, ...normalizeNfdIds(ids).map(byType));
  return best > 0 ? best : everything();
}

function matchesNewFromDeveloperType(typeId, l) {
  const id = typeId === 'apartments' ? 'apartment' : typeId;
  const raw = String(l.apartmentTypeId || l.propertyTypeRaw || '').trim().toLowerCase();
  const isGarden = raw === 'garden' || raw === 'garden_apartment';
  const isPenthouse = raw === 'penthouse' || raw === 'penthouses';
  const isPrivate = raw === 'private' || raw === 'private_house' || raw === 'private_houses';
  const isVilla = raw === 'villa' || raw === 'villas';
  const isOffice = raw === 'office' || raw === 'offices';
  const isCommercial =
    raw === 'commercial' ||
    raw === 'trade' ||
    ['store', 'shopping_center', 'industrial_buildings', 'warehouse', 'commercial_space', 'whole_floor'].includes(raw);
  const isReligious = raw === 'religious' || raw === 'religious_sector' || l.category === 6;
  switch (id) {
    case 'apartment':
      return raw === '' || !(isGarden || isPenthouse || isPrivate || isVilla || isOffice || isCommercial || isReligious);
    case 'garden':
      return isGarden;
    case 'penthouses':
      return isPenthouse;
    case 'private_houses':
      return isPrivate;
    case 'villas':
      return isVilla;
    case 'offices':
      return isOffice;
    case 'commercial':
      return isCommercial;
    case 'religious_sector':
      return isReligious;
    default:
      return false;
  }
}

/* ---------- matching (TikTokFeedScreen.applyFeedFilters) ---------- */

const amenityOn = (l, keys) =>
  Boolean(l.amenities) && keys.some(k => l.amenities[k] === true || (typeof l.amenities[k] === 'number' && l.amenities[k] > 0));

const amenityMaxCount = (l, keys) => {
  if (!l.amenities) return 0;
  let max = 0;
  for (const k of keys) {
    const v = l.amenities[k];
    if (v === true) max = Math.max(max, 1);
    else if (typeof v === 'number' && v > 0) max = Math.max(max, v);
  }
  return max;
};

const parseIsoDate = value => {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isFreeCancellation = value => {
  const s = String(value || '').trim().toLowerCase();
  return (
    s === 'free' ||
    s === 'no_penalty' ||
    s === 'no-penalty' ||
    s === 'free_cancellation' ||
    s.includes('ללא קנס')
  );
};

const matchesTokens = (blob, query) =>
  query
    .split(/\s+/)
    .filter(Boolean)
    .every(token => blob.includes(token));

const LAND_PREDICATES = {
  own_private: l => l.landOwnership === 'private',
  own_administration: l => l.landOwnership === 'administration',
  agri_yes: l => l.agriculturalLand === 'yes',
  agri_not: l => l.agriculturalLand === 'not',
  plan_happy: l => l.planApproval === 'happy',
  plan_nothing: l => l.planApproval === 'nothing',
  plan_there_is: l => l.planApproval === 'there_is',
  mortgage_not: l => l.landInMortgage === 'not',
  mortgage_yes: l => l.landInMortgage === 'yes',
  permit_nothing: l => l.permit === 'nothing',
  permit_there_is: l => l.permit === 'there_is',
};

const COMMERCE_TYPES = new Set(TYPE_OPTIONS_COMMERCE.map(o => o.id));
const GLOBAL_TYPE_TO_CATEGORY = {
  offices: 2,
  commercial: 8,
  land: 7,
  apartments: 10,
  penthouses: 10,
  private_houses: 10,
  villas: 10,
  estates: 10,
  multi_family: 10,
};

/** Applies the left-rail filter sheets to raw API listing rows. */
export function applyFeedFilters(rows, filters, category) {
  if (!Object.values(filters).some(isFilterValueActive)) return rows;
  const c = num(category);
  const bnb = c === 5;
  const land = c === 7;
  const newFromDeveloper = c === 1;
  const selectedTypes = typeIds(filters.type);
  let out = rows.map(listingView);

  if (filters.price) {
    const {minPrice = 0, maxPrice = priceLimits(c).cap, checkInDate, checkOutDate, freeCancellation, hotDealOnly} =
      filters.price;
    const noUpperCap = Number(maxPrice) === priceLimits(c).cap;
    out = out.filter(l => {
      if (l.isPost && !land) return false;
      if (l.subscriptionType === 'company' && !land && !bnb) return false;
      if (l.rawPrice == null || l.rawPrice < minPrice) return false;
      return noUpperCap || l.rawPrice <= maxPrice;
    });
    if (bnb) {
      const wantIn = parseIsoDate(checkInDate);
      const wantOut = parseIsoDate(checkOutDate);
      if (wantIn || wantOut) {
        out = out.filter(l => {
          const lIn = parseIsoDate(l.checkInDate);
          const lOut = parseIsoDate(l.checkOutDate);
          if (!lIn && !lOut) return false;
          if (wantIn && lIn && wantIn < lIn) return false;
          if (wantOut && lOut && wantOut > lOut) return false;
          return true;
        });
      }
      if (freeCancellation) out = out.filter(l => isFreeCancellation(l.cancellationPolicy));
      if (hotDealOnly) out = out.filter(l => l.hotDeal);
    }
  }

  if (filters.rooms) {
    const {rooms: minRooms, area: minArea, floor: minFloor, parking, balcony, elevator, mamad, freeParking} =
      filters.rooms;
    const nfdIds = newFromDeveloper ? selectedTypes : [];
    out = out.filter(l => {
      if (minRooms != null) {
        const have = newFromDeveloper ? newDeveloperComparableMaxRooms(l, nfdIds) : l.rooms == null ? null : num(l.rooms);
        if (have == null || have < num(minRooms)) return false;
      }
      if (minArea != null) {
        const have = newFromDeveloper ? newDeveloperMeterComparableSqm(l, nfdIds) : l.area == null ? null : num(l.area);
        if (have == null || have < num(minArea)) return false;
      }
      if (minFloor != null && (l.floor == null || num(l.floor) < minFloor)) return false;
      if (parking > 0 && amenityMaxCount(l, ['חניה', 'חנייה', 'כמות חניות', 'parking']) < parking) return false;
      if (balcony > 0 && amenityMaxCount(l, ['מרפסת', 'מרפסה']) < balcony) return false;
      if (elevator === true && !amenityOn(l, ['מעלית'])) return false;
      if (mamad === true && !amenityOn(l, ['ממ״ד', 'ממ"ד', 'mamad'])) return false;
      if (freeParking === true) {
        const a = l.amenities;
        if (!a) return false;
        const free = a['חנייה בתשלום'] === 'ללא' || a.free_parking === true || a.freeParking === true || a['חניה בחינם'] === true;
        if (!free) return false;
      }
      return true;
    });
  }

  if (c === 2 && filters.office) {
    const o = filters.office;
    if (o.minArea != null) out = out.filter(l => l.area != null && num(l.area) >= num(o.minArea));
    if (o.minRooms != null) out = out.filter(l => l.rooms != null && num(l.rooms) >= num(o.minRooms));
    const officeTypes = [o.office && 'office', o.wholeFloor && 'whole_floor'].filter(Boolean);
    if (officeTypes.length > 0 || o.sharedSpaces) {
      out = out.filter(
        l => officeTypes.includes(l.apartmentTypeId) || (o.sharedSpaces && l.sharedSpacesCompany),
      );
    }
    if (o.parking) out = out.filter(l => amenityOn(l, ['חניה', 'חנייה']));
    if (o.elevator) out = out.filter(l => amenityOn(l, ['מעלית']));
    if (o.mamad) out = out.filter(l => amenityOn(l, ['ממ״ד', 'ממ"ד']));
  }

  if (filters.city) {
    const f = filters.city;
    const cityQuery = String(f.city || '').trim().toLowerCase();
    const streetQuery = String(f.street || '').trim().toLowerCase();
    const countryQuery = String(f.country || '').trim().toLowerCase();
    if (f.immediateEntry === true) {
      out = out.filter(l => {
        const a = l.amenities;
        return (
          !l.isPost &&
          Boolean(a) &&
          (a.immediate_entry === true || a.entry_immediate === true || a.immediateEntry === true || a['כניסה מיידית'] === true)
        );
      });
    }
    if (cityQuery || streetQuery || countryQuery) {
      out = out.filter(
        l =>
          matchesTokens(l.searchBlob, cityQuery) &&
          matchesTokens(l.searchBlob, streetQuery) &&
          matchesTokens(l.searchBlob, countryQuery),
      );
    }
    const regions = (f.regions || []).map(id => BNB_REGIONS.find(r => r.id === id)?.label || id);
    if (regions.length > 0) {
      out = out.filter(l => regions.some(label => l.searchBlob.includes(label.toLowerCase())));
    }
  }

  const apartmentTypes = typeIds(filters.apartmentType);
  if (apartmentTypes.length > 0) {
    out = out.filter(l =>
      apartmentTypes.some(apt => l.apartmentTypeId === apt || (apt === 'apartment' && l.apartmentTypeId === 'regular')),
    );
  }

  if (filters.meter != null && Number.isFinite(num(filters.meter))) {
    const minMeter = num(filters.meter);
    if (newFromDeveloper) {
      out = out.filter(l => newDeveloperMeterComparableSqm(l, selectedTypes) >= minMeter);
    } else if (!(c === 2 && filters.office?.minArea != null)) {
      out = out.filter(l => l.area != null && num(l.area) >= minMeter);
    }
  }

  if (selectedTypes.length > 0) {
    if (land) {
      out = out.filter(l => selectedTypes.some(id => LAND_PREDICATES[id]?.(l)));
    } else if (bnb) {
      out = out.filter(l => {
        const rawType = String(l.apartmentTypeId || l.propertyTypeRaw || '').trim().toLowerCase();
        return selectedTypes.some(id => {
          const t = id.toLowerCase();
          if (t === 'b&b' || t === 'bnb') return rawType === 'b&b' || rawType === 'bnb';
          return rawType === t;
        });
      });
    } else if (newFromDeveloper) {
      out = out.filter(l => selectedTypes.some(id => matchesNewFromDeveloperType(id, l)));
    } else {
      out = out.filter(l =>
        selectedTypes.some(id =>
          COMMERCE_TYPES.has(id)
            ? l.apartmentTypeId === id
            : GLOBAL_TYPE_TO_CATEGORY[id] != null && l.category === GLOBAL_TYPE_TO_CATEGORY[id],
        ),
      );
    }
  }

  if (filters.donam && (filters.donam.minDonam != null || filters.donam.maxDonam != null)) {
    const minSqm = num(filters.donam.minDonam ?? 0) * 1000;
    const maxSqm = num(filters.donam.maxDonam ?? 999999) * 1000;
    out = out.filter(l => l.area != null && num(l.area) >= minSqm && num(l.area) <= maxSqm);
  }

  if (filters.preferences && typeof filters.preferences === 'object') {
    const p = filters.preferences;
    if (p.gender === 'female') out = out.filter(l => l.preferredGender == null || l.preferredGender === 'אישה');
    else if (p.gender === 'male') out = out.filter(l => l.preferredGender == null || l.preferredGender === 'גבר');
    if (p.ageMin != null || p.ageMax != null) {
      const lo = Math.min(num(p.ageMin ?? 18), num(p.ageMax ?? 100));
      const hi = Math.max(num(p.ageMin ?? 18), num(p.ageMax ?? 100));
      const age = v => (v == null || String(v).trim() === '' || !Number.isFinite(num(v)) ? null : num(v));
      out = out.filter(l => {
        if (l.category !== 3) return true;
        const pMin = age(l.preferredAgeMin);
        const pMax = age(l.preferredAgeMax);
        if (pMin == null && pMax == null) return true;
        const a = pMin ?? 18;
        const b = pMax ?? 100;
        return a > b || (lo <= b && a <= hi);
      });
    }
    if (p.nonSmoker) out = out.filter(l => l.preferences.nonSmokers === true || l.preferences.nonSmoker === true);
    for (const key of ['students', 'stableJob', 'occasionalJob', 'immediateEntry']) {
      if (p[key]) out = out.filter(l => l.preferences[key] === true);
    }
  }

  return out.map(l => l.raw);
}