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
import { getSubscription } from '../utils/api';

const TEAL = '#2DD4BF';
const GOLD = '#ffc40a';
const CARD_BG = '#252436';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LAST_AD_IMAGE_HEIGHT = 280;
const SMART_BTN_SIZE = Math.floor((SCREEN_WIDTH - 48 - 10) / 2); // 2 cols, padding 24*2, gap 10

const callIcon = require('../assets/call.png');
const messageIcon = require('../assets/message.png');
const piBadgeIcon = require('../assets/pi-badge.png');

const isWeb = Platform.OS === 'web';
const baseUrl = isWeb && typeof window !== 'undefined' ? window.location.origin : '';
const callSource = isWeb ? { uri: `${baseUrl}/call.png` } : callIcon;
const messageSource = isWeb ? { uri: `${baseUrl}/message.png` } : messageIcon;
const piBadgeSource = isWeb ? { uri: `${baseUrl}/pi-badge.png` } : piBadgeIcon;

const logoPiAi = require('../assets/ai/image.png');
const buttonAssets = [
  require('../assets/ai/icons (1).png'),
  require('../assets/ai/icons (2).png'),
  require('../assets/ai/icons (3).png'),
  require('../assets/ai/icons (4).png'),
  require('../assets/ai/icons (5).png'),
  require('../assets/ai/icons (6).png'),
  require('../assets/ai/icons (7).png'),
  require('../assets/ai/icons (8).png'),
];
const buttonSources = isWeb
  ? [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ uri: `${baseUrl}/ai-icon-${i}.png` }))
  : buttonAssets;
const SMART_BUTTONS = [
  { label: 'תחבורה', key: 'transport' },
  { label: 'ביטחון', key: 'security' },
  { label: 'בתי ספר', key: 'schools' },
  { label: 'מטרדים', key: 'pests' },
  { label: 'מחיר ממוצע', key: 'avgprice' },
  { label: 'מוסדות', key: 'institutions' },
  { label: 'החיים בשכונה', key: 'neighborhood' },
  { label: 'מרכזי קניות', key: 'shopping' },
];

