import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {
  mdiCheck,
  mdiCheckAll,
  mdiChevronLeft,
  mdiClose,
  mdiFileDocumentOutline,
  mdiImageOffOutline,
  mdiImageOutline,
  mdiLockOutline,
  mdiMagnify,
  mdiMapMarkerOutline,
  mdiMessageTextOutline,
  mdiPaperclip,
  mdiPlus,
  mdiSend,
  mdiTrashCanOutline,
} from '@mdi/js';
import MdiIcon from '../publish/MdiIcon';
import {ChatAppNudge} from '../promo/ChatAppNudge';
import {
  DEFAULT_WELCOME_MESSAGE,
  CHAT_PEER_UUID_RE,
  normalizeConversationForOpen,
  isProfessionalUpdatesConversation,
} from './lib/chatDefaults';
import {getChatListingCategoryLabel} from './lib/chatListingCategory';
import {
  getChatMessages,
  getChatParticipantDisplay,
  getListingPreview,
  sendChatMessage,
  deleteChatMessage,
  uploadChatMedia,
  getGroupChatMessages,
  sendGroupChatMessage,
  updateGroupDescription,
  getUsersForGroupPicker,
  addMembersToChatGroup,
  updateGroupTitle,
  removeMemberFromChatGroup,
  updateGroupMemberRole,
  respondToExclusiveOffer,
} from '../api/chat';
import {getListings} from '../api/client';
import {getUserProfileImageUrl, logProfilePic, DEFAULT_PI_PROFILE_AVATAR} from '../profile/lib/userProfileImage';
import {
  shouldShowProfileGoldRing,
  isRegularSubscriptionType,
  subscriptionTypes,
} from '../profile/lib/constant';
import FeedPostPreviewMedia from '../publish/components/FeedPostPreviewMedia';
import {usePostFrameAspect} from '../publish/lib/postFrame';
import {ProfileAvatar} from '../profile/ProfileParts';
import ChatPeerContactDetailsModal from './components/ChatPeerContactDetailsModal';
import ChatGroupManageModal from './components/ChatGroupManageModal';
import ChatDocumentPickerModal from './components/ChatDocumentPickerModal';
import ChatVoiceMessageBubble from './components/ChatVoiceMessageBubble';
import ExclusiveOfferResponseCard, {formatPrice} from './components/ExclusiveOfferResponseCard';
import {flexStart, getRangeSliderPercentFromEvent} from '../publish/lib/rtlLayout';
import {isFeedPostListingRecord} from '../profile/lib/listingShape';
import {muxThumbnailUri} from '../profile/lib/videoPlayback';
import {dp} from '../publish/lib/rnStyle';
import {VideoPreviewThumb} from '../publish/fields/VideoPreviewThumb';
import welcomePiAvatar from '../assets/mobile/chat/welcome-pi-avatar.png';
import chatInfoIcon from '../assets/mobile/chat/info.png';
import groupIconSmall from '../assets/mobile/pi-chat/groupe-icon-small.png';
import phoneIcon from '../assets/mobile/pi-chat/phone.png';
import sendReqImage from '../assets/mobile/pi-chat/send-req.png';
import groupIconBig from '../assets/mobile/pi-chat/igroupicon-big.png';
import addFriendsImage from '../assets/mobile/pi-chat/add-frineds.png';
import chatCameraIcon from '../assets/mobile/pi-chat/chat-camera.png';
import micIcon from '../assets/mobile/pi-chat/mic.png';
import styles from './ChatScreen.module.css';
import {SUPABASE_ANON_KEY, SUPABASE_URL} from '../publicConfig';

let chatRealtimeClient = null;
function getChatRealtimeClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!chatRealtimeClient) {
    chatRealtimeClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {params: {eventsPerSecond: 10}},
    });
  }
  return chatRealtimeClient;
}

const GOLD = '#F7C63A';
const TEXT_LIGHT = 'rgba(255,255,255,0.7)';
const EXCLUSIVE_MONTHS_MIN = 1;
const EXCLUSIVE_MONTHS_MAX = 10;
const VOICE_CANCEL_SLIDE_PX = 80;
const VOICE_LOCK_SLIDE_PX = 48;
const VOICE_MIN_RECORD_MS = 450;
const CHAT_PHOTO_MAX_W = 248;
const CHAT_PHOTO_MAX_H = 360;
const CHAT_PHOTO_MIN_W = 168;
const CHAT_PHOTO_FALLBACK = {width: 248, height: 186};
const CHAT_SHARED_POST_MAX_H = 420;
const CHAT_READ_TICK_BLUE = '#34B7F1';
const CHAT_READ_TICK_SENT = 'rgba(55,53,72,0.45)';
const SHARE_POST_DEFAULT_CAPTION = 'פוסט משותף';
const SHARE_LISTING_DEFAULT_CAPTION = 'מודעה משותפת';
const EXCLUSIVE_OFFER_BODY_MARKER = 'להציע בלעדיות על הנכס';
const COLLAB_OFFER_BODY_MARKER = 'להציע שיתוף פעולה על הנכס';

function exclusiveMonthsFromTouchPercent(touchPercent) {
  const valuePercent = 100 - touchPercent;
  const raw = EXCLUSIVE_MONTHS_MIN + (valuePercent / 100) * (EXCLUSIVE_MONTHS_MAX - EXCLUSIVE_MONTHS_MIN);
  return Math.min(EXCLUSIVE_MONTHS_MAX, Math.max(EXCLUSIVE_MONTHS_MIN, Math.round(raw)));
}

