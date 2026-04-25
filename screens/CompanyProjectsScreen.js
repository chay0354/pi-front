import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Colors, BorderRadius, FontSizes} from '../constants/styles';
import {getListings} from '../utils/api';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const H_PAD = 16;
const GAP = 12;
/** Horizontal gap between columns; vertical gap between rows (extra space below each row). */
const ROW_GAP = 22;
const COL_W = (SCREEN_WIDTH - H_PAD * 2 - GAP) / 2;
const TILE_SIZE = COL_W;

const TITLE_MAX = 42;
const ADDRESS_MAX = 52;

/**
 * Detect feed-post rows so this screen shows only ads.
 * Catches: explicit type/feed_post flags, description "פוסט"/"post",
 * and uploads with a "post_<digits>" filename segment in the image URL.
 */
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
  const descLower = description.toLowerCase();
  if (
    type === 'post' ||
    type === 'posts' ||
    type === 'feed_post' ||
    type.includes('post') ||
    descLower === 'post' ||
    descLower.includes('פוסט') ||
    descLower.includes('post') ||
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

function truncate(s, max) {
  const t = String(s).trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

/** Top line: project name when present, else description / rooms·area. */
function listingCardProjectTitle(item) {
  const pn = (item.project_name || item.projectName || '').trim();
  if (pn) return truncate(pn, TITLE_MAX);
  const d = (item.description || '').trim().replace(/\s+/g, ' ');
  if (d) return truncate(d, TITLE_MAX);
  const rooms = item.rooms != null ? `${item.rooms} חדרים` : null;
  const area = item.area != null ? `${item.area} מ״ר` : null;
  const parts = [rooms, area].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  return 'שם הפרויקט';
}

/** Bottom line: street + city when available. */
function listingCardAddressLine(item) {
  const street = [item.address, item.land_address, item.search_address]
    .map(x => (x != null ? String(x).trim() : ''))
    .find(Boolean);
  const cityHints = [item.search_city, item.city, item.filter_city]
    .map(x => (x != null ? String(x).trim() : ''))
    .filter(Boolean);
  const city = cityHints[0] || '';
  let line = '';
  if (street && city && !street.includes(city)) {
    line = `${street}, ${city}`;
  } else if (street) {
    line = street;
  } else if (city) {
    line = city;
  } else {
    line = 'כתובת לא צוינה';
  }
  return truncate(line, ADDRESS_MAX);
}

function firstListingImageUrl(item) {
  const imgs = item.listing_images || [];
  const main = imgs.find(i => i.image_type === 'main' && i.image_url);
  if (main?.image_url) return main.image_url;
  const any = imgs.find(i => i.image_url);
  if (any?.image_url) return any.image_url;
  if (item.main_image_url && String(item.main_image_url).trim()) {
    return String(item.main_image_url).trim();
  }
  return null;
}

/**
 * Company ad grid: header = company name; each tile = image + project name + address.
 */
const CompanyProjectsScreen = ({
  companyId,
  companyName = '',
  onClose,
  onOpenListing,
}) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    if (!companyId) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getListings({subscription_id: companyId, status: 'published'})
      .then(res => {
        if (res.success && Array.isArray(res.listings)) {
          setListings(res.listings.filter(l => !isPostListingRecord(l)));
        } else {
          setListings([]);
        }
      })
      .catch(e => {
        setError(e?.message || 'טעינה נכשלה');
        setListings([]);
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = useCallback(
    ({item}) => {
      if (isPostListingRecord(item)) return null;
      const uri = firstListingImageUrl(item);
      const projectTitle = listingCardProjectTitle(item);
      const addressLine = listingCardAddressLine(item);
      return (
        <TouchableOpacity
          style={[styles.tile, {width: TILE_SIZE, height: TILE_SIZE}]}
          activeOpacity={0.9}
          onPress={() => onOpenListing?.(item)}>
          {uri ? (
            <Image source={{uri}} style={styles.tileBg} resizeMode="cover" />
          ) : (
            <View style={[styles.tileBg, styles.tilePlaceholder]}>
              <MaterialCommunityIcons
                name="image-outline"
                size={40}
                color="rgba(255,255,255,0.35)"
              />
            </View>
          )}
          <View style={styles.tileDim} pointerEvents="none" />
          <View style={styles.tileLabels}>
            <Text style={styles.projectTitleText} numberOfLines={2}>
              {projectTitle}
            </Text>
            <Text style={styles.addressText} numberOfLines={2}>
              {addressLine}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [onOpenListing],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn} hitSlop={12}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.white100} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {companyName || 'חברה'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.yellowIcons} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryWrap}>
            <Text style={styles.retryText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>אין מודעות להצגה</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={it => String(it.id)}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrap}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.blue100,
    maxWidth: 414,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSpacer: {width: 44},
  title: {
    flex: 1,
    textAlign: 'center',
    color: Colors.white100,
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 48,
    paddingBottom: 32,
  },
  columnWrap: {
    gap: GAP,
    marginBottom: ROW_GAP,
  },
  tile: {
    borderRadius: BorderRadius.roundCorner2XL,
    overflow: 'hidden',
    backgroundColor: '#2a2935',
  },
  tileBg: {
    ...StyleSheet.absoluteFillObject,
  },
  /** Even dim over the whole photo (not bottom-heavy like a gradient). */
  tileDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  tilePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#363544',
  },
  tileLabels: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 12,
    alignItems: 'center',
  },
  projectTitleText: {
    color: Colors.white100,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 6,
  },
  addressText: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: Colors.grey200,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryWrap: {padding: 12},
  retryText: {color: Colors.yellowIcons, fontWeight: '600'},
  emptyText: {color: Colors.grey200},
});

export default CompanyProjectsScreen;
