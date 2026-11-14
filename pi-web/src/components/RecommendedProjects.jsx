import {useCallback, useEffect, useRef, useState} from 'react';
import iconDots from '../assets/figma/feed/icon-dots.svg';
import divider from '../assets/figma/pros/divider.svg';
import iconLocation from '../assets/figma/pros/location.svg';
import iconArrow from '../assets/figma/pros/arrow.svg';
import {attachPlayback} from '../profile/lib/attachPlayback';
import {featuredProjectProfilePayload, useProfileNav} from '../profile/navigation';
import {toFeedItem} from '../feed/listingRules';
import {PiRating} from './FeedCard';
import VolumeIcon from './VolumeIcon';
import styles from './RecommendedPros.module.css';

const CARD_STEP = 366 + 24;

function ProjectMedia({project, playing, muted, onToggleMute}) {
  const videoRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !project.videoUrl) return undefined;
    return attachPlayback(video, project.videoUrl, {fallback: project.fallbackUrl});
  }, [project.id, project.videoUrl, project.fallbackUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) video.play().catch(() => {});
    else video.pause();
  }, [playing, project.id]);

  return (
    <div className={styles.media}>
      <video
        ref={videoRef}
        className={styles.mediaFill}
        poster={project.poster || undefined}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onTimeUpdate={event => {
          const video = event.currentTarget;
          setProgress(video.duration ? video.currentTime / video.duration : 0);
        }}
      />
      <div className={styles.mediaShade} />
      <button
        type="button"
        className={styles.mute}
        aria-label={muted ? 'הפעל קול' : 'השתק'}
        aria-pressed={!muted}
        onClick={event => {
          event.stopPropagation();
          onToggleMute();
        }}>
        <VolumeIcon muted={muted} />
      </button>
      <div className={styles.timeline}>
        <div className={styles.timelineFill} style={{width: `${progress * 100}%`}} />
      </div>
    </div>
  );
}

const PURPOSE_LABEL = {rent: 'להשכרה', sale: 'למכירה'};
const formatPrice = n => `₪${Math.round(n).toLocaleString('en-US')}`;

function ProjectCard({project, playing, muted, onToggleMute}) {
  const nav = useProfileNav();
  const open = () => nav.open(featuredProjectProfilePayload(project.raw));
  const item = toFeedItem(project.raw);
  const address = item.address || String(project.raw?.address || '').trim();
  const price = item.price != null ? formatPrice(item.price) : '';
  const rooms = item.rooms != null ? `${item.rooms} חד׳` : '';
  const rating = item.piRating ?? 5;
  return (
    <div className={styles.proCard}>
      <div className={styles.mediaHit} onClick={open}>
        <ProjectMedia project={project} playing={playing} muted={muted} onToggleMute={onToggleMute} />
      </div>
      <div className={styles.content}>
        <button type="button" className={styles.body} onClick={open}>
          <div className={styles.titleRow}>
            <span className={styles.publisher}>
              {project.logo ? <img className={styles.logo} src={project.logo} alt="" /> : null}
              <span className={styles.proName} dir="auto">
                {project.name || item.creatorName || 'פרויקט'}
              </span>
            </span>
            <PiRating value={rating} />
          </div>
          {PURPOSE_LABEL[item.purpose] || price ? (
            <div className={styles.priceRow}>
              {price ? (
                <p className={styles.price} dir="auto">
                  {price}
                </p>
              ) : null}
              {PURPOSE_LABEL[item.purpose] ? <span className={styles.purpose}>{PURPOSE_LABEL[item.purpose]}</span> : null}
            </div>
          ) : null}
          {rooms ? (
            <p className={styles.meta} dir="auto">
              {rooms}
            </p>
          ) : null}
          {address ? (
            <p className={styles.address}>
              <img src={iconLocation} alt="" width={24} height={24} />
              <span dir="auto">{address}</span>
            </p>
          ) : null}
        </button>
        <button type="button" className={styles.watch} dir="rtl" onClick={open}>
          צפו בפרויקט
        </button>
      </div>
    </div>
  );
}

/** Same horizontal carousel as בעלי מקצוע מומלצים, filled with פרויקטים נבחרים. */
export default function RecommendedProjects({projects, active}) {
  const railRef = useRef(null);
  const [edges, setEdges] = useState({start: true, end: projects.length <= 2});
  const [unmutedId, setUnmutedId] = useState(null);

  useEffect(() => {
    if (!active) setUnmutedId(null);
  }, [active]);

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const offset = Math.abs(rail.scrollLeft);
    setEdges({start: offset < 2, end: offset + rail.clientWidth >= rail.scrollWidth - 2});
  }, []);

  useEffect(() => {
    measure();
  }, [measure, projects.length]);

  const scrollBy = dir => railRef.current?.scrollBy({left: -dir * CARD_STEP, behavior: 'smooth'});

  return (
    <article className={styles.card} aria-label="פרויקטים נבחרים">
      <header className={styles.header}>
        <div className={styles.headerTools}>
          <button type="button" className={styles.more} aria-label="אפשרויות">
            <img src={iconDots} alt="" width={20} height={4} />
          </button>
          <img className={styles.divider} src={divider} alt="" width={1.5} height={28} />
        </div>
        <div className={styles.headerTitle}>
          <h2 className={styles.title} dir="rtl">
            פרויקטים נבחרים
          </h2>
        </div>
      </header>

      <div className={styles.railWrap}>
        <div className={styles.rail} ref={railRef} onScroll={measure}>
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              playing={active}
              muted={unmutedId !== project.id}
              onToggleMute={() => setUnmutedId(prev => (prev === project.id ? null : project.id))}
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
