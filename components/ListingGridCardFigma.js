/**
 * Figma grid listing card (shared by Pi AI search and "הנכסים שלי").
 * Company vs non-company stats follow `buildCardStats` in utils/listingGridCardFigma.
 */
import React, {useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {Colors, BorderRadius} from '../constants/styles';
import {
  getBnbHostType,
  getListingFeedAvatarUrl,
  shouldForceGoldRingForListing,
} from '../utils/userProfileImage';
import ProfileAvatar from './ProfileAvatar';
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
  shouldShowListingPiRating,
  shouldShowCommercialLogoBadge,
  getCompanyLogoUrlFromListing,
  subscriptionTypeFromListing,
  isPartnersListing as checkIsPartnersListing,
  isBnbListing as checkIsBnbListing,
  shouldHideListingCardStats,
} from '../utils/listingGridCardFigma';
import {flexStart, forceLtrStyle, forceRtlStyle} from '../utils/rtlLayout';

/** Pi badge is always LTR (number then star) — isolated from RTL grid rows. */
const piBadgeLtrDirection =
  Platform.OS === 'web' ? {direction: 'ltr'} : null;
/** Web StyleSheet omits direction; native uses I18nManager + forceRtlStyle on rows. */
const gridRtlDirection =
  Platform.OS === 'web' ? {direction: 'rtl'} : null;

const CARD_BG = '#2B2A39';
const IMG_PLACEHOLDER_BG = '#1e1d2b';
const GOLD = '#FFC40A';

const piBadgeSource = require('../assets/pi-badge.png');
const piBadgeSourceRing = require('../assets/pi-badge-ring.png');

