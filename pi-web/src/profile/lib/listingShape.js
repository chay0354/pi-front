/**
 * True when `u` is a TikTok feed post (not a real-estate ad listing).
 * Posts must not unlock ad-only chat actions (בלעדיות / שת״פ).
 */
export function isFeedPostListingRecord(u) {
  if (!u || typeof u !== 'object') return false;
  if (
    u.feed_post === true ||
    u.feed_post === 'true' ||
    u.feed_post === 't' ||
    u.isPostEntry === true ||
    u.isTextOnlyPost === true
  ) {
    return true;
  }
  const type = String(
    u.propertyType ||
      u.propertyTypeRaw ||
      u.apartmentTypeId ||
      u.type ||
      '',
  )
    .trim()
    .toLowerCase();
  return (
    type === 'post' ||
    type === 'posts' ||
    type === 'feed_post' ||
    (type.includes('post') && type !== 'postal_code')
  );
}

/**
 * True when `u` looks like a row from GET /api/listings (ads), not a bare subscription profile.
 * Do not use `u.images` alone — API uses listing_images + main_image_url.
 * Feed posts are excluded — they share listing-shaped fields but are not ads.
 */
export function isAdsListingRecord(u) {
  if (!u || u.id == null || String(u.id).trim() === '') return false;
  if (isFeedPostListingRecord(u)) return false;
  // Explicit open-from-listing flags (home featured project / company projects grid).
  if (u._forceListingAdProfile || u._fromCompanyProjects || u._fromHomeFeatureProject) {
    return true;
  }
  // Published listing rows always carry a category + owner, even with sparse media.
  const hasCategory =
    u.category != null && String(u.category).trim() !== '';
  const hasOwner =
    (u.subscription_id != null && String(u.subscription_id).trim() !== '') ||
    (u.owner_id != null && String(u.owner_id).trim() !== '');
  if (hasCategory && hasOwner) return true;
  return !!(
    (Array.isArray(u.listing_images) && u.listing_images.length > 0) ||
    (Array.isArray(u.listing_videos) && u.listing_videos.length > 0) ||
    (typeof u.main_image_url === 'string' && u.main_image_url.trim() !== '') ||
    (Array.isArray(u.images) && u.images.length > 0) ||
    u.price != null ||
    (typeof u.address === 'string' && u.address.trim() !== '') ||
    (typeof u.video_url === 'string' && u.video_url.trim() !== '') ||
    (typeof u.video_hls_url === 'string' && u.video_hls_url.trim() !== '') ||
    (typeof u.video_playback_url === 'string' &&
      u.video_playback_url.trim() !== '') ||
    (u.type === 'video' && u.video != null)
  );
}
