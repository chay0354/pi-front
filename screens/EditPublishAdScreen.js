import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Octicons} from '@expo/vector-icons';
import {
  brokerCategories,
  canShowListingAdInCreateSheet,
  canAccessListingAnalysis,
  canCreateOpenHousePost,
  CREATE_SHEET_OPEN_HOUSE_ICON,
  DEFAULT_POST_DESCRIPTION,
  getFeedPostBadgeLabel,
  getFeedPostCardCaption,
  getCreateSheetListingIcon,
  getPublishCategoriesStrip,
  isOpenHouseListing,
  OPEN_HOUSE_POST_DESCRIPTION,
  resolveListingCategoryFromEditProfileUi,
  subscriptionTypes,
  toEditProfileUiCategoryId,
} from '../utils/constant';
import CreateAdSheet, {
  CreateAdSheetDivider,
  CreateAdSheetRow,
  CREATE_SHEET_POST_ICON,
} from '../components/CreateAdSheet';
import {VideoPreviewThumb} from '../components/FormsElement/VideoPreviewThumb';
import {getListings, getBoostQuota, boostListing, deleteListing, resolveSubscriptionId} from '../utils/api';
import {listingImageUrls} from '../utils/listingGridCardFigma';
import {resolveListingEditVideoSourceUrl} from '../utils/videoPlayback';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {flexStart} from '../utils/rtlLayout';

const FROZEN_IDS_KEY = 'pi_edit_frozen_listing_ids';

/** True when a listing/post belongs to the logged-in account (edit/publish mine-only). */
function listingBelongsToCurrentUser(listing, currentUser) {
  if (!listing || !currentUser) return false;
  const mySubId = resolveSubscriptionId(currentUser);
  // Prefer ownership fields — do not use listing.id (that is the ad UUID).
  const listingSubRaw =
    listing.subscription_id ??
    listing.subscriptionId ??
    listing.owner_id ??
    listing.ownerId ??
    null;
  const listingSub =
    listingSubRaw != null && String(listingSubRaw).trim()
      ? String(listingSubRaw).trim()
      : '';
  if (mySubId && listingSub && listingSub === mySubId) {
    return true;
  }
  const myEmail =
    currentUser.email != null ? String(currentUser.email).trim().toLowerCase() : '';
  if (!myEmail) return false;
  const listingEmails = [
    listing.email,
    listing.creator_email,
    listing.owner_email,
  ]
    .filter(Boolean)
    .map(e => String(e).trim().toLowerCase());
  return listingEmails.includes(myEmail);
}
const BG = '#1a1926';
const CARD_BG = '#2B2A39';
const BORDER_GOLD = '#D4AF37';
const FROZEN_ACTION_BLUE = '#4DA3FF';
const TEXT_LIGHT = 'rgba(255,255,255,0.7)';

const LISTING_STAT_ICONS = {
  views: require('../assets/eye_icon.png'),
  adComment: require('../assets/chat_icon.png'),
};

const STAT_ICON_COLOR = '#666666';
const STAT_ICON_OPACITY = 0.72;

/** PNG stats (views/comments) ship with gray strokes; only fade — no tint. */
const STAT_ICON_STYLE = {
  width: 22,
  height: 22,
  opacity: STAT_ICON_OPACITY,
  ...(Platform.OS === 'web' ? {objectFit: 'contain'} : {}),
};

const renderStatIcon = source => (
  <Image source={source} style={STAT_ICON_STYLE} resizeMode="contain" />
);

