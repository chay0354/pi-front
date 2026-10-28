/**
 * Backend client — same server and endpoints as the mobile app (pi-front/utils/api.js).
 * Set VITE_API_URL to point at a local pi-back. Production defaults live in publicConfig.js.
 */

import {API_URL, SUPABASE_ANON_KEY, SUPABASE_URL} from '../publicConfig';

const DEFAULT_TIMEOUT_MS = 30000;

export function apiBase() {
  return API_URL;
}

export async function apiFetch(url, {timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...init} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    return await fetch(url, {...init, signal: controller.signal});
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export async function getListings(options = {}) {
  const {
    status = 'published',
    category,
    subscription_type: subscriptionType,
    has_video: hasVideo,
    condition,
    subscription_id: subscriptionId,
    user_id: userId,
    favorites_only: favoritesOnly,
    search_purpose: searchPurpose,
    feed_post: feedPost,
    hospitality_nature: hospitalityNature,
    land_in_mortgage: landInMortgage,
    permit,
    plan_approval: planApproval,
    timeoutMs,
    signal,
  } = options;

  const params = new URLSearchParams({status});
  if (category) params.append('category', category);
  if (subscriptionType != null && subscriptionType !== '') {
    const value = Array.isArray(subscriptionType)
      ? subscriptionType.join(',')
      : String(subscriptionType);
    if (value) params.append('subscription_type', value);
  }
  if (hasVideo === true) params.append('has_video', 'true');
  if (condition != null && String(condition).trim() !== '') {
    params.append('condition', String(condition).trim().toLowerCase());
  }
  if (subscriptionId != null && subscriptionId !== '') {
    params.append('subscription_id', String(subscriptionId));
  }
  if (userId != null && String(userId).trim() !== '') {
    params.append('user_id', String(userId).trim());
  }
  if (favoritesOnly === true) params.append('favorites_only', 'true');
  const trimmed = v => (v != null ? String(v).trim() : '');
  if (trimmed(searchPurpose)) {
    params.append('search_purpose', trimmed(searchPurpose).toLowerCase());
  }
  if (feedPost === true) params.append('feed_post', 'true');
  if (trimmed(hospitalityNature)) params.append('hospitality_nature', trimmed(hospitalityNature));
  if (trimmed(landInMortgage)) params.append('land_in_mortgage', trimmed(landInMortgage));
  if (trimmed(permit)) params.append('permit', trimmed(permit));
  if (trimmed(planApproval)) params.append('plan_approval', trimmed(planApproval));

  const response = await apiFetch(`${apiBase()}/api/listings?${params}`, {
    method: 'GET',
    headers: {'Content-Type': 'application/json'},
    ...(timeoutMs > 0 ? {timeoutMs} : {}),
    signal,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to fetch listings');
  }
  return data;
}

/** Recent profile searches for the feed "אחרונים" list. */
export async function getRecentUserSearches(userEmail) {
  const email = userEmail ? String(userEmail).trim() : '';
  if (!email) return {success: true, recent: []};
  const response = await apiFetch(`${apiBase()}/api/search/users/recent?user_email=${encodeURIComponent(email)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to load recent searches');
  return data;
}

export async function recordUserSearch(userEmail, targetSubscriptionId) {
  const email = userEmail ? String(userEmail).trim() : '';
  const target = targetSubscriptionId != null ? String(targetSubscriptionId).trim() : '';
  if (!email || !target) return {success: false};
  try {
    const response = await apiFetch(`${apiBase()}/api/search/users/recent`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({user_email: email, target_subscription_id: target}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return {success: false};
    return data;
  } catch {
    return {success: false};
  }
}

export async function clearRecentUserSearches(userEmail) {
  const email = userEmail ? String(userEmail).trim() : '';
  if (!email) return {success: false};
  try {
    const response = await apiFetch(`${apiBase()}/api/search/users/recent?user_email=${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return {success: false};
    return data;
  } catch {
    return {success: false};
  }
}

/** Pi AI (Gemini) ranking — mobile piAiSearchListings. Resolves to {success, ids} / {success:false, error}. */
export async function piAiSearchListings(query, listingSummaries, {signal} = {}) {
  try {
    const response = await apiFetch(`${apiBase()}/api/ai/pi-search`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query, listings: listingSummaries}),
      // Gemini model fallbacks can take >30s.
      timeoutMs: 90000,
      signal,
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      return {success: false, error: data?.error || `HTTP ${response.status}`};
    }
    return {success: true, ids: Array.isArray(data.ids) ? data.ids : []};
  } catch (error) {
    if (signal?.aborted) throw error;
    return {success: false, error: error?.message};
  }
}

/** Reviews left on a business profile, newest first (mobile getReviews). */
export async function getReviews(targetSubscriptionId, {signal} = {}) {
  const params = new URLSearchParams({target_subscription_id: String(targetSubscriptionId)});
  const response = await apiFetch(`${apiBase()}/api/reviews?${params}`, {
    method: 'GET',
    headers: {'Content-Type': 'application/json'},
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || 'Failed to load reviews');
  }
  return Array.isArray(data?.reviews) ? data.reviews : [];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Subscription UUID or null (mobile toSubscriptionId). */
export function toSubscriptionId(id) {
  if (id == null) return null;
  const trimmed = String(id).trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

/** Public subscription row (mobile getSubscription); resolves to `{subscription: null}` on 404. */
export async function getSubscription(subscriptionId, {signal} = {}) {
  if (!subscriptionId) return {success: false, subscription: null};
  const response = await apiFetch(`${apiBase()}/api/subscription/${subscriptionId}`, {
    method: 'GET',
    headers: {'Content-Type': 'application/json'},
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404) return {success: false, subscription: null};
    throw new Error(data?.error || 'Failed to fetch subscription');
  }
  return data;
}

/** לייקים / עוקבים / עוקב counts for a profile (mobile getFollowStats). */
export async function getFollowStats(userId, {signal} = {}) {
  const params = new URLSearchParams({user_id: String(userId || '').trim()});
  const response = await apiFetch(`${apiBase()}/api/follows/stats?${params}`, {cache: 'no-store', signal});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to fetch follow stats');
  return data;
}

function followTypeLabel(type) {
  const t = String(type || '').trim().toLowerCase();
  if (t === 'broker') return 'תיווך';
  if (t === 'company') return 'חברה';
  if (t === 'project_marketer') return 'משווק פרויקטים';
  if (t === 'professional') return 'מקצועי';
  return 'משתמש';
}

function supabaseRestConfig() {
  return {url: SUPABASE_URL, key: SUPABASE_ANON_KEY};
}

async function supabaseRestGet(pathWithQuery) {
  const {url, key} = supabaseRestConfig();
  if (!url || !key) return null;
  const response = await fetch(`${url}/rest/v1/${pathWithQuery}`, {
    headers: {apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json'},
  });
  if (!response.ok) return null;
  return response.json();
}

function mapSubscriptionToFollowHubRow(sub, extras = {}) {
  const name = String(sub?.name || sub?.contact_person_name || sub?.business_name || sub?.broker_office_name || 'משתמש').trim();
  const imageUrl = String(sub?.profile_picture_url || '').trim() || String(sub?.company_logo_url || '').trim() || null;
  return {
    id: String(sub.id),
    request_id: extras.request_id || null,
    outgoing_follow_pending: !!extras.outgoing_follow_pending,
    is_mutual_follow: false,
    name,
    email: sub?.email || null,
    subtitle: followTypeLabel(sub?.subscription_type),
    subscription_type: sub?.subscription_type != null ? String(sub.subscription_type).trim().toLowerCase() : null,
    viewer_rating_avg: null,
    image_url: imageUrl,
    is_self: false,
    is_following_by_viewer: !!extras.is_following_by_viewer,
    has_pending_request_by_viewer: !!extras.has_pending_request_by_viewer,
    created_at: extras.created_at || null,
  };
}

/** Live hub can omit pending outgoing follows; read them directly, same as mobile. */
async function fetchOutgoingPendingFollowRows(userId, q = '') {
  const id = String(userId || '').trim();
  if (!id) return [];
  const requests = await supabaseRestGet(
    `user_follow_requests?requester_subscription_id=eq.${encodeURIComponent(id)}&status=eq.pending&select=id,target_subscription_id,created_at&order=created_at.desc`,
  );
  if (!Array.isArray(requests) || requests.length === 0) return [];
  const targetIds = [...new Set(requests.map(r => String(r?.target_subscription_id || '').trim()).filter(Boolean))];
  if (targetIds.length === 0) return [];
  const inList = targetIds.map(tid => `"${tid}"`).join(',');
  const subs = await supabaseRestGet(
    `subscriptions?id=in.(${inList})&select=id,email,subscription_type,name,contact_person_name,business_name,broker_office_name,profile_picture_url,company_logo_url`,
  );
  const byId = {};
  (Array.isArray(subs) ? subs : []).forEach(s => {
    if (s?.id) byId[String(s.id)] = s;
  });
  const needle = String(q || '').trim().toLowerCase();
  return requests
    .map(req => {
      const sub = byId[String(req.target_subscription_id || '')];
      if (!sub) return null;
      const row = mapSubscriptionToFollowHubRow(sub, {
        request_id: req.id,
        outgoing_follow_pending: true,
        has_pending_request_by_viewer: true,
        created_at: req.created_at,
      });
      if (!needle) return row;
      const hay = `${row.name} ${row.subtitle} ${row.email || ''}`.toLowerCase();
      return hay.includes(needle) ? row : null;
    })
    .filter(Boolean);
}

/** Followers / following rows. Own "following" tab also merges outgoing pending requests. */
export async function getFollowHubRows({userId, viewerId, tab = 'followers', q = ''}, {signal} = {}) {
  const params = new URLSearchParams({
    user_id: String(userId || '').trim(),
    tab: String(tab || 'followers').trim(),
  });
  if (viewerId) params.set('viewer_id', String(viewerId).trim());
  if (q && String(q).trim()) params.set('q', String(q).trim());
  const response = await apiFetch(`${apiBase()}/api/follows/hub?${params}`, {cache: 'no-store', signal});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to fetch follow hub');
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const ownFollowing =
    String(tab || '').toLowerCase() === 'following' && userId && viewerId && String(userId) === String(viewerId);
  if (!ownFollowing) return {...data, rows};
  try {
    const pendingRows = await fetchOutgoingPendingFollowRows(userId, q);
    if (pendingRows.length === 0) return {...data, rows};
    const existing = new Set(rows.map(r => String(r?.id || '')));
    const extra = pendingRows.filter(r => !existing.has(String(r.id)));
    return {...data, rows: [...extra, ...rows]};
  } catch {
    return {...data, rows};
  }
}

export async function sendFollowRequest(requesterSubscriptionId, targetSubscriptionId) {
  const response = await apiFetch(`${apiBase()}/api/follows/request`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      requester_subscription_id: requesterSubscriptionId,
      target_subscription_id: targetSubscriptionId,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to send follow request');
  return data;
}

export async function unfollowUser(followerSubscriptionId, followingSubscriptionId) {
  const response = await apiFetch(`${apiBase()}/api/follows/unfollow`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      follower_subscription_id: followerSubscriptionId,
      following_subscription_id: followingSubscriptionId,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to unfollow');
  return data;
}

export async function respondToFollowRequest(requestId, actorSubscriptionId, action) {
  const response = await apiFetch(`${apiBase()}/api/follows/requests/respond`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      request_id: requestId,
      actor_subscription_id: actorSubscriptionId,
      action,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to respond follow request');
  return data;
}

export async function getFollowStatus(viewerId, targetId) {
  const params = new URLSearchParams({
    viewer_id: String(viewerId || '').trim(),
    target_id: String(targetId || '').trim(),
  });
  const response = await apiFetch(`${apiBase()}/api/follows/status?${params}`, {cache: 'no-store'});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to fetch follow status');
  return data;
}

export async function cancelFollowRequest(requesterSubscriptionId, targetSubscriptionId) {
  const response = await apiFetch(`${apiBase()}/api/follows/requests/cancel`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      requester_subscription_id: requesterSubscriptionId,
      target_subscription_id: targetSubscriptionId,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to cancel follow request');
  return data;
}

export async function submitImprovementFeedback(payload) {
  try {
    const response = await apiFetch(`${apiBase()}/api/improvements-feedback`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        rating: Number(payload?.rating),
        improvement_text: payload?.improvementText != null ? String(payload.improvementText).trim() : '',
        created_by_subscription_id: payload?.creatorSubscriptionId ? String(payload.creatorSubscriptionId).trim() : null,
        created_by_email: payload?.creatorEmail ? String(payload.creatorEmail).trim().toLowerCase() : null,
        created_by_name: payload?.creatorName ? String(payload.creatorName).trim() : null,
        created_by_subscription_type: payload?.creatorSubscriptionType
          ? String(payload.creatorSubscriptionType).trim().toLowerCase()
          : null,
        created_by_subscriber_number: payload?.creatorSubscriberNumber
          ? String(payload.creatorSubscriberNumber).trim()
          : null,
        source_screen: payload?.sourceScreen ? String(payload.sourceScreen).trim() : 'feedbackSuggestion',
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to submit improvement feedback');
    return {success: true, feedback: data.feedback};
  } catch (error) {
    return {success: false, error: error.message};
  }
}

export async function likeListing(listingId, userId) {
  if (!listingId || !userId) throw new Error('listingId and userId required');
  const response = await apiFetch(`${apiBase()}/api/listings/${listingId}/like`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({user_id: String(userId)}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to like');
  return data;
}

export async function unlikeListing(listingId, userId) {
  if (!listingId || !userId) throw new Error('listingId and userId required');
  const response = await apiFetch(
    `${apiBase()}/api/listings/${listingId}/like?user_id=${encodeURIComponent(String(userId))}`,
    {method: 'DELETE'},
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to unlike');
  return data;
}

export async function likePost(listingId, userId) {
  if (!listingId || !userId) throw new Error('listingId and userId required');
  const response = await apiFetch(`${apiBase()}/api/posts/${listingId}/like`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({user_id: String(userId)}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to like post');
  return data;
}

export async function unlikePost(listingId, userId) {
  if (!listingId || !userId) throw new Error('listingId and userId required');
  const response = await apiFetch(
    `${apiBase()}/api/posts/${listingId}/like?user_id=${encodeURIComponent(String(userId))}`,
    {method: 'DELETE'},
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to unlike post');
  return data;
}

export async function getPostComments(listingId, userId = null) {
  if (!listingId) throw new Error('listingId required');
  const params = new URLSearchParams();
  if (userId != null && String(userId).trim() !== '') params.set('user_id', String(userId).trim());
  const qs = params.toString();
  const response = await apiFetch(`${apiBase()}/api/posts/${listingId}/comments${qs ? `?${qs}` : ''}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to load comments');
  return data;
}

export async function addPostComment(listingId, userId, text, imageUrl = null) {
  if (!listingId || !userId) throw new Error('listingId and userId required');
  const image = imageUrl != null && String(imageUrl).trim() !== '' ? String(imageUrl).trim() : null;
  const response = await apiFetch(`${apiBase()}/api/posts/${listingId}/comments`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({user_id: String(userId), text: String(text || ''), image_url: image}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to add comment');
  return data;
}

export async function reactToPostComment(listingId, commentId, userId, reactionType) {
  if (!listingId || !commentId || !userId) throw new Error('listingId, commentId and userId required');
  const response = await apiFetch(`${apiBase()}/api/posts/${listingId}/comments/${commentId}/reaction`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({user_id: String(userId), reaction_type: reactionType}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to react to comment');
  return data;
}

export async function clearPostCommentReaction(listingId, commentId, userId) {
  if (!listingId || !commentId || !userId) throw new Error('listingId, commentId and userId required');
  const response = await apiFetch(
    `${apiBase()}/api/posts/${listingId}/comments/${commentId}/reaction?user_id=${encodeURIComponent(String(userId))}`,
    {method: 'DELETE'},
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to clear comment reaction');
  return data;
}

export async function recordListingShare(listingId, count = 1) {
  if (!listingId) return null;
  try {
    const response = await apiFetch(`${apiBase()}/api/listings/${listingId}/share`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({count: Number(count) || 1}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return null;
    return data && typeof data.share_count === 'number' ? data.share_count : null;
  } catch {
    return null;
  }
}

/** Fresh subscription row for the signed-in user (mobile getCurrentUser). */
export async function getCurrentUser(email = null, subscriberNumber = null, {signal} = {}) {
  const normalizedEmail = email && String(email).trim() ? String(email).trim().toLowerCase() : '';
  const normalizedSubscriberNumber =
    subscriberNumber && String(subscriberNumber).trim() ? String(subscriberNumber).trim() : '';
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const usableEmail = looksLikeEmail ? normalizedEmail : '';
  if (!usableEmail && !normalizedSubscriberNumber) {
    return {
      success: false,
      subscription: null,
      error: normalizedEmail && !looksLikeEmail ? 'Invalid email' : 'Missing user identifier',
    };
  }
  const params = new URLSearchParams();
  if (usableEmail) params.append('email', usableEmail);
  if (normalizedSubscriberNumber) params.append('subscriberNumber', normalizedSubscriberNumber);
  const response = await apiFetch(`${apiBase()}/api/user/current?${params}`, {
    method: 'GET',
    headers: {'Content-Type': 'application/json'},
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 404) {
    return {success: false, subscription: null, error: data?.error || 'User not found'};
  }
  if (!response.ok) throw new Error(data?.error || 'Failed to fetch user');
  return data;
}

/** PiAi neighborhood answer for one topic (mobile askSmartInfo). Never throws. */
export async function askSmartInfo(topic, topicLabel, address) {
  try {
    const response = await apiFetch(`${apiBase()}/api/ai/smart-info`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({topic, topicLabel, address: address || ''}),
    });
    const data = await response.json();
    if (!response.ok) {
      return {success: false, text: data.text || data.error || 'שגיאה', error: data.error};
    }
    return {success: true, text: data.text || ''};
  } catch (error) {
    return {success: false, text: 'שגיאה בקבלת מידע. נסה שוב.', error: error.message};
  }
}

/** Star rating and/or comment on a profile (mobile submitReview). Never throws. */
export async function submitReview(
  targetSubscriptionId,
  rating,
  comment = '',
  reviewerName = null,
  reviewerImageUrl = null,
  reviewerSubscriptionId = null,
  listingId = null,
) {
  const clean = v => (v && String(v).trim() ? String(v).trim() : null);
  try {
    const parsedRating = rating != null && rating !== '' ? Number(rating) : null;
    const body = {
      target_subscription_id: targetSubscriptionId,
      comment: clean(comment) || '',
      reviewer_name: clean(reviewerName),
      reviewer_image_url: clean(reviewerImageUrl),
      reviewer_subscription_id: clean(reviewerSubscriptionId),
    };
    // Comment-only (BnB private): omit rating so older APIs don't parse 0/null as invalid.
    if (parsedRating != null && Number.isFinite(parsedRating) && parsedRating >= 1 && parsedRating <= 5) {
      body.rating = parsedRating;
    }
    if (clean(listingId)) body.listing_id = clean(listingId);
    const response = await apiFetch(`${apiBase()}/api/reviews`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to submit review');
    return {success: true, review: data.review};
  } catch (error) {
    return {success: false, error: error.message};
  }
}

// --- Account opening (mobile utils/api.js) -----------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parse JSON bodies; surface a clear error when the server answers with HTML (missing route). */
export async function parseApiJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    if (response.status === 404) {
      throw new Error('שירות ההתחברות לא זמין בשרת. יש לפרוס גרסה מעודכנת של pi-back (כולל /api/auth/login).');
    }
    throw new Error('תגובה לא תקינה מהשרת');
  }
}

function throwForUploadStatus(status, bodyPreview = '') {
  if (Number(status) === 413) {
    throw new Error('הקובץ גדול מדי להעלאה. נסו סרטון קצר יותר או באיכות נמוכה יותר.');
  }
  const preview = String(bodyPreview || '').trim();
  throw new Error(preview ? `Upload failed (${status}): ${preview}` : `Upload failed (${status})`);
}

/** Picked files are `{uri, type, name, file?}`; resolve the bytes for upload. */
export async function toUploadBlob(file) {
  if (file?.file instanceof Blob) return file.file;
  if (file instanceof Blob) return file;
  if (file?.uri) {
    const res = await fetch(file.uri);
    if (!res.ok) throw new Error('Could not read file for upload');
    return res.blob();
  }
  throw new Error('No file data for upload');
}

export async function toFormDataFile(file, fallbackName, fallbackType) {
  const blob = await toUploadBlob(file);
  const type = file?.type && String(file.type).includes('/') ? file.type : blob.type || fallbackType;
  return new File([blob], file?.name || fallbackName, {type});
}

/** Large files go straight to Supabase via a signed URL (bypasses the Vercel body limit). */
async function uploadFileViaSignedUrl(file, folder = 'general', {bucket, timeoutMs} = {}) {
  const isVideoFolder = String(folder || '').includes('video');
  const rawType = file?.type && String(file.type).trim() ? String(file.type).trim() : '';
  const mimeType = rawType.includes('/') ? rawType : isVideoFolder ? 'video/mp4' : 'image/jpeg';
  const fileName =
    file?.name && String(file.name).trim()
      ? String(file.name).trim()
      : isVideoFolder
        ? `video-${Date.now()}.mp4`
        : `file-${Date.now()}.jpg`;

  const response = await apiFetch(`${apiBase()}/api/upload/signed-url`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({folder, fileName, contentType: mimeType, ...(bucket ? {bucket} : {})}),
    timeoutMs: 30000,
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(response.ok ? 'Invalid response from upload server' : `Upload setup failed (${response.status})`);
  }
  if (!response.ok || !data.signedUrl) {
    throw new Error(data?.error || data?.message || 'Failed to prepare upload');
  }

  const blob = await toUploadBlob(file);
  const putRes = await apiFetch(data.signedUrl, {
    method: 'PUT',
    body: blob,
    headers: {'Content-Type': mimeType},
    timeoutMs: timeoutMs || 120000,
  });
  if (!putRes.ok) throwForUploadStatus(putRes.status, (await putRes.text()).slice(0, 200));
  return {success: true, url: data.publicUrl, fileName: data.path};
}

export const uploadFile = (file, folder = 'general', options = {}) =>
  uploadFileViaSignedUrl(file, folder, options);

/** Profile picture → profile-pics bucket. */
export async function uploadProfilePicture(file) {
  const formData = new FormData();
  formData.append('profilePicture', await toFormDataFile(file, 'profile.jpg', 'image/jpeg'));
  const response = await apiFetch(`${apiBase()}/api/upload-profile-pic`, {
    method: 'POST',
    body: formData,
    timeoutMs: 120000,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to upload profile picture');
  return data;
}

/** Pre-upload photo / logo / video so the submit itself is plain JSON. */
export async function prepareSubscriptionSubmitPayload(formData, files = {}) {
  const data = {...formData};
  const outFiles = {...files};

  if (outFiles.profilePicture && !data.profile_picture_url) {
    try {
      const uploaded = await uploadProfilePicture(outFiles.profilePicture);
      if (uploaded?.url) data.profile_picture_url = uploaded.url;
    } catch (err) {
      console.warn('[prepareSubscriptionSubmitPayload] profile pre-upload failed:', err?.message || err);
    }
    delete outFiles.profilePicture;
  }

  if (outFiles.companyLogo && !data.company_logo_url) {
    try {
      const uploaded = await uploadFile(outFiles.companyLogo, 'company-logos');
      if (uploaded?.url) data.company_logo_url = uploaded.url;
    } catch (err) {
      console.warn('[prepareSubscriptionSubmitPayload] logo pre-upload failed:', err?.message || err);
    }
    delete outFiles.companyLogo;
  }

  // The same cropped image may be both photo and logo; keep both columns filled if one upload failed.
  if (files.companyLogo && files.profilePicture && files.companyLogo === files.profilePicture) {
    if (data.profile_picture_url && !data.company_logo_url) data.company_logo_url = data.profile_picture_url;
    if (data.company_logo_url && !data.profile_picture_url) data.profile_picture_url = data.company_logo_url;
  }

  if (outFiles.video && !data.video_url) {
    try {
      const uploaded = await uploadFile(outFiles.video, 'profile-videos', {timeoutMs: 180000});
      if (uploaded?.url) data.video_url = uploaded.url;
    } catch (err) {
      console.warn('[prepareSubscriptionSubmitPayload] video pre-upload failed:', err?.message || err);
    }
    delete outFiles.video;
  }

  return {formData: data, files: outFiles};
}

/** B2B registration step 1 → creates the pending subscription row. */
export async function submitSubscription(formData, files = {}) {
  const prepared = await prepareSubscriptionSubmitPayload(formData, files);
  const payload = {};
  Object.keys(prepared.formData).forEach(key => {
    if (prepared.formData[key] !== undefined) payload[key] = prepared.formData[key];
  });
  const response = await apiFetch(`${apiBase()}/api/subscription/submit`, {
    method: 'POST',
    headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
    timeoutMs: 120000,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data.details && data.error
        ? `${data.error}: ${data.details}`
        : data.error || data.message || 'Failed to submit subscription',
    );
  }
  return data;
}

export async function setSubscriptionPassword(subscriptionId, password) {
  const response = await apiFetch(`${apiBase()}/api/subscription/set-password`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({subscriptionId, password}),
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    const err = new Error(response.status === 404 ? 'set-password endpoint not available' : 'Invalid response from set-password');
    err.status = response.status;
    throw err;
  }
  if (!response.ok || !data.success) {
    const err = new Error(data.error || 'Failed to save password');
    err.status = response.status;
    throw err;
  }
  return data;
}

export async function resendVerificationCode(email, subscriptionId = null, password = null) {
  const body = {email, subscriptionId};
  if (password) body.password = password;
  const response = await apiFetch(`${apiBase()}/api/subscription/resend-code`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to resend code');
  return data;
}

export async function verifyEmail(email, verificationCode, subscriptionId = null, password = null) {
  const body = {email, verificationCode, subscriptionId};
  if (password) body.password = password;
  const response = await apiFetch(`${apiBase()}/api/subscription/verify`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || 'Verification failed');
  return data;
}

/** Test only: mark the subscription verified without a code. */
export async function verifyEmailSkipTest(email, subscriptionId, password = null) {
  if (!subscriptionId) throw new Error('subscriptionId is required');
  const body = {email: email || undefined, subscriptionId};
  if (password) body.password = password;
  const response = await apiFetch(`${apiBase()}/api/subscription/verify-skip-test`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || 'Skip verification failed');
  if (data.subscription && !data.subscription.subscriber_number && data.subscriberNumber) {
    data.subscription.subscriber_number = data.subscriberNumber;
  }
  return data;
}

/** Promo code on a pending subscription (raises max_published_listings). */
export async function applySubscriptionPromoCode(subscriptionId, code) {
  const subId = String(subscriptionId || '').trim();
  const codeNorm = String(code || '').trim();
  if (!subId) throw new Error('חסר מזהה מנוי');
  if (!codeNorm) throw new Error('יש להזין קוד קופון');
  const response = await apiFetch(`${apiBase()}/api/subscription/apply-promo-code`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({subscriptionId: subId, code: codeNorm}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || 'קוד הקופון אינו תקף');
  return data;
}

export async function loginWithPassword(email, password) {
  const emailNorm = String(email || '').trim().toLowerCase();
  const pwd = String(password || '');
  if (!emailNorm) throw new Error('אנא הזן כתובת מייל');
  if (!pwd) throw new Error('אנא הזן סיסמה');
  const response = await apiFetch(`${apiBase()}/api/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: emailNorm, password: pwd}),
  });
  const data = await parseApiJsonResponse(response);
  if (!response.ok || !data.success) {
    const err = new Error(data.error || 'מייל או סיסמה שגויים');
    err.code = data.code;
    throw err;
  }
  return data;
}

/** Forgot password — the server resets it and emails the new one. */
export async function recoverPasswordByEmail(email) {
  const init = {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: String(email || '').trim()}),
    timeoutMs: 60000,
  };
  let response = await apiFetch(`${apiBase()}/api/auth/forgot-password`, init);
  if (response.status === 404) {
    response = await apiFetch(`${apiBase()}/api/subscription/recover-subscriber-code`, init);
  }
  const data = await parseApiJsonResponse(response);
  if (!response.ok) throw new Error(data.error || 'שגיאה בשליחת הבקשה');
  return data;
}

export async function checkEmailAvailable(email) {
  const normalizedEmail = email && String(email).trim() ? String(email).trim().toLowerCase() : '';
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return {success: false, available: false, error: 'כתובת מייל לא תקינה'};
  }
  try {
    const response = await apiFetch(
      `${apiBase()}/api/subscription/email-available?email=${encodeURIComponent(normalizedEmail)}`,
      {method: 'GET', headers: {Accept: 'application/json'}},
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return {success: false, available: false, error: data?.error || 'לא ניתן לבדוק את המייל'};
    return data;
  } catch (error) {
    return {success: false, available: false, error: error.message};
  }
}

const bnbLockField = lock => (lock === 'private' || lock === 'business' ? {bnb_host_lock: lock} : {});

export async function registerRegularUser({
  email,
  name = null,
  phone = null,
  businessAddress = null,
  profilePictureUrl = null,
  password = null,
  bnbHostLock = null,
} = {}) {
  const normalizedEmail = email && String(email).trim() ? String(email).trim().toLowerCase() : '';
  const pwd = password != null ? String(password) : '';
  if (!EMAIL_REGEX.test(normalizedEmail)) return {success: false, error: 'Invalid email', subscription: null};
  if (pwd.length < 8) return {success: false, error: 'הסיסמה חייבת להכיל לפחות 8 תווים', subscription: null};
  try {
    const response = await apiFetch(`${apiBase()}/api/users/register-regular`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email: normalizedEmail,
        name,
        phone,
        business_address: businessAddress,
        profile_picture_url: profilePictureUrl,
        password: pwd,
        ...bnbLockField(bnbHostLock),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return {success: false, error: data?.error || 'Failed to register user', subscription: null};
    return data;
  } catch (error) {
    return {success: false, error: error.message, subscription: null};
  }
}

/** Sign in or register a regular user with a Google ID token (verified on pi-back). */
export async function loginOrRegisterWithGoogle(
  idToken,
  {phone = null, name = null, businessAddress = null, intent = 'register', bnbHostLock = null} = {},
) {
  const token = idToken != null ? String(idToken).trim() : '';
  if (!token) return {success: false, error: 'Missing Google token', subscription: null};
  const clean = v => (v != null && String(v).trim() ? String(v).trim() : null);
  try {
    const response = await apiFetch(`${apiBase()}/api/auth/google`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        id_token: token,
        intent: intent === 'login' ? 'login' : 'register',
        phone: clean(phone),
        name: clean(name),
        business_address: clean(businessAddress),
        ...bnbLockField(bnbHostLock),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return {success: false, error: data?.error || 'Google sign-in failed', subscription: null};
    return data;
  } catch (error) {
    return {success: false, error: error.message, subscription: null};
  }
}

/** Sign in or register a regular user with an Apple identity token (verified on pi-back). */
export async function loginOrRegisterWithApple(
  identityToken,
  {phone = null, name = null, businessAddress = null, intent = 'register', bnbHostLock = null} = {},
) {
  const token = identityToken != null ? String(identityToken).trim() : '';
  if (!token) return {success: false, error: 'Missing Apple token', subscription: null};
  const clean = v => (v != null && String(v).trim() ? String(v).trim() : null);
  try {
    const response = await apiFetch(`${apiBase()}/api/auth/apple`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        identity_token: token,
        id_token: token,
        intent: intent === 'login' ? 'login' : 'register',
        phone: clean(phone),
        name: clean(name),
        business_address: clean(businessAddress),
        ...bnbLockField(bnbHostLock),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return {success: false, error: data?.error || 'Apple sign-in failed', subscription: null};
    return data;
  } catch (error) {
    return {success: false, error: error.message, subscription: null};
  }
}

/** Home story rings (profile intro + slides from the last 24 hours). */
export async function getStoriesFeed({limit = 80} = {}) {
  const safeLimit = Math.min(80, Math.max(1, Number(limit) || 80));
  const response = await apiFetch(`${apiBase()}/api/stories/feed?limit=${safeLimit}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return {success: false, rings: [], error: data?.error || 'Failed to load stories'};
  return data;
}

/** Companies for "כל הפרויקטים". */
export async function getCompaniesDirectory() {
  const response = await apiFetch(`${apiBase()}/api/companies/directory`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to load companies');
  return data;
}

/** Report a company, broker, professional, or BnB listing. Never throws. */
export async function submitCompanyReport(payload) {
  try {
    const response = await apiFetch(`${apiBase()}/api/company-reports`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        subject_type:
          payload?.subjectType === 'broker'
            ? 'broker'
            : payload?.subjectType === 'professional'
              ? 'professional'
              : payload?.subjectType === 'bnb'
                ? 'bnb'
                : 'company',
        reported_subscription_id: String(payload?.reportedSubscriptionId || '').trim(),
        reported_listing_id:
          payload?.reportedListingId && String(payload.reportedListingId).trim()
            ? String(payload.reportedListingId).trim()
            : null,
        company_display_name: payload?.companyDisplayName ? String(payload.companyDisplayName).trim() : null,
        reason_keys: Array.isArray(payload?.reasonKeys) ? payload.reasonKeys : [],
        description: payload?.description != null ? String(payload.description).trim() : '',
        reporter_name: payload?.reporterName != null ? String(payload.reporterName).trim() : '',
        reporter_phone: payload?.reporterPhone && String(payload.reporterPhone).trim() ? String(payload.reporterPhone).trim() : null,
        reporter_email: payload?.reporterEmail != null ? String(payload.reporterEmail).trim() : '',
        reporter_subscription_id: payload?.reporterSubscriptionId ? String(payload.reporterSubscriptionId).trim() : null,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return {success: false, error: data?.error || 'שגיאה בשליחת הדיווח'};
    return {success: true, report: data};
  } catch (error) {
    return {success: false, error: error.message || 'שגיאה בשליחת הדיווח'};
  }
}

// --- משווקי פרויקטים — agency teams -------------------------------------------

function agencyManagerParams(manager) {
  const params = new URLSearchParams();
  const id = manager?.subscription_id || manager?.id;
  if (id != null && String(id).trim()) params.set('manager_subscription_id', String(id).trim());
  const email = manager?.email;
  if (email != null && String(email).trim()) params.set('manager_email', String(email).trim().toLowerCase());
  return params;
}

export async function getAgencyJoinCode(manager) {
  const response = await apiFetch(`${apiBase()}/api/agency/join-code?${agencyManagerParams(manager)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'טעינת הקוד נכשלה');
  return data;
}

/** Issue a fresh join code, deactivating the previous one. */
export async function createAgencyJoinCode(manager) {
  const response = await apiFetch(`${apiBase()}/api/agency/join-code`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(Object.fromEntries(agencyManagerParams(manager))),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'יצירת הקוד נכשלה');
  return data;
}

/** Marketers under a marketing manager. */
export async function getAgencyMembers(manager) {
  const response = await apiFetch(`${apiBase()}/api/agency/members?${agencyManagerParams(manager)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'טעינת המשווקים נכשלה');
  return data;
}

/** One-time, 24-hour code that transfers one agency member account. */
export async function createAgencyMemberReplacementCode(manager, memberId) {
  const response = await apiFetch(`${apiBase()}/api/agency/replacement-code`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      ...Object.fromEntries(agencyManagerParams(manager)),
      target_subscription_id: String(memberId || '').trim(),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'יצירת קוד ההחלפה נכשלה');
  return data;
}

export async function joinAgencyWithCode({email, password, name, phone, code}) {
  const response = await apiFetch(`${apiBase()}/api/agency/join`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password, name, phone, code}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'ההצטרפות נכשלה');
  return data;
}

/** Verified/active professional subscriptions (mobile getProfessionalsDirectory). */
export async function getProfessionalsDirectory({signal} = {}) {
  const response = await apiFetch(`${apiBase()}/api/professionals/directory`, {
    method: 'GET',
    headers: {'Content-Type': 'application/json'},
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load professionals');
  }
  return data;
}

export async function getPropertyAlerts(subscriptionId) {
  const response = await apiFetch(
    `${apiBase()}/api/property-alerts?subscriptionId=${encodeURIComponent(subscriptionId)}`,
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'לא הצלחנו לטעון את ההתראות');
  return data;
}

export async function savePropertyAlerts({subscriptionId, enabled, categories}) {
  const response = await apiFetch(`${apiBase()}/api/property-alerts`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({subscriptionId, enabled: enabled === true, categories}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'השמירה נכשלה');
  return data;
}
