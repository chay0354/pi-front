/**
 * Shared data + stat builders for the Figma grid listing card
 * (Pi AI search + "הנכסים שלי" / UserListings).
 */

import {resolveAdVideoUri} from './videoPlayback';
import {
  computeBrokerProfessionalStarRating,
  isBrokerOrProfessionalSubscriptionType,
} from './brokerProfessionalStarRating';

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

/** Numeric price from API rows or TikTok feed rows (`rawPrice`, formatted `₪1,234`). */
const parseListingPriceNumber = listing => {
  const candidates = [
    listing?.rawPrice,
    listing?.price,
    listing?.price_per_night,
    listing?.pricePerNight,
    listing?.budget,
  ];
  for (const v of candidates) {
    if (v == null || v === '') continue;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const s = String(v).trim();
    if (!s) continue;
    const cleaned = s.replace(/[₪\s,]/g, '');
    const n = Number(cleaned);
    if (Number.isFinite(n) && !Number.isNaN(n)) return n;
  }
  return NaN;
};

export const formatPriceHe = listing => {
  const n = parseListingPriceNumber(listing);
  if (Number.isNaN(n) || !Number.isFinite(n)) return 'מחיר לא צוין';
  return `₪${Math.round(n).toLocaleString('he-IL')}`;
};

export const isPartnersListing = (listing, selectedCategory = null) => {
  if (selectedCategory != null && Number(selectedCategory) === 3) {
    return true;
  }
  if (Number(listing?.category) === 3) {
    return true;
  }
  const sp = String(
    listing?.search_purpose || listing?.searchPurposeKey || '',
  )
    .trim()
    .toLowerCase();
  return sp === 'enter' || sp === 'bring_in' || sp === 'partner';
};

export const isBnbListing = (listing, selectedCategory = null) => {
  if (selectedCategory != null && Number(selectedCategory) === 5) {
    return true;
  }
  return Number(listing?.category) === 5;
};

/** List/grid cards: hide חדרים / מ״ר / קומה for שותפים and BnB. */
export const shouldHideListingCardStats = (listing, selectedCategory = null) =>
  isPartnersListing(listing, selectedCategory) ||
  isBnbListing(listing, selectedCategory);

const PARTNERS_SEARCH_PURPOSE_LABELS = {
  enter: 'מחפש להכנס',
  bring_in: 'מחפש להכניס',
  partner: 'מחפש להכניס',
};

export const purposeLabel = (listing, selectedCategory = null) => {
  if (isPartnersListing(listing, selectedCategory)) {
    const fromUi = String(listing?.searchPurpose || '').trim();
    if (fromUi) return fromUi;
    const key = String(
      listing?.search_purpose || listing?.searchPurposeKey || '',
    )
      .trim()
      .toLowerCase();
    return PARTNERS_SEARCH_PURPOSE_LABELS[key] || 'מחפש להכניס';
  }
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

export const firstVideoUrl = listing => resolveAdVideoUri(listing);

const normalizeListingFeedDisplayPriority = listing => {
  const raw =
    listing?.feed_display_priority ?? listing?.feedDisplayPriority ?? '';
  const s = String(raw).trim().toLowerCase();
  if (s === 'mainimage' || s === 'main_image') return 'mainImage';
  return 'video';
};

/** Hero card on home: prefer video when both exist unless creator chose main image. */
export const resolveListingHeroMedia = listing => {
  if (!listing) return null;
  const imageUri = firstImageUrl(listing);
  const videoUri = firstVideoUrl(listing);
  if (videoUri && imageUri) {
    const priority = normalizeListingFeedDisplayPriority(listing);
    if (priority === 'mainImage') {
      return {type: 'image', uri: imageUri};
    }
    return {type: 'video', uri: videoUri, posterUri: imageUri};
  }
  if (videoUri) {
    return {type: 'video', uri: videoUri, posterUri: imageUri || null};
  }
  if (imageUri) {
    return {type: 'image', uri: imageUri};
  }
  return null;
};

export const listingHasHeroMedia = listing => !!resolveListingHeroMedia(listing);

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
 * Same meaning as `displayPiRating` on `UserProfileScreen`.
 * Company: average of review star ratings (rounded), or `pi_value` when empty.
 * Broker / professional: tier progression + regression (see brokerProfessionalStarRating).
 * @param {Array<{rating?: number, created_at?: string}>|null|undefined} reviews
 * @param {object|undefined} listing – `pi_value` + subscription type for fallbacks
 */
export const displayPiRatingFromReviews = (reviews, listing) => {
  const broker = brokerPiRatingFromListing(listing);
  if (!reviews || reviews.length === 0) {
    return broker;
  }

  const subType = subscriptionTypeFromListing(listing);
  if (isBrokerOrProfessionalSubscriptionType(subType)) {
    const tier = computeBrokerProfessionalStarRating(reviews);
    if (tier != null) {
      return tier;
    }
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

/** Pi badge / profile rating: company, broker, professional only — never regular `user`. */
export const isRateableSubscriptionType = type => {
  const t = String(type || '')
    .toLowerCase()
    .trim();
  return t === 'company' || t === 'broker' || t === 'professional';
};

/** Any subscription type can be followed (including regular `user`). */
export const isFollowableSubscriptionType = type => {
  const t = String(type || '')
    .toLowerCase()
    .trim();
  return (
    t === 'user' ||
    t === 'company' ||
    t === 'broker' ||
    t === 'professional'
  );
};

export const isFollowableListing = listing =>
  isFollowableSubscriptionType(subscriptionTypeFromListing(listing));

/** Pi badge: only company / broker / professional — never regular `user`. */
export const shouldShowListingPiRating = listing => {
  const t = subscriptionTypeFromListing(listing);
  if (!isRateableSubscriptionType(t)) return false;
  if (shouldShowCommercialLogoBadge(listing)) return false;
  return true;
};

export const isCommercialCategoryListing = listing =>
  Number(listing?.category) === 8;

/** מסחר (8): broker/company show office logo instead of Pi score. */
export const shouldShowCommercialLogoBadge = listing => {
  if (!isCommercialCategoryListing(listing)) return false;
  const t = subscriptionTypeFromListing(listing);
  return t === 'company' || t === 'broker';
};

export const getCompanyLogoUrlFromListing = listing => {
  if (!listing || typeof listing !== 'object') return null;
  const t = subscriptionTypeFromListing(listing);
  const candidates = [
    listing.company_logo_url,
    listing.companyLogoUrl,
    listing.creator_company_logo_url,
    listing.creatorCompanyLogoUrl,
    listing.logo_url,
    listing.logoUrl,
    listing.business_logo_url,
    t === 'company' ? listing.creator_profile_image_url : null,
    t === 'company' ? listing.creatorProfileImageUrl : null,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') return String(c).trim();
  }
  return null;
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
