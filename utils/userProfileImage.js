import {
  resolveSubscriptionType,
  shouldShowProfileGoldRing,
  subscriptionTypes,
} from './constant';

/** @type {Map<string, string>} */
const profilePicLogLastSig = new Map();

/** Default avatar when no profile photo was uploaded. */
export const DEFAULT_PI_PROFILE_AVATAR = require('../assets/chat/noprofileimage.png');

/**
 * Dev-only: log profile-picture resolution. Filter the console by `[profile-pic]`.
 * Skips logging when the same tag + payload was already logged (stops render/refetch spam).
 * @param {string} tag - Short label (e.g. screen or action)
 * @param {object} [payload] - Serializable fields only
 */
export function logProfilePic(tag, payload) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  const sig = payload !== undefined ? JSON.stringify(payload) : '';
  if (profilePicLogLastSig.get(tag) === sig) return;
  profilePicLogLastSig.set(tag, sig);
}

function trimUrl(value) {
  return value != null && String(value).trim() ? String(value).trim() : '';
}

/**
 * Keep profile photo columns and camelCase aliases in sync on user objects.
 *
 * Company accounts edit `company_logo_url`, but most avatars resolve
 * `profile_picture_url` first — without syncing both, a logo change looks
 * like it never saved.
 */
export function normalizeUserProfileAliases(user) {
  if (user == null || typeof user !== 'object') return user;
  const type = resolveSubscriptionType(user);
  const isCompany = type === subscriptionTypes.company;

  const profilePic = trimUrl(user.profile_picture_url) || trimUrl(user.profileImageUrl);
  const companyLogo =
    trimUrl(user.company_logo_url) || trimUrl(user.companyLogoUrl);

  if (isCompany) {
    const pic = companyLogo || profilePic;
    if (!pic) return user;
    return {
      ...user,
      profile_picture_url: pic,
      profileImageUrl: pic,
      company_logo_url: pic,
      companyLogoUrl: pic,
    };
  }

  const pic = profilePic || companyLogo;
  if (!pic) return user;
  return {
    ...user,
    profile_picture_url: pic,
    profileImageUrl: pic,
  };
}

/** PATCH payload keys for the profile photo shown in edit + profile screens. */
export function buildProfilePhotoSavePayload(subscriptionType, photoUrl) {
  const url = trimUrl(photoUrl);
  const payload = {};
  if (!url) return payload;
  const type = resolveSubscriptionType(subscriptionType);
  if (type === subscriptionTypes.company) {
    payload.company_logo_url = url;
    payload.profile_picture_url = url;
  } else {
    payload.profile_picture_url = url;
  }
  return payload;
}

function isProfileImagePlaceholder(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return true;
  return (
    v.includes('/assets/assets/image-copy-10.png') ||
    v.endsWith('/image-copy-10.png') ||
    v === 'image-copy-10.png'
  );
}

function pickFirstValidImageUrl(candidates) {
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (c != null && String(c).trim() && !isProfileImagePlaceholder(c)) {
      return String(c).trim();
    }
  }
  return null;
}

/**
 * Personal profile photo only (no company logo).
 * @param {object|null|undefined} entity
 * @returns {string|null}
 */
export function getUserProfilePhotoUrl(entity) {
  if (!entity || typeof entity !== 'object') return null;
  return pickFirstValidImageUrl([
    entity.profile_picture_url,
    entity.profilePictureUrl,
    entity.profile_photo_url,
    entity.profilePhotoUrl,
    entity.profile_image_url,
    entity.profileImageUrl,
    entity.subscription?.profile_picture_url,
    entity.subscription?.profilePictureUrl,
    entity.subscription?.profile_image_url,
    entity.subscription?.profileImageUrl,
  ]);
}

/**
 * Company / business logo only (no profile photo).
 * @param {object|null|undefined} entity
 * @returns {string|null}
 */
export function getUserCompanyLogoUrl(entity) {
  if (!entity || typeof entity !== 'object') return null;
  return pickFirstValidImageUrl([
    entity.company_logo_url,
    entity.companyLogoUrl,
    entity.logo_url,
    entity.logoUrl,
    entity.business_logo_url,
    entity.businessLogoUrl,
    entity.subscription?.company_logo_url,
    entity.subscription?.companyLogoUrl,
  ]);
}

const parseListingGeneralDetails = raw => {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return null;
    try {
      const parsed = JSON.parse(s);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : null;
    } catch {
      return null;
    }
  }
  return null;
};

/** BnB category 5: `private` | `business` from general_details.bnb_host_type. */
export function getBnbHostType(listing) {
  if (!listing || typeof listing !== 'object') return null;
  const direct = listing.bnb_host_type ?? listing.bnbHostType;
  if (direct === 'private' || direct === 'business') return direct;
  const gd = parseListingGeneralDetails(listing.general_details);
  const fromGd = gd?.bnb_host_type ?? gd?.bnbHostType;
  return fromGd === 'private' || fromGd === 'business' ? fromGd : null;
}

export function isBnbBusinessListing(listing) {
  return Number(listing?.category) === 5 && getBnbHostType(listing) === 'business';
}

/** Gold ring for BnB business ads even when publisher is a regular user. */
export function shouldForceGoldRingForListing(listing) {
  if (!listing || typeof listing !== 'object') return false;
  if (shouldShowProfileGoldRing(resolveSubscriptionType(listing))) return true;
  return isBnbBusinessListing(listing);
}

function getListingPublisherProfilePhoto(listing) {
  return (
    getUserProfilePhotoUrl(listing) ||
    pickFirstValidImageUrl([
      listing.creator_profile_image_url,
      listing.creatorProfileImageUrl,
      listing.profile_image_url,
      listing.profileImageUrl,
    ])
  );
}

/**
 * Feed/list avatar for TikTok sidebar and grid cards.
 * BnB business: uploaded business logo when present, else publisher profile photo.
 * BnB private / other: standard profile resolution (regular users keep teal ring).
 */
export function getListingFeedAvatarUrl(listing) {
  if (!listing || typeof listing !== 'object') return null;
  if (Number(listing?.category) === 5) {
    if (isBnbBusinessListing(listing)) {
      const businessLogo = pickFirstValidImageUrl([
        listing.bnb_business_logo_url,
        listing.bnbBusinessLogoUrl,
      ]);
      if (businessLogo) return businessLogo;
      return getListingPublisherProfilePhoto(listing);
    }
    return getListingPublisherProfilePhoto(listing);
  }
  return getUserProfileImageUrl(listing);
}

/**
 * Resolve the best avatar/profile image URL from user-like objects
 * (subscription, currentUser, listing, chat participant, review user).
 * Prefers personal photo, then creator-specific listing fields, then company logo.
 *
 * @param {object|null|undefined} entity
 * @returns {string|null}
 */
export function getUserProfileImageUrl(entity) {
  if (!entity || typeof entity !== 'object') return null;
  return (
    getUserProfilePhotoUrl(entity) ||
    pickFirstValidImageUrl([
      entity.image_url,
      entity.imageUrl,
      entity.group_image_url,
      entity.groupImageUrl,
      entity.group_avatar_url,
      entity.groupAvatarUrl,
      entity.creator_profile_image_url,
      entity.creatorProfileImageUrl,
      entity.profile_image_url,
      entity.profileImageUrl,
    ]) ||
    getUserCompanyLogoUrl(entity)
  );
}
