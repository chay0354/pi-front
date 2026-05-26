import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Octicons} from '@expo/vector-icons';
import {
  brokerCategories,
  brokerSheetAdListingCategoryIds,
  categoriesEditProfile,
  companySheetAdListingCategoryIds,
  regularUserAdListingCategoryIds,
  subscriptionTypes,
} from '../utils/constant';
import {getListings, getBoostQuota, boostListing} from '../utils/api';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {flexStart} from '../utils/rtlLayout';

const FROZEN_IDS_KEY = 'pi_edit_frozen_listing_ids';

const BG = '#1a1926';
const CARD_BG = '#2B2A39';
const BORDER_GOLD = '#D4AF37';
const TEXT_LIGHT = 'rgba(255,255,255,0.7)';

// Detect feed-post rows so this screen shows only real ads (not free-form posts).
const isPostListingRecord = item => {
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
  // Fallback: inspect image URLs. Posts are uploaded with a `post_<timestamp>`
  // filename segment even when `feed_post` / `description` aren't set on the row.
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

// Category icon: crop outer background (dark card) so only center content shows
const CATEGORY_ICON_SIZE = 110;
const CATEGORY_ICON_CROP = 0.24; // crop from each edge (show center ~52%)
const CATEGORY_ICON_INNER = 1 - 2 * CATEGORY_ICON_CROP;
const categoryImageSize = Math.ceil(CATEGORY_ICON_SIZE / CATEGORY_ICON_INNER); // ~196
const categoryImageOffset = (categoryImageSize - CATEGORY_ICON_SIZE) / 2;
// categoriesEditProfile uses UI ids (1..9) that differ from ads.category values in DB.
const UI_TO_LISTING_CATEGORY_ID = {
  1: 1, // חדש מקבלן
  2: 5, // BNB
  3: 4, // גלובל
  4: 6, // מגזר דתי
  5: 12, // יוקרה
  6: 7, // קרקעות
  7: 8, // מסחר
  8: 2, // משרדים
  9: 10, // דירות
  10: 3, // שותפים
};

const LISTING_TO_UI_CATEGORY_ID = Object.entries(
  UI_TO_LISTING_CATEGORY_ID,
).reduce((acc, [uiId, listingId]) => {
  acc[listingId] = Number(uiId);
  return acc;
}, {});

const toUiCategoryId = value => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 9;
  return LISTING_TO_UI_CATEGORY_ID[n] ?? n;
};

const toListingCategoryId = value => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return UI_TO_LISTING_CATEGORY_ID[n] ?? n;
};

const resolveListingCategoryId = uiCategoryId =>
  toListingCategoryId(uiCategoryId);

