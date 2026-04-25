import React, {useState, useEffect, useCallback, useRef, useReducer} from 'react';
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
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {getConversationWithWelcomeMessage} from '../utils/chatDefaults';
import {
  getChatConversations,
  searchBrokers,
  getUsersForGroupPicker,
  createChatGroup,
  uploadGroupImage,
  getChatParticipantDisplay,
  getResolvedApiUrl,
} from '../utils/api';
import * as ImagePicker from 'expo-image-picker';
import {getUserProfileImageUrl, logProfilePic} from '../utils/userProfileImage';

/** Main chats list panel — matches Figma node 8:3115 */
const CHAT_LIST_PANEL_BG = '#2B2A39';
const HEADER_BG = '#1E1D27';
const CARD_BG = '#252436';
const GOLD = '#D4AF37';
/** Category chip on chat rows (e.g. דירות) */
const CATEGORY_BADGE_BG = '#FFC40A';
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
  return letters.map((letter) => ({letter, rows: map.get(letter)}));
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
          meta[key] = {title, subtitle, avatarUrl};
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
    if (raw.startsWith('/profile-pics/')) return `${origin}/storage/v1/object/public${raw}`;
    if (raw.startsWith('profile-pics/')) return `${origin}/storage/v1/object/public/${raw}`;
    if (raw.startsWith('/company-logos/')) return `${origin}/storage/v1/object/public${raw}`;
    if (raw.startsWith('company-logos/')) return `${origin}/storage/v1/object/public/${raw}`;
    if (/^[^/]+\/.+/.test(raw)) return `${origin}/storage/v1/object/public/${raw}`;
  }
  try {
    if (/^https?:\/\//i.test(raw)) return encodeURI(raw);
    return raw;
  } catch (_) {
    return raw;
  }
}

const CHAT_LIST_AVATAR_PX = 58;
const CHAT_LIST_AVATAR_PLACEHOLDER = require('../assets/image-copy-10.png');

/**
 * RN Web: `Image` often renders blank inside circular overflow + % sizes. Use DOM `img` with fixed px.
 */
function ChatListRowAvatar({uri, debugKey, userRef}) {
  const trimmed = uri != null && String(uri).trim() ? String(uri).trim() : null;
  const [resolvedUri, setResolvedUri] = useState(trimmed);
  const [lookupTried, setLookupTried] = useState(false);
  const [useProxyStream, setUseProxyStream] = useState(false);
  const proxyBase = getResolvedApiUrl();
  const sourceUri =
    resolvedUri && useProxyStream
      ? `${proxyBase}/api/chat/avatar-url?src=${encodeURIComponent(resolvedUri)}`
      : resolvedUri;
  const src = sourceUri ? {uri: sourceUri} : CHAT_LIST_AVATAR_PLACEHOLDER;

  useEffect(() => {
    setResolvedUri(trimmed);
    setLookupTried(false);
    setUseProxyStream(false);
  }, [trimmed]);

  useEffect(() => {
    logProfilePic(`ChatListRowAvatar.pull.${String(debugKey || 'row')}`, {
      row: debugKey || null,
      resolvedUri: trimmed || null,
      mode: useProxyStream ? 'proxy-stream-fallback' : 'direct-native-image',
      requestUrl: sourceUri || null,
      userRef: userRef || null,
      lookupTried,
      useProxyStream,
    });
  }, [debugKey, trimmed, resolvedUri, sourceUri, userRef, lookupTried, useProxyStream]);

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
          res?.profileImageUrl ||
            res?.profile_picture_url ||
            null,
        ) || null;
      logProfilePic(`ChatListRowAvatar.lookup.${String(debugKey || 'row')}`, {
        row: debugKey || null,
        userRef,
        apiSuccess: !!res?.success,
        apiProfileImageUrl: res?.profileImageUrl ?? null,
        fallbackUri: fallback,
      });
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
      logProfilePic(`ChatListRowAvatar.lookupFail.${String(debugKey || 'row')}`, {
        row: debugKey || null,
        userRef,
        error: e?.message ? String(e.message) : 'lookup_failed',
      });
      setResolvedUri(null);
    }
  }, [debugKey, resolvedUri, sourceUri, userRef, lookupTried, useProxyStream]);

  return (
    <View style={styles.avatarRing}>
      <View style={styles.avatarImageWrap}>
        <Image
          source={src}
          style={styles.avatarImage}
          resizeMode="cover"
          onLoad={() =>
            logProfilePic(`ChatListRowAvatar.load.${String(debugKey || 'row')}`, {
              row: debugKey || null,
              uri: trimmed || null,
              ok: true,
            })
          }
          onError={(e) =>
            handleImageError(e)
          }
        />
      </View>
    </View>
  );
}

