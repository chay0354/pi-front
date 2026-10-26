import {createContext, useContext} from 'react';
import {enrichListingForUserProfile} from './lib/enrichListingForUserProfile';
import {isAdsListingRecord} from './lib/listingShape';
import {getUserProfileImageUrl} from './lib/userProfileImage';
import {isCompanySubscriptionType, subscriptionTypes} from './lib/constant';

/**
 * `open(payload)` pushes a full-screen profile; `active` is false while a
 * profile covers the current screen (pause its videos and key handlers).
 */
export const ProfileNavContext = createContext({open: () => {}, active: true, current: null});

export const useProfileNav = () => useContext(ProfileNavContext);

/** Mobile App.mergeListingWithProfileContext. */
function mergeListingWithProfileContext(listing, base, extras = {}) {
  return {
    ...listing,
    ...extras,
    subscription_id: listing.subscription_id || listing.owner_id || base?.subscription_id || base?.owner_id,
    owner_id: listing.owner_id || listing.subscription_id || base?.owner_id || base?.subscription_id,
    creator_name:
      listing.creator_name || base?.creator_name || base?.name || base?.business_name || base?.broker_office_name,
    creator_email: listing.creator_email || base?.creator_email || base?.email,
    creator_profile_image_url: listing.creator_profile_image_url || getUserProfileImageUrl(base),
    company_logo_url: listing.company_logo_url || base?.company_logo_url || null,
    subscription_type: listing.subscription_type || listing.creator_subscription_type || base?.subscription_type,
  };
}

/** Mobile App.openListingAdProfile — null when the listing has no id. */
export function listingAdProfilePayload(listing, {base = null, extras = {}} = {}) {
  const listingId = listing?.id != null ? String(listing.id).trim() : '';
  if (!listingId) return null;
  return enrichListingForUserProfile(mergeListingWithProfileContext(listing, base, extras));
}

/** Feed card avatar / grid card (mobile TikTokFeedScreen → onOpenUserProfile). */
export function feedListingProfilePayload(listing, base = null) {
  if (!listing || typeof listing !== 'object') return listing;
  const payload = {...listing, _fromTikTokPost: true};
  const isFeedPost =
    payload.feed_post === true ||
    payload.isPostEntry === true ||
    String(payload.propertyTypeRaw || payload.propertyType || '').toLowerCase() === 'post';
  const isCompanyListing = isCompanySubscriptionType(payload.subscription_type || payload.creator_subscription_type);
  if (isAdsListingRecord(payload) && !isFeedPost) {
    return listingAdProfilePayload(payload, {
      base,
      extras: {_fromTikTokPost: true, ...(isCompanyListing ? {_forceListingAdProfile: true} : {})},
    });
  }
  return enrichListingForUserProfile(payload);
}

/** Home פרויקט נבחר (mobile onOpenFeatureListing). */
export function featuredProjectProfilePayload(listing, base = null) {
  return listingAdProfilePayload(listing, {
    base,
    extras: {_fromTikTokPost: true, _fromHomeFeatureProject: true, _forceListingAdProfile: true},
  });
}

/** בעלי מקצוע directory row (mobile ProfessionalsDirectoryScreen → onOpenProfessional). */
export function directoryProfilePayload(professional) {
  const subType = String(professional?.subscription_type || '').trim().toLowerCase();
  return {
    ...professional,
    _fromProfessionalsDirectory: true,
    _forceListingAdProfile: false,
    subscription_id: professional?.id || null,
    owner_id: professional?.id || null,
    creator_name: professional?.display_name || professional?.name || null,
    creator_profile_image_url: professional?.profile_image_url || null,
    profile_picture_url: professional?.profile_image_url || null,
    subscription_type: subType === 'broker' ? subscriptionTypes.broker : subscriptionTypes.professional,
    activity_regions: professional?.activity_regions || null,
    specializations: professional?.specializations || null,
  };
}
