import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  AppState,
} from 'react-native';
import {createClient} from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import {Audio} from 'expo-av';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {MaterialCommunityIcons} from '@expo/vector-icons';
import {DEFAULT_WELCOME_MESSAGE} from '../utils/chatDefaults';
import {
  getChatMessages,
  getChatParticipantDisplay,
  getListingPreview,
  sendChatMessage,
  uploadChatMedia,
  getGroupChatMessages,
  sendGroupChatMessage,
  updateGroupDescription,
  getListings,
  getUsersForGroupPicker,
  addMembersToChatGroup,
  updateGroupTitle,
  removeMemberFromChatGroup,
  updateGroupMemberRole,
  respondToExclusiveOffer,
} from '../utils/api';
import {getUserProfileImageUrl, logProfilePic} from '../utils/userProfileImage';
import {ProfileAvatar} from '../components';
import ChatPeerContactDetailsModal from '../components/ChatPeerContactDetailsModal';
import ChatGroupManageModal from '../components/ChatGroupManageModal';
import ExclusiveOfferResponseCard, {formatPrice} from '../components/ExclusiveOfferResponseCard';
import {usePresence} from '../hooks/PresenceContext';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const BG = '#1a1926';
const CARD_BG = '#252436';
const GOLD = '#D4AF37';
const TEXT_LIGHT = 'rgba(255,255,255,0.7)';

const CHAT_BG = '#373548';
const BUBBLE_GOLD = '#d4a84b';
const BUBBLE_ME = '#2DD4BF';
const FIGMA_WELCOME_BUBBLE_BG = '#ffbb32';
const FIGMA_MAIN_DEEP_BLUE = '#1e1d27';
/** Header + bottom composer bar */
const CHAT_CHROME_BG = '#1E1D27';
const INPUT_PILL_BORDER = '#8a8ab0';
const INPUT_PLACEHOLDER = 'rgba(255,255,255,0.45)';
const CHAT_CATEGORY_LABELS = {
  1: 'חדש מקבלן',
  2: 'משרדים',
  3: 'שותפים',
  4: 'גלובל',
  5: 'BnB',
  6: 'מגזר דתי',
  7: 'קרקעות',
  8: 'מסחרי',
  9: 'נכסים',
  10: 'דירות',
  12: 'יוקרה',
};

/** Whether this is the Pi welcome conversation (id=1, name=pi). */
const isWelcomeConversation = (conv) =>
  conv && conv.id === '1' && conv.name === 'pi';

/** Chat with a real user: conversation.id = other user's email (or UUID if list row lacked email). */
const isUserConversation = (conv) =>
  conv && conv.id && conv.id !== '1';

const CHAT_PEER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_CHAT_AVATAR = require('../assets/image-copy-10.png');
const WELCOME_PI_AVATAR = require('../assets/chat/welcome-pi-avatar.png');
/** Matches SharePostSheet fallback body — hide under bubble when post card is shown. */
const SHARE_POST_DEFAULT_CAPTION = 'פוסט משותף';
/** Many feed posts use description `'פוסט'` (PostEditor); SharePostSheet sends that as caption → must still open rich card. */
const isSharePlaceholderCaption = (raw) => {
  const t = String(raw || '').trim();
  if (!t) return true;
  if (t === SHARE_POST_DEFAULT_CAPTION) return true;
  if (t === 'פוסט') return true;
  if (/^פוסט\s*$/u.test(t)) return true;
  return false;
};

/** Readable line for shared-post card footer / text-only preview (not generic "פוסט"). */
const sharedPostPreviewText = (cachedListing, bodyTrim) => {
  const fromCache =
    cachedListing?.description != null
      ? String(cachedListing.description).trim()
      : '';
  if (fromCache && !isSharePlaceholderCaption(fromCache)) return fromCache;
  if (bodyTrim && !isSharePlaceholderCaption(bodyTrim)) return bodyTrim;
  return '';
};

/** Substring used in broker exclusive-offer messages and to detect them in history. */
const EXCLUSIVE_OFFER_BODY_MARKER = 'להציע בלעדיות על הנכס';

const enrichExclusiveOfferMeta = (meta, conversationIdFromResponse) => {
  if (!meta || typeof meta !== 'object') return meta;
  const fromMeta =
    meta.conversationId != null ? String(meta.conversationId).trim() : '';
  const fromRes =
    conversationIdFromResponse != null ? String(conversationIdFromResponse).trim() : '';
  const cid = fromMeta || fromRes;
  return cid ? {...meta, conversationId: cid} : {...meta};
};

/** Prefer API otherUserEmail; else id if it looks like an email, not a conversation UUID. */
const resolveOtherPartyEmail = (conv) => {
  if (!conv) return null;
  const fromApi = conv.otherUserEmail != null ? String(conv.otherUserEmail).trim() : '';
  const fromId = conv.id != null ? String(conv.id).trim() : '';
  const pick = (s) => {
    if (!s) return null;
    if (CHAT_PEER_UUID_RE.test(s)) return null;
    return s.toLowerCase();
  };
  return pick(fromApi) || pick(fromId);
};
const resolveOtherPartyRef = conv => {
  if (!conv) return null;
  const fromApi =
    conv.otherUserEmail != null ? String(conv.otherUserEmail).trim() : '';
  const fromId = conv.id != null ? String(conv.id).trim() : '';
  return fromApi || fromId || null;
};

const normalizeAvatarUrl = (value) => {
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
  return raw;
};

/** Strip formatting for `tel:` — keeps leading + and digits. */
const toTelUrl = (raw) => {
  if (raw == null || !String(raw).trim()) return null;
  const cleaned = String(raw).replace(/[^\d+]/g, '');
  if (!cleaned || cleaned === '+') return null;
  return `tel:${cleaned}`;
};

/** API + realtime may use camelCase or snake_case; keeps chat bubbles (image/audio) rendering reliably. */
const normalizeChatMessage = (m) => {
  if (!m || typeof m !== 'object') return m;
  const mediaUrl =
    m.mediaUrl != null && String(m.mediaUrl).trim() !== ''
      ? String(m.mediaUrl).trim()
      : m.media_url != null && String(m.media_url).trim() !== ''
        ? String(m.media_url).trim()
        : null;
  const rawType = m.mediaType ?? m.media_type;
  let mediaType = null;
  if (rawType != null && String(rawType).trim() !== '') {
    const t = String(rawType).trim().toLowerCase();
    if (t === 'image' || t === 'audio') mediaType = t;
  }
  const lid = m.listingId ?? m.listing_id;
  const listingId =
    lid != null && String(lid).trim() !== '' ? String(lid).trim() : null;
  const lsRaw = m.listingShare ?? m.listing_share ?? m.is_listing_share;
  const listingShare =
    lsRaw === true || lsRaw === 'true' || lsRaw === 1 || lsRaw === '1'
      ? true
      : lsRaw === false || lsRaw === 'false' || lsRaw === 0 || lsRaw === '0'
        ? false
        : undefined;
  return {
    ...m,
    mediaUrl,
    mediaType,
    listingId,
    listingShare,
  };
};

/** Broker message: marker in body + sender is not the viewer (handles missing `isMe` on some payloads). */
const isExclusiveOfferFromPeerForViewer = (m, viewerEmail) => {
  const nm = normalizeChatMessage(m);
  const body = typeof nm.body === 'string' ? nm.body : '';
  if (!body.includes(EXCLUSIVE_OFFER_BODY_MARKER)) return false;
  const me = (viewerEmail || '').trim().toLowerCase();
  const sidRaw = nm.senderId ?? nm.sender_id;
  const sid = sidRaw != null ? String(sidRaw).trim().toLowerCase() : '';
  if (me && sid && sid !== me) return true;
  if (nm.isMe === false) return true;
  if (nm.isMe === true) return false;
  return false;
};

