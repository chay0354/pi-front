import React, {useMemo} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {SimpleLineIcons, MaterialCommunityIcons} from '@expo/vector-icons';
import LocationMap from './LocationMap';
import PartnersSmartInfoBlock from './PartnersSmartInfoBlock';
import {flexStart, hebrewTextAlign} from '../utils/rtlLayout';
import {parseLandBlockParcelFromListing} from '../utils/enrichListingForUserProfile';
import {
  buildCompanyLandAttrChips,
  landOffersSectionTitle,
  normalizeLandOfferParcels,
} from '../utils/landListingFields';

const SCREEN_W = Dimensions.get('window').width;
const CONTENT_W = Math.min(366, SCREEN_W - 48);
const CARD_BG = '#2B2A39';
const DIVIDER = '#373548';
const TEXT_SECONDARY = '#D2D0DC';
const CREAM = '#F7F3E6';
const DEEP = '#1E1D27';
const GOLD_PI = '#FFD275';
const REPORT_BG = '#4D4966';

import PiRatingBadge from './PiRatingBadge';

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function formatLandArea(unit, area) {
  const n = Number(area);
  if (Number.isNaN(n) || n <= 0) return '—';
  const u = unit === 'sqm' ? 'sqm' : 'dunam';
  if (u === 'sqm') {
    return `${n.toLocaleString('he-IL')} מ"ר`;
  }
  const formatted =
    Math.abs(n - Math.round(n)) < 0.001
      ? String(Math.round(n))
      : n.toLocaleString('he-IL', {maximumFractionDigits: 1});
  return `${formatted} דונם`;
}

function formatLandPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n) || n <= 0) return '—';
  return `₪${Math.round(n).toLocaleString('he-IL')}`;
}

const LAND_OFFER_ICON = require('../assets/new-profile-pages/lands/land-offer.png');

function LandParcelIcon() {
  return (
    <Image
      source={LAND_OFFER_ICON}
      style={styles.landOfferIcon}
      resizeMode="contain"
    />
  );
}

/** Figma 1:171213 — גוש / חלקה badge (label 16 + value 28) */
function GushHelkaCard({label, value}) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.gushHelkaCard}>
      <View style={styles.gushHelkaInner}>
        <Text style={styles.gushHelkaLabel}>{label}:</Text>
        <Text style={styles.gushHelkaValue}>{String(value)}</Text>
      </View>
    </View>
  );
}

function AttrChip({label, iconSource}) {
  return (
    <View style={styles.attrChip}>
      <View style={styles.attrChipInner}>
        <Text style={styles.attrChipText}>{label}</Text>
        {iconSource ? (
          <Image
            source={iconSource}
            style={styles.attrChipIcon}
            resizeMode="contain"
          />
        ) : null}
      </View>
    </View>
  );
}

/**
 * קרקעות (category 7) listing detail — Figma land chips (גוש / חלקה / תב״ע / היתר).
 */
