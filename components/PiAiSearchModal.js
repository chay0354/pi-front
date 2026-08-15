import React, {useState, useCallback, useEffect, useContext, useRef} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Colors, BorderRadius} from '../constants/styles';
import {
  getListings,
  getReviews,
  likeListing,
  unlikeListing,
  piAiSearchListings,
} from '../utils/api';
import {
  loadTikTokLikedState,
  persistLikedListingIds,
} from '../utils/tikTokLikedStorage';
import {ContextHook} from '../hooks/ContextHook';
import {
  rankListingsByQuery,
  buildListingAiSummary,
  parsePiAiQuery,
  filterListingsByParsedQuery,
  buildPiAiFilterEmptyMessage,
  buildPiAiSearchingMessage,
  filterPiAiSearchListings,
} from '../utils/piAiMatchListings';
import {getUserProfileImageUrl} from '../utils/userProfileImage';
import ListingGridCardFigma from './ListingGridCardFigma';
import {
  HEB_M2,
  buildCardStats,
  firstImageUrl,
  formatApartmentAreaForDisplay,
  formatApartmentRoomsOrFloorForDisplay,
  formatPriceHe,
  isCompanyListing,
  isPreSaleListing,
  listingImageUrls,
  cleanAddress,
  purposeLabel,
  brokerPiRatingFromListing,
  shouldShowListingPiRating,
  displayPiRatingFromReviews,
  shouldShowCommercialLogoBadge,
  getCompanyLogoUrlFromListing,
} from '../utils/listingGridCardFigma';
import {flexStart, forceLtrStyle, forceRtlStyle} from '../utils/rtlLayout';

/** Pi badge is always LTR (number then star) — isolated from RTL list rows. */
const piBadgeLtrDirection =
  Platform.OS === 'web' ? {direction: 'ltr'} : null;
/** Web StyleSheet omits direction; native uses I18nManager + forceRtlStyle on rows. */
const listRtlDirection =
  Platform.OS === 'web' ? {direction: 'rtl'} : null;

// Palette mirrored from EditPublishAdScreen so this screen matches the rest
// of the publishing flow.
const BG = '#1a1926';
const HEADER_BG = '#27262F';
const CARD_BG = '#2B2A39';
const IMG_PLACEHOLDER_BG = '#1e1d2b';
const GOLD = '#FFC40A';

// One-time CSS injection on web to hide the native scrollbar inside the
// Pi-AI results list (Chromium/WebKit). Firefox + Edge legacy are handled by
// `scrollbarWidth` / `msOverflowStyle` on the ScrollView style.
if (
  Platform.OS === 'web' &&
  typeof document !== 'undefined' &&
  !document.getElementById('pi-ai-scroll-style')
) {
  const styleEl = document.createElement('style');
  styleEl.id = 'pi-ai-scroll-style';
  styleEl.textContent =
    '.pi-ai-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }';
  document.head.appendChild(styleEl);
}

/** Mirrored from UserProfileScreen: bundled assets (web URI paths 404 on subpaths). */
import {PiRatingBadge} from './PiRatingBadge';

/** Shown next to the grid/list toggle: count of items in the current result set. */
const formatResultsCountHe = n => {
  const c = Math.max(0, Math.floor(Number(n)) || 0);
  if (c === 0) {
    return 'נמצאו 0 תוצאות';
  }
  if (c === 1) {
    return 'נמצאה תוצאה אחת';
  }
  return `נמצאו ${c} תוצאות`;
};

/** Animated status line while Pi AI ranks listings for the current query. */
function PiAiSearchingStatus({message}) {
  const pulse = useRef(new Animated.Value(0.45)).current;
  const [dots, setDots] = useState('');

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  useEffect(() => {
    const id = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : `${prev}.`));
    }, 380);
    return () => clearInterval(id);
  }, [message]);

  if (!message) return null;

  return (
    <Animated.View style={[styles.searchingStatusWrap, {opacity: pulse}]}>
      <Text style={styles.searchingStatusText} maxFontSizeMultiplier={1.25}>
        {message}
        {dots}
      </Text>
    </Animated.View>
  );
}

/**
 * Full-screen Pi AI search: describe a property, search published listings,
 * results render as grid cards.
 */
