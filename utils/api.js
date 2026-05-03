/**
 * API utility functions for communicating with the backend
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

// On web: when opened via network IP (e.g. http://192.168.1.5:8084), use same host for API so it works from other devices
export function getApiUrl() {
  if (isWeb && typeof window !== 'undefined' && window.location && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
}

/**
 * On a physical device, localhost points at the phone — use the machine running Metro (LAN IP) or Android emulator host.
 */
function getNativeApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  const looksLocal = /localhost|127\.0\.0\.1/i.test(fromEnv);
  if (!looksLocal) return fromEnv;

  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;
  if (debuggerHost) {
    const host = String(debuggerHost).split(':')[0];
    if (host && !/^localhost$/i.test(host) && host !== '127.0.0.1') {
      return `http://${host}:3000`;
    }
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return fromEnv;
}

const API_URL = isWeb ? getApiUrl() : getNativeApiUrl();

/** Resolved API base URL (for debugging broker search / connectivity). */
export function getResolvedApiUrl() {
  return isWeb ? getApiUrl() : getNativeApiUrl();
}

function logBrokerSearch(step, payload) {
  console.log(`[pi-chat][broker-search] ${step}`, payload);
}

/** On web, FormData doesn't accept { uri, type, name }; convert fetchable URIs to File so multipart works. */
async function toFormDataFile(file, fieldName = 'file') {
  if (!file || !file.uri) return null;
  if (!isWeb) return file; // React Native: keep { uri, type, name }

  const uri = file.uri;
  const fetchable =
    uri.startsWith('blob:') ||
    uri.startsWith('data:') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://');

  if (!fetchable) {
    console.warn(
      '[toFormDataFile] Web upload needs blob/data/http URI, got:',
      String(uri).slice(0, 64),
    );
    return null;
  }

  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    let name = file.name;
    let type = file.type || blob.type || '';

    if (fieldName === 'profilePicture') {
      name = name || 'profile.jpg';
      type = type || 'image/jpeg';
    } else if (fieldName === 'video') {
      name = name || 'video.mp4';
      if (!type || type === 'application/octet-stream') {
        type = blob.type && blob.type.startsWith('video/') ? blob.type : 'video/mp4';
      }
    } else if (fieldName === 'companyLogo') {
      name = name || 'logo.jpg';
      type = type || 'image/jpeg';
    } else {
      name = name || 'image.jpg';
      type = type || blob.type || 'image/jpeg';
    }

    return new File([blob], name, { type });
  } catch (e) {
    console.warn('Could not convert uri to File for web upload:', fieldName, e);
    return null;
  }
}

/**
 * Submit subscription form
 * @param {Object} formData - Form data including subscription type, user info, etc.
 * @param {Object} files - Files to upload (profilePicture, additionalImages, companyLogo, video)
 * @returns {Promise} API response
 */
export const submitSubscription = async (formData, files = {}) => {
  try {
    const formDataToSend = new FormData();

    // Add all form fields
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null && formData[key] !== undefined) {
        if (Array.isArray(formData[key])) {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (typeof formData[key] === 'object') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else {
          formDataToSend.append(key, String(formData[key]));
        }
      }
    });

    // Add files: on web use Blob/File so server receives real file; on RN use { uri, type, name }
    if (files.profilePicture && !formData.profile_picture_url) {
      const toAppend = await toFormDataFile(files.profilePicture, 'profilePicture');
      if (toAppend) formDataToSend.append('profilePicture', toAppend);
    }

    if (files.additionalImages && files.additionalImages.length > 0) {
      for (let index = 0; index < files.additionalImages.length; index++) {
        const image = files.additionalImages[index];
        const part = await toFormDataFile(image, 'additionalImage');
        if (part) {
          formDataToSend.append('additionalImages', part);
        }
      }
    }

    if (files.companyLogo) {
      const logoAppend = await toFormDataFile(files.companyLogo, 'companyLogo');
      if (logoAppend) {
        formDataToSend.append('companyLogo', logoAppend);
      }
    }

    if (files.video) {
      const videoAppend = await toFormDataFile(files.video, 'video');
      if (videoAppend) {
        formDataToSend.append('video', videoAppend);
      } else {
        console.error(
          '[submitSubscription] Video file could not be attached (web needs blob/data URL from picker).',
        );
      }
    }

    const response = await fetch(`${API_URL}/api/subscription/submit`, {
      method: 'POST',
      body: formDataToSend,
      // Don't set Content-Type header - let fetch set it with boundary
    });

    const data = await response.json();

    if (!response.ok) {
      // Extract more detailed error message
      const errorMsg =
        data.error || data.message || 'Failed to submit subscription';
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error('Error submitting subscription:', error);
    throw error;
  }
};

/**
 * Upload profile picture to profile-pics bucket (e.g. when moving from stage 1 to stage 2)
 * @param {Object} file - { uri, type, name }
 * @returns {Promise<{ success: boolean, url: string }>}
 */
