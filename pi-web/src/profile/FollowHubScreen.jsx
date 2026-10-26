import {useCallback, useEffect, useMemo, useState} from 'react';
import {mdiChevronLeft, mdiMagnify} from '@mdi/js';
import MdiIcon from '../publish/MdiIcon';
import {
  cancelFollowRequest,
  getFollowHubRows,
  getFollowStats,
  getSubscription,
  respondToFollowRequest,
  sendFollowRequest,
  toSubscriptionId,
  unfollowUser,
} from '../api/client';
import {isFollowableSubscriptionType} from './lib/listingGridCardFigma';
import {shouldShowProfileGoldRing} from './lib/constant';
import {resolveProfileDisplayName, resolveProfileEmail} from './lib/profileFields';
import {DEFAULT_PI_PROFILE_AVATAR} from './lib/userProfileImage';
import styles from './FollowHubScreen.module.css';

const TAB_REQUESTS = 'requests';
const TAB_FOLLOWERS = 'followers';
const TAB_FOLLOWING = 'following';
const TAB_LIKES = 'likes';

const isAdsListingRecord = row => {
  if (!row || typeof row !== 'object') return false;
  return row.ad_number != null || row.listing_images != null || row.property_type != null;
};

export default function FollowHubScreen({onClose, currentUser = null, profileUser = null, initialTab = TAB_FOLLOWERS, onOpenUserProfile = null}) {
  const profileId = toSubscriptionId(
    profileUser?.subscription_id ||
      profileUser?.owner_id ||
      profileUser?.creator_subscription_id ||
      (!isAdsListingRecord(profileUser) ? profileUser?.id : null),
  );
  const viewerId = toSubscriptionId(currentUser?.subscription_id || currentUser?.owner_id || currentUser?.id);
  const isOwnProfile = !!profileId && !!viewerId && profileId === viewerId;
  const [profileMeta, setProfileMeta] = useState(null);

  const tabs = useMemo(() => {
    const base = [
      {id: TAB_FOLLOWERS, label: 'עוקבים'},
      {id: TAB_FOLLOWING, label: 'עוקב'},
      {id: TAB_LIKES, label: 'לייקים'},
    ];
    return isOwnProfile ? [{id: TAB_REQUESTS, label: 'הצעות'}, ...base] : base;
  }, [isOwnProfile]);

  const safeInitialTab = useMemo(() => {
    if (initialTab === TAB_REQUESTS && !isOwnProfile) return TAB_FOLLOWERS;
    return tabs.some(t => t.id === initialTab) ? initialTab : tabs[0]?.id || TAB_FOLLOWERS;
  }, [initialTab, isOwnProfile, tabs]);

  const [activeTab, setActiveTab] = useState(safeInitialTab);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [actioningId, setActioningId] = useState(null);
  const [confirmUnfollowRow, setConfirmUnfollowRow] = useState(null);
  const [counts, setCounts] = useState({likes: 0, followers: 0, following: 0, pending_requests: 0});

  useEffect(() => {
    if (!profileId) {
      setProfileMeta(null);
      return undefined;
    }
    let cancelled = false;
    getSubscription(profileId)
      .then(data => {
        if (cancelled || !data?.subscription) return;
        setProfileMeta(data.subscription);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const identitySource = profileMeta || profileUser;
  const listingIdentity = isAdsListingRecord(profileUser) && !profileMeta;
  const displayName =
    resolveProfileDisplayName(
      {
        ...(identitySource || {}),
        name: listingIdentity
          ? identitySource?.creator_name || identitySource?.contact_person_name || identitySource?.agent_name
          : identitySource?.creator_name || identitySource?.name || identitySource?.agent_name,
        subscription_type: identitySource?.subscription_type || identitySource?.creator_subscription_type,
      },
      {fallback: ''},
    ) ||
    profileUser?.creator_name ||
    profileUser?.contact_person_name ||
    profileUser?.business_name ||
    profileUser?.broker_office_name ||
    '';
  const displayEmail = resolveProfileEmail(identitySource, {
    preferred: isOwnProfile ? currentUser?.email : profileMeta?.email,
    fallback: isOwnProfile ? profileMeta?.email : profileUser?.email,
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 320);
    return () => clearTimeout(t);
  }, [search]);

  const loadCounts = useCallback(async () => {
    if (!profileId) return;
    try {
      const data = await getFollowStats(profileId);
      const acceptedFollowing = Number(data?.stats?.following || 0);
      const outgoingPending = isOwnProfile ? Number(data?.stats?.following_outgoing_pending || 0) : 0;
      setCounts({
        likes: Number(data?.stats?.likes || 0),
        followers: Number(data?.stats?.followers || 0),
        following: acceptedFollowing + outgoingPending,
        pending_requests: isOwnProfile ? Number(data?.stats?.pending_requests || 0) : 0,
      });
    } catch {
      /* keep the last counts */
    }
  }, [profileId, isOwnProfile]);

  const loadRows = useCallback(async () => {
    if (!profileId) return;
    setLoadingRows(true);
    try {
      const data = await getFollowHubRows({userId: profileId, viewerId, tab: activeTab, q: debouncedSearch});
      const nextRows = Array.isArray(data?.rows) ? data.rows : [];
      setRows(nextRows);
      if (isOwnProfile && activeTab === TAB_FOLLOWING && !debouncedSearch) {
        setCounts(prev => ({...prev, following: nextRows.length}));
      }
    } catch (e) {
      window.alert(e?.message || 'שגיאה בטעינת הרשימה');
    } finally {
      setLoadingRows(false);
    }
  }, [profileId, viewerId, activeTab, debouncedSearch, isOwnProfile]);

  const refreshRowsAndCounts = useCallback(async () => {
    await Promise.all([loadRows(), loadCounts()]);
  }, [loadRows, loadCounts]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape' || document.querySelector('[data-account-modal]')) return;
      e.stopPropagation();
      if (confirmUnfollowRow) setConfirmUnfollowRow(null);
      else onClose?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, confirmUnfollowRow]);

  const handleFollow = useCallback(
    async row => {
      if (!viewerId || !row?.id || row?.is_self) return;
      if (!isFollowableSubscriptionType(row?.subscription_type)) return;
      setActioningId(row.id);
      try {
        await sendFollowRequest(viewerId, row.id);
        await refreshRowsAndCounts();
      } catch (e) {
        window.alert(e?.message || 'לא הצלחנו לשלוח בקשת מעקב');
      } finally {
        setActioningId(null);
      }
    },
    [viewerId, refreshRowsAndCounts],
  );

  const handleAcceptRequest = useCallback(
    async row => {
      if (!viewerId || !row?.request_id) return;
      setActioningId(row.id || row.request_id);
      try {
        await respondToFollowRequest(row.request_id, viewerId, 'accept');
        await refreshRowsAndCounts();
      } catch (e) {
        window.alert(e?.message || 'לא הצלחנו לאשר את הבקשה');
      } finally {
        setActioningId(null);
      }
    },
    [viewerId, refreshRowsAndCounts],
  );

  const handleRejectRequest = useCallback(
    async row => {
      if (!viewerId || !row?.request_id) return;
      setActioningId(row.id || row.request_id);
      try {
        await respondToFollowRequest(row.request_id, viewerId, 'reject');
        await refreshRowsAndCounts();
      } catch (e) {
        window.alert(e?.message || 'לא הצלחנו לדחות את הבקשה');
      } finally {
        setActioningId(null);
      }
    },
    [viewerId, refreshRowsAndCounts],
  );

  const handleCancelOutgoingRequest = useCallback(
    async row => {
      if (!viewerId || !row?.id || row?.is_self) return;
      setActioningId(row.id);
      try {
        await cancelFollowRequest(viewerId, row.id);
        await refreshRowsAndCounts();
      } catch (e) {
        window.alert(e?.message || 'לא הצלחנו לבטל את בקשת המעקב');
      } finally {
        setActioningId(null);
      }
    },
    [viewerId, refreshRowsAndCounts],
  );

  const handleUnfollow = useCallback(
    row => {
      if (!viewerId || !row?.id || actioningId === row.id) return;
      setConfirmUnfollowRow({...row, _action: 'unfollow'});
    },
    [viewerId, actioningId],
  );

  const handleRemoveFollower = useCallback(
    row => {
      if (!isOwnProfile || !profileId || !row?.id || actioningId === row.id) return;
      setConfirmUnfollowRow({...row, _action: 'removeFollower'});
    },
    [isOwnProfile, profileId, actioningId],
  );

  const confirmUnfollow = useCallback(async () => {
    const row = confirmUnfollowRow;
    if (!row?.id) return;
    const isRemoveFollower = row?._action === 'removeFollower';
    if (isRemoveFollower) {
      if (!profileId) return;
    } else if (!viewerId) return;
    setConfirmUnfollowRow(null);
    setActioningId(row.id);
    try {
      if (isRemoveFollower) await unfollowUser(row.id, profileId);
      else await unfollowUser(viewerId, row.id);
      await refreshRowsAndCounts();
    } catch (e) {
      window.alert(e?.message || (isRemoveFollower ? 'לא הצלחנו להסיר את המעקב' : 'לא הצלחנו לבטל מעקב'));
    } finally {
      setActioningId(null);
    }
  }, [confirmUnfollowRow, viewerId, profileId, refreshRowsAndCounts]);

  const isMutualGoldRow = row => {
    if (!shouldShowProfileGoldRing(row)) return false;
    if (!isOwnProfile) return false;
    if (activeTab !== TAB_FOLLOWERS && activeTab !== TAB_FOLLOWING) return false;
    if (row?.is_mutual_follow !== true) return false;
    if (!row?.is_following_by_viewer) return false;
    if (row?.has_pending_request_by_viewer) return false;
    if (row?.outgoing_follow_pending) return false;
    return true;
  };

  const renderAction = row => {
    const busy = actioningId === row?.id || actioningId === row?.request_id;
    const canFollowRow = isFollowableSubscriptionType(row?.subscription_type);
    if (activeTab === TAB_LIKES) return <span className={styles.actionPlaceholder} />;
    if (activeTab === TAB_REQUESTS && isOwnProfile) {
      return (
        <span className={styles.actionCluster}>
          <button type="button" className={`${styles.actionBtn} ${styles.actionGhost}`} disabled={busy} onClick={() => handleRejectRequest(row)}>
            {busy ? '...' : 'דחה'}
          </button>
          <button type="button" className={`${styles.actionBtn} ${styles.actionFollowing}`} disabled={busy} onClick={() => handleAcceptRequest(row)}>
            {busy ? '...' : 'אשר'}
          </button>
        </span>
      );
    }
    if (row?.is_self) return <span className={styles.actionPlaceholder} />;
    if (isOwnProfile && activeTab === TAB_FOLLOWERS) {
      return (
        <button type="button" className={`${styles.actionBtn} ${styles.actionGhost} ${styles.actionWide}`} disabled={busy} onClick={() => handleRemoveFollower(row)}>
          {busy ? '...' : 'הסר מהעוקבים שלך'}
        </button>
      );
    }
    if (isOwnProfile && activeTab === TAB_FOLLOWING) {
      if (row?.has_pending_request_by_viewer || row?.outgoing_follow_pending) {
        return (
          <span className={styles.actionCluster}>
            <span className={`${styles.actionBtn} ${styles.actionDisabled}`}>ממתין לאישור</span>
            <button type="button" className={`${styles.actionBtn} ${styles.actionGhost}`} disabled={busy} onClick={() => handleCancelOutgoingRequest(row)}>
              {busy ? '...' : 'בטל בקשת מעקב'}
            </button>
          </span>
        );
      }
      if (row?.is_following_by_viewer) {
        return (
          <button type="button" className={`${styles.actionBtn} ${styles.actionGhost}`} disabled={busy} onClick={() => handleUnfollow(row)}>
            {busy ? '...' : 'בטל מעקב'}
          </button>
        );
      }
      if (!canFollowRow) return <span className={styles.actionPlaceholder} />;
      return (
        <button type="button" className={styles.goldBtn} disabled={busy} onClick={() => handleFollow(row)}>
          {busy ? '...' : 'עקוב'}
        </button>
      );
    }
    if (row?.is_following_by_viewer) {
      if (isMutualGoldRow(row)) {
        return (
          <button type="button" className={styles.goldBtn} disabled={busy} onClick={() => handleUnfollow(row)}>
            {busy ? '...' : 'עוקב'}
          </button>
        );
      }
      return (
        <button type="button" className={`${styles.actionBtn} ${styles.actionFollowing}`} disabled={busy} onClick={() => handleUnfollow(row)}>
          {busy ? '...' : 'עוקב'}
        </button>
      );
    }
    if (row?.has_pending_request_by_viewer) {
      return <span className={`${styles.actionBtn} ${styles.actionDisabled}`}>ממתין לאישור</span>;
    }
    if (!canFollowRow) return <span className={styles.actionPlaceholder} />;
    return (
      <button type="button" className={styles.goldBtn} disabled={busy} onClick={() => handleFollow(row)}>
        {busy ? '...' : 'עקוב'}
      </button>
    );
  };

  const labelWithCount = tabId => {
    if (tabId === TAB_REQUESTS) return `הצעות ${counts.pending_requests}`;
    if (tabId === TAB_FOLLOWERS) return `עוקבים ${counts.followers}`;
    if (tabId === TAB_LIKES) return `לייקים ${counts.likes}`;
    return `עוקב ${counts.following}`;
  };

  const displayRows = useMemo(() => {
    const list = rows || [];
    if (!isOwnProfile && activeTab === TAB_FOLLOWERS) return list.filter(row => !row?.request_id);
    return list;
  }, [rows, isOwnProfile, activeTab]);

  return (
    <div className={styles.screen} dir="rtl">
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onClose} aria-label="חזרה">
          <MdiIcon path={mdiChevronLeft} size={36} color="#fff" />
        </button>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{displayName || 'פרופיל'}</h1>
          {displayEmail ? <p className={styles.email}>{displayEmail}</p> : null}
        </div>
        <span className={styles.backBtn} />
      </header>
      <div className={styles.tabs}>
        {tabs.map(tab => {
          const selected = activeTab === tab.id;
          return (
            <button key={tab.id} type="button" className={selected ? styles.tabOn : styles.tab} onClick={() => setActiveTab(tab.id)}>
              {labelWithCount(tab.id)}
            </button>
          );
        })}
      </div>
      <label className={styles.search}>
        <MdiIcon path={mdiMagnify} size={28} color="#8C85B3" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חפש" />
      </label>
      <div className={styles.list}>
        {loadingRows ? (
          <p className={styles.empty}>טוען...</p>
        ) : displayRows.length === 0 ? (
          <p className={styles.empty}>אין נתונים להצגה</p>
        ) : (
          displayRows.map(row => {
            const gold = isMutualGoldRow(row);
            const ring = shouldShowProfileGoldRing(row);
            return (
              <div key={`${activeTab}-${row.id}-${row.request_id || (row.outgoing_follow_pending ? 'pending' : 'accepted')}`} className={gold ? styles.rowGold : styles.row}>
                <button
                  type="button"
                  className={styles.rowMain}
                  disabled={!onOpenUserProfile || row.is_self}
                  onClick={() => onOpenUserProfile?.(row)}>
                  <img
                    className={ring ? (gold ? styles.avatarGold : styles.avatarRing) : styles.avatar}
                    src={row.image_url || DEFAULT_PI_PROFILE_AVATAR}
                    alt=""
                  />
                  <span className={gold ? styles.nameGold : styles.name}>{row.name || 'משתמש'}</span>
                </button>
                {renderAction(row)}
              </div>
            );
          })
        )}
      </div>
      {confirmUnfollowRow ? (
        <div className={styles.confirmOverlay} data-account-modal="">
          <div className={styles.confirmCard} role="alertdialog">
            <h2>{confirmUnfollowRow._action === 'removeFollower' ? 'הסרת עוקב' : 'ביטול מעקב'}</h2>
            <p>
              {confirmUnfollowRow._action === 'removeFollower'
                ? `להסיר את ${confirmUnfollowRow.name || 'המשתמש'} מרשימת העוקבים?`
                : `להפסיק לעקוב אחרי ${confirmUnfollowRow.name || 'המשתמש'}?`}
            </p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={() => setConfirmUnfollowRow(null)}>ביטול</button>
              <button type="button" className={styles.confirmDanger} onClick={confirmUnfollow}>
                {confirmUnfollowRow._action === 'removeFollower' ? 'הסר' : 'הפסק מעקב'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
