import {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import {
  mdiCheck,
  mdiCheckAll,
  mdiChevronLeft,
  mdiClose,
  mdiMagnify,
  mdiPlus,
  mdiTrashCanOutline,
} from '@mdi/js';
import {
  createChatGroup,
  deleteChatConversation,
  getChatConversations,
  getChatParticipantDisplay,
  getUsersForGroupPicker,
  searchBrokers,
  updateSubscriptionProfile,
  uploadGroupImage,
} from '../api/chat';
import {useSession} from '../auth/session';
import CircleCropModal from '../account/CircleCropModal';
import StagePortal from '../feed/StagePortal';
import {ProfileAvatar} from '../profile/ProfileParts';
import {
  isBrokerLikeSubscriptionType,
  isProjectMarketerType,
  isRegularSubscriptionType,
  subscriptionTypes,
  usesOpenChatGroupFlow,
} from '../profile/lib/constant';
import {DEFAULT_PI_PROFILE_AVATAR, getUserProfileImageUrl, logProfilePic} from '../profile/lib/userProfileImage';
import {flexEnd, flexStart} from '../publish/lib/rtlLayout';
import MdiIcon from '../publish/MdiIcon';
import {
  getConversationWithWelcomeMessage,
  isProfessionalUpdatesConversation,
  normalizeConversationForOpen,
} from './lib/chatDefaults';
import {normalizeChatAvatarUrl} from './lib/chatAvatar';
import ChatListRowAvatar, {
  CHAT_GROUP_AVATAR_PLACEHOLDER,
  CHAT_LIST_AVATAR_PLACEHOLDER,
} from './components/ChatListRowAvatar';
import logoImage from '../assets/mobile/image-copy-9.png';
import cameraIcon from '../assets/mobile/pi-chat/camera.png';
import privateGroupIcon from '../assets/mobile/pi-chat/private-group.png';
import brokersGroupIcon from '../assets/mobile/pi-chat/brokers-group.png';
import styles from './ChatListScreen.module.css';

const SEARCH_CLUE = 'rgba(255,255,255,0.35)';
const NC_TOGGLE_AMBER = '#D4A351';
const NC_TEXT_SECONDARY = 'rgba(255, 255, 255, 0.55)';

const PI_CONV = getConversationWithWelcomeMessage('1', 'pi');

const SWIPE_DELETE_WIDTH = 114;
const SWIPE_OPEN_THRESHOLD = 57;

function bucketGroupListByFirstLetter(rows) {
  const sorted = [...rows].sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'he'));
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

function getUserSubscriptionTypeLower(user) {
  if (!user || typeof user !== 'object') return '';
  const subObj = user.subscription && typeof user.subscription === 'object' ? user.subscription : null;
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
            normalizeChatAvatarUrl(
              getUserProfileImageUrl(row) || row.profile_picture_url || row.profileImageUrl || null,
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

function exclusiveOfferLabel(conv, exStatus) {
  const kind = String(conv.exclusiveOfferKind || conv.exclusive_offer_kind || '')
    .trim()
    .toLowerCase();
  const isCollab = kind === 'collab';
  if (exStatus === 'accepted') return isCollab ? 'שת״פ' : 'בלעדיות';
  if (exStatus === 'pending') return isCollab ? 'שת״פ - ממתין לאישור' : 'בלעדיות - ממתין לאישור';
  if (exStatus === 'rejected') return isCollab ? 'שת״פ - נדחה' : 'בלעדיות - נדחה';
  return '';
}

function stageScaleFromEvent(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return 1;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 ? el.offsetWidth / rect.width : 1;
}

function SwipeableConversationRow({deletable, deleting, onDelete, onPress, children}) {
  const openTranslate = SWIPE_DELETE_WIDTH;
  const openRef = useRef(false);
  const dragRef = useRef(null);
  const [tx, setTx] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const clampTranslate = useCallback(value => {
    if (value < 0) return 0;
    if (value > SWIPE_DELETE_WIDTH) return SWIPE_DELETE_WIDTH;
    return value;
  }, []);

  const snapTo = useCallback(
    toOpen => {
      openRef.current = toOpen;
      setIsOpen(toOpen);
      setDragging(false);
      setTx(toOpen ? openTranslate : 0);
    },
    [openTranslate],
  );

  const handleDeletePress = useCallback(() => {
    snapTo(false);
    if (typeof onDelete === 'function') onDelete();
  }, [onDelete, snapTo]);

  const onPointerDown = e => {
    if (e.button != null && e.button !== 0) return;
    const k = stageScaleFromEvent(e.currentTarget);
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      base: openRef.current ? openTranslate : 0,
      k,
      moved: false,
    };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = e => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.x) * d.k;
    const dy = (e.clientY - d.y) * d.k;
    if (!d.moved) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (!openRef.current && Math.abs(dx) <= Math.abs(dy) * 1.15) {
        dragRef.current = null;
        setDragging(false);
        return;
      }
      d.moved = true;
    }
    setTx(clampTranslate(d.base + dx));
  };

  const finishPointer = e => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) {
      setDragging(false);
      return;
    }
    const dx = (e.clientX - d.x) * d.k;
    const dy = (e.clientY - d.y) * d.k;
    const isTap = !d.moved || (Math.abs(dx) < 8 && Math.abs(dy) < 8);
    if (isTap) {
      if (openRef.current) {
        snapTo(false);
        return;
      }
      setDragging(false);
      if (typeof onPress === 'function') onPress();
      return;
    }
    const finalX = d.base + dx;
    if (dx > 12) snapTo(true);
    else if (dx < -12) snapTo(false);
    else snapTo(finalX > SWIPE_OPEN_THRESHOLD);
  };

  if (!deletable) {
    return (
      <button type="button" className={styles.rowPressable} onClick={onPress}>
        {children}
      </button>
    );
  }

  return (
    <div className={styles.swipeRowWrap}>
      <div className={`${styles.swipeDeleteAction} ${isOpen ? styles.swipeDeleteActionOpen : ''}`}>
        <button
          type="button"
          className={styles.swipeDeleteBtn}
          disabled={deleting}
          onClick={handleDeletePress}
          aria-label="מחק שיחה">
          {deleting ? (
            <span className={styles.spinner} aria-hidden />
          ) : (
            <>
              <MdiIcon path={mdiTrashCanOutline} size={29} color="#fff" />
              <span className={styles.swipeDeleteText}>מחק</span>
            </>
          )}
        </button>
      </div>
      <div
        className={styles.swipeRowContent}
        style={{
          transform: `translateX(${tx}px)`,
          transition: dragging ? 'none' : 'transform 160ms ease-out',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}>
        {children}
      </div>
    </div>
  );
}

