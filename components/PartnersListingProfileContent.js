import React, {useMemo} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import LocationMap from './LocationMap';
import PartnersSmartInfoBlock from './PartnersSmartInfoBlock';
import {flexStart} from '../utils/rtlLayout';

const PARTNER_PREF_ICONS = {
  age: require('../assets/new-profile-pages/partheners/ages20-30.png'),
  genderMale: require('../assets/new-profile-pages/partheners/only-man.png'),
  nonSmokers: require('../assets/new-profile-pages/partheners/no-smoke.png'),
  students: require('../assets/new-profile-pages/partheners/student.png'),
  stableJob: require('../assets/new-profile-pages/partheners/stable-job.png'),
  occasionalJob: require('../assets/new-profile-pages/partheners/not-stable-jpb.png'),
};

const SCREEN_W = Dimensions.get('window').width;
const CONTENT_W = Math.min(366, SCREEN_W - 48);
const CARD_BG = '#2B2A39';
const DIVIDER = '#373548';
const TEXT_SECONDARY = '#D2D0DC';
const CREAM = '#F7F3E6';
const DEEP = '#1E1D27';
const REPORT_BG = '#4D4966';

const SEARCH_PURPOSE_LABELS = {
  enter: 'מחפש להיכנס',
  bring_in: 'מחפש להכניס',
  partner: 'מחפש להכניס',
};

const PREFERENCE_META = [
  {
    key: 'nonSmokers',
    altKey: 'nonSmoker',
    label: 'ללא מעשנים',
    iconSource: PARTNER_PREF_ICONS.nonSmokers,
  },
  {key: 'students', label: 'סטודנטים', iconSource: PARTNER_PREF_ICONS.students},
  {
    key: 'stableJob',
    label: 'בעלי עבודה מסודרת',
    iconSource: PARTNER_PREF_ICONS.stableJob,
  },
  {
    key: 'occasionalJob',
    label: 'בעלי עבודה מזדמנת',
    iconSource: PARTNER_PREF_ICONS.occasionalJob,
  },
  {
    key: 'immediateEntry',
    label: 'כניסה מיידית',
    iconName: 'calendar-check-outline',
  },
];

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function getPrefObj(listing) {
  const p = listing?.preferences;
  return p && typeof p === 'object' ? p : {};
}

function formatMoney(listing, preferPrice) {
  const raw = preferPrice
    ? listing?.price != null && listing?.price !== ''
      ? listing.price
      : listing?.budget
    : listing?.budget != null && listing?.budget !== ''
      ? listing.budget
      : listing?.price;
  if (raw == null || raw === '') return '—';
  const n = Number(String(raw).replace(/[^\d.-]/g, ''));
  if (Number.isNaN(n)) return String(raw).trim() || '—';
  return `₪${Math.round(n).toLocaleString('he-IL')}`;
}

function PrefChip({label, iconSource, iconName}) {
  return (
    <View style={styles.prefChip}>
      <View style={styles.prefChipInner}>
        <Text style={styles.prefChipText}>{label}</Text>
        {iconSource ? (
          <Image
            source={iconSource}
            style={styles.prefChipIcon}
            resizeMode="contain"
          />
        ) : iconName ? (
          <MaterialCommunityIcons name={iconName} size={28} color="#FFFFFF" />
        ) : null}
      </View>
    </View>
  );
}

/**
 * שותפים (category 3) listing detail body.
 * enter — Figma 9:145202 + PiAi (9:145270) below preferences.
 * bring_in — Figma 9:145239: שכר דירה, full preferences grid, map, PiAi.
 */
