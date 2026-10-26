import {isHlsUri} from './videoPlayback';

/**
 * Play a featured-project URL. Mux HLS starts from a small segment via hls.js
 * (Chrome cannot play HLS on its own). A fatal HLS error falls back to the raw file.
 * Returns a cleanup function. hls.js is loaded only when the URL is a stream.
 */
export function attachPlayback(video, uri, {fallback = ''} = {}) {
  if (!video) return () => {};
  const src = uri != null ? String(uri).trim() : '';
  const raw = fallback != null ? String(fallback).trim() : '';
  if (!src) return () => {};

  let cancelled = false;
  let hls = null;

  const useFile = file => {
    const next = file && !isHlsUri(file) ? file : '';
    if (!next || cancelled) return;
    video.src = next;
    video.load();
  };

  if (isHlsUri(src)) {
    import('hls.js').then(({default: Hls}) => {
      if (cancelled || !video.isConnected) return;
      if (!Hls.isSupported()) {
        if (video.canPlayType('application/vnd.apple.mpegurl') || video.canPlayType('application/x-mpegURL')) {
          video.src = src;
          video.load();
          return;
        }
        useFile(raw);
        return;
      }
      hls = new Hls({
        capLevelToPlayerSize: true,
        startLevel: 0,
        maxBufferLength: 8,
        manifestLoadingTimeOut: 8000,
        levelLoadingTimeOut: 8000,
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data?.fatal) return;
        const dead = hls;
        hls = null;
        dead?.destroy();
        useFile(raw);
      });
      hls.loadSource(src);
      hls.attachMedia(video);
    });
  } else {
    useFile(src);
  }

  return () => {
    cancelled = true;
    hls?.destroy();
    hls = null;
  };
}
