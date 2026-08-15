/**
 * API utility functions for communicating with the backend
 */

import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
const isNativeMobile = Platform.OS === 'android' || Platform.OS === 'ios';

/** Strip trailing slashes so `${base}/api/...` never becomes `//api`. */
export function normalizeApiBaseUrl(url) {
  const s = String(url || '').trim().replace(/\/+$/, '');
  if (!s) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is missing. Set it in pi-front/.env and restart Expo (npx expo start -c).',
    );
  }
  return s;
}

/** API base URL — same production host on web, iOS, and Android (EXPO_PUBLIC_API_URL). */
export function getResolvedApiUrl() {
  const fromEnv = String(process.env.EXPO_PUBLIC_API_URL || '').trim();
  const fromExtra = String(Constants.expoConfig?.extra?.apiUrl || '').trim();
  const primary = fromEnv || fromExtra;
  return normalizeApiBaseUrl(primary);
}

/** Resolved per call so hot reload picks up .env changes without a stale module constant. */
function apiBase() {
  return getResolvedApiUrl();
}

/** @deprecated Use getResolvedApiUrl */
export const getApiUrl = getResolvedApiUrl;

if (typeof __DEV__ !== 'undefined' && __DEV__) {
}

const DEFAULT_API_TIMEOUT_MS = 30000;

function normalizeNativeFileUri(uri) {
  const s = String(uri || '').trim();
  if (!s) return '';
  if (
    s.startsWith('file://') ||
    s.startsWith('content://') ||
    s.startsWith('ph://') ||
    s.startsWith('assets-library://')
  ) {
    return s;
  }
  return `file://${s}`;
}

/**
 * FileSystem.uploadAsync needs a real file:// path. Gallery picks often return
 * content:// (Android) or ph:// / assets-library:// (iOS) — copy into cache first.
 */
async function ensureUploadableLocalUri(uri, hintName = 'upload.bin') {
  const normalized = normalizeNativeFileUri(uri);
  if (!normalized) return '';
  if (!isNativeMobile) return normalized;

  const needsCopy =
    normalized.startsWith('content://') ||
    normalized.startsWith('ph://') ||
    normalized.startsWith('assets-library://');
  if (!needsCopy) return normalized;

  const safe =
    String(hintName || 'upload.bin')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/^_+|_+$/g, '') || 'upload.bin';
  const dest = `${FileSystem.cacheDirectory}upload-${Date.now()}-${safe}`;
  await FileSystem.copyAsync({from: normalized, to: dest});
  return dest;
}

function throwForUploadStatus(status, bodyPreview = '') {
  const code = Number(status) || 0;
  if (code === 413) {
    throw new Error(
      'הקובץ גדול מדי להעלאה. נסו סרטון קצר יותר או באיכות נמוכה יותר.',
    );
  }
  const preview = String(bodyPreview || '').trim();
  throw new Error(
    preview
      ? `Upload failed (${code}): ${preview}`
      : `Upload failed (${code})`,
  );
}

/** Avoid alert/console showing "[object Object]" when API or native code returns error objects. */
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
    const nested =
      typeof value.error === 'string'
        ? value.error
        : value.error?.message || value.error?.details;
    const msg =
      value.message ||
      nested ||
      value.details ||
      value.statusText;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
  }
  return fallback;
}

function errorMessageFromApiBody(data, fallback) {
  if (!data || typeof data !== 'object') return fallback;
  return errorMessageFromUnknown(
    data.error ?? data.message ?? data.details,
    typeof data.details === 'string' && data.details.trim()
      ? data.details.trim()
      : fallback,
  );
}

function resolveUploadMimeType(file, isVideoFolder, fieldName = 'file') {
  const rawType = file?.type && String(file.type).trim() ? String(file.type).trim() : '';
  if (rawType && rawType.includes('/')) return rawType;
  if (rawType === 'video' || isVideoFolder || String(fieldName).includes('video')) {
    return 'video/mp4';
  }
  if (rawType === 'image') return 'image/jpeg';
  return 'image/jpeg';
}

function resolveUploadFileName(file, isVideoFolder) {
  if (file?.name && String(file.name).trim()) return String(file.name).trim();
  return isVideoFolder ? `video-${Date.now()}.mp4` : `file-${Date.now()}.jpg`;
}

/** Large files bypass Vercel body limits — upload directly to Supabase via signed URL. */
async function requestUploadSignedUrl(folder, fileName, contentType) {
  const response = await apiFetch(`${apiBase()}/api/upload/signed-url`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({folder, fileName, contentType}),
    timeoutMs: 30000,
  });
  const responseText = await response.text();
  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error(
      response.ok
        ? 'Invalid response from upload server'
        : `Upload setup failed (${response.status})`,
    );
  }
  if (!response.ok || !data.signedUrl) {
    throw new Error(
      errorMessageFromApiBody(data, 'Failed to prepare upload'),
    );
  }
  return data;
}

async function putLocalFileToSignedUrl(file, signedUrl, mimeType) {
  // Web File / Blob (e.g. OfficeListingScreen still attaches `.file`)
  if (isWeb) {
    let blob = null;
    if (file?.file instanceof Blob) blob = file.file;
    else if (typeof File !== 'undefined' && file instanceof File) blob = file;
    else if (file instanceof Blob) blob = file;

    if (!blob && file?.uri) {
      const res = await fetch(file.uri);
      if (!res.ok) throw new Error('Could not read file for upload');
      blob = await res.blob();
    }

    if (!blob) {
      throw new Error('No file data for upload');
    }

    const putRes = await fetch(signedUrl, {
      method: 'PUT',
      body: blob,
      headers: {'Content-Type': mimeType},
    });
    if (!putRes.ok) {
      throwForUploadStatus(putRes.status, (await putRes.text()).slice(0, 200));
    }
    return;
  }

  const uri = await ensureUploadableLocalUri(
    file?.uri,
    resolveUploadFileName(file, String(mimeType || '').startsWith('video/')),
  );
  if (!uri) {
    throw new Error('No file URI for upload');
  }

  if (isNativeMobile) {
    const result = await FileSystem.uploadAsync(signedUrl, uri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Content-Type': mimeType,
      },
    });
    if (result.status < 200 || result.status >= 300) {
      throwForUploadStatus(result.status, String(result.body || '').slice(0, 200));
    }
    return;
  }

  throw new Error('Direct upload is not supported on this platform');
}

