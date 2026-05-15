import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {SimpleLineIcons, MaterialCommunityIcons} from '@expo/vector-icons';
import LocationMap from './LocationMap';
import {flexEnd, flexStart} from '../index';

const SCREEN_W = Dimensions.get('window').width;
const CONTENT_W = Math.min(366, SCREEN_W - 48);
const CARD_BG = '#2B2A39';
const DIVIDER = '#373548';
const TEXT_SECONDARY = '#D2D0DC';
const CREAM = '#F7F3E6';
const DEEP = '#1E1D27';
const GOLD_BADGE = '#FFC40A';

/** @type {Record<string, string>} */
const PROPERTY_TYPE_LABELS = {
  room: 'חדר',
  housing_unit: 'יחידת דיור',
  house: 'בית',
  'B&B': 'צימר',
  bnb: 'צימר',
  holiday_apartment: 'דירת נופש',
  villa: 'וילה',
  special: 'מיוחדים',
};

/** Match FormsElement/HospitalityNature + feed codes */
const HOSPITALITY_LABELS = {
  landscapes: 'נופים',
  on_the_beach: 'על הים',
  with_pool: 'עם בריכה',
  nature: 'טבע',
  experiences: 'חוויות',
  special: 'מיוחדים',
  rural: 'כפרי',
  desert: 'מדבר',
};

/** service_facility.selected → Hebrew (bnbFormFields serviceandfacility) */
const SERVICE_LABELS = {
  pool: 'בריכה',
  merger: 'מיזוג',
  fridge: 'מקרר',
  laundry: 'כביסה',
  eater: 'אוכל',
  kitchen: 'מטבח',
  locker: 'ארון',
  tv: 'טלויזיה',
  safe: 'כספת',
  smoke_detector: 'גלאי עשן',
  wifi_internet: 'אינטרנט wifi',
  private_services: 'שירותים פרטיים',
  shared_services: 'שירותים משותפים',
  private_shower: 'מקלחת פרטית',
  shared_shower: 'מקלחת משותפת',
  accessible_place: 'מקום נגיש',
  suitable_for_animals: 'מתאים לבעלי חיים',
  suitable_for_smokers: 'מתאים למעשנים',
};

function formatShortDate(d) {
  if (d == null || d === '') return '';
  try {
    const s = String(d).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const dt = new Date(s);
      if (!isNaN(dt.getTime())) {
        return `${dt.getDate()}.${dt.getMonth() + 1}`;
      }
    }
    return s;
  } catch {
    return String(d);
  }
}

/**
 * BnB (category 5) listing detail body — Figma 5:413003.
 * Only mounted when the opened listing is a non-post BnB ad from the feed.
 */
