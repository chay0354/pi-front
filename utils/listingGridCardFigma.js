/**
 * Shared data + stat builders for the Figma grid listing card
 * (Pi AI search + "הנכסים שלי" / UserListings).
 */

export const HEB_M2 = 'מ״ר';

export const numOrNull = v => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const formatApartmentRoomsOrFloorForDisplay = v => {
  const n = numOrNull(v);
  if (n == null) return null;
  return String(Math.round(n));
};

export const formatApartmentAreaForDisplay = v => {
  const n = numOrNull(v);
  if (n == null) return null;
  const r = Math.round(n * 10) / 10;
  if (Math.abs(r - Math.round(r)) < 1e-6) {
    return String(Math.round(r));
  }
  return (Math.round(r * 10) / 10).toFixed(1);
};

/**
 * True only for **company** accounts (project ads: בניין / קומות / דירות).
 */
export const isCompanyListing = listing => {
  if (!listing) return false;
  const candidates = [
    listing.subscription_type,
    listing.subscriptionType,
    listing.creator_subscription_type,
    listing.creator?.subscription_type,
  ];
  for (const v of candidates) {
    if (typeof v === 'string' && v.toLowerCase().trim() === 'company') {
      return true;
    }
  }
  return false;
};

const companyStatInt = n => {
  const c = Math.floor(Number(n));
  return Number.isFinite(c) && c >= 0 ? c : 0;
};

/** Company project row: 1 → singular + number, else number + plural (natural Hebrew). */
export const formatCompanyBuildingsLabel = n => {
  const v = companyStatInt(n);
  if (v === 1) return 'בניין 1';
  return `${v} בניינים`;
};

export const formatCompanyFloorsLabel = n => {
  const v = companyStatInt(n);
  if (v === 1) return 'קומה 1';
  return `${v} קומות`;
};

export const formatCompanyApartmentsLabel = n => {
  const v = companyStatInt(n);
  if (v === 1) return 'דירה 1';
  return `${v} דירות`;
};

export const buildCardStats = listing => {
  if (isCompanyListing(listing)) {
    const gd = listing?.general_details || {};
    const buildings = numOrNull(gd.building_count) ?? 0;
    const floors = numOrNull(gd.floor_count) ?? 0;
    const apartments = numOrNull(gd.apartment_count) ?? 0;
    return [
      {
        key: 'buildings',
        icon: require('../assets/building_icon.png'),
        label: formatCompanyBuildingsLabel(buildings),
      },
      {
        key: 'floors',
        icon: require('../assets/floor_icon.png'),
        label: formatCompanyFloorsLabel(floors),
      },
      {
        key: 'apartments',
        icon: require('../assets/apartment_icon.png'),
        label: formatCompanyApartmentsLabel(apartments),
      },
    ];
  }
  const roomsD = formatApartmentRoomsOrFloorForDisplay(listing?.rooms);
  const areaD = formatApartmentAreaForDisplay(listing?.area);
  const floorD = formatApartmentRoomsOrFloorForDisplay(listing?.floor);
  return [
    {
      key: 'rooms',
      icon: require('../assets/apr-details/icons_6.png'),
      label: roomsD != null ? `${roomsD} חדרים` : 'ללא חדרים',
    },
    {
      key: 'area',
      icon: require('../assets/apr-details/icons_1.png'),
      label: areaD != null ? `${areaD} ${HEB_M2}` : `ללא ${HEB_M2}`,
    },
    {
      key: 'floor',
      icon: require('../assets/apr-details/icons_2.png'),
      label: floorD != null ? `קומה ${floorD}` : 'ללא קומה',
    },
  ];
};

export const formatPriceHe = listing => {
  const n =
    listing?.price != null && listing.price !== ''
      ? Number(listing.price)
      : listing?.budget != null && listing.budget !== ''
        ? Number(listing.budget)
        : NaN;
  if (Number.isNaN(n) || !Number.isFinite(n)) return 'מחיר לא צוין';
  return `₪${Math.round(n).toLocaleString('he-IL')}`;
};

export const purposeLabel = listing => {
  const raw = String(listing?.purpose || '').toLowerCase();
  return raw === 'rent' || raw === 'להשכרה' ? 'להשכרה' : 'למכירה';
};

