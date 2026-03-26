import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {brokerCategories} from '../utils/constant';
import {getListings} from '../utils/api';

const FROZEN_IDS_KEY = 'pi_edit_frozen_listing_ids';

const BG = '#1a1926';
const CARD_BG = '#252436';
const BORDER_GOLD = '#D4AF37';
const TEXT_LIGHT = 'rgba(255,255,255,0.7)';

// Category icon: crop outer background (dark card) so only center content shows
const CATEGORY_ICON_SIZE = 110;
const CATEGORY_ICON_CROP = 0.24; // crop from each edge (show center ~52%)
const CATEGORY_ICON_INNER = 1 - 2 * CATEGORY_ICON_CROP;
const categoryImageSize = Math.ceil(CATEGORY_ICON_SIZE / CATEGORY_ICON_INNER); // ~196
const categoryImageOffset = (categoryImageSize - CATEGORY_ICON_SIZE) / 2;

// All broker categories in same design; optional imageCrop, imageAdjust, borderRadius per item
const PUBLISH_CATEGORIES = brokerCategories.map(c => {
  const item = { id: c.id, name: c.name, image: c.image };
  if (c.id === 8) {
    item.imageAdjust = { marginLeft: 0, marginTop: 4 };
  }
  return item;
});

const EditPublishAdScreen = ({
  onClose,
  uploadedListings = [],
  currentUser = null,
  initialCategoryId = 12,
  onCreateAd,
  onEditAd,
  onBoost,
  onShare,
  onFreeze,
  onUnfreeze,
  onRemove,
  onOpenListingAnalysis,
}) => {
  const [viewMode, setViewMode] = useState('grid'); // 'list' | 'grid'
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  const [fetchedListings, setFetchedListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [removeConfirmListing, setRemoveConfirmListing] = useState(null);
  const [freezeConfirmListing, setFreezeConfirmListing] = useState(null);
  const [unfreezeConfirmListing, setUnfreezeConfirmListing] = useState(null);
  const [frozenListingIds, setFrozenListingIds] = useState([]);

  // Keep selected category in sync with the category we came from (e.g. from feed)
  useEffect(() => {
    setSelectedCategoryId(initialCategoryId);
  }, [initialCategoryId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = Platform.OS === 'web' ? localStorage.getItem(FROZEN_IDS_KEY) : await AsyncStorage.getItem(FROZEN_IDS_KEY);
        const parsed = raw ? (() => { try { return JSON.parse(raw); } catch (_) { return []; } })() : [];
        const ids = Array.isArray(parsed) ? parsed.map(x => String(x)) : [];
        if (ids.length && !cancelled) setFrozenListingIds(ids);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  const persistFrozenIds = ids => {
    const next = Array.isArray(ids) ? ids : [];
    if (Platform.OS === 'web') localStorage.setItem(FROZEN_IDS_KEY, JSON.stringify(next));
    else AsyncStorage.setItem(FROZEN_IDS_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingListings(true);
      try {
        const result = await getListings({
          status: 'published',
          ...(currentUser?.id && {subscription_id: currentUser.id}),
        });
        if (cancelled) return;
        if (result?.success && result?.listings?.length) {
          const list =
            currentUser?.id == null
              ? []
              : result.listings;
          const transformed = list.map(l => {
            const imgs = l.listing_images || [];
            const main = imgs.find(i => i.image_type === 'main');
            const additional = imgs.filter(i => i.image_type === 'additional');
            const images = [];
            if (main?.image_url) images.push({uri: main.image_url});
            additional.filter(i => i.image_url).forEach(i => images.push({uri: i.image_url}));
            return {
              id: l.id,
              category: l.category,
              images,
              image: images[0]?.uri,
              price: l.price,
              budget: l.budget,
              description: l.description,
              views: l.view_count,
              view_count: l.view_count,
              like_count: l.like_count != null ? Number(l.like_count) : 0,
              comments: l.comment_count,
              is_frozen: l.is_frozen === true || l.is_frozen === 'true',
              exposure_level: l.exposure_level || 'medium',
            };
          });
          setFetchedListings(transformed);
        } else {
          setFetchedListings([]);
        }
      } catch (e) {
        if (!cancelled) setFetchedListings([]);
      } finally {
        if (!cancelled) setLoadingListings(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const mergedListings = (() => {
    const byId = new Map();
    // Fetched first so API data (including is_frozen) wins over uploadedListings
    [...fetchedListings, ...uploadedListings].forEach(l => {
      const id = l.id ?? l.ad_number;
      if (id != null && !byId.has(id)) byId.set(id, l);
    });
    return Array.from(byId.values());
  })();

  const filteredListings = selectedCategoryId
    ? mergedListings.filter(l => (l.category != null && parseInt(l.category, 10)) === selectedCategoryId)
    : mergedListings;

  const getFirstImage = listing => {
    if (listing.images && listing.images.length > 0) {
      const img = listing.images[0];
      return typeof img === 'string' ? {uri: img} : img;
    }
    if (listing.image) return typeof listing.image === 'number' ? listing.image : {uri: listing.image};
    return null;
  };

  const formatPrice = p => {
    const n = typeof p === 'number' ? p : parseFloat(p) || 0;
    return n.toLocaleString('he-IL');
  };

  const getExposureAsset = () => require('../assets/exposure-icon.png');
  const isFrozen = listing => {
    const id = listing?.id ?? listing?.ad_number;
    if (id == null) return false;
    const idStr = String(id);
    const fromApi = listing?.is_frozen === true || listing?.is_frozen === 'true';
    return fromApi || frozenListingIds.some(fid => String(fid) === idStr);
  };

  const getExposureLabel = exposure => {
    if (exposure === 'high') return 'גבוהה';
    if (exposure === 'medium') return 'בינונית';
    return 'נמוכה';
  };

  const renderAdCard = ({item: listing}) => {
    const imageSource = getFirstImage(listing);
    const views = listing.views ?? listing.view_count ?? 0;
    const likes = listing.like_count != null ? Number(listing.like_count) : 0;
    const exposure = listing.exposure || 'high';

    if (viewMode === 'list') {
      return (
        <View style={styles.adCardList}>
          <View style={styles.adCardListLeft}>
            <Text style={styles.adCardListDescription} numberOfLines={3}>{listing.description || '—'}</Text>
            <View style={styles.adCardListExposure}>
              <Image source={getExposureAsset(exposure)} style={styles.adCardListExposureIcon} resizeMode="contain" />
            </View>
            <View style={[styles.statsRow, styles.statsRowList]}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="eye-outline" size={16} color={TEXT_LIGHT} />
                <Text style={[styles.statText, styles.statTextList]}>{views}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="heart-outline" size={16} color={TEXT_LIGHT} />
                <Text style={[styles.statText, styles.statTextList]}>{likes}</Text>
              </View>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnList, isFrozen(listing) && styles.actionBtnFrozen]}
                onPress={() => (isFrozen(listing) ? setUnfreezeConfirmListing(listing) : setFreezeConfirmListing(listing))}
                activeOpacity={0.8}>
                <MaterialCommunityIcons name="snowflake" size={18} color={isFrozen(listing) ? TEXT_LIGHT : '#fff'} />
                {isFrozen(listing) ? <Text style={styles.actionBtnTextList}>הוקפאה</Text> : null}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnList]}
                onPress={() => (onShare ? onShare(listing) : onBoost && onBoost(listing))}
                activeOpacity={0.8}>
                <MaterialCommunityIcons name="arrow-up" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnList]} onPress={() => setRemoveConfirmListing(listing)} activeOpacity={0.8}>
                <MaterialCommunityIcons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.adCardListRight}>
            {imageSource ? (
              <Image source={imageSource} style={styles.adCardListImage} resizeMode="cover" />
            ) : (
              <View style={[styles.adImagePlaceholder, { minHeight: 200 }]}>
                <MaterialCommunityIcons name="image-off" size={48} color={TEXT_LIGHT} />
              </View>
            )}
            <TouchableOpacity
              style={styles.editBadgeList}
              onPress={() => onEditAd && onEditAd(listing)}
              activeOpacity={0.8}>
              <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.adCard}>
        <View style={styles.adImageWrap}>
          {imageSource ? (
            <Image source={imageSource} style={styles.adImage} resizeMode="cover" />
          ) : (
            <View style={styles.adImagePlaceholder}>
              <MaterialCommunityIcons name="image-off" size={48} color={TEXT_LIGHT} />
            </View>
          )}
          <TouchableOpacity
            style={styles.editBadge}
            onPress={() => onEditAd && onEditAd(listing)}
            activeOpacity={0.8}>
            <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.adDescription} numberOfLines={3}>{listing.description || '—'}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="eye-outline" size={20} color={TEXT_LIGHT} />
            <Text style={styles.statText}>{views}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="heart-outline" size={20} color={TEXT_LIGHT} />
            <Text style={styles.statText}>{likes}</Text>
          </View>
        </View>
        <View style={styles.exposureRow}>
          <Image source={require('../assets/exposure-icon.png')} style={styles.exposureImage} resizeMode="contain" />
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, isFrozen(listing) && styles.actionBtnFrozen]}
            onPress={() => (isFrozen(listing) ? setUnfreezeConfirmListing(listing) : setFreezeConfirmListing(listing))}
            activeOpacity={0.8}>
            <MaterialCommunityIcons name="snowflake" size={18} color={isFrozen(listing) ? TEXT_LIGHT : '#fff'} />
            <Text style={styles.actionBtnText}>{isFrozen(listing) ? 'הוקפאה' : 'הקפאה'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => (onShare ? onShare(listing) : onBoost && onBoost(listing))}
            activeOpacity={0.8}>
            <MaterialCommunityIcons name="arrow-up" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>הקפצה</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setRemoveConfirmListing(listing)} activeOpacity={0.8}>
            <MaterialCommunityIcons name="close" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>הסרה</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ערוך/פרסם מודעה</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => onOpenListingAnalysis && onOpenListingAnalysis()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="ניתוח מודעות">
          <MaterialCommunityIcons name="chart-box-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Category prompt - horizontal scroll */}
        <Text style={styles.sectionLabel}>בחרו קטגוריה לפרסם בה</Text>
        <ScrollView
          horizontal
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          style={styles.categoryScroll}
        >
          {PUBLISH_CATEGORIES.map(cat => {
            const selected = selectedCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryItem}
                onPress={() => setSelectedCategoryId(cat.id)}
                activeOpacity={0.8}>
                {(() => {
                  const crop = cat.imageCrop ?? CATEGORY_ICON_CROP;
                  const inner = 1 - 2 * crop;
                  const size = Math.ceil(CATEGORY_ICON_SIZE / inner);
                  const offset = (size - CATEGORY_ICON_SIZE) / 2;
                  const adj = cat.imageAdjust || {};
                  return (
                    <View
                      style={[
                        styles.categoryImageWrap,
                        {
                          width: CATEGORY_ICON_SIZE,
                          height: CATEGORY_ICON_SIZE,
                          borderRadius: cat.borderRadius ?? 14,
                        },
                      ]}>
                      <Image
                        source={cat.image}
                        style={[
                          styles.categoryImage,
                          {
                            width: size,
                            height: size,
                            marginLeft: -offset + (adj.marginLeft ?? 0),
                            marginTop: -offset + (adj.marginTop ?? 0),
                          },
                        ]}
                        resizeMode="contain"
                      />
                    </View>
                  );
                })()}
                <View style={styles.categoryNameRow}>
                  {selected ? (
                    <Image source={require('../assets/checkbox.png')} style={styles.categoryCheckbox} resizeMode="contain" />
                  ) : null}
                  <Text style={[styles.categoryName, selected && styles.categoryNameSelected]}>{cat.name}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Action bar: Create Ad + view toggles */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.createBtn} onPress={() => onCreateAd && onCreateAd(selectedCategoryId)} activeOpacity={0.9}>
            <Text style={styles.createBtnText}>צור מודעה</Text>
            <MaterialCommunityIcons name="plus" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggle, (viewMode === 'list' || viewMode === 'grid') && styles.viewToggleActive]}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            <Image
              source={viewMode === 'grid' ? require('../assets/swipereight.png') : require('../assets/swiperleft.png')}
              style={styles.viewToggleIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Ad listing */}
        {loadingListings ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={BORDER_GOLD} />
            <Text style={styles.emptySubtext}>טוען מודעות...</Text>
          </View>
        ) : filteredListings.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="bullhorn-outline" size={56} color={TEXT_LIGHT} />
            <Text style={styles.emptyText}>אין מודעות בקטגוריה זו</Text>
            <Text style={styles.emptySubtext}>לחצו על "צור מודעה" כדי לפרסם</Text>
          </View>
        ) : viewMode === 'grid' ? (
          <View style={styles.grid}>
            {filteredListings.map(listing => (
              <View key={listing.id || listing.ad_number || Math.random()} style={styles.gridItem}>
                {renderAdCard({item: listing})}
              </View>
            ))}
          </View>
        ) : (
          <View>
            {filteredListings.map((listing, index) => (
              <View key={listing.id ?? listing.ad_number ?? index}>
                {renderAdCard({item: listing})}
                {index < filteredListings.length - 1 ? <View style={styles.listSeparator} /> : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={removeConfirmListing != null}
        transparent
        animationType="fade"
        onRequestClose={() => setRemoveConfirmListing(null)}>
        <Pressable style={styles.removeModalOverlay} onPress={() => setRemoveConfirmListing(null)}>
          <View style={styles.removeModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.removeModalIconWrap}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color={BORDER_GOLD} />
            </View>
            <Text style={styles.removeModalTitle}>האם אתה בטוח?</Text>
            <Text style={styles.removeModalMessage}>המודעה תוסר מהרשימה. לא ניתן לשחזר פעולה זו.</Text>
            <View style={styles.removeModalButtons}>
              <TouchableOpacity
                style={styles.removeModalCancelBtn}
                onPress={() => setRemoveConfirmListing(null)}
                activeOpacity={0.8}>
                <Text style={styles.removeModalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeModalConfirmBtn}
                onPress={() => {
                  if (removeConfirmListing && onRemove) onRemove(removeConfirmListing);
                  setRemoveConfirmListing(null);
                }}
                activeOpacity={0.8}>
                <Text style={styles.removeModalConfirmText}>הסרה</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={freezeConfirmListing != null}
        transparent
        animationType="fade"
        onRequestClose={() => setFreezeConfirmListing(null)}>
        <Pressable style={styles.removeModalOverlay} onPress={() => setFreezeConfirmListing(null)}>
          <View style={styles.removeModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.removeModalIconWrap}>
              <MaterialCommunityIcons name="snowflake" size={48} color={BORDER_GOLD} />
            </View>
            <Text style={styles.removeModalTitle}>הקפיא מודעה?</Text>
            <Text style={styles.removeModalMessage}>המודעה תישאר אצלך אך לא תוצג במערכת. ניתן לבטל הקפאה בהמשך.</Text>
            <View style={styles.removeModalButtons}>
              <TouchableOpacity
                style={styles.removeModalCancelBtn}
                onPress={() => setFreezeConfirmListing(null)}
                activeOpacity={0.8}>
                <Text style={styles.removeModalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.freezeModalConfirmBtn}
                onPress={() => {
                  if (freezeConfirmListing && onFreeze) onFreeze(freezeConfirmListing);
                  const id = freezeConfirmListing?.id ?? freezeConfirmListing?.ad_number;
                  if (id != null) {
                    const idStr = String(id);
                    setFrozenListingIds(prev => {
                      if (prev.some(fid => String(fid) === idStr)) return prev;
                      const next = [...prev, idStr];
                      persistFrozenIds(next);
                      return next;
                    });
                  }
                  setFreezeConfirmListing(null);
                }}
                activeOpacity={0.8}>
                <Text style={styles.freezeModalConfirmText}>כן</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={unfreezeConfirmListing != null}
        transparent
        animationType="fade"
        onRequestClose={() => setUnfreezeConfirmListing(null)}>
        <Pressable style={styles.removeModalOverlay} onPress={() => setUnfreezeConfirmListing(null)}>
          <View style={styles.removeModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.removeModalIconWrap}>
              <MaterialCommunityIcons name="snowflake-melt" size={48} color={BORDER_GOLD} />
            </View>
            <Text style={styles.removeModalTitle}>בטל הקפאה?</Text>
            <Text style={styles.removeModalMessage}>המודעה תוצג שוב במערכת.</Text>
            <View style={styles.removeModalButtons}>
              <TouchableOpacity
                style={styles.removeModalCancelBtn}
                onPress={() => setUnfreezeConfirmListing(null)}
                activeOpacity={0.8}>
                <Text style={styles.removeModalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.freezeModalConfirmBtn}
                onPress={() => {
                  const listing = unfreezeConfirmListing;
                  if (listing && onUnfreeze) onUnfreeze(listing);
                  const id = listing?.id ?? listing?.ad_number;
                  if (id != null) {
                    const idStr = String(id);
                    setFrozenListingIds(prev => {
                      const next = prev.filter(fid => String(fid) !== idStr);
                      persistFrozenIds(next);
                      return next;
                    });
                  }
                  setUnfreezeConfirmListing(null);
                }}
                activeOpacity={0.8}>
                <Text style={styles.freezeModalConfirmText}>כן</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
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
  headerBtn: { padding: 4, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontFamily: 'Rubik-Medium' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: {
    color: '#fff',
    fontSize: 15,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'right',
  },
  categoryScroll: {
    marginBottom: 24,
    marginHorizontal: -20,
  },
  categoryScrollContent: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: 16,
    paddingHorizontal: 20,
  },
  categoryItem: {
    width: 110,
    alignItems: 'center',
  },
  categoryImageWrap: {
    overflow: 'hidden',
    marginBottom: 6,
  },
  categoryImage: {},
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  categoryName: { color: '#fff', fontSize: 14, fontFamily: 'Rubik-Medium' },
  categoryNameSelected: { color: BORDER_GOLD },
  categoryCheckbox: { width: 18, height: 18 },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3d3b52',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 26,
  },
  createBtnText: { color: '#fff', fontSize: 16 },
  viewToggle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleActive: {},
  viewToggleIcon: { width: 40, height: 40 },
  adCard: {
    width: Dimensions.get('window').width * 0.88,
    alignSelf: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    overflow: 'hidden',
    paddingBottom: 14,
  },
  adCardList: {
    width: Dimensions.get('window').width * 0.88,
    alignSelf: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 200,
  },
  adCardListLeft: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  adCardListExposure: { marginBottom: 8 },
  adCardListExposureIcon: { width: 64, height: 96, marginBottom: 4 },
  adCardListExposureTitle: { color: '#fff', fontSize: 12 },
  adCardListExposureValue: { color: '#4ade80', fontSize: 14, fontFamily: 'Rubik-Medium' },
  adCardListDescription: { color: '#fff', fontSize: 16, fontFamily: 'Rubik-Medium', textAlign: 'right', marginVertical: 8 },
  adCardListRight: {
    width: 120,
    minHeight: 200,
    position: 'relative',
  },
  adCardListImage: { width: '100%', height: '100%', minHeight: 200 },
  adCardListTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(100,180,255,0.9)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  adCardListTagText: { color: '#fff', fontSize: 12 },
  editBadgeList: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(125,80,180,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adImageWrap: { position: 'relative', width: '100%', height: 180 },
  adImage: { width: '100%', height: '100%' },
  adImagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#1e1d2b', alignItems: 'center', justifyContent: 'center' },
  editBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(125,80,180,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adDescription: { color: '#fff', fontSize: 22, fontFamily: 'Rubik-Medium', marginHorizontal: 14, marginTop: 10, textAlign: 'right' },
  statsRow: { flexDirection: 'row', gap: 16, marginHorizontal: 14, marginTop: 8, justifyContent: 'flex-end' },
  statsRowList: { gap: 10, marginHorizontal: 0 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: TEXT_LIGHT, fontSize: 17 },
  statTextList: { fontSize: 14 },
  exposureRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginTop: 10 },
  exposureImage: { width: 72, height: 84 },
  actionRow: {
    flexDirection: 'row',
    marginTop: 14,
    marginLeft: 4,
    marginRight: 14,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3d3b52',
    paddingVertical: 10,
    borderRadius: 18,
  },
  actionBtnList: { minWidth: 52, paddingHorizontal: 20 },
  actionBtnFrozen: { opacity: 0.85 },
  actionBtnTextList: { color: TEXT_LIGHT, fontSize: 12 },
  actionBtnText: { color: '#fff', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
  gridItem: { width: Dimensions.get('window').width * 0.88, alignSelf: 'center' },
  listSeparator: { height: 16 },
  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#fff', fontSize: 16, marginTop: 12 },
  emptySubtext: { color: TEXT_LIGHT, fontSize: 14, marginTop: 4 },
  removeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  removeModalContent: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  removeModalIconWrap: { marginBottom: 16 },
  removeModalTitle: { color: '#fff', fontSize: 20, fontFamily: 'Rubik-Medium', marginBottom: 8, textAlign: 'center' },
  removeModalMessage: { color: TEXT_LIGHT, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  removeModalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  removeModalCancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  removeModalCancelText: { color: '#fff', fontSize: 16 },
  removeModalConfirmBtn: {
    flex: 1,
    backgroundColor: '#c62828',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  removeModalConfirmText: { color: '#fff', fontSize: 16, fontFamily: 'Rubik-Medium' },
  freezeModalConfirmBtn: {
    flex: 1,
    backgroundColor: BORDER_GOLD,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  freezeModalConfirmText: { color: '#1a1926', fontSize: 16, fontFamily: 'Rubik-Medium' },
});

export default EditPublishAdScreen;
