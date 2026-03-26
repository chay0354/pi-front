import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/styles';
import { getListings } from '../utils/api';
import { getUserProfileImageUrl } from '../utils/userProfileImage';


const GOLD = '#ffc40a';
const CARD_BG = '#252436';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_IMAGE_HEIGHT = 200;

const UserListingsScreen = ({ creatorId, displayName = '', onClose }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!creatorId) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getListings({ subscription_id: creatorId })
      .then((result) => {
        if (result.success && Array.isArray(result.listings)) {
          setListings(result.listings);
        } else {
          setListings([]);
        }
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [creatorId]);

  const renderCard = ({ item }) => {
    const imgs = item.listing_images || [];
    const firstImg = imgs[0]?.image_url;
    const purposeRaw = item.purpose || item.search_purpose || '';
    const purposeLabel =
      purposeRaw === 'sale' || String(purposeRaw).toLowerCase() === 'sale' || purposeRaw === 'מכירה'
        ? 'למכירה'
        : 'להשכרה';
    const priceNum = item.price != null ? Number(item.price) : null;
    const priceStr =
      priceNum != null && !isNaN(priceNum) ? `₪${Math.round(priceNum).toLocaleString('he-IL')}` : '—';
    const locBase = (item.address || item.land_address || item.search_address || '').trim();
    const parcel =
      item.land_parcel != null && String(item.land_parcel).trim()
        ? `חלקה ${String(item.land_parcel).trim()}`
        : '';
    const block =
      item.land_block != null && String(item.land_block).trim()
        ? `גוש ${String(item.land_block).trim()}`
        : '';
    const location = [locBase, parcel, block].filter(Boolean).join(' · ') || '—';
    const creatorImage = getUserProfileImageUrl(item);

    return (
      <View style={styles.card}>
        <View style={styles.cardImageWrap}>
          {firstImg ? (
            <Image source={{ uri: firstImg }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <MaterialCommunityIcons name="image-outline" size={48} color="rgba(255,255,255,0.4)" />
            </View>
          )}
          {imgs.length > 1 && (
            <View style={styles.dots}>
              {imgs.slice(0, 5).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === 0 && styles.dotActive]}
                />
              ))}
            </View>
          )}
          {creatorImage && (
            <View style={styles.avatarWrap}>
              <Image source={{ uri: creatorImage }} style={styles.avatar} resizeMode="cover" />
            </View>
          )}
        </View>
        <View style={styles.cardBottom}>
          {/* Level 3: heart + למכירה/להשכרה */}
          <View style={styles.cardBottomLevel3}>
            <View style={styles.heartWrap}>
              <MaterialCommunityIcons name="heart-outline" size={26} color="#fff" />
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{purposeLabel}</Text>
            </View>
          </View>
          {/* Level 2: price */}
          <Text style={styles.price}>{priceStr}</Text>
          {/* Level 1: address */}
          <View style={styles.cardBottomLevel1}>
            <MaterialCommunityIcons name="map-marker-outline" size={16} color={Colors.grey200} />
            <Text style={styles.location} numberOfLines={1}>{location}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.backBtn}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>הנכסים שלי</Text>
        <View style={styles.headerSpacer} />
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={styles.loadingText}>טוען נכסים...</Text>
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="home-outline" size={64} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyText}>אין נכסים להצגה</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mainDeepBlue },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: { padding: 4, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  headerSpacer: { width: 44 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: Colors.grey200, fontSize: 14, marginTop: 12 },
  emptyText: { color: Colors.grey200, fontSize: 16, marginTop: 12 },
  listContent: { padding: 24, paddingBottom: 48 },
  card: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: CARD_BG,
    marginBottom: 20,
  },
  cardImageWrap: { position: 'relative', width: '100%', height: CARD_IMAGE_HEIGHT },
  cardImage: { width: '100%', height: '100%', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  cardImagePlaceholder: { backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: GOLD, width: 8, height: 8, borderRadius: 4 },
  avatarWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: GOLD,
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  cardBottom: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  cardBottomLevel3: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  heartWrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  heartImage: { width: 24, height: 25 },
  badge: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  badgeText: { color: '#1a1a1a', fontSize: 13, fontWeight: '600' },
  price: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 10,
    width: '100%',
  },
  cardBottomLevel1: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  location: { color: Colors.grey200, fontSize: 14, textAlign: 'right', flex: 1 },
});

export default UserListingsScreen;
