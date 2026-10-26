import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  mdiAlertCircleOutline,
  mdiChevronLeft,
  mdiImageOff,
  mdiRocketLaunch,
  mdiSnowflake,
  mdiSnowflakeMelt,
} from '@mdi/js';
import MdiIcon from './MdiIcon';
import {Home, imgMenu} from '../components/figma/topbar.generated';
import iconUp from '../assets/figma/edit-publish/up.svg';
import iconClose from '../assets/figma/edit-publish/close.svg';
import iconEye from '../assets/figma/edit-publish/eye.svg';
import iconMessage from '../assets/figma/edit-publish/message.svg';
import iconSnow from '../assets/figma/edit-publish/snow.svg';
import iconEdit from '../assets/figma/edit-publish/edit.svg';
import iconGrid from '../assets/figma/edit-publish/grid.svg';
import iconList from '../assets/figma/edit-publish/list.svg';
import iconPlus from '../assets/figma/edit-publish/plus.svg';
import iconPlusV from '../assets/figma/edit-publish/plus-v.svg';
import iconPlusH from '../assets/figma/edit-publish/plus-h.svg';
import iconAnalysis from '../assets/figma/edit-publish/analysis.svg';
import CreateAdSheet, {CREATE_SHEET_POST_ICON, CreateAdSheetDivider, CreateAdSheetRow} from './CreateAdSheet';
import FeedPostPreviewMedia from './components/FeedPostPreviewMedia';
import {VideoPreviewThumb} from './fields/VideoPreviewThumb';
import {getListings} from '../api/client';
import {boostListing, deleteListing, getBoostQuota, resolveSubscriptionId} from '../api/editPublish';
import {listingImageUrls} from '../profile/lib/listingGridCardFigma';
import {resolveListingEditVideoSourceUrl} from '../profile/lib/videoPlayback';
import {getUserBnbHostLock, shouldShowBnbCreateOption} from './lib/bnbHostLock';
import {
  canAccessListingAnalysis,
  canCreateOpenHousePost,
  canShowListingAdInCreateSheet,
  CREATE_SHEET_OPEN_HOUSE_ICON,
  excludeSalesImageCompanionListings,
  getCreateSheetListingAssetLabel,
  getCreateSheetListingAssetSubtitle,
  getCreateSheetListingIcon,
  getFeedPostBadgeLabel,
  getFeedPostCardCaption,
  getPublishCategoriesStrip,
  isCompanySubscriptionType,
  isOpenHouseListing,
  mobileAsset,
  OPEN_HOUSE_POST_DESCRIPTION,
  resolveListingCategoryFromEditProfileUi,
  toEditProfileUiCategoryId,
} from './lib/publishRules';
import styles from './EditPublishAdScreen.module.css';

const FROZEN_IDS_KEY = 'pi_edit_frozen_listing_ids';
const BORDER_GOLD = '#D4AF37';
const TEXT_LIGHT = 'rgba(255,255,255,0.7)';

const ICONS = {
  views: iconEye,
  comments: iconMessage,
  boost: iconUp,
  freeze: iconSnow,
  remove: iconClose,
  analysis: iconAnalysis,
  grid: iconGrid,
  list: iconList,
  plus: iconPlus,
  edit: iconEdit,
  checkbox: mobileAsset('checkbox.png'),
  bnbPrivate: mobileAsset('ad-uplaud/bnb-private.png'),
  bnbBusiness: mobileAsset('ad-uplaud/bnb-bussiness.png'),
};

const EXPOSURE_ASSETS = {
  high: mobileAsset('edit/high.png'),
  medium: mobileAsset('exposure-medium.png'),
  low: mobileAsset('exposure-low.png'),
};

/** True when a listing/post belongs to the logged-in account (edit/publish mine-only). */
function listingBelongsToCurrentUser(listing, currentUser) {
  if (!listing || !currentUser) return false;
  const mySubId = resolveSubscriptionId(currentUser);
  // Ownership fields only — listing.id is the ad UUID.
  const listingSubRaw = listing.subscription_id ?? listing.subscriptionId ?? listing.owner_id ?? listing.ownerId ?? null;
  const listingSub = listingSubRaw != null && String(listingSubRaw).trim() ? String(listingSubRaw).trim() : '';
  if (mySubId && listingSub && listingSub === mySubId) return true;
  const myEmail = currentUser.email != null ? String(currentUser.email).trim().toLowerCase() : '';
  if (!myEmail) return false;
  return [listing.email, listing.creator_email, listing.owner_email]
    .filter(Boolean)
    .map(e => String(e).trim().toLowerCase())
    .includes(myEmail);
}

const VIDEO_URL_REGEX = /\.(mp4|mov|webm|m4v|ogg)(\?|$)/i;

const isVideoMediaUrl = url => {
  if (url == null || url === '') return false;
  const s = String(url).trim();
  if (!s) return false;
  if (VIDEO_URL_REGEX.test(s)) return true;
  return /\/videos?\//i.test(s);
};

