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
} from 'react-native';
import {createClient} from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import {Audio} from 'expo-av';

import {MaterialCommunityIcons} from '@expo/vector-icons';
import {DEFAULT_WELCOME_MESSAGE} from '../utils/chatDefaults';
import {
  getChatMessages,
  getChatParticipantDisplay,
  sendChatMessage,
  uploadChatMedia,
  getGroupChatMessages,
  sendGroupChatMessage,
  updateGroupDescription,
} from '../utils/api';
import {getUserProfileImageUrl} from '../utils/userProfileImage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const BG = '#1a1926';
const CARD_BG = '#252436';
const GOLD = '#D4AF37';
const TEXT_LIGHT = 'rgba(255,255,255,0.7)';

const CHAT_BG = '#373548';
const BUBBLE_GOLD = '#d4a84b';
const BUBBLE_ME = '#2DD4BF';
/** Header + bottom composer bar */
const CHAT_CHROME_BG = '#1E1D27';
const INPUT_PILL_BORDER = '#8a8ab0';
const INPUT_PLACEHOLDER = 'rgba(255,255,255,0.45)';

/** Whether this is the Pi welcome conversation (id=1, name=pi). */
const isWelcomeConversation = (conv) =>
  conv && conv.id === '1' && conv.name === 'pi';

/** Chat with a real user: conversation.id = other user's email (or UUID if list row lacked email). */
const isUserConversation = (conv) =>
  conv && conv.id && conv.id !== '1';

