import {useCallback, useEffect, useRef, useState} from 'react';
import iconDots from '../assets/figma/feed/icon-dots.svg';
import divider from '../assets/figma/pros/divider.svg';
import iconLocation from '../assets/figma/pros/location.svg';
import iconArrow from '../assets/figma/pros/arrow.svg';
import noProfileImage from '../assets/noprofileimage.png';
import {CompanyChat, PiRating} from './FeedCard';
import VolumeIcon from './VolumeIcon';
import {directoryProfilePayload, useProfileNav} from '../profile/navigation';
import styles from './RecommendedPros.module.css';

const CARD_STEP = 366 + 24;

function ProMedia({pro, playing, muted, onToggleMute}) {
  const videoRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const showVideo = Boolean(pro.video) && !videoFailed;
  const image = pro.image && !imageFailed ? pro.image : noProfileImage;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) video.play().catch(() => {});
    else video.pause();
  }, [playing, showVideo]);

  return (
    <div className={styles.media}>
      {showVideo ? (
        <video
          ref={videoRef}
          className={styles.mediaFill}
          src={pro.video}
          poster={pro.image || undefined}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
          onTimeUpdate={e => {
            const v = e.currentTarget;
            setProgress(v.duration ? v.currentTime / v.duration : 0);
          }}
        />
      ) : (
        <img className={styles.mediaFill} src={image} alt="" onError={() => setImageFailed(true)} />
      )}
      <div className={styles.mediaShade} />
      {showVideo && (
        <>
          <button
            type="button"
            className={styles.mute}
            aria-label={muted ? 'הפעל קול' : 'השתק'}
            aria-pressed={!muted}
            onClick={e => {
              e.stopPropagation();
              onToggleMute();
            }}>
            <VolumeIcon muted={muted} />
          </button>
          <div className={styles.timeline}>
            <div className={styles.timelineFill} style={{width: `${progress * 100}%`}} />
          </div>
        </>
      )}
    </div>
  );
}

function ProCard({pro, playing, muted, onToggleMute}) {
  const nav = useProfileNav();
  const open = () => nav.open(directoryProfilePayload(pro.raw));
  return (
    <div className={styles.proCard}>
      <div className={styles.mediaHit} onClick={open}>
        <ProMedia pro={pro} playing={playing} muted={muted} onToggleMute={onToggleMute} />
      </div>
      <div className={styles.content}>
        <div className={styles.info}>
          <div className={styles.identity}>
            <button type="button" className={`${styles.proName} ${styles.proNameLink}`} dir="rtl" onClick={open}>
              {pro.name}
            </button>
            {pro.address && (
              <div className={styles.address}>
                <span className={styles.addressText} dir="auto">
                  {pro.address}
                </span>
                <img src={iconLocation} alt="" width={24} height={24} />
              </div>
            )}
          </div>
          {pro.tags.length > 0 && (
            <div className={styles.tags} dir="rtl">
              {pro.tags.map(tag => (
                <span key={tag} className={styles.tag} dir="auto">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {pro.bio && (
            <p className={styles.bio} dir="rtl">
              {pro.bio}
            </p>
          )}
        </div>
        <CompanyChat className={styles.chat} />
      </div>
    </div>
  );
}

/** "בעלי מקצוע מומלצים" carousel card shown between feed cards (Figma 882:104911). */
export default function RecommendedPros({pros, active}) {
  const railRef = useRef(null);
  const [edges, setEdges] = useState({start: true, end: pros.length <= 2});
  const [unmutedId, setUnmutedId] = useState(null);

  useEffect(() => {
    if (!active) setUnmutedId(null);
  }, [active]);

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    // RTL scrolling: scrollLeft runs from 0 toward negative values.
    const offset = Math.abs(rail.scrollLeft);
    setEdges({start: offset < 2, end: offset + rail.clientWidth >= rail.scrollWidth - 2});
  }, []);

  useEffect(() => {
    measure();
  }, [measure, pros.length]);

  const scrollBy = dir => railRef.current?.scrollBy({left: -dir * CARD_STEP, behavior: 'smooth'});

  return (
    <article className={styles.card} aria-label="בעלי מקצוע מומלצים">
      <header className={styles.header}>
        <div className={styles.headerTools}>
          <button type="button" className={styles.more} aria-label="אפשרויות">
            <img src={iconDots} alt="" width={20} height={4} />
          </button>
          <img className={styles.divider} src={divider} alt="" width={1.5} height={28} />
        </div>
        <div className={styles.headerTitle}>
          <h2 className={styles.title} dir="rtl">
            בעלי מקצוע  מומלצים
          </h2>
          <PiRating value={5} />
        </div>
      </header>

      <div className={styles.railWrap}>
        <div className={styles.rail} ref={railRef} onScroll={measure}>
          {pros.map(pro => (
            <ProCard
              key={pro.id}
              pro={pro}
              playing={active}
              muted={unmutedId !== pro.id}
              onToggleMute={() => setUnmutedId(prev => (prev === pro.id ? null : pro.id))}
            />
          ))}
        </div>
        {!edges.end && (
          <button type="button" className={`${styles.arrow} ${styles.arrowNext}`} aria-label="הבא" onClick={() => scrollBy(1)}>
            <img className={styles.arrowIconNext} src={iconArrow} alt="" width={36} height={36} />
          </button>
        )}
        {!edges.start && (
          <button type="button" className={`${styles.arrow} ${styles.arrowPrev}`} aria-label="הקודם" onClick={() => scrollBy(-1)}>
            <img src={iconArrow} alt="" width={36} height={36} />
          </button>
        )}
      </div>
    </article>
  );
}
