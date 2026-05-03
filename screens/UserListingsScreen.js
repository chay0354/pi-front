import React, {useState, useEffect, useCallback, useContext} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Colors} from '../constants/styles';
import {
  loadTikTokLikedState,
  persistLikedListingIds,
} from '../utils/tikTokLikedStorage';
import {getListings, likeListing, unlikeListing} from '../utils/api';
import {ContextHook} from '../hooks/ContextHook';
import ListingGridCardFigma from '../components/ListingGridCardFigma';
import {brokerPiRatingFromListing} from '../utils/listingGridCardFigma';

const GOLD = '#ffc40a';

/** Detect feed-post entries so we can exclude them from the ads list. */
function isPostListingRecord(item) {
  if (!item) return false;
  const type = String(
    item.propertyType ||
      item.property_type ||
      item.propertyTypeRaw ||
      item.apartmentTypeId ||
      '',
  ).toLowerCase();
  const description = String(item.description || item.desc || '').trim();
  if (
    type === 'post' ||
    type === 'posts' ||
    type === 'feed_post' ||
    type.includes('post') ||
    description.toLowerCase() === 'post' ||
    description === 'פוסט' ||
    item.feed_post === true ||
    item.feed_post === 'true' ||
    item.feed_post === 't' ||
    item.isPostEntry === true
  ) {
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
}

const UserListingsScreen = ({creatorId, displayName = '', onClose, onOpenListing}) => {
  const {currentUser} = useContext(ContextHook);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedListingIds, setLikedListingIds] = useState(() => new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const uid =
          currentUser?.id != null ? String(currentUser.id).trim() : null;
        const st = await loadTikTokLikedState(uid);
        setLikedListingIds(st.likedListingIds);
      } catch (e) {
        console.warn('UserListings: load liked ids failed', e);
      }
    };
    load();
  }, [currentUser?.id]);

  const syncLikesFromListings = useCallback((list, uid) => {
    if (!uid || !list?.length) return;
    setLikedListingIds(prev => {
      const next = new Set(prev);
      list.forEach(l => {
        if (l?.id == null) return;
        if (l.liked === true) next.add(l.id);
        else if (l.liked === false) next.delete(l.id);
      });
      persistLikedListingIds(uid, next).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    if (!creatorId) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const uid = currentUser?.id != null ? String(currentUser.id) : null;
    getListings({
      subscription_id: creatorId,
      ...(uid ? {user_id: uid} : {}),
    })
      .then(result => {
        if (result.success && Array.isArray(result.listings)) {
          const rows = result.listings.filter(l => !isPostListingRecord(l));
          setListings(rows);
          if (uid) {
            syncLikesFromListings(rows, uid);
          }
        } else {
          setListings([]);
        }
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [creatorId, currentUser?.id, syncLikesFromListings]);

  const handleToggleLike = useCallback(
    async listing => {
      const listingId = listing?.id;
      if (listingId == null) return;
      const userId =
        currentUser?.id != null ? String(currentUser.id) : null;
      if (!userId) return;
      const isCurrentlyLiked = likedListingIds.has(listingId);
      const willBeLiked = !isCurrentlyLiked;

      try {
        if (willBeLiked) {
          await likeListing(listingId, userId);
        } else {
          await unlikeListing(listingId, userId);
        }
      } catch (e) {
        console.warn('UserListings like/unlike failed:', e?.message);
        return;
      }

      setLikedListingIds(prev => {
        const next = new Set(prev);
        if (next.has(listingId)) {
          next.delete(listingId);
        } else {
          next.add(listingId);
        }
        persistLikedListingIds(userId, next).catch(() => {});
        return next;
      });
    },
    [currentUser?.id, likedListingIds],
  );

  const renderCard = useCallback(
    ({item}) => {
      const displayPi = brokerPiRatingFromListing(item);
      return (
        <ListingGridCardFigma
          listing={item}
          onPress={onOpenListing}
          liked={Boolean(currentUser?.id) && likedListingIds.has(item.id)}
          onToggleLike={handleToggleLike}
          displayPi={displayPi}
          style={styles.cardMargin}
        />
      );
    },
    [onOpenListing, likedListingIds, handleToggleLike],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.backBtn}
          hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
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
          <MaterialCommunityIcons
            name="home-outline"
            size={64}
            color="rgba(255,255,255,0.3)"
          />
          <Text style={styles.emptyText}>אין נכסים להצגה</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          extraData={likedListingIds}
          keyExtractor={item => String(item.id)}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.mainDeepBlue},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 0,
  },
  backBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  headerSpacer: {width: 44},
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {color: Colors.grey200, fontSize: 14, marginTop: 12},
  emptyText: {color: Colors.grey200, fontSize: 16, marginTop: 12},
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 48,
  },
  cardMargin: {marginBottom: 10},
});

export default UserListingsScreen;
