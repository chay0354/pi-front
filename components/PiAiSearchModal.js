import React, {useState, useCallback, useEffect, useContext} from 'react';
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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Colors, BorderRadius} from '../constants/styles';
import {
  getListings,
  getReviews,
  likeListing,
  unlikeListing,
} from '../utils/api';
import {
  loadTikTokLikedState,
  persistLikedListingIds,
} from '../utils/tikTokLikedStorage';
import {ContextHook} from '../hooks/ContextHook';
import {rankListingsByQuery} from '../utils/piAiMatchListings';
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
import {flexEnd, flexStart} from '../index';

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
const piBadgeSource = require('../assets/pi-badge.png');
const piBadgeSourceRing = require('../assets/pi-badge-ring.png');

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

/**
 * Full-screen Pi AI search: describe a property, search published listings,
 * results render as grid cards.
 */
const PiAiSearchModal = ({
  visible,
  onClose,
  onOpenUserProfile,
  embedded = false,
}) => {
  const insets = useSafeAreaInsets();
  const {currentUser} = useContext(ContextHook);
  const [query, setQuery] = useState('');
  /** Full catalog; used for browse (no filter) and as the pool for search ranking. */
  const [allListings, setAllListings] = useState([]);
  const [results, setResults] = useState([]);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  /**
   * Until the first non-empty search, we show the welcome state (no listing cards),
   * even if the catalog is already loaded in `allListings`.
   */
  const [hasSearchedWithQuery, setHasSearchedWithQuery] = useState(false);
  /** Result layout: 2-up grid (default) or compact list rows. */
  const [resultsLayout, setResultsLayout] = useState('grid');
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
    (async () => {
      setLoading(true);
      setError('');
      setHasSearchedWithQuery(false);
      try {
        const uid = currentUser?.id != null ? String(currentUser.id) : null;
        const res = await getListings({
          status: 'published',
          ...(uid ? {user_id: uid} : {}),
        });
        if (cancelled) {
          return;
        }
        const listings = res?.listings || [];
        setAllListings(listings);
        setQuery('');
        setEmptyMessage(listings.length ? '' : 'אין מודעות שפורסמו כרגע.');
        setResults([]);
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
    setLoading(true);
    setEmptyMessage('');
    try {
      let listings = allListings;
      if (listings.length === 0) {
        const result = await getListings({
          status: 'published',
          ...(uid ? {user_id: uid} : {}),
        });
        listings = result?.listings || [];
        setAllListings(listings);
        if (uid) {
          syncLikesFromListings(listings, uid);
        }
      }

      const rankedResult = rankListingsByQuery(q, listings, {topN: 20});
      if (!rankedResult.ranked.length) {
        setResults([]);
        setEmptyMessage(
          `חיפשתי ב-${listings.length} מודעות ולא מצאתי התאמה ברורה. נסה לפרט יותר — שם עיר, טווח מחיר, או מספר חדרים.`,
        );
      } else {
        const rows = rankedResult.ranked.map(r => r.listing);
        setResults(rows);
        if (uid) {
          syncLikesFromListings(rows, uid);
        }
      }
    } catch (e) {
      setError(e?.message || 'שגיאה בטעינת המודעות. בדוק חיבור לשרת.');
    } finally {
      setLoading(false);
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
    const piBadgeImage = displayPi > 4 ? piBadgeSourceRing : piBadgeSource;
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
              {textAlign: 'left'},
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
      const textRow = [
        styles.listResultStatTextInline,
        styles.listResultStatAptTextWrap,
      ];
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
          {key === 'rooms' && roomsD != null ? (
            <Text
              style={[...textRow, styles.listResultStatTextCell]}
              textAlign={'left'}
              writingDirection="rtl">
              <Text style={styles.listResultStatValueText}>{roomsD}</Text>
              <Text style={styles.listResultStatLabelText}> חדרים</Text>
            </Text>
          ) : key === 'area' && areaD != null ? (
            <Text
              style={[...textRow, styles.listResultStatTextCell]}
              textAlign={'left'}
              writingDirection="rtl">
              <Text style={styles.listResultStatValueText}>{areaD}</Text>
              <Text style={styles.listResultStatLabelText}> {HEB_M2}</Text>
            </Text>
          ) : key === 'floor' && floorD != null ? (
            <Text
              style={[...textRow, styles.listResultStatTextCell]}
              textAlign={'left'}
              writingDirection="rtl">
              <Text style={styles.listResultStatLabelText}>קומה </Text>
              <Text style={styles.listResultStatValueText}>{floorD}</Text>
            </Text>
          ) : (
            <Text
              style={[
                styles.listResultStatText,
                styles.listResultStatAptTextWrap,
                styles.listResultStatTextCell,
              ]}
              textAlign={'left'}
              writingDirection="rtl">
              {s.label}
            </Text>
          )}
        </View>
      );
    };

    return (
      <TouchableOpacity
        key={listing.id}
        style={styles.listResultCard}
        activeOpacity={0.85}
        onPress={() => handleOpenListing(listing)}>
        <View style={styles.listResultThumbCol}>
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
        <View style={[styles.listResultMid, {alignItems: flexStart}]}>
          <Text
            style={[styles.listResultPrice, {textAlign: 'left'}]}
            numberOfLines={2}>
            {cardPriceLabel}
          </Text>
          <View
            style={[
              styles.listResultAddressRow,
              {alignItems: flexEnd, justifyContent: flexEnd},
            ]}>
            <Text
              style={[styles.listResultAddress, {textAlign: 'left'}]}
              numberOfLines={2}>
              {addr}
            </Text>
            <Image
              source={require('../assets/liked-ads/location.png')}
              style={styles.listResultLocationIcon}
              resizeMode="contain"
            />
          </View>
          {showPreSaleBadge ? (
            <View style={styles.listResultPurposeRow}>
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
            <View style={styles.listResultPurposeRow}>
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
          <View style={[styles.listResultStatsRow, {justifyContent: flexEnd}]}>
            {isCompany ? (
              <>
                {renderListCompanyStat(apartmentsStat)}
                <View style={styles.listResultStatsPairGroup}>
                  {renderListCompanyStat(buildingsStat)}
                  {renderListCompanyStat(floorsStat)}
                </View>
              </>
            ) : (
              <>
                {renderListAptStat('rooms')}
                <View style={styles.listResultStatsPairGroup}>
                  {renderListAptStat('area')}
                  {renderListAptStat('floor')}
                </View>
              </>
            )}
          </View>
        </View>
        {showCommercialLogo && commercialLogoUrl ? (
          <View style={styles.listResultActions}>
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
          <View style={styles.listResultActions}>
            <View style={styles.listResultPiRow} pointerEvents="box-none">
              <Text style={styles.listResultPiText}>{String(displayPi)}</Text>
              <Image
                source={piBadgeImage}
                style={styles.listResultPiBadge}
                resizeMode="cover"
                accessibilityLabel="דירוג Pi"
              />
            </View>
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
            {loading && results.length === 0 && !emptyMessage ? (
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
    alignItems: 'center',
    paddingHorizontal: 10,
    width: '100%',
    minHeight: 48,
    height: 48,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#8C85B3',
    backgroundColor: CARD_BG,
    justifyContent: 'center',
    position: 'relative',
  },
  searchFieldInput: {
    minHeight: 48,
    color: Colors.white100,
    fontSize: 16,
    flex: 1,
    fontFamily: 'Rubik-Regular',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginLeft: 10,
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
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    rowGap: 6,
    marginTop: 2,
    writingDirection: 'rtl',
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
  listResultCard: {
    width: '100%',
    minHeight: 108,
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    overflow: 'visible',
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {elevation: 3},
      default: {},
    }),
  },
  /** Fills list row height; 88px thumb is vertically centered. */
  listResultThumbCol: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    flexShrink: 0,
  },
  listResultThumb: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: IMG_PLACEHOLDER_BG,
    flexShrink: 0,
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
  },
  listResultPrice: {
    color: '#F7F3E6',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    width: '100%',
    writingDirection: 'rtl',
  },
  listResultAddressRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 4,
  },
  listResultAddress: {
    flex: 1,
    minWidth: 0,
    color: Colors.white100,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Rubik-Regular',
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
    flexDirection: 'row-reverse',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 4,
    width: '100%',
    marginTop: 6,
    overflow: 'visible',
    zIndex: 2,
    ...Platform.select({
      android: {elevation: 2},
      default: {},
    }),
  },
  listResultStatsPairGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  listResultStatGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
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
    width: 76,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  listResultPiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  listResultPiText: {
    color: '#FFD275',
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    marginRight: -2,
  },
  listResultPiBadge: {
    width: 60,
    height: 60,
    marginLeft: -14,
    marginTop: 0,
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