async function uploadFileViaSignedUrl(file, folder = 'general', options = {}) {
  const isVideoFolder = String(folder || '').includes('video');
  const mimeType = resolveUploadMimeType(file, isVideoFolder);
  const fileName = resolveUploadFileName(file, isVideoFolder);
  const {signedUrl, publicUrl, path} = await requestUploadSignedUrl(
    folder,
    fileName,
    mimeType,
  );
  await putLocalFileToSignedUrl(file, signedUrl, mimeType);
  return {
    success: true,
    url: publicUrl,
    fileName: path,
  };
}

/** Native multipart upload — reliable on Android/iOS to Vercel (fetch/XHR FormData often fails). */
async function uploadNativeMultipart(url, file, fieldName, parameters = {}) {
  const uri = await ensureUploadableLocalUri(
    file?.uri,
    file?.name ||
      (String(fieldName).includes('video') ? 'video.mp4' : 'file.jpg'),
  );
  if (!uri) {
    throw new Error('No file URI for upload');
  }
  const rawType = file?.type && String(file.type).trim() ? String(file.type).trim() : '';
  const mimeType =
    rawType && rawType.includes('/')
      ? rawType
      : rawType === 'video'
        ? 'video/mp4'
        : rawType === 'image'
          ? 'image/jpeg'
          : fieldName === 'video' || String(fieldName).includes('video')
            ? 'video/mp4'
            : 'image/jpeg';

  const result = await FileSystem.uploadAsync(url, uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName,
    mimeType,
    parameters: Object.fromEntries(
      Object.entries(parameters || {}).map(([k, v]) => [k, String(v ?? '')]),
    ),
    headers: {Accept: 'application/json'},
  });

  const body = result.body ?? '';
  return {
    ok: result.status >= 200 && result.status < 300,
    status: result.status,
    text: async () => body,
    json: async () => {
      if (!body) return {};
      try {
        return JSON.parse(body);
      } catch {
        return {};
      }
    },
  };
}

/** RN Android fetch() is flaky for HTTPS GET to Vercel; XHR uses OkHttp reliably. */
function shouldUseAndroidXhrForApi(url, method, body, headers = {}) {
  if (Platform.OS !== 'android' || typeof XMLHttpRequest === 'undefined') {
    return false;
  }
  const u = String(url || '');
  if (!u.startsWith('http')) return false;
  const base = apiBase();
  if (!u.startsWith(base) && !u.includes('/api/')) return false;

  const m = String(method || 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'DELETE') return true;

  const ct = String(
    headers['Content-Type'] || headers['content-type'] || '',
  ).toLowerCase();
  if (ct.includes('multipart/form-data')) return false;
  if (
    body != null &&
    typeof body !== 'string' &&
    typeof FormData !== 'undefined' &&
    body instanceof FormData
  ) {
    return false;
  }
  return false;
}

function shouldUseAndroidXhrForMultipart(url, body) {
  if (Platform.OS !== 'android' || typeof XMLHttpRequest === 'undefined') {
    return false;
  }
  if (typeof FormData === 'undefined' || !(body instanceof FormData)) {
    return false;
  }
  const u = String(url || '');
  return (
    u.includes('/api/upload') ||
    u.includes('/api/upload-profile-pic') ||
    u.includes('/api/subscription/submit')
  );
}

function shouldUseAndroidXhrForJsonPost(method, body, headers = {}) {
  if (Platform.OS !== 'android' || typeof XMLHttpRequest === 'undefined') {
    return false;
  }
  if (typeof body !== 'string' || !body.length) return false;
  const m = String(method || 'GET').toUpperCase();
  if (m !== 'POST' && m !== 'PUT' && m !== 'PATCH') return false;
  const ct = String(
    headers['Content-Type'] || headers['content-type'] || '',
  ).toLowerCase();
  if (ct.includes('application/json')) return true;
  const trimmed = body.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function androidXhrFetch(url, options = {}) {
  const {
    timeoutMs = DEFAULT_API_TIMEOUT_MS,
    headers = {},
    body,
    method = 'POST',
  } = options;
  const m = String(method).toUpperCase();
  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(m, url, true);
    xhr.timeout = timeoutMs > 0 ? timeoutMs : 120000;
    xhr.responseType = 'text';

    Object.entries(headers).forEach(([key, value]) => {
      if (isFormData && String(key).toLowerCase() === 'content-type') return;
      if (value != null && value !== '') {
        xhr.setRequestHeader(key, String(value));
      }
    });
    if (
      !isFormData &&
      !headers['Content-Type'] &&
      !headers['content-type'] &&
      typeof body === 'string' &&
      body.length
    ) {
      xhr.setRequestHeader('Content-Type', 'application/json');
    }
    if (!headers.Accept && !headers.accept) {
      xhr.setRequestHeader('Accept', 'application/json');
    }

    xhr.onload = () => {
      const responseText = xhr.responseText ?? '';
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        url: xhr.responseURL || url,
        headers: {
          get: name => xhr.getResponseHeader(name),
        },
        text: async () => responseText,
        json: async () => {
          if (!responseText) return {};
          return JSON.parse(responseText);
        },
      });
    };
    xhr.onerror = () => {
      reject(new TypeError('Network request failed'));
    };
    xhr.ontimeout = () => {
      reject(new Error(`timeout after ${xhr.timeout}ms`));
    };
    xhr.send(
      isFormData ? body : body != null && body !== '' ? body : undefined,
    );
  });
}

/**
 * Centralized fetch wrapper for backend calls.
 * Adds an AbortController-based timeout and, on transport-level failures
 * (network down, DNS, TLS, timeout, "Failed to fetch"), throws a richer Error
 * that includes method + full URL + resolved API base + original cause —
 * so we can tell *which* request died and against *which* host.
 *
 * Successful responses (including 4xx/5xx) pass through unchanged.
 */
