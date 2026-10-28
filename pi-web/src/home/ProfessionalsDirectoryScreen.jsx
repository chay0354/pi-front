import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {mdiChevronLeft, mdiMagnify, mdiTuneVertical, mdiVolumeHigh, mdiVolumeOff} from '@mdi/js';
import MdiIcon from '../publish/MdiIcon';
import {mobileAsset} from '../publish/lib/publishRules';
import {getProfessionalsDirectory, toSubscriptionId} from '../api/client';
import {getProfessionalSpecializationsForTypes} from '../account/constants';
import {PiRatingBadge, ProfileAvatar} from '../profile/ProfileParts';
import {isHlsUri, muxThumbnailUri, resolveAdVideoUri} from '../profile/lib/videoPlayback';
import FeedArrows from '../components/FeedArrows';
import styles from './ProfessionalsDirectoryScreen.module.css';

const FEED_SCROLL_PAD = 24;

const FILTER_TYPES = ['תיווך', 'עורך דין', 'עיצוב פנים', 'יועץ משכנתאות', 'שמאות', 'אדריכלות', 'מלווה משקיעים'];
const TYPE_ALIASES = {
  תיווך: ['תיווך'],
  'עורך דין': ['עורך דין', 'עו"ד', 'עו״ד'],
  'עיצוב פנים': ['עיצוב פנים'],
  'יועץ משכנתאות': ['יועץ משכנתאות', 'ייעוץ משכנתאות'],
  שמאות: ['שמאות'],
  אדריכלות: ['אדריכלות'],
  'מלווה משקיעים': ['מלווה משקיעים'],
};

const sortNone = mobileAsset('profile/2-arows.png');
const sortUp = mobileAsset('profile/arow-up.png');
const sortDown = mobileAsset('profile/arow-down.png');
const viewCardsIcon = mobileAsset('swipereight.png');
const viewListIcon = mobileAsset('swiperleft.png');
const locationIcon = mobileAsset('pros/location-pro.png');
const messageButton = mobileAsset('pros/pro-messges.png');

const isBroker = item => String(item?.subscription_type || '').trim().toLowerCase() === 'broker';

const asTagList = value => {
  if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return asTagList(parsed);
    } catch {
      /* plain label */
    }
    return [raw];
  }
  return [];
};

const cleanTagList = list =>
  asTagList(list)
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .slice(0, 3);

const collectTypes = item => (isBroker(item) ? ['תיווך'] : asTagList(item?.types));
const collectTags = item => cleanTagList(item?.specializations);
const collectRegionTags = item => {
  if (!isBroker(item)) return [];
  const specs = new Set(cleanTagList(item?.specializations));
  return cleanTagList(item?.activity_regions).filter(v => !specs.has(v));
};

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

