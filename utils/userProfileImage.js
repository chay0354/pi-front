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
  const candidates = [
    entity.profile_picture_url,
    entity.profilePictureUrl,
    entity.profile_photo_url,
    entity.profilePhotoUrl,
    entity.creator_profile_image_url,
    entity.creatorProfileImageUrl,
    entity.profile_image_url,
    entity.profileImageUrl,
    entity.company_logo_url,
    entity.companyLogoUrl,
    entity.logo_url,
    entity.logoUrl,
  ];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (c != null && String(c).trim()) return String(c).trim();
  }
  return null;
}
