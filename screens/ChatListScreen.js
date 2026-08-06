import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useReducer,
  useMemo,
  useContext,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  Pressable,
  Alert,
  I18nManager,
  Animated,
  PanResponder,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  getConversationWithWelcomeMessage,
  normalizeConversationForOpen,
  isProfessionalUpdatesConversation,
} from '../utils/chatDefaults';
import {
  getChatConversations,
  searchBrokers,
  getUsersForGroupPicker,
  createChatGroup,
  uploadGroupImage,
  getChatParticipantDisplay,
  getResolvedApiUrl,
  deleteChatConversation,
  updateSubscriptionProfile,
} from '../utils/api';
import {ContextHook} from '../hooks/ContextHook';
import * as ImagePicker from 'expo-image-picker';
import {getUserProfileImageUrl, logProfilePic, DEFAULT_PI_PROFILE_AVATAR} from '../utils/userProfileImage';
import {flexEnd, flexStart, hebrewTextAlign} from '../utils/rtlLayout';
import ProfileAvatar from '../components/ProfileAvatar';
import CircleImageCropModal from '../components/CircleImageCropModal';
import {ensureMediaLibraryPermission} from '../utils/mediaLibraryPermission';
import {
  isRegularSubscriptionType,
  subscriptionTypes,
} from '../utils/constant';

/** Main chats list panel — matches Figma node 8:3115 */
const CHAT_LIST_PANEL_BG = '#2B2A39';
const HEADER_BG = '#1E1D27';
const CARD_BG = '#252436';
const GOLD = '#D4AF37';
/** Category chip on chat rows (e.g. דירות) */
const CATEGORY_BADGE_BG = '#FFC40A';
/** Matches Settings / chat list unread badge teal */
const CHAT_UNREAD_TEAL = '#5EEAD4';
const TEXT_LIGHT = 'rgba(255,255,255,0.55)';
const SEARCH_CLUE = 'rgba(255,255,255,0.35)';
const ROW_DIVIDER = '#373548';
const SEARCH_BORDER = '#8C85B3';

/** New Chat modal — match design spec */
const NC_SCREEN_BG = '#1A1A24';
/** Header + search shared bar (#1E1D27) */
const NC_TOP_SECTION_BG = 'rgba(30, 29, 39, 1)';
const NC_CARD_BG = '#2C2C3A';
const NC_TEXT_SECONDARY = 'rgba(255, 255, 255, 0.55)';
const NC_BORDER = 'rgba(255, 255, 255, 0.14)';
const NC_DIVIDER = 'rgba(255, 255, 255, 0.08)';
/** Toggle ring + check (New Chat footer) */
const NC_TOGGLE_AMBER = '#D4A351';
const NC_GROUP_CAMERA_ICON = require('../assets/pi-chat/camera.png');

const PI_CONV = getConversationWithWelcomeMessage('1', 'pi');

/** Brokers/customers list → { letter, rows }[] for Hebrew A–Z-style sections */
function bucketGroupListByFirstLetter(rows) {
  const sorted = [...rows].sort((a, b) =>
    String(a.title || '').localeCompare(String(b.title || ''), 'he'),
  );
  const map = new Map();
  for (const row of sorted) {
    const t = String(row.title || '').trim();
    let letter = '#';
    if (t) {
      const c0 = t[0];
      if (/[\u0590-\u05FF]/.test(c0)) letter = c0;
      else if (/[A-Za-z]/.test(c0)) letter = c0.toUpperCase();
    }
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter).push(row);
  }
  const letters = [...map.keys()].sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b, 'he');
  });
  return letters.map(letter => ({letter, rows: map.get(letter)}));
}

/** Resolves subscription type from user + nested subscription (API shapes vary). */
function getUserSubscriptionTypeLower(user) {
  if (!user || typeof user !== 'object') return '';
  const subObj =
    user.subscription && typeof user.subscription === 'object'
      ? user.subscription
      : null;
  const raw =
    user.subscription_type ??
    user.subscriptionType ??
    user.type ??
    subObj?.subscription_type ??
    subObj?.subscriptionType ??
    subObj?.type ??
    '';
  return String(raw).trim().toLowerCase();
}

const GROUP_PICK_INITIAL = {selected: {}, meta: {}};

function groupPickReducer(state, action) {
  switch (action.type) {
    case 'reset':
      return {selected: {}, meta: {}};
    case 'toggle': {
      const key = action.key;
      if (!key) return state;
      const row = action.row;
      const wasOn = !!state.selected[key];
      const selected = {...state.selected};
      const meta = {...state.meta};
      if (wasOn) {
        delete selected[key];
        delete meta[key];
      } else {
        selected[key] = true;
        if (row) {
          const title = row.title != null ? String(row.title) : key;
          const subtitle = row.subtitle != null ? String(row.subtitle) : '';
          const avatarUrl =
            normalizeChatListAvatarUri(
              getUserProfileImageUrl(row) ||
                row.profile_picture_url ||
                row.profileImageUrl ||
                null,
            ) || undefined;
          const subscriptionType =
            row.subscriptionType != null
              ? String(row.subscriptionType).trim().toLowerCase()
              : row.subscription_type != null
                ? String(row.subscription_type).trim().toLowerCase()
                : undefined;
          meta[key] = {title, subtitle, avatarUrl, subscriptionType};
        }
      }
      return {selected, meta};
    }
    case 'remove': {
      const key = action.key;
      if (!key) return state;
      const selected = {...state.selected};
      delete selected[key];
      const meta = {...state.meta};
      delete meta[key];
      return {selected, meta};
    }
    case 'setMeta': {
      const key = action.key;
      if (!key || !state.selected[key]) return state;
      const prev = state.meta[key] || {title: key};
      return {
        selected: state.selected,
        meta: {
          ...state.meta,
          [key]: {
            ...prev,
            ...(action.meta || {}),
          },
        },
      };
    }
    default:
      return state;
  }
}

function formatRelativeTimeHebrew(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 45) return 'עכשיו';
  if (sec < 3600) return `לפני ${Math.max(1, Math.floor(sec / 60))} דקות`;
  if (sec < 86400) return `לפני ${Math.floor(sec / 3600)} שעות`;
  if (sec < 604800) return `לפני ${Math.floor(sec / 86400)} ימים`;
  return d.toLocaleDateString('he-IL');
}