const CHAT_PEER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const ChatScreen = ({onClose, sharedListing = null, conversation = null, currentUser = null, onMessageSent, onPiWelcomeOpened}) => {
  const msg = DEFAULT_WELCOME_MESSAGE;
  const isWelcome = isWelcomeConversation(conversation);
  const isUser = isUserConversation(conversation);
  const otherUserEmail = isUser ? resolveOtherPartyEmail(conversation) : null;
  const isGroupThread = conversation?.isGroup === true;
  const groupConversationId =
    isGroupThread && conversation?.id != null ? String(conversation.id).trim() : null;
  const isDirectPeer = isUser && !isWelcome && !isGroupThread && !!otherUserEmail;
  const myEmail = currentUser?.email ? String(currentUser.email).trim().toLowerCase() : null;
  const contextListingId =
    sharedListing?.id != null && String(sharedListing.id).trim() !== ''
      ? String(sharedListing.id).trim()
      : conversation?.listingId != null && String(conversation.listingId).trim() !== ''
        ? String(conversation.listingId).trim()
        : null;

  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolvedDisplay, setResolvedDisplay] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  /** From GET /api/chat/group-messages */
  const [groupDetail, setGroupDetail] = useState(null);
  const [groupMembersList, setGroupMembersList] = useState([]);
  const [showGroupDescModal, setShowGroupDescModal] = useState(false);
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

  const groupTitleResolved =
    (groupDetail?.title != null && String(groupDetail.title).trim()) || displayName;
  const groupAvatarResolved =
    (groupDetail?.profileImageUrl != null && String(groupDetail.profileImageUrl).trim()) ||
    profileImageUrl;

  const senderNameByEmail = useMemo(() => {
    const m = new Map();
    for (const row of groupMembersList) {
      if (row?.email) m.set(String(row.email).trim().toLowerCase(), row.name || row.email);
    }
    return m;
  }, [groupMembersList]);

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
        .then((res) => {
          if (res.messages) setMessages(res.messages);
          if (res.conversation_id) setConversationId(res.conversation_id);
          if (res.group) setGroupDetail(res.group);
          if (Array.isArray(res.members)) setGroupMembersList(res.members);
        })
        .catch(() => {
          setMessages([]);
          setGroupDetail(null);
          setGroupMembersList([]);
        });
      return;
    }
    if (!isDirectPeer || !otherUserEmail) return;
    getChatMessages(myEmail, otherUserEmail)
      .then((res) => {
        if (res.messages) setMessages(res.messages);
        if (res.conversation_id) setConversationId(res.conversation_id);
      })
      .catch(() => setMessages([]));
  }, [isGroupThread, groupConversationId, isDirectPeer, myEmail, otherUserEmail]);

  useEffect(() => {
    if (!isDirectPeer || !otherUserEmail) return;
    const hasGoodDisplay =
      (conversation?.name && conversation.name !== 'משתמש') || getUserProfileImageUrl(conversation);
    if (hasGoodDisplay) return;
    let cancelled = false;
    getChatParticipantDisplay(otherUserEmail)
      .then((res) => {
        if (!cancelled && res.success && (res.name || getUserProfileImageUrl(res)))
          setResolvedDisplay({
            name: res.name || null,
            profileImageUrl: getUserProfileImageUrl(res) || null,
          });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isDirectPeer, otherUserEmail, conversation?.name, conversation?.profileImageUrl]);

  useEffect(() => {
    if (!myEmail) return;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return;
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
        if (!cancelled && res.messages) setMessages(res.messages);
        if (!cancelled && res.conversation_id) setConversationId(res.conversation_id);
        if (!cancelled && isGroupThread) {
          if (res.group) setGroupDetail(res.group);
          if (Array.isArray(res.members)) setGroupMembersList(res.members);
        }
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
        if (!cancelled && isGroupThread) {
          setGroupDetail(null);
          setGroupMembersList([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const t = setTimeout(() => {
      if (!cancelled && myEmail && (isGroupThread ? groupConversationId : otherUserEmail)) {
        load().then((res) => {
          if (!cancelled && res.messages && res.messages.length > 0) {
            setMessages(res.messages);
            if (res.conversation_id) setConversationId(res.conversation_id);
            if (isGroupThread) {
              if (res.group) setGroupDetail(res.group);
              if (Array.isArray(res.members)) setGroupMembersList(res.members);
            }
          }
        }).catch(() => {});
      }
    }, 800);
    return () => { cancelled = true; clearTimeout(t); };
  }, [isDirectPeer, isGroupThread, groupConversationId, myEmail, otherUserEmail]);

  useEffect(() => {
    if (!isGroupThread) {
      setGroupDetail(null);
      setGroupMembersList([]);
      setShowGroupDescModal(false);
      setGroupDescDraft('');
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
          const senderEmail = row.sender_id != null ? String(row.sender_id).trim().toLowerCase() : '';
          const newMsg = {
            id: row.id,
            senderId: row.sender_id,
            body: row.body || '',
            mediaType: row.media_type || null,
            mediaUrl: row.media_url || null,
            createdAt: row.created_at,
            isMe: senderEmail === myEmail,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, myEmail]);

  useEffect(() => {
    if (!myEmail) return;
    if (!(isDirectPeer || (isGroupThread && groupConversationId))) return;
    const interval = setInterval(fetchMessages, 15000);
    return () => clearInterval(interval);
  }, [isDirectPeer, isGroupThread, groupConversationId, myEmail, fetchMessages]);

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
          setMessages((prev) => [...prev, {...res.message, id: res.message.id || Date.now()}]);
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
      const res = await sendChatMessage(myEmail, otherUserEmail, text, receiverDisplay, senderDisplay, null, contextListingId);
      if (res.message) {
        setMessages((prev) => [...prev, {...res.message, id: res.message.id || Date.now()}]);
        if (onMessageSent) onMessageSent();
      }
    } catch (e) {
      setInputText(text);
      if (typeof alert !== 'undefined') alert(e?.message || 'שליחת ההודעה נכשלה');
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
        setMessages((prev) => [...prev, {...res.message, id: res.message.id || Date.now()}]);
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
        res = await sendChatMessage(myEmail, otherUserEmail, '', receiverDisplay, senderDisplay, {
          type: 'audio',
          url: up.url,
        }, contextListingId);
      } else {
        return;
      }
      if (res.message) {
        setMessages((prev) => [...prev, {...res.message, id: res.message.id || Date.now()}]);
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

  const renderMessages = () => {
    if (isWelcome) {
      return (
        <View style={[styles.messageRow, styles.messageRowWelcome]}>
          <View style={[styles.bubbleWrap, styles.bubbleWrapWelcome]}>
            <View style={[styles.bubble, styles.bubbleThem]}>
              <Text style={styles.bubbleText}>{msg.fullText}</Text>
              <Text style={styles.bubbleTime}>{msg.time}</Text>
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
    return messages.map((m) => {
      const sid = m.senderId != null ? String(m.senderId).trim().toLowerCase() : '';
      const peerPic =
        isGroupThread && sid
          ? groupMembersList.find((row) => String(row.email).trim().toLowerCase() === sid)?.profileImageUrl
          : null;
      return (
      <View
        key={m.id}
        style={[styles.messageRow, m.isMe && styles.messageRowMe]}>
        {!m.isMe && (
          <View style={styles.senderLogoWrap}>
            {isGroupThread ? (
              peerPic ? (
                <Image source={{uri: peerPic}} style={styles.senderLogo} resizeMode="cover" />
              ) : (
                <Image source={require('../assets/image-copy-10.png')} style={styles.senderLogo} resizeMode="cover" />
              )
            ) : profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.senderLogo} resizeMode="cover" />
            ) : (
              <Image source={require('../assets/image-copy-10.png')} style={styles.senderLogo} resizeMode="cover" />
            )}
          </View>
        )}
        <View style={[styles.bubbleWrap, m.isMe && styles.bubbleWrapMe]}>
          <View style={[styles.bubble, m.isMe ? styles.bubbleMe : styles.bubbleThem]}>
            {m.mediaType === 'image' && m.mediaUrl ? (
              <Image source={{uri: m.mediaUrl}} style={styles.bubbleImage} resizeMode="cover" />
            ) : null}
            {m.mediaType === 'audio' && m.mediaUrl ? (
              <TouchableOpacity
                style={[styles.voiceRow, m.isMe && styles.voiceRowMe]}
                onPress={() => toggleVoicePlayback(m.id, m.mediaUrl)}
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
            {m.body ? <Text style={styles.bubbleText}>{String(m.body)}</Text> : null}
            <Text style={styles.bubbleTime}>
              {m.createdAt
                ? new Date(m.createdAt).toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'})
                : ''}
            </Text>
          </View>
        </View>
      </View>
    );
    });
  };

  const composerActive =
    isWelcome || (myEmail && (isDirectPeer || (isGroupThread && groupConversationId)));
  const canSubmitMessage =
    !sending && (inputText || '').trim().length > 0 && (isWelcome || (isDirectPeer || (isGroupThread && groupConversationId)));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {isGroupThread ? (
          <>
            <TouchableOpacity
              onPress={onClose}
              style={styles.groupHeaderBack}
              activeOpacity={0.7}
              hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
              <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.groupHeaderCenter}>
              {groupAvatarResolved ? (
                <Image source={{uri: groupAvatarResolved}} style={styles.groupHeaderMiniAvatar} resizeMode="cover" />
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
              onPress={() => Alert.alert('', 'פרטי הקבוצה — בקרוב')}
              accessibilityRole="button"
              accessibilityLabel="מידע">
              <MaterialCommunityIcons name="information-outline" size={26} color="#fff" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={onClose} style={styles.headerLeft} activeOpacity={0.7} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
              {profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.headerAvatarImage} resizeMode="cover" />
              ) : (
                <Image source={require('../assets/image-copy-10.png')} style={styles.headerAvatarImage} resizeMode="cover" />
              )}
              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle}>{displayName}</Text>
                <Text style={styles.headerSubtitle}>מחובר/ת</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerIconBtn}>
                <Image
                  source={require('../assets/pi-chat/phone.png')}
                  style={styles.headerPhoneIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </>
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
            resizeMode="contain"
          />
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {isGroupThread && groupConversationId ? (
              <View style={styles.groupInfoCard}>
                <View style={styles.groupInfoAvatarRing}>
                  {groupAvatarResolved ? (
                    <Image source={{uri: groupAvatarResolved}} style={styles.groupInfoAvatarImg} resizeMode="cover" />
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
                    {groupMembersList.slice(0, 12).map((member, i) => (
                      <View
                        key={member.email || `m-${i}`}
                        style={[styles.groupMemberOverlap, i > 0 && styles.groupMemberOverlapShift]}>
                        {member.profileImageUrl ? (
                          <Image source={{uri: member.profileImageUrl}} style={styles.groupMemberAvatar} resizeMode="cover" />
                        ) : (
                          <Image
                            source={require('../assets/image-copy-10.png')}
                            style={styles.groupMemberAvatar}
                            resizeMode="cover"
                          />
                        )}
                      </View>
                    ))}
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
                  onPress={() => Alert.alert('', 'הוספת חברים לקבוצה — בקרוב')}
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
          <TouchableOpacity style={styles.inputBarIconBtn} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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
              {...(Platform.OS === 'web' ? {id: 'pi-chat-composer-textarea'} : {})}
            />
          </View>
          <TouchableOpacity
            style={[styles.inputBarIconBtn, (!composerActive || isWelcome || sending || isRecording) && styles.inputBarIconDisabled]}
            activeOpacity={0.7}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            onPress={composerActive && !isWelcome && !sending && !isRecording ? handleSendPhoto : undefined}
            disabled={!composerActive || isWelcome || sending || isRecording}>
            <Image
              source={require('../assets/pi-chat/camera.png')}
              style={styles.inputBarAssetIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          {sending ? (
            <View style={styles.inputBarIconBtn} accessibilityState={{busy: true}}>
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
              onPressIn={Platform.OS !== 'web' && composerActive && !isWelcome ? startVoiceRecording : undefined}
              onPressOut={Platform.OS !== 'web' && composerActive && !isWelcome ? stopVoiceRecordingAndSend : undefined}>
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
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: CHAT_CHROME_BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    zIndex: 20,
    elevation: 4,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  headerAvatarImage: { width: 40, height: 40, borderRadius: 20 },
  headerTitleWrap: { justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontFamily: 'Rubik-Medium' },
  headerSubtitle: { color: TEXT_LIGHT, fontSize: 12, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: { padding: 6 },
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
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
  },
  groupInfoAvatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    marginBottom: 14,
  },
  groupInfoAvatarImg: {width: '100%', height: '100%'},
  groupInfoTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    marginBottom: 16,
  },
  groupInfoMembersLabel: {
    color: TEXT_LIGHT,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    alignSelf: 'stretch',
    marginBottom: 10,
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
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  groupMemberOverlap: {
    borderWidth: 2,
    borderColor: CHAT_CHROME_BG,
    borderRadius: 22,
    overflow: 'hidden',
  },
  groupMemberOverlapShift: {
    marginLeft: -14,
  },
  groupMemberAvatar: {width: 40, height: 40, borderRadius: 20},
  groupDescPreview: {
    color: TEXT_LIGHT,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    alignSelf: 'stretch',
    marginBottom: 10,
    lineHeight: 20,
  },
  groupAddDescHit: {marginBottom: 16},
  groupAddDesc: {
    color: GOLD,
    fontSize: 15,
    fontFamily: 'Rubik-Regular',
    textDecorationLine: 'underline',
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
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAddMembersImage: {
    width: '100%',
    height: 52,
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
  dateLabel: { textAlign: 'center', color: '#fff', fontSize: 14, marginBottom: 16 },
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
  messageRowWelcome: { gap: 0 },
  messageRowMe: { justifyContent: 'flex-end' },
  senderLogoWrap: { marginBottom: 4, width: 32, height: 32 },
  senderLogo: { width: 32, height: 32, borderRadius: 16 },
  senderLogoPlaceholder: { backgroundColor: CARD_BG, alignItems: 'center', justifyContent: 'center' },
  bubbleWrap: { flex: 1, maxWidth: '85%', alignSelf: 'flex-start' },
  bubbleWrapWelcome: { flex: 0, maxWidth: '72%' },
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
    direction: 'ltr',
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