/** Chrome cannot play Mux HLS. Use the uploaded file there so the card still starts. */
const resolveVideoUri = item => {
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

const normalize = value =>
  String(value || '')
    .toLowerCase()
    .replace(/[״"׳']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const matches = (haystack, query) => {
  const q = normalize(query);
  if (!q) return true;
  const hay = normalize(haystack);
  return q.split(' ').every(token => hay.includes(token));
};

const typeMatches = (filterType, itemTypes) => {
  const aliases = TYPE_ALIASES[filterType] || [filterType];
  const set = new Set(itemTypes);
  return aliases.some(alias => set.has(alias));
};

const ratingValue = value => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 5;
};

function TagRow({tags, list = false}) {
  if (!tags.length) return null;
  return (
    <div className={list ? styles.listTags : styles.tags}>
      {tags.map(tag => (
        <span key={tag} className={list ? styles.listChip : styles.chip}>
          {tag}
        </span>
      ))}
    </div>
  );
}

const proTitle = item => String(item?.display_name || (isBroker(item) ? 'תיווך' : 'בעל מקצוע')).trim();
const proPoster = (item, videoUri) => (videoUri && muxThumbnailUri(videoUri, {width: 720, time: 0})) || item?.profile_image_url || '';

/** Regular view: one feed-sized card per professional, like the TikTok feed column. */
function ProfessionalCard({item, own, active, muted, onToggleMute, onOpen, onMessage}) {
  const videoUri = resolveVideoUri(item);
  const poster = proPoster(item, videoUri);
  const title = proTitle(item);
  const address = String(item?.address || '').trim();
  const description = String(item?.bio || '').trim();
  const types = collectTypes(item);
  const tags = [...collectTags(item), ...collectRegionTags(item)].slice(0, 5);
  const videoRef = useRef(null);
  useEffect(() => {
    const node = videoRef.current;
    if (!node) return undefined;
    if (!active) {
      node.pause();
      return undefined;
    }
    node.muted = muted;
    const start = () => {
      const play = node.play?.();
      if (play && typeof play.catch === 'function') {
        play.catch(() => {
          if (node.muted) return;
          node.muted = true;
          node.play?.().catch(() => {});
        });
      }
    };
    start();
    node.addEventListener('loadeddata', start);
    return () => node.removeEventListener('loadeddata', start);
  }, [active, muted, videoUri]);

  return (
    <article className={styles.feedCard} data-pro-id={item.id} aria-label={title}>
      <header className={styles.feedTop}>
        <PiRatingBadge rating={ratingValue(item.average_rating)} variant="listing" />
        <button type="button" className={styles.feedIdentity} onClick={onOpen}>
          <span className={styles.feedIdentityText}>
            <span className={styles.feedName}>{title}</span>
            {types.length ? <span className={styles.feedTypes}>{types.join(' · ')}</span> : null}
          </span>
          <ProfileAvatar uri={item.profile_image_url} name={title} size={52} subscriptionType={isBroker(item) ? 'broker' : 'professional'} />
        </button>
      </header>

      <div className={styles.feedMedia}>
        {poster ? <img className={styles.feedBlur} src={poster} alt="" /> : null}
        {videoUri ? (
          <video
            ref={videoRef}
            className={styles.feedMediaFit}
            src={videoUri}
            muted={muted}
            loop
            playsInline
            preload={active ? 'auto' : 'metadata'}
            poster={poster || undefined}
          />
        ) : poster ? (
          <img className={styles.feedMediaFit} src={poster} alt="" />
        ) : (
          <span className={styles.feedNoMedia} />
        )}
        <button type="button" className={styles.mediaOpen} aria-label={title} onClick={onOpen} />
        {videoUri ? (
          <button type="button" className={styles.mute} aria-label={muted ? 'הפעל קול' : 'השתק'} onClick={onToggleMute}>
            <MdiIcon path={muted ? mdiVolumeOff : mdiVolumeHigh} size={26} color="#fff" />
          </button>
        ) : null}
      </div>

      <footer className={styles.feedBottom}>
        <button type="button" className={styles.feedMessage} aria-label="הודעה" disabled={own} onClick={onMessage}>
          <img src={messageButton} alt="" />
        </button>
        <button type="button" className={styles.feedDetails} onClick={onOpen}>
          {address && !isBroker(item) ? (
            <span className={styles.address}>
              <span>{address}</span>
              <img src={locationIcon} alt="" />
            </span>
          ) : null}
          <TagRow tags={tags} />
          {description ? <span className={styles.bio}>{description}</span> : null}
        </button>
      </footer>
    </article>
  );
}

/** Small view: the 3-per-row grid card from the feed's grid mode. */
function ProfessionalGridCard({item, onOpen}) {
  const videoUri = resolveVideoUri(item);
  const poster = proPoster(item, videoUri);
  const title = proTitle(item);
  const address = String(item?.address || '').trim();
  const types = collectTypes(item);
  const tags = [...collectTags(item), ...collectRegionTags(item)].slice(0, 3);
  return (
    <article
      className={styles.gridCard}
      role="button"
      tabIndex={0}
      aria-label={title}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        onOpen?.();
      }}>
      <div className={styles.gridMedia}>
        {poster ? <img className={styles.gridPhoto} src={poster} alt="" loading="lazy" /> : <span className={styles.feedNoMedia} />}
        <span className={styles.gridShade} aria-hidden />
        <span className={styles.gridAvatar}>
          <ProfileAvatar uri={item.profile_image_url} name={title} size={54} subscriptionType={isBroker(item) ? 'broker' : 'professional'} />
        </span>
        {videoUri ? <span className={styles.gridPlay} aria-hidden /> : null}
      </div>
      <div className={styles.gridContent}>
        <div className={styles.gridTopRow}>
          <span className={styles.gridRating}>
            <PiRatingBadge rating={ratingValue(item.average_rating)} variant="listing" />
          </span>
          {types[0] ? <span className={styles.gridType}>{types[0]}</span> : null}
        </div>
        <p className={styles.gridTitle}>{title}</p>
        {address && !isBroker(item) ? (
          <p className={styles.gridAddress}>
            <span>{address}</span>
            <img src={locationIcon} alt="" />
          </p>
        ) : null}
        <TagRow tags={tags} list />
      </div>
    </article>
  );
}

