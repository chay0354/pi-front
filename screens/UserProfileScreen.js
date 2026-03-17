import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/styles';

const TEAL = '#2DD4BF';
const GOLD = '#ffc40a';
const CARD_BG = '#252436';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LAST_AD_IMAGE_HEIGHT = 280;

const callIcon = require('../assets/call.png');
const messageIcon = require('../assets/message.png');

const isWeb = Platform.OS === 'web';
const baseUrl = isWeb && typeof window !== 'undefined' ? window.location.origin : '';
const callSource = isWeb ? { uri: `${baseUrl}/call.png` } : callIcon;
const messageSource = isWeb ? { uri: `${baseUrl}/message.png` } : messageIcon;

const UserProfileScreen = ({
  onClose,
  onCall,
  onMessage,
  user = null,
}) => {
  // user from feed is the full listing (has creator_name, profileImageUrl, creator_email, images, price, address, description, purpose, like_count, etc.)
  const isListingFromFeed = user && (user.images || user.price || user.address);
  const profile = !isListingFromFeed && user ? user : {
    name: 'דוד לוי תיווך בע"מ',
    email: 'davidlevi@gmail.com',
    profileImageUrl: null,
    likes: 246,
    following: 626,
    followers: 257,
  };

  const displayName = user?.creator_name || user?.name || user?.agent_name || user?.contact_person_name || user?.business_name || user?.broker_office_name || profile.name;
  const displayEmail = user?.creator_email || user?.email || profile.email;
  const displayImage = user?.profileImageUrl || user?.profile_image_url || user?.creator_profile_image_url || profile.profileImageUrl;

  // Last ad: when opened from feed, the current listing is the "last ad"
  const lastAd = isListingFromFeed ? user : (profile.properties && profile.properties[0]) ? {
    images: profile.properties[0].image ? [{ uri: profile.properties[0].image }] : [],
    price: profile.properties[0].price,
    address: profile.properties[0].address,
    purpose: profile.properties[0].status || 'להשכרה',
    description: '',
    creator_name: displayName,
    profileImageUrl: displayImage,
  } : null;

  const lastAdImages = lastAd?.images && lastAd.images.length > 0
    ? lastAd.images.map(img => (typeof img === 'string' ? { uri: img } : img))
    : [];
  const [lastAdImageIndex, setLastAdImageIndex] = useState(0);
  const lastAdCarouselRef = useRef(null);
  const lastAdCardWidth = SCREEN_WIDTH - 40;

  const likesCount = user?.like_count ?? profile.likes ?? 0;
  const followersCount = profile.followers ?? 257;
  const followingCount = profile.following ?? 626;

  // Build property features from ad data for the grid (rooms, area, floor, condition, amenities)
  const adFeatures = React.useMemo(() => {
    if (!lastAd) return [];
    const list = [];
    const r = lastAd.rooms != null && lastAd.rooms !== '' ? Number(lastAd.rooms) : null;
    if (r != null && !isNaN(r)) list.push({ icon: 'door-open', label: `${r} חדרים` });
    const a = lastAd.area != null && lastAd.area !== '' ? Number(lastAd.area) : null;
    if (a != null && !isNaN(a)) list.push({ icon: 'square-outline', label: `${a} מ"ר` });
    const f = lastAd.floor != null && lastAd.floor !== '' ? Number(lastAd.floor) : null;
    if (f != null && !isNaN(f)) list.push({ icon: 'stairs', label: `קומה ${f}` });
    const cond = lastAd.condition && String(lastAd.condition).trim();
    if (cond) {
      const condLabel = cond === 'renovated' || cond === 'משופץ' ? 'משופץ' : cond === 'new' || cond === 'חדש' ? 'חדש' : cond === 'old' || cond === 'ישן' ? 'ישן' : cond;
      list.push({ icon: 'brush', label: condLabel });
    }
    const am = lastAd.amenities && typeof lastAd.amenities === 'object' ? lastAd.amenities : null;
    if (am) {
      const parking = am.parking ?? am.parking_spaces;
      if (parking != null) list.push({ icon: 'car-side', label: typeof parking === 'number' ? `חנייה ${parking}` : 'חנייה' });
      if (am.balcony || am.mirpeset) list.push({ icon: 'view-grid-outline', label: 'מרפסת' });
      if (am.elevator || am.maala) list.push({ icon: 'elevator-passenger', label: 'מעלית' });
      if (am.mamad || am.mamad_room) list.push({ icon: 'shield-home', label: 'ממ"ד' });
      if (am.immediate_entry || am.entry_immediate) list.push({ icon: 'door-arrow-right', label: 'כניסה מיידית' });
    }
    return list;
  }, [lastAd]);

  useEffect(() => {
    if (lastAdImages.length <= 1) return;
    const t = setInterval(() => {
      setLastAdImageIndex(prev => {
        const next = (prev + 1) % lastAdImages.length;
        lastAdCarouselRef.current?.scrollToOffset({ offset: next * lastAdCardWidth, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [lastAdImages.length, lastAdCardWidth]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileBlock}>
          <View style={styles.avatarWrap}>
            {displayImage ? (
              <Image source={{ uri: displayImage }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialCommunityIcons name="account" size={48} color="rgba(255,255,255,0.6)" />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons name="plus" size={16} color="#000" />
            </View>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{displayEmail}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{likesCount}</Text>
              <Text style={styles.statLabel}>לייקים</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>עוקבים</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>עוקב</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onCall?.()} activeOpacity={0.8}>
              <Image source={callSource} style={styles.actionBtnImage} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onMessage?.()} activeOpacity={0.8}>
              <Image source={messageSource} style={styles.actionBtnImage} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Last ad card - image, price, location, posted by, description (match design) */}
        {lastAd && (
          <View style={styles.lastAdCard}>
            <View style={styles.lastAdImageWrap}>
              {lastAdImages.length > 0 ? (
                <>
                  <FlatList
                    ref={lastAdCarouselRef}
                    data={lastAdImages}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={e => {
                      const i = Math.round(e.nativeEvent.contentOffset.x / lastAdCardWidth);
                      setLastAdImageIndex(i);
                    }}
                    renderItem={({ item }) => (
                      <Image source={item} style={[styles.lastAdImage, { width: lastAdCardWidth }]} resizeMode="cover" />
                    )}
                    keyExtractor={(_, i) => String(i)}
                  />
                  <View style={styles.lastAdPiBadge}>
                    <MaterialCommunityIcons name="star" size={18} color={GOLD} />
                    <Text style={styles.lastAdPiText}>5 Pi</Text>
                  </View>
                  {lastAdImages.length > 1 && (
                    <View style={styles.lastAdDots}>
                      {lastAdImages.slice(0, 5).map((_, i) => (
                        <View
                          key={i}
                          style={[styles.lastAdDot, i === lastAdImageIndex && styles.lastAdDotActive]}
                        />
                      ))}
                    </View>
                  )}
                  <View style={styles.lastAdExpandWrap}>
                    <MaterialCommunityIcons name="arrow-expand" size={20} color="#fff" />
                  </View>
                </>
              ) : (
                <View style={[styles.lastAdImage, styles.lastAdImagePlaceholder]}>
                  <MaterialCommunityIcons name="image-outline" size={64} color="rgba(255,255,255,0.3)" />
                </View>
              )}
            </View>

            <View style={styles.lastAdBody}>
              <View style={styles.lastAdPriceRow}>
                <Text style={styles.lastAdPrice}>{lastAd.price || '₪5,000'}</Text>
                <View style={styles.lastAdPurposeTag}>
                  <Text style={styles.lastAdPurposeText}>{lastAd.purpose || 'להשכרה'}</Text>
                </View>
              </View>
              <View style={styles.lastAdLocationRow}>
                <MaterialCommunityIcons name="map-marker" size={18} color="rgba(255,255,255,0.9)" />
                <Text style={styles.lastAdLocationText}>{lastAd.address || lastAd.location || 'תל אביב, אבן גבירול 104'}</Text>
              </View>
              <View style={styles.lastAdDivider} />
              <View style={styles.lastAdPostedBy}>
                <Text style={styles.lastAdPostedByLabel}>פורסם ע"י </Text>
                <Text style={styles.lastAdPostedByName}>{lastAd.creator_name || displayName}</Text>
                {(lastAd.profileImageUrl || displayImage) ? (
                  <Image source={{ uri: lastAd.profileImageUrl || displayImage }} style={styles.lastAdPostedByAvatar} resizeMode="cover" />
                ) : (
                  <View style={[styles.lastAdPostedByAvatar, styles.lastAdPostedByAvatarPlaceholder]}>
                    <MaterialCommunityIcons name="account" size={14} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={styles.lastAdDescription} numberOfLines={6}>
                {lastAd.description || 'דירה מרווחת ומוארת בלב תל אביב. קרובה למרכזי בילוי, תחבורה ציבורית ופארקים. משופצת מהיסוד עם חומרים איכותיים. הזדמנות שלא תחזור!'}
              </Text>
              {adFeatures.length > 0 && (
                <View style={styles.lastAdFeaturesGrid}>
                  {adFeatures.map((item, index) => (
                    <View key={`${item.label}-${index}`} style={styles.lastAdFeatureChip}>
                      <MaterialCommunityIcons name={item.icon} size={22} color={GOLD} style={styles.lastAdFeatureIcon} />
                      <Text style={styles.lastAdFeatureLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mainDeepBlue },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 8 },
  backBtn: { padding: 4, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  profileBlock: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: GOLD },
  avatarPlaceholder: { backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  userName: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  userEmail: { color: Colors.grey200, fontSize: 14, marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, marginBottom: 20 },
  stat: { alignItems: 'center' },
  statNumber: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statLabel: { color: Colors.grey200, fontSize: 12, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 24, minWidth: 120, backgroundColor: 'transparent' },
  actionBtnImage: { width: 120, height: 46 },

  lastAdCard: { marginHorizontal: 20, backgroundColor: CARD_BG, borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  lastAdImageWrap: { width: SCREEN_WIDTH - 40, height: LAST_AD_IMAGE_HEIGHT, backgroundColor: 'rgba(255,255,255,0.08)' },
  lastAdImage: { height: LAST_AD_IMAGE_HEIGHT },
  lastAdImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  lastAdPiBadge: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  lastAdPiText: { color: GOLD, fontSize: 14, fontWeight: '600' },
  lastAdDots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  lastAdDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  lastAdDotActive: { backgroundColor: GOLD, width: 8, height: 8, borderRadius: 4 },
  lastAdExpandWrap: { position: 'absolute', bottom: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  lastAdBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  lastAdPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  lastAdPrice: { color: '#fff', fontSize: 24, fontWeight: '700' },
  lastAdPurposeTag: { backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  lastAdPurposeText: { color: '#1a1a1e', fontSize: 14, fontWeight: '600' },
  lastAdLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  lastAdLocationText: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  lastAdDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 10 },
  lastAdPostedBy: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 },
  lastAdPostedByLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  lastAdPostedByName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  lastAdPostedByAvatar: { width: 24, height: 24, borderRadius: 12, marginLeft: 6 },
  lastAdPostedByAvatarPlaceholder: { backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  lastAdDescription: { color: '#fff', fontSize: 14, lineHeight: 22, textAlign: 'right' },
  lastAdFeaturesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  lastAdFeatureChip: { width: '48%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, gap: 10 },
  lastAdFeatureIcon: { marginRight: 4 },
  lastAdFeatureLabel: { color: '#fff', fontSize: 14 },
});

export default UserProfileScreen;
