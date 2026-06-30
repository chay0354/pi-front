/**
 * Mux HLS playback only — no direct Supabase MP4 in the player.
 */

export function isHlsUri(uri) {
  const s = uri != null ? String(uri).trim().toLowerCase() : '';
  return s.includes('.m3u8') || s.includes('stream.mux.com');
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

/** Mux HLS playback URL only; null while processing or if Mux failed. */
export function resolveAdVideoUri(listing) {
  return hlsFromListing(listing);
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

export function resolveStorySlideUri(slide) {
  return hlsFromStorySlide(slide);
}

export function isVideoProcessing(item) {
  return String(item?.video_status || '').toLowerCase() === 'processing';
}

export function listingHasMuxVideo(listing) {
  return Boolean(resolveAdVideoUri(listing));
}
