/**
 * API utility functions for communicating with the backend
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

/** On web, FormData doesn't accept { uri, type, name }; convert blob/data URIs to Blob/File so the server receives a real file. */
async function toFormDataFile(file, fieldName = 'file') {
  if (!file || !file.uri) return null;
  if (!isWeb) return file; // React Native: keep { uri, type, name }
  const uri = file.uri;
  if (!uri.startsWith('blob:') && !uri.startsWith('data:')) return file;
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    const name = file.name || (fieldName === 'profilePicture' ? 'profile.jpg' : 'file.jpg');
    const type = file.type || blob.type || 'image/jpeg';
    return new File([blob], name, { type });
  } catch (e) {
    console.warn('Could not convert uri to File for web upload:', e);
    return file;
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
      files.additionalImages.forEach((image, index) => {
        formDataToSend.append('additionalImages', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.name || `image-${index}.jpg`,
        });
      });
    }

    if (files.companyLogo) {
      formDataToSend.append('companyLogo', {
        uri: files.companyLogo.uri,
        type: files.companyLogo.type || 'image/jpeg',
        name: files.companyLogo.name || 'logo.jpg',
      });
    }

    if (files.video) {
      formDataToSend.append('video', {
        uri: files.video.uri,
        type: files.video.type || 'video/mp4',
        name: files.video.name || 'video.mp4',
      });
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

    console.log('Verify API response status:', response.status);
    const data = await response.json();
    console.log('Verify API response data:', data);

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
 * Get subscription by ID
 * @param {string} subscriptionId - Subscription ID
 * @returns {Promise} API response
 */
export const getSubscription = async subscriptionId => {
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
      throw new Error(data.error || 'Failed to fetch subscription');
    }

    return data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
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
    if (email) params.append('email', email);
    if (subscriberNumber) params.append('subscriberNumber', subscriberNumber);

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
    formData.append('file', {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.name || 'file.jpg',
    });
    formData.append('folder', folder);

    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload file');
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
    const {status = 'published', category, subscription_type: subscriptionType, has_video: hasVideo, subscription_id: subscriptionId, user_id: userId} = options;
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
    if (subscriptionId != null && subscriptionId !== '') {
      params.append('subscription_id', String(subscriptionId));
    }
    if (userId != null && String(userId).trim() !== '') {
      params.append('user_id', String(userId).trim());
    }

    const url = `${API_URL}/api/listings?${params.toString()}`;
    console.log('🌐 [api.js] Fetching listings from:', url);
    console.log('🌐 [api.js] API_URL:', API_URL);
    console.log('🌐 [api.js] Options:', {status, category, subscriptionType, hasVideo});

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(
      '🌐 [api.js] Response status:',
      response.status,
      response.statusText,
    );

    const data = await response.json();

    console.log('🌐 [api.js] Response data:', data);

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
    console.error('Error updating listing freeze:', error);
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
 * Get display name and profile image for a chat participant by email.
 * @param {string} userEmail - participant email
 * @returns {Promise<{ success: boolean, name?: string, profileImageUrl?: string }>}
 */
export const getChatParticipantDisplay = async (userEmail) => {
  if (!userEmail) return { success: true, name: null, profileImageUrl: null };
  const email = String(userEmail).trim().toLowerCase();
  const url = `${API_URL}/api/chat/participant-display?user_email=${encodeURIComponent(email)}`;
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

/**
 * Send a chat message (by email).
 * @param {string} senderEmail - current user email
 * @param {string} receiverEmail - other user email
 * @param {string} body - message text
 * @param {{ name?: string, profileImageUrl?: string }} [receiverDisplay] - optional
 * @param {{ name?: string, profileImageUrl?: string }} [senderDisplay] - optional
 * @returns {Promise<{ success: boolean, message: object }>}
 */
export const sendChatMessage = async (senderEmail, receiverEmail, body, receiverDisplay = null, senderDisplay = null) => {
  if (!senderEmail || !receiverEmail || body == null || String(body).trim() === '') {
    throw new Error('senderEmail, receiverEmail and body required');
  }
  const payload = {
    sender_email: String(senderEmail).trim().toLowerCase(),
    receiver_email: String(receiverEmail).trim().toLowerCase(),
    body: String(body).trim(),
  };
  if (receiverDisplay) {
    if (receiverDisplay.name != null) payload.receiver_display_name = String(receiverDisplay.name);
    if (receiverDisplay.profileImageUrl != null) payload.receiver_profile_picture_url = String(receiverDisplay.profileImageUrl);
  }
  if (senderDisplay) {
    if (senderDisplay.name != null) payload.sender_display_name = String(senderDisplay.name);
    if (senderDisplay.profileImageUrl != null) payload.sender_profile_picture_url = String(senderDisplay.profileImageUrl);
  }
  const response = await fetch(`${API_URL}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to send message');
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

    console.log('API response status:', response.status);
    console.log('API response data:', data);

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
