/** Parse amenities JSON from a listing row (Hebrew keys from ad upload forms). */

const BALCONY_KEYS = ['מרפסת', 'מרפסה', 'balcony', 'mirpeset'];
const SUKKAH_BALCONY_KEYS = [
  'מרפסת לסוכה',
  'sukkah_balcony',
  'כולל מרפסת לסוכה',
];
const SUKKAH_BALCONY_AREA_KEYS = [
  'מרפסת לסוכה',
  'גודל מרפסת',
  'sukkah_balcony_area',
  'balcony_area',
];
const PARKING_KEYS = ['חנייה', 'חניה', 'כמות חניות', 'parking', 'parking_spaces'];
const ELEVATOR_KEYS = ['מעלית', 'מעלית שבת', 'elevator', 'maala'];
const MAMAD_KEYS = ['ממ"ד', 'ממ״ד', 'mamad', 'mamad_room'];
const IMMEDIATE_KEYS = ['כניסה מיידית', 'immediate_entry', 'entry_immediate'];

export function parseListingAmenities(listing) {
  if (!listing) return null;
  let raw = listing.amenities;
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof raw === 'object' ? raw : null;
}

export function amenityIsOn(am, keys) {
  if (!am || typeof am !== 'object') return false;
  return keys.some(k => {
    const v = am[k];
    return v === true || (typeof v === 'number' && v > 0);
  });
}

export function amenityMaxCount(am, keys) {
  if (!am || typeof am !== 'object') return 0;
  let max = 0;
  for (const k of keys) {
    const v = am[k];
    if (v === true) max = Math.max(max, 1);
    else if (typeof v === 'number' && v > 0) max = Math.max(max, v);
    else if (typeof v === 'string' && v.trim() !== '') {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n) && n > 0) max = Math.max(max, n);
    }
  }
  return max;
}

export function profileBalconyLabel(am) {
  const count = amenityMaxCount(am, BALCONY_KEYS);
  if (count <= 0) return 'ללא מרפסת';
  if (count === 1) return 'מרפסת';
  return `${count} מרפסות`;
}

function amenityNumericSqm(am, keys) {
  if (!am || typeof am !== 'object') return null;
  for (const k of keys) {
    const v = am[k];
    if (v === true || v === false) continue;
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

function formatAmenitySqm(n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function profileSukkahBalconyLabel(am) {
  const hasSukkah =
    amenityIsOn(am, SUKKAH_BALCONY_KEYS) ||
    amenityNumericSqm(am, SUKKAH_BALCONY_AREA_KEYS) != null;
  if (!hasSukkah) return 'ללא מרפסת סוכה';
  const sqm = amenityNumericSqm(am, SUKKAH_BALCONY_AREA_KEYS);
  const sqmLabel = formatAmenitySqm(sqm);
  if (sqmLabel) return `מרפסת סוכה ${sqmLabel} מ"ר`;
  return 'מרפסת סוכה';
}

export function profileParkingLabel(am) {
  const count = amenityMaxCount(am, PARKING_KEYS);
  if (count <= 0) return 'ללא חנייה';
  if (count === 1) return 'חנייה';
  return `${count} חניות`;
}

export function profileElevatorLabel(am) {
  return amenityIsOn(am, ELEVATOR_KEYS) ? 'מעלית' : 'ללא מעלית';
}

export function profileMamadLabel(am) {
  return amenityIsOn(am, MAMAD_KEYS) ? 'ממ"ד' : 'ללא ממ"ד';
}

export function profileImmediateEntryLabel(am) {
  return amenityIsOn(am, IMMEDIATE_KEYS)
    ? 'כניסה מיידית'
    : 'ללא כניסה מיידית';
}

function formatConditionLabel(cond) {
  if (!cond || String(cond).trim() === '') return null;
  const c = String(cond).trim();
  if (c === 'renovated' || c === 'משופץ') return 'משופץ';
  if (c === 'new' || c === 'חדש') return 'חדש';
  if (c === 'old' || c === 'ישן') return 'ישן';
  return c;
}

/**
 * Nine profile feature chips (area, rooms, floor, amenities…) for last-ad widget.
 */
export function buildProfileAdFeatureLabels(listing) {
  if (!listing) return [];

  const am = parseListingAmenities(listing);
  const r =
    listing.rooms != null && listing.rooms !== ''
      ? Number(listing.rooms)
      : null;
  const a =
    listing.area != null && listing.area !== ''
      ? Number(listing.area)
      : null;
  const f =
    listing.floor != null && listing.floor !== ''
      ? Number(listing.floor)
      : null;
  const condLabel = formatConditionLabel(listing.condition);
  const categoryNum = parseInt(listing.category ?? listing.category_id, 10);
  const balconyLabel =
    categoryNum === 6 ? profileSukkahBalconyLabel(am) : profileBalconyLabel(am);

  return [
    {iconKey: 'area', label: a != null && !isNaN(a) ? `${a} מ"ר` : 'ללא מ"ר'},
    {
      iconKey: 'rooms',
      label: r != null && !isNaN(r) ? `${r} חדרים` : 'ללא חדרים',
    },
    {
      iconKey: 'floor',
      label: f != null && !isNaN(f) ? `קומה ${f}` : 'ללא קומה',
    },
    {iconKey: 'balcony', label: balconyLabel},
    {iconKey: 'elevator', label: profileElevatorLabel(am)},
    {iconKey: 'parking', label: profileParkingLabel(am)},
    {iconKey: 'mamad', label: profileMamadLabel(am)},
    {iconKey: 'condition', label: condLabel || 'ללא מצב'},
    {iconKey: 'immediate', label: profileImmediateEntryLabel(am)},
  ];
}