export const cleanAddress = listing =>
  String(
    listing?.address ||
      listing?.search_address ||
      listing?.land_address ||
      listing?.project_name ||
      '—',
  ).trim();

export const firstImageUrl = listing => {
  const lis = listing?.listing_images;
  if (Array.isArray(lis)) {
    const main = lis.find(i => i?.image_type === 'main');
    if (main?.image_url) return main.image_url;
    const any = lis.find(i => i?.image_url);
    if (any?.image_url) return any.image_url;
  }
  if (Array.isArray(listing?.images)) {
    const first = listing.images[0];
    if (typeof first === 'string') return first;
    if (first?.uri) return first.uri;
    if (first?.image_url) return first.image_url;
  }
  return listing?.main_image_url || listing?.image_url || null;
};

export const listingImageUrls = listing => {
  const lis = listing?.listing_images;
  if (Array.isArray(lis) && lis.length > 0) {
    const urls = lis.map(i => i?.image_url).filter(Boolean);
    if (urls.length) return urls.slice(0, 5);
  }
  const urls = [];
  if (listing?.main_image_url) urls.push(listing.main_image_url);
  const extra = listing?.additional_image_urls;
  if (Array.isArray(extra)) {
    for (const u of extra) {
      if (u && typeof u === 'string' && urls.length < 5) urls.push(u);
    }
  }
  if (urls.length) return [...new Set(urls)].slice(0, 5);
  if (Array.isArray(listing?.images)) {
    for (const im of listing.images) {
      const s =
        typeof im === 'string' ? im : im?.uri || im?.image_url || null;
      if (s && urls.length < 5) urls.push(s);
    }
  }
  return urls.slice(0, 5);
};

export const brokerPiRatingFromListing = listing => {
  const raw = listing?.pi_value;
  if (raw == null || raw === '') return 5;
  const n = Number(raw);
  if (Number.isNaN(n) || !Number.isFinite(n)) return 5;
  const rounded = Math.round(n);
  return Math.min(5, Math.max(1, rounded));
};

/** Whole number 1–5; same rounding as `UserProfileScreen` display. */
export const clampPiDisplay = n => {
  const x = Math.round(Number(n));
  if (Number.isNaN(x) || !Number.isFinite(x)) {
    return 5;
  }
  return Math.min(5, Math.max(1, x));
};

/**
 * Same meaning as `displayPiRating` on `UserProfileScreen`: average of review
 * star ratings (rounded), or broker Pi from the listing when there are no reviews.
 * @param {Array<{rating?: number}>|null|undefined} reviews
 * @param {object|undefined} listing – used for `pi_value` when `reviews` is empty
 */
export const displayPiRatingFromReviews = (reviews, listing) => {
  const broker = brokerPiRatingFromListing(listing);
  if (!reviews || reviews.length === 0) {
    return broker;
  }
  const sum = reviews.reduce(
    (acc, r) => acc + (Number(r?.rating) || 0),
    0,
  );
  return clampPiDisplay(sum / reviews.length);
};

/**
 * Publisher subscription for Pi / company rules. Uses ad + creator fields only —
 * not `account_type` (unreliable vs real subscription on some rows).
 */
export const subscriptionTypeFromListing = listing => {
  if (!listing) return '';
  const candidates = [
    listing.subscription_type,
    listing.subscriptionType,
    listing.creator_subscription_type,
    listing.created_by_subscription_type,
    listing.creator?.subscription_type,
  ];
  for (const v of candidates) {
    if (typeof v === 'string' && String(v).trim() !== '') {
      return String(v).toLowerCase().trim();
    }
  }
  return '';
};

/** Pi badge: only company / broker / professional — never regular `user`. */
export const shouldShowListingPiRating = listing => {
  const t = subscriptionTypeFromListing(listing);
  if (!t) return false;
  if (t === 'user') return false;
  return t === 'company' || t === 'broker' || t === 'professional';
};

export const isPreSaleListing = listing => {
  const v = listing?.sale_at_presale;
  if (v === true) return true;
  if (typeof v === 'string') {
    const s = v.toLowerCase().trim();
    return s === 'true' || s === 't' || s === '1';
  }
  return false;
};