export const uploadProfilePicture = async (file) => {
  const formData = new FormData();
  const toAppend = await toFormDataFile(file, 'profilePicture');
  if (!toAppend) throw new Error('No profile picture to upload');
  formData.append('profilePicture', toAppend);
  const response = await fetch(`${API_URL}/api/upload-profile-pic`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to upload profile picture');
  return data;
};

/**
 * Verify email with verification code
 * @param {string} email - User email
 * @param {string} verificationCode - Verification code
 * @param {string} subscriptionId - Optional subscription ID
 * @returns {Promise} API response
 */
export const verifyEmail = async (
  email,
  verificationCode,
  subscriptionId = null,
) => {
  try {
    console.log('Calling verify API:', {
      email,
      verificationCode,
      subscriptionId,
      API_URL,
    });
    const response = await fetch(`${API_URL}/api/subscription/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        verificationCode,
        subscriptionId,
      }),
    });

    // console.log('Verify API response status:', response.status);
    const data = await response.json();
    // console.log('Verify API response data:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Verification failed');
    }

    if (!data.success) {
      throw new Error(data.error || 'Verification failed');
    }

    return data;
  } catch (error) {
    console.error('Error verifying email:', error);
    throw error;
  }
};

/**
 * Test only: mark subscription verified without code. Backend must set ALLOW_SKIP_EMAIL_VERIFICATION=1.
 */
export const verifyEmailSkipTest = async (email, subscriptionId) => {
  if (!subscriptionId) {
    throw new Error('subscriptionId is required');
  }
  const response = await fetch(`${API_URL}/api/subscription/verify-skip-test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email || undefined,
      subscriptionId,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Skip verification failed');
  }
  if (!data.success) {
    throw new Error(data.error || 'Skip verification failed');
  }
  if (
    data.subscription &&
    !data.subscription.subscriber_number &&
    data.subscriberNumber
  ) {
    data.subscription.subscriber_number = data.subscriberNumber;
  }
  return data;
};

/**
 * Resend verification code
 * @param {string} email - User email
 * @returns {Promise} API response
 */
export const resendVerificationCode = async (email, subscriptionId = null) => {
  try {
    const response = await fetch(`${API_URL}/api/subscription/resend-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({email, subscriptionId}),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to resend code');
    }

    return data;
  } catch (error) {
    console.error('Error resending code:', error);
    throw error;
  }
};

/**
 * Request מספר מנוי by email (שחזור קוד סודי). Server sends email if verified subscription exists.
 */
export const recoverSubscriberCodeByEmail = async email => {
  const response = await fetch(`${API_URL}/api/subscription/recover-subscriber-code`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: String(email || '').trim()}),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'שגיאה בשליחת הבקשה');
  }
  return data;
};

// Subscription IDs that returned 404 – skip refetch to avoid repeated 404 logs
const subscription404Cache = new Set();

/** Clear 404 cache for an id so profile screen can refetch (e.g. to get updated description). */
export const clearSubscription404Cache = subscriptionId => {
  if (subscriptionId) subscription404Cache.delete(subscriptionId);
};

/**
 * Get subscription by ID
 * @param {string} subscriptionId - Subscription ID
 * @returns {Promise} API response
 */
export const getSubscription = async subscriptionId => {
  if (!subscriptionId) return { success: false, subscription: null };
  if (subscription404Cache.has(subscriptionId)) {
    return { success: false, subscription: null };
  }
  try {
    const response = await fetch(
      `${API_URL}/api/subscription/${subscriptionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        subscription404Cache.add(subscriptionId);
        return { success: false, subscription: null };
      }
      throw new Error(data.error || 'Failed to fetch subscription');
    }

    if (typeof __DEV__ !== 'undefined' && __DEV__ && data.subscription) {
      const sub = data.subscription;
      console.log('[api.getSubscription] subscription keys:', Object.keys(sub), 'description' in sub ? 'description=' + JSON.stringify((sub.description || '').slice(0, 80)) : 'no description key');
    }
    return data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
  }
};

/**
 * Ask AI for smart info about a topic (e.g. transport, security) for an address.
 * @param {string} topic - Topic key (e.g. 'transport', 'security')
 * @param {string} topicLabel - Hebrew label (e.g. 'תחבורה', 'ביטחון')
 * @param {string} address - Property address (e.g. 'בן גוריון 4')
 * @returns {Promise<{ success: boolean, text?: string, error?: string }>}
 */
export const askSmartInfo = async (topic, topicLabel, address) => {
  try {
    const response = await fetch(`${API_URL}/api/ai/smart-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, topicLabel, address: address || '' }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, text: data.text || data.error || 'שגיאה', error: data.error };
    }
    return { success: true, text: data.text || '' };
  } catch (error) {
    console.error('askSmartInfo error:', error);
    return { success: false, text: 'שגיאה בקבלת מידע. נסה שוב.', error: error.message };
  }
};

/**
 * Get reviews for a profile (target subscription).
 * @param {string} targetSubscriptionId - Subscription ID of the profile being viewed
 * @returns {Promise<{ success: boolean, reviews: Array }>}
 */
export const getReviews = async (targetSubscriptionId) => {
  try {
    if (!targetSubscriptionId) return { success: true, reviews: [] };
    const response = await fetch(
      `${API_URL}/api/reviews?target_subscription_id=${encodeURIComponent(targetSubscriptionId)}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch reviews');
    return { success: true, reviews: data.reviews || [] };
  } catch (error) {
    console.error('getReviews error:', error);
    return { success: false, reviews: [] };
  }
};

/**
 * Submit a review (rating 1–5 and optional comment).
 * @param {string} targetSubscriptionId - Profile (subscription) being reviewed
 * @param {number} rating - 1–5
 * @param {string} comment - Optional review text
 * @param {string} reviewerName - Optional display name
 * @param {string} reviewerImageUrl - Optional avatar URL
 * @param {string} reviewerSubscriptionId - Optional subscription id of the reviewer (links review to user in DB)
 * @param {string|null} listingId - Optional ad UUID when the review is for a specific published listing
 * @returns {Promise<{ success: boolean, review?: object }>}
 */
export const submitReview = async (targetSubscriptionId, rating, comment = '', reviewerName = null, reviewerImageUrl = null, reviewerSubscriptionId = null, listingId = null) => {
  try {
    const body = {
      target_subscription_id: targetSubscriptionId,
      rating: Number(rating),
      comment: comment && String(comment).trim() ? String(comment).trim() : '',
      reviewer_name: reviewerName && String(reviewerName).trim() ? String(reviewerName).trim() : null,
      reviewer_image_url: reviewerImageUrl && String(reviewerImageUrl).trim() ? String(reviewerImageUrl).trim() : null,
      reviewer_subscription_id: reviewerSubscriptionId && String(reviewerSubscriptionId).trim() ? String(reviewerSubscriptionId).trim() : null,
    };
    if (listingId && String(listingId).trim()) {
      body.listing_id = String(listingId).trim();
    }
    const response = await fetch(`${API_URL}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to submit review');
    return { success: true, review: data.review };
  } catch (error) {
    console.error('submitReview error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Ensure a regular (subscription_type='user') backend record exists for this email,
 * returning the full subscription (with a real UUID `id`).
 * Idempotent: returns existing record if one is found by email.
 */
export const registerRegularUser = async ({email, name = null, phone = null, profilePictureUrl = null} = {}) => {
  const normalizedEmail = email && String(email).trim() ? String(email).trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { success: false, error: 'Invalid email', subscription: null };
  }
  try {
    const response = await fetch(`${API_URL}/api/users/register-regular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        name,
        phone,
        profile_picture_url: profilePictureUrl,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: data?.error || 'Failed to register user', subscription: null };
    }
    return data;
  } catch (error) {
    console.error('registerRegularUser error:', error);
    return { success: false, error: error.message, subscription: null };
  }
};

/**
 * Send a follow request from one subscription user to another.
 */
export const sendFollowRequest = async (requesterSubscriptionId, targetSubscriptionId) => {
  const response = await fetch(`${API_URL}/api/follows/request`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      requester_subscription_id: requesterSubscriptionId,
      target_subscription_id: targetSubscriptionId,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to send follow request');
  return data;
};

/**
 * Unfollow a user.
 */
export const unfollowUser = async (followerSubscriptionId, followingSubscriptionId) => {
  const response = await fetch(`${API_URL}/api/follows/unfollow`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      follower_subscription_id: followerSubscriptionId,
      following_subscription_id: followingSubscriptionId,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to unfollow');
  return data;
};

/**
 * Accept or reject an incoming follow request.
 */
export const respondToFollowRequest = async (requestId, actorSubscriptionId, action) => {
  const response = await fetch(`${API_URL}/api/follows/requests/respond`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      request_id: requestId,
      actor_subscription_id: actorSubscriptionId,
      action,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to respond follow request');
  return data;
};

/**
 * Withdraw a pending follow request you sent (requester cancels).
 */
export const cancelFollowRequest = async (requesterSubscriptionId, targetSubscriptionId) => {
  const response = await fetch(`${API_URL}/api/follows/requests/cancel`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      requester_subscription_id: requesterSubscriptionId,
      target_subscription_id: targetSubscriptionId,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to cancel follow request');
  return data;
};

/**
 * Get follow status between viewer and target.
 */
export const getFollowStatus = async (viewerId, targetId) => {
  const params = new URLSearchParams({
    viewer_id: String(viewerId || '').trim(),
    target_id: String(targetId || '').trim(),
  });
  const response = await fetch(`${API_URL}/api/follows/status?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch follow status');
  return data;
};

/**
 * Batch: which target ids are mutual follows with the viewer (both in user_follows, no pending from viewer).
 * @returns {Promise<{ success: boolean, mutual?: Record<string, true> }>}
 */
export const getMutualFollowBatch = async (viewerId, targetIds) => {
  const v = viewerId != null ? String(viewerId).trim() : '';
  const list = Array.isArray(targetIds) ? targetIds : [];
  if (!v || list.length === 0) {
    return { success: true, mutual: {} };
  }
  const response = await fetch(`${API_URL}/api/follows/mutual-batch`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ viewer_id: v, target_ids: list }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch mutual follow flags');
  }
  return data;
};

/**
 * Get likes/followers/following/pending requests counts for a profile.
 */
export const getFollowStats = async userId => {
  const response = await fetch(
    `${API_URL}/api/follows/stats?user_id=${encodeURIComponent(String(userId || '').trim())}`,
    {cache: 'no-store'},
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch follow stats');
  return data;
};

/**
 * Follow hub data for tabs: requests | followers | following
 */
export const getFollowHubRows = async ({userId, viewerId, tab = 'followers', q = ''}) => {
  const params = new URLSearchParams({
    user_id: String(userId || '').trim(),
    tab: String(tab || 'followers').trim(),
  });
  if (viewerId) params.set('viewer_id', String(viewerId).trim());
  if (q && String(q).trim()) params.set('q', String(q).trim());
  const response = await fetch(`${API_URL}/api/follows/hub?${params.toString()}`, {
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch follow hub');
  return data;
};

/**
 * Save improvement feedback (from suggestions screen) in DB.
 * @param {{
 *   rating: number,
 *   improvementText: string,
 *   creatorSubscriptionId?: string | null,
 *   creatorEmail?: string | null,
 *   creatorName?: string | null,
 *   creatorSubscriptionType?: string | null,
 *   creatorSubscriberNumber?: string | null,
 *   sourceScreen?: string | null,
 * }} payload
 * @returns {Promise<{ success: boolean, feedback?: object, error?: string }>}
 */
export const submitImprovementFeedback = async (payload) => {
  try {
    const response = await fetch(`${API_URL}/api/improvements-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating: Number(payload?.rating),
        improvement_text:
          payload?.improvementText != null ? String(payload.improvementText).trim() : '',
        created_by_subscription_id:
          payload?.creatorSubscriptionId && String(payload.creatorSubscriptionId).trim()
            ? String(payload.creatorSubscriptionId).trim()
            : null,
        created_by_email:
          payload?.creatorEmail && String(payload.creatorEmail).trim()
            ? String(payload.creatorEmail).trim().toLowerCase()
            : null,
        created_by_name:
          payload?.creatorName && String(payload.creatorName).trim()
            ? String(payload.creatorName).trim()
            : null,
        created_by_subscription_type:
          payload?.creatorSubscriptionType &&
          String(payload.creatorSubscriptionType).trim()
            ? String(payload.creatorSubscriptionType).trim().toLowerCase()
            : null,
        created_by_subscriber_number:
          payload?.creatorSubscriberNumber &&
          String(payload.creatorSubscriberNumber).trim()
            ? String(payload.creatorSubscriberNumber).trim()
            : null,
        source_screen:
          payload?.sourceScreen && String(payload.sourceScreen).trim()
            ? String(payload.sourceScreen).trim()
            : 'feedbackSuggestion',
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to submit improvement feedback');
    return { success: true, feedback: data.feedback };
  } catch (error) {
    console.error('submitImprovementFeedback error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Submit a report against a company profile (POST /api/company-reports).
 */
export const submitCompanyReport = async (payload) => {
  try {
    const response = await fetch(`${API_URL}/api/company-reports`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        subject_type:
          payload?.subjectType === 'broker'
            ? 'broker'
            : payload?.subjectType === 'professional'
              ? 'professional'
              : 'company',
        reported_subscription_id: String(payload?.reportedSubscriptionId || '').trim(),
        reported_listing_id:
          payload?.reportedListingId && String(payload.reportedListingId).trim()
            ? String(payload.reportedListingId).trim()
            : null,
        company_display_name:
          payload?.companyDisplayName && String(payload.companyDisplayName).trim()
            ? String(payload.companyDisplayName).trim()
            : null,
        reason_keys: Array.isArray(payload?.reasonKeys) ? payload.reasonKeys : [],
        description:
          payload?.description != null ? String(payload.description).trim() : '',
        reporter_name:
          payload?.reporterName != null ? String(payload.reporterName).trim() : '',
        reporter_phone:
          payload?.reporterPhone != null && String(payload.reporterPhone).trim()
            ? String(payload.reporterPhone).trim()
            : null,
        reporter_email:
          payload?.reporterEmail != null
            ? String(payload.reporterEmail).trim().toLowerCase()
            : '',
        reporter_subscription_id:
          payload?.reporterSubscriptionId &&
          String(payload.reporterSubscriptionId).trim()
            ? String(payload.reporterSubscriptionId).trim()
            : null,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit report');
    }
    return {success: true, report: data.report};
  } catch (error) {
    console.error('submitCompanyReport error:', error);
    return {success: false, error: error.message};
  }
};

/**
 * Get current user subscription by email or subscriber number
 * @param {string} email - User email (optional)
 * @param {string} subscriberNumber - Subscriber number (optional)
 * @returns {Promise} API response
 */
export const getCurrentUser = async (email = null, subscriberNumber = null) => {
  try {
    const params = new URLSearchParams();
    const normalizedEmail =
      email && String(email).trim() ? String(email).trim().toLowerCase() : '';
    const normalizedSubscriberNumber =
      subscriberNumber && String(subscriberNumber).trim()
        ? String(subscriberNumber).trim()
        : '';

    // Skip lookup when the supplied email is obviously not an email
    // (avoids 404 noise like getCurrentUser('h')).
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    const usableEmail = looksLikeEmail ? normalizedEmail : '';

    if (usableEmail) params.append('email', usableEmail);
    if (normalizedSubscriberNumber) {
      params.append('subscriberNumber', normalizedSubscriberNumber);
    }

    // Avoid unnecessary request if nothing usable was provided.
    if (!usableEmail && !normalizedSubscriberNumber) {
      return {
        success: false,
        subscription: null,
        error: normalizedEmail && !looksLikeEmail ? 'Invalid email' : 'Missing user identifier',
      };
    }

    const response = await fetch(
      `${API_URL}/api/user/current?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const data = await response.json();

    // "User not found" is a valid lookup result, not a transport failure.
    if (response.status === 404) {
      return {
        success: false,
        subscription: null,
        error: data?.error || 'User not found',
      };
    }

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch user');
    }

    return data;
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
};

/**
 * Upload a single file
 * @param {Object} file - File object with uri, type, name
 * @param {string} folder - Folder name in storage
 * @returns {Promise} API response with file URL
 */
export const uploadFile = async (file, folder = 'general') => {
  try {
    const formData = new FormData();
    if (isWeb) {
      const filePart = await toFormDataFile(file, 'file');
      if (filePart instanceof File) {
        formData.append('file', filePart);
      } else {
        throw new Error(
          'Web upload needs a data: or blob: image URI (or File).',
        );
      }
    } else {
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.name || 'file.jpg',
      });
    }
    formData.append('folder', folder);

    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      body: formData,
      // Do not set Content-Type — fetch must add multipart boundary automatically.
      // Setting "multipart/form-data" without boundary breaks multer and often yields 500 + HTML.
    });

    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (_) {
      throw new Error(
        response.ok
          ? 'Invalid response from upload server'
          : `Upload failed (${response.status}): ${responseText.slice(0, 200)}`,
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error || data.message || 'Failed to upload file',
      );
    }

    return data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Get all listings (visible to all users)
 * @param {Object} options - Query options (status, category)
 * @returns {Promise} API response with listings
 */
export const getListings = async (options = {}) => {
  try {
    const {
      status = 'published',
      category,
      subscription_type: subscriptionType,
      has_video: hasVideo,
      condition: listingCondition,
      subscription_id: subscriptionId,
      user_id: userId,
      favorites_only: favoritesOnly,
      search_purpose: searchPurpose,
      feed_post: feedPost,
      hospitality_nature: hospitalityNature,
      land_in_mortgage: landInMortgage,
      permit: permit,
    } = options;
    const params = new URLSearchParams({status});
    if (category) {
      params.append('category', category);
    }
    if (subscriptionType != null && subscriptionType !== '') {
      const value = Array.isArray(subscriptionType) ? subscriptionType.join(',') : String(subscriptionType);
      if (value) params.append('subscription_type', value);
    }
    if (hasVideo === true) {
      params.append('has_video', 'true');
    }
    if (listingCondition != null && String(listingCondition).trim() !== '') {
      params.append('condition', String(listingCondition).trim().toLowerCase());
    }
    if (subscriptionId != null && subscriptionId !== '') {
      params.append('subscription_id', String(subscriptionId));
    }
    if (userId != null && String(userId).trim() !== '') {
      params.append('user_id', String(userId).trim());
    }
    if (favoritesOnly === true) {
      params.append('favorites_only', 'true');
    }
    if (searchPurpose != null && String(searchPurpose).trim() !== '') {
      params.append('search_purpose', String(searchPurpose).trim().toLowerCase());
    }
    if (feedPost === true) {
      params.append('feed_post', 'true');
    }
    if (hospitalityNature != null && String(hospitalityNature).trim() !== '') {
      params.append('hospitality_nature', String(hospitalityNature).trim());
    }
    if (landInMortgage != null && String(landInMortgage).trim() !== '') {
      params.append('land_in_mortgage', String(landInMortgage).trim());
    }
    if (permit != null && String(permit).trim() !== '') {
      params.append('permit', String(permit).trim());
    }

    const url = `${API_URL}/api/listings?${params.toString()}`;
    console.log('🌐 [api.js] Fetching listings from:', url);
    console.log('🌐 [api.js] API_URL:', API_URL);
    console.log('🌐 [api.js] Options:', {status, category, subscriptionType, hasVideo, listingCondition, searchPurpose, feedPost, hospitalityNature, landInMortgage, permit});

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // console.log(
    //   '🌐 [api.js] Response status:',
    //   response.status,
    //   response.statusText,
    // );

    const data = await response.json();

    // console.log('🌐 [api.js] Response data:', data);

    if (!response.ok) {
      console.error('❌ [api.js] Response not OK:', data);
      throw new Error(data.error || 'Failed to fetch listings');
    }

    return data;
  } catch (error) {
    console.error('❌ [api.js] Error fetching listings:', error);
    console.error('❌ [api.js] Error details:', error.message, error.stack);
    throw error;
  }
};

/**
 * Update listing freeze state (hide from feed / show again).
 * @param {string} listingId - UUID of the listing
 * @param {boolean} isFrozen - true to freeze (hide from feed), false to unfreeze
 * @returns {Promise} API response with updated listing
 */
export const updateListingFreeze = async (listingId, isFrozen) => {
  try {
    const response = await fetch(`${API_URL}/api/listings/${listingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_frozen: !!isFrozen }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update listing');
    }
    return data;
  } catch (error) {
    console.error('Error updating listing:', error);
    throw error;
  }
};

/** Fetch the current user's recent user-searches for the TikTok feed "אחרונים" list. */
export const getRecentUserSearches = async userEmail => {
  const email = userEmail ? String(userEmail).trim() : '';
  if (!email) return {success: true, recent: []};
  const response = await fetch(
    `${API_URL}/api/search/users/recent?user_email=${encodeURIComponent(email)}`,
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to load recent searches');
  return data;
};

/** Record (upsert) a user-profile search so it appears in the "אחרונים" list. */
export const recordUserSearch = async (userEmail, targetSubscriptionId) => {
  const email = userEmail ? String(userEmail).trim() : '';
  const target =
    targetSubscriptionId != null ? String(targetSubscriptionId).trim() : '';
  if (!email || !target) return {success: false};
  try {
    const response = await fetch(`${API_URL}/api/search/users/recent`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({user_email: email, target_subscription_id: target}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn('recordUserSearch failed:', data?.error);
      return {success: false};
    }
    return data;
  } catch (e) {
    console.warn('recordUserSearch error:', e?.message);
    return {success: false};
  }
};

/** Clear all recent user-searches for the current user (bound to the "נקה" button). */
export const clearRecentUserSearches = async userEmail => {
  const email = userEmail ? String(userEmail).trim() : '';
  if (!email) return {success: false};
  try {
    const response = await fetch(
      `${API_URL}/api/search/users/recent?user_email=${encodeURIComponent(email)}`,
      {method: 'DELETE'},
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn('clearRecentUserSearches failed:', data?.error);
      return {success: false};
    }
    return data;
  } catch (e) {
    console.warn('clearRecentUserSearches error:', e?.message);
    return {success: false};
  }
};

/** Get the monthly boost quota usage for a user (by email). */
export const getBoostQuota = async userEmail => {
  const email = userEmail ? String(userEmail).trim() : '';
  if (!email) throw new Error('user_email required');
  const response = await fetch(
    `${API_URL}/api/listings/boost-quota?user_email=${encodeURIComponent(email)}`,
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Failed to load boost quota');
  return data;
};

/**
 * Boost a listing to HIGH exposure for 24 hours. Enforces the monthly quota.
 * @param {string} listingId - ad UUID
 * @param {string} userEmail - current user email
 * @returns {Promise<{success: boolean, boost_expires_at: string, quota: number, used: number, remaining: number, listing: object}>}
 */
export const boostListing = async (listingId, userEmail) => {
  const id = listingId ? String(listingId).trim() : '';
  const email = userEmail ? String(userEmail).trim() : '';
  if (!id) throw new Error('listingId required');
  if (!email) throw new Error('user_email required');
  try {
    const response = await fetch(`${API_URL}/api/listings/${id}/boost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: email }),
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
  } catch (error) {
    console.error('Error boosting listing:', error);
    throw error;
  }
};

/**
 * Record a view for a listing (increments view_count on the server).
 * @param {string} listingId - UUID of the listing
 * @returns {Promise<void>}
 */
export const recordListingView = async (listingId) => {
  if (!listingId) return;
  try {
    const response = await fetch(`${API_URL}/api/listings/${listingId}/view`, { method: 'POST' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to record view');
    }
  } catch (error) {
    console.warn('Record view failed:', error.message);
  }
};

export const recordListingShare = async (listingId, count = 1) => {
  if (!listingId) return null;
  try {
    const response = await fetch(`${API_URL}/api/listings/${listingId}/share`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({count: Number(count) || 1}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return null;
    return data && typeof data.share_count === 'number' ? data.share_count : null;
  } catch (error) {
    console.warn('Record share failed:', error.message);
    return null;
  }
};

/**
 * Like a listing (server-side like count + liked state for user).
 * @param {string} listingId - UUID of the listing
 * @param {string} userId - current user id (subscription id or any stable id)
 * @returns {Promise<{success: boolean}>}
 */
export const likeListing = async (listingId, userId) => {
  if (!listingId || !userId) throw new Error('listingId and userId required');
  const response = await fetch(`${API_URL}/api/listings/${listingId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: String(userId) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to like');
  return data;
};

/**
 * Remove like from a listing.
 * @param {string} listingId - UUID of the listing
 * @param {string} userId - current user id
 * @returns {Promise<{success: boolean}>}
 */
export const unlikeListing = async (listingId, userId) => {
  if (!listingId || !userId) throw new Error('listingId and userId required');
  const response = await fetch(`${API_URL}/api/listings/${listingId}/like?user_id=${encodeURIComponent(String(userId))}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to unlike');
  return data;
};

/**
 * Like a post (separate from ad likes).
 * @param {string} listingId - UUID of the post listing in ads table
 * @param {string} userId - current user id
 * @returns {Promise<{success: boolean}>}
 */
export const likePost = async (listingId, userId) => {
  if (!listingId || !userId) throw new Error('listingId and userId required');
  const response = await fetch(`${API_URL}/api/posts/${listingId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: String(userId) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to like post');
  return data;
};

/**
 * Remove like from a post (separate from ad likes).
 * @param {string} listingId - UUID of the post listing in ads table
 * @param {string} userId - current user id
 * @returns {Promise<{success: boolean}>}
 */
export const unlikePost = async (listingId, userId) => {
  if (!listingId || !userId) throw new Error('listingId and userId required');
  const response = await fetch(`${API_URL}/api/posts/${listingId}/like?user_id=${encodeURIComponent(String(userId))}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to unlike post');
  return data;
};

/**
 * Get comments for a post listing.
 * @param {string} listingId - UUID of post listing
 * @param {string|null} userId - optional current user id for liked state
 */
export const getPostComments = async (listingId, userId = null) => {
  if (!listingId) throw new Error('listingId required');
  const params = new URLSearchParams();
  if (userId != null && String(userId).trim() !== '') {
    params.set('user_id', String(userId).trim());
  }
  const qs = params.toString();
  const response = await fetch(
    `${API_URL}/api/posts/${listingId}/comments${qs ? `?${qs}` : ''}`,
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load comments');
  return data;
};

/**
 * Add a comment to a post listing.
 * @param {string} listingId - UUID of post listing
 * @param {string} userId - current user id
 * @param {string} text - comment body (may be empty if imageUrl set)
 * @param {string|null} imageUrl - optional public image URL (after client upload)
 */
export const addPostComment = async (listingId, userId, text, imageUrl = null) => {
  if (!listingId || !userId) throw new Error('listingId and userId required');
  const u = imageUrl != null && String(imageUrl).trim() !== '' ? String(imageUrl).trim() : null;
  const response = await fetch(`${API_URL}/api/posts/${listingId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: String(userId),
      text: String(text || ''),
      image_url: u,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to add comment');
  return data;
};

/**
 * React to a post comment with like/dislike.
 * @param {string} listingId - UUID of post listing
 * @param {string} commentId - UUID of comment
 * @param {string} userId - current user id
 * @param {'like'|'dislike'} reactionType
 */
export const reactToPostComment = async (listingId, commentId, userId, reactionType) => {
  if (!listingId || !commentId || !userId) {
    throw new Error('listingId, commentId and userId required');
  }
  if (reactionType !== 'like' && reactionType !== 'dislike') {
    throw new Error('reactionType must be like or dislike');
  }
  const response = await fetch(
    `${API_URL}/api/posts/${listingId}/comments/${commentId}/reaction`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: String(userId),
        reaction_type: reactionType,
      }),
    },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to react to comment');
  return data;
};

/**
 * Remove reaction from a post comment.
 * @param {string} listingId - UUID of post listing
 * @param {string} commentId - UUID of comment
 * @param {string} userId - current user id
 */
export const clearPostCommentReaction = async (listingId, commentId, userId) => {
  if (!listingId || !commentId || !userId) {
    throw new Error('listingId, commentId and userId required');
  }
  const response = await fetch(
    `${API_URL}/api/posts/${listingId}/comments/${commentId}/reaction?user_id=${encodeURIComponent(String(userId))}`,
    { method: 'DELETE' },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to clear comment reaction');
  return data;
};

/**
 * Get unread message count (messages sent to this user, optionally after a timestamp) for the chat badge.
 * @param {string} userId - current user id
 * @param {string} [afterIso] - only count messages created after this ISO timestamp (e.g. last time user opened chat)
 * @returns {Promise<{ success: boolean, count: number }>}
 */
export const getChatUnreadCount = async (userEmail, afterIso = null) => {
  if (!userEmail) return { success: true, count: 0 };
  const params = new URLSearchParams({ user_email: String(userEmail).trim().toLowerCase() });
  if (afterIso) params.set('after', afterIso);
  const response = await fetch(`${API_URL}/api/chat/unread-count?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) return { success: true, count: 0 };
  return { success: true, count: typeof data.count === 'number' ? data.count : 0 };
};

/**
 * Get my chat conversations (by email).
 * @param {string} userEmail - current user email
 * @returns {Promise<{ success: boolean, conversations: Array }>}
 */
export const getChatConversations = async (userEmail) => {
  if (!userEmail) return { success: true, conversations: [] };
  const email = String(userEmail).trim().toLowerCase();
  const url = `${API_URL}/api/chat/conversations?user_email=${encodeURIComponent(email)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load conversations');
  return data;
};

/**
 * Search brokers (verified, active, or pending verification — not suspended) by name, contact, or office text (min 2 characters).
 * @param {string} q - search query
 * @param {string|null} [excludeEmail] - omit this email from results (e.g. current user)
 * @returns {Promise<{ success: boolean, brokers: Array<{ id, email, title, subtitle, profileImageUrl }> }>}
 */
export const searchBrokers = async (q, excludeEmail = null) => {
  const query = String(q || '').trim();
  if (query.length < 2) {
    logBrokerSearch('skip', { reason: 'query_too_short', queryLen: query.length });
    return { success: true, brokers: [] };
  }
  const params = new URLSearchParams({ q: query });
  if (excludeEmail) {
    params.set('exclude_email', String(excludeEmail).trim().toLowerCase());
  }
  const resolvedBase = getResolvedApiUrl();
  const url = `${resolvedBase}/api/brokers/search?${params.toString()}`;
  logBrokerSearch('request', {
    platform: Platform.OS,
    isWeb,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || '(unset)',
    resolvedApiBase: resolvedBase,
    fullUrl: url,
    query,
    excludeEmail: excludeEmail || null,
    expoDebuggerHost:
      Constants.expoGoConfig?.debuggerHost ||
      Constants.manifest2?.extra?.expoGo?.debuggerHost ||
      Constants.manifest?.debuggerHost ||
      null,
  });
  let response;
  try {
    response = await fetch(url);
  } catch (fetchErr) {
    logBrokerSearch('fetch_failed', {
      resolvedApiBase: resolvedBase,
      fullUrl: url,
      errorName: fetchErr?.name,
      errorMessage: fetchErr?.message,
      string: String(fetchErr),
    });
    const hint =
      !isWeb && /localhost|127\.0\.0\.1/i.test(resolvedBase)
        ? ' במכשיר פיזי הגדר EXPO_PUBLIC_API_URL לכתובת ה-IP של המחשב (או השתמש ב-Expo Go — נבחר IP אוטומטית).'
        : '';
    throw new Error(`לא ניתן להתחבר לשרת (${resolvedBase}).${hint}`);
  }
  const text = await response.text();
  const bodyPreview = text.length > 500 ? `${text.slice(0, 500)}…` : text;
  logBrokerSearch('response', {
    status: response.status,
    ok: response.ok,
    bodyLength: text.length,
    bodyPreview,
  });
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (parseErr) {
    logBrokerSearch('json_parse_failed', {
      status: response.status,
      bodyPreview: text.slice(0, 400),
      parseError: parseErr?.message ? String(parseErr.message) : String(parseErr),
    });
    throw new Error('תשובה לא תקינה מהשרת');
  }
  if (!response.ok) {
    logBrokerSearch('http_error', { status: response.status, error: data?.error, data });
    throw new Error(data.error || 'Broker search failed');
  }
  const brokers = data.brokers || [];
  logBrokerSearch('ok', {
    success: !!data.success,
    brokerCount: brokers.length,
    sampleTitles: brokers.slice(0, 5).map((b) => b.title || b.email || '?'),
  });
  return { success: !!data.success, brokers };
};

/** 1:1 chat partners for group picker. audience: 'all' | 'regular' | 'non_regular' */
export const getDirectContactsForGroup = async (userEmail, q = '', audience = 'all') => {
  if (!userEmail) return { success: true, contacts: [] };
  const params = new URLSearchParams({
    user_email: String(userEmail).trim().toLowerCase(),
    q: String(q || '').trim(),
  });
  const aud = String(audience || 'all').trim().toLowerCase();
  if (aud === 'regular' || aud === 'non_regular' || aud === 'all') {
    params.set('audience', aud);
  }
  const response = await fetch(`${API_URL}/api/chat/direct-contacts?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load contacts');
  return { success: !!data.success, contacts: data.contacts || [] };
};

/** Brokers list for group picker (q optional; empty returns first page) */
export const getBrokersForGroupPicker = async (q, excludeEmail = null) => {
  const params = new URLSearchParams();
  if (q != null && String(q).trim()) params.set('q', String(q).trim());
  if (excludeEmail) params.set('exclude_email', String(excludeEmail).trim().toLowerCase());
  const response = await fetch(`${API_URL}/api/brokers/group-picker?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load brokers');
  return { success: !!data.success, brokers: data.brokers || [] };
};

/** Users list for group picker by audience: 'regular' | 'broker_only' | 'non_regular' | 'all' */
export const getUsersForGroupPicker = async (q = '', excludeEmail = null, audience = 'all') => {
  const params = new URLSearchParams();
  if (q != null && String(q).trim()) params.set('q', String(q).trim());
  if (excludeEmail) params.set('exclude_email', String(excludeEmail).trim().toLowerCase());
  const aud = String(audience || 'all').trim().toLowerCase();
  if (aud === 'regular' || aud === 'broker_only' || aud === 'non_regular' || aud === 'all') {
    params.set('audience', aud);
  }
  const response = await fetch(`${API_URL}/api/users/group-picker?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load users');
  return { success: !!data.success, users: data.users || [] };
};

export const createChatGroup = async ({ creatorEmail, memberEmails, title, kind, groupImageUrl = null }) => {
  const payload = {
    creator_email: String(creatorEmail).trim().toLowerCase(),
    member_emails: (memberEmails || []).map((e) => String(e).trim().toLowerCase()).filter(Boolean),
    title: title != null ? String(title).trim() : '',
    kind: kind === 'brokers' ? 'brokers' : 'customers',
  };
  if (groupImageUrl != null && String(groupImageUrl).trim()) {
    payload.group_image_url = String(groupImageUrl).trim();
  }
  const response = await fetch(`${API_URL}/api/chat/groups`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create group');
  return data;
};

export const addMembersToChatGroup = async ({ userEmail, conversationId, memberEmails }) => {
  const payload = {
    user_email: String(userEmail || '').trim().toLowerCase(),
    conversation_id: String(conversationId || '').trim(),
    member_emails: (memberEmails || []).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean),
  };
  const response = await fetch(`${API_URL}/api/chat/groups/add-members`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to add members');
  return data;
};

export const getGroupChatMessages = async (userEmail, conversationId) => {
  if (!userEmail || !conversationId) return { success: true, messages: [], conversation_id: null };
  const params = new URLSearchParams({
    user_email: String(userEmail).trim().toLowerCase(),
    conversation_id: String(conversationId).trim(),
  });
  const response = await fetch(`${API_URL}/api/chat/group-messages?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load messages');
  return data;
};

export const updateGroupDescription = async ({userEmail, conversationId, description}) => {
  const response = await fetch(`${API_URL}/api/chat/group-description`, {
    method: 'PATCH',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      user_email: String(userEmail).trim().toLowerCase(),
      conversation_id: String(conversationId).trim(),
      group_description: description != null ? String(description) : '',
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to save description');
  return data;
};

export const updateGroupTitle = async ({userEmail, conversationId, title}) => {
  const response = await fetch(`${API_URL}/api/chat/group-title`, {
    method: 'PATCH',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      user_email: String(userEmail || '').trim().toLowerCase(),
      conversation_id: String(conversationId || '').trim(),
      title: title != null ? String(title).trim() : '',
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to save title');
  return data;
};

export const removeMemberFromChatGroup = async ({userEmail, conversationId, memberEmail}) => {
  const response = await fetch(`${API_URL}/api/chat/groups/remove-member`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      user_email: String(userEmail || '').trim().toLowerCase(),
      conversation_id: String(conversationId || '').trim(),
      member_email: String(memberEmail || '').trim().toLowerCase(),
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to remove member');
  return data;
};

export const updateGroupMemberRole = async ({userEmail, conversationId, targetEmail, role}) => {
  const response = await fetch(`${API_URL}/api/chat/groups/member-role`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      user_email: String(userEmail || '').trim().toLowerCase(),
      conversation_id: String(conversationId || '').trim(),
      target_email: String(targetEmail || '').trim().toLowerCase(),
      role: role === 'manager' ? 'manager' : 'member',
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update role');
  return data;
};

export const sendGroupChatMessage = async (
  conversationId,
  senderEmail,
  body,
  media = null,
  listingId = null,
  listingShare = false,
) => {
  const payload = {
    conversation_id: String(conversationId).trim(),
    sender_email: String(senderEmail).trim().toLowerCase(),
    body: body != null ? String(body).trim() : '',
  };
  if (media && media.url && (media.type === 'image' || media.type === 'audio')) {
    payload.media_type = media.type;
    payload.media_url = String(media.url).trim();
  }
  if (listingId != null && String(listingId).trim() !== '') {
    payload.listing_id = String(listingId).trim();
  }
  if (listingShare) payload.listing_share = true;
  const response = await fetch(`${API_URL}/api/chat/group-messages`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to send');
  return data;
};

/**
 * Get display name and profile image for a chat participant by email or user ref (UUID).
 * @param {string} userRef - participant email or id
 * @returns {Promise<{ success: boolean, name?: string, profileImageUrl?: string, phone?: string | null }>}
 */
export const getChatParticipantDisplay = async (userRef) => {
  if (!userRef) return { success: true, name: null, profileImageUrl: null };
  const ref = String(userRef).trim();
  const url = `${API_URL}/api/chat/participant-display?user_ref=${encodeURIComponent(ref)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load participant display');
  return data;
};

/**
 * Get messages between me and another user (by email).
 * @param {string} myEmail - current user email
 * @param {string} otherUserEmail - other user email
 * @returns {Promise<{ success: boolean, messages: Array }>}
 */
export const getListingPreview = async (listingId) => {
  if (!listingId) return null;
  const id = String(listingId).trim();
  if (!id) return null;
  try {
    const response = await fetch(`${API_URL}/api/listings/${encodeURIComponent(id)}/preview`);
    const data = await response.json();
    if (!response.ok) return null;
    return data?.listing || null;
  } catch (_) {
    return null;
  }
};

export const getChatMessages = async (myEmail, otherUserEmail) => {
  if (!myEmail || !otherUserEmail) return { success: true, messages: [] };
  const params = new URLSearchParams({
    user_email: String(myEmail).trim().toLowerCase(),
    other_user_email: String(otherUserEmail).trim().toLowerCase(),
  });
  const response = await fetch(`${API_URL}/api/chat/messages?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load messages');
  return data;
};

export const respondToExclusiveOffer = async ({userEmail, conversationId, accept}) => {
  const response = await fetch(`${API_URL}/api/chat/exclusive-offer/respond`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      user_email: String(userEmail || '').trim().toLowerCase(),
      conversation_id: String(conversationId || '').trim(),
      accept: !!accept,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update offer');
  return data;
};

/**
 * Send a chat message (by email).
 * @param {string} senderEmail - current user email
 * @param {string} receiverEmail - other user email
 * @param {string} body - message text
 * @param {{ name?: string, profileImageUrl?: string }} [receiverDisplay] - optional
 * @param {{ name?: string, profileImageUrl?: string }} [senderDisplay] - optional
 * @returns {Promise<{ success: boolean, message: object }>}
 */
/**
 * @param {{ type: 'image'|'audio', url: string }} [media] - optional; use with empty body for media-only messages
 * @param {string|null} [listingId] - optional ads.id (UUID); stored on message for inbox listing badges
 * @param {boolean} [listingShare] - true when sharing a feed post (card UI); false for normal text
 */
export const sendChatMessage = async (
  senderEmail,
  receiverEmail,
  body,
  receiverDisplay = null,
  senderDisplay = null,
  media = null,
  listingId = null,
  listingShare = false,
) => {
  const text = body != null ? String(body).trim() : '';
  const hasMedia =
    media &&
    media.url &&
    (media.type === 'image' || media.type === 'audio');
  if (!senderEmail || !receiverEmail || (!text && !hasMedia)) {
    throw new Error('senderEmail, receiverEmail and body or media required');
  }
  const payload = {
    sender_email: String(senderEmail).trim().toLowerCase(),
    receiver_email: String(receiverEmail).trim().toLowerCase(),
    body: text,
  };
  if (hasMedia) {
    payload.media_type = media.type;
    payload.media_url = String(media.url).trim();
  }
  if (receiverDisplay) {
    if (receiverDisplay.name != null) payload.receiver_display_name = String(receiverDisplay.name);
    if (receiverDisplay.profileImageUrl != null) payload.receiver_profile_picture_url = String(receiverDisplay.profileImageUrl);
  }
  if (senderDisplay) {
    if (senderDisplay.name != null) payload.sender_display_name = String(senderDisplay.name);
    if (senderDisplay.profileImageUrl != null) payload.sender_profile_picture_url = String(senderDisplay.profileImageUrl);
  }
  if (listingId != null && String(listingId).trim() !== '') {
    payload.listing_id = String(listingId).trim();
  }
  if (listingShare) payload.listing_share = true;
  const response = await fetch(`${API_URL}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to send message');
  return data;
};

/**
 * Upload a chat image or voice note to Supabase Storage bucket "chat" (via backend).
 * @param {{ uri: string, type?: string, name?: string }} file
 */
export const uploadChatMedia = async (file) => {
  const formData = new FormData();
  const toAppend = await toFormDataFile(file, 'file');
  if (!toAppend) throw new Error('No file to upload');
  formData.append('file', toAppend);
  const response = await fetch(`${API_URL}/api/chat/upload-media`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.details || 'Failed to upload media');
  return data;
};

/**
 * Upload a group avatar image to Supabase Storage bucket "group-pics" (via backend).
 * @param {{ uri: string, type?: string, name?: string }} file
 */
export const uploadGroupImage = async (file) => {
  const formData = new FormData();
  const toAppend = await toFormDataFile(file, 'file');
  if (!toAppend) throw new Error('No file to upload');
  formData.append('file', toAppend);
  const response = await fetch(`${API_URL}/api/chat/upload-group-image`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.details || 'Failed to upload group image');
  return data;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Return subscriptionId only if it's a valid UUID (DB expects UUID). Client ids like "user-123" become null.
 * @param {*} id - currentUser.id or similar
 * @returns {string|null}
 */
export const toSubscriptionId = id => {
  if (id == null || typeof id !== 'string') return null;
  const trimmed = id.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
};

/**
 * Create a new listing
 * @param {Object} listingData - Listing data including form fields and file URLs
 * @returns {Promise} API response with listing ID
 */
/**
 * Home row: subscriptions with profile video (video_url), verified/active
 * @returns {Promise<{ success: boolean, rings?: Array }>}
 */
export const getStoriesFeed = async () => {
  const response = await fetch(`${API_URL}/api/stories/feed`, {
    method: 'GET',
    headers: {'Content-Type': 'application/json'},
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {success: false, rings: [], error: data.error};
  }
  return data;
};

/**
 * Company directory for home "חפשו עוד" (verified/active company subscriptions + ad counts)
 */
export const getCompaniesDirectory = async () => {
  const response = await fetch(`${API_URL}/api/companies/directory`, {
    method: 'GET',
    headers: {'Content-Type': 'application/json'},
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load companies');
  }
  return data;
};

/**
 * Professionals directory for home "חפשו עוד" (verified/active professional subscriptions)
 */
export const getProfessionalsDirectory = async () => {
  const response = await fetch(`${API_URL}/api/professionals/directory`, {
    method: 'GET',
    headers: {'Content-Type': 'application/json'},
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load professionals');
  }
  return data;
};

/**
 * Create a story slide (separate from ads)
 * @param {{ subscription_id: string, media_url: string }} payload
 */
export const createStory = async payload => {
  const response = await fetch(`${API_URL}/api/stories`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create story');
  }
  return data;
};

export const createListing = async listingData => {
  try {
    console.log('Sending listing data to API:', listingData);

    const response = await fetch(`${API_URL}/api/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(listingData),
    });

    const data = await response.json();

    // console.log('API response status:', response.status);
    // console.log('API response data:', data);

    if (!response.ok) {
      const errorMsg = data.error || data.details || 'Failed to create listing';
      console.error('API error:', errorMsg);
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error('Error creating listing:', error);
    throw error;
  }
};

export const updateListing = async (listingId, listingData) => {
  const id = listingId != null ? String(listingId).trim() : '';
  if (!UUID_REGEX.test(id)) {
    throw new Error('Invalid listing id for update');
  }
  try {
    const response = await fetch(`${API_URL}/api/listings/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(listingData),
    });
    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.error || data.details || 'Failed to update listing';
      console.error('API error:', errorMsg);
      throw new Error(errorMsg);
    }
    return data;
  } catch (error) {
    console.error('Error updating listing:', error);
    throw error;
  }
};
