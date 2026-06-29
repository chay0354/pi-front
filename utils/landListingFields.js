/** Map DB land field values to canonical codes (Hebrew titles + API names). */

export function normalizeLandYesNot(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (s === 'yes' || s === 'not') return s;
  if (s === 'כן') return 'yes';
  if (s === 'לא') return 'not';
  return s;
}

export function normalizeLandOwnership(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (s === 'private' || s === 'administration') return s;
  if (s === 'פרטי') return 'private';
  if (s === 'מינהל') return 'administration';
  return s;
}

/** תב״ע + היתר: happy | nothing | there_is */
export function normalizeLandThreeState(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (s === 'happy' || s === 'nothing' || s === 'there_is') return s;
  if (s === 'מאושרת') return 'happy';
  if (s === 'אין') return 'nothing';
  if (s === 'יש') return 'there_is';
  return s;
}

export function landListingField(listing, snake, camel) {
  const v = listing?.[snake] ?? listing?.[camel];
  return v != null && String(v).trim() !== '' ? String(v).trim() : null;
}

/** Figma land profile chips — PNGs from new-profile-pages/lands */
const LAND_ATTR_ICONS = {
  plan: require('../assets/new-profile-pages/lands/taaba.png'),
  permit: require('../assets/new-profile-pages/lands/has-premmit.png'),
  agricultural: require('../assets/new-profile-pages/lands/farm-land.png'),
  ownershipPrivate: require('../assets/new-profile-pages/lands/private-owned.png'),
  ownershipAdmin: require('../assets/new-profile-pages/lands/maneger-owned.png'),
};

/**
 * Lands (category 7) attribute chips — show only when the field has a positive value:
 * - תב״ע: hide when אין / unset; מאושרת → "תב״ע מאושרת"; יש → "עם תב״ע"
 * - היתר / קרקע חקלאית: hide when אין / לא / unset
 * - בעלות: show only when private or administration is set
 */
const LAND_ATTR_CHIPS = [
  {
    id: 'plan',
    iconSource: LAND_ATTR_ICONS.plan,
    when: ({plan}) => plan === 'happy' || plan === 'there_is',
    label: ({plan}) => (plan === 'happy' ? 'תב״ע מאושרת' : 'עם תב״ע'),
  },
  {
    id: 'mortgage',
    iconSource: LAND_ATTR_ICONS.ownershipAdmin,
    when: ({mortgage}) => mortgage === 'yes',
    label: () => 'קרקע במושע',
  },
  {
    id: 'permit',
    iconSource: LAND_ATTR_ICONS.permit,
    when: ({permit}) => permit === 'there_is',
    label: () => 'עם היתר',
  },
  {
    id: 'agricultural',
    iconSource: LAND_ATTR_ICONS.agricultural,
    when: ({agricultural}) => agricultural === 'yes',
    label: () => 'קרקע חקלאית',
  },
  {
    id: 'ownership_admin',
    iconSource: LAND_ATTR_ICONS.ownershipAdmin,
    when: ({ownership}) => ownership === 'administration',
    label: () => 'בעלות מנהל',
  },
  {
    id: 'ownership_private',
    iconSource: LAND_ATTR_ICONS.ownershipPrivate,
    when: ({ownership}) => ownership === 'private',
    label: () => 'בעלות פרטית',
  },
];

/** Company category 7 — החברה מציעה parcel rows from `company_offers_land_sizes`. */
export function normalizeCompanyLandParcels(listing) {
  const raw =
    listing?.company_offers_land_sizes ?? listing?.companyOffersLandSizes ?? null;
  let arr = null;
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
      else if (parsed && Array.isArray(parsed.parcels)) arr = parsed.parcels;
    } catch {
      arr = null;
    }
  } else if (raw && typeof raw === 'object' && Array.isArray(raw.parcels)) {
    arr = raw.parcels;
  }
  if (!arr || !arr.length) return [];
  return arr
    .map((p, i) => ({
      unit: p?.unit === 'sqm' ? 'sqm' : 'dunam',
      area: Number(p?.area) || 0,
      price: Number(p?.price) || 0,
      _idx: i,
    }))
    .filter(p => p.area > 0 || p.price > 0);
}

function parseListingNumericPrice(listing) {
  if (listing?.rawPrice != null && listing.rawPrice !== '') {
    const n = Number(listing.rawPrice);
    if (!Number.isNaN(n)) return n;
  }
  if (listing?.price != null && listing?.price !== '') {
    const n = Number(String(listing.price).replace(/[^\d.-]/g, ''));
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

/** Company parcels, or broker/user `proposed_land` + listing price as a single offer row. */
export function normalizeLandOfferParcels(listing) {
  const companyRows = normalizeCompanyLandParcels(listing);
  if (companyRows.length > 0) return companyRows;

  const pl = listing?.proposed_land ?? listing?.proposedLand;
  if (!pl || typeof pl !== 'object') return [];

  const unit = pl.unit === 'sqm' ? 'sqm' : 'dunam';
  const area = Number(pl.area) || 0;
  const price =
    pl.price != null && pl.price !== ''
      ? Number(pl.price) || 0
      : parseListingNumericPrice(listing);

  if (area <= 0 && price <= 0) return [];
  return [{unit, area: area > 0 ? area : 1, price}];
}

export function landOffersSectionTitle(listing) {
  const st = String(
    listing?.subscription_type ?? listing?.subscriptionType ?? '',
  ).toLowerCase();
  return st === 'company' ? 'החברה מציעה' : 'קרקע מוצעת';
}

export function buildCompanyLandAttrChips(listing) {
  const state = {
    plan: normalizeLandThreeState(
      landListingField(listing, 'plan_approval', 'planApproval'),
    ),
    mortgage: normalizeLandYesNot(
      landListingField(listing, 'land_in_mortgage', 'landInMortgage'),
    ),
    permit: normalizeLandThreeState(landListingField(listing, 'permit', 'permit')),
    agricultural: normalizeLandYesNot(
      landListingField(listing, 'agricultural_land', 'agriculturalLand'),
    ),
    ownership: normalizeLandOwnership(
      landListingField(listing, 'land_ownership', 'landOwnership'),
    ),
  };

  return LAND_ATTR_CHIPS.filter(meta => meta.when(state)).map(meta => ({
    id: meta.id,
    label: meta.label(state),
    iconSource: meta.iconSource,
  }));
}
