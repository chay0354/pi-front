import {useEffect, useRef, useState} from 'react';
import {mdiClose, mdiVolumeHigh, mdiVolumeOff} from '@mdi/js';
import MdiIcon from '../publish/MdiIcon';
import {ProfileAvatar} from '../profile/ProfileParts';
import {muxThumbnailUri, resolveStorySlideUri} from '../profile/lib/videoPlayback';
import {isReduceMotion} from '../a11y/prefs';
import styles from './StoryViewer.module.css';

/** Mobile StoryViewerModal: stills advance after 12s; videos loop until a tap. */
const IMAGE_MS = 12000;

function isVideo(slide) {
  return slide?.media_type === 'video';
}

export default function StoryViewer({ring, prevRing, nextRing, onClose, onNextUser, onPrevUser, onOpenProfile}) {
  const slides = ring?.slides || [];
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const dragRef = useRef({x: 0, y: 0, swiped: false});
  const slide = slides[index] || null;
  const url = resolveStorySlideUri(slide) || '';
  const video = isVideo(slide);
  const poster = video ? muxThumbnailUri(url, {width: 720, time: 0}) : '';

  useEffect(() => {
    setIndex(0);
    setProgress(0);
  }, [ring?.subscription_id]);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose?.();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (video || isReduceMotion()) return undefined;
    const started = performance.now();
    let frame;
    const tick = now => {
      const ratio = Math.min(1, (now - started) / IMAGE_MS);
      setProgress(ratio);
      if (ratio >= 1) goNext();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index, ring?.subscription_id, video]);

  const goNext = () => {
    if (index < slides.length - 1) {
      setIndex(i => i + 1);
      setProgress(0);
      return;
    }
    if (nextRing?.slides?.length) onNextUser?.();
    else onClose?.();
  };

  const goPrev = () => {
    if (index > 0) {
      setIndex(i => i - 1);
      setProgress(0);
      return;
    }
    if (prevRing?.slides?.length) onPrevUser?.();
  };

  const onTap = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // Instagram / mobile: the physical left third steps back, the rest steps forward.
    if (x < rect.width * 0.33) goPrev();
    else goNext();
  };

  const onPointerDown = e => {
    dragRef.current = {x: e.clientX, y: e.clientY, swiped: false};
  };

  const onPointerUp = e => {
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    dragRef.current.swiped = true;
    // Finger moving left opens the next person; finger moving right opens the previous one.
    if (dx < 0) {
      if (nextRing?.slides?.length) onNextUser?.();
    } else if (prevRing?.slides?.length) {
      onPrevUser?.();
    }
  };

  const onStageClick = e => {
    if (dragRef.current.swiped) {
      dragRef.current.swiped = false;
      return;
    }
    onTap(e);
  };

  if (!slide) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-label={`סטורי של ${ring.display_name || ''}`}>
      <div className={styles.frame} dir="ltr">
        <div className={styles.bars}>
          {slides.map((item, i) => (
            <span key={item.id || i} className={styles.bar}>
              <span
                className={`${styles.barFill} ${isVideo(item) && i === index ? styles.barFillVideo : ''}`}
                style={{width: i < index || (isVideo(item) && i === index) ? '100%' : i === index ? `${progress * 100}%` : '0%'}}
              />
            </span>
          ))}
        </div>
        <header className={styles.header}>
          <button type="button" className={styles.who} onClick={() => onOpenProfile?.(ring)}>
            <ProfileAvatar uri={ring.profile_image_url} name={ring.display_name} size={52} subscriptionType={ring} />
            <span>{ring.display_name || 'משתמש'}</span>
          </button>
          <span className={styles.tools}>
            <button type="button" className={styles.iconBtn} aria-label={muted ? 'הפעל שמע' : 'השתק'} onClick={() => setMuted(v => !v)}>
              <MdiIcon path={muted ? mdiVolumeOff : mdiVolumeHigh} size={24} color="#fff" />
            </button>
            <button type="button" className={styles.iconBtn} aria-label="סגור" onClick={onClose}>
              <MdiIcon path={mdiClose} size={26} color="#fff" />
            </button>
          </span>
        </header>
        <button type="button" className={styles.stage} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onClick={onStageClick} aria-label="השקופית הבאה">
          {video ? (
            <video
              key={url}
              src={url}
              autoPlay
              playsInline
              loop
              muted={muted}
              poster={poster || undefined}
            />
          ) : (
            <img src={url} alt="" />
          )}
        </button>
      </div>
    </div>
  );
}
