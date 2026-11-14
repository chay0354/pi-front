import {useEffect, useRef, useState} from 'react';
import iconMute from '../assets/figma/piai/results/mute.svg';
import iconPin from '../assets/figma/piai/results/pro-pin.svg';
import iconChat from '../assets/figma/piai/results/pichat-union.svg';
import iconChatMark from '../assets/figma/piai/results/pichat-mark.svg';
import iconChatWord from '../assets/figma/piai/results/pichat-word.svg';
import {PiRatingBadge} from '../profile/ProfileParts';
import {isHlsUri, muxThumbnailUri, resolveAdVideoUri} from '../profile/lib/videoPlayback';
import styles from './AiProfessionalCard.module.css';

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
  const cover = String(item?.directory_cover_url || '').trim();
  const portrait = String(item?.profile_image_url || '').trim();
  const poster = (videoUri && muxThumbnailUri(videoUri, {width: 640, time: 0})) || cover || portrait;
  const ratingValue = Number(item?.average_rating);
  const rating = Number.isFinite(ratingValue) && ratingValue > 0 ? Math.round(ratingValue) : 5;
  const bio = String(item?.bio || '').trim();
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
            aria-pressed={!muted}
            onClick={event => {
              event.stopPropagation();
              setMuted(value => !value);
            }}>
            <img src={iconMute} alt="" width={24} height={24} />
          </button>
        ) : null}
      </div>
      <button type="button" className={styles.body} onClick={onOpen}>
        <div className={styles.identity}>
          <div className={styles.titleRow}>
            <p className={styles.name}>{heading}</p>
            <PiRatingBadge rating={rating} variant="listing" />
          </div>
          {address ? (
            <p className={styles.address}>
              <img src={iconPin} alt="" width={24} height={24} />
              <span>{address}</span>
            </p>
          ) : null}
        </div>
        {tags.length ? (
          <div className={styles.tags}>
            {tags.map(tag => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {bio ? <p className={styles.bio}>{bio}</p> : null}
      </button>
      <button
        type="button"
        className={styles.message}
        aria-label="שליחת הודעה"
        onClick={event => {
          event.stopPropagation();
          onMessage?.(item);
        }}>
        <span>שליחת הודעה</span>
        <span className={styles.piChat} aria-hidden>
          <img src={iconChat} alt="" width={77} height={34.4138} />
          <img className={styles.piChatWord} src={iconChatWord} alt="" width={26.6994} height={18.1182} />
          <img className={styles.piChatMark} src={iconChatMark} alt="" width={15.4} height={8.89443} />
          <span className={styles.piChatText}>Chat</span>
        </span>
      </button>
    </article>
  );
}
