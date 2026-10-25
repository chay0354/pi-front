import {Alert, Platform} from 'react-native';

/** Longest video a user may upload anywhere in the app (3.5 minutes). */
export const MAX_VIDEO_DURATION_SEC = 210;

const TOO_LONG_TITLE = 'הסרטון ארוך מדי';
const TOO_LONG_MESSAGE =
  'לא ניתן להעלות סרטון שאורכו מעל 3.5 דקות. בחרו סרטון קצר יותר.';

export function alertVideoTooLong() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${TOO_LONG_TITLE}\n${TOO_LONG_MESSAGE}`);
    return;
  }
  Alert.alert(TOO_LONG_TITLE, TOO_LONG_MESSAGE);
}

function probeWebVideoDurationSec(src) {
  return new Promise(resolve => {
    if (typeof document === 'undefined' || !src) {
      resolve(null);
      return;
    }
    const video = document.createElement('video');
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 10000);
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => {
      const d = Number(video.duration);
      finish(Number.isFinite(d) && d > 0 ? d : null);
    };
    video.onerror = () => finish(null);
    video.src = src;
  });
}

/**
 * Duration in seconds of an image-picker asset, a web File, or a picked-file
 * object ({uri, file}). Native picker durations are milliseconds; web pickers
 * do not report one, so the file's metadata is read instead.
 */
export async function getVideoDurationSec(source) {
  if (!source) return null;
  if (Platform.OS !== 'web') {
    const ms = Number(source.duration);
    return Number.isFinite(ms) && ms > 0 ? ms / 1000 : null;
  }
  const blob =
    typeof Blob !== 'undefined' && source instanceof Blob
      ? source
      : typeof Blob !== 'undefined' && source.file instanceof Blob
        ? source.file
        : null;
  if (blob) {
    const url = URL.createObjectURL(blob);
    try {
      return await probeWebVideoDurationSec(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return probeWebVideoDurationSec(source.uri);
}

/** Shows the "too long" popup and resolves false when the video is over the limit. */
export async function ensureVideoWithinLimit(source) {
  const sec = await getVideoDurationSec(source);
  if (sec != null && Math.round(sec) > MAX_VIDEO_DURATION_SEC) {
    alertVideoTooLong();
    return false;
  }
  return true;
}