export default function BnbListingProfileContent({
  listing,
  mapAddress,
  onReportPress,
}) {
  const hotDeal =
    listing?.hot_deal === true ||
    listing?.hot_deal === 'true' ||
    listing?.hot_deal === 't' ||
    listing?.hotDeal === true;
  const rawType = String(
    listing?.property_type || listing?.propertyTypeRaw || '',
  )
    .trim()
    .toLowerCase();
  const unitLabel =
    PROPERTY_TYPE_LABELS[rawType] ||
    PROPERTY_TYPE_LABELS[String(listing?.property_type)] ||
    'יחידת דיור';

  const ppn =
    listing?.price_per_night != null && listing?.price_per_night !== ''
      ? Number(listing.price_per_night)
      : null;
  const fallbackPrice =
    listing?.price != null && listing?.price !== ''
      ? Number(listing.price)
      : null;
  const priceNum =
    ppn != null && !Number.isNaN(ppn)
      ? ppn
      : fallbackPrice != null && !Number.isNaN(fallbackPrice)
        ? fallbackPrice
        : null;
  const priceStr =
    priceNum != null ? `₪${Math.round(priceNum).toLocaleString('he-IL')}` : '—';

  const title =
    String(
      listing?.project_name ||
        listing?.projectName ||
        listing?.title ||
        listing?.name ||
        listing?.property_name ||
        '',
    ).trim() || 'ללא כותרת';

  const addr = String(
    listing?.address || listing?.location || listing?.search_address || '',
  ).trim();

  const rooms =
    listing?.rooms != null && listing?.rooms !== ''
      ? Number(listing.rooms)
      : null;
  const roomsLine =
    rooms != null && !Number.isNaN(rooms) ? `${rooms} חדרים` : null;

  const acc = listing?.accommodation_offers || listing?.accommodationOffers;
  const checkIn =
    acc?.check_in_date ||
    listing?.check_in_date ||
    listing?.checkInDate ||
    null;
  const checkOut =
    acc?.check_out_date ||
    listing?.check_out_date ||
    listing?.checkOutDate ||
    null;
  const ci = formatShortDate(checkIn);
  const co = formatShortDate(checkOut);
  const datesLine =
    ci && co
      ? `תאריך מוצע: ${ci}-${co}`
      : ci
        ? `תאריך כניסה: ${ci}`
        : co
          ? `תאריך יציאה: ${co}`
          : null;

  const cancelRaw = String(
    listing?.cancellation_policy || listing?.cancellationPolicy || '',
  )
    .trim()
    .toLowerCase();
  const showFreeCancel =
    cancelRaw === 'without_penalty' ||
    cancelRaw.includes('ללא') ||
    cancelRaw.includes('קנס');

  const description = String(listing?.description || '').trim();

  const hospitalityCode = String(listing?.hospitality_nature || '').trim();
  const hospitalityLabel = HOSPITALITY_LABELS[hospitalityCode] || null;

  const sf = listing?.service_facility || listing?.serviceFacility;
  const serviceKey =
    sf && typeof sf === 'object' ? (sf.selected ?? sf.key) : null;
  const serviceLabel =
    serviceKey && SERVICE_LABELS[String(serviceKey)]
      ? SERVICE_LABELS[String(serviceKey)]
      : serviceKey
        ? String(serviceKey)
        : null;

  /** Split hospitality + services into two columns for grid */
  const hospTiles = hospitalityLabel
    ? [{key: 'h', label: hospitalityLabel}]
    : [];

  return (
    <View style={styles.wrap}>
      <View style={[styles.sectionTop, {width: CONTENT_W}]}>
        <View style={styles.tagsRow}>
          {hotDeal ? (
            <View style={styles.tagHot}>
              <Text style={styles.tagHotText}>Hot deal</Text>
            </View>
          ) : null}
          <View style={styles.tagWhite}>
            <Text style={styles.tagWhiteText}>{unitLabel}</Text>
          </View>
        </View>

        <View style={styles.priceBlock}>
          <View style={styles.priceRow}>
            <View style={styles.pricePerNightLabels}>
              <Text style={styles.pricePerNightSmall}>מחיר </Text>
              <Text style={styles.pricePerNightSmall}>ללילה</Text>
            </View>
            <View style={styles.priceVertRule} />
            <Text style={styles.priceBig}>{priceStr}</Text>
          </View>
          <Text style={styles.listingTitle}>{title}</Text>
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
      </View>

      <View style={[styles.line, {width: CONTENT_W}]} />

      {roomsLine || datesLine || showFreeCancel ? (
        <>
          <View style={[styles.highlightCard, {width: CONTENT_W}]}>
            {roomsLine ? (
              <View style={styles.highlightRow}>
                <Image
                  source={require('../assets/apr-details/icons_6.png')}
                  style={styles.highlightIcon}
                  resizeMode="contain"
                />
                <Text style={styles.highlightText}>{roomsLine}</Text>
              </View>
            ) : null}
            {roomsLine && datesLine ? (
              <View style={styles.highlightDivider} />
            ) : null}
            {datesLine ? (
              <View style={styles.highlightRow}>
                <MaterialCommunityIcons
                  name="calendar-month-outline"
                  size={28}
                  color="#FFFFFF"
                />
                <Text style={styles.highlightText}>{datesLine}</Text>
              </View>
            ) : null}
            {(roomsLine || datesLine) && showFreeCancel ? (
              <View style={styles.highlightDivider} />
            ) : null}
            {showFreeCancel ? (
              <View style={styles.cancelRow}>
                <View style={styles.checkCircle}>
                  <MaterialCommunityIcons name="check" size={14} color={DEEP} />
                </View>
                <Text style={styles.highlightText}>ביטול ללא קנס</Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.line, {width: CONTENT_W}]} />
        </>
      ) : null}

      {description ? (
        <Text style={[styles.bodyText, {width: CONTENT_W}]}>{description}</Text>
      ) : (
        <Text style={[styles.bodyMuted, {width: CONTENT_W}]}>אין תיאור</Text>
      )}

      <View style={[styles.line, {width: CONTENT_W}]} />

      <Text style={styles.sectionHeading}>אופי האירוח</Text>
      {hospTiles.length > 0 ? (
        hospTiles.length === 1 ? (
          <View
            style={[
              styles.natureChip,
              styles.natureChipSingle,
              {width: CONTENT_W},
            ]}>
            <Text style={styles.natureChipText}>{hospTiles[0].label}</Text>
          </View>
        ) : (
          <View style={[styles.twoColGrid, {width: CONTENT_W}]}>
            <View style={styles.col}>
              {hospTiles
                .filter((_, i) => i % 2 === 0)
                .map(t => (
                  <View key={t.key} style={styles.natureChip}>
                    <Text style={styles.natureChipText}>{t.label}</Text>
                  </View>
                ))}
            </View>
            <View style={styles.col}>
              {hospTiles
                .filter((_, i) => i % 2 === 1)
                .map(t => (
                  <View key={t.key} style={styles.natureChip}>
                    <Text style={styles.natureChipText}>{t.label}</Text>
                  </View>
                ))}
            </View>
          </View>
        )
      ) : (
        <Text style={[styles.bodyMuted, {width: CONTENT_W}]}>
          לא צוין אופי אירוח
        </Text>
      )}

      <View style={[styles.line, {width: CONTENT_W}]} />

      <Text style={styles.sectionHeading}>שירותים ומתקנים במקום</Text>
      {serviceLabel ? (
        <View style={[styles.serviceChipWrap, {width: CONTENT_W}]}>
          <View style={styles.serviceChip}>
            <Text style={styles.serviceChipText}>{serviceLabel}</Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.bodyMuted, {width: CONTENT_W}]}>
          לא צוינו שירותים
        </Text>
      )}

      <View style={[styles.line, {width: CONTENT_W}]} />

      <LocationMap
        address={mapAddress || addr || ''}
        containerStyle={styles.mapBox}
      />

      <TouchableOpacity
        style={[styles.reportBtn, {width: CONTENT_W}]}
        onPress={onReportPress}
        activeOpacity={0.85}>
        <MaterialCommunityIcons name="alert-outline" size={22} color={CREAM} />
        <Text style={styles.reportBtnText}>דיווח</Text>
      </TouchableOpacity>
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
    gap: 20,
    alignItems: flexEnd,
    marginBottom: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexEnd,
    gap: 12,
    flexWrap: 'wrap',
    width: '100%',
  },
  tagHot: {
    backgroundColor: GOLD_BADGE,
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagHotText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 14,
    lineHeight: 16,
    color: DEEP,
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
  },
  priceBlock: {
    width: '100%',
    gap: 18,
    alignItems: flexEnd,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: flexEnd,
    gap: 10,
    width: '100%',
  },
  pricePerNightLabels: {
    alignItems: flexEnd,
  },
  pricePerNightSmall: {
    fontFamily: 'Rubik-Medium',
    fontSize: 14,
    lineHeight: 16,
    color: CREAM,
    textAlign: 'left',
  },
  priceVertRule: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  priceBig: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 32,
    lineHeight: 37,
    color: CREAM,
    textAlign: 'left',
  },
  listingTitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    lineHeight: 32,
    color: '#FFFFFF',
    textAlign: 'left',
    width: '100%',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 5,
    width: '100%',
  },
  locText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    lineHeight: 16,
    color: TEXT_SECONDARY,
    textAlign: 'left',
    flex: 1,
  },
  line: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 20,
    alignSelf: flexStart,
  },
  highlightCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 20,
    gap: 18,
    alignItems: 'stretch',
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexEnd,
    gap: 6,
  },
  highlightText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    lineHeight: 32,
    color: '#FFFFFF',
    textAlign: 'left',
    flexShrink: 1,
  },
  highlightIcon: {
    width: 28,
    height: 28,
  },
  highlightDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    width: '100%',
  },
  cancelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 8,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'left',
    alignSelf: flexStart,
  },
  sectionHeading: {
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    color: TEXT_SECONDARY,
    textAlign: 'left',
    width: CONTENT_W,
    marginBottom: 12,
    alignSelf: flexStart,
  },
  twoColGrid: {
    flexDirection: 'row-reverse',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: flexStart,
    alignSelf: flexStart,
  },
  col: {
    flex: 1,
    gap: 10,
  },
  natureChip: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  natureChipSingle: {
    alignSelf: flexStart,
  },
  natureChipText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  serviceChipWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: flexEnd,
    alignSelf: flexStart,
  },
  serviceChip: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  serviceChipText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'left',
  },
  mapBox: {
    width: CONTENT_W,
    height: 208,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: flexStart,
    marginBottom: 20,
  },
  reportBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#322F42',
    borderRadius: 12,
    paddingVertical: 14,
    alignSelf: flexStart,
  },
  reportBtnText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 18,
    color: CREAM,
    textAlign: 'left',
  },
});
