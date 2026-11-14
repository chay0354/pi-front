import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import VolumeIcon from '../components/VolumeIcon';
import PostTextOverlays from '../publish/components/PostTextOverlays';
import {parsePostTextOverlayPayload} from '../publish/lib/postTextOverlay';
import {attachPlayback} from '../profile/lib/attachPlayback';
import {isHlsUri, muxThumbnailUri, resolveStorySlideUri} from '../profile/lib/videoPlayback';
import noProfileImage from '../assets/noprofileimage.png';
import imgClose from '../assets/figma/story/close.svg';
import imgPause from '../assets/figma/story/pause.svg';
import imgMuted from '../assets/figma/story/volume.svg';
import imgStop from '../assets/figma/story/stop.svg';
import imgPrev from '../assets/figma/story/nav.svg';
import imgNext from '../assets/figma/story/nav-next.svg';
import imgRing from '../assets/figma/story/ring.svg';
import imgRingSm from '../assets/figma/story/ring-sm.svg';
import styles from './StoryScreen.module.css';

const IMAGE_MS = 12000;

/** The frame the text was placed on: 16:9 from the computer, 9:16 from the phone. */
function authoredFrame(cardWidth, cardHeight, payload) {
  const previewWidth = Number(payload?.previewWidth) || 0;
  const previewHeight = Number(payload?.previewHeight) || 0;
  const aspect = previewWidth > 0 && previewHeight > 0 ? previewWidth / previewHeight : 9 / 16;
  let width = cardWidth;
  let height = width / aspect;
  if (height > cardHeight) {
    height = cardHeight;
    width = height * aspect;
  }
  return {
    width,
    height,
    left: (cardWidth - width) / 2,
    top: (cardHeight - height) / 2,
  };
}

function isVideoSlide(slide) {
  if (!slide) return false;
  if (slide.media_type === 'video') return true;
  const uri = resolveStorySlideUri(slide) || '';
  return isHlsUri(uri) || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(uri);
}

function storyClock(ring) {
  const stamps = (ring?.slides || []).map(slide => new Date(slide?.created_at || 0).getTime()).filter(t => t > 0);
  if (!stamps.length) return '';
  return new Date(Math.max(...stamps)).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function Avatar({src, size, ring, ringSize}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={styles.avatar} style={{width: size, height: size}}>
      <img className={styles.avatarRing} src={ring} alt="" width={ringSize} height={ringSize} />
      <img
        className={styles.avatarPhoto}
        src={src && !failed ? src : noProfileImage}
        alt=""
        onError={() => setFailed(true)}
      />
    </span>
  );
}

/**
 * Desktop story viewer (Figma 425:53087). One user at a time, their slides in order,
 * then the next user. Images advance after 12s; videos advance when they finish.
 */
