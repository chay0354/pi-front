import {useEffect, useMemo, useState} from 'react';
import {mdiChevronLeft, mdiClose, mdiHeartOutline, mdiPlayCircle} from '@mdi/js';
import {clearRecentUserSearches, getListings, getRecentUserSearches, getReviews, recordUserSearch} from '../api/client';
import {getListingHashtags, toFeedItem} from '../feed/listingRules';
import {feedListingProfilePayload, useProfileNav} from '../profile/navigation';
import {isBrokerLikeSubscriptionType, subscriptionTypes} from '../profile/lib/constant';
import {
  brokerPiRatingFromListing,
  displayPiRatingFromReviews,
  shouldShowListingPiRating,
} from '../profile/lib/listingGridCardFigma';
import {getPiRatingCompositeSource, PI_RATING_BADGE_RING} from '../profile/lib/piRatingBadgeAssets';
import {getListingFeedAvatarUrl, getUserProfileImageUrl, shouldForceGoldRingForListing} from '../profile/lib/userProfileImage';
import {ProfileAvatar} from '../profile/ProfileParts';
import MdiIcon from '../publish/MdiIcon';
import styles from './UserSearchPanel.module.css';

const listOf = value => {
  if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(v => String(v || '').trim()).filter(Boolean);
    } catch {
      /* split below */
    }
    return value.split(',').map(v => String(v || '').trim()).filter(Boolean);
  }
  return [];
};

const subtitleFor = listing => {
  const subType = String(listing?.subscription_type || '').toLowerCase();
  if (isBrokerLikeSubscriptionType(subType)) return 'תיווך';
  const specialties = listOf(listing?.creator_specialties);
  const creatorTypes = listOf(listing?.creator_types);
  if (specialties[0]) return specialties[0];
  if (creatorTypes[0]) return creatorTypes[0];
  if (subType === subscriptionTypes.company) return 'חברה';
  if (subType === subscriptionTypes.professional) return 'נותן שירות';
  return 'משתמש';
};

const avatarOf = listing =>
  getListingFeedAvatarUrl(listing) ||
  getUserProfileImageUrl(listing) ||
  listing?.profileImageUrl ||
  listing?.creator_profile_image_url ||
  listing?.profile_image_url ||
  null;

function RatingMark({value}) {
  const n = Math.min(5, Math.max(1, Math.round(Number(value)) || 1));
  if (n >= 5) {
    return (
      <span className={styles.five}>
        <span className={styles.fiveNum}>{n}</span>
        <img className={styles.fiveRing} src={PI_RATING_BADGE_RING} alt="" />
      </span>
    );
  }
  return <img className={styles.stars} src={getPiRatingCompositeSource(n)} alt="" />;
}

