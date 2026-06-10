import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  useWindowDimensions,
  I18nManager,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {FigmaCheckbox} from '../components/FigmaCheckbox';
import FilterSaveButton from '../components/FilterSaveButton';
import FilterScreenBackBar from '../components/FilterScreenBackBar';
import {flexStart, getSheetBottomInset} from '../utils/rtlLayout';

const BG = '#2B2A39';
const DIVIDER = '#373548';

const MENU_ICON = require('../assets/tiktok/kind-filter.png');

// סוג (Type) options for global feed – maps to listing.category in applyFeedFilters
const TYPE_OPTIONS_GLOBAL = [
  {id: 'apartments', label: 'דירות'},
  {id: 'penthouses', label: 'נטהאוזים'},
  {id: 'private_houses', label: 'בתים פרטיים'},
  {id: 'villas', label: 'וילות'},
  {id: 'estates', label: 'אחוזות'},
  {id: 'multi_family', label: 'Multi-family'},
  {id: 'offices', label: 'משרדים'},
  {id: 'commercial', label: 'מסחר'},
  {id: 'land', label: 'קרקעות'},
];

// מסחר (category 8): סוג נכס – matches property_type from ads form
const TYPE_OPTIONS_COMMERCE = [
  {id: 'store', label: 'חנות'},
  {id: 'shopping_center', label: 'מרכז קניות / קומה שלמה'},
  {id: 'industrial_buildings', label: 'מבני תעשייה'},
  {id: 'warehouse', label: 'מחסן'},
  {id: 'commercial_space', label: 'שטח מסחרי'},
  {id: 'whole_floor', label: 'קומה שלמה'},
];

// BnB (category 5): סוג – matches property_type from BnB ad form
const TYPE_OPTIONS_BNB = [
  {id: 'room', label: 'חדר'},
  {id: 'housing_unit', label: 'יחידת דיור'},
  {id: 'house', label: 'בית'},
  {id: 'b&b', label: 'צימר'},
  {id: 'holiday_apartment', label: 'דירת נופש'},
  {id: 'villa', label: 'וילה'},
  {id: 'special', label: 'מיוחדים'},
];

// קרקעות (category 7): סוג only — same predicate ids as `applyFeedFilters` landPredicates in TikTokFeedScreen
const TYPE_OPTIONS_LAND = [
  {id: 'own_private', label: 'קרקע פרטית'},
  {id: 'agri_yes', label: 'קרקע חקלאית'},
  {id: 'mortgage_yes', label: 'קרקע במושב'},
  {id: 'permit_there_is', label: 'קרקע עם היתר'},
  {id: 'plan_there_is', label: 'קרקע עם תב״ע'},
  {id: 'plan_happy', label: 'קרקע עם תב״ע מאושרת'},
];

/** חדש מקבלן (category 1) — property slice via `property_type` / `apartmentTypeId` in TikTokFeedScreen */
const TYPE_OPTIONS_NEW_FROM_DEVELOPER = [
  {id: 'apartment', label: 'דירה'},
  {id: 'garden', label: 'דירת גן'},
  {id: 'penthouses', label: 'פנטהאוז'},
  {id: 'private_houses', label: 'בית פרטי'},
  {id: 'villas', label: 'וילה'},
  {id: 'offices', label: 'משרדים'},
  {id: 'commercial', label: 'מסחר'},
  {id: 'religious_sector', label: 'מגזר דתי'},
];