const PiAiSearchModal = ({
  visible,
  onClose,
  onOpenUserProfile,
  embedded = false,
  initialSnapshot = null,
  onSnapshotChange,
}) => {
  const insets = useSafeAreaInsets();
  const {currentUser} = useContext(ContextHook);
  const [query, setQuery] = useState(initialSnapshot?.query || '');
  /** Full catalog; used for browse (no filter) and as the pool for search ranking. */
  const [allListings, setAllListings] = useState([]);
  const [results, setResults] = useState(
    Array.isArray(initialSnapshot?.results) ? initialSnapshot.results : [],
  );
  const [emptyMessage, setEmptyMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchingMessage, setSearchingMessage] = useState('');
  /**
   * Until the first non-empty search, we show the welcome state (no listing cards),
   * even if the catalog is already loaded in `allListings`.
   */
  const [hasSearchedWithQuery, setHasSearchedWithQuery] = useState(
    Boolean(initialSnapshot?.hasSearched),
  );
  /** Result layout: 2-up grid (default) or compact list rows. */
  const [resultsLayout, setResultsLayout] = useState(
    initialSnapshot?.layout === 'list' ? 'list' : 'grid',
  );
  /**
   * True on the first open when we were handed a restored snapshot (returning
   * from a listing). Used to skip the catalog-load reset that would otherwise
   * wipe the restored results.
   */
  const restoreResultsRef = React.useRef(
    Array.isArray(initialSnapshot?.results) && initialSnapshot.results.length > 0,
  );
  /** Same storage key as TikTokFeedScreen — grid heart shows gold when id is in the set. */
  const [likedListingIds, setLikedListingIds] = useState(() => new Set());
  /** `subscription_id` -> same display number as UserProfile (reviews avg or pi_value). */
  const [piDisplayBySubId, setPiDisplayBySubId] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const uid =
          currentUser?.id != null ? String(currentUser.id).trim() : null;
        const st = await loadTikTokLikedState(uid);
        setLikedListingIds(st.likedListingIds);
      } catch (e) {
        console.warn('Pi AI: load liked ids failed', e);
      }
    };
    load();
  }, [currentUser?.id]);

  const syncLikesFromListings = useCallback((listings, uid) => {
    if (!uid || !listings?.length) return;
    setLikedListingIds(prev => {
      const next = new Set(prev);
      listings.forEach(l => {
        if (l?.id == null) return;
        if (l.liked === true) next.add(l.id);
        else if (l.liked === false) next.delete(l.id);
      });
      persistLikedListingIds(uid, next).catch(() => {});
      return next;
    });
  }, []);

  /**
   * When the surface opens, load all published ads and show them. Search only
   * filters/ranks from this set when the user submits a query.
   */
  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    const restoring = restoreResultsRef.current;
    (async () => {
      setLoading(true);
      setError('');
      if (!restoring) {
        setHasSearchedWithQuery(false);
      }
      try {
        const uid = currentUser?.id != null ? String(currentUser.id) : null;
        const res = await getListings({
          status: 'published',
        });
        if (cancelled) {
          return;
        }
        const listings = filterPiAiSearchListings(res?.listings || []);
        setAllListings(listings);
        if (restoring) {
          // Keep the restored query/results; just refresh catalog + likes once.
          restoreResultsRef.current = false;
        } else {
          setQuery('');
          setEmptyMessage(listings.length ? '' : 'אין מודעות שפורסמו כרגע.');
          setResults([]);
        }
        if (uid) {
          syncLikesFromListings(listings, uid);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'שגיאה בטעינת המודעות. בדוק חיבור לשרת.');
          setAllListings([]);
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, currentUser?.id, syncLikesFromListings]);

  useEffect(() => {
    if (!results || results.length === 0) {
      setPiDisplayBySubId({});
      return;
    }
    const subs = [
      ...new Set(
        results
          .map(l => l?.subscription_id)
          .filter(s => s != null && String(s).trim() !== ''),
      ),
    ];
    if (subs.length === 0) {
      setPiDisplayBySubId({});
      return;
    }
    let cancelled = false;
    (async () => {
      const parts = await Promise.all(
        subs.map(async subId => {
          const idKey = String(subId);
          const listing = results.find(
            l =>
              l?.subscription_id != null && String(l.subscription_id) === idKey,
          ) || {subscription_id: subId};
          try {
            const {reviews} = await getReviews(idKey);
            const v = displayPiRatingFromReviews(
              Array.isArray(reviews) ? reviews : [],
              listing,
            );
            return [idKey, v];
          } catch {
            return [idKey, brokerPiRatingFromListing(listing)];
          }
        }),
      );
      if (cancelled) return;
      setPiDisplayBySubId(Object.fromEntries(parts));
    })();
    return () => {
      cancelled = true;
    };
  }, [results]);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    setError('');
    const uid = currentUser?.id != null ? String(currentUser.id) : null;

    if (!q) {
      if (allListings.length === 0) {
        if (loading) {
          return;
        }
        setEmptyMessage('אין מודעות שפורסמו כרגע.');
        setResults([]);
        return;
      }
      if (!hasSearchedWithQuery) {
        setEmptyMessage('');
        setResults([]);
        return;
      }
      setEmptyMessage('');
      setResults([...allListings]);
      return;
    }

    setHasSearchedWithQuery(true);
    const parsed = parsePiAiQuery(q);
    setSearchingMessage(buildPiAiSearchingMessage(q, parsed));
    setLoading(true);
    setEmptyMessage('');
    try {
      let listings = allListings;
      if (listings.length === 0) {
        const result = await getListings({
          status: 'published',
        });
        listings = filterPiAiSearchListings(result?.listings || []);
        setAllListings(listings);
        if (uid) {
          syncLikesFromListings(listings, uid);
        }
      }

      const filteredPool = filterListingsByParsedQuery(listings, parsed);
      if (filteredPool.length === 0) {
        setResults([]);
        setEmptyMessage(
          buildPiAiFilterEmptyMessage(parsed, listings.length) ||
            `חיפשתי ב-${listings.length} מודעות ולא מצאתי התאמה.`,
        );
        return;
      }

      const searchPool = filteredPool;

      // Gemini ranks the catalog against the query; the local keyword ranking
      // is only a fallback when the AI service is unavailable (offline/quota).
      let rows = null;
      let aiSaidNoMatch = false;
      const ai = await piAiSearchListings(
        q,
        searchPool.map(buildListingAiSummary),
      );
      if (ai.success) {
        const byId = new Map(
          searchPool
            .filter(l => l?.id != null)
            .map(l => [String(l.id), l]),
        );
        const matched = (ai.ids || [])
          .map(id => byId.get(String(id)))
          .filter(Boolean);
        if (matched.length) {
          rows = matched;
        } else {
          aiSaidNoMatch = true;
        }
      }
      if (rows == null && !aiSaidNoMatch) {
        // Gemini unavailable — keyword rank as backup (not when AI said no match).
        const rankedResult = rankListingsByQuery(q, searchPool, {topN: 20});
        rows = rankedResult.ranked.map(r => r.listing);
      }

      if (!rows || rows.length === 0) {
        setResults([]);
        setEmptyMessage(
          `חיפשתי ב-${searchPool.length} מודעות ולא מצאתי התאמה ברורה. נסה לפרט יותר — שם עיר, טווח מחיר, או מספר חדרים.`,
        );
      } else {
        setResults(rows);
        if (uid) {
          syncLikesFromListings(rows, uid);
        }
      }
    } catch (e) {
      setError(e?.message || 'שגיאה בטעינת המודעות. בדוק חיבור לשרת.');
    } finally {
      setLoading(false);
      setSearchingMessage('');
    }
  }, [
    query,
    allListings,
    loading,
    syncLikesFromListings,
    hasSearchedWithQuery,
  ]);

  const handleClose = () => {
    setError('');
    setAllListings([]);
    setResults([]);
    setEmptyMessage('');
    setHasSearchedWithQuery(false);
    onClose?.();
  };

  const handleOpenListing = listing => {
    // Snapshot the current search so returning from the listing restores the
    // exact query + results list the user was viewing.
    onSnapshotChange?.({
      query,
      results,
      hasSearched: hasSearchedWithQuery,
      layout: resultsLayout,
    });
    onOpenUserProfile?.(listing);
  };

  const handleToggleGridLike = useCallback(
    async listing => {
      const listingId = listing?.id;
      if (listingId == null) return;
      const userId = currentUser?.id != null ? String(currentUser.id) : null;
      if (!userId) return;
      const isCurrentlyLiked = likedListingIds.has(listingId);
      const willBeLiked = !isCurrentlyLiked;

      try {
        if (willBeLiked) await likeListing(listingId, userId);
        else await unlikeListing(listingId, userId);
      } catch (e) {
        console.warn('Pi AI like/unlike failed:', e?.message);
        return;
      }

      setLikedListingIds(prev => {
        const next = new Set(prev);
        if (next.has(listingId)) next.delete(listingId);
        else next.add(listingId);
        persistLikedListingIds(userId, next).catch(() => {});
        return next;
      });
    },
    [currentUser?.id, likedListingIds],
  );

  const renderGridCard = listing => {
    const rowLiked =
      Boolean(currentUser?.id) && likedListingIds.has(listing.id);
    const subKey =
      listing?.subscription_id != null
        ? String(listing.subscription_id).trim()
        : '';
    const displayPi =
      subKey !== '' && piDisplayBySubId[subKey] !== undefined
        ? piDisplayBySubId[subKey]
        : brokerPiRatingFromListing(listing);
    return (
      <ListingGridCardFigma
        key={listing.id}
        listing={listing}
        onPress={handleOpenListing}
        liked={rowLiked}
        onToggleLike={handleToggleGridLike}
        displayPi={displayPi}
        hidePhotoDots
      />
    );
  };

  /** Compact list row: thumbnail, price/address, Pi + like (EditPublishAd-style toggle). */
  const renderListCard = listing => {
    const listRowLiked =
      Boolean(currentUser?.id) && likedListingIds.has(listing.id);
    const galleryRaw = listingImageUrls(listing);
    const primaryUri = galleryRaw[0] || firstImageUrl(listing);
    const addr = cleanAddress(listing);
    const isCompany = isCompanyListing(listing);
    const showPreSaleBadge = isCompany && isPreSaleListing(listing);
    const cardPriceLabel = isCompany
      ? String(listing?.project_name || '').trim() || formatPriceHe(listing)
      : formatPriceHe(listing);
    const subKey =
      listing?.subscription_id != null
        ? String(listing.subscription_id).trim()
        : '';
    const displayPi =
      subKey !== '' && piDisplayBySubId[subKey] !== undefined
        ? piDisplayBySubId[subKey]
        : brokerPiRatingFromListing(listing);
    const showCommercialLogo = shouldShowCommercialLogoBadge(listing);
    const commercialLogoUrl = showCommercialLogo
      ? getCompanyLogoUrlFromListing(listing)
      : null;
    const showPiRating =
      shouldShowListingPiRating(listing) && !showCommercialLogo;

    const stats = buildCardStats(listing);
    const buildingsStat = stats.find(s => s.key === 'buildings');
    const floorsStat = stats.find(s => s.key === 'floors');
    const apartmentsStat = stats.find(s => s.key === 'apartments');

    const renderListCompanyStat = s =>
      s ? (
        <View key={s.key} style={styles.listResultStatGroup}>
          <View style={styles.listResultStatIconBox}>
            <Image
              source={s.icon}
              style={styles.listResultStatIcon}
              resizeMode="contain"
            />
          </View>
          <Text
            style={[
              styles.listResultStatText,
              styles.listResultStatTextCell,
            ]}>
            {s.label}
          </Text>
        </View>
      ) : null;

    const renderListAptStat = key => {
      const s = stats.find(x => x.key === key);
      if (!s) return null;
      const roomsD = formatApartmentRoomsOrFloorForDisplay(listing?.rooms);
      const areaD = formatApartmentAreaForDisplay(listing?.area);
      const floorD = formatApartmentRoomsOrFloorForDisplay(listing?.floor);
      const statText =
        key === 'rooms' && roomsD != null
          ? `${roomsD} חדרים`
          : key === 'area' && areaD != null
            ? `${areaD} ${HEB_M2}`
            : key === 'floor' && floorD != null
              ? `קומה ${floorD}`
              : s.label;
      const floorIconStyle =
        key === 'floor'
          ? [styles.listResultStatIcon, styles.listResultStatIconFlipped]
          : styles.listResultStatIcon;
      return (
        <View key={key} style={styles.listResultStatGroup}>
          <View style={styles.listResultStatIconBox}>
            <Image
              source={s.icon}
              style={floorIconStyle}
              resizeMode="contain"
            />
          </View>
          <Text
            style={[
              styles.listResultStatText,
              styles.listResultStatAptTextWrap,
              styles.listResultStatTextCell,
            ]}>
            {statText}
          </Text>
        </View>
      );
    };

    return (
      <TouchableOpacity
        key={listing.id}
        style={[styles.listResultCard, listRtlDirection]}
        activeOpacity={0.85}
        onPress={() => handleOpenListing(listing)}>
        <View style={[styles.listResultThumbCol, listRtlDirection]}>
          {primaryUri ? (
            <Image
              source={{uri: primaryUri}}
              style={styles.listResultThumb}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.listResultThumb,
                styles.listResultThumbPlaceholder,
              ]}>
              <Text style={styles.listResultThumbPlaceholderText}>
                ללא תמונה
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.listResultMid, listRtlDirection]}>
          <Text
            style={styles.listResultPrice}
            numberOfLines={2}>
            {cardPriceLabel}
          </Text>
          <View style={[styles.listResultAddressRow, listRtlDirection]}>
            <Image
              source={require('../assets/liked-ads/location.png')}
              style={styles.listResultLocationIcon}
              resizeMode="contain"
            />
            <Text
              style={styles.listResultAddress}
              numberOfLines={2}>
              {addr}
            </Text>
          </View>
          {showPreSaleBadge ? (
            <View style={[styles.listResultPurposeRow, listRtlDirection]}>
              <TouchableOpacity
                onPress={e => {
                  e?.stopPropagation?.();
                  handleToggleGridLike(listing);
                }}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                style={styles.listResultHeartInPurposeRow}
                activeOpacity={0.75}
                accessibilityLabel="מועדפים"
                accessibilityRole="button"
                accessibilityState={{selected: listRowLiked}}>
                {listRowLiked ? (
                  <MaterialCommunityIcons name="heart" size={24} color={GOLD} />
                ) : (
                  <Image
                    source={require('../assets/liked-ads/like.png')}
                    style={styles.listResultLoveIcon}
                    resizeMode="contain"
                  />
                )}
              </TouchableOpacity>
              <Image
                source={require('../assets/pre-sale.png')}
                style={styles.listResultPreSale}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={[styles.listResultPurposeRow, listRtlDirection]}>
              <TouchableOpacity
                onPress={e => {
                  e?.stopPropagation?.();
                  handleToggleGridLike(listing);
                }}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                style={styles.listResultHeartInPurposeRow}
                activeOpacity={0.75}
                accessibilityLabel="מועדפים"
                accessibilityRole="button"
                accessibilityState={{selected: listRowLiked}}>
                {listRowLiked ? (
                  <MaterialCommunityIcons name="heart" size={24} color={GOLD} />
                ) : (
                  <Image
                    source={require('../assets/liked-ads/like.png')}
                    style={styles.listResultLoveIcon}
                    resizeMode="contain"
                  />
                )}
              </TouchableOpacity>
              <View style={[styles.purposeChip, styles.listResultPurposeChip]}>
                <Text
                  style={[
                    styles.purposeChipText,
                    styles.listResultPurposeText,
                  ]}>
                  {purposeLabel(listing)}
                </Text>
              </View>
            </View>
          )}
          <View style={[styles.listResultStatsRow, listRtlDirection]}>
            {isCompany ? (
              <>
                {renderListCompanyStat(apartmentsStat)}
                <View style={[styles.listResultStatsPairGroup, listRtlDirection]}>
                  {renderListCompanyStat(buildingsStat)}
                  {renderListCompanyStat(floorsStat)}
                </View>
              </>
            ) : (
              <>
                {renderListAptStat('rooms')}
                <View style={[styles.listResultStatsPairGroup, listRtlDirection]}>
                  {renderListAptStat('area')}
                  {renderListAptStat('floor')}
                </View>
              </>
            )}
          </View>
        </View>
        {showCommercialLogo && commercialLogoUrl ? (
          <View style={[styles.listResultActions, listRtlDirection]}>
            <View
              style={styles.listResultCommercialLogoWrap}
              pointerEvents="box-none">
              <Image
                source={{uri: commercialLogoUrl}}
                style={styles.listResultCommercialLogo}
                resizeMode="cover"
                accessibilityLabel="לוגו חברה"
              />
            </View>
          </View>
        ) : showPiRating ? (
          <View style={[styles.listResultActions, listRtlDirection]}>
            <PiRatingBadge
              rating={displayPi}
              variant="list"
              style={piBadgeLtrDirection}
            />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const body = (
    <View style={[styles.fullScreen, {paddingBottom: insets.bottom}]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleClose}
          hitSlop={12}
          style={styles.closeBtn}
          accessibilityLabel="סגור">
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.white100}
          />
        </TouchableOpacity>
        <View style={styles.topBarLogoWrap} pointerEvents="none">
          <Image
            source={require('../assets/home-ai/צילום_מסך_2026-04-26_124946-removebg-preview.png')}
            style={styles.topBarLogo}
            resizeMode="contain"
            accessibilityLabel="Pi AI"
          />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kbWrap}>
        <View style={styles.body}>
          <View style={styles.searchStack}>
            <View style={styles.searchFieldWrap}>
              <TouchableOpacity
                onPress={runSearch}
                disabled={loading}
                style={styles.searchFieldSearchBtn}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                accessibilityLabel="חיפוש"
                accessibilityRole="button">
                {loading ? (
                  <ActivityIndicator color={Colors.blue100} size="small" />
                ) : (
                  <MaterialCommunityIcons
                    name="magnify"
                    size={22}
                    color="rgba(255,255,255,0.55)"
                  />
                )}
              </TouchableOpacity>
              <TextInput
                style={styles.searchFieldInput}
                placeholder="תמצא לי דירה,משרד,צימר,שותף"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={query}
                onChangeText={setQuery}
                editable={!loading}
                multiline
                blurOnSubmit={false}
                scrollEnabled={false}
                textAlignVertical="center"
                returnKeyType="search"
                onSubmitEditing={runSearch}
              />
              <Image
                source={require('../assets/home-ai/צילום_מסך_2026-04-27_124221-removebg-preview.png')}
                style={styles.searchFieldLeftArtImage}
                resizeMode="contain"
              />
            </View>
            {hasSearchedWithQuery ? (
              <View
                style={[styles.layoutToggleRow, {justifyContent: flexStart}]}>
                <View
                  style={[
                    styles.layoutToggleEndGroup,
                    {justifyContent: flexStart},
                  ]}>
                  <Text
                    style={[styles.layoutResultsCount, {textAlign: 'left'}]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}>
                    {formatResultsCountHe(results.length)}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setResultsLayout(prev =>
                        prev === 'grid' ? 'list' : 'grid',
                      )
                    }
                    style={styles.layoutToggleBtn}
                    activeOpacity={0.85}
                    accessibilityLabel={
                      resultsLayout === 'grid'
                        ? 'מעבר לתצוגת רשימה'
                        : 'מעבר לתצוגת רשת'
                    }
                    accessibilityRole="button">
                    <Image
                      source={
                        resultsLayout === 'grid'
                          ? require('../assets/swipereight.png')
                          : require('../assets/swiperleft.png')
                      }
                      style={styles.layoutToggleIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>

          {error ? (
            <Text style={[styles.errorText, {textAlign: 'left'}]}>{error}</Text>
          ) : null}

          <ScrollView
            style={styles.resultsScroll}
            contentContainerStyle={[
              styles.resultsContent,
              !hasSearchedWithQuery && !loading
                ? styles.resultsContentWelcome
                : resultsLayout === 'grid'
                  ? styles.resultsContentGrid
                  : styles.resultsContentList,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            dataSet={
              Platform.OS === 'web' ? {class: 'pi-ai-scroll'} : undefined
            }>
            {loading && searchingMessage ? (
              <View style={styles.resultsLoadingWrap}>
                <ActivityIndicator color={Colors.blue100} size="large" />
                <PiAiSearchingStatus message={searchingMessage} />
              </View>
            ) : loading && results.length === 0 && !emptyMessage ? (
              <View style={styles.resultsLoadingWrap}>
                <ActivityIndicator color={Colors.blue100} size="large" />
              </View>
            ) : !hasSearchedWithQuery && !loading ? (
              <View style={styles.welcomeColumn}>
                <Image
                  source={require('../assets/home-ai/צילום_מסך_2026-04-27_124444-removebg-preview.png')}
                  style={styles.welcomeHeroImage}
                  resizeMode="contain"
                />
                <Text
                  style={styles.welcomePromptTitle}
                  maxFontSizeMultiplier={1.35}>
                  תארו מה אתם מחפשים
                </Text>
                <Text
                  style={styles.welcomePromptExample}
                  maxFontSizeMultiplier={1.35}>
                  דירת 3 חדרים בתל אביב להשכרה עם נוף לים…
                </Text>
                {emptyMessage ? (
                  <Text
                    style={[
                      styles.hintText,
                      styles.welcomeNoCatalogHint,
                      {textAlign: 'left'},
                    ]}>
                    {emptyMessage}
                  </Text>
                ) : null}
              </View>
            ) : results.length > 0 ? (
              <>
                {results.map(listing =>
                  resultsLayout === 'grid'
                    ? renderGridCard(listing)
                    : renderListCard(listing),
                )}
              </>
            ) : emptyMessage ? (
              <Text style={[styles.hintText, {textAlign: 'left'}]}>
                {emptyMessage}
              </Text>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  if (embedded) return body;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={handleClose}>
      {body}
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: BG,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 56,
    backgroundColor: BG,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarLogoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarLogo: {
    width: 160,
    height: 44,
  },
  kbWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  searchStack: {
    width: '100%',
    marginBottom: 12,
    gap: 6,
  },
  /** Grid/list control below search field, aligned to the RTL start side. */
  layoutToggleRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    writingDirection: 'rtl',
  },
  /** Count (RTL) immediately to the left of the view-toggle icon, both on the end side. */
  layoutToggleEndGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
    gap: 6,
  },
  layoutResultsCount: {
    flexShrink: 1,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Rubik-Regular',
    writingDirection: 'rtl',
  },
  /** Icon only — no pill/border; comfortable tap target. */
  layoutToggleBtn: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: 'transparent',
  },
  layoutToggleIcon: {
    width: 48,
    height: 28,
  },
  /** Same pattern as ChatScreen add-members / FollowHub search pill (48px, icon right). */
  searchFieldWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '100%',
    minHeight: 48,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#8C85B3',
    backgroundColor: CARD_BG,
    position: 'relative',
  },
  searchFieldSearchBtn: {
    alignSelf: 'center',
    marginTop: 2,
  },
  searchFieldInput: {
    minHeight: 32,
    maxHeight: 120,
    color: Colors.white100,
    fontSize: 16,
    flex: 1,
    fontFamily: 'Rubik-Regular',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginLeft: 10,
    paddingTop: Platform.OS === 'ios' ? 6 : 4,
    paddingBottom: Platform.OS === 'ios' ? 6 : 4,
  },
  searchFieldLeftArtImage: {
    height: 22,
    width: 56,
    ...(Platform.OS === 'web' ? {objectFit: 'contain'} : {}),
  },
  errorText: {
    color: Colors.grey200,
    fontSize: 14,
    marginBottom: 8,
  },
  resultsScroll: {
    flex: 1,
    ...(Platform.OS === 'web'
      ? {scrollbarWidth: 'none', msOverflowStyle: 'none'}
      : {}),
  },
  resultsContent: {
    paddingBottom: 16,
    gap: 12,
  },
  /** Center the welcome art + copy in the remaining scroll area below the search field. */
  resultsContentWelcome: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
    minHeight: 360,
  },
  welcomeColumn: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  welcomeHeroImage: {
    width: 200,
    maxWidth: '100%',
    height: 144,
    ...(Platform.OS === 'web' ? {objectFit: 'contain'} : {}),
  },
  welcomePromptTitle: {
    color: Colors.white100,
    fontSize: 20,
    lineHeight: 28,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  welcomePromptExample: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    writingDirection: 'rtl',
    fontStyle: 'italic',
  },
  welcomeNoCatalogHint: {
    marginTop: 4,
  },
  resultsContentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    columnGap: 0,
    overflow: 'visible',
  },
  resultsContentList: {
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
    paddingBottom: 16,
    gap: 8,
  },
  /** Row: heart and badges follow the app's RTL layout direction. */
  listResultPurposeRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    flexWrap: 'wrap',
    gap: 8,
    rowGap: 6,
    marginTop: 2,
    ...forceRtlStyle,
  },
  listResultHeartInPurposeRow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  listResultLoveIcon: {
    width: 24,
    height: 24,
  },
  // Matches EditPublishAdScreen list card: full-height image column on the
  // side, edge-to-edge, clipped by the card's rounded corners (overflow hidden).
  listResultCard: {
    width: '100%',
    minHeight: 108,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    overflow: 'hidden',
    ...forceRtlStyle,
  },
  /** Full-height image column (108px wide) like adCardListRight. The card
   *  height stays content-driven; the image is absolutely filled so it never
   *  forces its (large) intrinsic height onto the card. */
  listResultThumbCol: {
    width: 108,
    alignSelf: 'stretch',
    flexShrink: 0,
    position: 'relative',
    ...forceRtlStyle,
  },
  listResultThumb: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: IMG_PLACEHOLDER_BG,
  },
  listResultThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listResultThumbPlaceholderText: {
    color: Colors.grey200,
    fontSize: 10,
    textAlign: 'center',
  },
  listResultMid: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 4,
    overflow: 'visible',
    alignItems: flexStart,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...forceRtlStyle,
  },
  listResultPrice: {
    color: '#F7F3E6',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    width: '100%',
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  listResultAddressRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 6,
    ...forceRtlStyle,
  },
  listResultAddress: {
    flex: 1,
    minWidth: 0,
    color: Colors.white100,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  listResultLocationIcon: {
    width: 18,
    height: 18,
    marginTop: 2,
    flexShrink: 0,
  },
  listResultPreSale: {
    width: 80,
    height: 28,
    flexShrink: 0,
  },
  listResultPurposeChip: {
    height: 24,
    minHeight: 24,
    paddingVertical: 0,
    paddingHorizontal: 10,
    flexShrink: 0,
  },
  listResultPurposeText: {
    fontSize: 12,
    lineHeight: 16,
  },
  listResultStatsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 6,
    width: '100%',
    marginTop: 6,
    overflow: 'visible',
    zIndex: 2,
    ...forceRtlStyle,
    ...Platform.select({
      android: {elevation: 2},
      default: {},
    }),
  },
  listResultStatsPairGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    ...forceRtlStyle,
  },
  listResultStatGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
    ...forceRtlStyle,
  },
  listResultStatIconBox: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  listResultStatIcon: {
    width: 16,
    height: 16,
    flexShrink: 0,
  },
  listResultStatIconFlipped: {
    width: 16,
    height: 16,
    transform: [{scaleX: -1}],
  },
  listResultStatText: {
    color: Colors.white100,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Rubik-Regular',
    letterSpacing: 0.2,
    textAlign: 'left',
    writingDirection: 'rtl',
    flexShrink: 0,
    ...Platform.select({
      android: {includeFontPadding: false, textAlignVertical: 'center'},
      web: {whiteSpace: 'nowrap'},
      default: {},
    }),
  },
  listResultStatTextInline: {},
  listResultStatAptTextWrap: {
    flexShrink: 0,
    ...Platform.select({
      web: {whiteSpace: 'nowrap'},
      default: {},
    }),
  },
  listResultStatValueText: {
    color: Colors.white100,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    textAlign: 'left',
    writingDirection: 'rtl',
    ...Platform.select({
      android: {includeFontPadding: false, textAlignVertical: 'center'},
      web: {whiteSpace: 'nowrap'},
      default: {},
    }),
  },
  listResultStatLabelText: {
    color: Colors.white100,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Rubik-Regular',
    letterSpacing: 0.25,
    textAlign: 'left',
    writingDirection: 'rtl',
    ...Platform.select({
      android: {includeFontPadding: false, textAlignVertical: 'center'},
      web: {whiteSpace: 'nowrap'},
      default: {},
    }),
  },
  listResultStatTextCell: {
    alignSelf: 'center',
  },
  listResultActions: {
    width: 90,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    ...forceRtlStyle,
  },
  listResultPiRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    position: 'relative',
    flexShrink: 0,
    ...forceLtrStyle,
  },
  listResultPiText: {
    color: '#FFD275',
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    zIndex: 1,
    // Vertically center the number on the star (was sitting slightly low).
    transform: [{translateY: -4}],
    ...forceLtrStyle,
  },
  listResultPiBadge: {
    width: 60,
    height: 60,
    position: 'absolute',
    marginLeft: -6,
    top: -22,
    ...Platform.select({
      web: {objectFit: 'cover'},
      default: {},
    }),
  },
  listResultCommercialLogoWrap: {
    width: 87,
    height: 87,
    borderRadius: 43.5,
    overflow: 'hidden',
    backgroundColor: '#343347',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listResultCommercialLogo: {
    width: '100%',
    height: '100%',
    ...Platform.select({
      web: {objectFit: 'cover'},
      default: {},
    }),
  },
  resultsLoadingWrap: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 14,
  },
  searchingStatusWrap: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  searchingStatusText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 17,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  // Shared (list row chips — grid cards use ListingGridCardFigma)
  purposeChip: {
    height: 22,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.roundCornerFull,
    backgroundColor: Colors.white100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purposeChipText: {
    color: Colors.blue100,
    fontSize: 12,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
  },
  hintText: {
    color: Colors.grey200,
    fontSize: 13,
    lineHeight: 20,
    writingDirection: 'rtl',
    width: '100%',
  },
});

export default PiAiSearchModal;
