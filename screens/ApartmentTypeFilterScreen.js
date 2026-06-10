import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
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
const MENU_ICON = require('../assets/buttom-bar/appartment_type.png');

const APARTMENT_TYPES = [
  {id: 'apartment', label: 'דירה'},
  {id: 'studio', label: 'דירת סטודיו'},
  {id: 'garden', label: 'דירת גן'},
  {id: 'private_house', label: 'בית פרטי'},
  {id: 'duplex', label: 'דופלקס'},
  {id: 'penthouse', label: 'פנטהאוז'},
];

/** יוקרה (category 12) — Figma: דירה, בית פרטי, וילה, פנטהאוז only. */
const APARTMENT_TYPES_LUXURY = [
  {id: 'apartment', label: 'דירה'},
  {id: 'private_house', label: 'בית פרטי'},
  {id: 'villa', label: 'וילה'},
  {id: 'penthouse', label: 'פנטהאוז'},
];

function getApartmentTypeOptions(selectedCategory) {
  const n = Number(selectedCategory);
  return n === 12 ? APARTMENT_TYPES_LUXURY : APARTMENT_TYPES;
}

function normalizeApartmentTypeInitial(v) {
  if (v == null || v === '') return [];
  if (Array.isArray(v)) {
    return v.map(x => String(x || '').trim()).filter(Boolean);
  }
  return [String(v).trim()].filter(Boolean);
}

const ApartmentTypeFilterScreen = ({
  initialFilter,
  onClose,
  onSave,
  selectedCategory,
}) => {
  const insets = useSafeAreaInsets();
  const {height: screenHeight} = useWindowDimensions();
  const compact = screenHeight < 760;
  const apartmentTypeOptions = useMemo(
    () => getApartmentTypeOptions(selectedCategory),
    [selectedCategory],
  );
  const [selectedIds, setSelectedIds] = useState(() => {
    const allowed = new Set(apartmentTypeOptions.map(o => o.id));
    return normalizeApartmentTypeInitial(initialFilter).filter(id =>
      allowed.has(id),
    );
  });

  const handleSave = () => {
    if (onSave) {
      onSave({apartmentType: selectedIds.length > 0 ? selectedIds : null});
    }
    if (onClose) onClose();
  };

  const handleClear = () => {
    if (onSave) onSave(null);
    if (onClose) onClose();
  };
  const bottomInset = getSheetBottomInset(insets);

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
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topGroup}>
          <View style={[styles.header, compact && styles.headerCompact]}>
            <Image
              source={MENU_ICON}
              style={styles.headerIcon}
              resizeMode="contain"
            />
            <Text style={styles.title}>סוג דירה</Text>
          </View>

          <View style={[styles.radioList, compact && styles.radioListCompact]}>
            {apartmentTypeOptions.map(option => {
              const checked = selectedIds.includes(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={styles.radioRow}
                  onPress={() => {
                    setSelectedIds(prev =>
                      prev.includes(option.id)
                        ? prev.filter(x => x !== option.id)
                        : [...prev, option.id],
                    );
                  }}
                  activeOpacity={0.8}>
                  <FigmaCheckbox checked={checked} variant="dot" />
                  <Text style={styles.radioLabel}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  topGroup: {
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 0,
  },
  headerCompact: {
    marginBottom: 0,
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
    letterSpacing: 0.54,
    fontFamily: 'Rubik-Regular',
  },
  radioList: {
    width: '100%',
    alignItems: flexStart,
    gap: 28,
    marginTop: 0,
  },
  radioListCompact: {
    gap: 20,
    marginTop: 0,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 16,
  },
  radioLabel: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  footer: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  footerCompact: {paddingTop: 8},
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

export default ApartmentTypeFilterScreen;