const EditPublishAdScreen = ({
  onClose,
  uploadedListings = [],
  currentUser = null,
  initialCategoryId = 9,
  onCreateAd,
  onEditAd,
  /** Optional: edit handler for feed posts (plain listings); if omitted, posts show without pencil edit */
  onEditPost,
  onBoost,
  onShare,
  onFreeze,
  onUnfreeze,
  onRemove,
  onOpenListingAnalysis,
  onCreatePost,
}) => {
  const insets = useSafeAreaInsets();

  // Horizontal category strip: full list; regular users get a filtered copy (see publishCategoriesStrip).
  //   userCategoriesEditProfile.map(c => {
  //   const item = {id: c.id, name: c.name, image: c.image};
  //   if (c.id === 8) {
  //     item.imageAdjust = {marginLeft: 0, marginTop: 4};
  //   }
  //   return item;
  // });
  const [viewMode, setViewMode] = useState('grid'); // 'list' | 'grid'
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    toUiCategoryId(initialCategoryId),
  );
  const [fetchedListings, setFetchedListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [removeConfirmListing, setRemoveConfirmListing] = useState(null);
  const [freezeConfirmListing, setFreezeConfirmListing] = useState(null);
  const [unfreezeConfirmListing, setUnfreezeConfirmListing] = useState(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [frozenListingIds, setFrozenListingIds] = useState([]);
  const [boostConfirmListing, setBoostConfirmListing] = useState(null);
  const [boostQuota, setBoostQuota] = useState({
    quota: 2,
    used: 0,
    remaining: 2,
  });
  const [boostSubmitting, setBoostSubmitting] = useState(false);
  /** Local overrides so the UI reflects a successful boost before re-fetch. */
  const [boostedOverrides, setBoostedOverrides] = useState({});
  const categoryScrollRef = useRef(null);
  const didInitialCategoryScrollRef = useRef(false);

  const onCategoryScrollContentSizeChange = () => {
    if (didInitialCategoryScrollRef.current) return;
    didInitialCategoryScrollRef.current = true;
    requestAnimationFrame(() => {
      categoryScrollRef.current?.scrollToEnd({animated: false});
    });
  };

  // Sync selected tab with feed category; carousel lists every category for all user types.
  useEffect(() => {
    setSelectedCategoryId(toUiCategoryId(initialCategoryId));
  }, [initialCategoryId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw =
          Platform.OS === 'web'
            ? localStorage.getItem(FROZEN_IDS_KEY)
            : await AsyncStorage.getItem(FROZEN_IDS_KEY);
        const parsed = raw
          ? (() => {
              try {
                return JSON.parse(raw);
              } catch (_) {
                return [];
              }
            })()
          : [];
        const ids = Array.isArray(parsed) ? parsed.map(x => String(x)) : [];
        if (ids.length && !cancelled) setFrozenListingIds(ids);
      } catch (_) {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistFrozenIds = ids => {
    const next = Array.isArray(ids) ? ids : [];
    if (Platform.OS === 'web')
      localStorage.setItem(FROZEN_IDS_KEY, JSON.stringify(next));
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
          const list = currentUser?.id == null ? [] : result.listings;
          const transformed = list.map(l => {
            const imgs = l.listing_images || [];
            const main = imgs.find(i => i.image_type === 'main');
            const additional = imgs.filter(i => i.image_type === 'additional');
            const images = [];
            if (main?.image_url) images.push({uri: main.image_url});
            additional
              .filter(i => i.image_url)
              .forEach(i => images.push({uri: i.image_url}));
            if (!images.length && l.main_image_url) {
              images.push({uri: l.main_image_url});
            }
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
              created_at: l.created_at || l.inserted_at || null,
              boost_expires_at: l.boost_expires_at || null,
              bnb_business_logo_url: l.bnb_business_logo_url ?? null,
              general_details: l.general_details,
              cancellation_policy: l.cancellation_policy ?? null,
              hot_deal:
                l.hot_deal === true ||
                l.hot_deal === 'true' ||
                l.hot_deal === 't',
              price_per_night:
                l.price_per_night != null &&
                !Number.isNaN(Number(l.price_per_night))
                  ? Number(l.price_per_night)
                  : null,
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
    return () => {
      cancelled = true;
    };
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

  const selectedListingCategoryId =
    resolveListingCategoryId(selectedCategoryId);
  const isBnbCategory = Number(selectedListingCategoryId) === 5;
  const isPartnersCategory = Number(selectedListingCategoryId) === 3;
  const isOfficesListingCategory = Number(selectedListingCategoryId) === 2;
  const isRegularUser =
    (currentUser?.subscription_type || '').toLowerCase() ===
    subscriptionTypes.user;
  const isBroker =
    (currentUser?.subscription_type || '').toLowerCase() ===
    subscriptionTypes.broker;
  const isCompany =
    (currentUser?.subscription_type || '').toLowerCase() ===
    subscriptionTypes.company;
  const isProfessional =
    (currentUser?.subscription_type || '').toLowerCase() ===
    subscriptionTypes.professional;
  const publishCategoriesStrip = categoriesEditProfile;
  const showListingCreateInSheet = useMemo(() => {
    if (isProfessional) {
      return false;
    }
    if (isRegularUser) {
      return (
        selectedListingCategoryId != null &&
        regularUserAdListingCategoryIds.has(Number(selectedListingCategoryId))
      );
    }
    if (isBroker) {
      return (
        selectedListingCategoryId != null &&
        brokerSheetAdListingCategoryIds.has(Number(selectedListingCategoryId))
      );
    }
    if (isCompany) {
      return (
        selectedListingCategoryId != null &&
        companySheetAdListingCategoryIds.has(Number(selectedListingCategoryId))
      );
    }
    return true;
  }, [
    isRegularUser,
    isBroker,
    isCompany,
    isProfessional,
    selectedListingCategoryId,
  ]);
  const filteredListings = selectedCategoryId
    ? mergedListings.filter(
        l =>
          (l.category != null && parseInt(l.category, 10)) ===
          selectedListingCategoryId,
      )
    : mergedListings;

  const getFirstImage = listing => {
    if (listing.images && listing.images.length > 0) {
      const img = listing.images[0];
      return typeof img === 'string' ? {uri: img} : img;
    }
    if (listing.image)
      return typeof listing.image === 'number'
        ? listing.image
        : {uri: listing.image};
    return null;
  };

  const formatPrice = p => {
    const n = typeof p === 'number' ? p : parseFloat(p) || 0;
    return n.toLocaleString('he-IL');
  };

  const getExposureAsset = exposure => {
    if (exposure === 'high') return require('../assets/exposure-high.png');
    if (exposure === 'medium') return require('../assets/exposure-medium.png');
    return require('../assets/exposure-low.png');
  };

  /**
   * Derive exposure level from the listing's real activity.
   * Priority:
   *   1. Boost active (boost_expires_at in the future) → 'high'
   *   2. Frozen → 'low'
   *   3. Freshly uploaded:
   *        - age < 24h  → 'high'
   *        - age < 48h  → 'medium'
   *        - age ≥ 48h  → 'low'
   */
  const computeExposureLevel = listing => {
    if (!listing) return 'low';
    const listingId = listing?.id ?? listing?.ad_number;
    const overrideExpiry =
      listingId != null ? boostedOverrides[String(listingId)] : null;
    const expiryRaw =
      overrideExpiry || listing.boost_expires_at || listing.boostExpiresAt;
    if (expiryRaw) {
      const expiryTs = new Date(expiryRaw).getTime();
      if (Number.isFinite(expiryTs) && expiryTs > Date.now()) return 'high';
    }
    const frozen = listing.is_frozen === true || listing.is_frozen === 'true';
    if (frozen) return 'low';
    const createdRaw =
      listing.created_at ||
      listing.createdAt ||
      listing.uploaded_at ||
      listing.uploadedAt ||
      listing.inserted_at ||
      null;
    if (createdRaw) {
      const createdTs = new Date(createdRaw).getTime();
      if (Number.isFinite(createdTs)) {
        const ageHours = (Date.now() - createdTs) / (1000 * 60 * 60);
        if (ageHours < 24) return 'high';
        if (ageHours < 48) return 'medium';
        return 'low';
      }
    }
    return 'low';
  };

  // Fetch current user's boost quota for the month so we can show it in the confirmation modal.
  useEffect(() => {
    const email = currentUser?.email;
    if (!email) return;
    let cancelled = false;
    getBoostQuota(email)
      .then(res => {
        if (cancelled) return;
        setBoostQuota({
          quota: Number(res?.quota ?? 2),
          used: Number(res?.used ?? 0),
          remaining: Number(res?.remaining ?? 2),
        });
      })
      .catch(err => {
        console.warn('getBoostQuota failed:', err?.message || err);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.email]);

  const handleConfirmBoost = async () => {
    const listing = boostConfirmListing;
    if (!listing || boostSubmitting) return;
    const listingId = listing.id ?? listing.ad_number;
    const email = currentUser?.email;
    if (!listingId || !email) {
      setBoostConfirmListing(null);
      if (typeof alert !== 'undefined') alert('לא ניתן להקפיץ כרגע');
      return;
    }
    setBoostSubmitting(true);
    try {
      const res = await boostListing(listingId, email);
      setBoostQuota({
        quota: Number(res?.quota ?? boostQuota.quota),
        used: Number(res?.used ?? boostQuota.used + 1),
        remaining: Number(
          res?.remaining ?? Math.max(0, boostQuota.remaining - 1),
        ),
      });
      if (res?.boost_expires_at) {
        setBoostedOverrides(prev => ({
          ...prev,
          [String(listingId)]: res.boost_expires_at,
        }));
      }
      setBoostConfirmListing(null);
      if (typeof alert !== 'undefined') {
        alert('ההקפצה הופעלה! הדירוג הוא "גבוהה" למשך 24 שעות.');
      }
    } catch (e) {
      if (e?.code === 'QUOTA_EXCEEDED') {
        setBoostQuota({
          quota: Number(e?.quota ?? boostQuota.quota),
          used: Number(e?.used ?? boostQuota.used),
          remaining: 0,
        });
      }
      if (typeof alert !== 'undefined') {
        alert(e?.message || 'הקפצה נכשלה');
      }
    } finally {
      setBoostSubmitting(false);
    }
  };

  const isFrozen = listing => {
    const id = listing?.id ?? listing?.ad_number;
    if (id == null) return false;
    const idStr = String(id);
    const fromApi =
      listing?.is_frozen === true || listing?.is_frozen === 'true';
    return fromApi || frozenListingIds.some(fid => String(fid) === idStr);
  };

  const getExposureLabel = exposure => {
    if (exposure === 'high') return 'גבוהה';
    if (exposure === 'medium') return 'בינונית';
    return 'נמוכה';
  };

  const renderListAdCard = ({item: listing}) => {
    const postRecord = isPostListingRecord(listing);
    const imageSource = getFirstImage(listing);
    const views = listing.views ?? listing.view_count ?? 0;
    const likes = listing.like_count != null ? Number(listing.like_count) : 0;
    const reviewCount =
      listing.review_count != null ? Number(listing.review_count) : 0;
    const exposure = computeExposureLevel(listing);

    return (
      <View style={styles.adCardList}>
        <View style={{padding: 14, flex: 1}}>
          <View style={styles.adCardListLeft}>
            <Image
              source={getExposureAsset(exposure)}
              style={styles.exposureImage}
              resizeMode="contain"
            />
            <View style={{flex: 1}}>
              <Text style={styles.adCardListDescription} numberOfLines={2}>
                {listing.description || '—'}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Image
                    source={require('../assets/eye_icon.png')}
                    style={styles.actionBtnImage}
                    resizeMode="contain"
                  />
                  <Text style={[styles.statText, styles.statTextList]}>
                    {views}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  {postRecord ? (
                    <>
                      <Image
                        source={require('../assets/chat_icon.png')}
                        style={styles.actionBtnImage}
                        resizeMode="contain"
                      />
                      <Text style={[styles.statText, styles.statTextList]}>
                        {likes}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Image
                        source={require('../assets/chat_icon.png')}
                        style={styles.actionBtnImage}
                        resizeMode="contain"
                      />
                      <Text style={[styles.statText, styles.statTextList]}>
                        {reviewCount}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>
          <View style={[styles.actionRow, {marginTop: 16}]}>
            <TouchableOpacity
              style={[styles.actionBtn]}
              onPress={() => setBoostConfirmListing(listing)}
              activeOpacity={0.8}>
              <Image
                source={require('../assets/arrow_up.png')}
                style={styles.actionBtnImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                isFrozen(listing) && styles.actionBtnFrozen,
              ]}
              onPress={() =>
                isFrozen(listing)
                  ? setUnfreezeConfirmListing(listing)
                  : setFreezeConfirmListing(listing)
              }
              activeOpacity={0.8}>
              <Image
                source={require('../assets/freeze.png')}
                style={styles.actionBtnImage}
                resizeMode="contain"
              />
              {isFrozen(listing) ? (
                <Text style={styles.actionBtnTextList}>הוקפאה</Text>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn]}
              onPress={() => setRemoveConfirmListing(listing)}
              activeOpacity={0.8}>
              <Image
                source={require('../assets/close.png')}
                style={styles.actionBtnImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.adCardListRight}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.adCardListImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.adImagePlaceholder}>
              <MaterialCommunityIcons
                name="image-off"
                size={48}
                color={TEXT_LIGHT}
              />
            </View>
          )}
          <View style={styles.topRightTextWrap}>
            <Text style={styles.topRightText}>
              {postRecord ? 'פוסט' : 'נכס'}
            </Text>
          </View>
          {!postRecord || onEditPost ? (
            <TouchableOpacity
              style={styles.editBadgeList}
              onPress={() =>
                postRecord
                  ? onEditPost && onEditPost(listing)
                  : onEditAd && onEditAd(listing)
              }
              activeOpacity={0.8}>
              <Octicons name="pencil" size={25} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  const renderGridAdCard = ({item: listing, index}) => {
    const postRecord = isPostListingRecord(listing);
    const imageSource = getFirstImage(listing);
    const views = listing.views ?? listing.view_count ?? 0;
    const likes = listing.like_count != null ? Number(listing.like_count) : 0;
    const reviewCount =
      listing.review_count != null ? Number(listing.review_count) : 0;
    const exposure = computeExposureLevel(listing);

    return (
      <View style={styles.adCard}>
        <View style={styles.adImageWrap}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.adImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.adImagePlaceholder}>
              <MaterialCommunityIcons
                name="image-off"
                size={48}
                color={TEXT_LIGHT}
              />
            </View>
          )}
          {!postRecord || onEditPost ? (
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() =>
                postRecord
                  ? onEditPost && onEditPost(listing)
                  : onEditAd && onEditAd(listing)
              }
              activeOpacity={0.8}>
              <Octicons name="pencil" size={25} color="#fff" />
            </TouchableOpacity>
          ) : null}
          <View style={styles.topRightTextWrap}>
            <Text style={styles.topRightText}>
              {postRecord ? 'פוסט' : 'נכס'}
            </Text>
          </View>
          <View style={styles.advertisementNo}>
            <Text style={styles.advertisementNoText}>
              {postRecord ? `פוסט מס׳ ${index + 1}` : `מודעה מס׳ ${index + 1}`}
            </Text>
          </View>
        </View>
        <View style={{padding: 16}}>
          <View
            style={{
              flexDirection: 'row-reverse',
              justifyContent: 'space-between',
            }}>
            <Image
              source={getExposureAsset(exposure)}
              style={styles.exposureImage}
              resizeMode="contain"
            />
            <View style={{flex: 1}}>
              <Text style={styles.adDescription} numberOfLines={2}>
                {listing.description || '—'}
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Image
                    source={require('../assets/eye_icon.png')}
                    style={styles.actionBtnImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.statText}>{views}</Text>
                </View>
                <View style={styles.statItem}>
                  {postRecord ? (
                    <>
                      <Image
                        source={require('../assets/chat_icon.png')}
                        style={styles.actionBtnImage}
                        resizeMode="contain"
                      />
                      <Text style={styles.statText}>{likes}</Text>
                    </>
                  ) : (
                    <>
                      <Image
                        source={require('../assets/chat_icon.png')}
                        style={styles.actionBtnImage}
                        resizeMode="contain"
                      />
                      <Text style={styles.statText}>{reviewCount}</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setBoostConfirmListing(listing)}
              activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>הקפצה</Text>
              <Image
                source={require('../assets/arrow_up.png')}
                style={styles.actionBtnImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                isFrozen(listing) && styles.actionBtnFrozen,
              ]}
              onPress={() =>
                isFrozen(listing)
                  ? setUnfreezeConfirmListing(listing)
                  : setFreezeConfirmListing(listing)
              }
              activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>
                {isFrozen(listing) ? 'הוקפאה' : 'הקפאה'}
              </Text>
              <Image
                source={require('../assets/freeze.png')}
                style={styles.actionBtnImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setRemoveConfirmListing(listing)}
              activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>הסרה</Text>
              <Image
                source={require('../assets/close.png')}
                style={styles.actionBtnImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const listingKeyExtractor = (listing, index) => {
    const id = listing?.id ?? listing?.ad_number;
    return id != null ? `${String(id)}-${index}` : `listing-${index}`;
  };

  const openCreateSheet = () => {
    setShowCreateSheet(true);
  };

  const openCreateListing = (opts = {}) => {
    setShowCreateSheet(false);
    onCreateAd &&
      onCreateAd(selectedListingCategoryId ?? selectedCategoryId, opts);
  };

  const openCreatePost = () => {
    setShowCreateSheet(false);
    onCreatePost &&
      onCreatePost(selectedListingCategoryId ?? selectedCategoryId);
  };

  return (
    <View style={[styles.container]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {height: insets.top + 40, paddingTop: insets.top},
        ]}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.headerBtn}
          hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ערוך/פרסם מודעה</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => onOpenListingAnalysis && onOpenListingAnalysis()}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          accessibilityRole="button"
          accessibilityLabel="ניתוח מודעות">
          <Image
            source={require('../assets/action_icons.png')}
            style={styles.actionImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topPanel}>
          {/* Category prompt - horizontal scroll */}
          <Text style={styles.sectionLabel}>בחרו קטגוריה לפרסם בה</Text>
          <ScrollView
            ref={categoryScrollRef}
            horizontal
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
            style={styles.categoryScroll}
            onContentSizeChange={onCategoryScrollContentSizeChange}>
            {publishCategoriesStrip.map(cat => {
              const selected = selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryItem}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  activeOpacity={0.8}>
                  <Image
                    source={selected ? cat.selectedImage : cat.image}
                    style={[
                      {
                        width: 100,
                        height: 100,
                        // width: Dimensions.get('window').width * 0.27,
                        // height: Dimensions.get('window').width * 0.27,
                      },
                    ]}
                    resizeMode="contain"
                  />
                  <View style={styles.categoryNameRow}>
                    <Text
                      style={[
                        styles.categoryName,
                        selected && styles.categoryNameSelected,
                      ]}>
                      {cat.name}
                    </Text>
                    {selected ? (
                      <Image
                        source={require('../assets/checkbox.png')}
                        style={styles.categoryCheckbox}
                        resizeMode="contain"
                      />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Action bar: Create Ad + view toggles */}
          {filteredListings && filteredListings.length > 0 && (
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={[styles.viewToggle]}
                onPress={() =>
                  setViewMode(viewMode === 'grid' ? 'list' : 'grid')
                }>
                <Image
                  source={
                    viewMode === 'grid'
                      ? require('../assets/swipereight.png')
                      : require('../assets/swiperleft.png')
                  }
                  style={styles.viewToggleIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={openCreateSheet}
                activeOpacity={0.9}>
                <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                <Text style={styles.createBtnText}>צור מודעה</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Ad listing */}
        {loadingListings ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={BORDER_GOLD} />
            <Text style={styles.emptySubtext}>טוען מודעות...</Text>
          </View>
        ) : viewMode === 'grid' ? (
          <FlatList
            data={filteredListings}
            keyExtractor={listingKeyExtractor}
            renderItem={({item, index}) => renderGridAdCard({item, index})}
            scrollEnabled={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyWrap}>
                {/* <MaterialCommunityIcons
                  name="bullhorn-outline"
                  size={56}
                  color={TEXT_LIGHT}
                /> */}
                <Text style={styles.emptyText}>
                  אין מודעות או פוסטים בקטגוריה זו
                </Text>
                <Text style={styles.emptySubtext}>
                  זה הזמן ליצור מודעה או פוסט חדש!
                </Text>
                <TouchableOpacity
                  style={[styles.createBtn, {marginTop: 30}]}
                  onPress={openCreateSheet}
                  activeOpacity={0.9}>
                  <Text style={styles.createBtnText}>צור מודעה</Text>
                  <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          />
        ) : (
          <FlatList
            data={filteredListings}
            keyExtractor={listingKeyExtractor}
            renderItem={({item, index}) => renderListAdCard({item, index})}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      <Modal
        visible={showCreateSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateSheet(false)}>
        <Pressable
          style={styles.createSheetOverlay}
          onPress={() => setShowCreateSheet(false)}>
          <View
            style={styles.createSheet}
            onStartShouldSetResponder={() => true}>
            {showListingCreateInSheet &&
              (isBnbCategory ? (
                <>
                  <TouchableOpacity
                    style={styles.createSheetOption}
                    onPress={() => openCreateListing({bnbHostType: 'private'})}
                    activeOpacity={0.85}>
                    <Text style={styles.createSheetArrow}>‹</Text>
                    <View style={styles.createSheetOptionContent}>
                      <View style={styles.createSheetTextContainer}>
                        <Text style={styles.createSheetTitle}>פרסם כפרטי</Text>
                        <Text style={styles.createSheetSubtitle}>
                          פרסם חדר או אתר נופש פרטי
                        </Text>
                      </View>
                      <Image
                        source={require('../assets/ad-uplaud/bnb-private.png')}
                        style={styles.createSheetIcon}
                        resizeMode="contain"
                      />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.createSheetDivider} />
                  <TouchableOpacity
                    style={styles.createSheetOption}
                    onPress={() => openCreateListing({bnbHostType: 'business'})}
                    activeOpacity={0.85}>
                    <Text style={styles.createSheetArrow}>‹</Text>
                    <View style={styles.createSheetOptionContent}>
                      <View style={styles.createSheetTextContainer}>
                        <Text style={styles.createSheetTitle}>פרסם כעסק</Text>
                        <Text style={styles.createSheetSubtitle}>
                          פרסם חדר או אתר נופש עסקי
                        </Text>
                      </View>
                      <Image
                        source={require('../assets/ad-uplaud/bnb-bussiness.png')}
                        style={styles.createSheetIcon}
                        resizeMode="contain"
                      />
                    </View>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.createSheetOption}
                  onPress={() => openCreateListing()}
                  activeOpacity={0.85}>
                  <Text style={styles.createSheetArrow}>‹</Text>
                  <View style={styles.createSheetOptionContent}>
                    <View style={styles.createSheetTextContainer}>
                      <Text style={styles.createSheetTitle}>
                        {isOfficesListingCategory ? 'משרד' : 'פרסם מודעה'}
                      </Text>
                      <Text
                        style={[
                          styles.createSheetSubtitle,
                          isPartnersCategory &&
                            styles.createSheetSubtitleSecondary,
                        ]}>
                        {isPartnersCategory
                          ? 'צור מודעה כדי להיכנס, להכניס או למצוא שותף'
                          : isOfficesListingCategory
                            ? 'פרסם משרד למכירה או השכרה'
                            : 'צור מודעה חדשה בקטגוריה שנבחרה'}
                      </Text>
                    </View>
                    <Image
                      source={
                        isPartnersCategory
                          ? require('../assets/image22221.png')
                          : require('../assets/post-office-icon.png')
                      }
                      style={[
                        styles.createSheetIcon,
                        isPartnersCategory && styles.createSheetIconPartners,
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                </TouchableOpacity>
              ))}
            {showListingCreateInSheet ? (
              <View style={styles.createSheetDivider} />
            ) : null}
            <TouchableOpacity
              style={styles.createSheetOption}
              onPress={openCreatePost}
              activeOpacity={0.85}>
              <Text style={styles.createSheetArrow}>‹</Text>
              <View style={styles.createSheetOptionContent}>
                <View style={styles.createSheetTextContainer}>
                  <Text style={styles.createSheetTitle}>פוסט</Text>
                  <Text
                    style={[
                      styles.createSheetSubtitle,
                      isPartnersCategory && styles.createSheetSubtitleSecondary,
                    ]}>
                    {isPartnersCategory
                      ? 'שתף פוסט חופשי למציאת שותף או דירה'
                      : 'שתף מידע או עדכון עם הקהילה'}
                  </Text>
                </View>
                <Image
                  source={require('../assets/ad-uplaud/posts.png')}
                  style={[
                    styles.createSheetIcon,
                    isPartnersCategory && styles.createSheetIconPartners,
                  ]}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={removeConfirmListing != null}
        transparent
        animationType="fade"
        onRequestClose={() => setRemoveConfirmListing(null)}>
        <Pressable
          style={styles.removeModalOverlay}
          onPress={() => setRemoveConfirmListing(null)}>
          <View
            style={styles.removeModalContent}
            onStartShouldSetResponder={() => true}>
            <View style={styles.removeModalIconWrap}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={48}
                color={BORDER_GOLD}
              />
            </View>
            <Text style={styles.removeModalTitle}>האם אתה בטוח?</Text>
            <Text style={styles.removeModalMessage}>
              המודעה תוסר מהרשימה. לא ניתן לשחזר פעולה זו.
            </Text>
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
                  if (removeConfirmListing && onRemove)
                    onRemove(removeConfirmListing);
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
        <Pressable
          style={styles.removeModalOverlay}
          onPress={() => setFreezeConfirmListing(null)}>
          <View
            style={styles.removeModalContent}
            onStartShouldSetResponder={() => true}>
            <View style={styles.removeModalIconWrap}>
              <MaterialCommunityIcons
                name="snowflake"
                size={48}
                color={BORDER_GOLD}
              />
            </View>
            <Text style={styles.removeModalTitle}>הקפיא מודעה?</Text>
            <Text style={styles.removeModalMessage}>
              המודעה תישאר אצלך אך לא תוצג במערכת. ניתן לבטל הקפאה בהמשך.
            </Text>
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
                  if (freezeConfirmListing && onFreeze)
                    onFreeze(freezeConfirmListing);
                  const id =
                    freezeConfirmListing?.id ?? freezeConfirmListing?.ad_number;
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
        visible={boostConfirmListing != null}
        transparent
        animationType="fade"
        onRequestClose={() => !boostSubmitting && setBoostConfirmListing(null)}>
        <Pressable
          style={styles.removeModalOverlay}
          onPress={() => !boostSubmitting && setBoostConfirmListing(null)}>
          <View
            style={styles.removeModalContent}
            onStartShouldSetResponder={() => true}>
            <View style={styles.removeModalIconWrap}>
              <MaterialCommunityIcons
                name="rocket-launch"
                size={48}
                color={BORDER_GOLD}
              />
            </View>
            <Text style={styles.removeModalTitle}>להקפיץ את המודעה?</Text>
            <Text style={styles.removeModalMessage}>
              המודעה תקבל חשיפה גבוהה למשך 24 שעות.{'\n'}
              נותרו לך {boostQuota.remaining} הקפצות מתוך {boostQuota.quota}{' '}
              החודש.
            </Text>
            <View style={styles.removeModalButtons}>
              <TouchableOpacity
                style={styles.removeModalCancelBtn}
                disabled={boostSubmitting}
                onPress={() => setBoostConfirmListing(null)}
                activeOpacity={0.8}>
                <Text style={styles.removeModalCancelText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.freezeModalConfirmBtn,
                  (boostSubmitting || boostQuota.remaining <= 0) && {
                    opacity: 0.5,
                  },
                ]}
                disabled={boostSubmitting || boostQuota.remaining <= 0}
                onPress={handleConfirmBoost}
                activeOpacity={0.8}>
                {boostSubmitting ? (
                  <ActivityIndicator size="small" color="#1a1926" />
                ) : (
                  <Text style={styles.freezeModalConfirmText}>הקפץ</Text>
                )}
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
        <Pressable
          style={styles.removeModalOverlay}
          onPress={() => setUnfreezeConfirmListing(null)}>
          <View
            style={styles.removeModalContent}
            onStartShouldSetResponder={() => true}>
            <View style={styles.removeModalIconWrap}>
              <MaterialCommunityIcons
                name="snowflake-melt"
                size={48}
                color={BORDER_GOLD}
              />
            </View>
            <Text style={styles.removeModalTitle}>בטל הקפאה?</Text>
            <Text style={styles.removeModalMessage}>
              המודעה תוצג שוב במערכת.
            </Text>
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
  container: {flex: 1, backgroundColor: BG},
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    backgroundColor: '#27262F',
    height: 40,
  },
  headerBtn: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionImage: {width: 24, height: 24},
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: 20, paddingBottom: 40},
  topPanel: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    backgroundColor: '#27262F',
    marginBottom: 25,
    paddingBottom: 10,
  },
  topPanelDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
  },
  sectionLabel: {
    color: '#D2D0DC',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    marginTop: 5,
    marginBottom: 12,
    textAlign: 'left',
  },
  categoryScroll: {
    marginBottom: 24,
    marginHorizontal: -20,
  },
  categoryScrollContent: {
    // flexDirection: 'row-reverse',
    gap: 22,
    paddingHorizontal: 20,
  },
  categoryItem: {
    // width: Dimensions.get('window').width * 0.27,
    alignItems: 'center',
  },
  categoryImageWrap: {
    overflow: 'hidden',
    marginBottom: 6,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  categoryName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  categoryNameSelected: {fontFamily: 'Rubik-Medium'},
  categoryCheckbox: {
    width: 20,
    height: 20,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    marginTop: 10,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4D4966',
    // paddingVertical: 6,
    // paddingHorizontal: 20,
    borderRadius: 26,
    height: 38,
    width: 168,
  },
  createBtnText: {color: '#fff', fontSize: 18, fontFamily: 'Rubik-Medium'},
  viewToggle: {
    width: 56,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleIcon: {width: '100%', height: '100%'},
  adCard: {
    width: Dimensions.get('window').width * 0.88,
    alignSelf: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 24,
  },
  adCardList: {
    width: Dimensions.get('window').width * 0.88,
    alignSelf: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row-reverse',
    height: 192,
    marginBottom: 22,
  },
  adCardListLeft: {
    flex: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  adCardListDescription: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    textAlign: 'left',
  },
  adCardListRight: {
    width: 108,
    height: '100%',
    position: 'relative',
  },
  adCardListImage: {
    width: '100%',
    height: '100%',
  },
  editBadgeList: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2B2A39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adImageWrap: {
    position: 'relative',
    width: '100%',
    height: 230,
    overflow: 'hidden',
  },
  adImage: {width: '100%', height: '100%'},
  adImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e1d2b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2B2A39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightTextWrap: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  topRightText: {
    color: '#1E1D27',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
  advertisementNo: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#1E1D27CC',
    height: 30,
    justifyContent: 'center',
    alignItems: flexStart,
    paddingRight: 12,
  },
  advertisementNoText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },
  adDescription: {
    color: '#fff',
    fontSize: 26,
    fontFamily: 'Rubik-SemiBold',
    marginLeft: 10,
    textAlign: 'left',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 16,
    marginRight: 10,
    justifyContent: flexStart,
    position: 'absolute',
    bottom: 5,
    left: 0,
  },
  statItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
  statText: {
    color: '#D2D0DC',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },
  statTextList: {fontSize: 14},
  exposureImage: {width: 45, height: 101},
  actionRow: {
    flexDirection: 'row-reverse',
    marginTop: 22,
    gap: 4,
  },
  actionBtnImage: {width: 22, height: 22},
  actionBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4D4966',
    paddingVertical: 10,
    borderRadius: 18,
  },
  actionBtnFrozen: {opacity: 0.85},
  actionBtnTextList: {color: TEXT_LIGHT, fontSize: 12},
  actionBtnText: {color: '#fff', fontSize: 16, fontFamily: 'Rubik-Regular'},
  listSeparator: {height: 16},
  emptyWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: Dimensions.get('window').height / 1.8,
  },
  emptyText: {color: '#fff', fontSize: 16, marginTop: 12},
  emptySubtext: {color: TEXT_LIGHT, fontSize: 14, marginTop: 4},
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
  removeModalIconWrap: {marginBottom: 16},
  removeModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    marginBottom: 8,
    textAlign: 'center',
  },
  removeModalMessage: {
    color: TEXT_LIGHT,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  removeModalButtons: {flexDirection: 'row', gap: 12, width: '100%'},
  removeModalCancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  removeModalCancelText: {color: '#fff', fontSize: 16},
  removeModalConfirmBtn: {
    flex: 1,
    backgroundColor: '#c62828',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  removeModalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  freezeModalConfirmBtn: {
    flex: 1,
    backgroundColor: BORDER_GOLD,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  freezeModalConfirmText: {
    color: '#1a1926',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  createSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  createSheet: {
    backgroundColor: '#2B2A39',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  createSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  createSheetArrow: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 28,
    marginRight: 8,
  },
  createSheetOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createSheetTextContainer: {
    alignItems: flexStart,
    flex: 1,
    marginRight: 12,
  },
  createSheetTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    textAlign: 'left',
  },
  createSheetSubtitle: {
    color: '#FFFFFF',
    opacity: 0.85,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    marginTop: 4,
  },
  createSheetIcon: {
    width: 60,
    height: 60,
  },
  createSheetIconPartners: {
    width: 40,
    height: 40,
  },
  createSheetSubtitleSecondary: {
    color: '#D2D0DC',
    opacity: 1,
    lineHeight: 16,
    letterSpacing: 0.54,
  },
  createSheetDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});

export default EditPublishAdScreen;
