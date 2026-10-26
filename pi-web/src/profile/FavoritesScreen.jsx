import {useCallback, useEffect, useRef, useState} from 'react';
import {mdiChevronLeft, mdiHeart, mdiHeartOffOutline, mdiImageOutline, mdiMapMarker} from '@mdi/js';
import MdiIcon from '../publish/MdiIcon';
import {getListings, unlikeListing} from '../api/client';
import {forgetLiked} from '../feed/likedListings';
import {isFeedPost} from '../feed/listingRules';
import RemoveLikedDialog from '../components/RemoveLikedDialog';
import styles from './FavoritesScreen.module.css';

const SWIPE_REVEAL = 96;
const SWIPE_COMMIT = 68;

const isPostRow = item => {
  if (isFeedPost(item)) return true;
  const urls = [
    item?.main_image_url,
    item?.image_url,
    ...(Array.isArray(item?.listing_images) ? item.listing_images.map(i => (i && typeof i === 'object' ? i.image_url || i.uri : i)) : []),
  ].filter(Boolean);
  return urls.some(u => /post_\d/i.test(String(u)));
};

const formatPrice = item => {
  const n = item.price != null ? Number(item.price) : item.budget != null ? Number(item.budget) : null;
  if (n == null || Number.isNaN(n)) return '—';
  return `₪${Math.round(n).toLocaleString('en-US')}`;
};

const listingTitle = item => {
  const pn = item.project_name && String(item.project_name).trim();
  if (pn) return pn;
  const addr = (item.address || '').trim();
  if (addr) {
    const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts[parts.length - 1];
    return parts[0] || 'מודעה';
  }
  return 'מודעה';
};

const listingAddress = item => (item.address || item.land_address || '').trim() || 'מיקום לא זמין';

function SwipeRow({disabled, onRemove, children}) {
  const [x, setX] = useState(0);
  const start = useRef(null);
  const origin = useRef(0);

  const onPointerDown = e => {
    if (disabled || e.button !== 0) return;
    start.current = e.clientX;
    origin.current = x;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = e => {
    if (start.current == null) return;
    const dx = e.clientX - start.current;
    const next = Math.max(0, Math.min(SWIPE_REVEAL * 1.35, origin.current + dx));
    setX(next);
  };
  const finish = e => {
    if (start.current == null) return;
    const dx = e.clientX - start.current;
    const next = Math.max(0, Math.min(SWIPE_REVEAL * 1.35, origin.current + dx));
    start.current = null;
    if (next >= SWIPE_COMMIT) {
      setX(0);
      onRemove?.();
      return;
    }
    setX(next >= SWIPE_REVEAL * 0.35 ? SWIPE_REVEAL : 0);
  };

  return (
    <div className={styles.swipeOuter}>
      <button type="button" className={styles.swipeAction} style={{opacity: Math.min(1, x / SWIPE_REVEAL)}} disabled={disabled} onClick={onRemove}>
        <span className={styles.swipePill}>
          <MdiIcon path={mdiHeartOffOutline} size={26} color="#1E1D27" />
          הסר
        </span>
      </button>
      <div
        className={styles.swipeFront}
        style={{transform: `translateX(${x}px)`}}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={() => {
          start.current = null;
          setX(0);
        }}>
        {children}
      </div>
    </div>
  );
}

export default function FavoritesScreen({currentUser, onClose, onOpenListing}) {
  const userId = currentUser?.id != null ? String(currentUser.id) : null;
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [confirmUnlike, setConfirmUnlike] = useState(null);

  const load = useCallback(async () => {
    if (!userId) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getListings({status: 'published', user_id: userId, favorites_only: true});
      const rows = Array.isArray(res?.listings) ? res.listings : [];
      setListings(rows.filter(l => !isPostRow(l)));
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnlike = async listingId => {
    if (!userId || !listingId || removingId) return;
    const key = String(listingId);
    setRemovingId(listingId);
    try {
      await unlikeListing(key, userId);
      forgetLiked(key);
      setListings(prev => prev.filter(l => String(l.id) !== key));
    } catch (e) {
      window.alert(e?.message || 'לא הצלחנו להסיר מהמועדפים');
    } finally {
      setRemovingId(null);
    }
  };

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape' || document.querySelector('[data-account-modal]')) return;
      e.stopPropagation();
      onClose?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className={styles.screen} dir="rtl">
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onClose} aria-label="חזרה">
          <MdiIcon path={mdiChevronLeft} size={36} color="#fff" />
        </button>
        <h1 className={styles.title}>מועדפים</h1>
        <span className={styles.backBtn} />
      </header>
      <div className={styles.list}>
        {!userId ? (
          <p className={styles.empty}>התחבר כדי לראות מודעות שאהבת</p>
        ) : loading ? (
          <p className={styles.empty}>טוען...</p>
        ) : listings.length === 0 ? (
          <div className={styles.emptyBlock}>
            <p className={styles.empty}>עדיין אין מועדפים</p>
            <p className={styles.emptyHint}>לחץ על הלב בפיד כדי לשמור מודעות</p>
          </div>
        ) : (
          listings.map(item => {
            const imgs = Array.isArray(item.listing_images) ? item.listing_images : [];
            const uri = imgs[0]?.image_url || item.main_image_url || (Array.isArray(item.image_urls) && item.image_urls[0]) || null;
            const title =
              String(item?.subscription_type || '').toLowerCase() === 'company'
                ? item?.project_name && String(item.project_name).trim()
                  ? String(item.project_name).trim()
                  : listingTitle(item)
                : formatPrice(item);
            const busy = removingId != null && String(removingId) === String(item.id);
            return (
              <SwipeRow key={item.id} disabled={busy} onRemove={() => handleUnlike(item.id)}>
                <article className={styles.card}>
                  <div className={styles.imageWrap}>
                    {uri ? <img src={uri} alt="" /> : <MdiIcon path={mdiImageOutline} size={40} color="rgba(255,255,255,0.35)" />}
                    <button
                      type="button"
                      className={styles.heart}
                      disabled={busy}
                      aria-label="הסר מהמועדפים"
                      onClick={e => {
                        e.stopPropagation();
                        setConfirmUnlike(item);
                      }}>
                      <MdiIcon path={mdiHeart} size={22} color="#fff" />
                    </button>
                  </div>
                  <div className={styles.textCol}>
                    <h2>{title}</h2>
                    <p className={styles.addr}>
                      <span>{listingAddress(item)}</span>
                      <MdiIcon path={mdiMapMarker} size={18} color="#FFC40A" />
                    </p>
                    <button type="button" className={styles.cta} onClick={() => onOpenListing?.(item)}>
                      צפה במודעה
                    </button>
                  </div>
                </article>
              </SwipeRow>
            );
          })
        )}
      </div>
      {confirmUnlike ? (
        <div data-account-modal="">
          <RemoveLikedDialog
            onCancel={() => setConfirmUnlike(null)}
            onConfirm={() => {
              const id = confirmUnlike.id;
              setConfirmUnlike(null);
              handleUnlike(id);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