const getListingVideoUrl = listing => {
  const v0 = listing?.listing_videos?.[0];
  const fromSource = v0?.source_video_url;
  if (fromSource && String(fromSource).trim()) return String(fromSource).trim();
  const fromVideos = v0?.video_url;
  if (fromVideos && String(fromVideos).trim() && !/\.m3u8|stream\.mux\.com/i.test(fromVideos)) {
    return String(fromVideos).trim();
  }
  if (listing?.video_url && String(listing.video_url).trim()) {
    const direct = String(listing.video_url).trim();
    if (!/\.m3u8|stream\.mux\.com/i.test(direct)) return direct;
  }
  if (listing?.video?.uri && String(listing.video.uri).trim()) return String(listing.video.uri).trim();
  const candidates = [
    listing?.main_image_url,
    listing?.image,
    ...(Array.isArray(listing?.images)
      ? listing.images.map(img => (typeof img === 'string' ? img : img?.uri || img?.image_url))
      : []),
  ].filter(Boolean);
  const legacyVideo = candidates.find(url => isVideoMediaUrl(url));
  return legacyVideo ? String(legacyVideo).trim() : null;
};

const getListingEngagementStats = (listing, postRecord) => {
  const views = listing.views ?? listing.view_count ?? 0;
  const likes = postRecord
    ? listing.post_like_count != null
      ? Number(listing.post_like_count)
      : listing.like_count != null
        ? Number(listing.like_count)
        : 0
    : listing.like_count != null
      ? Number(listing.like_count)
      : 0;
  const comments = postRecord
    ? listing.comment_count != null
      ? Number(listing.comment_count)
      : listing.comments != null
        ? Number(listing.comments)
        : 0
    : listing.review_count != null
      ? Number(listing.review_count)
      : listing.comment_count != null
        ? Number(listing.comment_count)
        : 0;
  return {views, likes, comments};
};

function ListingStatsRow({listing, postRecord}) {
  const {views, comments} = getListingEngagementStats(listing, postRecord);
  return (
    <div className={styles.statsRow}>
      <span className={styles.statItem}>
        <img src={ICONS.views} alt="" width={24} height={24} />
        <span className={styles.statText}>{Number(views).toLocaleString('en-US')}</span>
      </span>
      <span className={styles.statItem}>
        <img src={ICONS.comments} alt="" width={24} height={24} />
        <span className={styles.statText}>{Number(comments).toLocaleString('en-US')}</span>
      </span>
    </div>
  );
}

/** Feed-post rows, so this screen can badge real ads vs free-form posts. */
const isPostListingRecord = item => {
  if (!item) return false;
  const type = String(item.propertyType || item.property_type || item.propertyTypeRaw || item.apartmentTypeId || '').toLowerCase();
  const descLower = String(item.description || item.desc || '').trim().toLowerCase();
  if (
    type === 'post' ||
    type === 'posts' ||
    type === 'feed_post' ||
    type.includes('post') ||
    descLower === 'post' ||
    descLower.includes('פוסט') ||
    isOpenHouseListing(item) ||
    descLower.includes('post') ||
    item.feed_post === true ||
    item.feed_post === 'true' ||
    item.feed_post === 't' ||
    item.isPostEntry === true
  ) {
    return true;
  }
  // Posts upload with a `post_<timestamp>` filename even when feed_post / description aren't set.
  const urls = [
    item.main_image_url,
    item.image_url,
    item.image,
    ...(Array.isArray(item.images) ? item.images.map(i => (i && typeof i === 'object' ? i.uri || i.image_url : i)) : []),
    ...(Array.isArray(item.listing_images)
      ? item.listing_images.map(i => (i && typeof i === 'object' ? i.image_url || i.uri : i))
      : []),
  ].filter(Boolean);
  return urls.some(u => /post_\d/i.test(String(u)));
};

const getListingCreatedTs = listing => {
  const raw = listing?.created_at || listing?.createdAt || listing?.uploaded_at || listing?.uploadedAt || listing?.inserted_at || null;
  if (raw) {
    const ts = new Date(raw).getTime();
    if (Number.isFinite(ts)) return ts;
  }
  const idNum = Number(listing?.id ?? listing?.ad_number);
  return Number.isFinite(idNum) ? idNum : 0;
};

const listingStableKey = listing => String(listing?.id ?? listing?.ad_number ?? '');

/** Oldest post / ad = 1, counting up by created_at; posts and ads are numbered separately. */
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

/** White badge on ad cards: open house → בית פתוח; post → פוסט; land → קרקע; BnB → BNB; etc. */
const getListingTypeBadgeLabel = (listing, currentUser) => {
  if (isPostListingRecord(listing)) return getFeedPostBadgeLabel(listing);
  const cat = listing?.category != null ? parseInt(String(listing.category), 10) : NaN;
  if (cat === 7) return 'קרקע';
  if (cat === 5) return 'BNB';
  if (isCompanySubscriptionType(currentUser?.subscription_type)) return 'פרויקט';
  return 'נכס';
};

const PUBLISH_STRIP_ORDER = ['דירות', 'משרדים', 'מסחר', 'קרקעות', 'יוקרה', 'מגזר דתי', 'גלובל', 'BNB', 'חדש מקבלן', 'שותפים'];

const sortPublishStrip = strip =>
  [...strip].sort((a, b) => PUBLISH_STRIP_ORDER.indexOf(a.name) - PUBLISH_STRIP_ORDER.indexOf(b.name));

