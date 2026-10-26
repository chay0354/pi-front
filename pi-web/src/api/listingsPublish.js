/** Ad publish / update endpoints — same as mobile utils/api.js. */
import {apiBase, apiFetch, toSubscriptionId, uploadFile as uploadFileViaSignedUrl} from './client';
import {resolveSubscriptionId} from './editPublish';

export {resolveSubscriptionId, toSubscriptionId};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Avoid alerts showing "[object Object]" when the API returns error objects. */
export function errorMessageFromUnknown(value, fallback = 'Upload failed') {
  if (value == null || value === '') return fallback;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (value instanceof Error) {
    return value.message?.trim() || fallback;
  }
  if (typeof value === 'object') {
    const nested = typeof value.error === 'string' ? value.error : value.error?.message || value.error?.details;
    const msg = value.message || nested || value.details || value.statusText;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
  }
  return fallback;
}

function errorMessageFromApiBody(data, fallback) {
  if (!data || typeof data !== 'object') return fallback;
  return errorMessageFromUnknown(
    data.error ?? data.message ?? data.details,
    typeof data.details === 'string' && data.details.trim() ? data.details.trim() : fallback,
  );
}

/** Picked file `{uri, type, name, file?}` → Supabase (signed URL). Resolves `{success, url, fileName}`. */
export async function uploadFile(file, folder = 'general', options = {}) {
  try {
    return await uploadFileViaSignedUrl(file, folder, options);
  } catch (error) {
    console.error('Error uploading file:', errorMessageFromUnknown(error, 'Upload failed'));
    if (error instanceof Error) throw error;
    throw new Error(errorMessageFromUnknown(error, 'Upload failed'));
  }
}

/** Story slide (separate from ads). */
export async function createStory(payload) {
  const body = {
    subscription_id: payload?.subscription_id,
    media_url: payload?.media_url,
  };
  if (payload?.general_details && typeof payload.general_details === 'object') {
    body.general_details = payload.general_details;
  }
  const response = await apiFetch(`${apiBase()}/api/stories`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create story');
  }
  return data;
}

/** Mirror תמונה מכירתית as a home story ring slide (not a TikTok feed post). */
export async function createSalesImageStory({imageUrl, subscriptionId, generalDetails = null}) {
  const url = String(imageUrl || '').trim();
  if (!url) {
    throw new Error('Sales image URL is required');
  }
  const subId = resolveSubscriptionId(subscriptionId);
  if (!subId) {
    throw new Error('Valid subscription id is required');
  }
  return createStory({
    subscription_id: subId,
    media_url: url,
    general_details: generalDetails && typeof generalDetails === 'object' ? generalDetails : undefined,
  });
}

export async function createListing(listingData) {
  try {
    const response = await apiFetch(`${apiBase()}/api/listings`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(listingData),
    });
    const data = await response.json();
    if (!response.ok) {
      const errorMsg = errorMessageFromApiBody(data, 'Failed to create listing');
      console.error('API error:', errorMsg);
      throw new Error(errorMsg);
    }
    return data;
  } catch (error) {
    console.error('Error creating listing:', error);
    throw error;
  }
}

export async function updateListing(listingId, listingData) {
  const id = listingId != null ? String(listingId).trim() : '';
  if (!UUID_REGEX.test(id)) {
    throw new Error('Invalid listing id for update');
  }
  try {
    const response = await apiFetch(`${apiBase()}/api/listings/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(listingData),
    });
    const data = await response.json();
    if (!response.ok) {
      const errorMsg = errorMessageFromApiBody(data, 'Failed to update listing');
      console.error('API error:', errorMsg);
      throw new Error(errorMsg);
    }
    return data;
  } catch (error) {
    console.error('Error updating listing:', error);
    throw error;
  }
}
