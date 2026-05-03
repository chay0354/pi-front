import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Animated,
  Easing,
  Platform,
  Dimensions,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Colors} from '../constants/styles';
import {
  getChatConversations,
  recordListingShare,
  sendChatMessage,
  sendGroupChatMessage,
} from '../utils/api';
import {getUserProfileImageUrl} from '../utils/userProfileImage';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');
const SHEET_HEIGHT = Math.min(640, Math.round(SCREEN_HEIGHT * 0.82));

const GOLD_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const GOLD_GRADIENT_LOCATIONS = [0.0456, 0.5076, 0.8831];

const pickUrl = v => {
  if (!v) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'object') {
    return (
      (typeof v.uri === 'string' && v.uri.trim()) ||
      (typeof v.image_url === 'string' && v.image_url.trim()) ||
      (typeof v.url === 'string' && v.url.trim()) ||
      null
    );
  }
  return null;
};

const firstImage = post => {
  if (!post) return null;
  if (Array.isArray(post.images) && post.images.length > 0) {
    for (const f of post.images) {
      const u = pickUrl(f);
      if (u && !/^text-post-placeholder$/i.test(u)) return u;
    }
  }
  if (Array.isArray(post.listing_images) && post.listing_images.length > 0) {
    for (const f of post.listing_images) {
      const u = pickUrl(f) || pickUrl(f?.image_url);
      if (u) return u;
    }
  }
  return (
    pickUrl(post.main_image_url) ||
    pickUrl(post.mainImageUrl) ||
    pickUrl(post.image_url) ||
    pickUrl(post.cover_url) ||
    pickUrl(post.thumbnail_url) ||
    null
  );
};

const videoUrl = post => {
  if (!post) return null;
  if (post.video && typeof post.video === 'object') return pickUrl(post.video);
  return pickUrl(post.video) || pickUrl(post.video_url);
};

const postCaption = post => {
  if (!post) return '';
  const c =
    post.description ||
    post.caption ||
    post.title ||
    post.post_caption ||
    post.post_description ||
    '';
  return String(c || '').trim();
};

/** Must match server CHAT_LISTING_ID_UUID_RE — chat stores ads.id for post cards. */
const AD_LISTING_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const listingUuidForShare = post => {
  if (!post || typeof post !== 'object') return null;
  const candidates = [post.id, post.ad_id, post.listing_id, post.uuid];
  for (const c of candidates) {
    if (c == null) continue;
    const s = String(c).trim();
    if (AD_LISTING_UUID_RE.test(s)) return s.toLowerCase();
  }
  return null;
};

