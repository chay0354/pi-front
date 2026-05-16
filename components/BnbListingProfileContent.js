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
import {flexStart} from '../index';

const SCREEN_W = Dimensions.get('window').width;
const CONTENT_W = Math.min(366, SCREEN_W - 48);
const CARD_BG = '#2B2A39';
const DIVIDER = '#373548';
const TEXT_SECONDARY = '#D2D0DC';
const CREAM = '#F7F3E6';
const DEEP = '#1E1D27';
const GOLD_BADGE = '#FFC40A';
const REPORT_BG = '#4D4966';

const PROPERTY_TYPE_LABELS = {
  room: 'חדר',
  housing_unit: 'יחידת דיור',
  house: 'בית',
  'b&b': 'צימר',
  bnb: 'צימר',
  holiday_apartment: 'דירת נופש',
  villa: 'וילה',
  special: 'מיוחדים',
};

const HOSPITALITY_LABELS = {
  landscapes: 'נופים',
  on_the_beach: 'על הים',
  with_pool: 'עם בריכה',
  nature: 'טבע',
  special: 'מיוחדים',
  rural: 'כפרי',
  desert: 'מדבר',
};

/** Figma profile chips — PNG icons from new-profile-pages/bnb */
const HOSPITALITY_ICONS = {
  landscapes: require('../assets/new-profile-pages/bnb/views.png'),
  on_the_beach: require('../assets/new-profile-pages/bnb/on-the-beach.png'),
  with_pool: require('../assets/new-profile-pages/bnb/pool.png'),
  nature: require('../assets/new-profile-pages/bnb/neture.png'),
  special: require('../assets/new-profile-pages/bnb/spetials.png'),
  rural: require('../assets/new-profile-pages/bnb/vilage.png'),
  desert: require('../assets/new-profile-pages/bnb/desert.png'),
};

/** Figma 5:413419 — right column in RTL row-reverse */
const HOSPITALITY_COL_RIGHT = [
  'landscapes',
  'on_the_beach',
  'with_pool',
  'nature',
];
const HOSPITALITY_COL_LEFT = ['special', 'rural', 'desert'];

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

const SERVICE_ORDER = Object.keys(SERVICE_LABELS);

/** PNG icons — filenames matched to form keys / Hebrew labels */
const SERVICE_ICONS = {
  pool: require('../assets/new-profile-pages/bnb/services/pool.png'),
  merger: require('../assets/new-profile-pages/bnb/services/AC.png'),
  fridge: require('../assets/new-profile-pages/bnb/services/frige.png'),
  eater: require('../assets/new-profile-pages/bnb/services/food.png'),
  kitchen: require('../assets/new-profile-pages/bnb/services/kitchen.png'),
  locker: require('../assets/new-profile-pages/bnb/services/locker.png'),
  tv: require('../assets/new-profile-pages/bnb/services/TV.png'),
  safe: require('../assets/new-profile-pages/bnb/services/safe.png'),
  smoke_detector: require('../assets/new-profile-pages/bnb/services/smoke-detector.png'),
  wifi_internet: require('../assets/new-profile-pages/bnb/services/wi-fi.png'),
  private_services: require('../assets/new-profile-pages/bnb/services/toilet.png'),
  shared_services: require('../assets/new-profile-pages/bnb/services/public-toilet.png'),
  private_shower: require('../assets/new-profile-pages/bnb/services/private-shower.png'),
  shared_shower: require('../assets/new-profile-pages/bnb/services/public-shower.png'),
  accessible_place: require('../assets/new-profile-pages/bnb/services/acceable.png'),
  suitable_for_animals: require('../assets/new-profile-pages/bnb/services/pet-alowed.png'),
  suitable_for_smokers: require('../assets/new-profile-pages/bnb/services/smoking-alowed.png'),
  parking: require('../assets/new-profile-pages/bnb/services/parking.png'),
};

const FLOOR_CHIP_ICON = require('../assets/new-profile-pages/bnb/services/flor.png');

