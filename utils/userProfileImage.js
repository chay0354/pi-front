/** @type {Map<string, string>} */
const profilePicLogLastSig = new Map();

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
  if (payload !== undefined) console.log('[profile-pic]', tag, payload);
  else console.log('[profile-pic]', tag);
}

/**
 * Keep `profile_picture_url` (API/DB) and `profileImageUrl` (camelCase) in sync on user objects.
 * @param {object|null|undefined} user
 * @returns {object|null|undefined}
 */
export function normalizeUserProfileAliases(user) {
  if (user == null || typeof user !== 'object') return user;
  const snake =
    user.profile_picture_url != null && String(user.profile_picture_url).trim()
      ? String(user.profile_picture_url).trim()
      : '';
  const camel =
    user.profileImageUrl != null && String(user.profileImageUrl).trim()
      ? String(user.profileImageUrl).trim()
      : '';
  const pic = snake || camel;
  if (!pic) return user;
  return {
    ...user,
    profile_picture_url: snake || camel,
    profileImageUrl: camel || snake,
  };
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
    entity.bnb_business_logo_url,
    entity.bnbBusinessLogoUrl,
    entity.logo_url,
    entity.logoUrl,
    entity.business_logo_url,
    entity.businessLogoUrl,
    entity.subscription?.company_logo_url,
    entity.subscription?.companyLogoUrl,
  ]);
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
