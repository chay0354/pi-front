import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {getListings} from '../api/client';
import FeedCard from '../components/FeedCard';
import GridCard from '../components/GridCard';
import {toFeedItem} from '../feed/listingRules';
import {Icon, ProfileAvatar} from './ProfileParts';
import {getPiReviewStarSource} from './lib/piRatingBadgeAssets';
import {reviewHasStarRating} from './lib/listingGridCardFigma';
import {isPostListingRecord} from './lib/pickTopViewedListingForProfile';
import styles from './ProfileSubviews.module.css';

export const formatReviewDate = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
};

function useEscape(onClose, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = e => {
      if (e.key !== 'Escape' || document.querySelector('[data-account-modal]')) return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, enabled]);
}

function SubviewShell({title, onClose, children, active}) {
  useEscape(onClose, active);
  return (
    <div className={styles.shell} role="dialog" aria-label={title}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={onClose} aria-label="חזרה">
          <Icon name="chevron-left" size={34} />
        </button>
        <h1 className={styles.title}>{title}</h1>
        <span className={styles.headerSpacer} />
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  );
}

/** Mobile ProfileReviewsScreen — the full list behind "קרא עוד". */
export function ReviewsListView({reviews, variant, onClose, active}) {
  const comments = variant === 'comments';
  const list = Array.isArray(reviews) ? reviews : [];
  return (
    <SubviewShell
      title={comments ? `תגובות (${list.length})` : `ביקורות (${list.length})`}
      onClose={onClose}
      active={active}>
      <div className={styles.reviews}>
        {list.length === 0 ? (
          <p className={styles.empty}>{comments ? 'אין תגובות' : 'אין ביקורות'}</p>
        ) : (
          list.map((r, i) => (
            <article key={r.id ?? i} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <span className={styles.reviewAvatar}>
                  <ProfileAvatar uri={r.reviewer_image_url || undefined} size={72} subscriptionType={r.reviewer_subscription_type} />
                  {!comments && reviewHasStarRating(r) ? (
                    <img
                      className={styles.reviewStar}
                      src={getPiReviewStarSource(Math.min(5, Math.max(1, Number(r.rating) || 1)))}
                      alt=""
                    />
                  ) : null}
                </span>
                <span className={styles.reviewMeta}>
                  <span className={styles.reviewName}>{r.reviewer_name || 'משתמש'}</span>
                  <span className={styles.reviewDate}>{formatReviewDate(r.created_at)}</span>
                </span>
              </div>
              {r.comment ? <p className={styles.reviewBody}>{r.comment}</p> : null}
            </article>
          ))
        )}
      </div>
    </SubviewShell>
  );
}