function normalizeChatListAvatarUri(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (
    lower.includes('/assets/assets/image-copy-10.png') ||
    lower.endsWith('/image-copy-10.png') ||
    lower === 'image-copy-10.png'
  ) {
    return null;
  }
  if (raw.startsWith('//')) return `https:${raw}`;
  if (/^(file:|blob:)/i.test(raw)) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      return encodeURI(raw);
    } catch (_) {
      return raw;
    }
  }
  const sb = process.env.EXPO_PUBLIC_SUPABASE_URL
    ? String(process.env.EXPO_PUBLIC_SUPABASE_URL).trim()
    : '';
  let origin = sb;
  if (origin && !/^https?:\/\//i.test(origin)) origin = `https://${origin}`;
  if (origin) {
    try {
      const u = new URL(origin);
      origin = `${u.protocol}//${u.host}`;
    } catch (_) {
      origin = origin.replace(/\/+$/, '');
    }
    if (raw.startsWith('/storage/v1/object/public/')) return `${origin}${raw}`;
    if (raw.startsWith('storage/v1/object/public/')) return `${origin}/${raw}`;
    if (raw.startsWith('/storage/v1/object/sign/')) return `${origin}${raw}`;
    if (raw.startsWith('storage/v1/object/sign/')) return `${origin}/${raw}`;
    if (raw.startsWith('/object/public/')) return `${origin}/storage/v1${raw}`;
    if (raw.startsWith('object/public/')) return `${origin}/storage/v1/${raw}`;
    if (raw.startsWith('/public/')) return `${origin}/storage/v1/object${raw}`;
    if (raw.startsWith('public/')) return `${origin}/storage/v1/object/${raw}`;
    if (raw.startsWith('/profile-pics/'))
      return `${origin}/storage/v1/object/public${raw}`;
    if (raw.startsWith('profile-pics/'))
      return `${origin}/storage/v1/object/public/${raw}`;
    if (raw.startsWith('/company-logos/'))
      return `${origin}/storage/v1/object/public${raw}`;
    if (raw.startsWith('company-logos/'))
      return `${origin}/storage/v1/object/public/${raw}`;
    if (/^[^/]+\/.+/.test(raw))
      return `${origin}/storage/v1/object/public/${raw}`;
  }
  try {
    if (/^https?:\/\//i.test(raw)) return encodeURI(raw);
    return raw;
  } catch (_) {
    return raw;
  }
}

const CHAT_LIST_AVATAR_PX = 56;
const CHAT_LIST_AVATAR_PLACEHOLDER = DEFAULT_PI_PROFILE_AVATAR;

/**
 * RN Web: `Image` often renders blank inside circular overflow + % sizes. Use DOM `img` with fixed px.
 */
function ChatListRowAvatar({
  uri,
  debugKey,
  userRef,
  subscriptionType,
  forceGoldRing = false,
}) {
  const trimmed = uri != null && String(uri).trim() ? String(uri).trim() : null;
  const initialSubType =
    subscriptionType != null && String(subscriptionType).trim()
      ? String(subscriptionType).trim().toLowerCase()
      : null;
  const [resolvedUri, setResolvedUri] = useState(trimmed);
  const [resolvedSubscriptionType, setResolvedSubscriptionType] = useState(
    initialSubType,
  );
  const [lookupTried, setLookupTried] = useState(false);
  const [useProxyStream, setUseProxyStream] = useState(false);
  const proxyBase = getResolvedApiUrl();
  const sourceUri =
    resolvedUri && useProxyStream
      ? `${proxyBase}/api/chat/avatar-url?src=${encodeURIComponent(resolvedUri)}`
      : resolvedUri;
  useEffect(() => {
    setResolvedUri(trimmed);
    setResolvedSubscriptionType(initialSubType);
    setLookupTried(false);
    setUseProxyStream(false);
  }, [trimmed, initialSubType]);

  // Resolve ring color even when the avatar image loads fine (type was only
  // fetched before on image error, so every row defaulted to the teal ring).
  useEffect(() => {
    if (forceGoldRing || initialSubType || !userRef || lookupTried) return;
    let cancelled = false;
    setLookupTried(true);
    (async () => {
      try {
        const res = await getChatParticipantDisplay(userRef);
        if (cancelled) return;
        const subType =
          res?.subscription_type != null && String(res.subscription_type).trim()
            ? String(res.subscription_type).trim().toLowerCase()
            : null;
        if (subType) setResolvedSubscriptionType(subType);
        const fallback =
          normalizeChatListAvatarUri(
            res?.profileImageUrl || res?.profile_picture_url || null,
          ) || null;
        if (fallback && !trimmed) {
          setResolvedUri(fallback);
        }
      } catch (_) {
        /* keep teal until type is known */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [forceGoldRing, initialSubType, userRef, lookupTried, trimmed]);

  useEffect(() => {
    logProfilePic(`ChatListRowAvatar.pull.${String(debugKey || 'row')}`, {
      row: debugKey || null,
      resolvedUri: trimmed || null,
      mode: useProxyStream ? 'proxy-stream-fallback' : 'direct-native-image',
      requestUrl: sourceUri || null,
      userRef: userRef || null,
      lookupTried,
      useProxyStream,
      subscriptionType: resolvedSubscriptionType,
    });
  }, [
    debugKey,
    trimmed,
    resolvedUri,
    sourceUri,
    userRef,
    lookupTried,
    useProxyStream,
    resolvedSubscriptionType,
  ]);

  const handleImageError = useCallback(async () => {
    logProfilePic(`ChatListRowAvatar.error.${String(debugKey || 'row')}`, {
      row: debugKey || null,
      failedUri: sourceUri || resolvedUri || null,
      userRef: userRef || null,
      lookupTried,
      useProxyStream,
    });
    if (resolvedUri && !useProxyStream) {
      setUseProxyStream(true);
      return;
    }
    if (resolvedUri && useProxyStream && lookupTried) {
      // Direct + proxy failed and we already attempted API lookup; force placeholder.
      setResolvedUri(null);
      return;
    }
    if (lookupTried || !userRef) return;
    setLookupTried(true);
    try {
      const res = await getChatParticipantDisplay(userRef);
      const fallback =
        normalizeChatListAvatarUri(
          res?.profileImageUrl || res?.profile_picture_url || null,
        ) || null;
      const subType =
        res?.subscription_type != null && String(res.subscription_type).trim()
          ? String(res.subscription_type).trim().toLowerCase()
          : null;
      logProfilePic(`ChatListRowAvatar.lookup.${String(debugKey || 'row')}`, {
        row: debugKey || null,
        userRef,
        apiSuccess: !!res?.success,
        apiProfileImageUrl: res?.profileImageUrl ?? null,
        fallbackUri: fallback,
        subscriptionType: subType,
      });
      if (subType) {
        setResolvedSubscriptionType(subType);
      }
      if (fallback && fallback !== resolvedUri) {
        setResolvedUri(fallback);
        setUseProxyStream(false);
      } else if (!fallback) {
        setResolvedUri(null);
      } else if (fallback === resolvedUri && useProxyStream) {
        // Lookup returned the same already-failing URL; show placeholder.
        setResolvedUri(null);
      }
    } catch (e) {
      logProfilePic(
        `ChatListRowAvatar.lookupFail.${String(debugKey || 'row')}`,
        {
          row: debugKey || null,
          userRef,
          error: e?.message ? String(e.message) : 'lookup_failed',
        },
      );
      setResolvedUri(null);
    }
  }, [debugKey, resolvedUri, sourceUri, userRef, lookupTried, useProxyStream]);

  return (
    <ProfileAvatar
      uri={sourceUri}
      size={CHAT_LIST_AVATAR_PX}
      subscriptionType={resolvedSubscriptionType}
      forceGoldRing={forceGoldRing === true}
      placeholderImage={CHAT_LIST_AVATAR_PLACEHOLDER}
      onImageError={handleImageError}
    />
  );
}

/**
 * Chat list: Pi welcome + real conversations from API (layout matches PiChat design).
 */
/** Width of the revealed delete action when a chat row is swiped left. */
const SWIPE_DELETE_WIDTH = 88;
/** Drag distance (px) past which release snaps the row fully open. */
const SWIPE_OPEN_THRESHOLD = 44;

/**
 * Wraps a direct-chat row so it can be swiped to reveal a delete action.
 * RTL: swipe right (+X) reveals delete on the start edge (physical left with swap).
 * Falls back to rendering children as-is when not deletable (groups / Pi).
 */
function SwipeableConversationRow({
  deletable,
  deleting,
  onDelete,
  onPress,
  children,
}) {
  const isRtl = I18nManager.isRTL;
  /** Fully open row offset: RTL swipes right (+X), LTR swipes left (-X). */
  const openTranslate = isRtl ? SWIPE_DELETE_WIDTH : -SWIPE_DELETE_WIDTH;
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);
  const dragBaseRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);

  const clampTranslate = useCallback(
    value => {
      if (isRtl) {
        if (value < 0) return 0;
        if (value > SWIPE_DELETE_WIDTH) return SWIPE_DELETE_WIDTH;
        return value;
      }
      if (value > 0) return 0;
      if (value < -SWIPE_DELETE_WIDTH) return -SWIPE_DELETE_WIDTH;
      return value;
    },
    [isRtl],
  );

  const shouldSnapOpen = useCallback(
    (finalX, velocityX = 0) => {
      const flingOpen = isRtl
        ? velocityX > 0.35
        : velocityX < -0.35;
      const flingClose = isRtl
        ? velocityX < -0.35
        : velocityX > 0.35;
      if (flingOpen) return true;
      if (flingClose) return false;
      return isRtl
        ? finalX > SWIPE_OPEN_THRESHOLD
        : finalX < -SWIPE_OPEN_THRESHOLD;
    },
    [isRtl],
  );

  const snapTo = useCallback(
    toOpen => {
      openRef.current = toOpen;
      setIsOpen(toOpen);
      Animated.timing(translateX, {
        toValue: toOpen ? openTranslate : 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    },
    [openTranslate, translateX],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => openRef.current,
        onMoveShouldSetPanResponder: (_evt, g) => {
          const absDx = Math.abs(g.dx);
          const absDy = Math.abs(g.dy);
          if (openRef.current && absDx > 4) return true;
          return absDx > 6 && absDx > absDy * 1.15;
        },
        onMoveShouldSetPanResponderCapture: (_evt, g) => {
          const absDx = Math.abs(g.dx);
          const absDy = Math.abs(g.dy);
          if (openRef.current && absDx > 4) return true;
          return absDx > 8 && absDx > absDy * 1.35;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragBaseRef.current = openRef.current ? openTranslate : 0;
        },
        onPanResponderMove: (_evt, g) => {
          translateX.setValue(clampTranslate(dragBaseRef.current + g.dx));
        },
        onPanResponderRelease: (_evt, g) => {
          const finalX = dragBaseRef.current + g.dx;
          const isTap = Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8;
          if (isTap) {
            if (openRef.current) snapTo(false);
            return;
          }
          snapTo(shouldSnapOpen(finalX, g.vx));
        },
        onPanResponderTerminate: () => snapTo(openRef.current),
      }),
    [clampTranslate, onPress, openTranslate, shouldSnapOpen, snapTo, translateX],
  );

  const handleDeletePress = useCallback(() => {
    snapTo(false);
    if (typeof onDelete === 'function') onDelete();
  }, [onDelete, snapTo]);

  if (!deletable) {
    return (
      <Pressable
        onPress={onPress}
        style={({pressed}) => [pressed && styles.rowPressed]}>
        {children}
      </Pressable>
    );
  }

  return (
    <View style={styles.swipeRowWrap}>
      <View
        style={[
          styles.swipeDeleteAction,
          isOpen && styles.swipeDeleteActionOpen,
        ]}>
        <TouchableOpacity
          style={styles.swipeDeleteBtn}
          activeOpacity={0.8}
          disabled={deleting}
          onPress={handleDeletePress}
          accessibilityRole="button"
          accessibilityLabel="מחק שיחה">
          {deleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={22}
                color="#fff"
              />
              <Text style={styles.swipeDeleteText}>מחק</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      <Animated.View
        style={[
          styles.swipeRowContent,
          Platform.OS === 'web' ? styles.swipeRowContentWeb : null,
          {transform: [{translateX}]},
        ]}
        {...panResponder.panHandlers}>
        <Pressable
          onPress={() => {
            if (openRef.current) {
              snapTo(false);
              return;
            }
            if (typeof onPress === 'function') onPress();
          }}
          style={({pressed}) => [pressed && styles.rowPressed]}>
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const ChatListScreen = ({
  onClose,
  onOpenChat,
  currentUser = null,
  refreshKey = 0,
  piWelcomeRead = true,
}) => {
  const insets = useSafeAreaInsets();
  const {setCurrentUser} = useContext(ContextHook);
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingConvId, setDeletingConvId] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [blockExclusiveOffers, setBlockExclusiveOffers] = useState(false);
  const [blockCollabOffers, setBlockCollabOffers] = useState(false);
  const [blockRelevantPostUpdates, setBlockRelevantPostUpdates] = useState(false);
  const [brokerResults, setBrokerResults] = useState([]);
  const [brokerSearchLoading, setBrokerSearchLoading] = useState(false);
  const [brokerSearchError, setBrokerSearchError] = useState(null);
  const brokerSearchSeq = useRef(0);
  /** Latest currentUser for fetchConversations without widening useCallback deps (avoids refetch/log spam on parent re-renders). */
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  /** 'customers' | 'brokers' | null — full-screen picker inside New Chat modal */
  const [groupFlow, setGroupFlow] = useState(null);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupCandidates, setGroupCandidates] = useState([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupPick, dispatchGroupPick] = useReducer(
    groupPickReducer,
    GROUP_PICK_INITIAL,
  );
  const groupSelected = groupPick.selected;
  const groupMemberMeta = groupPick.meta;
  const [groupWizardStep, setGroupWizardStep] = useState(1);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [groupImageUrl, setGroupImageUrl] = useState(null);
  const [groupImageUploading, setGroupImageUploading] = useState(false);
  const [groupCreating, setGroupCreating] = useState(false);
  const [groupCropUri, setGroupCropUri] = useState(null);
  const [groupCropVisible, setGroupCropVisible] = useState(false);
  const groupPickSeq = useRef(0);
  const groupMetaLookupInFlight = useRef(new Set());
  const currentUserType = getUserSubscriptionTypeLower(currentUser);
  const isBrokerUser = currentUserType === subscriptionTypes.broker;
  const isCompanyUser = currentUserType === subscriptionTypes.company;
  const isProfessionalUser = currentUserType === subscriptionTypes.professional;
  const isRegularUser = isRegularSubscriptionType(currentUserType);
  const canShowListingAdNumber = isBrokerUser || isCompanyUser;
  /** Brokers: any group. Companies: customer groups only. Regular/professional: open group with all user kinds. */
  const canOpenGroups =
    isBrokerUser || isRegularUser || isCompanyUser || isProfessionalUser;
  const isRegularGroupCreator = isRegularUser && !isBrokerUser;
  /** Regular + professional users share the simplified "קבוצה" flow (all user types in picker). */
  const usesSimpleGroupFlow = isRegularGroupCreator || isProfessionalUser;
  const groupPickerAudience =
    groupFlow === 'brokers'
      ? 'broker_only'
      : usesSimpleGroupFlow
        ? 'all'
        : 'regular';
  const hideMemberPickerSubtitle = groupPickerAudience === 'regular';

  const persistOfferBlockPreference = useCallback(
    async (field, nextValue) => {
      const subId = currentUser?.id;
      if (!subId) return;
      try {
        const res = await updateSubscriptionProfile(subId, {[field]: nextValue});
        if (res?.subscription) {
          setCurrentUser(prev => ({...(prev || {}), ...res.subscription}));
        } else {
          setCurrentUser(prev => ({...(prev || {}), [field]: nextValue}));
        }
      } catch (e) {
        if (field === 'block_exclusive_offers') {
          setBlockExclusiveOffers(!nextValue);
        } else if (field === 'block_collab_offers') {
          setBlockCollabOffers(!nextValue);
        } else if (field === 'block_relevant_post_updates') {
          setBlockRelevantPostUpdates(!nextValue);
        }
        Alert.alert('', e?.message || 'עדכון ההגדרה נכשל');
      }
    },
    [currentUser?.id, setCurrentUser],
  );

  const toggleBlockExclusiveOffers = useCallback(() => {
    const next = !blockExclusiveOffers;
    setBlockExclusiveOffers(next);
    persistOfferBlockPreference('block_exclusive_offers', next);
  }, [blockExclusiveOffers, persistOfferBlockPreference]);

  const toggleBlockCollabOffers = useCallback(() => {
    const next = !blockCollabOffers;
    setBlockCollabOffers(next);
    persistOfferBlockPreference('block_collab_offers', next);
  }, [blockCollabOffers, persistOfferBlockPreference]);

  const toggleBlockRelevantPostUpdates = useCallback(() => {
    const next = !blockRelevantPostUpdates;
    setBlockRelevantPostUpdates(next);
    persistOfferBlockPreference('block_relevant_post_updates', next);
  }, [blockRelevantPostUpdates, persistOfferBlockPreference]);

  useEffect(() => {
    if (!showNewChat) return;
    setBlockExclusiveOffers(currentUser?.block_exclusive_offers === true);
    setBlockCollabOffers(currentUser?.block_collab_offers === true);
    setBlockRelevantPostUpdates(
      currentUser?.block_relevant_post_updates === true,
    );
  }, [
    showNewChat,
    currentUser?.block_exclusive_offers,
    currentUser?.block_collab_offers,
    currentUser?.block_relevant_post_updates,
  ]);

  useEffect(() => {
    if (!showNewChat) {
      setNewChatSearch('');
      setBrokerResults([]);
      setBrokerSearchLoading(false);
      setBrokerSearchError(null);
      setGroupFlow(null);
      setGroupSearch('');
      setGroupCandidates([]);
      dispatchGroupPick({type: 'reset'});
      setGroupWizardStep(1);
      setGroupNameDraft('');
      setGroupImageUrl(null);
      setGroupImageUploading(false);
      setGroupCreating(false);
    }
  }, [showNewChat]);

  useEffect(() => {
    if (!showNewChat || !groupFlow) return;
    const myEmail = currentUser?.email
      ? String(currentUser.email).trim().toLowerCase()
      : null;
    if (!myEmail) {
      setGroupCandidates([]);
      setGroupLoading(false);
      return;
    }
    const q = groupSearch.trim();
    const seq = ++groupPickSeq.current;
    setGroupLoading(true);
    const audience = groupPickerAudience;
    const run = getUsersForGroupPicker(q, myEmail, audience);
    run
      .then(res => {
        if (groupPickSeq.current !== seq) return;
        let list = res.users || [];
        // Safety guard: broker-group picker must display only broker users.
        if (groupFlow === 'brokers') {
          list = list.filter(
            u =>
              String(u?.subscriptionType || '')
                .trim()
                .toLowerCase() === 'broker',
          );
        }
        setGroupCandidates(list);
      })
      .catch(() => {
        if (groupPickSeq.current !== seq) return;
        setGroupCandidates([]);
      })
      .finally(() => {
        if (groupPickSeq.current === seq) setGroupLoading(false);
      });
  }, [groupSearch, groupFlow, showNewChat, currentUser?.email, groupPickerAudience]);

  const toggleGroupMember = useCallback((email, row) => {
    const key = email != null ? String(email).trim().toLowerCase() : '';
    if (!key) return;
    logProfilePic(`ChatListScreen.groupPick.toggle.${key}`, {
      email: key,
      rowId: row?.id ?? null,
      rowEmail: row?.email ?? null,
      rowTitle: row?.title ?? null,
      rowProfile_picture_url: row?.profile_picture_url ?? null,
      rowProfileImageUrl: row?.profileImageUrl ?? null,
      resolvedFromRow: normalizeChatListAvatarUri(
        getUserProfileImageUrl(row) || null,
      ),
    });
    dispatchGroupPick({type: 'toggle', key, row});
  }, []);

  const removeGroupMember = useCallback(email => {
    const key = email != null ? String(email).trim().toLowerCase() : '';
    if (!key) return;
    dispatchGroupPick({type: 'remove', key});
  }, []);

  const selectedGroupEmails = Object.keys(groupSelected).filter(
    k => groupSelected[k],
  );
  const selectedCount = selectedGroupEmails.length;

  const handleGroupChipsCardLayout = useCallback(
    e => {
      const l = e?.nativeEvent?.layout || {};
      logProfilePic('ChatListScreen.groupChips.card.layout', {
        x: l.x ?? null,
        y: l.y ?? null,
        width: l.width ?? null,
        height: l.height ?? null,
        selectedCount,
        emails: selectedGroupEmails,
      });
    },
    [selectedCount, selectedGroupEmails],
  );

  const handleGroupChipsContentSize = useCallback(
    (w, h) => {
      logProfilePic('ChatListScreen.groupChips.scroll.contentSize', {
        contentWidth: w ?? null,
        contentHeight: h ?? null,
        selectedCount,
        emails: selectedGroupEmails,
      });
    },
    [selectedCount, selectedGroupEmails],
  );

  useEffect(() => {
    if (!showNewChat || !groupFlow || selectedGroupEmails.length === 0) return;
    for (const em of selectedGroupEmails) {
      const key = String(em || '')
        .trim()
        .toLowerCase();
      if (!key) continue;
      const existing = groupMemberMeta[key] || null;
      const resolvedExisting = normalizeChatListAvatarUri(
        existing?.avatarUrl || null,
      );
      if (resolvedExisting) continue;
      if (groupMetaLookupInFlight.current.has(key)) continue;
      groupMetaLookupInFlight.current.add(key);
      getChatParticipantDisplay(key)
        .then(res => {
          const avatarUrl = normalizeChatListAvatarUri(
            res?.profileImageUrl || res?.profile_picture_url || null,
          );
          const name =
            res?.name != null && String(res.name).trim()
              ? String(res.name).trim()
              : null;
          logProfilePic(`ChatListScreen.groupPick.lookup.${key}`, {
            email: key,
            apiSuccess: !!res?.success,
            apiName: name,
            apiProfileImageUrl: res?.profileImageUrl ?? null,
            apiProfile_picture_url: res?.profile_picture_url ?? null,
            normalizedAvatarUrl: avatarUrl,
          });
          if (avatarUrl || name) {
            dispatchGroupPick({
              type: 'setMeta',
              key,
              meta: {
                ...(name ? {title: name} : null),
                ...(avatarUrl ? {avatarUrl} : null),
              },
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          groupMetaLookupInFlight.current.delete(key);
        });
    }
  }, [showNewChat, groupFlow, selectedGroupEmails, groupMemberMeta]);

  useEffect(() => {
    if (!showNewChat || !groupFlow || selectedGroupEmails.length === 0) return;
    const perSelected = selectedGroupEmails.map(em => {
      const key = String(em || '')
        .trim()
        .toLowerCase();
      const rowFromList = groupCandidates.find(
        row =>
          String(row?.email || '')
            .trim()
            .toLowerCase() === key,
      );
      const meta = groupMemberMeta[key] || null;
      const resolvedCandidate = normalizeChatListAvatarUri(
        getUserProfileImageUrl(rowFromList) || null,
      );
      const resolvedMeta = normalizeChatListAvatarUri(meta?.avatarUrl || null);
      const resolvedFinal = resolvedCandidate || resolvedMeta || null;
      return {
        email: key,
        rowId: rowFromList?.id ?? null,
        rowEmail: rowFromList?.email ?? null,
        rowProfile_picture_url: rowFromList?.profile_picture_url ?? null,
        rowProfileImageUrl: rowFromList?.profileImageUrl ?? null,
        metaAvatarUrl: meta?.avatarUrl ?? null,
        resolvedCandidate,
        resolvedMeta,
        resolvedFinal,
      };
    });
    logProfilePic('ChatListScreen.groupChips.avatarResolution', {
      selectedCount: selectedGroupEmails.length,
      candidatesCount: groupCandidates.length,
      perSelected,
    });
  }, [
    showNewChat,
    groupFlow,
    selectedGroupEmails,
    groupCandidates,
    groupMemberMeta,
  ]);

  const resetGroupFlowState = useCallback(() => {
    setGroupFlow(null);
    setGroupSearch('');
    setGroupCandidates([]);
    dispatchGroupPick({type: 'reset'});
    setGroupWizardStep(1);
    setGroupNameDraft('');
    setGroupImageUrl(null);
    setGroupImageUploading(false);
  }, []);

  const uploadGroupAvatarCrop = useCallback(async uri => {
    if (!uri) return;
    setGroupImageUploading(true);
    try {
      const up = await uploadGroupImage({
        uri,
        type: 'image/jpeg',
        name: `group-${Date.now()}.jpg`,
      });
      if (up?.url) setGroupImageUrl(String(up.url).trim());
    } catch (e) {
      Alert.alert('', e?.message ? String(e.message) : 'העלאת התמונה נכשלה');
    } finally {
      setGroupImageUploading(false);
    }
  }, []);

  const handleGroupCropConfirm = useCallback(
    async result => {
      setGroupCropVisible(false);
      setGroupCropUri(null);
      if (result?.uri) await uploadGroupAvatarCrop(result.uri);
    },
    [uploadGroupAvatarCrop],
  );

  const handleGroupCropCancel = useCallback(() => {
    setGroupCropVisible(false);
    setGroupCropUri(null);
  }, []);

  const pickGroupAvatar = useCallback(async () => {
    if (groupImageUploading) return;
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = e => {
          const file = e.target.files?.[0];
          if (file) {
            setGroupCropUri(URL.createObjectURL(file));
            setGroupCropVisible(true);
          }
        };
        input.click();
        return;
      }
      const permitted = await ensureMediaLibraryPermission();
      if (!permitted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setGroupCropUri(result.assets[0].uri);
      setGroupCropVisible(true);
    } catch (e) {
      Alert.alert('', e?.message ? String(e.message) : 'בחירת התמונה נכשלה');
    }
  }, [groupImageUploading]);

  const submitCreateGroup = useCallback(async () => {
    const myEmail = currentUser?.email
      ? String(currentUser.email).trim().toLowerCase()
      : null;
    if (!myEmail || selectedCount < 1 || groupCreating || groupWizardStep !== 2)
      return;
    const rawTitle =
      groupNameDraft != null ? String(groupNameDraft).trim() : '';
    const defaultTitle =
      groupFlow === 'brokers'
        ? 'קבוצת מתווכים'
        : usesSimpleGroupFlow
          ? 'קבוצה'
          : 'קבוצת לקוחות';
    const title = rawTitle || defaultTitle;
    setGroupCreating(true);
    try {
      const {conversation} = await createChatGroup({
        creatorEmail: myEmail,
        creatorSubscriptionId: currentUser?.id || null,
        memberEmails: selectedGroupEmails,
        kind: usesSimpleGroupFlow ? 'open' : groupFlow,
        title,
        groupImageUrl: groupImageUrl || null,
      });
      const conv = conversation || {};
      const profileImageUrl =
        conv.profileImageUrl != null && String(conv.profileImageUrl).trim()
          ? String(conv.profileImageUrl).trim()
          : groupImageUrl || null;
      setShowNewChat(false);
      resetGroupFlowState();
      onOpenChat?.({
        id: conv.id,
        conversationId: conv.id,
        isGroup: true,
        otherUserEmail: null,
        name: conv.name || conv.title || title,
        profileImageUrl,
        preview: '',
        time: '',
      });
    } catch (e) {
      Alert.alert('', e?.message ? String(e.message) : 'יצירת הקבוצה נכשלה');
    } finally {
      setGroupCreating(false);
    }
  }, [
    currentUser?.email,
    selectedCount,
    selectedGroupEmails,
    groupFlow,
    groupCreating,
    groupWizardStep,
    groupNameDraft,
    groupImageUrl,
    usesSimpleGroupFlow,
    currentUser?.id,
    onOpenChat,
    resetGroupFlowState,
  ]);

  const onGroupWizardPrimary = useCallback(() => {
    if (groupWizardStep === 1) {
      if (selectedCount < 1) return;
      setGroupWizardStep(2);
      return;
    }
    submitCreateGroup();
  }, [groupWizardStep, selectedCount, submitCreateGroup]);

  useEffect(() => {
    if (!showNewChat) return;
    const q = newChatSearch.trim();
    if (q.length < 1) {
      setBrokerResults([]);
      setBrokerSearchLoading(false);
      setBrokerSearchError(null);
      return;
    }
    const seq = ++brokerSearchSeq.current;
    setBrokerSearchLoading(true);
    setBrokerSearchError(null);
    const exclude = currentUser?.email
      ? String(currentUser.email).trim().toLowerCase()
      : null;
    searchBrokers(q, exclude)
      .then(res => {
        if (brokerSearchSeq.current !== seq) {
          return;
        }
        const list = res.brokers || [];
        setBrokerResults(list);
      })
      .catch(err => {
        if (brokerSearchSeq.current !== seq) return;
        setBrokerResults([]);
        const msg = err?.message ? String(err.message) : 'שגיאת חיפוש';
        console.warn('[pi-chat][broker-search] ChatListScreen error', {
          seq,
          message: msg,
          err,
        });
        setBrokerSearchError(msg);
      })
      .finally(() => {
        if (brokerSearchSeq.current === seq) setBrokerSearchLoading(false);
      });
  }, [newChatSearch, showNewChat, currentUser?.email]);

  const openChatWithBroker = useCallback(
    b => {
      const email =
        b?.email != null ? String(b.email).trim().toLowerCase() : '';
      if (!email) return;
      setShowNewChat(false);
      onOpenChat?.({
        id: email,
        otherUserEmail: email,
        name: b.title || 'מתווך',
        profileImageUrl: getUserProfileImageUrl(b) || null,
        preview: '',
        time: '',
      });
    },
    [onOpenChat],
  );

  const fetchConversations = useCallback(
    async (isRefresh = false) => {
      const myEmail = currentUser?.email
        ? String(currentUser.email).trim().toLowerCase()
        : null;
      if (!myEmail) {
        setConversations([PI_CONV]);
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await getChatConversations(myEmail);
        const list = res.conversations || [];
        const asConv = list.map(c => {
          const peerSubTypeRaw =
            c.subscriptionType ?? c.subscription_type ?? null;
          const peerSubscriptionType =
            peerSubTypeRaw != null && String(peerSubTypeRaw).trim()
              ? String(peerSubTypeRaw).trim().toLowerCase()
              : null;
          return normalizeConversationForOpen({
            id: c.otherUserEmail || c.id,
            conversationId: c.id,
            otherUserEmail: c.otherUserEmail || null,
            isGroup: c.isGroup === true,
            name: c.name || 'משתמש',
            profileImageUrl:
              getUserProfileImageUrl(c) ||
              (c.groupImageUrl != null && String(c.groupImageUrl).trim()
                ? String(c.groupImageUrl).trim()
                : null) ||
              (c.group_image_url != null && String(c.group_image_url).trim()
                ? String(c.group_image_url).trim()
                : null) ||
              null,
            subscriptionType: peerSubscriptionType,
            subscription_type: peerSubscriptionType,
            preview: c.preview || '',
            time: c.time || '',
            lastMessageAt: c.lastMessageAt || null,
            listingId: c.listingId || null,
            listingDisplayNumber:
              c.listingDisplayNumber != null
                ? Number(c.listingDisplayNumber)
                : null,
            listingCategoryLabel: c.listingCategoryLabel || null,
            exclusiveOfferStatus: c.exclusiveOfferStatus || null,
            exclusiveOfferKind: c.exclusiveOfferKind || null,
            unreadCount:
              typeof c.unreadCount === 'number' ? Math.max(0, c.unreadCount) : 0,
          });
        });
        const cu = currentUserRef.current;
        logProfilePic('ChatListScreen.fetchConversations', {
          myEmail,
          rawConversationCount: list.length,
          loggedInUserResolvedPic: getUserProfileImageUrl(cu),
          loggedInUserRaw: cu && {
            profile_picture_url: cu.profile_picture_url,
            profileImageUrl: cu.profileImageUrl,
          },
          perConversation: list.map((c, i) => ({
            id: c.id,
            isGroup: !!c.isGroup,
            otherUserEmail: c.otherUserEmail ?? null,
            apiProfileImageUrl: c.profileImageUrl ?? null,
            resolvedFromApiRow: getUserProfileImageUrl(c),
            storedOnUiRow: asConv[i]?.profileImageUrl ?? null,
          })),
        });
        setConversations(asConv.length > 0 ? [...asConv, PI_CONV] : [PI_CONV]);
      } catch (err) {
        console.warn(
          '[ChatList] fetchConversations error:',
          err?.message || err,
        );
        setConversations([PI_CONV]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUser?.email],
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations, refreshKey]);

  useEffect(() => {
    if (!currentUser?.email) return;
    const interval = setInterval(() => fetchConversations(true), 20000);
    return () => clearInterval(interval);
  }, [currentUser?.email, fetchConversations]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? conversations.filter(
        c =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.preview || '').toLowerCase().includes(q) ||
          (c.listingCategoryLabel || '').toLowerCase().includes(q) ||
          (c.exclusiveOfferStatus != null &&
            q.length >= 2 &&
            /בלע|ממתין|נדחה/i.test(q)),
      )
    : conversations;

  const handleDeleteConversation = useCallback(
    conv => {
      if (!conv || conv.isGroup === true || conv.id === '1') return;
      const myEmail = currentUser?.email
        ? String(currentUser.email).trim().toLowerCase()
        : '';
      const otherEmail = conv.otherUserEmail
        ? String(conv.otherUserEmail).trim().toLowerCase()
        : '';
      if (!myEmail || !otherEmail) return;
      Alert.alert(
        'מחיקת שיחה',
        'האם למחוק את השיחה? לא ניתן לשחזר את ההודעות.',
        [
          {text: 'ביטול', style: 'cancel'},
          {
            text: 'מחק',
            style: 'destructive',
            onPress: async () => {
              setDeletingConvId(conv.id);
              try {
                await deleteChatConversation(myEmail, otherEmail);
                setConversations(prev =>
                  prev.filter(c => c.id !== conv.id),
                );
              } catch (err) {
                Alert.alert(
                  'שגיאה',
                  err?.message || 'מחיקת השיחה נכשלה, נסה שוב.',
                );
              } finally {
                setDeletingConvId(null);
              }
            },
          },
        ],
        {cancelable: true},
      );
    },
    [currentUser?.email],
  );

  const getConversationUnreadCount = useCallback(
    conv => {
      if (!conv) return 0;
      if (conv.id === '1' && !piWelcomeRead) {
        return Math.max(Number(conv.unreadCount) || 0, 1);
      }
      const n = Number(conv.unreadCount);
      return Number.isFinite(n) && n > 0 ? n : 0;
    },
    [piWelcomeRead],
  );

  const renderRowMeta = conv => {
    const isPi = conv.id === '1';
    const rel = formatRelativeTimeHebrew(conv.lastMessageAt) || conv.time || '';
    const isGroup = conv.isGroup === true;
    const exStatus =
      conv.exclusiveOfferStatus != null
        ? String(conv.exclusiveOfferStatus).trim().toLowerCase()
        : '';
    const showExclusiveRow =
      !isPi &&
      !isGroup &&
      (exStatus === 'pending' ||
        exStatus === 'accepted' ||
        exStatus === 'rejected');
    const showGroup = !isPi && isGroup;
    const showListing =
      canShowListingAdNumber &&
      !isPi &&
      !isGroup &&
      !!conv.listingId &&
      !showExclusiveRow;
    const showCategory =
      !isPi &&
      !isGroup &&
      !!conv.listingCategoryLabel &&
      !showExclusiveRow;

    if (isPi) {
      return (
        <View style={styles.metaRow}>
          {rel ? (
            <Text style={styles.metaTime} numberOfLines={1}>
              {rel}
            </Text>
          ) : null}
        </View>
      );
    }

    /* LTR row + flex-end: cluster sits toward avatar; visual order R→L is category | ad | time (time left of badges). */
    return (
      <View style={styles.metaRow}>
        {showCategory ? (
          <View style={styles.chatListCategoryPill}>
            <Text
              style={styles.badgeYellowText}
              numberOfLines={1}
              ellipsizeMode="tail">
              {conv.listingCategoryLabel}
            </Text>
          </View>
        ) : null}
        {showGroup ? (
          <View style={styles.badgeGrey}>
            <Text style={styles.badgeGreyText} numberOfLines={1}>
              קבוצה
            </Text>
          </View>
        ) : null}
        {showListing ? (
          <View style={styles.badgeGrey}>
            <Text style={styles.badgeGreyText} numberOfLines={1}>
              {conv.listingDisplayNumber != null &&
              !Number.isNaN(conv.listingDisplayNumber)
                ? `מודעה מס ${conv.listingDisplayNumber}`
                : 'מודעה'}
            </Text>
          </View>
        ) : null}
        {showExclusiveRow ? (
          <View
            style={[
              styles.chatListCategoryPill,
              styles.chatListCategoryPillFlexible,
            ]}>
            <Text
              style={styles.badgeYellowText}
              numberOfLines={1}
              ellipsizeMode="tail">
              {(() => {
                const kind = String(
                  conv.exclusiveOfferKind || conv.exclusive_offer_kind || '',
                )
                  .trim()
                  .toLowerCase();
                const isCollab = kind === 'collab';
                if (exStatus === 'accepted') {
                  return isCollab ? 'שת״פ' : 'בלעדיות';
                }
                if (exStatus === 'pending') {
                  return isCollab
                    ? 'שת״פ - ממתין לאישור'
                    : 'בלעדיות - ממתין לאישור';
                }
                if (exStatus === 'rejected') {
                  return isCollab ? 'שת״פ - נדחה' : 'בלעדיות - נדחה';
                }
                return '';
              })()}
            </Text>
          </View>
        ) : null}
        {rel ? (
          <Text style={styles.metaTime} numberOfLines={1} ellipsizeMode="tail">
            {rel}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={[styles.headerRow, {paddingTop: insets.top + 10}]}>
          <Pressable
            onPress={() =>
              typeof onClose === 'function' ? onClose() : undefined
            }
            style={({pressed}) => [
              styles.headerBackBtn,
              Platform.OS === 'web' && {cursor: 'pointer'},
              pressed && Platform.OS !== 'web' && {opacity: 0.7},
            ]}
            hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
            accessibilityRole="button"
            accessibilityLabel="חזרה">
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color="#fff"
            />
          </Pressable>
          <View style={styles.logoWrap}>
            <Image
              source={require('../assets/image-copy-9.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          {canOpenGroups ? (
            <TouchableOpacity
              style={styles.headerBtn}
              activeOpacity={0.7}
              onPress={() => setShowNewChat(true)}
              accessibilityRole="button"
              accessibilityLabel={
                usesSimpleGroupFlow ? 'קבוצה חדשה' : "צ'אט חדש"
              }>
              <View style={styles.plusCircle}>
                <MaterialCommunityIcons name="plus" size={22} color="#fff" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
        </View>
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="חפש"
            placeholderTextColor={SEARCH_CLUE}
            value={search}
            onChangeText={setSearch}
          />
          <MaterialCommunityIcons
            name="magnify"
            size={22}
            color={SEARCH_CLUE}
            style={styles.searchIcon}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={GOLD} />
          <Text style={styles.loadingText}>טוען שיחות...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchConversations(true)}
              tintColor={GOLD}
            />
          }>
          <View style={styles.scrollContentInner}>
            <View style={styles.topToListSpacer} />
            {filtered.map((conv, index) => {
              const rawPeerPic =
                conv.id === '1' ? null : getUserProfileImageUrl(conv);
              const rowAvatarUrl = normalizeChatListAvatarUri(rawPeerPic);
              const rowDebugKey =
                conv.id ?? conv.otherUserEmail ?? conv.name ?? `conv-${index}`;
              const rowUserRef = conv.otherUserEmail || conv.id || null;
              const isDeletable =
                conv.isGroup !== true &&
                conv.id !== '1' &&
                !!conv.otherUserEmail;
              const unreadCount = getConversationUnreadCount(conv);
              return (
                <SwipeableConversationRow
                  key={conv.id ?? conv.name ?? `conv-${index}`}
                  deletable={isDeletable}
                  deleting={deletingConvId === conv.id}
                  onDelete={() => handleDeleteConversation(conv)}
                  onPress={() => onOpenChat && onOpenChat(conv)}>
                  <View style={styles.messageRow}>
                    <View style={styles.rowMain}>
                      {renderRowMeta(conv)}
                      <Text style={styles.messagePreview} numberOfLines={2}>
                        {conv.preview != null &&
                        String(conv.preview).trim() !== ''
                          ? String(conv.preview)
                          : 'אין הודעות'}
                      </Text>
                    </View>
                    <View style={styles.avatarCol}>
                      <ChatListRowAvatar
                        uri={rowAvatarUrl}
                        debugKey={rowDebugKey}
                        userRef={
                          conv.isGroup === true || conv.id === '1'
                            ? null
                            : rowUserRef
                        }
                        subscriptionType={
                          conv.subscriptionType ||
                          conv.subscription_type ||
                          null
                        }
                        forceGoldRing={conv.id === '1' || isProfessionalUpdatesConversation(conv)}
                      />
                      <Text style={styles.senderName} numberOfLines={1}>
                        {conv.name != null ? String(conv.name) : 'משתמש'}
                      </Text>
                    </View>
                    {unreadCount > 0 ? (
                      <View
                        style={styles.chatUnreadBadge}
                        accessibilityRole="text"
                        accessibilityLabel={`הודעות שלא נקראו: ${
                          unreadCount > 99 ? 'יותר מ־99' : unreadCount
                        }`}>
                        <Text style={styles.chatUnreadBadgeText} numberOfLines={1}>
                          {unreadCount > 99 ? '99+' : String(unreadCount)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </SwipeableConversationRow>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={showNewChat}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowNewChat(false)}>
        <View style={styles.ncRoot}>
          <View style={styles.ncTopSection}>
            <View style={styles.ncHeader}>
              {groupFlow ? (
                <>
                  <View style={styles.ncWizardColStart}>
                    <TouchableOpacity
                      onPress={onGroupWizardPrimary}
                      disabled={
                        (groupWizardStep === 1 &&
                          (selectedCount < 1 || !currentUser?.email)) ||
                        (groupWizardStep === 2 &&
                          (groupCreating ||
                            groupImageUploading ||
                            !currentUser?.email))
                      }
                      style={styles.ncWizardPrimaryWrap}
                      activeOpacity={0.7}
                      hitSlop={{top: 12, bottom: 12, left: 8, right: 8}}
                      accessibilityRole="button"
                      accessibilityLabel={
                        groupWizardStep === 1 ? 'הבא' : 'שמור'
                      }>
                      {groupCreating && groupWizardStep === 2 ? (
                        <ActivityIndicator
                          size="small"
                          color={CATEGORY_BADGE_BG}
                        />
                      ) : (
                        <>
                          <Text style={styles.ncWizardPrimaryText}>
                            {groupWizardStep === 1 ? 'הבא >' : 'שמור >'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={[
                      styles.ncTitle,
                      styles.ncTitleWizard,
                      styles.ncTitleWizardText,
                    ]}>
                    {groupFlow === 'brokers'
                      ? 'צור קבוצת מתווכים'
                      : usesSimpleGroupFlow
                        ? 'קבוצה'
                        : 'צור קבוצת לקוחות'}
                  </Text>
                  <View style={styles.ncWizardColEnd}>
                    <TouchableOpacity
                      onPress={resetGroupFlowState}
                      style={styles.ncWizardCancelWrap}
                      activeOpacity={0.7}
                      hitSlop={{top: 12, bottom: 12, left: 8, right: 8}}
                      accessibilityRole="button"
                      accessibilityLabel="ביטול">
                      <Text style={styles.ncWizardCancelText}>ביטול</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setShowNewChat(false)}
                    style={styles.ncBackBtn}
                    activeOpacity={0.7}
                    hitSlop={{top: 16, bottom: 16, left: 16, right: 16}}>
                    <MaterialCommunityIcons
                      name="chevron-left"
                      size={28}
                      color="#fff"
                    />
                  </TouchableOpacity>
                  <Text style={styles.ncTitle}>
                    {usesSimpleGroupFlow ? 'קבוצה' : "צ'אט חדש"}
                  </Text>
                  <View style={styles.ncHeaderSpacer} />
                </>
              )}
            </View>
            {groupFlow && groupWizardStep === 1 ? (
              <View
                style={[styles.ncSearchFullBleed, styles.ncGroupSearchOffset]}>
                <View style={[styles.ncSearchWrap, styles.ncSearchWrapGold]}>
                  {groupSearch.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => setGroupSearch('')}
                      style={styles.ncSearchClearInside}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                      accessibilityRole="button"
                      accessibilityLabel="נקה חיפוש">
                      <Text style={styles.ncSearchClearGlyph}>×</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TextInput
                    style={[
                      styles.ncSearchInput,
                      groupSearch.length > 0 && styles.ncSearchInputPadClear,
                    ]}
                    placeholder={
                      groupFlow === 'brokers'
                        ? 'חפש מתווך לפי שם / משרד / טלפון'
                        : 'חפש משתמש לפי שם / טלפון'
                    }
                    placeholderTextColor={NC_TEXT_SECONDARY}
                    value={groupSearch}
                    onChangeText={setGroupSearch}
                  />
                  <MaterialCommunityIcons
                    name="magnify"
                    size={22}
                    color={NC_TEXT_SECONDARY}
                    style={styles.ncSearchIcon}
                  />
                </View>
              </View>
            ) : null}
            {groupFlow && groupWizardStep === 2 ? (
              <View style={styles.ncGroupStep2Card}>
                <TextInput
                  style={styles.ncGroupNameInput}
                  placeholder="שם הקבוצה"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={groupNameDraft}
                  onChangeText={setGroupNameDraft}
                />
                <TouchableOpacity
                  style={styles.ncGroupCameraBtn}
                  onPress={pickGroupAvatar}
                  disabled={groupImageUploading}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="תמונת קבוצה">
                  {groupImageUploading ? (
                    <ActivityIndicator size="small" color={GOLD} />
                  ) : groupImageUrl ? (
                    <Image
                      source={{uri: groupImageUrl}}
                      style={styles.ncGroupPickPreview}
                      resizeMode="cover"
                    />
                  ) : (
                    <Image
                      source={NC_GROUP_CAMERA_ICON}
                      style={styles.ncGroupCameraIcon}
                      resizeMode="contain"
                    />
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
            {groupFlow && selectedCount > 0 ? (
              <View style={styles.ncChipsSection}>
                <Text style={styles.ncChipsLabel}>
                  {groupFlow === 'brokers'
                    ? 'מתווכים שהתווספו'
                    : isRegularGroupCreator
                      ? 'חברים שהתווספו'
                      : 'אנשי קשר שהתווספו'}
                </Text>
                <View
                  style={styles.ncChipsCard}
                  onLayout={handleGroupChipsCardLayout}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={handleGroupChipsContentSize}
                    contentContainerStyle={styles.ncChipsScrollContent}>
                    {selectedGroupEmails.map(em => {
                      const key = String(em || '')
                        .trim()
                        .toLowerCase();
                      const rowFromList = groupCandidates.find(
                        row =>
                          String(row?.email || '')
                            .trim()
                            .toLowerCase() === key,
                      );
                      const meta = groupMemberMeta[key] || {title: em};
                      const pic = normalizeChatListAvatarUri(
                        getUserProfileImageUrl(rowFromList) ||
                          rowFromList?.profile_picture_url ||
                          rowFromList?.profileImageUrl ||
                          meta.avatarUrl ||
                          null,
                      );
                      const chipTitle =
                        (rowFromList?.title != null &&
                          String(rowFromList.title).trim()) ||
                        (meta.title != null && String(meta.title).trim()) ||
                        em;
                      return (
                        <View key={em} style={styles.ncChipCol}>
                          <View style={styles.ncChipAvatarWrap}>
                            <ProfileAvatar
                              uri={pic}
                              name={chipTitle}
                              size={72}
                              subscriptionType={
                                meta.subscriptionType ||
                                rowFromList?.subscriptionType ||
                                rowFromList?.subscription_type ||
                                (groupFlow === 'customers' ? 'user' : 'broker')
                              }
                            />
                            <TouchableOpacity
                              style={styles.ncChipRemove}
                              onPress={() => removeGroupMember(em)}
                              hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
                              accessibilityRole="button"
                              accessibilityLabel="הסר">
                              <Text style={styles.ncChipRemoveX}>×</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.ncChipName} numberOfLines={1}>
                            {chipTitle}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            ) : null}
            {!groupFlow && !isRegularGroupCreator ? (
              <>
                <View style={styles.ncSearchFullBleed}>
                  <View style={styles.ncSearchWrap}>
                    {newChatSearch.length > 0 ? (
                      <TouchableOpacity
                        onPress={() => setNewChatSearch('')}
                        style={styles.ncSearchClearInside}
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                        accessibilityRole="button"
                        accessibilityLabel="נקה חיפוש">
                        <Text style={styles.ncSearchClearGlyph}>×</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TextInput
                      style={[
                        styles.ncSearchInput,
                        newChatSearch.length > 0 &&
                          styles.ncSearchInputPadClear,
                      ]}
                      placeholder="חפש מתווך לפי שם / משרד / טלפון"
                      placeholderTextColor={NC_TEXT_SECONDARY}
                      value={newChatSearch}
                      onChangeText={setNewChatSearch}
                    />
                    <MaterialCommunityIcons
                      name="magnify"
                      size={22}
                      color={NC_TEXT_SECONDARY}
                      style={styles.ncSearchIcon}
                    />
                  </View>
                </View>
                {brokerSearchError ? (
                  <Text style={styles.ncBrokerSearchError}>
                    {brokerSearchError}
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>

          {groupFlow ? (
            groupWizardStep === 1 ? (
              <ScrollView
                style={styles.ncScroll}
                contentContainerStyle={[
                  styles.ncScrollContent,
                  styles.ncGroupScrollPad,
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {!currentUser?.email ? (
                  <Text style={styles.ncBrokerEmpty}>
                    התחבר/י לחשבון כדי ליצור קבוצה.
                  </Text>
                ) : groupFlow === 'customers' &&
                  groupLoading &&
                  groupCandidates.length === 0 ? (
                  <View style={styles.ncBrokerLoading}>
                    <ActivityIndicator size="small" color={GOLD} />
                  </View>
                ) : groupLoading && groupCandidates.length === 0 ? (
                  <View style={styles.ncBrokerLoading}>
                    <ActivityIndicator size="small" color={GOLD} />
                  </View>
                ) : groupCandidates.length === 0 ? (
                  <Text style={styles.ncBrokerEmpty}>
                    {groupFlow === 'customers'
                      ? isRegularGroupCreator
                        ? 'לא נמצאו משתמשים. חפשו לפי שם או טלפון.'
                        : 'אין אנשי קשר עדיין. התחל/י שיחה פרטית — הוא יופיע כאן.'
                      : 'לא נמצאו מתווכים.'}
                  </Text>
                ) : groupSearch.trim().length > 0 ? (
                  <View
                    style={[
                      styles.ncLetterSection,
                      styles.ncSearchResultsSection,
                    ]}>
                    <Text
                      style={[
                        styles.ncLetterHeading,
                        styles.ncSectionHeadingFigma,
                      ]}>
                      תוצאות חיפוש
                    </Text>
                    <View style={styles.ncBrokerCard}>
                      {groupCandidates.map((row, j) => {
                        const email =
                          row.email != null
                            ? String(row.email).trim().toLowerCase()
                            : '';
                        const checked = !!(email && groupSelected[email]);
                        const pic = getUserProfileImageUrl(row);
                        const title =
                          row.title != null ? String(row.title) : email;
                        const sub =
                          row.subtitle != null ? String(row.subtitle) : '';
                        return (
                          <Pressable
                            key={email || row.id || `g-search-${j}`}
                            style={[
                              styles.ncPickRow,
                              j > 0 && styles.ncBrokerRowBorder,
                            ]}
                            onPress={() =>
                              email && toggleGroupMember(email, row)
                            }
                            android_ripple={{color: 'rgba(255,255,255,0.06)'}}>
                            <View style={styles.ncPickCheck}>
                              <View
                                style={[
                                  styles.ncPickCheckOuter,
                                  checked && styles.ncPickCheckOuterOn,
                                ]}>
                                {checked ? (
                                  <MaterialCommunityIcons
                                    name="check"
                                    size={14}
                                    color={NC_TOGGLE_AMBER}
                                  />
                                ) : null}
                              </View>
                            </View>
                            <View style={styles.ncBrokerTextCol}>
                              <Text
                                style={styles.ncBrokerTitle}
                                numberOfLines={1}>
                                {title}
                              </Text>
                              {sub && sub !== title && !hideMemberPickerSubtitle ? (
                                <Text
                                  style={styles.ncBrokerSubtitle}
                                  numberOfLines={1}>
                                  {sub}
                                </Text>
                              ) : null}
                            </View>
                            <ProfileAvatar
                              uri={pic}
                              name={title}
                              size={60}
                              subscriptionType={
                                row?.subscriptionType ||
                                row?.subscription_type ||
                                (groupFlow === 'customers' ? 'user' : 'broker')
                              }
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  bucketGroupListByFirstLetter(groupCandidates).map(
                    ({letter, rows}) => (
                      <View key={letter} style={styles.ncLetterSection}>
                        <Text style={styles.ncLetterHeading}>
                          {letter === '#' ? '…' : letter}
                        </Text>
                        <View style={styles.ncBrokerCard}>
                          {rows.map((row, j) => {
                            const email =
                              row.email != null
                                ? String(row.email).trim().toLowerCase()
                                : '';
                            const checked = !!(email && groupSelected[email]);
                            const pic = getUserProfileImageUrl(row);
                            const title =
                              row.title != null ? String(row.title) : email;
                            const sub =
                              row.subtitle != null ? String(row.subtitle) : '';
                            return (
                              <Pressable
                                key={email || row.id || `g-${letter}-${j}`}
                                style={[
                                  styles.ncPickRow,
                                  j > 0 && styles.ncBrokerRowBorder,
                                ]}
                                onPress={() =>
                                  email && toggleGroupMember(email, row)
                                }
                                android_ripple={{
                                  color: 'rgba(255,255,255,0.06)',
                                }}>
                                <View style={styles.ncPickCheck}>
                                  <View
                                    style={[
                                      styles.ncPickCheckOuter,
                                      checked && styles.ncPickCheckOuterOn,
                                    ]}>
                                    {checked ? (
                                      <MaterialCommunityIcons
                                        name="check"
                                        size={14}
                                        color={NC_TOGGLE_AMBER}
                                      />
                                    ) : null}
                                  </View>
                                </View>
                                <View style={styles.ncBrokerTextCol}>
                                  <Text
                                    style={styles.ncBrokerTitle}
                                    numberOfLines={1}>
                                    {title}
                                  </Text>
                                  {sub && sub !== title && !hideMemberPickerSubtitle ? (
                                    <Text
                                      style={styles.ncBrokerSubtitle}
                                      numberOfLines={1}>
                                      {sub}
                                    </Text>
                                  ) : null}
                                </View>
                                <ProfileAvatar
                                  uri={pic}
                                  name={title}
                                  size={60}
                                  subscriptionType={
                                    row?.subscriptionType ||
                                    row?.subscription_type ||
                                    (groupFlow === 'customers'
                                      ? 'user'
                                      : 'broker')
                                  }
                                />
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ),
                  )
                )}
              </ScrollView>
            ) : (
              <View style={[styles.ncScroll, styles.ncGroupStep2Body]} />
            )
          ) : (
            <ScrollView
              style={styles.ncScroll}
              contentContainerStyle={styles.ncScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {newChatSearch.trim().length >= 1 ? (
                <>
                  <Text style={styles.ncSectionLabel}>מתווכים</Text>
                  <View style={styles.ncBrokerCard}>
                    {brokerSearchLoading ? (
                      <View style={styles.ncBrokerLoading}>
                        <ActivityIndicator size="small" color={GOLD} />
                      </View>
                    ) : brokerResults.length === 0 ? (
                      <Text style={styles.ncBrokerEmpty}>לא נמצאו מתווכים</Text>
                    ) : (
                      brokerResults.map((b, i) => {
                        const pic = getUserProfileImageUrl(b);
                        return (
                          <TouchableOpacity
                            key={b.id || b.email || `b-${i}`}
                            style={[
                              styles.ncBrokerRow,
                              i > 0 && styles.ncBrokerRowBorder,
                            ]}
                            onPress={() => openChatWithBroker(b)}
                            activeOpacity={0.75}>
                            <View style={styles.ncBrokerTextCol}>
                              <Text
                                style={styles.ncBrokerTitle}
                                numberOfLines={1}>
                                {b.title}
                              </Text>
                              <Text
                                style={styles.ncBrokerSubtitle}
                                numberOfLines={2}>
                                {b.subtitle}
                              </Text>
                            </View>
                            <View style={styles.ncBrokerAvatarRing}>
                              <View style={styles.ncBrokerAvatarInner}>
                                {pic ? (
                                  <Image
                                    source={{uri: pic}}
                                    style={styles.ncBrokerAvatarImg}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <Image
                                    source={DEFAULT_PI_PROFILE_AVATAR}
                                    style={styles.ncBrokerAvatarImg}
                                    resizeMode="cover"
                                  />
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                </>
              ) : null}

              {isRegularGroupCreator ? (
                <>
                  <Text
                    style={[styles.ncSectionLabel, styles.ncSectionLabelSpaced]}>
                    קבוצה
                  </Text>
                  <View style={styles.ncCard}>
                    <Pressable
                      style={({pressed}) => [
                        styles.ncRow,
                        pressed && styles.ncRowPressed,
                      ]}
                      onPress={() => {
                        dispatchGroupPick({type: 'reset'});
                        setGroupWizardStep(1);
                        setGroupNameDraft('');
                        setGroupImageUrl(null);
                        setGroupSearch('');
                        setGroupFlow('customers');
                      }}
                      android_ripple={{color: 'rgba(255,255,255,0.08)'}}>
                      <MaterialCommunityIcons
                        name="chevron-left"
                        size={22}
                        color="#FFFFFF"
                        style={styles.ncChevron}
                      />
                      <View style={styles.ncRowTextWrap}>
                        <Text style={styles.ncRowTitle}>קבוצה</Text>
                        <Text style={styles.ncRowSubtitle}>
                          פתחו קבוצה עם כל סוגי המשתמשים
                        </Text>
                      </View>
                      <View style={styles.ncIconBubble}>
                        <Image
                          source={require('../assets/pi-chat/private-group.png')}
                          style={styles.ncIconImage}
                          resizeMode="contain"
                        />
                      </View>
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.ncToggleRow}
                    onPress={toggleBlockExclusiveOffers}
                    android_ripple={{color: 'rgba(255,255,255,0.06)'}}>
                    <View style={styles.ncToggleOuter}>
                      {blockExclusiveOffers ? (
                        <MaterialCommunityIcons
                          name="check"
                          size={15}
                          color={NC_TOGGLE_AMBER}
                        />
                      ) : null}
                    </View>
                    <Text style={styles.ncToggleLabel}>חסום הצעות לבלעדיות</Text>
                  </Pressable>
                </>
              ) : isProfessionalUser ? (
                <>
                  <Text
                    style={[styles.ncSectionLabel, styles.ncSectionLabelSpaced]}>
                    קבוצה
                  </Text>
                  <View style={styles.ncCard}>
                    <Pressable
                      style={({pressed}) => [
                        styles.ncRow,
                        pressed && styles.ncRowPressed,
                      ]}
                      onPress={() => {
                        dispatchGroupPick({type: 'reset'});
                        setGroupWizardStep(1);
                        setGroupNameDraft('');
                        setGroupImageUrl(null);
                        setGroupSearch('');
                        setGroupFlow('customers');
                      }}
                      android_ripple={{color: 'rgba(255,255,255,0.08)'}}>
                      <MaterialCommunityIcons
                        name="chevron-left"
                        size={22}
                        color="#FFFFFF"
                        style={styles.ncChevron}
                      />
                      <View style={styles.ncRowTextWrap}>
                        <Text style={styles.ncRowTitle}>קבוצה</Text>
                        <Text style={styles.ncRowSubtitle}>
                          פתחו קבוצה עם כל סוגי המשתמשים
                        </Text>
                      </View>
                      <View style={styles.ncIconBubble}>
                        <Image
                          source={require('../assets/pi-chat/private-group.png')}
                          style={styles.ncIconImage}
                          resizeMode="contain"
                        />
                      </View>
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.ncToggleRow}
                    onPress={toggleBlockRelevantPostUpdates}
                    android_ripple={{color: 'rgba(255,255,255,0.06)'}}>
                    <View style={styles.ncToggleOuter}>
                      {blockRelevantPostUpdates ? (
                        <MaterialCommunityIcons
                          name="check"
                          size={15}
                          color={NC_TOGGLE_AMBER}
                        />
                      ) : null}
                    </View>
                    <Text style={styles.ncToggleLabel}>
                      חסום עדכון פוסטים רלוונטים
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text
                    style={[styles.ncSectionLabel, styles.ncSectionLabelSpaced]}>
                    מתווכים
                  </Text>

                  <View style={styles.ncCard}>
                    <Pressable
                      style={({pressed}) => [
                        styles.ncRow,
                        pressed && styles.ncRowPressed,
                      ]}
                      onPress={() => {
                        if (!canOpenGroups) {
                          Alert.alert('', 'אין הרשאה לפתוח קבוצות');
                          return;
                        }
                        dispatchGroupPick({type: 'reset'});
                        setGroupWizardStep(1);
                        setGroupNameDraft('');
                        setGroupImageUrl(null);
                        setGroupSearch('');
                        setGroupFlow('customers');
                      }}
                      android_ripple={{color: 'rgba(255,255,255,0.08)'}}>
                      <MaterialCommunityIcons
                        name="chevron-left"
                        size={22}
                        color="#FFFFFF"
                        style={styles.ncChevron}
                      />
                      <View style={styles.ncRowTextWrap}>
                        <Text style={styles.ncRowTitle}>צור קבוצת לקוחות</Text>
                        <Text style={styles.ncRowSubtitle}>
                          יצר קבוצה ייעודית ללקוחות שלך
                        </Text>
                      </View>
                      <View style={styles.ncIconBubble}>
                        <Image
                          source={require('../assets/pi-chat/private-group.png')}
                          style={styles.ncIconImage}
                          resizeMode="contain"
                        />
                      </View>
                    </Pressable>
                    {isBrokerUser ? (
                      <>
                        <View style={styles.ncRowDivider} />
                        <Pressable
                          style={({pressed}) => [
                            styles.ncRow,
                            pressed && styles.ncRowPressed,
                          ]}
                          onPress={() => {
                            if (!isBrokerUser) {
                              Alert.alert(
                                '',
                                'רק מתווכים יכולים לפתוח קבוצת מתווכים',
                              );
                              return;
                            }
                            dispatchGroupPick({type: 'reset'});
                            setGroupWizardStep(1);
                            setGroupNameDraft('');
                            setGroupImageUrl(null);
                            setGroupSearch('');
                            setGroupFlow('brokers');
                          }}
                          android_ripple={{color: 'rgba(255,255,255,0.08)'}}>
                          <MaterialCommunityIcons
                            name="chevron-left"
                            size={22}
                            color="#FFFFFF"
                            style={styles.ncChevron}
                          />
                          <View style={styles.ncRowTextWrap}>
                            <Text style={styles.ncRowTitle}>
                              צור קבוצת מתווכים
                            </Text>
                            <Text style={styles.ncRowSubtitle}>
                              שתף פעולה עם מתווכים על נכסים, אירועי בית פתוח ועוד
                              בקבוצה ייעודית.
                            </Text>
                          </View>
                          <View style={styles.ncIconBubble}>
                            <Image
                              source={require('../assets/pi-chat/brokers-group.png')}
                              style={styles.ncIconImage}
                              resizeMode="contain"
                            />
                          </View>
                        </Pressable>
                      </>
                    ) : null}
                  </View>

                  <Pressable
                    style={styles.ncToggleRow}
                    onPress={toggleBlockCollabOffers}
                    android_ripple={{color: 'rgba(255,255,255,0.06)'}}>
                    <View style={styles.ncToggleOuter}>
                      {blockCollabOffers ? (
                        <MaterialCommunityIcons
                          name="check"
                          size={15}
                          color={NC_TOGGLE_AMBER}
                        />
                      ) : null}
                    </View>
                    <Text style={styles.ncToggleLabel}>חסום הצעות לשת"פ</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
      <CircleImageCropModal
        visible={groupCropVisible}
        imageUri={groupCropUri}
        onCancel={handleGroupCropCancel}
        onConfirm={handleGroupCropConfirm}
        title="חתוך את תמונת הקבוצה"
      />
    </View>
  );
};

const isWeb = Platform.OS === 'web';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CHAT_LIST_PANEL_BG,
    ...(isWeb && {minHeight: '100%'}),
  },
  topSection: {
    backgroundColor: '#1E1D27',
    borderBottomWidth: 0,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1D27',
    paddingTop: 54,
    paddingBottom: 10,
  },
  headerBtn: {padding: 0, marginLeft: 10},
  headerBackBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {flexDirection: 'row', alignItems: 'center'},
  logoImage: {height: 34, width: 77},
  plusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    marginHorizontal: 10,
    marginTop: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: SEARCH_BORDER,
    minHeight: 52,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingLeft: 44,
    color: '#fff',
    fontSize: 20,
    letterSpacing: 0.2,
    textAlign: hebrewTextAlign,
    fontFamily: 'Rubik-Regular',
    writingDirection: 'rtl',
  },
  searchIcon: {position: 'absolute', right: 16},
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {color: TEXT_LIGHT, fontSize: 14},
  scroll: {flex: 1},
  scrollContent: {
    paddingBottom: 32,
    backgroundColor: CHAT_LIST_PANEL_BG,
    flexGrow: 1,
  },
  scrollContentInner: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  topToListSpacer: {
    height: 8,
    backgroundColor: '#1c1b22',
    width: '100%',
  },
  swipeRowWrap: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#C0392B',
    overflow: 'hidden',
  },
  swipeDeleteAction: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: SWIPE_DELETE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDeleteActionOpen: {
    zIndex: 2,
    elevation: 2,
  },
  swipeDeleteBtn: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipeDeleteText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  swipeRowContent: {
    width: '100%',
    backgroundColor: '#2B2A39',
  },
  swipeRowContentWeb: {
    touchAction: 'pan-y',
    cursor: 'grab',
  },
  rowPressed: {
    opacity: 0.75,
  },
  messageRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    minHeight: 125,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#2B2A39',
    borderBottomWidth: 1,
    borderBottomColor: ROW_DIVIDER,
    width: '100%',
    flexShrink: 0,
    gap: 12,
    position: 'relative',
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    alignItems: flexEnd,
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 7,
    marginBottom: 18,
    width: '100%',
    minHeight: 22,
    overflow: 'hidden',
  },
  metaTime: {
    color: '#D2D0DC',
    fontSize: 14,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Regular',
    flexShrink: 1,
    minWidth: 0,
  },
  /** Same fill + radius + padding as category chip ("דירות"); used for exclusivity + listing category */
  chatListCategoryPill: {
    backgroundColor: CATEGORY_BADGE_BG,
    paddingHorizontal: 10,
    minHeight: 22,
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    maxWidth: '100%',
    borderWidth: 0,
  },
  /** Layout-only: longer exclusivity labels may shrink; does not change pill color */
  chatListCategoryPillFlexible: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '92%',
  },
  badgeYellowText: {
    color: '#1E1D27',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
  },
  badgeGrey: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    minHeight: 22,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeGreyText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Regular',
  },
  messagePreview: {
    color: '#fff',
    fontSize: 18,
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    lineHeight: 22,
    width: '100%',
    fontFamily: 'Rubik-Regular',
  },
  chatUnreadBadge: {
    position: 'absolute',
    left: 16,
    top: 12,
    minWidth: 24,
    height: 24,
    minHeight: 24,
    borderRadius: 12,
    backgroundColor: CHAT_UNREAD_TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    zIndex: 2,
  },
  chatUnreadBadgeText: {
    color: '#1a1a2e',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Rubik-Medium',
    includeFontPadding: false,
    textAlign: 'center',
  },
  avatarCol: {
    alignItems: 'center',
    width: 100,
    flexShrink: 0,
    marginTop: 12,
  },
  senderName: {
    color: '#F7F3E6',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    width: '100%',
    fontFamily: 'Rubik-Regular',
  },

  ncRoot: {
    flex: 1,
    backgroundColor: NC_SCREEN_BG,
    ...(isWeb && {minHeight: '100vh'}),
  },
  ncTopSection: {
    backgroundColor: NC_TOP_SECTION_BG,
    paddingTop: 48,
    paddingHorizontal: 0,
    paddingBottom: 12,
  },
  ncHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 0,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  ncWizardColStart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexEnd,
    minWidth: 0,
  },
  ncWizardColEnd: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    minWidth: 0,
  },
  ncTitleWizard: {flex: 2, minWidth: 0},
  ncTitleWizardText: {
    fontSize: 16,
  },
  ncWizardPrimaryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  ncWizardPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Rubik-Regular',
  },
  ncWizardCancelWrap: {paddingVertical: 4, paddingHorizontal: 2},
  ncWizardCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Rubik-Light',
  },
  ncBackBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ncHeaderSpacer: {width: 44},
  ncTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  ncScroll: {flex: 1, backgroundColor: NC_SCREEN_BG},
  ncScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    backgroundColor: NC_SCREEN_BG,
  },
  ncSearchFullBleed: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 16,
  },
  ncGroupSearchOffset: {
    marginTop: 16,
  },
  ncSearchWrap: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#8C85B3',
    minHeight: 52,
    position: 'relative',
  },
  ncSearchWrapGold: {
    borderColor: GOLD,
  },
  ncSearchClearInside: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  ncSearchClearGlyph: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 24,
    textAlign: 'center',
    fontFamily: 'Rubik-Regular',
  },
  ncSearchInput: {
    flex: 1,
    width: '100%',
    // minWidth: 0,
    paddingVertical: 10,
    paddingRight: 16,
    paddingLeft: 46,
    color: '#FFFFFF',
    fontSize: 20,
    textAlign: hebrewTextAlign,
    fontFamily: 'Rubik-Regular',
    writingDirection: 'rtl',
  },
  ncSearchInputPadClear: {
    paddingLeft: 52,
  },
  ncSearchIcon: {position: 'absolute', right: 14, zIndex: 1},
  ncBrokerSearchError: {
    color: '#E57373',
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    marginTop: 8,
    paddingHorizontal: 16,
    width: '100%',
  },
  ncSectionLabel: {
    color: '#D2D0DC',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    marginBottom: 10,
    width: '100%',
  },
  ncSectionLabelSpaced: {
    marginTop: 8,
  },
  ncBrokerCard: {
    backgroundColor: NC_CARD_BG,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  ncBrokerLoading: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ncBrokerEmpty: {
    color: NC_TEXT_SECONDARY,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    paddingVertical: 20,
    paddingHorizontal: 16,
    width: '100%',
  },
  ncBrokerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 72,
  },
  ncBrokerRowBorder: {
    borderTopWidth: 1,
    borderTopColor: NC_DIVIDER,
  },
  ncBrokerTextCol: {
    flex: 1,
    minWidth: 0,
    alignItems: flexStart,
    paddingRight: 10,
  },
  ncBrokerTitle: {
    color: '#F7F3E6',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    lineHeight: 21,
    textAlign: 'left',
    marginBottom: 4,
  },
  ncBrokerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    lineHeight: 16,
    letterSpacing: 0.14,
  },
  ncBrokerAvatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD_BG,
    flexShrink: 0,
  },
  ncBrokerAvatarInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  ncBrokerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  ncCard: {
    backgroundColor: NC_CARD_BG,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  ncRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    minHeight: 103,
  },
  ncRowPressed: {backgroundColor: 'rgba(255,255,255,0.05)'},
  ncChevron: {marginRight: 10},
  ncRowTextWrap: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: flexStart,
  },
  ncRowTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    marginBottom: 12,
  },
  ncRowSubtitle: {
    color: NC_TEXT_SECONDARY,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    lineHeight: 16,
    letterSpacing: 0.5447,
  },
  ncRowDivider: {
    height: 1,
    backgroundColor: NC_DIVIDER,
    marginHorizontal: 0,
  },
  ncIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ncIconImage: {
    width: 40,
    height: 40,
  },
  ncGroupScrollPad: {
    paddingTop: 8,
    paddingBottom: 28,
  },
  ncGroupStep2Body: {
    flex: 1,
    backgroundColor: NC_SCREEN_BG,
  },
  ncGroupStep2Card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: NC_CARD_BG,
    borderRadius: 12,
    gap: 18,
    minHeight: 129,
  },
  ncGroupNameInput: {
    flex: 1,
    minWidth: 0,
    color: '#FFFFFF',
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    borderBottomWidth: 1,
    borderBottomColor: '#8C85B3',
    paddingBottom: 4,
    paddingTop: 0,
    writingDirection: 'rtl',
  },
  ncGroupCameraBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#4D4966',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ncGroupCameraIcon: {width: 24, height: 24},
  ncGroupPickPreview: {width: 60, height: 60, borderRadius: 30},
  ncChipsSection: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 4,
    width: '100%',
  },
  ncChipsLabel: {
    color: '#D2D0DC',
    fontSize: 17,
    lineHeight: 17,
    letterSpacing: 0,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    marginTop: 6,
    marginBottom: 8,
  },
  ncChipsCard: {
    width: '100%',
    backgroundColor: NC_CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 118,
    alignItems: flexStart,
  },
  ncChipsScrollContent: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: flexStart,
    minWidth: '100%',
    gap: 12,
  },
  ncChipCol: {
    width: 72,
    alignItems: 'center',
  },
  ncChipAvatarWrap: {
    position: 'relative',
    width: 72,
    height: 73,
    marginBottom: 10,
  },
  ncChipAvatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3.2,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD_BG,
  },
  ncChipAvatarInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  ncChipAvatarImg: {width: '100%', height: '100%'},
  ncChipRemove: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ncChipRemoveX: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 18,
    fontFamily: 'Rubik-Regular',
    marginTop: -2,
  },
  ncChipName: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    width: '100%',
  },
  ncLetterSection: {
    marginBottom: 24,
    width: '100%',
  },
  ncSearchResultsSection: {
    marginTop: -6,
  },
  ncLetterHeading: {
    color: '#D2D0DC',
    fontSize: 18,
    lineHeight: 18,
    letterSpacing: 0,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  ncSectionHeadingFigma: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  ncPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 103,
  },
  ncPickCheck: {
    width: 24,
    height: 24,
    marginRight: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ncPickCheckOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: NC_TOGGLE_AMBER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ncPickCheckOuterOn: {
    backgroundColor: '#000000',
  },
  ncGroupFooter: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 28,
    backgroundColor: NC_SCREEN_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: NC_DIVIDER,
  },
  ncGroupCreateBtn: {
    backgroundColor: CATEGORY_BADGE_BG,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ncGroupCreateBtnDisabled: {
    opacity: 0.45,
  },
  ncGroupCreateBtnText: {
    color: '#1A1A24',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  ncToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    paddingVertical: 6,
    alignSelf: 'stretch',
    paddingHorizontal: 2,
    marginTop: -4,
  },
  ncToggleLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    marginLeft: 12,
    flexShrink: 1,
  },
  ncToggleOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: NC_TOGGLE_AMBER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

export default ChatListScreen;
