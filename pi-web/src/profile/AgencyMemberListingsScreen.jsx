import {lazy, Suspense, useCallback, useEffect, useMemo, useState} from 'react';
import {mdiChevronLeft, mdiImageOutline, mdiRocketLaunch, mdiSnowflake, mdiSnowflakeMelt} from '@mdi/js';
import MdiIcon from '../publish/MdiIcon';
import analysisIcon from '../assets/figma/edit-publish/analysis.svg';
import {getListings} from '../api/client';
import {boostListing, deleteListing, getBoostQuota, updateListingFreeze} from '../api/editPublish';
import {canAccessListingAnalysis, excludeSalesImageCompanionListings} from '../publish/lib/publishRules';
import {isPostListingRecord} from './lib/pickTopViewedListingForProfile';
import {agencyMemberDisplayName} from './lib/agencyMemberDisplay';
import styles from './AgencyMemberListingsScreen.module.css';

const ListingAnalysisScreen = lazy(() => import('../publish/ListingAnalysisScreen'));

const FROZEN_IDS_KEY = 'pi_edit_frozen_listing_ids';
const TABS = [
  {id: 'all', label: 'הכל'},
  {id: 'ads', label: 'מודעות'},
  {id: 'posts', label: 'פוסטים'},
];

const listingStableKey = listing => String(listing?.id ?? listing?.ad_number ?? '');

const getListingCreatedTs = listing => {
  const raw = listing?.created_at || listing?.createdAt || listing?.uploaded_at || listing?.uploadedAt || null;
  if (!raw) return 0;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : 0;
};

const buildOldestFirstOrdinalMap = listings => {
  const posts = [];
  const ads = [];
  (listings || []).forEach(listing => {
    if (!listing) return;
    if (isPostListingRecord(listing)) posts.push(listing);
    else ads.push(listing);
  });
  const byOldest = (a, b) => {
    const diff = getListingCreatedTs(a) - getListingCreatedTs(b);
    if (diff !== 0) return diff;
    return listingStableKey(a).localeCompare(listingStableKey(b));
  };
  posts.sort(byOldest);
  ads.sort(byOldest);
  const map = new Map();
  posts.forEach((listing, index) => {
    const key = listingStableKey(listing);
    if (key) map.set(key, index + 1);
  });
  ads.forEach((listing, index) => {
    const key = listingStableKey(listing);
    if (key) map.set(key, index + 1);
  });
  return map;
};

const computeListingExposureLevel = (listing, boostedOverrides = {}) => {
  if (!listing) return 'low';
  const listingId = listing?.id ?? listing?.ad_number;
  const overrideExpiry = listingId != null ? boostedOverrides[String(listingId)] : null;
  const expiryRaw = overrideExpiry || listing.boost_expires_at || listing.boostExpiresAt;
  if (expiryRaw) {
    const expiryTs = new Date(expiryRaw).getTime();
    if (Number.isFinite(expiryTs) && expiryTs > Date.now()) return 'high';
  }
  const frozen = listing.is_frozen === true || listing.is_frozen === 'true';
  if (frozen) return 'low';
  const createdTs = getListingCreatedTs(listing);
  if (createdTs) {
    const ageDays = (Date.now() - createdTs) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) return 'high';
    if (ageDays < 14) return 'medium';
  }
  return 'low';
};

const exposureLabel = level => (level === 'high' ? 'גבוהה' : level === 'medium' ? 'בינונית' : 'נמוכה');

const listingTitle = listing => {
  const name = listing?.project_name && String(listing.project_name).trim();
  if (name) return name;
  const address = String(listing?.address || listing?.land_address || '').trim();
  if (address) return address;
  const price = listing?.price != null ? Number(listing.price) : null;
  if (price != null && !Number.isNaN(price)) return `₪${Math.round(price).toLocaleString('en-US')}`;
  return isPostListingRecord(listing) ? 'פוסט' : 'מודעה';
};

