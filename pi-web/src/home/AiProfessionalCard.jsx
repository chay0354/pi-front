import {useEffect, useRef, useState} from 'react';
import {mdiVolumeHigh, mdiVolumeOff} from '@mdi/js';
import MdiIcon from '../publish/MdiIcon';
import {mobileAsset} from '../publish/lib/publishRules';
import {PiRatingBadge} from '../profile/ProfileParts';
import {isHlsUri, muxThumbnailUri, resolveAdVideoUri} from '../profile/lib/videoPlayback';
import styles from './AiProfessionalCard.module.css';

const locationIcon = mobileAsset('pros/location-pro.png');
const messageButton = mobileAsset('pros/pro-messges.png');

const isBroker = item => String(item?.subscription_type || '').trim().toLowerCase() === 'broker';
const asList = value => {
  if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return asList(parsed);
  } catch {
    /* plain */
  }
  return [value.trim()];
};

const typesOf = item => (isBroker(item) ? ['תיווך'] : asList(item?.types));

let hlsCapable;
function canPlayHls() {
  if (hlsCapable != null) return hlsCapable;
  try {
    const probe = document.createElement('video');
    hlsCapable = Boolean(probe.canPlayType('application/vnd.apple.mpegurl') || probe.canPlayType('application/x-mpegURL'));
  } catch {
    hlsCapable = false;
  }
  return hlsCapable;
}

const videoUriOf = item => {
  const hls = resolveAdVideoUri({
    video_url: item?.video_url,
    video_hls_url: item?.video_hls_url,
    video_playback_url: item?.video_playback_url,
    video_status: item?.video_status,
  });
  const raw = item?.video_url != null ? String(item.video_url).trim() : '';
  const direct = raw && !isHlsUri(raw) ? raw : '';
  if (hls && canPlayHls()) return hls;
  return direct || hls || '';
};

/** Result card for Pi AI professional search — photo, rating, name, tags, message. */
export default function AiProfessionalCard({item, onOpen, onMessage}) {
  const title = String(item?.display_name || (isBroker(item) ? 'תיווך' : 'בעל מקצוע')).trim();
  const types = typesOf(item);
  const heading = types[0] && !title.includes(types[0]) ? `${types[0]} ${title}` : title;
  const address = String(item?.address || '').trim();
  const tags = asList(item?.specializations).slice(0, 3);
  const videoUri = videoUriOf(item);
  const poster = (videoUri && muxThumbnailUri(videoUri, {width: 640, time: 0})) || item?.profile_image_url || '';
  const rating = Number(item?.average_rating);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return undefined;
    node.muted = muted;
    const play = node.play?.();
    if (play && typeof play.catch === 'function') play.catch(() => {});
    return () => node.pause();
  }, [muted, videoUri]);

  return (
    <article className={styles.card} aria-label={heading}>
      <div className={styles.media}>
        {videoUri ? (
          <video
            ref={videoRef}
            className={styles.photo}
            src={videoUri}
            poster={poster || undefined}
            muted={muted}
            loop
            playsInline
          />
        ) : poster ? (
          <img className={styles.photo} src={poster} alt="" />
        ) : (
          <span className={styles.empty} />
        )}
        {videoUri ? (
          <button
            type="button"
            className={styles.mute}
            aria-label={muted ? 'הפעל קול' : 'השתק'}
            onClick={event => {
              event.stopPropagation();
              setMuted(value => !value);
            }}>
            <MdiIcon path={muted ? mdiVolumeOff : mdiVolumeHigh} size={22} color="#fff" />
          </button>
        ) : null}
      </div>
      <button type="button" className={styles.body} onClick={onOpen}>
        <PiRatingBadge rating={Number.isFinite(rating) && rating > 0 ? rating : 5} variant="listing" />
        <p className={styles.name}>{heading}</p>
        {address ? (
          <p className={styles.address}>
            <span>{address}</span>
            <img src={locationIcon} alt="" />
          </p>
        ) : null}
        {tags.length ? (
          <div className={styles.tags}>
            {tags.map(tag => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </button>
      <button
        type="button"
        className={styles.message}
        aria-label="שליחת הודעה"
        onClick={event => {
          event.stopPropagation();
          onMessage?.(item);
        }}>
        <img src={messageButton} alt="" />
      </button>
    </article>
  );
}