/** Listing `floor` column (BnB general details) → קומה N chip */
function buildFloorServiceTile(listing) {
  const raw = listing?.floor;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return {
    id: 'listing-floor',
    label: `קומה ${n}`,
    iconSource: FLOOR_CHIP_ICON,
  };
}

function formatParkingLabel(count, isPaid) {
  const suffix = isPaid ? 'בתשלום' : 'בחינם';
  if (count === 1) return `חנייה 1 ${suffix}`;
  return `${count} חניות ${suffix}`;
}

/** BnB general-details parking (כמות חניות + חנייה בתשלום) → services chip */
function buildParkingServiceTile(listing) {
  const am = parseJsonObject(listing?.amenities);
  if (!am || typeof am !== 'object') return null;

  let count = null;
  const qtyRaw =
    am['כמות חניות'] ?? am.parking ?? am.parking_spaces ?? am['חנייה'];
  if (typeof qtyRaw === 'number' && qtyRaw > 0) {
    count = qtyRaw;
  } else if (typeof qtyRaw === 'string' && qtyRaw.trim() !== '') {
    const n = parseInt(qtyRaw, 10);
    if (!Number.isNaN(n) && n > 0) count = n;
  } else if (qtyRaw === true) {
    count = 1;
  }

  if (count == null || count < 1) return null;
  count = Math.min(4, Math.max(1, Math.round(count)));

  const paidOption = am['חנייה בתשלום'];
  const isPaid =
    paidOption === 'כן' ||
    am.paid_parking === true ||
    am.paidParking === true;
  const isFree =
    paidOption === 'ללא' ||
    am.paid_parking === false ||
    am.paidParking === false ||
    am.free_parking === true ||
    am.freeParking === true;
  const isPaidParking = isPaid && !isFree;

  return {
    id: 'parking',
    label: formatParkingLabel(count, isPaidParking),
    iconSource: SERVICE_ICONS.parking,
  };
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function formatShortDate(d) {
  if (d == null || d === '') return '';
  try {
    const s = String(d).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const dt = new Date(s);
      if (!Number.isNaN(dt.getTime())) {
        return `${dt.getDate()}.${dt.getMonth() + 1}`;
      }
    }
    return s;
  } catch {
    return String(d);
  }
}

