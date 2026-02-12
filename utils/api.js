/**
 * API utility functions for communicating with the backend
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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

    // Add files (React Native FormData format)
    if (files.profilePicture) {
      formDataToSend.append('profilePicture', {
        uri: files.profilePicture.uri,
        type: files.profilePicture.type || 'image/jpeg',
        name: files.profilePicture.name || 'profile.jpg',
      });
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
    const {status = 'published', category} = options;
    const params = new URLSearchParams({status});
    if (category) {
      params.append('category', category);
    }

    const url = `${API_URL}/api/listings?${params.toString()}`;
    console.log('🌐 [api.js] Fetching listings from:', url);
    console.log('🌐 [api.js] API_URL:', API_URL);
    console.log('🌐 [api.js] Options:', {status, category});

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