const UserProfileScreen = ({
  onClose,
  onCall,
  onMessage,
  user = null,
}) => {
  // user = listing from feed: has creator_name, creator_email, profileImageUrl, subscription_id, owner_id (from GET /api/listings). If creator_* missing, we fetch by subscription_id (getSubscription).
  const isListingFromFeed = user && (user.images || user.price || user.address);
  const profile = !isListingFromFeed && user ? user : {
    name: 'דוד לוי תיווך בע"מ',
    email: 'davidlevi@gmail.com',
    profileImageUrl: null,
    likes: 246,
    following: 626,
    followers: 257,
  };

  // [UserProfile] Log how we resolve user details (filter console by "UserProfile" to see)
  const creatorId = user?.subscription_id || user?.owner_id;
  if (__DEV__ && isListingFromFeed && user) {
    console.log('[UserProfile] Incoming listing (user):', {
      listingId: user?.id,
      creator_name: user?.creator_name,
      creator_email: user?.creator_email,
      subscription_id: user?.subscription_id,
      owner_id: user?.owner_id,
      business_name: user?.business_name,
      name: user?.name,
      email: user?.email,
      profileImageUrl: user?.profileImageUrl != null ? '(set)' : null,
    });
  }

  // When feed didn't return creator, fetch by subscription_id / owner_id
  const [resolvedCreator, setResolvedCreator] = useState(null);
  useEffect(() => {
    setResolvedCreator(null);
  }, [user?.id, creatorId]);
  useEffect(() => {
    if (!isListingFromFeed || !creatorId) {
      if (__DEV__ && isListingFromFeed) {
        console.log('[UserProfile] Skip fetch: creatorId=', creatorId, '(no subscription_id/owner_id on listing)');
      }
      return;
    }
    const nameFromListing = user?.business_name || user?.creator_name || user?.name;
    const emailFromListing = user?.creator_email || user?.email;
    const isPlaceholder = (nameFromListing === 'מתווך' && (emailFromListing === 'broker-placeholder@example.com' || (emailFromListing && emailFromListing.includes('placeholder')))) || (emailFromListing && emailFromListing.includes('@placeholder.local'));
    if (nameFromListing && emailFromListing && !isPlaceholder) {
      if (__DEV__) console.log('[UserProfile] Skip fetch: already have creator from listing');
      return;
    }
    if (__DEV__) console.log('[UserProfile] Fetching subscription for creatorId=', creatorId);
    let cancelled = false;
    getSubscription(creatorId)
      .then((data) => {
        if (__DEV__) {
          console.log('[UserProfile] getSubscription response:', {
            success: data?.success,
            hasSubscription: !!data?.subscription,
            name: data?.subscription?.name ?? data?.subscription?.business_name ?? data?.subscription?.broker_office_name,
            email: data?.subscription?.email,
          });
        }
        if (cancelled || !data?.subscription) return;
        const s = data.subscription;
        const type = (s.subscription_type || '').toLowerCase();
        let name = null;
        if (type === 'company') name = s.business_name || s.name || s.contact_person_name || null;
        else if (type === 'broker') name = s.broker_office_name || s.name || s.contact_person_name || null;
        else name = s.name || s.business_name || s.contact_person_name || null;
        setResolvedCreator({
          name: name || null,
          email: s.email || null,
          profilePictureUrl: s.profile_picture_url || null,
        });
      })
      .catch((err) => {
        if (__DEV__) console.warn('[UserProfile] getSubscription error:', err?.message || err);
      });
    return () => { cancelled = true; };
  }, [isListingFromFeed, creatorId, user?.id]);

  // Treat placeholder creator (מתווך / broker-placeholder@...) as missing – show "משתמש", hide email
  const isPlaceholderCreator = (name, email) => {
    const n = (name && String(name).trim()) || '';
    const e = (email && String(email).trim()) || '';
    return (n === 'מתווך' && (e === 'broker-placeholder@example.com' || e.includes('placeholder'))) || e.includes('@placeholder.local');
  };
  const rawNameFromSource = user?.business_name || user?.creator_name || user?.name || user?.agent_name || user?.contact_person_name || user?.broker_office_name || resolvedCreator?.name || (isListingFromFeed ? '' : profile.name);
  const rawEmailFromSource = user?.creator_email || user?.email || resolvedCreator?.email || (isListingFromFeed ? '' : profile.email);
  const rawName = isPlaceholderCreator(rawNameFromSource, rawEmailFromSource) ? (isListingFromFeed ? '' : rawNameFromSource) : rawNameFromSource;
  const rawEmail = isPlaceholderCreator(rawNameFromSource, rawEmailFromSource) ? (isListingFromFeed ? '' : rawEmailFromSource) : rawEmailFromSource;
  const displayName = rawName && String(rawName).trim() ? String(rawName).trim() : (isListingFromFeed ? 'משתמש' : profile.name);
  const displayEmail = rawEmail && String(rawEmail).trim() ? String(rawEmail).trim() : (isListingFromFeed ? null : profile.email);
  const displayImage = user?.profileImageUrl || user?.profile_image_url || user?.creator_profile_image_url || resolvedCreator?.profilePictureUrl || profile.profileImageUrl;

  if (__DEV__ && isListingFromFeed) {
    console.log('[UserProfile] Resolved display:', { rawName, rawEmail, displayName, displayEmail: displayEmail ?? '(hidden)' });
  }

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
  const lastAdCardWidth = SCREEN_WIDTH;

  const likesCount = user?.like_count ?? profile.likes ?? 0;
  const followersCount = profile.followers ?? 257;
  const followingCount = profile.following ?? 626;

  // Broker profile card data (real user details with fallbacks)
  const brokerProfession = user?.profession ?? user?.title ?? profile.profession ?? 'מתווך נדל״ן';
  const brokerAddress = user?.address ?? user?.location ?? lastAd?.address ?? lastAd?.location ?? profile.address ?? 'אבן גבירול 104, תל אביב';
  const specialtiesRaw = user?.creator_specialties ?? user?.specialties ?? user?.specialties_list ?? profile.specialties;
  const brokerSpecialties = Array.isArray(specialtiesRaw)
    ? specialtiesRaw
    : typeof specialtiesRaw === 'string'
      ? specialtiesRaw.split(',').map(s => s.trim()).filter(Boolean)
      : [];
  const activityRegionsRaw = user?.creator_activity_regions ?? user?.activity_regions ?? resolvedCreator?.activity_regions ?? profile?.activity_regions;
  const activityRegions = Array.isArray(activityRegionsRaw)
    ? activityRegionsRaw
    : typeof activityRegionsRaw === 'string'
      ? (() => { try { const p = JSON.parse(activityRegionsRaw); return Array.isArray(p) ? p : activityRegionsRaw.split(',').map(s => s.trim()).filter(Boolean); } catch (_) { return activityRegionsRaw.split(',').map(s => s.trim()).filter(Boolean); } })()
      : [];
  const brokerBio = user?.creator_bio ?? user?.bio ?? resolvedCreator?.description ?? profile?.bio ?? profile?.description ?? null;
  const brokerPiRating = user?.pi_value ?? lastAd?.pi_value ?? profile?.pi_value ?? 5;

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
          <View style={styles.nameAndStatsRow}>
            <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{String(likesCount)}</Text>
                <Text style={styles.statLabel}>לייקים</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{String(followersCount)}</Text>
                <Text style={styles.statLabel}>עוקבים</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{String(followingCount)}</Text>
                <Text style={styles.statLabel}>עוקב</Text>
              </View>
            </View>
          </View>
          {displayEmail != null && displayEmail !== '' ? (
            <Text style={styles.userEmail}>{displayEmail}</Text>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          <Image source={callSource} style={styles.actionBtnImage} resizeMode="contain" />
          <Image source={messageSource} style={styles.actionBtnImage} resizeMode="contain" />
        </View>

        {/* Last ad card - full width, no bubble */}
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
              <View style={styles.lastAdPiAndPurposeRow}>
                <View style={styles.lastAdPiBadge}>
                  <Image source={piBadgeSource} style={styles.lastAdPiBadgeImage} resizeMode="contain" />
                  <Text style={styles.lastAdPiText}>{String(lastAd.pi_value ?? 5)}</Text>
                </View>
                <View style={styles.lastAdPurposeTag}>
                  <Text style={styles.lastAdPurposeText}>{lastAd.purpose || 'להשכרה'}</Text>
                </View>
              </View>
              <View style={styles.lastAdPriceRow}>
                <Text style={styles.lastAdPrice}>{lastAd.price || '₪5,000'}</Text>
              </View>
              <View style={styles.lastAdLocationRow}>
                <MaterialCommunityIcons name="map-marker" size={18} color="rgba(255,255,255,0.9)" />
                <Text style={styles.lastAdLocationText}>{lastAd.address || lastAd.location || 'תל אביב, אבן גבירול 104'}</Text>
              </View>
              <View style={styles.lastAdDivider} />
              <View style={styles.lastAdPostedBy}>
                <Text style={styles.lastAdPostedByLabel}>פורסם ע"י</Text>
                <View style={styles.lastAdPostedByRow}>
                  <Text style={styles.lastAdPostedByName}>{lastAd.creator_name || displayName}</Text>
                  {(lastAd.profileImageUrl || displayImage) ? (
                    <Image source={{ uri: lastAd.profileImageUrl || displayImage }} style={styles.lastAdPostedByAvatar} resizeMode="cover" />
                  ) : (
                    <View style={[styles.lastAdPostedByAvatar, styles.lastAdPostedByAvatarPlaceholder]}>
                      <MaterialCommunityIcons name="account" size={14} color="#fff" />
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.lastAdDescription} numberOfLines={6}>
                {lastAd.description || 'דירה מרווחת ומוארת בלב תל אביב. קרובה למרכזי בילוי, תחבורה ציבורית ופארקים. משופצת מהיסוד עם חומרים איכותיים. הזדמנות שלא תחזור!'}
              </Text>
              <View style={styles.lastAdDividerWhite} />
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
              <View style={styles.lastAdDividerWhite} />
            </View>
          </View>
        )}

        <View style={styles.profileDivider} />
        {/* PiAi smart info at bottom: logo, intro text, 8 buttons (PNGs from ai except image.png) */}
        <View style={styles.smartInfoBlock}>
          <Image source={logoPiAi} style={styles.smartInfoLogo} resizeMode="contain" />
          <Text style={styles.smartInfoIntro}>קבל מידע חכם על סביבת הנכס בלחיצת כפתור</Text>
          <View style={styles.smartInfoGrid}>
            {SMART_BUTTONS.map((item, index) => (
              <TouchableOpacity
                key={item.key}
                style={styles.smartInfoBtn}
                onPress={() => {}}
                activeOpacity={0.8}
              >
                <Text style={styles.smartInfoBtnLabel}>{item.label}</Text>
                <Image source={buttonSources[index]} style={styles.smartInfoBtnIcon} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Broker profile – real user details (no card container) */}
        <View style={styles.brokerBlock}>
          <View style={styles.brokerCardPiBadge}>
            <Image source={piBadgeSource} style={styles.brokerCardPiIcon} resizeMode="contain" />
            <Text style={styles.brokerCardPiText}>{String(brokerPiRating)}</Text>
          </View>
          <Text style={styles.brokerCardTitle}>{displayName}</Text>
          <View style={styles.brokerCardLocation}>
            <Text style={styles.brokerCardAddress}>{brokerAddress}</Text>
            <MaterialCommunityIcons name="map-marker" size={16} color={Colors.grey200} />
          </View>
          {(activityRegions.length > 0 || brokerSpecialties.length > 0) && (
            <>
              <Text style={styles.brokerCardSectionTitle}>התמחויות</Text>
              <View style={styles.brokerCardSpecialties}>
                {(activityRegions.length > 0 ? activityRegions : brokerSpecialties).map((s, i) => (
                  <View key={i} style={styles.brokerCardTag}>
                    <Text style={styles.brokerCardTagText}>{typeof s === 'string' ? s : (s?.label ?? s?.name ?? String(s))}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          {brokerBio ? <Text style={styles.brokerCardBio}>{brokerBio}</Text> : null}
        </View>
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
  nameAndStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
  userName: { color: '#fff', fontSize: 22, fontWeight: '700', flex: 1, textAlign: 'right', marginRight: 12 },
  userEmail: { color: Colors.grey200, fontSize: 14, marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 },
  stat: { alignItems: 'center' },
  statNumber: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statLabel: { color: Colors.grey200, fontSize: 12, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 8, paddingHorizontal: 24, backgroundColor: Colors.mainDeepBlue },
  actionBtnImage: { width: 120, height: 46 },
  profileDivider: { height: 2, backgroundColor: '#555', marginVertical: 16, alignSelf: 'stretch', marginHorizontal: 24 },

  smartInfoBlock: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, alignItems: 'center' },
  smartInfoLogo: { width: 110, height: 38, marginBottom: 12 },
  smartInfoIntro: { color: '#fff', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  smartInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', gap: 10 },
  smartInfoBtn: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CARD_BG, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10 },
  smartInfoBtnIcon: { width: 22, height: 22 },
  smartInfoBtnLabel: { color: '#fff', fontSize: 12, fontWeight: '600', flex: 1 },

  brokerBlock: { paddingHorizontal: 24, marginBottom: 32 },
  brokerCardPiBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 0, paddingHorizontal: 0, marginBottom: 8 },
  brokerCardPiIcon: { width: 64, height: 64 },
  brokerCardPiText: { color: GOLD, fontSize: 16, fontWeight: '700' },
  brokerCardTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  brokerCardLocation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 16 },
  brokerCardAddress: { color: Colors.grey200, fontSize: 14, textAlign: 'right' },
  brokerCardSectionTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  brokerCardSpecialties: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  brokerCardTag: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  brokerCardTagText: { color: '#fff', fontSize: 13 },
  brokerCardBio: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 22, textAlign: 'right' },

  lastAdCard: { width: '100%', backgroundColor: Colors.mainDeepBlue, marginBottom: 24 },
  lastAdImageWrap: { width: SCREEN_WIDTH, height: LAST_AD_IMAGE_HEIGHT, backgroundColor: 'rgba(255,255,255,0.08)' },
  lastAdImage: { height: LAST_AD_IMAGE_HEIGHT },
  lastAdImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  lastAdPiAndPurposeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 },
  lastAdPiBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 0, paddingHorizontal: 0 },
  lastAdPiBadgeImage: { width: 64, height: 64 },
  lastAdPiText: { color: GOLD, fontSize: 16, fontWeight: '700' },
  lastAdDots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  lastAdDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  lastAdDotActive: { backgroundColor: GOLD, width: 8, height: 8, borderRadius: 4 },
  lastAdExpandWrap: { position: 'absolute', bottom: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  lastAdBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, alignItems: 'flex-end' },
  lastAdPurposeTag: { backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  lastAdPurposeText: { color: '#1a1a1e', fontSize: 14, fontWeight: '600' },
  lastAdPriceRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 6 },
  lastAdPrice: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'right' },
  lastAdLocationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 10 },
  lastAdLocationText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, textAlign: 'right' },
  lastAdDivider: { height: 2, backgroundColor: '#555', marginVertical: 12, alignSelf: 'stretch' },
  lastAdPostedBy: { alignItems: 'flex-end', marginBottom: 8 },
  lastAdPostedByLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'right', marginBottom: 4 },
  lastAdPostedByRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  lastAdPostedByName: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'right' },
  lastAdPostedByAvatar: { width: 24, height: 24, borderRadius: 12 },
  lastAdPostedByAvatarPlaceholder: { backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  lastAdDescription: { color: '#fff', fontSize: 14, lineHeight: 22, textAlign: 'right' },
  lastAdDividerWhite: { height: 2, backgroundColor: '#555', marginVertical: 16, alignSelf: 'stretch' },
  lastAdFeaturesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 0 },
  lastAdFeatureChip: { width: '48%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, gap: 10 },
  lastAdFeatureIcon: { marginRight: 4 },
  lastAdFeatureLabel: { color: '#fff', fontSize: 14 },
});

export default UserProfileScreen;
