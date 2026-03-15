import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {getConversationWithWelcomeMessage} from '../utils/chatDefaults';
import {getChatConversations} from '../utils/api';

const BG = '#1a1926';
const CARD_BG = '#252436';
const GOLD = '#D4AF37';
const TEXT_LIGHT = 'rgba(255,255,255,0.7)';
const CHAT_BG = '#373548';

const PI_CONV = getConversationWithWelcomeMessage('1', 'pi');

/**
 * Chat list: Pi welcome + real conversations from API. Tapping opens the chat.
 */
const ChatListScreen = ({onClose, onOpenChat, currentUser = null, refreshKey = 0}) => {
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        name: c.name || 'משתמש',
        profileImageUrl: c.profileImageUrl || null,
        preview: c.preview || '',
        time: c.time || '',
      }));
      setConversations([PI_CONV, ...asConv]);
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

  const filtered = search.trim()
    ? conversations.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(search.trim().toLowerCase()) ||
          (c.preview || '').toLowerCase().includes(search.trim().toLowerCase())
      )
    : conversations;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerBackBtn} activeOpacity={0.7} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.logoWrap}>
          <Image
            source={require('../assets/image-copy-9.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <View style={styles.plusCircle}>
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="חפש"
          placeholderTextColor={TEXT_LIGHT}
          value={search}
          onChangeText={setSearch}
        />
        <MaterialCommunityIcons name="magnify" size={22} color={TEXT_LIGHT} style={styles.searchIcon} />
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
          {filtered.map((conv, index) => (
            <TouchableOpacity
              key={conv.id ?? conv.name ?? `conv-${index}`}
              style={styles.messageRow}
              onPress={() => onOpenChat && onOpenChat(conv)}
              activeOpacity={0.8}>
              <View style={styles.bubbleWrap}>
                <Text style={styles.rowTime}>{conv.time != null ? String(conv.time) : ''}</Text>
                <Text style={styles.messageBubble} numberOfLines={2}>
                  {conv.preview != null ? String(conv.preview) : 'אין הודעות'}
                </Text>
              </View>
              <View style={styles.avatarWrap}>
                {conv.id === '1' ? (
                  <Image source={require('../assets/image-copy-10.png')} style={styles.avatarImage} resizeMode="cover" />
                ) : conv.profileImageUrl ? (
                  <Image source={{ uri: conv.profileImageUrl }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Image source={require('../assets/image-copy-10.png')} style={styles.avatarImage} resizeMode="cover" />
                )}
                <Text style={styles.senderName}>{conv.name != null ? String(conv.name) : 'משתמש'}</Text>
              </View>
            </TouchableOpacity>
          ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerBtn: { padding: 4 },
  headerBackBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { height: 28, width: 107 },
  plusCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingRight: 44,
    color: '#fff',
    fontSize: 16,
    textAlign: 'right',
  },
  searchIcon: { position: 'absolute', right: 14 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: TEXT_LIGHT, fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 0, paddingVertical: 16, paddingBottom: 32, backgroundColor: BG, flexGrow: 1 },
  scrollContentInner: { flexGrow: 1 },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 12,
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: CHAT_BG,
    borderRadius: 0,
    padding: 14,
    paddingHorizontal: 16,
  },
  bubbleWrap: {
    flex: 1,
    maxWidth: '85%',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  rowTime: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 8,
  },
  messageBubble: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
    color: '#fff',
    fontSize: 15,
    textAlign: 'right',
    lineHeight: 22,
  },
  avatarWrap: { alignItems: 'center' },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleUser: { borderColor: 'rgba(255,255,255,0.2)' },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  avatarPi: { color: '#fff', fontSize: 10, fontFamily: 'Rubik-Medium' },
  avatarNum: { color: GOLD, fontSize: 9 },
  senderName: { color: TEXT_LIGHT, fontSize: 12, marginTop: 4 },
});

export default ChatListScreen;