const SharePostSheet = ({
  visible,
  post,
  currentUser,
  onClose,
  onShareToConversation,
  onShareCounted,
}) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingToId, setSendingToId] = useState(null);
  const [query, setQuery] = useState('');
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlay = useRef(new Animated.Value(0)).current;

  const myEmail = useMemo(
    () =>
      currentUser?.email ? String(currentUser.email).trim().toLowerCase() : null,
    [currentUser?.email],
  );

  const fetchList = useCallback(async () => {
    if (!myEmail) {
      setConversations([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getChatConversations(myEmail);
      const list = Array.isArray(res?.conversations) ? res.conversations : [];
      const mapped = list.map(c => ({
        id: c.otherUserEmail || c.id,
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
        preview: c.preview || '',
        time: c.time || '',
        lastMessageAt: c.lastMessageAt || null,
        listingId: c.listingId || null,
        listingCategoryLabel: c.listingCategoryLabel || null,
      }));
      setConversations(mapped);
    } catch (err) {
      console.warn('[SharePostSheet] fetch failed', err?.message || err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [myEmail]);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    fetchList();
    Animated.parallel([
      Animated.timing(overlay, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, fetchList, overlay, translateY]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(overlay, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (typeof onClose === 'function') onClose();
    });
  }, [onClose, overlay, translateY]);

  const handlePickConversation = async conv => {
    if (!conv || sendingToId) return;
    const imageUrl = firstImage(post);
    const caption = postCaption(post);
    const postId = listingUuidForShare(post);
    const senderDisplay = {
      name:
        currentUser?.name ||
        currentUser?.contact_person_name ||
        currentUser?.business_name ||
        null,
      profileImageUrl: getUserProfileImageUrl(currentUser) || null,
    };
    const receiverDisplay = {
      name: conv.name || null,
      profileImageUrl: conv.profileImageUrl || null,
    };
    setSendingToId(conv.id);
    try {
      if (conv.isGroup) {
        await sendGroupChatMessage(
          conv.id,
          myEmail,
          caption || 'פוסט משותף',
          imageUrl ? {type: 'image', url: imageUrl} : null,
          postId,
          true,
        );
      } else if (conv.otherUserEmail) {
        await sendChatMessage(
          myEmail,
          conv.otherUserEmail,
          caption || 'פוסט משותף',
          receiverDisplay,
          senderDisplay,
          imageUrl ? {type: 'image', url: imageUrl} : null,
          postId,
          true,
        );
      }
      if (postId) {
        recordListingShare(postId, 1)
          .then(serverCount => {
            if (typeof onShareCounted === 'function') {
              onShareCounted(postId, serverCount);
            }
          })
          .catch(() => {});
      }
      if (typeof onShareToConversation === 'function') {
        onShareToConversation(conv, post);
      }
      handleClose();
    } catch (err) {
      console.warn('[SharePostSheet] send failed', err?.message || err);
      if (typeof alert !== 'undefined') {
        alert(err?.message || 'שליחת ההודעה נכשלה');
      }
    } finally {
      setSendingToId(null);
    }
  };

  const q = (query || '').trim().toLowerCase();
  const filtered = q
    ? conversations.filter(
        c =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.preview || '').toLowerCase().includes(q),
      )
    : conversations;

  const preview = firstImage(post);
  const caption = postCaption(post);

  const renderConversation = ({item}) => {
    const initial = (item.name || '?').slice(0, 1).toUpperCase();
    const isSending = sendingToId === item.id;
    const disabled = !!sendingToId;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={disabled}
        style={[styles.row, disabled && !isSending && {opacity: 0.5}]}
        onPress={() => handlePickConversation(item)}>
        <View style={styles.avatarWrap}>
          {item.profileImageUrl ? (
            <Image
              source={{uri: item.profileImageUrl}}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={GOLD_GRADIENT}
              locations={GOLD_GRADIENT_LOCATIONS}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </LinearGradient>
          )}
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.preview ? (
            <Text style={styles.rowPreview} numberOfLines={1}>
              {item.preview}
            </Text>
          ) : null}
        </View>
        <LinearGradient
          colors={GOLD_GRADIENT}
          locations={GOLD_GRADIENT_LOCATIONS}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.sendBadge}>
          {isSending ? (
            <ActivityIndicator size="small" color="#1E1D27" />
          ) : (
            <MaterialCommunityIcons name="send" size={16} color="#1E1D27" />
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.overlay,
            {opacity: overlay},
          ]}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {transform: [{translateY}]},
          ]}>
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>

          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>שליחה בצ׳אט</Text>
          </View>

          <View style={styles.previewCard}>
            <View style={styles.previewImageWrap}>
              {preview ? (
                <Image
                  source={{uri: preview}}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.previewImage,
                    {backgroundColor: '#373548'},
                  ]}
                />
              )}
            </View>
            <View style={styles.previewTextWrap}>
              <Text style={styles.previewLabel}>פוסט להעברה</Text>
              <Text style={styles.previewCaption} numberOfLines={2}>
                {caption || 'פוסט'}
              </Text>
            </View>
          </View>

          <View style={styles.searchRow}>
            <MaterialCommunityIcons
              name="magnify"
              size={18}
              color="rgba(255,255,255,0.6)"
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="חיפוש אנשי קשר"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.searchInput}
              textAlign="right"
              writingDirection="rtl"
            />
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#F4AD39" />
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {q ? 'לא נמצאו תוצאות' : 'אין שיחות לשתף אליהן עדיין'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => String(item.id)}
              renderItem={renderConversation}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#1E1D27',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  grabberWrap: {alignItems: 'center', paddingVertical: 6},
  grabber: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
  },
  previewCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#2B2A39',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  previewImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#373548',
  },
  previewImage: {width: '100%', height: '100%'},
  previewTextWrap: {flex: 1, alignItems: 'flex-end'},
  previewLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginBottom: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  previewCaption: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  searchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2B2A39',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 4,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#373548',
  },
  avatarImage: {width: '100%', height: '100%'},
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {color: '#1E1D27', fontSize: 18, fontFamily: 'Rubik-Medium'},
  rowText: {flex: 1, alignItems: 'flex-end'},
  rowName: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rowPreview: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sendBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{scaleX: -1}],
  },
  loadingWrap: {paddingVertical: 32, alignItems: 'center'},
  emptyWrap: {paddingVertical: 32, alignItems: 'center'},
  emptyText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default SharePostSheet;
