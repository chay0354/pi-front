/**
 * Prefer Mux HLS when ready; fall back to original Supabase MP4 URL while processing.
 */

export function resolveAdVideoUri(listing) {
  if (!listing) return null;

  const playbackDirect =
    listing.video_playback_url != null
      ? String(listing.video_playback_url).trim()
      : '';
  if (playbackDirect) return playbackDirect;

  const hls =
    listing.video_hls_url != null ? String(listing.video_hls_url).trim() : '';
  if (hls && listing.video_status !== 'failed') return hls;

  const videos = listing.listing_videos;
  if (Array.isArray(videos)) {
    for (const v of videos) {
      const vPlayback =
        v?.video_playback_url != null ? String(v.video_playback_url).trim() : '';
      if (vPlayback) return vPlayback;
      const vHls = v?.video_hls_url != null ? String(v.video_hls_url).trim() : '';
      if (vHls && v.video_status !== 'failed') return vHls;
      const main =
        v?.video_type === 'main' && v?.video_url
          ? String(v.video_url).trim()
          : '';
      if (main) return main;
    }
    const any = videos.find(v => v?.video_url);
    if (any?.video_url) return String(any.video_url).trim();
  }

  const direct =
    listing.video_url != null ? String(listing.video_url).trim() : '';
  return direct || null;
}

export function resolveStorySlideUri(slide) {
  if (!slide) return null;
  const playback =
    slide.media_playback_url != null
      ? String(slide.media_playback_url).trim()
      : '';
  if (playback) return playback;
  const hls =
    slide.media_hls_url != null ? String(slide.media_hls_url).trim() : '';
  if (hls && slide.video_status !== 'failed') return hls;
  const raw =
    slide.media_url != null ? String(slide.media_url).trim() : '';
  return raw || null;
}

export function isVideoProcessing(item) {
  return String(item?.video_status || '').toLowerCase() === 'processing';
}
