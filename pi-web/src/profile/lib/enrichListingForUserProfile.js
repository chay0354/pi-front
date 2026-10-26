import {getListingFeedAvatarUrl, getUserProfileImageUrl} from './userProfileImage';
import {normalizeLandOfferParcels} from './landListingFields';

export function parseLandBlockParcelFromListing(listing) {
  let parcel =
    listing?.land_parcel != null && String(listing.land_parcel).trim() !== ''
      ? String(listing.land_parcel).trim()
      : listing?.landParcel != null && String(listing.landParcel).trim() !== ''
        ? String(listing.landParcel).trim()
        : '';
  let block =
    listing?.land_block != null && String(listing.land_block).trim() !== ''
      ? String(listing.land_block).trim()
      : listing?.landBlock != null && String(listing.landBlock).trim() !== ''
        ? String(listing.landBlock).trim()
        : '';
  const texts = [
    listing?.land_address,
    listing?.landAddress,
    listing?.address,
    listing?.location,
  ]
    .filter(v => v != null && String(v).trim() !== '')
    .map(v => String(v).trim());
  for (const text of texts) {
    for (const seg of text.split(/\s*\|\s*/)) {
      const s = seg.trim();
      if (!parcel) {
        const m = s.match(/^חלקה\s*:?\s*(.+)$/i) || s.match(/חלקה\s*:?\s*([0-9]+(?:\.[0-9]+)?)/);
        if (m) parcel = String(m[1]).trim();
      }
      if (!block) {
        const m = s.match(/^גוש\s*:?\s*(.+)$/i) || s.match(/גוש\s*:?\s*([0-9]+(?:\.[0-9]+)?)/);
        if (m) block = String(m[1]).trim();
      }
    }
    if (!parcel) {
      const m = text.match(/חלקה\s*:?\s*([0-9]+(?:\.[0-9]+)?)/);
      if (m) parcel = m[1];
    }
    if (!block) {
      const m = text.match(/גוש\s*:?\s*([0-9]+(?:\.[0-9]+)?)/);
      if (m) block = m[1];
    }
  }
  return {
    land_parcel: parcel || null,
    land_block: block || null,
  };
}

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
      ? `₪${String(Math.round(numericBasePrice)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
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

  const {land_parcel, land_block} = parseLandBlockParcelFromListing(listing);
  const landParcels = normalizeLandOfferParcels(listing);

  return {
    ...listing,
    land_parcel: land_parcel ?? listing.land_parcel ?? null,
    land_block: land_block ?? listing.land_block ?? null,
    company_offers_land_sizes:
      landParcels.length > 0
        ? landParcels
        : listing.company_offers_land_sizes ?? listing.companyOffersLandSizes ?? null,
    profileImageUrl:
      getListingFeedAvatarUrl(listing) || getUserProfileImageUrl(listing),
    price: priceDisplay || listing.price,
    purpose: purposeHebrew,
    location:
      String(listing.location || listing.address || '').trim() || 'מיקום לא זמין',
  };
}