const ListingGridCardFigma = ({
  listing,
  onPress,
  liked,
  onToggleLike,
  displayPi,
  selectedCategory = null,
  style,
}) => {
  const {
    primaryUri,
    addr,
    stats,
    isCompany,
    showPreSaleBadge,
    cardPriceLabel,
    profileUri,
    showCommercialLogo,
    commercialLogoUrl,
    showPiRating,
    piBadgeImage,
    dotCount,
    buildingsStat,
    floorsStat,
    apartmentsStat,
    isPartnersListing,
    hideCardStats,
    showCardAvatar,
    forceGoldAvatarRing,
  } = useMemo(() => {
    const galleryRaw = listingImageUrls(listing);
    const primary = galleryRaw[0] || firstImageUrl(listing);
    const g = galleryRaw.length > 0 ? galleryRaw : primary ? [primary] : [];
    const a = cleanAddress(listing);
    const st = buildCardStats(listing);
    const company = isCompanyListing(listing);
    const preSale = company && isPreSaleListing(listing);
    const priceLabel = company
      ? String(listing?.project_name || '').trim() || formatPriceHe(listing)
      : formatPriceHe(listing);
    const pUri = getListingFeedAvatarUrl(listing);
    const bnbHost = getBnbHostType(listing);
    const bnbListing = checkIsBnbListing(listing, selectedCategory);
    const partnersListing = checkIsPartnersListing(listing, selectedCategory);
    const hideStats = shouldHideListingCardStats(listing, selectedCategory);
    const businessBnb = bnbListing && bnbHost === 'business';
    const showAvatar = businessBnb || Boolean(pUri);
    const showCommercialLogo = shouldShowCommercialLogoBadge(listing);
    const commercialLogoUrl = showCommercialLogo
      ? getCompanyLogoUrlFromListing(listing)
      : null;
    const showPi =
      shouldShowListingPiRating(listing) && !showCommercialLogo;
    const badgeImg = displayPi > 4 ? piBadgeSourceRing : piBadgeSource;
    const dCount = g.length > 0 ? Math.min(5, g.length) : primary ? 1 : 0;
    const b = st.find(s => s.key === 'buildings');
    const f = st.find(s => s.key === 'floors');
    const ap = st.find(s => s.key === 'apartments');
    return {
      primaryUri: primary,
      addr: a,
      stats: st,
      isCompany: company,
      isPartnersListing: partnersListing,
      hideCardStats: hideStats,
      showCardAvatar: showAvatar,
      forceGoldAvatarRing: shouldForceGoldRingForListing(listing),
      showPreSaleBadge: preSale,
      cardPriceLabel: priceLabel,
      profileUri: pUri,
      showCommercialLogo: showCommercialLogo && !!commercialLogoUrl,
      commercialLogoUrl,
      showPiRating: showPi,
      piBadgeImage: badgeImg,
      dotCount: dCount,
      buildingsStat: b,
      floorsStat: f,
      apartmentsStat: ap,
    };
  }, [listing, displayPi, selectedCategory]);

  const renderGridStat = s =>
    s ? (
      <View key={s.key} style={styles.gridCardStatGroup}>
        <View style={styles.gridCardStatIconBox}>
          <Image
            source={s.icon}
            style={styles.gridCardStatIconFigma}
            resizeMode="contain"
          />
        </View>
        <Text
          style={[
            styles.gridCardStatTextFigma,
            styles.gridCardStatTextCell,
          ]}>
          {s.label}
        </Text>
      </View>
    ) : null;

  const renderApartmentGridStat = key => {
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
        ? [styles.gridCardStatIconFigma, styles.gridCardStatIconFlipped]
        : styles.gridCardStatIconFigma;
    return (
      <View key={key} style={styles.gridCardStatGroup}>
        <View style={styles.gridCardStatIconBox}>
          <Image source={s.icon} style={floorIconStyle} resizeMode="contain" />
        </View>
        <Text
          style={[
            styles.gridCardStatTextFigma,
            styles.gridCardApartmentStatTextWrap,
            styles.gridCardStatTextCell,
          ]}>
          {statText}
        </Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.gridCard, style]}
      activeOpacity={0.85}
      onPress={() => onPress?.(listing)}
      disabled={!onPress}>
      <View style={styles.gridCardImageSection}>
        {primaryUri ? (
          <Image
            source={{uri: primaryUri}}
            style={styles.gridCardHeroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.gridCardHeroImage, styles.cardImagePlaceholder]}>
            <Text style={styles.cardImagePlaceholderText}>ללא תמונה</Text>
          </View>
        )}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)']}
          locations={[0.45, 1]}
          style={styles.gridCardImageGradient}
        />
        <View
          style={[styles.gridCardPriceOverlay, {alignItems: flexStart}]}
          pointerEvents="box-none">
          <Text
            style={styles.gridCardPriceOnImage}
            numberOfLines={2}
            maxFontSizeMultiplier={1.4}>
            {cardPriceLabel}
          </Text>
        </View>
        {showCardAvatar ? (
          <View
            style={styles.gridCardAvatarWrap}
            accessible
            accessibilityLabel="מפרסם"
            pointerEvents="box-none">
            <ProfileAvatar
              uri={profileUri}
              size={38}
              subscriptionType={listing}
              forceGoldRing={forceGoldAvatarRing}
              imageStyle={
                Platform.OS === 'web' ? {objectFit: 'cover'} : undefined
              }
            />
          </View>
        ) : null}
        {dotCount > 0 ? (
          <View style={styles.gridCardDots} pointerEvents="none">
            {Array.from({length: dotCount}, (_, i) => (
              <View
                key={i}
                style={[
                  styles.gridCardDot,
                  i === 0
                    ? styles.gridCardDotActive
                    : styles.gridCardDotInactive,
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View style={[styles.gridCardBodyFigma, gridRtlDirection]}>
        <View
          style={[
            styles.gridCardTopRowFigma,
            gridRtlDirection,
            !showPiRating &&
              !showCommercialLogo &&
              styles.gridCardTopRowFigmaNoPi,
            !showPiRating &&
              !showCommercialLogo && {justifyContent: flexStart},
          ]}>
          <View style={[styles.gridCardTopRowEnd, gridRtlDirection]}>
            <TouchableOpacity
              onPress={e => {
                e?.stopPropagation?.();
                onToggleLike?.(listing);
              }}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              style={styles.gridCardHeartWrap}
              activeOpacity={0.75}
              accessibilityLabel="מועדפים"
              accessibilityRole="button"
              accessibilityState={{selected: !!liked}}>
              {liked ? (
                <MaterialCommunityIcons name="heart" size={22} color={GOLD} />
              ) : (
                <Image
                  source={require('../assets/liked-ads/like.png')}
                  style={styles.gridCardHeartImage}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
            {showPreSaleBadge ? (
              <Image
                source={require('../assets/pre-sale.png')}
                style={styles.gridCardPreSaleBadge}
                resizeMode="contain"
              />
            ) : (
              <View
                style={[
                  styles.purposeChip,
                  styles.gridCardPurposeChip,
                  isPartnersListing && styles.gridCardPartnersPurposeChip,
                ]}>
                <Text
                  style={[
                    styles.purposeChipText,
                    styles.gridCardPurposeChipText,
                  ]}>
                  {purposeLabel(listing, selectedCategory)}
                </Text>
              </View>
            )}
          </View>
          {showCommercialLogo ? (
            <View
              style={styles.gridCardCommercialLogoWrap}
              pointerEvents="box-none">
              <Image
                source={{uri: commercialLogoUrl}}
                style={styles.gridCardCommercialLogo}
                resizeMode="cover"
                accessibilityLabel="לוגו חברה"
              />
            </View>
          ) : showPiRating ? (
            <View
              style={[styles.gridCardPiBadge, piBadgeLtrDirection]}
              pointerEvents="box-none">
              <Image
                source={piBadgeImage}
                style={styles.gridCardPiBadgeImage}
                resizeMode="cover"
                accessibilityLabel="דירוג Pi"
              />
              <Text style={styles.gridCardPiText}>{String(displayPi)}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.gridCardAddressRowFigma, gridRtlDirection]}>
          <Image
            source={require('../assets/liked-ads/location.png')}
            style={styles.gridCardAddressIconFigma}
            resizeMode="contain"
            accessibilityLabel="מיקום"
          />
          <Text
            style={styles.gridCardAddressTextFigma}
            numberOfLines={1}>
            {addr}
          </Text>
        </View>

        {!hideCardStats ? (
        <View style={[styles.gridCardStatsRowFigma, gridRtlDirection]}>
          {isCompany ? (
            <>
              {renderGridStat(apartmentsStat)}
              <View style={[styles.gridCardStatsPairGroup, gridRtlDirection]}>
                {renderGridStat(buildingsStat)}
                {renderGridStat(floorsStat)}
              </View>
            </>
          ) : (
            <>
              {renderApartmentGridStat('rooms')}
              <View style={[styles.gridCardStatsPairGroup, gridRtlDirection]}>
                {renderApartmentGridStat('area')}
                {renderApartmentGridStat('floor')}
              </View>
            </>
          )}
        </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardImagePlaceholder: {
    backgroundColor: IMG_PLACEHOLDER_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePlaceholderText: {
    color: Colors.grey200,
    fontSize: 11,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
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
  gridCard: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 3.5},
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {elevation: 6},
      default: {},
    }),
  },
  gridCardImageSection: {
    position: 'relative',
    width: '100%',
    height: 150,
    overflow: 'hidden',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  gridCardHeroImage: {
    width: '100%',
    height: '100%',
  },
  gridCardImageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 88,
  },
  gridCardPriceOverlay: {
    position: 'absolute',
    right: 10,
    bottom: 8,
    left: 40,
    zIndex: 2,
  },
  gridCardPriceOnImage: {
    color: '#F7F3E6',
    fontSize: 17,
    lineHeight: 21,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    textAlign: 'left',
    writingDirection: 'rtl',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 6,
  },
  gridCardAvatarWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
  },
  gridCardDots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  gridCardDot: {borderRadius: 999},
  gridCardDotActive: {
    width: 6,
    height: 6,
    backgroundColor: GOLD,
  },
  gridCardDotInactive: {
    width: 5,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  gridCardBodyFigma: {
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 16,
    gap: 8,
    overflow: 'visible',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    alignItems: flexStart,
    ...forceRtlStyle,
  },
  gridCardTopRowFigma: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 40,
    paddingVertical: 2,
    overflow: 'visible',
    zIndex: 2,
    ...forceRtlStyle,
  },
  gridCardTopRowFigmaNoPi: {},
  gridCardTopRowEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
    ...forceRtlStyle,
  },
  gridCardCommercialLogoWrap: {
    width: 87,
    height: 87,
    borderRadius: 43.5,
    overflow: 'hidden',
    backgroundColor: '#343347',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardCommercialLogo: {
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' ? {objectFit: 'cover'} : {}),
  },
  // Pi badge layout mirrors the PiAiSearchModal list-card pattern: a flex
  // row with the number rendered in normal flow and the star image absolutely
  // positioned next to (not on top of) the number. This avoids the previous
  // bug where the fixed-size container + `left: 0` image overlay sat directly
  // on top of the centered text.
  gridCardPiBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    position: 'relative',
    flexShrink: 0,
    overflow: 'visible',
  },
  gridCardPiText: {
    color: '#FFD275',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    zIndex: 1,
    // Vertically center the number on the star (was sitting slightly low).
    transform: [{translateY: -4}],
    ...forceLtrStyle,
  },
  gridCardPiBadgeImage: {
    width: 60,
    height: 60,
    position: 'absolute',
    marginLeft: -6,
    top: -22,
    ...(Platform.OS === 'web' ? {objectFit: 'cover'} : {}),
  },
  gridCardPurposeChip: {
    height: 20,
    minHeight: 20,
    paddingVertical: 0,
    paddingHorizontal: 6,
  },
  gridCardPurposeChipText: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.35,
  },
  gridCardPartnersPurposeChip: {
    paddingHorizontal: 8,
    minWidth: 92,
  },
  gridCardHeartWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardHeartImage: {
    width: 22,
    height: 22,
  },
  gridCardPreSaleBadge: {
    width: 70,
    height: 24,
  },
  gridCardAddressRowFigma: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 6,
    width: '100%',
    ...forceRtlStyle,
  },
  gridCardAddressTextFigma: {
    flex: 1,
    minWidth: 0,
    color: Colors.white100,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: 'Rubik-Regular',
    letterSpacing: 0.54,
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  gridCardAddressIconFigma: {
    width: 18,
    height: 18,
    flexShrink: 0,
  },
  gridCardStatsRowFigma: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 6,
    width: '100%',
    marginTop: 4,
    overflow: 'visible',
    zIndex: 2,
    ...forceRtlStyle,
    ...Platform.select({
      android: {elevation: 2},
      default: {},
    }),
  },
  gridCardApartmentStatTextWrap: {
    flexShrink: 0,
    ...Platform.select({
      web: {whiteSpace: 'nowrap'},
      default: {},
    }),
  },
  gridCardStatTextInline: {},
  gridCardStatValueFigma: {
    color: Colors.white100,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Rubik-Regular',
    ...Platform.select({
      android: {includeFontPadding: false, textAlignVertical: 'center'},
      web: {whiteSpace: 'nowrap'},
      default: {},
    }),
  },
  gridCardStatLabelFigma: {
    color: Colors.white100,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Rubik-Regular',
    letterSpacing: 0.45,
    transform: [{translateY: -1}],
    ...Platform.select({
      android: {includeFontPadding: false, textAlignVertical: 'center'},
      web: {whiteSpace: 'nowrap'},
      default: {},
    }),
  },
  gridCardStatsPairGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    ...forceRtlStyle,
  },
  gridCardStatGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
    ...forceRtlStyle,
  },
  gridCardStatTextFigma: {
    color: Colors.white100,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Rubik-Regular',
    letterSpacing: 0.45,
    textAlign: 'left',
    writingDirection: 'rtl',
    flexShrink: 0,
    ...Platform.select({
      android: {includeFontPadding: false, textAlignVertical: 'center'},
      web: {whiteSpace: 'nowrap'},
      default: {},
    }),
  },
  gridCardStatIconBox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gridCardStatIconFlipped: {
    width: 20,
    height: 20,
    transform: [{scaleX: -1}],
  },
  gridCardStatTextCell: {
    alignSelf: 'center',
  },
  gridCardStatIconFigma: {
    width: 20,
    height: 20,
    flexShrink: 0,
  },
});

export default ListingGridCardFigma;
