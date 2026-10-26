import {useMemo} from 'react';
import {muxThumbnailUri} from '../../profile/lib/videoPlayback';
import playButton from '../../assets/mobile/play-button.png';
import {cx, toWebStyle} from '../lib/rnStyle';
import styles from './fields.module.css';

const VIDEO_FILE_RE = /\.(mp4|mov|m4v|webm|m3u8)(\?|#|$)/i;

function isRemoteStill(uri) {
  const s = uri != null ? String(uri).trim() : '';
  if (!s || !/^https?:\/\//i.test(s)) return false;
  if (VIDEO_FILE_RE.test(s) || /stream\.mux\.com/i.test(s)) return false;
  return true;
}

/** `#t=0.1` makes the browser paint the first frame instead of a black box. */
function firstFrameSrc(uri) {
  const s = String(uri || '');
  return s && !s.includes('#') ? `${s}#t=0.1` : s;
}

/**
 * Card preview of a video: prefer a JPEG poster (Mux thumbnail or an explicit still),
 * else the video element's first frame.
 * `style` / `videoStyle` are RN-style objects; `className` is web-only.
 */
export function VideoPreviewThumb({
  uri,
  posterUri = null,
  style,
  videoStyle,
  className,
  showPlayIcon = true,
  resizeMode = 'cover',
}) {
  const poster = useMemo(() => {
    if (isRemoteStill(posterUri)) return String(posterUri).trim();
    return muxThumbnailUri(uri, {time: 0, width: 480}) || '';
  }, [posterUri, uri]);

  if (!uri && !poster) return null;

  const fit = resizeMode === 'contain' ? 'contain' : 'cover';
  const mediaStyle = {objectFit: fit, ...toWebStyle(videoStyle)};

  return (
    <div className={cx(styles.vptFrame, className)} style={toWebStyle(style)}>
      {poster ? (
        <img className={styles.vptMedia} style={mediaStyle} src={poster} alt="" draggable={false} />
      ) : (
        <video
          className={styles.vptMedia}
          style={mediaStyle}
          src={firstFrameSrc(uri)}
          muted
          playsInline
          preload="metadata"
        />
      )}
      {showPlayIcon ? (
        <div className={styles.vptPlayOverlay}>
          <img className={styles.vptPlayIcon} src={playButton} alt="" />
        </div>
      ) : null}
    </div>
  );
}