const TypeFilterScreen = ({
  initialFilter,
  onClose,
  onSave,
  selectedCategory,
}) => {
  const insets = useSafeAreaInsets();
  const {height: screenHeight} = useWindowDimensions();
  const compact = screenHeight < 760;
  const isCommerce = selectedCategory === 8 || selectedCategory === '8';
  const isLand = selectedCategory === 7 || selectedCategory === '7';
  const isBnb = selectedCategory === 5 || selectedCategory === '5';
  const isNewFromDeveloper = selectedCategory === 1 || selectedCategory === '1';
  const options = useMemo(() => {
    if (isNewFromDeveloper) {
      return TYPE_OPTIONS_NEW_FROM_DEVELOPER;
    }
    if (isBnb) {
      return TYPE_OPTIONS_BNB;
    }
    if (isCommerce) {
      return TYPE_OPTIONS_COMMERCE;
    }
    if (isLand) {
      return TYPE_OPTIONS_LAND;
    }
    return TYPE_OPTIONS_GLOBAL;
  }, [isBnb, isCommerce, isLand, isNewFromDeveloper]);

  const [selectedIds, setSelectedIds] = useState(() => {
    const initial = Array.isArray(initialFilter)
      ? initialFilter.filter(Boolean)
      : initialFilter
        ? [initialFilter]
        : [];
    if (isBnb) {
      const allow = new Set(TYPE_OPTIONS_BNB.map(o => o.id));
      return initial.map(String).filter(id => allow.has(id));
    }
    if (isNewFromDeveloper) {
      const allow = new Set(TYPE_OPTIONS_NEW_FROM_DEVELOPER.map(o => o.id));
      return initial
        .map(id => (String(id) === 'apartments' ? 'apartment' : id))
        .filter(id => allow.has(String(id)));
    }
    return initial;
  });

  useEffect(() => {
    const next = Array.isArray(initialFilter)
      ? initialFilter.filter(Boolean)
      : initialFilter
        ? [initialFilter]
        : [];
    if (isBnb) {
      const allow = new Set(TYPE_OPTIONS_BNB.map(o => o.id));
      setSelectedIds(next.map(String).filter(id => allow.has(id)));
      return;
    }
    if (isNewFromDeveloper) {
      const allow = new Set(TYPE_OPTIONS_NEW_FROM_DEVELOPER.map(o => o.id));
      setSelectedIds(
        next
          .map(id => (String(id) === 'apartments' ? 'apartment' : id))
          .filter(id => allow.has(String(id))),
      );
      return;
    }
    setSelectedIds(next);
  }, [initialFilter, isBnb, isCommerce, isLand, isNewFromDeveloper]);
  const bottomInset = getSheetBottomInset(insets);

  const handleSave = () => {
    if (onSave) {
      onSave({type: selectedIds.length > 0 ? selectedIds : null});
    }
    if (onClose) onClose();
  };

  const handleClear = () => {
    if (onSave) onSave({type: null});
    if (onClose) onClose();
  };

  const toggleOption = optionId => {
    setSelectedIds(prev =>
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId],
    );
  };

  return (
    <View style={styles.container}>
      <View style={{height: insets.top}} />
      <FilterScreenBackBar onClose={onClose} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: compact ? 16 : 24,
            paddingBottom: compact ? 16 : 24,
          },
        ]}
        scrollEnabled
        showsVerticalScrollIndicator={false}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <Image
            source={MENU_ICON}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.title}>סוג</Text>
        </View>

        <View style={[styles.radioList, compact && styles.radioListCompact]}>
          {options.map(option => (
            <TouchableOpacity
              key={option.id}
              style={styles.radioRow}
              onPress={() => toggleOption(option.id)}
              activeOpacity={0.8}>
              <FigmaCheckbox
                checked={selectedIds.includes(option.id)}
                size={22}
                variant="dot"
              />
              <Text style={styles.radioLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          compact && styles.footerCompact,
          {paddingBottom: bottomInset + 8},
        ]}>
        <FilterSaveButton onPress={handleSave} style={styles.saveBtnWrap} />
        <TouchableOpacity style={styles.clearWrap} onPress={handleClear}>
          <Text style={styles.clearText}>נקה</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  scroll: {flex: 1},
  scrollContent: {
    paddingHorizontal: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  footerCompact: {
    paddingTop: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerCompact: {
    marginBottom: 16,
  },
  headerIcon: {
    width: 24,
    height: 24,
    marginBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5447,
    fontFamily: 'Rubik-Regular',
  },
  radioList: {
    width: '100%',
    alignItems: flexStart,
    gap: 28,
    marginTop: 10,
  },
  radioListCompact: {
    gap: 20,
    marginTop: 4,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 8,
    width: '100%',
    minHeight: 24,
  },
  radioLabel: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  saveBtnWrap: {
    marginBottom: 12,
    width: '100%',
  },
  clearWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  clearText: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    textDecorationLine: 'underline',
  },
});

export default TypeFilterScreen;
