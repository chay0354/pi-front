import React, {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Platform,
  ActivityIndicator,
  PanResponder,
  Animated,
  Easing,
  TextInput,
  FlatList,
  useWindowDimensions,
  InteractionManager,
  Keyboard,
} from 'react-native';
import {useSafeAreaFrame, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAndroidKeyboardComposer} from '../utils/androidKeyboardComposer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadTikTokLikedState,
  persistLikedListingIds,
  persistLikedPostIds,
  persistUnseenLikedCount,
} from '../utils/tikTokLikedStorage';
import {LinearGradient} from 'expo-linear-gradient';
import {Video, ResizeMode, Audio} from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {
  ProfileAvatar,
  SharePostSheet,
  TikTokHeartIcon,
  PostFeedLikeIcon,
  FollowPlusBadge,
} from '../components';
import {
  FeedVideoPlayer,
  FeedVideoPosterPlaceholder,
} from '../components/FeedVideoPlayer';
import PostTextOverlays from '../components/PostTextOverlays';
import {
  prefetchFeedWindowMedia,
  resolveFeedVideoPosterUri,
  resolveFeedVideoUri,
  feedScrollFocusIndex,
} from '../utils/feedVideoPreload';
import {fitWidthMediaLayout} from '../utils/fitWidthMedia';
import {resolveAdVideoUri, isVideoProcessing} from '../utils/videoPlayback';
import {
  parsePostTextOverlayPayload,
  shouldRenderPostTextOverlaysOnFeed,
} from '../utils/postTextOverlay';
import FeedBottomBar from '../components/FeedBottomBar';
import ListingGridCardFigma from '../components/ListingGridCardFigma';
import {
  FEED_BOTTOM_BAR_CONTENT_HEIGHT,
  FEED_IMAGE_INDICATOR_TOP_GAP,
  FEED_OVERLAY_ABOVE_BAR_GAP,
  feedBottomBarHeight,
} from '../utils/feedLayout';
import CreateAdSheet, {
  CreateAdSheetDivider,
  CreateAdSheetRow,
  CREATE_SHEET_POST_ICON,
} from '../components/CreateAdSheet';
import {PiRatingBadge} from '../components/PiRatingBadge';
import {SvgXml} from '../utils/svgXml';
import {getCachedSvgXml} from '../utils/svgIconCache';
import {Colors} from '../constants/styles';
import {officeSidebarSvgs} from '../assets/office-filters/svgIcons';
import {bnbSidebarSvgs} from '../assets/bnb-filters/svgIcons';
import {getCollageCellLayouts} from '../utils/collageLayouts';
import {
  getListings,
  recordListingView,
  likeListing,
  unlikeListing,
  likePost,
  unlikePost,
  getPostComments,
  addPostComment,
  reactToPostComment,
  clearPostCommentReaction,
  getReviews,
  getFollowStatus,
  getFollowStatusBatch,
  sendFollowRequest,
  getCurrentUser,
  registerRegularUser,
  toSubscriptionId,
  resolveSubscriptionId,
  getRecentUserSearches,
  recordUserSearch,
  clearRecentUserSearches,
  uploadFile,
  measureDistancesBatchWithGemini,
} from '../utils/api';
import {getUserProfileImageUrl, getListingFeedAvatarUrl, shouldForceGoldRingForListing} from '../utils/userProfileImage';
import {parseLandBlockParcelFromListing} from '../utils/enrichListingForUserProfile';
import {normalizeLandOfferParcels} from '../utils/landListingFields';
import {
  geocodeAddress,
  getListingGeocodeQuery,
  haversineDistanceKm,
} from '../utils/geocoding';
import {resolveUserReferenceCoords} from '../utils/userLocation';
import {
  flexStart,
  forceLtrStyle,
  hebrewTextAlign,
} from '../utils/rtlLayout';

import {
  formatCompanyApartmentsLabel,
  formatCompanyBuildingsLabel,
  formatCompanyFloorsLabel,
  displayPiRatingFromReviews,
  brokerPiRatingFromListing,
  shouldShowListingPiRating,
  isFollowableListing,
  isCompanyListing,
  isDeveloperCompanyListing,
  isPreSaleListing,
} from '../utils/listingGridCardFigma';
import {
  categoryImages,
  canCreateOpenHousePost,
  canShowListingAdInCreateSheet,
  CREATE_SHEET_OPEN_HOUSE_ICON,
  getCreateSheetListingIcon,
  getListingSheetCopy,
  formatOpenHouseOverlayText,
  getOpenHouseDetailsFromListing,
  isOpenHouseListing,
  OPEN_HOUSE_FEED_TAG,
  isCompanySubscriptionType,
  isBrokerLikeSubscriptionType,
  OPEN_HOUSE_POST_DESCRIPTION,
  subscriptionTypes,
} from '../utils/constant';

/** Map DB land field values to canonical codes. Ads form used to store Hebrew titles; new uploads use `name` (e.g. yes, private). */
function normalizeLandYesNot(v) {
  if (v == null || v === '') {
    return null;
  }
  const s = String(v).trim();
  if (s === 'yes' || s === 'not') {
    return s;
  }
  if (s === 'כן') {
    return 'yes';
  }
  if (s === 'לא') {
    return 'not';
  }
  return s;
}

function hasActiveFeedFilters(filters = {}) {
  if (!filters || typeof filters !== 'object') return false;
  if (filters.city != null) return true;
  if (filters.price != null) return true;
  if (filters.rooms != null) return true;
  if (filters.office != null) return true;
  if (filters.donam != null) return true;
  if (filters.meter != null && String(filters.meter).trim() !== '') return true;
  if (filters.preferences != null && String(filters.preferences).trim() !== '')
    return true;
  const apt = filters.apartmentType;
  if (apt != null && apt !== '') {
    if (Array.isArray(apt) && apt.length > 0) return true;
    if (!Array.isArray(apt) && String(apt).trim() !== '') return true;
  }
  const type = filters.type;
  if (type != null) {
    if (Array.isArray(type) && type.length > 0) return true;
    if (!Array.isArray(type) && String(type).trim() !== '') return true;
  }
  return false;
}

function normalizeLandOwnership(v) {
  if (v == null || v === '') {
    return null;
  }
  const s = String(v).trim();
  if (s === 'private' || s === 'administration') {
    return s;
  }
  if (s === 'פרטי') {
    return 'private';
  }
  if (s === 'מינהל') {
    return 'administration';
  }
  return s;
}
/** תב"ע + היתר: happy | nothing | there_is */
function normalizeLandThreeState(v) {
  if (v == null || v === '') {
    return null;
  }
  const s = String(v).trim();
  if (s === 'happy' || s === 'nothing' || s === 'there_is') {
    return s;
  }
  if (s === 'מאושרת') {
    return 'happy';
  }
  if (s === 'אין') {
    return 'nothing';
  }
  if (s === 'יש') {
    return 'there_is';
  }
  return s;
}