const renderLikeStatIcon = () => (
  <MaterialCommunityIcons
    name="heart-outline"
    size={22}
    color={STAT_ICON_COLOR}
    style={{opacity: STAT_ICON_OPACITY}}
  />
);

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
  if (fromSource && String(fromSource).trim()) {
    return String(fromSource).trim();
  }
  const fromVideos = v0?.video_url;
  if (fromVideos && String(fromVideos).trim() && !/\.m3u8|stream\.mux\.com/i.test(fromVideos)) {
    return String(fromVideos).trim();
  }
  if (listing?.video_url && String(listing.video_url).trim()) {
    const direct = String(listing.video_url).trim();
    if (!/\.m3u8|stream\.mux\.com/i.test(direct)) return direct;
  }
  if (listing?.video?.uri && String(listing.video.uri).trim()) {
    return String(listing.video.uri).trim();
  }
  const candidates = [
    listing?.main_image_url,
    listing?.image,
    ...(Array.isArray(listing?.images)
      ? listing.images.map(img =>
          typeof img === 'string' ? img : img?.uri || img?.image_url,
        )
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

const ListingStatsRow = ({listing, postRecord, textStyle}) => {
  const {views, likes, comments} = getListingEngagementStats(
    listing,
    postRecord,
  );

  return (
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        {renderStatIcon(LISTING_STAT_ICONS.views)}
        <Text style={[styles.statText, textStyle]}>{views}</Text>
      </View>
      <View style={styles.statItem}>
        {renderLikeStatIcon()}
        <Text style={[styles.statText, textStyle]}>{likes}</Text>
      </View>
      <View style={styles.statItem}>
        {renderStatIcon(LISTING_STAT_ICONS.adComment)}
        <Text style={[styles.statText, textStyle]}>{comments}</Text>
      </View>
    </View>
  );
};

// Detect feed-post rows so this screen shows only real ads (not free-form posts).
const isPostListingRecord = item => {
  if (!item) return false;
  const type = String(
    item.propertyType ||
      item.property_type ||
      item.propertyTypeRaw ||
      item.apartmentTypeId ||
      '',
  ).toLowerCase();
  const description = String(item.description || item.desc || '').trim();
  const descLower = description.toLowerCase();
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
  // Fallback: inspect image URLs. Posts are uploaded with a `post_<timestamp>`
  // filename segment even when `feed_post` / `description` aren't set on the row.
  const urls = [
    item.main_image_url,
    item.image_url,
    item.image,
    ...(Array.isArray(item.images)
      ? item.images.map(i =>
          i && typeof i === 'object' ? i.uri || i.image_url : i,
        )
      : []),
    ...(Array.isArray(item.listing_images)
      ? item.listing_images.map(i =>
          i && typeof i === 'object' ? i.image_url || i.uri : i,
        )
      : []),
  ].filter(Boolean);
  return urls.some(u => /post_\d/i.test(String(u)));
};

const getListingCreatedTs = listing => {
  const raw =
    listing?.created_at ||
    listing?.createdAt ||
    listing?.uploaded_at ||
    listing?.uploadedAt ||
    listing?.inserted_at ||
    null;
  if (raw) {
    const ts = new Date(raw).getTime();
    if (Number.isFinite(ts)) return ts;
  }
  const idNum = Number(listing?.id ?? listing?.ad_number);
  return Number.isFinite(idNum) ? idNum : 0;
};

const listingStableKey = listing =>
  String(listing?.id ?? listing?.ad_number ?? '');

/**
 * Oldest post / ad = 1, then count up by created_at.
 * Posts and ads are numbered in separate sequences.
 */
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

const isCompanyUser = user => {
  const t = String(
    user?.subscription_type || user?.subscriptionType || '',
  )
    .trim()
    .toLowerCase();
  return t === subscriptionTypes.company;
};

const isBrokerUser = user => {
  const t = String(
    user?.subscription_type || user?.subscriptionType || '',
  )
    .trim()
    .toLowerCase();
  return t === subscriptionTypes.broker;
};

const canOpenListingAnalysis = user =>
  canAccessListingAnalysis(user?.subscription_type);

/** White badge on ad cards: open house → בית פתוח; post → פוסט; land → קרקע; BnB → BNB; etc. */
const getListingTypeBadgeLabel = (listing, currentUser) => {
  if (isPostListingRecord(listing)) {
    return getFeedPostBadgeLabel(listing);
  }
  const cat =
    listing?.category != null ? parseInt(String(listing.category), 10) : NaN;
  if (cat === 7) return 'קרקע';
  if (cat === 5) return 'BNB';
  if (isCompanyUser(currentUser)) return 'פרויקט';
  return 'נכס';
};

// Category icon: crop outer background (dark card) so only center content shows
const CATEGORY_ICON_SIZE = 110;
const CATEGORY_ICON_CROP = 0.24; // crop from each edge (show center ~52%)
const CATEGORY_ICON_INNER = 1 - 2 * CATEGORY_ICON_CROP;
const categoryImageSize = Math.ceil(CATEGORY_ICON_SIZE / CATEGORY_ICON_INNER); // ~196
const categoryImageOffset = (categoryImageSize - CATEGORY_ICON_SIZE) / 2;

const getRightmostStripCategoryId = strip =>
  strip?.length ? strip[0].id : null;

const CATEGORY_STRIP_ITEM_WIDTH = 100;
const CATEGORY_STRIP_GAP = 22;
const CATEGORY_STRIP_PADDING = 20;

function computeCategoryStripScrollX(uiCategoryId, strip, contentW, viewportW) {
  if (!strip?.length || contentW <= 0 || viewportW <= 0) return null;
  const index = strip.findIndex(cat => cat.id === uiCategoryId);
  if (index < 0) return null;
  const stride = CATEGORY_STRIP_ITEM_WIDTH + CATEGORY_STRIP_GAP;
  const itemStart = CATEGORY_STRIP_PADDING + index * stride;
  const itemCenter = itemStart + CATEGORY_STRIP_ITEM_WIDTH / 2;
  const maxScroll = Math.max(0, contentW - viewportW);
  const ltrTarget = Math.max(0, Math.min(maxScroll, itemCenter - viewportW / 2));
  // Under forceRTL the strip rests at maxScroll on the first category (חדש מקבלן).
  return Math.max(0, Math.min(maxScroll, maxScroll - ltrTarget));
}

const EditPublishAdScreen = ({
  onClose,
  uploadedListings = [],
  currentUser = null,
  initialCategoryId = null,
  /** Skip strip intro and scroll to category — only when returning from in-flow screens */
  restoreCategoryStrip = false,
  refreshKey = 0,
  onCreateAd,
  onEditAd,
  /** Optional: edit handler for feed posts (plain listings); if omitted, posts show without pencil edit */
  onEditPost,
  onBoost,
  onShare,
  onFreeze,
  onUnfreeze,
  onRemove,
  onOpenListingAnalysis,
  onCreatePost,
  /** DB listing category when user switches the horizontal category strip */
  onCategoryChange,
}) => {
  const insets = useSafeAreaInsets();

  // Horizontal category strip: full list; regular users get a filtered copy (see publishCategoriesStrip).
  //   userCategoriesEditProfile.map(c => {
  //   const item = {id: c.id, name: c.name, image: c.image};
  //   if (c.id === 8) {
  //     item.imageAdjust = {marginLeft: 0, marginTop: 4};
  //   }
  //   return item;
  // });
  const [viewMode, setViewMode] = useState('grid'); // 'list' | 'grid'
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    toEditProfileUiCategoryId(initialCategoryId),
  );
  const selectedCategoryIdRef = useRef(selectedCategoryId);
  selectedCategoryIdRef.current = selectedCategoryId;
  const [fetchedListings, setFetchedListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [removeConfirmListing, setRemoveConfirmListing] = useState(null);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);
  const [freezeConfirmListing, setFreezeConfirmListing] = useState(null);
  const [unfreezeConfirmListing, setUnfreezeConfirmListing] = useState(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [frozenListingIds, setFrozenListingIds] = useState([]);
  const [boostConfirmListing, setBoostConfirmListing] = useState(null);
  const [boostQuota, setBoostQuota] = useState({
    quota: 1,
    used: 0,
    remaining: 1,
  });
  const [boostSubmitting, setBoostSubmitting] = useState(false);
  /** Local overrides so the UI reflects a successful boost before re-fetch. */
  const [boostedOverrides, setBoostedOverrides] = useState({});
  const categoryScrollRef = useRef(null);
  const didInitialCategoryScrollRef = useRef(false);
  // Entrance sweep: categories pass left → right, then rest at the far scroll (no snap-back).
  const categoryContentWidthRef = useRef(0);
  const categoryViewportWidthRef = useRef(0);
  const categorySweepAnim = useRef(new Animated.Value(0)).current;
  const didCategorySweepRef = useRef(false);
  const publishCategoriesStripRef = useRef([]);
  const categoryStripScrollXRef = useRef(null);
  const hasExplicitRestoreCategoryRef = useRef(restoreCategoryStrip);

  const restoreCategoryStripPosition = useCallback(() => {
    const strip = publishCategoriesStripRef.current;
    const uiId = selectedCategoryIdRef.current;
    const contentW = categoryContentWidthRef.current;
    const viewportW = categoryViewportWidthRef.current;
    const targetX = computeCategoryStripScrollX(
      uiId,
      strip,
      contentW,
      viewportW,
    );
    if (targetX == null) return false;
    categorySweepAnim.stopAnimation();
    didCategorySweepRef.current = true;
    categoryStripScrollXRef.current = targetX;
    categorySweepAnim.setValue(targetX);
    categoryScrollRef.current?.scrollTo({x: targetX, animated: false});
    return true;
  }, [categorySweepAnim]);

  const runCategorySweep = useCallback(() => {
    if (didCategorySweepRef.current) return;
    if (hasExplicitRestoreCategoryRef.current) {
      restoreCategoryStripPosition();
      return;
    }
    const contentW = categoryContentWidthRef.current;
    const viewportW = categoryViewportWidthRef.current;
    const maxScroll = Math.max(0, contentW - viewportW);
    if (maxScroll <= 4 || viewportW <= 0) return;
    didCategorySweepRef.current = true;

    const id = categorySweepAnim.addListener(({value}) => {
      categoryScrollRef.current?.scrollTo({x: value, animated: false});
    });

    categorySweepAnim.setValue(0);
    categoryScrollRef.current?.scrollTo({x: 0, animated: false});
    Animated.timing(categorySweepAnim, {
      toValue: maxScroll,
      duration: 1600,
      delay: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({finished}) => {
      categorySweepAnim.removeListener(id);
      if (!finished) return;
      categoryStripScrollXRef.current = maxScroll;
      categorySweepAnim.setValue(maxScroll);
      categoryScrollRef.current?.scrollTo({x: maxScroll, animated: false});
    });
  }, [categorySweepAnim, restoreCategoryStripPosition]);

  const onCategoryScrollContentSizeChange = useCallback(
    width => {
      categoryContentWidthRef.current = width || 0;
      if (categoryStripScrollXRef.current != null) {
        categoryScrollRef.current?.scrollTo({
          x: categoryStripScrollXRef.current,
          animated: false,
        });
        return;
      }
      if (hasExplicitRestoreCategoryRef.current) {
        restoreCategoryStripPosition();
        return;
      }
      if (!didInitialCategoryScrollRef.current) {
        didInitialCategoryScrollRef.current = true;
      }
      runCategorySweep();
    },
    [restoreCategoryStripPosition, runCategorySweep],
  );

  const onCategoryScrollLayout = useCallback(
    e => {
      categoryViewportWidthRef.current = e.nativeEvent.layout.width || 0;
      if (hasExplicitRestoreCategoryRef.current) {
        restoreCategoryStripPosition();
        return;
      }
      runCategorySweep();
    },
    [restoreCategoryStripPosition, runCategorySweep],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw =
          Platform.OS === 'web'
            ? localStorage.getItem(FROZEN_IDS_KEY)
            : await AsyncStorage.getItem(FROZEN_IDS_KEY);
        const parsed = raw
          ? (() => {
              try {
                return JSON.parse(raw);
              } catch (_) {
                return [];
              }
            })()
          : [];
        const ids = Array.isArray(parsed) ? parsed.map(x => String(x)) : [];
        if (ids.length && !cancelled) setFrozenListingIds(ids);
      } catch (_) {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistFrozenIds = ids => {
    const next = Array.isArray(ids) ? ids : [];
    if (Platform.OS === 'web')
      localStorage.setItem(FROZEN_IDS_KEY, JSON.stringify(next));
    else AsyncStorage.setItem(FROZEN_IDS_KEY, JSON.stringify(next));
  };

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
          ...(mySubId
            ? {subscription_id: mySubId}
            : currentUser?.id
              ? {subscription_id: currentUser.id}
              : {}),
        });
        if (cancelled) return;
        if (result?.success && result?.listings?.length) {
          const list = (result.listings || []).filter(l =>
            listingBelongsToCurrentUser(l, currentUser),
          );
          const transformed = list.map(l => {
            const imageUrls = listingImageUrls(l);
            const images = imageUrls.map(uri => ({uri}));
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
              hot_deal:
                l.hot_deal === true ||
                l.hot_deal === 'true' ||
                l.hot_deal === 't',
              price_per_night:
                l.price_per_night != null &&
                !Number.isNaN(Number(l.price_per_night))
                  ? Number(l.price_per_night)
                  : null,
            };
          });
          setFetchedListings(transformed);
        } else {
          setFetchedListings([]);
        }
      } catch (e) {
        if (!cancelled) setFetchedListings([]);
      } finally {
        if (!cancelled) setLoadingListings(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.subscription_id, currentUser?.email, refreshKey]);

  const myUploadedListings = useMemo(
    () =>
      (Array.isArray(uploadedListings) ? uploadedListings : []).filter(l =>
        listingBelongsToCurrentUser(l, currentUser),
      ),
    [uploadedListings, currentUser],
  );

  const mergedListings = (() => {
    const byId = new Map();
    // Fetched first so API data (including is_frozen) wins over local uploads.
    // Only the current user's uploadedListings are merged (feed cache has everyone).
    [...fetchedListings, ...myUploadedListings].forEach(l => {
      const id = l.id ?? l.ad_number;
      if (id != null && !byId.has(id)) byId.set(id, l);
    });
    return Array.from(byId.values());
  })();

  const selectedListingCategoryId =
    resolveListingCategoryFromEditProfileUi(selectedCategoryId);
  const isBnbCategory = Number(selectedListingCategoryId) === 5;
  const isPartnersCategory = Number(selectedListingCategoryId) === 3;
  const isOfficesListingCategory = Number(selectedListingCategoryId) === 2;
  const isLandListingCategory = Number(selectedListingCategoryId) === 7;
  const publishCategoriesStrip = useMemo(
    () => getPublishCategoriesStrip(currentUser?.subscription_type),
    [currentUser?.subscription_type],
  );
  publishCategoriesStripRef.current = publishCategoriesStrip;

  useEffect(() => {
    if (categoryStripScrollXRef.current != null) return;
    if (publishCategoriesStrip.length === 0) {
      setSelectedCategoryId(
        initialCategoryId != null
          ? toEditProfileUiCategoryId(initialCategoryId)
          : null,
      );
      return;
    }
    const explicitUiId =
      initialCategoryId != null && initialCategoryId !== ''
        ? toEditProfileUiCategoryId(initialCategoryId)
        : null;
    const nextSelectedId =
      explicitUiId != null &&
      publishCategoriesStrip.some(cat => cat.id === explicitUiId)
        ? explicitUiId
        : getRightmostStripCategoryId(publishCategoriesStrip);
    setSelectedCategoryId(nextSelectedId);
  }, [initialCategoryId, publishCategoriesStrip]);

  useEffect(() => {
    hasExplicitRestoreCategoryRef.current = restoreCategoryStrip;
    if (restoreCategoryStrip) {
      didCategorySweepRef.current = false;
      categoryStripScrollXRef.current = null;
    } else {
      didCategorySweepRef.current = false;
      categoryStripScrollXRef.current = null;
      didInitialCategoryScrollRef.current = false;
    }
  }, [restoreCategoryStrip]);

  useEffect(() => {
    if (
      !restoreCategoryStrip ||
      !selectedCategoryId ||
      publishCategoriesStrip.length === 0
    ) {
      return;
    }
    restoreCategoryStripPosition();
  }, [
    restoreCategoryStrip,
    selectedCategoryId,
    publishCategoriesStrip.length,
    restoreCategoryStripPosition,
  ]);

  useEffect(() => {
    if (selectedListingCategoryId == null || typeof onCategoryChange !== 'function') {
      return;
    }
    onCategoryChange(selectedListingCategoryId);
  }, [selectedListingCategoryId, onCategoryChange]);

  const showListingCreateInSheet = useMemo(
    () =>
      canShowListingAdInCreateSheet(
        currentUser?.subscription_type,
        selectedListingCategoryId,
      ),
    [currentUser?.subscription_type, selectedListingCategoryId],
  );
  // בית פתוח: company + broker only
  const showOpenHouseCreateInSheet =
    isCompanyUser(currentUser) ||
    isBrokerUser(currentUser) ||
    canCreateOpenHousePost(currentUser);
  const filteredListings = useMemo(() => {
    if (publishCategoriesStrip.length === 0) {
      return mergedListings;
    }
    if (!selectedCategoryId) {
      return mergedListings;
    }
    return mergedListings.filter(
      l =>
        (l.category != null && parseInt(l.category, 10)) ===
        selectedListingCategoryId,
    );
  }, [
    mergedListings,
    publishCategoriesStrip.length,
    selectedCategoryId,
    selectedListingCategoryId,
  ]);

  // פוסט/מודעה מס׳ 1 = oldest upload; separate counters for posts vs ads.
  const listingOrdinalById = useMemo(
    () => buildOldestFirstOrdinalMap(mergedListings),
    [mergedListings],
  );

  const getFirstImage = listing => {
    if (listing.images && listing.images.length > 0) {
      for (const img of listing.images) {
        const uri =
          typeof img === 'string' ? img : img?.uri || img?.image_url || '';
        if (uri && !isVideoMediaUrl(uri)) {
          return typeof img === 'string' ? {uri: img} : img?.uri ? img : {uri};
        }
      }
    }
    if (listing.image && !isVideoMediaUrl(listing.image)) {
      return typeof listing.image === 'number'
        ? listing.image
        : {uri: listing.image};
    }
    return null;
  };

  const renderListingMedia = (listing, frameStyle, mediaStyle) => {
    const videoUrl = getListingVideoUrl(listing);
    if (videoUrl) {
      return (
        <VideoPreviewThumb
          uri={videoUrl}
          style={[frameStyle, {borderRadius: 0}]}
          videoStyle={mediaStyle}
        />
      );
    }
    const imageSource = getFirstImage(listing);
    if (imageSource) {
      return (
        <Image
          source={imageSource}
          style={mediaStyle}
          resizeMode="cover"
        />
      );
    }
    return (
      <View style={[mediaStyle, styles.adImagePlaceholder]}>
        <MaterialCommunityIcons
          name="image-off"
          size={48}
          color={TEXT_LIGHT}
        />
      </View>
    );
  };

  const formatPrice = p => {
    const n = typeof p === 'number' ? p : parseFloat(p) || 0;
    return n.toLocaleString('he-IL');
  };

  const getExposureAsset = exposure => {
    if (exposure === 'high') return require('../assets/edit/high.png');
    if (exposure === 'medium') return require('../assets/exposure-medium.png');
    return require('../assets/exposure-low.png');
  };

  /**
   * Derive exposure level from the listing's real activity.
   * Priority:
   *   1. Boost active (boost_expires_at in the future) → 'high'
   *   2. Frozen → 'low'
   *   3. Freshly uploaded:
   *        - age < 7 days  → 'high'
   *        - age < 14 days → 'medium'
   *        - age ≥ 14 days → 'low'
   */
  const computeExposureLevel = listing => {
    if (!listing) return 'low';
    const listingId = listing?.id ?? listing?.ad_number;
    const overrideExpiry =
      listingId != null ? boostedOverrides[String(listingId)] : null;
    const expiryRaw =
      overrideExpiry || listing.boost_expires_at || listing.boostExpiresAt;
    if (expiryRaw) {
      const expiryTs = new Date(expiryRaw).getTime();
      if (Number.isFinite(expiryTs) && expiryTs > Date.now()) return 'high';
    }
    const frozen = listing.is_frozen === true || listing.is_frozen === 'true';
    if (frozen) return 'low';
    const createdRaw =
      listing.created_at ||
      listing.createdAt ||
      listing.uploaded_at ||
      listing.uploadedAt ||
      listing.inserted_at ||
      null;
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

  // Fetch current user's boost quota for the month so we can show it in the confirmation modal.
  useEffect(() => {
    const email = currentUser?.email;
    if (!email) return;
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
      .catch(err => {
        console.warn('getBoostQuota failed:', err?.message || err);
      });
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
      Alert.alert('', 'לא ניתן להסיר כרגע');
      return;
    }
    setRemoveSubmitting(true);
    try {
      await deleteListing(listingId, email, currentUser?.id);
      const idStr = String(listingId);
      setFetchedListings(prev =>
        prev.filter(l => String(l.id ?? l.ad_number) !== idStr),
      );
      if (typeof onRemove === 'function') onRemove(listing);
      setRemoveConfirmListing(null);
    } catch (e) {
      Alert.alert('', e?.message || 'שגיאה בהסרת המודעה');
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
      if (typeof alert !== 'undefined') alert('לא ניתן להקפיץ כרגע');
      return;
    }
    setBoostSubmitting(true);
    try {
      const res = await boostListing(listingId, email);
      setBoostQuota({
        quota: Number(res?.quota ?? boostQuota.quota),
        used: Number(res?.used ?? boostQuota.used + 1),
        remaining: Number(
          res?.remaining ?? Math.max(0, boostQuota.remaining - 1),
        ),
      });
      if (res?.boost_expires_at) {
        setBoostedOverrides(prev => ({
          ...prev,
          [String(listingId)]: res.boost_expires_at,
        }));
      }
      setBoostConfirmListing(null);
      if (typeof alert !== 'undefined') {
        alert('ההקפצה הופעלה! הדירוג הוא "גבוהה" למשך 24 שעות.');
      }
    } catch (e) {
      if (e?.code === 'QUOTA_EXCEEDED') {
        setBoostQuota({
          quota: Number(e?.quota ?? boostQuota.quota),
          used: Number(e?.used ?? boostQuota.used),
          remaining: 0,
        });
      }
      if (typeof alert !== 'undefined') {
        alert(e?.message || 'הקפצה נכשלה');
      }
    } finally {
      setBoostSubmitting(false);
    }
  };

  const canBoostThisMonth = boostQuota.remaining > 0;

  const openBoostConfirm = listing => {
    if (!canBoostThisMonth) {
      if (typeof alert !== 'undefined') {
        alert('הגעת למכסת ההקפצות החודשית (הקפצה אחת בחודש).');
      }
      return;
    }
    setBoostConfirmListing(listing);
  };

  const isFrozen = listing => {
    const id = listing?.id ?? listing?.ad_number;
    if (id == null) return false;
    const idStr = String(id);
    const fromApi =
      listing?.is_frozen === true || listing?.is_frozen === 'true';
    return fromApi || frozenListingIds.some(fid => String(fid) === idStr);
  };

  const getExposureLabel = exposure => {
    if (exposure === 'high') return 'גבוהה';
    if (exposure === 'medium') return 'בינונית';
    return 'נמוכה';
  };

  const renderListAdCard = ({item: listing}) => {
    const postRecord = isPostListingRecord(listing);
    const exposure = computeExposureLevel(listing);

    return (
      <View style={styles.adCardList}>
        <View style={{padding: 14, flex: 1}}>
          <View style={styles.adCardListLeft}>
            <Image
              source={getExposureAsset(exposure)}
              style={[
                styles.exposureImage,
                exposure === 'high' && styles.exposureImageHigh,
              ]}
              resizeMode="contain"
            />
            <View style={{flex: 1}}>
              <Text style={styles.adCardListDescription} numberOfLines={2}>
                {postRecord
                  ? getFeedPostCardCaption(listing)
                  : listing.description || '—'}
              </Text>

              <ListingStatsRow
                listing={listing}
                postRecord={postRecord}
                textStyle={styles.statTextList}
              />
            </View>
          </View>
          <View style={[styles.actionRow, {marginTop: 16}]}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                !canBoostThisMonth && styles.actionBtnDisabled,
              ]}
              onPress={() => openBoostConfirm(listing)}
              disabled={!canBoostThisMonth}
              activeOpacity={0.8}>
              <Image
                source={require('../assets/arrow_up.png')}
                style={styles.actionBtnImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                isFrozen(listing)
                  ? setUnfreezeConfirmListing(listing)
                  : setFreezeConfirmListing(listing)
              }
              activeOpacity={0.8}>
              <Image
                source={require('../assets/freeze.png')}
                style={[
                  styles.actionBtnImage,
                  isFrozen(listing) && styles.actionBtnFrozenIcon,
                ]}
                resizeMode="contain"
              />
              {isFrozen(listing) ? (
                <Text
                  style={[
                    styles.actionBtnTextList,
                    styles.actionBtnFrozenText,
                  ]}>
                  הוקפאה
                </Text>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn]}
              onPress={() => setRemoveConfirmListing(listing)}
              activeOpacity={0.8}>
              <Image
                source={require('../assets/close.png')}
                style={styles.actionBtnImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.adCardListRight}>
          {renderListingMedia(
            listing,
            styles.adCardListImage,
            styles.adCardListImage,
          )}
          <View style={styles.topRightTextWrap}>
            <Text style={styles.topRightText}>
              {getListingTypeBadgeLabel(listing, currentUser)}
            </Text>
          </View>
          {!postRecord || onEditPost ? (
            <TouchableOpacity
              style={styles.editBadgeList}
              onPress={() =>
                postRecord
                  ? onEditPost && onEditPost(listing)
                  : onEditAd && onEditAd(listing)
              }
              activeOpacity={0.8}>
              <Octicons name="pencil" size={25} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  const renderGridAdCard = ({item: listing, index}) => {
    const postRecord = isPostListingRecord(listing);
    const exposure = computeExposureLevel(listing);
    const ordinal =
      listingOrdinalById.get(listingStableKey(listing)) ?? index + 1;

    return (
      <View style={styles.adCard}>
        <View style={styles.adImageWrap}>
          {renderListingMedia(listing, styles.adImageWrap, styles.adImage)}
          {!postRecord || onEditPost ? (
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() =>
                postRecord
                  ? onEditPost && onEditPost(listing)
                  : onEditAd && onEditAd(listing)
              }
              activeOpacity={0.8}>
              <Octicons name="pencil" size={25} color="#fff" />
            </TouchableOpacity>
          ) : null}
          <View style={styles.topRightTextWrap}>
            <Text style={styles.topRightText}>
              {getListingTypeBadgeLabel(listing, currentUser)}
            </Text>
          </View>
          <View style={styles.advertisementNo}>
            <Text style={styles.advertisementNoText}>
              {postRecord ? `פוסט מס׳ ${ordinal}` : `מודעה מס׳ ${ordinal}`}
            </Text>
          </View>
        </View>
        <View style={{padding: 16}}>
          <View
            style={{
              flexDirection: 'row-reverse',
              justifyContent: 'space-between',
            }}>
            <Image
              source={getExposureAsset(exposure)}
              style={[
                styles.exposureImage,
                exposure === 'high' && styles.exposureImageHigh,
              ]}
              resizeMode="contain"
            />
            <View style={{flex: 1}}>
              <Text style={styles.adDescription} numberOfLines={2}>
                {postRecord
                  ? getFeedPostCardCaption(listing)
                  : listing.description || '—'}
              </Text>
              <ListingStatsRow listing={listing} postRecord={postRecord} />
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                !canBoostThisMonth && styles.actionBtnDisabled,
              ]}
              onPress={() => openBoostConfirm(listing)}
              disabled={!canBoostThisMonth}
              activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>הקפצה</Text>
              <Image
                source={require('../assets/arrow_up.png')}
                style={styles.actionBtnImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                isFrozen(listing)
                  ? setUnfreezeConfirmListing(listing)
                  : setFreezeConfirmListing(listing)
              }
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.actionBtnText,
                  isFrozen(listing) && styles.actionBtnFrozenText,
                ]}>
                {isFrozen(listing) ? 'הוקפאה' : 'הקפאה'}
              </Text>
              <Image
                source={require('../assets/freeze.png')}
                style={[
                  styles.actionBtnImage,
                  isFrozen(listing) && styles.actionBtnFrozenIcon,
                ]}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setRemoveConfirmListing(listing)}
              activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>הסרה</Text>
              <Image
                source={require('../assets/close.png')}
                style={styles.actionBtnImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const listingKeyExtractor = (listing, index) => {
    const id = listing?.id ?? listing?.ad_number;
    return id != null ? `${String(id)}-${index}` : `listing-${index}`;
  };

  const openCreateSheet = () => {
    setShowCreateSheet(true);
  };

  const openCreateListing = (opts = {}) => {
    setShowCreateSheet(false);
    onCreateAd &&
      onCreateAd(selectedListingCategoryId ?? selectedCategoryId, opts);
  };

  const openCreatePost = (opts = {}) => {
    setShowCreateSheet(false);
    onCreatePost &&
      onCreatePost(selectedListingCategoryId ?? selectedCategoryId, opts);
  };

  return (
    <View style={[styles.container]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {height: insets.top + 40, paddingTop: insets.top},
        ]}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.headerBtn}
          hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ערוך/פרסם מודעה</Text>
        {canOpenListingAnalysis(currentUser) ? (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => onOpenListingAnalysis && onOpenListingAnalysis()}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            accessibilityRole="button"
            accessibilityLabel="ניתוח מודעות">
            <Image
              source={require('../assets/action_icons.png')}
              style={styles.actionImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topPanel}>
          {publishCategoriesStrip.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>בחרו קטגוריה לפרסם בה</Text>
              <ScrollView
                ref={categoryScrollRef}
                horizontal
                directionalLockEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScrollContent}
                style={styles.categoryScroll}
                onLayout={onCategoryScrollLayout}
                onContentSizeChange={onCategoryScrollContentSizeChange}>
                {publishCategoriesStrip.map(cat => {
                  const selected = selectedCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={styles.categoryItem}
                      onPress={() => {
                        categoryStripScrollXRef.current = null;
                        setSelectedCategoryId(cat.id);
                      }}
                      activeOpacity={0.8}>
                      <Image
                        source={selected ? cat.selectedImage : cat.image}
                        style={[
                          {
                            width: 100,
                            height: 100,
                          },
                        ]}
                        resizeMode="contain"
                      />
                      <View style={styles.categoryNameRow}>
                        <Text
                          style={[
                            styles.categoryName,
                            selected && styles.categoryNameSelected,
                          ]}>
                          {cat.name}
                        </Text>
                        {selected ? (
                          <Image
                            source={require('../assets/checkbox.png')}
                            style={styles.categoryCheckbox}
                            resizeMode="contain"
                          />
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          {/* Action bar: Create Ad + view toggles */}
          {filteredListings && filteredListings.length > 0 && (
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={[styles.viewToggle]}
                onPress={() =>
                  setViewMode(viewMode === 'grid' ? 'list' : 'grid')
                }>
                <Image
                  source={
                    viewMode === 'grid'
                      ? require('../assets/swipereight.png')
                      : require('../assets/swiperleft.png')
                  }
                  style={styles.viewToggleIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={openCreateSheet}
                activeOpacity={0.9}>
                <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                <Text style={styles.createBtnText}>צור מודעה</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Ad listing */}
        {loadingListings ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={BORDER_GOLD} />
            <Text style={styles.emptySubtext}>טוען מודעות...</Text>
          </View>
        ) : viewMode === 'grid' ? (
          <FlatList
            data={filteredListings}
            keyExtractor={listingKeyExtractor}
            renderItem={({item, index}) => renderGridAdCard({item, index})}
            scrollEnabled={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyWrap}>
                {/* <MaterialCommunityIcons
                  name="bullhorn-outline"
                  size={56}
                  color={TEXT_LIGHT}
                /> */}
                <Text style={styles.emptyText}>
                  אין מודעות או פוסטים בקטגוריה זו
                </Text>
                <Text style={styles.emptySubtext}>
                  זה הזמן ליצור מודעה או פוסט חדש!
                </Text>
                <TouchableOpacity
                  style={[styles.createBtn, {marginTop: 30}]}
                  onPress={openCreateSheet}
                  activeOpacity={0.9}>
                  <Text style={styles.createBtnText}>צור מודעה</Text>
                  <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          />
        ) : (
          <FlatList
            data={filteredListings}
            keyExtractor={listingKeyExtractor}
            renderItem={({item, index}) => renderListAdCard({item, index})}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/*
        Rendered inline (not in a Modal) so it lives in the main activity window,
        which draws edge-to-edge under the Android nav bar. A transparent Modal
        gets its own window that stops at the nav bar (RN 0.73 has no
        navigationBarTranslucent), leaving the strip behind the nav buttons
        see-through. Inline + bottom:0 lets the gray sheet fill behind them.
      */}
      {showCreateSheet && (
        <View style={styles.createSheetRoot}>
          <Pressable
            style={styles.createSheetOverlay}
            onPress={() => setShowCreateSheet(false)}
          />
          <View
            style={styles.createSheetSheetWrap}
            onStartShouldSetResponder={() => true}>
            <CreateAdSheet bottomInset={insets.bottom}>
              {showListingCreateInSheet &&
                (isBnbCategory ? (
                  <>
                    {!isCompanyUser(currentUser) ? (
                      <>
                        <CreateAdSheetRow
                          title="פרסם כפרטי"
                          subtitle="פרסם חדר או אתר נופש פרטי"
                          iconSource={require('../assets/ad-uplaud/bnb-private.png')}
                          onPress={() =>
                            openCreateListing({bnbHostType: 'private'})
                          }
                        />
                        <CreateAdSheetDivider />
                      </>
                    ) : null}
                    <CreateAdSheetRow
                      title="פרסם כעסק"
                      subtitle="פרסם חדר או אתר נופש עסקי"
                      iconSource={require('../assets/ad-uplaud/bnb-bussiness.png')}
                      onPress={() =>
                        openCreateListing({bnbHostType: 'business'})
                      }
                    />
                  </>
                ) : (
                  <CreateAdSheetRow
                    title={
                      isOfficesListingCategory
                        ? 'משרד'
                        : isPartnersCategory
                          ? 'פרסם מודעה'
                          : isLandListingCategory
                            ? 'קרקע'
                            : isBnbCategory
                              ? 'BNB'
                              : isCompanyUser(currentUser)
                                ? 'פרויקט'
                                : 'נכס'
                    }
                    subtitle={
                      isPartnersCategory
                        ? 'צור מודעה כדי להיכנס, להכניס או למצוא שותף'
                        : isOfficesListingCategory
                          ? 'פרסם משרד למכירה או השכרה'
                          : isLandListingCategory
                            ? 'פרסם קרקע'
                            : isCompanyUser(currentUser)
                              ? 'פרסמו פרויקט'
                              : 'פרסמו נכס למכירה או להשכרה'
                    }
                    iconSource={getCreateSheetListingIcon(
                      selectedListingCategoryId,
                      currentUser?.subscription_type,
                    )}
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
                subtitle={
                  isPartnersCategory
                    ? 'שתף פוסט חופשי למציאת שותף או דירה'
                    : 'שתף מידע או עדכון עם הקהילה'
                }
                iconSource={CREATE_SHEET_POST_ICON}
                onPress={() => openCreatePost()}
              />
            </CreateAdSheet>
          </View>
        </View>
      )}

      <Modal
        visible={removeConfirmListing != null}
        transparent
        animationType="fade"
        onRequestClose={() =>
          !removeSubmitting && setRemoveConfirmListing(null)
        }>
        <Pressable
          style={styles.removeModalOverlay}
          onPress={() =>
            !removeSubmitting && setRemoveConfirmListing(null)
          }>
          <View
            style={styles.removeModalContent}
            onStartShouldSetResponder={() => true}>
            <View style={styles.removeModalIconWrap}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={48}
                color={BORDER_GOLD}
              />
            </View>
            <Text style={styles.removeModalTitle}>האם אתה בטוח?</Text>
            <Text style={styles.removeModalMessage}>
              המודעה תוסר מהרשימה. לא ניתן לשחזר פעולה זו.
            </Text>
            <View style={styles.removeModalButtons}>
              <TouchableOpacity
                style={styles.removeModalCancelBtn}
                onPress={() => setRemoveConfirmListing(null)}
                disabled={removeSubmitting}
                activeOpacity={0.8}>
                <Text style={styles.removeModalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.removeModalConfirmBtn,
                  removeSubmitting && styles.actionBtnDisabled,
                ]}
                onPress={handleConfirmRemove}
                disabled={removeSubmitting}
                activeOpacity={0.8}>
                {removeSubmitting ? (
                  <ActivityIndicator color="#1E1D27" size="small" />
                ) : (
                  <Text style={styles.removeModalConfirmText}>הסרה</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={freezeConfirmListing != null}
        transparent
        animationType="fade"
        onRequestClose={() => setFreezeConfirmListing(null)}>
        <Pressable
          style={styles.removeModalOverlay}
          onPress={() => setFreezeConfirmListing(null)}>
          <View
            style={styles.removeModalContent}
            onStartShouldSetResponder={() => true}>
            <View style={styles.removeModalIconWrap}>
              <MaterialCommunityIcons
                name="snowflake"
                size={48}
                color={BORDER_GOLD}
              />
            </View>
            <Text style={styles.removeModalTitle}>הקפיא מודעה?</Text>
            <Text style={styles.removeModalMessage}>
              המודעה תישאר אצלך אך לא תוצג במערכת. ניתן לבטל הקפאה בהמשך.
            </Text>
            <View style={styles.removeModalButtons}>
              <TouchableOpacity
                style={styles.removeModalCancelBtn}
                onPress={() => setFreezeConfirmListing(null)}
                activeOpacity={0.8}>
                <Text style={styles.removeModalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.freezeModalConfirmBtn}
                onPress={() => {
                  if (freezeConfirmListing && onFreeze)
                    onFreeze(freezeConfirmListing);
                  const id =
                    freezeConfirmListing?.id ?? freezeConfirmListing?.ad_number;
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
                }}
                activeOpacity={0.8}>
                <Text style={styles.freezeModalConfirmText}>כן</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={boostConfirmListing != null}
        transparent
        animationType="fade"
        onRequestClose={() => !boostSubmitting && setBoostConfirmListing(null)}>
        <Pressable
          style={styles.removeModalOverlay}
          onPress={() => !boostSubmitting && setBoostConfirmListing(null)}>
          <View
            style={styles.removeModalContent}
            onStartShouldSetResponder={() => true}>
            <View style={styles.removeModalIconWrap}>
              <MaterialCommunityIcons
                name="rocket-launch"
                size={48}
                color={BORDER_GOLD}
              />
            </View>
            <Text style={styles.removeModalTitle}>להקפיץ את המודעה?</Text>
            <Text style={styles.removeModalMessage}>
              המודעה תקבל חשיפה גבוהה למשך 24 שעות.{'\n'}
              {boostQuota.remaining > 0
                ? `נותרה לך הקפצה אחת החודש (מתוך ${boostQuota.quota}).`
                : 'אין הקפצות נותרות החודש.'}
            </Text>
            <View style={styles.removeModalButtons}>
              <TouchableOpacity
                style={styles.removeModalCancelBtn}
                disabled={boostSubmitting}
                onPress={() => setBoostConfirmListing(null)}
                activeOpacity={0.8}>
                <Text style={styles.removeModalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.freezeModalConfirmBtn,
                  (boostSubmitting || boostQuota.remaining <= 0) && {
                    opacity: 0.5,
                  },
                ]}
                disabled={boostSubmitting || boostQuota.remaining <= 0}
                onPress={handleConfirmBoost}
                activeOpacity={0.8}>
                {boostSubmitting ? (
                  <ActivityIndicator size="small" color="#1a1926" />
                ) : (
                  <Text style={styles.freezeModalConfirmText}>הקפץ</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={unfreezeConfirmListing != null}
        transparent
        animationType="fade"
        onRequestClose={() => setUnfreezeConfirmListing(null)}>
        <Pressable
          style={styles.removeModalOverlay}
          onPress={() => setUnfreezeConfirmListing(null)}>
          <View
            style={styles.removeModalContent}
            onStartShouldSetResponder={() => true}>
            <View style={styles.removeModalIconWrap}>
              <MaterialCommunityIcons
                name="snowflake-melt"
                size={48}
                color={BORDER_GOLD}
              />
            </View>
            <Text style={styles.removeModalTitle}>בטל הקפאה?</Text>
            <Text style={styles.removeModalMessage}>
              המודעה תוצג שוב במערכת.
            </Text>
            <View style={styles.removeModalButtons}>
              <TouchableOpacity
                style={styles.removeModalCancelBtn}
                onPress={() => setUnfreezeConfirmListing(null)}
                activeOpacity={0.8}>
                <Text style={styles.removeModalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.freezeModalConfirmBtn}
                onPress={() => {
                  const listing = unfreezeConfirmListing;
                  if (listing && onUnfreeze) onUnfreeze(listing);
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
                }}
                activeOpacity={0.8}>
                <Text style={styles.freezeModalConfirmText}>כן</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: BG},
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    backgroundColor: '#27262F',
    height: 40,
  },
  headerBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionImage: {width: 24, height: 24},
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 20, paddingBottom: 40},
  topPanel: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    backgroundColor: '#27262F',
    marginBottom: 25,
    paddingBottom: 10,
  },
  topPanelDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
  },
  sectionLabel: {
    color: '#D2D0DC',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    marginTop: 5,
    marginBottom: 12,
    textAlign: 'left',
  },
  categoryScroll: {
    marginBottom: 24,
    marginHorizontal: -20,
  },
  categoryScrollContent: {
    // flexDirection: 'row-reverse',
    gap: 22,
    paddingHorizontal: 20,
  },
  categoryItem: {
    // width: Dimensions.get('window').width * 0.27,
    alignItems: 'center',
  },
  categoryImageWrap: {
    overflow: 'hidden',
    marginBottom: 6,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  categoryName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  categoryNameSelected: {fontFamily: 'Rubik-Medium'},
  categoryCheckbox: {
    width: 20,
    height: 20,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    marginTop: 10,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4D4966',
    // paddingVertical: 6,
    // paddingHorizontal: 20,
    borderRadius: 26,
    height: 38,
    width: 168,
  },
  createBtnText: {color: '#fff', fontSize: 18, fontFamily: 'Rubik-Medium'},
  viewToggle: {
    width: 56,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleIcon: {width: '100%', height: '100%'},
  adCard: {
    width: Dimensions.get('window').width * 0.88,
    alignSelf: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 24,
  },
  adCardList: {
    width: Dimensions.get('window').width * 0.88,
    alignSelf: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row-reverse',
    height: 192,
    marginBottom: 22,
  },
  adCardListLeft: {
    flex: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  adCardListDescription: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    textAlign: 'left',
  },
  adCardListRight: {
    width: 108,
    height: '100%',
    position: 'relative',
  },
  adCardListImage: {
    width: '100%',
    height: '100%',
  },
  editBadgeList: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2B2A39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adImageWrap: {
    position: 'relative',
    width: '100%',
    height: 230,
    overflow: 'hidden',
  },
  adImage: {width: '100%', height: '100%'},
  adImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e1d2b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2B2A39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightTextWrap: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  topRightText: {
    color: '#1E1D27',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
  advertisementNo: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#1E1D27CC',
    height: 30,
    justifyContent: 'center',
    alignItems: flexStart,
    paddingRight: 12,
  },
  advertisementNoText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },
  adDescription: {
    color: '#fff',
    fontSize: 26,
    fontFamily: 'Rubik-SemiBold',
    marginLeft: 10,
    textAlign: 'left',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 16,
    marginRight: 10,
    justifyContent: flexStart,
    position: 'absolute',
    bottom: 5,
    left: 0,
  },
  statItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
  statText: {
    color: '#D2D0DC',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },
  statTextList: {fontSize: 14},
  exposureImage: {width: 45, height: 101},
  exposureImageHigh: {width: 56, height: 126},
  actionRow: {
    flexDirection: 'row-reverse',
    marginTop: 22,
    gap: 4,
  },
  actionBtnImage: {width: 22, height: 22},
  actionBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4D4966',
    paddingVertical: 10,
    borderRadius: 18,
  },
  actionBtnDisabled: {opacity: 0.45},
  actionBtnFrozenIcon: {tintColor: FROZEN_ACTION_BLUE},
  actionBtnFrozenText: {color: FROZEN_ACTION_BLUE},
  actionBtnTextList: {color: TEXT_LIGHT, fontSize: 12},
  actionBtnText: {color: '#fff', fontSize: 16, fontFamily: 'Rubik-Regular'},
  listSeparator: {height: 16},
  emptyWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: Dimensions.get('window').height / 1.8,
  },
  emptyText: {color: '#fff', fontSize: 16, marginTop: 12},
  emptySubtext: {color: TEXT_LIGHT, fontSize: 14, marginTop: 4},
  removeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  removeModalContent: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  removeModalIconWrap: {marginBottom: 16},
  removeModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    marginBottom: 8,
    textAlign: 'center',
  },
  removeModalMessage: {
    color: TEXT_LIGHT,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  removeModalButtons: {flexDirection: 'row', gap: 12, width: '100%'},
  removeModalCancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  removeModalCancelText: {color: '#fff', fontSize: 16},
  removeModalConfirmBtn: {
    flex: 1,
    backgroundColor: '#c62828',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  removeModalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  freezeModalConfirmBtn: {
    flex: 1,
    backgroundColor: BORDER_GOLD,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  freezeModalConfirmText: {
    color: '#1a1926',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  // Inline create-sheet overlay (no Modal) so it draws under the Android nav bar.
  createSheetRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
    elevation: 1000,
  },
  createSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  createSheetSheetWrap: {
    width: '100%',
    alignSelf: 'stretch',
  },
});

export default EditPublishAdScreen;