export default function StoryScreen({rings, subscriptionId, onClose, onOpenProfile}) {
  const initialIndex = Math.max(
    0,
    rings.findIndex(ring => String(ring.subscription_id) === String(subscriptionId)),
  );
  const [userIndex, setUserIndex] = useState(initialIndex);
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const [frame, setFrame] = useState(null);
  const elapsedRef = useRef(0);
  const goNextRef = useRef(() => {});
  const railRef = useRef(null);

  const ring = rings[userIndex] || null;
  const slides = ring?.slides || [];
  const slide = slides[slideIndex] || null;
  const video = isVideoSlide(slide);
  const uri = slide ? resolveStorySlideUri(slide) : '';
  const overlayPayload = useMemo(
    () => parsePostTextOverlayPayload({general_details: slide?.general_details}),
    [slide],
  );

  const goNext = useCallback(() => {
    setProgress(0);
    elapsedRef.current = 0;
    if (slideIndex < slides.length - 1) {
      setSlideIndex(slideIndex + 1);
      return;
    }
    if (userIndex < rings.length - 1) {
      setUserIndex(userIndex + 1);
      setSlideIndex(0);
      return;
    }
    onClose?.();
  }, [onClose, rings.length, slideIndex, slides.length, userIndex]);

  const goPrev = useCallback(() => {
    setProgress(0);
    elapsedRef.current = 0;
    if (slideIndex > 0) {
      setSlideIndex(slideIndex - 1);
      return;
    }
    if (userIndex > 0) {
      setUserIndex(userIndex - 1);
      setSlideIndex(0);
    }
  }, [slideIndex, userIndex]);

  useEffect(() => {
    goNextRef.current = goNext;
  }, [goNext]);

  useEffect(() => {
    elapsedRef.current = 0;
  }, [userIndex, slideIndex]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;
    const measure = () => {
      const width = card.clientWidth;
      const height = card.clientHeight;
      if (!(width > 0) || !(height > 0) || !overlayPayload) {
        setFrame(null);
        return;
      }
      setFrame(authoredFrame(width, height, overlayPayload));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, [overlayPayload]);

  useEffect(() => {
    const row = railRef.current?.querySelector('[data-active="true"]');
    row?.scrollIntoView({block: 'nearest'});
  }, [userIndex]);

  useEffect(() => {
    if (paused || video || !slide) return undefined;
    const started = performance.now();
    let frame = 0;
    const tick = now => {
      const p = Math.min(1, (elapsedRef.current + now - started) / IMAGE_MS);
      setProgress(p);
      if (p >= 1) {
        goNextRef.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      elapsedRef.current += performance.now() - started;
      cancelAnimationFrame(frame);
    };
  }, [paused, video, slide, userIndex, slideIndex]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !video || !uri) return undefined;
    const fallback = slide?.media_url && !isHlsUri(slide.media_url) ? slide.media_url : '';
    return attachPlayback(el, uri, {fallback});
  }, [video, uri, slide]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !video) return;
    if (paused) el.pause();
    else el.play().catch(() => {});
  }, [paused, video, uri]);

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === ' ') {
        event.preventDefault();
        setPaused(value => !value);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [goNext, goPrev, onClose]);

  if (!ring) return null;

  const openUser = index => {
    setProgress(0);
    elapsedRef.current = 0;
    setUserIndex(index);
    setSlideIndex(0);
  };

  const onCardClick = event => {
    if (event.target.closest('button')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (x < rect.width * 0.33) goPrev();
    else goNext();
  };

  const poster = video ? muxThumbnailUri(uri, {time: 0, width: 720}) : '';

  return (
    <div className={styles.screen} dir="rtl" role="dialog" aria-modal="true" aria-label="סטורי" data-account-modal="">
      <header className={styles.topBar}>
        <button type="button" className={styles.closeBtn} aria-label="סגירה" onClick={onClose}>
          <img src={imgClose} alt="" width={24} height={24} />
        </button>
      </header>
      <div className={styles.body}>
        <aside className={styles.rail} ref={railRef} aria-label="סטוריז">
          {rings.map((item, index) => {
            const time = storyClock(item);
            const active = index === userIndex;
            return (
              <button
                key={item.subscription_id}
                type="button"
                className={`${styles.railRow} ${active ? styles.railRowActive : ''}`}
                data-active={active || undefined}
                onClick={() => openUser(index)}>
                <Avatar src={item.profile_image_url} size={78} ring={imgRing} ringSize={77} />
                <span className={styles.railText}>
                  {time ? <span className={styles.railTime}>{time}</span> : null}
                  <span className={styles.railName}>{item.display_name}</span>
                </span>
              </button>
            );
          })}
        </aside>

        <div className={styles.viewer} dir="ltr">
          <button
            type="button"
            className={styles.navBtn}
            aria-label="הקודם"
            disabled={userIndex === 0 && slideIndex === 0}
            onClick={goPrev}>
            <img src={imgPrev} alt="" width={16.5} height={24} />
          </button>

          <div className={styles.card} ref={cardRef} dir="rtl" onClick={onCardClick}>
            <div
              className={frame ? styles.storyCanvas : styles.storyFill}
              style={
                frame
                  ? {width: frame.width, height: frame.height, left: frame.left, top: frame.top}
                  : undefined
              }>
              {video ? (
                <video
                  ref={videoRef}
                  className={styles.media}
                  poster={poster || undefined}
                  muted={muted}
                  playsInline
                  onTimeUpdate={event => {
                    const el = event.currentTarget;
                    if (!paused && el.duration) setProgress(Math.min(1, el.currentTime / el.duration));
                  }}
                  onEnded={() => goNextRef.current()}
                />
              ) : uri ? (
                <img className={styles.media} src={uri} alt="" />
              ) : null}
              {frame && overlayPayload ? (
                <PostTextOverlays
                  overlays={overlayPayload.overlays}
                  previewWidth={overlayPayload.previewWidth}
                  previewHeight={overlayPayload.previewHeight}
                  coordsSpace={overlayPayload.coordsSpace}
                  feedWidth={frame.width}
                  feedHeight={frame.height}
                />
              ) : null}
            </div>

            <div className={styles.cardChrome}>
              <div className={styles.progressRow}>
                {slides.map((item, index) => {
                  const fill = index < slideIndex ? 1 : index === slideIndex ? progress : 0;
                  return (
                    <span key={item.id || index} className={styles.progressTrack}>
                      <span className={styles.progressFill} style={{width: `${fill * 100}%`}} />
                    </span>
                  );
                })}
              </div>
              <div className={styles.cardHead}>
                <button
                  type="button"
                  className={styles.identity}
                  onClick={() => onOpenProfile?.(ring)}>
                  <Avatar src={ring.profile_image_url} size={52} ring={imgRingSm} ringSize={52} />
                  <span className={styles.identityName}>{ring.display_name}</span>
                </button>
                <span className={styles.controls}>
                  <button type="button" className={styles.iconBtn} aria-label={muted ? 'הפעל קול' : 'השתק'} aria-pressed={!muted} onClick={() => setMuted(value => !value)}>
                    {muted ? <img src={imgMuted} alt="" width={24} height={24} /> : <VolumeIcon muted={false} />}
                  </button>
                  <button type="button" className={styles.iconBtn} aria-label={paused ? 'הפעל' : 'השהה'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>
                    {paused ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden focusable="false">
                        <path d="M8 5.5v13l11-6.5-11-6.5z" fill="#fff" />
                      </svg>
                    ) : (
                      <img src={imgPause} alt="" width={24} height={24} />
                    )}
                  </button>
                </span>
              </div>
            </div>

            <div className={styles.cardBottom}>
              <button type="button" className={styles.iconBtn} aria-label={paused ? 'הפעל' : 'השהה'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>
                {paused ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden focusable="false">
                    <path d="M8 5.5v13l11-6.5-11-6.5z" fill="#fff" />
                  </svg>
                ) : (
                  <img src={imgStop} alt="" width={24} height={24} />
                )}
              </button>
              <button type="button" className={styles.iconBtn} aria-label={muted ? 'הפעל קול' : 'השתק'} aria-pressed={!muted} onClick={() => setMuted(value => !value)}>
                {muted ? <img src={imgMuted} alt="" width={24} height={24} /> : <VolumeIcon muted={false} />}
              </button>
            </div>
          </div>

          <button
            type="button"
            className={styles.navBtn}
            aria-label="הבא"
            disabled={userIndex === rings.length - 1 && slideIndex === slides.length - 1}
            onClick={goNext}>
            <img src={imgNext} alt="" width={36} height={36} />
          </button>
        </div>
      </div>
    </div>
  );
}
