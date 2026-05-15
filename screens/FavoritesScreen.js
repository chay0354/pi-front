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
  Modal,
  Pressable,
  I18nManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {ContextHook} from '../hooks/ContextHook';
import {getListings, unlikeListing} from '../utils/api';
import FeedBottomBar from '../components/FeedBottomBar';
import {flexStart} from '../index';

/** Figma palette for מסך מועדפים (Favorites screen). */
const BG = '#1E1D27';
const CARD_BG = '#2B2A39';
const CARD_BORDER = '#373548';
const BUTTON_BG = '#4D4966';
const GOLD = '#FFC40A';

/** Same key as TikTokFeedScreen so closing Favorites with heart can reset the feed to pics. */
const TIKTOK_TOP_BAR_FILTER_STORAGE_KEY = 'tikTokFeedSelectedTopBarFilter';

/** Same icons used in the TikTok feed top bar (kept visually identical on this screen). */
const TOP_BAR_FILTERS = [
  {id: 'pics', icon: require('../assets/top-filters/pics.png')},
  {id: 'list', icon: require('../assets/top-filters/list.png')},
  {id: 'video', icon: require('../assets/top-filters/video.png')},
  {id: 'liked', icon: require('../assets/top-filters/liked.png')},
];

/** Detect feed-post rows so we can exclude them from the favorites list. */
const isFeedPost = item => {
  if (!item) return false;
  const type = String(
    item.property_type || item.propertyType || item.propertyTypeRaw || '',
  ).toLowerCase();
  if (type.includes('post')) return true;
  if (
    item.feed_post === true ||
    item.feed_post === 'true' ||
    item.feed_post === 't'
  )
    return true;
  const description = String(item.description || '').trim();
  if (description.toLowerCase() === 'post' || description === 'פוסט') {
    return true;
  }
  const urls = [
    item.main_image_url,
    item.image_url,
    item.image,
    ...(Array.isArray(item.images)
      ? item.images.map(i =>
          i && typeof i === 'object' ? i.uri || i.image_url : i,
        )
      : []),
    ...(Array.isArray(item.listing_images)
      ? item.listing_images.map(i =>
          i && typeof i === 'object' ? i.image_url || i.uri : i,
        )
      : []),
  ].filter(Boolean);
  return urls.some(u => /post_\d/i.test(String(u)));
};

const formatPrice = item => {
  const n =
    item.price != null
      ? Number(item.price)
      : item.budget != null
        ? Number(item.budget)
        : null;
  if (n == null || Number.isNaN(n)) return '—';
  return `₪${Math.round(n).toLocaleString('en-US')}`;
};

const listingTitle = item => {
  const pn = item.project_name && String(item.project_name).trim();
  if (pn) return pn;
  const addr = (item.address || '').trim();
  if (addr) {
    const parts = addr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (parts.length > 1) return parts[parts.length - 1];
    return parts[0] || 'מודעה';
  }
  return 'מודעה';
};

const listingAddress = item => {
  const locBase = (item.address || item.land_address || '').trim();
  return locBase || 'מיקום לא זמין';
};