const listingImage = listing => {
  const imgs = Array.isArray(listing?.listing_images) ? listing.listing_images : [];
  return imgs[0]?.image_url || listing?.main_image_url || listing?.image || null;
};

function readFrozenIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FROZEN_IDS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

const persistFrozenIds = ids => {
  try {
    localStorage.setItem(FROZEN_IDS_KEY, JSON.stringify(ids));
  } catch {
    /* storage disabled */
  }
};

function Dialog({title, message, icon, busy, confirmLabel, onCancel, onConfirm, confirmDisabled}) {
  return (
    <div className={styles.overlay} data-account-modal="" onClick={() => !busy && onCancel()}>
      <div className={styles.dialog} role="alertdialog" onClick={e => e.stopPropagation()}>
        {icon ? <MdiIcon path={icon} size={48} color="#FFBF3E" /> : null}
        <h2>{title}</h2>
        <p>{message}</p>
        <div className={styles.dialogActions}>
          <button type="button" disabled={busy} onClick={onCancel}>
            ביטול
          </button>
          <button type="button" className={styles.confirm} disabled={busy || confirmDisabled} onClick={onConfirm}>
            {busy ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgencyMemberListingsScreen({
  member,
  currentUser,
  onClose,
  onViewListing,
  onEditListing,
  onEditPost,
  refreshKey = 0,
}) {
  const memberSubId = member?.id != null ? String(member.id).trim() : '';
  const memberEmail = member?.email != null ? String(member.email).trim().toLowerCase() : '';
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');
  const [frozenListingIds, setFrozenListingIds] = useState(readFrozenIds);
  const [boostedOverrides, setBoostedOverrides] = useState({});
  const [boostQuota, setBoostQuota] = useState({quota: 1, used: 0, remaining: 1});
  const [boostConfirmListing, setBoostConfirmListing] = useState(null);
  const [boostSubmitting, setBoostSubmitting] = useState(false);
  const [freezeConfirmListing, setFreezeConfirmListing] = useState(null);
  const [unfreezeConfirmListing, setUnfreezeConfirmListing] = useState(null);
  const [removeConfirmListing, setRemoveConfirmListing] = useState(null);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const load = useCallback(async () => {
    if (!memberSubId) return;
    setError(null);
    try {
      const res = await getListings({status: 'published', subscription_id: memberSubId});
      setListings(Array.isArray(res?.listings) ? res.listings : []);
    } catch (e) {
      setError(e?.message || 'טעינת המודעות נכשלה');
    }
  }, [memberSubId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load, refreshKey]);

  useEffect(() => {
    if (!memberEmail) return undefined;
    let cancelled = false;
    getBoostQuota(memberEmail)
      .then(res => {
        if (cancelled) return;
        setBoostQuota({
          quota: Number(res?.quota ?? 1),
          used: Number(res?.used ?? 0),
          remaining: Number(res?.remaining ?? 1),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [memberEmail, refreshKey]);

  const managedListings = useMemo(() => excludeSalesImageCompanionListings(listings), [listings]);
  const visibleListings = useMemo(() => {
    if (tab === 'ads') return managedListings.filter(l => !isPostListingRecord(l));
    if (tab === 'posts') return managedListings.filter(l => isPostListingRecord(l));
    return managedListings;
  }, [managedListings, tab]);
  const listingOrdinalById = useMemo(() => buildOldestFirstOrdinalMap(managedListings), [managedListings]);

  const isFrozen = useCallback(
    listing => {
      const id = listing?.id ?? listing?.ad_number;
      if (id == null) return false;
      if (listing?.is_frozen === true || listing?.is_frozen === 'true') return true;
      return frozenListingIds.some(fid => String(fid) === String(id));
    },
    [frozenListingIds],
  );

  const canBoostThisMonth = boostQuota.remaining > 0;
  const showListingAnalysis = canAccessListingAnalysis(currentUser?.subscription_type);

  const openBoostConfirm = listing => {
    if (!canBoostThisMonth) {
      window.alert('הגעת למכסת ההקפצות החודשית (הקפצה אחת בחודש).');
      return;
    }
    setBoostConfirmListing(listing);
  };

  const handleConfirmBoost = async () => {
    const listing = boostConfirmListing;
    if (!listing || boostSubmitting) return;
    const listingId = listing.id ?? listing.ad_number;
    if (!listingId || !memberEmail) {
      setBoostConfirmListing(null);
      window.alert('לא ניתן להקפיץ כרגע');
      return;
    }
    setBoostSubmitting(true);
    try {
      const res = await boostListing(listingId, memberEmail);
      setBoostQuota({
        quota: Number(res?.quota ?? boostQuota.quota),
        used: Number(res?.used ?? boostQuota.used + 1),
        remaining: Number(res?.remaining ?? Math.max(0, boostQuota.remaining - 1)),
      });
      if (res?.boost_expires_at) {
        setBoostedOverrides(prev => ({...prev, [String(listingId)]: res.boost_expires_at}));
      }
      setBoostConfirmListing(null);
      window.alert('ההקפצה הופעלה! הדירוג הוא "גבוהה" למשך 24 שעות.');
    } catch (e) {
      if (e?.code === 'QUOTA_EXCEEDED') setBoostQuota(prev => ({...prev, remaining: 0}));
      window.alert(e?.message || 'הקפצה נכשלה');
    } finally {
      setBoostSubmitting(false);
    }
  };

  const handleConfirmRemove = async () => {
    const listing = removeConfirmListing;
    if (!listing || removeSubmitting) return;
    const listingId = listing.id ?? listing.ad_number;
    if (!listingId || !memberEmail) {
      window.alert('לא ניתן להסיר כרגע');
      return;
    }
    setRemoveSubmitting(true);
    try {
      await deleteListing(listingId, memberEmail, memberSubId);
      const idStr = String(listingId);
      setListings(prev => prev.filter(l => String(l.id ?? l.ad_number) !== idStr));
      setRemoveConfirmListing(null);
    } catch (e) {
      window.alert(e?.message || 'שגיאה בהסרת המודעה');
    } finally {
      setRemoveSubmitting(false);
    }
  };

  const applyFreeze = async (listing, frozen) => {
    const id = listing?.id ?? listing?.ad_number;
    if (id == null) return;
    try {
      await updateListingFreeze(id, frozen);
      const idStr = String(id);
      setFrozenListingIds(prev => {
        const next = frozen ? (prev.some(fid => String(fid) === idStr) ? prev : [...prev, idStr]) : prev.filter(fid => String(fid) !== idStr);
        persistFrozenIds(next);
        return next;
      });
      setListings(prev => prev.map(l => (String(l.id) === idStr ? {...l, is_frozen: frozen} : l)));
    } catch (e) {
      window.alert(e?.message || (frozen ? 'שגיאה בהקפאת המודעה' : 'שגיאה בביטול הקפאה'));
    }
  };

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape' || showAnalysis || document.querySelector('[data-account-modal]')) return;
      e.stopPropagation();
      onClose?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, showAnalysis]);

  if (showAnalysis) {
    return (
      <Suspense fallback={<div className={styles.screen} />}>
        <ListingAnalysisScreen currentUser={currentUser} listingOwnerUser={member} onClose={() => setShowAnalysis(false)} />
      </Suspense>
    );
  }

  return (
    <div className={styles.screen} dir="rtl">
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onClose} aria-label="חזור">
          <MdiIcon path={mdiChevronLeft} size={34} color="#fff" />
        </button>
        <h1>{agencyMemberDisplayName(member)}</h1>
        {showListingAnalysis ? (
          <button type="button" className={styles.backBtn} aria-label="ניתוח מודעות" onClick={() => setShowAnalysis(true)}>
            <img src={analysisIcon} alt="" width={28} height={28} />
          </button>
        ) : (
          <span className={styles.backBtn} />
        )}
      </header>
      <div className={styles.tabs}>
        {TABS.map(item => (
          <button key={item.id} type="button" className={tab === item.id ? styles.tabOn : styles.tab} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {loading ? (
        <p className={styles.center}>טוען...</p>
      ) : (
        <div className={styles.list}>
          {error ? <p className={styles.error}>{error}</p> : null}
          {!error && visibleListings.length === 0 ? <p className={styles.empty}>אין פריטים להצגה</p> : null}
          {visibleListings.map((listing, index) => {
            const post = isPostListingRecord(listing);
            const ordinal = listingOrdinalById.get(listingStableKey(listing)) ?? index + 1;
            const frozen = isFrozen(listing);
            const exposure = computeListingExposureLevel(listing, boostedOverrides);
            const image = listingImage(listing);
            return (
              <article key={listing.id || listingStableKey(listing)} className={styles.card}>
                <button type="button" className={styles.thumb} onClick={() => onViewListing?.(listing)}>
                  {image ? <img src={image} alt="" /> : <MdiIcon path={mdiImageOutline} size={36} color="rgba(255,255,255,0.35)" />}
                </button>
                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <h2>
                      {ordinal}. {listingTitle(listing)}
                    </h2>
                    <span className={frozen ? styles.frozen : styles.exposure}>
                      {frozen ? 'מוקפאת' : exposureLabel(exposure)}
                    </span>
                  </div>
                  <div className={styles.actions}>
                    <button type="button" onClick={() => (post ? onEditPost?.(listing, member) : onEditListing?.(listing, member))}>
                      עריכה
                    </button>
                    <button type="button" onClick={() => openBoostConfirm(listing)} disabled={!canBoostThisMonth}>
                      הקפצה
                    </button>
                    <button type="button" onClick={() => (frozen ? setUnfreezeConfirmListing(listing) : setFreezeConfirmListing(listing))}>
                      {frozen ? 'בטל הקפאה' : 'הקפאה'}
                    </button>
                    <button type="button" onClick={() => setRemoveConfirmListing(listing)}>
                      הסרה
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {removeConfirmListing ? (
        <Dialog
          title="להסיר את המודעה?"
          message="המודעה תימחק לצמיתות מהמערכת."
          confirmLabel="הסרה"
          busy={removeSubmitting}
          onCancel={() => !removeSubmitting && setRemoveConfirmListing(null)}
          onConfirm={handleConfirmRemove}
        />
      ) : null}
      {freezeConfirmListing ? (
        <Dialog
          icon={mdiSnowflake}
          title="הקפיא מודעה?"
          message="המודעה תישאר אצלך אך לא תוצג במערכת. ניתן לבטל הקפאה בהמשך."
          confirmLabel="כן"
          onCancel={() => setFreezeConfirmListing(null)}
          onConfirm={async () => {
            const listing = freezeConfirmListing;
            setFreezeConfirmListing(null);
            await applyFreeze(listing, true);
          }}
        />
      ) : null}
      {unfreezeConfirmListing ? (
        <Dialog
          icon={mdiSnowflakeMelt}
          title="בטל הקפאה?"
          message="המודעה תוצג שוב במערכת."
          confirmLabel="כן"
          onCancel={() => setUnfreezeConfirmListing(null)}
          onConfirm={async () => {
            const listing = unfreezeConfirmListing;
            setUnfreezeConfirmListing(null);
            await applyFreeze(listing, false);
          }}
        />
      ) : null}
      {boostConfirmListing ? (
        <Dialog
          icon={mdiRocketLaunch}
          title="להקפיץ את המודעה?"
          message={
            boostQuota.remaining > 0
              ? `המודעה תקבל חשיפה גבוהה למשך 24 שעות. נותרה הקפצה אחת החודש (מתוך ${boostQuota.quota}).`
              : 'המודעה תקבל חשיפה גבוהה למשך 24 שעות. אין הקפצות נותרות החודש.'
          }
          confirmLabel="הקפץ"
          busy={boostSubmitting}
          confirmDisabled={boostQuota.remaining <= 0}
          onCancel={() => !boostSubmitting && setBoostConfirmListing(null)}
          onConfirm={handleConfirmBoost}
        />
      ) : null}
    </div>
  );
}
