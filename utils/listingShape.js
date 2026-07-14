/**
 * True when `u` looks like a row from GET /api/listings (ads), not a bare subscription profile.
 * Do not use `u.images` alone — API uses listing_images + main_image_url.
 */
export function isAdsListingRecord(u) {
  if (!u || u.id == null || String(u.id).trim() === '') return false;
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