/**
 * Chat list: Pi welcome + real conversations from API (layout matches PiChat design).
 */
const ChatListScreen = ({
  onClose,
  onOpenChat,
  currentUser = null,
  refreshKey = 0,
}) => {
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [blockCollabOffers, setBlockCollabOffers] = useState(false);
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
  const [groupPick, dispatchGroupPick] = useReducer(groupPickReducer, GROUP_PICK_INITIAL);
  const groupSelected = groupPick.selected;
  const groupMemberMeta = groupPick.meta;
  const [groupWizardStep, setGroupWizardStep] = useState(1);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [groupImageUrl, setGroupImageUrl] = useState(null);
  const [groupImageUploading, setGroupImageUploading] = useState(false);
  const [groupCreating, setGroupCreating] = useState(false);
  const groupPickSeq = useRef(0);
  const groupMetaLookupInFlight = useRef(new Set());
  const currentUserType = String(
    currentUser?.subscription_type || currentUser?.subscriptionType || currentUser?.type || '',
  )
    .trim()
    .toLowerCase();
  const canOpenGroups = !currentUserType || currentUserType === 'broker';

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
    const myEmail = currentUser?.email ? String(currentUser.email).trim().toLowerCase() : null;
    if (!myEmail) {
      setGroupCandidates([]);
      setGroupLoading(false);
      return;
    }
    const q = groupSearch.trim();
    const seq = ++groupPickSeq.current;
    setGroupLoading(true);
    const audience = groupFlow === 'brokers' ? 'broker_only' : 'regular';
    const run = getUsersForGroupPicker(q, myEmail, audience);
    run
      .then((res) => {
        if (groupPickSeq.current !== seq) return;
        let list = res.users || [];
        // Safety guard: broker-group picker must display only broker users.
        if (groupFlow === 'brokers') {
          list = list.filter(
            (u) => String(u?.subscriptionType || '').trim().toLowerCase() === 'broker',
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
  }, [groupSearch, groupFlow, showNewChat, currentUser?.email]);

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
      resolvedFromRow: normalizeChatListAvatarUri(getUserProfileImageUrl(row) || null),
    });
    dispatchGroupPick({type: 'toggle', key, row});
  }, []);

  const removeGroupMember = useCallback((email) => {
    const key = email != null ? String(email).trim().toLowerCase() : '';
    if (!key) return;
    dispatchGroupPick({type: 'remove', key});
  }, []);

  const selectedGroupEmails = Object.keys(groupSelected).filter((k) => groupSelected[k]);
  const selectedCount = selectedGroupEmails.length;

  const handleGroupChipsCardLayout = useCallback(
    (e) => {
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
      const key = String(em || '').trim().toLowerCase();
      if (!key) continue;
      const existing = groupMemberMeta[key] || null;
      const resolvedExisting = normalizeChatListAvatarUri(existing?.avatarUrl || null);
      if (resolvedExisting) continue;
      if (groupMetaLookupInFlight.current.has(key)) continue;
      groupMetaLookupInFlight.current.add(key);
      getChatParticipantDisplay(key)
        .then((res) => {
          const avatarUrl = normalizeChatListAvatarUri(
            res?.profileImageUrl ||
              res?.profile_picture_url ||
              null,
          );
          const name = res?.name != null && String(res.name).trim() ? String(res.name).trim() : null;
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
    const perSelected = selectedGroupEmails.map((em) => {
      const key = String(em || '').trim().toLowerCase();
      const rowFromList = groupCandidates.find(
        (row) => String(row?.email || '').trim().toLowerCase() === key,
      );
      const meta = groupMemberMeta[key] || null;
      const resolvedCandidate = normalizeChatListAvatarUri(getUserProfileImageUrl(rowFromList) || null);
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
  }, [showNewChat, groupFlow, selectedGroupEmails, groupCandidates, groupMemberMeta]);

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

  const pickGroupAvatar = useCallback(async () => {
    if (groupImageUploading) return;
    try {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (lib.status !== 'granted') {
        Alert.alert('', 'נדרשת גישה לתמונות');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const a = result.assets[0];
      const uri = a.uri;
      const mime = a.mimeType || 'image/jpeg';
      const name = a.fileName || `group-${Date.now()}.jpg`;
      setGroupImageUploading(true);
      const up = await uploadGroupImage({uri, type: mime, name});
      if (up?.url) setGroupImageUrl(String(up.url).trim());
    } catch (e) {
      Alert.alert('', e?.message ? String(e.message) : 'העלאת התמונה נכשלה');
    } finally {
      setGroupImageUploading(false);
    }
  }, [groupImageUploading]);

  const submitCreateGroup = useCallback(async () => {
    const myEmail = currentUser?.email ? String(currentUser.email).trim().toLowerCase() : null;
    if (!myEmail || selectedCount < 1 || groupCreating || groupWizardStep !== 2) return;
    const rawTitle = groupNameDraft != null ? String(groupNameDraft).trim() : '';
    const defaultTitle = groupFlow === 'brokers' ? 'קבוצת מתווכים' : 'קבוצת לקוחות';
    const title = rawTitle || defaultTitle;
    setGroupCreating(true);
    try {
      const {conversation} = await createChatGroup({
        creatorEmail: myEmail,
        memberEmails: selectedGroupEmails,
        kind: groupFlow,
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
    const exclude = currentUser?.email ? String(currentUser.email).trim().toLowerCase() : null;
    console.log('[pi-chat][broker-search] ChatListScreen immediate', {
      seq,
      query: q,
      excludeEmail: exclude,
      platform: Platform.OS,
    });
    searchBrokers(q, exclude)
      .then((res) => {
        if (brokerSearchSeq.current !== seq) {
          console.log('[pi-chat][broker-search] ChatListScreen stale response ignored', {seq, current: brokerSearchSeq.current});
          return;
        }
        const list = res.brokers || [];
        console.log('[pi-chat][broker-search] ChatListScreen success', {
          seq,
          brokerCount: list.length,
          first: list[0] ? {title: list[0].title, email: list[0].email} : null,
        });
        setBrokerResults(list);
      })
      .catch((err) => {
        if (brokerSearchSeq.current !== seq) return;
        setBrokerResults([]);
        const msg = err?.message ? String(err.message) : 'שגיאת חיפוש';
        console.warn('[pi-chat][broker-search] ChatListScreen error', {seq, message: msg, err});
        setBrokerSearchError(msg);
      })
      .finally(() => {
        if (brokerSearchSeq.current === seq) setBrokerSearchLoading(false);
      });
  }, [newChatSearch, showNewChat, currentUser?.email]);

  const openChatWithBroker = useCallback(
    (b) => {
      const email = b?.email != null ? String(b.email).trim().toLowerCase() : '';
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

  const fetchConversations = useCallback(async (isRefresh = false) => {
    const myEmail = currentUser?.email ? String(currentUser.email).trim().toLowerCase() : null;
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
      const asConv = list.map((c) => ({
        id: c.otherUserEmail || c.id,
        otherUserEmail: c.otherUserEmail || null,
        isGroup: c.isGroup === true,
        name: c.name || 'משתמש',
        profileImageUrl:
          getUserProfileImageUrl(c) ||
          (c.groupImageUrl != null && String(c.groupImageUrl).trim() ? String(c.groupImageUrl).trim() : null) ||
          (c.group_image_url != null && String(c.group_image_url).trim() ? String(c.group_image_url).trim() : null) ||
          null,
        preview: c.preview || '',
        time: c.time || '',
        lastMessageAt: c.lastMessageAt || null,
        listingId: c.listingId || null,
        listingDisplayNumber: c.listingDisplayNumber != null ? Number(c.listingDisplayNumber) : null,
        listingCategoryLabel: c.listingCategoryLabel || null,
      }));
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
      console.warn('[ChatList] fetchConversations error:', err?.message || err);
      setConversations([PI_CONV]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.email]);

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
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.preview || '').toLowerCase().includes(q) ||
          (c.listingCategoryLabel || '').toLowerCase().includes(q),
      )
    : conversations;

  const renderRowMeta = (conv) => {
    const isPi = conv.id === '1';
    const rel = formatRelativeTimeHebrew(conv.lastMessageAt) || conv.time || '';
    const showListing = !isPi && !!conv.listingId;
    const showCategory = !isPi && !!conv.listingCategoryLabel;

    if (isPi) {
      return (
        <View style={styles.metaRow}>
          {rel ? <Text style={styles.metaTime}>{rel}</Text> : null}
        </View>
      );
    }

    /* LTR row + flex-end: cluster sits toward avatar; visual order R→L is category | ad | time (time left of badges). */
    return (
      <View style={styles.metaRow}>
        {rel ? <Text style={styles.metaTime}>{rel}</Text> : null}
        {showListing ? (
          <View style={styles.badgeGrey}>
            <Text style={styles.badgeGreyText}>
              {conv.listingDisplayNumber != null && !Number.isNaN(conv.listingDisplayNumber)
                ? `מודעה מס ${conv.listingDisplayNumber}`
                : 'מודעה'}
            </Text>
          </View>
        ) : null}
        {showCategory ? (
          <View style={styles.badgeYellow}>
            <Text style={styles.badgeYellowText}>{conv.listingCategoryLabel}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onClose} style={styles.headerBackBtn} activeOpacity={0.7} hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <Image source={require('../assets/image-copy-9.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          {currentUserType === 'broker' ? (
            <TouchableOpacity
              style={styles.headerBtn}
              activeOpacity={0.7}
              onPress={() => setShowNewChat(true)}
              accessibilityRole="button"
              accessibilityLabel="צ'אט חדש">
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
          <MaterialCommunityIcons name="magnify" size={22} color={SEARCH_CLUE} style={styles.searchIcon} />
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
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchConversations(true)} tintColor={GOLD} />
          }>
          <View style={styles.scrollContentInner}>
            <View style={styles.topToListSpacer} />
            {filtered.map((conv, index) => {
              const rawPeerPic = conv.id === '1' ? null : getUserProfileImageUrl(conv);
              const rowAvatarUrl = normalizeChatListAvatarUri(rawPeerPic);
              const rowDebugKey = conv.id ?? conv.otherUserEmail ?? conv.name ?? `conv-${index}`;
              const rowUserRef = conv.otherUserEmail || conv.id || null;
              return (
              <TouchableOpacity
                key={conv.id ?? conv.name ?? `conv-${index}`}
                style={styles.messageRow}
                onPress={() => onOpenChat && onOpenChat(conv)}
                activeOpacity={0.75}>
                <View style={styles.rowMain}>
                  {renderRowMeta(conv)}
                  <Text style={styles.messagePreview} numberOfLines={2}>
                    {conv.preview != null && String(conv.preview).trim() !== ''
                      ? String(conv.preview)
                      : 'אין הודעות'}
                  </Text>
                </View>
                <View style={styles.avatarCol}>
                  <ChatListRowAvatar uri={rowAvatarUrl} debugKey={rowDebugKey} userRef={rowUserRef} />
                  <Text style={styles.senderName} numberOfLines={1}>
                    {conv.name != null ? String(conv.name) : 'משתמש'}
                  </Text>
                </View>
              </TouchableOpacity>
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
                        (groupWizardStep === 1 && (selectedCount < 1 || !currentUser?.email)) ||
                        (groupWizardStep === 2 && (groupCreating || groupImageUploading || !currentUser?.email))
                      }
                      style={styles.ncWizardPrimaryWrap}
                      activeOpacity={0.7}
                      hitSlop={{top: 12, bottom: 12, left: 8, right: 8}}
                      accessibilityRole="button"
                      accessibilityLabel={groupWizardStep === 1 ? 'הבא' : 'שמור'}>
                      {groupCreating && groupWizardStep === 2 ? (
                        <ActivityIndicator size="small" color={CATEGORY_BADGE_BG} />
                      ) : (
                        <>
                          <Text style={styles.ncWizardPrimaryText}>
                            {groupWizardStep === 1 ? 'הבא >' : 'שמור >'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.ncTitle, styles.ncTitleWizard, styles.ncTitleWizardText]}>
                    {groupFlow === 'customers' ? 'צור קבוצת לקוחות' : 'צור קבוצת מתווכים'}
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
                    <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.ncTitle}>{"צ'אט חדש"}</Text>
                  <View style={styles.ncHeaderSpacer} />
                </>
              )}
            </View>
            {groupFlow && groupWizardStep === 1 ? (
              <View style={[styles.ncSearchFullBleed, styles.ncGroupSearchOffset]}>
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
                    style={[styles.ncSearchInput, groupSearch.length > 0 && styles.ncSearchInputPadClear]}
                    placeholder={
                      groupFlow === 'brokers'
                        ? 'חפש מתווך לפי שם / משרד / טלפון'
                        : 'חפש מתווך לפי שם / משרד / טלפון'
                    }
                    placeholderTextColor={NC_TEXT_SECONDARY}
                    value={groupSearch}
                    onChangeText={setGroupSearch}
                  />
                  <MaterialCommunityIcons name="magnify" size={22} color={NC_TEXT_SECONDARY} style={styles.ncSearchIcon} />
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
                    <Image source={{uri: groupImageUrl}} style={styles.ncGroupPickPreview} resizeMode="cover" />
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
                  {groupFlow === 'brokers' ? 'מתווכים שהתווספו' : 'אנשי קשר שהתווספו'}
                </Text>
                <View style={styles.ncChipsCard} onLayout={handleGroupChipsCardLayout}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={handleGroupChipsContentSize}
                    contentContainerStyle={styles.ncChipsScrollContent}>
                    {selectedGroupEmails.map((em) => {
                      const key = String(em || '').trim().toLowerCase();
                      const rowFromList = groupCandidates.find(
                        (row) => String(row?.email || '').trim().toLowerCase() === key,
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
                        (rowFromList?.title != null && String(rowFromList.title).trim()) ||
                        (meta.title != null && String(meta.title).trim()) ||
                        em;
                      return (
                        <View key={em} style={styles.ncChipCol}>
                          <View style={styles.ncChipAvatarWrap}>
                            <View style={styles.ncChipAvatarRing}>
                              <View style={styles.ncChipAvatarInner}>
                                {pic ? (
                                  <Image source={{uri: pic}} style={styles.ncChipAvatarImg} resizeMode="cover" />
                                ) : (
                                  <Image
                                    source={require('../assets/image-copy-10.png')}
                                    style={styles.ncChipAvatarImg}
                                    resizeMode="cover"
                                  />
                                )}
                              </View>
                            </View>
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
            {!groupFlow ? (
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
                      style={[styles.ncSearchInput, newChatSearch.length > 0 && styles.ncSearchInputPadClear]}
                      placeholder="חפש מתווך לפי שם / משרד / טלפון"
                      placeholderTextColor={NC_TEXT_SECONDARY}
                      value={newChatSearch}
                      onChangeText={setNewChatSearch}
                    />
                    <MaterialCommunityIcons name="magnify" size={22} color={NC_TEXT_SECONDARY} style={styles.ncSearchIcon} />
                  </View>
                </View>
                {brokerSearchError ? <Text style={styles.ncBrokerSearchError}>{brokerSearchError}</Text> : null}
              </>
            ) : null}
          </View>

          {groupFlow ? (
            groupWizardStep === 1 ? (
              <ScrollView
                style={styles.ncScroll}
                contentContainerStyle={[styles.ncScrollContent, styles.ncGroupScrollPad]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {!currentUser?.email ? (
                  <Text style={styles.ncBrokerEmpty}>התחבר/י לחשבון כדי ליצור קבוצה.</Text>
                ) : groupFlow === 'customers' && groupLoading && groupCandidates.length === 0 ? (
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
                      ? 'אין אנשי קשר עדיין. התחל/י שיחה פרטית עם לקוח — הוא יופיע כאן.'
                      : 'לא נמצאו מתווכים.'}
                  </Text>
                ) : groupSearch.trim().length > 0 ? (
                  <View style={[styles.ncLetterSection, styles.ncSearchResultsSection]}>
                    <Text style={[styles.ncLetterHeading, styles.ncSectionHeadingFigma]}>תוצאות חיפוש</Text>
                    <View style={styles.ncBrokerCard}>
                      {groupCandidates.map((row, j) => {
                        const email = row.email != null ? String(row.email).trim().toLowerCase() : '';
                        const checked = !!(email && groupSelected[email]);
                        const pic = getUserProfileImageUrl(row);
                        const title = row.title != null ? String(row.title) : email;
                        const sub = row.subtitle != null ? String(row.subtitle) : '';
                        return (
                          <Pressable
                            key={email || row.id || `g-search-${j}`}
                            style={[styles.ncPickRow, j > 0 && styles.ncBrokerRowBorder]}
                            onPress={() => email && toggleGroupMember(email, row)}
                            android_ripple={{color: 'rgba(255,255,255,0.06)'}}>
                            <View style={styles.ncPickCheck}>
                              <View style={[styles.ncPickCheckOuter, checked && styles.ncPickCheckOuterOn]}>
                                {checked ? <View style={styles.ncPickCheckMark} /> : null}
                              </View>
                            </View>
                            <View style={styles.ncBrokerTextCol}>
                              <Text style={styles.ncBrokerTitle} numberOfLines={1}>
                                {title}
                              </Text>
                              {sub && sub !== title ? (
                                <Text style={styles.ncBrokerSubtitle} numberOfLines={1}>
                                  {sub}
                                </Text>
                              ) : null}
                            </View>
                            <View style={styles.ncBrokerAvatarRing}>
                              <View style={styles.ncBrokerAvatarInner}>
                                {pic ? (
                                  <Image source={{uri: pic}} style={styles.ncBrokerAvatarImg} resizeMode="cover" />
                                ) : (
                                  <Image
                                    source={require('../assets/image-copy-10.png')}
                                    style={styles.ncBrokerAvatarImg}
                                    resizeMode="cover"
                                  />
                                )}
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  bucketGroupListByFirstLetter(groupCandidates).map(({letter, rows}) => (
                    <View key={letter} style={styles.ncLetterSection}>
                      <Text style={styles.ncLetterHeading}>{letter === '#' ? '…' : letter}</Text>
                      <View style={styles.ncBrokerCard}>
                        {rows.map((row, j) => {
                          const email = row.email != null ? String(row.email).trim().toLowerCase() : '';
                          const checked = !!(email && groupSelected[email]);
                          const pic = getUserProfileImageUrl(row);
                          const title = row.title != null ? String(row.title) : email;
                          const sub = row.subtitle != null ? String(row.subtitle) : '';
                          return (
                            <Pressable
                              key={email || row.id || `g-${letter}-${j}`}
                              style={[styles.ncPickRow, j > 0 && styles.ncBrokerRowBorder]}
                              onPress={() => email && toggleGroupMember(email, row)}
                              android_ripple={{color: 'rgba(255,255,255,0.06)'}}>
                              <View style={styles.ncPickCheck}>
                                <View style={[styles.ncPickCheckOuter, checked && styles.ncPickCheckOuterOn]}>
                                  {checked ? <View style={styles.ncPickCheckMark} /> : null}
                                </View>
                              </View>
                              <View style={styles.ncBrokerTextCol}>
                                <Text style={styles.ncBrokerTitle} numberOfLines={1}>
                                  {title}
                                </Text>
                                {sub && sub !== title ? (
                                  <Text style={styles.ncBrokerSubtitle} numberOfLines={1}>
                                    {sub}
                                  </Text>
                                ) : null}
                              </View>
                              <View style={styles.ncBrokerAvatarRing}>
                                <View style={styles.ncBrokerAvatarInner}>
                                  {pic ? (
                                    <Image source={{uri: pic}} style={styles.ncBrokerAvatarImg} resizeMode="cover" />
                                  ) : (
                                    <Image
                                      source={require('../assets/image-copy-10.png')}
                                      style={styles.ncBrokerAvatarImg}
                                      resizeMode="cover"
                                    />
                                  )}
                                </View>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))
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
                            style={[styles.ncBrokerRow, i > 0 && styles.ncBrokerRowBorder]}
                            onPress={() => openChatWithBroker(b)}
                            activeOpacity={0.75}>
                            <View style={styles.ncBrokerTextCol}>
                              <Text style={styles.ncBrokerTitle} numberOfLines={1}>
                                {b.title}
                              </Text>
                              <Text style={styles.ncBrokerSubtitle} numberOfLines={2}>
                                {b.subtitle}
                              </Text>
                            </View>
                            <View style={styles.ncBrokerAvatarRing}>
                              <View style={styles.ncBrokerAvatarInner}>
                                {pic ? (
                                  <Image source={{uri: pic}} style={styles.ncBrokerAvatarImg} resizeMode="cover" />
                                ) : (
                                  <Image
                                    source={require('../assets/image-copy-10.png')}
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

              <Text style={[styles.ncSectionLabel, styles.ncSectionLabelSpaced]}>מתווכים</Text>

              <View style={styles.ncCard}>
                <Pressable
                  style={({pressed}) => [styles.ncRow, pressed && styles.ncRowPressed]}
                  onPress={() => {
                    if (!canOpenGroups) {
                      Alert.alert('', 'רק מתווכים יכולים לפתוח קבוצות');
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
                  <MaterialCommunityIcons name="chevron-left" size={22} color="#FFFFFF" style={styles.ncChevron} />
                  <View style={styles.ncRowTextWrap}>
                    <Text style={styles.ncRowTitle}>צור קבוצת לקוחות</Text>
                    <Text style={styles.ncRowSubtitle}>יצר קבוצה ייעודית ללקוחות שלך</Text>
                  </View>
                  <View style={styles.ncIconBubble}>
                    <Image
                      source={require('../assets/pi-chat/private-group.png')}
                      style={styles.ncIconImage}
                      resizeMode="contain"
                    />
                  </View>
                </Pressable>
                <View style={styles.ncRowDivider} />
                <Pressable
                  style={({pressed}) => [styles.ncRow, pressed && styles.ncRowPressed]}
                  onPress={() => {
                    if (!canOpenGroups) {
                      Alert.alert('', 'רק מתווכים יכולים לפתוח קבוצות');
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
                  <MaterialCommunityIcons name="chevron-left" size={22} color="#FFFFFF" style={styles.ncChevron} />
                  <View style={styles.ncRowTextWrap}>
                    <Text style={styles.ncRowTitle}>צור קבוצת מתווכים</Text>
                    <Text style={styles.ncRowSubtitle}>
                      שתף פעולה עם מתווכים על נכסים, אירועי בית פתוח ועוד בקבוצה ייעודית.
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
              </View>

              <Pressable
                style={styles.ncToggleRow}
                onPress={() => setBlockCollabOffers((v) => !v)}
                android_ripple={{color: 'rgba(255,255,255,0.06)'}}>
                <Text style={styles.ncToggleLabel}>חסום הצעות לשת"פ</Text>
                <View style={styles.ncToggleOuter}>
                  {blockCollabOffers ? (
                    <MaterialCommunityIcons name="check" size={15} color={NC_TOGGLE_AMBER} />
                  ) : null}
                </View>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
};

const isWeb = Platform.OS === 'web';

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: CHAT_LIST_PANEL_BG, ...(isWeb && {minHeight: '100%'})},
  topSection: {
    backgroundColor: '#1E1D27',
    borderBottomWidth: 0,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1D27',
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 10,
  },
  headerBtn: {padding: 0},
  headerBackBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
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
    flexDirection: 'row',
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
    paddingRight: 44,
    color: '#fff',
    fontSize: 20,
    letterSpacing: 0.2,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
  },
  searchIcon: {position: 'absolute', right: 16},
  loadingWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12},
  loadingText: {color: TEXT_LIGHT, fontSize: 14},
  scroll: {flex: 1},
  scrollContent: {paddingBottom: 32, backgroundColor: CHAT_LIST_PANEL_BG, flexGrow: 1},
  scrollContentInner: {width: '100%', flexDirection: 'column', alignItems: 'stretch'},
  topToListSpacer: {
    height: 8,
    backgroundColor: '#1c1b22',
    width: '100%',
  },
  messageRow: {
    flexDirection: 'row',
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
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 7,
    marginBottom: 18,
    width: '100%',
  },
  metaTime: {
    color: '#D2D0DC',
    fontSize: 14,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Regular',
  },
  badgeYellow: {
    backgroundColor: CATEGORY_BADGE_BG,
    paddingHorizontal: 10,
    minHeight: 22,
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
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
    textAlign: 'right',
    lineHeight: 22,
    width: '100%',
    fontFamily: 'Rubik-Regular',
  },
  avatarCol: {
    alignItems: 'center',
    width: 100,
    flexShrink: 0,
    marginTop: 12,
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 3,
    overflow: 'hidden',
    backgroundColor: GOLD,
  },
  avatarImageWrap: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2B2A39',
    padding: 1,
    overflow: 'hidden',
    zIndex: 0,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
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
    flexDirection: 'row',
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
    justifyContent: 'flex-start',
    minWidth: 0,
  },
  ncWizardColEnd: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
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
    flexDirection: 'row',
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
    minWidth: 0,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 46,
    color: '#FFFFFF',
    fontSize: 20,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
  },
  ncSearchInputPadClear: {
    paddingLeft: 52,
  },
  ncSearchIcon: {position: 'absolute', right: 14, zIndex: 1},
  ncBrokerSearchError: {
    color: '#E57373',
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    marginTop: 8,
    paddingHorizontal: 16,
    width: '100%',
  },
  ncSectionLabel: {
    color: '#D2D0DC',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
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
    textAlign: 'right',
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
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  ncBrokerTitle: {
    color: '#F7F3E6',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    lineHeight: 21,
    textAlign: 'right',
    marginBottom: 4,
  },
  ncBrokerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
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
    flexDirection: 'row',
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
    alignItems: 'flex-end',
  },
  ncRowTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    marginBottom: 12,
  },
  ncRowSubtitle: {
    color: NC_TEXT_SECONDARY,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
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
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: '#8C85B3',
    paddingBottom: 4,
    paddingTop: 0,
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
    textAlign: 'right',
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
    alignItems: 'flex-end',
  },
  ncChipsScrollContent: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
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
    textAlign: 'right',
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
  ncPickCheckMark: {
    width: 8,
    height: 5,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: NC_TOGGLE_AMBER,
    transform: [{rotate: '-45deg'}],
    marginTop: -1,
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
    justifyContent: 'flex-end',
    paddingVertical: 6,
    alignSelf: 'stretch',
    paddingHorizontal: 2,
    marginTop: -4,
  },
  ncToggleLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    marginRight: 12,
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