export default function ProfessionalsDirectoryScreen({
  currentUser,
  onClose,
  onOpenProfessional,
  onMessage,
  initialTypes = [],
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [professionals, setProfessionals] = useState([]);
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftLocation, setDraftLocation] = useState('');
  const [draftTypes, setDraftTypes] = useState([]);
  const [draftSpecs, setDraftSpecs] = useState([]);
  const [location, setLocation] = useState('');
  const [types, setTypes] = useState(() => (Array.isArray(initialTypes) ? initialTypes.filter(Boolean) : []));
  const [specs, setSpecs] = useState([]);
  const [sort, setSort] = useState('none');
  const [view, setView] = useState('cards');
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const listRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getProfessionalsDirectory()
      .then(res => setProfessionals(Array.isArray(res?.professionals) ? res.professionals : []))
      .catch(e => setError(e?.message || 'טעינה נכשלה'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      if (filtersOpen) setFiltersOpen(false);
      else onClose?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [filtersOpen, onClose]);

  const specOptions = useMemo(() => getProfessionalSpecializationsForTypes(draftTypes), [draftTypes]);
  const filtered = useMemo(() => {
    const base = professionals.filter(item => {
      const itemTypes = collectTypes(item);
      const tags = [...asTagList(item?.specializations), ...asTagList(item?.activity_regions)];
      const haystack = [item?.display_name, item?.address, item?.bio, isBroker(item) ? 'תיווך' : '', ...tags, ...itemTypes].join(' ');
      if (!matches(haystack, query)) return false;
      if (location) {
        const locHay = [item?.address, item?.display_name, item?.bio, ...tags].join(' ');
        if (!matches(locHay, location)) return false;
      }
      if (types.length && !types.some(filterType => typeMatches(filterType, itemTypes))) return false;
      if (specs.length) {
        const set = new Set(asTagList(item?.specializations));
        if (!specs.some(tag => set.has(tag))) return false;
      }
      return true;
    });
    if (sort === 'none') return base;
    return [...base].sort((a, b) =>
      sort === 'desc' ? ratingValue(b.average_rating) - ratingValue(a.average_rating) : ratingValue(a.average_rating) - ratingValue(b.average_rating),
    );
  }, [professionals, query, location, types, specs, sort]);

  useEffect(() => {
    listRef.current?.scrollTo({top: 0});
    setActiveIndex(0);
  }, [view, filtered]);

  const scrollToIndex = useCallback(
    index => {
      const root = listRef.current;
      if (!root) return;
      const clamped = Math.max(0, Math.min(filtered.length - 1, index));
      const card = root.querySelectorAll(':scope > article')[clamped];
      if (card) root.scrollTo({top: Math.max(0, card.offsetTop - FEED_SCROLL_PAD), behavior: 'smooth'});
    },
    [filtered.length],
  );

  const onFeedScroll = event => {
    const root = event.currentTarget;
    const y = root.scrollTop + FEED_SCROLL_PAD;
    let index = 0;
    root.querySelectorAll(':scope > article').forEach((card, i) => {
      if (card.offsetTop <= y + card.offsetHeight * 0.35) index = i;
    });
    setActiveIndex(prev => (prev === index ? prev : index));
  };

  useEffect(() => {
    if (view !== 'cards' || filtersOpen) return undefined;
    const onKey = event => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        scrollToIndex(activeIndex - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, filtersOpen, activeIndex, scrollToIndex]);

  const myId = toSubscriptionId(currentUser?.id || currentUser?.subscription_id);
  const filtersOn = Boolean(location || types.length || specs.length);
  const sortImage = sort === 'none' ? sortNone : sort === 'desc' ? sortUp : sortDown;
  const sortLabel = sort === 'none' ? 'מיין לפי דירוג' : sort === 'desc' ? 'ממוין לפי דירוג גבוה לנמוך' : 'ממוין לפי דירוג נמוך לגבוה';

  const statusRow = (
    <>
      {loading ? (
        <p className={styles.status}>
          <span className={styles.spinner} />
        </p>
      ) : null}
      {error ? (
        <p className={styles.status}>
          {error}
          <button type="button" className={styles.retry} onClick={load}>
            נסה שוב
          </button>
        </p>
      ) : null}
      {!loading && !error && filtered.length === 0 ? <p className={styles.status}>לא נמצאו בעלי מקצוע</p> : null}
    </>
  );

  const toggleDraft = (value, kind) => {
    if (kind === 'type') {
      setDraftTypes(prev => {
        const next = prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value];
        const valid = new Set(getProfessionalSpecializationsForTypes(next));
        setDraftSpecs(prevSpecs => prevSpecs.filter(spec => valid.has(spec)));
        return next;
      });
      return;
    }
    setDraftSpecs(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]));
  };

  const openFilters = () => {
    setDraftLocation(location);
    setDraftTypes(types);
    setDraftSpecs(specs);
    setFiltersOpen(true);
  };

  return (
    <div className={styles.screen} dir="rtl" role="dialog" aria-label="בעלי מקצוע בתחום הנדל״ן" data-account-modal="">
        <header className={styles.top}>
          <div className={styles.titleRow}>
            <button type="button" className={styles.back} aria-label="חזרה" onClick={onClose}>
              <MdiIcon path={mdiChevronLeft} size={36} color="#fff" />
            </button>
            <h1>בעלי מקצוע בתחום הנדל״ן</h1>
          </div>
          <div className={styles.search}>
            <span className={styles.searchGroup}>
              <input value={query} placeholder="סוג, שם העסק, התמחות, עיר" onChange={event => setQuery(event.target.value)} />
              <MdiIcon path={mdiMagnify} size={29} color="rgba(255,255,255,0.55)" />
            </span>
            <button
              type="button"
              className={styles.filterBtn}
              aria-label={filtersOn ? 'סינון פעיל — פתח הגדרות חיפוש' : 'פתח הגדרות חיפוש'}
              onClick={openFilters}>
              <MdiIcon path={mdiTuneVertical} size={29} color="#fff" />
              {filtersOn ? <span className={styles.dot} /> : null}
            </button>
          </div>
          <div className={styles.controls}>
            <button type="button" className={styles.sort} aria-label={sortLabel} onClick={() => setSort(prev => (prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none'))}>
              <img src={sortImage} alt="" />
            </button>
            <button
              type="button"
              className={styles.viewToggle}
              aria-label={view === 'cards' ? 'תצוגה קטנה' : 'תצוגה רגילה'}
              onClick={() => setView(prev => (prev === 'cards' ? 'list' : 'cards'))}>
              <img src={view === 'cards' ? viewCardsIcon : viewListIcon} alt="" />
            </button>
          </div>
        </header>

        {view === 'list' ? (
          <div className={styles.gridColumn} ref={listRef}>
            {statusRow}
            <div className={styles.grid}>
              {filtered.map(item => (
                <ProfessionalGridCard key={item.id} item={item} onOpen={() => onOpenProfessional?.(item)} />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className={styles.feedColumn} ref={listRef} onScroll={onFeedScroll}>
              {statusRow}
              {filtered.map((item, i) => {
                const own = Boolean(myId && String(item.id) === String(myId));
                return (
                  <ProfessionalCard
                    key={item.id}
                    item={item}
                    own={own}
                    active={!filtersOpen && i === activeIndex}
                    muted={muted}
                    onToggleMute={() => setMuted(value => !value)}
                    onOpen={() => onOpenProfessional?.(item)}
                    onMessage={() => {
                      if (!own) onMessage?.(item);
                    }}
                  />
                );
              })}
            </div>
            {filtered.length > 1 ? (
              <div className={styles.arrows}>
                <FeedArrows
                  canPrev={activeIndex > 0}
                  canNext={activeIndex < filtered.length - 1}
                  onPrev={() => scrollToIndex(activeIndex - 1)}
                  onNext={() => scrollToIndex(activeIndex + 1)}
                />
              </div>
            ) : null}
          </>
        )}

        {filtersOpen ? (
          <div className={styles.settings}>
            <div className={styles.settingsTop}>
              <div className={styles.titleRow}>
                <button type="button" className={styles.settingsBack} aria-label="חזרה" onClick={() => setFiltersOpen(false)}>
                  <MdiIcon path={mdiChevronLeft} size={36} color="#fff" />
                </button>
                <h2>הגדרות חיפוש</h2>
              </div>
            </div>
            <div className={styles.settingsBody}>
              <section className={styles.settingsSection}>
                <h3>מיקום</h3>
                <input value={draftLocation} onChange={event => setDraftLocation(event.target.value)} />
              </section>
              <section className={styles.settingsSection}>
                <h3>סוג</h3>
                <div className={styles.settingsChips}>
                  {FILTER_TYPES.map(type => (
                    <button key={type} type="button" className={draftTypes.includes(type) ? styles.settingsChipOn : styles.settingsChip} onClick={() => toggleDraft(type, 'type')}>
                      {type}
                    </button>
                  ))}
                </div>
              </section>
              <section className={styles.settingsSection}>
                <h3>התמחות</h3>
                {draftTypes.length === 0 ? (
                  <p>בחר סוג כדי לראות התמחויות רלוונטיות</p>
                ) : (
                  <div className={styles.settingsChips}>
                    {specOptions.map(spec => (
                      <button key={spec} type="button" className={draftSpecs.includes(spec) ? styles.settingsChipOn : styles.settingsChip} onClick={() => toggleDraft(spec, 'spec')}>
                        {spec}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
            <div className={styles.settingsFoot}>
              <button
                type="button"
                className={styles.searchApply}
                onClick={() => {
                  setLocation(draftLocation.trim());
                  setTypes(draftTypes);
                  setSpecs(draftSpecs);
                  setFiltersOpen(false);
                }}>
                שמור
              </button>
              <button
                type="button"
                className={styles.clear}
                onClick={() => {
                  setDraftLocation('');
                  setDraftTypes([]);
                  setDraftSpecs([]);
                  setLocation('');
                  setTypes([]);
                  setSpecs([]);
                }}>
                נקה תוצאות
              </button>
            </div>
          </div>
        ) : null}
    </div>
  );
}