export default function PartnersListingProfileContent({
  listing,
  displayName,
  mapAddress,
  adAddress,
  onReportPress,
}) {
  const searchKey = firstNonEmpty(
    listing?.search_purpose,
    listing?.searchPurposeKey,
  ).toLowerCase();
  const isBringIn = searchKey === 'bring_in';
  const isEnter = searchKey === 'enter';
  const showSmartInfo = isBringIn || isEnter;

  const purposeTag =
    listing?.searchPurpose ||
    SEARCH_PURPOSE_LABELS[searchKey] ||
    (searchKey ? searchKey : null);

  const title =
    firstNonEmpty(
      displayName,
      listing?.creator_name,
      listing?.creatorName,
      listing?.name,
      listing?.title,
    ) || 'משתמש';

  const description = String(listing?.description || '').trim();

  const priceLabel = isBringIn ? 'שכר דירה' : 'התקציב שלי';
  const priceStr = formatMoney(listing, isBringIn);

  const genderRaw = String(
    listing?.preferred_gender || listing?.preferredGender || '',
  )
    .trim()
    .toLowerCase();
  let genderLabel = null;
  if (genderRaw === 'male' || genderRaw === 'גבר') {
    genderLabel = 'לגור עם בנים';
  } else if (genderRaw === 'female' || genderRaw === 'אישה') {
    genderLabel = 'לגור עם בנות';
  }

  const ageMin =
    listing?.preferred_age_min != null && listing?.preferred_age_min !== ''
      ? Number(listing.preferred_age_min)
      : listing?.preferredAgeMin != null && listing?.preferredAgeMin !== ''
        ? Number(listing.preferredAgeMin)
        : null;
  const ageMax =
    listing?.preferred_age_max != null && listing?.preferred_age_max !== ''
      ? Number(listing.preferred_age_max)
      : listing?.preferredAgeMax != null && listing?.preferredAgeMax !== ''
        ? Number(listing.preferredAgeMax)
        : null;
  let ageLabel = null;
  if (
    ageMin != null &&
    !Number.isNaN(ageMin) &&
    ageMax != null &&
    !Number.isNaN(ageMax)
  ) {
    ageLabel = `גילאים ${ageMin}-${ageMax}`;
  } else if (ageMin != null && !Number.isNaN(ageMin)) {
    ageLabel = `גיל מ-${ageMin}`;
  } else if (ageMax != null && !Number.isNaN(ageMax)) {
    ageLabel = `גיל עד ${ageMax}`;
  }

  const prefObj = getPrefObj(listing);
  const prefTiles = useMemo(() => {
    const left = [];
    if (genderLabel) {
      left.push({
        id: 'gender',
        label: genderLabel,
        iconSource:
          genderRaw === 'male' || genderRaw === 'גבר'
            ? PARTNER_PREF_ICONS.genderMale
            : null,
        iconName: 'account-group-outline',
      });
    }
    if (ageLabel) {
      left.push({
        id: 'age',
        label: ageLabel,
        iconSource: PARTNER_PREF_ICONS.age,
      });
    }

    const right = [];
    for (const meta of PREFERENCE_META) {
      const on =
        prefObj[meta.key] === true ||
        (meta.altKey && prefObj[meta.altKey] === true);
      if (on) {
        right.push({
          id: meta.key,
          label: meta.label,
          iconSource: meta.iconSource,
          iconName: meta.iconName,
        });
      }
    }
    return {left, right};
  }, [genderLabel, ageLabel, genderRaw, prefObj]);

  const hasPreferences =
    prefTiles.left.length > 0 || prefTiles.right.length > 0;

  const mapAddr = firstNonEmpty(
    mapAddress,
    listing?.address,
    listing?.location,
    listing?.search_address,
  );
  const smartAddr = firstNonEmpty(adAddress, mapAddr);

  return (
    <View style={styles.wrap}>
      <View style={[styles.sectionTop, {width: CONTENT_W}]}>
        {purposeTag ? (
          <View style={styles.tagsRow}>
            <View style={styles.tagWhite}>
              <Text style={styles.tagWhiteText}>{purposeTag}</Text>
            </View>
          </View>
        ) : null}
        <Text style={styles.listingTitle}>{title}</Text>
      </View>

      <View style={[styles.line, {width: CONTENT_W}]} />

      {description ? (
        <Text style={[styles.bodyText, {width: CONTENT_W}]}>{description}</Text>
      ) : (
        <Text style={[styles.bodyMuted, {width: CONTENT_W}]}>אין תיאור</Text>
      )}

      <View style={[styles.line, {width: CONTENT_W}]} />

      <View style={[styles.budgetCard, {width: CONTENT_W}]}>
        <Text style={styles.budgetLabel}>{priceLabel}</Text>
        <Text style={styles.budgetValue}>{priceStr}</Text>
      </View>

      {hasPreferences ? (
        <>
          <View style={[styles.line, {width: CONTENT_W}]} />
          <Text style={[styles.sectionHeading, {width: CONTENT_W}]}>
            העדפות
          </Text>
          <View style={[styles.twoColGrid, {width: CONTENT_W}]}>
            <View style={styles.col}>
              {prefTiles.left.map(t => (
                <PrefChip
                  key={t.id}
                  label={t.label}
                  iconSource={t.iconSource}
                  iconName={t.iconName}
                />
              ))}
            </View>
            <View style={styles.col}>
              {prefTiles.right.map(t => (
                <PrefChip
                  key={t.id}
                  label={t.label}
                  iconSource={t.iconSource}
                  iconName={t.iconName}
                />
              ))}
            </View>
          </View>
        </>
      ) : null}

      {isBringIn && mapAddr ? (
        <>
          <View style={[styles.line, {width: CONTENT_W}]} />
          <LocationMap
            address={mapAddr}
            containerStyle={[styles.mapBox, {width: CONTENT_W}]}
          />
        </>
      ) : null}

      {showSmartInfo ? (
        <>
          <View style={[styles.line, {width: CONTENT_W}]} />
          <PartnersSmartInfoBlock adAddress={smartAddr} />
        </>
      ) : null}

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
    alignItems: flexStart,
    marginBottom: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
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
  listingTitle: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 32,
    lineHeight: 37,
    color: CREAM,
    textAlign: 'right',
    writingDirection: 'rtl',
    alignSelf: flexStart,
    width: '100%',
  },
  line: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 20,
    alignSelf: flexStart,
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
  budgetCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
    alignSelf: flexStart,
  },
  budgetLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  budgetValue: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 28,
    lineHeight: 31,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sectionHeading: {
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    color: TEXT_SECONDARY,
    textAlign: 'left',
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
  prefChip: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    width: '100%',
  },
  prefChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  prefChipText: {
    fontFamily: 'Rubik-Regular',
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    textAlign: 'left',
    flexShrink: 1,
  },
  prefChipIcon: {
    width: 28,
    height: 28,
  },
  mapBox: {
    height: 208,
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
