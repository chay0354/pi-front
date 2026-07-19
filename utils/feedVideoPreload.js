import {Platform} from 'react-native';
import {
  cappedMuxUri,
  muxThumbnailUri,
  resolveAdVideoUri,
} from './videoPlayback';

const MAX_WEB_VIDEO_PREFETCH = 6;
const MAX_NATIVE_VIDEO_PREFETCH = 8;
const webVideoPrefetch = new Map();
const nativeVideoPrefetchKeys = [];
const nativeVideoPrefetchSet = new Set();

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
  if (fromListing) return cappedMuxUri(fromListing);

  const raw =
    item.video && typeof item.video === 'object'
      ? item.video.uri || item.video.url
      : typeof item.video === 'string'
        ? item.video
        : item.video_url;
  const uri = raw != null ? String(raw).trim() : '';
  return isHttpUrl(uri) ? cappedMuxUri(uri) : '';
}

export function resolveFeedVideoPosterUri(item) {
  // For Mux videos, the thumbnail at time=0 IS the first frame — using it as
  // the poster makes the poster→video swap pixel-identical (invisible), the
  // way real TikTok covers load time. A listing photo could be a different
  // image entirely and would visibly "jump" when playback starts.
  // width=720 keeps the JPEG phone-sized so it paints fast.
  const videoUri = resolveFeedVideoUri(item);
  const muxPoster = muxThumbnailUri(videoUri, {time: 0, width: 720});
  if (muxPoster) return muxPoster;

  const poster = item?.images?.[0]?.uri ?? item?.main_image_url ?? '';
  const uri = poster != null ? String(poster).trim() : '';
  if (isHttpUrl(uri) && !isVideoUrl(uri)) return uri;
  return '';
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

/** Resolve a playlist-relative URI against the playlist's own URL. */
function resolveHlsUri(baseUrl, ref) {
  const r = ref != null ? String(ref).trim() : '';
  if (!r) return '';
  if (/^https?:\/\//i.test(r)) return r;
  try {
    return new URL(r, baseUrl).toString();
  } catch {
    return '';
  }
}

/** First non-comment line of an HLS playlist (variant or segment uri). */
function firstHlsEntry(playlistText) {
  const lines = String(playlistText || '').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (t && !t.startsWith('#')) return t;
  }
  return '';
}

/**
 * Warm the exact request chain ExoPlayer will make for an HLS stream:
 * master playlist -> first variant playlist -> first media segment.
 * The client cache isn't shared with ExoPlayer, but this primes DNS/TLS and
 * (most importantly) Mux's CDN edge, so the player's own requests are hits.
 */
async function prefetchHlsChain(masterUrl) {
  try {
    const masterRes = await fetch(masterUrl);
    if (!masterRes.ok) return;
    const master = await masterRes.text();
    const variantUrl = resolveHlsUri(masterUrl, firstHlsEntry(master));
    if (!variantUrl) return;
    // Entry may already be a segment if this was a media (not master) playlist.
    if (!/\.m3u8(\?|$)/i.test(variantUrl)) {
      await fetch(variantUrl, {headers: {Range: 'bytes=0-524287'}});
      return;
    }
    const variantRes = await fetch(variantUrl);
    if (!variantRes.ok) return;
    const variant = await variantRes.text();
    const segmentUrl = resolveHlsUri(variantUrl, firstHlsEntry(variant));
    if (!segmentUrl) return;
    await fetch(segmentUrl, {headers: {Range: 'bytes=0-524287'}});
  } catch {
    // Prefetch is best-effort; the player fetches everything itself anyway.
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
  if (/\.m3u8(\?|$)/i.test(key) || /stream\.mux\.com/i.test(key)) {
    prefetchHlsChain(key);
    return;
  }
  // Progressive MP4: warm the moov atom + first media bytes.
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
