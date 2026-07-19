/**
 * Prefer Mux HLS for playback; fall back to the raw uploaded MP4 when no HLS
 * is available (e.g. Mux over quota / processing not run) so video posts still
 * play instead of collapsing to a text card.
 */

export function isHlsUri(uri) {
  const s = uri != null ? String(uri).trim().toLowerCase() : '';
  return s.includes('.m3u8') || s.includes('stream.mux.com');
}

/** Extract Mux playback id from stream.mux.com/{id}.m3u8 (or similar). */
export function muxPlaybackIdFromUri(uri) {
  const s = uri != null ? String(uri).trim() : '';
  if (!s) return '';
  const m = s.match(/stream\.mux\.com\/([A-Za-z0-9]+)/i);
  return m?.[1] ? String(m[1]) : '';
}

/**
 * Stable Mux poster thumbnail for feed preload (avoids black first frame).
 * Pass `width` to get a phone-sized JPEG instead of the full video frame —
 * a ~40KB download instead of hundreds of KB, so posters paint instantly.
 */
export function muxThumbnailUri(uri, opts = {}) {
  const id = muxPlaybackIdFromUri(uri);
  if (!id) return '';
  const params = [];
  const time = Number(opts.time);
  if (Number.isFinite(time) && time >= 0) params.push(`time=${time}`);
  const width = Number(opts.width);
  if (Number.isFinite(width) && width > 0) {
    params.push(`width=${Math.round(width)}`);
  }
  const q = params.length > 0 ? `?${params.join('&')}` : '';
  return `https://image.mux.com/${id}/thumbnail.jpg${q}`;
}

/**
 * Cap Mux HLS rendition. Low-end Android decoders choke on 1080p+ HLS, and a
 * lower ceiling also means less data to fetch+decode for the very first
 * segment — directly speeds up "time to first frame" on every device, not
 * just A07. 540p is still sharp on a phone screen at feed size.
 */
export function cappedMuxUri(uri, maxResolution = '540p') {
  const s = uri != null ? String(uri).trim() : '';
  if (!s || !/stream\.mux\.com/i.test(s)) return s;
  if (/[?&]max_resolution=/i.test(s)) return s;
  return `${s}${s.includes('?') ? '&' : '?'}max_resolution=${maxResolution}`;
}

const VIDEO_FILE_REGEX = /\.(mp4|mov|m4v|webm|ogg|ogv|mkv)(\?|#|$)/i;

function isDirectVideoFileUri(uri) {
  const s = uri != null ? String(uri).trim() : '';
  if (!s) return false;
  if (isHlsUri(s)) return false;
  return VIDEO_FILE_REGEX.test(s);
}

/** Raw uploaded video file (Supabase MP4) usable directly by expo-av. */
function directVideoFromListing(listing) {
  if (!listing) return null;
  const src = listing.video_url != null ? String(listing.video_url).trim() : '';
  if (isDirectVideoFileUri(src)) return src;
  const videos = listing.listing_videos;
  if (Array.isArray(videos)) {
    for (const v of videos) {
      const s =
        v?.source_video_url != null ? String(v.source_video_url).trim() : '';
      if (isDirectVideoFileUri(s)) return s;
    }
  }
  const main =
    listing.main_image_url != null ? String(listing.main_image_url).trim() : '';
  if (isDirectVideoFileUri(main)) return main;
  return null;
}

function hlsFromListing(listing) {
  if (!listing) return null;
  const hls =
    listing.video_hls_url != null ? String(listing.video_hls_url).trim() : '';
  if (hls && listing.video_status !== 'failed') return hls;
  const videos = listing.listing_videos;
  if (Array.isArray(videos)) {
    for (const v of videos) {
      const vHls = v?.video_hls_url != null ? String(v.video_hls_url).trim() : '';
      if (vHls && v.video_status !== 'failed') return vHls;
    }
  }
  const playback =
    listing.video_playback_url != null
      ? String(listing.video_playback_url).trim()
      : '';
  if (playback && isHlsUri(playback)) return playback;
  return null;
}

/** Raw MP4 (or direct file) for edit forms — not HLS playback URL. */
export function resolveListingEditVideoSourceUrl(listing) {
  if (!listing) return null;
  const videos = listing.listing_videos;
  if (Array.isArray(videos)) {
    for (const v of videos) {
      const src =
        v?.source_video_url != null ? String(v.source_video_url).trim() : '';
      if (isDirectVideoFileUri(src)) return src;
      const raw = v?.video_url != null ? String(v.video_url).trim() : '';
      if (isDirectVideoFileUri(raw)) return raw;
    }
  }
  const direct =
    listing.video_url != null ? String(listing.video_url).trim() : '';
  if (isDirectVideoFileUri(direct)) return direct;
  if (direct && !isHlsUri(direct)) return direct;
  return null;
}

/** Mux HLS when ready, else the raw uploaded MP4 so the post still plays. */
export function resolveAdVideoUri(listing) {
  return hlsFromListing(listing) || directVideoFromListing(listing);
}

function hlsFromStorySlide(slide) {
  if (!slide) return null;
  const hls =
    slide.media_hls_url != null ? String(slide.media_hls_url).trim() : '';
  if (hls && slide.video_status !== 'failed') return hls;
  const playback =
    slide.media_playback_url != null
      ? String(slide.media_playback_url).trim()
      : '';
  if (playback && isHlsUri(playback)) return playback;
  return null;
}

function directVideoFromStorySlide(slide) {
  if (!slide) return null;
  const src =
    slide.media_url != null ? String(slide.media_url).trim() : '';
  if (isDirectVideoFileUri(src)) return src;
  const source =
    slide.source_video_url != null ? String(slide.source_video_url).trim() : '';
  if (isDirectVideoFileUri(source)) return source;
  return null;
}

export function resolveStorySlideUri(slide) {
  if (!slide) return null;
  const videoUri = hlsFromStorySlide(slide) || directVideoFromStorySlide(slide);
  if (videoUri) return videoUri;
  // Images and other non-video story slides use the original media_url directly.
  const mediaUrl =
    slide.media_url != null ? String(slide.media_url).trim() : '';
  return mediaUrl || null;
}

export function isVideoProcessing(item) {
  return String(item?.video_status || '').toLowerCase() === 'processing';
}

export function listingHasMuxVideo(listing) {
  return Boolean(resolveAdVideoUri(listing));
}