const ChatListScreen = ({
  onClose,
  onOpenChat,
  currentUser = null,
  refreshKey = 0,
  piWelcomeRead = true,
  activeConversationId = null,
  embedded = false,
}) => {
  const {setCurrentUser} = useSession();
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const groupFileRef = useRef(null);

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
  const [groupCropUri, setGroupCropUri] = useState(null);
  const groupPickSeq = useRef(0);
  const groupMetaLookupInFlight = useRef(new Set());

  const currentUserType = getUserSubscriptionTypeLower(currentUser);
  const isBrokerUser = isBrokerLikeSubscriptionType(currentUserType);
  const isCompanyUser = currentUserType === subscriptionTypes.company;
  const isProfessionalUser = currentUserType === subscriptionTypes.professional;
  const isProjectMarketerUser = isProjectMarketerType(currentUserType);
  const isRegularUser = isRegularSubscriptionType(currentUserType);
  const canShowListingAdNumber = isBrokerUser || isCompanyUser;
  const canOpenGroups =
    isBrokerUser || isRegularUser || isCompanyUser || isProfessionalUser || isProjectMarketerUser;
  const isRegularGroupCreator = isRegularUser && !isBrokerUser;
  const usesSimpleGroupFlow = usesOpenChatGroupFlow(currentUserType);
  const groupPickerAudience =
    groupFlow === 'brokers' ? 'broker_only' : usesSimpleGroupFlow ? 'all' : 'regular';
  const hideMemberPickerSubtitle = groupPickerAudience === 'regular';

  const openConversation = useCallback(
    conv => {
      if (typeof onOpenChat !== 'function') return;
      onOpenChat(normalizeConversationForOpen(conv));
    },
    [onOpenChat],
  );

  useEffect(() => {
    if (embedded) return undefined;
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-account-modal]')) return;
      e.stopPropagation();
      if (typeof onClose === 'function') onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [embedded, onClose]);

  useEffect(() => {
    if (!showNewChat) return undefined;
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (groupCropUri) return;
      e.stopPropagation();
      if (groupFlow) {
        setGroupFlow(null);
        setGroupSearch('');
        setGroupCandidates([]);
        dispatchGroupPick({type: 'reset'});
        setGroupWizardStep(1);
        setGroupNameDraft('');
        setGroupImageUrl(null);
        setGroupImageUploading(false);
        return;
      }
      setShowNewChat(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [showNewChat, groupFlow, groupCropUri]);

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
        window.alert(e?.message || 'עדכון ההגדרה נכשל');
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
    setBlockRelevantPostUpdates(currentUser?.block_relevant_post_updates === true);
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
    const myEmail = currentUser?.email ? String(currentUser.email).trim().toLowerCase() : null;
    if (!myEmail) {
      setGroupCandidates([]);
      setGroupLoading(false);
      return;
    }
    const q = groupSearch.trim();
    const seq = ++groupPickSeq.current;
    setGroupLoading(true);
    const audience = groupPickerAudience;
    getUsersForGroupPicker(q, myEmail, audience)
      .then(res => {
        if (groupPickSeq.current !== seq) return;
        let list = res.users || [];
        if (groupFlow === 'brokers') {
          list = list.filter(u => String(u?.subscriptionType || '').trim().toLowerCase() === 'broker');
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
      resolvedFromRow: normalizeChatAvatarUrl(getUserProfileImageUrl(row) || null),
    });
    dispatchGroupPick({type: 'toggle', key, row});
  }, []);

  const removeGroupMember = useCallback(email => {
    const key = email != null ? String(email).trim().toLowerCase() : '';
    if (!key) return;
    dispatchGroupPick({type: 'remove', key});
  }, []);

  const selectedGroupEmails = Object.keys(groupSelected).filter(k => groupSelected[k]);
  const selectedCount = selectedGroupEmails.length;

  useEffect(() => {
    if (!showNewChat || !groupFlow || selectedGroupEmails.length === 0) return;
    for (const em of selectedGroupEmails) {
      const key = String(em || '').trim().toLowerCase();
      if (!key) continue;
      const existing = groupMemberMeta[key] || null;
      const resolvedExisting = normalizeChatAvatarUrl(existing?.avatarUrl || null);
      if (resolvedExisting) continue;
      if (groupMetaLookupInFlight.current.has(key)) continue;
      groupMetaLookupInFlight.current.add(key);
      getChatParticipantDisplay(key)
        .then(res => {
          const avatarUrl = normalizeChatAvatarUrl(res?.profileImageUrl || res?.profile_picture_url || null);
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
    const perSelected = selectedGroupEmails.map(em => {
      const key = String(em || '').trim().toLowerCase();
      const rowFromList = groupCandidates.find(
        row => String(row?.email || '').trim().toLowerCase() === key,
      );
      const meta = groupMemberMeta[key] || null;
      const resolvedCandidate = normalizeChatAvatarUrl(getUserProfileImageUrl(rowFromList) || null);
      const resolvedMeta = normalizeChatAvatarUrl(meta?.avatarUrl || null);
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

  const uploadGroupAvatarCrop = useCallback(async file => {
    if (!file) return;
    setGroupImageUploading(true);
    try {
      const up = await uploadGroupImage(file);
      if (up?.url) setGroupImageUrl(String(up.url).trim());
    } catch (e) {
      window.alert(e?.message ? String(e.message) : 'העלאת התמונה נכשלה');
    } finally {
      setGroupImageUploading(false);
    }
  }, []);

  const handleGroupCropConfirm = useCallback(
    async result => {
      if (groupCropUri) URL.revokeObjectURL(groupCropUri);
      setGroupCropUri(null);
      if (result?.uri) {
        await uploadGroupAvatarCrop(result);
        return;
      }
      if (result?.error) {
        window.alert(String(result.error));
      }
    },
    [groupCropUri, uploadGroupAvatarCrop],
  );

  const handleGroupCropCancel = useCallback(() => {
    if (groupCropUri) URL.revokeObjectURL(groupCropUri);
    setGroupCropUri(null);
  }, [groupCropUri]);

  const pickGroupAvatar = useCallback(() => {
    if (groupImageUploading) return;
    groupFileRef.current?.click();
  }, [groupImageUploading]);

  const onGroupFileChange = useCallback(e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const uri = URL.createObjectURL(file);
    setGroupCropUri(uri);
  }, []);

  const submitCreateGroup = useCallback(async () => {
    const myEmail = currentUser?.email ? String(currentUser.email).trim().toLowerCase() : null;
    if (!myEmail || selectedCount < 1 || groupCreating || groupWizardStep !== 2) return;
    const rawTitle = groupNameDraft != null ? String(groupNameDraft).trim() : '';
    const defaultTitle =
      groupFlow === 'brokers' ? 'קבוצת מתווכים' : usesSimpleGroupFlow ? 'קבוצה' : 'קבוצת לקוחות';
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
      const created = normalizeConversationForOpen({
        id: conv.id,
        conversationId: conv.id,
        isGroup: true,
        otherUserEmail: null,
        name: conv.name || conv.title || title,
        profileImageUrl,
        preview: '',
        time: '',
        lastMessageAt: new Date().toISOString(),
      });
      setConversations(prev => {
        const without = prev.filter(row => String(row.id) !== String(created.id));
        const pinned = without.filter(row => row.id === '1');
        const rest = without.filter(row => row.id !== '1');
        return [created, ...rest, ...pinned];
      });
      setShowNewChat(false);
      resetGroupFlowState();
      openConversation(created);
    } catch (e) {
      window.alert(e?.message ? String(e.message) : 'יצירת הקבוצה נכשלה');
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
    openConversation,
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
    searchBrokers(q, exclude)
      .then(res => {
        if (brokerSearchSeq.current !== seq) return;
        setBrokerResults(res.brokers || []);
      })
      .catch(err => {
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
    b => {
      const email = b?.email != null ? String(b.email).trim().toLowerCase() : '';
      if (!email) return;
      setShowNewChat(false);
      openConversation({
        id: email,
        otherUserEmail: email,
        name: b.title || 'מתווך',
        profileImageUrl: getUserProfileImageUrl(b) || null,
        preview: '',
        time: '',
      });
    },
    [openConversation],
  );

  const fetchConversations = useCallback(
    async (isRefresh = false) => {
      const myEmail = currentUser?.email ? String(currentUser.email).trim().toLowerCase() : null;
      if (!myEmail) {
        setConversations([PI_CONV]);
        setLoading(false);
        return;
      }
      if (!isRefresh) setLoading(true);
      try {
        const res = await getChatConversations(myEmail);
        const list = res.conversations || [];
        const asConv = list.map(c => {
          const peerSubTypeRaw = c.subscriptionType ?? c.subscription_type ?? null;
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
              c.listingDisplayNumber != null ? Number(c.listingDisplayNumber) : null,
            listingCategoryLabel: c.listingCategoryLabel || null,
            exclusiveOfferStatus: c.exclusiveOfferStatus || null,
            exclusiveOfferKind: c.exclusiveOfferKind || null,
            lastMessageFromMe: c.lastMessageFromMe === true,
            lastMessageRead: c.lastMessageRead === true,
            unreadCount: typeof c.unreadCount === 'number' ? Math.max(0, c.unreadCount) : 0,
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
        console.warn('[ChatList] fetchConversations error:', err?.message || err);
        setConversations([PI_CONV]);
      } finally {
        setLoading(false);
      }
    },
    [currentUser?.email],
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations, refreshKey]);

  useEffect(() => {
    if (!currentUser?.email) return undefined;
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
          (c.exclusiveOfferStatus != null && q.length >= 2 && /בלע|ממתין|נדחה/i.test(q)),
      )
    : conversations;

  const handleDeleteConversation = useCallback(
    conv => {
      if (!conv || conv.isGroup === true || conv.id === '1') return;
      const myEmail = currentUser?.email ? String(currentUser.email).trim().toLowerCase() : '';
      const otherEmail = conv.otherUserEmail ? String(conv.otherUserEmail).trim().toLowerCase() : '';
      if (!myEmail || !otherEmail) return;
      const ok = window.confirm('מחיקת שיחה\n\nהאם למחוק את השיחה? לא ניתן לשחזר את ההודעות.');
      if (!ok) return;
      (async () => {
        setDeletingConvId(conv.id);
        try {
          await deleteChatConversation(myEmail, otherEmail);
          setConversations(prev => prev.filter(c => c.id !== conv.id));
        } catch (err) {
          window.alert(err?.message || 'מחיקת השיחה נכשלה, נסה שוב.');
        } finally {
          setDeletingConvId(null);
        }
      })();
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
      conv.exclusiveOfferStatus != null ? String(conv.exclusiveOfferStatus).trim().toLowerCase() : '';
    const showExclusiveRow =
      !isPi && !isGroup && (exStatus === 'pending' || exStatus === 'accepted' || exStatus === 'rejected');
    const showGroup = !isPi && isGroup;
    const showListing = canShowListingAdNumber && !isPi && !isGroup && !!conv.listingId && !showExclusiveRow;
    const showCategory = !isPi && !isGroup && !!conv.listingCategoryLabel && !showExclusiveRow;

    if (isPi) {
      return (
        <div className={styles.metaRow} style={{justifyContent: flexStart}}>
          {rel ? <span className={styles.metaTime}>{rel}</span> : null}
        </div>
      );
    }

    return (
      <div className={styles.metaRow} style={{justifyContent: flexStart}}>
        {showCategory ? (
          <span className={styles.chatListCategoryPill}>
            <span className={styles.badgeYellowText}>{conv.listingCategoryLabel}</span>
          </span>
        ) : null}
        {showGroup ? (
          <span className={styles.badgeGrey}>
            <span className={styles.badgeGreyText}>קבוצה</span>
          </span>
        ) : null}
        {showListing ? (
          <span className={styles.badgeGrey}>
            <span className={styles.badgeGreyText}>
              {conv.listingDisplayNumber != null && !Number.isNaN(conv.listingDisplayNumber)
                ? `מודעה מס ${conv.listingDisplayNumber}`
                : 'מודעה'}
            </span>
          </span>
        ) : null}
        {showExclusiveRow ? (
          <span className={`${styles.chatListCategoryPill} ${styles.chatListCategoryPillFlexible}`}>
            <span className={styles.badgeYellowText}>{exclusiveOfferLabel(conv, exStatus)}</span>
          </span>
        ) : null}
        {rel ? <span className={styles.metaTime}>{rel}</span> : null}
      </div>
    );
  };

  const renderGroupPickRow = (row, j, keyPrefix) => {
    const email = row.email != null ? String(row.email).trim().toLowerCase() : '';
    const checked = !!(email && groupSelected[email]);
    const pic = getUserProfileImageUrl(row);
    const title = row.title != null ? String(row.title) : email;
    const sub = row.subtitle != null ? String(row.subtitle) : '';
    return (
      <button
        type="button"
        key={email || row.id || `${keyPrefix}-${j}`}
        className={`${styles.ncPickRow} ${j > 0 ? styles.ncBrokerRowBorder : ''}`}
        onClick={() => email && toggleGroupMember(email, row)}>
        <span className={styles.ncPickCheck}>
          <span className={`${styles.ncPickCheckOuter} ${checked ? styles.ncPickCheckOuterOn : ''}`}>
            {checked ? <MdiIcon path={mdiCheck} size={18} color={NC_TOGGLE_AMBER} /> : null}
          </span>
        </span>
        <span className={styles.ncBrokerTextCol} style={{alignItems: flexStart}}>
          <span className={styles.ncBrokerTitle}>{title}</span>
          {sub && sub !== title && !hideMemberPickerSubtitle ? (
            <span className={styles.ncBrokerSubtitle}>{sub}</span>
          ) : null}
        </span>
        <ProfileAvatar
          uri={pic}
          size={78}
          subscriptionType={
            row?.subscriptionType ||
            row?.subscription_type ||
            (groupFlow === 'customers' ? 'user' : 'broker')
          }
        />
      </button>
    );
  };

  const startGroupFlow = kind => {
    dispatchGroupPick({type: 'reset'});
    setGroupWizardStep(1);
    setGroupNameDraft('');
    setGroupImageUrl(null);
    setGroupSearch('');
    setGroupFlow(kind);
  };

  const wizardPrimaryDisabled =
    (groupWizardStep === 1 && (selectedCount < 1 || !currentUser?.email)) ||
    (groupWizardStep === 2 && (groupCreating || groupImageUploading || !currentUser?.email));

  return (
    <div className={styles.screen} dir="rtl">
      <div className={styles.topSection}>
        <header className={styles.header}>
          <div className={styles.logoWrap}>
            <img src={logoImage} alt="Pi Chat" className={styles.logoImage} />
          </div>
          {canOpenGroups ? (
            <button
              type="button"
              className={styles.newChatBtn}
              onClick={() => setShowNewChat(true)}
              aria-label={usesSimpleGroupFlow ? 'קבוצה חדשה' : "צ'אט חדש"}>
              <span className={styles.plusCircle}>
                <MdiIcon path={mdiPlus} size={18} color="#fff" />
              </span>
              <span className={styles.newChatLabel}>צ׳אט חדש</span>
            </button>
          ) : null}
        <div className={styles.searchWrap}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="חפש"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className={styles.searchIcon}>
            <MdiIcon path={mdiMagnify} size={24} color={SEARCH_CLUE} />
          </span>
        </div>
        </header>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}>
          <span className={styles.spinner} aria-label="טוען" />
          <span className={styles.loadingText}>טוען שיחות...</span>
        </div>
      ) : (
        <div className={styles.scroll}>
          <div className={styles.scrollContent}>
            <div className={styles.topToListSpacer} />
            {filtered.map((conv, index) => {
              const rawPeerPic = conv.id === '1' ? null : getUserProfileImageUrl(conv);
              const rowAvatarUrl = normalizeChatAvatarUrl(rawPeerPic);
              const rowDebugKey = conv.id ?? conv.otherUserEmail ?? conv.name ?? `conv-${index}`;
              const rowUserRef = conv.otherUserEmail || conv.id || null;
              const isDeletable = conv.isGroup !== true && conv.id !== '1' && !!conv.otherUserEmail;
              const unreadCount = getConversationUnreadCount(conv);
              return (
                <SwipeableConversationRow
                  key={conv.id ?? conv.name ?? `conv-${index}`}
                  deletable={isDeletable}
                  deleting={deletingConvId === conv.id}
                  onDelete={() => handleDeleteConversation(conv)}
                  onPress={() => openConversation(conv)}>
                  <div
                    className={`${styles.messageRow} ${
                      activeConversationId != null && String(activeConversationId) === String(conv.id)
                        ? styles.messageRowActive
                        : ''
                    }`}>
                    <div className={styles.rowMain} style={{alignItems: flexEnd}}>
                      {renderRowMeta(conv)}
                      <div className={styles.previewRow}>
                        {conv.lastMessageFromMe ? (
                          <MdiIcon
                            path={mdiCheckAll}
                            size={21}
                            color={conv.lastMessageRead ? '#34B7F1' : 'rgba(255,255,255,0.45)'}
                            title={conv.lastMessageRead ? 'נקראה' : 'נשלחה'}
                          />
                        ) : null}
                        <span className={styles.messagePreview}>
                          {conv.preview != null && String(conv.preview).trim() !== ''
                            ? String(conv.preview)
                            : 'אין הודעות'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.avatarCol}>
                      <ChatListRowAvatar
                        size={73}
                        uri={rowAvatarUrl}
                        debugKey={rowDebugKey}
                        userRef={conv.isGroup === true || conv.id === '1' ? null : rowUserRef}
                        subscriptionType={conv.subscriptionType || conv.subscription_type || null}
                        forceGoldRing={
                          conv.id === '1' ||
                          conv.isGroup === true ||
                          isProfessionalUpdatesConversation(conv)
                        }
                        placeholderImage={
                          conv.isGroup === true
                            ? CHAT_GROUP_AVATAR_PLACEHOLDER
                            : CHAT_LIST_AVATAR_PLACEHOLDER
                        }
                      />
                      <span className={styles.senderName}>
                        {conv.name != null ? String(conv.name) : 'משתמש'}
                      </span>
                    </div>
                    {unreadCount > 0 ? (
                      <span
                        className={styles.chatUnreadBadge}
                        aria-label={`הודעות שלא נקראו: ${unreadCount > 99 ? 'יותר מ־99' : unreadCount}`}>
                        <span className={styles.chatUnreadBadgeText}>
                          {unreadCount > 99 ? '99+' : String(unreadCount)}
                        </span>
                      </span>
                    ) : null}
                  </div>
                </SwipeableConversationRow>
              );
            })}
          </div>
        </div>
      )}

      {showNewChat ? (
        <div className={styles.ncRoot} data-account-modal="" role="dialog" aria-modal="true" dir="rtl">
          <div className={styles.ncTopSection}>
            <div className={styles.ncHeader}>
              {groupFlow ? (
                <>
                  <div className={styles.ncWizardColStart} style={{justifyContent: flexEnd}}>
                    <button
                      type="button"
                      onClick={onGroupWizardPrimary}
                      disabled={wizardPrimaryDisabled}
                      className={styles.ncWizardPrimaryWrap}
                      aria-label={groupWizardStep === 1 ? 'הבא' : 'שמור'}>
                      {groupCreating && groupWizardStep === 2 ? (
                        <span className={styles.spinner} aria-hidden />
                      ) : (
                        <span className={styles.ncWizardPrimaryText}>
                          {groupWizardStep === 1 ? 'הבא >' : 'שמור >'}
                        </span>
                      )}
                    </button>
                  </div>
                  <h1 className={`${styles.ncTitle} ${styles.ncTitleWizard}`}>
                    {groupFlow === 'brokers'
                      ? 'צור קבוצת מתווכים'
                      : usesSimpleGroupFlow
                        ? 'קבוצה'
                        : 'צור קבוצת לקוחות'}
                  </h1>
                  <div className={styles.ncWizardColEnd} style={{justifyContent: flexStart}}>
                    <button
                      type="button"
                      onClick={resetGroupFlowState}
                      className={styles.ncWizardCancelWrap}
                      aria-label="ביטול">
                      <span className={styles.ncWizardCancelText}>ביטול</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowNewChat(false)}
                    className={styles.ncBackBtn}
                    aria-label="חזרה">
                    <MdiIcon path={mdiChevronLeft} size={36} color="#fff" />
                  </button>
                  <h1 className={styles.ncTitle}>{usesSimpleGroupFlow ? 'קבוצה' : "צ'אט חדש"}</h1>
                  <span className={styles.ncHeaderSpacer} />
                </>
              )}
            </div>

            {groupFlow && groupWizardStep === 1 ? (
              <div className={`${styles.ncSearchFullBleed} ${styles.ncGroupSearchOffset}`}>
                <div className={`${styles.ncSearchWrap} ${styles.ncSearchWrapGold}`}>
                  {groupSearch.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setGroupSearch('')}
                      className={styles.ncSearchClearInside}
                      aria-label="נקה חיפוש">
                      <span className={styles.ncSearchClearGlyph}>×</span>
                    </button>
                  ) : null}
                  <input
                    className={`${styles.ncSearchInput} ${groupSearch.length > 0 ? styles.ncSearchInputPadClear : ''}`}
                    type="search"
                    placeholder={
                      groupFlow === 'brokers'
                        ? 'חפש מתווך לפי שם / משרד / טלפון'
                        : 'חפש משתמש לפי שם / טלפון'
                    }
                    value={groupSearch}
                    onChange={e => setGroupSearch(e.target.value)}
                  />
                  <span className={styles.ncSearchIcon}>
                    <MdiIcon path={mdiMagnify} size={29} color={NC_TEXT_SECONDARY} />
                  </span>
                </div>
              </div>
            ) : null}

            {groupFlow && groupWizardStep === 2 ? (
              <div className={styles.ncGroupStep2Card}>
                <input
                  className={styles.ncGroupNameInput}
                  type="text"
                  placeholder="שם הקבוצה"
                  value={groupNameDraft}
                  onChange={e => setGroupNameDraft(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.ncGroupCameraBtn}
                  onClick={pickGroupAvatar}
                  disabled={groupImageUploading}
                  aria-label="תמונת קבוצה">
                  {groupImageUploading ? (
                    <span className={styles.spinner} aria-hidden />
                  ) : groupImageUrl ? (
                    <img src={groupImageUrl} alt="" className={styles.ncGroupPickPreview} />
                  ) : (
                    <img src={cameraIcon} alt="" className={styles.ncGroupCameraIcon} />
                  )}
                </button>
              </div>
            ) : null}

            {groupFlow && selectedCount > 0 ? (
              <div className={styles.ncChipsSection}>
                <p className={styles.ncChipsLabel}>
                  {groupFlow === 'brokers'
                    ? 'מתווכים שהתווספו'
                    : usesSimpleGroupFlow
                      ? 'חברים שהתווספו'
                      : 'אנשי קשר שהתווספו'}
                </p>
                <div className={styles.ncChipsCard} style={{alignItems: flexStart}}>
                  <div className={styles.ncChipsScroll} style={{justifyContent: flexStart}}>
                    {selectedGroupEmails.map(em => {
                      const key = String(em || '').trim().toLowerCase();
                      const rowFromList = groupCandidates.find(
                        row => String(row?.email || '').trim().toLowerCase() === key,
                      );
                      const meta = groupMemberMeta[key] || {title: em};
                      const pic = normalizeChatAvatarUrl(
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
                        <div key={em} className={styles.ncChipCol}>
                          <div className={styles.ncChipAvatarWrap}>
                            <ProfileAvatar
                              uri={pic}
                              size={94}
                              subscriptionType={
                                meta.subscriptionType ||
                                rowFromList?.subscriptionType ||
                                rowFromList?.subscription_type ||
                                (groupFlow === 'customers' ? 'user' : 'broker')
                              }
                            />
                            <button
                              type="button"
                              className={styles.ncChipRemove}
                              onClick={() => removeGroupMember(em)}
                              aria-label="הסר">
                              <MdiIcon path={mdiClose} size={18} color="#FFFFFF" />
                            </button>
                          </div>
                          <span className={styles.ncChipName}>{chipTitle}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {!groupFlow && !usesSimpleGroupFlow ? (
              <>
                <div className={styles.ncSearchFullBleed}>
                  <div className={styles.ncSearchWrap}>
                    {newChatSearch.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setNewChatSearch('')}
                        className={styles.ncSearchClearInside}
                        aria-label="נקה חיפוש">
                        <span className={styles.ncSearchClearGlyph}>×</span>
                      </button>
                    ) : null}
                    <input
                      className={`${styles.ncSearchInput} ${
                        newChatSearch.length > 0 ? styles.ncSearchInputPadClear : ''
                      }`}
                      type="search"
                      placeholder="חפש מתווך לפי שם / משרד / טלפון"
                      value={newChatSearch}
                      onChange={e => setNewChatSearch(e.target.value)}
                    />
                    <span className={styles.ncSearchIcon}>
                      <MdiIcon path={mdiMagnify} size={29} color={NC_TEXT_SECONDARY} />
                    </span>
                  </div>
                </div>
                {brokerSearchError ? (
                  <p className={styles.ncBrokerSearchError}>{brokerSearchError}</p>
                ) : null}
              </>
            ) : null}
          </div>

          {groupFlow ? (
            groupWizardStep === 1 ? (
              <div className={`${styles.ncScroll} ${styles.ncGroupScrollPad}`}>
                <div className={styles.ncScrollContent}>
                  {!currentUser?.email ? (
                    <p className={styles.ncBrokerEmpty}>התחבר/י לחשבון כדי ליצור קבוצה.</p>
                  ) : groupLoading && groupCandidates.length === 0 ? (
                    <div className={styles.ncBrokerLoading}>
                      <span className={styles.spinner} aria-hidden />
                    </div>
                  ) : groupCandidates.length === 0 ? (
                    <p className={styles.ncBrokerEmpty}>
                      {groupFlow === 'customers'
                        ? usesSimpleGroupFlow
                          ? 'לא נמצאו משתמשים. חפשו לפי שם או טלפון.'
                          : 'אין אנשי קשר עדיין. התחל/י שיחה פרטית — הוא יופיע כאן.'
                        : 'לא נמצאו מתווכים.'}
                    </p>
                  ) : groupSearch.trim().length > 0 ? (
                    <div className={`${styles.ncLetterSection} ${styles.ncSearchResultsSection}`}>
                      <p className={`${styles.ncLetterHeading} ${styles.ncSectionHeadingFigma}`}>
                        תוצאות חיפוש
                      </p>
                      <div className={styles.ncBrokerCard}>
                        {groupCandidates.map((row, j) => renderGroupPickRow(row, j, 'g-search'))}
                      </div>
                    </div>
                  ) : (
                    bucketGroupListByFirstLetter(groupCandidates).map(({letter, rows}) => (
                      <div key={letter} className={styles.ncLetterSection}>
                        <p className={styles.ncLetterHeading}>{letter === '#' ? '…' : letter}</p>
                        <div className={styles.ncBrokerCard}>
                          {rows.map((row, j) => renderGroupPickRow(row, j, `g-${letter}`))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className={`${styles.ncScroll} ${styles.ncGroupStep2Body}`} />
            )
          ) : (
            <div className={styles.ncScroll}>
              <div className={styles.ncScrollContent}>
                {newChatSearch.trim().length >= 1 ? (
                  <>
                    <p className={styles.ncSectionLabel}>מתווכים</p>
                    <div className={styles.ncBrokerCard}>
                      {brokerSearchLoading ? (
                        <div className={styles.ncBrokerLoading}>
                          <span className={styles.spinner} aria-hidden />
                        </div>
                      ) : brokerResults.length === 0 ? (
                        <p className={styles.ncBrokerEmpty}>לא נמצאו מתווכים</p>
                      ) : (
                        brokerResults.map((b, i) => {
                          const pic = getUserProfileImageUrl(b);
                          return (
                            <button
                              type="button"
                              key={b.id || b.email || `b-${i}`}
                              className={`${styles.ncBrokerRow} ${i > 0 ? styles.ncBrokerRowBorder : ''}`}
                              onClick={() => openChatWithBroker(b)}>
                              <span className={styles.ncBrokerTextCol} style={{alignItems: flexStart}}>
                                <span className={styles.ncBrokerTitle}>{b.title}</span>
                                <span className={styles.ncBrokerSubtitle}>{b.subtitle}</span>
                              </span>
                              <span className={styles.ncBrokerAvatarRing}>
                                <span className={styles.ncBrokerAvatarInner}>
                                  <img
                                    src={pic || DEFAULT_PI_PROFILE_AVATAR}
                                    alt=""
                                    className={styles.ncBrokerAvatarImg}
                                  />
                                </span>
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : null}

                {usesSimpleGroupFlow ? (
                  <>
                    <p className={`${styles.ncSectionLabel} ${styles.ncSectionLabelSpaced}`}>קבוצה</p>
                    <div className={styles.ncCard}>
                      <button type="button" className={styles.ncRow} onClick={() => startGroupFlow('customers')}>
                        <span className={styles.ncChevron}>
                          <MdiIcon path={mdiChevronLeft} size={29} color="#FFFFFF" />
                        </span>
                        <span className={styles.ncRowTextWrap} style={{alignItems: flexStart}}>
                          <span className={styles.ncRowTitle}>קבוצה</span>
                          <span className={styles.ncRowSubtitle}>פתחו קבוצה עם כל סוגי המשתמשים</span>
                        </span>
                        <span className={styles.ncIconBubble}>
                          <img src={privateGroupIcon} alt="" className={styles.ncIconImage} />
                        </span>
                      </button>
                    </div>

                    {isRegularGroupCreator ? (
                      <button type="button" className={styles.ncToggleRow} onClick={toggleBlockExclusiveOffers}>
                        <span className={styles.ncToggleOuter}>
                          {blockExclusiveOffers ? (
                            <MdiIcon path={mdiCheck} size={20} color={NC_TOGGLE_AMBER} />
                          ) : null}
                        </span>
                        <span className={styles.ncToggleLabel}>חסום הצעות לבלעדיות</span>
                      </button>
                    ) : null}

                    {isProfessionalUser ? (
                      <button type="button" className={styles.ncToggleRow} onClick={toggleBlockRelevantPostUpdates}>
                        <span className={styles.ncToggleOuter}>
                          {blockRelevantPostUpdates ? (
                            <MdiIcon path={mdiCheck} size={20} color={NC_TOGGLE_AMBER} />
                          ) : null}
                        </span>
                        <span className={styles.ncToggleLabel}>חסום עדכון פוסטים רלוונטים</span>
                      </button>
                    ) : null}

                  </>
                ) : (
                  <>
                    <p className={`${styles.ncSectionLabel} ${styles.ncSectionLabelSpaced}`}>מתווכים</p>
                    <div className={styles.ncCard}>
                      <button
                        type="button"
                        className={styles.ncRow}
                        onClick={() => {
                          if (!canOpenGroups) {
                            window.alert('אין הרשאה לפתוח קבוצות');
                            return;
                          }
                          startGroupFlow('customers');
                        }}>
                        <span className={styles.ncChevron}>
                          <MdiIcon path={mdiChevronLeft} size={29} color="#FFFFFF" />
                        </span>
                        <span className={styles.ncRowTextWrap} style={{alignItems: flexStart}}>
                          <span className={styles.ncRowTitle}>צור קבוצת לקוחות</span>
                          <span className={styles.ncRowSubtitle}>יצר קבוצה ייעודית ללקוחות שלך</span>
                        </span>
                        <span className={styles.ncIconBubble}>
                          <img src={privateGroupIcon} alt="" className={styles.ncIconImage} />
                        </span>
                      </button>
                      {isBrokerUser ? (
                        <>
                          <div className={styles.ncRowDivider} />
                          <button
                            type="button"
                            className={styles.ncRow}
                            onClick={() => {
                              if (!isBrokerUser) {
                                window.alert('רק מתווכים יכולים לפתוח קבוצת מתווכים');
                                return;
                              }
                              startGroupFlow('brokers');
                            }}>
                            <span className={styles.ncChevron}>
                              <MdiIcon path={mdiChevronLeft} size={29} color="#FFFFFF" />
                            </span>
                            <span className={styles.ncRowTextWrap} style={{alignItems: flexStart}}>
                              <span className={styles.ncRowTitle}>צור קבוצת מתווכים</span>
                              <span className={styles.ncRowSubtitle}>
                                שתף פעולה עם מתווכים על נכסים, אירועי בית פתוח ועוד בקבוצה ייעודית.
                              </span>
                            </span>
                            <span className={styles.ncIconBubble}>
                              <img src={brokersGroupIcon} alt="" className={styles.ncIconImage} />
                            </span>
                          </button>
                        </>
                      ) : null}
                    </div>

                    <button type="button" className={styles.ncToggleRow} onClick={toggleBlockCollabOffers}>
                      <span className={styles.ncToggleOuter}>
                        {blockCollabOffers ? (
                          <MdiIcon path={mdiCheck} size={20} color={NC_TOGGLE_AMBER} />
                        ) : null}
                      </span>
                      <span className={styles.ncToggleLabel}>חסום הצעות לשת"פ</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      <input
        ref={groupFileRef}
        type="file"
        accept="image/*"
        className={styles.hiddenFile}
        onChange={onGroupFileChange}
      />

      {groupCropUri ? (
        <StagePortal>
          <CircleCropModal
            imageUri={groupCropUri}
            title="חתוך את תמונת הקבוצה"
            onCancel={handleGroupCropCancel}
            onConfirm={handleGroupCropConfirm}
          />
        </StagePortal>
      ) : null}
    </div>
  );
};

export default ChatListScreen;