export async function apiFetch(input, options = {}) {
  const { timeoutMs = DEFAULT_API_TIMEOUT_MS, signal: externalSignal, ...rest } = options;
  const url = typeof input === 'string' ? input : input?.url || '';
  const method = String(rest?.method || 'GET').toUpperCase();

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }
  const timeoutId = timeoutMs > 0 ? setTimeout(() => controller.abort(new Error('timeout')), timeoutMs) : null;

  const useAndroidXhr =
    shouldUseAndroidXhrForApi(url, method, rest.body, rest.headers || {}) ||
    shouldUseAndroidXhrForJsonPost(method, rest.body, rest.headers || {}) ||
    shouldUseAndroidXhrForMultipart(url, rest.body);

  try {
    if (useAndroidXhr) {
      return await androidXhrFetch(url, {
        method,
        headers: rest.headers || {},
        body: rest.body,
        timeoutMs,
      });
    }
    return await fetch(input, {
      ...rest,
      signal: controller.signal,
      ...(isWeb ? {cache: 'no-store'} : {}),
    });
  } catch (error) {
    const message = String(error?.message || error || '');
    const isAbort = error?.name === 'AbortError' || /aborted/i.test(message);
    const isNetwork =
      /network request failed|failed to fetch|networkerror/i.test(message);

    if (isAbort || isNetwork) {
      const reason = isAbort && timeoutId && controller.signal.reason?.message === 'timeout'
        ? `timeout after ${timeoutMs}ms`
        : isAbort
          ? 'aborted'
          : message || 'network request failed';
      const enriched = new Error(
        `[apiFetch] ${method} ${url} failed: ${reason}. ` +
        `API base: ${apiBase()}. Original: ${message || error}`,
      );
      enriched.cause = error;
      enriched.url = url;
      enriched.method = method;
      enriched.apiBase = apiBase();
      throw enriched;
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (externalSignal) externalSignal.removeEventListener?.('abort', onExternalAbort);
  }
}

/** Parse JSON API bodies; surface clear errors when the server returns HTML (e.g. 404 route). */
async function parseApiJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    if (response.status === 404) {
      const reqUrl = String(response.url || '');
      if (reqUrl.includes('/api/listings/') && !reqUrl.includes('/like')) {
        throw new Error(
          'מחיקת מודעות לא זמינה בשרת. יש לעדכן ולהפעיל מחדש את pi-back.',
        );
      }
      throw new Error(
        'שירות ההתחברות לא זמין בשרת. יש לפרוס גרסה מעודכנת של pi-back (כולל /api/auth/login).',
      );
    }
    throw new Error('תגובה לא תקינה מהשרת');
  }
}

