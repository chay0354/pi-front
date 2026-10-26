import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {mdiChevronLeft, mdiMagnify, mdiTuneVertical, mdiVolumeHigh, mdiVolumeOff} from '@mdi/js';
import MdiIcon from '../publish/MdiIcon';
import {mobileAsset} from '../publish/lib/publishRules';
import {getProfessionalsDirectory, toSubscriptionId} from '../api/client';
import {getProfessionalSpecializationsForTypes} from '../account/constants';
import {PiRatingBadge, ProfileAvatar} from '../profile/ProfileParts';
import {isHlsUri, muxThumbnailUri, resolveAdVideoUri} from '../profile/lib/videoPlayback';
import styles from './ProfessionalsDirectoryScreen.module.css';

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

function ProfessionalCard({item, own, active, muted, onToggleMute, onOpen, onMessage}) {
  const videoUri = resolveVideoUri(item);
  const photo = item?.profile_image_url || '';
  const poster = (videoUri && muxThumbnailUri(videoUri, {width: 480, time: 0})) || photo || '';
  const title = String(item?.display_name || (isBroker(item) ? 'תיווך' : 'בעל מקצוע')).trim();
  const address = String(item?.address || 'מיקום לא זמין').trim();
  const description = String(item?.bio || 'ללא תיאור').trim();
  const types = collectTypes(item);
  const tags = collectTags(item);
  const regions = collectRegionTags(item);
  const videoRef = useRef(null);
  useEffect(() => {
    const node = videoRef.current;
    if (!node || !active) return undefined;
    node.muted = muted;
    const start = () => {
      const play = node.play?.();
      if (play && typeof play.catch === 'function') play.catch(() => {});
    };
    start();
    node.addEventListener('loadeddata', start);
    return () => node.removeEventListener('loadeddata', start);
  }, [active, muted, videoUri]);

  return (
    <article className={styles.card} data-pro-id={item.id}>
      <div className={styles.media}>
        {videoUri && active ? (
          <video
            ref={videoRef}
            className={styles.mediaFill}
            src={videoUri}
            autoPlay
            muted={muted}
            loop
            playsInline
            preload="auto"
            poster={poster || undefined}
          />
        ) : poster ? (
          <img className={styles.mediaFill} src={poster} alt="" />
        ) : (
          <span className={`${styles.mediaFill} ${styles.mediaFallback}`} />
        )}
        <span className={styles.mediaShade} />
        <button type="button" className={styles.mediaOpen} aria-label={title} onClick={onOpen} />
        {videoUri && active ? (
          <button type="button" className={styles.mute} aria-label={muted ? 'הפעל קול' : 'השתק'} onClick={onToggleMute}>
            <MdiIcon path={muted ? mdiVolumeOff : mdiVolumeHigh} size={31} color="#fff" />
          </button>
        ) : null}
      </div>
      <div className={styles.cardBody}>
        <button type="button" className={styles.cardText} onClick={onOpen}>
          <span className={styles.cardHead}>
            <span className={styles.cardTitleCol}>
              <span className={styles.cardTitle}>{title}</span>
              <TagRow tags={types} />
              {isBroker(item) ? null : (
                <span className={styles.address}>
                  <img src={locationIcon} alt="" />
                  <span>{address}</span>
                </span>
              )}
            </span>
            <PiRatingBadge rating={ratingValue(item.average_rating)} variant="card" />
          </span>
          <span className={styles.tagGroup}>
            <TagRow tags={tags} />
            <TagRow tags={regions} />
          </span>
          <span className={styles.bio}>{description}</span>
        </button>
        <button type="button" className={styles.message} aria-label="הודעה" disabled={own} onClick={onMessage}>
          <img src={messageButton} alt="" />
        </button>
      </div>
    </article>
  );
}

