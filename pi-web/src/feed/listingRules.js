/**
 * Listing rules ported from the mobile feed (pi-front/screens/TikTokFeedScreen.js
 * and pi-front/utils/constant.js). Keep these in sync with mobile.
 */

export const DEFAULT_POST_DESCRIPTION = 'פוסט';
export const SALES_IMAGE_POST_KIND = 'sales_image';

export function parseListingGeneralDetails(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function isFeedPost(item) {
  if (!item) return false;
  const type = String(item.property_type || '').toLowerCase();
  if (type.includes('post')) return true;
  if (item.feed_post === true || item.feed_post === 'true' || item.feed_post === 't') {
    return true;
  }
  const description = String(item.description || '').trim().toLowerCase();
  return description === 'post' || description === DEFAULT_POST_DESCRIPTION;
}

export function isNewConditionListing(listing) {
  const c = String(listing?.condition ?? '').trim();
  if (!c) return false;
  return c.toLowerCase() === 'new' || c === 'חדש';
}

export function isSalesImageCompanionListing(listing) {
  const gd = parseListingGeneralDetails(listing?.general_details);
  return gd?.post_kind === SALES_IMAGE_POST_KIND;
}

const normalizeMediaUrl = url =>
  url == null || url === '' ? '' : String(url).trim().split('?')[0].toLowerCase();

/** Hide the companion feed post that mirrors an ad's תמונה מכירתית. */
export function excludeSalesImageCompanionListings(listings) {
  const rows = Array.isArray(listings) ? listings.filter(Boolean) : [];
  const salesUrls = new Set();
  for (const row of rows) {
    if (isSalesImageCompanionListing(row)) continue;
    const url = normalizeMediaUrl(row.sales_image_url);
    if (url) salesUrls.add(url);
  }
  return rows.filter(row => {
    if (isSalesImageCompanionListing(row)) return false;
    if (!isFeedPost(row)) return true;
    const main = normalizeMediaUrl(row.main_image_url);
    const video = normalizeMediaUrl(row.video_url);
    if (main && salesUrls.has(main)) return false;
    if (video && salesUrls.has(video)) return false;
    return true;
  });
}

export function mergeListingRows(target, rows) {
  const seen = new Set(target.map(l => String(l?.id ?? '')).filter(Boolean));
  for (const row of rows || []) {
    const id = String(row?.id ?? '');
    if (id && !seen.has(id)) {
      seen.add(id);
      target.push(row);
    }
  }
  return target;
}

export function formatTimeAgo(iso) {
  if (!iso) return 'לפני רגע';
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return 'לפני רגע';
  const deltaSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (deltaSec < 60) return 'לפני רגע';
  const mins = Math.floor(deltaSec / 60);
  if (mins < 60) return `לפני ${mins} דק׳`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  return `לפני ${Math.floor(hours / 24)} ימים`;
}

function listingImages(listing) {
  const images = listing.listing_images || [];
  const main = images.find(img => img.image_type === 'main' && img.image_url);
  const additional = images.filter(img => img.image_type === 'additional' && img.image_url);
  const urls = [main, ...additional].filter(Boolean).map(img => img.image_url);
  if (urls.length) return urls;
  if (listing.main_image_url) return [String(listing.main_image_url).trim()];
  return [];
}

function listingVideoUrl(listing) {
  const video = listing.listing_videos?.[0];
  return (
    listing.video_playback_url ||
    video?.video_url ||
    listing.video_url ||
    null
  );
}

/** Mobile normalizeListingFeedDisplayPriority: video unless the creator chose "תמונה ראשית". */
function feedDisplayPriority(listing) {
  const s = String(listing?.feed_display_priority ?? listing?.feedDisplayPriority ?? '')
    .trim()
    .toLowerCase();
  return s === 'mainimage' || s === 'main_image' ? 'mainImage' : 'video';
}

/**
 * Mobile isVideoAdListing (top-bar "וידאו"): an ad (not a post) whose feed page is its
 * video — playable or still processing, and shown before the photos.
 */
export function isVideoAdListing(listing) {
  if (!listing || isFeedPost(listing)) return false;
  const playback = listingVideoUrl(listing);
  const rawVideoUrl = String(listing.video_url || '').trim();
  const processing =
    Boolean(rawVideoUrl) && !playback && String(listing.video_status || '').toLowerCase() !== 'failed';
  if (!playback && !processing) return false;
  return listingImages(listing).length === 0 || feedDisplayPriority(listing) === 'video';
}

const positive = v => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Hashtags live in general_details.hashtags or a top-level hashtags array. */
export function getListingHashtags(listing) {
  if (Array.isArray(listing?.hashtags)) {
    return listing.hashtags
      .map(t => String(t || '').trim().replace(/^#+/, ''))
      .filter(Boolean);
  }
  const gd = parseListingGeneralDetails(listing?.general_details);
  let raw = gd?.hashtags ?? null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      raw = Array.isArray(parsed) ? parsed : null;
    } catch {
      raw = raw
        .split(/[\s,]+/)
        .map(t => t.trim().replace(/^#+/, ''))
        .filter(Boolean);
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map(t => String(t || '').trim().replace(/^#+/, '')).filter(Boolean);
}

export function subscriptionType(listing) {
  const candidates = [
    listing?.subscription_type,
    listing?.creator_subscription_type,
    listing?.created_by_subscription_type,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.toLowerCase().trim();
  }
  return '';
}

const BUSINESS_TYPES = new Set(['company', 'broker', 'professional', 'project_marketer']);

/** Pi badge: company, broker, professional, project marketer. */
function shouldShowPiRating(listing) {
  return BUSINESS_TYPES.has(subscriptionType(listing));
}

const imageUrl = v => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s && s !== 'null' && s !== 'undefined' ? s : null;
};

function bnbBusinessLogo(listing) {
  return imageUrl(listing?.bnb_business_logo_url) || imageUrl(listing?.bnbBusinessLogoUrl);
}

/** BnB ad published as פרטי / עסקי (mobile resolveBnbListingHostType). */
function bnbHostType(listing) {
  if (Number(listing?.category) !== 5) return null;
  const gd = parseListingGeneralDetails(listing.general_details);
  const explicit = listing.bnb_host_type ?? listing.bnbHostType ?? gd?.bnb_host_type ?? gd?.bnbHostType;
  if (explicit === 'private' || explicit === 'business') return explicit;
  if (bnbBusinessLogo(listing)) return 'business';
  return BUSINESS_TYPES.has(subscriptionType(listing)) ? 'business' : 'private';
}

/**
 * Avatar ring like mobile ProfileAvatar: gold for business accounts and for BnB ads
 * published as עסקי (even by a regular user), teal for regular users.
 */
function avatarRing(listing) {
  return BUSINESS_TYPES.has(subscriptionType(listing)) || bnbHostType(listing) === 'business' ? 'gold' : 'user';
}

/** Mobile getListingFeedAvatarUrl: profile photo first; BnB falls back to the ad's business logo. */
function creatorAvatar(listing) {
  return (
    imageUrl(listing.creator_profile_image_url) ||
    imageUrl(listing.creatorProfileImageUrl) ||
    imageUrl(listing.profile_image_url) ||
    imageUrl(listing.company_logo_url) ||
    bnbBusinessLogo(listing)
  );
}

/** Broker / professional start at 1 and climb by review count (5, 15, 35, 75, 155). */
const BROKER_STAR_THRESHOLDS = [5, 15, 35, 75, 155];

function piRatingNumber(listing) {
  const type = subscriptionType(listing);
  if (type === 'broker' || type === 'professional' || type === 'project_marketer') {
    const total = Math.max(0, Number(listing.review_count) || 0);
    let stars = 0;
    for (let i = BROKER_STAR_THRESHOLDS.length - 1; i >= 0; i -= 1) {
      if (total >= BROKER_STAR_THRESHOLDS[i]) {
        stars = i + 1;
        break;
      }
    }
    return stars === 0 ? 1 : stars;
  }
  const raw = listing?.pi_value;
  if (raw == null || raw === '') return 5;
  const rounded = Math.round(Number(raw));
  if (!Number.isFinite(rounded)) return 5;
  return Math.min(5, Math.max(1, rounded));
}

const COMPANY_STAT_KEYS = {
  floors: ['floor_count', 'floorCount', 'companyFloorCount', 'floors'],
  apartments: ['apartment_count', 'apartmentCount', 'companyApartmentCount', 'apartments'],
};

function companyStat(listing, gd, keys) {
  for (const key of keys) {
    const raw = listing?.[key] ?? gd?.[key];
    if (raw == null || raw === '') continue;
    const n = Math.floor(Number(raw));
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

function isTruthyFlag(v) {
  if (v === true || v === 1) return true;
  if (typeof v !== 'string') return false;
  const s = v.toLowerCase().trim();
  return s === 'true' || s === 't' || s === '1';
}

/** Company project ad (not land): mobile drops the price and shows project stats. */
function companyDetails(listing) {
  if (subscriptionType(listing) !== 'company' || Number(listing.category) === 7) return null;
  const gd = parseListingGeneralDetails(listing.general_details) || {};
  const commercial = Number(listing.category) === 8;
  return {
    preSale: isTruthyFlag(listing.sale_at_presale ?? listing.saleAtPresale),
    projectName: String(listing.project_name || '').trim(),
    openHouse: Boolean(String(gd.open_house_date || '').trim()),
    floors: commercial ? null : companyStat(listing, gd, COMPANY_STAT_KEYS.floors),
    apartments: commercial ? null : companyStat(listing, gd, COMPANY_STAT_KEYS.apartments),
  };
}

export const formatCompanyFloors = n => (n === 1 ? 'קומה 1' : `${n} קומות`);
export const formatCompanyApartments = n => (n === 1 ? 'דירה 1' : `${n} דירות`);

export function formatCount(n) {
  const num = Number(n) || 0;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(num);
}

/** Shape a DB listing for the web feed card. */
export function toFeedItem(listing) {
  const images = listingImages(listing);
  const price = positive(listing.price) ?? positive(listing.price_per_night);
  const isPost = isFeedPost(listing);
  return {
    id: String(listing.id),
    raw: listing,
    isPost,
    creatorName: String(listing.creator_name || '').trim(),
    creatorAvatar: creatorAvatar(listing),
    avatarRing: avatarRing(listing),
    timeAgo: formatTimeAgo(listing.created_at),
    description: String(listing.description || '').trim(),
    images,
    videoUrl: listingVideoUrl(listing),
    preferVideo: feedDisplayPriority(listing) === 'video',
    displayOption:
      String(listing.display_option ?? listing.displayOption ?? '')
        .trim()
        .toLowerCase() === 'collage'
        ? 'collage'
        : 'slideshow',
    purpose: listing.purpose === 'rent' ? 'rent' : 'sale',
    price,
    area: positive(listing.area),
    floor: listing.floor != null && listing.floor !== '' ? Number(listing.floor) : null,
    rooms: positive(listing.rooms),
    address: String(listing.address || '').trim(),
    postAddress: String(listing.address || listing.creator_business_address || '').trim(),
    likeCount: isPost
      ? Number(listing.post_like_count ?? listing.like_count) || 0
      : Number(listing.like_count) || 0,
    commentCount: Number(listing.comment_count) || 0,
    shareCount: Number(listing.share_count) || 0,
    viewCount: Number(listing.view_count) || 0,
    hashtags: getListingHashtags(listing),
    piRating: shouldShowPiRating(listing) ? piRatingNumber(listing) : null,
    company: isPost ? null : companyDetails(listing),
    postText: postTextPayload(listing, isPost),
  };
}

/** Text drawn on top of a post when it was not baked into the image. */
function postTextPayload(listing, isPost) {
  if (!isPost) return null;
  const gd = parseListingGeneralDetails(listing?.general_details);
  if (!gd || gd.post_text_baked === true) return null;
  const overlays = gd.post_text_overlays;
  if (!Array.isArray(overlays) || overlays.length === 0) return null;
  return {
    overlays,
    previewWidth: Number(gd.post_overlay_preview_w) || Number(gd.post_overlay_stage_w) || 0,
    previewHeight: Number(gd.post_overlay_preview_h) || Number(gd.post_overlay_stage_h) || 0,
  };
}

/** Mobile drops rows with no media and no description before building the feed. */
export function hasFeedContent(listing) {
  const hasMedia =
    (listing.listing_images || []).length > 0 || (listing.listing_videos || []).length > 0;
  return hasMedia || String(listing.description || '').trim().length > 0;
}