export default function CompanyLandListingProfileContent({
  listing,
  displayName,
  displayPiRating = null,
  publisherAvatarUri,
  mapAddress,
  adAddress,
  onReportPress,
  hideReportButton = false,
}) {
  const purpose =
    firstNonEmpty(listing?.purpose) ||
    (listing?.listingPurpose === 'rent' ? 'להשכרה' : 'למכירה');

  const title = firstNonEmpty(
    listing?.project_name,
    listing?.projectName,
    listing?.property_name,
    listing?.title,
    listing?.name,
    displayName,
  );

  const addr = firstNonEmpty(
    mapAddress,
    listing?.address,
    listing?.location,
    listing?.search_address,
    listing?.land_address,
    listing?.landAddress,
  );

  const smartAddr = firstNonEmpty(adAddress, addr);

  const description = String(listing?.description || '').trim();

  const publisherName = firstNonEmpty(
    displayName,
    listing?.creator_name,
    listing?.creatorName,
    listing?.business_name,
    listing?.name,
  );

  const landParcels = useMemo(
    () => normalizeLandOfferParcels(listing),
    [listing],
  );

  const offersTitle = useMemo(() => landOffersSectionTitle(listing), [listing]);

  const {parcel, block} = useMemo(() => {
    const parsed = parseLandBlockParcelFromListing(listing);
    return {
      parcel: parsed.land_parcel,
      block: parsed.land_block,
    };
  }, [listing]);

  const attrChips = useMemo(
    () => buildCompanyLandAttrChips(listing),
    [listing],
  );

  const landDetailTiles = useMemo(() => {
    const tiles = [];
    if (block) {
      tiles.push({id: 'block', kind: 'gush', label: 'גוש', value: block});
    }
    if (parcel) {
      tiles.push({id: 'parcel', kind: 'gush', label: 'חלקה', value: parcel});
    }
    attrChips.forEach(chip => {
      tiles.push({
        id: chip.id,
        kind: 'attr',
        label: chip.label,
        iconSource: chip.iconSource,
      });
    });
    return tiles;
  }, [block, parcel, attrChips]);

  const showLandDetailsGrid = landDetailTiles.length > 0;
  const showPiRating =
    displayPiRating != null && !Number.isNaN(Number(displayPiRating));

  return (
    <View style={styles.wrap}>
      <View style={[styles.sectionTop, {width: CONTENT_W}]}>
        <View style={styles.piPurposeRow}>
          {showPiRating ? (
            <PiRatingBadge rating={displayPiRating} variant="listing" />
          ) : null}
          <View style={styles.tagWhite}>
            <Text style={styles.tagWhiteText}>{purpose}</Text>
          </View>
        </View>

        {title ? <Text style={styles.heroTitle}>{title}</Text> : null}

        {addr ? (
          <View style={styles.locRow}>
            <SimpleLineIcons
              name="location-pin"
              size={18}
              color={TEXT_SECONDARY}
            />
            <Text style={styles.locText}>{addr}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.line, {width: CONTENT_W}]} />

      <View style={[styles.postedBy, {width: CONTENT_W}]}>
        <Text style={styles.postedByLabel}>פורסם ע״י</Text>
        <View style={styles.postedByRow}>
          {publisherAvatarUri ? (
            <Image
              source={{uri: publisherAvatarUri}}
              style={styles.postedByAvatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.postedByAvatar, styles.postedByAvatarPh]}>
              <MaterialCommunityIcons name="account" size={14} color="#fff" />
            </View>
          )}
          <Text style={styles.postedByName}>{publisherName || 'משתמש'}</Text>
        </View>
      </View>

      {description ? (
        <Text style={[styles.bodyText, {width: CONTENT_W}]}>{description}</Text>
      ) : (
        <Text style={[styles.bodyMuted, {width: CONTENT_W}]}>אין תיאור</Text>
      )}

      {landParcels.length > 0 ? (
        <View style={[styles.offersSection, {width: CONTENT_W}]}>
          <View style={[styles.line, {width: CONTENT_W, marginTop: 0}]} />
          <Text style={styles.offersSectionTitle}>{offersTitle}</Text>
          <View style={styles.offersList}>
            {landParcels.map((parcelRow, idx) => {
              const priceStr = formatLandPrice(parcelRow?.price);
              const sizeStr = formatLandArea(parcelRow?.unit, parcelRow?.area);
              return (
                <View key={`land-offer-${idx}`} style={styles.offerCard}>
                  <View style={styles.offerCardHeader}>
                    <LandParcelIcon />
                    <Text style={styles.offerCardTitle}>קרקע {idx + 1}</Text>
                  </View>
                  <Text style={styles.offerCardDetails}>
                    {`מחיר: ${priceStr}   |   גודל: ${sizeStr}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {showLandDetailsGrid ? (
        <>
          <View style={[styles.line, {width: CONTENT_W}]} />
          <View style={[styles.landDetailsGrid, {width: CONTENT_W}]}>
            {landDetailTiles.map(tile => (
              <View key={tile.id} style={styles.landDetailsCell}>
                {tile.kind === 'gush' ? (
                  <GushHelkaCard label={tile.label} value={tile.value} />
                ) : (
                  <AttrChip label={tile.label} iconSource={tile.iconSource} />
                )}
              </View>
            ))}
          </View>
        </>
      ) : null}

      {addr ? (
        <>
          <View style={[styles.line, {width: CONTENT_W}]} />
          <LocationMap
            address={addr}
            containerStyle={[styles.mapBox, {width: CONTENT_W}]}
          />
        </>
      ) : null}

      <View style={[styles.line, {width: CONTENT_W}]} />
      <PartnersSmartInfoBlock adAddress={smartAddr} />

      {!hideReportButton ? (
        <TouchableOpacity
          style={[styles.reportBtn, {width: CONTENT_W}]}
          onPress={onReportPress}
          activeOpacity={0.85}>
          <MaterialCommunityIcons
            name="alert-outline"
            size={24}
            color={CREAM}
          />
          <Text style={styles.reportBtnText}>דווח</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: flexStart,
    paddingBottom: 24,
    width: '100%',
  },
  sectionTop: {
    gap: 18,
    alignItems: 'flex-end',
    width: '100%',
  },
  piPurposeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  piBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    minWidth: 48,
    minHeight: 48,
  },
  piBadgeImage: {
    width: 85,
    height: 85,
    position: 'absolute',
    marginLeft: -7,
    top: -20,
  },
  piBadgeText: {
    color: GOLD_PI,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  tagWhite: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagWhiteText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 14,
    lineHeight: 16,
    color: DEEP,
    textAlign: 'left',
  },
  heroTitle: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 32,
    color: '#FFFFFF',
    textAlign: 'left',
    width: '100%',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 5,
    width: '100%',
  },
  locText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    lineHeight: 16,
    color: TEXT_SECONDARY,
    textAlign: 'left',
    flexShrink: 1,
  },
  line: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 20,
    alignSelf: flexStart,
  },
  postedBy: {
    alignItems: flexStart,
    marginBottom: 12,
    width: '100%',
  },
  postedByLabel: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    alignSelf: 'stretch',
    marginBottom: 7,
    width: '100%',
  },
  postedByRow: {
    // forceRTL: `row` + flex-start puts the logo on the physical right.
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 8,
    width: '100%',
    alignSelf: flexStart,
  },
  postedByAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  postedByAvatarPh: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postedByName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
  },
  bodyText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    lineHeight: 32,
    color: '#FFFFFF',
    textAlign: 'left',
    alignSelf: flexStart,
  },
  bodyMuted: {
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    lineHeight: 32,
    color: TEXT_SECONDARY,
    textAlign: 'left',
    alignSelf: flexStart,
  },
  offersSection: {
    alignSelf: flexStart,
    gap: 24,
    marginBottom: 4,
  },
  offersSectionTitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    lineHeight: 22,
    color: TEXT_SECONDARY,
    textAlign: 'left',
    width: '100%',
  },
  offersList: {
    width: '100%',
    gap: 14,
  },
  offerCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
    width: '100%',
    gap: 14,
  },
  offerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    width: '100%',
  },
  offerCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  offerCardDetails: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    width: '100%',
  },
  landOfferIcon: {
    width: 28,
    height: 28,
  },
  attrChipIcon: {
    width: 28,
    height: 28,
  },
  landDetailsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
    alignSelf: flexStart,
  },
  landDetailsCell: {
    width: (CONTENT_W - 12) / 2,
  },
  gushHelkaCard: {
    width: '100%',
    height: 56,
    minHeight: 56,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gushHelkaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  gushHelkaLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  gushHelkaValue: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 28,
    lineHeight: 31,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  attrChip: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    minHeight: 56,
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  attrChipInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  attrChipText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 16,
    lineHeight: 19,
    color: '#FFFFFF',
    textAlign: 'left',
    flexShrink: 1,
  },
  mapBox: {
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: flexStart,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: REPORT_BG,
    borderRadius: 12,
    paddingVertical: 14,
    alignSelf: flexStart,
  },
  reportBtnText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 16,
    color: CREAM,
    textAlign: 'left',
  },
});