function ProfessionalListCard({item, onOpen}) {
  const title = String(item?.display_name || (isBroker(item) ? 'תיווך' : 'בעל מקצוע')).trim();
  const address = String(item?.address || 'מיקום לא זמין').trim();
  return (
    <article className={styles.listCard}>
      <button type="button" className={styles.listHit} onClick={onOpen}>
        <span className={styles.listTop}>
          <ProfileAvatar uri={item.profile_image_url} name={title} size={101} subscriptionType={isBroker(item) ? 'broker' : 'professional'} />
          <span className={styles.listInfo}>
            <span className={styles.listTitleRow}>
              <span className={styles.listTitleCol}>
                <span className={styles.listTitle}>{title}</span>
                <TagRow tags={collectTypes(item)} list />
              </span>
              <PiRatingBadge rating={ratingValue(item.average_rating)} variant="list" />
            </span>
            {isBroker(item) ? null : (
              <span className={styles.listAddress}>
                <img src={locationIcon} alt="" />
                <span>{address}</span>
              </span>
            )}
          </span>
        </span>
        <span className={styles.tagGroup}>
          <TagRow tags={collectTags(item)} list />
          <TagRow tags={collectRegionTags(item)} list />
        </span>
      </button>
    </article>
  );
}

export default function ProfessionalsDirectoryScreen({currentUser, onClose, onOpenProfessional, onMessage}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [professionals, setProfessionals] = useState([]);
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftLocation, setDraftLocation] = useState('');
  const [draftTypes, setDraftTypes] = useState([]);
  const [draftSpecs, setDraftSpecs] = useState([]);
  const [location, setLocation] = useState('');
  const [types, setTypes] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [sort, setSort] = useState('none');
  const [view, setView] = useState('cards');
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const [unmutedId, setUnmutedId] = useState(null);
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
    const root = listRef.current;
    if (view !== 'cards' || !root) {
      setVisibleIds(new Set());
      return undefined;
    }
    const ratios = new Map();
    const pick = () => {
      const next = new Set();
      ratios.forEach((ratio, id) => {
        if (id && ratio >= 0.45) next.add(String(id));
      });
      setVisibleIds(prev => {
        if (prev.size === next.size && [...next].every(id => prev.has(id))) return prev;
        return next;
      });
    };
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          ratios.set(entry.target.getAttribute('data-pro-id'), entry.intersectionRatio);
        });
        pick();
      },
      {root, threshold: [0, 0.45, 0.75, 1]},
    );
    root.querySelectorAll('[data-pro-id]').forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [view, filtered]);

  const myId = toSubscriptionId(currentUser?.id || currentUser?.subscription_id);
  const filtersOn = Boolean(location || types.length || specs.length);
  const sortImage = sort === 'none' ? sortNone : sort === 'desc' ? sortUp : sortDown;
  const sortLabel = sort === 'none' ? 'מיין לפי דירוג' : sort === 'desc' ? 'ממוין לפי דירוג גבוה לנמוך' : 'ממוין לפי דירוג נמוך לגבוה';

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
              aria-label={view === 'cards' ? 'תצוגת רשימה' : 'תצוגת כרטיסים'}
              onClick={() => {
                setUnmutedId(null);
                setVisibleIds(new Set());
                setView(prev => (prev === 'cards' ? 'list' : 'cards'));
              }}>
              <img src={view === 'cards' ? viewCardsIcon : viewListIcon} alt="" />
            </button>
          </div>
        </header>

        <div className={styles.list} ref={listRef}>
          {loading ? <p className={styles.status}><span className={styles.spinner} /></p> : null}
          {error ? (
            <p className={styles.status}>
              {error}
              <button type="button" className={styles.retry} onClick={load}>נסה שוב</button>
            </p>
          ) : null}
          {!loading && !error && filtered.length === 0 ? <p className={styles.status}>לא נמצאו בעלי מקצוע</p> : null}
          {filtered.map(item => {
            const own = Boolean(myId && String(item.id) === String(myId));
            if (view === 'list') {
              return <ProfessionalListCard key={item.id} item={item} onOpen={() => onOpenProfessional?.(item)} />;
            }
            return (
              <ProfessionalCard
                key={item.id}
                item={item}
                own={own}
                active={visibleIds.has(String(item.id))}
                muted={String(unmutedId) !== String(item.id)}
                onToggleMute={() => setUnmutedId(prev => (String(prev) === String(item.id) ? null : item.id))}
                onOpen={() => onOpenProfessional?.(item)}
                onMessage={() => {
                  if (!own) onMessage?.(item);
                }}
              />
            );
          })}
        </div>

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