const getRightmostStripCategoryId = strip => (strip?.length ? strip[0].id : null);

const getExposureLabel = exposure => {
  if (exposure === 'high') return 'גבוהה';
  if (exposure === 'medium') return 'בינונית';
  return 'נמוכה';
};

function readFrozenIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FROZEN_IDS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(x => String(x)) : [];
  } catch {
    return [];
  }
}

const persistFrozenIds = ids => {
  try {
    localStorage.setItem(FROZEN_IDS_KEY, JSON.stringify(Array.isArray(ids) ? ids : []));
  } catch {
    // Storage disabled — frozen state still comes from the API.
  }
};

function ConfirmModal({icon, title, message, cancelDisabled, onCancel, children}) {
  return (
    <div className={styles.modalRoot} data-account-modal="" role="dialog" aria-modal="true">
      <button type="button" className={styles.modalBackdrop} aria-label="סגור" onClick={() => !cancelDisabled && onCancel()} />
      <div className={styles.modalCard}>
        <span className={styles.modalIcon}>
          <MdiIcon path={icon} size={62} color={BORDER_GOLD} />
        </span>
        <h3 className={styles.modalTitle}>{title}</h3>
        <p className={styles.modalMessage}>{message}</p>
        <div className={styles.modalButtons}>
          <button type="button" className={styles.modalCancel} onClick={onCancel} disabled={cancelDisabled}>
            ביטול
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function EditPublishAdScreen({
  onClose,
  uploadedListings = [],
  currentUser = null,
  initialCategoryId = null,
  refreshKey = 0,
  onCreateAd,
  onEditAd,
  onEditPost,
  onFreeze,
  onUnfreeze,
  onRemove,
  onOpenListingAnalysis,
  onCreatePost,
  onCategoryChange,
  onHome,
  onMenu,
}) {
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => toEditProfileUiCategoryId(initialCategoryId));
  const selectedCategoryIdRef = useRef(selectedCategoryId);
  selectedCategoryIdRef.current = selectedCategoryId;
  const [fetchedListings, setFetchedListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [removeConfirmListing, setRemoveConfirmListing] = useState(null);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);
  const [freezeConfirmListing, setFreezeConfirmListing] = useState(null);
  const [unfreezeConfirmListing, setUnfreezeConfirmListing] = useState(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [frozenListingIds, setFrozenListingIds] = useState(readFrozenIds);
  const [boostConfirmListing, setBoostConfirmListing] = useState(null);
  const [boostQuota, setBoostQuota] = useState({quota: 1, used: 0, remaining: 1});
  const [boostSubmitting, setBoostSubmitting] = useState(false);
  /** Local overrides so the UI reflects a successful boost before re-fetch. */
  const [boostedOverrides, setBoostedOverrides] = useState({});
  /** Once the user taps a strip icon, never snap selection back to חדש מקבלן. */
  const userPickedCategoryRef = useRef(false);
  const stripRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingListings(true);
      try {
        const mySubId = resolveSubscriptionId(currentUser);
        // Never load the public feed into edit/publish — require a real owner id.
        if (!mySubId && !currentUser?.email) {
          if (!cancelled) setFetchedListings([]);
          return;
        }
        const result = await getListings({
          status: 'published',
          ...(mySubId ? {subscription_id: mySubId} : currentUser?.id ? {subscription_id: currentUser.id} : {}),
        });
        if (cancelled) return;
        if (result?.success && result?.listings?.length) {
          const transformed = result.listings
            .filter(l => listingBelongsToCurrentUser(l, currentUser))
            .map(l => {
              const images = listingImageUrls(l).map(uri => ({uri}));
              const listingVideos = l.listing_videos || [];
              const videoUrl =
                resolveListingEditVideoSourceUrl(l) ||
                (l.video_url && String(l.video_url).trim()) ||
                listingVideos[0]?.video_url ||
                null;
              return {
                ...l,
                images,
                image: images[0]?.uri ?? l.main_image_url ?? null,
                video_url: videoUrl,
                listing_videos: listingVideos,
                views: l.view_count,
                comments: l.comment_count,
                is_frozen: l.is_frozen === true || l.is_frozen === 'true',
                hot_deal: l.hot_deal === true || l.hot_deal === 'true' || l.hot_deal === 't',
                price_per_night:
                  l.price_per_night != null && !Number.isNaN(Number(l.price_per_night)) ? Number(l.price_per_night) : null,
              };
            });
          setFetchedListings(transformed);
        } else {
          setFetchedListings([]);
        }
      } catch {
        if (!cancelled) setFetchedListings([]);
      } finally {
        if (!cancelled) setLoadingListings(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.subscription_id, currentUser?.email, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const mergedListings = useMemo(() => {
    const mine = (Array.isArray(uploadedListings) ? uploadedListings : []).filter(l =>
      listingBelongsToCurrentUser(l, currentUser),
    );
    const byId = new Map();
    // API rows first so their is_frozen wins over local uploads.
    [...fetchedListings, ...mine].forEach(l => {
      const id = l.id ?? l.ad_number;
      if (id != null && !byId.has(id)) byId.set(id, l);
    });
    return excludeSalesImageCompanionListings(Array.from(byId.values()));
  }, [fetchedListings, uploadedListings, currentUser]);

  const selectedListingCategoryId = resolveListingCategoryFromEditProfileUi(selectedCategoryId);
  const isBnbCategory = Number(selectedListingCategoryId) === 5;
  const isPartnersCategory = Number(selectedListingCategoryId) === 3;
  const isOfficesListingCategory = Number(selectedListingCategoryId) === 2;
  const isLandListingCategory = Number(selectedListingCategoryId) === 7;
  const publishCategoriesStrip = useMemo(
    () => sortPublishStrip(getPublishCategoriesStrip(currentUser?.subscription_type)),
    [currentUser?.subscription_type],
  );

  useEffect(() => {
    if (userPickedCategoryRef.current) return;
    if (publishCategoriesStrip.length === 0) {
      if (initialCategoryId != null) setSelectedCategoryId(toEditProfileUiCategoryId(initialCategoryId));
      return;
    }
    const explicitUiId =
      initialCategoryId != null && initialCategoryId !== '' ? toEditProfileUiCategoryId(initialCategoryId) : null;
    const current = selectedCategoryIdRef.current;
    const nextSelectedId =
      explicitUiId != null && publishCategoriesStrip.some(cat => cat.id === explicitUiId)
        ? explicitUiId
        : getRightmostStripCategoryId(publishCategoriesStrip);
    if (nextSelectedId != null && nextSelectedId !== current) setSelectedCategoryId(nextSelectedId);
  }, [initialCategoryId, publishCategoriesStrip]);

  useEffect(() => {
    if (selectedListingCategoryId == null || typeof onCategoryChange !== 'function') return;
    onCategoryChange(selectedListingCategoryId);
  }, [selectedListingCategoryId, onCategoryChange]);

  useEffect(() => {
    stripRef.current
      ?.querySelector(`[data-category-id="${selectedCategoryId}"]`)
      ?.scrollIntoView({block: 'nearest', inline: 'nearest'});
  }, [selectedCategoryId]);

  const showListingCreateInSheet = useMemo(
    () => canShowListingAdInCreateSheet(currentUser?.subscription_type, selectedListingCategoryId),
    [currentUser?.subscription_type, selectedListingCategoryId],
  );
  // בית פתוח: broker, company, project marketer.
  const showOpenHouseCreateInSheet = canCreateOpenHousePost(currentUser);

  const filteredListings = useMemo(() => {
    if (publishCategoriesStrip.length === 0 || !selectedCategoryId) return mergedListings;
    return mergedListings.filter(l => (l.category != null && parseInt(l.category, 10)) === selectedListingCategoryId);
  }, [mergedListings, publishCategoriesStrip.length, selectedCategoryId, selectedListingCategoryId]);

  // פוסט/מודעה מס׳ 1 = oldest upload; separate counters for posts vs ads.
  const listingOrdinalById = useMemo(() => buildOldestFirstOrdinalMap(mergedListings), [mergedListings]);

  const getFirstImage = listing => {
    if (listing.images?.length) {
      for (const img of listing.images) {
        const uri = typeof img === 'string' ? img : img?.uri || img?.image_url || '';
        if (uri && !isVideoMediaUrl(uri)) return uri;
      }
    }
    if (listing.image && !isVideoMediaUrl(listing.image)) return listing.image;
    return null;
  };

  const renderListingMedia = (listing, mediaClass) => {
    if (isPostListingRecord(listing)) {
      return <FeedPostPreviewMedia listing={listing} className={styles.mediaFill} showOpenHouseChrome={false} cropOverflow />;
    }
    const videoUrl = getListingVideoUrl(listing);
    if (videoUrl) return <VideoPreviewThumb uri={videoUrl} className={styles.mediaFill} />;
    const image = getFirstImage(listing);
    if (image) return <img src={image} alt="" className={mediaClass} />;
    return (
      <div className={`${mediaClass} ${styles.imagePlaceholder}`}>
        <MdiIcon path={mdiImageOff} size={62} color={TEXT_LIGHT} />
      </div>
    );
  };

  /**
   * Exposure from real activity: active boost → high; frozen → low;
   * otherwise by age (< 7 days high, < 14 medium, else low).
   */
  const computeExposureLevel = listing => {
    if (!listing) return 'low';
    const listingId = listing?.id ?? listing?.ad_number;
    const overrideExpiry = listingId != null ? boostedOverrides[String(listingId)] : null;
    const expiryRaw = overrideExpiry || listing.boost_expires_at || listing.boostExpiresAt;
    if (expiryRaw) {
      const expiryTs = new Date(expiryRaw).getTime();
      if (Number.isFinite(expiryTs) && expiryTs > Date.now()) return 'high';
    }
    if (listing.is_frozen === true || listing.is_frozen === 'true') return 'low';
    const createdRaw = listing.created_at || listing.createdAt || listing.uploaded_at || listing.uploadedAt || listing.inserted_at || null;
    if (createdRaw) {
      const createdTs = new Date(createdRaw).getTime();
      if (Number.isFinite(createdTs)) {
        const ageDays = (Date.now() - createdTs) / (1000 * 60 * 60 * 24);
        if (ageDays < 7) return 'high';
        if (ageDays < 14) return 'medium';
        return 'low';
      }
    }
    return 'low';
  };

  useEffect(() => {
    const email = currentUser?.email;
    if (!email) return undefined;
    let cancelled = false;
    getBoostQuota(email)
      .then(res => {
        if (cancelled) return;
        setBoostQuota({
          quota: Number(res?.quota ?? 1),
          used: Number(res?.used ?? 0),
          remaining: Number(res?.remaining ?? 1),
        });
      })
      .catch(err => console.warn('getBoostQuota failed:', err?.message || err));
    return () => {
      cancelled = true;
    };
  }, [currentUser?.email]);

  const handleConfirmRemove = async () => {
    const listing = removeConfirmListing;
    if (!listing || removeSubmitting) return;
    const listingId = listing.id ?? listing.ad_number;
    const email = currentUser?.email;
    if (!listingId || !email) {
      window.alert('לא ניתן להסיר כרגע');
      return;
    }
    setRemoveSubmitting(true);
    try {
      await deleteListing(listingId, email, currentUser?.id);
      const idStr = String(listingId);
      setFetchedListings(prev => prev.filter(l => String(l.id ?? l.ad_number) !== idStr));
      onRemove?.(listing);
      setRemoveConfirmListing(null);
    } catch (e) {
      window.alert(e?.message || 'שגיאה בהסרת המודעה');
    } finally {
      setRemoveSubmitting(false);
    }
  };

  const handleConfirmBoost = async () => {
    const listing = boostConfirmListing;
    if (!listing || boostSubmitting) return;
    const listingId = listing.id ?? listing.ad_number;
    const email = currentUser?.email;
    if (!listingId || !email) {
      setBoostConfirmListing(null);
      window.alert('לא ניתן להקפיץ כרגע');
      return;
    }
    setBoostSubmitting(true);
    try {
      const res = await boostListing(listingId, email);
      setBoostQuota(q => ({
        quota: Number(res?.quota ?? q.quota),
        used: Number(res?.used ?? q.used + 1),
        remaining: Number(res?.remaining ?? Math.max(0, q.remaining - 1)),
      }));
      if (res?.boost_expires_at) {
        setBoostedOverrides(prev => ({...prev, [String(listingId)]: res.boost_expires_at}));
      }
      setBoostConfirmListing(null);
      window.alert('ההקפצה הופעלה! הדירוג הוא "גבוהה" למשך 24 שעות.');
    } catch (e) {
      if (e?.code === 'QUOTA_EXCEEDED') {
        setBoostQuota(q => ({quota: Number(e?.quota ?? q.quota), used: Number(e?.used ?? q.used), remaining: 0}));
      }
      window.alert(e?.message || 'הקפצה נכשלה');
    } finally {
      setBoostSubmitting(false);
    }
  };

  const canBoostThisMonth = boostQuota.remaining > 0;

  const openBoostConfirm = listing => {
    if (!canBoostThisMonth) {
      window.alert('הגעת למכסת ההקפצות החודשית (הקפצה אחת בחודש).');
      return;
    }
    setBoostConfirmListing(listing);
  };

  const isFrozen = listing => {
    const id = listing?.id ?? listing?.ad_number;
    if (id == null) return false;
    const idStr = String(id);
    const fromApi = listing?.is_frozen === true || listing?.is_frozen === 'true';
    return fromApi || frozenListingIds.some(fid => String(fid) === idStr);
  };

  const confirmFreeze = () => {
    const listing = freezeConfirmListing;
    if (listing) onFreeze?.(listing);
    const id = listing?.id ?? listing?.ad_number;
    if (id != null) {
      const idStr = String(id);
      setFrozenListingIds(prev => {
        if (prev.some(fid => String(fid) === idStr)) return prev;
        const next = [...prev, idStr];
        persistFrozenIds(next);
        return next;
      });
    }
    setFreezeConfirmListing(null);
  };

  const confirmUnfreeze = () => {
    const listing = unfreezeConfirmListing;
    if (listing) onUnfreeze?.(listing);
    const id = listing?.id ?? listing?.ad_number;
    if (id != null) {
      const idStr = String(id);
      setFrozenListingIds(prev => {
        const next = prev.filter(fid => String(fid) !== idStr);
        persistFrozenIds(next);
        return next;
      });
    }
    setUnfreezeConfirmListing(null);
  };

  const openEdit = (listing, postRecord) => (postRecord ? onEditPost?.(listing) : onEditAd?.(listing));

  const openCreateListing = (opts = {}) => {
    setShowCreateSheet(false);
    const lockedHost = getUserBnbHostLock(currentUser);
    const nextOpts = lockedHost ? {...opts, bnbHostType: lockedHost} : opts;
    onCreateAd?.(selectedListingCategoryId ?? selectedCategoryId, nextOpts);
  };

  const openCreatePost = (opts = {}) => {
    setShowCreateSheet(false);
    onCreatePost?.(selectedListingCategoryId ?? selectedCategoryId, opts);
  };

  const anyModalOpen =
    showCreateSheet ||
    removeConfirmListing != null ||
    freezeConfirmListing != null ||
    unfreezeConfirmListing != null ||
    boostConfirmListing != null;

  const closeTopLayer = useCallback(() => {
    if (removeSubmitting || boostSubmitting) return;
    if (showCreateSheet) setShowCreateSheet(false);
    else if (removeConfirmListing) setRemoveConfirmListing(null);
    else if (freezeConfirmListing) setFreezeConfirmListing(null);
    else if (unfreezeConfirmListing) setUnfreezeConfirmListing(null);
    else if (boostConfirmListing) setBoostConfirmListing(null);
  }, [boostConfirmListing, boostSubmitting, freezeConfirmListing, removeConfirmListing, removeSubmitting, showCreateSheet, unfreezeConfirmListing]);

  useEffect(() => {
    if (!anyModalOpen) return undefined;
    const onKey = e => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      closeTopLayer();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [anyModalOpen, closeTopLayer]);

  const renderTypeBadge = listing => (
    <span className={styles.typeBadge}>{getListingTypeBadgeLabel(listing, currentUser)}</span>
  );

  const renderEditBadge = (listing, postRecord, className) =>
    !postRecord || onEditPost ? (
      <button type="button" className={className} onClick={() => openEdit(listing, postRecord)} aria-label="עריכה">
        <img src={ICONS.edit} alt="" width={27} height={27} />
      </button>
    ) : null;

  const renderExposure = listing => {
    const exposure = computeExposureLevel(listing);
    return (
      <img
        src={EXPOSURE_ASSETS[exposure]}
        alt={`חשיפה ${getExposureLabel(exposure)}`}
        className={exposure === 'high' ? styles.exposureHigh : styles.exposure}
      />
    );
  };

  const renderGridAdCard = (listing, index) => {
    const postRecord = isPostListingRecord(listing);
    const frozen = isFrozen(listing);
    const ordinal = listingOrdinalById.get(listingStableKey(listing)) ?? index + 1;
    return (
      <article className={styles.adCard}>
        <div className={`${styles.adImageWrap} ${postRecord ? styles.adImageWrapPost : ''}`}>
          {renderListingMedia(listing, styles.adImage)}
          {renderEditBadge(listing, postRecord, styles.editBadge)}
          {renderTypeBadge(listing)}
          <div className={styles.advertisementNo}>{postRecord ? `פוסט מס׳ ${ordinal}` : `מודעה מס׳ ${ordinal}`}</div>
        </div>
        <div className={styles.adBody}>
          <div className={styles.adSummary}>
            {renderExposure(listing)}
            <div className={styles.adTextCol}>
              <p className={styles.adDescription}>
                {postRecord ? getFeedPostCardCaption(listing) : listing.description || '—'}
              </p>
              <ListingStatsRow listing={listing} postRecord={postRecord} />
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => openBoostConfirm(listing)}
                  disabled={!canBoostThisMonth}>
                  <span>הקפצה</span>
                  <img src={ICONS.boost} alt="" width={24} height={24} />
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => (frozen ? setUnfreezeConfirmListing(listing) : setFreezeConfirmListing(listing))}>
                  <span className={frozen ? styles.frozenText : undefined}>{frozen ? 'הוקפאה' : 'הקפאה'}</span>
                  {frozen ? (
                    <span className={styles.frozenIcon} style={{'--icon': `url(${ICONS.freeze})`}} />
                  ) : (
                    <img src={ICONS.freeze} alt="" width={24} height={24} />
                  )}
                </button>
                <button type="button" className={styles.actionBtn} onClick={() => setRemoveConfirmListing(listing)}>
                  <span>הסרה</span>
                  <img src={ICONS.remove} alt="" width={24} height={24} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  };

  const renderListAdCard = (listing, index) => {
    const postRecord = isPostListingRecord(listing);
    const frozen = isFrozen(listing);
    const ordinal = listingOrdinalById.get(listingStableKey(listing)) ?? index + 1;
    return (
      <article className={`${styles.adCard} ${styles.adCardLarge}`}>
        <div className={`${styles.adImageWrap} ${styles.adImageWrapLarge} ${postRecord ? styles.adImageWrapPost : ''}`}>
          {renderListingMedia(listing, styles.adImage)}
          {renderEditBadge(listing, postRecord, styles.editBadge)}
          {renderTypeBadge(listing)}
          <div className={styles.advertisementNo}>{postRecord ? `פוסט מס׳ ${ordinal}` : `מודעה מס׳ ${ordinal}`}</div>
        </div>
        <div className={`${styles.adBody} ${styles.adBodyLarge}`}>
          <div className={styles.adSummary}>
            {renderExposure(listing)}
            <div className={styles.adTextCol}>
              <p className={`${styles.adDescription} ${styles.adDescriptionLarge}`}>
                {postRecord ? getFeedPostCardCaption(listing) : listing.description || '—'}
              </p>
              <div className={styles.cardFooter}>
                <ListingStatsRow listing={listing} postRecord={postRecord} />
                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => openBoostConfirm(listing)}
                    disabled={!canBoostThisMonth}>
                    <span>הקפצה</span>
                    <img src={ICONS.boost} alt="" width={24} height={24} />
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => (frozen ? setUnfreezeConfirmListing(listing) : setFreezeConfirmListing(listing))}>
                    <span className={frozen ? styles.frozenText : undefined}>{frozen ? 'הוקפאה' : 'הקפאה'}</span>
                    {frozen ? (
                      <span className={styles.frozenIcon} style={{'--icon': `url(${ICONS.freeze})`}} />
                    ) : (
                      <img src={ICONS.freeze} alt="" width={24} height={24} />
                    )}
                  </button>
                  <button type="button" className={styles.actionBtn} onClick={() => setRemoveConfirmListing(listing)}>
                    <span>הסרה</span>
                    <img src={ICONS.remove} alt="" width={24} height={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  };

  const isCompany = isCompanySubscriptionType(currentUser?.subscription_type);
  const listingRowTitle = isOfficesListingCategory
    ? isCompany
      ? 'משרדים'
      : 'משרד'
    : isPartnersCategory
      ? 'פרסם מודעה'
      : isLandListingCategory
        ? 'קרקע'
        : getCreateSheetListingAssetLabel(currentUser?.subscription_type);
  const listingRowSubtitle = isPartnersCategory
    ? 'צור מודעה כדי להיכנס, להכניס או למצוא שותף'
    : isOfficesListingCategory
      ? isCompany
        ? 'פרסמו פרויקט'
        : 'פרסם משרד למכירה או השכרה'
      : isLandListingCategory
        ? 'פרסם קרקע'
        : getCreateSheetListingAssetSubtitle(currentUser?.subscription_type);

  const showAnalysis = canAccessListingAnalysis(currentUser?.subscription_type);
  const noListings = !loadingListings && filteredListings.length === 0;

  return (
    <div className={styles.screen} dir="rtl">
      <header className={styles.chrome}>
        <div className={styles.utilityRow}>
          <button type="button" className={styles.utilityBtn} onClick={onHome || onClose} aria-label="דף הבית">
            <Home />
          </button>
          <button type="button" className={styles.utilityBtn} onClick={onMenu} aria-label="תפריט" disabled={!onMenu}>
            <img src={imgMenu} alt="" width={40} height={40} />
          </button>
        </div>
        <div className={styles.categoryBar}>
          <div className={styles.titleBlock}>
            <h1 className={styles.headerTitle}>ערוך/פרסם מודעה</h1>
            <p className={styles.sectionLabel}>בחרו קטגוריה לפרסם בה</p>
          </div>
          {publishCategoriesStrip.length > 0 ? (
            <div className={styles.categoryStrip} ref={stripRef}>
              {publishCategoriesStrip.map(cat => {
                const selected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    data-category-id={cat.id}
                    className={styles.categoryItem}
                    aria-pressed={selected}
                    onClick={() => {
                      userPickedCategoryRef.current = true;
                      setSelectedCategoryId(cat.id);
                    }}>
                    <img src={selected ? cat.selectedImage : cat.image} alt="" className={styles.categoryImage} />
                    <span className={styles.categoryNameRow}>
                      {selected ? <img src={ICONS.checkbox} alt="" className={styles.categoryCheckbox} /> : null}
                      <span className={selected ? styles.categoryNameSelected : styles.categoryName}>{cat.name}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <span className={styles.categoryStrip} />
          )}
          <button type="button" className={styles.backBtn} onClick={onClose}>
            <MdiIcon path={mdiChevronLeft} size={24} color="#fff" />
            <span>חזור</span>
          </button>
        </div>
      </header>

      <div className={styles.body} inert={anyModalOpen ? true : undefined}>
        {noListings ? null : (
        <aside className={styles.rail}>
          <div className={styles.viewToggle}>
            <button
              type="button"
              className={styles.viewBtn}
              aria-pressed={viewMode === 'grid'}
              aria-label="תצוגת רשת"
              onClick={() => setViewMode('grid')}>
              <img src={ICONS.grid} alt="" width={24} height={24} />
            </button>
            <button
              type="button"
              className={styles.viewBtn}
              aria-pressed={viewMode === 'list'}
              aria-label="תצוגת רשימה"
              onClick={() => setViewMode('list')}>
              <img src={ICONS.list} alt="" width={24} height={24} />
            </button>
          </div>
          <button type="button" className={styles.createPill} onClick={() => setShowCreateSheet(true)}>
            <img src={ICONS.plus} alt="" width={40} height={40} />
            <span>צור מודעה</span>
          </button>
          {showAnalysis ? (
            <button type="button" className={styles.analysisPill} onClick={() => onOpenListingAnalysis?.()}>
              <img src={ICONS.analysis} alt="" width={32} height={32} />
              <span>ניתוח מודעות</span>
            </button>
          ) : null}
        </aside>
        )}
        <main className={styles.content}>
          {loadingListings ? (
            <div className={styles.emptyWrap}>
              <span className={styles.spinner} />
              <p className={styles.emptySubtext}>טוען מודעות...</p>
            </div>
          ) : noListings ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyCopy}>
                <p>אין מודעות לפרסום</p>
                <p>זה הזמן לייצר את מודעה חדשה!</p>
              </div>
              <button type="button" className={styles.emptyCreate} onClick={() => setShowCreateSheet(true)}>
                <span>צור מודעה</span>
                <span className={styles.emptyPlus}>
                  <img src={iconPlusV} alt="" width={2} height={14} />
                  <img src={iconPlusH} alt="" width={2} height={14} />
                </span>
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? styles.grid : styles.list}>
              {filteredListings.map((listing, index) => {
                const id = listing?.id ?? listing?.ad_number;
                const key = id != null ? `${String(id)}-${index}` : `listing-${index}`;
                return (
                  <div key={key} className={styles.cell}>
                    {viewMode === 'grid' ? renderGridAdCard(listing, index) : renderListAdCard(listing, index)}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {showCreateSheet ? (
        <CreateAdSheet onClose={() => setShowCreateSheet(false)}>
          {showListingCreateInSheet &&
            (isBnbCategory ? (
              <>
                {!isCompany && shouldShowBnbCreateOption(currentUser, 'private') ? (
                  <>
                    <CreateAdSheetRow
                      title="פרסם כפרטי"
                      subtitle="פרסם חדר או אתר נופש פרטי"
                      iconSource={ICONS.bnbPrivate}
                      onPress={() => openCreateListing({bnbHostType: 'private'})}
                    />
                    {shouldShowBnbCreateOption(currentUser, 'business') ? <CreateAdSheetDivider /> : null}
                  </>
                ) : null}
                {shouldShowBnbCreateOption(currentUser, 'business') ? (
                  <CreateAdSheetRow
                    title="פרסם כעסק"
                    subtitle="פרסם חדר או אתר נופש עסקי"
                    iconSource={ICONS.bnbBusiness}
                    onPress={() => openCreateListing({bnbHostType: 'business'})}
                  />
                ) : null}
              </>
            ) : (
              <CreateAdSheetRow
                title={listingRowTitle}
                subtitle={listingRowSubtitle}
                iconSource={getCreateSheetListingIcon(selectedListingCategoryId, currentUser?.subscription_type)}
                onPress={() => openCreateListing()}
              />
            ))}
          {showListingCreateInSheet ? <CreateAdSheetDivider /> : null}
          {showOpenHouseCreateInSheet ? (
            <>
              <CreateAdSheetRow
                title={OPEN_HOUSE_POST_DESCRIPTION}
                subtitle="פרסמו אירוע בית פתוח לקהילה"
                iconSource={CREATE_SHEET_OPEN_HOUSE_ICON}
                onPress={() => openCreatePost({openHouse: true})}
              />
              <CreateAdSheetDivider />
            </>
          ) : null}
          <CreateAdSheetRow
            title="פוסט"
            subtitle={isPartnersCategory ? 'שתף פוסט חופשי למציאת שותף או דירה' : 'שתף מידע או עדכון עם הקהילה'}
            iconSource={CREATE_SHEET_POST_ICON}
            onPress={() => openCreatePost()}
          />
        </CreateAdSheet>
      ) : null}

      {removeConfirmListing != null ? (
        <ConfirmModal
          icon={mdiAlertCircleOutline}
          title="האם אתה בטוח?"
          message="המודעה תוסר מהרשימה. לא ניתן לשחזר פעולה זו."
          cancelDisabled={removeSubmitting}
          onCancel={() => setRemoveConfirmListing(null)}>
          <button type="button" className={styles.modalDanger} onClick={handleConfirmRemove} disabled={removeSubmitting}>
            {removeSubmitting ? <span className={styles.spinnerSmall} /> : 'הסרה'}
          </button>
        </ConfirmModal>
      ) : null}

      {freezeConfirmListing != null ? (
        <ConfirmModal
          icon={mdiSnowflake}
          title="הקפיא מודעה?"
          message="המודעה תישאר אצלך אך לא תוצג במערכת. ניתן לבטל הקפאה בהמשך."
          onCancel={() => setFreezeConfirmListing(null)}>
          <button type="button" className={styles.modalGold} onClick={confirmFreeze}>
            כן
          </button>
        </ConfirmModal>
      ) : null}

      {boostConfirmListing != null ? (
        <ConfirmModal
          icon={mdiRocketLaunch}
          title="להקפיץ את המודעה?"
          message={
            <>
              המודעה תקבל חשיפה גבוהה למשך 24 שעות.
              <br />
              {boostQuota.remaining > 0
                ? `נותרה לך הקפצה אחת החודש (מתוך ${boostQuota.quota}).`
                : 'אין הקפצות נותרות החודש.'}
            </>
          }
          cancelDisabled={boostSubmitting}
          onCancel={() => setBoostConfirmListing(null)}>
          <button
            type="button"
            className={styles.modalGold}
            onClick={handleConfirmBoost}
            disabled={boostSubmitting || boostQuota.remaining <= 0}>
            {boostSubmitting ? <span className={`${styles.spinnerSmall} ${styles.spinnerDark}`} /> : 'הקפץ'}
          </button>
        </ConfirmModal>
      ) : null}

      {unfreezeConfirmListing != null ? (
        <ConfirmModal
          icon={mdiSnowflakeMelt}
          title="בטל הקפאה?"
          message="המודעה תוצג שוב במערכת."
          onCancel={() => setUnfreezeConfirmListing(null)}>
          <button type="button" className={styles.modalGold} onClick={confirmUnfreeze}>
            כן
          </button>
        </ConfirmModal>
      ) : null}
    </div>
  );
}
