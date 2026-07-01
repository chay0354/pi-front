import {Platform} from 'react-native';
import {resolveAdVideoUri} from './videoPlayback';

const MAX_WEB_VIDEO_PREFETCH = 6;
const MAX_NATIVE_VIDEO_PREFETCH = 8;
const webVideoPrefetch = new Map();
const nativeVideoPrefetchKeys = [];
const nativeVideoPrefetchSet = new Set();
/** Native feed videos that already decoded at least one frame (survives FlatList remount). */
const nativeFeedVideoReady = new Set();
const MAX_NATIVE_FEED_VIDEO_READY = 24;

export function isFeedVideoReady(uri) {
  const key = uri != null ? String(uri).trim() : '';
  return key.length > 0 && nativeFeedVideoReady.has(key);
}

export function markFeedVideoReady(uri) {
  const key = uri != null ? String(uri).trim() : '';
  if (key.length > 0) {
    nativeFeedVideoReady.add(key);
    while (nativeFeedVideoReady.size > MAX_NATIVE_FEED_VIDEO_READY) {
      const oldest = nativeFeedVideoReady.values().next().value;
      if (oldest == null) break;
      nativeFeedVideoReady.delete(oldest);
    }
  }
}

/** Bias focus toward the next page so video/audio starts before snap finishes. */
export function feedScrollFocusIndex(y, pageHeight, maxIndex) {
  if (!Number.isFinite(y) || pageHeight <= 0) return 0;
  const cap = Math.max(0, maxIndex);
  // Switch focus ~35% into the swipe (not 50%) so fast swipes start playback sooner.
  const biased = (y + pageHeight * 0.65) / pageHeight;
  return Math.max(0, Math.min(cap, Math.floor(biased)));
}

function isHttpUrl(raw) {
  const uri = raw != null ? String(raw).trim() : '';
  return uri.length > 0 && /^https?:\/\//i.test(uri);
}

function isVideoUrl(raw) {
  const uri = isHttpUrl(raw) ? String(raw).trim() : '';
  if (!uri) return false;
  return /\.(mp4|m3u8|webm|mov|m4v)(\?|$)/i.test(uri) || /\/videos?\//i.test(uri);
}

export function resolveFeedVideoUri(item) {
  if (!item || item.type !== 'video') return '';

  const fromListing = resolveAdVideoUri(item);
  if (fromListing) return fromListing;

  const raw =
    item.video && typeof item.video === 'object'
      ? item.video.uri || item.video.url
      : typeof item.video === 'string'
        ? item.video
        : item.video_url;
  const uri = raw != null ? String(raw).trim() : '';
  return isHttpUrl(uri) ? uri : '';
}

export function resolveFeedVideoPosterUri(item) {
  const poster = item?.images?.[0]?.uri ?? item?.main_image_url ?? '';
  const uri = poster != null ? String(poster).trim() : '';
  if (!isHttpUrl(uri) || isVideoUrl(uri)) return '';
  return uri;
}

/** Drop oldest entries so we don't keep unbounded hidden video tags on web. */
function trimWebPrefetchCache() {
  while (webVideoPrefetch.size > MAX_WEB_VIDEO_PREFETCH) {
    const oldestKey = webVideoPrefetch.keys().next().value;
    const node = webVideoPrefetch.get(oldestKey);
    node?.remove?.();
    webVideoPrefetch.delete(oldestKey);
  }
}

/** Drop oldest native prefetch entries (HTTP warm cache only). */
function trimNativePrefetchCache() {
  while (nativeVideoPrefetchKeys.length > MAX_NATIVE_VIDEO_PREFETCH) {
    const oldestKey = nativeVideoPrefetchKeys.shift();
    if (oldestKey) nativeVideoPrefetchSet.delete(oldestKey);
  }
}

function prefetchNativeVideoUri(key) {
  if (nativeVideoPrefetchSet.has(key)) {
    const idx = nativeVideoPrefetchKeys.indexOf(key);
    if (idx >= 0) {
      nativeVideoPrefetchKeys.splice(idx, 1);
      nativeVideoPrefetchKeys.push(key);
    }
    return;
  }
  trimNativePrefetchCache();
  nativeVideoPrefetchSet.add(key);
  nativeVideoPrefetchKeys.push(key);
  fetch(key, {
    method: 'GET',
    headers: {Range: 'bytes=0-2097151'},
  }).catch(() => {});
}

/** Warm video cache for upcoming feed items (web + native). */
export function prefetchFeedVideoUri(uri) {
  if (!isVideoUrl(uri)) return;
  const key = String(uri).trim();
  if (Platform.OS === 'web') {
    if (webVideoPrefetch.has(key)) {
      const existing = webVideoPrefetch.get(key);
      webVideoPrefetch.delete(key);
      webVideoPrefetch.set(key, existing);
      return;
    }
    trimWebPrefetchCache();
    const el = document.createElement('video');
    el.preload = 'auto';
    el.muted = true;
    el.playsInline = true;
    el.src = key;
    el.style.display = 'none';
    document.body.appendChild(el);
    el.load();
    webVideoPrefetch.set(key, el);
    return;
  }
  prefetchNativeVideoUri(key);
}

/** Prefetch posters + video files for a slice of feed items. */
export function prefetchFeedWindowMedia(items, startIndex, count, Image) {
  if (!Array.isArray(items) || items.length === 0 || startIndex < 0) return;
  const end = Math.min(items.length, startIndex + Math.max(1, count));
  for (let i = startIndex; i < end; i++) {
    const item = items[i];
    const poster = resolveFeedVideoPosterUri(item);
    if (poster) {
      Image.prefetch(poster).catch(() => {});
    }
    const videoUri = resolveFeedVideoUri(item);
    if (videoUri) {
      prefetchFeedVideoUri(videoUri);
      continue;
    }
    const uris = [];
    if (Array.isArray(item?.images)) {
      item.images.forEach(image => {
        if (image == null) return;
        const u =
          typeof image === 'string'
            ? image
            : image.uri ?? image.url ?? image.image_url;
        if (isHttpUrl(u) && !isVideoUrl(u)) uris.push(String(u).trim());
      });
    }
    uris.forEach(u => Image.prefetch(u).catch(() => {}));
  }
}