export default function UserSearchPanel({query, onQueryChange, onClose, currentUser, onOpenPost}) {
  const nav = useProfileNav();
  const [listings, setListings] = useState([]);
  const [recent, setRecent] = useState([]);
  const [hidden, setHidden] = useState(() => new Set());
  const [tag, setTag] = useState(null);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (tag) {
        setTag(null);
        return;
      }
      onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, tag]);

  useEffect(() => {
    let cancelled = false;
    const userId = currentUser?.id != null ? String(currentUser.id) : null;
    setLoading(true);
    getListings({status: 'published', ...(userId ? {userId} : {})})
      .then(result => {
        if (cancelled) return;
        const rows = Array.isArray(result?.listings) ? result.listings : [];
        if (rows.length) setListings(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const email = currentUser?.email;
    if (email) {
      getRecentUserSearches(email)
        .then(res => {
          if (!cancelled) setRecent(Array.isArray(res?.recent) ? res.recent : []);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.email]);

  const users = useMemo(() => {
    const byKey = new Map();
    listings.forEach(listing => {
      const keyRaw = listing?.subscription_id || listing?.owner_id || listing?.creator_email || listing?.creator_name;
      const name = String(listing?.creator_name || '').trim();
      if (!keyRaw || !name) return;
      const key = String(keyRaw).toLowerCase();
      const avatar = avatarOf(listing);
      const subtitle = subtitleFor(listing);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          key,
          name,
          subtitle,
          avatar,
          ratingTargetId: listing?.subscription_id || listing?.owner_id || null,
          listing,
        });
        return;
      }
      if (!existing.avatar && avatar) existing.avatar = avatar;
      if ((!existing.subtitle || existing.subtitle === 'משתמש') && subtitle) existing.subtitle = subtitle;
      if (!existing.ratingTargetId) {
        const tid = listing?.subscription_id || listing?.owner_id;
        if (tid) existing.ratingTargetId = tid;
      }
    });
    const q = String(query || '').trim().toLowerCase();
    return [...byKey.values()]
      .filter(item => !q || item.name.toLowerCase().includes(q) || String(item.subtitle || '').toLowerCase().includes(q))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'he'));
  }, [listings, query]);

  const hashtags = useMemo(() => {
    const counts = new Map();
    listings.forEach(listing => {
      getListingHashtags(listing).forEach(raw => {
        const key = raw.toLowerCase();
        const existing = counts.get(key);
        if (existing) existing.count += 1;
        else counts.set(key, {tag: raw, count: 1});
      });
    });
    const q = String(query || '').trim().replace(/^#+/, '').toLowerCase();
    return [...counts.values()]
      .filter(it => !q || it.tag.toLowerCase().includes(q))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'he'));
  }, [listings, query]);

  const tagPosts = useMemo(() => {
    if (!tag) return [];
    const needle = tag.toLowerCase();
    return listings.filter(listing => getListingHashtags(listing).some(t => t.toLowerCase() === needle));
  }, [listings, tag]);

  const hasQuery = String(query || '').trim().length > 0;
  const hashtagOnly = String(query || '').trim().startsWith('#');
  const visibleUsers = users.filter(it => !hidden.has(it.key));
  const visibleRecent = recent.filter(r => !hidden.has(`recent:${r.target_subscription_id}`));
  const tagRows = hashtags.map(h => ({type: 'hashtag', key: `tag:${h.tag}`, tag: h.tag, count: h.count}));
  const shown = hasQuery
    ? hashtagOnly
      ? tagRows
      : [...tagRows, ...visibleUsers.map(u => ({...u, type: 'user'}))]
    : visibleRecent.map(r => ({
        type: 'user',
        key: `recent:${r.target_subscription_id}`,
        name: r.name,
        subtitle:
          r.subscription_type === 'broker'
            ? 'תיווך'
            : r.subscription_type === 'company'
              ? 'חברה'
              : r.subscription_type === 'professional'
                ? 'בעל מקצוע'
                : '',
        avatar: r.profileImageUrl || null,
        ratingTargetId: r.target_subscription_id,
        listing: r.subscription_type ? {subscription_type: r.subscription_type} : null,
        recentTargetId: r.target_subscription_id,
        recentEmail: r.email || null,
        recentSubscriptionType: r.subscription_type || null,
      }));
  const ratingKey = shown
    .filter(item => item.type !== 'hashtag')
    .map(item => item.ratingTargetId || item.recentTargetId || '')
    .join('|');

  useEffect(() => {
    const targets = [];
    const byId = new Map();
    shown.forEach(item => {
      if (item.type === 'hashtag') return;
      const id = item.ratingTargetId || item.recentTargetId;
      if (!id || byId.has(id)) return;
      const listing = item.listing || (item.recentSubscriptionType ? {subscription_type: item.recentSubscriptionType} : null);
      if (listing && !shouldShowListingPiRating(listing)) return;
      byId.set(id, listing);
      targets.push(id);
    });
    let cancelled = false;
    targets.slice(0, 24).forEach(async id => {
      try {
        const res = await getReviews(id);
        if (cancelled) return;
        const value = displayPiRatingFromReviews(res?.reviews || [], byId.get(id));
        setRatings(prev => (prev[id] === value ? prev : {...prev, [id]: value}));
      } catch {
        /* keep the listing fallback */
      }
    });
    return () => {
      cancelled = true;
    };
    // ratingKey changes only when the visible people change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratingKey]);

  const openUser = item => {
    const targetId = item.recentTargetId || item.ratingTargetId || item.listing?.subscription_id || item.listing?.owner_id || null;
    if (targetId && currentUser?.email) recordUserSearch(currentUser.email, targetId);
    const listing =
      item.listing && item.listing.creator_name
        ? item.listing
        : {
            subscription_id: item.recentTargetId || item.ratingTargetId || null,
            owner_id: item.recentTargetId || item.ratingTargetId || null,
            creator_name: item.name || null,
            creator_email: item.recentEmail || null,
            creator_profile_image_url: item.avatar || null,
            profile_picture_url: item.avatar || null,
            subscription_type: item.recentSubscriptionType || item.listing?.subscription_type || null,
          };
    onClose?.();
    nav.open(feedListingProfilePayload(listing));
  };

  const clearSection = () => {
    setHidden(new Set());
    if (hasQuery || !currentUser?.email) return;
    setRecent([]);
    clearRecentUserSearches(currentUser.email);
  };

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <section className={styles.panel} role="dialog" aria-label="חיפוש משתמשים או האשטאגים">
        <div className={styles.field}>
          <input
            className={styles.input}
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="חיפוש משתמשים או האשטאגים"
            dir="rtl"
            autoFocus
          />
          <button type="button" className={styles.iconBtn} aria-label="נקה חיפוש" onClick={() => onQueryChange('')}>
            <MdiIcon path={mdiClose} size={23} color="#fff" />
          </button>
        </div>

        {tag ? (
          <div className={styles.explore}>
            <button type="button" className={styles.back} onClick={() => setTag(null)}>
              חזרה לתוצאות
            </button>
            <div className={styles.exploreHead}>
              <p className={styles.exploreTitle} dir="auto">
                #{tag}
              </p>
              <p className={styles.exploreCount}>{tagPosts.length} פוסטים</p>
            </div>
            {tagPosts.length === 0 ? (
              <p className={styles.empty}>אין פוסטים עם ההאשטאג הזה</p>
            ) : (
              <div className={styles.grid}>
                {tagPosts.map(listing => {
                  const item = toFeedItem(listing);
                  const image = item.images[0] || '';
                  return (
                    <button key={item.id} type="button" className={styles.cell} onClick={() => onOpenPost?.(listing)}>
                      <span className={styles.thumb}>
                        {image ? <img src={image} alt="" /> : <span className={styles.thumbEmpty} />}
                        {item.preferVideo || item.videoUrl ? (
                          <span className={styles.play}>
                            <MdiIcon path={mdiPlayCircle} size={47} color="rgba(255,255,255,0.85)" />
                          </span>
                        ) : null}
                      </span>
                      {item.description ? (
                        <span className={styles.caption} dir="auto">
                          {item.description}
                        </span>
                      ) : null}
                      <span className={styles.cellMeta}>
                        <span className={styles.author}>
                          <ProfileAvatar uri={item.creatorAvatar} size={29} subscriptionType={listing} />
                          <span dir="auto">{item.creatorName || 'משתמש'}</span>
                        </span>
                        <span className={styles.likes}>
                          <MdiIcon path={mdiHeartOutline} size={18} color="#C9C7D6" />
                          {item.likeCount}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={styles.section}>
              <button type="button" className={styles.clear} onClick={clearSection}>
                נקה
              </button>
              <p className={styles.sectionTitle}>{hasQuery ? 'תוצאות חיפוש' : 'אחרונים'}</p>
            </div>
            <div className={styles.list}>
              {loading && shown.length === 0 ? <p className={styles.empty}>טוען...</p> : null}
              {!loading && shown.length === 0 ? (
                <p className={styles.empty}>{hasQuery ? 'מצטערים, אבל הפרופיל לא קיים' : 'אין חיפושים אחרונים'}</p>
              ) : null}
              {shown.map(item => {
                if (item.type === 'hashtag') {
                  return (
                    <button key={item.key} type="button" className={styles.tagRow} onClick={() => setTag(item.tag)}>
                      <span className={styles.hash}>#</span>
                      <span className={styles.tagText}>
                        <span className={styles.tagTitle} dir="auto">
                          #{item.tag}
                        </span>
                        <span className={styles.tagCount}>{item.count} פוסטים</span>
                      </span>
                      <MdiIcon path={mdiChevronLeft} size={31} color="#8C8A99" />
                    </button>
                  );
                }
                const listing = item.listing || (item.recentSubscriptionType ? {subscription_type: item.recentSubscriptionType} : null);
                const targetId = item.ratingTargetId || item.recentTargetId;
                const showRating = listing && shouldShowListingPiRating(listing);
                const rating = showRating ? ratings[targetId] ?? brokerPiRatingFromListing(listing) : null;
                return (
                  <div key={item.key} className={styles.userRow}>
                    <button type="button" className={styles.userMain} onClick={() => openUser(item)}>
                      <ProfileAvatar
                        uri={item.avatar || null}
                        size={78}
                        subscriptionType={listing}
                        forceGoldRing={shouldForceGoldRingForListing(item.listing)}
                      />
                      <span className={styles.userText}>
                        <span className={styles.userName} dir="auto">
                          {item.name}
                        </span>
                        <span className={styles.userMeta}>
                          {item.subtitle ? (
                            <span className={styles.userSub} dir="auto">
                              {item.subtitle}
                            </span>
                          ) : null}
                          {rating != null ? <RatingMark value={rating} /> : null}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.dismiss}
                      aria-label="הסר מהרשימה"
                      onClick={() => setHidden(prev => new Set(prev).add(item.key))}>
                      <MdiIcon path={mdiClose} size={31} color="#fff" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </>
  );
}
