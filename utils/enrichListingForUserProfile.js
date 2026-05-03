import {getUserProfileImageUrl} from './userProfileImage';

/**
 * Aligns a raw GET /api/listings row with the shape TikTokFeedScreen passes to
 * onOpenUserProfile so UserProfile shows the same header / "last ad" as when
 * opening from the TikTok feed (swipe or list).
 */
export function enrichListingForUserProfile(listing) {
  if (!listing || typeof listing !== 'object') {
    return listing;
  }
  const listingCategory = parseInt(String(listing.category), 10) || 1;
  const numericBasePrice =
    listingCategory === 5
      ? parseFloat(
          listing.price_per_night ??
            listing.pricePerNight ??
            listing.price ??
            listing.budget ??
            0,
        ) || 0
      : parseFloat(listing.price || listing.budget || 0) || 0;
  const priceDisplay =
    numericBasePrice > 0
      ? `₪${numericBasePrice.toLocaleString()}`
      : listing.price != null && String(listing.price).trim() !== ''
        ? String(listing.price)
        : '';
  const purposeRaw = listing.purpose;
  const purposeHebrew =
    purposeRaw === 'rent'
      ? 'להשכרה'
      : purposeRaw === 'sale'
        ? 'למכירה'
        : typeof purposeRaw === 'string' &&
            purposeRaw !== 'rent' &&
            purposeRaw !== 'sale' &&
            String(purposeRaw).trim() !== ''
          ? String(purposeRaw).trim()
          : 'למכירה';

  return {
    ...listing,
    profileImageUrl: getUserProfileImageUrl(listing),
    price: priceDisplay || listing.price,
    purpose: purposeHebrew,
    location:
      String(listing.location || listing.address || '').trim() || 'מיקום לא זמין',
  };
}
