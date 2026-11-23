import {useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {mdiClose} from '@mdi/js';
import TopBar from '../components/TopBar';
import {PiRating} from '../components/FeedCard';
import VolumeIcon from '../components/VolumeIcon';
import PiAiListingCard from '../home/PiAiListingCard';
import PiAiPanel from '../components/PiAiPanel';
import {useSlidePresence} from '../components/useSlidePresence';
import {PiAiMascot, PiChatMark} from '../components/figma/home.generated';
import {isFeedPost, toFeedItem} from '../feed/listingRules';
import {usePiAiSearch} from '../feed/usePiAiSearch';
import {inferPiAiKind, usePiAiProfessionals} from '../feed/usePiAiProfessionals';
import AiProfessionalCard from '../home/AiProfessionalCard';
import ProPromo from '../home/ProPromo';
import {ringsWithLiveStories, useFeaturedProjects, useHomeProfessionals, useHomeStories} from '../feed/useHome';
import {useSession} from '../auth/session';
import ProfessionalsDirectoryScreen from '../home/ProfessionalsDirectoryScreen';
import SelectedProjectsScreen from '../home/SelectedProjectsScreen';
import StoryScreen from '../home/StoryScreen';
import {directoryProfilePayload, featuredProjectProfilePayload, useProfileNav} from '../profile/navigation';
import {AppDownloadQr} from '../promo/AppDownloadQr';
import {FEATURED_AD_MS, FEATURED_APP_ADS} from '../promo/appDownload';
import {attachPlayback} from '../profile/lib/attachPlayback';
import {isReduceMotion} from '../a11y/prefs';
import MdiIcon from '../publish/MdiIcon';
import homeLogo from '../assets/homeLogo.png';
import noProfileImage from '../assets/noprofileimage.png';
import imgBackdrop from '../assets/figma/home/8b3ea.png';
import imgMuted from '../assets/figma/home/3d2da.svg';
import imgPopularFold from '../assets/figma/home/8c929.svg';
import imgPiAiLogo from '../assets/figma/home/23cb0.svg';
import iconAiChevron from '../assets/figma/edit-publish/back-chevron.svg';
import iconAiClose from '../assets/figma/piai/close.svg';
import imgStarBadge from '../assets/figma/home/80461.svg';
import imgDivider from '../assets/figma/home/e253b.svg';
import imgRingSmall from '../assets/figma/home/50d02.svg';
import imgRingLarge from '../assets/figma/home/ac0a7.svg';
import imgArrowLeft from '../assets/figma/home/2a8dc.svg';
import imgArrowRight from '../assets/figma/home/08530.svg';
import styles from './HomeScreen.module.css';

const STORY_TYPE_LABEL = {
  broker: 'תיווך',
  professional: 'בעל מקצוע',
  company: 'חברה',
  business: 'עסק',
  project_marketer: 'שיווק',
};

const PRO_STEP = 135.385;
const PROS_PER_PAGE = 6;
const PRO_RAIL_WIDTH = 1760;
/** Stage px per second. */
const PRO_CONVEYOR_SPEED = 30;

function SectionHeader({title, action, onAction, className = ''}) {
  return (
    <div className={`${styles.sectionHeader} ${className}`}>
      <p className={styles.sectionTitle} dir="rtl">
        {title}
      </p>
      <button type="button" className={styles.sectionAction} onClick={onAction} dir="auto">
        {action}
      </button>
    </div>
  );
}

/** Mobile home featured avatar: ProfileAvatar size, gold ring, a step larger for the desktop card. */
const FEATURED_LOGO_SIZE = 80;
const FEATURED_RING_RATIO = 3.5 / 82;
const FEATURED_GAP_RATIO = 2 / 82;

function FeaturedLogo({src}) {
  const gradientId = `featuredLogoRing-${useId().replace(/:/g, '')}`;
  const ringWidth = Math.max(1, FEATURED_LOGO_SIZE * FEATURED_RING_RATIO);
  const inset = ringWidth + FEATURED_LOGO_SIZE * FEATURED_GAP_RATIO;
  const radius = (FEATURED_LOGO_SIZE - ringWidth) / 2;
  return (
    <span className={styles.projectLogo}>
      <svg className={styles.projectLogoRing} width={FEATURED_LOGO_SIZE} height={FEATURED_LOGO_SIZE} aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="4.56%" stopColor="#FFE56A" />
            <stop offset="50.76%" stopColor="#F7C63A" />
            <stop offset="88.31%" stopColor="#E5A80F" />
          </linearGradient>
        </defs>
        <circle cx={FEATURED_LOGO_SIZE / 2} cy={FEATURED_LOGO_SIZE / 2} r={radius} fill="none" stroke={`url(#${gradientId})`} strokeWidth={ringWidth} />
      </svg>
      <img
        className={styles.projectLogoImage}
        src={src}
        alt=""
        style={{
          top: inset,
          left: inset,
          width: FEATURED_LOGO_SIZE - inset * 2,
          height: FEATURED_LOGO_SIZE - inset * 2,
        }}
      />
    </span>
  );
}

const STORY_VIDEO_FILE = /\.(mp4|mov|webm|m4v|m3u8)(\?|#|$)/i;

function isStoryVideoSlide(slide) {
  if (!slide) return false;
  if (String(slide.media_type || '').toLowerCase() === 'video') return true;
  const uri = String(slide.media_url || slide.media_playback_url || '');
  return STORY_VIDEO_FILE.test(uri);
}

/** Newest video story in the ring. The circle plays the file itself, not the profile photo. */
function storyRingVideoUri(ring) {
  const slides = Array.isArray(ring?.slides) ? ring.slides : [];
  let chosen = null;
  for (const slide of slides) {
    if (isStoryVideoSlide(slide)) chosen = slide;
  }
  if (!chosen) return '';
  const direct = String(chosen.media_url || '').trim();
  if (/\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(direct)) return direct;
  return String(chosen.media_playback_url || chosen.media_hls_url || direct).trim();
}

/** `ringOutset` is the ring SVG's overflow past its frame, in percent (Figma inset). */
function ProfilePic({src, size, ring, ringOutset = 0, video = ''}) {
  const [failed, setFailed] = useState(false);
  const ringBox = `${100 + 2 * ringOutset}%`;
  const photo = src && !failed ? src : noProfileImage;
  return (
    <span className={styles.profilePic} style={{width: size, height: size}}>
      {ring && (
        <span className={styles.profileRing}>
          <img
            src={ring}
            alt=""
            style={{top: `${-ringOutset}%`, left: `${-ringOutset}%`, width: ringBox, height: ringBox}}
          />
        </span>
      )}
      {video ? (
        <video
          className={styles.profilePhoto}
          src={video}
          poster={photo}
          muted
          loop
          autoPlay
          playsInline
        />
      ) : (
        <img
          className={styles.profilePhoto}
          src={photo}
          alt=""
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

function FeaturedProject({projects, onOpen, onOpenProject, active, qrOpen, onQrOpen, onQrClose}) {
  const cardRef = useRef(null);
  const videoRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [beat, setBeat] = useState('ad');
  const [adIndex, setAdIndex] = useState(0);
  const project = projects.length ? projects[index % projects.length] : null;
  const seeded = useRef(false);
  const showingProject = beat === 'project' && !!project;

  useEffect(() => {
    if (seeded.current || projects.length === 0) return;
    seeded.current = true;
    setIndex(Math.floor(Math.random() * projects.length));
  }, [projects.length]);

  useEffect(() => {
    setMuted(true);
    setProgress(0);
  }, [project?.id]);

  useEffect(() => {
    if (beat !== 'project' || project) return;
    setBeat('ad');
  }, [beat, project]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !project?.videoUrl) return undefined;
    return attachPlayback(video, project.videoUrl, {fallback: project.fallbackUrl});
  }, [project?.id, project?.videoUrl, project?.fallbackUrl]);

  useEffect(() => {
    if (!active || beat !== 'ad' || qrOpen) return undefined;
    let cancelled = false;
    const started = performance.now();
    let timer = 0;
    const finish = () => {
      if (cancelled) return;
      setAdIndex(prev => (prev + 1) % FEATURED_APP_ADS.length);
      setBeat(projects.length ? 'project' : 'ad');
    };
    const tick = () => {
      if (cancelled) return;
      const elapsed = performance.now() - started;
      const video = videoRef.current;
      const ready = !projects.length || (video && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA);
      if (elapsed >= FEATURED_AD_MS && (ready || elapsed >= FEATURED_AD_MS + 12000)) {
        finish();
        return;
      }
      timer = window.setTimeout(tick, 200);
    };
    timer = window.setTimeout(tick, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, beat, projects.length, qrOpen, project?.id]);

  useEffect(() => {
    if (!qrOpen) return undefined;
    const onKey = event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onQrClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [qrOpen, onQrClose]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active && showingProject) video.play().catch(() => {});
    else video.pause();
  }, [active, showingProject, project?.id]);

  const advance = useCallback(() => {
    setIndex(prev => {
      if (projects.length < 2) return prev;
      const next = Math.floor(Math.random() * (projects.length - 1));
      return next >= prev % projects.length ? next + 1 : next;
    });
    setBeat('ad');
  }, [projects.length]);

  return (
    <div className={styles.featured}>
      <SectionHeader title="פרויקטים נבחרים" action="לכל הפרויקטים" onAction={onOpen} />
      <div className={styles.projectFrame}>
        <div className={styles.projectCard} ref={cardRef}>
          {project && (
            <video
              key={project.id}
              ref={videoRef}
              className={styles.projectVideo}
              poster={project.poster || undefined}
              muted={muted}
              playsInline
              preload="auto"
              onEnded={advance}
              onTimeUpdate={e => {
                const v = e.currentTarget;
                if (!showingProject) return;
                setProgress(v.duration ? v.currentTime / v.duration : 0);
              }}
            />
          )}
          {showingProject && <div className={styles.projectShade} />}
          {showingProject && (
            <div className={styles.projectText}>
              {project?.name && (
                <p className={styles.projectName} dir="rtl">
                  {project.name}
                </p>
              )}
              <button
                type="button"
                className={styles.projectLink}
                onClick={() => (project ? onOpenProject(project) : onOpen())}
                dir="rtl">
                צפו בפרויקט
              </button>
            </div>
          )}
          {showingProject && project?.logo && <FeaturedLogo src={project.logo} />}
          {showingProject && (
            <button
              type="button"
              className={styles.projectMute}
              aria-label={muted ? 'הפעל קול' : 'השתק'}
              aria-pressed={!muted}
              onClick={() => setMuted(m => !m)}>
              {muted ? <img src={imgMuted} alt="" width={24} height={24} /> : <VolumeIcon muted={false} />}
            </button>
          )}
          {showingProject && (
            <div className={styles.projectTimeline}>
              <div className={styles.projectTimelineFill} style={{width: `${progress * 100}%`}} />
            </div>
          )}
          {beat === 'ad' && (
            <div className={styles.appSpot} dir="rtl">
              <img className={styles.appSpotMascot} src={homeLogo} alt="" />
              <p className={styles.appSpotLine}>{FEATURED_APP_ADS[adIndex % FEATURED_APP_ADS.length]}</p>
              <button type="button" className={styles.appSpotCta} onClick={onQrOpen}>
                להורדה לחצו כאן
              </button>
              <div key={adIndex} className={styles.appSpotBar} style={{'--spot-ms': `${FEATURED_AD_MS}ms`}} />
            </div>
          )}
          {qrOpen && (
            <div className={styles.appQrPop} role="dialog" aria-label="הורדת האפליקציה" data-account-modal="">
              <div className={styles.appQrCard}>
                <button type="button" className={styles.appQrClose} aria-label="סגירה" onClick={onQrClose}>
                  <MdiIcon path={mdiClose} size={22} color="#fff" />
                </button>
                <img className={styles.appQrMascot} src={homeLogo} alt="" />
                <AppDownloadQr size={200} />
              </div>
            </div>
          )}
        </div>
        {showingProject && (
        <div className={styles.popular}>
          <span className={styles.popularPill}>
            <span className={styles.popularText}>POPULAR</span>
          </span>
          <img className={styles.popularFold} src={imgPopularFold} alt="" width={16} height={14} />
        </div>
        )}
      </div>
    </div>
  );
}

function StarBadge({value}) {
  return (
    <span className={styles.starBadge}>
      <img src={imgStarBadge} alt="" />
      <span className={styles.starBadgeNum}>{value}</span>
    </span>
  );
}

/** "כוכבי פאי" card; `side` is the screen edge the card is attached to. */
function TopRatedCard({entry, side, onOpenPro}) {
  if (!entry) return <div className={`${styles.topRated} ${styles[side]} ${styles.topRatedEmpty}`} />;
  const {pro, review} = entry;
  const identity = (
    <div className={`${styles.identity} ${side === 'left' ? styles.identityLeft : ''}`}>
      <button type="button" className={styles.identityInner} onClick={() => onOpenPro(pro)}>
        {side === 'right' && <ProfilePic src={pro.image} size={66} ring={imgRingSmall} ringOutset={2.2} />}
        <p className={styles.topRatedName} dir="auto">
          {pro.name}
        </p>
        {side === 'left' && <ProfilePic src={pro.image} size={66} ring={imgRingSmall} ringOutset={2.2} />}
      </button>
    </div>
  );
  const rating = (
    <span className={styles.bigRating}>
      <PiRating value={pro.rating} large />
    </span>
  );
  return (
    <section className={`${styles.topRated} ${styles[side]}`} aria-label="כוכבי פאי">
      <div className={styles.topRatedHeader}>
        <span dir="auto">מדורגים</span>
        <StarBadge value={pro.rating} />
        <span dir="auto">כוכבי פאי</span>
      </div>
      <img className={styles.topRatedDivider} src={imgDivider} alt="" />
      <div className={styles.topRatedBody}>
        <div className={styles.topRatedRow}>
          {side === 'right' ? (
            <>
              {identity}
              {rating}
            </>
          ) : (
            <>
              {rating}
              {identity}
            </>
          )}
        </div>
        {review && (
          <div className={styles.review}>
            <ProfilePic src={review.avatar} size={27} />
            <p className={styles.reviewText} dir="auto">
              {review.text}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function ProItem({pro, hidden, onOpen}) {
  return (
    <button
      type="button"
      className={styles.proItem}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      onClick={() => onOpen(pro)}>
      <ProfilePic src={pro.image} video={hidden ? '' : pro.video} size={96} ring={imgRingLarge} ringOutset={1.72} />
      <p className={styles.proLabel} dir="auto">
        <span>{pro.name}</span>
        {pro.profession && <span>{pro.profession}</span>}
      </p>
    </button>
  );
}

/** Conveyor: the list is rendered twice and the track drifts rightward, wrapping after one copy. */
function ProsStrip({pros, onOpenPro, onOpenDirectory}) {
  const trackRef = useRef(null);
  const offset = useRef(0);
  const pending = useRef(0);
  const paused = useRef(false);
  const loopWidth = pros.length * PRO_STEP;
  const looping = loopWidth > PRO_RAIL_WIDTH;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !looping) return undefined;
    let frame;
    let last = performance.now();
    const tick = now => {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      const nudge = pending.current * Math.min(1, dt * 8);
      pending.current -= nudge;
      const drift = paused.current || isReduceMotion() ? 0 : PRO_CONVEYOR_SPEED * dt;
      offset.current = (((offset.current + drift + nudge) % loopWidth) + loopWidth) % loopWidth;
      track.style.transform = `translateX(${offset.current}px)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [looping, loopWidth]);

  const scrollBy = dir => {
    pending.current += dir * PRO_STEP * PROS_PER_PAGE;
  };

  return (
    <section className={styles.pros} aria-label="בעלי מקצוע בתחום הנדל״ן">
      <div className={styles.prosInner}>
        <SectionHeader className={styles.prosHeader} title="בעלי מקצוע בתחום הנדל״ן" action="לכל בעלי המקצוע" onAction={onOpenDirectory} />
        {pros.length > 0 ? (
        <div
          className={styles.prosRail}
          onMouseEnter={() => (paused.current = true)}
          onMouseLeave={() => (paused.current = false)}
        >
          <div className={styles.prosTrack} ref={trackRef}>
            {pros.map(pro => (
              <ProItem key={pro.id} pro={pro} onOpen={onOpenPro} />
            ))}
            {looping && pros.map(pro => <ProItem key={`loop-${pro.id}`} pro={pro} hidden onOpen={onOpenPro} />)}
          </div>
        </div>
      ) : null}
      </div>
      {pros.length > 0 ? (
        <>
          <button type="button" className={`${styles.prosArrow} ${styles.prosArrowPrev}`} aria-label="הקודם" onClick={() => scrollBy(-1)}>
            <img src={imgArrowRight} alt="" width={36} height={36} />
          </button>
          <button type="button" className={`${styles.prosArrow} ${styles.prosArrowNext}`} aria-label="הבא" onClick={() => scrollBy(1)}>
            <img src={imgArrowLeft} alt="" width={16.5} height={24} />
          </button>
        </>
      ) : null}
    </section>
  );
}

/** Home screen (Figma 244:33110) — shown before a category feed, like mobile Home. */
export default function HomeScreen({onOpenCategory, onMenu, onOpenChat, unreadChatCount = 0}) {
  const projects = useFeaturedProjects();
  const {topBroker, topProfessional} = useHomeProfessionals();
  const storyRings = useHomeStories();
  /** Viewer only: rings that still have slides from the last 24h (strip still shows everyone). */
  const liveStoryRings = useMemo(() => ringsWithLiveStories(storyRings), [storyRings]);
  const {currentUser} = useSession();
  const [piAiOpen, setPiAiOpen] = useState(false);
  const aiSlide = useSlidePresence(piAiOpen);
  const [piAiDraft, setPiAiDraft] = useState('');
  const [piAiQuery, setPiAiQuery] = useState('');
  const piAiKind = inferPiAiKind(piAiQuery);
  const piAiSearch = usePiAiSearch(piAiKind === 'listings' ? piAiQuery : '');
  const piAiProSearch = usePiAiProfessionals(piAiKind === 'professionals' ? piAiQuery : '');
  const piAiActiveSearch = piAiKind === 'professionals' ? piAiProSearch : piAiSearch;
  const piAiItems = useMemo(
    () => piAiSearch.rows.filter(row => !isFeedPost(row)).map(toFeedItem),
    [piAiSearch.rows],
  );
  const piAiPros = piAiProSearch.rows;
  const piAiResults = Boolean(piAiQuery.trim());
  const stageRef = useRef(null);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || piAiResults) return undefined;
    let frame = 0;
    const fit = () => {
      stage.querySelectorAll('[data-home-fit]').forEach(node => {
        node.style.height = '';
        node.style.transform = '';
        const have = node.clientHeight;
        const need = node.scrollHeight;
        if (!(have > 0) || need <= have + 1) return;
        const z = have / need;
        node.style.height = `${(need / have) * 100}%`;
        node.style.transformOrigin = node.dataset.homeEdge === 'left' ? 'top left' : 'top right';
        node.style.transform = `scale(${z})`;
      });
    };
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    });
    ro.observe(stage);
    fit();
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [piAiResults]);
  const [qrOpen, setQrOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [directoryTypes, setDirectoryTypes] = useState([]);
  const openDirectory = (types = []) => {
    setDirectoryTypes(Array.isArray(types) ? types : types ? [types] : []);
    setDirectoryOpen(true);
  };
  const closeDirectory = () => {
    setDirectoryOpen(false);
    setDirectoryTypes([]);
  };
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [storyId, setStoryId] = useState(null);
  const [piAiCollapsed, setPiAiCollapsed] = useState(false);
  const onOpenPiAi = () => {
    setPiAiCollapsed(false);
    setPiAiOpen(true);
  };
  const closePiAi = useCallback(() => setPiAiOpen(false), []);
  const collapsePiAi = useCallback(() => setPiAiCollapsed(true), []);
  const aiPanelShown = aiSlide.shown && !piAiCollapsed;
  const aiTabShown = aiSlide.shown && piAiCollapsed;
  const aiWasMounted = useRef(false);
  useEffect(() => {
    if (aiWasMounted.current && !aiSlide.mounted) {
      setPiAiDraft('');
      setPiAiQuery('');
      setPiAiCollapsed(false);
    }
    aiWasMounted.current = aiSlide.mounted;
  }, [aiSlide.mounted]);
  const openCategoryFromAi = id => {
    closePiAi();
    onOpenCategory?.(id);
  };
  const nav = useProfileNav();
  const openPro = pro => nav.open(directoryProfilePayload(pro.raw));
  const openProject = project => nav.open(featuredProjectProfilePayload(project.raw));

  const messageProfessional = item => {
    onOpenChat?.({
      email: item.email || null,
      subscriptionId: item.id || null,
      name: item.display_name || item.name || 'משתמש',
      profileImageUrl: item.profile_image_url || null,
    });
  };

  return (
    <div className={styles.screen}>
      <div className={styles.stage} ref={stageRef}>
        {!piAiResults ? (
          <div className={styles.backdrop} aria-hidden>
            <div className={styles.backdropImage}>
              <img src={imgBackdrop} alt="" />
            </div>
            <div className={styles.backdropFade} />
          </div>
        ) : null}

        <TopBar
          selectedCategory={null}
          onSelectCategory={openCategoryFromAi}
          onHome={closePiAi}
          onMenu={onMenu}
        />

        {piAiResults ? (
          <div className={piAiCollapsed ? `${styles.aiResults} ${styles.aiResultsFull}` : styles.aiResults}>
            {piAiActiveSearch.status === 'loading' ? (
              <p className={styles.aiStatus} dir="auto">
                {piAiActiveSearch.message || 'מחפש עבורך…'}
              </p>
            ) : null}
            {piAiActiveSearch.status === 'ready' &&
            (piAiKind === 'professionals' ? piAiPros.length : piAiItems.length) === 0 ? (
              <p className={styles.aiStatus} dir="auto">
                {piAiKind === 'professionals' ? 'לא נמצאו בעלי מקצוע תואמים' : 'לא נמצאו מודעות תואמות'}
              </p>
            ) : null}
            {piAiKind === 'professionals' ? (
              <div className={styles.aiProGrid}>
                {piAiPros.map(item => (
                  <AiProfessionalCard
                    key={item.id}
                    item={item}
                    onOpen={() => nav.open(directoryProfilePayload(item))}
                    onMessage={messageProfessional}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.aiGrid}>
                {piAiItems.map(item => (
                  <PiAiListingCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        ) : (
        <>
        <div className={styles.canvas}>
        <FeaturedProject
          projects={projects}
          onOpen={() => setProjectsOpen(true)}
          onOpenProject={openProject}
          active={nav.active && !directoryOpen && !projectsOpen && !piAiOpen && !storyId}
          qrOpen={qrOpen}
          onQrOpen={() => setQrOpen(true)}
          onQrClose={() => setQrOpen(false)}
        />

        <div className={styles.leftColumn}>
          <div className={styles.colFit} data-home-fit="" data-home-edge="left">
          <button type="button" className={styles.piAiPill} aria-label="Pi AI" onClick={onOpenPiAi}>
            <img src={imgPiAiLogo} alt="" width={87} height={35} />
          </button>
          <div className={styles.promo}>
            <div className={styles.promoText}>
              <p className={styles.promoTitle} dir="auto">
                <span className={styles.promoAccent}>התנסו בחוויית החיפוש החדשה של </span>
                <span>פאי 2701</span>
              </p>
              <button type="button" className={styles.promoButton} onClick={() => setQrOpen(true)} dir="auto">
                לאפליקציה
              </button>
            </div>
            <PiAiMascot />
          </div>
          <TopRatedCard entry={topProfessional} side="left" onOpenPro={openPro} />
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.colFit} data-home-fit="" data-home-edge="right">
          <button
            type="button"
            className={styles.chatPill}
            aria-label={unreadChatCount > 0 ? `PiChat, ${unreadChatCount} הודעות חדשות` : 'PiChat'}
            onClick={onOpenChat}>
            <PiChatMark unread={unreadChatCount > 0} />
          </button>
          <ProPromo onOpen={type => openDirectory([type])} />
          <TopRatedCard entry={topBroker} side="right" onOpenPro={openPro} />
          </div>
        </div>
        </div>

        <ProsStrip
          pros={storyRings.filter(ring => ring.display_name).map(ring => ({
            id: String(ring.subscription_id),
            name: ring.display_name || '',
            profession: STORY_TYPE_LABEL[String(ring.subscription_type || '').toLowerCase()] || '',
            image: ring.profile_image_url || null,
            video: storyRingVideoUri(ring),
          }))}
          onOpenPro={pro => {
            const id = String(pro?.id || '');
            if (!id || liveStoryRings.length === 0) return;
            const own = liveStoryRings.find(ring => String(ring.subscription_id) === id);
            // No live story: always the first story in the viewer, not the next circle along the strip.
            setStoryId(String((own || liveStoryRings[0]).subscription_id));
          }}
          onOpenDirectory={() => openDirectory()}
        />
        </>
        )}
      </div>
      {aiSlide.mounted ? (
        <div className={styles.aiLayer}>
          <div
            className={aiTabShown ? `${styles.aiTab} ${styles.aiTabShown}` : styles.aiTab}
            aria-hidden={!aiTabShown}
            inert={!aiTabShown}>
            <button type="button" className={styles.aiTabOpen} aria-label="פתח את חלון Pi AI" title="פתח את חלון ה־AI" onClick={() => setPiAiCollapsed(false)}>
              <img src={imgPiAiLogo} alt="" width={87} height={35} />
              <img className={styles.aiTabChevron} src={iconAiChevron} alt="" width={7.67085} height={12.5133} />
            </button>
            <span className={styles.aiTabLine} aria-hidden />
            <button type="button" className={styles.aiTabExit} aria-label="יציאה מ־Pi AI" title="יציאה מ־Pi AI" onClick={closePiAi}>
              <img src={iconAiClose} alt="" width={24} height={24} />
            </button>
          </div>
          <PiAiPanel
            shown={aiPanelShown}
            onCollapse={collapsePiAi}
            draft={piAiDraft}
            setDraft={setPiAiDraft}
            query={piAiQuery}
            search={piAiActiveSearch}
            resultCount={piAiKind === 'professionals' ? piAiPros.length : piAiItems.length}
            kind={piAiKind}
            onSearch={setPiAiQuery}
            onClose={closePiAi}
          />
        </div>
      ) : null}
      {directoryOpen ? (
        <ProfessionalsDirectoryScreen
          currentUser={currentUser}
          initialTypes={directoryTypes}
          onClose={closeDirectory}
          onOpenProfessional={item => nav.open(directoryProfilePayload(item))}
          onMessage={messageProfessional}
        />
      ) : null}
      {projectsOpen ? <SelectedProjectsScreen onClose={() => setProjectsOpen(false)} /> : null}
      {storyId && liveStoryRings.length > 0 ? (
        <StoryScreen
          rings={liveStoryRings}
          subscriptionId={storyId}
          onClose={() => setStoryId(null)}
          onOpenProfile={ring => {
            setStoryId(null);
            const payload = directoryProfilePayload({
              id: ring.subscription_id,
              display_name: ring.display_name,
              name: ring.display_name,
              profile_image_url: ring.profile_image_url,
              subscription_type: ring.subscription_type,
            });
            nav.open({
              ...payload,
              subscription_type: ring.subscription_type || payload.subscription_type,
            });
          }}
        />
      ) : null}
    </div>
  );
}
