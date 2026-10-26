/** ערוך/פרסם endpoints — same as mobile utils/api.js. */
import {apiBase, apiFetch, parseApiJsonResponse, toSubscriptionId} from './client';

export function resolveSubscriptionId(userOrId) {
  if (userOrId == null) return null;
  if (typeof userOrId !== 'object') return toSubscriptionId(userOrId);
  const candidates = [
    userOrId.id,
    userOrId.user_id,
    userOrId.userId,
    userOrId.subscription_id,
    userOrId.subscriptionId,
    userOrId.owner_id,
    userOrId.ownerId,
  ];
  for (const candidate of candidates) {
    const resolved = toSubscriptionId(candidate);
    if (resolved) return resolved;
  }
  return null;
}

export async function updateListingFreeze(listingId, isFrozen) {
  const response = await apiFetch(`${apiBase()}/api/listings/${listingId}`, {
    method: 'PATCH',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({is_frozen: !!isFrozen}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to update listing');
  return data;
}

/** Permanently delete a listing owned by the current user. */
export async function deleteListing(listingId, userEmail, subscriptionId) {
  const id = listingId != null ? String(listingId).trim() : '';
  const email = userEmail != null ? String(userEmail).trim() : '';
  if (!id || !email) throw new Error('listingId and userEmail required');
  try {
    const params = new URLSearchParams({user_email: email});
    const sub = subscriptionId != null ? String(subscriptionId).trim() : '';
    if (sub) params.set('subscription_id', sub);
    const response = await apiFetch(`${apiBase()}/api/listings/${encodeURIComponent(id)}?${params.toString()}`, {
      method: 'DELETE',
    });
    const data = await parseApiJsonResponse(response);
    if (!response.ok) throw new Error(data.error || 'Failed to delete listing');
    return data;
  } catch (error) {
    if (/unexpected token|<!doctype|לא זמין בשרת/i.test(String(error?.message || ''))) {
      throw new Error('מחיקת מודעות לא זמינה בשרת. יש לעדכן ולהפעיל מחדש את pi-back.');
    }
    throw error;
  }
}

export async function getBoostQuota(userEmail) {
  const email = userEmail ? String(userEmail).trim() : '';
  if (!email) throw new Error('user_email required');
  const response = await apiFetch(`${apiBase()}/api/listings/boost-quota?user_email=${encodeURIComponent(email)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to load boost quota');
  return data;
}

/** Boost a listing to HIGH exposure for 24 hours. Enforces the monthly quota. */
export async function boostListing(listingId, userEmail) {
  const id = listingId ? String(listingId).trim() : '';
  const email = userEmail ? String(userEmail).trim() : '';
  if (!id) throw new Error('listingId required');
  if (!email) throw new Error('user_email required');
  const response = await apiFetch(`${apiBase()}/api/listings/${id}/boost`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({user_email: email}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.error || 'Failed to boost listing');
    err.code = data?.code || null;
    err.quota = data?.quota ?? null;
    err.used = data?.used ?? null;
    err.remaining = data?.remaining ?? null;
    throw err;
  }
  return data;
}
