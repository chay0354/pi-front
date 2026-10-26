import {useCallback, useEffect, useRef, useState} from 'react';
import {mdiClose} from '@mdi/js';
import TopBar from '../components/TopBar';
import {PiRating} from '../components/FeedCard';
import VolumeIcon from '../components/VolumeIcon';
import PiAiPanel from '../components/PiAiPanel';
import {MortgageIcon, PiAiMascot, PiChatMark} from '../components/figma/home.generated';
import {useFeaturedProjects, useHomeProfessionals} from '../feed/useHome';
import {getStoriesFeed} from '../api/client';
import {useSession} from '../auth/session';
import ProfessionalsDirectoryScreen from '../home/ProfessionalsDirectoryScreen';
import SelectedProjectsScreen from '../home/SelectedProjectsScreen';
import StoryStrip from '../home/StoryStrip';
import StoryViewer from '../home/StoryViewer';
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
import imgStarBadge from '../assets/figma/home/80461.svg';
import imgDivider from '../assets/figma/home/e253b.svg';
import imgRingSmall from '../assets/figma/home/50d02.svg';
import imgRingLarge from '../assets/figma/home/ac0a7.svg';
import imgArrowLeft from '../assets/figma/home/2a8dc.svg';
import imgArrowRight from '../assets/figma/home/08530.svg';
import styles from './HomeScreen.module.css';

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

/** `ringOutset` is the ring SVG's overflow past its frame, in percent (Figma inset). */
function ProfilePic({src, size, ring, ringOutset = 0}) {
  const [failed, setFailed] = useState(false);
  const ringBox = `${100 + 2 * ringOutset}%`;
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
      <img
        className={styles.profilePhoto}
        src={src && !failed ? src : noProfileImage}
        alt=""
        onError={() => setFailed(true)}
      />
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
          {showingProject && project?.logo && (
            <span className={styles.projectLogo}>
              <img className={styles.projectLogoImage} src={project.logo} alt="" />
            </span>
          )}
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
      <ProfilePic src={pro.image} size={96} ring={imgRingLarge} ringOutset={1.72} />
      <p className={styles.proLabel} dir="auto">
        <span>{pro.name}</span>
        {pro.profession && <span>{pro.profession}</span>}
      </p>
    </button>
  );
}

/** Conveyor: the list is rendered twice and the track drifts rightward, wrapping after one copy. */
function ProsStrip({pros, onOpenPro, onOpenDirectory, rings, storiesLoading, onOpenRing}) {
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
        <StoryStrip rings={rings} loading={storiesLoading} onOpen={onOpenRing} />
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
      </div>
      <button type="button" className={`${styles.prosArrow} ${styles.prosArrowPrev}`} aria-label="הקודם" onClick={() => scrollBy(-1)}>
        <img src={imgArrowRight} alt="" width={36} height={36} />
      </button>
      <button type="button" className={`${styles.prosArrow} ${styles.prosArrowNext}`} aria-label="הבא" onClick={() => scrollBy(1)}>
        <img src={imgArrowLeft} alt="" width={16.5} height={24} />
      </button>
    </section>
  );
}

/** Home screen (Figma 244:33110) — shown before a category feed, like mobile Home. */
export default function HomeScreen({onOpenCategory, onMenu, onOpenChat, unreadChatCount = 0}) {
  const projects = useFeaturedProjects();
  const {pros, topBroker, topProfessional} = useHomeProfessionals();
  const {currentUser} = useSession();
  const [piAiOpen, setPiAiOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [storyRings, setStoryRings] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [viewerRing, setViewerRing] = useState(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const onOpenPiAi = () => setPiAiOpen(true);
  const closePiAi = useCallback(() => setPiAiOpen(false), []);
  const nav = useProfileNav();
  const openPro = pro => nav.open(directoryProfilePayload(pro.raw));
  const openProject = project => nav.open(featuredProjectProfilePayload(project.raw));

  const loadStories = useCallback(async () => {
    try {
      const res = await getStoriesFeed({limit: 80});
      if (res?.success === false || !Array.isArray(res?.rings)) return;
      setStoryRings(res.rings);
    } catch {
      /* keep the last good rings */
    } finally {
      setStoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const ringIndex = viewerRing
    ? storyRings.findIndex(ring => String(ring.subscription_id) === String(viewerRing.subscription_id))
    : -1;
  const prevStory = ringIndex > 0 ? storyRings.slice(0, ringIndex).reverse().find(ring => ring.slides?.length) : null;
  const nextStory = ringIndex >= 0 ? storyRings.slice(ringIndex + 1).find(ring => ring.slides?.length) : null;

  const openStoryProfile = ring => {
    if (!ring?.subscription_id) return;
    setViewerRing(null);
    nav.open({
      id: ring.subscription_id,
      subscription_id: ring.subscription_id,
      owner_id: ring.subscription_id,
      name: ring.display_name,
      display_name: ring.display_name,
      profile_image_url: ring.profile_image_url,
      subscription_type: ring.subscription_type,
    });
  };

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
      {piAiOpen && <PiAiPanel onClose={closePiAi} />}
      <div className={styles.stage}>
        <div className={styles.backdrop} aria-hidden>
          <div className={styles.backdropImage}>
            <img src={imgBackdrop} alt="" />
          </div>
          <div className={styles.backdropFade} />
        </div>

        <TopBar selectedCategory={null} onSelectCategory={onOpenCategory} onHome={() => {}} onMenu={onMenu} />

        <div className={styles.canvas}>
        <FeaturedProject
          projects={projects}
          onOpen={() => setProjectsOpen(true)}
          onOpenProject={openProject}
          active={nav.active && !viewerRing && !directoryOpen && !projectsOpen}
          qrOpen={qrOpen}
          onQrOpen={() => setQrOpen(true)}
          onQrClose={() => setQrOpen(false)}
        />

        <div className={styles.leftColumn}>
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

        <div className={styles.rightColumn}>
          <button
            type="button"
            className={styles.chatPill}
            aria-label={unreadChatCount > 0 ? `PiChat, ${unreadChatCount} הודעות חדשות` : 'PiChat'}
            onClick={onOpenChat}>
            <PiChatMark unread={unreadChatCount > 0} />
          </button>
          <div className={styles.mortgage}>
            <MortgageIcon />
            <p className={styles.mortgageText} dir="auto">
              מחפשים יועצי משכנתאות?
            </p>
          </div>
          <TopRatedCard entry={topBroker} side="right" onOpenPro={openPro} />
        </div>
        </div>

        <ProsStrip
          pros={pros}
          onOpenPro={openPro}
          onOpenDirectory={() => setDirectoryOpen(true)}
          rings={storyRings}
          storiesLoading={storiesLoading}
          onOpenRing={ring => ring?.slides?.length && setViewerRing(ring)}
        />
      </div>
      {viewerRing ? (
        <StoryViewer
          ring={viewerRing}
          prevRing={prevStory}
          nextRing={nextStory}
          onClose={() => {
            setViewerRing(null);
            loadStories();
          }}
          onNextUser={() => setViewerRing(nextStory || null)}
          onPrevUser={() => prevStory && setViewerRing(prevStory)}
          onOpenProfile={openStoryProfile}
        />
      ) : null}
      {directoryOpen ? (
        <ProfessionalsDirectoryScreen
          currentUser={currentUser}
          onClose={() => setDirectoryOpen(false)}
          onOpenProfessional={item => nav.open(directoryProfilePayload(item))}
          onMessage={messageProfessional}
        />
      ) : null}
      {projectsOpen ? <SelectedProjectsScreen onClose={() => setProjectsOpen(false)} /> : null}
    </div>
  );
}