/** Swipeable images carousel used in the list-view card. Falls back to a placeholder when empty. */
const ListCardImages = ({images, width, height = 252}) => {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef(null);
  const items = Array.isArray(images)
    ? images.filter(
        img =>
          img &&
          (typeof img === 'number' ||
            (typeof img === 'object' &&
              img.uri &&
              img.uri !== 'text-post-placeholder')),
      )
    : [];
  if (items.length === 0) {
    return (
      <View
        style={{width, height, alignItems: 'center', justifyContent: 'center'}}>
        <MaterialCommunityIcons
          name="image-off"
          size={48}
          color="rgba(255,255,255,0.3)"
        />
      </View>
    );
  }
  if (items.length === 1) {
    return (
      <View style={{width, height}}>
        <Image
          source={typeof items[0] === 'number' ? items[0] : items[0]}
          style={{width, height}}
          resizeMode="cover"
        />
      </View>
    );
  }
  return (
    <View style={{width, height, position: 'relative'}}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{width, height}}
        onMomentumScrollEnd={e => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}>
        {items.map((item, i) => (
          <View key={i} style={{width, height}}>
            <Image
              source={typeof item === 'number' ? item : item}
              style={{width, height}}
              resizeMode="cover"
            />
          </View>
        ))}
      </ScrollView>
      <View
        style={{
          position: 'absolute',
          bottom: 10,
          left: 0,
          right: 0,
          flexDirection: 'row-reverse',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
        }}
        pointerEvents="box-none">
        {items.map((_, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            hitSlop={6}
            onPress={e => {
              e?.stopPropagation?.();
              setIndex(i);
              scrollRef.current?.scrollTo({x: i * width, y: 0, animated: true});
            }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  i === index ? '#FFC40A' : 'rgba(255,255,255,0.55)',
              }}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

/**
 * Format an integer shekel amount with comma thousand separators.
 *
 * Avoids `Number.prototype.toLocaleString()` without an explicit locale
 * because on Hermes / certain device locales it can return prices like
 * "1.234.567" (dot thousand separators) which users read as a malformed
 * decimal (e.g. "XXX.XX.XXX"). This regex-based formatter is deterministic
 * across all platforms and locales.
 */
const formatShekelPrice = value => {
  const num = Math.round(Math.max(0, Number(value) || 0));
  return `₪${String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

/** True when the listing row is a feed post (not a regular ad). */
const isFeedPost = item => {
  if (!item) return false;
  const type = String(
    item.property_type ||
      item.propertyType ||
      item.propertyTypeRaw ||
      item.apartmentTypeId ||
      '',
  ).toLowerCase();
  if (type.includes('post')) return true;
  if (
    item.feed_post === true ||
    item.feed_post === 'true' ||
    item.feed_post === 't'
  )
    return true;
  const description = String(item.description || item.desc || '')
    .trim()
    .toLowerCase();
  if (description === 'post' || description === 'פוסט') return true;
  return item.isPostEntry === true;
};

/** Listing row marked חדש / new (regular-user ads in חדשות filter). */
const isNewConditionListing = listing => {
  const c = String(listing?.condition ?? '').trim();
  if (!c) return false;
  const lower = c.toLowerCase();
  return lower === 'new' || c === 'חדש';
};

const isRegularUserListing = listing =>
  String(listing?.subscription_type || '').toLowerCase() === 'user';

/** BnB listing feed (not פוסטים): regular users + company publishers (same listing UX). */
const isBnbFeedPublisherListing = listing => {
  const sub = String(listing?.subscription_type || '').toLowerCase();
  return sub === 'user' || sub === 'company';
};

/** חדשות sidebar: company ads in active category + all cat-1 ads + regular-user “new” ads (any category). */
const isNewsSidebarListing = (listing, currentCategoryId) => {
  if (!listing || isFeedPost(listing)) return false;
  const cat = parseInt(listing.category, 10) || 0;
  if (cat === 1) return true;
  if (isRegularUserListing(listing) && isNewConditionListing(listing)) {
    return true;
  }
  const cur = parseInt(currentCategoryId, 10);
  if (Number.isFinite(cur) && cat === cur) {
    return String(listing.subscription_type || '').toLowerCase() === 'company';
  }
  return false;
};

/** דירות (10) + מגזר דתי (6): hide company ads unless חדשות or הדמיות sidebar is active. */
const shouldHideCompanyAdsInApartmentsOrReligiousFeed = (
  categoryNum,
  {newsActive, renderingsActive, sidebarFilterId, activeSidebarFilter},
) => {
  if (categoryNum !== 10 && categoryNum !== 6) return false;
  if (newsActive || renderingsActive) return false;
  if (
    sidebarFilterId != null &&
    String(activeSidebarFilter?.subscription_type || '').toLowerCase() ===
      'company'
  ) {
    return false;
  }
  return true;
};

const mergeListingRows = (target, rows) => {
  const seen = new Set(
    target.map(l => String(l?.id ?? '')).filter(Boolean),
  );
  for (const row of rows) {
    const id = String(row?.id ?? '');
    if (id && !seen.has(id)) {
      seen.add(id);
      target.push(row);
    }
  }
  return target;
};

const isNewsSidebarFilterDef = filter =>
  filter?.id === 'new' && filter?.ads_only === true;

/** הדמיות sidebar: company video ads only (no posts / no image-only), every category. */
const isRenderingsSidebarFilterDef = filter =>
  filter?.id === 'renderings' &&
  String(filter?.subscription_type || '').toLowerCase() === 'company' &&
  filter?.ads_only === true;

const isRenderingsSidebarListing = listing => {
  if (!listing || isFeedPost(listing)) return false;
  if (String(listing?.subscription_type || '').toLowerCase() !== 'company') {
    return false;
  }
  // Prefer transformed feed shape; fall back to raw listing video fields.
  return (
    listingHasPlayableVideo(listing) || Boolean(resolveAdVideoUri(listing))
  );
};

/** Company ads: `construction_status` from DB may be English keys or Hebrew labels from the form. */
function companyConstructionStatusMatches(listing, target) {
  const raw = String(listing?.construction_status ?? '').trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (target === 'built') {
    return lower === 'built' || raw === 'בנוי';
  }
  if (target === 'beginning_of_construction') {
    return (
      lower === 'beginning_of_construction' ||
      lower === 'start_of_construction' ||
      raw === 'תחילת בנייה'
    );
  }
  return false;
}

/** Unify post comment image URL from API / cache (snake/camel) for reliable display. */
function normalizePostComment(c) {
  if (!c || typeof c !== 'object') return c;
  const raw = c.comment_image_url ?? c.commentImageUrl ?? c.image_url ?? null;
  const u =
    raw != null && String(raw).trim() !== '' ? String(raw).trim() : null;
  return {...c, comment_image_url: u, is_publisher: c.is_publisher === true};
}

/** Server list is source of truth; same-id rows from local cache can still supply a missing image URL. */
function mergeServerAndLocalPostComments(serverList, localList) {
  const byKey = new Map();
  const keyOf = n => {
    if (n?.id != null) return `id:${String(n.id)}`;
    return `tmp:${String(n?.comment_text || '')}:${String(n?.created_at || '')}`;
  };
  for (const c of serverList || []) {
    const n = normalizePostComment(c);
    byKey.set(keyOf(n), n);
  }
  for (const c of localList || []) {
    const n = normalizePostComment(c);
    const k = keyOf(n);
    const existing = byKey.get(k);
    if (!existing) {
      byKey.set(k, n);
    } else {
      byKey.set(k, {
        ...existing,
        ...n,
        id: existing.id,
        ad_id: existing.ad_id,
        user_id: existing.user_id,
        created_at: existing.created_at,
        comment_text: existing.comment_text,
        commenter_name: existing.commenter_name,
        likes_count: existing.likes_count,
        dislikes_count: existing.dislikes_count,
        comment_image_url: n.comment_image_url || existing.comment_image_url,
        commenter_image_url:
          n.commenter_image_url || existing.commenter_image_url,
        my_reaction:
          n.my_reaction != null && n.my_reaction !== undefined
            ? n.my_reaction
            : existing.my_reaction,
        is_publisher:
          existing.is_publisher === true || n.is_publisher === true,
      });
    }
  }
  return [...byKey.values()];
}

function resolvePostPublisherId(post) {
  return (
    toSubscriptionId(post?.subscription_id) ||
    toSubscriptionId(post?.owner_id) ||
    toSubscriptionId(post?.creator_subscription_id) ||
    null
  );
}

function collectPostPublisherIds(post) {
  if (!post) return new Set();
  const ids = new Set();
  for (const raw of [
    post?.subscription_id,
    post?.owner_id,
    post?.creator_subscription_id,
    post?.creator_id,
  ]) {
    if (raw == null) continue;
    const trimmed = String(raw).trim();
    if (!trimmed) continue;
    const id = toSubscriptionId(trimmed);
    if (id) ids.add(id);
    else ids.add(trimmed);
  }
  const single = resolvePostPublisherId(post);
  if (single) ids.add(single);
  return ids;
}

function resolveCommentUserId(viewer) {
  return resolveSubscriptionId(viewer);
}

function resolveCommenterDisplayName(viewer) {
  if (!viewer) return 'משתמש';
  const subType = String(viewer.subscription_type || '').toLowerCase();
  if (subType === 'company') {
    return (
      viewer.business_name ||
      viewer.name ||
      viewer.contact_person_name ||
      'משתמש'
    );
  }
  if (subType === 'broker' || subType === 'project_marketer') {
    return (
      viewer.broker_office_name ||
      viewer.business_name ||
      viewer.name ||
      viewer.contact_person_name ||
      'משתמש'
    );
  }
  return (
    viewer.name ||
    viewer.contact_person_name ||
    viewer.business_name ||
    viewer.broker_office_name ||
    'משתמש'
  );
}

function commentUserIdMatchesPostPublisher(comment, post) {
  const commentUid = String(
    comment?.user_id ?? resolveSubscriptionId(comment) ?? '',
  ).trim();
  if (!commentUid || !post) return false;
  for (const field of [
    post.subscription_id,
    post.owner_id,
    post.creator_subscription_id,
    post.creator_id,
  ]) {
    if (field == null) continue;
    if (String(field).trim() === commentUid) return true;
  }
  return false;
}

function resolvePostPublisherDisplayNames(post) {
  if (!post) return [];
  return [
    post?.creator_name,
    post?.name,
    post?.business_name,
    post?.broker_office_name,
    post?.contact_person_name,
    post?.agent_name,
  ]
    .map(v => (v == null ? '' : String(v).trim()))
    .filter(Boolean);
}

function collectViewerSubscriptionIds(viewer) {
  const ids = new Set();
  if (!viewer) return ids;
  for (const raw of [
    viewer.id,
    viewer.user_id,
    viewer.subscription_id,
    viewer.owner_id,
    viewer.subscriptionId,
    viewer.ownerId,
  ]) {
    const id = toSubscriptionId(raw);
    if (id) ids.add(id);
  }
  return ids;
}

function viewerOwnsPost(post, viewer) {
  if (!post || !viewer) return false;
  const viewerIds = collectViewerSubscriptionIds(viewer);
  if (viewerIds.size === 0) return false;
  const publisherIds = collectPostPublisherIds(post);
  for (const vid of viewerIds) {
    if (publisherIds.has(vid)) return true;
  }
  const viewerEmail = String(viewer.email || '')
    .trim()
    .toLowerCase();
  const postEmail = String(post.creator_email || '')
    .trim()
    .toLowerCase();
  if (viewerEmail && postEmail && viewerEmail === postEmail) return true;
  const viewerNames = [
    viewer.name,
    viewer.contact_person_name,
    viewer.business_name,
    viewer.broker_office_name,
  ]
    .map(v => (v == null ? '' : String(v).trim()))
    .filter(Boolean);
  const postNames = resolvePostPublisherDisplayNames(post);
  if (
    viewerNames.length > 0 &&
    postNames.length > 0 &&
    postNames.some(pn => viewerNames.includes(pn))
  ) {
    return true;
  }
  return false;
}

function buildCommentsPostContext(
  postId,
  dbListings,
  videos,
  viewer = null,
  options = {},
) {
  const {baseItem = null, scopedPublisherSubId = null} = options;
  const listing = dbListings.find(l => l.id === postId);
  const video = videos.find(v => v.id === postId);
  if (!listing && !video && !baseItem) return null;
  const merged = {
    ...(video || {}),
    ...(listing || {}),
    ...(baseItem || {}),
    id: postId,
  };
  let subscription_id =
    merged.subscription_id ??
    merged.owner_id ??
    merged.creator_subscription_id ??
    null;
  let owner_id = merged.owner_id ?? merged.subscription_id ?? null;
  const scopedPubId =
    toSubscriptionId(scopedPublisherSubId) ||
    (scopedPublisherSubId != null && String(scopedPublisherSubId).trim()
      ? String(scopedPublisherSubId).trim()
      : null);
  const viewerId = resolveSubscriptionId(viewer);
  if (scopedPubId) {
    subscription_id = subscription_id || scopedPubId;
    owner_id = owner_id || scopedPubId;
  }
  if (viewerId && scopedPubId && viewerId === toSubscriptionId(scopedPubId)) {
    subscription_id = subscription_id || viewerId;
    owner_id = owner_id || viewerId;
  } else if (viewer && viewerOwnsPost(merged, viewer)) {
    if (viewerId) {
      subscription_id = subscription_id || viewerId;
      owner_id = owner_id || viewerId;
    }
  }
  return {
    ...merged,
    subscription_id,
    owner_id,
    creator_subscription_id:
      merged.creator_subscription_id ?? subscription_id ?? null,
    creator_name:
      merged.creator_name ??
      merged.name ??
      merged.business_name ??
      null,
    name: merged.name ?? merged.creator_name ?? null,
    business_name: merged.business_name ?? null,
    broker_office_name: merged.broker_office_name ?? null,
    contact_person_name: merged.contact_person_name ?? null,
  };
}

function isPostPublisherComment(comment, post, viewer = null) {
  if (!comment) return false;
  if (comment.is_publisher === true) return true;
  if (!post) return false;

  if (commentUserIdMatchesPostPublisher(comment, post)) return true;

  const publisherIds = collectPostPublisherIds(post);
  const commentUserId =
    toSubscriptionId(comment?.user_id) || resolveSubscriptionId(comment);
  if (commentUserId && publisherIds.has(commentUserId)) return true;

  const rawCommentUser = String(comment?.user_id || '').trim();
  if (rawCommentUser) {
    for (const pid of publisherIds) {
      if (String(pid).trim() === rawCommentUser) return true;
    }
  }

  if (viewer && commentUserId && viewerOwnsPost(post, viewer)) {
    const viewerIds = collectViewerSubscriptionIds(viewer);
    if (viewerIds.has(commentUserId)) return true;
  }

  const commentName = String(comment?.commenter_name || '').trim();
  if (!commentName) return false;
  return resolvePostPublisherDisplayNames(post).some(
    name => name === commentName,
  );
}

function annotatePostCommentsForPost(comments, post, viewer = null) {
  if (!Array.isArray(comments)) return [];
  if (!post) return comments.map(normalizePostComment);
  return comments.map(c => {
    const normalized = normalizePostComment(c);
    return {
      ...normalized,
      is_publisher: isPostPublisherComment(normalized, post, viewer),
    };
  });
}

// Sidebar filter buttons: each filters ads by type (maps to API subscription_type / has_video)
// Top bar center filters - icons from assets/top-filters
const TOP_BAR_FILTERS = [
  {id: 'pics', icon: require('../assets/top-filters/pics.png')},
  {id: 'list', icon: require('../assets/top-filters/list.png')},
  {id: 'video', icon: require('../assets/top-filters/video.png')},
  {id: 'liked', icon: require('../assets/top-filters/liked.png')},
];
/** Tapping the active filter again returns here (first icon, yellow). */
const DEFAULT_TOP_BAR_FILTER = 'pics';
/** Persists last top bar filter so "liked" stays selected after opening Favorites and returning. */
const TIKTOK_TOP_BAR_FILTER_STORAGE_KEY = 'tikTokFeedSelectedTopBarFilter';

/** True if the transformed feed item has a real video (ad or post with listing_videos / video_url). */
function listingHasPlayableVideo(item) {
  if (!item) return false;
  const v = item.video;
  if (!v) return false;
  if (typeof v === 'object' && (v.uri || v.url)) return true;
  return typeof v === 'string' && String(v).trim() !== '';
}

/** Top-bar "video" filter: listing ads that play as video — not posts, not image-only. */
function isVideoAdListing(item) {
  if (!item || isFeedPost(item)) return false;
  if (resolveFeedVideoUri(item)) return true;
  if (
    item.type === 'video' &&
    (item.videoProcessing || item.rawVideoUrl)
  ) {
    return true;
  }
  return false;
}

/**
 * TikTok vertical feed: creator chooses "וידיאו" vs "תמונה ראשית" (stored as feed_display_priority).
 * Default when unset: prefer video when both exist (matches AdsForm default).
 */
function normalizeListingFeedDisplayPriority(listing) {
  const raw =
    listing?.feed_display_priority ?? listing?.feedDisplayPriority ?? '';
  const s = String(raw).trim().toLowerCase();
  if (s === 'mainimage' || s === 'main_image') return 'mainImage';
  return 'video';
}

/** Collage vs slideshow — snake_case or camelCase from API. */
function normalizeListingDisplayOption(listing) {
  const raw = listing?.display_option ?? listing?.displayOption ?? '';
  return String(raw).trim().toLowerCase() === 'collage'
    ? 'collage'
    : 'slideshow';
}

const _sqm = v => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
};

/**
 * Max מ"ר from `project_offers` for חדש מקבלן company project ads (דירות 3/4/5, גן, פנטהאוז, בתים, משרד…).
 * When `typeIds` is set (סוג), only the areas relevant to those options count; else max of all `*_area` in offers, then `listing.area`.
 */
function newDeveloperMeterComparableSqm(listing, typeIds) {
  const po = listing?.project_offers;
  const fallback = _sqm(listing?.area);
  const ids = (Array.isArray(typeIds) ? typeIds : [])
    .map(t => {
      const s = String(t || '').trim();
      if (s === 'apartments') return 'apartment';
      return s;
    })
    .filter(Boolean);

  const maxOfKeys = keys => {
    if (!po || typeof po !== 'object') return 0;
    return Math.max(0, ...keys.map(k => _sqm(po[k])));
  };

  const allOfferAreasMax = () => {
    if (!po || typeof po !== 'object') return 0;
    let m = 0;
    for (const k of Object.keys(po)) {
      if (!k.endsWith('_area')) continue;
      if (k.includes('balcony')) continue;
      const x = _sqm(po[k]);
      if (x > m) m = x;
    }
    return m;
  };

  const officeOrCommerceAreasMax = () => {
    if (!po || typeof po !== 'object') return 0;
    let m = 0;
    for (const k of Object.keys(po)) {
      if (!k.endsWith('_area') || k.includes('balcony')) continue;
      if (
        /(office|whole_floor|store|warehouse|commercial|industrial|shopping)/i.test(
          k,
        )
      ) {
        const x = _sqm(po[k]);
        if (x > m) m = x;
      }
    }
    return m;
  };

  const byTypeId = id => {
    switch (id) {
      case 'apartment':
        return maxOfKeys(['rooms_3_area', 'rooms_4_area', 'rooms_5_area']);
      case 'garden':
        return _sqm(po?.garden_area);
      case 'penthouses':
        return _sqm(po?.penthouse_area);
      case 'private_houses':
        return _sqm(po?.private_area);
      case 'villas':
        return Math.max(
          _sqm(po?.private_area),
          _sqm(po?.penthouse_area),
          _sqm(po?.garden_area),
        );
      case 'offices':
      case 'commercial':
        return officeOrCommerceAreasMax();
      case 'religious_sector':
        return allOfferAreasMax();
      default:
        return 0;
    }
  };

  if (ids.length === 0) {
    const m = allOfferAreasMax();
    return m > 0 ? m : fallback;
  }

  let best = 0;
  for (const id of ids) {
    const v = byTypeId(id);
    if (v > best) best = v;
  }
  if (best > 0) return best;
  const m2 = allOfferAreasMax();
  return m2 > 0 ? m2 : fallback;
}

/** Positive integer room count, else 0 */
const _roomNum = v => {
  const x = Math.floor(Number(v));
  return Number.isFinite(x) && x > 0 ? x : 0;
};

/** A project-offer line is "on" if area or price is set (company form). */
const nfdOfferLineActive = (po, name) => {
  if (!po || typeof po !== 'object') return false;
  return _sqm(po[`${name}_area`]) > 0 || _sqm(po[`${name}_price`]) > 0;
};

/** Max room count from דירות 3/4/5 חדרים lines only. */
const nfdApartmentLinesMaxRoom = po => {
  if (!po || typeof po !== 'object') return 0;
  let m = 0;
  for (const n of [3, 4, 5]) {
    if (nfdOfferLineActive(po, `rooms_${n}`)) m = Math.max(m, n);
  }
  return m;
};

/**
 * For חדש מקבלן: "כמה חדרים" evidence from `project_offers` (3–5, גן, פנטהאוז, בית pvt) + `listing.rooms`.
 * Respects `typeIds` (סוג) like the meter helper: only those buckets count; if none, take max across all.
 */
function newDeveloperComparableMaxRooms(listing, typeIds) {
  const po = listing?.project_offers;
  const listingRooms = _roomNum(listing?.rooms);
  const ids = (Array.isArray(typeIds) ? typeIds : [])
    .map(t => {
      const s = String(t || '').trim();
      return s === 'apartments' ? 'apartment' : s;
    })
    .filter(Boolean);

  const gardenRooms = () => {
    if (!nfdOfferLineActive(po, 'garden')) return 0;
    return _roomNum(po?.garden_rooms) || listingRooms;
  };
  const penthouseRooms = () => {
    if (!nfdOfferLineActive(po, 'penthouse')) return 0;
    return _roomNum(po?.penthouse_rooms) || listingRooms;
  };
  const privateRooms = () => {
    if (!nfdOfferLineActive(po, 'private')) return 0;
    return _roomNum(po?.private_rooms) || listingRooms;
  };

  const byTypeId = id => {
    switch (id) {
      case 'apartment':
        return nfdApartmentLinesMaxRoom(po) || 0;
      case 'garden':
        return gardenRooms();
      case 'penthouses':
        return penthouseRooms();
      case 'private_houses':
        return privateRooms();
      case 'villas':
        return Math.max(
          privateRooms(),
          penthouseRooms(),
          gardenRooms(),
          nfdApartmentLinesMaxRoom(po),
        );
      case 'offices':
      case 'commercial':
        return listingRooms;
      case 'religious_sector':
        return Math.max(
          nfdApartmentLinesMaxRoom(po),
          gardenRooms(),
          penthouseRooms(),
          privateRooms(),
          listingRooms,
        );
      default:
        return 0;
    }
  };

  if (ids.length === 0) {
    const m = Math.max(
      nfdApartmentLinesMaxRoom(po),
      gardenRooms(),
      penthouseRooms(),
      privateRooms(),
      listingRooms,
    );
    return m > 0 ? m : listingRooms;
  }

  let best = 0;
  for (const id of ids) {
    best = Math.max(best, byTypeId(id));
  }
  if (best > 0) {
    return best;
  }
  return Math.max(
    nfdApartmentLinesMaxRoom(po),
    gardenRooms(),
    penthouseRooms(),
    privateRooms(),
    listingRooms,
  );
}

/** Same heart size on every TikTok overlay variant (broker, company, BnB, etc.). */
const TIKTOK_OVERLAY_HEART_SIZE = 32;

const TIKTOK_OVERLAY_ICONS = {
  location: require('../assets/tiktok/location.png'),
  preSaleBadge: require('../assets/pre-sale.png'),
  postLike: require('../assets/tiktok/likes.png'),
  postComment: require('../assets/tiktok/comments.png'),
  postShare: require('../assets/tiktok/shere.png'),
  postView: require('../assets/tiktok/views.png'),
  companyHome: require('../assets/tiktok/company-home.png'),
  companyDoor: require('../assets/tiktok/צילום_מסך_2026-04-09_160628-removebg-preview.png'),
  companyStairs: require('../assets/tiktok/צילום_מסך_2026-04-09_160920-removebg-preview.png'),
  companyBuilding: require('../assets/tiktok/צילום_מסך_2026-04-09_161056-removebg-preview.png'),
  commentsCardHeart: require('../assets/tiktok/comment-like.png'),
  commentsCardHeartLiked: require('../assets/tiktok/comment-like-active.png'),
  commentsCardReply: require('../assets/tiktok/comments-card-reply.png'),
  commentsCamera: require('../assets/tiktok/cam-comments.png'),
  ratingOneToFour: require('../assets/tiktok/1-4hurt.png'),
  ratingFiveStars: require('../assets/tiktok/5stars.png'),
};

const COMMENT_REACTIONS = ['😂', '🙏', '😀', '👍', '😉', '👌'];
/** Small cushion above the soft keyboard (iOS only — Android uses adjustResize). */
const COMMENTS_COMPOSER_KEYBOARD_LIFT = Platform.OS === 'ios' ? 8 : 0;
const COMMENTS_COMPOSER_SCROLL_PADDING = 210;

/** Shared asset for sidebar rows with `id: 'new'` (חדשות / חדשים). */
const NEW_SIDEBAR_FILTER_ICON = require('../assets/tiktok/new.png');
/** משרדים (category 2) only — `new-2` for the “חדשים” chip; other categories keep `new.png`. */
const OFFICE_NEW_SIDEBAR_FILTER_ICON = require('../assets/tiktok/new-2.png');

/**
 * חדש מקבלן (category 1) only — הדמיות first (company video ads), then company “סטטוס” chips (פריסייל / בנוי / בבנייה), + פוסטים / שירות.
 * Do not use as the default for דירות / גלובל / other feeds.
 */
const NEW_FROM_DEVELOPER_SIDEBAR_FILTERS = [
  {
    id: 'renderings',
    label: 'הדמיות',
    subscription_type: 'company',
    ads_only: true,
    has_video: true,
    svg: officeSidebarSvgs.renderings,
  },
  {
    id: 'presale',
    label: 'פריסייל',
    subscription_type: 'company',
    ads_only: true,
    icon: require('../assets/tiktok/on-pre-sell.png'),
  },
  {
    id: 'built',
    label: 'בנוי',
    subscription_type: 'company',
    ads_only: true,
    icon: require('../assets/tiktok/ready.png'),
  },
  {
    id: 'under_construction',
    label: 'בבנייה',
    subscription_type: 'company',
    ads_only: true,
    icon: require('../assets/tiktok/under-constraction.png'),
  },
  {
    id: 'posts',
    label: 'פוסטים',
    feed_post: true,
    icon: require('../assets/side-filters/posts.png'),
  },
  {
    id: 'service',
    label: 'נותני שירות',
    subscription_type: 'professional',
    feed_post: true,
    icon: require('../assets/side-filters/services.png'),
  },
];

/**
 * דירות (category 10) only — Figma order: פרטי, תיווך, הדמיות, חדשות, פוסטים, נותני שירות.
 * Same `id` / API fields as משרדים, different order + label (חדשות).
 */
const APARTMENTS_SIDEBAR_FILTERS = [
  {
    id: 'personal',
    label: 'פרטי',
    subscription_type: 'user',
    ads_only: true,
    svg: officeSidebarSvgs.personal,
  },
  {
    id: 'broker',
    label: 'תיווך',
    subscription_type: 'broker',
    ads_only: true,
    svg: officeSidebarSvgs.broker,
  },
  {
    id: 'renderings',
    label: 'הדמיות',
    subscription_type: 'company',
    ads_only: true,
    has_video: true,
    svg: officeSidebarSvgs.renderings,
  },
  {
    id: 'new',
    label: 'חדשות',
    condition: 'new',
    ads_only: true,
    icon: NEW_SIDEBAR_FILTER_ICON,
  },
  {
    id: 'posts',
    label: 'פוסטים',
    feed_post: true,
    svg: officeSidebarSvgs.posts,
  },
  {
    id: 'service',
    label: 'נותני שירות',
    subscription_type: 'professional',
    feed_post: true,
    svg: officeSidebarSvgs.service,
  },
];

// משרדים (category 2): dedicated sidebar — פרטי, תיווך, חדשים, הדמיות, פוסטים, נותני שירות
// Icons come from Figma (officeSidebarSvgs) — each entry exposes an `svg(color)` builder.
const OFFICE_SIDEBAR_FILTERS = [
  {
    id: 'personal',
    label: 'פרטי',
    subscription_type: 'user',
    ads_only: true,
    svg: officeSidebarSvgs.personal,
  },
  {
    id: 'broker',
    label: 'תיווך',
    subscription_type: 'broker',
    ads_only: true,
    svg: officeSidebarSvgs.broker,
  },
  {
    id: 'new',
    label: 'חדשים',
    condition: 'new',
    ads_only: true,
    icon: NEW_SIDEBAR_FILTER_ICON,
  },
  {
    id: 'renderings',
    label: 'הדמיות',
    subscription_type: 'company',
    ads_only: true,
    has_video: true,
    svg: officeSidebarSvgs.renderings,
  },
  {
    id: 'posts',
    label: 'פוסטים',
    feed_post: true,
    svg: officeSidebarSvgs.posts,
  },
  {
    id: 'service',
    label: 'נותני שירות',
    subscription_type: 'professional',
    feed_post: true,
    svg: officeSidebarSvgs.service,
  },
];

// קרקעות (category 7): dedicated sidebar (API filters). סוג (Type / bottom bar) adds finer land-type rows (פרטית, חקלאית, מושב, …).
// Figma node 25:171816 uses the same icon glyph for all entries.
const LAND_SIDEBAR_FILTERS = [
  {
    id: 'land_personal',
    label: 'פרטי',
    subscription_type: 'user',
    ads_only: true,
    svg: officeSidebarSvgs.personal,
  },
  {
    id: 'land_broker',
    label: 'תיווך',
    subscription_type: 'broker',
    ads_only: true,
    svg: officeSidebarSvgs.broker,
  },
  {
    id: 'land_permit',
    label: 'היתר',
    permit: 'there_is',
    svg: officeSidebarSvgs.permit,
  },
  {
    id: 'land_plan',
    label: 'תב״ע',
    plan_approval: 'there_is',
    svg: officeSidebarSvgs.plan,
  },
  {
    id: 'land_posts',
    label: 'פוסטים',
    feed_post: true,
    svg: officeSidebarSvgs.posts,
  },
  {
    id: 'land_service',
    label: 'נותני שירות',
    subscription_type: 'professional',
    feed_post: true,
    svg: officeSidebarSvgs.service,
  },
];

// מסחר (category 8): dedicated sidebar — same exact Figma icon set as the design node 25:143924 (label “חדשות” for the new-items row)
const COMMERCIAL_SIDEBAR_FILTERS = [
  {
    id: 'personal',
    label: 'פרטי',
    subscription_type: 'user',
    ads_only: true,
    svg: officeSidebarSvgs.personal,
  },
  {
    id: 'broker',
    label: 'תיווך',
    subscription_type: 'broker',
    ads_only: true,
    svg: officeSidebarSvgs.broker,
  },
  {
    id: 'renderings',
    label: 'הדמיות',
    subscription_type: 'company',
    ads_only: true,
    has_video: true,
    svg: officeSidebarSvgs.renderings,
  },
  {
    id: 'new',
    label: 'חדשות',
    condition: 'new',
    ads_only: true,
    icon: NEW_SIDEBAR_FILTER_ICON,
  },
  {
    id: 'posts',
    label: 'פוסטים',
    feed_post: true,
    svg: officeSidebarSvgs.posts,
  },
  {
    id: 'service',
    label: 'נותני שירות',
    subscription_type: 'professional',
    feed_post: true,
    svg: officeSidebarSvgs.service,
  },
];

// שותפים (category 3): dedicated sidebar — icons from assets/partners-filters
// פוסטים + נותני שירות last (stacked, tight gap) so they sit together at the bottom.
const PARTNERS_SIDEBAR_FILTERS = [
  {
    id: 'partners_enter',
    label: 'מחפש להיכנס',
    search_purpose: 'enter',
    icon: require('../assets/partners-filters/looking-to-get-in.png'),
  },
  {
    id: 'partners_bring_in',
    label: 'מחפש להכניס',
    search_purpose: 'bring_in',
    icon: require('../assets/partners-filters/looking-for-somone-for-my-apaprtment.png'),
  },
  {
    id: 'partners_partner',
    label: 'מחפש שותף',
    search_purpose: 'partner',
    icon: require('../assets/partners-filters/looking-for-patner.png'),
  },
  {
    id: 'partners_posts',
    label: 'פוסטים',
    feed_post: true,
    icon: require('../assets/partners-filters/posts.png'),
  },
  {
    id: 'partners_professional',
    label: 'נותני שירות',
    subscription_type: 'professional',
    feed_post: true,
    icon: require('../assets/partners-filters/profetional.png'),
  },
];
/** שותפים chips are taller (2-line labels) and the פוסטים/נותני שירות pair uses a tighter gap. */
const PARTNERS_SIDEBAR_CHIP_HEIGHT = 68;
const PARTNERS_SIDEBAR_STACK_GAP = 20;
const PARTNERS_SIDEBAR_TIGHT_PAIR_GAP = 6;

// BnB (category 5): אופי האירוח + פוסטים — exact Figma icons (node 25:189715)
const BNB_SIDEBAR_FILTERS = [
  {
    id: 'bnb_landscapes',
    label: 'נופים',
    hospitality_nature: 'landscapes',
    svg: bnbSidebarSvgs.landscapes,
  },
  {
    id: 'bnb_beach',
    label: 'על הים',
    hospitality_nature: 'on_the_beach',
    svg: bnbSidebarSvgs.beach,
  },
  {
    id: 'bnb_pool',
    label: 'עם בריכה',
    hospitality_nature: 'with_pool',
    svg: bnbSidebarSvgs.pool,
  },
  {
    id: 'bnb_nature',
    label: 'טבע',
    hospitality_nature: 'nature',
    svg: bnbSidebarSvgs.nature,
  },
  {
    id: 'bnb_experiences',
    label: 'חוויות',
    hospitality_nature: 'experiences',
    svg: bnbSidebarSvgs.experiences,
  },
  {
    id: 'bnb_rural',
    label: 'כפרי',
    hospitality_nature: 'rural',
    svg: bnbSidebarSvgs.rural,
  },
  {
    id: 'bnb_desert',
    label: 'מדבר',
    hospitality_nature: 'desert',
    svg: bnbSidebarSvgs.desert,
  },
  {
    id: 'bnb_posts',
    label: 'פוסטים',
    feed_post: true,
    svg: bnbSidebarSvgs.posts,
  },
];

/** BnB TikTok: cap sidebar / overlay chip text so it truncates with "…" instead of overflowing. */
const BNB_TIKTOK_LABEL_MAX_CHARS = 25;
/** Keep bottom-left overlay copy clear of the right sidebar (heart / מכירה row unchanged). */
const FEED_SIDEBAR_ZONE_PX = 88;
const FEED_OVERLAY_LEFT_PX = 20;
const FEED_OVERLAY_TEXT_MAX_WIDTH = Math.min(
  366,
  Dimensions.get('window').width - FEED_OVERLAY_LEFT_PX - FEED_SIDEBAR_ZONE_PX,
);

function truncateTikTokLabel(text, maxLen = BNB_TIKTOK_LABEL_MAX_CHARS) {
  const s = String(text ?? '').trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen).trimEnd()}...`;
}

const parseListingGeneralDetails = raw => {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return null;
    try {
      const parsed = JSON.parse(s);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : null;
    } catch (_) {
      return null;
    }
  }
  return null;
};

/** Hashtags live in general_details.hashtags (JSONB) or a top-level hashtags array. */
const getListingHashtags = listing => {
  if (Array.isArray(listing?.hashtags)) {
    return listing.hashtags
      .map(t => String(t || '').trim().replace(/^#+/, ''))
      .filter(Boolean);
  }
  const gd = parseListingGeneralDetails(listing?.general_details);
  let raw = gd?.hashtags ?? null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      raw = Array.isArray(parsed) ? parsed : null;
    } catch (_) {
      raw = raw
        .split(/[\s,]+/)
        .map(t => t.trim().replace(/^#+/, ''))
        .filter(Boolean);
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map(t => String(t || '').trim().replace(/^#+/, ''))
    .filter(Boolean);
};

/** Web StyleSheet omits `direction`; keep post overlay chips/buttons RTL-aligned. */
const postOverlayRtlDirection =
  Platform.OS === 'web' ? {direction: 'rtl'} : null;

const resolveFollowUuid = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const raw = String(candidate).trim();
    if (!raw) continue;
    const uuid = toSubscriptionId(raw);
    if (uuid) return uuid;
  }
  return null;
};

const resolveListingFollowTargetId = listing =>
  resolveFollowUuid(
    listing?.subscription_id,
    listing?.owner_id,
    listing?.creator_subscription_id,
  );

const getListingFollowTargetKeys = listing => {
  const keys = new Set();
  for (const candidate of [
    listing?.subscription_id,
    listing?.owner_id,
    listing?.creator_subscription_id,
  ]) {
    const uuid = toSubscriptionId(candidate);
    if (uuid) keys.add(String(uuid));
  }
  return [...keys];
};

const getFollowRowForVideo = (map, video) => {
  for (const key of getListingFollowTargetKeys(video)) {
    const row = map?.[key];
    if (row) return row;
  }
  return null;
};

const patchFollowStatusForVideo = (prev, video, patch, extraKeys = []) => {
  const keys = new Set([
    ...getListingFollowTargetKeys(video),
    ...extraKeys.filter(Boolean).map(String),
  ]);
  if (keys.size === 0) return prev;
  const next = {...prev};
  for (const key of keys) {
    next[key] = {...(next[key] || defaultFollowStatusEntry()), ...patch};
  }
  return next;
};

const mergeFollowStatusMaps = (prev, fetched) => {
  const merged = {...(fetched || {})};
  for (const [key, row] of Object.entries(prev || {})) {
    if (!row?.has_pending_request || row?.is_following) continue;
    const server = merged[key];
    if (server?.is_following) continue;
    merged[key] = {
      ...(server || defaultFollowStatusEntry()),
      has_pending_request: true,
    };
  }
  return merged;
};

const defaultFollowStatusEntry = () => ({
  is_following: false,
  has_pending_request: false,
});

const normalizeFollowStatusMap = (rawMap, targetIds = []) => {
  const out = {...(rawMap || {})};
  for (const id of targetIds) {
    const key = id != null ? String(id).trim() : '';
    if (!key) continue;
    const row = out[key];
    out[key] = {
      is_following: !!row?.is_following,
      has_pending_request: !!row?.has_pending_request,
    };
  }
  return out;
};

async function prefetchFollowStatusForTargets(viewerSubId, targetIds) {
  if (!viewerSubId || !targetIds?.length) return {};
  try {
    const data = await getFollowStatusBatch(viewerSubId, targetIds);
    return normalizeFollowStatusMap(data?.status || {}, targetIds);
  } catch {
    return normalizeFollowStatusMap({}, targetIds);
  }
}

// Image Swiper Component for multiple photos - supports slideshow and collage
const FEED_PAGE_MAX_WIDTH = 414;
/** Always mount/preload this many feed pages below the current one (photos + videos). */
const FEED_PRELOAD_BELOW_COUNT = 4;
const FEED_PRELOAD_ABOVE_COUNT = 2;
const FEED_FLATLIST_WINDOW_SIZE =
  FEED_PRELOAD_ABOVE_COUNT + FEED_PRELOAD_BELOW_COUNT + 4;

function resolveFeedItemMediaUris(video) {
  if (!video) return [];
  const uris = [];
  const pushUri = raw => {
    const uri = raw != null ? String(raw).trim() : '';
    if (uri && /^https?:\/\//i.test(uri)) uris.push(uri);
  };

  if (video.isUploaded) {
    const feedVideoUri =
      video.video && typeof video.video === 'object'
        ? String(video.video.uri || video.video.url || '').trim()
        : typeof video.video === 'string'
          ? String(video.video).trim()
          : '';
    if (video.type === 'video' && feedVideoUri) {
      pushUri(feedVideoUri);
      return uris;
    }
    if (Array.isArray(video.images)) {
      video.images.forEach(image => {
        if (image == null) return;
        if (typeof image === 'string') pushUri(image);
        else if (typeof image === 'object') pushUri(image.uri ?? image.url);
      });
    }
  }
  return uris;
}

/** Warm the RN image cache + video files for the next feed pages. */
function prefetchFeedMediaItems(items, startIndex = 0, count = 3) {
  if (!Array.isArray(items) || items.length === 0) return;
  prefetchFeedWindowMedia(items, startIndex, count, Image);
}

/** Collect remote image URIs for the first feed page (poster + first photo). */
function collectFirstPageImageUris(items) {
  const uris = [];
  const first = items?.[0];
  if (!first) return uris;
  resolveFeedItemMediaUris(first).forEach(uri => {
    if (/^https?:\/\//i.test(uri) && !/\.(mp4|m3u8|webm|mov)(\?|$)/i.test(uri)) {
      uris.push(uri);
    }
  });
  const poster = first.images?.[0]?.uri;
  if (poster && /^https?:\/\//i.test(String(poster))) {
    uris.push(String(poster).trim());
  }
  return Array.from(new Set(uris));
}

/**
 * Wait for first-page images to land in the RN image cache so the user sees the
 * feed already populated instead of placeholders. Capped so a slow network
 * doesn't strand the loading spinner indefinitely.
 */
function waitForFirstPageImages(items, timeoutMs = 1800) {
  const uris = collectFirstPageImageUris(items);
  if (uris.length === 0) return Promise.resolve();
  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    Promise.allSettled(uris.map(u => Image.prefetch(u)))
      .then(() => {
        clearTimeout(timer);
        finish();
      })
      .catch(() => {
        clearTimeout(timer);
        finish();
      });
  });
}

function buildListingsFetchCacheKey(category, sidebarFilter, topBarFilter, userId) {
  return `${category ?? 'all'}|${sidebarFilter ?? ''}|${topBarFilter ?? ''}|${userId ?? ''}`;
}

const FEED_IMAGE_PROPS =
  Platform.OS === 'android' ? {fadeDuration: 0} : undefined;

/** Auto-advance interval for multi-photo ad slideshows in the TikTok feed. */
const SLIDESHOW_AUTO_ADVANCE_MS = 900;
/** Crossfade duration when auto-advancing slideshow photos. */
const SLIDESHOW_FADE_MS = 450;

function isFeedPostVideo(video) {
  if (!video) return false;
  const type = String(
    video.propertyType ||
      video.propertyTypeRaw ||
      video.apartmentTypeId ||
      '',
  ).toLowerCase();
  return (
    type === 'post' ||
    type === 'posts' ||
    type === 'feed_post' ||
    type.includes('post') ||
    video.feed_post === true ||
    video.isTextOnlyPost === true ||
    video.isPostEntry === true
  );
}

/**
 * Listing-ad slide: full width (edge-to-edge sides), letterbox top/bottom.
 * Never crops left/right — same rule as story / ad videos.
 */
function FitWidthFeedImage({
  source,
  pageWidth,
  screenHeight,
  imageStyle,
  onError,
  single = false,
}) {
  const [layout, setLayout] = useState(null);
  const sourceKey =
    typeof source === 'number'
      ? String(source)
      : String(source?.uri || '');

  useEffect(() => {
    setLayout(null);
  }, [sourceKey, pageWidth]);

  const applyNaturalSize = useCallback(
    (nw, nh) => {
      const next = fitWidthMediaLayout(pageWidth, nw, nh);
      if (next) setLayout(next);
    },
    [pageWidth],
  );

  return (
    <View
      style={[
        styles.swiperImageContainer,
        {width: pageWidth, height: screenHeight},
        single && styles.swiperImageContainerSingle,
      ]}>
      <Image
        source={source}
        {...FEED_IMAGE_PROPS}
        style={[
          layout || {
            width: pageWidth,
            height: screenHeight,
          },
          imageStyle,
        ]}
        resizeMode={layout ? 'stretch' : 'contain'}
        onLoad={e => {
          const src = e?.nativeEvent?.source;
          const w = Number(src?.width) || 0;
          const h = Number(src?.height) || 0;
          if (w > 0 && h > 0) {
            applyNaturalSize(w, h);
            return;
          }
          // Web / some Android builds omit source dims — resolve via Image.getSize.
          const uri = typeof source === 'object' ? source?.uri : null;
          if (uri) {
            Image.getSize(
              uri,
              (gw, gh) => applyNaturalSize(gw, gh),
              () => {},
            );
          }
        }}
        onError={onError}
      />
    </View>
  );
}

const ImageSwiper = ({
  images,
  screenHeight,
  video,
  displayOption = 'slideshow',
  isActivePage = true,
  pauseAutoAdvance = false,
}) => {
  const {width: winWidth} = useWindowDimensions();
  const pageWidth = Math.min(Math.max(1, winWidth), FEED_PAGE_MAX_WIDTH);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fadeIdxA, setFadeIdxA] = useState(0);
  const [fadeIdxB, setFadeIdxB] = useState(0);
  const [erroredKeys, setErroredKeys] = useState(() => new Set());
  const scrollViewRef = useRef(null);
  const loopSnapRef = useRef(false);
  const fadeLayerA = useRef(new Animated.Value(1)).current;
  const fadeLayerB = useRef(new Animated.Value(0)).current;
  const fadeFrontRef = useRef('a');
  const fadeIndexA = useRef(0);
  const fadeIndexB = useRef(0);
  const fadeTransitionLock = useRef(false);
  const prevAutoSlideshowRef = useRef(false);
  const autoSlideshow =
    isActivePage &&
    !pauseAutoAdvance &&
    displayOption === 'slideshow' &&
    images.length > 1 &&
    !isFeedPostVideo(video);
  // Loop clone only for manual horizontal swiping — auto mode uses crossfade.
  const slideshowSlides = images;

  useEffect(() => {
    const wasAuto = prevAutoSlideshowRef.current;
    prevAutoSlideshowRef.current = autoSlideshow;
    // Entering auto mode — start from the current slide on a single layer.
    if (autoSlideshow && !wasAuto) {
      fadeIndexA.current = currentImageIndex;
      fadeIndexB.current = currentImageIndex;
      setFadeIdxA(currentImageIndex);
      setFadeIdxB(currentImageIndex);
      fadeFrontRef.current = 'a';
      fadeLayerA.setValue(1);
      fadeLayerB.setValue(0);
      fadeTransitionLock.current = false;
      return;
    }
    // Leaving auto mode (e.g. swiped to next feed page mid-crossfade) — collapse
    // to one visible layer so photos do not stay stacked.
    if (!autoSlideshow && wasAuto) {
      fadeIndexA.current = currentImageIndex;
      fadeIndexB.current = currentImageIndex;
      setFadeIdxA(currentImageIndex);
      setFadeIdxB(currentImageIndex);
      fadeFrontRef.current = 'a';
      fadeLayerA.setValue(1);
      fadeLayerB.setValue(0);
      fadeTransitionLock.current = false;
    }
  }, [autoSlideshow, currentImageIndex, fadeLayerA, fadeLayerB]);

  useEffect(() => {
    setCurrentImageIndex(0);
    loopSnapRef.current = false;
    setErroredKeys(new Set());
    fadeIndexA.current = 0;
    fadeIndexB.current = 0;
    setFadeIdxA(0);
    setFadeIdxB(0);
    fadeFrontRef.current = 'a';
    fadeLayerA.setValue(1);
    fadeLayerB.setValue(0);
    fadeTransitionLock.current = false;
    if (scrollViewRef.current && displayOption === 'slideshow') {
      scrollViewRef.current.scrollTo({x: 0, animated: false});
    }
  }, [images, displayOption, pageWidth, fadeLayerA, fadeLayerB]);

  useEffect(() => {
    if (!autoSlideshow) return undefined;

    const advance = () => {
      if (fadeTransitionLock.current || images.length < 2) return;
      fadeTransitionLock.current = true;

      const current =
        fadeFrontRef.current === 'a'
          ? fadeIndexA.current
          : fadeIndexB.current;
      const next = (current + 1) % images.length;
      const fadeOut = fadeFrontRef.current === 'a' ? fadeLayerA : fadeLayerB;
      const fadeIn = fadeFrontRef.current === 'a' ? fadeLayerB : fadeLayerA;

      if (fadeFrontRef.current === 'a') {
        fadeIndexB.current = next;
        setFadeIdxB(next);
      } else {
        fadeIndexA.current = next;
        setFadeIdxA(next);
      }

      fadeIn.setValue(0);
      Animated.parallel([
        Animated.timing(fadeOut, {
          toValue: 0,
          duration: SLIDESHOW_FADE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: SLIDESHOW_FADE_MS,
          useNativeDriver: true,
        }),
      ]).start(({finished}) => {
        fadeTransitionLock.current = false;
        if (!finished) return;

        fadeFrontRef.current = fadeFrontRef.current === 'a' ? 'b' : 'a';
        if (fadeFrontRef.current === 'a') {
          fadeIndexA.current = next;
          setFadeIdxA(next);
          fadeLayerA.setValue(1);
          fadeLayerB.setValue(0);
        } else {
          fadeIndexB.current = next;
          setFadeIdxB(next);
          fadeLayerB.setValue(1);
          fadeLayerA.setValue(0);
        }
        setCurrentImageIndex(next);
      });
    };

    const id = setInterval(advance, SLIDESHOW_AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [autoSlideshow, images.length, fadeLayerA, fadeLayerB]);

  useEffect(() => {
    if (autoSlideshow || !scrollViewRef.current || displayOption !== 'slideshow') {
      return;
    }
    scrollViewRef.current.scrollTo({
      x: currentImageIndex * pageWidth,
      animated: true,
    });
  }, [autoSlideshow, currentImageIndex, displayOption, pageWidth]);

  const handleScroll = event => {
    if (displayOption === 'slideshow') {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const w = pageWidth;
      const newIndex = Math.round(contentOffsetX / w);
      if (newIndex !== currentImageIndex) {
        setCurrentImageIndex(newIndex);
      }
    }
  };

  const handleSlideshowScrollEnd = handleScroll;

  const resolveImageUri = image => {
    if (image == null) return '';
    if (typeof image === 'string') return String(image).trim();
    if (typeof image === 'object') {
      const u = image.uri ?? image.url;
      return u != null ? String(u).trim() : '';
    }
    return '';
  };

  // Category fallback shown when a remote image is missing or fails to load.
  // Keeps the feed from rendering a pure-black slide (common for some
  // מסחר/category 8 ads whose main_image_url is null or unreachable).
  const fallbackCategoryImage =
    categoryImages[Number(video?.category)] || categoryImages[1];

  const markImageErrored = key => {
    setErroredKeys(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  // Feed posts and listing ads both use fit-width: edge-to-edge sides, letterbox
  // top/bottom — never crop left/right.
  const isPostSlide = isFeedPostVideo(video);

  const renderSlideshowSlide = (image, slideKey, single = false) => {
    const uri = resolveImageUri(image);
    const useFallback = !uri || erroredKeys.has(slideKey);
    const imageSource = useFallback ? fallbackCategoryImage : {uri};
    if (!isPostSlide) {
      return (
        <FitWidthFeedImage
          source={imageSource}
          pageWidth={pageWidth}
          screenHeight={screenHeight}
          single={single}
          onError={() => markImageErrored(slideKey)}
        />
      );
    }
    return (
      <FitWidthFeedImage
        source={imageSource}
        pageWidth={pageWidth}
        screenHeight={screenHeight}
        single={single}
        onError={() => markImageErrored(slideKey)}
      />
    );
  };

  const renderSlideshowDots = () =>
    images.length > 1 ? (
      <View
        style={[styles.imageIndicator, {top: FEED_IMAGE_INDICATOR_TOP_GAP}]}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicatorDot,
              index === currentImageIndex % images.length &&
                styles.indicatorDotActive,
            ]}
          />
        ))}
      </View>
    ) : null;

  // Collage view — crop/fill cells only for 2+ images; single image uses slideshow fit-width below.
  if (displayOption === 'collage' && images.length > 1) {
    const slice = images.slice(0, 5);
    const imageCount = slice.length;
    const layouts = getCollageCellLayouts(imageCount, pageWidth, screenHeight);

    return (
      <View
        style={[
          styles.videoItem,
          forceLtrStyle,
          {
            height: screenHeight,
            minHeight: screenHeight,
            maxHeight: screenHeight,
            position: 'relative',
          },
        ]}>
        <View style={styles.collageContainer}>
          {slice.map((image, index) => {
            const layout = layouts[index];
            if (!layout) return null;
            const uri = resolveImageUri(image);
            const collageKey = `collage-${index}`;
            const useFallback = !uri || erroredKeys.has(collageKey);
            const imageSource = useFallback
              ? fallbackCategoryImage
              : {uri};
            return (
              <View
                key={`${collageKey}-${uri || 'empty'}`}
                style={[
                  styles.collageImageContainer,
                  {
                    position: 'absolute',
                    width: layout.width,
                    height: layout.height,
                    top: layout.top,
                    left: layout.left,
                    overflow: 'hidden',
                    backgroundColor: '#000',
                  },
                ]}>
                <Image
                  source={imageSource}
                  {...FEED_IMAGE_PROPS}
                  style={styles.collageImage}
                  resizeMode="cover"
                  onError={() => markImageErrored(collageKey)}
                />
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // Slideshow view — multi-photo ads auto-advance with crossfade; manual swipe uses horizontal scroll.
  const isSingleImage = images.length === 1;

  if (autoSlideshow) {
    return (
      <View
        style={[
          styles.videoItem,
          forceLtrStyle,
          {
            height: screenHeight,
            minHeight: screenHeight,
            maxHeight: screenHeight,
          },
        ]}>
        <View
          style={{
            width: pageWidth,
            height: screenHeight,
            alignSelf: 'center',
            position: 'relative',
          }}>
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, {opacity: fadeLayerA}]}>
            {renderSlideshowSlide(
              images[fadeIdxA],
              `fade-a-${fadeIdxA}`,
            )}
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, {opacity: fadeLayerB}]}>
            {renderSlideshowSlide(
              images[fadeIdxB],
              `fade-b-${fadeIdxB}`,
            )}
          </Animated.View>
        </View>
        {renderSlideshowDots()}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.videoItem,
        forceLtrStyle,
        {
          height: screenHeight,
          minHeight: screenHeight,
          maxHeight: screenHeight,
          justifyContent: isSingleImage ? 'center' : 'flex-start',
          alignItems: isSingleImage ? 'center' : 'flex-start',
        },
      ]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleSlideshowScrollEnd}
        scrollEventThrottle={16}
        style={[styles.imageSwiper, forceLtrStyle]}
        scrollEnabled={!isSingleImage}
        pointerEvents="auto"
      >
        {slideshowSlides.map((image, index) => {
          const uri = resolveImageUri(image);
          const slideKey = `slide-${index}`;
          return (
            <View key={`${slideKey}-${uri || 'empty'}`} style={{width: pageWidth}}>
              {renderSlideshowSlide(image, slideKey, isSingleImage)}
            </View>
          );
        })}
      </ScrollView>
      {renderSlideshowDots()}
    </View>
  );
};


/**
 * TikTokFeedScreen Component
 * Vertical scrolling feed with TikTok-like behavior
 * Only one video/image visible at a time, snaps to each item
 */
const TikTokFeedScreen = ({
  onClose,
  onOpenOfficeListing,
  onOpenEditPublishAdWithCategory,
  onOpenPostEditor,
  onOpenCityFilter,
  onOpenApartmentTypeFilter,
  onOpenTypeFilter,
  onOpenOfficeFilter,
  onOpenRoomsFilter,
  onOpenMeterFilter,
  onOpenDonamFilter,
  onOpenPreferencesFilter,
  onOpenPriceFilter,
  onOpenUserProfile,
  onOpenFavorites,
  onShareToConversation,
  uploadedListings = [],
  selectedCategory = null,
  feedFilters = {},
  selectedSidebarFilter: selectedSidebarFilterProp = null,
  onSidebarFilterChange = null,
  currentUser = null,
  /** Guest taps follow + → App opens regular user registration (return to feed after). */
  onOpenUserRegistration = null,
  /** App requests the BnB publish bottom sheet (guest must pick before register). */
  pendingBnbPublishSheet = false,
  onPendingBnbPublishSheetConsumed = null,
  /** Bumped from App (e.g. Favorites search) to open the user search panel on mount, same as the magnify control. */
  userSearchOpenTrigger = 0,
  /** When user presses back to leave the user-search UI, App clears tikTokUserSearchOpenTrigger. */
  onUserSearchBackToDefaultFeed = null,
  /** Scroll feed to this listing once listings load (e.g. profile post grid). */
  focusListingId = null,
  onFocusListingConsumed = null,
  /** Open a specific post in the feed (e.g. from hashtag search results). */
  onOpenPostInFeed = null,
  /** Profile grid → feed limited to one user's posts; chrome-only top/bottom bars. */
  profilePostsScope = null,
  /** False while profile (or related) covers the feed — pause playback but keep scroll state. */
  isScreenActive = true,
}) => {
  const insets = useSafeAreaInsets();
  const isGuest = !currentUser || !String(currentUser?.email || '').trim();
  const profilePostsSubId = profilePostsScope?.subscriptionId
    ? String(profilePostsScope.subscriptionId).trim()
    : '';
  const isProfilePostsFeed = profilePostsSubId.length > 0;
  /** Actual container frame (full screen edge-to-edge); reliable on Android unlike Dimensions. */
  const safeAreaFrame = useSafeAreaFrame();
  const topBarHeight = TOP_BAR_HEIGHT + insets.top;
  /** Stable from first render (insets known immediately) — matches FeedBottomBar height exactly. */
  const bottomBarHeight = feedBottomBarHeight(
    insets.bottom,
    isProfilePostsFeed,
  );
  const feedListRef = useRef(null);
  const listingsFetchCacheRef = useRef(new Map());
  const [scrollAnchorIndex, setScrollAnchorIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const feedVideoRefs = useRef(new Map());
  const isScreenActiveRef = useRef(isScreenActive);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const bottomSheetTranslateY = useRef(new Animated.Value(0)).current;
  const bottomSheetUseNativeDriver = Platform.OS !== 'web';
  const [sharePost, setSharePost] = useState(null);
  const [shareCountOverrides, setShareCountOverrides] = useState({});
  const [dbListings, setDbListings] = useState([]);
  const [userCoords, setUserCoords] = useState(null);
  const [userCoordsReady, setUserCoordsReady] = useState(false);
  const listingCoordsRef = useRef({});
  const listingDistanceKmRef = useRef({});
  const [listingDistanceVersion, setListingDistanceVersion] = useState(0);
  const [distanceCalcReady, setDistanceCalcReady] = useState(false);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingsError, setListingsError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh when this changes
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarPanActiveRef = useRef(false);
  const sidebarPanDidDragRef = useRef(false);
  const sidebarPanStartYRef = useRef(0);
  /** Pause feed photo crossfade only while the user drags the sidebar. */
  const [sidebarSlideshowPaused, setSidebarSlideshowPaused] = useState(false);
  /** True while finger is on profile / follow + — blocks sidebar pan from stealing the tap. */
  const sidebarBlockPanRef = useRef(false);
  const sidebarFeedScrollLockedRef = useRef(false);
  const sidebarPendingTapRef = useRef(null);
  const activeSidebarVideoRef = useRef(null);
  const flushSidebarPendingTapRef = useRef(() => {});
  const SIDEBAR_INTRO_MAX_DOWN_FALLBACK = 420;
  /** Final / stage 3: profile + this many top filter chips visible. */
  const SIDEBAR_TOP_VISIBLE_FILTER_COUNT = 4;
  const SIDEBAR_PROFILE_INTRO_NUDGE_UP = 16;
  const SIDEBAR_FILTER_HEIGHT_FALLBACK = 64;
  /**
   * Fixed sidebar geometry (must mirror the StyleSheet values below). These let
   * the intro animation run deterministically — same on every device, ready on
   * first render with no async layout measurement.
   */
  const SIDEBAR_PROFILE_WRAP_HEIGHT = 70; // styles.sidebarProfileWrap.height
  const SIDEBAR_PROFILE_TO_FILTERS_GAP = 20; // styles.sidebarProfileWrap.marginBottom
  const SIDEBAR_FILTER_CHIP_HEIGHT = 56; // styles.sidebarFilterBtn.minHeight
  const SIDEBAR_FILTER_GAP = 20; // styles.sidebarFiltersStack.gap
  const sidebarDragY = useRef(new Animated.Value(0)).current;
  const sidebarDragOffset = useRef(0); // keep in sync for pan responder
  const [sidebarViewportHeight, setSidebarViewportHeight] = useState(0);
  const [sidebarProfileHeight, setSidebarProfileHeight] = useState(60);
  const [sidebarFilterHeight, setSidebarFilterHeight] = useState(
    SIDEBAR_FILTER_HEIGHT_FALLBACK,
  );
  const [sidebarFilterLayouts, setSidebarFilterLayouts] = useState({});
  const selectedSidebarFilter = selectedSidebarFilterProp;
  const setSelectedSidebarFilter = useCallback(
    updater => {
      if (typeof onSidebarFilterChange !== 'function') return;
      const next =
        typeof updater === 'function'
          ? updater(selectedSidebarFilterProp ?? null)
          : updater;
      onSidebarFilterChange(next);
    },
    [onSidebarFilterChange, selectedSidebarFilterProp],
  );
  /** Default = first icon yellow; does not narrow feed. Toggle same filter again → back to this. */
  const [selectedTopBarFilter, setSelectedTopBarFilter] = useState(
    DEFAULT_TOP_BAR_FILTER,
  ); // 'pics' | 'list' | 'video' | 'liked'
  const [likedListingIds, setLikedListingIds] = useState(new Set()); // persisted to AsyncStorage
  const [likedPostIds, setLikedPostIds] = useState(new Set()); // persisted to AsyncStorage
  /** Bumps on every like toggle so FlatList re-renders visible hearts immediately. */
  const [likedUiRevision, setLikedUiRevision] = useState(0);
  /** Bumps when sidebar follow + visibility changes so FlatList re-renders without refresh. */
  const [followUiRevision, setFollowUiRevision] = useState(0);
  const bumpFollowUiRevision = useCallback(() => {
    setFollowUiRevision(r => r + 1);
  }, []);
  const postLikePendingIdsRef = useRef(new Set()); // prevent duplicate taps/race requests per post
  const adLikePendingIdsRef = useRef(new Set()); // same for ad (listing) likes
  const likedListingIdsRef = useRef(new Set());
  const likedPostIdsRef = useRef(new Set());

  likedListingIdsRef.current = likedListingIds;
  likedPostIdsRef.current = likedPostIds;
  /** Unseen likes counter shown as a badge on the heart filter in the top bar. Resets when favorites screen opens. */
  const [unseenLikedCount, setUnseenLikedCount] = useState(0);
  const [showUserSearchPanel, setShowUserSearchPanel] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  /** When set, shows the explore grid for this tag (after tapping a hashtag result). */
  const [selectedHashtag, setSelectedHashtag] = useState(null);
  const [failedSearchAvatarKeys, setFailedSearchAvatarKeys] = useState(
    new Set(),
  );
  /** Recently-dismissed (per row "X") user keys — cleared by the "נקה" header button. */
  const [hiddenSearchKeys, setHiddenSearchKeys] = useState(new Set());
  /** Recent user searches loaded from the DB for the "אחרונים" list when no query is entered. */
  const [recentSearches, setRecentSearches] = useState([]);
  const [userRatingByProfileId, setUserRatingByProfileId] = useState({});
  /** List filter: `subscription_id` -> Pi display (same as Pi AI grid cards). */
  const [listPiDisplayBySubId, setListPiDisplayBySubId] = useState({});
  /** `targetId` -> true when viewer and target follow each other (for user-search row gold). */
  /** Avoid duplicate getReviews for the same profile id in one session. */
  const userRatingPreloadedIdsRef = useRef(new Set());
  const [allUsersSearchListings, setAllUsersSearchListings] = useState([]);
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [activeCommentsPostItem, setActiveCommentsPostItem] = useState(null);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentImageAsset, setCommentImageAsset] = useState(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [iosCommentsKeyboardHeight, setIosCommentsKeyboardHeight] = useState(0);
  const androidCommentsComposer = useAndroidKeyboardComposer(showCommentsSheet);
  /** Prefetched with listings so sidebar + appears without per-slide delay. */
  const [followStatusByTargetId, setFollowStatusByTargetId] = useState({});
  const [sidebarSendingFollow, setSidebarSendingFollow] = useState(false);
  /** Keep + badge mounted while Instagram-style check animation plays. */
  const [followPlusAnimatingIds, setFollowPlusAnimatingIds] = useState({});
  const lastViewedListingIdRef = useRef(null); // avoid recording same view twice
  const [dimensions, setDimensions] = useState({
    height: Dimensions.get('window').height,
    width: Dimensions.get('window').width,
  });
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        height: Dimensions.get('window').height,
        width: Dimensions.get('window').width,
      });
    };

    const subscription = Dimensions.addEventListener(
      'change',
      updateDimensions,
    );
    return () => subscription?.remove();
  }, []);

  const screenHeight = dimensions.height;
  const screenWidth = dimensions.width;
  /** Use the safe-area frame height (true container height) so the page bottom aligns to the bar. */
  const containerHeight =
    safeAreaFrame.height > 0 ? safeAreaFrame.height : screenHeight;
  const feedPageHeight = Math.max(
    1,
    containerHeight - topBarHeight - bottomBarHeight,
  );
  /** Chrome sits above the bottom edge of the feed band (already above the bottom bar). */
  const feedChromeBottom = FEED_OVERLAY_ABOVE_BAR_GAP;
  /** Sidebar intro clip — same band as chrome (page minus bottom bar reserve). */
  const sidebarClipHeight = Math.max(1, feedPageHeight - feedChromeBottom);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const categoryId = Number(selectedCategory);
  const isLandCategory = categoryId === 7; // קרקעות
  const isBnbCategory = categoryId === 5; // BnB
  const isPartnersCategory = categoryId === 3; // שותפים
  const isOfficeCategory = categoryId === 2; // משרדים
  const isApartmentsCategory = categoryId === 10; // דירות
  const isCommercialCategory = categoryId === 8; // מסחר
  const isReligiousSectorCategory = categoryId === 6; // מגזר דתי
  const isGlobalCategory = categoryId === 4; // גלובל
  const isLuxuryCategory = categoryId === 12; // יוקרה
  /**
   * Category 1: project strip (פריסייל/בנוי/בבנייה).
   * Category 10: דירות Figma strip only (order + חדשות). Other defaults: same as משרדים, not חדש מקבלן chips.
   */
  const sidebarFiltersForFeed = useMemo(() => {
    if (isPartnersCategory) return PARTNERS_SIDEBAR_FILTERS;
    if (isBnbCategory) return BNB_SIDEBAR_FILTERS;
    if (isOfficeCategory) {
      return OFFICE_SIDEBAR_FILTERS.map(f =>
        f.id === 'new' ? {...f, icon: OFFICE_NEW_SIDEBAR_FILTER_ICON} : f,
      );
    }
    if (isLandCategory) return LAND_SIDEBAR_FILTERS;
    if (isCommercialCategory) return COMMERCIAL_SIDEBAR_FILTERS;
    if (categoryId === 1) return NEW_FROM_DEVELOPER_SIDEBAR_FILTERS;
    if (isApartmentsCategory) return APARTMENTS_SIDEBAR_FILTERS;
    // מגזר דתי / גלובל / יוקרה: "חדשות" label + swap חדשות ⟷ הדמיות vs default office order.
    if (isReligiousSectorCategory || isGlobalCategory || isLuxuryCategory) {
      const withLabel = OFFICE_SIDEBAR_FILTERS.map(f =>
        f.id === 'new' ? {...f, label: 'חדשות'} : f,
      );
      const iNew = withLabel.findIndex(f => f.id === 'new');
      const iRen = withLabel.findIndex(f => f.id === 'renderings');
      if (iNew < 0 || iRen < 0) return withLabel;
      const out = [...withLabel];
      [out[iNew], out[iRen]] = [out[iRen], out[iNew]];
      return out;
    }
    return OFFICE_SIDEBAR_FILTERS;
  }, [
    categoryId,
    isPartnersCategory,
    isBnbCategory,
    isOfficeCategory,
    isLandCategory,
    isCommercialCategory,
    isApartmentsCategory,
    isReligiousSectorCategory,
    isGlobalCategory,
    isLuxuryCategory,
  ]);
  useEffect(() => {
    const valid = new Set(sidebarFiltersForFeed.map(f => f.id));
    if (selectedSidebarFilter != null && !valid.has(selectedSidebarFilter)) {
      setSelectedSidebarFilter(null);
    }
  }, [sidebarFiltersForFeed, selectedSidebarFilter, setSelectedSidebarFilter]);
  const sidebarFilterCount = sidebarFiltersForFeed.length;
  const firstFilterTop = sidebarFilterLayouts[0]?.y;
  const lastFilterIndex = Math.max(0, sidebarFilterCount - 1);
  const lastFilterLayout = sidebarFilterLayouts[lastFilterIndex];
  const topTwoFilterIndex = Math.min(
    SIDEBAR_TOP_VISIBLE_FILTER_COUNT - 1,
    Math.max(0, sidebarFilterCount - 1),
  );
  const topTwoFilterLayout = sidebarFilterLayouts[topTwoFilterIndex];
  /**
   * Deterministic sidebar geometry (in px). These mirror the fixed style values
   * (`sidebarProfileWrap`, `sidebarFiltersStack`, `sidebarFilterBtn`) so the
   * intro animation is byte-for-byte identical on every device and is ready on
   * the very first render — no waiting for async `onLayout` measurements.
   */
  const sidebarFilterBottom = useCallback(
    index => {
      const profileBlock =
        SIDEBAR_PROFILE_WRAP_HEIGHT + SIDEBAR_PROFILE_TO_FILTERS_GAP;
      if (isPartnersCategory) {
        const layout = sidebarFilterLayouts[index];
        if (
          layout &&
          Number.isFinite(layout.y) &&
          Number.isFinite(layout.height)
        ) {
          return profileBlock + layout.y + layout.height;
        }
        let top = profileBlock;
        for (let i = 0; i < index; i++) {
          top += PARTNERS_SIDEBAR_CHIP_HEIGHT;
          top +=
            PARTNERS_SIDEBAR_FILTERS[i]?.id === 'partners_posts'
              ? PARTNERS_SIDEBAR_TIGHT_PAIR_GAP
              : PARTNERS_SIDEBAR_STACK_GAP;
        }
        return top + PARTNERS_SIDEBAR_CHIP_HEIGHT;
      }
      const filterTop =
        profileBlock + index * (SIDEBAR_FILTER_CHIP_HEIGHT + SIDEBAR_FILTER_GAP);
      return filterTop + SIDEBAR_FILTER_CHIP_HEIGHT;
    },
    [isPartnersCategory, sidebarFilterLayouts],
  );

  // translateY is positive = content pushed DOWN inside the clip (content is
  // top-aligned, so a larger value reveals what is higher up in the stack).

  /** Stage 1 / hold: only the profile avatar shows; filters pushed below the clip. */
  const sidebarIntroProfileOnlyDown = useMemo(
    () => Math.max(0, sidebarClipHeight - SIDEBAR_PROFILE_WRAP_HEIGHT),
    [sidebarClipHeight],
  );
  const sidebarIntroProfileOnlyHold = sidebarIntroProfileOnlyDown;

  /** Stage 2: scroll up so the LAST filter chip sits flush at the clip bottom (all chips shown). */
  const sidebarIntroAllIconsDown = useMemo(() => {
    if (sidebarFilterCount === 0) return sidebarIntroProfileOnlyDown;
    return sidebarClipHeight - sidebarFilterBottom(sidebarFilterCount - 1);
  }, [
    sidebarClipHeight,
    sidebarFilterCount,
    sidebarFilterBottom,
    sidebarIntroProfileOnlyDown,
  ]);

  /** Stage 3 / resting: profile + top N chips; last visible chip flush at the clip bottom. */
  const sidebarIntroTopTwoOnlyDown = useMemo(() => {
    if (sidebarFilterCount === 0) return sidebarIntroProfileOnlyDown;
    const idx =
      Math.min(SIDEBAR_TOP_VISIBLE_FILTER_COUNT, sidebarFilterCount) - 1;
    return sidebarClipHeight - sidebarFilterBottom(idx);
  }, [
    sidebarClipHeight,
    sidebarFilterCount,
    sidebarFilterBottom,
    sidebarIntroProfileOnlyDown,
  ]);

  const sidebarDragMaxDown = sidebarIntroProfileOnlyDown;
  /** Dragging up stops exactly when the bottom chip is flush at the clip bottom (all icons visible). */
  const sidebarDragMaxUp = Math.min(
    sidebarIntroAllIconsDown,
    sidebarDragMaxDown,
  );
  const isSidebarProfileHoldReady = sidebarClipHeight > 0;
  const partnersSidebarLayoutsReady = useMemo(() => {
    if (!isPartnersCategory || sidebarFilterCount === 0) return true;
    for (let i = 0; i < sidebarFilterCount; i++) {
      const layout = sidebarFilterLayouts[i];
      if (
        !layout ||
        !Number.isFinite(layout.y) ||
        !Number.isFinite(layout.height) ||
        layout.height <= 0
      ) {
        return false;
      }
    }
    return true;
  }, [isPartnersCategory, sidebarFilterCount, sidebarFilterLayouts]);
  const isSidebarIntroAnimReady =
    isSidebarProfileHoldReady && partnersSidebarLayoutsReady;

  /**
   * Center פרסם button: professionals + regular users get the create-ad
   * drawer right on the feed (Figma מגירת צור מודעה). Guests on BnB also get
   * the in-feed sheet (registration per option). Companies/brokers go to EditPublishAd.
   */
  const handlePublishButtonPress = () => {
    const sub = (currentUser?.subscription_type || '').toLowerCase();
    const catNum =
      selectedCategory != null && selectedCategory !== ''
        ? parseInt(String(selectedCategory).trim(), 10)
        : NaN;
    const isBnbCategory = catNum === 5;
    if (
      (isGuest && isBnbCategory) ||
      sub === subscriptionTypes.professional ||
      sub === subscriptionTypes.user
    ) {
      bottomSheetTranslateY.setValue(0);
      setShowBottomSheet(true);
      return;
    }
    onOpenEditPublishAdWithCategory?.(selectedCategory);
  };

  const closeSheetAndOpenListing = opts => {
    setShowBottomSheet(false);
    const sub = (currentUser?.subscription_type || '').toLowerCase();
    const catNum =
      selectedCategory != null && selectedCategory !== ''
        ? parseInt(String(selectedCategory).trim(), 10)
        : NaN;
    const isBnbCategory = catNum === 5;
    if (isGuest && isBnbCategory) {
      onOpenUserRegistration?.({
        type: 'bnbAd',
        bnbHostType:
          opts?.bnbHostType === 'business' ? 'business' : 'private',
      });
      return;
    }
    const isCompanyOrBroker =
      sub === subscriptionTypes.company ||
      isBrokerLikeSubscriptionType(sub);
    if (isCompanyOrBroker) {
      onOpenEditPublishAdWithCategory?.(selectedCategory, opts);
    } else {
      onOpenOfficeListing?.(selectedCategory, opts);
    }
  };

  const closeSheetAndOpenPost = (opts = {}) => {
    setShowBottomSheet(false);
    const catNum =
      selectedCategory != null && selectedCategory !== ''
        ? parseInt(String(selectedCategory).trim(), 10)
        : NaN;
    const isBnbCategory = catNum === 5;
    if (isGuest) {
      if (isBnbCategory) {
        onOpenUserRegistration?.({
          type: 'post',
          openHouse: opts.openHouse === true,
        });
      } else {
        onOpenUserRegistration?.();
      }
      return;
    }
    onOpenPostEditor?.({category: selectedCategory, openHouse: opts.openHouse === true});
  };

  // Per-user liked IDs (guests: empty so hearts never reflect another session)
  useEffect(() => {
    const load = async () => {
      try {
        const uid =
          currentUser?.id != null ? String(currentUser.id).trim() : null;
        const [likedState, rawTopBar] = await Promise.all([
          loadTikTokLikedState(uid),
          AsyncStorage.getItem(TIKTOK_TOP_BAR_FILTER_STORAGE_KEY),
        ]);
        setLikedListingIds(likedState.likedListingIds);
        setLikedPostIds(likedState.likedPostIds);
        likedListingIdsRef.current = likedState.likedListingIds;
        likedPostIdsRef.current = likedState.likedPostIds;
        setUnseenLikedCount(uid ? likedState.unseenLikedCount : 0);
        let topBar = rawTopBar;
        if (!uid && topBar === 'liked') {
          topBar = DEFAULT_TOP_BAR_FILTER;
          AsyncStorage.setItem(
            TIKTOK_TOP_BAR_FILTER_STORAGE_KEY,
            DEFAULT_TOP_BAR_FILTER,
          ).catch(() => {});
        }
        if (
          topBar === 'pics' ||
          topBar === 'list' ||
          topBar === 'video' ||
          topBar === 'liked'
        ) {
          setSelectedTopBarFilter(topBar);
        }
      } catch (e) {
        console.warn('Failed to load liked ids', e);
      }
    };
    load();
  }, [currentUser?.id]);

  // Guest must not stay on "liked" feed (would show empty / wrong)
  useEffect(() => {
    if (currentUser?.id == null && selectedTopBarFilter === 'liked') {
      setSelectedTopBarFilter(DEFAULT_TOP_BAR_FILTER);
      AsyncStorage.setItem(
        TIKTOK_TOP_BAR_FILTER_STORAGE_KEY,
        DEFAULT_TOP_BAR_FILTER,
      ).catch(() => {});
    }
  }, [currentUser?.id, selectedTopBarFilter]);
  // Persist/restore post comments by post id so comments remain tied to each post
  useEffect(() => {
    const loadComments = async () => {
      try {
        const raw = await AsyncStorage.getItem('tikTokPostCommentsByPostId');
        const parsed = raw ? JSON.parse(raw) : {};
        if (parsed && typeof parsed === 'object') {
          setCommentsByPost(parsed);
        }
      } catch (e) {
        console.warn('Failed to load post comments cache', e);
      }
    };
    loadComments();
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(
      'tikTokPostCommentsByPostId',
      JSON.stringify(commentsByPost || {}),
    ).catch(() => {});
  }, [commentsByPost]);

  // Initialize scroll position on mount
  useEffect(() => {
    feedListRef.current?.scrollToOffset({offset: 0, animated: false});
  }, []);

  // Auto-scroll sidebar intro once when TikTok feed opens:
  // Hold profile-only → all icons (last flush bottom) → profile + top 4 chips.
  const SIDEBAR_INTRO_START_DELAY_MS = 1100;
  const sidebarIntroDone = useRef(false);
  const sidebarIntroHoldApplied = useRef(false);
  const sidebarIntroAnimStarted = useRef(false);
  const sidebarIntroAnimationRef = useRef(null);
  const sidebarIntroDragListenerRef = useRef(null);
  const sidebarIntroCategoryRef = useRef(categoryId);
  const sidebarIntroTargetsRef = useRef({
    profileHold: 0,
    allIcons: 0,
    topTwo: 0,
  });
  const [sidebarIntroVisible, setSidebarIntroVisible] = useState(false);
  const [sidebarIntroFinished, setSidebarIntroFinished] = useState(false);
  const [sidebarIntroEpoch, setSidebarIntroEpoch] = useState(0);
  /**
   * Native driver keeps intro scroll smooth while JS is busy loading listings.
   * Pan grant calls stopAnimation before manual setValue, so drag still works after.
   */
  const sidebarAnimUseNativeDriver = Platform.OS !== 'web';

  sidebarIntroTargetsRef.current = {
    profileHold: sidebarIntroProfileOnlyHold,
    allIcons: sidebarIntroAllIconsDown,
    topTwo: sidebarIntroTopTwoOnlyDown,
  };
  const sidebarIntroFinishedRef = useRef(false);
  sidebarIntroFinishedRef.current = sidebarIntroFinished;

  /**
   * Clamp sidebar drag when clip geometry changes (e.g. bottom bar resize).
   * Preserves the user's scroll position instead of snapping back to intro rest.
   */
  const clampSidebarDragToBounds = useCallback(() => {
    if (!sidebarIntroFinishedRef.current) return;
    const clamped = Math.max(
      sidebarDragMaxUp,
      Math.min(sidebarDragMaxDown, sidebarDragOffset.current),
    );
    sidebarDragY.stopAnimation();
    sidebarDragY.setValue(clamped);
    sidebarDragOffset.current = clamped;
  }, [sidebarDragMaxDown, sidebarDragMaxUp, sidebarDragY]);

  /** Stop native intro animation and hand translateY back to JS for manual drag. */
  const stopSidebarIntroAnimation = useCallback(
    (forceSnapY = null) => {
      sidebarIntroAnimationRef.current?.stop();
      sidebarIntroAnimationRef.current = null;
      if (sidebarIntroDragListenerRef.current != null) {
        sidebarDragY.removeListener(sidebarIntroDragListenerRef.current);
        sidebarIntroDragListenerRef.current = null;
      }
      const applyValue = raw => {
        const base = Number.isFinite(raw) ? raw : sidebarDragOffset.current;
        const clamped = Math.max(
          sidebarDragMaxUp,
          Math.min(sidebarDragMaxDown, base),
        );
        sidebarDragOffset.current = clamped;
        sidebarDragY.setValue(clamped);
      };
      if (Number.isFinite(forceSnapY)) {
        sidebarDragY.stopAnimation();
        applyValue(forceSnapY);
        return;
      }
      sidebarDragY.stopAnimation(value => {
        applyValue(Number.isFinite(value) ? value : sidebarDragOffset.current);
      });
    },
    [sidebarDragMaxDown, sidebarDragMaxUp, sidebarDragY],
  );

  /** Interrupt intro because the feed moved — snap to final rest pose on every page. */
  const finalizeSidebarIntroForFeedScroll = useCallback(() => {
    if (sidebarIntroDone.current) return;
    const yRest = sidebarIntroTargetsRef.current.topTwo;
    sidebarIntroDone.current = true;
    sidebarIntroAnimStarted.current = true;
    sidebarIntroHoldApplied.current = true;
    sidebarIntroFinishedRef.current = true;
    stopSidebarIntroAnimation(yRest);
    setSidebarIntroVisible(true);
    setSidebarIntroFinished(true);
    setSidebarIntroEpoch(epoch => epoch + 1);
  }, [stopSidebarIntroAnimation]);

  // Layout effect (runs before paint) so the sidebar is already parked at the
  // profile-only position on the first frame — no "loading" flash on open.
  useLayoutEffect(() => {
    if (isProfilePostsFeed) {
      sidebarIntroDone.current = true;
      sidebarIntroAnimStarted.current = true;
      sidebarIntroHoldApplied.current = true;
      sidebarDragY.setValue(sidebarIntroProfileOnlyDown);
      sidebarDragOffset.current = sidebarIntroProfileOnlyDown;
      setSidebarIntroVisible(true);
      setSidebarIntroFinished(true);
      return;
    }
    if (selectedTopBarFilter === 'list') {
      sidebarIntroDone.current = false;
      sidebarIntroHoldApplied.current = false;
      sidebarIntroAnimStarted.current = false;
      setSidebarIntroVisible(false);
      setSidebarIntroFinished(false);
      return;
    }
    if (sidebarIntroCategoryRef.current !== categoryId) {
      sidebarIntroCategoryRef.current = categoryId;
      sidebarIntroDone.current = false;
      sidebarIntroHoldApplied.current = false;
      sidebarIntroAnimStarted.current = false;
      setSidebarIntroFinished(false);
      setSidebarIntroVisible(false);
    }
    if (sidebarIntroDone.current) {
      setSidebarIntroVisible(true);
      setSidebarIntroFinished(true);
      return;
    }
    if (!isSidebarProfileHoldReady || sidebarIntroHoldApplied.current) return;
    sidebarIntroHoldApplied.current = true;
    sidebarDragY.setValue(sidebarIntroProfileOnlyDown);
    sidebarDragOffset.current = sidebarIntroProfileOnlyDown;
    setSidebarIntroVisible(true);
  }, [
    selectedTopBarFilter,
    sidebarDragY,
    sidebarIntroProfileOnlyDown,
    sidebarIntroTopTwoOnlyDown,
    isSidebarProfileHoldReady,
    categoryId,
    isProfilePostsFeed,
  ]);

  useEffect(() => {
    if (isProfilePostsFeed) return;
    setSidebarFilterLayouts({});
  }, [categoryId, sidebarFilterCount, isProfilePostsFeed]);

  useEffect(() => {
    if (isProfilePostsFeed) return;
    if (selectedTopBarFilter === 'list') return;
    if (
      sidebarIntroDone.current ||
      sidebarIntroAnimStarted.current ||
      !sidebarIntroVisible ||
      !isSidebarIntroAnimReady
    ) {
      return;
    }
    sidebarIntroAnimStarted.current = true;

    let cancelled = false;
    let dragListenerId = null;
    const scrollDuration = 900;
    const waitBetweenParts = 1000;
    const introEasing = Easing.inOut(Easing.cubic);

    // Snapshot targets once — avoid mid-flight geometry changes restarting the effect.
    const yProfileOnly = sidebarIntroTargetsRef.current.profileHold;
    const yAllIcons = sidebarIntroTargetsRef.current.allIcons;
    const yTopTwo = sidebarIntroTargetsRef.current.topTwo;

    sidebarDragY.setValue(yProfileOnly);
    sidebarDragOffset.current = yProfileOnly;

    dragListenerId = sidebarDragY.addListener(({value}) => {
      if (sidebarPanActiveRef.current) return;
      if (Number.isFinite(value)) {
        sidebarDragOffset.current = value;
      }
    });
    sidebarIntroDragListenerRef.current = dragListenerId;

    const introAnimation = Animated.sequence([
      Animated.delay(SIDEBAR_INTRO_START_DELAY_MS),
      Animated.timing(sidebarDragY, {
        toValue: yAllIcons,
        duration: scrollDuration,
        easing: introEasing,
        useNativeDriver: sidebarAnimUseNativeDriver,
      }),
      Animated.delay(waitBetweenParts),
      Animated.timing(sidebarDragY, {
        toValue: yTopTwo,
        duration: scrollDuration,
        easing: introEasing,
        useNativeDriver: sidebarAnimUseNativeDriver,
      }),
    ]);

    sidebarIntroAnimationRef.current = introAnimation;
    introAnimation.start(({finished}) => {
      if (cancelled || !finished || sidebarIntroDone.current) return;
      sidebarIntroDone.current = true;
      sidebarDragOffset.current = yTopTwo;
      sidebarDragY.setValue(yTopTwo);
      setSidebarIntroFinished(true);
    });

    return () => {
      cancelled = true;
      introAnimation.stop();
      sidebarIntroAnimationRef.current = null;
      if (dragListenerId != null) {
        sidebarDragY.removeListener(dragListenerId);
        if (sidebarIntroDragListenerRef.current === dragListenerId) {
          sidebarIntroDragListenerRef.current = null;
        }
      }
      if (!sidebarIntroDone.current) {
        sidebarIntroAnimStarted.current = false;
        sidebarDragY.stopAnimation(value => {
          const raw = Number.isFinite(value) ? value : sidebarDragOffset.current;
          const maxUp = sidebarIntroTargetsRef.current.allIcons;
          const maxDown = sidebarIntroTargetsRef.current.profileHold;
          const clamped = Math.max(maxUp, Math.min(maxDown, raw));
          sidebarDragOffset.current = clamped;
          sidebarDragY.setValue(clamped);
        });
      } else {
        sidebarDragY.stopAnimation();
      }
    };
  }, [
    selectedTopBarFilter,
    sidebarDragY,
    sidebarAnimUseNativeDriver,
    isSidebarIntroAnimReady,
    sidebarIntroVisible,
    isProfilePostsFeed,
    categoryId,
  ]);

  /** Keep dragged sidebar position valid when viewport height changes. */
  useEffect(() => {
    if (selectedTopBarFilter === 'list' || !sidebarIntroFinished) return;
    clampSidebarDragToBounds();
  }, [
    selectedTopBarFilter,
    sidebarIntroFinished,
    sidebarDragMaxDown,
    sidebarDragMaxUp,
    clampSidebarDragToBounds,
  ]);

  // Fetch listings from database (all users can see all published listings)
  // Filter by selectedCategory and selectedSidebarFilter if provided
  useEffect(() => {
    const fetchListings = async () => {
      const cacheKey = isProfilePostsFeed
        ? `profile-posts|${profilePostsSubId}|${currentUser?.id ?? ''}`
        : buildListingsFetchCacheKey(
            selectedCategory,
            selectedSidebarFilter,
            selectedTopBarFilter,
            currentUser?.id,
          );
      const cachedListings = listingsFetchCacheRef.current.get(cacheKey);
      if (Array.isArray(cachedListings) && cachedListings.length > 0) {
        setDbListings(cachedListings);
        setLoadingListings(false);
        prefetchFeedMediaItems(
          cachedListings,
          0,
          FEED_PRELOAD_BELOW_COUNT + 1,
        );
      }

      try {
        if (!cachedListings?.length) {
          setLoadingListings(true);
        }

        let result = {success: false, offline: false, message: null};
        let mergedListings = [];
        let partnersFilter = null;
        let bnbFilter = null;
        let officeFilter = null;
        let landFilter = null;
        let commercialFilter = null;
        let legacySidebarFilter = null;
        let activeSidebarFilter = null;
        let newsSidebarFilterActive = false;
        let renderingsSidebarFilterActive = false;

        if (isProfilePostsFeed) {
          result = await getListings({
            status: 'published',
            subscription_id: profilePostsSubId,
            feed_post: true,
            ...(currentUser?.id != null && {user_id: String(currentUser.id)}),
          });
          mergedListings = Array.isArray(result?.listings)
            ? [...result.listings]
            : [];
          mergedListings.sort(
            (a, b) =>
              new Date(b?.created_at || b?.createdAt || 0).getTime() -
              new Date(a?.created_at || a?.createdAt || 0).getTime(),
          );
        } else {
        const parsedCategory = selectedCategory
          ? parseInt(String(selectedCategory), 10)
          : NaN;
        const categoryToFetch = Number.isFinite(parsedCategory)
          ? parsedCategory
          : undefined;
        partnersFilter =
          categoryToFetch === 3
            ? PARTNERS_SIDEBAR_FILTERS.find(f => f.id === selectedSidebarFilter)
            : null;
        bnbFilter =
          categoryToFetch === 5
            ? BNB_SIDEBAR_FILTERS.find(f => f.id === selectedSidebarFilter)
            : null;
        officeFilter =
          categoryToFetch === 2
            ? OFFICE_SIDEBAR_FILTERS.find(f => f.id === selectedSidebarFilter)
            : null;
        landFilter =
          categoryToFetch === 7
            ? LAND_SIDEBAR_FILTERS.find(f => f.id === selectedSidebarFilter)
            : null;
        commercialFilter =
          categoryToFetch === 8
            ? COMMERCIAL_SIDEBAR_FILTERS.find(
                f => f.id === selectedSidebarFilter,
              )
            : null;
        const newFromDeveloperSidebarFilter =
          categoryToFetch === 1
            ? NEW_FROM_DEVELOPER_SIDEBAR_FILTERS.find(
                f => f.id === selectedSidebarFilter,
              )
            : null;
        const apartmentsLegacyFilter =
          categoryToFetch === 10
            ? APARTMENTS_SIDEBAR_FILTERS.find(
                f => f.id === selectedSidebarFilter,
              )
            : null;
        const standardLegacySidebarFilter =
          categoryToFetch != null &&
          categoryToFetch !== 1 &&
          categoryToFetch !== 3 &&
          categoryToFetch !== 5 &&
          categoryToFetch !== 2 &&
          categoryToFetch !== 7 &&
          categoryToFetch !== 8 &&
          categoryToFetch !== 10
            ? OFFICE_SIDEBAR_FILTERS.find(f => f.id === selectedSidebarFilter)
            : null;
        legacySidebarFilter =
          newFromDeveloperSidebarFilter ??
          apartmentsLegacyFilter ??
          standardLegacySidebarFilter;
        activeSidebarFilter =
          partnersFilter ??
          bnbFilter ??
          officeFilter ??
          landFilter ??
          commercialFilter ??
          legacySidebarFilter;
        newsSidebarFilterActive =
          selectedSidebarFilter === 'new' &&
          isNewsSidebarFilterDef(activeSidebarFilter);
        renderingsSidebarFilterActive =
          selectedSidebarFilter === 'renderings' &&
          isRenderingsSidebarFilterDef(activeSidebarFilter);
        const subscriptionType =
          partnersFilter?.subscription_type ??
          bnbFilter?.subscription_type ??
          officeFilter?.subscription_type ??
          landFilter?.subscription_type ??
          commercialFilter?.subscription_type ??
          legacySidebarFilter?.subscription_type;
        const sidebarCondition =
          legacySidebarFilter?.condition ??
          officeFilter?.condition ??
          commercialFilter?.condition ??
          landFilter?.condition;
        // API has_video from sidebar filters that request it (incl. הדמיות), or top-bar video mode.
        const hasVideoFromSidebar =
          officeFilter?.has_video === true ||
          landFilter?.has_video === true ||
          commercialFilter?.has_video === true ||
          legacySidebarFilter?.has_video === true ||
          renderingsSidebarFilterActive;
        const hasVideoFromTopBar = selectedTopBarFilter === 'video';
        const hasVideo = hasVideoFromSidebar || hasVideoFromTopBar;

        const sharedListingFetchParams = {
          status: 'published',
          ...(subscriptionType != null &&
            !newsSidebarFilterActive && {
              subscription_type: subscriptionType,
            }),
          ...(hasVideo && {has_video: true}),
          ...(sidebarCondition != null &&
            String(sidebarCondition).trim() !== '' &&
            !newsSidebarFilterActive && {
              condition: String(sidebarCondition).trim().toLowerCase(),
            }),
          ...(partnersFilter?.search_purpose && {
            search_purpose: partnersFilter.search_purpose,
          }),
          ...(partnersFilter?.feed_post === true && {feed_post: true}),
          ...(bnbFilter?.hospitality_nature && {
            hospitality_nature: bnbFilter.hospitality_nature,
          }),
          ...(bnbFilter?.feed_post === true && {feed_post: true}),
          ...(officeFilter?.feed_post === true && {feed_post: true}),
          ...(landFilter?.land_in_mortgage && {
            land_in_mortgage: landFilter.land_in_mortgage,
          }),
          ...(landFilter?.permit && {permit: landFilter.permit}),
          ...(landFilter?.plan_approval && {
            plan_approval: landFilter.plan_approval,
          }),
          ...(landFilter?.feed_post === true && {feed_post: true}),
          ...(commercialFilter?.feed_post === true && {feed_post: true}),
          ...(legacySidebarFilter?.feed_post === true && {feed_post: true}),
          ...(currentUser?.id != null && {user_id: String(currentUser.id)}),
        };

        if (renderingsSidebarFilterActive) {
          result = await getListings({
            status: 'published',
            subscription_type: 'company',
            has_video: true,
            ...(currentUser?.id != null && {user_id: String(currentUser.id)}),
          });
          mergedListings = Array.isArray(result?.listings)
            ? [...result.listings]
            : [];
        } else if (newsSidebarFilterActive && categoryToFetch != null) {
          result = await getListings({
            category: categoryToFetch,
            status: 'published',
            subscription_type: 'company',
            ...(currentUser?.id != null && {user_id: String(currentUser.id)}),
          });
          mergedListings = Array.isArray(result?.listings)
            ? [...result.listings]
            : [];
          if (result.success && !result.offline) {
            const cat1Result = await getListings({
              category: 1,
              status: 'published',
              ...(currentUser?.id != null && {user_id: String(currentUser.id)}),
            });
            if (cat1Result.success && Array.isArray(cat1Result.listings)) {
              mergeListingRows(mergedListings, cat1Result.listings);
            }
            const regularNewResult = await getListings({
              status: 'published',
              subscription_type: 'user',
              condition: 'new',
              ...(currentUser?.id != null && {user_id: String(currentUser.id)}),
            });
            if (
              regularNewResult.success &&
              Array.isArray(regularNewResult.listings)
            ) {
              mergeListingRows(mergedListings, regularNewResult.listings);
            }
          }
        } else {
        result = await getListings({
          category: categoryToFetch,
          ...sharedListingFetchParams,
        });

        mergedListings = Array.isArray(result?.listings)
          ? [...result.listings]
          : [];
        }
        }

        const resultForTransform = {
          ...result,
          listings: mergedListings,
        };

        if (result.offline) {
          setListingsError(
            result.message || 'Could not load listings. Check your connection.',
          );
        } else {
          setListingsError(null);
        }
        if (__DEV__) {
        }

        if (resultForTransform.success && resultForTransform.listings) {

          // Transform database listings to video format (include posts with image, video, or text only)
          const transformedListings = resultForTransform.listings
            .filter(listing => {
              const images = listing.listing_images || [];
              const videos = listing.listing_videos || [];
              const hasMedia = images.length > 0 || videos.length > 0;
              const hasDescription =
                listing.description &&
                String(listing.description).trim().length > 0;
              const include = hasMedia || hasDescription;
              return include;
            })
            .map(listing => {
              const images = listing.listing_images || [];
              const mainImage = images.find(img => img.image_type === 'main');
              const additionalImages = images.filter(
                img => img.image_type === 'additional',
              );
              const video = listing.listing_videos && listing.listing_videos[0];
              const rawPropertyType = String(
                listing.property_type || '',
              ).toLowerCase();

              // Build images array - must have at least one image
              let imagesArray = [];
              if (mainImage && mainImage.image_url) {
                imagesArray = [{uri: mainImage.image_url}];
                if (additionalImages.length > 0) {
                  imagesArray = [
                    ...imagesArray,
                    ...additionalImages
                      .filter(img => img.image_url)
                      .map(img => ({uri: img.image_url})),
                  ];
                }
              } else if (additionalImages.length > 0) {
                imagesArray = additionalImages
                  .filter(img => img.image_url)
                  .map(img => ({uri: img.image_url}));
              } else if (listing.main_image_url) {
                imagesArray = [{uri: String(listing.main_image_url).trim()}];
              }

              const listingCategory = parseInt(listing.category) || 1;
              const numericBasePrice =
                listingCategory === 5
                  ? parseFloat(
                      listing.price_per_night ??
                        listing.pricePerNight ??
                        listing.price ??
                        listing.budget ??
                        0,
                    ) || 0
                  : parseFloat(listing.price || listing.budget || 0) || 0;

              // Category 3 specific fields
              const searchPurposeLabels = {
                enter: 'מחפש להכנס',
                bring_in: 'מחפש להכניס',
                partner: 'מחפש להכניס',
              };

              const apartmentTypeLabels = {
                regular: 'דירה רגילה',
                studio: 'דירת סטודיו',
                garden: 'דירת גן',
                duplex: 'דופלקס',
                penthouse: 'נטהאוז',
                private: 'בית פרטי',
              };

              const playbackUri = resolveAdVideoUri(listing);
              const rawVideoUrl = String(listing.video_url || '').trim();
              const isTextOnly =
                imagesArray.length === 0 &&
                !(
                  listing.listing_videos && listing.listing_videos.length > 0
                ) &&
                !playbackUri &&
                !rawVideoUrl &&
                listing.description &&
                String(listing.description).trim().length > 0;

              const videoProcessing =
                Boolean(rawVideoUrl) &&
                !playbackUri &&
                (isVideoProcessing(listing) ||
                  String(listing.video_status || '').toLowerCase() !==
                    'failed');
              const hasVideo = Boolean(playbackUri) || videoProcessing;
              const hasImages = imagesArray.length > 0;
              const feedPriority = normalizeListingFeedDisplayPriority(listing);
              const showVideoFirst =
                hasVideo && (hasImages ? feedPriority === 'video' : true);
              const displayType = showVideoFirst ? 'video' : 'images';
              const mediaUrls = [
                mainImage?.image_url,
                ...(additionalImages || []).map(img => img?.image_url),
                playbackUri,
              ]
                .filter(Boolean)
                .map(u => String(u));
              const hasPostMediaMarker = mediaUrls.some(url =>
                /(?:^|[-_/])post(?:[-_/]|\.|$)/i.test(url),
              );
              const isPostByType =
                rawPropertyType.includes('post') ||
                listing.feed_post === true ||
                listing.feed_post === 'true' ||
                listing.feed_post === 't';
              const isPostListing = isPostByType || hasPostMediaMarker;

              const landIds =
                listingCategory === 7
                  ? parseLandBlockParcelFromListing(listing)
                  : {land_parcel: null, land_block: null};
              const landOfferParcels =
                listingCategory === 7 ? normalizeLandOfferParcels(listing) : [];

              return {
                id: listing.id,
                subscription_type:
                  listing.subscription_type ||
                  listing.creator_subscription_type ||
                  null,
                feed_post: isPostListing,
                type: displayType,
                video_playback_url: listing.video_playback_url || playbackUri || null,
                video_hls_url: listing.video_hls_url || video?.video_hls_url || null,
                video_status: listing.video_status || video?.video_status || null,
                video: playbackUri ? {uri: playbackUri} : null,
                videoProcessing,
                rawVideoUrl: rawVideoUrl || null,
                images:
                  imagesArray.length > 0
                    ? imagesArray
                    : isTextOnly
                      ? [{uri: 'text-post-placeholder'}]
                      : imagesArray,
                isTextOnlyPost: !!isTextOnly,
                displayOption: normalizeListingDisplayOption(listing),
                location:
                  String(
                    listing.location ||
                      listing.land_address ||
                      listing.address ||
                      '',
                  ).trim() || 'מיקום לא זמין',
                address: String(listing.address || '').trim(), // for city/location filter
                name: listing.name || listing.title || null,
                title: listing.title || listing.name || null,
                project_name: listing.project_name || null,
                property_name: listing.property_name || null,
                search_address: listing.search_address
                  ? String(listing.search_address).trim()
                  : null,
                rawPrice: numericBasePrice,
                price: formatShekelPrice(numericBasePrice),
                purpose: listing.purpose === 'rent' ? 'להשכרה' : 'למכירה',
                listingPurpose: listing.purpose === 'rent' ? 'rent' : 'sale',
                planApproval: normalizeLandThreeState(listing.plan_approval),
                landInMortgage: normalizeLandYesNot(listing.land_in_mortgage),
                permit: normalizeLandThreeState(listing.permit),
                agriculturalLand: normalizeLandYesNot(
                  listing.agricultural_land,
                ),
                landOwnership: normalizeLandOwnership(listing.land_ownership),
                plan_approval: listing.plan_approval || null,
                land_in_mortgage: listing.land_in_mortgage || null,
                permit: listing.permit || null,
                agricultural_land: listing.agricultural_land || null,
                land_ownership: listing.land_ownership || null,
                land_address: listing.land_address || null,
                land_parcel: listing.land_parcel || landIds.land_parcel || null,
                land_block: listing.land_block || landIds.land_block || null,
                company_offers_land_sizes:
                  landOfferParcels.length > 0
                    ? landOfferParcels
                    : listing.company_offers_land_sizes || null,
                proposed_land: listing.proposed_land || null,
                description: listing.description || '',
                propertyType:
                  rawPropertyType === 'office'
                    ? 'משרד'
                    : isPostListing
                      ? 'post'
                      : 'קומה שלמה',
                propertyTypeRaw: rawPropertyType,
                isPostEntry: isPostListing,
                apartmentTypeId:
                  listing.property_type ||
                  listing.apartment_type ||
                  listing.preferred_apartment_type ||
                  null,
                hotDeal:
                  listing.hot_deal === true ||
                  listing.hot_deal === 'true' ||
                  listing.hot_deal === 't' ||
                  listing.hot_deal === 1,
                checkInDate:
                  listing.check_in_date ||
                  listing?.accommodation_offers?.check_in_date ||
                  null,
                checkOutDate:
                  listing.check_out_date ||
                  listing?.accommodation_offers?.check_out_date ||
                  null,
                cancellationPolicy:
                  listing.cancellation_policy ||
                  listing.cancellationPolicy ||
                  listing?.general_details?.cancellation_policy ||
                  null,
                area: listing.area,
                rooms: listing.rooms,
                floor: listing.floor,
                condition: listing.condition || null,
                amenities:
                  listing.amenities && typeof listing.amenities === 'object'
                    ? listing.amenities
                    : null,
                category: listingCategory,
                // Category 3 specific fields (key = API / filters; searchPurpose = Hebrew for UI)
                searchPurposeKey:
                  listing.search_purpose != null &&
                  String(listing.search_purpose).trim() !== ''
                    ? String(listing.search_purpose).trim()
                    : null,
                searchPurpose: listing.search_purpose
                  ? searchPurposeLabels[listing.search_purpose]
                  : null,
                preferredApartmentType: listing.preferred_apartment_type
                  ? apartmentTypeLabels[listing.preferred_apartment_type]
                  : null,
                preferredGender:
                  listing.preferred_gender === 'female'
                    ? 'אישה'
                    : listing.preferred_gender === 'male'
                      ? 'גבר'
                      : null,
                preferredAgeMin: listing.preferred_age_min,
                preferredAgeMax: listing.preferred_age_max,
                preferences: listing.preferences || {},
                budget: listing.budget,
                isUploaded: true,
                fromDatabase: true,
                profileImageUrl: getListingFeedAvatarUrl(listing),
                creator_name: listing.creator_name || null,
                creator_email: listing.creator_email || null,
                creator_business_address:
                  listing.creator_business_address || null,
                creator_specialties: listing.creator_specialties || null,
                creator_bio: listing.creator_bio || null,
                subscription_id: listing.subscription_id || null,
                owner_id: listing.owner_id || null,
                overlayX:
                  listing.overlay_x != null ? Number(listing.overlay_x) : 80,
                overlayY:
                  listing.overlay_y != null ? Number(listing.overlay_y) : 80,
                postTextOverlay: parsePostTextOverlayPayload(listing),
                view_count:
                  listing.view_count != null ? Number(listing.view_count) : 0,
                like_count:
                  listing.like_count != null ? Number(listing.like_count) : 0,
                post_like_count:
                  listing.post_like_count != null
                    ? Number(listing.post_like_count)
                    : listing.like_count != null
                      ? Number(listing.like_count)
                      : 0,
                comment_count:
                  listing.comment_count != null
                    ? Number(listing.comment_count)
                    : 0,
                share_count:
                  listing.share_count != null ? Number(listing.share_count) : 0,
                liked: listing.liked === true,
                saleAtPresale:
                  listing.sale_at_presale === true ||
                  listing.sale_at_presale === 'true' ||
                  listing.sale_at_presale === 't',
                sharedSpacesCompany:
                  listing.general_details &&
                  typeof listing.general_details === 'object' &&
                  listing.general_details.shared_spaces_company === true,
                companyBuildingCount:
                  listing.general_details &&
                  typeof listing.general_details === 'object' &&
                  Number.isFinite(
                    Number(listing.general_details.building_count),
                  )
                    ? Number(listing.general_details.building_count)
                    : null,
                companyFloorCount:
                  listing.general_details &&
                  typeof listing.general_details === 'object' &&
                  Number.isFinite(Number(listing.general_details.floor_count))
                    ? Number(listing.general_details.floor_count)
                    : null,
                companyApartmentCount:
                  listing.general_details &&
                  typeof listing.general_details === 'object' &&
                  Number.isFinite(
                    Number(listing.general_details.apartment_count),
                  )
                    ? Number(listing.general_details.apartment_count)
                    : null,
                project_offers:
                  listing.project_offers &&
                  typeof listing.project_offers === 'object'
                    ? listing.project_offers
                    : null,
                construction_status: listing.construction_status || null,
                general_details: parseListingGeneralDetails(listing.general_details),
                bnb_business_logo_url:
                  listing.bnb_business_logo_url != null
                    ? String(listing.bnb_business_logo_url).trim() || null
                    : null,
                bnb_host_type: (() => {
                  const gd = parseListingGeneralDetails(listing.general_details);
                  const t = gd?.bnb_host_type ?? gd?.bnbHostType;
                  return t === 'private' || t === 'business' ? t : null;
                })(),
                hashtags: getListingHashtags(listing),
                hospitality_nature:
                  listing.hospitality_nature != null
                    ? String(listing.hospitality_nature).trim()
                    : null,
                price_per_night:
                  listing.price_per_night != null
                    ? listing.price_per_night
                    : null,
                accommodation_offers:
                  listing.accommodation_offers &&
                  typeof listing.accommodation_offers === 'object'
                    ? listing.accommodation_offers
                    : null,
                service_facility:
                  listing.service_facility &&
                  typeof listing.service_facility === 'object'
                    ? listing.service_facility
                    : null,
                cancellation_policy:
                  listing.cancellation_policy != null
                    ? listing.cancellation_policy
                    : null,
                contact_details:
                  listing.contact_details &&
                  typeof listing.contact_details === 'object'
                    ? listing.contact_details
                    : null,
              };
            });

          // Top bar: 'pics' default = no extra filter. 'video' = video ads only (not posts / not image-only).
          // 'liked' is applied at display time (baseList).
          const afterTopBar = transformedListings;
          // Backend filters by category; keep client guard so no mismatched rows slip in.
          const selectedCatNum = selectedCategory
            ? parseInt(String(selectedCategory), 10)
            : NaN;
          const filteredListings = isProfilePostsFeed
            ? afterTopBar
            : Number.isFinite(selectedCatNum)
              ? afterTopBar.filter(listing => {
                  if (renderingsSidebarFilterActive) {
                    return isRenderingsSidebarListing(listing);
                  }
                  if (newsSidebarFilterActive) {
                    return isNewsSidebarListing(listing, selectedCatNum);
                  }
                  return listing.category === selectedCatNum;
                })
              : afterTopBar;

          const finalListings = isProfilePostsFeed
            ? filteredListings
            : selectedTopBarFilter === 'video'
              ? filteredListings.filter(isVideoAdListing)
              : filteredListings;

          // פוסטים / נותני שירות: enforce feed posts only (not regular ads); service = professional’s posts only.
          const sidebarWantsFeedPostsOnly =
            !isProfilePostsFeed &&
            (partnersFilter?.feed_post === true ||
              bnbFilter?.feed_post === true ||
              officeFilter?.feed_post === true ||
              landFilter?.feed_post === true ||
              commercialFilter?.feed_post === true ||
              legacySidebarFilter?.feed_post === true);
          const sidebarWantsProfessionalPosts =
            !isProfilePostsFeed &&
            ((partnersFilter?.id === 'partners_professional' &&
              partnersFilter?.feed_post === true) ||
              (officeFilter?.id === 'service' &&
                officeFilter?.feed_post === true) ||
              (landFilter?.id === 'land_service' &&
                landFilter?.feed_post === true) ||
              (commercialFilter?.id === 'service' &&
                commercialFilter?.feed_post === true) ||
              (legacySidebarFilter?.id === 'service' &&
                legacySidebarFilter?.feed_post === true));

          const sidebarWantsAdsOnly =
            !isProfilePostsFeed &&
            (legacySidebarFilter?.ads_only === true ||
              officeFilter?.ads_only === true ||
              commercialFilter?.ads_only === true ||
              landFilter?.ads_only === true);

          const isNewConditionRow = isNewConditionListing;
          const sidebarWantsNewAds =
            !isProfilePostsFeed &&
            ((legacySidebarFilter?.id === 'new' &&
              legacySidebarFilter?.ads_only === true) ||
              (officeFilter?.id === 'new' && officeFilter?.ads_only === true) ||
              (commercialFilter?.id === 'new' &&
                commercialFilter?.ads_only === true));

          let displayListings = isProfilePostsFeed
            ? finalListings.filter(l => isFeedPost(l))
            : finalListings;
          if (!isProfilePostsFeed) {
          if (sidebarWantsFeedPostsOnly) {
            displayListings = displayListings.filter(l => isFeedPost(l));
          } else if (sidebarWantsAdsOnly) {
            displayListings = displayListings.filter(l => !isFeedPost(l));
          }
          if (sidebarWantsProfessionalPosts) {
            displayListings = displayListings.filter(
              l =>
                String(l.subscription_type || '').toLowerCase() ===
                'professional',
            );
          }
          if (sidebarWantsNewAds && !newsSidebarFilterActive) {
            displayListings = displayListings.filter(l => isNewConditionRow(l));
          }
          if (legacySidebarFilter?.id === 'presale') {
            displayListings = displayListings.filter(
              l => isCompanyListing(l) && l.saleAtPresale === true,
            );
          } else if (legacySidebarFilter?.id === 'built') {
            displayListings = displayListings.filter(
              l => isCompanyListing(l) && companyConstructionStatusMatches(l, 'built'),
            );
          } else if (legacySidebarFilter?.id === 'under_construction') {
            displayListings = displayListings.filter(
              l =>
                isCompanyListing(l) &&
                companyConstructionStatusMatches(
                  l,
                  'beginning_of_construction',
                ),
            );
          } else if (
            !isProfilePostsFeed &&
            renderingsSidebarFilterActive
          ) {
            // הדמיות: company ads with a playable video only (no image-only / posts).
            displayListings = displayListings.filter(isRenderingsSidebarListing);
          }
          if (landFilter?.land_in_mortgage) {
            const need = String(landFilter.land_in_mortgage).trim();
            displayListings = displayListings.filter(
              l =>
                l.landInMortgage != null &&
                String(l.landInMortgage).trim() === need,
            );
          }
          if (landFilter?.permit) {
            const need = String(landFilter.permit).trim();
            displayListings = displayListings.filter(
              l => l.permit != null && String(l.permit).trim() === need,
            );
          }
          if (bnbFilter?.hospitality_nature) {
            const need = String(bnbFilter.hospitality_nature).trim();
            displayListings = displayListings.filter(
              l =>
                l.hospitality_nature != null &&
                String(l.hospitality_nature).trim() === need,
            );
          }
          if (partnersFilter?.search_purpose) {
            const need = String(partnersFilter.search_purpose).trim();
            displayListings = displayListings.filter(
              l =>
                l.searchPurposeKey != null &&
                String(l.searchPurposeKey).trim() === need,
            );
          }
          // שותפים: hide non-regular publishers (legacy broker/company ads).
          // BnB: regular + company listings (same card UX).
          // דירות / מגזר דתי: no company ads in default feed — only via חדשות or הדמיות.
          if (
            shouldHideCompanyAdsInApartmentsOrReligiousFeed(selectedCatNum, {
              newsActive: newsSidebarFilterActive,
              renderingsActive: renderingsSidebarFilterActive,
              sidebarFilterId: selectedSidebarFilter,
              activeSidebarFilter: activeSidebarFilter,
            })
          ) {
            displayListings = displayListings.filter(
              l => isFeedPost(l) || !isDeveloperCompanyListing(l),
            );
          }
          // Publisher-type rules gate listing ads only — posts stay visible for
          // every account type allowed to publish them in that category.
          if (
            selectedCatNum === 3 &&
            !sidebarWantsProfessionalPosts &&
            !sidebarWantsFeedPostsOnly
          ) {
            displayListings = displayListings.filter(
              l => isFeedPost(l) || isRegularUserListing(l),
            );
          } else if (
            selectedCatNum === 5 &&
            !sidebarWantsProfessionalPosts &&
            !sidebarWantsFeedPostsOnly
          ) {
            displayListings = displayListings.filter(
              l => isFeedPost(l) || isBnbFeedPublisherListing(l),
            );
          }
          }

          const viewerSubIdForPrefetch = resolveFollowUuid(
            currentUser?.subscription_id,
            currentUser?.owner_id,
            currentUser?.id,
          );
          const followPrefetchTargetIds =
            viewerSubIdForPrefetch &&
            currentUser?.email &&
            String(currentUser.email).trim() &&
            displayListings.length > 0
              ? [
                  ...new Set(
                    displayListings
                      .slice(0, 24)
                      .filter(isFollowableListing)
                      .map(resolveListingFollowTargetId)
                      .filter(id => id && id !== viewerSubIdForPrefetch),
                  ),
                ].slice(0, 20)
              : [];

          listingsFetchCacheRef.current.set(cacheKey, displayListings);
          prefetchFeedMediaItems(
            displayListings,
            0,
            FEED_PRELOAD_BELOW_COUNT + 1,
          );
          setDbListings(displayListings);
          // Keep the spinner up until the first page's image lands in the RN
          // image cache (or the soft timeout fires) so users don't see a blank
          // bubble for a beat after the feed becomes interactive.
          await waitForFirstPageImages(displayListings);
          setLoadingListings(false);

          if (followPrefetchTargetIds.length > 0) {
            void prefetchFollowStatusForTargets(
              viewerSubIdForPrefetch,
              followPrefetchTargetIds,
            ).then(nextFollowStatusMap => {
              setFollowStatusByTargetId(prev =>
                mergeFollowStatusMaps(prev, nextFollowStatusMap),
              );
              bumpFollowUiRevision();
            });
          }
          // Sync server liked state after first paint so media can appear sooner.
          if (currentUser?.id != null) {
            const uid = String(currentUser.id);
            InteractionManager.runAfterInteractions(() => {
              setLikedListingIds(prev => {
                const next = new Set(prev);
                displayListings.forEach(l => {
                  if (l?.id == null) return;
                  if (isPostVideo(l)) return;
                  if (l.liked === true) next.add(String(l.id));
                  else if (l.liked === false) next.delete(String(l.id));
                });
                likedListingIdsRef.current = next;
                persistLikedListingIds(uid, next).catch(() => {});
                return next;
              });
              setLikedPostIds(prev => {
                const next = new Set(prev);
                displayListings.forEach(l => {
                  if (l?.id == null) return;
                  if (!isPostVideo(l)) return;
                  if (l.liked === true) next.add(String(l.id));
                  else if (l.liked === false) next.delete(String(l.id));
                });
                likedPostIdsRef.current = next;
                persistLikedPostIds(uid, next).catch(() => {});
                return next;
              });
            });
          }
        } else {
          setDbListings([]);
          setFollowStatusByTargetId({});
        }
      } catch (error) {
        console.error('❌ Error fetching listings from database:', error);
        console.error('Error details:', error.message, error.stack);
        setDbListings([]);
        setFollowStatusByTargetId({});
        setListingsError(error?.message || 'Failed to fetch listings');
      } finally {
        setLoadingListings(false);
      }
    };

    fetchListings();
  }, [
    selectedCategory,
    selectedSidebarFilter,
    selectedTopBarFilter,
    refreshKey,
    currentUser?.id,
    isProfilePostsFeed,
    profilePostsSubId,
  ]);

  // Map tik image numbers to require statements
  const getTikImage = num => {
    return categoryImages[num] || categoryImages[1];
  };

  const formatCount = n => {
    const num = Number(n) || 0;
    if (num >= 1000000)
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(num);
  };
  const hasMeaningfulPostDescription = desc => {
    const text = String(desc || '').trim();
    if (!text) return false;
    const normalized = text.toLowerCase();
    return normalized !== 'פוסט' && normalized !== 'post';
  };
  /** Text overlay for posts — live layers when not baked into the image. */
  const renderPostTextOverlays = video => {
    if (!shouldRenderPostTextOverlaysOnFeed(video)) return null;
    const payload = video?.postTextOverlay;
    if (!payload) return null;
    return (
      <PostTextOverlays
        overlays={payload.overlays}
        previewWidth={payload.previewWidth}
        previewHeight={payload.previewHeight}
        coordsSpace={payload.coordsSpace}
        feedWidth={screenWidth}
        feedHeight={feedPageHeight}
      />
    );
  };
  const formatCommentTime = iso => {
    if (!iso) return 'לפני רגע';
    const ts = new Date(iso).getTime();
    if (!Number.isFinite(ts)) return 'לפני רגע';
    const deltaSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (deltaSec < 60) return 'לפני רגע';
    const mins = Math.floor(deltaSec / 60);
    if (mins < 60) return `לפני ${mins} דק׳`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `לפני ${hours} שעות`;
    const days = Math.floor(hours / 24);
    return `לפני ${days} ימים`;
  };

  const isItemLiked = item => {
    if (!currentUser?.id) return false;
    if (!item || item.id == null) return false;
    const id = String(item.id);
    return isPostVideo(item) ? likedPostIds.has(id) : likedListingIds.has(id);
  };

  /** Like / comment / share / user-search require sign-in — guests go to regular user registration. */
  const ensureSignedInOrRegister = () => {
    if (!currentUser || !String(currentUser?.email || '').trim()) {
      if (typeof onOpenUserRegistration === 'function') {
        onOpenUserRegistration();
      }
      return false;
    }
    return true;
  };

  // Toggle ad like (optimistic UI first — heart turns yellow immediately; API runs after)
  const toggleAdLiked = async listingId => {
    if (listingId == null) return;
    const listingKey = String(listingId);
    if (adLikePendingIdsRef.current.has(listingKey)) return;
    adLikePendingIdsRef.current.add(listingKey);

    const isCurrentlyLiked = likedListingIdsRef.current.has(listingKey);
    const willBeLiked = !isCurrentlyLiked;
    const userId = currentUser?.id != null ? String(currentUser.id) : null;

    const nextLikedIds = new Set(likedListingIdsRef.current);
    if (isCurrentlyLiked) nextLikedIds.delete(listingKey);
    else nextLikedIds.add(listingKey);
    likedListingIdsRef.current = nextLikedIds;
    setLikedListingIds(nextLikedIds);
    setLikedUiRevision(r => r + 1);
    if (userId) {
      persistLikedListingIds(userId, nextLikedIds).catch(() => {});
    }
    setUnseenLikedCount(prev => {
      const next = willBeLiked
        ? (Number(prev) || 0) + 1
        : Math.max(0, (Number(prev) || 0) - 1);
      if (userId) persistUnseenLikedCount(userId, next).catch(() => {});
      return next;
    });
    setDbListings(prev =>
      prev.map(l =>
        String(l.id) === listingKey
          ? {
              ...l,
              liked: willBeLiked,
              like_count: Math.max(
                0,
                (l.like_count || 0) + (willBeLiked ? 1 : -1),
              ),
            }
          : l,
      ),
    );

    if (!userId) {
      adLikePendingIdsRef.current.delete(listingKey);
      return;
    }

    try {
      if (willBeLiked) await likeListing(listingKey, userId);
      else await unlikeListing(listingKey, userId);
    } catch (e) {
      console.warn('Like/unlike API failed:', e.message);
      let revertedIds = new Set(likedListingIdsRef.current);
      if (willBeLiked) revertedIds.delete(listingKey);
      else revertedIds.add(listingKey);
      likedListingIdsRef.current = revertedIds;
      setLikedListingIds(revertedIds);
      setLikedUiRevision(r => r + 1);
      if (userId) {
        persistLikedListingIds(userId, revertedIds).catch(() => {});
      }
      setUnseenLikedCount(prev => {
        const next = willBeLiked
          ? Math.max(0, (Number(prev) || 0) - 1)
          : (Number(prev) || 0) + 1;
        if (userId) persistUnseenLikedCount(userId, next).catch(() => {});
        return next;
      });
      setDbListings(prev =>
        prev.map(l =>
          String(l.id) === listingKey
            ? {
                ...l,
                liked: !willBeLiked,
                like_count: Math.max(
                  0,
                  (l.like_count || 0) + (willBeLiked ? -1 : 1),
                ),
              }
            : l,
        ),
      );
    } finally {
      adLikePendingIdsRef.current.delete(listingKey);
    }
  };
  // Toggle post like (separate table/counter from ads — not ad likes / favorites badge)
  const togglePostLiked = async listingId => {
    if (listingId == null) return;
    const listingKey = String(listingId);
    if (postLikePendingIdsRef.current.has(listingKey)) return;
    postLikePendingIdsRef.current.add(listingKey);

    const isCurrentlyLiked = likedPostIdsRef.current.has(listingKey);
    const willBeLiked = !isCurrentlyLiked;
    const userId = currentUser?.id != null ? String(currentUser.id) : null;

    const nextLikedIds = new Set(likedPostIdsRef.current);
    if (isCurrentlyLiked) nextLikedIds.delete(listingKey);
    else nextLikedIds.add(listingKey);
    likedPostIdsRef.current = nextLikedIds;
    setLikedPostIds(nextLikedIds);
    setLikedUiRevision(r => r + 1);
    if (userId) {
      persistLikedPostIds(userId, nextLikedIds).catch(() => {});
    }
    setDbListings(prev =>
      prev.map(l =>
        String(l.id) === listingKey
          ? {
              ...l,
              liked: willBeLiked,
              post_like_count: Math.max(
                0,
                (l.post_like_count || 0) + (willBeLiked ? 1 : -1),
              ),
            }
          : l,
      ),
    );

    if (!userId) {
      postLikePendingIdsRef.current.delete(listingKey);
      return;
    }

    try {
      if (willBeLiked) await likePost(listingKey, userId);
      else await unlikePost(listingKey, userId);
    } catch (e) {
      console.warn('Post like/unlike API failed:', e.message);
      const revertedIds = new Set(likedPostIdsRef.current);
      if (willBeLiked) revertedIds.delete(listingKey);
      else revertedIds.add(listingKey);
      likedPostIdsRef.current = revertedIds;
      setLikedPostIds(revertedIds);
      setLikedUiRevision(r => r + 1);
      if (userId) {
        persistLikedPostIds(userId, revertedIds).catch(() => {});
      }
      setDbListings(prev =>
        prev.map(l =>
          String(l.id) === listingKey
            ? {
                ...l,
                liked: !willBeLiked,
                post_like_count: Math.max(
                  0,
                  (l.post_like_count || 0) + (willBeLiked ? -1 : 1),
                ),
              }
            : l,
        ),
      );
    } finally {
      postLikePendingIdsRef.current.delete(listingKey);
    }
  };

  const toggleLiked = item => {
    if (!item || item.id == null) return;
    if (!ensureSignedInOrRegister()) return;
    if (isPostVideo(item)) {
      togglePostLiked(item.id);
      return;
    }
    toggleAdLiked(item.id);
  };

  useEffect(() => {
    if (!showCommentsSheet || Platform.OS !== 'ios') {
      setIosCommentsKeyboardHeight(0);
      return undefined;
    }

    const onShow = event => {
      setIosCommentsKeyboardHeight(event?.endCoordinates?.height ?? 0);
    };
    const onHide = () => setIosCommentsKeyboardHeight(0);

    const showSub = Keyboard.addListener('keyboardWillShow', onShow);
    const hideSub = Keyboard.addListener('keyboardWillHide', onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [showCommentsSheet]);

  const commentsComposerBottom =
    Platform.OS === 'android'
      ? androidCommentsComposer.bottomOffset
      : iosCommentsKeyboardHeight > 0
        ? iosCommentsKeyboardHeight + COMMENTS_COMPOSER_KEYBOARD_LIFT
        : 0;
  const commentsComposerMarginBottom =
    Platform.OS === 'android' ? androidCommentsComposer.marginBottom : 0;
  const commentsKeyboardOpen =
    Platform.OS === 'android'
      ? androidCommentsComposer.isOpen
      : iosCommentsKeyboardHeight > 0;

  const closeCommentsSheet = () => {
    setShowCommentsSheet(false);
    setNewCommentText('');
    setCommentImageAsset(null);
    setIosCommentsKeyboardHeight(0);
  };

  const openCommentsForPost = async item => {
    if (!item?.id) return;
    if (!ensureSignedInOrRegister()) return;
    setActiveCommentsPostId(item.id);
    setNewCommentText('');
    setCommentImageAsset(null);
    setShowCommentsSheet(true);
    setCommentsLoading(true);
    try {
      const userId = currentUser?.id != null ? String(currentUser.id) : null;
      const result = await getPostComments(item.id, userId);
      const comments = Array.isArray(result?.comments) ? result.comments : [];
      setCommentsByPost(prev => {
        const local = Array.isArray(prev[item.id]) ? prev[item.id] : [];
        const postContext =
          buildCommentsPostContext(
            item.id,
            dbListings,
            videos,
            currentUser,
          ) || item;
        return {
          ...prev,
          [item.id]: annotatePostCommentsForPost(
            mergeServerAndLocalPostComments(comments, local),
            postContext,
            currentUser,
          ),
        };
      });
      setDbListings(prev =>
        prev.map(l =>
          l.id === item.id
            ? {
                ...l,
                comment_count: Math.max(
                  Number(l.comment_count || 0),
                  comments.length,
                ),
              }
            : l,
        ),
      );
    } catch (e) {
      console.warn('Failed loading post comments:', e.message);
      setCommentsByPost(prev => ({...prev, [item.id]: prev[item.id] || []}));
    } finally {
      setCommentsLoading(false);
    }
  };
  const pickImageForComment = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (result.canceled || !result.assets?.[0]) return;
      const a = result.assets[0];
      setCommentImageAsset({
        uri: a.uri,
        fileName: a.fileName || 'comment.jpg',
        mimeType: a.mimeType || 'image/jpeg',
      });
    } catch (e) {
      console.warn('Image pick failed', e?.message);
    }
  };

  const submitPostComment = async () => {
    const postId = activeCommentsPostId;
    const userId = currentUser?.id != null ? String(currentUser.id) : null;
    const text = String(newCommentText || '').trim();
    if (!postId) return;
    if (!text && !commentImageAsset) return;
    if (commentSubmitting) return;

    let uploadedImageUrl = null;
    if (commentImageAsset && userId) {
      setCommentSubmitting(true);
      try {
        const res = await uploadFile(
          {
            uri: commentImageAsset.uri,
            type: commentImageAsset.mimeType || 'image/jpeg',
            name: commentImageAsset.fileName || 'comment.jpg',
          },
          'post-comments',
        );
        uploadedImageUrl = res?.url || res?.data?.url || null;
        if (!uploadedImageUrl) {
          return;
        }
      } catch (e) {
        console.warn('Comment image upload failed', e?.message);
        return;
      } finally {
        setCommentSubmitting(false);
      }
    }

    const localPreviewUrl =
      uploadedImageUrl ||
      (commentImageAsset && !userId ? commentImageAsset.uri : null);

    const postForPublisher =
      buildCommentsPostContext(postId, dbListings, videos, currentUser) ||
      dbListings.find(l => l.id === postId) ||
      videos.find(v => v.id === postId) ||
      null;

    const optimistic = {
      id: `local-${Date.now()}`,
      user_id: userId,
      comment_text: text,
      comment_image_url: localPreviewUrl || null,
      commenter_name:
        currentUser?.name ||
        currentUser?.contact_person_name ||
        currentUser?.business_name ||
        'משתמש',
      commenter_image_url:
        currentUser?.profile_picture_url ||
        currentUser?.company_logo_url ||
        null,
      created_at: new Date().toISOString(),
      likes_count: 0,
      dislikes_count: 0,
      my_reaction: null,
      is_local_only: !userId,
      is_publisher: isPostPublisherComment(
        {
          user_id: userId,
          commenter_name:
            currentUser?.name ||
            currentUser?.contact_person_name ||
            currentUser?.business_name ||
            'משתמש',
        },
        postForPublisher,
        currentUser,
      ),
    };
    setNewCommentText('');
    setCommentImageAsset(null);
    setCommentsByPost(prev => ({
      ...prev,
      [postId]: [optimistic, ...(prev[postId] || [])],
    }));
    setDbListings(prev =>
      prev.map(l =>
        l.id === postId
          ? {...l, comment_count: Math.max(0, Number(l.comment_count || 0) + 1)}
          : l,
      ),
    );
    if (!userId) return;
    try {
      const result = await addPostComment(
        postId,
        userId,
        text,
        uploadedImageUrl,
      );
      if (result?.comment) {
        const s = normalizePostComment(result.comment);
        setCommentsByPost(prev => ({
          ...prev,
          [postId]: (prev[postId] || []).map(c => {
            if (c.id !== optimistic.id) return c;
            const merged = {
              ...c,
              ...s,
              id: s.id,
              comment_image_url: s.comment_image_url || c.comment_image_url,
              commenter_image_url:
                s.commenter_image_url || c.commenter_image_url,
            };
            return {
              ...merged,
              is_publisher: isPostPublisherComment(
                merged,
                postForPublisher,
                currentUser,
              ),
            };
          }),
        }));
      }
    } catch (e) {
      console.warn('Failed adding comment:', e.message);
    }
  };
  const toggleCommentReaction = async (commentId, reactionType) => {
    const postId = activeCommentsPostId;
    const userId = currentUser?.id != null ? String(currentUser.id) : null;
    if (!postId || !commentId || !userId) return;
    const commentIdText = String(commentId);
    const isLocalOnlyComment = commentIdText.startsWith('local-');
    const list = commentsByPost[postId] || [];
    const current = list.find(c => String(c.id) === String(commentId));
    const prevReaction = current?.my_reaction || null;
    const nextReaction = prevReaction === reactionType ? null : reactionType;

    // optimistic
    setCommentsByPost(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).map(c => {
        if (String(c.id) !== String(commentId)) return c;
        const likes = Number(c.likes_count || 0);
        const dislikes = Number(c.dislikes_count || 0);
        let nextLikes = likes;
        let nextDislikes = dislikes;
        if (prevReaction === 'like') nextLikes = Math.max(0, nextLikes - 1);
        if (prevReaction === 'dislike')
          nextDislikes = Math.max(0, nextDislikes - 1);
        if (nextReaction === 'like') nextLikes += 1;
        if (nextReaction === 'dislike') nextDislikes += 1;
        return {
          ...c,
          my_reaction: nextReaction,
          likes_count: nextLikes,
          dislikes_count: nextDislikes,
        };
      }),
    }));
    if (isLocalOnlyComment) {
      // Local optimistic comments do not exist in DB yet, so keep reaction local-only.
      return;
    }
    try {
      if (nextReaction == null) {
        await clearPostCommentReaction(postId, commentId, userId);
      } else {
        await reactToPostComment(postId, commentId, userId, nextReaction);
      }
    } catch (e) {
      console.warn('Comment reaction failed:', e.message);
      // revert on failure
      setCommentsByPost(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(c => {
          if (String(c.id) !== String(commentId)) return c;
          const likes = Number(c.likes_count || 0);
          const dislikes = Number(c.dislikes_count || 0);
          let nextLikes = likes;
          let nextDislikes = dislikes;
          if (nextReaction === 'like') nextLikes = Math.max(0, nextLikes - 1);
          if (nextReaction === 'dislike')
            nextDislikes = Math.max(0, nextDislikes - 1);
          if (prevReaction === 'like') nextLikes += 1;
          if (prevReaction === 'dislike') nextDislikes += 1;
          return {
            ...c,
            my_reaction: prevReaction,
            likes_count: nextLikes,
            dislikes_count: nextDislikes,
          };
        }),
      }));
    }
  };

  // Use database listings as primary source (they persist after refresh)
  // When a category is selected, show ONLY database listings (no mock data)
  // Top bar "liked" filter applied at display time so liking/unliking updates without refetch
  // Apply feed filters (price, rooms, city, apartment type) when set
  const parseIsoDate = value => {
    if (!value) return null;
    const text = String(value).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    const date = new Date(`${text}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const isFreeCancellationValue = value => {
    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    if (!normalized) return false;
    return (
      normalized === 'free' ||
      normalized === 'no_penalty' ||
      normalized === 'no-penalty' ||
      normalized === 'free_cancellation' ||
      normalized.includes('ללא קנס')
    );
  };

  /** סוג (type) for חדש מקבלן: slice by `property_type` / `apartmentTypeId` on the row (feed is category 1). */
  const matchesNewFromDeveloperType = (typeId, l) => {
    const id = String(typeId || '').trim();
    if (id === 'apartments') {
      return matchesNewFromDeveloperType('apartment', l);
    }
    const raw = String(
      l.apartmentTypeId || l.propertyTypeRaw || l.propertyType || '',
    )
      .trim()
      .toLowerCase();
    const cat = Number(l.category);
    const isGarden = () => raw === 'garden' || raw === 'garden_apartment';
    const isPenthouse = () => raw === 'penthouse' || raw === 'penthouses';
    const isPrivateHouse = () =>
      raw === 'private' || raw === 'private_house' || raw === 'private_houses';
    const isVilla = () => raw === 'villa' || raw === 'villas';
    const isOffice = () => raw === 'office' || raw === 'offices';
    const isCommercial = () =>
      raw === 'commercial' ||
      raw === 'trade' ||
      [
        'store',
        'shopping_center',
        'industrial_buildings',
        'warehouse',
        'commercial_space',
        'whole_floor',
      ].includes(raw);
    const isReligious = () =>
      raw === 'religious' || raw === 'religious_sector' || cat === 6;
    switch (id) {
      case 'apartment':
        if (raw === '') return true;
        if (
          isGarden() ||
          isPenthouse() ||
          isPrivateHouse() ||
          isVilla() ||
          isOffice() ||
          isCommercial() ||
          isReligious()
        ) {
          return false;
        }
        return true;
      case 'garden':
        return isGarden();
      case 'penthouses':
        return isPenthouse();
      case 'private_houses':
        return isPrivateHouse();
      case 'villas':
        return isVilla();
      case 'offices':
        return isOffice();
      case 'commercial':
        return isCommercial();
      case 'religious_sector':
        return isReligious();
      default:
        return false;
    }
  };

  const cityDistanceKm = feedFilters?.city?.distanceKm;
  const distanceFilterActive =
    !isProfilePostsFeed &&
    Number.isFinite(Number(cityDistanceKm)) &&
    Number(cityDistanceKm) > 0 &&
    selectedCategory !== 5 &&
    selectedCategory !== '5' &&
    selectedCategory !== 4 &&
    selectedCategory !== '4';

  useEffect(() => {
    let cancelled = false;
    setUserCoordsReady(false);
    (async () => {
      const coords = await resolveUserReferenceCoords(
        currentUser?.business_address,
        currentUser?.id,
        {gpsOnly: distanceFilterActive},
      );
      if (!cancelled) {
        setUserCoords(coords);
        setUserCoordsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.business_address, currentUser?.id, distanceFilterActive]);

  useEffect(() => {
    if (!userCoords) return;
    listingDistanceKmRef.current = {};
    setDistanceCalcReady(false);
    setListingDistanceVersion(v => v + 1);
  }, [userCoords?.latitude, userCoords?.longitude]);

  useEffect(() => {
    if (!distanceFilterActive) {
      setDistanceCalcReady(true);
      return undefined;
    }
    if (!userCoordsReady) {
      setDistanceCalcReady(false);
      return undefined;
    }
    if (!userCoords) {
      setDistanceCalcReady(true);
      return undefined;
    }

    let cancelled = false;
    setDistanceCalcReady(false);
    (async () => {
      const pending = [];
      for (const l of dbListings) {
        const q = getListingGeocodeQuery(l);
        if (q && listingDistanceKmRef.current[q] === undefined) {
          pending.push(q);
        }
      }
      if (!pending.length) {
        if (!cancelled) setDistanceCalcReady(true);
        return;
      }

      for (let i = 0; i < pending.length; i += 40) {
        if (cancelled) return;
        const chunk = pending.slice(i, i + 40);
        const batch = await measureDistancesBatchWithGemini(
          userCoords,
          chunk.map(q => ({key: q, address: q})),
        );
        if (batch.success && batch.distances) {
          for (const [key, km] of Object.entries(batch.distances)) {
            const normalized = Number(km);
            if (Number.isFinite(normalized) && normalized >= 0) {
              listingDistanceKmRef.current[key] = normalized;
            }
          }
        }
      }

      for (const query of pending) {
        if (cancelled) return;
        if (listingDistanceKmRef.current[query] !== undefined) continue;
        const coords = await geocodeAddress(query);
        listingDistanceKmRef.current[query] = coords
          ? haversineDistanceKm(userCoords, coords)
          : Number.POSITIVE_INFINITY;
        if (!cancelled) setListingDistanceVersion(v => v + 1);
      }

      if (!cancelled) {
        setListingDistanceVersion(v => v + 1);
        setDistanceCalcReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    dbListings,
    distanceFilterActive,
    userCoords,
    userCoordsReady,
  ]);

  const applyFeedFilters = list => {
    let out = list;
    if (feedFilters.price != null) {
      const {
        minPrice = 0,
        maxPrice = 10000000,
        checkInDate = null,
        checkOutDate = null,
        freeCancellation = false,
        hotDealOnly = false,
      } = feedFilters.price;
      const bnbFeed = selectedCategory === 5 || selectedCategory === '5';
      const landFeed = selectedCategory === 7 || selectedCategory === '7';
      // PriceFilterScreen: max at slider cap = “+” (no upper limit) — from min price to +∞, not a hard ceiling.
      const MAX_PRICE_SALE_CAP = landFeed ? 100000000 : 10000000;
      const MAX_PRICE_BNB_NIGHT_CAP = 10000; // same as PriceFilterScreen MAX_PRICE_BNB
      const noUpperPriceCap = bnbFeed
        ? Number(maxPrice) === MAX_PRICE_BNB_NIGHT_CAP
        : Number(maxPrice) === MAX_PRICE_SALE_CAP;
      out = out.filter(l => {
        if (isPostVideo(l) && !landFeed) {
          return false;
        }
        const subType = String(l.subscription_type || '').toLowerCase();
        if (subType === 'company' && !landFeed && !bnbFeed) {
          return false;
        }
        if (l.rawPrice == null || l.rawPrice < minPrice) return false;
        if (noUpperPriceCap) {
          return true;
        }
        return l.rawPrice <= maxPrice;
      });
      if (bnbFeed) {
        const selectedCheckIn = parseIsoDate(checkInDate);
        const selectedCheckOut = parseIsoDate(checkOutDate);
        if (selectedCheckIn || selectedCheckOut) {
          out = out.filter(l => {
            const listingCheckIn = parseIsoDate(l.checkInDate);
            const listingCheckOut = parseIsoDate(l.checkOutDate);
            if (!listingCheckIn && !listingCheckOut) return false;
            if (
              selectedCheckIn &&
              listingCheckIn &&
              selectedCheckIn < listingCheckIn
            ) {
              return false;
            }
            if (
              selectedCheckOut &&
              listingCheckOut &&
              selectedCheckOut > listingCheckOut
            ) {
              return false;
            }
            return true;
          });
        }
        if (freeCancellation === true) {
          out = out.filter(l => isFreeCancellationValue(l.cancellationPolicy));
        }
        if (hotDealOnly === true) {
          out = out.filter(
            l =>
              l.hotDeal === true ||
              l.hotDeal === 'true' ||
              l.hotDeal === 't' ||
              l.hotDeal === 1,
          );
        }
      }
    }
    if (feedFilters.rooms != null) {
      const r = feedFilters.rooms;
      const {
        rooms: minRooms,
        area: minArea,
        floor: minFloor,
        parking: minParking,
        balcony: minBalcony,
        elevator: needElevator,
        mamad: needMamad,
        freeParking: needFreeParking,
      } = r;
      const roomsAmenityOn = (l, keys) => {
        const a = l.amenities;
        if (!a || typeof a !== 'object') return false;
        return keys.some(k => {
          const v = a[k];
          return v === true || (typeof v === 'number' && v > 0);
        });
      };
      const roomsAmenityMaxCount = (l, keys) => {
        const a = l.amenities;
        if (!a || typeof a !== 'object') return 0;
        let max = 0;
        for (const k of keys) {
          const v = a[k];
          if (v === true) max = Math.max(max, 1);
          else if (typeof v === 'number' && v > 0) max = Math.max(max, v);
        }
        return max;
      };
      const newFromDevRoomsMinSqm =
        selectedCategory === 1 || selectedCategory === '1';
      const typeIdsForNfdRooms = newFromDevRoomsMinSqm
        ? Array.isArray(feedFilters.type)
          ? feedFilters.type.map(v => String(v || '').trim()).filter(Boolean)
          : feedFilters.type != null && String(feedFilters.type).trim() !== ''
            ? [String(feedFilters.type).trim()]
            : []
        : [];
      out = out.filter(l => {
        if (minRooms != null) {
          const need = Number(minRooms);
          if (newFromDevRoomsMinSqm) {
            if (newDeveloperComparableMaxRooms(l, typeIdsForNfdRooms) < need) {
              return false;
            }
          } else if (l.rooms == null || Number(l.rooms) < need) {
            return false;
          }
        }
        if (minArea != null) {
          if (newFromDevRoomsMinSqm) {
            if (
              newDeveloperMeterComparableSqm(l, typeIdsForNfdRooms) <
              Number(minArea)
            ) {
              return false;
            }
          } else if (l.area == null || Number(l.area) < minArea) {
            return false;
          }
        }
        if (
          minFloor != null &&
          (l.floor == null || Number(l.floor) < minFloor)
        ) {
          return false;
        }
        if (minParking != null) {
          const need = Number(minParking);
          if (Number.isFinite(need) && need > 0) {
            const c = roomsAmenityMaxCount(l, [
              'חניה',
              'חנייה',
              'כמות חניות',
              'parking',
            ]);
            if (c < need) return false;
          }
        }
        if (minBalcony != null) {
          const need = Number(minBalcony);
          if (Number.isFinite(need) && need > 0) {
            const c = roomsAmenityMaxCount(l, ['מרפסת', 'מרפסה']);
            if (c < need) return false;
          }
        }
        if (needElevator === true && !roomsAmenityOn(l, ['מעלית'])) {
          return false;
        }
        if (
          needMamad === true &&
          !roomsAmenityOn(l, ['ממ״ד', 'ממ"ד', 'mamad'])
        ) {
          return false;
        }
        if (needFreeParking === true) {
          const a = l.amenities;
          if (!a || typeof a !== 'object') return false;
          const paid = a['חנייה בתשלום'];
          const isFree =
            paid === 'ללא' ||
            a.free_parking === true ||
            a.freeParking === true ||
            a['חניה בחינם'] === true;
          if (!isFree) return false;
        }
        return true;
      });
    }
    const officeCategoryActive =
      selectedCategory != null &&
      selectedCategory !== '' &&
      Number(selectedCategory) === 2;
    if (
      officeCategoryActive &&
      feedFilters.office != null &&
      typeof feedFilters.office === 'object'
    ) {
      const o = feedFilters.office;
      const amenityOn = (l, keys) => {
        const a = l.amenities;
        if (!a || typeof a !== 'object') return false;
        return keys.some(k => {
          const v = a[k];
          return v === true || (typeof v === 'number' && v > 0);
        });
      };
      if (o.minArea != null) {
        out = out.filter(
          l => l.area != null && Number(l.area) >= Number(o.minArea),
        );
      }
      if (o.minRooms != null) {
        out = out.filter(
          l => l.rooms != null && Number(l.rooms) >= Number(o.minRooms),
        );
      }
      const selectedOfficeTypes = [];
      if (o.office === true) selectedOfficeTypes.push('office');
      if (o.wholeFloor === true) selectedOfficeTypes.push('whole_floor');
      const wantSharedSpaces = o.sharedSpaces === true;
      if (selectedOfficeTypes.length > 0 || wantSharedSpaces) {
        out = out.filter(l => {
          const typeMatch = selectedOfficeTypes.includes(l.apartmentTypeId || '');
          const sharedMatch = wantSharedSpaces && l.sharedSpacesCompany === true;
          return typeMatch || sharedMatch;
        });
      }
      if (o.parking === true) {
        out = out.filter(l => amenityOn(l, ['חניה', 'חנייה']));
      }
      if (o.elevator === true) {
        out = out.filter(l => amenityOn(l, ['מעלית']));
      }
      if (o.mamad === true) {
        out = out.filter(l => amenityOn(l, ['ממ״ד', 'ממ"ד']));
      }
    }
    if (feedFilters.city != null) {
      const c = feedFilters.city;
      const cityQuery = String(c.city || '').trim().toLowerCase();
      const streetQuery = String(c.street || '').trim().toLowerCase();
      const countryQuery = String(c.country || '').trim().toLowerCase();
      const purpose = c.purpose;
      if (purpose === 'rent' || purpose === 'sale') {
        out = out.filter(l => {
          if (isPostVideo(l)) return false;
          return (l.listingPurpose || 'sale') === purpose;
        });
      }
      if (c.immediateEntry === true) {
        out = out.filter(l => {
          if (isPostVideo(l)) return false;
          const a = l.amenities;
          if (!a || typeof a !== 'object') return false;
          return (
            a.immediate_entry === true ||
            a.entry_immediate === true ||
            a.immediateEntry === true ||
            a['כניסה מיידית'] === true
          );
        });
      }
      if (cityQuery || streetQuery || countryQuery) {
        out = out.filter(l => {
          const searchBlob = [
            l.address,
            l.location,
            l.search_address,
            l.land_address,
            l.name,
            l.title,
            l.project_name,
            l.property_name,
          ]
            .map(s => String(s ?? '').toLowerCase())
            .filter(Boolean)
            .join(' ');
          const matchesTokens = query => {
            const tokens = query.split(/\s+/).map(t => t.trim()).filter(Boolean);
            if (!tokens.length) return true;
            return tokens.every(token => searchBlob.includes(token));
          };
          if (!matchesTokens(cityQuery)) return false;
          if (!matchesTokens(streetQuery)) return false;
          if (!matchesTokens(countryQuery)) return false;
          return true;
        });
      }
      const regionIds = Array.isArray(c.regions)
        ? c.regions.map(r => String(r || '').trim()).filter(Boolean)
        : [];
      if (regionIds.length > 0) {
        const BNB_REGION_LABELS = {
          north: 'צפון',
          south: 'דרום',
          center: 'מרכז',
          east: 'מזרח',
          west: 'מערב',
        };
        const regionLabels = regionIds
          .map(id => BNB_REGION_LABELS[id] || id)
          .filter(Boolean);
        out = out.filter(l => {
          const searchBlob = [
            l.address,
            l.location,
            l.search_address,
            l.land_address,
            l.name,
            l.title,
            l.project_name,
            l.property_name,
          ]
            .map(s => String(s ?? '').toLowerCase())
            .filter(Boolean)
            .join(' ');
          return regionLabels.some(label =>
            searchBlob.includes(String(label).toLowerCase()),
          );
        });
      }
      const maxDistKm = Number(c.distanceKm);
      const isBnbFeedDist = selectedCategory === 5 || selectedCategory === '5';
      const isGlobalFeedDist = selectedCategory === 4 || selectedCategory === '4';
      if (
        Number.isFinite(maxDistKm) &&
        maxDistKm > 0 &&
        !isBnbFeedDist &&
        !isGlobalFeedDist
      ) {
        out = out.filter(l => {
          if (isPostVideo(l)) return false;
          if (!userCoordsReady || !userCoords) return false;
          if (!distanceCalcReady) return false;
          const query = getListingGeocodeQuery(l);
          if (!query) return false;
          const distKm = listingDistanceKmRef.current[query];
          if (typeof distKm !== 'number' || !Number.isFinite(distKm)) {
            return false;
          }
          return distKm <= maxDistKm;
        });
      }
    }
    const apartmentTypeFilterIds = (() => {
      const a = feedFilters.apartmentType;
      if (a == null || a === '') return [];
      if (Array.isArray(a)) {
        return a.map(x => String(x || '').trim()).filter(Boolean);
      }
      return [String(a).trim()].filter(Boolean);
    })();
    if (apartmentTypeFilterIds.length > 0) {
      out = out.filter(l => {
        const lid = String(l.apartmentTypeId || '');
        return apartmentTypeFilterIds.some(apt => {
          const matchId = apt === 'apartment' ? 'regular' : apt; // UI 'apartment' = API 'regular'
          return lid === matchId || lid === apt;
        });
      });
    }
    if (
      feedFilters.meter != null &&
      feedFilters.meter !== '' &&
      Number.isFinite(Number(feedFilters.meter))
    ) {
      const minMeter = Number(feedFilters.meter);
      const newFromDeveloperForMeter =
        selectedCategory === 1 || selectedCategory === '1';
      if (newFromDeveloperForMeter) {
        const typeIdsForMeter = Array.isArray(feedFilters.type)
          ? feedFilters.type.map(v => String(v || '').trim()).filter(Boolean)
          : feedFilters.type != null && String(feedFilters.type).trim() !== ''
            ? [String(feedFilters.type).trim()]
            : [];
        out = out.filter(l => {
          const sqm = newDeveloperMeterComparableSqm(l, typeIdsForMeter);
          return sqm >= minMeter;
        });
      } else {
        const officeCat2 = selectedCategory === 2 || selectedCategory === '2';
        const officeMinAreaTakesOver =
          officeCat2 &&
          feedFilters.office != null &&
          typeof feedFilters.office === 'object' &&
          feedFilters.office.minArea != null;
        if (!officeMinAreaTakesOver) {
          out = out.filter(l => l.area != null && Number(l.area) >= minMeter);
        }
      }
    }
    const selectedTypes = Array.isArray(feedFilters.type)
      ? feedFilters.type.map(v => String(v || '').trim()).filter(Boolean)
      : feedFilters.type != null && String(feedFilters.type).trim() !== ''
        ? [String(feedFilters.type).trim()]
        : [];
    if (selectedTypes.length > 0) {
      const landFeed = selectedCategory === 7 || selectedCategory === '7';
      const bnbFeed = selectedCategory === 5 || selectedCategory === '5';
      const newFromDeveloperFeed =
        selectedCategory === 1 || selectedCategory === '1';
      if (landFeed) {
        const landPredicates = {
          own_private: l => l.landOwnership === 'private',
          own_administration: l => l.landOwnership === 'administration',
          agri_yes: l => l.agriculturalLand === 'yes',
          agri_not: l => l.agriculturalLand === 'not',
          plan_happy: l => l.planApproval === 'happy',
          plan_nothing: l => l.planApproval === 'nothing',
          plan_there_is: l => l.planApproval === 'there_is',
          mortgage_not: l => l.landInMortgage === 'not',
          mortgage_yes: l => l.landInMortgage === 'yes',
          permit_nothing: l => l.permit === 'nothing',
          permit_there_is: l => l.permit === 'there_is',
        };
        out = out.filter(l =>
          selectedTypes.some(typeId => {
            const pred = landPredicates[typeId];
            return typeof pred === 'function' ? pred(l) : false;
          }),
        );
      } else if (bnbFeed) {
        out = out.filter(l => {
          const rawType = String(
            l.apartmentTypeId || l.propertyTypeRaw || l.propertyType || '',
          )
            .trim()
            .toLowerCase();
          return selectedTypes.some(typeId => {
            const normalized = String(typeId || '')
              .trim()
              .toLowerCase();
            if (!normalized) return false;
            if (normalized === 'b&b' || normalized === 'bnb') {
              return rawType === 'b&b' || rawType === 'bnb';
            }
            return rawType === normalized;
          });
        });
      } else if (newFromDeveloperFeed) {
        out = out.filter(l =>
          selectedTypes.some(tid => matchesNewFromDeveloperType(tid, l)),
        );
      } else {
        const commercePropertyTypes = new Set([
          'store',
          'shopping_center',
          'industrial_buildings',
          'warehouse',
          'commercial_space',
          'whole_floor',
        ]);
        const typeToCategory = {
          offices: 2,
          commercial: 8,
          land: 7,
          apartments: 10,
          penthouses: 10,
          private_houses: 10,
          villas: 10,
          estates: 10,
          multi_family: 10,
        };
        out = out.filter(l =>
          selectedTypes.some(typeId => {
            if (commercePropertyTypes.has(typeId)) {
              return (l.apartmentTypeId || '') === typeId;
            }
            const cat = typeToCategory[typeId];
            return cat != null ? Number(l.category) === cat : false;
          }),
        );
      }
    }
    if (
      feedFilters.donam != null &&
      (feedFilters.donam.minDonam != null || feedFilters.donam.maxDonam != null)
    ) {
      const minDonam = Number(feedFilters.donam.minDonam ?? 0);
      const maxDonam = Number(feedFilters.donam.maxDonam ?? 999999);
      const minSqm = minDonam * 1000; // 1 dunam = 1000 m²
      const maxSqm = maxDonam * 1000;
      out = out.filter(
        l =>
          l.area != null &&
          Number(l.area) >= minSqm &&
          Number(l.area) <= maxSqm,
      );
    }
    if (feedFilters.preferences != null && feedFilters.preferences !== '') {
      const pref = feedFilters.preferences;
      if (typeof pref === 'object') {
        const parseListingAge = v => {
          if (v == null) return null;
          const s = String(v).trim();
          if (s === '') return null;
          const n = Number(s);
          return Number.isFinite(n) ? n : null;
        };
        /** Partner ads (category 3): ages from DB (`preferred_age_*`) or client shape (`preferredAge*`) — same as upload bar. */
        const listingPreferredAgeRange = l => {
          const pMin = parseListingAge(
            l.preferredAgeMin ?? l.preferred_age_min,
          );
          const pMax = parseListingAge(
            l.preferredAgeMax ?? l.preferred_age_max,
          );
          return {pMin, pMax};
        };
        const getPartnerPrefObj = l =>
          l?.preferences && typeof l.preferences === 'object'
            ? l.preferences
            : {};
        const pBool = (o, a, b) =>
          !!(a && o[a] === true) || !!(b && o[b] === true);
        if (pref.gender === 'female') {
          out = out.filter(
            l => l.preferredGender == null || l.preferredGender === 'אישה',
          );
        } else if (pref.gender === 'male') {
          out = out.filter(
            l => l.preferredGender == null || l.preferredGender === 'גבר',
          );
        }
        if (pref.ageMin != null || pref.ageMax != null) {
          const rawLo = Number(pref.ageMin ?? 18);
          const rawHi = Number(pref.ageMax ?? 100);
          const fLo = Math.min(rawLo, rawHi);
          const fHi = Math.max(rawLo, rawHi);
          out = out.filter(l => {
            const cat = Number(l.category);
            if (!Number.isFinite(cat) || cat !== 3) return true;
            const {pMin, pMax} = listingPreferredAgeRange(l);
            if (pMin == null && pMax == null) return true;
            const lo = pMin != null ? pMin : 18;
            const hi = pMax != null ? pMax : 100;
            if (lo > hi) return true;
            return fLo <= hi && lo <= fHi;
          });
        }
        if (pref.nonSmoker === true || pref.nonSmokers === true) {
          out = out.filter(l =>
            pBool(getPartnerPrefObj(l), 'nonSmokers', 'nonSmoker'),
          );
        }
        if (pref.students === true) {
          out = out.filter(l => getPartnerPrefObj(l).students === true);
        }
        if (pref.stableJob === true) {
          out = out.filter(l => getPartnerPrefObj(l).stableJob === true);
        }
        if (pref.occasionalJob === true) {
          out = out.filter(l => getPartnerPrefObj(l).occasionalJob === true);
        }
        if (pref.immediateEntry === true) {
          out = out.filter(l => getPartnerPrefObj(l).immediateEntry === true);
        }
      } else {
        if (pref === 'gender_female')
          out = out.filter(l => l.preferredGender === 'אישה');
        else if (pref === 'gender_male')
          out = out.filter(l => l.preferredGender === 'גבר');
      }
    }
    return out;
  };
  const baseList = isProfilePostsFeed
    ? dbListings
    : selectedTopBarFilter === 'liked'
      ? dbListings.filter(l => isItemLiked(l))
      : dbListings;
  const uploadedVideos = useMemo(() => {
    void listingDistanceVersion;
    void userCoordsReady;
    void distanceCalcReady;
    // Profile post browsing: show that user's posts only — never apply TikTok
    // bottom/top filters (price, city, rooms, liked, etc.).
    if (isProfilePostsFeed) return baseList;
    return applyFeedFilters(baseList);
  }, [
    baseList,
    isProfilePostsFeed,
    feedFilters,
    selectedCategory,
    userCoords,
    userCoordsReady,
    distanceCalcReady,
    listingDistanceVersion,
  ]);

  // Mock video data - only used when NO category is selected (for general browsing)
  // When a category is opened, show ONLY database content
  const allMockVideos = [
    {
      id: 1,
      image: 1,
      category: 1,
      title: 'דירה מרווחת בתל אביב',
      description: 'דירה 4 חדרים עם מרפסת גדולה',
      location: 'תל אביב, רוטשילד 54',
      price: '₪5,000',
      likes: 1234,
      views: 5678,
    },
    {
      id: 2,
      image: 2,
      category: 2,
      title: 'נטהאוז יוקרתי',
      description: 'נוף פנורמי לעיר',
      location: 'תל אביב, דיזנגוף',
      price: '₪12,000',
      likes: 2345,
      views: 8901,
    },
    {
      id: 3,
      image: 3,
      category: 3,
      title: 'דירת סטודיו מודרנית',
      description: 'עיצוב מינימליסטי ונוח',
      location: 'תל אביב, פלורנטין',
      price: '₪3,500',
      likes: 987,
      views: 3456,
    },
    {
      id: 4,
      image: 4,
      category: 4,
      title: 'בית פרטי עם גינה',
      description: 'בית משפחתי עם חצר גדולה',
      location: "רמת גן, ז'בוטינסקי",
      price: '₪8,500',
      likes: 3456,
      views: 12345,
    },
    {
      id: 5,
      image: 5,
      category: 5,
      title: 'דירת גן בקומה ראשונה',
      description: 'גישה ישירה לגינה',
      location: 'תל אביב, נווה צדק',
      price: '₪6,200',
      likes: 1876,
      views: 6789,
    },
    {
      id: 6,
      image: 6,
      category: 6,
      title: 'דופלקס יוקרתי',
      description: '2 קומות עם גג',
      location: 'תל אביב, רמת אביב',
      price: '₪15,000',
      likes: 4567,
      views: 15678,
    },
    {
      id: 7,
      image: 7,
      category: 7,
      title: 'דירה עם מרפסת שמש',
      description: 'נוף לים',
      location: 'תל אביב, חוף הים',
      price: '₪7,800',
      likes: 2341,
      views: 9012,
    },
    {
      id: 8,
      image: 8,
      category: 8,
      title: 'לופט תעשייתי',
      description: 'תקרות גבוהות וחלונות גדולים',
      location: 'תל אביב, נחלת בנימין',
      price: '₪9,500',
      likes: 3124,
      views: 11234,
    },
    {
      id: 9,
      image: 9,
      category: 9,
      title: 'דירה משופצת',
      description: 'שיפוץ מלא וחדש',
      location: 'תל אביב, רחוב אלנבי',
      price: '₪4,500',
      likes: 1567,
      views: 5678,
    },
    {
      id: 10,
      image: 10,
      category: 10,
      title: 'דירת 5 חדרים',
      description: 'מתאימה למשפחה גדולה',
      location: 'רמת גן, ביאליק',
      price: '₪10,000',
      likes: 2789,
      views: 9876,
    },
    {
      id: 11,
      image: 11,
      category: 11,
      title: 'נטהאוז עם גג',
      description: 'נוף 360 מעלות',
      location: 'תל אביב, רחוב בן יהודה',
      price: '₪18,000',
      likes: 5678,
      views: 23456,
    },
  ];

  // When a category is selected, show ONLY database listings (no mock data)
  // When no category is selected, show database listings + mock videos for general browsing
  // Video mode: do not mix in image-only mock cards when browsng all categories.
  const includeMockWhenNoCategory =
    !selectedCategory && selectedTopBarFilter !== 'video';
  const videos = isProfilePostsFeed
    ? uploadedVideos
    : selectedCategory
      ? uploadedVideos
      : [...uploadedVideos, ...(includeMockWhenNoCategory ? allMockVideos : [])];

  const listModeListings = useMemo(
    () => videos.filter(l => !isFeedPost(l)),
    [videos],
  );

  useEffect(() => {
    if (selectedTopBarFilter !== 'list') {
      return;
    }
    if (!listModeListings.length) {
      setListPiDisplayBySubId({});
      return;
    }
    const subs = [
      ...new Set(
        listModeListings
          .map(l => l?.subscription_id)
          .filter(s => s != null && String(s).trim() !== ''),
      ),
    ];
    if (subs.length === 0) {
      setListPiDisplayBySubId({});
      return;
    }
    let cancelled = false;
    (async () => {
      const parts = await Promise.all(
        subs.map(async subId => {
          const idKey = String(subId);
          const listing =
            listModeListings.find(
              l =>
                l?.subscription_id != null &&
                String(l.subscription_id) === idKey,
            ) || {subscription_id: subId};
          try {
            const {reviews} = await getReviews(idKey);
            const v = displayPiRatingFromReviews(
              Array.isArray(reviews) ? reviews : [],
              listing,
            );
            return [idKey, v];
          } catch {
            return [idKey, brokerPiRatingFromListing(listing)];
          }
        }),
      );
      if (cancelled) return;
      setListPiDisplayBySubId(Object.fromEntries(parts));
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTopBarFilter, listModeListings]);

  // Record a view when user lands on a DB listing (once per listing per session)
  useEffect(() => {
    const item = videos[currentIndex];
    if (
      item?.fromDatabase &&
      item?.id &&
      item.id !== lastViewedListingIdRef.current
    ) {
      lastViewedListingIdRef.current = item.id;
      recordListingView(item.id);
    }
  }, [currentIndex, videos]);

  useEffect(() => {
    if (videos.length === 0) return;
    const start = Math.max(0, currentIndex - FEED_PRELOAD_ABOVE_COUNT);
    const end = Math.min(
      videos.length - 1,
      currentIndex + FEED_PRELOAD_BELOW_COUNT,
    );
    prefetchFeedWindowMedia(
      videos,
      start,
      end - start + 1,
      Image,
    );
  }, [currentIndex, videos]);

  const activateFeedVideoAt = useCallback(index => {
    if (!isScreenActiveRef.current) {
      feedVideoRefs.current.forEach(player => {
        player?.stop?.();
      });
      return;
    }
    feedVideoRefs.current.forEach((player, i) => {
      if (i === index) {
        player?.play?.();
      } else {
        player?.pause?.();
      }
    });
  }, []);

  isScreenActiveRef.current = isScreenActive;

  useLayoutEffect(() => {
    if (isScreenActive) return;
    feedVideoRefs.current.forEach(player => {
      player?.stop?.();
    });
  }, [isScreenActive]);

  useEffect(() => {
    if (isScreenActive) {
      activateFeedVideoAt(currentIndexRef.current);
      return;
    }
    feedVideoRefs.current.forEach(player => {
      player?.stop?.();
    });
  }, [isScreenActive, activateFeedVideoAt]);

  const bindFeedVideoRef = useCallback((index, node) => {
    if (node) {
      feedVideoRefs.current.set(index, node);
      if (
        index === currentIndexRef.current &&
        isScreenActiveRef.current
      ) {
        node.play?.();
      }
    } else {
      feedVideoRefs.current.delete(index);
    }
  }, []);

  // Define feed scroll handlers before any early return (hooks must run every render)
  const syncFeedIndexFromOffset = useCallback(
    y => {
      if (videos.length === 0) return;
      const nextIndex = feedScrollFocusIndex(
        y,
        feedPageHeight,
        videos.length - 1,
      );
      if (nextIndex === currentIndexRef.current) return;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      setScrollAnchorIndex(nextIndex);
      activateFeedVideoAt(nextIndex);
    },
    [feedPageHeight, videos.length, activateFeedVideoAt],
  );

  const scrollToIndex = useCallback(
    (index, animated = true) => {
      const clamped = Math.max(0, Math.min(index, videos.length - 1));
      if (!feedListRef.current || videos.length === 0) return;
      if (
        !sidebarIntroFinishedRef.current &&
        clamped !== currentIndexRef.current
      ) {
        finalizeSidebarIntroForFeedScroll();
      }
      const targetY = clamped * feedPageHeight;
      feedListRef.current.scrollToOffset({offset: targetY, animated});
      currentIndexRef.current = clamped;
      setCurrentIndex(clamped);
      setScrollAnchorIndex(clamped);
      activateFeedVideoAt(clamped);
    },
    [
      videos.length,
      feedPageHeight,
      finalizeSidebarIntroForFeedScroll,
      activateFeedVideoAt,
    ],
  );

  const handleNext = useCallback(() => {
    if (currentIndexRef.current < videos.length - 1) {
      scrollToIndex(currentIndexRef.current + 1);
    }
  }, [scrollToIndex, videos.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndexRef.current > 0) {
      scrollToIndex(currentIndexRef.current - 1);
    }
  }, [scrollToIndex]);

  useEffect(() => {
    if (!feedListRef.current || videos.length === 0) return;
    const targetY = currentIndexRef.current * feedPageHeight;
    feedListRef.current.scrollToOffset({offset: targetY, animated: false});
  }, [feedPageHeight, videos.length]);

  useEffect(() => {
    setScrollAnchorIndex(0);
  }, [selectedCategory, videos.length]);

  useEffect(() => {
    if (videos.length === 0) {
      currentIndexRef.current = 0;
      setCurrentIndex(0);
      return;
    }
    if (currentIndexRef.current >= videos.length) {
      scrollToIndex(videos.length - 1, false);
    }
  }, [videos.length, scrollToIndex]);

  const focusScrollTimerRef = useRef(null);
  useEffect(
    () => () => {
      if (focusScrollTimerRef.current) {
        clearTimeout(focusScrollTimerRef.current);
        focusScrollTimerRef.current = null;
      }
    },
    [],
  );
  useEffect(() => {
    if (!focusListingId || loadingListings) return;
    const targetId = String(focusListingId).trim();
    if (!targetId) {
      onFocusListingConsumed?.();
      return;
    }
    const idx = videos.findIndex(
      v => String(v?.id ?? '').trim() === targetId,
    );
    if (idx >= 0) {
      // Found it — scroll to that exact post and stop focusing.
      if (focusScrollTimerRef.current) {
        clearTimeout(focusScrollTimerRef.current);
        focusScrollTimerRef.current = null;
      }
      scrollToIndex(idx, false);
      onFocusListingConsumed?.();
      return;
    }
    // Not in the feed yet (listings may still be streaming in after a remount).
    // Keep the focus id so the next `videos` update retries, and only give up
    // after a short grace period so a stale id can't hijack later loads.
    if (!focusScrollTimerRef.current) {
      focusScrollTimerRef.current = setTimeout(() => {
        focusScrollTimerRef.current = null;
        onFocusListingConsumed?.();
      }, 5000);
    }
  }, [
    focusListingId,
    loadingListings,
    videos,
    scrollToIndex,
    onFocusListingConsumed,
  ]);

  const onFeedScroll = useCallback(
    event => {
      const y = event?.nativeEvent?.contentOffset?.y ?? 0;
      const idx = feedScrollFocusIndex(
        y,
        feedPageHeight,
        videos.length - 1,
      );
      if (
        !sidebarIntroFinishedRef.current &&
        idx !== currentIndexRef.current
      ) {
        finalizeSidebarIntroForFeedScroll();
      }
      if (idx !== currentIndexRef.current) {
        currentIndexRef.current = idx;
        setCurrentIndex(idx);
        setScrollAnchorIndex(idx);
        activateFeedVideoAt(idx);
        const start = Math.max(0, idx - FEED_PRELOAD_ABOVE_COUNT);
        const end = Math.min(videos.length - 1, idx + FEED_PRELOAD_BELOW_COUNT);
        prefetchFeedWindowMedia(videos, start, end - start + 1, Image);
        return;
      }
      setScrollAnchorIndex(prev => (prev === idx ? prev : idx));
    },
    [
      feedPageHeight,
      videos,
      finalizeSidebarIntroForFeedScroll,
      activateFeedVideoAt,
    ],
  );

  const onFeedScrollBeginDrag = useCallback(() => {
    if (!sidebarIntroFinishedRef.current) {
      finalizeSidebarIntroForFeedScroll();
    }
    if (sidebarPanActiveRef.current) return;
  }, [finalizeSidebarIntroForFeedScroll]);

  const handleFeedScrollSettled = useCallback(
    event => {
      const y = event?.nativeEvent?.contentOffset?.y ?? 0;
      syncFeedIndexFromOffset(y);
      const idx = feedScrollFocusIndex(
        y,
        feedPageHeight,
        videos.length - 1,
      );
      currentIndexRef.current = idx;
      setCurrentIndex(idx);
      setScrollAnchorIndex(idx);
      activateFeedVideoAt(idx);
      if (Platform.OS !== 'web') return;
      const snappedY = Math.round(y / feedPageHeight) * feedPageHeight;
      if (Math.abs(y - snappedY) > 2 && feedListRef.current) {
        feedListRef.current.scrollToOffset({offset: snappedY, animated: true});
      }
    },
    [syncFeedIndexFromOffset, feedPageHeight, videos.length, activateFeedVideoAt],
  );

  const getFeedItemLayout = useCallback(
    (_, index) => ({
      length: feedPageHeight,
      offset: feedPageHeight * index,
      index,
    }),
    [feedPageHeight],
  );

  const feedKeyExtractor = useCallback(item => String(item.id), []);

  const shouldRenderFeedChrome = useCallback(
    index => {
      if (videos.length === 0) return false;
      const inPreloadWindow = anchor =>
        index >= anchor - FEED_PRELOAD_ABOVE_COUNT &&
        index <= anchor + FEED_PRELOAD_BELOW_COUNT;
      return (
        inPreloadWindow(currentIndex) || inPreloadWindow(scrollAnchorIndex)
      );
    },
    [currentIndex, scrollAnchorIndex, videos.length],
  );

  const BOTTOM_SHEET_DRAG_CLOSE_THRESHOLD = 56;
  const bottomSheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const {dy, dx} = gestureState;
          return dy > 8 && dy > Math.abs(dx) * 0.55;
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          const {dy, dx} = gestureState;
          return dy > 8 && dy > Math.abs(dx) * 0.55;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            bottomSheetTranslateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          const {dy, vy} = gestureState;
          const shouldClose =
            dy > BOTTOM_SHEET_DRAG_CLOSE_THRESHOLD || vy > 1.1;
          if (shouldClose) {
            Animated.timing(bottomSheetTranslateY, {
              toValue: 480,
              duration: 220,
              useNativeDriver: bottomSheetUseNativeDriver,
            }).start(() => {
              bottomSheetTranslateY.setValue(0);
              setShowBottomSheet(false);
            });
          } else {
            Animated.spring(bottomSheetTranslateY, {
              toValue: 0,
              friction: 9,
              useNativeDriver: bottomSheetUseNativeDriver,
            }).start();
          }
        },
      }),
    [bottomSheetTranslateY, bottomSheetUseNativeDriver],
  );

  useEffect(() => {
    if (showBottomSheet) {
      bottomSheetTranslateY.setValue(0);
    }
  }, [showBottomSheet, bottomSheetTranslateY]);

  useEffect(() => {
    if (!pendingBnbPublishSheet) return;
    bottomSheetTranslateY.setValue(0);
    setShowBottomSheet(true);
    onPendingBnbPublishSheetConsumed?.();
  }, [
    pendingBnbPublishSheet,
    bottomSheetTranslateY,
    onPendingBnbPublishSheetConsumed,
  ]);

  // Sidebar drag: hold and swipe up/down; bottom icons disappear off screen when dragged down
  // Max down equals the intro/profile-only stage.
  const SIDEBAR_DRAG_MAX_DOWN = sidebarDragMaxDown;
  // When all icons are visible (top), don't allow scrolling up past that
  const SIDEBAR_DRAG_MAX_UP = sidebarDragMaxUp;

  const lockFeedScrollForSidebar = useCallback(() => {
    if (videos.length === 0 || sidebarFeedScrollLockedRef.current) return;
    sidebarFeedScrollLockedRef.current = true;
    feedListRef.current?.setNativeProps?.({scrollEnabled: false});
  }, [videos.length]);

  const unlockFeedScrollForSidebar = useCallback(() => {
    sidebarPanActiveRef.current = false;
    setSidebarSlideshowPaused(false);
    if (!sidebarFeedScrollLockedRef.current) {
      sidebarPanDidDragRef.current = false;
      return;
    }
    sidebarFeedScrollLockedRef.current = false;
    if (videos.length > 0) {
      feedListRef.current?.setNativeProps?.({scrollEnabled: true});
    }
    requestAnimationFrame(() => {
      sidebarPanDidDragRef.current = false;
    });
  }, [videos.length]);

  const handleSidebarTouchEnd = useCallback(() => {
    if (sidebarPanActiveRef.current) return;
    if (sidebarPendingTapRef.current && !sidebarPanDidDragRef.current) {
      flushSidebarPendingTapRef.current();
    }
    unlockFeedScrollForSidebar();
  }, [unlockFeedScrollForSidebar]);

  const sidebarPanResponder = useMemo(
    () => {
      const dragThreshold = Platform.OS === 'web' ? 5 : 4;
      const shouldSidebarDrag = gestureState => {
        const {dy, dx} = gestureState;
        return (
          Math.abs(dy) > dragThreshold &&
          Math.abs(dy) > Math.abs(dx) * 0.45
        );
      };
      const clampSidebarDragY = (baseY, dy) =>
        Math.max(
          SIDEBAR_DRAG_MAX_UP,
          Math.min(SIDEBAR_DRAG_MAX_DOWN, baseY + dy),
        );
      const noteSidebarDragMove = gestureState => {
        if (!shouldSidebarDrag(gestureState)) return;
        sidebarPanDidDragRef.current = true;
        sidebarPendingTapRef.current = null;
      };

      return PanResponder.create({
        // Only capture after vertical movement — taps on + / profile / filters still work.
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !sidebarBlockPanRef.current && shouldSidebarDrag(gestureState),
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          !sidebarBlockPanRef.current && shouldSidebarDrag(gestureState),
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => sidebarPanDidDragRef.current,
        onPanResponderGrant: () => {
          sidebarPanActiveRef.current = true;
          sidebarPanDidDragRef.current = false;
          setSidebarSlideshowPaused(true);
          lockFeedScrollForSidebar();
          if (!sidebarIntroDone.current) {
            sidebarIntroDone.current = true;
            sidebarIntroAnimStarted.current = true;
            sidebarIntroHoldApplied.current = true;
            sidebarIntroFinishedRef.current = true;
            setSidebarIntroFinished(true);
            stopSidebarIntroAnimation();
          }
          const syncPanStart = value => {
            const base = Number.isFinite(value)
              ? value
              : sidebarDragOffset.current;
            const clamped = Math.max(
              SIDEBAR_DRAG_MAX_UP,
              Math.min(SIDEBAR_DRAG_MAX_DOWN, base),
            );
            sidebarPanStartYRef.current = clamped;
            sidebarDragOffset.current = clamped;
            sidebarDragY.setValue(clamped);
          };
          syncPanStart(sidebarDragOffset.current);
          sidebarDragY.stopAnimation(syncPanStart);
        },
        onPanResponderMove: (_, gestureState) => {
          noteSidebarDragMove(gestureState);
          if (sidebarPanActiveRef.current) {
            sidebarDragY.setValue(
              clampSidebarDragY(sidebarPanStartYRef.current, gestureState.dy),
            );
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          noteSidebarDragMove(gestureState);
          const next = clampSidebarDragY(
            sidebarPanStartYRef.current,
            gestureState.dy,
          );
          sidebarDragOffset.current = next;
          sidebarDragY.setValue(next);
          sidebarPanActiveRef.current = false;
          if (!sidebarPanDidDragRef.current) {
            flushSidebarPendingTapRef.current();
          }
          unlockFeedScrollForSidebar();
        },
        onPanResponderTerminate: (_, gestureState) => {
          noteSidebarDragMove(gestureState);
          const next = clampSidebarDragY(
            sidebarPanStartYRef.current,
            gestureState.dy,
          );
          sidebarDragOffset.current = next;
          sidebarDragY.setValue(next);
          sidebarPanActiveRef.current = false;
          unlockFeedScrollForSidebar();
        },
      });
    },
    [
      sidebarDragY,
      SIDEBAR_DRAG_MAX_DOWN,
      SIDEBAR_DRAG_MAX_UP,
      lockFeedScrollForSidebar,
      unlockFeedScrollForSidebar,
      stopSidebarIntroAnimation,
    ],
  );

  const currentVideo = videos[currentIndex] || null;
  const sidebarProfileUrl = getListingFeedAvatarUrl(currentVideo);
  const sidebarViewerSubId = resolveFollowUuid(
    currentUser?.subscription_id,
    currentUser?.owner_id,
    currentUser?.id,
  );
  const sidebarViewerEmail = currentUser?.email
    ? String(currentUser.email).trim().toLowerCase()
    : '';
  const sidebarTargetSubId = resolveListingFollowTargetId(currentVideo);

  const shouldShowFollowPlusForVideo = useCallback(
    video => {
      if (!video) return false;
      if (!isFollowableListing(video)) return false;
      const targetSubId = resolveListingFollowTargetId(video);
      const targetEmail = video?.creator_email
        ? String(video.creator_email).trim().toLowerCase()
        : '';
      const isSelf =
        (!!sidebarViewerSubId &&
          !!targetSubId &&
          String(sidebarViewerSubId) === String(targetSubId)) ||
        (!!sidebarViewerEmail &&
          !!targetEmail &&
          sidebarViewerEmail === targetEmail);
      if (isSelf) return false;
      if (!targetSubId && !targetEmail) return false;
      if (isGuest) return true;
      if (!targetSubId && getListingFollowTargetKeys(video).length === 0) {
        return false;
      }
      const followRow = getFollowRowForVideo(followStatusByTargetId, video);
      if (!followRow) return true;
      return !followRow.is_following && !followRow.has_pending_request;
    },
    [
      sidebarViewerSubId,
      sidebarViewerEmail,
      isGuest,
      followStatusByTargetId,
    ],
  );
  const tikTokSheetListingCategoryNum =
    selectedCategory != null && selectedCategory !== ''
      ? parseInt(String(selectedCategory).trim(), 10)
      : NaN;
  /** Listing row in feed compose sheet — same rules as Edit/Publish (no BnB/שותפים ads for brokers/marketers). */
  const showListingPublishInTikTokSheet = useMemo(() => {
    if (isGuest) {
      const n = tikTokSheetListingCategoryNum;
      return Number.isFinite(n) && n === 5;
    }
    return canShowListingAdInCreateSheet(
      currentUser?.subscription_type,
      tikTokSheetListingCategoryNum,
    );
  }, [currentUser?.subscription_type, tikTokSheetListingCategoryNum, isGuest]);

  const showOpenHousePublishInTikTokSheet = useMemo(
    () => canCreateOpenHousePost(currentUser),
    [currentUser],
  );

  const listingSheetCopy = useMemo(
    () =>
      getListingSheetCopy(selectedCategory, currentUser?.subscription_type),
    [selectedCategory, currentUser?.subscription_type],
  );

  useEffect(() => {
    let cancelled = false;
    if (
      isGuest ||
      !sidebarViewerSubId ||
      !sidebarTargetSubId ||
      sidebarViewerSubId === sidebarTargetSubId ||
      followStatusByTargetId[String(sidebarTargetSubId)] != null
    ) {
      return undefined;
    }
    getFollowStatus(sidebarViewerSubId, sidebarTargetSubId)
      .then(data => {
        if (cancelled) return;
        setFollowStatusByTargetId(prev => ({
          ...prev,
          [String(sidebarTargetSubId)]: {
            is_following: !!data?.is_following,
            has_pending_request: !!data?.has_pending_request,
          },
        }));
        bumpFollowUiRevision();
      })
      .catch(() => {
        if (cancelled) return;
        setFollowStatusByTargetId(prev => ({
          ...prev,
          [String(sidebarTargetSubId)]: defaultFollowStatusEntry(),
        }));
        bumpFollowUiRevision();
      });
    return () => {
      cancelled = true;
    };
  }, [
    isGuest,
    sidebarViewerSubId,
    sidebarTargetSubId,
    followStatusByTargetId,
    bumpFollowUiRevision,
  ]);

  const resolveFollowUuidFromEmail = async email => {
    const normalized = email ? String(email).trim().toLowerCase() : '';
    if (!normalized) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
    try {
      const data = await getCurrentUser(normalized, null);
      return toSubscriptionId(
        data?.subscription?.id ||
          data?.subscription?.subscription_id ||
          data?.subscription?.owner_id ||
          null,
      );
    } catch (_) {
      return null;
    }
  };

  const handleSidebarFollowRequest = useCallback(
    async video => {
      if (sidebarSendingFollow) return false;
      if (!video) return false;
      if (!isFollowableListing(video)) return false;
      if (!currentUser || !String(currentUser?.email || '').trim()) {
        if (typeof onOpenUserRegistration === 'function') {
          onOpenUserRegistration();
        }
        return false;
      }

      const targetSubId = resolveListingFollowTargetId(video);
      const targetEmail = video?.creator_email
        ? String(video.creator_email).trim().toLowerCase()
        : '';

      setFollowStatusByTargetId(prev =>
        patchFollowStatusForVideo(prev, video, {
          is_following: false,
          has_pending_request: true,
        }),
      );
      bumpFollowUiRevision();

      setSidebarSendingFollow(true);
      try {
        let requesterId = sidebarViewerSubId;
        let targetId = targetSubId;

        if (!requesterId) {
          requesterId = await resolveFollowUuidFromEmail(sidebarViewerEmail);
        }
        if (!requesterId && sidebarViewerEmail) {
          const reg = await registerRegularUser({
            email: sidebarViewerEmail,
            name: currentUser?.name || null,
            phone: currentUser?.phone || null,
            profilePictureUrl:
              currentUser?.profile_picture_url ||
              currentUser?.company_logo_url ||
              null,
          });
          const newId = reg?.subscription?.id || null;
          if (newId) {
            requesterId = toSubscriptionId(newId) || null;
          }
        }

        if (!targetId) {
          targetId = await resolveFollowUuidFromEmail(targetEmail);
        }
        if (!requesterId || !targetId || requesterId === targetId) {
          throw new Error('missing follow ids');
        }

        const result = await sendFollowRequest(requesterId, targetId);
        setFollowStatusByTargetId(prev =>
          patchFollowStatusForVideo(
            prev,
            video,
            {
              is_following: !!result?.already_following,
              has_pending_request: !result?.already_following,
            },
            [targetId],
          ),
        );
        bumpFollowUiRevision();
        return true;
      } catch (err) {
        setFollowStatusByTargetId(prev =>
          patchFollowStatusForVideo(prev, video, defaultFollowStatusEntry()),
        );
        bumpFollowUiRevision();
        if (__DEV__) {
          console.warn(
            '[TikTokFeedScreen] follow request failed:',
            err?.message || err,
          );
        }
        return false;
      } finally {
        setSidebarSendingFollow(false);
      }
    },
    [
      sidebarSendingFollow,
      currentUser,
      sidebarViewerSubId,
      sidebarViewerEmail,
      onOpenUserRegistration,
      bumpFollowUiRevision,
    ],
  );

  const markSidebarPendingTap = useCallback(tap => {
    sidebarPendingTapRef.current = tap;
  }, []);

  const flushSidebarPendingTap = useCallback(() => {
    const tap = sidebarPendingTapRef.current;
    sidebarPendingTapRef.current = null;
    if (!tap || sidebarPanDidDragRef.current) return;

    if (tap.type === 'filter' && tap.id) {
      return;
    }

    if (videos.length === 0 && !loadingListings) return;

    const video = activeSidebarVideoRef.current;
    if (tap.type === 'profile') {
      if (!video) {
        onOpenUserProfile?.(null);
        return;
      }
      onOpenUserProfile?.({...video, _fromTikTokPost: true});
      return;
    }
    if (tap.type === 'follow') {
      if (sidebarSendingFollow) return;
      handleSidebarFollowRequest(video);
    }
  }, [
    videos.length,
    loadingListings,
    sidebarSendingFollow,
    handleSidebarFollowRequest,
    onOpenUserProfile,
  ]);

  useEffect(() => {
    flushSidebarPendingTapRef.current = flushSidebarPendingTap;
  }, [flushSidebarPendingTap]);

  const bottomBarSource = isLandCategory
    ? require('../assets/lands/Frame 2 (2).png')
    : isPartnersCategory
      ? require('../assets/par/Frame 2 (3).png')
      : require('../assets/bottom-bar-new.png');
  function isPostVideo(video) {
    if (!video) return false;
    const type = String(
      video.propertyType ||
        video.propertyTypeRaw ||
        video.apartmentTypeId ||
        '',
    ).toLowerCase();
    const imageUris = Array.isArray(video.images)
      ? video.images.map(img => String(img?.uri || ''))
      : [];
    const mediaUris = [...imageUris, String(video.video?.uri || '')].filter(
      Boolean,
    );
    const hasPostMediaMarker = mediaUris.some(url =>
      /(?:^|[-_/])post(?:[-_/]|\.|$)/i.test(url),
    );
    return (
      type === 'post' ||
      type === 'posts' ||
      type === 'feed_post' ||
      type.includes('post') ||
      video.feed_post === true ||
      video.isTextOnlyPost === true ||
      video.isPostEntry === true ||
      hasPostMediaMarker
    );
  }
  const getVideoOverlayMeta = video => {
    if (!video) {
      return {
        isPostListing: false,
        isOpenHousePost: false,
        openHouseOverlayText: '',
        isCompanyListing: false,
        isCompanyLandListing: false,
        showBrokerStylePropertyOverlay: false,
        isBnbListing: false,
        isPartnersListing: false,
        isBnbHotDeal: false,
        brokerPurposeText: 'למכירה',
        brokerLocationText: 'מיקום לא זמין',
        companyLandLocationText: 'מיקום לא זמין',
        brokerPriceText: '₪0',
        partnersPurposeText: 'מחפש להכניס',
        partnersDisplayName: 'משתמש',
        bnbTypeTagText: 'וילה',
        bnbTitleText: 'ללא תיאור',
        companyPrimaryAddress: '',
        companySecondaryAddress: '',
        companyBuildingsCount: 1,
        companyFloorsCount: 0,
        companyApartmentsCount: 0,
      };
    }
    const isPostListing = isPostVideo(video);
    const isOpenHousePost =
      isPostListing && isOpenHouseListing(video);
    const openHouseDetails = isOpenHousePost
      ? getOpenHouseDetailsFromListing(video)
      : null;
    const isCompanyListing =
      !isPostListing &&
      isCompanySubscriptionType(video.subscription_type);
    const isCompanyLandListing =
      isCompanyListing && Number(video?.category) === 7;
    const isBrokerListing =
      !isPostListing &&
      isBrokerLikeSubscriptionType(video.subscription_type);
    const isUserPropertyListing =
      !isPostListing &&
      String(video.subscription_type || '').toLowerCase() ===
        subscriptionTypes.user;
    const showBrokerStylePropertyOverlay =
      isBrokerListing || isUserPropertyListing;
    const isBnbListing = !isPostListing && Number(video?.category) === 5;
    const isPartnersListing = !isPostListing && Number(video?.category) === 3;
    const isBnbHotDeal =
      video?.hotDeal === true ||
      video?.hotDeal === 'true' ||
      video?.hot_deal === true ||
      video?.hot_deal === 'true' ||
      video?.hot_deal === 't' ||
      video?.hot_deal === 1;
    const brokerPurposeText = String(
      video?.purpose || video?.searchPurpose || 'למכירה',
    ).trim();
    const brokerLocationText = String(
      video?.address || 'מיקום לא זמין',
    ).trim();
    const companyLandLocationText = String(
      video?.location ||
        video?.land_address ||
        video?.address ||
        'מיקום לא זמין',
    ).trim();
    const brokerPriceText = (() => {
      const explicit = String(video?.price || '').trim();
      if (explicit) return explicit;
      const raw = Number(
        video?.rawPrice ??
          video?.price_raw ??
          video?.price_value ??
          video?.price ??
          0,
      );
      if (Number.isFinite(raw) && raw > 0) return formatShekelPrice(raw);
      return '₪0';
    })();
    const partnersPurposeText = String(
      video?.searchPurpose || 'מחפש להכניס',
    ).trim();
    const partnersDisplayName = String(
      video?.creator_name ||
        video?.creatorName ||
        video?.creator_full_name ||
        video?.full_name ||
        video?.name ||
        'משתמש',
    ).trim();
    const bnbTypeTagText = (() => {
      const map = {
        room: 'חדר',
        housing_unit: 'יחידת דיור',
        house: 'בית',
        'b&b': 'צימר',
        bnb: 'צימר',
        holiday_apartment: 'דירת נופש',
        villa: 'וילה',
        special: 'מיוחדים',
        rural: 'כפרי',
        experiences: 'חוויות',
        landscapes: 'נופים',
        nature: 'טבע',
        desert: 'מדבר',
        on_the_beach: 'על הים',
        with_pool: 'עם בריכה',
        apartment: 'דירה',
        private: 'בית פרטי',
        penthouse: 'פנטהאוז',
      };
      const candidates = [
        video?.property_type,
        video?.apartmentTypeId,
        video?.apartment_type,
        video?.preferred_apartment_type,
        video?.bnbType,
        video?.apartmentType,
      ];
      for (const candidate of candidates) {
        const raw = String(candidate || '')
          .trim()
          .toLowerCase();
        if (map[raw]) return map[raw];
      }
      return 'וילה';
    })();
    const bnbTitleText = String(video?.description || 'ללא תיאור').trim();
    const companyAddressLines = isCompanyListing
      ? String(video?.location || video?.address || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : [];
    const companyPrimaryAddress = companyAddressLines[0] || '';
    const companySecondaryAddress = companyAddressLines.slice(1).join(', ');
    const companyBuildingsCount = Math.max(
      1,
      Number(video?.companyBuildingCount) || 1,
    );
    const companyFloorsCount = Math.max(
      0,
      Number(video?.companyFloorCount) || 0,
    );
    const companyApartmentsCount = Math.max(
      0,
      Number(video?.companyApartmentCount) || 0,
    );
    return {
      isPostListing,
      isOpenHousePost,
      openHouseOverlayText: openHouseDetails
        ? formatOpenHouseOverlayText(
            openHouseDetails.place,
            openHouseDetails.date,
          )
        : '',
      isCompanyListing,
      isCompanyLandListing,
      showBrokerStylePropertyOverlay,
      isBnbListing,
      isPartnersListing,
      isBnbHotDeal,
      brokerPurposeText,
      brokerLocationText,
      companyLandLocationText,
      brokerPriceText,
      partnersPurposeText,
      partnersDisplayName,
      bnbTypeTagText,
      bnbTitleText,
      companyPrimaryAddress,
      companySecondaryAddress,
      companyBuildingsCount,
      companyFloorsCount,
      companyApartmentsCount,
    };
  };

  const activeCommentsVideo = activeCommentsPostId
    ? buildCommentsPostContext(
        activeCommentsPostId,
        dbListings,
        videos,
        currentUser,
      )
    : null;
  const currentComments = annotatePostCommentsForPost(
    commentsByPost[activeCommentsPostId] || [],
    activeCommentsVideo,
    currentUser,
  );
  const getDisplayedCommentCount = listing => {
    if (!listing?.id) return 0;
    const serverCount = Number(listing.comment_count || 0);
    const loadedCount = Array.isArray(commentsByPost[listing.id])
      ? commentsByPost[listing.id].length
      : 0;
    return Math.max(serverCount, loadedCount);
  };
  const userSearchSourceListings =
    showUserSearchPanel && allUsersSearchListings.length > 0
      ? allUsersSearchListings
      : dbListings;

  const userSearchItems = useMemo(() => {
    const normalizeList = value => {
      if (Array.isArray(value))
        return value.map(v => String(v || '').trim()).filter(Boolean);
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed.map(v => String(v || '').trim()).filter(Boolean);
          }
        } catch (_) {
          // keep fallback split below
        }
        return value
          .split(',')
          .map(v => String(v || '').trim())
          .filter(Boolean);
      }
      return [];
    };
    const getSubtitle = listing => {
      const specialties = normalizeList(listing?.creator_specialties);
      const creatorTypes = normalizeList(listing?.creator_types);
      if (specialties[0]) return specialties[0];
      if (creatorTypes[0]) return creatorTypes[0];
      const subType = String(listing?.subscription_type || '').toLowerCase();
      if (subType === subscriptionTypes.company) return 'חברה';
      if (isBrokerLikeSubscriptionType(subType)) return 'תיווך';
      if (subType === subscriptionTypes.professional) return 'נותן שירות';
      return 'משתמש';
    };

    const byKey = new Map();
    (userSearchSourceListings || []).forEach(listing => {
      const keyRaw =
        listing?.subscription_id ||
        listing?.owner_id ||
        listing?.creator_email ||
        listing?.creator_name;
      const name = String(listing?.creator_name || '').trim();
      if (!keyRaw || !name) return;
      const key = String(keyRaw).toLowerCase();
      const existing = byKey.get(key);
      const avatar =
        getUserProfileImageUrl(listing) ||
        listing?.profileImageUrl ||
        listing?.creator_profile_image_url ||
        listing?.profile_image_url ||
        null;
      const subtitle = getSubtitle(listing);
      if (!existing) {
        byKey.set(key, {
          key,
          name,
          subtitle,
          avatar,
          count: 1,
          ratingTargetId: listing?.subscription_id || listing?.owner_id || null,
          listing,
        });
        return;
      }
      existing.count += 1;
      if (
        (!existing.avatar || failedSearchAvatarKeys.has(existing.key)) &&
        avatar
      ) {
        existing.avatar = avatar;
      }
      if ((!existing.subtitle || existing.subtitle === 'משתמש') && subtitle) {
        existing.subtitle = subtitle;
      }
      if (!existing.ratingTargetId) {
        const tid = listing?.subscription_id || listing?.owner_id;
        if (tid) {
          existing.ratingTargetId = tid;
        }
      }
    });

    const q = String(userSearchQuery || '')
      .trim()
      .toLowerCase();
    const items = [...byKey.values()]
      .filter(item => {
        if (!q) return true;
        return (
          String(item.name || '')
            .toLowerCase()
            .includes(q) ||
          String(item.subtitle || '')
            .toLowerCase()
            .includes(q)
        );
      })
      .sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), 'he'),
      );
    return items;
  }, [userSearchSourceListings, userSearchQuery, failedSearchAvatarKeys]);

  /** Distinct hashtags (with post counts) across all loaded listings, filtered by the query. */
  const hashtagItems = useMemo(() => {
    const counts = new Map();
    (userSearchSourceListings || []).forEach(listing => {
      getListingHashtags(listing).forEach(tag => {
        const key = tag.toLowerCase();
        const existing = counts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(key, {tag, count: 1});
        }
      });
    });
    const q = String(userSearchQuery || '')
      .trim()
      .replace(/^#+/, '')
      .toLowerCase();
    return [...counts.values()]
      .filter(it => !q || it.tag.toLowerCase().includes(q))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'he'));
  }, [userSearchSourceListings, userSearchQuery]);

  /** Listings tagged with the currently selected hashtag (explore grid source). */
  const hashtagPosts = useMemo(() => {
    if (!selectedHashtag) return [];
    const tag = String(selectedHashtag).trim().toLowerCase();
    return (userSearchSourceListings || []).filter(listing =>
      getListingHashtags(listing).some(t => t.toLowerCase() === tag),
    );
  }, [userSearchSourceListings, selectedHashtag]);

  const loadRecentUserSearches = async () => {
    const email = currentUser?.email;
    if (!email) return;
    try {
      const res = await getRecentUserSearches(email);
      const list = Array.isArray(res?.recent) ? res.recent : [];
      setRecentSearches(list);
    } catch (e) {
      console.warn('loadRecentUserSearches failed:', e?.message);
    }
  };

  const handleClearRecentSearches = async () => {
    const email = currentUser?.email;
    if (!email) return;
    setRecentSearches([]);
    try {
      await clearRecentUserSearches(email);
    } catch (e) {
      console.warn('clearRecentUserSearches failed:', e?.message);
    }
  };

  const loadAllUsersForSearch = async () => {
    try {
      const userId = currentUser?.id != null ? String(currentUser.id) : null;
      const result = await getListings({
        status: 'published',
        ...(userId ? {user_id: userId} : {}),
      });
      const fullList = Array.isArray(result?.listings) ? result.listings : [];
      if (fullList.length > 0) {
        setAllUsersSearchListings(fullList);
      }
    } catch (e) {
      console.warn('Failed loading all users for search:', e?.message || e);
    }
  };

  const preloadUserRatingsForTargets = async (
    targets,
    listingByTargetId = {},
  ) => {
    if (!Array.isArray(targets) || targets.length === 0) return;
    for (const rawId of targets) {
      const profileId =
        typeof rawId === 'string' ? rawId.trim() : String(rawId || '');
      if (!profileId) continue;
      if (userRatingPreloadedIdsRef.current.has(profileId)) continue;
      userRatingPreloadedIdsRef.current.add(profileId);
      const listing = listingByTargetId[profileId] || {};
      if (!shouldShowListingPiRating(listing)) continue;
      try {
        const res = await getReviews(profileId);
        const rows = Array.isArray(res?.reviews) ? res.reviews : [];
        const v = displayPiRatingFromReviews(rows, listing);
        setUserRatingByProfileId(prev => ({...prev, [profileId]: v}));
      } catch (_) {
        const v = brokerPiRatingFromListing(listing);
        setUserRatingByProfileId(prev => ({...prev, [profileId]: v}));
      }
    }
  };

  const preloadUserRatingsForSearch = async () => {
    const byId = new Map();
    (userSearchItems || []).forEach(item => {
      const tid =
        item?.ratingTargetId ||
        item?.listing?.subscription_id ||
        item?.listing?.owner_id ||
        null;
      if (!tid || typeof tid !== 'string' || tid.trim() === '') return;
      const listing =
        item?.listing ||
        (item?.recentSubscriptionType
          ? {subscription_type: item.recentSubscriptionType}
          : null);
      if (listing && !shouldShowListingPiRating(listing)) return;
      if (!byId.has(tid)) {
        byId.set(tid, item?.listing || {subscription_type: item.recentSubscriptionType});
      }
    });
    const targets = [...byId.keys()];
    const listingByTargetId = Object.fromEntries(byId);
    await preloadUserRatingsForTargets(targets, listingByTargetId);
  };

  useEffect(() => {
    if (!userSearchOpenTrigger) return;
    setFailedSearchAvatarKeys(new Set());
    setUserSearchQuery('');
    setSelectedHashtag(null);
    setShowUserSearchPanel(true);
    loadAllUsersForSearch();
    preloadUserRatingsForSearch();
    loadRecentUserSearches();
  }, [userSearchOpenTrigger]);

  // Full published listing set: re-fetch average Pi so `pi_value` fallback matches profile/cards
  // (first pass may have used a thinner `dbListings` row with no `pi_value`).
  useEffect(() => {
    if (!showUserSearchPanel || allUsersSearchListings.length === 0) {
      return;
    }
    const byTarget = new Map();
    for (const listing of allUsersSearchListings) {
      const tid = listing?.subscription_id || listing?.owner_id;
      if (!tid || String(tid).trim() === '') {
        continue;
      }
      if (!byTarget.has(tid)) {
        byTarget.set(tid, listing);
      }
    }
    if (byTarget.size === 0) {
      return;
    }
    for (const tid of byTarget.keys()) {
      userRatingPreloadedIdsRef.current.delete(tid);
    }
    const targets = [...byTarget.keys()];
    const listingByTargetId = Object.fromEntries(byTarget);
    void preloadUserRatingsForTargets(targets, listingByTargetId);
  }, [showUserSearchPanel, allUsersSearchListings]);

  // "אחרונים": same average as on profile; broker Pi defaults when allUsers has not loaded yet.
  useEffect(() => {
    if (!showUserSearchPanel) {
      return;
    }
    if (!Array.isArray(recentSearches) || recentSearches.length === 0) {
      return;
    }
    const listingBy = Object.fromEntries(
      recentSearches
        .map(r => {
          const id =
            r?.target_subscription_id != null
              ? String(r.target_subscription_id).trim()
              : '';
          if (!id) return null;
          return [
            id,
            {subscription_type: r.subscription_type, pi_value: undefined},
          ];
        })
        .filter(Boolean),
    );
    const targets = Object.keys(listingBy);
    if (targets.length === 0) {
      return;
    }
    void preloadUserRatingsForTargets(targets, listingBy);
  }, [showUserSearchPanel, recentSearches]);

  const showInitialLoading =
    loadingListings && dbListings.length === 0 && videos.length === 0;
  const showDistanceFilterLoading =
    distanceFilterActive &&
    (!userCoordsReady || (!!userCoords && !distanceCalcReady));
  const distanceFilterLoadingText = !userCoordsReady
    ? 'מאתרים את המיקום שלך...'
    : 'מחשבים מרחקים לפי הסינון...';
  const showFeedLoading = showInitialLoading || showDistanceFilterLoading;
  const feedIsEmpty = videos.length === 0 && !showFeedLoading;

  const renderFeedLoadingBody = (message = 'טוען רשימות...') => (
    <>
      <ActivityIndicator size="large" color={Colors.yellowIcons} />
      <Text style={styles.feedLoadingText}>{message}</Text>
    </>
  );

  const renderEmptyCategoryBody = () => {
    if (listingsError) {
      return (
        <View style={styles.feedEmptyCard}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={48}
            color={Colors.yellowIcons}
            style={styles.feedEmptyIcon}
          />
          <Text style={styles.feedEmptyTitle}>שגיאה בטעינת הרשימות</Text>
          <Text style={styles.feedEmptySubtitle}>
            לא הצלחנו לטעון את המודעות. נסו שוב בעוד רגע.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setListingsError(null);
              setRefreshKey(k => k + 1);
            }}
            style={styles.feedEmptyActionBtn}
            activeOpacity={0.85}>
            <Text style={styles.feedEmptyActionText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const filtersActive =
      !isProfilePostsFeed &&
      (hasActiveFeedFilters(feedFilters) ||
        (dbListings.length > 0 && uploadedVideos.length === 0));

    return (
      <View style={styles.feedEmptyCard}>
        <View style={styles.feedEmptyIconWrap}>
          <MaterialCommunityIcons
            name="filter-off-outline"
            size={36}
            color={Colors.yellowIcons}
          />
        </View>
        <Text style={styles.feedEmptyTitle}>
          לא נמצאו מודעות שעומדות בקריטריונים שבחרתם
        </Text>
        <Text style={styles.feedEmptySubtitle}>
          {filtersActive
            ? 'נסו לשנות את הסינון, להרחיב את טווח המרחק, או לאפס את הפילטרים.'
            : 'אין מודעות להצגה בקטגוריה זו כרגע. חזרו מאוחר יותר.'}
        </Text>
      </View>
    );
  };

  const feedPageDimensions = {
    height: feedPageHeight,
    minHeight: feedPageHeight,
    maxHeight: feedPageHeight,
  };

  const renderFeedPageSidebarContent = (
    video,
    pageProfileUrl,
    isActivePage,
    sidebarDragMode = false,
  ) => (
    <>
      <View style={styles.sidebarProfileWrap}>
        {sidebarDragMode ? (
          <View
            style={styles.sidebarProfileAvatarBtn}
            onTouchStart={() => markSidebarPendingTap({type: 'profile'})}
            onLayout={
              isActivePage
                ? event => {
                    const h = event?.nativeEvent?.layout?.height;
                    if (h > 0) setSidebarProfileHeight(h);
                  }
                : undefined
            }>
            <ProfileAvatar
              uri={pageProfileUrl}
              size={60}
              subscriptionType={video}
              forceGoldRing={shouldForceGoldRingForListing(video)}
            />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.sidebarProfileAvatarBtn}
            onPress={() => {
              if (!video) return;
              onOpenUserProfile?.({...video, _fromTikTokPost: true});
            }}
            activeOpacity={!video ? 1 : 0.8}
            disabled={!video}
            onLayout={
              isActivePage
                ? event => {
                    const h = event?.nativeEvent?.layout?.height;
                    if (h > 0) setSidebarProfileHeight(h);
                  }
                : undefined
            }>
            <ProfileAvatar
              uri={pageProfileUrl}
              size={60}
              subscriptionType={video}
              forceGoldRing={shouldForceGoldRingForListing(video)}
            />
          </TouchableOpacity>
        )}
        {shouldShowFollowPlusForVideo(video) ||
        (resolveListingFollowTargetId(video) &&
          followPlusAnimatingIds[
            String(resolveListingFollowTargetId(video))
          ]) ? (
          <FollowPlusBadge
            style={styles.sidebarFollowBadge}
            iconSize={16}
            onPressIn={() => {
              sidebarBlockPanRef.current = true;
            }}
            onPressOut={() => {
              sidebarBlockPanRef.current = false;
            }}
            beforePress={() => {
              if (!currentUser || !String(currentUser?.email || '').trim()) {
                if (typeof onOpenUserRegistration === 'function') {
                  onOpenUserRegistration();
                }
                return false;
              }
              const targetId = resolveListingFollowTargetId(video);
              if (targetId) {
                setFollowPlusAnimatingIds(prev => ({
                  ...prev,
                  [String(targetId)]: true,
                }));
                bumpFollowUiRevision();
              }
              return true;
            }}
            onPress={() => handleSidebarFollowRequest(video)}
            onAnimationComplete={() => {
              const targetId = resolveListingFollowTargetId(video);
              if (!targetId) return;
              setFollowPlusAnimatingIds(prev => {
                const next = {...prev};
                delete next[String(targetId)];
                return next;
              });
              bumpFollowUiRevision();
            }}
            disabled={!video || sidebarSendingFollow}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          />
        ) : null}
      </View>
      {!isProfilePostsFeed ? (
      <View style={styles.sidebarFiltersStack}>
      {sidebarFiltersForFeed.map((filter, filterIndex) => {
        const isSelected = selectedSidebarFilter === filter.id;
        const labelText = String(filter.label || '');
        const allowSidebarLabelWrap = isPartnersCategory;
        const truncateSidebarLabel = isBnbCategory;
        const displaySidebarLabel = truncateSidebarLabel
          ? truncateTikTokLabel(labelText)
          : labelText;
        const nextFilter = sidebarFiltersForFeed[filterIndex + 1];
        const partnersTightStack =
          isPartnersCategory &&
          filter.id === 'partners_posts' &&
          nextFilter?.id === 'partners_professional';
        const filterLayoutHandler = isActivePage
          ? event => {
              const layout = event?.nativeEvent?.layout;
              if (!layout) return;
              const {y, height} = layout;
              if (
                !Number.isFinite(y) ||
                !Number.isFinite(height) ||
                height <= 0
              )
                return;
              if (filterIndex === 0) setSidebarFilterHeight(height);
              setSidebarFilterLayouts(prev => {
                const existing = prev[filterIndex];
                if (
                  existing &&
                  existing.y === y &&
                  existing.height === height
                ) {
                  return prev;
                }
                return {...prev, [filterIndex]: {y, height}};
              });
            }
          : undefined;
        const filterInner = (
          <>
            {filter.svg ? (
              <SvgXml
                xml={getCachedSvgXml(
                  filter.svg,
                  isSelected ? '#FFC40A' : '#FFFFFF',
                )}
                width={32}
                height={32}
                style={styles.sidebarFilterIcon}
              />
            ) : (
              <Image
                source={filter.icon}
                style={[
                  styles.sidebarFilterIcon,
                  isSelected && styles.filterIconSelectedTint,
                ]}
                resizeMode="contain"
              />
            )}
            <Text
              numberOfLines={allowSidebarLabelWrap ? 2 : 1}
              ellipsizeMode={allowSidebarLabelWrap ? 'clip' : 'tail'}
              adjustsFontSizeToFit={
                !allowSidebarLabelWrap && !truncateSidebarLabel
              }
              minimumFontScale={allowSidebarLabelWrap ? 1 : 0.72}
              style={[
                styles.sidebarFilterLabel,
                truncateSidebarLabel && styles.sidebarFilterLabelBnb,
                allowSidebarLabelWrap && styles.sidebarFilterLabelWrap,
                isSelected && styles.sidebarFilterLabelSelected,
              ]}>
              {displaySidebarLabel}
            </Text>
          </>
        );
        if (sidebarDragMode) {
          return (
            <Pressable
              key={filter.id}
              style={[
                styles.sidebarFilterBtn,
                partnersTightStack && styles.sidebarFilterBtnPartnersTight,
              ]}
              onPress={() => {
                if (sidebarPanDidDragRef.current) return;
                setSelectedSidebarFilter(prev =>
                  prev === filter.id ? null : filter.id,
                );
              }}
              onLayout={filterLayoutHandler}>
              {filterInner}
            </Pressable>
          );
        }
        return (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.sidebarFilterBtn,
              partnersTightStack && styles.sidebarFilterBtnPartnersTight,
            ]}
            onPress={() => {
              setSelectedSidebarFilter(prev =>
                prev === filter.id ? null : filter.id,
              );
            }}
            activeOpacity={0.7}
            onLayout={filterLayoutHandler}>
            {filterInner}
          </TouchableOpacity>
        );
      })}
      </View>
      ) : null}
    </>
  );

  const renderFeedPageSidebar = (video, index) => {
    const isActivePage = index === currentIndex;
    const introRunning = !isProfilePostsFeed && !sidebarIntroDone.current;
    const yRest = sidebarIntroTopTwoOnlyDown;
    const pageProfileUrl =
      getListingFeedAvatarUrl(video) ||
      (isProfilePostsFeed ? profilePostsScope?.profileImageUrl : null);
    const sidebarDragMode = isActivePage && !isProfilePostsFeed;

    // Preloaded pages below the first: always draw the final 4-filter pose so
    // swiping during the page-0 intro shows the sidebar instantly.
    const renderStaticAtY = (translateY, {allowLayout = false} = {}) => (
      <View
        style={[
          styles.feedPageSidebar,
          styles.feedPageSidebarDrag,
          {bottom: feedChromeBottom},
        ]}
        pointerEvents={isActivePage ? 'auto' : 'none'}>
        <View
          style={[
            styles.sidebarImageWrap,
            {height: sidebarClipHeight, flex: 0},
            sidebarCollapsed && isActivePage && styles.sidebarImageWrapCollapsed,
          ]}>
          <View
            style={[
              styles.sidebarDragContent,
              {transform: [{translateY: translateY}]},
            ]}>
            {renderFeedPageSidebarContent(
              video,
              pageProfileUrl,
              allowLayout,
              false,
            )}
          </View>
        </View>
      </View>
    );

    if (introRunning && index > 0) {
      return renderStaticAtY(yRest);
    }

    if (introRunning && index === 0) {
      if (isActivePage) {
        activeSidebarVideoRef.current = video;
      }
      return (
        <View
          style={[
            styles.feedPageSidebar,
            styles.feedPageSidebarDrag,
            {bottom: feedChromeBottom},
          ]}
          pointerEvents={isActivePage ? 'auto' : 'none'}
          onTouchStart={isActivePage ? lockFeedScrollForSidebar : undefined}
          onTouchEnd={isActivePage ? handleSidebarTouchEnd : undefined}
          onTouchCancel={isActivePage ? handleSidebarTouchEnd : undefined}>
          <View
            style={[
              styles.sidebarImageWrap,
              {height: sidebarClipHeight, flex: 0},
              sidebarCollapsed &&
                isActivePage &&
                styles.sidebarImageWrapCollapsed,
              !sidebarIntroVisible && styles.sidebarIntroHidden,
            ]}
            onLayout={
              isActivePage
                ? event => {
                    const h = event?.nativeEvent?.layout?.height;
                    if (h > 0) setSidebarViewportHeight(Math.round(h));
                  }
                : undefined
            }>
            <Animated.View
              style={[
                styles.sidebarDragContent,
                {transform: [{translateY: sidebarDragY}]},
              ]}
              {...(isActivePage && !isProfilePostsFeed
                ? sidebarPanResponder.panHandlers
                : {})}>
              {renderFeedPageSidebarContent(
                video,
                pageProfileUrl,
                isActivePage,
                sidebarDragMode,
              )}
            </Animated.View>
          </View>
        </View>
      );
    }

    const inactiveSidebarY = isProfilePostsFeed
      ? sidebarIntroProfileOnlyDown
      : sidebarDragOffset.current;

    if (isActivePage) {
      activeSidebarVideoRef.current = video;
    }

    if (isActivePage) {
      return (
        <View
          style={[
            styles.feedPageSidebar,
            styles.feedPageSidebarDrag,
            {bottom: feedChromeBottom},
          ]}
          pointerEvents="auto"
          onTouchStart={lockFeedScrollForSidebar}
          onTouchEnd={handleSidebarTouchEnd}
          onTouchCancel={handleSidebarTouchEnd}>
          <View
            style={[
              styles.sidebarImageWrap,
              {height: sidebarClipHeight, flex: 0},
              sidebarCollapsed && styles.sidebarImageWrapCollapsed,
            ]}
            onLayout={event => {
              const h = event?.nativeEvent?.layout?.height;
              if (h > 0) setSidebarViewportHeight(Math.round(h));
            }}>
            <Animated.View
              style={[
                styles.sidebarDragContent,
                {transform: [{translateY: sidebarDragY}]},
              ]}
              {...(isProfilePostsFeed ? {} : sidebarPanResponder.panHandlers)}>
              {renderFeedPageSidebarContent(
                video,
                pageProfileUrl,
                true,
                sidebarDragMode,
              )}
            </Animated.View>
          </View>
        </View>
      );
    }

    return renderStaticAtY(
      Number.isFinite(inactiveSidebarY) ? inactiveSidebarY : yRest,
    );
  };

  /** Warm up final sidebar layout while listings load (invisible). */
  const renderSidebarWarmupAtRest = () => (
    <View
      style={[
        styles.feedPageSidebar,
        styles.feedPageSidebarDrag,
        styles.sidebarWarmupHidden,
        {bottom: feedChromeBottom},
      ]}
      pointerEvents="none">
      <View
        style={[
          styles.sidebarImageWrap,
          {height: sidebarClipHeight, flex: 0},
        ]}>
        <View
          style={[
            styles.sidebarDragContent,
            {transform: [{translateY: sidebarIntroTopTwoOnlyDown}]},
          ]}>
          {renderFeedPageSidebarContent(null, null, false, false)}
        </View>
      </View>
    </View>
  );

  const renderEmptyFeedSidebar = () => {
    activeSidebarVideoRef.current = null;
    return (
      <View
        style={[
          styles.feedPageSidebar,
          styles.feedPageSidebarDrag,
          {bottom: feedChromeBottom},
        ]}
        pointerEvents="auto"
        onTouchStart={lockFeedScrollForSidebar}
        onTouchEnd={handleSidebarTouchEnd}
        onTouchCancel={handleSidebarTouchEnd}>
        <View
          style={[
            styles.sidebarImageWrap,
            {height: sidebarClipHeight, flex: 0},
            sidebarCollapsed && styles.sidebarImageWrapCollapsed,
            !sidebarIntroVisible && styles.sidebarIntroHidden,
          ]}
          onLayout={event => {
            const h = event?.nativeEvent?.layout?.height;
            if (h > 0) setSidebarViewportHeight(Math.round(h));
          }}>
          <Animated.View
            style={[
              styles.sidebarDragContent,
              {transform: [{translateY: sidebarDragY}]},
            ]}
            {...(isProfilePostsFeed ? {} : sidebarPanResponder.panHandlers)}>
            {renderFeedPageSidebarContent(null, null, true, true)}
          </Animated.View>
        </View>
      </View>
    );
  };

  const renderFeedPageActionOverlay = video => {
    const o = getVideoOverlayMeta(video);
    const postHashtags = o.isPostListing ? getListingHashtags(video) : [];
    return (
      <View
        style={[styles.feedPageActions, {bottom: feedChromeBottom}]}
        pointerEvents="box-none">
        {o.isCompanyLandListing ? (
          <View style={styles.brokerOverlayInfo} pointerEvents="box-none">
            <View style={styles.brokerTopRow} pointerEvents="box-none">
              <TouchableOpacity
                style={[styles.actionIconButton, styles.brokerHeartButton]}
                onPress={() => toggleLiked(video)}>
                <TikTokHeartIcon
                  liked={isItemLiked(video)}
                  size={TIKTOK_OVERLAY_HEART_SIZE}
                  style={[
                    styles.overlayHeartIcon,
                    isItemLiked(video) && styles.actionIconLiked,
                  ]}
                />
              </TouchableOpacity>
              <View style={styles.brokerPurposePill}>
                <Text style={styles.brokerPurposeText}>{o.brokerPurposeText}</Text>
              </View>
            </View>
            <Text
              style={styles.brokerPriceText}
              numberOfLines={1}
              ellipsizeMode="tail"
              pointerEvents="none">
              {o.brokerPriceText}
            </Text>
            <View style={styles.brokerLocationRow} pointerEvents="box-none">
              <Image
                source={TIKTOK_OVERLAY_ICONS.location}
                style={styles.brokerLocationIcon}
                resizeMode="contain"
                pointerEvents="none"
              />
              <Text
                style={styles.brokerLocationText}
                numberOfLines={2}
                ellipsizeMode="tail"
                pointerEvents="none">
                {o.companyLandLocationText}
              </Text>
            </View>
          </View>
        ) : o.isCompanyListing ? (
          <View style={styles.companyOverlayInfo} pointerEvents="box-none">
            <View style={styles.companyTopRow} pointerEvents="box-none">
              {isPreSaleListing(video) ? (
                <Image
                  source={TIKTOK_OVERLAY_ICONS.preSaleBadge}
                  style={styles.companyPreSaleBadge}
                  resizeMode="contain"
                />
              ) : null}
              <TouchableOpacity
                style={[styles.actionIconButton, styles.companyHeartButton]}
                onPress={() => toggleLiked(video)}>
                <TikTokHeartIcon
                  liked={isItemLiked(video)}
                  size={TIKTOK_OVERLAY_HEART_SIZE}
                  style={[
                    styles.overlayHeartIcon,
                    isItemLiked(video) && styles.actionIconLiked,
                  ]}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.companyAddressWrap} pointerEvents="box-none">
              <Text
                style={styles.companyAddressText}
                numberOfLines={2}
                ellipsizeMode="tail"
                pointerEvents="none">
                {o.companyPrimaryAddress}
                {o.companySecondaryAddress ? `,\n${o.companySecondaryAddress}` : ''}
              </Text>
            </View>
            <View style={styles.companyStatsRow} pointerEvents="box-none">
              <View style={styles.companyStatItem}>
                <Text style={styles.companyStatText}>
                  {formatCompanyBuildingsLabel(o.companyBuildingsCount)}
                </Text>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.companyBuilding}
                  style={styles.companyStatIcon}
                />
              </View>
              <View style={styles.companyStatItem}>
                <Text style={styles.companyStatText}>
                  {formatCompanyFloorsLabel(o.companyFloorsCount)}
                </Text>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.companyStairs}
                  style={styles.companyStatIcon}
                />
              </View>
              <View style={styles.companyStatItem}>
                <Text style={styles.companyStatText}>
                  {formatCompanyApartmentsLabel(o.companyApartmentsCount)}
                </Text>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.companyDoor}
                  style={styles.companyStatIcon}
                />
              </View>
            </View>
          </View>
        ) : o.isOpenHousePost ? (
          <View
            style={[styles.postActionsInfo, postOverlayRtlDirection]}
            pointerEvents="box-none">
            <View style={styles.openHouseTagRow} pointerEvents="none">
              <Image
                source={OPEN_HOUSE_FEED_TAG}
                style={styles.openHouseTagImage}
                resizeMode="contain"
                accessibilityLabel={OPEN_HOUSE_POST_DESCRIPTION}
              />
            </View>
            {o.openHouseOverlayText ? (
              <Text
                style={styles.openHouseOverlayText}
                numberOfLines={3}
                ellipsizeMode="tail"
                pointerEvents="none">
                {o.openHouseOverlayText}
              </Text>
            ) : null}
            {postHashtags.length > 0 ? (
              <Text
                style={styles.postHashtagsText}
                numberOfLines={2}
                pointerEvents="none">
                {postHashtags.map(t => `#${t}`).join(' ')}
              </Text>
            ) : null}
            <View
              style={[styles.postActionsRow, postOverlayRtlDirection]}
              pointerEvents="box-none">
              <View style={styles.postActionItem}>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.postView}
                  style={styles.postActionIcon}
                  resizeMode="contain"
                />
                <Text style={styles.postActionCountText}>
                  {formatCount(video?.view_count ?? 0)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.postActionItem}
                onPress={() => {
                  if (!ensureSignedInOrRegister()) return;
                  setSharePost(video);
                }}
                activeOpacity={0.85}>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.postShare}
                  style={styles.postActionIcon}
                  resizeMode="contain"
                />
                <Text style={styles.postActionCountText}>
                  {formatCount(
                    (video?.id != null && shareCountOverrides[video.id] != null
                      ? shareCountOverrides[video.id]
                      : video?.share_count) ?? 0,
                  )}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.postActionItem}
                onPress={() => openCommentsForPost(video)}
                activeOpacity={0.85}>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.postComment}
                  style={styles.postActionIcon}
                  resizeMode="contain"
                />
                <Text style={styles.postActionCountText}>
                  {formatCount(getDisplayedCommentCount(video))}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.postActionItem}
                onPress={() => togglePostLiked(video.id)}
                activeOpacity={0.85}>
                <PostFeedLikeIcon liked={isItemLiked(video)} size={32} />
                <Text style={styles.postActionCountText}>
                  {formatCount(video?.post_like_count ?? 0)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : o.isPostListing ? (
          <View
            style={[styles.postActionsInfo, postOverlayRtlDirection]}
            pointerEvents="box-none">
            {postHashtags.length > 0 ? (
              <Text
                style={styles.postHashtagsText}
                numberOfLines={2}
                pointerEvents="none">
                {postHashtags.map(t => `#${t}`).join(' ')}
              </Text>
            ) : null}
            <View
              style={[styles.postActionsRow, postOverlayRtlDirection]}
              pointerEvents="box-none">
              <View style={styles.postActionItem}>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.postView}
                  style={styles.postActionIcon}
                  resizeMode="contain"
                />
                <Text style={styles.postActionCountText}>
                  {formatCount(video?.view_count ?? 0)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.postActionItem}
                onPress={() => {
                  if (!ensureSignedInOrRegister()) return;
                  setSharePost(video);
                }}
                activeOpacity={0.85}>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.postShare}
                  style={styles.postActionIcon}
                  resizeMode="contain"
                />
                <Text style={styles.postActionCountText}>
                  {formatCount(
                    (video?.id != null && shareCountOverrides[video.id] != null
                      ? shareCountOverrides[video.id]
                      : video?.share_count) ?? 0,
                  )}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.postActionItem}
                onPress={() => openCommentsForPost(video)}
                activeOpacity={0.85}>
                <Image
                  source={TIKTOK_OVERLAY_ICONS.postComment}
                  style={styles.postActionIcon}
                  resizeMode="contain"
                />
                <Text style={styles.postActionCountText}>
                  {formatCount(getDisplayedCommentCount(video))}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.postActionItem}
                onPress={() => togglePostLiked(video.id)}
                activeOpacity={0.85}>
                <PostFeedLikeIcon liked={isItemLiked(video)} size={32} />
                <Text style={styles.postActionCountText}>
                  {formatCount(video?.post_like_count ?? 0)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : o.isBnbListing ? (
          <View style={styles.brokerOverlayInfo} pointerEvents="box-none">
            <View style={styles.brokerTopRow} pointerEvents="box-none">
              <TouchableOpacity
                style={[styles.actionIconButton, styles.brokerHeartButton]}
                onPress={() => toggleLiked(video)}>
                <TikTokHeartIcon
                  liked={isItemLiked(video)}
                  size={TIKTOK_OVERLAY_HEART_SIZE}
                  style={[
                    styles.overlayHeartIcon,
                    isItemLiked(video) && styles.actionIconLiked,
                  ]}
                />
              </TouchableOpacity>
              <View style={styles.bnbTagsRow}>
                <View style={styles.bnbPrimaryTag}>
                  <Text style={styles.bnbPrimaryTagText}>
                    {o.isBnbHotDeal ? 'Hot deal' : 'לינה'}
                  </Text>
                </View>
                <View style={styles.bnbSecondaryTag}>
                  <Text
                    style={styles.bnbSecondaryTagText}
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    {truncateTikTokLabel(o.bnbTypeTagText)}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.bnbPriceRow} pointerEvents="box-none">
              <Text
                style={styles.bnbPriceMainText}
                numberOfLines={1}
                ellipsizeMode="tail"
                pointerEvents="none">
                {o.brokerPriceText}
              </Text>
              <View style={styles.bnbPriceDivider} pointerEvents="none" />
              <View style={styles.bnbPricePerNightLabels} pointerEvents="none">
                <Text style={styles.bnbPriceLabel}>מחיר </Text>
                <Text style={styles.bnbPriceLabel}>ללילה</Text>
              </View>
            </View>
            <Text
              style={styles.brokerPriceText}
              numberOfLines={1}
              ellipsizeMode="tail"
              pointerEvents="none">
              {truncateTikTokLabel(o.bnbTitleText)}
            </Text>
            <View style={styles.brokerLocationRow} pointerEvents="box-none">
              <Image
                source={TIKTOK_OVERLAY_ICONS.location}
                style={styles.brokerLocationIcon}
                resizeMode="contain"
                pointerEvents="none"
              />
              <Text
                style={styles.brokerLocationText}
                numberOfLines={1}
                ellipsizeMode="tail"
                pointerEvents="none">
                {o.brokerLocationText}
              </Text>
            </View>
          </View>
        ) : o.isPartnersListing ? (
          <View style={styles.partnersOverlayInfo} pointerEvents="box-none">
            <View style={styles.partnersTopRow} pointerEvents="box-none">
              <TouchableOpacity
                style={[styles.actionIconButton, styles.brokerHeartButton]}
                onPress={() => toggleLiked(video)}>
                <TikTokHeartIcon
                  liked={isItemLiked(video)}
                  size={TIKTOK_OVERLAY_HEART_SIZE}
                  style={[
                    styles.overlayHeartIcon,
                    isItemLiked(video) && styles.actionIconLiked,
                  ]}
                />
              </TouchableOpacity>
              <View style={styles.partnersMetaColumn}>
                <View style={styles.partnersPurposePill}>
                  <Text style={styles.partnersPurposeText}>
                    {o.partnersPurposeText}
                  </Text>
                </View>
                <Text
                  style={styles.partnersNameText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  pointerEvents="none">
                  {o.partnersDisplayName}
                </Text>
              </View>
            </View>
          </View>
        ) : o.showBrokerStylePropertyOverlay ? (
          <View style={styles.brokerOverlayInfo} pointerEvents="box-none">
            <View style={styles.brokerTopRow} pointerEvents="box-none">
              <TouchableOpacity
                style={[styles.actionIconButton, styles.brokerHeartButton]}
                onPress={() => toggleLiked(video)}>
                <TikTokHeartIcon
                  liked={isItemLiked(video)}
                  size={TIKTOK_OVERLAY_HEART_SIZE}
                  style={[
                    styles.overlayHeartIcon,
                    isItemLiked(video) && styles.actionIconLiked,
                  ]}
                />
              </TouchableOpacity>
              <View style={styles.brokerPurposePill}>
                <Text style={styles.brokerPurposeText}>{o.brokerPurposeText}</Text>
              </View>
            </View>
            <Text
              style={styles.brokerPriceText}
              numberOfLines={1}
              ellipsizeMode="tail"
              pointerEvents="none">
              {o.brokerPriceText}
            </Text>
            <View style={styles.brokerLocationRow} pointerEvents="box-none">
              <Image
                source={TIKTOK_OVERLAY_ICONS.location}
                style={styles.brokerLocationIcon}
                resizeMode="contain"
                pointerEvents="none"
              />
              <Text
                style={styles.brokerLocationText}
                numberOfLines={1}
                ellipsizeMode="tail"
                pointerEvents="none">
                {o.brokerLocationText}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.propertyInfo} pointerEvents="box-none">
            <View style={styles.topRow} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.actionIconButton}
                onPress={() => toggleLiked(video)}>
                <TikTokHeartIcon
                  liked={isItemLiked(video)}
                  size={TIKTOK_OVERLAY_HEART_SIZE}
                  style={[
                    styles.overlayHeartIcon,
                    isItemLiked(video) && styles.actionIconLiked,
                  ]}
                />
              </TouchableOpacity>
              {!isPostVideo(video) &&
                (video?.category === 3 ? (
                  <View style={styles.forRentButton}>
                    <Text style={styles.forRentText}>
                      {video?.searchPurpose || 'מטרת החיפוש'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.forRentButton}>
                    <Text style={styles.forRentText}>
                      {video?.purpose || 'להשכרה'}
                    </Text>
                  </View>
                ))}
            </View>
            {!isPostVideo(video) &&
              (video?.category === 3 ? (
                <View style={styles.locationContainer} pointerEvents="box-none">
                  <Text
                    style={styles.locationText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    pointerEvents="none">
                    {video?.preferredApartmentType
                      ? `${video.preferredApartmentType}`
                      : ''}
                    {video?.preferredGender ? ` • ${video.preferredGender}` : ''}
                    {video?.preferredAgeMin && video?.preferredAgeMax
                      ? ` • גיל ${video.preferredAgeMin}-${video.preferredAgeMax}`
                      : ''}
                  </Text>
                </View>
              ) : (
                <View style={styles.locationContainer} pointerEvents="box-none">
                  <Text
                    style={styles.locationText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    pointerEvents="none">
                    {video?.location || 'תל אביב, רוטשילד 54'}
                  </Text>
                  <Image
                    source={TIKTOK_OVERLAY_ICONS.location}
                    style={styles.locationIcon}
                    resizeMode="contain"
                    pointerEvents="none"
                  />
                </View>
              ))}
            {video?.fromDatabase && (
              <View style={styles.viewsLikesRow} pointerEvents="box-none">
                <Text style={styles.viewsLikesText} pointerEvents="none">
                  {formatCount(video?.view_count ?? 0)} צפיות
                </Text>
                <Text style={styles.viewsLikesDot} pointerEvents="none">
                  {' • '}
                </Text>
                <Text style={styles.viewsLikesText} pointerEvents="none">
                  {formatCount(video?.like_count ?? 0)} לייקים
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const wrapFeedPage = (video, index, media) => {
    const isActiveFeedPage = index === currentIndex;
    const canPauseFeedVideo =
      isActiveFeedPage &&
      video?.isUploaded &&
      video?.type === 'video' &&
      Boolean(resolveFeedVideoUri(video));

    return (
    <View style={[styles.videoItem, styles.feedPage, feedPageDimensions]}>
      {media}
      {shouldRenderFeedChrome(index) ? (
        <View style={styles.feedPageChrome} pointerEvents="box-none">
          {canPauseFeedVideo ? (
            <Pressable
              style={styles.feedVideoPauseTap}
              onPress={() => {
                feedVideoRefs.current.get(index)?.togglePause?.();
              }}
              accessibilityRole="button"
              accessibilityLabel="השהה סרטון"
            />
          ) : null}
          {renderFeedPageSidebar(video, index)}
          {renderFeedPageActionOverlay(video)}
        </View>
      ) : null}
    </View>
    );
  };

  const renderFeedMedia = (video, index) => {
    const isActiveFeedPage = index === currentIndex;
    const isActiveVideoPage = index === currentIndex;
    if (video.isUploaded) {
      const feedVideoUri = resolveFeedVideoUri(video);
      if (video.type === 'video' && feedVideoUri) {
        // Active page always mounts its player. Neighbors (±1) mount paused
        // players immediately (no settle delay) so they decode their first
        // frame offscreen the instant they enter range — by the time the
        // user's swipe lands, the next video is already frame-ready. Window
        // stays fixed at 3 real players max (A07-safe decoder budget).
        const isPrewarmNeighbor =
          index === currentIndex + 1 || index === currentIndex - 1;
        const feedVideoActive = isActiveVideoPage && isScreenActive;
        const inPlayerWindow =
          isScreenActive && (isActiveVideoPage || isPrewarmNeighbor);
        const mustMountVideoPlayer = inPlayerWindow;
        const posterUri = resolveFeedVideoPosterUri(video);
        // Text overlays are passed INTO the player so post + text render as
        // one unit: hidden while the video loads, shown with the first frame.
        const fitAdWidth = !isFeedPostVideo(video);
        if (!mustMountVideoPlayer) {
          return (
            <FeedVideoPosterPlaceholder
              posterUri={posterUri}
              fitWidth={fitAdWidth}
              style={styles.feedVideoPlayer}>
              {renderPostTextOverlays(video)}
            </FeedVideoPosterPlaceholder>
          );
        }
        return (
          <FeedVideoPlayer
            ref={node => bindFeedVideoRef(index, node)}
            uri={feedVideoUri}
            posterUri={posterUri}
            isActive={feedVideoActive}
            prewarm={inPlayerWindow && !feedVideoActive}
            fitWidth={fitAdWidth}
            style={styles.feedVideoPlayer}>
            {renderPostTextOverlays(video)}
          </FeedVideoPlayer>
        );
      }
      if (video.type === 'video' && video.videoProcessing && !feedVideoUri) {
        return (
          <>
            <View style={[styles.feedVideoPlayer, styles.videoProcessingWrap]}>
              <ActivityIndicator color="#FFC40A" size="large" />
              <Text style={styles.videoProcessingText}>מעבד סרטון...</Text>
            </View>
            {renderPostTextOverlays(video)}
          </>
        );
      }
      if (video.isTextOnlyPost && video.description) {
        return (
          <LinearGradient
            colors={['#2a1a4a', '#1a0d2e', '#0d0620']}
            style={styles.textPostCardGradient}>
            <Text style={styles.textPostCardDescription} numberOfLines={10}>
              {video.description}
            </Text>
          </LinearGradient>
        );
      }
      if (video.images && video.images.length > 0) {
        const rawOpt = String(video.displayOption || 'slideshow').toLowerCase();
        const displayMode =
          rawOpt === 'collage' && video.images.length > 1
            ? 'collage'
            : 'slideshow';
        return (
          <>
            <ImageSwiper
              images={video.images}
              screenHeight={feedPageHeight}
              video={video}
              displayOption={displayMode}
              isActivePage={isActiveFeedPage}
              pauseAutoAdvance={sidebarSlideshowPaused}
            />
            {renderPostTextOverlays(video)}
          </>
        );
      }
    }
    return (
      <View style={styles.videoImageContainer}>
        <Image
          source={getTikImage(video.image ?? video.category)}
          style={styles.videoImage}
          resizeMode="contain"
        />
      </View>
    );
  };

  const feedListExtraData = useMemo(
    () => ({
      likedUiRevision,
      followUiRevision,
      scrollAnchorIndex,
      currentIndex,
      sidebarIntroFinished,
      sidebarIntroEpoch,
      sidebarSlideshowPaused,
    }),
    [
      likedUiRevision,
      followUiRevision,
      scrollAnchorIndex,
      currentIndex,
      sidebarIntroFinished,
      sidebarIntroEpoch,
      sidebarSlideshowPaused,
    ],
  );

  const renderFeedItem = useCallback(
    ({item: video, index}) =>
      wrapFeedPage(video, index, renderFeedMedia(video, index)),
    [
      feedPageHeight,
      currentIndex,
      scrollAnchorIndex,
      sidebarIntroVisible,
      sidebarIntroFinished,
      sidebarIntroEpoch,
      sidebarIntroTopTwoOnlyDown,
      sidebarSlideshowPaused,
      selectedSidebarFilter,
      feedIsEmpty,
      videos.length,
      likedUiRevision,
      followUiRevision,
      sidebarSendingFollow,
      bindFeedVideoRef,
    ],
  );

  /** Open a hashtag-result post inside the feed. */
  const openHashtagPost = listing => {
    if (!listing?.id) return;
    setShowUserSearchPanel(false);
    setUserSearchQuery('');
    setSelectedHashtag(null);
    if (typeof onOpenPostInFeed === 'function') {
      onOpenPostInFeed(listing);
      return;
    }
    // Fallback: try to scroll to it if it's already in the current feed.
    const idx = videos.findIndex(
      v => String(v?.id ?? '').trim() === String(listing.id).trim(),
    );
    if (idx >= 0) scrollToIndex(idx, false);
  };

  /** Thumbnail URL for an explore-grid cell. */
  const hashtagCellImage = listing =>
    listing?.main_image_url ||
    listing?.sales_image_url ||
    listing?.profile_image_url ||
    (Array.isArray(listing?.additional_image_urls)
      ? listing.additional_image_urls[0]
      : null) ||
    null;

  /** Caption text for an explore card (post text, else its hashtags). */
  const hashtagCellCaption = listing => {
    const desc = String(listing?.description || '').trim();
    if (desc && desc !== 'פוסט' && desc.toLowerCase() !== 'post') return desc;
    const tags = getListingHashtags(listing);
    if (tags.length) return tags.map(t => `#${t}`).join(' ');
    return '';
  };

  /** Like count for an explore card. */
  const hashtagCellLikes = listing => {
    const n = Number(
      listing?.post_like_count != null
        ? listing.post_like_count
        : listing?.like_count,
    );
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  /** Selected tag's explore grid (Instagram/TikTok style, 2 cards per row). */
  const renderHashtagExplore = () => (
    <View style={styles.hashtagExploreWrap}>
      <View style={styles.hashtagExploreHeader}>
        <Text style={styles.hashtagExploreTitle} numberOfLines={1}>
          #{selectedHashtag}
        </Text>
        <Text style={styles.hashtagExploreCount}>
          {hashtagPosts.length} פוסטים
        </Text>
      </View>

      {hashtagPosts.length === 0 ? (
        <View style={styles.userSearchEmptyWrap}>
          <Text style={styles.userSearchEmptyText}>
            אין פוסטים עם ההאשטאג הזה
          </Text>
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.exploreGrid}>
          {hashtagPosts.map(listing => {
            const img = hashtagCellImage(listing);
            const isVideo = String(listing?.video_url || '').trim().length > 0;
            const caption = hashtagCellCaption(listing);
            const likes = hashtagCellLikes(listing);
            const authorName = String(listing?.creator_name || '').trim();
            const authorAvatar =
              getUserProfileImageUrl(listing) ||
              listing?.creator_profile_image_url ||
              listing?.profile_image_url ||
              null;
            return (
              <View key={String(listing.id)} style={styles.exploreCell}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => openHashtagPost(listing)}>
                  <View style={styles.exploreThumbWrap}>
                    {img ? (
                      <Image
                        source={{uri: img}}
                        style={styles.exploreThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.exploreThumb,
                          styles.exploreCellPlaceholder,
                        ]}>
                        <MaterialCommunityIcons
                          name={
                            isVideo ? 'play-circle-outline' : 'image-outline'
                          }
                          size={34}
                          color="#6C6A7A"
                        />
                      </View>
                    )}
                    {isVideo && (
                      <View style={styles.exploreCellVideoBadge}>
                        <MaterialCommunityIcons
                          name="play"
                          size={14}
                          color="#FFFFFF"
                        />
                      </View>
                    )}
                  </View>

                  {caption ? (
                    <Text style={styles.exploreCaption} numberOfLines={2}>
                      {caption}
                    </Text>
                  ) : null}

                  <View style={styles.exploreMetaRow}>
                    <View style={styles.exploreAuthorWrap}>
                      <ProfileAvatar
                        uri={authorAvatar}
                        name={authorName}
                        size={22}
                        subscriptionType={listing}
                      />
                      <Text
                        style={styles.exploreAuthorName}
                        numberOfLines={1}>
                        {authorName || 'משתמש'}
                      </Text>
                    </View>
                    <View style={styles.exploreLikesWrap}>
                      <Text style={styles.exploreLikesText}>{likes}</Text>
                      <MaterialCommunityIcons
                        name="heart-outline"
                        size={14}
                        color="#C9C7D6"
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top bar - back, center filters (spacer keeps filters centered) */}
      <View
        style={[
          styles.topBar,
          {height: topBarHeight, paddingTop: insets.top + 2},
        ]}>
        <TouchableOpacity
          style={styles.topBarSideBtn}
          hitSlop={12}
          onPress={() => {
            if (showUserSearchPanel) {
              // Viewing a tag's explore grid → step back to the results list first.
              if (selectedHashtag) {
                setSelectedHashtag(null);
                return;
              }
              setShowUserSearchPanel(false);
              setUserSearchQuery('');
              setSelectedHashtag(null);
              setFailedSearchAvatarKeys(new Set());
              // Return to the same default feed as a fresh TikTok open: pics, first item, no stale search trigger.
              setSelectedTopBarFilter(DEFAULT_TOP_BAR_FILTER);
              AsyncStorage.setItem(
                TIKTOK_TOP_BAR_FILTER_STORAGE_KEY,
                DEFAULT_TOP_BAR_FILTER,
              ).catch(() => {});
              if (videos.length > 0) {
                scrollToIndex(0);
              } else {
                setCurrentIndex(0);
              }
              if (typeof onUserSearchBackToDefaultFeed === 'function') {
                onUserSearchBackToDefaultFeed();
              }
              return;
            }
            onClose?.();
          }}>
          <MaterialCommunityIcons name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        {showUserSearchPanel ? (
          <View style={styles.userSearchInputWrap}>
            <TextInput
              style={styles.userSearchInput}
              value={userSearchQuery}
              onChangeText={setUserSearchQuery}
              placeholder="חיפוש משתמשים או האשטאגים"
              placeholderTextColor="rgba(255,255,255,0.75)"
              textAlign="right"
              writingDirection="rtl"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.userSearchClearBtn}
              onPress={() => setUserSearchQuery('')}
              hitSlop={8}
              activeOpacity={0.8}>
              <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : isProfilePostsFeed ? (
          <View style={styles.topBarCenter} />
        ) : (
          <View style={styles.topBarCenter}>
            {TOP_BAR_FILTERS.map(f => {
              const topSelected = selectedTopBarFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={styles.topBarFilterBtn}
                  hitSlop={8}
                  onPress={() => {
                    if (f.id === 'liked') {
                      if (!ensureSignedInOrRegister()) return;
                      setUnseenLikedCount(0);
                      if (currentUser?.id != null) {
                        persistUnseenLikedCount(
                          String(currentUser.id),
                          0,
                        ).catch(() => {});
                      }
                      // Already on liked → back to default leftmost tab (pics).
                      if (selectedTopBarFilter === 'liked') {
                        setSelectedTopBarFilter(DEFAULT_TOP_BAR_FILTER);
                        AsyncStorage.setItem(
                          TIKTOK_TOP_BAR_FILTER_STORAGE_KEY,
                          DEFAULT_TOP_BAR_FILTER,
                        ).catch(() => {});
                        return;
                      }
                      // First tap: open Favorites; keep heart selected for return.
                      if (typeof onOpenFavorites === 'function') {
                        setSelectedTopBarFilter('liked');
                        AsyncStorage.setItem(
                          TIKTOK_TOP_BAR_FILTER_STORAGE_KEY,
                          'liked',
                        ).catch(() => {});
                        onOpenFavorites(selectedCategory);
                      } else {
                        setSelectedTopBarFilter('liked');
                        AsyncStorage.setItem(
                          TIKTOK_TOP_BAR_FILTER_STORAGE_KEY,
                          'liked',
                        ).catch(() => {});
                      }
                      return;
                    }
                    setSelectedTopBarFilter(prev => {
                      const next =
                        prev === f.id ? DEFAULT_TOP_BAR_FILTER : f.id;
                      AsyncStorage.setItem(
                        TIKTOK_TOP_BAR_FILTER_STORAGE_KEY,
                        next,
                      ).catch(() => {});
                      return next;
                    });
                  }}>
                  <Image
                    source={f.icon}
                    style={[
                      styles.topBarFilterIcon,
                      topSelected && styles.filterIconSelectedTint,
                    ]}
                    resizeMode="contain"
                  />
                  {f.id === 'liked' && unseenLikedCount > 0 ? (
                    <View style={styles.likedBadge} pointerEvents="none">
                      <Text style={styles.likedBadgeText}>
                        {unseenLikedCount > 99
                          ? '99+'
                          : String(unseenLikedCount)}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {showUserSearchPanel ? (
          <View style={styles.topBarRightSpacerSmall} />
        ) : isProfilePostsFeed ? (
          <View style={styles.topBarRightSpacerSmall} />
        ) : (
          <TouchableOpacity
            style={styles.topBarSideBtn}
            hitSlop={12}
            activeOpacity={0.8}
            onPress={() => {
              if (!ensureSignedInOrRegister()) return;
              setFailedSearchAvatarKeys(new Set());
              setSelectedHashtag(null);
              setShowUserSearchPanel(true);
              loadAllUsersForSearch();
              preloadUserRatingsForSearch();
              loadRecentUserSearches();
            }}>
            <TopBarSearchIcon />
          </TouchableOpacity>
        )}
      </View>

      {showUserSearchPanel && (
        <View style={[styles.userSearchPanel, {top: topBarHeight}]}>
          {selectedHashtag
            ? renderHashtagExplore()
            : (() => {
            const hasQuery = String(userSearchQuery || '').trim().length > 0;
            const visibleSearchResults = userSearchItems.filter(
              it => !hiddenSearchKeys.has(it.key),
            );
            const visibleRecent = (recentSearches || []).filter(
              r => !hiddenSearchKeys.has(`recent:${r.target_subscription_id}`),
            );
            const showRecent = !hasQuery;
            // Auto-detect like TikTok: `#...` → hashtags only; otherwise a unified
            // list with matching hashtags first, then matching users.
            const queryRaw = String(userSearchQuery || '').trim();
            const hashtagOnly = queryRaw.startsWith('#');
            const hashtagResultItems = hashtagItems.map(h => ({
              type: 'hashtag',
              key: `tag:${h.tag}`,
              tag: h.tag,
              count: h.count,
            }));
            const userResultItems = visibleSearchResults.map(u => ({
              ...u,
              type: 'user',
            }));
            const recentItems = visibleRecent.map(r => ({
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
              listing: null,
              recentTargetId: r.target_subscription_id,
              recentEmail: r.email || null,
              recentSubscriptionType: r.subscription_type || null,
            }));
            const currentList = showRecent
              ? recentItems
              : hashtagOnly
                ? hashtagResultItems
                : [...hashtagResultItems, ...userResultItems];
            return (
              <>
                <View style={styles.userSearchSectionHeader}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    hitSlop={8}
                    onPress={() => {
                      setHiddenSearchKeys(new Set());
                      if (showRecent) handleClearRecentSearches();
                    }}>
                    <Text style={styles.userSearchClearText}>נקה</Text>
                  </TouchableOpacity>
                  <Text style={styles.userSearchSectionTitle}>
                    {showRecent ? 'אחרונים' : 'תוצאות חיפוש'}
                  </Text>
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  style={styles.userSearchList}
                  contentContainerStyle={styles.userSearchListContent}
                  showsVerticalScrollIndicator={false}>
                  {currentList.length === 0 ? (
                    <View style={styles.userSearchEmptyWrap}>
                      <Text style={styles.userSearchEmptyText}>
                        {showRecent
                          ? 'אין חיפושים אחרונים'
                          : 'מצטערים, אבל הפרופיל לא קיים'}
                      </Text>
                    </View>
                  ) : (
                    currentList.map(item => {
                      if (item.type === 'hashtag') {
                        return (
                          <TouchableOpacity
                            key={item.key}
                            activeOpacity={0.8}
                            style={styles.hashtagRow}
                            onPress={() => setSelectedHashtag(item.tag)}>
                            <View style={styles.hashtagRowIcon}>
                              <Text style={styles.hashtagRowIconText}>#</Text>
                            </View>
                            <View style={styles.hashtagRowTextWrap}>
                              <Text
                                style={styles.hashtagRowTitle}
                                numberOfLines={1}>
                                #{item.tag}
                              </Text>
                              <Text style={styles.hashtagRowCount}>
                                {item.count} פוסטים
                              </Text>
                            </View>
                            <MaterialCommunityIcons
                              name="chevron-left"
                              size={24}
                              color="#8C8A99"
                            />
                          </TouchableOpacity>
                        );
                      }
                      const effectiveTargetId =
                        item.ratingTargetId ||
                        (item.listing
                          ? item.listing.subscription_id ||
                            item.listing.owner_id
                          : null) ||
                        item.recentTargetId ||
                        null;
                      // Figma node 943:117840 — RTL row: profile + text on the
                      // right, dedicated dismiss (X) button on the left so the
                      // user can hide a single result without clearing the
                      // entire list.
                      return (
                        <View key={item.key} style={styles.userSearchRow}>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.userSearchRowContent}
                            onPress={() => {
                              const targetId =
                                item.recentTargetId ||
                                item.ratingTargetId ||
                                item.listing?.subscription_id ||
                                item.listing?.owner_id ||
                                null;
                              if (targetId && currentUser?.email) {
                                recordUserSearch(currentUser.email, targetId);
                              }
                              setShowUserSearchPanel(false);
                              setUserSearchQuery('');
                              onOpenUserProfile?.(
                                item.listing || {
                                  subscription_id: item.recentTargetId || null,
                                  owner_id: item.recentTargetId || null,
                                  creator_name: item.name || null,
                                  creator_email: item.recentEmail || null,
                                  creator_profile_image_url:
                                    item.avatar || null,
                                  profile_picture_url: item.avatar || null,
                                  subscription_type:
                                    item.recentSubscriptionType || null,
                                },
                              );
                            }}>
                            <ProfileAvatar
                              uri={
                                item.avatar &&
                                !failedSearchAvatarKeys.has(item.key)
                                  ? item.avatar
                                  : null
                              }
                              name={item.name}
                              size={60}
                              subscriptionType={item}
                            />
                            <View style={styles.userSearchTextWrap}>
                              <Text
                                style={styles.userSearchName}
                                numberOfLines={1}>
                                {item.name}
                              </Text>
                              <View style={styles.userSearchMetaRow}>
                                {(() => {
                                  const searchListing =
                                    item.listing ||
                                    (item.recentSubscriptionType
                                      ? {
                                          subscription_type:
                                            item.recentSubscriptionType,
                                        }
                                      : null);
                                  const showSearchRating =
                                    shouldShowListingPiRating(searchListing);
                                  const n = Number(
                                    effectiveTargetId
                                      ? userRatingByProfileId[effectiveTargetId]
                                      : NaN,
                                  );
                                  if (
                                    !showSearchRating ||
                                    !Number.isFinite(n) ||
                                    n < 1
                                  ) {
                                    return item.subtitle ? (
                                      <Text
                                        style={styles.userSearchMetaText}
                                        numberOfLines={1}>
                                        {item.subtitle}
                                      </Text>
                                    ) : null;
                                  }
                                  const isFive = n >= 5;
                                  // RTL reading order (right → left): subtitle,
                                  // star, number. With the force-RTL base and
                                  // `flexDirection: 'row'`, the first child sits
                                  // on the right, so subtitle is rendered first.
                                  return (
                                    <>
                                      {item.subtitle ? (
                                        <Text
                                          style={styles.userSearchMetaText}
                                          numberOfLines={1}>
                                          {item.subtitle}
                                        </Text>
                                      ) : null}
                                      <View
                                        style={[
                                          styles.userSearchMetaStarGroup,
                                          isFive &&
                                            styles.userSearchMetaStarGroupFive,
                                        ]}>
                                        <PiRatingBadge
                                          rating={n}
                                          variant="compactSearch"
                                        />
                                      </View>
                                    </>
                                  );
                                })()}
                              </View>
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
                            style={styles.userSearchDismissBtn}
                            onPress={() =>
                              setHiddenSearchKeys(prev => {
                                const next = new Set(prev);
                                next.add(item.key);
                                return next;
                              })
                            }
                            accessibilityRole="button"
                            accessibilityLabel="הסר מהרשימה">
                            <MaterialCommunityIcons
                              name="close"
                              size={24}
                              color="#FFFFFF"
                            />
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </>
            );
          })()}
        </View>
      )}

      {/* List view: only the card list scrolls; top bar + bottom bar stay fixed (inset scroll region on web). */}
      {!showUserSearchPanel && selectedTopBarFilter === 'list' && (
        <View
          style={[
            styles.listModeWrapper,
            {top: topBarHeight, bottom: bottomBarHeight},
          ]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.listScrollView}
            contentContainerStyle={[
              styles.listScrollContent,
              styles.listScrollContentGrid,
              listModeListings.length === 0 &&
                !showFeedLoading &&
                styles.listScrollContentEmpty,
            ]}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}>
            {showFeedLoading ? (
              <View style={styles.listResultsLoadingWrap}>
                {renderFeedLoadingBody(
                  showDistanceFilterLoading
                    ? distanceFilterLoadingText
                    : 'טוען רשימות...',
                )}
              </View>
            ) : listModeListings.length === 0 ? (
              <View style={styles.listEmptyInner}>
                {renderEmptyCategoryBody()}
              </View>
            ) : (
              listModeListings.map(listing => {
                const subKey =
                  listing?.subscription_id != null
                    ? String(listing.subscription_id).trim()
                    : '';
                const displayPi =
                  subKey !== '' && listPiDisplayBySubId[subKey] !== undefined
                    ? listPiDisplayBySubId[subKey]
                    : brokerPiRatingFromListing(listing);
                const rowLiked =
                  Boolean(currentUser?.id) && isItemLiked(listing);
                return (
                  <ListingGridCardFigma
                    key={listing.id}
                    listing={listing}
                    selectedCategory={selectedCategory}
                    onPress={() => {
                      if (typeof onOpenUserProfile === 'function') {
                        onOpenUserProfile(listing);
                      }
                    }}
                    liked={rowLiked}
                    onToggleLike={() => toggleLiked(listing)}
                    displayPi={displayPi}
                    photoDotsAtTop
                  />
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* Feed view: per-page chrome scrolls with each item; nav stays fixed */}
      {!showUserSearchPanel && selectedTopBarFilter !== 'list' && (
        <>
          {/* Navigation buttons */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[
                styles.navButton,
                styles.navButtonUp,
                currentIndex === 0 && styles.navButtonDisabled,
              ]}
              onPress={handlePrevious}
              disabled={currentIndex === 0 || feedIsEmpty}>
              <Text style={styles.navButtonText}>▲</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                styles.navButtonDown,
                currentIndex === videos.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={currentIndex === videos.length - 1 || feedIsEmpty}>
              <Text style={styles.navButtonText}>▼</Text>
            </TouchableOpacity>
          </View>

          {feedIsEmpty ? (
            showFeedLoading ? (
              <View
                style={[
                  styles.feedViewport,
                  {top: topBarHeight, bottom: bottomBarHeight},
                ]}
                pointerEvents="box-none">
                <View
                  style={[
                    styles.feedLoadingFullScreen,
                    {top: 0, bottom: 0},
                  ]}>
                  {renderFeedLoadingBody(
                    showDistanceFilterLoading
                      ? distanceFilterLoadingText
                      : 'טוען רשימות...',
                  )}
                </View>
                {!isProfilePostsFeed &&
                selectedTopBarFilter !== 'list' &&
                isSidebarProfileHoldReady
                  ? renderSidebarWarmupAtRest()
                  : null}
              </View>
            ) : (
              <View
                style={[
                  styles.feedViewport,
                  {top: topBarHeight, bottom: bottomBarHeight},
                ]}
                pointerEvents="box-none">
                <View style={styles.feedEmptyInViewport}>
                  {renderEmptyCategoryBody()}
                </View>
                <View style={styles.feedPageChrome} pointerEvents="box-none">
                  {renderEmptyFeedSidebar()}
                </View>
              </View>
            )
          ) : (
            <View
              style={[
                styles.feedViewport,
                {top: topBarHeight, bottom: bottomBarHeight},
              ]}>
              <FlatList
                ref={feedListRef}
                data={videos}
                extraData={feedListExtraData}
                keyExtractor={feedKeyExtractor}
                renderItem={renderFeedItem}
                getItemLayout={getFeedItemLayout}
                showsVerticalScrollIndicator={false}
                style={[
                  styles.scrollView,
                  styles.feedScrollView,
                  {height: feedPageHeight},
                  Platform.OS === 'web' && styles.feedScrollViewWeb,
                ]}
                scrollEventThrottle={16}
                onScrollBeginDrag={onFeedScrollBeginDrag}
                onScroll={onFeedScroll}
                onMomentumScrollEnd={handleFeedScrollSettled}
                onScrollEndDrag={handleFeedScrollSettled}
                scrollEnabled={!feedIsEmpty}
                pagingEnabled
                snapToInterval={feedPageHeight}
                snapToAlignment="start"
                decelerationRate="fast"
                disableIntervalMomentum
                directionalLockEnabled
                nestedScrollEnabled
                bounces={Platform.OS === 'ios'}
                overScrollMode="never"
                keyboardShouldPersistTaps="handled"
                initialNumToRender={FEED_PRELOAD_BELOW_COUNT + 1}
                maxToRenderPerBatch={FEED_PRELOAD_BELOW_COUNT + 1}
                windowSize={FEED_FLATLIST_WINDOW_SIZE}
                removeClippedSubviews={false}
                updateCellsBatchingPeriod={16}
              />
              {showFeedLoading ? (
                <View
                  style={[
                    styles.feedLoadingFullScreen,
                    {top: 0, bottom: 0},
                  ]}
                  pointerEvents="box-none">
                  {renderFeedLoadingBody(
                    showDistanceFilterLoading
                      ? distanceFilterLoadingText
                      : 'טוען רשימות...',
                  )}
                </View>
              ) : null}
            </View>
          )}
        </>
      )}

      {!showUserSearchPanel && !showBottomSheet && !showCommentsSheet && (
        <FeedBottomBar
          chromeOnly={isProfilePostsFeed}
          selectedCategory={selectedCategory}
          feedFilters={feedFilters}
          onOpenCityFilter={onOpenCityFilter}
          onOpenApartmentTypeFilter={onOpenApartmentTypeFilter}
          onOpenTypeFilter={onOpenTypeFilter}
          onOpenOfficeFilter={onOpenOfficeFilter}
          onOpenRoomsFilter={onOpenRoomsFilter}
          onOpenMeterFilter={onOpenMeterFilter}
          onOpenDonamFilter={onOpenDonamFilter}
          onOpenPreferencesFilter={onOpenPreferencesFilter}
          onOpenPriceFilter={onOpenPriceFilter}
          onOpenEditPublishAdWithCategory={onOpenEditPublishAdWithCategory}
          onPressPublish={handlePublishButtonPress}
        />
      )}

      {/* Bottom Sheet */}
      {showBottomSheet && (
        <TouchableOpacity
          style={styles.bottomSheetBackdrop}
          activeOpacity={1}
          onPress={() => setShowBottomSheet(false)}
        />
      )}
      {showBottomSheet && (
        <Animated.View
          style={[
            styles.bottomSheetHost,
            {transform: [{translateY: bottomSheetTranslateY}]},
          ]}>
          <CreateAdSheet
            handlePanHandlers={bottomSheetPanResponder.panHandlers}
            bottomInset={insets.bottom}>
            {showListingPublishInTikTokSheet &&
              (selectedCategory === 5 || selectedCategory === '5' ? (
                <>
                  {!isCompanySubscriptionType(currentUser?.subscription_type) ? (
                    <>
                      <CreateAdSheetRow
                        title="פרסם כפרטי"
                        subtitle="פרסם חדר או אתר נופש פרטי"
                        iconSource={require('../assets/ad-uplaud/bnb-private.png')}
                        onPress={() =>
                          closeSheetAndOpenListing({bnbHostType: 'private'})
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
                      closeSheetAndOpenListing({bnbHostType: 'business'})
                    }
                  />
                </>
              ) : (
                <CreateAdSheetRow
                  title={listingSheetCopy.title}
                  subtitle={listingSheetCopy.subtitle}
                  iconSource={getCreateSheetListingIcon(
                    selectedCategory,
                    currentUser?.subscription_type,
                  )}
                  onPress={() => closeSheetAndOpenListing()}
                />
              ))}
            {showListingPublishInTikTokSheet ? <CreateAdSheetDivider /> : null}
            {showOpenHousePublishInTikTokSheet ? (
              <>
                <CreateAdSheetRow
                  title={OPEN_HOUSE_POST_DESCRIPTION}
                  subtitle="פרסמו אירוע בית פתוח לקהילה"
                  iconSource={CREATE_SHEET_OPEN_HOUSE_ICON}
                  onPress={() => closeSheetAndOpenPost({openHouse: true})}
                />
                <CreateAdSheetDivider />
              </>
            ) : null}
            <CreateAdSheetRow
              title="פוסט"
              subtitle="שתף מידע או עדכון עם הקהילה"
              iconSource={CREATE_SHEET_POST_ICON}
              onPress={() => closeSheetAndOpenPost()}
            />
          </CreateAdSheet>
        </Animated.View>
      )}

      {showCommentsSheet && (
        <View style={styles.commentsSheetOverlay}>
          <TouchableOpacity
            style={styles.commentsBackdrop}
            activeOpacity={1}
            onPress={closeCommentsSheet}
          />
          <View
            style={[styles.commentsSheet, {height: screenHeight * 0.8}]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={closeCommentsSheet}
              style={styles.commentsTopHeader}>
              <View style={styles.commentsHandle} />
            </TouchableOpacity>
            <View style={styles.commentsCountBar}>
              <Text style={styles.commentsTitle}>
                {formatCount(getDisplayedCommentCount(activeCommentsVideo))}{' '}
                תגובות
              </Text>
            </View>
            <View style={styles.commentsListFrame}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={styles.commentsList}
                contentContainerStyle={[
                  styles.commentsListContent,
                  {paddingBottom: COMMENTS_COMPOSER_SCROLL_PADDING},
                ]}
                showsVerticalScrollIndicator={false}>
                {commentsLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  currentComments.map(comment => (
                    <View key={String(comment.id)} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <View style={styles.commentAuthorWrap}>
                          <Text style={styles.commentPublisherBadge}>
                            מפרסם:
                          </Text>
                          <Text style={styles.commentAuthorText}>
                            {comment.commenter_name || 'משתמש'}
                          </Text>
                          <Text style={styles.commentDateText}>
                            {new Date(
                              comment.created_at || Date.now(),
                            ).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>
                        {comment.commenter_image_url ? (
                          <Image
                            source={{uri: comment.commenter_image_url}}
                            style={styles.commentAvatar}
                          />
                        ) : (
                          <View
                            style={[
                              styles.commentAvatar,
                              styles.commentAvatarPlaceholder,
                            ]}
                          />
                        )}
                      </View>
                      {!!comment.comment_image_url && (
                        <Image
                          source={{uri: comment.comment_image_url}}
                          style={styles.commentBodyImage}
                          resizeMode="cover"
                          accessibilityLabel="תמונה בתגובה"
                        />
                      )}
                      {!!(
                        comment.comment_text &&
                        String(comment.comment_text).trim()
                      ) && (
                        <Text style={styles.commentBodyText}>
                          {comment.comment_text}
                        </Text>
                      )}
                      <View style={styles.commentCardFooter}>
                        <Text style={styles.commentWhenText}>
                          {formatCommentTime(comment.created_at)}
                        </Text>
                        <View style={styles.commentActionsWrap}>
                          <TouchableOpacity
                            style={styles.commentLikeWrap}
                            onPress={() =>
                              toggleCommentReaction(comment.id, 'like')
                            }
                            activeOpacity={0.85}>
                            <Image
                              source={
                                comment.my_reaction === 'like'
                                  ? TIKTOK_OVERLAY_ICONS.commentsCardHeartLiked
                                  : TIKTOK_OVERLAY_ICONS.commentsCardHeart
                              }
                              style={[
                                styles.commentActionIcon,
                                comment.my_reaction === 'like' &&
                                  styles.commentActionIconActive,
                              ]}
                              resizeMode="contain"
                            />
                            <Text style={styles.commentLikeCountText}>
                              {formatCount(comment.likes_count ?? 0)}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.commentLikeWrap}
                            onPress={() =>
                              toggleCommentReaction(comment.id, 'dislike')
                            }
                            activeOpacity={0.85}>
                            {/*
                              PNG + tintColor renders as a solid block on web; use vector icon
                              with color so the glyph turns gold when active (same as like uses two assets).
                            */}
                            <MaterialCommunityIcons
                              name={
                                comment.my_reaction === 'dislike'
                                  ? 'thumb-down'
                                  : 'thumb-down-outline'
                              }
                              size={24}
                              color={
                                comment.my_reaction === 'dislike'
                                  ? '#FFC40A'
                                  : '#FFFFFF'
                              }
                            />
                            {(() => {
                              const isAuthor =
                                currentUser?.id != null &&
                                comment?.user_id != null &&
                                String(currentUser.id) ===
                                  String(comment.user_id);
                              if (!isAuthor) return null;
                              return (
                                <Text style={styles.commentLikeCountText}>
                                  {formatCount(comment.dislikes_count ?? 0)}
                                </Text>
                              );
                            })()}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
          <View
            style={[
              styles.commentsBottomSection,
              {
                bottom: commentsComposerBottom,
                marginBottom: commentsComposerMarginBottom,
                paddingBottom: commentsKeyboardOpen
                  ? 0
                  : Math.max(insets.bottom, 10),
              },
            ]}>
            <View style={styles.reactionsRow}>
              {COMMENT_REACTIONS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    setNewCommentText(prev => `${prev || ''}${emoji}`)
                  }
                  disabled={commentSubmitting}>
                  <Text style={styles.reactionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {commentImageAsset ? (
              <View style={styles.commentImagePreviewRow}>
                <View style={styles.commentImagePreviewInner}>
                  <Image
                    source={{uri: commentImageAsset.uri}}
                    style={styles.commentImagePreviewImg}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => setCommentImageAsset(null)}
                    style={styles.commentImageRemoveBtn}
                    hitSlop={8}
                    disabled={commentSubmitting}
                    activeOpacity={0.85}>
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={24}
                      color="rgba(255,255,255,0.85)"
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.commentImagePreviewHint}>
                  {commentSubmitting ? 'מעלה...' : 'יישלח עם התגובה'}
                </Text>
              </View>
            ) : null}
            <View style={styles.commentInputRow}>
              <TextInput
                value={newCommentText}
                onChangeText={setNewCommentText}
                placeholder={
                  commentImageAsset
                    ? 'כתוב ליד התמונה (אופציונלי)'
                    : 'כתוב הודעה'
                }
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={styles.commentInput}
                textAlign="right"
                writingDirection="rtl"
                returnKeyType="send"
                onSubmitEditing={submitPostComment}
                editable={!commentSubmitting}
              />
              <TouchableOpacity
                onPress={submitPostComment}
                style={styles.commentSendBtn}
                activeOpacity={0.85}
                disabled={
                  commentSubmitting ||
                  (!String(newCommentText || '').trim() && !commentImageAsset)
                }>
                {commentSubmitting ? (
                  <ActivityIndicator size="small" color="#FFC40A" />
                ) : (
                  <MaterialCommunityIcons
                    name="send"
                    size={22}
                    color={
                      !String(newCommentText || '').trim() &&
                      !commentImageAsset
                        ? 'rgba(255,255,255,0.25)'
                        : '#FFC40A'
                    }
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      <SharePostSheet
        visible={!!sharePost}
        post={sharePost}
        currentUser={currentUser}
        onClose={() => setSharePost(null)}
        onShareToConversation={(conv, post) => {
          const pid = post?.id;
          if (pid != null) {
            setShareCountOverrides(prev => {
              const base =
                prev[pid] != null
                  ? Number(prev[pid])
                  : Number(post?.share_count ?? 0);
              return {...prev, [pid]: base + 1};
            });
          }
          if (typeof onShareToConversation === 'function') {
            onShareToConversation(conv, post);
          }
        }}
        onShareCounted={(pid, serverCount) => {
          if (pid == null || serverCount == null) return;
          setShareCountOverrides(prev => ({
            ...prev,
            [pid]: Number(serverCount),
          }));
        }}
      />
    </View>
  );
};

/** Absolute header (back, filters, search). Keep linked offsets (`userSearchPanel`, list `marginTop`) in sync. */
const TOP_BAR_HEIGHT = 52;
const TOP_BAR_SEARCH_ASSET = require('../assets/tiktok/search.png');

/** react-native-web deprecates split `textShadow*` props — use one CSS value on web. */
const webTextShadow = (color, offsetW, offsetH, radius) =>
  Platform.select({
    web: {textShadow: `${offsetW}px ${offsetH}px ${radius}px ${color}`},
    default: {
      textShadowColor: color,
      textShadowOffset: {width: offsetW, height: offsetH},
      textShadowRadius: radius,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
    height: '100%',
    width: '100%',
    maxWidth: 414,
    writingDirection: 'rtl',
  },
  postOverlayLtr: {
    ...StyleSheet.absoluteFillObject,
    ...forceLtrStyle,
    zIndex: 30,
    elevation: 30,
  },
  topBar: {
    /** Web: `fixed` keeps back + filters in the viewport when the document or a parent scrolls (same idea as `FeedBottomBar`). */
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 2,
    backgroundColor: '#1E1D27',
    zIndex: 200,
  },
  topBarSideBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
  },
  /** Smaller right-side spacer used when the search input is open, giving the input more width. */
  topBarRightSpacerSmall: {
    width: 0,
    height: 44,
  },
  topBarSearchIcon: {
    width: 26,
    height: 26,
  },
  topBarCenter: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 8,
  },
  topBarFilterBtn: {
    padding: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  topBarFilterIcon: {
    width: 24,
    height: 24,
  },
  /** Unseen-likes count badge on the heart icon in the top bar (matches Figma 8:95127). */
  likedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 10,
    backgroundColor: '#34F3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedBadgeText: {
    color: '#1E1D27',
    fontSize: 10,
    lineHeight: 12,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
  },
  /** Selected feed filter: tint only the PNG strokes (#FFC40A), no extra background */
  filterIconSelectedTint: {
    tintColor: '#FFC40A',
  },
  userSearchInputWrap: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#FFC40A',
    borderRadius: 20,
    backgroundColor: '#1E1D27',
    // Force-RTL base: `row` puts the text field on the right (where typing
    // begins) and the clear (X) button on the left end.
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginHorizontal: 0,
  },
  userSearchClearBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  userSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 20,
    fontFamily: 'Rubik-Regular',
    paddingVertical: 0,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  userSearchPanel: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: TOP_BAR_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: '#2B2A39',
    zIndex: 190,
  },
  // Force-RTL app: plain `row` lays children right → left (icon on the right,
  // chevron on the left), matching the user-search rows.
  hashtagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    height: 74,
    borderBottomWidth: 1,
    borderBottomColor: '#373548',
  },
  hashtagRowIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3A3850',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hashtagRowIconText: {
    color: '#FFC40A',
    fontSize: 26,
    fontFamily: 'Rubik-Bold',
  },
  hashtagRowTextWrap: {
    flex: 1,
    // Under forceRTL, flex-start = physical right, so the tag + count hug the
    // right edge next to the # icon (textAlign:'right' alone lands on the
    // physical left because of swapLeftAndRightInRTL on native).
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  hashtagRowTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Rubik-Medium',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hashtagRowCount: {
    color: '#9A98A8',
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    marginTop: 2,
  },
  hashtagExploreWrap: {
    flex: 1,
  },
  hashtagExploreHeader: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    // flex-start = physical right under forceRTL (see hashtagRowTextWrap).
    alignItems: 'flex-start',
  },
  hashtagExploreTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Rubik-Bold',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hashtagExploreCount: {
    color: '#9A98A8',
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    marginTop: 2,
  },
  exploreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 6,
    paddingBottom: 40,
  },
  exploreCell: {
    width: '50%',
    padding: 6,
  },
  exploreThumbWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1E1D27',
  },
  exploreThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E1D27',
  },
  exploreCellPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreCellVideoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreCaption: {
    color: '#EDECF2',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Rubik-Regular',
    // hebrewTextAlign renders physical right under forceRTL swap on native.
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginTop: 8,
  },
  exploreMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  exploreAuthorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  exploreAuthorName: {
    flex: 1,
    color: '#B9B7C7',
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
  },
  exploreLikesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 6,
  },
  exploreLikesText: {
    color: '#C9C7D6',
    fontSize: 12,
    fontFamily: 'Rubik-Medium',
  },
  userSearchSectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingVertical: 16,
  },
  userSearchSectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Medium',
    textAlign: 'right',
  },
  userSearchClearText: {
    color: '#FFC40A',
    fontSize: 20,
    fontFamily: 'Rubik-Regular',
  },
  userSearchList: {
    flex: 1,
  },
  userSearchListContent: {
    paddingBottom: 20,
  },
  // User-search list row — Figma node 943:117840 / 943:117842. The app runs
  // force-RTL (I18nManager.forceRTL + web dir="rtl"), so a plain
  // `flexDirection: 'row'` already lays children right → left: profile + text
  // on the start (right) side, dismiss (X) button on the end (left) side.
  userSearchRow: {
    height: 83,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#373548',
    backgroundColor: '#2B2A39',
  },
  userSearchRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userSearchTextWrap: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 8,
  },
  userSearchName: {
    color: '#F7F3E6',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    textAlign: 'right',
  },
  // Meta row under force-RTL: first child (subtitle) sits on the right, the
  // star-group to its left, so the visual reading order right → left is
  // subtitle → star → number.
  userSearchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userSearchMetaStarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Figma node 943:117842 — the 5★ variant uses a slightly wider gap (6px)
  // between the burst icon and the rating number than the 1–4★ variant (4px).
  userSearchMetaStarGroupFive: {
    gap: 6,
  },
  userSearchMetaText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    letterSpacing: 0.14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  userSearchMetaCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    letterSpacing: 0.14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    minWidth: 11,
  },
  userSearchDismissBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userSearchRatingIcon: {
    width: 14,
    height: 14,
  },
  /** Figma-styled star icon next to a user's rating number in the recent-search list. */
  userSearchStarIcon: {
    width: 16,
    height: 16,
  },
  /** Figma 943:117842 — 16×16 layout slot; ring star overflows ~4px per side. */
  userSearchFiveStarWrap: {
    width: 16,
    height: 16,
    position: 'relative',
    overflow: 'visible',
    flexShrink: 0,
  },
  userSearchFiveStarIcon: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 24,
    height: 24,
    ...(Platform.OS === 'web' ? {objectFit: 'contain'} : {}),
  },
  userSearchRatingGlowWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,196,10,0.24)',
    shadowColor: '#FFC40A',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 0},
    elevation: 8,
  },
  userSearchAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFC40A',
  },
  /** Gold ring wrapper with inner padding so there is visible breathing room between the ring and the avatar image. */
  userSearchAvatarRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    borderColor: '#FFC40A',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSearchAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  userSearchAvatarPlaceholder: {
    backgroundColor: '#343347',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSearchEmptyWrap: {
    paddingTop: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSearchEmptyText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  listModeWrapper: {
    position: 'absolute',
    top: TOP_BAR_HEIGHT,
    left: 0,
    right: 0,
    bottom: FEED_BOTTOM_BAR_CONTENT_HEIGHT,
    zIndex: 1,
    maxWidth: 414,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#1a1926',
    overflow: 'hidden',
  },
  listScrollView: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    backgroundColor: '#1a1926',
  },
  listScrollContent: {
    paddingBottom: 16,
    paddingHorizontal: 18,
    paddingTop: 8,
    backgroundColor: '#1a1926',
    gap: 12,
  },
  listScrollContentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    columnGap: 0,
    overflow: 'visible',
  },
  listResultsLoadingWrap: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  listScrollContentEmpty: {
    flexGrow: 1,
    minHeight: 400,
  },
  listEmptyInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  feedEmptyCard: {
    width: '100%',
    maxWidth: 260,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
    borderRadius: 20,
    backgroundColor: '#2B2A39',
    borderWidth: 1,
    borderColor: '#373548',
  },
  feedEmptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 196, 10, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  feedEmptyIcon: {
    marginBottom: 20,
  },
  feedEmptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 10,
  },
  feedEmptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  feedEmptyActionBtn: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: Colors.yellowIcons,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  feedEmptyActionText: {
    color: '#1E1D27',
    fontSize: 16,
    fontWeight: '700',
  },
  /** Empty category: centered message inside the feed viewport (sidebar stays visible). */
  feedEmptyInViewport: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 32,
  },
  feedEmptyFullScreen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: TOP_BAR_HEIGHT,
    bottom: FEED_BOTTOM_BAR_CONTENT_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    backgroundColor: '#000',
  },
  feedLoadingFullScreen: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    backgroundColor: '#000',
  },
  feedLoadingText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 16,
  },
  listCard: {
    width: '100%',
    maxWidth: 414,
    marginBottom: 16,
    backgroundColor: '#2B2A39',
    borderRadius: 16,
    overflow: 'hidden',
  },
  listCardImageWrap: {
    width: '100%',
    height: 252,
    backgroundColor: '#000',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardProfileBtn: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  listCardProfile: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFC40A',
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  listCardProfileImg: {
    width: '100%',
    height: '100%',
  },
  listCardProfilePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listCardBody: {
    backgroundColor: '#2B2A39',
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  listCardPurposeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 4,
  },
  listCardPurposeBadge: {
    height: 22,
    borderRadius: 1000,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardPreSaleBadge: {
    width: 93,
    height: 30,
  },
  listCardPurposeBadgeText: {
    color: '#1E1D27',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Medium',
  },
  listCardHeart: {
    padding: 2,
  },
  listCardHeartIcon: {
    width: 26,
    height: 26,
  },
  listCardLocationIcon: {
    width: 18,
    height: 18,
  },
  listCardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    flexWrap: 'wrap',
    gap: 10,
  },
  listCardStatItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  listCardStatIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  listCardStatText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  listCardAddress: {
    color: '#F7F3E6',
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
    textAlign: 'left',
  },
  listCardLandPrice: {
    color: '#F7F3E6',
    fontSize: 24,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'left',
    marginBottom: 4,
  },
  listCardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 4,
  },
  listCardLocationText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#000',
  },
  backButton: {
    marginLeft: 15,
  },
  backArrow: {
    color: '#fff',
    fontSize: 32,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  scrollView: {
    width: '100%',
    height: '100%',
    maxWidth: 414,
    margin: 0,
    padding: 0,
  },
  feedViewport: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
    maxWidth: 414,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  /** Sidebar + listing overlay — anchored from screen bottom (bar height + gap). */
  feedScrollView: {
    flexGrow: 0,
  },
  feedScrollViewWeb: {
    scrollSnapType: 'y mandatory',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
  },
  scrollContent: {
    width: '100%',
    maxWidth: 414,
    flexDirection: 'column',
    margin: 0,
    padding: 0,
  },
  videoItem: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
    maxWidth: 414,
    margin: 0,
    padding: 0,
    borderWidth: 0,
    ...(Platform.OS === 'web' ? {scrollSnapAlign: 'start', scrollSnapStop: 'always'} : {}),
  },
  feedPage: {
    position: 'relative',
    overflow: 'hidden',
  },
  feedPageChrome: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
  },
  /** Tap-to-pause sits above the video but below sidebar/actions (z20). */
  feedVideoPauseTap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
  },
  feedPageSidebar: {
    position: 'absolute',
    right: 10,
    top: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  feedPageSidebarDrag: Platform.select({
    web: {touchAction: 'none'},
    ios: {zIndex: 25},
    android: {elevation: 25},
    default: {},
  }),
  sidebarWarmupHidden: {
    position: 'absolute',
    right: 10,
    top: 0,
    opacity: 0,
    zIndex: -1,
  },
  feedPageActions: {
    position: 'absolute',
    left: FEED_OVERLAY_LEFT_PX,
    bottom: 0,
    flexDirection: 'column',
    alignItems: 'stretch',
    width: FEED_OVERLAY_TEXT_MAX_WIDTH,
    maxWidth: FEED_OVERLAY_TEXT_MAX_WIDTH,
    zIndex: 20,
  },
  textPostCardGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  textPostCardDescription: {
    color: '#fff',
    fontSize: 22,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  postDescriptionOverlay: {
    position: 'absolute',
    maxWidth: '75%',
  },
  postDescriptionOverlayText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    ...webTextShadow('rgba(0,0,0,0.9)', 1, 1, 4),
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  videoImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoImage: {
    width: '100%',
    height: '100%',
    maxWidth: Dimensions.get('window').width,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  rightActions: {
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconText: {
    fontSize: 24,
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    ...webTextShadow('rgba(0, 0, 0, 0.5)', 0, 1, 2),
  },
  bottomInfo: {
    flex: 1,
    paddingLeft: 20,
  },
  userInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    ...webTextShadow('rgba(0, 0, 0, 0.5)', 0, 1, 2),
  },
  videoTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    ...webTextShadow('rgba(0, 0, 0, 0.7)', 0, 1, 3),
  },
  videoDescription: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
    ...webTextShadow('rgba(0, 0, 0, 0.7)', 0, 1, 3),
  },
  videoMeta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    color: '#fff',
    fontSize: 14,
    ...webTextShadow('rgba(0, 0, 0, 0.7)', 0, 1, 3),
  },
  price: {
    color: Colors.yellowIcons,
    fontSize: 18,
    fontWeight: '700',
    ...webTextShadow('rgba(0, 0, 0, 0.7)', 0, 1, 3),
  },
  views: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    ...webTextShadow('rgba(0, 0, 0, 0.7)', 0, 1, 3),
  },
  navigationButtons: {
    position: 'absolute',
    left: 20,
    display: 'none',
    top: '50%',
    transform: [{translateY: -60}],
    alignItems: 'center',
    zIndex: 100,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  navButtonUp: {
    marginBottom: 20,
  },
  navButtonDown: {
    marginTop: 20,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  iconsContainer: {
    width: '100%',
    maxWidth: 414,
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: '100%',
  },
  icon: {
    width: 45,
    height: 45,
  },
  /** Empty feed: dim non-interactive chrome (still visible, not tappable). */
  chromeDisabledDim: {
    opacity: 0.42,
  },
  sidebar: {
    position: 'absolute',
    right: 10,
    bottom: 80,
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 100,
  },
  sidebarImageWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 0,
  },
  sidebarIntroHidden: {
    opacity: 0,
  },
  sidebarDragContent: {
    alignItems: 'center',
    width: '100%',
  },
  sidebarImageWrapCollapsed: {
    flex: 0,
    height: '48%',
    minHeight: 200,
  },
  sidebarImage: {
    width: 58,
    minHeight: 200,
  },
  sidebarArrowBtn: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sidebarArrowText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  sidebarFiltersStack: {
    alignItems: 'center',
    width: '100%',
    gap: 20,
  },
  sidebarFilterBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    minWidth: 60,
    minHeight: 56,
    paddingVertical: 0,
    paddingHorizontal: 0,
    gap: 4,
  },
  /** שותפים only: tighter pair — reduces effective gap vs stack `gap: 20`. */
  sidebarFilterBtnPartnersTight: {
    marginBottom: -14,
  },
  sidebarFilterIcon: {
    width: 32,
    height: 32,
  },
  sidebarFilterLabel: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    letterSpacing: 0.5447,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 72,
  },
  sidebarFilterLabelBnb: {
    maxWidth: 72,
    overflow: 'hidden',
  },
  sidebarFilterLabelWrap: {
    maxWidth: 72,
    minHeight: 32,
  },
  sidebarFilterLabelSelected: {
    color: '#FFC40A',
  },
  sidebarProfileWrap: {
    height: 70,
    paddingBottom: 14,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sidebarProfileAvatarBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarFollowBadge: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E1D27',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    elevation: 4,
  },
  sidebarFollowBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Rubik-Medium',
  },
  sidebarProfileRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFC40A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarProfilePic: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  sidebarProfilePlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarProfile: {
    width: 60,
    height: 60,
    marginBottom: 20,
  },
  sidebarIcon: {
    width: 38,
    height: 38,
    marginBottom: 16,
  },
  actionIconsContainer: {
    position: 'absolute',
    bottom: 94,
    left: 20,
    flexDirection: 'column',
    alignItems: flexStart,
    zIndex: 100,
  },
  propertyInfo: {
    alignItems: flexStart,
    width: '100%',
    maxWidth: FEED_OVERLAY_TEXT_MAX_WIDTH,
  },
  companyOverlayInfo: {
    alignItems: flexStart,
    width: '100%',
    maxWidth: FEED_OVERLAY_TEXT_MAX_WIDTH,
  },
  companyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 6,
    marginBottom: 12,
  },
  companyHeartButton: {
    marginLeft: 0,
    marginRight: 0,
  },
  companyTagPill: {
    minHeight: 38,
    borderRadius: 20,
    backgroundColor: '#fff',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  companyTagText: {
    color: '#1E1D27',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  companyTagIcon: {
    width: 25,
    height: 21,
  },
  companyPreSaleBadge: {
    width: 115,
    height: 40,
  },
  companyAddressWrap: {
    marginBottom: 10,
    width: '100%',
    maxWidth: FEED_OVERLAY_TEXT_MAX_WIDTH,
  },
  companyAddressText: {
    color: '#F7F3E6',
    fontSize: 24,
    fontFamily: 'Rubik-SemiBold',
    lineHeight: 31,
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    width: '100%',
  },
  companyStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 10,
  },
  companyStatItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  companyStatText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    lineHeight: 22,
  },
  companyStatIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  brokerOverlayInfo: {
    width: '100%',
    maxWidth: FEED_OVERLAY_TEXT_MAX_WIDTH,
    alignItems: flexStart,
  },
  partnersOverlayInfo: {
    width: '100%',
    maxWidth: FEED_OVERLAY_TEXT_MAX_WIDTH,
    alignItems: flexStart,
  },
  /** Shrink-wrapped like brokerTopRow so the heart hugs the physical right (RTL) instead of being pushed far left. */
  partnersTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: flexStart,
    gap: 14,
    maxWidth: '100%',
  },
  /** Purpose pill + name stacked; aligned to the right (under מחפש להכניס), not full-width left. */
  partnersMetaColumn: {
    flexDirection: 'column',
    alignItems: flexStart,
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
  },
  partnersPurposePill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 1000,
    paddingHorizontal: 6,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnersPurposeText: {
    color: '#1E1D27',
    fontSize: 14,
    lineHeight: 16,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.5447,
    textAlign: 'right',
  },
  partnersNameText: {
    color: '#F7F3E6',
    fontSize: 24,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  brokerTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 14,
    marginBottom: 12,
  },
  overlayHeartIcon: {
    width: TIKTOK_OVERLAY_HEART_SIZE,
    height: TIKTOK_OVERLAY_HEART_SIZE,
  },
  brokerHeartButton: {
    marginLeft: 0,
    marginRight: 14,
  },
  brokerPurposePill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 1000,
    paddingHorizontal: 6,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brokerPurposeText: {
    color: '#1E1D27',
    fontSize: 14,
    lineHeight: 16,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.5447,
    textAlign: 'right',
  },
  brokerPriceText: {
    color: '#F7F3E6',
    fontSize: 24,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    width: '100%',
    maxWidth: FEED_OVERLAY_TEXT_MAX_WIDTH,
    marginBottom: 5,
    ...webTextShadow('rgba(0, 0, 0, 0.7)', 0, 1, 3),
  },
  brokerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    width: '100%',
    maxWidth: FEED_OVERLAY_TEXT_MAX_WIDTH,
    gap: 3,
  },
  brokerLocationText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 32,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    flex: 1,
    minWidth: 0,
    ...webTextShadow('rgba(0, 0, 0, 0.7)', 0, 1, 3),
  },
  brokerLocationIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  bnbTagsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 8,
  },
  bnbHotDealTag: {
    backgroundColor: '#B13A46',
    borderRadius: 1000,
    height: 22,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bnbHotDealText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 14,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.4,
  },
  bnbPrimaryTag: {
    backgroundColor: '#FFC40A',
    borderRadius: 1000,
    height: 22,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bnbPrimaryTagText: {
    color: '#1E1D27',
    fontSize: 14,
    lineHeight: 16,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.5447,
  },
  bnbSecondaryTag: {
    backgroundColor: '#FFFFFF',
    borderRadius: 1000,
    height: 22,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 140,
  },
  bnbSecondaryTagText: {
    color: '#1E1D27',
    fontSize: 14,
    lineHeight: 16,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.5447,
    textAlign: 'right',
  },
  bnbPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: flexStart,
    width: '100%',
    gap: 7,
    marginBottom: 5,
  },
  bnbPriceLabel: {
    color: '#F7F3E6',
    fontSize: 14,
    lineHeight: 16,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.5447,
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
  },
  bnbPricePerNightLabels: {
    alignItems: flexStart,
    marginBottom: 4,
  },
  bnbPriceDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#F7F3E6',
    opacity: 0.8,
    marginBottom: 2,
  },
  bnbPriceMainText: {
    color: '#F7F3E6',
    fontSize: 24,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    flexShrink: 1,
    minWidth: 0,
    maxWidth: FEED_OVERLAY_TEXT_MAX_WIDTH - 120,
    ...webTextShadow('rgba(0, 0, 0, 0.7)', 0, 1, 3),
  },
  postActionsInfo: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    alignItems: flexStart,
  },
  openHouseTagRow: {
    width: '100%',
    alignItems: flexStart,
    marginBottom: 12,
  },
  openHouseTagImage: {
    width: 150,
    height: 56,
  },
  openHouseOverlayText: {
    color: '#F7F3E6',
    fontSize: 24,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: FEED_OVERLAY_TEXT_MAX_WIDTH,
    marginBottom: 10,
    ...webTextShadow('rgba(0, 0, 0, 0.7)', 0, 1, 3),
  },
  postHashtagsText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Rubik-Medium',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginBottom: 6,
    alignSelf: 'stretch',
    width: '100%',
    ...webTextShadow('rgba(0, 0, 0, 0.7)', 0, 1, 3),
  },
  postActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    alignSelf: 'stretch',
    width: '100%',
    gap: 2,
  },
  postActionItem: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  postActionIcon: {
    width: 32,
    height: 32,
  },
  postActionCountText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 16,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
  },
  commentsSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 500,
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  commentsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  commentsSheet: {
    width: '100%',
    maxWidth: 414,
    height: 654,
    backgroundColor: '#2B2A39',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
    flexDirection: 'column',
  },
  commentsTopHeader: {
    height: 37,
    backgroundColor: '#262531',
    borderBottomWidth: 1,
    borderBottomColor: '#373548',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsCountBar: {
    height: 50,
    backgroundColor: '#262531',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsHandle: {
    width: 40,
    height: 5,
    borderRadius: 3.123,
    backgroundColor: '#464646',
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  commentsList: {
    width: '100%',
  },
  commentsListFrame: {
    width: '100%',
    maxWidth: 350,
    flex: 1,
    minHeight: 0,
    alignSelf: 'center',
  },
  commentsListContent: {
    paddingBottom: 16,
    gap: 20,
  },
  commentCard: {
    minHeight: 140,
    borderRadius: 23.231,
    backgroundColor: '#373548',
    paddingHorizontal: 18.585,
    paddingVertical: 18.585,
    gap: 20,
  },
  commentHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 10,
    ...Platform.select({
      ios: {transform: [{translateX: -18}]},
      android: {transform: [{translateX: -18}]},
      default: {},
    }),
  },
  commentAuthorWrap: {
    alignItems: flexStart,
    width: 293.2,
  },
  commentPublisherBadge: {
    color: Colors.yellowIcons,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.25,
    marginBottom: 4,
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    alignSelf: 'stretch',
  },
  commentAuthorText: {
    color: '#F7F3E6',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
  },
  commentDateText: {
    color: '#D2D0DC',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    marginTop: 2,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6d6e87',
    borderWidth: 0.513,
    borderColor: '#FFF3CA',
  },
  commentAvatarPlaceholder: {
    backgroundColor: '#6d6e87',
  },
  commentBodyText: {
    color: '#fff',
    fontSize: 20,
    // Emojis extend above the font box — lineHeight === fontSize clips the top.
    lineHeight: 28,
    letterSpacing: 0.2,
    textAlign: 'left',
    writingDirection: 'rtl',
    fontFamily: 'Rubik-Regular',
    ...Platform.select({
      android: {includeFontPadding: false, textAlignVertical: 'center'},
      default: {},
    }),
  },
  commentBodyImage: {
    width: '100%',
    minHeight: 160,
    height: 200,
    maxHeight: 220,
    borderRadius: 14,
    backgroundColor: '#1E1D27',
    marginBottom: 4,
  },
  commentImagePreviewRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  commentImagePreviewInner: {
    position: 'relative',
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4D4966',
  },
  commentImagePreviewImg: {
    width: 200,
    height: 120,
  },
  commentImageRemoveBtn: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 14,
  },
  commentImagePreviewHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    fontFamily: 'Rubik-Regular',
  },
  commentSendBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  commentSendDisabled: {
    opacity: 0.4,
  },
  commentCardFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentWhenText: {
    color: '#A5A5A5',
    fontSize: 18,
    lineHeight: 18,
    fontFamily: 'Rubik-Regular',
  },
  commentActionsWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 30,
  },
  commentLikeWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 9.292,
  },
  commentActionIcon: {
    width: 24,
    height: 24,
  },
  commentActionIconActive: {
    opacity: 1,
  },
  commentLikeCountText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Regular',
  },
  commentsBottomSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    maxWidth: 414,
    alignSelf: 'center',
    backgroundColor: '#1E1D27',
    zIndex: 510,
    ...Platform.select({
      android: {elevation: 12},
      default: {},
    }),
  },
  reactionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#373548',
    overflow: 'visible',
  },
  reactionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  reactionText: {
    fontSize: 30,
    lineHeight: 36,
    color: '#fff',
    letterSpacing: 0.32,
    textAlign: 'center',
    ...Platform.select({
      android: {includeFontPadding: false, textAlignVertical: 'center'},
      default: {},
    }),
  },
  commentInputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
    justifyContent: 'space-between',
    width: '100%',
  },
  cameraBtn: {
    width: 24,
    height: 24,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    width: 24,
    height: 24,
  },
  commentInput: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#8C85B3',
    backgroundColor: 'transparent',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 0.2,
    textAlign: 'right',
    writingDirection: 'rtl',
    ...Platform.select({
      android: {includeFontPadding: false, textAlignVertical: 'center'},
      default: {},
    }),
  },
  commentsHomeIndicatorWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  commentsHomeIndicator: {
    width: 138,
    height: 5,
    borderRadius: 3.123,
    backgroundColor: '#fff',
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionIconButton: {
    marginLeft: 15,
  },
  actionIcon: {
    width: 40,
    height: 40,
  },
  actionIconLiked: {},
  forRentButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forRentText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  priceText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    ...webTextShadow('rgba(0, 0, 0, 0.7)', 0, 1, 3),
  },
  locationContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    width: '100%',
    maxWidth: FEED_OVERLAY_TEXT_MAX_WIDTH,
  },
  locationIcon: {
    width: 18,
    height: 18,
    marginLeft: 5,
  },
  locationText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    flex: 1,
    minWidth: 0,
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    ...webTextShadow('rgba(0, 0, 0, 0.7)', 0, 1, 3),
  },
  viewsLikesRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 6,
  },
  viewsLikesText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    ...webTextShadow('rgba(0, 0, 0, 0.7)', 0, 1, 2),
  },
  viewsLikesDot: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  /** Figma מגירת צור מודעה: dim the feed behind the drawer; tap to dismiss. */
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 299,
  },
  bottomSheetHost: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    maxWidth: 414,
    alignSelf: 'center',
    zIndex: 300,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    maxWidth: 414,
    backgroundColor: '#2B2A39',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 300,
  },
  bottomSheetHandleWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 8,
    minHeight: 52,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  bottomSheetOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  bottomSheetOptionContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
  },
  bottomSheetTextContainer: {
    flex: 1,
    alignItems: flexStart,
    marginLeft: 15,
  },
  bottomSheetTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 5,
  },
  bottomSheetSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  bottomSheetIcon: {
    width: 50,
    height: 50,
  },
  bottomSheetArrow: {
    color: '#fff',
    fontSize: 24,
    marginLeft: 10,
  },
  bottomSheetDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 5,
  },
  videoElement: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  feedVideoPlayer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  videoProcessingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  videoProcessingText: {
    color: '#FFC40A',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
  imageSwiper: {
    width: '100%',
    height: '100%',
  },
  swiperImageContainer: {
    width: Dimensions.get('window').width,
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swiperImageContainerSingle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  swiperImage: {
    width: '100%',
    height: '100%',
    maxWidth: Dimensions.get('window').width,
    maxHeight: Dimensions.get('window').height,
  },
  swiperImageSingle: {
    width: '100%',
    height: '100%',
    maxWidth: Dimensions.get('window').width,
    maxHeight: Dimensions.get('window').height,
    alignSelf: 'center',
  },
  imageIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
    elevation: 15,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    marginHorizontal: 4,
  },
  indicatorDotActive: {
    backgroundColor: '#FFC40A',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  collageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    position: 'relative',
  },
  collageImageContainer: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  collageImage: {
    width: '100%',
    height: '100%',
  },
});

/** Search icon in top header. */
function TopBarSearchIcon() {
  return (
    <Image
      source={TOP_BAR_SEARCH_ASSET}
      style={styles.topBarSearchIcon}
      resizeMode="contain"
    />
  );
}

export default TikTokFeedScreen;