/** מסך מועדפים – matches Figma 8:95135. Shows only ads (no feed posts). */
const FavoritesScreen = ({
  onClose,
  /** Back chevron only: e.g. go to homepage (top row filters still use `onClose`). */
  onBack,
  onOpenListing,
  onOpenTikTokUserSearch,
  categoryId = null,
  /** Same as TikTok feed: drives bottom-bar labels (סוג/מחיר/…) per category. */
  selectedCategory = null,
  feedFilters = {},
  onOpenCityFilter,
  onOpenApartmentTypeFilter,
  onOpenTypeFilter,
  onOpenOfficeFilter,
  onOpenRoomsFilter,
  onOpenMeterFilter,
  onOpenDonamFilter,
  onOpenPreferencesFilter,
  onOpenPriceFilter,
  onOpenEditPublishAdWithCategory,
  /** After pics/list/video/liked tap: open TikTok feed with that mode (storage already written). */
  onNavigateToTikTokAfterTopBarFilter,
}) => {
  const insets = useSafeAreaInsets();
  const ctx = useContext(ContextHook) || {};
  const currentUser = ctx.currentUser || null;
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  /** When set, shows the "הסרת מודעה מהמועדפים" confirmation modal for this listing. */
  const [confirmUnlikeListing, setConfirmUnlikeListing] = useState(null);

  const userId = currentUser?.id != null ? String(currentUser.id) : null;

  const load = useCallback(async () => {
    if (!userId) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const query = {
        status: 'published',
        user_id: userId,
        favorites_only: true,
      };
      if (categoryId != null && String(categoryId).trim() !== '') {
        const c = parseInt(String(categoryId), 10);
        if (!Number.isNaN(c) && c > 0) {
          query.category = c;
        }
      }
      const res = await getListings(query);
      if (res.success && Array.isArray(res.listings)) {
        setListings(res.listings.filter(l => !isFeedPost(l)));
      } else {
        setListings([]);
      }
    } catch (e) {
      console.warn('Favorites load failed', e);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [userId, categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnlike = async listingId => {
    if (!userId || !listingId || removingId) return;
    setRemovingId(listingId);
    try {
      await unlikeListing(listingId, userId);
      setListings(prev => prev.filter(l => l.id !== listingId));
    } catch (e) {
      console.warn('Unlike failed', e);
    } finally {
      setRemovingId(null);
    }
  };

  const renderItem = ({item}) => {
    const imgs = Array.isArray(item.listing_images) ? item.listing_images : [];
    const uri =
      imgs[0]?.image_url ||
      item.main_image_url ||
      (Array.isArray(item.image_urls) && item.image_urls[0]) ||
      null;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => onOpenListing?.(item)}>
        <View style={styles.row}>
          <View style={styles.imageWrap}>
            {uri ? (
              <Image source={{uri}} style={styles.thumb} resizeMode="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <MaterialCommunityIcons
                  name="image-outline"
                  size={36}
                  color="rgba(255,255,255,0.35)"
                />
              </View>
            )}
            <TouchableOpacity
              style={styles.heartBtn}
              onPress={e => {
                e?.stopPropagation?.();
                setConfirmUnlikeListing(item);
              }}
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
              {String(item?.subscription_type || '').toLowerCase() === 'company'
                ? item?.project_name && String(item.project_name).trim()
                  ? String(item.project_name).trim()
                  : listingTitle(item)
                : formatPrice(item)}
            </Text>
            <View style={styles.addrRow}>
              <Text style={styles.address} numberOfLines={1}>
                {listingAddress(item)}
              </Text>
              <Image
                source={require('../assets/liked-ads/location.png')}
                style={styles.locationIcon}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.ctaBtn}
              onPress={e => {
                e?.stopPropagation?.();
                onOpenListing?.(item);
              }}>
              <Text style={styles.ctaText}>צפה במודעה</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.topBar,
          {
            height: 54 + insets.top,
            paddingTop: insets.top + (Platform.OS === 'web' ? 8 : 2),
          },
        ]}>
        <Pressable
          onPress={() => {
            if (typeof onBack === 'function') {
              onBack();
            } else if (typeof onClose === 'function') {
              onClose();
            }
          }}
          style={({pressed}) => [
            styles.topBarSideBtn,
            Platform.OS === 'web' && {cursor: 'pointer'},
            pressed && Platform.OS !== 'web' && {opacity: 0.75},
          ]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="חזרה">
          <MaterialCommunityIcons
            name="chevron-left"
            size={26}
            color="#FFFFFF"
          />
        </Pressable>
        <View style={styles.topBarCenter}>
          {TOP_BAR_FILTERS.map(f => {
            // Same strip as TikTok: heart reflects “favorites / liked context”; return uses `f.id` in storage.
            const isActive = f.id === 'liked';
            return (
              <TouchableOpacity
                key={f.id}
                style={styles.topBarFilterBtn}
                hitSlop={8}
                onPress={() => {
                  // Persist mode; TikTok remount reads `tikTokFeedSelectedTopBarFilter` from storage.
                  AsyncStorage.setItem(
                    TIKTOK_TOP_BAR_FILTER_STORAGE_KEY,
                    f.id,
                  ).catch(() => {});
                  if (
                    typeof onNavigateToTikTokAfterTopBarFilter === 'function'
                  ) {
                    onNavigateToTikTokAfterTopBarFilter();
                  } else {
                    onClose?.();
                  }
                }}>
                <Image
                  source={f.icon}
                  style={[
                    styles.topBarFilterIcon,
                    isActive && styles.filterIconSelectedTint,
                  ]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={styles.topBarSideBtn}
          hitSlop={12}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="חיפוש משתמש"
          onPress={() => onOpenTikTokUserSearch?.()}>
          <MaterialCommunityIcons name="magnify" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.main}>
        {!userId ? (
          <View style={styles.centerMsg}>
            <Text style={styles.msgText}>התחבר כדי לראות מודעות שאהבת</Text>
          </View>
        ) : loading ? (
          <View style={styles.centerMsg}>
            <ActivityIndicator size="large" color={GOLD} />
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.centerMsg}>
            <Text style={styles.msgText}>עדיין אין מועדפים</Text>
            <Text style={styles.msgSub}>לחץ על הלב בפיד כדי לשמור מודעות</Text>
          </View>
        ) : (
          <FlatList
            data={listings}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <FeedBottomBar
        selectedCategory={selectedCategory}
        feedFilters={feedFilters}
        onOpenCityFilter={onOpenCityFilter}
        onOpenApartmentTypeFilter={onOpenApartmentTypeFilter}
        onOpenTypeFilter={onOpenTypeFilter}
        onOpenOfficeFilter={onOpenOfficeFilter}
        onOpenRoomsFilter={onOpenRoomsFilter}
        onOpenMeterFilter={onOpenMeterFilter}
        onOpenDonamFilter={onOpenDonamFilter}
        onOpenPreferencesFilter={onOpenPreferencesFilter}
        onOpenPriceFilter={onOpenPriceFilter}
        onOpenEditPublishAdWithCategory={onOpenEditPublishAdWithCategory}
      />

      <Modal
        visible={confirmUnlikeListing != null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmUnlikeListing(null)}>
        <Pressable
          style={styles.confirmOverlay}
          onPress={() => setConfirmUnlikeListing(null)}>
          <View
            style={styles.confirmCard}
            onStartShouldSetResponder={() => true}>
            <Text style={styles.confirmTitle}>הסרת מודעה מהמועדפים</Text>
            <Text style={styles.confirmBody}>
              לאחר הסרה, לא ניתן יהיה להוסיף את המודעה מחדש למועדפים.
            </Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setConfirmUnlikeListing(null)}
                activeOpacity={0.85}>
                <Text style={styles.confirmCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  const id = confirmUnlikeListing?.id;
                  setConfirmUnlikeListing(null);
                  if (id != null) handleUnlike(id);
                }}>
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.confirmRemoveBtn}>
                  <Text style={styles.confirmRemoveText}>הסר מהרשימה</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
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
  main: {
    flex: 1,
    minHeight: 0,
  },
  topBar: {
    height: 52,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 8 : 2,
    backgroundColor: BG,
  },
  topBarSideBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
  },
  topBarCenter: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 8,
  },
  topBarFilterBtn: {
    padding: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  topBarFilterIcon: {
    width: 24,
    height: 24,
  },
  filterIconSelectedTint: {
    tintColor: GOLD,
  },
  listContent: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: CARD_BG,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: CARD_BORDER,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
    minHeight: 105,
  },
  imageWrap: {
    width: 105,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'stretch',
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
    alignItems: flexStart,
    gap: 6,
  },
  title: {
    color: '#F7F3E6',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
    textAlign: 'left',
    width: '100%',
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 4,
    width: '100%',
  },
  /** Same asset + size as TikTokFeedScreen list mode (listCardLocationIcon). */
  locationIcon: {
    width: 18,
    height: 18,
  },
  address: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  pricePill: {
    alignSelf: flexStart,
  },
  priceText: {
    color: '#F7F3E6',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    textAlign: 'left',
  },
  ctaBtn: {
    alignSelf: 'stretch',
    height: 40,
    borderRadius: 1000,
    backgroundColor: BUTTON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Medium',
  },
  centerMsg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 100,
  },
  msgText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  msgSub: {
    color: '#D2D0DC',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 366,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 33,
  },
  confirmTitle: {
    color: '#F7F3E6',
    fontSize: 28,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'center',
  },
  confirmBody: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  confirmBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confirmCancelBtn: {
    height: 40,
    minWidth: 150,
    paddingHorizontal: 20,
    borderRadius: 1000,
    backgroundColor: BUTTON_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
  },
  confirmRemoveBtn: {
    height: 44,
    minWidth: 150,
    paddingHorizontal: 16,
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmRemoveText: {
    color: '#1E1D27',
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Medium',
  },
});

export default FavoritesScreen;