/** Mobile UserListingsScreen — "הנכסים שלי" grid of every ad (posts excluded). */
export function UserListingsView({subscriptionId, onClose, onOpenListing, active}) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!subscriptionId) {
      setListings([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    getListings({subscription_id: subscriptionId})
      .then(res => {
        if (cancelled) return;
        const rows = Array.isArray(res?.listings) ? res.listings : [];
        setListings(rows.filter(l => !isPostListingRecord(l)));
      })
      .catch(() => {
        if (!cancelled) setListings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subscriptionId]);
  const items = useMemo(() => listings.map(l => ({listing: l, item: toFeedItem(l)})), [listings]);
  return (
    <SubviewShell title="הנכסים שלי" onClose={onClose} active={active}>
      {loading ? (
        <p className={styles.empty}>טוען נכסים...</p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>אין נכסים להצגה</p>
      ) : (
        <div className={styles.grid}>
          {items.map(({listing, item}) => (
            <div key={item.id} className={styles.gridCell}>
              <GridCard item={item} onOpen={() => onOpenListing(listing)} />
            </div>
          ))}
        </div>
      )}
    </SubviewShell>
  );
}

const truncate = (s, max) => {
  const t = String(s).trim();
  return t.length <= max ? t : `${t.slice(0, Math.max(0, max - 1))}…`;
};

function projectTitle(item) {
  const pn = (item.project_name || item.projectName || '').trim();
  if (pn) return truncate(pn, 42);
  const d = (item.description || '').trim().replace(/\s+/g, ' ');
  if (d) return truncate(d, 42);
  const parts = [item.rooms != null ? `${item.rooms} חדרים` : null, item.area != null ? `${item.area} מ״ר` : null].filter(
    Boolean,
  );
  return parts.length ? parts.join(' · ') : 'שם הפרויקט';
}

function projectAddressLine(item) {
  const street = [item.address, item.land_address, item.search_address]
    .map(x => (x != null ? String(x).trim() : ''))
    .find(Boolean);
  const city =
    [item.search_city, item.city, item.filter_city].map(x => (x != null ? String(x).trim() : '')).filter(Boolean)[0] ||
    '';
  let line;
  if (street && city && !street.includes(city)) line = `${street}, ${city}`;
  else if (street) line = street;
  else if (city) line = city;
  else line = 'כתובת לא צוינה';
  return truncate(line, 52);
}

function projectImage(item) {
  const imgs = item.listing_images || [];
  const main = imgs.find(i => i.image_type === 'main' && i.image_url);
  if (main?.image_url) return main.image_url;
  const any = imgs.find(i => i.image_url);
  if (any?.image_url) return any.image_url;
  return item.main_image_url && String(item.main_image_url).trim() ? String(item.main_image_url).trim() : null;
}

/** Mobile CompanyProjectsScreen — header = company name; tiles = image + project name + address. */
export function CompanyProjectsView({companyId, companyName, onClose, onOpenListing, active}) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = useCallback(() => {
    if (!companyId) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getListings({subscription_id: companyId, status: 'published'})
      .then(res => {
        const rows = Array.isArray(res?.listings) ? res.listings : [];
        setListings(rows.filter(l => !isPostListingRecord(l)));
      })
      .catch(e => {
        setError(e?.message || 'טעינה נכשלה');
        setListings([]);
      })
      .finally(() => setLoading(false));
  }, [companyId]);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <SubviewShell title={companyName || 'חברה'} onClose={onClose} active={active}>
      {loading ? (
        <div className={styles.centered}>
          <span className={styles.spinner} aria-label="טוען" />
        </div>
      ) : error ? (
        <div className={styles.centered}>
          <p className={styles.error}>{error}</p>
          <button type="button" className={styles.retry} onClick={load}>
            נסה שוב
          </button>
        </div>
      ) : listings.length === 0 ? (
        <p className={styles.empty}>אין מודעות להצגה</p>
      ) : (
        <div className={styles.projects}>
          {listings.map(item => {
            const uri = projectImage(item);
            return (
              <button key={item.id} type="button" className={styles.projectTile} onClick={() => onOpenListing(item)}>
                {uri ? (
                  <img className={styles.projectBg} src={uri} alt="" loading="lazy" />
                ) : (
                  <span className={`${styles.projectBg} ${styles.projectPlaceholder}`}>
                    <Icon name="image-outline" size={48} color="rgba(255,255,255,0.35)" />
                  </span>
                )}
                <span className={styles.projectDim} />
                <span className={styles.projectLabels}>
                  <span className={styles.projectTitle}>{projectTitle(item)}</span>
                  <span className={styles.projectAddress}>{projectAddressLine(item)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </SubviewShell>
  );
}

const FEED_SCROLL_PAD = 24;

/** Profile-scoped post feed (mobile TikTok feed limited to this profile, focused on the tapped post). */
export function ProfilePostsFeedView({listings, focusId, title, onClose, active}) {
  const items = useMemo(() => listings.map(l => ({...toFeedItem(l), isPost: true, company: null})), [listings]);
  const startIndex = Math.max(
    0,
    items.findIndex(it => it.id === String(focusId)),
  );
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const listRef = useRef(null);
  useEscape(onClose, active);

  useEffect(() => {
    const root = listRef.current;
    const card = root?.querySelectorAll(':scope > article')[startIndex];
    if (card) root.scrollTo({top: Math.max(0, card.offsetTop - FEED_SCROLL_PAD)});
    // Only on open: later scrolling is the user's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToIndex = useCallback(
    index => {
      const root = listRef.current;
      if (!root) return;
      const clamped = Math.max(0, Math.min(items.length - 1, index));
      const card = root.querySelectorAll(':scope > article')[clamped];
      if (card) root.scrollTo({top: Math.max(0, card.offsetTop - FEED_SCROLL_PAD), behavior: 'smooth'});
    },
    [items.length],
  );

  useEffect(() => {
    if (!active) return undefined;
    const onKey = e => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToIndex(activeIndex - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, activeIndex, scrollToIndex]);

  const onScroll = e => {
    const root = e.currentTarget;
    const y = root.scrollTop + FEED_SCROLL_PAD;
    let index = 0;
    root.querySelectorAll(':scope > article').forEach((card, i) => {
      if (card.offsetTop <= y + card.offsetHeight * 0.35) index = i;
    });
    setActiveIndex(prev => (prev === index ? prev : index));
  };

  return (
    <div className={styles.shell} role="dialog" aria-label={title}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={onClose} aria-label="חזרה">
          <Icon name="chevron-left" size={34} />
        </button>
        <h1 className={styles.title}>{title}</h1>
        <span className={styles.headerSpacer} />
      </header>
      <div className={styles.feed} ref={listRef} onScroll={onScroll}>
        {items.map((item, i) => (
          <FeedCard key={item.id} item={item} active={active && i === activeIndex} />
        ))}
      </div>
    </div>
  );
}

/** Mobile full-screen hero slider: close, contain-fit slides, "i / n" counter and dots. */
export function MediaViewer({slides, index, onIndex, onClose}) {
  const count = slides.length;
  const videoRefs = useRef([]);
  useEscape(onClose);
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowLeft') onIndex((index - 1 + count) % count);
      else if (e.key === 'ArrowRight') onIndex((index + 1) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, count, onIndex]);
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === index) {
        video.muted = false;
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      } else {
        video.pause();
      }
    });
  }, [index]);
  return (
    <div className={styles.viewer} role="dialog" aria-label="תמונות המודעה">
      <button type="button" className={styles.viewerClose} onClick={onClose} aria-label="סגור">
        <Icon name="close" size={30} />
      </button>
      <div className={styles.viewerTrack} style={{transform: `translateX(${-index * 100}%)`}}>
        {slides.map((slide, i) => (
          <div key={slide.isVideo ? `fs-video-${i}` : `fs-img-${i}-${slide.uri}`} className={styles.viewerSlide}>
            {slide.isVideo ? (
              <video
                ref={el => {
                  videoRefs.current[i] = el;
                }}
                className={styles.viewerMedia}
                src={slide.uri}
                poster={slide.posterUri || undefined}
                loop
                playsInline
              />
            ) : (
              <img className={styles.viewerMedia} src={slide.uri} alt="" />
            )}
          </div>
        ))}
      </div>
      {count > 1 ? (
        <>
          <button
            type="button"
            className={`${styles.viewerArrow} ${styles.viewerArrowPrev}`}
            onClick={() => onIndex((index - 1 + count) % count)}
            aria-label="הקודם">
            <Icon name="chevron-left" size={40} />
          </button>
          <button
            type="button"
            className={`${styles.viewerArrow} ${styles.viewerArrowNext}`}
            onClick={() => onIndex((index + 1) % count)}
            aria-label="הבא">
            <Icon name="chevron-right" size={40} />
          </button>
        </>
      ) : null}
      <p className={styles.viewerCounter} dir="ltr">
        {index + 1} / {count}
      </p>
      {count > 1 ? (
        <div className={styles.viewerDots} dir="ltr">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.viewerDot} ${i === index ? styles.viewerDotActive : ''}`}
              onClick={() => onIndex(i)}
              aria-label={`תמונה ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
