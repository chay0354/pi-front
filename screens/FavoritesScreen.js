import React, {useCallback, useContext, useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Colors} from '../constants/styles';
import {ContextHook} from '../hooks/ContextHook';
import {getListings, unlikeListing} from '../utils/api';

const BG = '#1c1c26';
const CARD = '#25252f';
const PRICE_BG = '#3d3a52';

const formatPrice = (item) => {
  const n = item.price != null ? Number(item.price) : item.budget != null ? Number(item.budget) : null;
  if (n == null || isNaN(n)) return '—';
  return `₪${Math.round(n).toLocaleString('he-IL')}`;
};

const listingTitle = (item) => {
  const pn = item.project_name && String(item.project_name).trim();
  if (pn) return pn;
  const addr = (item.address || '').trim();
  if (addr) {
    const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts[parts.length - 1];
    return parts[0] || 'מודעה';
  }
  return 'מודעה';
};

const listingAddress = (item) => {
  return (
    (item.address || item.land_address || '').trim() || '—'
  );
};

/**
 * מועדפים – all ads the user liked (server ad_likes + favorites_only)
 */
const FavoritesScreen = ({onClose}) => {
  const {currentUser} = useContext(ContextHook);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  const userId = currentUser?.id != null ? String(currentUser.id) : null;

  const load = useCallback(async () => {
    if (!userId) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getListings({
        status: 'published',
        user_id: userId,
        favorites_only: true,
      });
      if (res.success && Array.isArray(res.listings)) {
        setListings(res.listings);
      } else {
        setListings([]);
      }
    } catch (e) {
      console.warn('Favorites load failed', e);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnlike = async (listingId) => {
    if (!userId || !listingId || removingId) return;
    setRemovingId(listingId);
    try {
      await unlikeListing(listingId, userId);
      setListings((prev) => prev.filter((l) => l.id !== listingId));
    } catch (e) {
      console.warn('Unlike failed', e);
    } finally {
      setRemovingId(null);
    }
  };

  const renderItem = ({item}) => {
    const imgs = item.listing_images || [];
    const uri = imgs[0]?.image_url;
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.imageWrap}>
            {uri ? (
              <Image source={{uri}} style={styles.thumb} resizeMode="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <MaterialCommunityIcons name="image-outline" size={36} color="rgba(255,255,255,0.35)" />
              </View>
            )}
            <TouchableOpacity
              style={styles.heartBtn}
              onPress={() => handleUnlike(item.id)}
              hitSlop={10}
              disabled={removingId === item.id}>
              <View style={styles.heartCircle}>
                {removingId === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="heart" size={22} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title} numberOfLines={1}>
              {listingTitle(item)}
            </Text>
            <View style={styles.addrRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color={Colors.white100} />
              <Text style={styles.address} numberOfLines={2}>
                {listingAddress(item)}
              </Text>
            </View>
            <View style={styles.pricePill}>
              <Text style={styles.priceText}>{formatPrice(item)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn} hitSlop={12}>
          <MaterialCommunityIcons name="chevron-left" size={32} color={Colors.white100} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>מועדפים</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!userId ? (
        <View style={styles.centerMsg}>
          <Text style={styles.msgText}>התחבר כדי לראות מודעות שאהבת</Text>
        </View>
      ) : loading ? (
        <View style={styles.centerMsg}>
          <ActivityIndicator size="large" color={Colors.yellowIcons} />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.centerMsg}>
          <Text style={styles.msgText}>עדיין אין מועדפים</Text>
          <Text style={styles.msgSub}>לחץ על הלב בפיד כדי לשמור מודעות</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    width: '100%',
    maxWidth: 414,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 48 : 52,
    paddingBottom: 16,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.white100,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  headerSpacer: {width: 44},
  listContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sep: {
    height: 12,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 12,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
    gap: 12,
  },
  imageWrap: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  thumbPlaceholder: {
    backgroundColor: '#1a1920',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  heartCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  title: {
    color: Colors.white100,
    fontSize: 17,
    fontFamily: 'Rubik-Bold',
    textAlign: 'right',
    marginBottom: 6,
    width: '100%',
  },
  addrRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 10,
    width: '100%',
  },
  address: {
    flex: 1,
    color: Colors.grey200,
    fontSize: 14,
    textAlign: 'right',
    lineHeight: 20,
  },
  pricePill: {
    backgroundColor: PRICE_BG,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  priceText: {
    color: Colors.white100,
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
  },
  centerMsg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  msgText: {
    color: Colors.white100,
    fontSize: 16,
    textAlign: 'center',
  },
  msgSub: {
    color: Colors.grey200,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default FavoritesScreen;