function parseJsonObject(val) {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

const IGNORE_SERVICE_FACILITY_KEYS = new Set(['floor', 'laundry']);

function collectServiceKeys(listing) {
  const sf = parseJsonObject(
    listing?.service_facility || listing?.serviceFacility,
  );
  const keys = [];
  if (sf && typeof sf === 'object') {
    if (sf.selected && !IGNORE_SERVICE_FACILITY_KEYS.has(String(sf.selected))) {
      keys.push(String(sf.selected));
    }
    Object.keys(sf).forEach(k => {
      if (k !== 'selected' && sf[k] === true && !IGNORE_SERVICE_FACILITY_KEYS.has(k)) {
        keys.push(k);
      }
    });
  }
  return [...new Set(keys)].filter(Boolean);
}

function collectHospitalityActive(listing) {
  const gd = parseJsonObject(
    listing?.general_details || listing?.generalDetails,
  );
  const map = gd?.hospitality_natures;
  if (map && typeof map === 'object' && !Array.isArray(map)) {
    return Object.keys(map).filter(k => map[k] === true);
  }
  if (Array.isArray(map)) return map.filter(Boolean);
  const single = String(
    listing?.hospitality_nature || listing?.hospitalityNature || '',
  )
    .trim()
    .toLowerCase();
  return single ? [single] : [];
}

function InfoChip({label, iconSource, active = true}) {
  return (
    <View style={[styles.infoChip, !active && styles.infoChipInactive]}>
      <View style={styles.infoChipInner}>
        <Text
          style={[
            styles.infoChipText,
            !active && styles.infoChipTextInactive,
          ]}>
          {label}
        </Text>
        {iconSource ? (
          <Image
            source={iconSource}
            style={styles.infoChipIcon}
            resizeMode="contain"
          />
        ) : null}
      </View>
    </View>
  );
}

/**
 * BnB (category 5) listing detail — Figma 5:413374. Feed ads only (not posts).
 */
export default function BnbListingProfileContent({
  listing,
  mapAddress,
  adAddress,
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

  const title = firstNonEmpty(
    listing?.project_name,
    listing?.projectName,
    listing?.title,
    listing?.name,
    listing?.property_name,
  );

  const addr = firstNonEmpty(
    mapAddress,
    listing?.address,
    listing?.location,
    listing?.search_address,
    listing?.contact_details?.address,
  );

  const smartAddr = firstNonEmpty(adAddress, addr);

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
    cancelRaw.includes('without_penalty') ||
    cancelRaw.includes('ללא') ||
    cancelRaw.includes('קנס');

  const description = String(listing?.description || '').trim();

  const activeHospitality = useMemo(
    () => collectHospitalityActive(listing),
    [listing],
  );

  const hospitalityCols = useMemo(() => {
    const activeSet = new Set(activeHospitality);
    const make = code => ({
      id: code,
      label: HOSPITALITY_LABELS[code] || code,
      iconSource: HOSPITALITY_ICONS[code] || null,
      active: activeSet.has(code),
    });
    return {
      right: HOSPITALITY_COL_RIGHT.map(make),
      left: HOSPITALITY_COL_LEFT.map(make),
    };
  }, [activeHospitality]);

  const hasHospitalityGrid = activeHospitality.length > 0;

  const serviceColumns = useMemo(() => {
    const keys = collectServiceKeys(listing);
    const ordered = SERVICE_ORDER.filter(k => keys.includes(k));
    const extra = keys.filter(k => !SERVICE_ORDER.includes(k));
    const facilities = [...ordered, ...extra].map(k => ({
      id: k,
      label: SERVICE_LABELS[k] || k,
      iconSource: SERVICE_ICONS[k] || null,
    }));
    const floor = buildFloorServiceTile(listing);
    const parking = buildParkingServiceTile(listing);
    const tiles = floor ? [...facilities, floor] : facilities;
    const right = tiles.filter((_, i) => i % 2 === 0);
    const left = tiles.filter((_, i) => i % 2 === 1);
    if (parking) right.push(parking);
    return {
      right,
      left,
      count: tiles.length + (parking ? 1 : 0),
    };
  }, [listing]);

  const showStayCard = roomsLine || datesLine || showFreeCancel;

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
          {title ? (
            <Text style={styles.listingTitle}>{title}</Text>
          ) : null}
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

      {showStayCard ? (
        <>
          <View style={[styles.highlightCard, {width: CONTENT_W}]}>
            {roomsLine ? (
              <View style={styles.highlightRow}>
                <Text style={styles.highlightText}>{roomsLine}</Text>
                <Image
                  source={require('../assets/new-profile-pages/bnb/top-part/rooms.png')}
                  style={styles.highlightIcon}
                  resizeMode="contain"
                />
              </View>
            ) : null}
            {roomsLine && datesLine ? (
              <View style={styles.highlightDivider} />
            ) : null}
            {datesLine ? (
              <View style={styles.highlightRow}>
                <Text style={styles.highlightText}>{datesLine}</Text>
                <Image
                  source={require('../assets/new-profile-pages/bnb/top-part/date.png')}
                  style={styles.highlightIcon}
                  resizeMode="contain"
                />
              </View>
            ) : null}
            {(roomsLine || datesLine) && showFreeCancel ? (
              <View style={styles.highlightDivider} />
            ) : null}
            {showFreeCancel ? (
              <View style={styles.highlightRow}>
                <Text style={styles.highlightText}>ביטול ללא קנס</Text>
                <Image
                  source={require('../assets/new-profile-pages/bnb/top-part/cancel-aveialbe.png')}
                  style={styles.highlightIcon}
                  resizeMode="contain"
                />
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

      {hasHospitalityGrid ? (
        <>
          <View style={[styles.line, {width: CONTENT_W}]} />
          <Text style={[styles.sectionHeading, {width: CONTENT_W}]}>
            אופי האירוח
          </Text>
          <View style={[styles.twoColGrid, {width: CONTENT_W}]}>
            <View style={styles.col}>
              {hospitalityCols.left.map(t => (
                <InfoChip
                  key={t.id}
                  label={t.label}
                  iconSource={t.iconSource}
                  active={t.active}
                />
              ))}
            </View>
            <View style={styles.col}>
              {hospitalityCols.right.map(t => (
                <InfoChip
                  key={t.id}
                  label={t.label}
                  iconSource={t.iconSource}
                  active={t.active}
                />
              ))}
            </View>
          </View>
        </>
      ) : null}

      <View style={[styles.line, {width: CONTENT_W}]} />

      <Text style={[styles.sectionHeading, {width: CONTENT_W}]}>
        שירותים ומתקנים במקום
      </Text>
      {serviceColumns.count > 0 ? (
        <View style={[styles.twoColGrid, {width: CONTENT_W}]}>
          <View style={styles.col}>
            {serviceColumns.right.map(t => (
              <InfoChip
                key={t.id}
                label={t.label}
                iconSource={t.iconSource}
              />
            ))}
          </View>
          <View style={styles.col}>
            {serviceColumns.left.map(t => (
              <InfoChip
                key={t.id}
                label={t.label}
                iconSource={t.iconSource}
              />
            ))}
          </View>
        </View>
      ) : (
        <Text style={[styles.bodyMuted, {width: CONTENT_W}]}>
          לא צוינו שירותים
        </Text>
      )}

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
      <View style={[styles.line, {width: CONTENT_W}]} />

      <TouchableOpacity
        style={[styles.reportBtn, {width: CONTENT_W}]}
        onPress={onReportPress}
        activeOpacity={0.85}>
        <MaterialCommunityIcons name="alert-outline" size={24} color={CREAM} />
        <Text style={styles.reportBtnText}>דווח</Text>
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
    alignItems: 'flex-end',
    width: '100%',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
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
    textAlign: 'left',
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
  priceBlock: {
    width: '100%',
    gap: 18,
    alignItems: 'flex-end',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 10,
    width: '100%',
  },
  pricePerNightLabels: {
    alignItems: 'flex-end',
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
    justifyContent: 'flex-end',
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
  highlightCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 20,
    gap: 18,
    alignItems: 'flex-end',
    alignSelf: flexStart,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    width: '100%',
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
  bodyText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    lineHeight: 32,
    color: '#FFFFFF',
    textAlign: 'left',
    alignSelf: flexStart,
    width: '100%',
  },
  bodyMuted: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: TEXT_SECONDARY,
    textAlign: 'left',
    alignSelf: flexStart,
  },
  sectionHeading: {
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    lineHeight: 22,
    color: TEXT_SECONDARY,
    textAlign: 'left',
    marginBottom: 12,
    alignSelf: flexStart,
    width: '100%',
  },
  twoColGrid: {
    flexDirection: 'row-reverse',
    gap: 12,
    alignItems: 'flex-start',
    alignSelf: flexStart,
    width: '100%',
  },
  col: {
    flex: 1,
    gap: 10,
  },
  infoChip: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    width: '100%',
    minHeight: 56,
    justifyContent: 'center',
  },
  infoChipInactive: {
    opacity: 0.45,
  },
  infoChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  infoChipText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    textAlign: 'left',
    flexShrink: 1,
  },
  infoChipTextInactive: {
    color: TEXT_SECONDARY,
  },
  infoChipIcon: {
    width: 28,
    height: 28,
  },
  mapBox: {
    height: 234,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: flexStart,
  },
  reportBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: REPORT_BG,
    borderRadius: 1000,
    height: 40,
    alignSelf: flexStart,
  },
  reportBtnText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'left',
  },
});
