import React, {useState, useEffect, useRef, useCallback} from 'react';
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
} from 'react-native';
import {createClient} from '@supabase/supabase-js';

import {MaterialCommunityIcons} from '@expo/vector-icons';
import {DEFAULT_WELCOME_MESSAGE} from '../utils/chatDefaults';
import {getChatMessages, getChatParticipantDisplay, sendChatMessage} from '../utils/api';
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

/** Whether this is the Pi welcome conversation (id=1, name=pi). */
const isWelcomeConversation = (conv) =>
  conv && conv.id === '1' && conv.name === 'pi';

/** Chat with a real user: conversation.id = other user's email. */
const isUserConversation = (conv) =>
  conv && conv.id && conv.id !== '1';

const ChatScreen = ({onClose, sharedListing = null, conversation = null, currentUser = null, onMessageSent, onPiWelcomeOpened}) => {
  const msg = DEFAULT_WELCOME_MESSAGE;
  const isWelcome = isWelcomeConversation(conversation);
  const isUser = isUserConversation(conversation);
  const otherUserEmail = isUser ? String(conversation.id).trim().toLowerCase() : null;
  const myEmail = currentUser?.email ? String(currentUser.email).trim().toLowerCase() : null;

  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolvedDisplay, setResolvedDisplay] = useState(null);
  const scrollRef = useRef(null);

  const displayName = (resolvedDisplay?.name != null ? resolvedDisplay.name : conversation?.name) ?? DEFAULT_WELCOME_MESSAGE.senderName;
  const profileImageUrl =
    getUserProfileImageUrl(resolvedDisplay) || getUserProfileImageUrl(conversation);

  const fetchMessages = useCallback(() => {
    if (!isUser || !myEmail || !otherUserEmail) return;
    getChatMessages(myEmail, otherUserEmail)
      .then((res) => {
        if (res.messages) setMessages(res.messages);
        if (res.conversation_id) setConversationId(res.conversation_id);
      })
      .catch(() => setMessages([]));
  }, [isUser, myEmail, otherUserEmail]);

  useEffect(() => {
    if (!isUser || !otherUserEmail) return;
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
  }, [isUser, otherUserEmail, conversation?.name, conversation?.profileImageUrl]);

  useEffect(() => {
    if (!isUser || !myEmail || !otherUserEmail) return;
    let cancelled = false;
    setLoading(true);
    getChatMessages(myEmail, otherUserEmail)
      .then((res) => {
        if (!cancelled && res.messages) setMessages(res.messages);
        if (!cancelled && res.conversation_id) setConversationId(res.conversation_id);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const t = setTimeout(() => {
      if (!cancelled && isUser && myEmail && otherUserEmail) {
        getChatMessages(myEmail, otherUserEmail).then((res) => {
          if (!cancelled && res.messages && res.messages.length > 0) {
            setMessages(res.messages);
            if (res.conversation_id) setConversationId(res.conversation_id);
          }
        }).catch(() => {});
      }
    }, 800);
    return () => { cancelled = true; clearTimeout(t); };
  }, [isUser, myEmail, otherUserEmail]);

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
    if (!isUser || !myEmail || !otherUserEmail) return;
    const interval = setInterval(fetchMessages, 15000);
    return () => clearInterval(interval);
  }, [isUser, myEmail, otherUserEmail, fetchMessages]);

  // Mark Pi welcome as "read" when user opens that conversation so badge goes from 1 to 0
  useEffect(() => {
    if (isWelcome && onPiWelcomeOpened) onPiWelcomeOpened();
  }, [isWelcome, onPiWelcomeOpened]);

  const handleSend = async () => {
    const text = (inputText || '').trim();
    if (!text) return;
    if (isWelcome) {
      setInputText('');
      return;
    }
    if (!myEmail || !otherUserEmail) return;
    setSending(true);
    setInputText('');
    try {
      const receiverPic = getUserProfileImageUrl(conversation);
      const receiverDisplay =
        conversation?.name || receiverPic
          ? {name: conversation?.name || null, profileImageUrl: receiverPic || null}
          : null;
      const senderName = currentUser?.name || currentUser?.contact_person_name || currentUser?.agent_name || currentUser?.business_name || currentUser?.broker_office_name;
      const senderPic = getUserProfileImageUrl(currentUser);
      const senderDisplay = (senderName || senderPic) ? { name: senderName || null, profileImageUrl: senderPic || null } : null;
      const res = await sendChatMessage(myEmail, otherUserEmail, text, receiverDisplay, senderDisplay);
      if (res.message) {
        setMessages((prev) => [...prev, { ...res.message, id: res.message.id || Date.now() }]);
        if (onMessageSent) onMessageSent();
      }
    } catch (e) {
      setInputText(text);
      if (typeof alert !== 'undefined') alert(e?.message || 'שליחת ההודעה נכשלה');
    } finally {
      setSending(false);
    }
  };

  const renderMessages = () => {
    if (isWelcome) {
      return (
        <View style={styles.messageRow}>
          <View style={styles.senderLogoWrap}>
            <Image source={require('../assets/image-copy-10.png')} style={styles.senderLogo} resizeMode="contain" />
          </View>
          <View style={styles.bubbleWrap}>
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
    if (messages.length === 0) {
      return <Text style={styles.emptyChatText}>אין הודעות עדיין. שלח/י הודעה להתחיל.</Text>;
    }
    return messages.map((m) => (
      <View
        key={m.id}
        style={[styles.messageRow, m.isMe && styles.messageRowMe]}>
        {!m.isMe && (
          <View style={styles.senderLogoWrap}>
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.senderLogo} resizeMode="cover" />
            ) : (
              <Image source={require('../assets/image-copy-10.png')} style={styles.senderLogo} resizeMode="cover" />
            )}
          </View>
        )}
        <View style={[styles.bubbleWrap, m.isMe && styles.bubbleWrapMe]}>
          <View style={[styles.bubble, m.isMe ? styles.bubbleMe : styles.bubbleThem]}>
            <Text style={styles.bubbleText}>{m.body != null ? String(m.body) : ''}</Text>
            <Text style={styles.bubbleTime}>
              {m.createdAt
                ? new Date(m.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
                : ''}
            </Text>
          </View>
        </View>
      </View>
    ));
  };

  const canSend = isUser && myEmail && otherUserEmail && (inputText || '').trim().length > 0 && !sending;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
            <MaterialCommunityIcons name="account-box-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <MaterialCommunityIcons name="phone-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.chatBackground}>
          <Image
            source={require('../assets/972f5b75123630c3bea16f3d6af4cce23ce40ec8.jpg')}
            style={styles.chatBackgroundImage}
            resizeMode="cover"
          />
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            <Text style={styles.dateLabel}>היום</Text>
            {renderMessages()}
          </ScrollView>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="…הודעה"
            placeholderTextColor={TEXT_LIGHT}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            editable={isUser || isWelcome}
            writingDirection="rtl"
          />
          <TouchableOpacity
            style={[styles.sendBtn, canSend && styles.sendBtnActive]}
            onPress={handleSend}
            disabled={!canSend && !isWelcome}>
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons name="send" size={24} color={canSend || isWelcome ? '#fff' : TEXT_LIGHT} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: BG,
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
  // Slightly larger than the frame so cover crops less (subtle zoom-out vs full-bleed 100%).
  chatBackgroundImage: {
    position: 'absolute',
    left: '-7%',
    top: '-7%',
    width: '114%',
    height: '114%',
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
  messageRowMe: { justifyContent: 'flex-end' },
  senderLogoWrap: { marginBottom: 4, width: 32, height: 32 },
  senderLogo: { width: 32, height: 32, borderRadius: 16 },
  senderLogoPlaceholder: { backgroundColor: CARD_BG, alignItems: 'center', justifyContent: 'center' },
  bubbleWrap: { flex: 1, maxWidth: '85%', alignSelf: 'flex-start' },
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
  bubbleTime: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    color: 'rgba(55,53,72,0.7)',
    fontSize: 11,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 10,
    flexShrink: 0,
    ...(isWeb && {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    }),
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    backgroundColor: CARD_BG,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    paddingRight: 14,
    color: '#fff',
    fontSize: 16,
    textAlign: 'right',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(45, 212, 191, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: BUBBLE_ME },
});

export default ChatScreen;
