import {resolveSubscriptionId} from './api';

export function listingOwnerSubscriptionId(listing) {
  if (!listing || typeof listing !== 'object') return '';
  const candidates = [
    listing.subscription_id,
    listing.subscriptionId,
    listing.owner_id,
    listing.ownerId,
  ];
  for (const v of candidates) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return '';
}

export function listingOwnerSubscriptionType(listing) {
  if (!listing || typeof listing !== 'object') return null;
  const candidates = [
    listing.subscription_type,
    listing.subscriptionType,
    listing.creator_subscription_type,
  ];
  for (const v of candidates) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s.toLowerCase();
  }
  return null;
}

/**
 * Subscription id/type written on create or update.
 * When editing an existing row, keep the listing owner (e.g. agency member)
 * even if the signed-in user is their marketing manager.
 */
export function resolvePublisherIdentityForSave(
  listing,
  currentUser,
  {editing = false} = {},
) {
  if (editing && listing) {
    const ownerId = listingOwnerSubscriptionId(listing);
    if (ownerId) {
      return {
        subscriptionId: ownerId,
        subscriptionType:
          listingOwnerSubscriptionType(listing) ??
          currentUser?.subscription_type ??
          null,
      };
    }
  }
  return {
    subscriptionId: resolveSubscriptionId(currentUser),
    subscriptionType: currentUser?.subscription_type ?? null,
  };
}