const ChatScreen = ({onClose, sharedListing = null, conversation = null, currentUser = null, onMessageSent, onPiWelcomeOpened, onOpenPost}) => {
  const insets = useSafeAreaInsets();
  const msg = DEFAULT_WELCOME_MESSAGE;
  const isWelcome = isWelcomeConversation(conversation);
  const isUser = isUserConversation(conversation);
  const otherUserRef = isUser ? resolveOtherPartyRef(conversation) : null;
  const otherUserEmail = isUser ? resolveOtherPartyEmail(conversation) : null;
  const isGroupThread = conversation?.isGroup === true;
  const groupConversationId =
    isGroupThread && conversation?.id != null ? String(conversation.id).trim() : null;
  const isDirectPeer = isUser && !isWelcome && !isGroupThread && !!otherUserEmail;
  const isBrokerUser = useMemo(() => {
    const t1 =
      currentUser?.subscription_type != null ? String(currentUser.subscription_type).trim().toLowerCase() : '';
    const t2 = currentUser?.type != null ? String(currentUser.type).trim().toLowerCase() : '';
    return t1 === 'broker' || t2 === 'broker';
  }, [currentUser?.subscription_type, currentUser?.type]);
  const myEmail = currentUser?.email ? String(currentUser.email).trim().toLowerCase() : null;
  const contextListingId =
    sharedListing?.id != null && String(sharedListing.id).trim() !== ''
      ? String(sharedListing.id).trim()
      : conversation?.listingId != null && String(conversation.listingId).trim() !== ''
        ? String(conversation.listingId).trim()
        : null;
  const listingDisplayNumber =
    conversation?.listingDisplayNumber != null
      ? Number(conversation.listingDisplayNumber)
      : sharedListing?.ad_number != null
        ? Number(sharedListing.ad_number)
        : null;
  const listingCategoryLabel =
    conversation?.listingCategoryLabel ||
    (!Number.isNaN(Number(sharedListing?.category))
      ? CHAT_CATEGORY_LABELS[Number(sharedListing.category)] || null
      : null);

  const [messages, setMessages] = useState([]);
  const [listingPreviewCache, setListingPreviewCache] = useState({});
  const [conversationId, setConversationId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolvedDisplay, setResolvedDisplay] = useState(null);
  const [senderAvatarFailed, setSenderAvatarFailed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  /** From GET /api/chat/group-messages */
  const [groupDetail, setGroupDetail] = useState(null);
  const [groupMembersList, setGroupMembersList] = useState([]);
  const [groupMemberAvatarOverrides, setGroupMemberAvatarOverrides] = useState({});
  const [showGroupDescModal, setShowGroupDescModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showPeerContactDetails, setShowPeerContactDetails] = useState(false);
  const [showGroupManageModal, setShowGroupManageModal] = useState(false);
  const [groupManageBusy, setGroupManageBusy] = useState(false);
  const [addMembersSearch, setAddMembersSearch] = useState('');
  const [addMembersLoading, setAddMembersLoading] = useState(false);
  const [addMembersSubmitting, setAddMembersSubmitting] = useState(false);
  const [addMembersCandidates, setAddMembersCandidates] = useState([]);
  const [addMembersSelected, setAddMembersSelected] = useState({});
  const [showExclusiveOfferModal, setShowExclusiveOfferModal] = useState(false);
  const [exclusiveMonths, setExclusiveMonths] = useState(1);
  const [exclusiveListingData, setExclusiveListingData] = useState(null);
  const [exclusiveLoadingListing, setExclusiveLoadingListing] = useState(false);
  const [exclusiveMessage, setExclusiveMessage] = useState('');
  const [exclusiveOfferMeta, setExclusiveOfferMeta] = useState(null);
  const [exclusiveOfferListingPreview, setExclusiveOfferListingPreview] = useState(null);
  const [exclusiveRespondLoading, setExclusiveRespondLoading] = useState(false);
  const [groupDescDraft, setGroupDescDraft] = useState('');
  const [savingGroupDesc, setSavingGroupDesc] = useState(false);
  const scrollRef = useRef(null);
  const recordingRef = useRef(null);
  const recordStartedAtRef = useRef(0);
  const soundRef = useRef(null);

  const displayName = isGroupThread
    ? conversation?.name != null && String(conversation.name).trim()
      ? String(conversation.name).trim()
      : 'קבוצה'
    : (resolvedDisplay?.name != null ? resolvedDisplay.name : conversation?.name) ?? DEFAULT_WELCOME_MESSAGE.senderName;
  const profileImageUrl =
    getUserProfileImageUrl(resolvedDisplay) || getUserProfileImageUrl(conversation);
  const profileAvatarUrl = normalizeAvatarUrl(profileImageUrl);
  const senderAvatarSource =
    !senderAvatarFailed && profileAvatarUrl
      ? {uri: profileAvatarUrl}
      : DEFAULT_CHAT_AVATAR;

  const peerPhone =
    resolvedDisplay?.phone != null && String(resolvedDisplay.phone).trim() !== ''
      ? String(resolvedDisplay.phone).trim()
      : null;

  const handleCallPeer = useCallback(async () => {
    if (!peerPhone) return;
    const url = toTelUrl(peerPhone);
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (_) {
      Alert.alert('', 'לא ניתן לחייג כעת');
    }
  }, [peerPhone]);

  const showPeerPhoneIcon =
    isDirectPeer && peerPhone && !!toTelUrl(peerPhone);

  const {isEmailOnline} = usePresence();
  const showPeerOnlineSubtitle =
    isDirectPeer &&
    otherUserEmail &&
    isEmailOnline(otherUserEmail);

  const groupTitleResolved =
    (groupDetail?.title != null && String(groupDetail.title).trim()) || displayName;
  const groupAvatarResolved =
    getUserProfileImageUrl(groupDetail) ||
    profileImageUrl;

  const senderNameByEmail = useMemo(() => {
    const m = new Map();
    for (const row of groupMembersList) {
      if (row?.email) m.set(String(row.email).trim().toLowerCase(), row.name || row.email);
    }
    return m;
  }, [groupMembersList]);
  const groupMemberEmailsSet = useMemo(
    () => new Set(groupMembersList.map((m) => String(m?.email || '').trim().toLowerCase()).filter(Boolean)),
    [groupMembersList],
  );
  const groupAddAudience = useMemo(() => {
    const isBrokerType = (st) => String(st || '').trim().toLowerCase() === 'broker';
    const others = groupMembersList.filter((m) => {
      const em = String(m?.email || '').trim().toLowerCase();
      return em && em !== myEmail;
    });
    const hasNonBroker = others.some((m) => !isBrokerType(m?.subscriptionType));
    return hasNonBroker ? 'regular' : 'broker_only';
  }, [groupMembersList, myEmail]);

  useEffect(() => {
    if (!isGroupThread || groupMembersList.length === 0) return;
    let cancelled = false;
    const run = async () => {
      for (const member of groupMembersList) {
        const refRaw =
          member?.email != null && String(member.email).trim()
            ? String(member.email).trim()
            : member?.user_id != null && String(member.user_id).trim()
              ? String(member.user_id).trim()
              : member?.id != null && String(member.id).trim()
                ? String(member.id).trim()
                : null;
        if (!refRaw) continue;
        const ref = refRaw.toLowerCase();
        const existing = normalizeAvatarUrl(getUserProfileImageUrl(member));
        const overrideExisting = normalizeAvatarUrl(groupMemberAvatarOverrides[ref] || null);
        if (existing || overrideExisting) continue;
        try {
          const res = await getChatParticipantDisplay(refRaw);
          const resolved = normalizeAvatarUrl(
            getUserProfileImageUrl(res) ||
              res?.profileImageUrl ||
              res?.profile_picture_url ||
              null,
          );
          logProfilePic(`ChatScreen.groupMember.lookup.${ref}`, {
            memberRef: refRaw,
            success: !!res?.success,
            apiProfileImageUrl: res?.profileImageUrl ?? null,
            apiProfile_picture_url: res?.profile_picture_url ?? null,
            resolved,
          });
          if (!cancelled && resolved) {
            setGroupMemberAvatarOverrides((prev) =>
              prev[ref] === resolved ? prev : {...prev, [ref]: resolved},
            );
          }
        } catch (_) {
          // best-effort avatar lookup
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [isGroupThread, groupMembersList, groupMemberAvatarOverrides]);

  useEffect(() => {
    if (!showAddMembersModal || !isGroupThread || !groupConversationId || !myEmail) return;
    let cancelled = false;
    setAddMembersLoading(true);
    getUsersForGroupPicker(addMembersSearch, myEmail, groupAddAudience)
      .then((res) => {
        if (cancelled) return;
        const list = (res?.users || []).filter((u) => {
          const em = String(u?.email || '').trim().toLowerCase();
          return !!em && !groupMemberEmailsSet.has(em);
        });
        setAddMembersCandidates(list);
      })
      .catch(() => {
        if (!cancelled) setAddMembersCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setAddMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showAddMembersModal, isGroupThread, groupConversationId, myEmail, addMembersSearch, groupAddAudience, groupMemberEmailsSet]);

  const getChatDisplays = useCallback(() => {
    const receiverPic = getUserProfileImageUrl(conversation);
    const receiverDisplay =
      conversation?.name || receiverPic
        ? {name: conversation?.name || null, profileImageUrl: receiverPic || null}
        : null;
    const senderName =
      currentUser?.name ||
      currentUser?.contact_person_name ||
      currentUser?.agent_name ||
      currentUser?.business_name ||
      currentUser?.broker_office_name;
    const senderPic = getUserProfileImageUrl(currentUser);
    const senderDisplay =
      senderName || senderPic ? {name: senderName || null, profileImageUrl: senderPic || null} : null;
    return {receiverDisplay, senderDisplay};
  }, [conversation, currentUser]);

  const fetchMessages = useCallback(() => {
    console.log('[ChatScreen.fetchMessages] attempt', {
      myEmail,
      otherUserEmail,
      otherUserRef,
      isUser,
      isDirectPeer,
      isGroupThread,
      groupConversationId,
      conversationIdOnConv: conversation?.id,
    });
    if (!myEmail) {
      console.warn('[ChatScreen.fetchMessages] aborting: no myEmail');
      return;
    }
    if (isGroupThread && groupConversationId) {
      getGroupChatMessages(myEmail, groupConversationId)
        .then((res) => {
          console.log('[ChatScreen.fetchMessages] group res', { count: res?.messages?.length || 0 });
          if (res.messages) setMessages(res.messages.map(normalizeChatMessage));
          if (res.conversation_id) setConversationId(res.conversation_id);
          if (res.group) setGroupDetail(res.group);
          if (Array.isArray(res.members)) setGroupMembersList(res.members);
          setExclusiveOfferMeta(null);
        })
        .catch((e) => {
          console.error('[ChatScreen.fetchMessages] group fetch failed', e);
          setMessages([]);
          setGroupDetail(null);
          setGroupMembersList([]);
          setExclusiveOfferMeta(null);
        });
      return;
    }
    if (!isDirectPeer || !otherUserEmail) {
      console.warn('[ChatScreen.fetchMessages] aborting: not directPeer or missing otherUserEmail', {
        isDirectPeer,
        otherUserEmail,
      });
      return;
    }
    getChatMessages(myEmail, otherUserEmail)
      .then((res) => {
        console.log('[ChatScreen.fetchMessages] direct res', { count: res?.messages?.length || 0 });
        if (res.messages) setMessages(res.messages.map(normalizeChatMessage));
        if (res.conversation_id) setConversationId(res.conversation_id);
        setExclusiveOfferMeta((prev) => {
          const cid =
            res.conversation_id != null ? String(res.conversation_id).trim() : '';
          const incoming = res.exclusiveOffer;
          if (incoming != null) return enrichExclusiveOfferMeta(incoming, cid);
          if (prev) {
            const pst = String(prev.status || '').trim().toLowerCase();
            const keep =
              pst === 'pending' || pst === 'rejected' || pst === 'accepted';
            if (!keep) return null;
            return cid ? enrichExclusiveOfferMeta(prev, cid) : prev;
          }
          return null;
        });
      })
      .catch((e) => {
        console.error('[ChatScreen.fetchMessages] direct fetch failed', e);
        setMessages([]);
        setExclusiveOfferMeta(null);
      });
  }, [isGroupThread, groupConversationId, isDirectPeer, myEmail, otherUserEmail]);

  const fetchMessagesRef = useRef(fetchMessages);
  fetchMessagesRef.current = fetchMessages;

  useEffect(() => {
    setResolvedDisplay(null);
  }, [otherUserRef]);

  useEffect(() => {
    if (!isUser || !otherUserRef) return;
    let cancelled = false;
    getChatParticipantDisplay(otherUserRef)
      .then((res) => {
        logProfilePic('ChatScreen.getChatParticipantDisplay', {
          otherUserRef,
          success: res?.success,
          name: res?.name,
          profile_picture_url: res?.profile_picture_url,
          profileImageUrl: res?.profileImageUrl,
          phone: res?.phone,
          resolvedPic: getUserProfileImageUrl(res),
        });
        if (cancelled || !res.success) return;
        const name =
          res.name != null && String(res.name).trim() !== '' ? res.name : null;
        const profileImageUrl = getUserProfileImageUrl(res) || null;
        const phone =
          res.phone != null && String(res.phone).trim() !== ''
            ? String(res.phone).trim()
            : null;
        if (name || profileImageUrl || phone) {
          setResolvedDisplay({name, profileImageUrl, phone});
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isUser, otherUserRef, conversation?.name, conversation?.profileImageUrl]);

  useEffect(() => {
    setSenderAvatarFailed(false);
  }, [profileAvatarUrl]);

  useEffect(() => {
    console.log('[ChatScreen.initialLoad] deps', {
      myEmail,
      otherUserEmail,
      isDirectPeer,
      isGroupThread,
      groupConversationId,
      conversationProp: conversation,
    });
    if (!myEmail) {
      console.warn('[ChatScreen.initialLoad] aborting: no myEmail');
      return;
    }
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) {
      console.warn('[ChatScreen.initialLoad] aborting: not direct and not group');
      return;
    }
    let cancelled = false;
    setLoading(true);
    const load = () => {
      if (isGroupThread && groupConversationId) {
        return getGroupChatMessages(myEmail, groupConversationId);
      }
      return getChatMessages(myEmail, otherUserEmail);
    };
    load()
      .then((res) => {
        console.log('[ChatScreen.initialLoad] res', {
          count: res?.messages?.length || 0,
          conversation_id: res?.conversation_id,
        });
        if (!cancelled && res.messages) setMessages(res.messages.map(normalizeChatMessage));
        if (!cancelled && res.conversation_id) setConversationId(res.conversation_id);
        if (!cancelled && isGroupThread) {
          if (res.group) setGroupDetail(res.group);
          if (Array.isArray(res.members)) setGroupMembersList(res.members);
          setExclusiveOfferMeta(null);
        }
        if (!cancelled && !isGroupThread && res.exclusiveOffer !== undefined) {
          const cid = res.conversation_id != null ? String(res.conversation_id).trim() : '';
          setExclusiveOfferMeta(
            res.exclusiveOffer
              ? enrichExclusiveOfferMeta(res.exclusiveOffer, cid)
              : null,
          );
        }
      })
      .catch((e) => {
        console.error('[ChatScreen.initialLoad] fetch failed', e);
        if (!cancelled) setMessages([]);
        if (!cancelled && isGroupThread) {
          setGroupDetail(null);
          setGroupMembersList([]);
        }
        if (!cancelled && !isGroupThread) setExclusiveOfferMeta(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const t = setTimeout(() => {
      if (!cancelled && myEmail && (isGroupThread ? groupConversationId : otherUserEmail)) {
        load().then((res) => {
          if (!cancelled && res.messages && res.messages.length > 0) {
            setMessages(res.messages.map(normalizeChatMessage));
            if (res.conversation_id) setConversationId(res.conversation_id);
            if (isGroupThread) {
              if (res.group) setGroupDetail(res.group);
              if (Array.isArray(res.members)) setGroupMembersList(res.members);
            }
            if (!isGroupThread && res.exclusiveOffer !== undefined) {
              const cid = res.conversation_id != null ? String(res.conversation_id).trim() : '';
              setExclusiveOfferMeta(
                res.exclusiveOffer
                  ? enrichExclusiveOfferMeta(res.exclusiveOffer, cid)
                  : null,
              );
            }
          }
        }).catch(() => {});
      }
    }, 800);
    return () => { cancelled = true; clearTimeout(t); };
  }, [isDirectPeer, isGroupThread, groupConversationId, myEmail, otherUserEmail]);

  useEffect(() => {
    if (!isDirectPeer) {
      setExclusiveOfferMeta(null);
      setExclusiveOfferListingPreview(null);
    }
  }, [isDirectPeer, otherUserEmail]);

  useEffect(() => {
    const lid = exclusiveOfferMeta?.listingId;
    const st = exclusiveOfferMeta?.status != null ? String(exclusiveOfferMeta.status).trim().toLowerCase() : '';
    if (!lid || !['pending', 'rejected'].includes(st)) {
      setExclusiveOfferListingPreview(null);
      return;
    }
    let cancelled = false;
    getListingPreview(lid).then((listing) => {
      if (!cancelled) setExclusiveOfferListingPreview(listing || null);
    });
    return () => {
      cancelled = true;
    };
  }, [exclusiveOfferMeta?.listingId, exclusiveOfferMeta?.status]);

  useEffect(() => {
    if (!isGroupThread) {
      setGroupDetail(null);
      setGroupMembersList([]);
      setShowGroupDescModal(false);
      setGroupDescDraft('');
      setShowGroupManageModal(false);
    }
  }, [isGroupThread, groupConversationId]);

  const savedGroupDescription = (groupDetail?.description != null && String(groupDetail.description).trim())
    ? String(groupDetail.description).trim()
    : '';
  const canSaveGroupDesc =
    groupDescDraft.trim() !== savedGroupDescription && (myEmail != null) && !!groupConversationId;

  const openGroupDescModal = useCallback(() => {
    setGroupDescDraft(savedGroupDescription);
    setShowGroupDescModal(true);
  }, [savedGroupDescription]);

  const saveGroupDescription = useCallback(async () => {
    if (!canSaveGroupDesc || savingGroupDesc || !myEmail || !groupConversationId) return;
    setSavingGroupDesc(true);
    try {
      await updateGroupDescription({
        userEmail: myEmail,
        conversationId: groupConversationId,
        description: groupDescDraft.trim(),
      });
      const next = groupDescDraft.trim();
      setGroupDetail((prev) => ({...(prev || {}), description: next || null}));
      setShowGroupDescModal(false);
    } catch (e) {
      Alert.alert('', e?.message ? String(e.message) : 'שמירת התיאור נכשלה');
    } finally {
      setSavingGroupDesc(false);
    }
  }, [
    canSaveGroupDesc,
    savingGroupDesc,
    myEmail,
    groupConversationId,
    groupDescDraft,
  ]);

  const openAddMembersModal = useCallback(() => {
    if (!isGroupThread || !groupConversationId) return;
    setAddMembersSearch('');
    setAddMembersSelected({});
    setShowAddMembersModal(true);
  }, [isGroupThread, groupConversationId]);

  const toggleAddMember = useCallback((email) => {
    const key = String(email || '').trim().toLowerCase();
    if (!key) return;
    setAddMembersSelected((prev) => ({...prev, [key]: !prev[key]}));
  }, []);

  const submitAddMembers = useCallback(async () => {
    const picked = Object.keys(addMembersSelected).filter((k) => addMembersSelected[k]);
    if (!myEmail || !groupConversationId || picked.length === 0 || addMembersSubmitting) return;
    try {
      setAddMembersSubmitting(true);
      await addMembersToChatGroup({
        userEmail: myEmail,
        conversationId: groupConversationId,
        memberEmails: picked,
      });
      setShowAddMembersModal(false);
      setAddMembersSelected({});
      setAddMembersSearch('');
      fetchMessages();
    } catch (e) {
      Alert.alert('', e?.message ? String(e.message) : 'הוספת חברים נכשלה');
    } finally {
      setAddMembersSubmitting(false);
    }
  }, [addMembersSelected, myEmail, groupConversationId, addMembersSubmitting, fetchMessages]);

  const refreshGroupFromServer = useCallback(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSaveGroupTitleModal = useCallback(
    async (nextTitle) => {
      if (!myEmail || !groupConversationId) return;
      setGroupManageBusy(true);
      try {
        await updateGroupTitle({
          userEmail: myEmail,
          conversationId: groupConversationId,
          title: nextTitle,
        });
      } finally {
        setGroupManageBusy(false);
      }
    },
    [myEmail, groupConversationId],
  );

  const handleRemoveMemberModal = useCallback(
    (memberEmail) =>
      removeMemberFromChatGroup({
        userEmail: myEmail,
        conversationId: groupConversationId,
        memberEmail,
      }),
    [myEmail, groupConversationId],
  );

  const handleLeaveGroupModal = useCallback(
    () =>
      removeMemberFromChatGroup({
        userEmail: myEmail,
        conversationId: groupConversationId,
        memberEmail: myEmail,
      }),
    [myEmail, groupConversationId],
  );

  const handleSetMemberRoleModal = useCallback(
    (targetEmail, role) =>
      updateGroupMemberRole({
        userEmail: myEmail,
        conversationId: groupConversationId,
        targetEmail,
        role,
      }),
    [myEmail, groupConversationId],
  );

  useEffect(() => {
    if (!conversationId || !myEmail || !SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload?.new;
          if (!row || !row.id) return;
          /** Replica payloads sometimes omit columns — full fetch keeps UI consistent */
          if (row.sender_id == null && row.body === undefined) {
            fetchMessagesRef.current();
            return;
          }
          const senderEmail = row.sender_id != null ? String(row.sender_id).trim().toLowerCase() : '';
          const newMsg = normalizeChatMessage({
            id: row.id,
            senderId: row.sender_id,
            body: row.body || '',
            mediaType: row.media_type || null,
            mediaUrl: row.media_url || null,
            listingId: row.listing_id != null ? String(row.listing_id) : null,
            listingShare: row.is_listing_share === true,
            createdAt: row.created_at,
            isMe: senderEmail === myEmail,
          });
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[ChatScreen] realtime channel:', status);
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, myEmail]);

  useEffect(() => {
    const pending = [];
    const seen = new Set();
    (messages || []).forEach(m => {
      const lid = m?.listingId;
      if (!lid) return;
      if (seen.has(lid)) return;
      seen.add(lid);
      if (Object.prototype.hasOwnProperty.call(listingPreviewCache, lid)) return;
      pending.push(lid);
    });
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        pending.map(async lid => {
          try {
            const res = await getListingPreview(lid);
            return [lid, res || null];
          } catch (_) {
            return [lid, null];
          }
        }),
      );
      if (cancelled) return;
      setListingPreviewCache(prev => {
        const next = {...prev};
        entries.forEach(([lid, val]) => {
          if (!Object.prototype.hasOwnProperty.call(next, lid)) next[lid] = val;
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, listingPreviewCache]);

  /** Fallback polling while chat is open — catches messages if Realtime is unavailable (RLS/publication). */
  useEffect(() => {
    if (!myEmail) return;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return;
    const POLL_MS = 3500;
    const interval = setInterval(() => fetchMessagesRef.current(), POLL_MS);
    return () => clearInterval(interval);
  }, [isDirectPeer, isGroupThread, groupConversationId, myEmail]);

  useEffect(() => {
    if (!myEmail) return;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return;
    const onAppState = (next) => {
      if (next === 'active') fetchMessagesRef.current();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [myEmail, isDirectPeer, isGroupThread, groupConversationId]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;
    if (!myEmail) return;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return;
    const onVis = () => {
      if (document.visibilityState === 'visible') fetchMessagesRef.current();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [myEmail, isDirectPeer, isGroupThread, groupConversationId]);

  // Mark Pi welcome as "read" when user opens that conversation so badge goes from 1 to 0
  useEffect(() => {
    if (isWelcome && onPiWelcomeOpened) onPiWelcomeOpened();
  }, [isWelcome, onPiWelcomeOpened]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      const rec = recordingRef.current;
      if (rec) {
        rec.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  const handleSend = async () => {
    const text = (inputText || '').trim();
    if (!text) return;
    if (composerBlockedExclusive) return;
    if (isWelcome) {
      setInputText('');
      return;
    }
    if (!myEmail) return;
    if (isGroupThread) {
      if (!groupConversationId) return;
      setSending(true);
      setInputText('');
      try {
        const res = await sendGroupChatMessage(groupConversationId, myEmail, text, null);
        if (res.message) {
          const nm = normalizeChatMessage(res.message);
          setMessages((prev) => [...prev, {...nm, id: nm.id || Date.now()}]);
          if (onMessageSent) onMessageSent();
        }
      } catch (e) {
        setInputText(text);
        if (typeof alert !== 'undefined') alert(e?.message || 'שליחת ההודעה נכשלה');
      } finally {
        setSending(false);
      }
      return;
    }
    if (!otherUserEmail) return;
    setSending(true);
    setInputText('');
    try {
      const {receiverDisplay, senderDisplay} = getChatDisplays();
      // Only tag listing_id on the first outbound message when opening chat from a listing — not every text,
      // or each line renders as a "shared post" card and plain body is hidden.
      const listingForSend =
        contextListingId && messages.length === 0 ? contextListingId : null;
      const res = await sendChatMessage(
        myEmail,
        otherUserEmail,
        text,
        receiverDisplay,
        senderDisplay,
        null,
        listingForSend,
      );
      if (res.message) {
        const nm = normalizeChatMessage(res.message);
        setMessages((prev) => [...prev, {...nm, id: nm.id || Date.now()}]);
        if (onMessageSent) onMessageSent();
      }
    } catch (e) {
      setInputText(text);
      if (typeof alert !== 'undefined') alert(e?.message || 'שליחת ההודעה נכשלה');
    } finally {
      setSending(false);
    }
  };

  const handleSubmitExclusiveOffer = async () => {
    const text = String(exclusiveMessage || '').trim();
    if (!text) {
      Alert.alert('', 'כתוב הודעה לפני השליחה');
      return;
    }
    console.log('[ExclusiveOffer] submit', {
      myEmail,
      otherUserEmail,
      contextListingId,
      hasText: !!text,
    });
    if (!myEmail || !otherUserEmail) {
      Alert.alert(
        '',
        `לא ניתן לשלוח את ההצעה. (myEmail=${myEmail ? 'ok' : 'חסר'}, receiver=${otherUserEmail ? 'ok' : 'חסר'})`,
      );
      return;
    }
    if (sending) return;

    setSending(true);
    try {
      const {receiverDisplay, senderDisplay} = getChatDisplays();
      const res = await sendChatMessage(
        myEmail,
        otherUserEmail,
        text,
        receiverDisplay,
        senderDisplay,
        null,
        contextListingId,
      );
      console.log('[ExclusiveOffer] server response', res);
      if (!res || res.success === false || !res.message) {
        throw new Error(res?.error || 'שליחת ההצעה נכשלה');
      }
      setMessages(prev => {
        const nm = normalizeChatMessage(res.message);
        return [...prev, {...nm, id: nm.id || Date.now()}];
      });
      if (onMessageSent) onMessageSent();
      setShowExclusiveOfferModal(false);
      Alert.alert('', 'הצעת בלעדיות נשלחה');
      fetchMessages();
    } catch (e) {
      console.error('[ExclusiveOffer] send failed', e);
      Alert.alert('', e?.message || 'שליחת ההצעה נכשלה');
    } finally {
      setSending(false);
    }
  };

  const handleSendPhoto = async () => {
    if (!myEmail || sending || isRecording) return;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return;
    try {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (lib.status !== 'granted') {
        Alert.alert('', 'נדרשת גישה לתמונות');
        return;
      }
      let result;
      if (Platform.OS === 'web') {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        });
      } else {
        const cam = await ImagePicker.requestCameraPermissionsAsync();
        if (cam.status === 'granted') {
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
          });
        } else {
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
          });
        }
      }
      if (result.canceled || !result.assets?.[0]) return;
      const a = result.assets[0];
      const uri = a.uri;
      const mime = a.mimeType || 'image/jpeg';
      const name = a.fileName || `photo-${Date.now()}.jpg`;
      setSending(true);
      const up = await uploadChatMedia({uri, type: mime, name});
      let res;
      if (isGroupThread && groupConversationId) {
        res = await sendGroupChatMessage(groupConversationId, myEmail, '', {type: 'image', url: up.url});
      } else {
        const {receiverDisplay, senderDisplay} = getChatDisplays();
        res = await sendChatMessage(myEmail, otherUserEmail, '', receiverDisplay, senderDisplay, {
          type: 'image',
          url: up.url,
        });
      }
      if (res.message) {
        const nm = normalizeChatMessage(res.message);
        setMessages((prev) => [
          ...prev,
          {
            ...nm,
            id: nm.id || Date.now(),
            mediaType: nm.mediaType || 'image',
            mediaUrl: nm.mediaUrl || up.url,
          },
        ]);
        if (onMessageSent) onMessageSent();
      }
    } catch (e) {
      Alert.alert('', e?.message || 'העלאת התמונה נכשלה');
    } finally {
      setSending(false);
    }
  };

  const startVoiceRecording = async () => {
    if (Platform.OS === 'web') return;
    if (!myEmail || sending || isWelcome) return;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return;
    if (recordingRef.current) return;
    try {
      const {status} = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('', 'נדרשת גישה למיקרופון');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const {recording} = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      recordStartedAtRef.current = Date.now();
      setIsRecording(true);
    } catch (e) {
      recordingRef.current = null;
      setIsRecording(false);
      Alert.alert('', e?.message || 'הקלטה נכשלה');
    }
  };

  const stopVoiceRecordingAndSend = async () => {
    if (Platform.OS === 'web') return;
    const rec = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    if (!rec) return;
    const elapsed = Date.now() - recordStartedAtRef.current;
    try {
      await rec.stopAndUnloadAsync();
    } catch {
      return;
    }
    if (elapsed < 450) return;
    const uri = rec.getURI();
    if (!uri || !myEmail) return;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return;
    setSending(true);
    try {
      const up = await uploadChatMedia({
        uri,
        type: 'audio/m4a',
        name: `voice-${Date.now()}.m4a`,
      });
      let res;
      if (isGroupThread && groupConversationId) {
        res = await sendGroupChatMessage(groupConversationId, myEmail, '', {type: 'audio', url: up.url});
      } else if (otherUserEmail) {
        const {receiverDisplay, senderDisplay} = getChatDisplays();
        const listingForVoice =
          contextListingId && messages.length === 0 ? contextListingId : null;
        res = await sendChatMessage(myEmail, otherUserEmail, '', receiverDisplay, senderDisplay, {
          type: 'audio',
          url: up.url,
        }, listingForVoice);
      } else {
        return;
      }
      if (res.message) {
        const nm = normalizeChatMessage(res.message);
        setMessages((prev) => [
          ...prev,
          {
            ...nm,
            id: nm.id || Date.now(),
            mediaType: nm.mediaType || 'audio',
            mediaUrl: nm.mediaUrl || up.url,
          },
        ]);
        if (onMessageSent) onMessageSent();
      }
    } catch (e) {
      Alert.alert('', e?.message || 'שליחת ההקלטה נכשלה');
    } finally {
      setSending(false);
    }
  };

  const toggleVoicePlayback = async (messageId, url) => {
    if (!url) return;
    try {
      if (playingMessageId === messageId && soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setPlayingMessageId(null);
        return;
      }
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setPlayingMessageId(null);
      }
      await Audio.setAudioModeAsync({playsInSilentModeIOS: true});
      const {sound} = await Audio.Sound.createAsync({uri: url});
      soundRef.current = sound;
      setPlayingMessageId(messageId);
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && st.didJustFinish) {
          setPlayingMessageId(null);
          sound.unloadAsync().catch(() => {});
          if (soundRef.current === sound) soundRef.current = null;
        }
      });
      await sound.playAsync();
    } catch (e) {
      setPlayingMessageId(null);
      Alert.alert('', e?.message || 'לא ניתן להשמיע');
    }
  };

  const lastExclusiveBrokerMessageIndex = useMemo(() => {
    if (!messages?.length || !myEmail) return -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (isExclusiveOfferFromPeerForViewer(messages[i], myEmail)) return i;
    }
    return -1;
  }, [messages, myEmail]);

  const exclusiveRespondConversationId = useMemo(() => {
    const fromState =
      conversationId != null ? String(conversationId).trim() : '';
    const fromMeta =
      exclusiveOfferMeta?.conversationId != null
        ? String(exclusiveOfferMeta.conversationId).trim()
        : '';
    return fromState || fromMeta || '';
  }, [conversationId, exclusiveOfferMeta?.conversationId]);

  const showExclusiveOwnerCard = useMemo(() => {
    if (!isDirectPeer || !exclusiveOfferMeta || !exclusiveRespondConversationId) return false;
    const st = String(exclusiveOfferMeta.status || '').toLowerCase();
    if (st !== 'pending' && st !== 'rejected') return false;
    const me = (myEmail || '').trim().toLowerCase();
    const ow = (exclusiveOfferMeta.ownerEmail || '').trim().toLowerCase();
    return !!me && !!ow && me === ow;
  }, [isDirectPeer, exclusiveRespondConversationId, exclusiveOfferMeta, myEmail]);

  const renderMessages = () => {
    if (isWelcome) {
      return (
        <View style={[styles.messageRow, styles.messageRowWelcome]}>
          <View style={styles.senderLogoWrap}>
            <Image source={WELCOME_PI_AVATAR} style={styles.senderLogo} resizeMode="cover" />
          </View>
          <View style={[styles.bubbleWrap, styles.bubbleWrapWelcome]}>
            <View style={styles.welcomeBubble}>
              <Text style={styles.welcomeBubbleText}>{msg.fullText}</Text>
              <View style={styles.welcomeTimeRow}>
                <Text style={styles.welcomeBubbleTime}>{msg.time}</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }
    if (loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={TEXT_LIGHT} />
          <Text style={styles.loadingText}>טוען הודעות...</Text>
        </View>
      );
    }
    if (!isWelcome && isGroupThread && !groupConversationId) {
      return (
        <Text style={styles.emptyChatText}>
          לא ניתן לטעון את הקבוצה. חזור/י לרשימת השיחות ונסה/י שוב.
        </Text>
      );
    }
    if (!isWelcome && !isGroupThread && isUser && !otherUserEmail) {
      return (
        <Text style={styles.emptyChatText}>
          לא ניתן לטעון את השיחה. חזור/י לרשימת השיחות ונסה/י שוב.
        </Text>
      );
    }
    if (messages.length === 0) {
      return <Text style={styles.emptyChatText}>אין הודעות עדיין. שלח/י הודעה להתחיל.</Text>;
    }
    return messages.map((m, idx) => {
      const msg = normalizeChatMessage(m);
      const bodyTrim = String(msg.body || '').trim();
      const hasAudio = msg.mediaType === 'audio' && msg.mediaUrl;
      const hasImage = msg.mediaType === 'image' && msg.mediaUrl;
      /** True for SharePostSheet (`listing_share`); false stored for normal text with listing_id; undefined = legacy rows. */
      const legacyInferredShare =
        !!msg.listingId &&
        !hasAudio &&
        (hasImage || isSharePlaceholderCaption(bodyTrim));
      /**
       * Explicit share (`listing_share`): always use post card — never plain bubble for body "פוסט".
       * Legacy: listing_id + (attached image or placeholder body).
       * Fallback inserts used to drop listing_id/media but kept is_listing_share → needed listingId||hasImage and showed text only.
       */
      const showSharedPostCard =
        !hasAudio &&
        (msg.listingShare === true ||
          (!!msg.listingId && legacyInferredShare));
      const sid = m.senderId != null ? String(m.senderId).trim().toLowerCase() : '';
      const peerPic =
        isGroupThread && sid
          ? getUserProfileImageUrl(
              groupMembersList.find((row) => String(row.email).trim().toLowerCase() === sid),
            )
          : null;
      const isExclusiveOffer =
        typeof msg.body === 'string' && msg.body.includes(EXCLUSIVE_OFFER_BODY_MARKER);
      return (
      <React.Fragment key={m.id}>
      <View
        style={[styles.messageRow, m.isMe && styles.messageRowMe]}>
        {!m.isMe && (
          <View style={styles.senderLogoWrap}>
            {isGroupThread ? (
              peerPic ? (
                <Image source={{uri: peerPic}} style={styles.senderLogo} resizeMode="cover" />
              ) : (
                <Image source={DEFAULT_CHAT_AVATAR} style={styles.senderLogo} resizeMode="cover" />
              )
            ) : (
              <Image
                source={senderAvatarSource}
                style={styles.senderLogo}
                resizeMode="cover"
                onError={() => setSenderAvatarFailed(true)}
              />
            )}
          </View>
        )}
        <View style={[styles.bubbleWrap, m.isMe && styles.bubbleWrapMe]}>
          <View style={[styles.bubble, m.isMe ? styles.bubbleMe : styles.bubbleThem]}>
            {showSharedPostCard ? (() => {
              const lid = msg.listingId ? String(msg.listingId).trim() : '';
              const cached = lid ? listingPreviewCache[lid] : null;
              const ownImage =
                msg.mediaType === 'image' && msg.mediaUrl ? msg.mediaUrl : null;
              const sharedImage = (() => {
                if (!sharedListing) return null;
                const sid =
                  sharedListing.id != null ? String(sharedListing.id).trim() : '';
                if (!sid || sid !== String(msg.listingId).trim()) return null;
                const imgs = Array.isArray(sharedListing.images)
                  ? sharedListing.images
                  : Array.isArray(sharedListing.listing_images)
                    ? sharedListing.listing_images
                    : [];
                for (const it of imgs) {
                  if (!it) continue;
                  if (typeof it === 'string' && it.trim()) return it.trim();
                  const u =
                    (typeof it.uri === 'string' && it.uri.trim()) ||
                    (typeof it.image_url === 'string' && it.image_url.trim()) ||
                    (typeof it.url === 'string' && it.url.trim()) ||
                    null;
                  if (u && !/^text-post-placeholder$/i.test(u)) return u;
                }
                return (
                  sharedListing.main_image_url ||
                  sharedListing.mainImageUrl ||
                  sharedListing.image_url ||
                  sharedListing.cover_url ||
                  null
                );
              })();
              const resolvedMediaUrl =
                ownImage || sharedImage || (cached && cached.mediaUrl) || null;
              const previewLines = sharedPostPreviewText(cached, bodyTrim);
              return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  if (typeof onOpenPost === 'function') {
                    onOpenPost({
                      id: msg.listingId,
                      mediaUrl: resolvedMediaUrl,
                      body: m.body,
                    });
                  }
                }}
                style={styles.sharedPostCard}>
                <View style={styles.sharedPostImageWrap}>
                  {resolvedMediaUrl ? (
                    <Image
                      source={{uri: resolvedMediaUrl}}
                      style={styles.sharedPostImage}
                      resizeMode="cover"
                    />
                  ) : previewLines ? (
                    <View style={styles.sharedPostImagePlaceholder}>
                      <Text
                        style={styles.sharedPostPlaceholderBody}
                        numberOfLines={8}>
                        {previewLines}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.sharedPostImagePlaceholder}>
                      <MaterialCommunityIcons
                        name="image-outline"
                        size={36}
                        color="rgba(255,255,255,0.6)"
                      />
                    </View>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.55)']}
                    style={styles.sharedPostGradient}
                    pointerEvents="none"
                  />
                  <View style={styles.sharedPostBadge}>
                    <MaterialCommunityIcons
                      name="play-circle"
                      size={12}
                      color="#1E1D27"
                    />
                    <Text style={styles.sharedPostBadgeText}>פוסט</Text>
                  </View>
                </View>
                <View style={styles.sharedPostFooter}>
                  <MaterialCommunityIcons
                    name="chevron-left"
                    size={18}
                    color="rgba(255,255,255,0.85)"
                  />
                  <Text
                    style={styles.sharedPostFooterText}
                    numberOfLines={resolvedMediaUrl && previewLines ? 2 : 1}>
                    {resolvedMediaUrl && previewLines
                      ? previewLines
                      : 'צפייה בפוסט'}
                  </Text>
                </View>
              </TouchableOpacity>
              );
            })() : msg.mediaType === 'image' && msg.mediaUrl ? (
              <Image
                source={{uri: msg.mediaUrl}}
                style={styles.bubbleImage}
                resizeMode="cover"
              />
            ) : null}
            {msg.mediaType === 'audio' && msg.mediaUrl ? (
              <TouchableOpacity
                style={[styles.voiceRow, m.isMe && styles.voiceRowMe]}
                onPress={() => toggleVoicePlayback(m.id, msg.mediaUrl)}
                activeOpacity={0.7}>
                <MaterialCommunityIcons
                  name={playingMessageId === m.id ? 'pause' : 'play'}
                  size={22}
                  color={m.isMe ? '#fff' : CHAT_BG}
                />
                <Text style={[styles.voiceLabel, m.isMe && styles.voiceLabelMe]}>הודעה קולית</Text>
              </TouchableOpacity>
            ) : null}
            {isGroupThread && !m.isMe && m.senderId ? (
              <Text style={styles.bubbleSenderLabel} numberOfLines={1}>
                {senderNameByEmail.get(String(m.senderId).trim().toLowerCase()) || String(m.senderId)}
              </Text>
            ) : null}
            {bodyTrim &&
            !(showSharedPostCard && isSharePlaceholderCaption(bodyTrim)) ? (
              <Text style={styles.bubbleText}>{bodyTrim}</Text>
            ) : null}
            <Text style={styles.bubbleTime}>
              {m.createdAt
                ? new Date(m.createdAt).toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'})
                : ''}
            </Text>
          </View>
        </View>
      </View>
      {isExclusiveOffer && m.isMe ? (
        <View style={styles.exclusiveStatusBanner}>
          <Text style={styles.exclusiveStatusText}>
            הצעת הבלעדיות נשלחה, ברגע שתאושר תוכלו לנהל שיחה
          </Text>
        </View>
      ) : null}
      {showExclusiveOwnerCard &&
      idx === lastExclusiveBrokerMessageIndex &&
      isExclusiveOffer &&
      isExclusiveOfferFromPeerForViewer(m, myEmail) ? (
        <View style={styles.exclusiveOfferOwnerAnchor}>
          <ExclusiveOfferResponseCard
            purposeLabel={exclusiveOfferListingPreview?.purposeLabel}
            priceFormatted={formatPrice(exclusiveOfferListingPreview?.price)}
            addressLine={exclusiveOfferListingPreview?.address}
            imageUri={
              exclusiveOfferListingPreview?.mediaUrl
                ? normalizeAvatarUrl(exclusiveOfferListingPreview.mediaUrl)
                : null
            }
            monthsCommitted={exclusiveOfferMeta?.monthsCommitted}
            decisionStatus={exclusiveOfferMeta?.status}
            loading={exclusiveRespondLoading}
            onAccept={() => handleExclusiveRespond(true)}
            onReject={() => handleExclusiveRespond(false)}
          />
        </View>
      ) : null}
      </React.Fragment>
    );
    });
  };

  const isAwaitingExclusiveResponse = useMemo(() => {
    if (!messages || messages.length === 0) return false;
    let pending = false;
    for (const m of messages) {
      const body = typeof m?.body === 'string' ? m.body : '';
      const isExclusive = body.includes(EXCLUSIVE_OFFER_BODY_MARKER);
      if (isExclusive && m?.isMe) {
        pending = true;
      } else if (!m?.isMe) {
        pending = false;
      }
    }
    return pending;
  }, [messages]);

  /** After one exclusive offer is sent to this peer, hide the CTA (still show history / banner). */
  const hasSentExclusiveOfferInThread = useMemo(() => {
    if (!messages || messages.length === 0) return false;
    return messages.some(
      (m) =>
        m?.isMe &&
        typeof m?.body === 'string' &&
        m.body.includes(EXCLUSIVE_OFFER_BODY_MARKER),
    );
  }, [messages]);

  const composerBlockedExclusive = useMemo(() => {
    if (!isDirectPeer) return false;
    if (exclusiveOfferMeta && exclusiveOfferMeta.status) {
      const st = String(exclusiveOfferMeta.status).toLowerCase();
      if (st === 'accepted') return false;
      if (st === 'rejected') return true;
      const me = (myEmail || '').trim().toLowerCase();
      const br = (exclusiveOfferMeta.brokerEmail || '').trim().toLowerCase();
      const ow = (exclusiveOfferMeta.ownerEmail || '').trim().toLowerCase();
      if (st === 'pending' && (me === br || me === ow)) return true;
    }
    return isAwaitingExclusiveResponse;
  }, [isDirectPeer, exclusiveOfferMeta, myEmail, isAwaitingExclusiveResponse]);

  const handleExclusiveRespond = useCallback(
    async (accept) => {
      const conv = exclusiveRespondConversationId;
      if (!myEmail || !conv || exclusiveRespondLoading) return;
      try {
        setExclusiveRespondLoading(true);
        const data = await respondToExclusiveOffer({
          userEmail: myEmail,
          conversationId: conv,
          accept,
        });
        const nextSt =
          data?.status != null
            ? String(data.status).trim().toLowerCase()
            : accept
              ? 'accepted'
              : 'rejected';
        setExclusiveOfferMeta((prev) =>
          prev
            ? {
                ...prev,
                status: nextSt,
                conversationId: prev.conversationId || conv,
              }
            : prev,
        );
        fetchMessages();
        Alert.alert('', accept ? 'הבקשה אושרה' : 'הבקשה נדחתה');
      } catch (e) {
        Alert.alert('', e?.message ? String(e.message) : 'פעולה נכשלה');
      } finally {
        setExclusiveRespondLoading(false);
      }
    },
    [myEmail, exclusiveRespondConversationId, exclusiveRespondLoading, fetchMessages],
  );

  const composerActive =
    (isWelcome || (myEmail && (isDirectPeer || (isGroupThread && groupConversationId)))) &&
    !composerBlockedExclusive;
  const canSubmitMessage =
    !sending &&
    !composerBlockedExclusive &&
    (inputText || '').trim().length > 0 &&
    (isWelcome || (isDirectPeer || (isGroupThread && groupConversationId)));

  const offerLocationText = useMemo(() => {
    const src = exclusiveListingData || sharedListing || {};
    const city =
      src.city != null
        ? String(src.city).trim()
        : src.city_name != null
          ? String(src.city_name).trim()
          : src.town != null
            ? String(src.town).trim()
            : '';
    const street =
      src.street != null
        ? String(src.street).trim()
        : src.street_name != null
          ? String(src.street_name).trim()
          : '';
    const hn =
      src.house_number != null
        ? String(src.house_number).trim()
        : src.houseNumber != null
          ? String(src.houseNumber).trim()
          : '';
    const neighborhood =
      src.neighborhood != null
        ? String(src.neighborhood).trim()
        : src.area != null
          ? String(src.area).trim()
          : '';
    const fullAddress =
      src.address != null
        ? String(src.address).trim()
        : src.full_address != null
          ? String(src.full_address).trim()
          : src.listing_address != null
            ? String(src.listing_address).trim()
            : src.location != null
              ? String(src.location).trim()
              : '';
    const parts = [];
    if (fullAddress) parts.push(fullAddress);
    if (street) parts.push(street + (hn ? ` ${hn}` : ''));
    if (neighborhood) parts.push(neighborhood);
    if (city) parts.push(city);
    const unique = [...new Set(parts.filter(Boolean))];
    return unique.join(', ') || 'מיקום לא זמין';
  }, [exclusiveListingData, sharedListing]);

  const offerPriceText = useMemo(() => {
    const src = exclusiveListingData || sharedListing || {};
    const raw = src.price ?? src.listing_price ?? src.asking_price ?? src.rent_price ?? null;
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return '₪0';
    return `₪${num.toLocaleString('en-US')}`;
  }, [exclusiveListingData, sharedListing]);

  const offerImageUri = useMemo(() => {
    const src = exclusiveListingData || sharedListing || {};
    return (
      src.main_image_url ||
      src.mainImageUrl ||
      (Array.isArray(src.listing_images) && src.listing_images[0]?.image_url) ||
      (Array.isArray(src.image_urls) && src.image_urls[0]) ||
      null
    );
  }, [exclusiveListingData, sharedListing]);

  const timelineThumbPercent = useMemo(() => {
    const n = Number(exclusiveMonths);
    const clamped = Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 1;
    return (10 - clamped) * (100 / 9);
  }, [exclusiveMonths]);
  const timelineActiveWidthPercent = `${Math.max(
    0,
    Math.min(100, 100 - timelineThumbPercent),
  )}%`;

  const exclusiveSenderName = useMemo(() => {
    const name =
      currentUser?.name ||
      currentUser?.contact_person_name ||
      currentUser?.agent_name ||
      currentUser?.business_name ||
      currentUser?.broker_office_name ||
      currentUser?.email;
    return String(name || 'המשתמש').trim();
  }, [currentUser]);

  const buildExclusiveTemplate = useCallback(
    months => {
      const safeMonths = Number.isFinite(Number(months)) ? Number(months) : 1;
      return `היי, שמי ${exclusiveSenderName} ואני מתווך נדל״ן מנוסה. נתקלתי במודעה שלך עבור הדירה ב${offerLocationText} ואני מעוניין להציע בלעדיות על הנכס. אני מתחייב למצוא שוכר איכותי בתוך ${safeMonths} חודשים, אשמח לשוחח.`;
    },
    [exclusiveSenderName, offerLocationText],
  );

  useEffect(() => {
    if (!showExclusiveOfferModal || !contextListingId) return;
    let cancelled = false;
    setExclusiveLoadingListing(true);
    getListings({})
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.listings) ? res.listings : [];
        const found = rows.find((r) => String(r?.id || '').trim() === String(contextListingId).trim()) || null;
        setExclusiveListingData(found);
      })
      .catch(() => {
        if (!cancelled) setExclusiveListingData(null);
      })
      .finally(() => {
        if (!cancelled) setExclusiveLoadingListing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showExclusiveOfferModal, contextListingId]);

  useEffect(() => {
    if (!showExclusiveOfferModal) return;
    setExclusiveMessage(buildExclusiveTemplate(exclusiveMonths));
  }, [showExclusiveOfferModal, buildExclusiveTemplate, exclusiveMonths]);

  return (
    <View style={[styles.container, {paddingBottom: insets.bottom}]}>
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        {isGroupThread ? (
          <>
            <TouchableOpacity
              onPress={onClose}
              style={styles.groupHeaderBack}
              activeOpacity={0.7}
              hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
            <View style={styles.groupHeaderCenter}>
              {groupAvatarResolved ? (
                <Image
                  source={{uri: groupAvatarResolved}}
                  style={styles.groupHeaderMiniAvatar}
                  resizeMode="cover"
                />
              ) : (
                <Image
                  source={require('../assets/pi-chat/groupe-icon-small.png')}
                  style={styles.groupHeaderMiniAvatar}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.groupHeaderTitle} numberOfLines={1}>
                {groupTitleResolved}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setShowGroupManageModal(true)}
              accessibilityRole="button"
              accessibilityLabel="מידע">
              <Image
                source={require('../assets/chat/info.png')}
                style={styles.headerInfoIcon}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.headerDirectRow}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.headerBackBtn}
              activeOpacity={0.7}
              hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
              accessibilityRole="button"
              accessibilityLabel="חזור">
              <MaterialCommunityIcons
                name="chevron-left"
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={styles.headerIdentityTap}
              activeOpacity={0.85}>
              <ProfileAvatar
                uri={profileAvatarUrl || null}
                name={displayName}
                size={40}
                placeholderImage={DEFAULT_CHAT_AVATAR}
              />
              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle}>{displayName}</Text>
                {showPeerOnlineSubtitle ? (
                  <Text style={styles.headerSubtitle}>מחובר/ת</Text>
                ) : null}
              </View>
            </TouchableOpacity>
            {isDirectPeer ? (
              <View style={styles.headerRight}>
                {showPeerPhoneIcon ? (
                  <TouchableOpacity
                    style={styles.headerIconBtn}
                    onPress={handleCallPeer}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="התקשר">
                    <Image
                      source={require('../assets/pi-chat/phone.png')}
                      style={styles.headerPhoneIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={() => setShowPeerContactDetails(true)}
                  accessibilityRole="button"
                  accessibilityLabel="פרטי קשר">
                  <Image
                    source={require('../assets/chat/info.png')}
                    style={styles.headerInfoIcon}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.chatBackground}>
          <Image
            source={require('../assets/pi-chat/background.png')}
            style={styles.chatBackgroundImage}
            resizeMode="cover"
          />
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({animated: true})
            }>
            {isDirectPeer && isBrokerUser && !hasSentExclusiveOfferInThread ? (
              <View style={styles.exclusiveCtaWrap}>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => setShowExclusiveOfferModal(true)}
                  style={styles.exclusiveCtaBtnHit}
                  accessibilityRole="button"
                  accessibilityLabel="שלח הצעה לבלעדיות">
                  <Image
                    source={require('../assets/pi-chat/send-req.png')}
                    style={styles.exclusiveCtaImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            ) : null}
            {isGroupThread && groupConversationId ? (
              <View style={styles.groupInfoCard}>
                <View style={styles.groupInfoAvatarRing}>
                  {groupAvatarResolved ? (
                    <Image
                      source={{uri: groupAvatarResolved}}
                      style={styles.groupInfoAvatarImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <Image
                      source={require('../assets/pi-chat/igroupicon-big.png')}
                      style={styles.groupInfoAvatarImg}
                      resizeMode="contain"
                    />
                  )}
                </View>
                <Text style={styles.groupInfoTitle}>{groupTitleResolved}</Text>
                <Text style={styles.groupInfoMembersLabel}>חברי הקבוצה</Text>
                {loading && groupMembersList.length === 0 ? (
                  <View style={styles.groupMemberStackLoading}>
                    <ActivityIndicator size="small" color={GOLD} />
                  </View>
                ) : (
                  <View style={styles.groupMemberStack}>
                    {groupMembersList.slice(0, 12).map((member, i) =>
                      (() => {
                        const refRaw =
                          member?.email != null && String(member.email).trim()
                            ? String(member.email).trim()
                            : member?.user_id != null &&
                                String(member.user_id).trim()
                              ? String(member.user_id).trim()
                              : member?.id != null && String(member.id).trim()
                                ? String(member.id).trim()
                                : '';
                        const ref = refRaw.toLowerCase();
                        const resolvedAvatar =
                          normalizeAvatarUrl(getUserProfileImageUrl(member)) ||
                          normalizeAvatarUrl(
                            groupMemberAvatarOverrides[ref] || null,
                          ) ||
                          null;
                        return (
                          <View
                            key={
                              member.email ||
                              member.user_id ||
                              member.id ||
                              `m-${i}`
                            }
                            style={[
                              styles.groupMemberOverlap,
                              i > 0 && styles.groupMemberOverlapShift,
                            ]}>
                            {resolvedAvatar ? (
                              <Image
                                source={{uri: resolvedAvatar}}
                                style={styles.groupMemberAvatar}
                                resizeMode="cover"
                              />
                            ) : (
                              <Image
                                source={require('../assets/image-copy-10.png')}
                                style={styles.groupMemberAvatar}
                                resizeMode="cover"
                              />
                            )}
                          </View>
                        );
                      })(),
                    )}
                  </View>
                )}
                {savedGroupDescription ? (
                  <Text style={styles.groupDescPreview} numberOfLines={3}>
                    {savedGroupDescription}
                  </Text>
                ) : null}
                <TouchableOpacity
                  onPress={openGroupDescModal}
                  activeOpacity={0.7}
                  style={styles.groupAddDescHit}>
                  <Text style={styles.groupAddDesc}>
                    {savedGroupDescription ? 'ערוך תיאור' : 'הוסף תיאור'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={openAddMembersModal}
                  style={styles.groupAddMembersBtnWrap}
                  accessibilityRole="button"
                  accessibilityLabel="הוסף חברים נוספים">
                  <Image
                    source={require('../assets/pi-chat/add-frineds.png')}
                    style={styles.groupAddMembersImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            ) : null}
            <Text style={styles.dateLabel}>היום</Text>
            {renderMessages()}
          </ScrollView>
        </View>

        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.inputBarIconBtn}
            activeOpacity={0.7}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.inputPillWrap}>
            <TextInput
              style={styles.inputPill}
              placeholder="כתוב הודעה"
              placeholderTextColor={INPUT_PLACEHOLDER}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              editable={composerActive}
              writingDirection="rtl"
              {...(Platform.OS === 'web'
                ? {id: 'pi-chat-composer-textarea'}
                : {})}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.inputBarIconBtn,
              (!composerActive || isWelcome || sending || isRecording) &&
                styles.inputBarIconDisabled,
            ]}
            activeOpacity={0.7}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            onPress={
              composerActive && !isWelcome && !sending && !isRecording
                ? handleSendPhoto
                : undefined
            }
            disabled={!composerActive || isWelcome || sending || isRecording}>
            <Image
              source={require('../assets/pi-chat/chat-camera.png')}
              style={styles.inputBarAssetIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          {sending ? (
            <View
              style={styles.inputBarIconBtn}
              accessibilityState={{busy: true}}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : canSubmitMessage ? (
            <TouchableOpacity
              style={styles.inputBarIconBtn}
              activeOpacity={0.7}
              hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
              onPress={handleSend}>
              <MaterialCommunityIcons name="send" size={22} color="#fff" />
            </TouchableOpacity>
          ) : (
            <Pressable
              style={styles.inputBarIconBtn}
              hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
              disabled={!composerActive || isWelcome}
              onPress={
                Platform.OS === 'web'
                  ? () => {
                      if (!composerActive || isWelcome) return;
                      Alert.alert('', 'הקלטת קול זמינה באפליקציה לנייד');
                    }
                  : undefined
              }
              onPressIn={
                Platform.OS !== 'web' && composerActive && !isWelcome
                  ? startVoiceRecording
                  : undefined
              }
              onPressOut={
                Platform.OS !== 'web' && composerActive && !isWelcome
                  ? stopVoiceRecordingAndSend
                  : undefined
              }>
              <Image
                source={require('../assets/pi-chat/mic.png')}
                style={[
                  styles.inputBarAssetIcon,
                  isRecording && {tintColor: '#ff6b6b'},
                  (!composerActive || isWelcome) && {opacity: 0.45},
                ]}
                resizeMode="contain"
              />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showExclusiveOfferModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowExclusiveOfferModal(false)}>
        <View style={styles.offerRoot}>
          <View style={styles.offerHeader}>
            <View style={styles.offerStatusSpacer} />
            <View style={styles.offerHeaderRow}>
              <TouchableOpacity
                onPress={() => setShowExclusiveOfferModal(false)}
                style={styles.offerNavAction}
                activeOpacity={0.7}
                hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>
              <Text style={styles.offerHeaderTitle}>הצעה לבלעדיות</Text>
              <View style={styles.offerNavAction} />
            </View>
          </View>

          <ScrollView
            style={styles.offerScroll}
            contentContainerStyle={styles.offerScrollContent}>
            <View style={styles.offerListingCard}>
              <View style={styles.offerListingTextCol}>
                <View style={styles.offerTagsRow}>
                  {listingDisplayNumber ? (
                    <View style={styles.offerTagDark}>
                      <Text
                        style={
                          styles.offerTagDarkText
                        }>{`מודעה מס ${listingDisplayNumber}`}</Text>
                    </View>
                  ) : null}
                  {listingCategoryLabel ? (
                    <View style={styles.offerTagCategory}>
                      <Text style={styles.offerTagCategoryText}>
                        {listingCategoryLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.offerPrice}>{offerPriceText}</Text>
                <View style={styles.offerLocationRow}>
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={18}
                    color="#D2D0DC"
                  />
                  <Text style={styles.offerLocation}>{offerLocationText}</Text>
                </View>
              </View>
              <View style={styles.offerImageWrap}>
                {offerImageUri ? (
                  <Image
                    source={{uri: offerImageUri}}
                    style={styles.offerImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.offerImage, styles.offerImageFallback]}>
                    <MaterialCommunityIcons
                      name="image-outline"
                      size={28}
                      color="#BDBBD0"
                    />
                  </View>
                )}
                {exclusiveLoadingListing ? (
                  <View style={styles.offerImageLoading}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.offerCard}>
              <Text style={styles.offerCardTitle}>תקופת בלעדיות</Text>
              <Text style={styles.offerCardSubtitle}>
                תוך כמה חודשים אתם מתחייבים למצוא שוכר?
              </Text>
              <View style={styles.offerScaleNumbers}>
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => (
                  <Text key={n} style={styles.offerScaleNumber}>
                    {n}
                  </Text>
                ))}
              </View>
              <View style={styles.offerTimeline}>
                <View style={styles.offerTimelineTrack} />
                <View
                  style={[
                    styles.offerTimelineActive,
                    {width: timelineActiveWidthPercent},
                  ]}
                />
                <View
                  style={[
                    styles.offerTimelineThumb,
                    {left: `${timelineThumbPercent}%`},
                  ]}
                />
              </View>
              <View style={styles.offerScaleActions}>
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => (
                  <Pressable
                    key={`pick-${n}`}
                    style={styles.offerPickHit}
                    onPress={() => setExclusiveMonths(n)}
                  />
                ))}
              </View>
            </View>

            <Text style={styles.offerSectionTitle}>הודעה לבעל הנכס</Text>
            <View
              style={styles.offerMessageInput}
              {...(Platform.OS === 'web'
                ? {nativeID: 'pi-chat-offer-message-textarea'}
                : {})}>
              <Text style={styles.offerMessageText}>
                היי, שמי {exclusiveSenderName} ואני מתווך נדל״ן מנוסה. נתקלתי
                במודעה שלך עבור הדירה ב{offerLocationText} ואני מעוניין להציע
                בלעדיות על הנכס. אני מתחייב למצוא שוכר איכותי{' '}
                <Text style={styles.offerMessageHighlightGold}>
                  בתוך {exclusiveMonths} חודשים
                </Text>
                , אשמח לשוחח.
              </Text>
            </View>

            <View style={styles.offerHowCard}>
              <Text style={styles.offerHowTitle}>איך זה עובד?</Text>
              <Text style={styles.offerHowText}>
                ההצעה שלכם תישלח לבעל הנכס והוא יוכל לאשר או לדחות אותה. רק לאחר
                אישור תוכלו להתחיל לנהל איתו שיחה.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.offerFooter}>
            <TouchableOpacity
              style={styles.offerSubmitBtn}
              activeOpacity={0.85}
              onPress={handleSubmitExclusiveOffer}>
              <Text style={styles.offerSubmitText}>שלח הצעת בלעדיות</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddMembersModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAddMembersModal(false)}>
        <View style={styles.addMembersRoot}>
          <View style={styles.addMembersHeader}>
            <TouchableOpacity
              onPress={() => setShowAddMembersModal(false)}
              style={styles.addMembersBackBtn}
              activeOpacity={0.7}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={26}
                color="#fff"
              />
            </TouchableOpacity>
            <Text style={styles.addMembersTitle}>הוסף חברים לקבוצה</Text>
            <TouchableOpacity
              onPress={submitAddMembers}
              disabled={
                addMembersSubmitting ||
                Object.keys(addMembersSelected).filter(
                  k => addMembersSelected[k],
                ).length === 0
              }
              style={styles.addMembersSaveBtn}
              activeOpacity={0.7}>
              {addMembersSubmitting ? (
                <ActivityIndicator size="small" color={GOLD} />
              ) : (
                <Text style={styles.addMembersSaveText}>שמור</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.addMembersSearchWrap}>
            <TextInput
              style={styles.addMembersSearchInput}
              placeholder="חפש"
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={addMembersSearch}
              onChangeText={setAddMembersSearch}
            />
            <MaterialCommunityIcons
              name="magnify"
              size={22}
              color="rgba(255,255,255,0.55)"
              style={styles.addMembersSearchIcon}
            />
          </View>
          <ScrollView
            style={styles.addMembersScroll}
            contentContainerStyle={styles.addMembersScrollContent}
            keyboardShouldPersistTaps="handled">
            {addMembersLoading ? (
              <View style={styles.addMembersLoadingWrap}>
                <ActivityIndicator size="small" color={GOLD} />
              </View>
            ) : addMembersCandidates.length === 0 ? (
              <Text style={styles.addMembersEmpty}>
                לא נמצאו משתמשים מתאימים להוספה.
              </Text>
            ) : (
              addMembersCandidates.map((row, i) => {
                const email = String(row?.email || '')
                  .trim()
                  .toLowerCase();
                const checked = !!addMembersSelected[email];
                const pic = normalizeAvatarUrl(getUserProfileImageUrl(row));
                return (
                  <Pressable
                    key={email || row?.id || `cand-${i}`}
                    style={[
                      styles.addMemberRow,
                      i > 0 && styles.addMemberRowBorder,
                    ]}
                    onPress={() => toggleAddMember(email)}
                    android_ripple={{color: 'rgba(255,255,255,0.06)'}}>
                    <View style={styles.addMemberCheckCol}>
                      <View
                        style={[
                          styles.addMemberCheckOuter,
                          checked && styles.addMemberCheckOuterOn,
                        ]}>
                        {checked ? (
                          <View style={styles.addMemberCheckInner} />
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.addMemberTextCol}>
                      <Text style={styles.addMemberName} numberOfLines={1}>
                        {row?.title || email}
                      </Text>
                      <Text style={styles.addMemberSub} numberOfLines={1}>
                        {row?.subtitle || email}
                      </Text>
                    </View>
                    <View style={styles.addMemberAvatarRing}>
                      <Image
                        source={
                          pic
                            ? {uri: pic}
                            : require('../assets/image-copy-10.png')
                        }
                        style={styles.addMemberAvatar}
                        resizeMode="cover"
                      />
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>

      <ChatPeerContactDetailsModal
        visible={showPeerContactDetails}
        onClose={() => setShowPeerContactDetails(false)}
        displayName={displayName}
        avatarUri={profileAvatarUrl}
        phone={peerPhone}
      />

      <ChatGroupManageModal
        visible={showGroupManageModal}
        onClose={() => setShowGroupManageModal(false)}
        title={groupTitleResolved}
        avatarUri={normalizeAvatarUrl(groupAvatarResolved) || null}
        description={savedGroupDescription}
        members={groupMembersList}
        myEmail={myEmail}
        isBrokerUser={isBrokerUser}
        busy={groupManageBusy}
        onRefresh={refreshGroupFromServer}
        onEditDescription={() => {
          setShowGroupManageModal(false);
          openGroupDescModal();
        }}
        onAddMembers={() => {
          setShowGroupManageModal(false);
          openAddMembersModal();
        }}
        onSaveTitle={handleSaveGroupTitleModal}
        onRemoveMember={handleRemoveMemberModal}
        onSetMemberRole={handleSetMemberRoleModal}
        onLeaveGroup={handleLeaveGroupModal}
        onConversationDeleted={() => {
          setShowGroupManageModal(false);
          if (typeof onClose === 'function') onClose();
        }}
      />

      <Modal
        visible={showGroupDescModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowGroupDescModal(false)}>
        <KeyboardAvoidingView
          style={styles.groupDescModalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 56 : 0}>
          <View style={styles.groupDescModalHeader}>
            <View style={styles.groupDescModalHeaderColStart}>
              <TouchableOpacity
                onPress={saveGroupDescription}
                disabled={!canSaveGroupDesc || savingGroupDesc}
                style={styles.groupDescHeaderBtn}
                accessibilityRole="button"
                accessibilityLabel="שמור">
                {savingGroupDesc ? (
                  <ActivityIndicator size="small" color={GOLD} />
                ) : (
                  <View style={styles.groupDescSaveRow}>
                    <MaterialCommunityIcons
                      name="chevron-left"
                      size={22}
                      color={canSaveGroupDesc ? GOLD : 'rgba(255,255,255,0.35)'}
                    />
                    <Text
                      style={[
                        styles.groupDescSaveText,
                        !canSaveGroupDesc && styles.groupDescSaveTextDisabled,
                      ]}>
                      שמור
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.groupDescModalTitle} numberOfLines={1}>
              תיאור הקבוצה
            </Text>
            <View style={styles.groupDescModalHeaderColEnd}>
              <TouchableOpacity
                onPress={() => setShowGroupDescModal(false)}
                style={styles.groupDescHeaderBtn}
                accessibilityRole="button"
                accessibilityLabel="ביטול">
                <Text style={styles.groupDescCancelText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.groupDescModalBody}>
            <TextInput
              style={styles.groupDescInput}
              placeholder="כתוב תיאור"
              placeholderTextColor={INPUT_PLACEHOLDER}
              value={groupDescDraft}
              onChangeText={setGroupDescDraft}
              multiline
              maxLength={2000}
              textAlign="right"
              writingDirection="rtl"
              {...(Platform.OS === 'web' ? {id: 'pi-group-desc-input'} : {})}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const isWeb = Platform.OS === 'web';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    ...(isWeb && { height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: CHAT_CHROME_BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    zIndex: 20,
    elevation: 4,
  },
  /** LTR row so title stays visually left and action icons right (matches design). */
  headerDirectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 8,
    direction: 'ltr',
  },
  headerBackBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  headerIdentityTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  headerTitleWrap: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
    direction: 'ltr',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  headerSubtitle: {
    color: TEXT_LIGHT,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    marginLeft: 4,
  },
  headerIconBtn: { padding: 6 },
  headerInfoIcon: { width: 26, height: 26 },
  headerPhoneIcon: { width: 24, height: 24 },
  groupHeaderBack: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupHeaderCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  groupHeaderMiniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  groupHeaderTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    flexShrink: 1,
    textAlign: 'center',
  },
  groupInfoCard: {
    backgroundColor: '#2B2A39',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 24,
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
  },
  groupInfoAvatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#4D4966',
    marginBottom: 16,
  },
  groupInfoAvatarImg: {width: '100%', height: '100%'},
  groupInfoTitle: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 26,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'center',
    marginBottom: 16,
  },
  groupInfoMembersLabel: {
    color: '#D2D0DC',
    fontSize: 18,
    lineHeight: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    alignSelf: 'stretch',
    marginBottom: 14,
  },
  groupMemberStackLoading: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  groupMemberStack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  groupMemberOverlap: {
    width: 38,
    height: 38,
    borderWidth: 1.5,
    borderColor: '#FFE8A8',
    borderRadius: 19,
    overflow: 'hidden',
  },
  groupMemberOverlapShift: {
    marginLeft: -8,
  },
  groupMemberAvatar: {width: '100%', height: '100%', borderRadius: 19},
  groupDescPreview: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    alignSelf: 'stretch',
    marginBottom: 20,
    lineHeight: 26,
  },
  groupAddDescHit: {marginBottom: 20},
  groupAddDesc: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Rubik-Regular',
    borderBottomWidth: 1,
    borderBottomColor: '#FFFFFF',
    paddingBottom: 3,
    textAlign: 'center',
  },
  groupDescModalRoot: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 48,
    ...(isWeb && {minHeight: '100vh'}),
  },
  groupDescModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 14,
    backgroundColor: CHAT_CHROME_BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  groupDescModalHeaderColStart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 0,
  },
  groupDescModalHeaderColEnd: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  groupDescModalTitle: {
    flex: 2,
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    minWidth: 0,
  },
  groupDescHeaderBtn: {paddingVertical: 8, paddingHorizontal: 4},
  groupDescSaveRow: {flexDirection: 'row', alignItems: 'center', gap: 2},
  groupDescSaveText: {
    color: GOLD,
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  groupDescSaveTextDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
  groupDescCancelText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  groupDescModalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  groupDescInput: {
    minHeight: 220,
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 14,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlignVertical: 'top',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  groupAddMembersBtnWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAddMembersImage: {
    width: 300,
    height: 50,
  },
  addMembersRoot: {
    flex: 1,
    backgroundColor: '#1E1D27',
    ...(isWeb && {minHeight: '100vh'}),
  },
  addMembersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  addMembersBackBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMembersTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  addMembersSaveBtn: {
    minWidth: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  addMembersSaveText: {
    color: GOLD,
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  addMembersSearchWrap: {
    marginTop: 12,
    marginHorizontal: 16,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
  },
  addMembersSearchInput: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    paddingLeft: 16,
    paddingRight: 46,
    paddingVertical: 8,
    textAlign: 'right',
  },
  addMembersSearchIcon: {
    position: 'absolute',
    right: 14,
  },
  addMembersScroll: {
    flex: 1,
    marginTop: 12,
  },
  addMembersScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  addMembersLoadingWrap: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMembersEmpty: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    paddingTop: 12,
  },
  addMemberRow: {
    minHeight: 84,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addMemberRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  addMemberCheckCol: {
    width: 38,
    alignItems: 'flex-start',
  },
  addMemberCheckOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMemberCheckOuterOn: {
    borderColor: GOLD,
    backgroundColor: 'rgba(212,175,55,0.16)',
  },
  addMemberCheckInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GOLD,
  },
  addMemberTextCol: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0,
  },
  addMemberName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    textAlign: 'right',
  },
  addMemberSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    marginTop: 2,
  },
  addMemberAvatarRing: {
    marginLeft: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  addMemberAvatar: {
    width: '100%',
    height: '100%',
  },
  exclusiveCtaWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: CHAT_CHROME_BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  exclusiveCtaBtnHit: {
    borderRadius: 30,
  },
  exclusiveCtaBtn: {
    minHeight: 56,
    borderRadius: 28,
    paddingHorizontal: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.28,
    shadowRadius: 10,
    ...(isWeb ? {boxShadow: '0px 6px 14px rgba(0,0,0,0.28)'} : null),
  },
  exclusiveCtaImage: {
    width: 132,
    height: 28,
  },
  offerRoot: {
    flex: 1,
    backgroundColor: '#1E1D27',
    ...(isWeb && {minHeight: '100vh'}),
  },
  offerHeader: {
    paddingBottom: 10,
    backgroundColor: '#1E1D27',
  },
  offerStatusSpacer: {
    height: 43,
  },
  offerHeaderRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  offerNavAction: {
    width: 24,
    height: 24,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerHeaderTitle: {
    flex: 1,
    marginHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  offerScroll: {flex: 1},
  offerScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 112,
    gap: 16,
  },
  offerListingCard: {
    backgroundColor: '#2B2A39',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  offerListingTextCol: {flex: 1, alignItems: 'flex-end'},
  offerTagsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  offerTagDark: {
    backgroundColor: '#3A3A4A',
    borderRadius: 1000,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  offerTagDarkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
  },
  offerTagCategory: {
    backgroundColor: '#5A5972',
    borderRadius: 1000,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  offerTagCategoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
  },
  offerPrice: {
    color: '#F7F3E6',
    fontSize: 34 / 1.55,
    fontFamily: 'Rubik-Medium',
    marginBottom: 6,
  },
  offerLocationRow: {flexDirection: 'row-reverse', alignItems: 'center', gap: 4},
  offerLocation: {
    color: '#D2D0DC',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },
  offerImageWrap: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#3A3A4A',
    position: 'relative',
  },
  offerImage: {width: '100%', height: '100%'},
  offerImageFallback: {alignItems: 'center', justifyContent: 'center'},
  offerImageLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerCard: {
    backgroundColor: '#2B2A39',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  offerCardTitle: {
    color: '#D2D0DC',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  offerCardSubtitle: {
    color: '#D2D0DC',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  offerScaleNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  offerScaleNumber: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  offerTimeline: {
    height: 24,
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 4,
  },
  offerTimelineTrack: {
    height: 4,
    borderRadius: 1000,
    backgroundColor: '#D2D0DC',
  },
  offerTimelineActive: {
    position: 'absolute',
    right: 0,
    height: 4,
    borderRadius: 1000,
    backgroundColor: '#FFC40A',
  },
  offerTimelineThumb: {
    position: 'absolute',
    top: 1,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F9C74F',
    marginLeft: -11,
  },
  offerScaleActions: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  offerPickHit: {width: 26, height: 30},
  offerSectionTitle: {
    color: '#D2D0DC',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    marginTop: 4,
  },
  offerMessageInput: {
    minHeight: 142,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#8C85B3',
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 28,
    fontFamily: 'Rubik-Regular',
    paddingHorizontal: 16,
    paddingVertical: 18,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
  },
  offerMessageText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 28,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  offerMessageHighlightGold: {
    color: '#FFC40A',
    fontFamily: 'Rubik-Medium',
  },
  offerHowCard: {
    backgroundColor: '#2B2A39',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  offerHowTitle: {
    color: '#D2D0DC',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    marginBottom: 10,
  },
  offerHowText: {
    color: '#D2D0DC',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  offerFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: isWeb ? 12 : 20,
    backgroundColor: 'rgba(30,29,39,0.95)',
  },
  offerSubmitBtn: {
    height: 44,
    borderRadius: 846.154,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    ...(isWeb
      ? {backgroundImage: 'linear-gradient(182.012deg, rgb(254, 231, 135) 4.5575%, rgb(189, 153, 71) 50.763%, rgb(156, 101, 34) 88.314%)'}
      : {backgroundColor: '#D4AF37'}),
  },
  offerSubmitText: {
    color: '#1E1D27',
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  chatArea: {
    flex: 1,
    minHeight: 0,
    ...(isWeb && { position: 'relative', overflow: 'hidden' }),
  },
  chatBackground: {
    flex: 1,
    minHeight: 0,
    backgroundColor: CHAT_BG,
    overflow: 'hidden',
    ...(isWeb && { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }),
  },
  // Full image visible: scale to fit the area without cropping (letterboxing uses CHAT_BG).
  chatBackgroundImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 100 : 24,
    flexGrow: 1,
  },
  dateLabel: { textAlign: 'center', color: '#fff', fontSize: 14, lineHeight: 18, marginBottom: 16 },
  loadingWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText: { color: TEXT_LIGHT, fontSize: 14 },
  emptyChatText: { textAlign: 'center', color: TEXT_LIGHT, fontSize: 15, marginTop: 24 },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  messageRowWelcome: { gap: 6, alignItems: 'flex-end' },
  messageRowMe: { justifyContent: 'flex-end' },
  senderLogoWrap: { marginBottom: 4, width: 32, height: 32 },
  senderLogo: { width: 32, height: 32, borderRadius: 16 },
  senderLogoPlaceholder: { backgroundColor: CARD_BG, alignItems: 'center', justifyContent: 'center' },
  bubbleWrap: { flex: 1, maxWidth: '85%', alignSelf: 'flex-start' },
  bubbleWrapWelcome: {
    flex: 0,
    width: 268,
    maxWidth: 268,
    minWidth: 268,
    alignSelf: 'flex-start',
  },
  bubbleWrapMe: { alignSelf: 'flex-end' },
  bubble: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingBottom: 28,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  bubbleThem: { backgroundColor: BUBBLE_GOLD, alignSelf: 'flex-start' },
  bubbleMe: { backgroundColor: BUBBLE_ME, borderTopLeftRadius: 16, borderTopRightRadius: 4, alignSelf: 'flex-end' },
  bubbleText: { color: CHAT_BG, fontSize: 15, textAlign: 'right', lineHeight: 22 },
  exclusiveStatusBanner: {
    alignSelf: 'stretch',
    backgroundColor: '#2B2A39',
    borderRadius: 8,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginTop: 8,
    marginBottom: 6,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  exclusiveStatusText: {
    color: '#D2D0DC',
    fontSize: 14,
    letterSpacing: 0.14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  exclusiveOfferOwnerAnchor: {
    alignSelf: 'stretch',
    marginTop: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  welcomeBubble: {
    width: 268,
    backgroundColor: FIGMA_WELCOME_BUBBLE_BG,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 7},
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
    alignItems: 'flex-end',
  },
  welcomeBubbleText: {
    width: '100%',
    color: FIGMA_MAIN_DEEP_BLUE,
    fontSize: 17,
    lineHeight: 21,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    writingDirection: 'rtl',
  },
  welcomeTimeRow: {
    width: '100%',
    marginTop: 6,
    alignItems: 'flex-end',
  },
  welcomeBubbleTime: {
    color: FIGMA_MAIN_DEEP_BLUE,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.54,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
  },
  bubbleSenderLabel: {
    color: 'rgba(55,53,72,0.65)',
    fontSize: 11,
    textAlign: 'right',
    marginBottom: 4,
    fontFamily: 'Rubik-Regular',
  },
  bubbleImage: {
    width: 220,
    height: 168,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  sharedPostCard: {
    width: 236,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  sharedPostImageWrap: {
    width: '100%',
    aspectRatio: 9 / 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    position: 'relative',
  },
  sharedPostImage: {width: '100%', height: '100%'},
  sharedPostImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2B2A39',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sharedPostPlaceholderBody: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'Rubik-Regular',
    width: '100%',
  },
  sharedPostGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  sharedPostBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#F4AD39',
  },
  sharedPostBadgeText: {
    color: '#1E1D27',
    fontSize: 11,
    fontFamily: 'Rubik-Medium',
  },
  sharedPostFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sharedPostFooterText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
    alignSelf: 'flex-end',
  },
  voiceRowMe: { alignSelf: 'flex-end' },
  voiceLabel: { color: CHAT_BG, fontSize: 15, fontFamily: 'Rubik-Medium' },
  voiceLabelMe: { color: '#fff' },
  bubbleTime: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    color: 'rgba(55,53,72,0.7)',
    fontSize: 11,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: CHAT_CHROME_BG,
    gap: 8,
    flexShrink: 0,
    ...(isWeb && {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    }),
  },
  /** Matches input pill single-line height (32 outer) */
  inputBarIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBarIconDisabled: { opacity: 0.45 },
  inputBarAssetIcon: { width: 22, height: 22 },
  inputPillWrap: {
    flex: 1,
    minWidth: 0,
    minHeight: 32,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: INPUT_PILL_BORDER,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'stretch',
    ...(Platform.OS === 'web' && {
      boxSizing: 'border-box',
      maxHeight: 120,
    }),
  },
  inputPill: {
    maxHeight: 100,
    width: '100%',
    margin: 0,
    paddingLeft: 0,
    paddingRight: 0,
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'right',
    backgroundColor: 'transparent',
    ...(Platform.OS === 'ios' && {
      paddingTop: 2,
      paddingBottom: 2,
    }),
    ...(Platform.OS === 'android' && {
      paddingTop: 0,
      paddingBottom: 0,
      minHeight: 26,
      textAlignVertical: 'center',
      includeFontPadding: false,
    }),
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
      caretColor: '#fff',
      boxSizing: 'border-box',
      // Match line-height to height so first line + placeholder center in the box (web textarea quirk)
      height: 30,
      minHeight: 30,
      maxHeight: 100,
      lineHeight: '30px',
      paddingTop: 0,
      paddingBottom: 0,
      margin: 0,
      overflowY: 'auto',
      resize: 'none',
    }),
  },
});

export default ChatScreen;