function formatVoiceDuration(totalSec) {
  const s = Math.max(0, Number(totalSec) || 0);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function chatPhotoBox(naturalW, naturalH) {
  const nw = Number(naturalW);
  const nh = Number(naturalH);
  if (!Number.isFinite(nw) || !Number.isFinite(nh) || nw <= 0 || nh <= 0) {
    return {width: dp(CHAT_PHOTO_FALLBACK.width), height: dp(CHAT_PHOTO_FALLBACK.height)};
  }
  const ratio = nw / nh;
  let w = nw;
  let h = nh;
  if (w > CHAT_PHOTO_MAX_W) {
    w = CHAT_PHOTO_MAX_W;
    h = w / ratio;
  }
  if (h > CHAT_PHOTO_MAX_H) {
    h = CHAT_PHOTO_MAX_H;
    w = h * ratio;
  }
  if (w < CHAT_PHOTO_MIN_W) {
    w = CHAT_PHOTO_MIN_W;
    h = w / ratio;
    if (h > CHAT_PHOTO_MAX_H) {
      h = CHAT_PHOTO_MAX_H;
      w = h * ratio;
    }
  }
  return {width: dp(Math.round(w)), height: dp(Math.round(h))};
}

function chatSharedPostBox(aspect) {
  const ratio = Number(aspect) > 0 ? Number(aspect) : 9 / 16;
  let w = CHAT_PHOTO_MAX_W;
  let h = w / ratio;
  if (h > CHAT_SHARED_POST_MAX_H) {
    h = CHAT_SHARED_POST_MAX_H;
    w = h * ratio;
  }
  return {width: dp(Math.round(w)), height: dp(Math.round(h))};
}

const isWelcomeConversation = conv => conv && conv.id === '1' && conv.name === 'pi';
const isUserConversation = conv => conv && conv.id && conv.id !== '1';

const isSharePlaceholderCaption = raw => {
  const t = String(raw || '').trim();
  if (!t) return true;
  if (t === SHARE_POST_DEFAULT_CAPTION) return true;
  if (t === SHARE_LISTING_DEFAULT_CAPTION) return true;
  if (t === 'פוסט' || t === 'מודעה') return true;
  if (/^פוסט\s*$/u.test(t)) return true;
  return false;
};

const sharedPostPreviewText = (cachedListing, bodyTrim) => {
  const fromCache = cachedListing?.description != null ? String(cachedListing.description).trim() : '';
  if (fromCache && !isSharePlaceholderCaption(fromCache)) return fromCache;
  if (bodyTrim && !isSharePlaceholderCaption(bodyTrim)) return bodyTrim;
  return '';
};

const isChatVideoUrl = url => {
  const u = String(url || '').trim().toLowerCase();
  if (!u) return false;
  return /\.(mp4|mov|m4v|webm|m3u8)(\?|#|$)/i.test(u) || u.includes('stream.mux.com') || u.includes('/video/');
};

function chatStillOrPoster(url, extraStill) {
  const still = extraStill != null ? String(extraStill).trim() : '';
  if (still && /^https?:\/\//i.test(still) && !isChatVideoUrl(still)) return still;
  const raw = url != null ? String(url).trim() : '';
  if (raw && !isChatVideoUrl(raw) && /^https?:\/\//i.test(raw)) return raw;
  return muxThumbnailUri(raw, {time: 0, width: 480}) || '';
}

function prefetchChatMediaUri(url) {
  const u = url != null ? String(url).trim() : '';
  if (!u || !/^https?:\/\//i.test(u)) return;
  const src = isChatVideoUrl(u) ? muxThumbnailUri(u, {time: 0, width: 480}) : u;
  if (!src) return;
  const img = new Image();
  img.src = src;
}

const sharedCardDisplayName = cachedListing =>
  cachedListing?.creatorName != null ? String(cachedListing.creatorName).trim() : '';

const isBrokerOfferBody = body => {
  const text = typeof body === 'string' ? body : '';
  return text.includes(EXCLUSIVE_OFFER_BODY_MARKER) || text.includes(COLLAB_OFFER_BODY_MARKER);
};

const isCollabOfferBody = body => {
  const text = typeof body === 'string' ? body : '';
  return text.includes(COLLAB_OFFER_BODY_MARKER);
};

const enrichExclusiveOfferMeta = (meta, conversationIdFromResponse) => {
  if (!meta || typeof meta !== 'object') return meta;
  const fromMeta = meta.conversationId != null ? String(meta.conversationId).trim() : '';
  const fromRes = conversationIdFromResponse != null ? String(conversationIdFromResponse).trim() : '';
  const cid = fromMeta || fromRes;
  const kindRaw =
    meta.offerKind != null
      ? String(meta.offerKind).trim().toLowerCase()
      : meta.offer_kind != null
        ? String(meta.offer_kind).trim().toLowerCase()
        : '';
  const offerKind = kindRaw === 'collab' ? 'collab' : 'exclusive';
  return cid ? {...meta, conversationId: cid, offerKind} : {...meta, offerKind};
};

const resolveOtherPartyEmail = conv => {
  if (!conv || conv.isGroup === true) return null;
  const fromApi = conv.otherUserEmail != null ? String(conv.otherUserEmail).trim() : '';
  if (fromApi) return fromApi.toLowerCase();
  const fromId = conv.id != null ? String(conv.id).trim().toLowerCase() : '';
  if (!fromId || fromId === '1' || fromId === 'profile') return null;
  if (fromId.includes('@') || CHAT_PEER_UUID_RE.test(fromId)) return fromId;
  return null;
};

const resolveOtherPartyRef = conv => {
  if (!conv) return null;
  const fromApi = conv.otherUserEmail != null ? String(conv.otherUserEmail).trim() : '';
  const fromId = conv.id != null ? String(conv.id).trim() : '';
  const pick = s => {
    if (!s) return null;
    const v = String(s).trim();
    if (!v || v === '1' || v === 'profile') return null;
    return v;
  };
  return pick(fromApi) || pick(fromId) || null;
};

const pickConversationId = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate != null && String(candidate).trim() !== '') return String(candidate).trim();
  }
  return null;
};

const normalizeAvatarUrl = value => {
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

const toTelUrl = raw => {
  if (raw == null || !String(raw).trim()) return null;
  const cleaned = String(raw).replace(/[^\d+]/g, '');
  if (!cleaned || cleaned === '+') return null;
  return `tel:${cleaned}`;
};

const chatFileDisplayName = (body, mediaUrl) => {
  const fromBody = body != null ? String(body).trim() : '';
  if (fromBody) return fromBody;
  try {
    const path = String(mediaUrl || '').split('?')[0];
    const last = decodeURIComponent(path.split('/').pop() || '');
    if (last) return last;
  } catch {
    /* ignore */
  }
  return 'קובץ מצורף';
};

const normalizeChatMessage = m => {
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
    if (t === 'image' || t === 'audio' || t === 'file' || t === 'video') mediaType = t;
  }
  const lid = m.listingId ?? m.listing_id;
  const listingId = lid != null && String(lid).trim() !== '' ? String(lid).trim() : null;
  const lsRaw = m.listingShare ?? m.listing_share ?? m.is_listing_share;
  const listingShare =
    lsRaw === true || lsRaw === 'true' || lsRaw === 1 || lsRaw === '1'
      ? true
      : lsRaw === false || lsRaw === 'false' || lsRaw === 0 || lsRaw === '0'
        ? false
        : undefined;
  return {...m, mediaUrl, mediaType, listingId, listingShare, isRead: m.isRead === true};
};

const chatMessageIsRead = (m, peerLastReadAt) => {
  if (!m?.isMe) return false;
  if (m.isRead === true) return true;
  if (!peerLastReadAt || !m.createdAt) return false;
  const createdMs = new Date(m.createdAt).getTime();
  const readMs = new Date(peerLastReadAt).getTime();
  return Number.isFinite(createdMs) && Number.isFinite(readMs) && createdMs <= readMs;
};

function ChatOutgoingReadTicks({isRead, color}) {
  return (
    <MdiIcon
      path={mdiCheckAll}
      size={20}
      color={color || (isRead ? CHAT_READ_TICK_BLUE : CHAT_READ_TICK_SENT)}
      title={isRead ? 'נקראה' : 'נשלחה'}
    />
  );
}

const isExclusiveOfferFromPeerForViewer = (m, viewerEmail) => {
  const nm = normalizeChatMessage(m);
  const body = typeof nm.body === 'string' ? nm.body : '';
  if (!isBrokerOfferBody(body)) return false;
  const me = (viewerEmail || '').trim().toLowerCase();
  const sidRaw = nm.senderId ?? nm.sender_id;
  const sid = sidRaw != null ? String(sidRaw).trim().toLowerCase() : '';
  if (me && sid && sid !== me) return true;
  if (nm.isMe === false) return true;
  if (nm.isMe === true) return false;
  return false;
};

function useModalEscape(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);
}

export default function ChatScreen({
  onClose,
  sharedListing = null,
  conversation: conversationProp = null,
  currentUser = null,
  onMessageSent,
  onPiWelcomeOpened,
  onOpenPost,
  onOpenPeerProfile,
  onContactListingOwner,
  embedded = false,
}) {
  const postAspect = usePostFrameAspect();
  const conversation = useMemo(() => normalizeConversationForOpen(conversationProp), [conversationProp]);
  const msg = DEFAULT_WELCOME_MESSAGE;
  const isWelcome = isWelcomeConversation(conversation);
  const isUser = isUserConversation(conversation);
  const isProfessionalUpdatesThread = isProfessionalUpdatesConversation(conversation);
  const otherUserRef = isUser ? resolveOtherPartyRef(conversation) : null;
  const otherUserEmail = isUser ? resolveOtherPartyEmail(conversation) : null;
  const isGroupThread = conversation?.isGroup === true;
  const groupConversationId =
    isGroupThread && conversation?.id != null ? String(conversation.id).trim() : null;
  const directConversationId = useMemo(() => {
    if (isGroupThread) return null;
    const fromProp = conversation?.conversationId != null ? String(conversation.conversationId).trim() : '';
    if (fromProp) return fromProp;
    const rawId = conversation?.id != null ? String(conversation.id).trim() : '';
    if (rawId && CHAT_PEER_UUID_RE.test(rawId) && !rawId.includes('@')) return rawId;
    return null;
  }, [isGroupThread, conversation?.conversationId, conversation?.id]);
  const isDirectPeer =
    isProfessionalUpdatesThread ||
    (isUser && !isWelcome && !isGroupThread && (!!otherUserEmail || !!directConversationId));
  const isTrueBrokerUser = useMemo(() => {
    const t1 = currentUser?.subscription_type != null ? String(currentUser.subscription_type).trim().toLowerCase() : '';
    const t2 = currentUser?.type != null ? String(currentUser.type).trim().toLowerCase() : '';
    return t1 === 'broker' || t2 === 'broker';
  }, [currentUser?.subscription_type, currentUser?.type]);
  const myEmail = useMemo(() => {
    const raw = currentUser?.email || currentUser?.user_email || currentUser?.creator_email;
    return raw ? String(raw).trim().toLowerCase() : null;
  }, [currentUser?.email, currentUser?.user_email, currentUser?.creator_email]);
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
    conversation?.listingCategoryLabel || getChatListingCategoryLabel(sharedListing?.category);

  const [messages, setMessages] = useState([]);
  const [actionMenuMessage, setActionMenuMessage] = useState(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [listingPreviewCache, setListingPreviewCache] = useState({});
  const [conversationId, setConversationId] = useState(() =>
    !isGroupThread && conversation?.conversationId != null ? String(conversation.conversationId).trim() : null,
  );
  const [brokenImageUrls, setBrokenImageUrls] = useState({});
  const [chatImageSizeByUrl, setChatImageSizeByUrl] = useState({});
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolvedDisplay, setResolvedDisplay] = useState(null);
  const peerSubscriptionType = useMemo(() => {
    const t =
      resolvedDisplay?.subscriptionType ??
      conversation?.subscriptionType ??
      conversation?.subscription_type ??
      null;
    return t != null ? String(t).trim().toLowerCase() : '';
  }, [resolvedDisplay?.subscriptionType, conversation?.subscriptionType, conversation?.subscription_type]);
  const isPeerRegularUser = peerSubscriptionType === 'user';
  const isPeerBroker = peerSubscriptionType === 'broker';
  const isCollabOfferMode = isTrueBrokerUser && isPeerBroker;
  const listingIdFromConversation =
    conversation?.listingId != null && String(conversation.listingId).trim() !== ''
      ? String(conversation.listingId).trim()
      : '';
  const openedChatFromAd = Boolean(
    (sharedListing?.id != null && String(sharedListing.id).trim() !== '' && !isFeedPostListingRecord(sharedListing)) ||
      (listingIdFromConversation && !isFeedPostListingRecord(sharedListing)),
  );
  const mySubscriptionId = useMemo(() => {
    const id = currentUser?.id || currentUser?.subscription_id || currentUser?.owner_id;
    return id != null ? String(id).trim().toLowerCase() : '';
  }, [currentUser?.id, currentUser?.subscription_id, currentUser?.owner_id]);
  const listingOwnerSubscriptionId = useMemo(() => {
    const id = sharedListing?.subscription_id || sharedListing?.owner_id || sharedListing?.creator_subscription_id;
    return id != null ? String(id).trim().toLowerCase() : '';
  }, [sharedListing?.subscription_id, sharedListing?.owner_id, sharedListing?.creator_subscription_id]);
  const listingOwnerEmail = useMemo(() => {
    const raw = sharedListing?.creator_email || sharedListing?.email || sharedListing?.owner_email;
    return raw ? String(raw).trim().toLowerCase() : '';
  }, [sharedListing?.creator_email, sharedListing?.email, sharedListing?.owner_email]);
  const isCurrentUserListingOwner =
    (!!mySubscriptionId && !!listingOwnerSubscriptionId && mySubscriptionId === listingOwnerSubscriptionId) ||
    (!!myEmail && !!listingOwnerEmail && myEmail === listingOwnerEmail);
  const canSendBrokerOffer =
    openedChatFromAd && !isCurrentUserListingOwner && (isCollabOfferMode || (isTrueBrokerUser && isPeerRegularUser));
  const peerBlocksExclusiveOffers =
    resolvedDisplay?.blockExclusiveOffers === true || conversation?.blockExclusiveOffers === true;
  const peerBlocksCollabOffers =
    resolvedDisplay?.blockCollabOffers === true || conversation?.blockCollabOffers === true;
  const offerBlockedMessage = useMemo(() => {
    if (isCollabOfferMode && peerBlocksCollabOffers) return 'המשתמש הזה חסם הצעות לשת"פ';
    if (!isCollabOfferMode && peerBlocksExclusiveOffers) return 'המשתמש הזה חסם הצעות לבלעדיות';
    return null;
  }, [isCollabOfferMode, peerBlocksCollabOffers, peerBlocksExclusiveOffers]);

  const [senderAvatarFailed, setSenderAvatarFailed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLocked, setVoiceLocked] = useState(false);
  const [recordingDurationSec, setRecordingDurationSec] = useState(0);
  const [voiceCancelArmed, setVoiceCancelArmed] = useState(false);
  const [voiceLockHint, setVoiceLockHint] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [voiceMetaById, setVoiceMetaById] = useState({});
  const [activeVoicePlay, setActiveVoicePlay] = useState({id: null, startedAt: 0, startProgress: 0});
  const voicePlayBeganRef = useRef(false);
  const [fullScreenImageUrl, setFullScreenImageUrl] = useState(null);
  const [fullScreenVideoUrl, setFullScreenVideoUrl] = useState(null);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [realtimeOk, setRealtimeOk] = useState(false);
  const [peerLastReadAt, setPeerLastReadAt] = useState(null);
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [voiceSlideX, setVoiceSlideX] = useState(0);

  const scrollRef = useRef(null);
  const scrollToEndTimerRef = useRef(null);
  const recordingRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordStartedAtRef = useRef(0);
  const voiceLockedRef = useRef(false);
  const voiceCancelArmedRef = useRef(false);
  const soundRef = useRef(null);
  const startVoiceRecordingRef = useRef(async () => {});
  const cancelVoiceRecordingRef = useRef(async () => {});
  const stopVoiceRecordingAndSendRef = useRef(async () => {});
  const canRecordVoiceRef = useRef(false);
  const exclusiveSliderRef = useRef(null);
  const exclusiveSliderWidthRef = useRef(1);
  const exclusiveSliderWindowXRef = useRef(0);
  const exclusiveSliderDraggingRef = useRef(false);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const micPointerIdRef = useRef(null);
  const micStartRef = useRef({x: 0, y: 0});

  const displayName = isGroupThread
    ? conversation?.name != null && String(conversation.name).trim()
      ? String(conversation.name).trim()
      : 'קבוצה'
    : ((resolvedDisplay?.name != null ? resolvedDisplay.name : conversation?.name) ??
      DEFAULT_WELCOME_MESSAGE.senderName);
  const profileImageUrl = getUserProfileImageUrl(resolvedDisplay) || getUserProfileImageUrl(conversation);
  const profileAvatarUrl = normalizeAvatarUrl(profileImageUrl);
  const senderAvatarSrc = !senderAvatarFailed && profileAvatarUrl ? profileAvatarUrl : DEFAULT_PI_PROFILE_AVATAR;
  const peerPhone =
    resolvedDisplay?.phone != null && String(resolvedDisplay.phone).trim() !== ''
      ? String(resolvedDisplay.phone).trim()
      : null;

  const handleCallPeer = useCallback(() => {
    if (!peerPhone) return;
    const url = toTelUrl(peerPhone);
    if (!url) return;
    try {
      window.location.href = url;
    } catch {
      window.alert('לא ניתן לחייג כעת');
    }
  }, [peerPhone]);

  const showPeerPhoneIcon = isDirectPeer && peerPhone && !!toTelUrl(peerPhone);
  const showPeerOnlineSubtitle = false;

  const handleOpenPeerProfile = useCallback(() => {
    if (!isDirectPeer || typeof onOpenPeerProfile !== 'function') return;
    onOpenPeerProfile({
      userRef: otherUserRef,
      email: otherUserEmail,
      name: displayName,
      profileImageUrl: profileAvatarUrl,
    });
  }, [isDirectPeer, onOpenPeerProfile, otherUserRef, otherUserEmail, displayName, profileAvatarUrl]);

  const groupTitleResolved =
    (groupDetail?.title != null && String(groupDetail.title).trim()) || displayName;
  const groupAvatarResolved = getUserProfileImageUrl(groupDetail) || profileImageUrl;

  const senderNameByEmail = useMemo(() => {
    const m = new Map();
    for (const row of groupMembersList) {
      if (row?.email) m.set(String(row.email).trim().toLowerCase(), row.name || row.email);
    }
    return m;
  }, [groupMembersList]);
  const groupMemberEmailsSet = useMemo(
    () =>
      new Set(
        groupMembersList.map(m => String(m?.email || '').trim().toLowerCase()).filter(Boolean),
      ),
    [groupMembersList],
  );
  const visibleGroupMembers = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const member of groupMembersList || []) {
      const email = String(member?.email || '').trim().toLowerCase();
      const subId = String(member?.subscriptionId || member?.subscription_id || '')
        .trim()
        .toLowerCase();
      const alt = String(member?.user_id || member?.userRef || member?.id || '')
        .trim()
        .toLowerCase();
      const key = subId || (email.includes('@') ? email : alt);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      if (email.includes('@')) seen.add(email);
      if (subId) seen.add(subId);
      if (alt) seen.add(alt);
      out.push(member);
    }
    return out;
  }, [groupMembersList]);
  const groupAddAudience = useMemo(() => {
    const storedKind =
      groupDetail?.groupKind != null
        ? String(groupDetail.groupKind).trim().toLowerCase()
        : groupDetail?.group_kind != null
          ? String(groupDetail.group_kind).trim().toLowerCase()
          : null;
    if (storedKind === 'open') return 'all';
    if (storedKind === 'brokers') return 'broker_only';
    if (storedKind === 'customers') return 'regular';
    const actorType = String(currentUser?.subscription_type || currentUser?.type || '')
      .trim()
      .toLowerCase();
    if (
      isRegularSubscriptionType(actorType) ||
      actorType === subscriptionTypes.professional ||
      actorType === subscriptionTypes.company ||
      actorType === subscriptionTypes.projectMarketer
    ) {
      return 'all';
    }
    const isBrokerType = st => String(st || '').trim().toLowerCase() === 'broker';
    const others = groupMembersList.filter(m => {
      const em = String(m?.email || '').trim().toLowerCase();
      return em && em !== myEmail;
    });
    const hasNonBroker = others.some(m => !isBrokerType(m?.subscriptionType));
    return hasNonBroker ? 'regular' : 'broker_only';
  }, [groupDetail, groupMembersList, myEmail, currentUser?.subscription_type, currentUser?.type]);

  useEffect(() => {
    if (!isGroupThread || groupMembersList.length === 0) return undefined;
    let cancelled = false;
    const run = async () => {
      const missing = groupMembersList.filter(member => {
        const existing = normalizeAvatarUrl(getUserProfileImageUrl(member));
        if (existing) return false;
        const refRaw =
          member?.email != null && String(member.email).trim()
            ? String(member.email).trim()
            : member?.user_id != null && String(member.user_id).trim()
              ? String(member.user_id).trim()
              : member?.id != null && String(member.id).trim()
                ? String(member.id).trim()
                : null;
        return !!refRaw;
      });
      await Promise.all(
        missing.map(async member => {
          const refRaw =
            member?.email != null && String(member.email).trim()
              ? String(member.email).trim()
              : member?.user_id != null && String(member.user_id).trim()
                ? String(member.user_id).trim()
                : member?.id != null && String(member.id).trim()
                  ? String(member.id).trim()
                  : null;
          if (!refRaw) return;
          const ref = refRaw.toLowerCase();
          try {
            const res = await getChatParticipantDisplay(refRaw);
            const resolved = normalizeAvatarUrl(
              getUserProfileImageUrl(res) || res?.profileImageUrl || res?.profile_picture_url || null,
            );
            if (!cancelled && resolved) {
              setGroupMemberAvatarOverrides(prev => (prev[ref] === resolved ? prev : {...prev, [ref]: resolved}));
            }
          } catch {
            /* best-effort */
          }
        }),
      );
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [isGroupThread, groupMembersList]);

  useEffect(() => {
    if (!showAddMembersModal || !isGroupThread || !groupConversationId || !myEmail) return undefined;
    let cancelled = false;
    setAddMembersLoading(true);
    getUsersForGroupPicker(addMembersSearch, myEmail, groupAddAudience)
      .then(res => {
        if (cancelled) return;
        const list = (res?.users || []).filter(u => {
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
  }, [
    showAddMembersModal,
    isGroupThread,
    groupConversationId,
    myEmail,
    addMembersSearch,
    groupAddAudience,
    groupMemberEmailsSet,
  ]);

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
    if (!myEmail) return;
    if (isGroupThread && groupConversationId) {
      getGroupChatMessages(myEmail, groupConversationId)
        .then(res => {
          if (res.messages) setMessages(res.messages.map(normalizeChatMessage));
          if (res.conversation_id) setConversationId(res.conversation_id);
          if (res.group) setGroupDetail(res.group);
          if (Array.isArray(res.members)) setGroupMembersList(res.members);
          setPeerLastReadAt(res.peerLastReadAt || null);
          setExclusiveOfferMeta(null);
        })
        .catch(() => {
          setMessages([]);
          setGroupDetail(null);
          setGroupMembersList([]);
          setExclusiveOfferMeta(null);
        });
      return;
    }
    if (!isDirectPeer || (!otherUserEmail && !directConversationId)) return;
    getChatMessages(myEmail, otherUserEmail, directConversationId)
      .then(res => {
        if (res.messages) setMessages(res.messages.map(normalizeChatMessage));
        if (res.conversation_id) setConversationId(res.conversation_id);
        setPeerLastReadAt(res.peerLastReadAt || null);
        setExclusiveOfferMeta(prev => {
          const cid = res.conversation_id != null ? String(res.conversation_id).trim() : '';
          const incoming = res.exclusiveOffer;
          if (incoming != null) return enrichExclusiveOfferMeta(incoming, cid);
          if (prev) {
            const pst = String(prev.status || '').trim().toLowerCase();
            const keep = pst === 'pending' || pst === 'rejected' || pst === 'accepted';
            if (!keep) return null;
            return cid ? enrichExclusiveOfferMeta(prev, cid) : prev;
          }
          return null;
        });
        if (res.peerOfferBlocks) {
          setResolvedDisplay(prev => ({
            ...(prev || {}),
            blockExclusiveOffers: res.peerOfferBlocks.blockExclusiveOffers === true,
            blockCollabOffers: res.peerOfferBlocks.blockCollabOffers === true,
          }));
        }
      })
      .catch(() => {
        setMessages([]);
        setExclusiveOfferMeta(null);
      });
  }, [isGroupThread, groupConversationId, isDirectPeer, myEmail, otherUserEmail, directConversationId]);

  const fetchMessagesRef = useRef(fetchMessages);
  useEffect(() => {
    fetchMessagesRef.current = fetchMessages;
  }, [fetchMessages]);

  useEffect(() => {
    setPeerLastReadAt(null);
  }, [directConversationId, groupConversationId, otherUserEmail]);

  useEffect(() => {
    if (!isUser || !otherUserRef) {
      setResolvedDisplay(null);
      return;
    }
    const seedName =
      conversation?.name != null && String(conversation.name).trim() !== '' ? String(conversation.name).trim() : null;
    const seedPic = getUserProfileImageUrl(conversation) || null;
    if (seedName || seedPic) {
      setResolvedDisplay({
        name: seedName,
        profileImageUrl: seedPic,
        phone: null,
        subscriptionType: conversation?.subscriptionType || conversation?.subscription_type || null,
      });
    } else {
      setResolvedDisplay(null);
    }
  }, [isUser, otherUserRef, conversation?.name, conversation?.profileImageUrl, conversation?.subscriptionType, conversation?.subscription_type]);

  useEffect(() => {
    if (!isUser || !otherUserRef) return undefined;
    let cancelled = false;
    getChatParticipantDisplay(otherUserRef)
      .then(res => {
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
        const name = res.name != null && String(res.name).trim() !== '' ? res.name : null;
        const profileImageUrlResolved = getUserProfileImageUrl(res) || null;
        const phone = res.phone != null && String(res.phone).trim() !== '' ? String(res.phone).trim() : null;
        if (name || profileImageUrlResolved || phone || res.subscription_type) {
          setResolvedDisplay(prev => ({
            name: name || prev?.name || null,
            profileImageUrl: profileImageUrlResolved || prev?.profileImageUrl || null,
            phone: phone || prev?.phone || null,
            subscriptionType: res.subscription_type || prev?.subscriptionType || null,
            blockExclusiveOffers:
              typeof res.block_exclusive_offers === 'boolean'
                ? res.block_exclusive_offers
                : prev?.blockExclusiveOffers === true,
            blockCollabOffers:
              typeof res.block_collab_offers === 'boolean'
                ? res.block_collab_offers
                : prev?.blockCollabOffers === true,
          }));
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
    const seeded = pickConversationId(directConversationId);
    if (seeded) setConversationId(seeded);
  }, [directConversationId]);

  useEffect(() => {
    if (!conversation) return undefined;
    if (!myEmail || isWelcome) return undefined;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return undefined;
    let cancelled = false;
    setMessages([]);
    if (directConversationId) setConversationId(String(directConversationId).trim());
    else setConversationId(null);
    setLoading(true);
    const load = () =>
      isGroupThread && groupConversationId
        ? getGroupChatMessages(myEmail, groupConversationId)
        : getChatMessages(myEmail, otherUserEmail, directConversationId);
    load()
      .then(res => {
        if (!cancelled && res.messages) setMessages(res.messages.map(normalizeChatMessage));
        if (!cancelled && res.conversation_id) setConversationId(res.conversation_id);
        if (!cancelled && isGroupThread) {
          if (res.group) setGroupDetail(res.group);
          if (Array.isArray(res.members)) setGroupMembersList(res.members);
          setExclusiveOfferMeta(null);
        }
        if (!cancelled && !isGroupThread && res.exclusiveOffer !== undefined) {
          const cid = res.conversation_id != null ? String(res.conversation_id).trim() : '';
          setExclusiveOfferMeta(res.exclusiveOffer ? enrichExclusiveOfferMeta(res.exclusiveOffer, cid) : null);
        }
      })
      .catch(() => {
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
    return () => {
      cancelled = true;
    };
  }, [isDirectPeer, isGroupThread, groupConversationId, myEmail, otherUserEmail, directConversationId, conversation, isWelcome]);

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
      return undefined;
    }
    let cancelled = false;
    getListingPreview(lid).then(listing => {
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

  const savedGroupDescription =
    groupDetail?.description != null && String(groupDetail.description).trim()
      ? String(groupDetail.description).trim()
      : '';
  const canSaveGroupDesc = groupDescDraft.trim() !== savedGroupDescription && myEmail != null && !!groupConversationId;

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
      setGroupDetail(prev => ({...(prev || {}), description: next || null}));
      setShowGroupDescModal(false);
    } catch (e) {
      window.alert(e?.message ? String(e.message) : 'שמירת התיאור נכשלה');
    } finally {
      setSavingGroupDesc(false);
    }
  }, [canSaveGroupDesc, savingGroupDesc, myEmail, groupConversationId, groupDescDraft]);

  const openAddMembersModal = useCallback(() => {
    if (!isGroupThread || !groupConversationId) return;
    setAddMembersSearch('');
    setAddMembersSelected({});
    setShowAddMembersModal(true);
  }, [isGroupThread, groupConversationId]);

  const toggleAddMember = useCallback(email => {
    const key = String(email || '').trim().toLowerCase();
    if (!key) return;
    setAddMembersSelected(prev => ({...prev, [key]: !prev[key]}));
  }, []);

  const submitAddMembers = useCallback(async () => {
    const picked = Object.keys(addMembersSelected).filter(k => addMembersSelected[k]);
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
      window.alert(e?.message ? String(e.message) : 'הוספת חברים נכשלה');
    } finally {
      setAddMembersSubmitting(false);
    }
  }, [addMembersSelected, myEmail, groupConversationId, addMembersSubmitting, fetchMessages]);

  const refreshGroupFromServer = useCallback(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSaveGroupTitleModal = useCallback(
    async nextTitle => {
      if (!myEmail || !groupConversationId) return;
      setGroupManageBusy(true);
      try {
        await updateGroupTitle({userEmail: myEmail, conversationId: groupConversationId, title: nextTitle});
      } finally {
        setGroupManageBusy(false);
      }
    },
    [myEmail, groupConversationId],
  );

  const handleRemoveMemberModal = useCallback(
    memberEmail =>
      removeMemberFromChatGroup({userEmail: myEmail, conversationId: groupConversationId, memberEmail}),
    [myEmail, groupConversationId],
  );

  const handleLeaveGroupModal = useCallback(
    () => removeMemberFromChatGroup({userEmail: myEmail, conversationId: groupConversationId, memberEmail: myEmail}),
    [myEmail, groupConversationId],
  );

  const handleSetMemberRoleModal = useCallback(
    (targetEmail, role) =>
      updateGroupMemberRole({userEmail: myEmail, conversationId: groupConversationId, targetEmail, role}),
    [myEmail, groupConversationId],
  );

  useEffect(() => {
    const cid =
      (groupConversationId && CHAT_PEER_UUID_RE.test(groupConversationId) ? groupConversationId : null) ||
      (conversationId && CHAT_PEER_UUID_RE.test(conversationId) ? conversationId : null);
    if (!cid || !myEmail) {
      setRealtimeOk(false);
      return undefined;
    }
    const supabase = getChatRealtimeClient();
    if (!supabase) {
      setRealtimeOk(false);
      return undefined;
    }
    let cancelled = false;
    let channel = null;
    let retryTimer = null;
    let attempt = 0;
    const attach = () => {
      if (cancelled) return;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          /* ignore */
        }
        channel = null;
      }
      channel = supabase
        .channel(`chat-msg:${cid}:${attempt}`)
        .on(
          'postgres_changes',
          {event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${cid}`},
          payload => {
            const row = payload?.new;
            if (!row || !row.id) return;
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
              isProfessionalNotification: row.is_professional_notification === true,
              createdAt: row.created_at,
              isMe: senderEmail === myEmail,
            });
            setMessages(prev => (prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]));
          },
        )
        .on(
          'postgres_changes',
          {event: 'UPDATE', schema: 'public', table: 'chat_participants', filter: `conversation_id=eq.${cid}`},
          () => fetchMessagesRef.current(),
        )
        .subscribe(status => {
          if (cancelled) return;
          if (status === 'SUBSCRIBED') {
            setRealtimeOk(true);
            return;
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setRealtimeOk(false);
            if (attempt < 3) {
              attempt += 1;
              retryTimer = setTimeout(attach, 1500 * attempt);
            }
          }
        });
    };
    attach();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      setRealtimeOk(false);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          /* ignore */
        }
      }
    };
  }, [conversationId, groupConversationId, myEmail]);

  useEffect(() => {
    const pending = [];
    const seen = new Set();
    (messages || []).forEach(m => {
      const lid = m?.listingId;
      if (!lid || seen.has(lid) || Object.prototype.hasOwnProperty.call(listingPreviewCache, lid)) return;
      seen.add(lid);
      pending.push(lid);
    });
    if (pending.length === 0) return undefined;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        pending.map(async lid => {
          try {
            return [lid, (await getListingPreview(lid)) || null];
          } catch {
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
      entries.forEach(([, val]) => {
        prefetchChatMediaUri(val?.posterUrl);
        prefetchChatMediaUri(val?.mediaUrl);
        prefetchChatMediaUri(val?.videoHlsUrl);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, listingPreviewCache]);

  useEffect(() => {
    messages.forEach(raw => {
      prefetchChatMediaUri(raw?.mediaUrl || raw?.media_url || raw?.media?.url || null);
    });
  }, [messages]);

  const markChatImageBroken = useCallback(url => {
    const key = String(url || '').trim();
    if (!key) return;
    setBrokenImageUrls(prev => (prev[key] ? prev : {...prev, [key]: true}));
  }, []);

  const rememberChatImageSize = useCallback((url, width, height) => {
    const key = String(url || '').trim();
    if (!key) return;
    const box = chatPhotoBox(width, height);
    setChatImageSizeByUrl(prev => {
      const cur = prev[key];
      if (cur && cur.width === box.width && cur.height === box.height) return prev;
      return {...prev, [key]: box};
    });
  }, []);

  const applyConversationIdFromSend = useCallback(res => {
    const cid = pickConversationId(res?.conversation_id, res?.conversationId);
    if (cid) setConversationId(cid);
  }, []);

  const scrollMessagesToEnd = useCallback(() => {
    if (scrollToEndTimerRef.current) clearTimeout(scrollToEndTimerRef.current);
    scrollToEndTimerRef.current = setTimeout(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
      scrollToEndTimerRef.current = null;
    }, 80);
  }, []);

  useEffect(
    () => () => {
      if (scrollToEndTimerRef.current) clearTimeout(scrollToEndTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!myEmail) return undefined;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return undefined;
    const POLL_MS = realtimeOk ? 12000 : 3000;
    const interval = setInterval(() => fetchMessagesRef.current(), POLL_MS);
    return () => clearInterval(interval);
  }, [isDirectPeer, isGroupThread, groupConversationId, myEmail, realtimeOk]);

  useEffect(() => {
    if (!myEmail) return undefined;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return undefined;
    const onVis = () => {
      if (document.visibilityState === 'visible') fetchMessagesRef.current();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [myEmail, isDirectPeer, isGroupThread, groupConversationId]);

  useEffect(() => {
    if (isWelcome && onPiWelcomeOpened) onPiWelcomeOpened();
  }, [isWelcome, onPiWelcomeOpened]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.pause();
        soundRef.current.src = '';
        soundRef.current = null;
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (recordingRef.current && recordingRef.current.state !== 'inactive') {
        try {
          recordingRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      recordingRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (embedded) return undefined;
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-account-modal]')) return;
      e.stopPropagation();
      onClose?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [embedded, onClose]);

  useModalEscape(showExclusiveOfferModal, () => setShowExclusiveOfferModal(false));
  useModalEscape(showAddMembersModal, () => setShowAddMembersModal(false));
  useModalEscape(showGroupDescModal, () => setShowGroupDescModal(false));
  useModalEscape(!!fullScreenImageUrl, () => setFullScreenImageUrl(null));
  useModalEscape(!!fullScreenVideoUrl, () => setFullScreenVideoUrl(null));
  useModalEscape(!!actionMenuMessage && !deletingMessage, () => setActionMenuMessage(null));

  const [appNudge, setAppNudge] = useState(false);

  const handleSend = async () => {
    const text = (inputText || '').trim();
    if (!text || composerBlockedExclusive) return;
    if (isWelcome) {
      setInputText('');
      return;
    }
    if (!myEmail) return;
    const firstInThread = messages.length === 0;
    if (isGroupThread) {
      if (!groupConversationId) return;
      setSending(true);
      setInputText('');
      try {
        const res = await sendGroupChatMessage(groupConversationId, myEmail, text, null);
        if (res.message) {
          const nm = normalizeChatMessage(res.message);
          setMessages(prev => [...prev, {...nm, id: nm.id || Date.now()}]);
          applyConversationIdFromSend(res);
          onMessageSent?.();
          if (firstInThread) setAppNudge(true);
        }
      } catch (e) {
        setInputText(text);
        window.alert(e?.message || 'שליחת ההודעה נכשלה');
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
      const listingForSend = contextListingId && messages.length === 0 ? contextListingId : null;
      const res = await sendChatMessage(myEmail, otherUserEmail, text, receiverDisplay, senderDisplay, null, listingForSend);
      if (res.message) {
        const nm = normalizeChatMessage(res.message);
        setMessages(prev => [...prev, {...nm, id: nm.id || Date.now()}]);
        applyConversationIdFromSend(res);
        onMessageSent?.();
        if (firstInThread) setAppNudge(true);
      }
    } catch (e) {
      setInputText(text);
      window.alert(e?.message || 'שליחת ההודעה נכשלה');
    } finally {
      setSending(false);
    }
  };

  const handleSubmitExclusiveOffer = async () => {
    if (isFeedPostListingRecord(sharedListing)) {
      window.alert('לא ניתן לשלוח הצעת בלעדיות או שת״פ מפוסט — רק ממודעה');
      return;
    }
    if (!canSendBrokerOffer) {
      window.alert('ניתן לשלוח הצעה רק ממי שפנה מצ׳אט שנפתח ממודעה (לא בעל המודעה)');
      return;
    }
    const text = String(exclusiveMessage || '').trim();
    if (!text) {
      window.alert('כתוב הודעה לפני השליחה');
      return;
    }
    if (offerBlockedMessage) {
      window.alert(offerBlockedMessage);
      return;
    }
    if (!myEmail || !otherUserEmail) {
      window.alert(
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
      if (!res || res.success === false || !res.message) throw new Error(res?.error || 'שליחת ההצעה נכשלה');
      setMessages(prev => {
        const nm = normalizeChatMessage(res.message);
        return [...prev, {...nm, id: nm.id || Date.now()}];
      });
      applyConversationIdFromSend(res);
      onMessageSent?.();
      setShowExclusiveOfferModal(false);
      window.alert(isCollabOfferMode ? 'הצעת שת״פ נשלחה' : 'הצעת בלעדיות נשלחה');
      fetchMessages();
    } catch (e) {
      window.alert(e?.message || 'שליחת ההצעה נכשלה');
    } finally {
      setSending(false);
    }
  };

  const sendPickedChatMedia = async (file, mediaType) => {
    if (!file) return;
    const mime = file.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
    const name = file.name || (mediaType === 'video' ? `video-${Date.now()}.mp4` : `photo-${Date.now()}.jpg`);
    const uri = URL.createObjectURL(file);
    if (mediaType === 'image') {
      const img = new Image();
      img.onload = () => rememberChatImageSize(uri, img.naturalWidth, img.naturalHeight);
      img.src = uri;
    }
    setSending(true);
    try {
      const up = await uploadChatMedia({uri, type: mime, name, file});
      let res;
      if (isGroupThread && groupConversationId) {
        res = await sendGroupChatMessage(groupConversationId, myEmail, '', {type: mediaType, url: up.url});
      } else {
        const {receiverDisplay, senderDisplay} = getChatDisplays();
        res = await sendChatMessage(myEmail, otherUserEmail, '', receiverDisplay, senderDisplay, {
          type: mediaType,
          url: up.url,
        });
      }
      if (res.message) {
        const nm = normalizeChatMessage(res.message);
        const mediaUrl = nm.mediaUrl || up.url;
        setMessages(prev => [
          ...prev,
          {...nm, id: nm.id || Date.now(), mediaType: nm.mediaType || mediaType, mediaUrl},
        ]);
        applyConversationIdFromSend(res);
        onMessageSent?.();
      }
    } catch (e) {
      window.alert(e?.message || 'העלאת המדיה נכשלה');
    } finally {
      URL.revokeObjectURL(uri);
      setSending(false);
    }
  };

  const sendPickedChatFile = async ({uri, mimeType, name, size, file}) => {
    const fileUri = uri != null ? String(uri).trim() : '';
    if (!fileUri) return;
    const fileName = name != null && String(name).trim() !== '' ? String(name).trim() : `file-${Date.now()}`;
    const mime = mimeType || 'application/octet-stream';
    if (size != null && Number(size) > 25 * 1024 * 1024) {
      window.alert('הקובץ גדול מדי (מקסימום 25MB)');
      return;
    }
    setSending(true);
    try {
      const up = await uploadChatMedia({uri: fileUri, type: mime, name: fileName, file});
      let res;
      if (isGroupThread && groupConversationId) {
        res = await sendGroupChatMessage(groupConversationId, myEmail, fileName, {type: 'file', url: up.url});
      } else {
        const {receiverDisplay, senderDisplay} = getChatDisplays();
        res = await sendChatMessage(myEmail, otherUserEmail, fileName, receiverDisplay, senderDisplay, {
          type: 'file',
          url: up.url,
        });
      }
      if (res.message) {
        const nm = normalizeChatMessage(res.message);
        setMessages(prev => [
          ...prev,
          {
            ...nm,
            id: nm.id || Date.now(),
            mediaType: nm.mediaType || 'file',
            mediaUrl: nm.mediaUrl || up.url,
            body: nm.body || fileName,
          },
        ]);
        applyConversationIdFromSend(res);
        onMessageSent?.();
      }
    } catch (e) {
      window.alert(e?.message || 'העלאת הקובץ נכשלה');
    } finally {
      setSending(false);
    }
  };

  const handlePickFromGallery = () => {
    if (!myEmail || sending || isRecording) return;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return;
    galleryInputRef.current?.click();
  };

  const handleTakePhoto = () => {
    if (!myEmail || sending || isRecording) return;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return;
    cameraInputRef.current?.click();
  };

  const handlePickFile = () => {
    if (!myEmail || sending || isRecording) return;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return;
    fileInputRef.current?.click();
  };

  const stopMediaStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const resetVoiceComposerState = useCallback(() => {
    setIsRecording(false);
    setVoiceLocked(false);
    setRecordingDurationSec(0);
    setVoiceCancelArmed(false);
    setVoiceLockHint(false);
    setVoiceSlideX(0);
    voiceLockedRef.current = false;
    voiceCancelArmedRef.current = false;
  }, []);

  const cancelVoiceRecording = useCallback(async () => {
    const rec = recordingRef.current;
    recordingRef.current = null;
    chunksRef.current = [];
    resetVoiceComposerState();
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    stopMediaStream();
  }, [resetVoiceComposerState]);

  const startVoiceRecording = useCallback(async () => {
    if (!myEmail || sending || isWelcome) return;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return;
    if (recordingRef.current) return;
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      window.alert('הקלטת קול אינה זמינה בדפדפן זה');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const rec = mime ? new MediaRecorder(stream, {mimeType: mime}) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = e => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };
      rec.start();
      recordingRef.current = rec;
      recordStartedAtRef.current = Date.now();
      voiceLockedRef.current = false;
      voiceCancelArmedRef.current = false;
      setVoiceLocked(false);
      setVoiceCancelArmed(false);
      setVoiceLockHint(false);
      setRecordingDurationSec(0);
      setIsRecording(true);
    } catch {
      recordingRef.current = null;
      stopMediaStream();
      resetVoiceComposerState();
      window.alert('נדרשת גישה למיקרופון');
    }
  }, [groupConversationId, isDirectPeer, isGroupThread, isWelcome, myEmail, resetVoiceComposerState, sending]);

  const stopVoiceRecordingAndSend = useCallback(async () => {
    const rec = recordingRef.current;
    recordingRef.current = null;
    const elapsed = Date.now() - recordStartedAtRef.current;
    resetVoiceComposerState();
    if (!rec) return;
    const blob = await new Promise(resolve => {
      const finish = () => {
        const type = rec.mimeType || 'audio/webm';
        resolve(new Blob(chunksRef.current, {type}));
        chunksRef.current = [];
      };
      if (rec.state === 'inactive') {
        finish();
        return;
      }
      rec.onstop = finish;
      try {
        rec.stop();
      } catch {
        finish();
      }
    });
    stopMediaStream();
    if (elapsed < VOICE_MIN_RECORD_MS || !blob?.size || !myEmail) return;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return;
    const uri = URL.createObjectURL(blob);
    const name = `voice-${Date.now()}.webm`;
    setSending(true);
    try {
      const up = await uploadChatMedia({uri, type: blob.type || 'audio/webm', name, file: blob});
      let res;
      if (isGroupThread && groupConversationId) {
        res = await sendGroupChatMessage(groupConversationId, myEmail, '', {type: 'audio', url: up.url});
      } else if (otherUserEmail) {
        const {receiverDisplay, senderDisplay} = getChatDisplays();
        const listingForVoice = contextListingId && messages.length === 0 ? contextListingId : null;
        res = await sendChatMessage(
          myEmail,
          otherUserEmail,
          '',
          receiverDisplay,
          senderDisplay,
          {type: 'audio', url: up.url},
          listingForVoice,
        );
      } else {
        return;
      }
      if (res.message) {
        const nm = normalizeChatMessage(res.message);
        const newId = nm.id || Date.now();
        setMessages(prev => [
          ...prev,
          {...nm, id: newId, mediaType: nm.mediaType || 'audio', mediaUrl: nm.mediaUrl || up.url},
        ]);
        setVoiceMetaById(prev => ({...prev, [String(newId)]: {durationMs: elapsed, positionMs: 0, progress: 0}}));
        applyConversationIdFromSend(res);
        onMessageSent?.();
        if (messages.length === 0) setAppNudge(true);
      }
    } catch (e) {
      window.alert(e?.message || 'שליחת ההקלטה נכשלה');
    } finally {
      URL.revokeObjectURL(uri);
      setSending(false);
    }
  }, [
    applyConversationIdFromSend,
    contextListingId,
    getChatDisplays,
    groupConversationId,
    isDirectPeer,
    isGroupThread,
    messages.length,
    myEmail,
    onMessageSent,
    otherUserEmail,
    resetVoiceComposerState,
  ]);

  useEffect(() => {
    startVoiceRecordingRef.current = startVoiceRecording;
    cancelVoiceRecordingRef.current = cancelVoiceRecording;
    stopVoiceRecordingAndSendRef.current = stopVoiceRecordingAndSend;
  }, [startVoiceRecording, cancelVoiceRecording, stopVoiceRecordingAndSend]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingDurationSec(0);
      setVoiceSlideX(0);
      return undefined;
    }
    const tick = () => setRecordingDurationSec(Math.floor((Date.now() - recordStartedAtRef.current) / 1000));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [isRecording]);

  const openChatImageFullScreen = useCallback(url => {
    const u = url != null ? String(url).trim() : '';
    if (!u) return;
    if (isChatVideoUrl(u)) {
      setFullScreenVideoUrl(u);
      return;
    }
    setFullScreenImageUrl(u);
  }, []);

  const openChatVideoFullScreen = useCallback(url => {
    const u = url != null ? String(url).trim() : '';
    if (!u) return;
    setFullScreenVideoUrl(u);
  }, []);

  const openChatFile = useCallback(url => {
    const u = url != null ? String(url).trim() : '';
    if (!u) return;
    try {
      window.open(u, '_blank', 'noopener,noreferrer');
    } catch {
      window.alert('לא ניתן לפתוח את הקובץ');
    }
  }, []);

  const handleVoiceDurationKnown = useCallback((messageId, durationMs) => {
    const id = String(messageId);
    const ms = Math.max(0, Number(durationMs) || 0);
    if (!id || ms <= 0) return;
    setVoiceMetaById(prev => {
      const existing = prev[id];
      if (existing?.durationMs > 0) return prev;
      return {...prev, [id]: {durationMs: ms, positionMs: existing?.positionMs || 0, progress: existing?.progress || 0}};
    });
  }, []);

  const setVoiceProgress = useCallback((messageId, {positionMs, durationMs, progress}) => {
    const id = String(messageId);
    if (!id) return;
    setVoiceMetaById(prev => {
      const dur = Math.max(0, Number(durationMs) || prev[id]?.durationMs || 0);
      const pos = Math.max(0, Number(positionMs) || 0);
      const prog = typeof progress === 'number' ? Math.max(0, Math.min(1, progress)) : dur > 0 ? Math.min(1, pos / dur) : 0;
      return {...prev, [id]: {durationMs: dur, positionMs: pos, progress: prog}};
    });
  }, []);

  const toggleVoicePlayback = async (messageId, url) => {
    if (!url) return;
    const id = String(messageId);
    try {
      if (playingMessageId === id && soundRef.current) {
        const audio = soundRef.current;
        if (!audio.paused) {
          audio.pause();
          setPlayingMessageId(null);
          voicePlayBeganRef.current = false;
          setActiveVoicePlay({id: null, startedAt: 0, startProgress: 0});
          setVoiceProgress(id, {positionMs: audio.currentTime * 1000, durationMs: (audio.duration || 0) * 1000});
          return;
        }
        audio.pause();
        audio.src = '';
        soundRef.current = null;
        setPlayingMessageId(null);
        voicePlayBeganRef.current = false;
        setActiveVoicePlay({id: null, startedAt: 0, startProgress: 0});
        return;
      }
      if (soundRef.current) {
        soundRef.current.pause();
        soundRef.current.src = '';
        soundRef.current = null;
        setPlayingMessageId(null);
      }
      setPlayingMessageId(id);
      voicePlayBeganRef.current = false;
      setActiveVoicePlay({id: null, startedAt: 0, startProgress: 0});
      const resumeMs = voiceMetaById[id]?.positionMs || 0;
      const audio = new Audio(url);
      soundRef.current = audio;
      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration > 0) {
          setVoiceMetaById(prev => {
            const ms = audio.duration * 1000;
            if (prev[id]?.durationMs === ms) return prev;
            return {...prev, [id]: {durationMs: ms, positionMs: prev[id]?.positionMs || 0, progress: prev[id]?.progress || 0}};
          });
        }
      });
      audio.addEventListener('playing', () => {
        if (voicePlayBeganRef.current) return;
        voicePlayBeganRef.current = true;
        const dur = (audio.duration || 0) * 1000 || voiceMetaById[id]?.durationMs || 0;
        const pos = (audio.currentTime || 0) * 1000;
        const startProgress = dur > 0 ? Math.min(1, pos / dur) : 0;
        setActiveVoicePlay({id, startedAt: Date.now(), startProgress});
      });
      audio.addEventListener('ended', () => {
        voicePlayBeganRef.current = false;
        setActiveVoicePlay({id: null, startedAt: 0, startProgress: 0});
        setPlayingMessageId(current => (current === id ? null : current));
        setVoiceProgress(id, {positionMs: 0, durationMs: (audio.duration || 0) * 1000, progress: 0});
        if (soundRef.current === audio) {
          audio.src = '';
          soundRef.current = null;
        }
      });
      if (resumeMs > 0) audio.currentTime = resumeMs / 1000;
      await audio.play();
    } catch (e) {
      setPlayingMessageId(null);
      window.alert(e?.message || 'לא ניתן להשמיע');
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
    const fromState = conversationId != null ? String(conversationId).trim() : '';
    const fromMeta = exclusiveOfferMeta?.conversationId != null ? String(exclusiveOfferMeta.conversationId).trim() : '';
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

  const handleMessageLongPress = useCallback(
    m => {
      if (!m || m.isMe !== true || isWelcome) return;
      const id = m.id != null ? String(m.id).trim() : '';
      if (!id) return;
      setActionMenuMessage(m);
    },
    [isWelcome],
  );

  const handleDeleteMessage = useCallback(async () => {
    const target = actionMenuMessage;
    if (!target || deletingMessage) return;
    const id = target.id != null ? String(target.id).trim() : '';
    if (!id || !myEmail) {
      setActionMenuMessage(null);
      return;
    }
    setDeletingMessage(true);
    try {
      await deleteChatMessage(id, myEmail);
      setMessages(prev => prev.filter(x => String(x.id).trim() !== id));
      setActionMenuMessage(null);
    } catch (e) {
      window.alert(e?.message || 'מחיקת ההודעה נכשלה');
    } finally {
      setDeletingMessage(false);
    }
  }, [actionMenuMessage, deletingMessage, myEmail]);

  const isAwaitingExclusiveResponse = useMemo(() => {
    if (!messages || messages.length === 0) return false;
    let pending = false;
    for (const m of messages) {
      const body = typeof m?.body === 'string' ? m.body : '';
      if (isBrokerOfferBody(body) && m?.isMe) pending = true;
      else if (!m?.isMe) pending = false;
    }
    return pending;
  }, [messages]);

  const hasSentExclusiveOfferInThread = useMemo(() => {
    if (!messages || messages.length === 0) return false;
    return messages.some(m => m?.isMe && typeof m?.body === 'string' && isBrokerOfferBody(m.body));
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
    async accept => {
      const conv = exclusiveRespondConversationId;
      if (!myEmail || !conv || exclusiveRespondLoading) return;
      try {
        setExclusiveRespondLoading(true);
        const data = await respondToExclusiveOffer({userEmail: myEmail, conversationId: conv, accept});
        const nextSt =
          data?.status != null ? String(data.status).trim().toLowerCase() : accept ? 'accepted' : 'rejected';
        setExclusiveOfferMeta(prev =>
          prev ? {...prev, status: nextSt, conversationId: prev.conversationId || conv} : prev,
        );
        fetchMessages();
        window.alert(accept ? 'הבקשה אושרה' : 'הבקשה נדחתה');
      } catch (e) {
        window.alert(e?.message ? String(e.message) : 'פעולה נכשלה');
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
    (isWelcome || isDirectPeer || (isGroupThread && groupConversationId));
  const canSendChatMedia = composerActive && !isWelcome && !sending && !isRecording;

  useEffect(() => {
    canRecordVoiceRef.current = composerActive && !isWelcome && !sending;
  }, [composerActive, isWelcome, sending]);

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
      src.street != null ? String(src.street).trim() : src.street_name != null ? String(src.street_name).trim() : '';
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
    return [...new Set(parts.filter(Boolean))].join(', ') || 'מיקום לא זמין';
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

  const offerIsRent = useMemo(() => {
    const src = exclusiveListingData || sharedListing || {};
    const purpose = String(src.purpose ?? src.listingPurpose ?? src.listing_purpose ?? '')
      .trim()
      .toLowerCase();
    if (
      purpose === 'rent' ||
      purpose === 'rental' ||
      purpose === 'להשכרה' ||
      purpose.includes('rent') ||
      purpose.includes('השכר')
    ) {
      return true;
    }
    if (
      purpose === 'sale' ||
      purpose === 'sell' ||
      purpose === 'למכירה' ||
      purpose.includes('sale') ||
      purpose.includes('מכיר')
    ) {
      return false;
    }
    const label = String(src.purposeLabel || src.purpose_label || '')
      .trim()
      .toLowerCase();
    if (label.includes('השכר') || label === 'להשכרה') return true;
    if (label.includes('מכיר') || label === 'למכירה') return false;
    return false;
  }, [exclusiveListingData, sharedListing]);

  const timelinePercent = useMemo(() => {
    const n = Number(exclusiveMonths);
    const clamped = Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 1;
    return Math.max(0, Math.min(100, ((clamped - 1) / 9) * 100));
  }, [exclusiveMonths]);

  const exclusiveMonthsPercentFromEvent = useCallback(event => {
    return getRangeSliderPercentFromEvent(
      event,
      exclusiveSliderWidthRef.current,
      exclusiveSliderWindowXRef.current,
      exclusiveSliderRef,
    );
  }, []);

  const onExclusiveSliderPointer = event => {
    exclusiveSliderDraggingRef.current = true;
    setExclusiveMonths(exclusiveMonthsFromTouchPercent(exclusiveMonthsPercentFromEvent(event)));
  };

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
      const monthsPhrase = safeMonths === 1 ? 'חודש' : `${safeMonths} חודשים`;
      if (isCollabOfferMode) {
        if (offerIsRent) {
          return `היי, שמי ${exclusiveSenderName} ואני מתווך נדל״ן. יש לי שוכר שמתאים למודעה שלך ב${offerLocationText} ואני מעוניין להציע שיתוף פעולה על הנכס. אשמח שנעבוד יחד על העסקה — אני מתחייב להביא שוכר בתוך ${monthsPhrase}, אשמח לשוחח.`;
        }
        return `היי, שמי ${exclusiveSenderName} ואני מתווך נדל״ן. יש לי קונה שמתאים למודעה שלך ב${offerLocationText} ואני מעוניין להציע שיתוף פעולה על הנכס. אשמח שנעבוד יחד על העסקה — אני מתחייב להביא קונה בתוך ${monthsPhrase}, אשמח לשוחח.`;
      }
      if (offerIsRent) {
        return `היי, שמי ${exclusiveSenderName} ואני מתווך נדל״ן מנוסה. נתקלתי במודעה שלך עבור הדירה ב${offerLocationText} ואני מעוניין להציע בלעדיות על הנכס. אני מתחייב למצוא שוכר איכותי בתוך ${monthsPhrase}, אשמח לשוחח.`;
      }
      return `היי, שמי ${exclusiveSenderName} ואני מתווך נדל״ן מנוסה. נתקלתי במודעה שלך עבור הדירה ב${offerLocationText} ואני מעוניין להציע בלעדיות על הנכס. אני מתחייב למצוא קונה איכותי בתוך ${monthsPhrase}, אשמח לשוחח.`;
    },
    [exclusiveSenderName, offerLocationText, isCollabOfferMode, offerIsRent],
  );

  useEffect(() => {
    if (!showExclusiveOfferModal || !contextListingId) return undefined;
    let cancelled = false;
    setExclusiveLoadingListing(true);
    getListings({})
      .then(res => {
        if (cancelled) return;
        const rows = Array.isArray(res?.listings) ? res.listings : [];
        setExclusiveListingData(
          rows.find(r => String(r?.id || '').trim() === String(contextListingId).trim()) || null,
        );
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

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const syncWebKeyboardInset = () => {
      setKeyboardHeight(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };
    syncWebKeyboardInset();
    viewport.addEventListener('resize', syncWebKeyboardInset);
    viewport.addEventListener('scroll', syncWebKeyboardInset);
    return () => {
      viewport.removeEventListener('resize', syncWebKeyboardInset);
      viewport.removeEventListener('scroll', syncWebKeyboardInset);
    };
  }, []);

  useEffect(() => {
    scrollMessagesToEnd();
  }, [messages, scrollMessagesToEnd]);

  const bindMessagePress = m => ({
    onContextMenu: e => {
      e.preventDefault();
      handleMessageLongPress(m);
    },
    onPointerDown: () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => handleMessageLongPress(m), 300);
    },
    onPointerUp: () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    },
    onPointerLeave: () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    },
  });

  const onMicPointerDown = e => {
    if (!canRecordVoiceRef.current || voiceLockedRef.current) return;
    e.preventDefault();
    micPointerIdRef.current = e.pointerId;
    micStartRef.current = {x: e.clientX, y: e.clientY};
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startVoiceRecordingRef.current?.();
  };

  const onMicPointerMove = e => {
    if (micPointerIdRef.current == null || !recordingRef.current || voiceLockedRef.current) return;
    const dx = e.clientX - micStartRef.current.x;
    const dy = e.clientY - micStartRef.current.y;
    const followX = Math.max(-140, Math.min(0, dx));
    setVoiceSlideX(followX);
    const armed = dx < -VOICE_CANCEL_SLIDE_PX;
    voiceCancelArmedRef.current = armed;
    setVoiceCancelArmed(armed);
    setVoiceLockHint(dy < -20 && dy > -VOICE_LOCK_SLIDE_PX);
    if (dy < -VOICE_LOCK_SLIDE_PX) {
      setVoiceLockHint(false);
      voiceLockedRef.current = true;
      setVoiceLocked(true);
      setVoiceSlideX(0);
    }
  };

  const onMicPointerUp = () => {
    micPointerIdRef.current = null;
    setVoiceSlideX(0);
    if (!recordingRef.current) return;
    if (voiceLockedRef.current) return;
    if (voiceCancelArmedRef.current) cancelVoiceRecordingRef.current?.();
    else stopVoiceRecordingAndSendRef.current?.();
  };

  const monthsPhrase =
    exclusiveMonths === 1 ? 'חודש' : `${exclusiveMonths} חודשים`;

  const renderMessages = () => {
    if (isWelcome) {
      return (
        <div className={`${styles.messageRow} ${styles.messageRowThem} ${styles.messageRowWelcome}`}>
          <div className={styles.senderLogoWrap}>
            <img className={styles.senderLogo} src={welcomePiAvatar} alt="" />
          </div>
          <div className={`${styles.bubbleWrap} ${styles.bubbleWrapWelcome}`}>
            <div className={styles.welcomeBubble}>
              <div className={styles.welcomeBubbleText}>{msg.fullText}</div>
              <div className={styles.welcomeTimeRow}>
                <span className={styles.welcomeBubbleTime}>{msg.time}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (loading && messages.length === 0) {
      return (
        <div className={styles.loadingWrap}>
          <span className={styles.spinner} />
          <span className={styles.loadingText}>טוען הודעות...</span>
        </div>
      );
    }
    if (!isWelcome && isGroupThread && !groupConversationId) {
      return (
        <p className={styles.emptyChatText}>לא ניתן לטעון את הקבוצה. חזור/י לרשימת השיחות ונסה/י שוב.</p>
      );
    }
    if (!isWelcome && !isGroupThread && isUser && !otherUserEmail && !directConversationId) {
      return (
        <p className={styles.emptyChatText}>לא ניתן לטעון את השיחה. חזור/י לרשימת השיחות ונסה/י שוב.</p>
      );
    }
    if (messages.length === 0) {
      return <p className={styles.emptyChatText}>אין הודעות עדיין. שלח/י הודעה להתחיל.</p>;
    }
    return messages.map((m, idx) => {
      const nmsg = normalizeChatMessage(m);
      const bodyTrim = String(nmsg.body || '').trim();
      const hasAudio = nmsg.mediaType === 'audio' && nmsg.mediaUrl;
      const hasImage = nmsg.mediaType === 'image' && nmsg.mediaUrl;
      const hasVideo = nmsg.mediaType === 'video' && nmsg.mediaUrl;
      const hasFile = nmsg.mediaType === 'file' && nmsg.mediaUrl;
      const fileDisplayName = hasFile ? chatFileDisplayName(bodyTrim, nmsg.mediaUrl) : '';
      const legacyInferredShare =
        !!nmsg.listingId && !hasAudio && !hasVideo && (hasImage || isSharePlaceholderCaption(bodyTrim));
      const showSharedPostCard =
        !hasAudio &&
        (nmsg.listingShare === true ||
          (!!nmsg.listingId && legacyInferredShare && !(hasImage && nmsg.listingShare === false)));
      const listingIdForPreview = nmsg.listingId ? String(nmsg.listingId).trim() : '';
      const cachedListingPreview = listingIdForPreview ? listingPreviewCache[listingIdForPreview] : null;
      const isProfessionalNotificationMsg = nmsg.isProfessionalNotification === true && !m.isMe;
      const sid = m.senderId != null ? String(m.senderId).trim().toLowerCase() : '';
      const peerPic =
        isGroupThread && sid
          ? getUserProfileImageUrl(
              groupMembersList.find(row => String(row.email).trim().toLowerCase() === sid),
            )
          : null;
      const isExclusiveOffer = typeof nmsg.body === 'string' && isBrokerOfferBody(nmsg.body);
      const messageRead = chatMessageIsRead(m, peerLastReadAt);
      const bubbleTimeLabel = m.createdAt
        ? new Date(m.createdAt).toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'})
        : '';
      const isPlainTextBubble = !!bodyTrim && !showSharedPostCard && !hasFile && !hasImage && !hasVideo && !hasAudio;
      const isPhotoBubble = hasImage && !showSharedPostCard;
      const isVideoBubble = hasVideo && !showSharedPostCard;
      const isEdgeMediaBubble = isPhotoBubble || isVideoBubble || showSharedPostCard;
      const isPhotoOnly = (isPhotoBubble || isVideoBubble) && !bodyTrim;
      const isShareMediaOnly = showSharedPostCard;
      const photoBox = isPhotoBubble
        ? chatImageSizeByUrl[nmsg.mediaUrl] || {width: dp(CHAT_PHOTO_FALLBACK.width), height: dp(CHAT_PHOTO_FALLBACK.height)}
        : isVideoBubble
          ? chatImageSizeByUrl[nmsg.mediaUrl] || {width: dp(CHAT_PHOTO_MAX_W), height: dp(Math.round(CHAT_PHOTO_MAX_W * 1.15))}
          : showSharedPostCard
            ? chatSharedPostBox(postAspect)
            : null;
      const bubbleClass = [
        styles.bubble,
        m.isMe ? styles.bubbleMe : styles.bubbleThem,
        hasAudio && !bodyTrim ? styles.bubbleVoiceOnly : '',
        isPlainTextBubble ? styles.bubblePlainText : '',
        isEdgeMediaBubble ? styles.bubblePhoto : '',
        isPhotoOnly || isShareMediaOnly ? styles.bubblePhotoOnly : '',
      ]
        .filter(Boolean)
        .join(' ');

      return (
        <div key={m.id}>
          <div
            className={`${styles.messageRow} ${!m.isMe ? styles.messageRowThem : ''} ${m.isMe ? styles.messageRowMe : ''}`}>
            {!m.isMe && !hasAudio ? (
              <div className={styles.senderLogoWrap}>
                {isGroupThread ? (
                  <img className={styles.senderLogo} src={peerPic || DEFAULT_PI_PROFILE_AVATAR} alt="" />
                ) : isProfessionalUpdatesThread ? (
                  <ProfileAvatar
                    uri={profileAvatarUrl || null}
                    placeholderImage={DEFAULT_PI_PROFILE_AVATAR}
                    size={42}
                    forceGoldRing
                  />
                ) : (
                  <img
                    className={styles.senderLogo}
                    src={senderAvatarSrc}
                    alt=""
                    onError={() => setSenderAvatarFailed(true)}
                  />
                )}
              </div>
            ) : null}
            <div
              className={`${styles.bubbleWrap} ${!m.isMe ? styles.bubbleWrapThem : ''} ${m.isMe ? styles.bubbleWrapMe : ''}`}>
              <div className={bubbleClass} {...bindMessagePress(m)}>
                {showSharedPostCard
                  ? (() => {
                      const lid = nmsg.listingId ? String(nmsg.listingId).trim() : '';
                      const cached = lid ? listingPreviewCache[lid] : null;
                      const ownImage = nmsg.mediaType === 'image' && nmsg.mediaUrl ? nmsg.mediaUrl : null;
                      const sharedImage = (() => {
                        if (!sharedListing) return null;
                        const sidListing = sharedListing.id != null ? String(sharedListing.id).trim() : '';
                        if (!sidListing || sidListing !== String(nmsg.listingId).trim()) return null;
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
                      const resolvedMediaUrl = ownImage || sharedImage || (cached && cached.mediaUrl) || null;
                      const previewLines = sharedPostPreviewText(cached, bodyTrim);
                      const shareName = sharedCardDisplayName(cached);
                      const isListingShareCard = cached?.feedPost === false;
                      const shareBadgeLabel = isListingShareCard ? 'מודעה' : 'פוסט';
                      const mediaIsVideo = isChatVideoUrl(resolvedMediaUrl);
                      const stillPoster = chatStillOrPoster(
                        resolvedMediaUrl,
                        cached?.posterUrl || cached?.mediaUrl,
                      );
                      const listingVideoUrl = mediaIsVideo
                        ? resolvedMediaUrl
                        : cached?.videoHlsUrl ||
                          (cached?.mediaUrl && isChatVideoUrl(cached.mediaUrl) ? cached.mediaUrl : null);
                      const openSharedPostInFeed = () => {
                        if (typeof onOpenPost !== 'function') return;
                        const isFeedPostShare = !isListingShareCard;
                        onOpenPost({
                          id: nmsg.listingId,
                          mediaUrl: resolvedMediaUrl,
                          body: m.body,
                          category: cached?.category ?? null,
                          general_details: cached?.generalDetails ?? null,
                          feedPost: isFeedPostShare,
                          feed_post: isFeedPostShare,
                          propertyType: isFeedPostShare ? 'post' : null,
                        });
                      };
                      return (
                        <button
                          type="button"
                          className={styles.chatPhotoTap}
                          style={photoBox}
                          onClick={openSharedPostInFeed}
                          aria-label={isListingShareCard ? 'פתח את המודעה' : 'פתח את הפוסט'}>
                          {resolvedMediaUrl ? (
                            <FeedPostPreviewMedia
                              listing={{
                                feed_post: cached?.feedPost ?? true,
                                general_details: cached?.generalDetails ?? null,
                                main_image_url: mediaIsVideo ? stillPoster || null : resolvedMediaUrl,
                                image: mediaIsVideo ? stillPoster || null : resolvedMediaUrl,
                                video_url: listingVideoUrl,
                                video_hls_url: cached?.videoHlsUrl || null,
                                poster_url: stillPoster || null,
                              }}
                              className={styles.sharedPostImage}
                              style={photoBox}
                              showVideoPlayIcon={mediaIsVideo}
                            />
                          ) : previewLines ? (
                            <div className={styles.sharedPostImagePlaceholder} style={photoBox}>
                              <span className={styles.sharedPostPlaceholderBody}>{previewLines}</span>
                            </div>
                          ) : (
                            <div className={styles.sharedPostImagePlaceholder} style={photoBox}>
                              <MdiIcon path={mdiImageOutline} size={47} color="rgba(255,255,255,0.6)" />
                            </div>
                          )}
                          <span className={styles.sharedPostBadge}>
                            <span className={styles.sharedPostBadgeText}>{shareBadgeLabel}</span>
                          </span>
                          <span className={styles.sharedMediaCaptionBar}>
                            {shareName ? <span className={styles.sharedPostNameOnMedia}>{shareName}</span> : null}
                            {bubbleTimeLabel ? (
                              <span className={styles.chatPhotoTimeMeta} dir="ltr">
                                <span className={styles.chatPhotoTimeText}>{bubbleTimeLabel}</span>
                                {m.isMe && !isWelcome ? (
                                  <ChatOutgoingReadTicks
                                    isRead={messageRead}
                                    color={messageRead ? CHAT_READ_TICK_BLUE : 'rgba(255,255,255,0.9)'}
                                  />
                                ) : null}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })()
                  : nmsg.mediaType === 'image' && nmsg.mediaUrl ? (
                      brokenImageUrls[nmsg.mediaUrl] ? (
                        <div className={`${styles.bubbleImage} ${styles.bubbleImageBroken}`} style={photoBox}>
                          <MdiIcon path={mdiImageOffOutline} size={36} color="rgba(255,255,255,0.7)" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={styles.chatPhotoTap}
                          style={photoBox}
                          onClick={() => openChatImageFullScreen(nmsg.mediaUrl)}
                          aria-label="פתח תמונה במסך מלא">
                          <img
                            className={styles.bubbleImage}
                            style={photoBox}
                            src={nmsg.mediaUrl}
                            alt=""
                            onLoad={e =>
                              rememberChatImageSize(
                                nmsg.mediaUrl,
                                e.currentTarget.naturalWidth,
                                e.currentTarget.naturalHeight,
                              )
                            }
                            onError={() => markChatImageBroken(nmsg.mediaUrl)}
                          />
                          {isPhotoOnly && bubbleTimeLabel ? (
                            <span className={styles.chatPhotoTimeBar} dir="ltr">
                              <span className={styles.chatPhotoTimeText}>{bubbleTimeLabel}</span>
                              {m.isMe && !isWelcome ? (
                                <ChatOutgoingReadTicks
                                  isRead={messageRead}
                                  color={messageRead ? CHAT_READ_TICK_BLUE : 'rgba(255,255,255,0.9)'}
                                />
                              ) : null}
                            </span>
                          ) : null}
                        </button>
                      )
                    ) : isVideoBubble ? (
                      <button
                        type="button"
                        className={styles.chatPhotoTap}
                        style={photoBox}
                        onClick={() => openChatVideoFullScreen(nmsg.mediaUrl)}
                        aria-label="פתח סרטון במסך מלא">
                        <VideoPreviewThumb
                          uri={nmsg.mediaUrl}
                          posterUri={chatStillOrPoster(nmsg.mediaUrl)}
                          style={{...photoBox, borderRadius: 0}}
                          videoStyle={photoBox}
                          showPlayIcon
                          resizeMode="cover"
                        />
                        {isPhotoOnly && bubbleTimeLabel ? (
                          <span className={styles.chatPhotoTimeBar} dir="ltr">
                            <span className={styles.chatPhotoTimeText}>{bubbleTimeLabel}</span>
                            {m.isMe && !isWelcome ? (
                              <ChatOutgoingReadTicks
                                isRead={messageRead}
                                color={messageRead ? CHAT_READ_TICK_BLUE : 'rgba(255,255,255,0.9)'}
                              />
                            ) : null}
                          </span>
                        ) : null}
                      </button>
                    ) : nmsg.mediaType === 'file' && nmsg.mediaUrl ? (
                      <button
                        type="button"
                        className={styles.fileAttachmentBubble}
                        onClick={() => openChatFile(nmsg.mediaUrl)}
                        aria-label={`פתח קובץ ${fileDisplayName}`}>
                        <span className={styles.fileAttachmentIconWrap}>
                          <MdiIcon path={mdiFileDocumentOutline} size={26} color="#fff" />
                        </span>
                        <span className={styles.fileAttachmentTextCol}>
                          <span className={styles.fileAttachmentLabel}>קובץ</span>
                          <span className={styles.fileAttachmentName}>{fileDisplayName}</span>
                        </span>
                      </button>
                    ) : null}
                {nmsg.mediaType === 'audio' && nmsg.mediaUrl ? (
                  <ChatVoiceMessageBubble
                    messageId={m.id}
                    mediaUrl={nmsg.mediaUrl}
                    isMe={m.isMe}
                    createdAt={m.createdAt}
                    avatarUri={!m.isMe ? (isGroupThread ? peerPic : profileAvatarUrl) : null}
                    isPlaying={playingMessageId === String(m.id)}
                    progress={voiceMetaById[String(m.id)]?.progress || 0}
                    durationMs={voiceMetaById[String(m.id)]?.durationMs || 0}
                    playStartedAt={activeVoicePlay.id === String(m.id) ? activeVoicePlay.startedAt : 0}
                    playStartProgress={activeVoicePlay.id === String(m.id) ? activeVoicePlay.startProgress : 0}
                    onTogglePlay={() => toggleVoicePlayback(m.id, nmsg.mediaUrl)}
                    onDurationKnown={handleVoiceDurationKnown}
                    showReadTicks={m.isMe === true && !isWelcome}
                    isRead={messageRead}
                  />
                ) : null}
                {isGroupThread && !m.isMe && m.senderId ? (
                  <div className={styles.bubbleSenderLabel}>
                    {senderNameByEmail.get(String(m.senderId).trim().toLowerCase()) || String(m.senderId)}
                  </div>
                ) : null}
                {isPlainTextBubble ? (
                  <div className={styles.bubbleTextFooter}>
                    <div className={`${styles.bubbleText} ${styles.bubbleTextInFooter}`}>{bodyTrim}</div>
                    {bubbleTimeLabel ? (
                      <div className={styles.bubbleTimeMetaInline} dir="ltr">
                        <span className={styles.bubbleTimeInline}>{bubbleTimeLabel}</span>
                        {m.isMe && !isWelcome ? <ChatOutgoingReadTicks isRead={messageRead} /> : null}
                      </div>
                    ) : null}
                  </div>
                ) : bodyTrim && !showSharedPostCard && !hasFile && !hasVideo ? (
                  <div className={styles.bubbleText}>{bodyTrim}</div>
                ) : null}
                {isProfessionalNotificationMsg && cachedListingPreview?.creatorEmail ? (
                  <button
                    type="button"
                    className={styles.contactPosterBtnInBubble}
                    onClick={() =>
                      typeof onContactListingOwner === 'function' &&
                      onContactListingOwner({
                        email: cachedListingPreview.creatorEmail,
                        name: cachedListingPreview.creatorName,
                        profileImageUrl: cachedListingPreview.creatorProfileImageUrl,
                        listingId: listingIdForPreview,
                      })
                    }>
                    <MdiIcon path={mdiMessageTextOutline} size={21} color="#1E1D27" />
                    <span className={styles.contactPosterBtnText}>צור קשר עם המפרסם</span>
                  </button>
                ) : null}
                {!(hasAudio && !bodyTrim) && !isPlainTextBubble && !isPhotoOnly && !isShareMediaOnly ? (
                  <div className={styles.bubbleTime} dir="ltr">
                    <span className={styles.bubbleTimeText}>{bubbleTimeLabel}</span>
                    {m.isMe && !isWelcome ? <ChatOutgoingReadTicks isRead={messageRead} /> : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          {isExclusiveOffer && m.isMe ? (
            <div className={styles.exclusiveStatusBanner}>
              <p className={styles.exclusiveStatusText}>
                {isCollabOfferBody(bodyTrim)
                  ? 'הצעת השת״פ נשלחה, ברגע שתאושר תוכלו לנהל שיחה'
                  : 'הצעת הבלעדיות נשלחה, ברגע שתאושר תוכלו לנהל שיחה'}
              </p>
            </div>
          ) : null}
          {showExclusiveOwnerCard &&
          idx === lastExclusiveBrokerMessageIndex &&
          isExclusiveOffer &&
          isExclusiveOfferFromPeerForViewer(m, myEmail) ? (
            <div className={styles.exclusiveOfferOwnerAnchor}>
              <ExclusiveOfferResponseCard
                offerKind={
                  exclusiveOfferMeta?.offerKind === 'collab' || isCollabOfferBody(bodyTrim) ? 'collab' : 'exclusive'
                }
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
            </div>
          ) : null}
        </div>
      );
    });
  };

  const selectedAddCount = Object.keys(addMembersSelected).filter(k => addMembersSelected[k]).length;

  return (
    <div className={`${styles.screen} ${embedded ? styles.embedded : ''}`} dir="rtl">
      <div className={styles.header}>
        {isGroupThread ? (
          <>
            <button
              type="button"
              className={styles.headerIconBtn}
              onClick={() => setShowGroupManageModal(true)}
              aria-label="מידע">
              <img className={styles.headerInfoIcon} src={chatInfoIcon} alt="" />
            </button>
            <div className={styles.groupHeaderCenter}>
              <ProfileAvatar
                uri={normalizeAvatarUrl(groupAvatarResolved) || null}
                fallbackUri={groupIconSmall}
                size={47}
                forceGoldRing
              />
              <span className={styles.groupHeaderTitle}>{groupTitleResolved}</span>
            </div>
            <button type="button" className={styles.groupHeaderBack} onClick={onClose} aria-label="חזור">
              <MdiIcon path={mdiChevronLeft} size={36} color="#fff" />
            </button>
          </>
        ) : (
          <div className={styles.headerDirectRow}>
            <button type="button" className={styles.headerBackBtn} onClick={onClose} aria-label="חזור">
              <MdiIcon path={mdiChevronLeft} size={36} color="#fff" />
            </button>
            <button
              type="button"
              className={styles.headerIdentityTap}
              onClick={handleOpenPeerProfile}
              disabled={!isDirectPeer || typeof onOpenPeerProfile !== 'function'}
              aria-label="פתח פרופיל">
              <ProfileAvatar
                uri={profileAvatarUrl || null}
                placeholderImage={isWelcome ? welcomePiAvatar : DEFAULT_PI_PROFILE_AVATAR}
                size={40}
                subscriptionType={resolvedDisplay || conversation}
                forceGoldRing={
                  isWelcomeConversation(conversation) ||
                  isProfessionalUpdatesThread ||
                  shouldShowProfileGoldRing(resolvedDisplay || conversation)
                }
              />
              <div className={styles.headerTitleWrap}>
                <span className={styles.headerTitle}>{displayName}</span>
                {showPeerOnlineSubtitle || isWelcome ? <span className={styles.headerSubtitle}>מחובר/ת</span> : null}
              </div>
            </button>
            {isDirectPeer || isWelcome ? (
              <div className={styles.headerRight}>
                {canSendBrokerOffer && !hasSentExclusiveOfferInThread ? (
                  <button
                    type="button"
                    className={styles.exclusiveHeaderBtn}
                    onClick={() => {
                      if (offerBlockedMessage) {
                        window.alert(offerBlockedMessage);
                        return;
                      }
                      setShowExclusiveOfferModal(true);
                    }}>
                    {isCollabOfferMode ? 'שלח הצעה לשת״פ' : 'שלח הצעה לבלעדיות'}
                  </button>
                ) : null}
                {showPeerPhoneIcon || isWelcome ? (
                  <button
                    type="button"
                    className={styles.headerIconBtn}
                    onClick={isWelcome ? undefined : handleCallPeer}
                    aria-label="התקשר">
                    <img className={styles.headerPhoneIcon} src={phoneIcon} alt="" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.headerIconBtn}
                  onClick={isWelcome ? undefined : () => setShowPeerContactDetails(true)}
                  aria-label="פרטי קשר">
                  <img className={styles.headerInfoIcon} src={chatInfoIcon} alt="" />
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className={styles.chatArea}>
        <div className={styles.chatBackground}>
          <div ref={scrollRef} className={styles.scroll}>
            <div className={styles.scrollContent}>
              {isDirectPeer && canSendBrokerOffer && !hasSentExclusiveOfferInThread ? (
                <div className={styles.exclusiveCtaWrap}>
                  <button
                    type="button"
                    className={styles.exclusiveCtaBtnHit}
                    onClick={() => {
                      if (offerBlockedMessage) {
                        window.alert(offerBlockedMessage);
                        return;
                      }
                      setShowExclusiveOfferModal(true);
                    }}
                    aria-label={isCollabOfferMode ? 'שלח הצעה לשת״פ' : 'שלח הצעה לבלעדיות'}>
                    {isCollabOfferMode ? (
                      <span className={styles.exclusiveCtaBtn}>
                        <span className={styles.exclusiveCtaBtnText}>שלח הצעה לשת״פ</span>
                      </span>
                    ) : (
                      <img className={styles.exclusiveCtaImage} src={sendReqImage} alt="" />
                    )}
                  </button>
                </div>
              ) : null}

              {isGroupThread && groupConversationId ? (
                <div className={styles.groupInfoCard}>
                  <div className={styles.groupInfoAvatarRing}>
                    <ProfileAvatar
                      uri={normalizeAvatarUrl(groupAvatarResolved) || null}
                      fallbackUri={groupIconBig}
                      size={78}
                      forceGoldRing
                    />
                  </div>
                  <h2 className={styles.groupInfoTitle}>{groupTitleResolved}</h2>
                  <div className={styles.groupInfoMembersLabel}>חברי הקבוצה</div>
                  {loading && visibleGroupMembers.length === 0 ? (
                    <div className={styles.groupMemberStackLoading}>
                      <span className={styles.spinnerGold} />
                    </div>
                  ) : (
                    <div className={styles.groupMemberStack}>
                      {visibleGroupMembers.slice(0, 4).map((member, i) => {
                        const refRaw =
                          member?.email != null && String(member.email).trim()
                            ? String(member.email).trim()
                            : member?.user_id != null && String(member.user_id).trim()
                              ? String(member.user_id).trim()
                              : member?.id != null && String(member.id).trim()
                                ? String(member.id).trim()
                                : '';
                        const ref = refRaw.toLowerCase();
                        const emailKey = String(member?.email || '').trim().toLowerCase();
                        const resolvedAvatar =
                          normalizeAvatarUrl(getUserProfileImageUrl(member)) ||
                          normalizeAvatarUrl(member?.profileImageUrl) ||
                          normalizeAvatarUrl(member?.participantProfileImageUrl) ||
                          normalizeAvatarUrl(groupMemberAvatarOverrides[ref] || null) ||
                          normalizeAvatarUrl(groupMemberAvatarOverrides[emailKey] || null) ||
                          null;
                        return (
                          <div
                            key={member.subscriptionId || member.email || member.user_id || member.id || `m-${i}`}
                            className={`${styles.groupMemberOverlap} ${i > 0 ? styles.groupMemberOverlapShift : ''}`}>
                            <ProfileAvatar
                              uri={resolvedAvatar}
                              size={49}
                              subscriptionType={member?.subscriptionType || member?.subscription_type || 'user'}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {savedGroupDescription ? (
                    <p className={styles.groupDescPreview}>{savedGroupDescription}</p>
                  ) : null}
                  <button type="button" className={styles.groupAddDescHit} onClick={openGroupDescModal}>
                    <span className={styles.groupAddDesc}>
                      {savedGroupDescription ? 'ערוך תיאור' : 'הוסף תיאור'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.groupAddMembersBtnWrap}
                    onClick={openAddMembersModal}
                    aria-label="הוסף חברים נוספים">
                    <img className={styles.groupAddMembersImage} src={addFriendsImage} alt="" />
                  </button>
                </div>
              ) : null}

              <div className={styles.dateLabel}>היום</div>
              {renderMessages()}
            </div>
          </div>
        </div>

        <div
          className={styles.composerShell}
          style={{
            bottom: keyboardHeight > 0 ? keyboardHeight : 0,
            paddingBottom: keyboardHeight > 0 ? 10 : 10,
          }}>
          <div className={`${styles.inputRow} ${isRecording ? styles.inputRowVoiceMode : ''}`}>
            {isRecording && !voiceLocked ? (
              <div className={styles.voiceModeBackdrop} aria-hidden>
                <div className={styles.voiceMicSpacer}>
                  {voiceLockHint ? (
                    <span className={styles.voiceLockHintBadge}>
                      <MdiIcon path={mdiLockOutline} size={21} color="#fff" />
                    </span>
                  ) : null}
                </div>
                <div
                  className={styles.voiceRecordingMain}
                  style={{transform: `translateX(${voiceSlideX}px)`}}>
                  <div className={styles.voiceComposerCenter}>
                    <span
                      className={`${styles.voiceRecordingDot} ${voiceCancelArmed ? styles.voiceRecordingDotCancel : ''}`}
                    />
                    <span className={styles.voiceTimerText}>{formatVoiceDuration(recordingDurationSec)}</span>
                  </div>
                  <div className={`${styles.voiceCancelZone} ${voiceCancelArmed ? styles.voiceCancelZoneArmed : ''}`}>
                    <span className={styles.voiceCancelChevrons}>
                      <MdiIcon path={mdiChevronLeft} size={31} color={voiceCancelArmed ? '#FF3B30' : 'rgba(255,255,255,0.55)'} />
                      <span className={styles.voiceCancelChevronTight}>
                        <MdiIcon path={mdiChevronLeft} size={31} color={voiceCancelArmed ? '#FF3B30' : 'rgba(255,255,255,0.35)'} />
                      </span>
                    </span>
                    <span
                      className={`${styles.voiceCancelHintText} ${voiceCancelArmed ? styles.voiceCancelHintTextArmed : ''}`}>
                      החלק לביטול
                    </span>
                  </div>
                </div>
                <div className={styles.voiceBackdropSpacer} />
              </div>
            ) : null}

            {isRecording && voiceLocked ? (
              <>
                <button
                  type="button"
                  className={styles.voiceLockedTrashBtn}
                  onClick={cancelVoiceRecording}
                  aria-label="מחק הקלטה">
                  <MdiIcon path={mdiTrashCanOutline} size={31} color="#FF3B30" />
                </button>
                <div className={styles.voiceComposerCenter}>
                  <span className={styles.voiceRecordingDot} />
                  <span className={styles.voiceTimerText}>{formatVoiceDuration(recordingDurationSec)}</span>
                </div>
              </>
            ) : null}

            {!isRecording ? (
              <>
                <button
                  type="button"
                  className={`${styles.inputBarIconBtn} ${!canSendChatMedia ? styles.inputBarIconDisabled : ''}`}
                  onClick={canSendChatMedia ? handlePickFromGallery : undefined}
                  disabled={!canSendChatMedia}
                  aria-label="בחר תמונה או סרטון מהגלריה">
                  <MdiIcon path={mdiPlus} size={29} color="#fff" />
                </button>
                <div className={styles.inputPillWrap}>
                  <textarea
                    id="pi-chat-composer-textarea"
                    className={styles.inputPill}
                    placeholder="כתוב הודעה"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    maxLength={2000}
                    disabled={!composerActive}
                    rows={1}
                  />
                </div>
                <button
                  type="button"
                  className={`${styles.inputBarIconBtn} ${!canSendChatMedia ? styles.inputBarIconDisabled : ''}`}
                  onClick={canSendChatMedia ? handleTakePhoto : undefined}
                  disabled={!canSendChatMedia}
                  aria-label="צלם תמונה">
                  <img className={styles.inputBarAssetIcon} src={chatCameraIcon} alt="" />
                </button>
              </>
            ) : null}

            {!isRecording ? (
              <button
                type="button"
                className={`${styles.inputBarIconBtn} ${!canSendChatMedia ? styles.inputBarIconDisabled : ''}`}
                onClick={canSendChatMedia ? handlePickFile : undefined}
                disabled={!canSendChatMedia}
                aria-label="צרף קובץ">
                <MdiIcon path={mdiPaperclip} size={29} color="#fff" />
              </button>
            ) : null}

            {sending ? (
              <div className={styles.inputBarIconBtn}>
                <span className={styles.spinner} />
              </div>
            ) : isRecording && voiceLocked ? (
              <button
                type="button"
                className={styles.voiceLockedSendBtn}
                onClick={stopVoiceRecordingAndSend}
                aria-label="שלח הודעה קולית">
                <MdiIcon path={mdiSend} size={29} color="#fff" />
              </button>
            ) : canSubmitMessage ? (
              <button type="button" className={styles.inputBarIconBtn} onClick={handleSend} aria-label="שלח">
                <MdiIcon path={mdiSend} size={29} color="#fff" />
              </button>
            ) : (
              <button
                type="button"
                className={styles.voiceMicPanBtn}
                disabled={!composerActive || isWelcome}
                aria-label={isRecording ? 'מקליט הודעה קולית' : 'הקלט הודעה קולית'}
                onPointerDown={onMicPointerDown}
                onPointerMove={onMicPointerMove}
                onPointerUp={onMicPointerUp}
                onPointerCancel={() => {
                  setVoiceSlideX(0);
                  if (!recordingRef.current || voiceLockedRef.current) return;
                  cancelVoiceRecordingRef.current?.();
                }}>
                {isRecording && !voiceLocked ? (
                  <span className={styles.voiceRecordingCircle} />
                ) : (
                  <img
                    className={styles.inputBarAssetIcon}
                    src={micIcon}
                    alt=""
                    style={!composerActive || isWelcome ? {opacity: 0.45} : undefined}
                  />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        className={styles.hiddenInput}
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          sendPickedChatMedia(file, file.type.startsWith('video/') ? 'video' : 'image');
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.hiddenInput}
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          sendPickedChatMedia(file, 'image');
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        className={styles.hiddenInput}
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          const uri = URL.createObjectURL(file);
          sendPickedChatFile({
            uri,
            mimeType: file.type || 'application/octet-stream',
            name: file.name || `file-${Date.now()}`,
            size: file.size,
            file,
          }).finally(() => URL.revokeObjectURL(uri));
        }}
      />

      {showExclusiveOfferModal ? (
        <div className={styles.modalRoot} data-account-modal="" role="dialog" aria-modal="true">
          <div className={styles.offerHeader}>
            <div className={styles.offerStatusSpacer} />
            <div className={styles.offerHeaderRow}>
              <button
                type="button"
                className={styles.offerNavAction}
                onClick={() => setShowExclusiveOfferModal(false)}
                aria-label="חזור">
                <MdiIcon path={mdiChevronLeft} size={31} color="#fff" />
              </button>
              <h2 className={styles.offerHeaderTitle}>{isCollabOfferMode ? 'הצעה לשת״פ' : 'הצעה לבלעדיות'}</h2>
              <div className={styles.offerNavAction} />
            </div>
          </div>
          <div className={styles.offerScroll}>
            <div className={styles.offerScrollContent}>
              <div className={styles.offerListingCard}>
                <div className={styles.offerImageWrap}>
                  {offerImageUri ? (
                    <img className={styles.offerImage} src={offerImageUri} alt="" />
                  ) : (
                    <div className={`${styles.offerImage} ${styles.offerImageFallback}`}>
                      <MdiIcon path={mdiImageOutline} size={36} color="#BDBBD0" />
                    </div>
                  )}
                  {exclusiveLoadingListing ? (
                    <div className={styles.offerImageLoading}>
                      <span className={styles.spinner} />
                    </div>
                  ) : null}
                </div>
                <div className={styles.offerListingTextCol} style={{alignItems: flexStart}}>
                  <div className={styles.offerTagsRow}>
                    {listingCategoryLabel ? (
                      <span className={styles.offerTagCategory}>
                        <span className={styles.offerTagCategoryText}>{listingCategoryLabel}</span>
                      </span>
                    ) : null}
                    {listingDisplayNumber ? (
                      <span className={styles.offerTagDark}>
                        <span className={styles.offerTagDarkText}>{`מודעה מס ${listingDisplayNumber}`}</span>
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.offerPrice}>{offerPriceText}</div>
                  <div className={styles.offerLocationRow}>
                    <MdiIcon path={mdiMapMarkerOutline} size={23} color="#D2D0DC" />
                    <span className={styles.offerLocation}>{offerLocationText}</span>
                  </div>
                </div>
              </div>

              <div className={styles.offerCard}>
                <div className={styles.offerCardTitle}>{isCollabOfferMode ? 'תקופת שת״פ' : 'תקופת בלעדיות'}</div>
                <div className={styles.offerCardSubtitle}>
                  {isCollabOfferMode
                    ? offerIsRent
                      ? 'תוך כמה חודשים אתם מתחייבים להביא שוכר?'
                      : 'תוך כמה חודשים אתם מתחייבים להביא קונה?'
                    : offerIsRent
                      ? 'תוך כמה חודשים אתם מתחייבים למצוא שוכר?'
                      : 'תוך כמה חודשים אתם מתחייבים למצוא קונה?'}
                </div>
                <div className={styles.offerScaleNumbers}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <span key={n} className={styles.offerScaleNumber}>
                      {n}
                    </span>
                  ))}
                </div>
                <div
                  ref={exclusiveSliderRef}
                  className={styles.offerTimeline}
                  onPointerDown={e => {
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    onExclusiveSliderPointer(e);
                  }}
                  onPointerMove={e => {
                    if (!exclusiveSliderDraggingRef.current) return;
                    onExclusiveSliderPointer(e);
                  }}
                  onPointerUp={() => {
                    exclusiveSliderDraggingRef.current = false;
                  }}
                  onPointerCancel={() => {
                    exclusiveSliderDraggingRef.current = false;
                  }}>
                  <div className={styles.offerTimelineTrack} />
                  <div className={styles.offerTimelineActive} style={{width: `${timelinePercent}%`}} />
                  <div
                    className={styles.offerTimelineThumb}
                    style={{right: `${timelinePercent}%`, marginRight: -14.5}}
                  />
                </div>
              </div>

              <div className={styles.offerSectionTitle}>
                {isCollabOfferMode ? 'הודעה למתווך' : 'הודעה לבעל הנכס'}
              </div>
              <div className={styles.offerMessageInput} id="pi-chat-offer-message-textarea">
                {isCollabOfferMode ? (
                    <p className={styles.offerMessageText}>
                      היי, שמי {exclusiveSenderName} ואני מתווך נדל״ן. יש לי {offerIsRent ? 'שוכר' : 'קונה'} שמתאים
                      למודעה שלך ב{offerLocationText} ואני מעוניין להציע שיתוף פעולה על הנכס. אשמח שנעבוד יחד על העסקה
                      — אני מתחייב להביא {offerIsRent ? 'שוכר' : 'קונה'}{' '}
                      <span className={styles.offerMessageHighlightGold}>בתוך {monthsPhrase}</span>, אשמח לשוחח.
                    </p>
                ) : (
                  <p className={styles.offerMessageText}>
                    היי, שמי {exclusiveSenderName} ואני מתווך נדל״ן מנוסה. נתקלתי במודעה שלך עבור הדירה ב
                    {offerLocationText} ואני מעוניין להציע בלעדיות על הנכס. אני מתחייב למצוא{' '}
                    {offerIsRent ? 'שוכר איכותי' : 'קונה איכותי'}{' '}
                    <span className={styles.offerMessageHighlightGold}>בתוך {monthsPhrase}</span>, אשמח לשוחח.
                  </p>
                )}
              </div>

              <div className={styles.offerHowCard}>
                <div className={styles.offerHowTitle}>איך זה עובד?</div>
                <p className={styles.offerHowText}>
                  {isCollabOfferMode
                    ? 'ההצעה שלכם תישלח למתווך בעל המודעה והוא יוכל לאשר או לדחות אותה. רק לאחר אישור תוכלו להתחיל לנהל איתו שיחה על השת״פ.'
                    : 'ההצעה שלכם תישלח לבעל הנכס והוא יוכל לאשר או לדחות אותה. רק לאחר אישור תוכלו להתחיל לנהל איתו שיחה.'}
                </p>
              </div>
            </div>
          </div>
          <div className={styles.offerFooter}>
            <button type="button" className={styles.offerSubmitBtn} onClick={handleSubmitExclusiveOffer}>
              <span className={styles.offerSubmitText}>
                {isCollabOfferMode ? 'שלח הצעת שת״פ' : 'שלח הצעת בלעדיות'}
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {showAddMembersModal ? (
        <div
          className={styles.modalRoot}
          data-account-modal=""
          role="dialog"
          aria-modal="true"
          aria-label="הוסף חברים לקבוצה">
          <div className={styles.addMembersHeader}>
            <button
              type="button"
              className={styles.addMembersSideBtn}
              onClick={() => setShowAddMembersModal(false)}
              aria-label="חזור">
              <MdiIcon path={mdiChevronLeft} size={36} color="#fff" />
            </button>
            <h2 className={styles.addMembersTitle}>הוסף חברים לקבוצה</h2>
            <button
              type="button"
              className={styles.addMembersSideBtn}
              onClick={submitAddMembers}
              disabled={addMembersSubmitting || selectedAddCount === 0}
              aria-label="שמור">
              {addMembersSubmitting ? (
                <span className={styles.spinnerGold} />
              ) : (
                <span
                  className={`${styles.addMembersSaveText} ${selectedAddCount === 0 ? styles.addMembersSaveTextDisabled : ''}`}>
                  שמור
                </span>
              )}
            </button>
          </div>
          <div className={styles.addMembersSearchFullBleed}>
            <div className={styles.addMembersSearchWrap}>
              <input
                className={styles.addMembersSearchInput}
                placeholder="חפש"
                value={addMembersSearch}
                onChange={e => setAddMembersSearch(e.target.value)}
              />
              <span className={styles.addMembersSearchIcon}>
                <MdiIcon path={mdiMagnify} size={29} color="rgba(255,255,255,0.55)" />
              </span>
            </div>
          </div>
          {selectedAddCount > 0 ? (
            <div className={styles.addMembersChipsSection}>
              <div className={styles.addMembersChipsLabel}>חברים שהתווספו</div>
              <div className={styles.addMembersChipsScroll}>
                {Object.keys(addMembersSelected)
                  .filter(k => addMembersSelected[k])
                  .map(email => {
                    const row = addMembersCandidates.find(
                      r => String(r?.email || '').trim().toLowerCase() === email,
                    );
                    const title = (row?.title && String(row.title).trim()) || email;
                    const pic = normalizeAvatarUrl(getUserProfileImageUrl(row));
                    return (
                      <div key={email} className={styles.addMembersChipCol}>
                        <div className={styles.addMembersChipAvatarWrap}>
                          <ProfileAvatar
                            uri={pic}
                            size={83}
                            subscriptionType={
                              row?.subscriptionType ||
                              row?.subscription_type ||
                              (groupAddAudience === 'regular' ? 'user' : 'broker')
                            }
                          />
                          <button
                            type="button"
                            className={styles.addMembersChipRemove}
                            onClick={() => toggleAddMember(email)}
                            aria-label="הסר">
                            ×
                          </button>
                        </div>
                        <span className={styles.addMembersChipName}>{title}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : null}
          <div className={styles.addMembersScroll}>
            <div className={styles.addMembersScrollContent}>
              {addMembersLoading ? (
                <div className={styles.addMembersLoadingWrap}>
                  <span className={styles.spinnerGold} />
                </div>
              ) : addMembersCandidates.length === 0 ? (
                <p className={styles.addMembersEmpty}>לא נמצאו משתמשים מתאימים להוספה.</p>
              ) : (
                <div className={styles.addMembersCard}>
                  {addMembersCandidates.map((row, i) => {
                    const email = String(row?.email || '').trim().toLowerCase();
                    const checked = !!addMembersSelected[email];
                    const pic = normalizeAvatarUrl(getUserProfileImageUrl(row));
                    const title = (row?.title && String(row.title).trim()) || email;
                    const sub = (row?.subtitle && String(row.subtitle).trim()) || '';
                    const hideSub = groupAddAudience === 'regular' || !sub || sub === title;
                    return (
                      <button
                        key={email || row?.id || `cand-${i}`}
                        type="button"
                        className={`${styles.addMemberRow} ${i > 0 ? styles.addMemberRowBorder : ''}`}
                        onClick={() => toggleAddMember(email)}>
                        <span className={styles.addMemberCheckCol}>
                          <span className={`${styles.addMemberCheckOuter} ${checked ? styles.addMemberCheckOuterOn : ''}`}>
                            {checked ? <MdiIcon path={mdiCheck} size={18} color={GOLD} /> : null}
                          </span>
                        </span>
                        <span className={styles.addMemberTextCol}>
                          <span className={styles.addMemberName}>{title}</span>
                          {!hideSub ? <span className={styles.addMemberSub}>{sub}</span> : null}
                        </span>
                        <ProfileAvatar
                          uri={pic}
                          size={73}
                          subscriptionType={
                            row?.subscriptionType ||
                            row?.subscription_type ||
                            (groupAddAudience === 'regular' ? 'user' : 'broker')
                          }
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <ChatPeerContactDetailsModal
        visible={showPeerContactDetails}
        onClose={() => setShowPeerContactDetails(false)}
        displayName={displayName}
        avatarUri={profileAvatarUrl}
        phone={peerPhone}
        subscriptionType={resolvedDisplay}
      />

      <ChatGroupManageModal
        visible={showGroupManageModal}
        onClose={() => setShowGroupManageModal(false)}
        title={groupTitleResolved}
        avatarUri={normalizeAvatarUrl(groupAvatarResolved) || null}
        description={savedGroupDescription}
        members={visibleGroupMembers}
        myEmail={myEmail}
        isBrokerUser={isTrueBrokerUser}
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
          onClose?.();
        }}
      />

      {showGroupDescModal ? (
        <div
          className={styles.modalRoot}
          data-account-modal=""
          role="dialog"
          aria-modal="true"
          aria-label="תיאור הקבוצה">
          <div className={styles.groupDescModalHeader}>
            <div className={styles.groupDescModalHeaderColStart}>
              <button
                type="button"
                className={styles.groupDescHeaderBtn}
                onClick={saveGroupDescription}
                disabled={!canSaveGroupDesc || savingGroupDesc}
                aria-label="שמור">
                {savingGroupDesc ? (
                  <span className={styles.spinnerGold} />
                ) : (
                  <span className={styles.groupDescSaveRow}>
                    <MdiIcon
                      path={mdiChevronLeft}
                      size={29}
                      color={canSaveGroupDesc ? GOLD : 'rgba(255,255,255,0.35)'}
                    />
                    <span
                      className={`${styles.groupDescSaveText} ${!canSaveGroupDesc ? styles.groupDescSaveTextDisabled : ''}`}>
                      שמור
                    </span>
                  </span>
                )}
              </button>
            </div>
            <h2 className={styles.groupDescModalTitle}>תיאור הקבוצה</h2>
            <div className={styles.groupDescModalHeaderColEnd}>
              <button
                type="button"
                className={styles.groupDescHeaderBtn}
                onClick={() => setShowGroupDescModal(false)}
                aria-label="ביטול">
                <span className={styles.groupDescCancelText}>ביטול</span>
              </button>
            </div>
          </div>
          <div className={styles.groupDescModalBody}>
            <textarea
              id="pi-group-desc-input"
              className={styles.groupDescInput}
              placeholder="כתוב תיאור"
              value={groupDescDraft}
              onChange={e => setGroupDescDraft(e.target.value)}
              maxLength={2000}
            />
          </div>
        </div>
      ) : null}

      {fullScreenImageUrl ? (
        <div className={styles.fullScreenImageRoot} data-account-modal="" role="dialog" aria-modal="true">
          <button
            type="button"
            className={styles.fullScreenImageCloseBtn}
            onClick={() => setFullScreenImageUrl(null)}
            aria-label="סגור">
            <MdiIcon path={mdiClose} size={36} color="#fff" />
          </button>
          <img className={styles.fullScreenImage} src={fullScreenImageUrl} alt="" />
        </div>
      ) : null}

      {fullScreenVideoUrl ? (
        <div className={styles.fullScreenImageRoot} data-account-modal="" role="dialog" aria-modal="true">
          <button
            type="button"
            className={styles.fullScreenImageCloseBtn}
            onClick={() => setFullScreenVideoUrl(null)}
            aria-label="סגור">
            <MdiIcon path={mdiClose} size={36} color="#fff" />
          </button>
          <video className={styles.fullScreenVideo} src={fullScreenVideoUrl} controls autoPlay playsInline />
        </div>
      ) : null}

      <ChatDocumentPickerModal
        visible={showDocumentPicker}
        onCancel={errorMessage => {
          setShowDocumentPicker(false);
          if (errorMessage) window.alert(String(errorMessage));
        }}
        onPicked={async file => {
          setShowDocumentPicker(false);
          if (!file?.uri) return;
          await sendPickedChatFile({
            uri: file.uri,
            mimeType: file.mimeType || file.type || 'application/octet-stream',
            name: file.name || `file-${Date.now()}`,
            size: file.size,
            file: file.file,
          });
        }}
      />

      {actionMenuMessage ? (
        <div
          className={styles.msgMenuBackdrop}
          data-account-modal=""
          onClick={() => !deletingMessage && setActionMenuMessage(null)}
          role="presentation">
          <div className={styles.msgMenuSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.msgMenuHandle} />
            <button
              type="button"
              className={styles.msgMenuItem}
              disabled={deletingMessage}
              onClick={handleDeleteMessage}
              aria-label="מחק הודעה">
              <span className={`${styles.msgMenuItemText} ${styles.msgMenuItemTextDanger}`}>מחק הודעה</span>
              {deletingMessage ? (
                <span className={styles.spinner} />
              ) : (
                <MdiIcon path={mdiTrashCanOutline} size={29} color="#E5484D" />
              )}
            </button>
            <div className={styles.msgMenuDivider} />
            <button
              type="button"
              className={styles.msgMenuItem}
              disabled={deletingMessage}
              onClick={() => setActionMenuMessage(null)}
              aria-label="ביטול">
              <span className={styles.msgMenuItemText}>ביטול</span>
              <MdiIcon path={mdiClose} size={29} color={TEXT_LIGHT} />
            </button>
          </div>
        </div>
      ) : null}
      {appNudge ? <ChatAppNudge onClose={() => setAppNudge(false)} /> : null}
    </div>
  );
}
