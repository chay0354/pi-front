/**
 * Match UserProfileScreen / feed heuristics for text/image posts.
 * Exported for App.js when opening a profile from Follow Hub.
 */
export function isPostListingRecord(item) {
  if (!item) return false;
  const type = String(
    item.propertyType ||
      item.property_type ||
      item.propertyTypeRaw ||
      item.apartmentTypeId ||
      '',
  ).toLowerCase();
  const description = String(item.description || item.desc || '').trim();
  if (
    type === 'post' ||
    type === 'posts' ||
    type === 'feed_post' ||
    type.includes('post') ||
    description.toLowerCase() === 'post' ||
    description === 'פוסט' ||
    item.feed_post === true ||
    item.feed_post === 'true' ||
    item.feed_post === 't' ||
    item.isPostEntry === true
  ) {
    return true;
  }
  const urls = [
    item.main_image_url,
    item.image_url,
    item.image,
    ...(Array.isArray(item.images)
      ? item.images.map(i =>
          i && typeof i === 'object' ? i.uri || i.image_url : i,
        )
      : []),
    ...(Array.isArray(item.listing_images)
      ? item.listing_images.map(i =>
          i && typeof i === 'object' ? i.image_url || i.uri : i,
        )
      : []),
  ].filter(Boolean);
  return urls.some(u => /post_\d/i.test(String(u)));
}

function getListingViewScore(item) {
  if (!item) return 0;
  const views = Number(item.view_count ?? item.views ?? 0) || 0;
  if (isPostListingRecord(item)) {
    const likes = Number(item.post_like_count ?? item.like_count ?? 0) || 0;
    return Math.max(views, likes);
  }
  return views;
}

/**
 * Picks a single listing/post to open a profile the same way as from TikTok
 * (hero = highest engagement — views, or post likes for feed posts).
 */
export function pickTopViewedListingForProfile(listings) {
  if (!Array.isArray(listings) || listings.length === 0) return null;
  const sorted = [...listings].sort(
    (a, b) => getListingViewScore(b) - getListingViewScore(a),
  );
  return sorted[0] || null;
}

/**
 * When we have a raw hub row and a chosen listing, ensure ids / names line up.
 */
export function mergeHubRowIntoListingPayload(row, listing) {
  if (!listing || typeof listing !== 'object') return listing;
  const sid = String(row?.id || '').trim();
  return {
    ...listing,
    subscription_id: listing.subscription_id || sid || listing.subscription_id,
    owner_id: listing.owner_id || sid || listing.owner_id,
    creator_name: listing.creator_name || row?.name || listing.creator_name,
  };
}
