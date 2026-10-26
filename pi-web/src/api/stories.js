import {apiBase, apiFetch} from './client';
import {resolveSubscriptionId} from './editPublish';

export async function deleteActiveStoriesByMediaUrl({subscriptionId, mediaUrl}) {
  const sid = resolveSubscriptionId(subscriptionId);
  const url = mediaUrl != null ? String(mediaUrl).trim() : '';
  if (!sid || !url) {
    throw new Error('subscription_id and media_url are required');
  }
  const response = await apiFetch(`${apiBase()}/api/stories/remove-by-media`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      subscription_id: sid,
      media_url: url,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to remove story');
  }
  return data;
}

export async function deleteActiveStoriesByFeedListingId({subscriptionId, listingId, mediaUrl}) {
  const sid = resolveSubscriptionId(subscriptionId);
  const lid = listingId != null ? String(listingId).trim() : '';
  if (!sid || !lid) {
    throw new Error('subscription_id and listing_id are required');
  }
  const payload = {
    subscription_id: sid,
    listing_id: lid,
  };
  const url = mediaUrl != null ? String(mediaUrl).trim() : '';
  if (url) payload.media_url = url;
  const response = await apiFetch(`${apiBase()}/api/stories/remove-by-listing`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to remove story');
  }
  return data;
}