function logBrokerSearch(step, payload) {
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
    } else if (fieldName === 'file') {
      name = name || 'file.bin';
      type = type || blob.type || 'application/octet-stream';
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
 * Upload local profile/company images first so submit is mostly JSON fields.
 * Large multipart POSTs to Vercel often fail on Android with "Network request failed"
 * even when smaller GET requests work fine.
 */
export async function prepareSubscriptionSubmitPayload(formData, files = {}) {
  const data = {...formData};
  const outFiles = {...files};

  const profileUri = outFiles.profilePicture?.uri;
  if (profileUri && !data.profile_picture_url) {
    if (String(profileUri).startsWith('http')) {
      data.profile_picture_url = profileUri;
      delete outFiles.profilePicture;
    } else {
      try {
        const uploaded = await uploadProfilePicture(outFiles.profilePicture);
        if (uploaded?.url) {
          data.profile_picture_url = uploaded.url;
        }
        delete outFiles.profilePicture;
      } catch (err) {
        console.warn(
          '[prepareSubscriptionSubmitPayload] profile pre-upload failed:',
          err?.message || err,
        );
        // Pre-upload failed — drop local file so submit can continue without it.
        delete outFiles.profilePicture;
      }
    }
  }

  const logoUri = outFiles.companyLogo?.uri;
  if (logoUri && !data.company_logo_url) {
    if (String(logoUri).startsWith('http')) {
      data.company_logo_url = logoUri;
      delete outFiles.companyLogo;
    } else {
      try {
        const uploaded = await uploadFile(outFiles.companyLogo, 'company-logos');
        if (uploaded?.url) {
          data.company_logo_url = uploaded.url;
        }
        delete outFiles.companyLogo;
      } catch (err) {
        console.warn(
          '[prepareSubscriptionSubmitPayload] logo pre-upload failed:',
          err?.message || err,
        );
        delete outFiles.companyLogo;
      }
    }
  }

  // Company / video-tab flows attach the same cropped file as both profile + logo.
  // If one pre-upload succeeds and the other fails, keep both columns filled.
  const sameLogoAsProfile =
    Boolean(files.companyLogo) &&
    Boolean(files.profilePicture) &&
    (files.companyLogo === files.profilePicture ||
      (profileUri && logoUri && String(profileUri) === String(logoUri)));
  if (sameLogoAsProfile) {
    if (data.profile_picture_url && !data.company_logo_url) {
      data.company_logo_url = data.profile_picture_url;
    }
    if (data.company_logo_url && !data.profile_picture_url) {
      data.profile_picture_url = data.company_logo_url;
    }
  }

  const videoUri = outFiles.video?.uri;
  if (videoUri && !data.video_url) {
    if (String(videoUri).startsWith('http')) {
      data.video_url = videoUri;
      delete outFiles.video;
    } else {
      try {
        const uploaded = await uploadFile(outFiles.video, 'profile-videos', {
          timeoutMs: 180000,
        });
        if (uploaded?.url) {
          data.video_url = uploaded.url;
        }
        delete outFiles.video;
      } catch (err) {
        console.warn(
          '[prepareSubscriptionSubmitPayload] video pre-upload failed:',
          err?.message || err,
        );
        delete outFiles.video;
      }
    }
  }

  return {formData: data, files: outFiles};
}

/** Build a strict JSON string for POST /api/subscription/submit (never object-literal text). */
function toSubscriptionSubmitJsonBody(formData) {
  const payload = {};
  Object.keys(formData || {}).forEach(key => {
    const value = formData[key];
    if (value === undefined) return;
    payload[key] = value;
  });
  const body = JSON.stringify(payload);
  if (typeof body !== 'string' || !body.startsWith('{')) {
    throw new Error('Failed to serialize subscription form');
  }
  return body;
}

/** True when submit must use multipart (local file URIs not yet uploaded). */
function subscriptionSubmitHasFileAttachments(files = {}, formData = {}) {
  if (formData.profile_picture_url || formData.company_logo_url) {
    // Already remote URLs — no binary parts needed.
  } else if (files.profilePicture || files.companyLogo) {
    return true;
  }
  if (formData.video_url) {
    // Already uploaded
  } else if (files.video) {
    return true;
  }
  if (Array.isArray(files.additionalImages) && files.additionalImages.length > 0) {
    return true;
  }
  return false;
}

async function postSubscriptionSubmit(body, headers = {}) {
  const isJson = typeof body === 'string';
  const url = `${apiBase()}/api/subscription/submit`;
  const response = await apiFetch(url, {
    method: 'POST',
    body,
    headers: isJson
      ? {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...headers,
        }
      : headers,
    timeoutMs: 120000,
  });
  const data = await response.json();
  if (!response.ok) {
    const errorMsg =
      data.details && data.error
        ? `${data.error}: ${data.details}`
        : data.error || data.message || 'Failed to submit subscription';
    throw new Error(errorMsg);
  }
  return data;
}

/**
 * Submit subscription form
 * @param {Object} formData - Form data including subscription type, user info, etc.
 * @param {Object} files - Files to upload (profilePicture, additionalImages, companyLogo, video)
 * @returns {Promise} API response
 */
export const submitSubscription = async (formData, files = {}) => {
  const prepared = await prepareSubscriptionSubmitPayload(formData, files);
  const payload = prepared.formData;
  const attach = prepared.files;

  try {
    const forceJson = !subscriptionSubmitHasFileAttachments(attach, payload);

    if (forceJson) {
      return await postSubscriptionSubmit(
        toSubscriptionSubmitJsonBody(payload),
      );
    }

    const formDataToSend = new FormData();

    // Add all form fields
    Object.keys(payload).forEach(key => {
      if (payload[key] !== null && payload[key] !== undefined) {
        if (Array.isArray(payload[key])) {
          formDataToSend.append(key, JSON.stringify(payload[key]));
        } else if (typeof payload[key] === 'object') {
          formDataToSend.append(key, JSON.stringify(payload[key]));
        } else {
          formDataToSend.append(key, String(payload[key]));
        }
      }
    });

    // Add files: on web use Blob/File so server receives real file; on RN use { uri, type, name }
    if (attach.profilePicture && !payload.profile_picture_url) {
      const toAppend = await toFormDataFile(attach.profilePicture, 'profilePicture');
      if (toAppend) formDataToSend.append('profilePicture', toAppend);
    }

    if (attach.additionalImages && attach.additionalImages.length > 0) {
      for (let index = 0; index < attach.additionalImages.length; index++) {
        const image = attach.additionalImages[index];
        const part = await toFormDataFile(image, 'additionalImage');
        if (part) {
          formDataToSend.append('additionalImages', part);
        }
      }
    }

    if (attach.companyLogo) {
      const logoAppend = await toFormDataFile(attach.companyLogo, 'companyLogo');
      if (logoAppend) {
        formDataToSend.append('companyLogo', logoAppend);
      }
    }

    if (attach.video) {
      const videoAppend = await toFormDataFile(attach.video, 'video');
      if (videoAppend) {
        formDataToSend.append('video', videoAppend);
      } else {
        console.error(
          '[submitSubscription] Video file could not be attached (web needs blob/data URL from picker).',
        );
      }
    }

    return await postSubscriptionSubmit(formDataToSend, {});
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
  const url = `${apiBase()}/api/upload-profile-pic`;
  if (isNativeMobile && file?.uri) {
    const response = await uploadNativeMultipart(url, file, 'profilePicture');
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload profile picture');
    }
    return data;
  }

  const formData = new FormData();
  const toAppend = await toFormDataFile(file, 'profilePicture');
  if (!toAppend) throw new Error('No profile picture to upload');
  formData.append('profilePicture', toAppend);
  const response = await apiFetch(url, {
    method: 'POST',
    body: formData,
    timeoutMs: 120000,
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
  password = null,
) => {
  try {
    const body = {email, verificationCode, subscriptionId};
    if (password) body.password = password;
    const response = await apiFetch(`${apiBase()}/api/subscription/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
 * B2B registration stage 2: save password before sending verification email.
 * Prefer resendVerificationCode(subId, password) — works on deployed backends.
 * This route exists only after pi-back is deployed with set-password handler.
 */
export const setSubscriptionPassword = async (subscriptionId, password) => {
  const response = await apiFetch(`${apiBase()}/api/subscription/set-password`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({subscriptionId, password}),
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    if (response.status === 404) {
      const err = new Error('set-password endpoint not available');
      err.status = 404;
      throw err;
    }
    throw new Error('Invalid response from set-password');
  }
  if (!response.ok || !data.success) {
    const err = new Error(data.error || 'Failed to save password');
    err.status = response.status;
    throw err;
  }
  return data;
};

/**
 * Apply a promo code to a pending subscription (registration step 2).
 * Raises max_published_listings above the default monthly quota.
 */
export const applySubscriptionPromoCode = async (subscriptionId, code) => {
  const subId = String(subscriptionId || '').trim();
  const codeNorm = String(code || '').trim();
  if (!subId) {
    throw new Error('חסר מזהה מנוי');
  }
  if (!codeNorm) {
    throw new Error('יש להזין קוד קופון');
  }
  const response = await apiFetch(
    `${apiBase()}/api/subscription/apply-promo-code`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({subscriptionId: subId, code: codeNorm}),
    },
  );
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'קוד הקופון אינו תקף');
  }
  return data;
};

/**
 * B2B sign-in with email and password.
 */
export const loginWithPassword = async (email, password) => {
  const emailNorm = String(email || '').trim().toLowerCase();
  const pwd = String(password || '');
  if (!emailNorm) {
    throw new Error('אנא הזן כתובת מייל');
  }
  if (!pwd) {
    throw new Error('אנא הזן סיסמה');
  }


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
};

/**
 * Test only: mark subscription verified without code.
 */
export const verifyEmailSkipTest = async (
  email,
  subscriptionId,
  password = null,
) => {
  if (!subscriptionId) {
    throw new Error('subscriptionId is required');
  }
  const body = {email: email || undefined, subscriptionId};
  if (password) body.password = password;
  const response = await apiFetch(`${apiBase()}/api/subscription/verify-skip-test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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
export const resendVerificationCode = async (
  email,
  subscriptionId = null,
  password = null,
) => {
  try {
    const body = {email, subscriptionId};
    if (password) body.password = password;
    const response = await apiFetch(`${apiBase()}/api/subscription/resend-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to resend code');
    }

    return data;
  } catch (error) {
    console.error('[api] resendVerificationCode: failed', error);
    throw error;
  }
};

/**
 * Forgot password — server resets B2B password and emails the new one.
 * Uses recover-subscriber-code on Vercel until /api/auth/forgot-password is deployed.
 */
export const recoverPasswordByEmail = async email => {
  const body = JSON.stringify({email: String(email || '').trim()});
  const headers = {'Content-Type': 'application/json'};
  const postOpts = {method: 'POST', headers, body, timeoutMs: 60000};

  let response = await apiFetch(
    `${apiBase()}/api/auth/forgot-password`,
    postOpts,
  );
  if (response.status === 404) {
    response = await apiFetch(
      `${apiBase()}/api/subscription/recover-subscriber-code`,
      postOpts,
    );
  }

  const data = await parseApiJsonResponse(response);
  if (!response.ok) {
    throw new Error(data.error || 'שגיאה בשליחת הבקשה');
  }
  return data;
};

/** @deprecated Use recoverPasswordByEmail */
export const recoverSubscriberCodeByEmail = recoverPasswordByEmail;

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
    const response = await apiFetch(
      `${apiBase()}/api/subscription/${subscriptionId}`,
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
      // console.log('[api.getSubscription] subscription keys:', Object.keys(sub), 'description' in sub ? 'description=' + JSON.stringify((sub.description || '').slice(0, 80)) : 'no description key');
    }
    return data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
  }
};

/**
 * Update editable profile fields for a subscription (all account types).
 * Broker/professional may also pass `video_url` to replace the profile intro video.
 * @param {string} subscriptionId - subscription UUID
 * @param {object} fields - whitelist of editable fields (name, phone, description, etc.)
 * @returns {Promise<{success: boolean, subscription?: object, error?: string}>}
 */
export const updateSubscriptionProfile = async (subscriptionId, fields = {}) => {
  const id = toSubscriptionId(subscriptionId);
  if (!id) throw new Error('Valid subscription id is required');
  const response = await apiFetch(`${apiBase()}/api/subscription/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to update profile');
  return data;
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
    const response = await apiFetch(`${apiBase()}/api/ai/smart-info`, {
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
 * Pi AI search: Gemini ranks published listings against a free-text Hebrew query.
 * @param {string} query - Free-text query (usually Hebrew)
 * @param {Array<Record<string, unknown>>} listingSummaries - Compact summaries (see buildListingAiSummary)
 * @returns {Promise<{ success: boolean, ids?: Array<string>, error?: string }>}
 */
export const piAiSearchListings = async (query, listingSummaries) => {
  try {
    const response = await apiFetch(`${apiBase()}/api/ai/pi-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, listings: listingSummaries }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      return { success: false, error: data?.error || `HTTP ${response.status}` };
    }
    return { success: true, ids: Array.isArray(data.ids) ? data.ids : [] };
  } catch (error) {
    console.warn('piAiSearchListings error:', error?.message);
    return { success: false, error: error?.message };
  }
};

/**
 * Gemini estimates straight-line km from GPS origin to one property address.
 * @param {{ latitude: number, longitude: number }} origin
 * @param {string} destinationAddress
 */
export const measureDistanceWithGemini = async (origin, destinationAddress) => {
  try {
    const response = await apiFetch(`${apiBase()}/api/ai/distance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destinationAddress }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      return { success: false, error: data?.error || `HTTP ${response.status}` };
    }
    return {
      success: true,
      distanceKm: Number(data.distanceKm),
      source: data.source || 'gemini',
    };
  } catch (error) {
    console.warn('measureDistanceWithGemini error:', error?.message);
    return { success: false, error: error?.message };
  }
};

/**
 * Gemini batch distance map: { [addressKey]: distanceKm }.
 * @param {{ latitude: number, longitude: number }} origin
 * @param {Array<{ key: string, address: string }>} destinations
 */
export const measureDistancesBatchWithGemini = async (origin, destinations) => {
  try {
    const response = await apiFetch(`${apiBase()}/api/ai/distance-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destinations }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      return { success: false, error: data?.error || `HTTP ${response.status}` };
    }
    return {
      success: true,
      distances:
        data.distances && typeof data.distances === 'object' ? data.distances : {},
      source: data.source || 'gemini',
    };
  } catch (error) {
    console.warn('measureDistancesBatchWithGemini error:', error?.message);
    return { success: false, error: error?.message };
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
    const response = await apiFetch(
      `${apiBase()}/api/reviews?target_subscription_id=${encodeURIComponent(targetSubscriptionId)}`,
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
    const response = await apiFetch(`${apiBase()}/api/reviews`, {
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

export const checkEmailAvailable = async email => {
  const normalizedEmail =
    email && String(email).trim() ? String(email).trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return {success: false, available: false, error: 'כתובת מייל לא תקינה'};
  }
  try {
    const response = await apiFetch(
      `${apiBase()}/api/subscription/email-available?email=${encodeURIComponent(normalizedEmail)}`,
      {method: 'GET', headers: {Accept: 'application/json'}},
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        available: false,
        error: data?.error || 'לא ניתן לבדוק את המייל',
      };
    }
    return data;
  } catch (error) {
    console.error('checkEmailAvailable error:', error);
    return {success: false, available: false, error: error.message};
  }
};

export const registerRegularUser = async ({
  email,
  name = null,
  phone = null,
  businessAddress = null,
  profilePictureUrl = null,
  password = null,
} = {}) => {
  const normalizedEmail = email && String(email).trim() ? String(email).trim().toLowerCase() : '';
  const pwd = password != null ? String(password) : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { success: false, error: 'Invalid email', subscription: null };
  }
  if (pwd.length < 8) {
    return {
      success: false,
      error: 'הסיסמה חייבת להכיל לפחות 8 תווים',
      subscription: null,
    };
  }
  try {
    const response = await apiFetch(`${apiBase()}/api/users/register-regular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        name,
        phone,
        business_address: businessAddress,
        profile_picture_url: profilePictureUrl,
        password: pwd,
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
 * Sign in or register a regular user via Google ID token (verified on pi-back).
 * Password is not used — Google accounts are passwordless.
 * Phone is required for new registrations (collected on the registration form).
 */
export const loginOrRegisterWithGoogle = async (
  idToken,
  {phone = null, name = null, businessAddress = null, intent = 'register'} = {},
) => {
  const token = idToken != null ? String(idToken).trim() : '';
  if (!token) {
    return {success: false, error: 'Missing Google token', subscription: null};
  }
  try {
    const response = await apiFetch(`${apiBase()}/api/auth/google`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        id_token: token,
        intent: intent === 'login' ? 'login' : 'register',
        phone: phone != null && String(phone).trim() ? String(phone).trim() : null,
        name: name != null && String(name).trim() ? String(name).trim() : null,
        business_address:
          businessAddress != null && String(businessAddress).trim()
            ? String(businessAddress).trim()
            : null,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: data?.error || 'Google sign-in failed',
        subscription: null,
      };
    }
    return data;
  } catch (error) {
    console.error('loginOrRegisterWithGoogle error:', error);
    return {success: false, error: error.message, subscription: null};
  }
};

/**
 * Sign in or register a regular user via Apple identity token (verified on pi-back).
 * Password is not used — Apple accounts are passwordless.
 * Phone is required for new registrations (collected on the registration form).
 */
export const loginOrRegisterWithApple = async (
  identityToken,
  {phone = null, name = null, businessAddress = null, intent = 'register'} = {},
) => {
  const token = identityToken != null ? String(identityToken).trim() : '';
  if (!token) {
    return {success: false, error: 'Missing Apple token', subscription: null};
  }
  try {
    const response = await apiFetch(`${apiBase()}/api/auth/apple`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        identity_token: token,
        id_token: token,
        intent: intent === 'login' ? 'login' : 'register',
        phone: phone != null && String(phone).trim() ? String(phone).trim() : null,
        name: name != null && String(name).trim() ? String(name).trim() : null,
        business_address:
          businessAddress != null && String(businessAddress).trim()
            ? String(businessAddress).trim()
            : null,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: data?.error || 'Apple sign-in failed',
        subscription: null,
      };
    }
    return data;
  } catch (error) {
    console.error('loginOrRegisterWithApple error:', error);
    return {success: false, error: error.message, subscription: null};
  }
};

/**
 * Send a follow request from one subscription user to another.
 */
export const sendFollowRequest = async (requesterSubscriptionId, targetSubscriptionId) => {
  const response = await apiFetch(`${apiBase()}/api/follows/request`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      requester_subscription_id: requesterSubscriptionId,
      target_subscription_id: targetSubscriptionId,
    }),
  });
  const data = await parseApiJson(response);
  if (!response.ok) throw new Error(data.error || 'Failed to send follow request');
  return data;
};

/**
 * Unfollow a user.
 */
export const unfollowUser = async (followerSubscriptionId, followingSubscriptionId) => {
  const response = await apiFetch(`${apiBase()}/api/follows/unfollow`, {
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
  const response = await apiFetch(`${apiBase()}/api/follows/requests/respond`, {
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
  const response = await apiFetch(`${apiBase()}/api/follows/requests/cancel`, {
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

async function parseApiJson(response) {
  const text = typeof response.text === 'function' ? await response.text() : '';
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.trim().slice(0, 40);
    throw new Error(
      response.ok
        ? 'Invalid server response'
        : `Server error (${response.status})${snippet ? `: ${snippet}` : ''}`,
    );
  }
}

/**
 * Get follow status between viewer and target.
 */
export const getFollowStatus = async (viewerId, targetId) => {
  const params = new URLSearchParams({
    viewer_id: String(viewerId || '').trim(),
    target_id: String(targetId || '').trim(),
  });
  const response = await apiFetch(`${apiBase()}/api/follows/status?${params.toString()}`);
  const data = await parseApiJson(response);
  if (!response.ok) throw new Error(data.error || 'Failed to fetch follow status');
  return data;
};

/**
 * Batch follow status for many targets (TikTok feed sidebar prefetch).
 * @returns {Promise<{ success: boolean, status?: Record<string, { is_following: boolean, has_pending_request: boolean }> }>}
 */
export const getFollowStatusBatch = async (viewerId, targetIds) => {
  const v = viewerId != null ? String(viewerId).trim() : '';
  const list = Array.isArray(targetIds) ? targetIds : [];
  if (!v || list.length === 0) {
    return {success: true, status: {}};
  }
  const response = await apiFetch(`${apiBase()}/api/follows/status-batch`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({viewer_id: v, target_ids: list}),
  });
  const data = await parseApiJson(response);
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch follow status batch');
  }
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
  const response = await apiFetch(`${apiBase()}/api/follows/mutual-batch`, {
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
  const response = await apiFetch(
    `${apiBase()}/api/follows/stats?user_id=${encodeURIComponent(String(userId || '').trim())}`,
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
  const response = await apiFetch(`${apiBase()}/api/follows/hub?${params.toString()}`, {
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
    const response = await apiFetch(`${apiBase()}/api/improvements-feedback`, {
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
    const response = await apiFetch(`${apiBase()}/api/company-reports`, {
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
    const response = await apiFetch(
      `${apiBase()}/api/user/current?${params.toString()}`,
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
export const uploadFile = async (file, folder = 'general', options = {}) => {
  try {
    // Always upload straight to Supabase (signed URL). Never POST file bytes
    // through Vercel — its ~4.5MB body limit causes intermittent 413 on videos.
    return await uploadFileViaSignedUrl(file, folder, options);
  } catch (error) {
    console.error(
      'Error uploading file:',
      errorMessageFromUnknown(error, 'Upload failed'),
    );
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(errorMessageFromUnknown(error, 'Upload failed'));
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
      plan_approval: planApproval,
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
    if (planApproval != null && String(planApproval).trim() !== '') {
      params.append('plan_approval', String(planApproval).trim());
    }

    const url = `${apiBase()}/api/listings?${params.toString()}`;
    // console.log('🌐 [api.js] Fetching listings from:', url);
    // console.log('🌐 [api.js] API_URL:', API_URL);
    // console.log('🌐 [api.js] Options:', {status, category, subscriptionType, hasVideo, listingCondition, searchPurpose, feedPost, hospitalityNature, landInMortgage, permit});

    const response = await apiFetch(url, {
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
    const response = await apiFetch(`${apiBase()}/api/listings/${listingId}`, {
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

/**
 * Permanently delete a listing owned by the current user.
 * @param {string} listingId - UUID of the listing
 * @param {string} userEmail - owner subscription email
 * @param {string} [subscriptionId] - logged-in subscription UUID (needed when one email has multiple accounts)
 */
export const deleteListing = async (listingId, userEmail, subscriptionId) => {
  const id = listingId != null ? String(listingId).trim() : '';
  const email = userEmail != null ? String(userEmail).trim() : '';
  if (!id || !email) throw new Error('listingId and userEmail required');
  try {
    const params = new URLSearchParams({user_email: email});
    const sub = subscriptionId != null ? String(subscriptionId).trim() : '';
    if (sub) params.set('subscription_id', sub);
    const response = await apiFetch(
      `${apiBase()}/api/listings/${encodeURIComponent(id)}?${params.toString()}`,
      {method: 'DELETE'},
    );
    const data = await parseApiJsonResponse(response);
    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete listing');
    }
    return data;
  } catch (error) {
    console.error('Error deleting listing:', error);
    if (/unexpected token|<!doctype/i.test(String(error?.message || ''))) {
      throw new Error(
        'מחיקת מודעות לא זמינה בשרת. יש לעדכן ולהפעיל מחדש את pi-back.',
      );
    }
    throw error;
  }
};

/** Fetch the current user's recent user-searches for the TikTok feed "אחרונים" list. */
export const getRecentUserSearches = async userEmail => {
  const email = userEmail ? String(userEmail).trim() : '';
  if (!email) return {success: true, recent: []};
  const response = await apiFetch(
    `${apiBase()}/api/search/users/recent?user_email=${encodeURIComponent(email)}`,
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
    const response = await apiFetch(`${apiBase()}/api/search/users/recent`, {
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
    const response = await apiFetch(
      `${apiBase()}/api/search/users/recent?user_email=${encodeURIComponent(email)}`,
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
  const response = await apiFetch(
    `${apiBase()}/api/listings/boost-quota?user_email=${encodeURIComponent(email)}`,
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
    const response = await apiFetch(`${apiBase()}/api/listings/${id}/boost`, {
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
    const response = await apiFetch(`${apiBase()}/api/listings/${listingId}/view`, { method: 'POST' });
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
    const response = await apiFetch(`${apiBase()}/api/listings/${listingId}/share`, {
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
  const response = await apiFetch(`${apiBase()}/api/listings/${listingId}/like`, {
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
  const response = await apiFetch(`${apiBase()}/api/listings/${listingId}/like?user_id=${encodeURIComponent(String(userId))}`, {
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
  const response = await apiFetch(`${apiBase()}/api/posts/${listingId}/like`, {
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
  const response = await apiFetch(`${apiBase()}/api/posts/${listingId}/like?user_id=${encodeURIComponent(String(userId))}`, {
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
  const response = await apiFetch(
    `${apiBase()}/api/posts/${listingId}/comments${qs ? `?${qs}` : ''}`,
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
  const response = await apiFetch(`${apiBase()}/api/posts/${listingId}/comments`, {
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
  const response = await apiFetch(
    `${apiBase()}/api/posts/${listingId}/comments/${commentId}/reaction`,
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
  const response = await apiFetch(
    `${apiBase()}/api/posts/${listingId}/comments/${commentId}/reaction?user_id=${encodeURIComponent(String(userId))}`,
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
  const response = await apiFetch(`${apiBase()}/api/chat/unread-count?${params.toString()}`);
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
  const url = `${apiBase()}/api/chat/conversations?user_email=${encodeURIComponent(email)}`;
  const response = await apiFetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load conversations');
  return data;
};

/**
 * Delete a 1-on-1 (direct) chat between the current user and another user.
 * Group chats are not deletable via this call.
 * @param {string} userEmail - current user's email
 * @param {string} otherUserEmail - the other participant's email
 */
export const deleteChatConversation = async (userEmail, otherUserEmail) => {
  const email = userEmail != null ? String(userEmail).trim().toLowerCase() : '';
  const other =
    otherUserEmail != null ? String(otherUserEmail).trim().toLowerCase() : '';
  if (!email || !other) {
    throw new Error('userEmail and otherUserEmail required');
  }
  const response = await apiFetch(`${apiBase()}/api/chat/conversations`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_email: email, other_user_email: other }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to delete conversation');
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
    response = await apiFetch(url);
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
  const response = await apiFetch(`${apiBase()}/api/chat/direct-contacts?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load contacts');
  return { success: !!data.success, contacts: data.contacts || [] };
};

/** Brokers list for group picker (q optional; empty returns first page) */
export const getBrokersForGroupPicker = async (q, excludeEmail = null) => {
  const params = new URLSearchParams();
  if (q != null && String(q).trim()) params.set('q', String(q).trim());
  if (excludeEmail) params.set('exclude_email', String(excludeEmail).trim().toLowerCase());
  const response = await apiFetch(`${apiBase()}/api/brokers/group-picker?${params.toString()}`);
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
  const response = await apiFetch(`${apiBase()}/api/users/group-picker?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load users');
  return { success: !!data.success, users: data.users || [] };
};

export const createChatGroup = async ({ creatorEmail, creatorSubscriptionId, memberEmails, title, kind, groupImageUrl = null }) => {
  const kindNorm = String(kind || '').trim().toLowerCase();
  const payload = {
    creator_email: String(creatorEmail).trim().toLowerCase(),
    member_emails: (memberEmails || []).map((e) => String(e).trim().toLowerCase()).filter(Boolean),
    title: title != null ? String(title).trim() : '',
    kind:
      kindNorm === 'brokers'
        ? 'brokers'
        : kindNorm === 'open'
          ? 'open'
          : 'customers',
  };
  const subId =
    creatorSubscriptionId != null ? String(creatorSubscriptionId).trim() : '';
  if (subId) payload.creator_subscription_id = subId;
  if (groupImageUrl != null && String(groupImageUrl).trim()) {
    payload.group_image_url = String(groupImageUrl).trim();
  }
  const response = await apiFetch(`${apiBase()}/api/chat/groups`, {
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
  const response = await apiFetch(`${apiBase()}/api/chat/groups/add-members`, {
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
  const response = await apiFetch(`${apiBase()}/api/chat/group-messages?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load messages');
  return data;
};

export const updateGroupDescription = async ({userEmail, conversationId, description}) => {
  const response = await apiFetch(`${apiBase()}/api/chat/group-description`, {
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
  const response = await apiFetch(`${apiBase()}/api/chat/group-title`, {
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
  const response = await apiFetch(`${apiBase()}/api/chat/groups/remove-member`, {
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
  const response = await apiFetch(`${apiBase()}/api/chat/groups/member-role`, {
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
  if (
    media &&
    media.url &&
    (media.type === 'image' || media.type === 'audio' || media.type === 'file')
  ) {
    payload.media_type = media.type;
    payload.media_url = String(media.url).trim();
  }
  if (listingId != null && String(listingId).trim() !== '') {
    payload.listing_id = String(listingId).trim();
  }
  if (listingShare) payload.listing_share = true;
  const response = await apiFetch(`${apiBase()}/api/chat/group-messages`, {
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
  const url = `${apiBase()}/api/chat/participant-display?user_ref=${encodeURIComponent(ref)}`;
  const response = await apiFetch(url);
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
// --- משווקי פרויקטים — agency teams ------------------------------------------

const agencyManagerParams = manager => {
  const params = new URLSearchParams();
  const id = manager?.subscription_id || manager?.id;
  if (id != null && String(id).trim()) {
    params.set('manager_subscription_id', String(id).trim());
  }
  const email = manager?.email;
  if (email != null && String(email).trim()) {
    params.set('manager_email', String(email).trim().toLowerCase());
  }
  return params;
};

/** Active agency join code for a marketing manager (null when none issued yet). */
export const getAgencyJoinCode = async manager => {
  const params = agencyManagerParams(manager);
  const response = await apiFetch(
    `${apiBase()}/api/agency/join-code?${params.toString()}`,
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || 'טעינת הקוד נכשלה');
  return data;
};

/** Issue a fresh join code, deactivating the previous one. */
export const createAgencyJoinCode = async manager => {
  const params = agencyManagerParams(manager);
  const response = await apiFetch(`${apiBase()}/api/agency/join-code`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(Object.fromEntries(params)),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || 'יצירת הקוד נכשלה');
  return data;
};

/** Marketers under a manager. */
export const getAgencyMembers = async manager => {
  const params = agencyManagerParams(manager);
  const response = await apiFetch(
    `${apiBase()}/api/agency/members?${params.toString()}`,
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || 'טעינת המשווקים נכשלה');
  return data;
};

/** Issue a one-time, 24-hour code that transfers one agency member account. */
export const createAgencyMemberReplacementCode = async (manager, memberId) => {
  const params = agencyManagerParams(manager);
  const response = await apiFetch(`${apiBase()}/api/agency/replacement-code`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      ...Object.fromEntries(params),
      target_subscription_id: String(memberId || '').trim(),
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'יצירת קוד ההחלפה נכשלה');
  }
  return data;
};

/** Register a marketer into an existing agency using an invite code. */
export const joinAgencyWithCode = async ({email, password, name, phone, code}) => {
  const response = await apiFetch(`${apiBase()}/api/agency/join`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password, name, phone, code}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || 'ההצטרפות נכשלה');
  return data;
};

export const getListingPreview = async (listingId) => {
  if (!listingId) return null;
  const id = String(listingId).trim();
  if (!id) return null;
  try {
    const response = await apiFetch(`${apiBase()}/api/listings/${encodeURIComponent(id)}/preview`);
    const data = await response.json();
    if (!response.ok) return null;
    return data?.listing || null;
  } catch (_) {
    return null;
  }
};

export const getChatMessages = async (
  myEmail,
  otherUserEmail,
  conversationId = null,
) => {
  if (!myEmail) return { success: true, messages: [] };
  const convId =
    conversationId != null ? String(conversationId).trim() : '';
  const otherRef =
    otherUserEmail != null ? String(otherUserEmail).trim().toLowerCase() : '';
  if (!convId && !otherRef) return { success: true, messages: [] };
  const params = new URLSearchParams({
    user_email: String(myEmail).trim().toLowerCase(),
  });
  if (convId) params.set('conversation_id', convId);
  if (otherRef) params.set('other_user_email', otherRef);
  const response = await apiFetch(`${apiBase()}/api/chat/messages?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load messages');
  return data;
};

export const respondToExclusiveOffer = async ({userEmail, conversationId, accept}) => {
  const response = await apiFetch(`${apiBase()}/api/chat/exclusive-offer/respond`, {
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
 * @param {{ type: 'image'|'audio'|'file', url: string }} [media] - optional; use with empty body for media-only messages
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
    (media.type === 'image' || media.type === 'audio' || media.type === 'file');
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
  const response = await apiFetch(`${apiBase()}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to send message');
  return data;
};

/**
 * Delete a chat message (direct or group). Only the sender can delete it.
 * @param {string} messageId
 * @param {string} userEmail - the requesting user's email (must be the sender)
 */
export const deleteChatMessage = async (messageId, userEmail) => {
  const id = messageId != null ? String(messageId).trim() : '';
  const email = userEmail != null ? String(userEmail).trim().toLowerCase() : '';
  if (!id || !email) {
    throw new Error('messageId and userEmail required');
  }
  const response = await apiFetch(
    `${apiBase()}/api/chat/messages/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: email }),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Failed to delete message');
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
  const response = await apiFetch(`${apiBase()}/api/chat/upload-media`, {
    method: 'POST',
    body: formData,
  });
  const responseText = await response.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Upload failed (${response.status})`);
  }
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
  const response = await apiFetch(`${apiBase()}/api/chat/upload-group-image`, {
    method: 'POST',
    body: formData,
  });
  const responseText = await response.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Upload failed (${response.status})`);
  }
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
  if (id == null) return null;
  const trimmed = String(id).trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
};

/** Resolve DB subscription UUID from common user/listing shapes. */
export function resolveSubscriptionId(userOrId) {
  if (userOrId == null) return null;
  if (typeof userOrId !== 'object') {
    return toSubscriptionId(userOrId);
  }
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

/** Mirror תמונה מכירתית as a home story ring slide (not a TikTok feed post). */
export async function createSalesImageStory({
  imageUrl,
  subscriptionId,
  generalDetails = null,
}) {
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
    general_details:
      generalDetails && typeof generalDetails === 'object'
        ? generalDetails
        : undefined,
  });
}

/**
 * Create a new listing
 * @param {Object} listingData - Listing data including form fields and file URLs
 * @returns {Promise} API response with listing ID
 */
/**
 * Home row: active story rings (≤24h) — profile mirrors + explicit story slides.
 * @returns {Promise<{ success: boolean, rings?: Array }>}
 */
export const getStoriesFeed = async ({limit = 80} = {}) => {
  const safeLimit = Math.min(80, Math.max(1, Number(limit) || 80));
  const response = await apiFetch(
    `${apiBase()}/api/stories/feed?limit=${safeLimit}`,
    {
      method: 'GET',
      headers: {'Content-Type': 'application/json'},
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {success: false, rings: null, error: data.error};
  }
  return data;
};

/**
 * Company directory for home "חפשו עוד" (verified/active company subscriptions + ad counts)
 */
export const getCompaniesDirectory = async () => {
  const response = await apiFetch(`${apiBase()}/api/companies/directory`, {
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
  const response = await apiFetch(`${apiBase()}/api/professionals/directory`, {
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
 * @param {{ subscription_id: string, media_url: string, general_details?: object }} payload
 */
export const createStory = async payload => {
  const body = {
    subscription_id: payload?.subscription_id,
    media_url: payload?.media_url,
  };
  if (
    payload?.general_details &&
    typeof payload.general_details === 'object'
  ) {
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
};

/**
 * Profile intro videos are mirrored into `stories` on the backend when uploaded
 * (24h TTL, same as other story kinds). Client no longer creates a duplicate row.
 */
export async function syncSubscriptionProfileStory(_subscription) {
  return null;
}

export const createListing = async listingData => {
  try {

    const response = await apiFetch(`${apiBase()}/api/listings`, {
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
      const errorMsg = errorMessageFromApiBody(
        data,
        'Failed to create listing',
      );
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
    const response = await apiFetch(`${apiBase()}/api/listings/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(listingData),
    });
    const data = await response.json();
    if (!response.ok) {
      const errorMsg = errorMessageFromApiBody(
        data,
        'Failed to update listing',
      );
      console.error('API error:', errorMsg);
      throw new Error(errorMsg);
    }
    return data;
  } catch (error) {
    console.error('Error updating listing:', error);
    throw error;
  }
};
