import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const BG = '#2B2A39';
const DIVIDER = '#373548';
const GOLD_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const RADIO_BORDER = '#CCA447';
const RADIO_BG = '#27262F';

const MENU_ICON =
  'https://www.figma.com/api/mcp/asset/6acbcfee-410e-4065-953e-b296a61e1772';
const RADIO_ACTIVE_ICON =
  'https://www.figma.com/api/mcp/asset/93f89459-4a3e-4794-a5fd-f0c1f1edd8ec';

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

// קרקעות (category 7): סוג — matches land form radio values (plan_approval, etc.)
const TYPE_OPTIONS_LAND = [
  {id: 'own_private', label: 'בעלות קרקע — פרטי'},
  {id: 'own_administration', label: 'בעלות קרקע — מינהל'},
  {id: 'agri_yes', label: 'קרקע חקלאית — כן'},
  {id: 'agri_not', label: 'קרקע חקלאית — לא'},
  {id: 'plan_happy', label: 'תב״ע — מאושרת'},
  {id: 'plan_nothing', label: 'תב״ע — אין'},
  {id: 'plan_there_is', label: 'תב״ע — יש'},
  {id: 'mortgage_not', label: 'קרקע במושע — לא'},
  {id: 'mortgage_yes', label: 'קרקע במושע — כן'},
  {id: 'permit_nothing', label: 'היתר — אין'},
  {id: 'permit_there_is', label: 'היתר — יש'},
];

const TypeFilterScreen = ({initialFilter, onClose, onSave, selectedCategory}) => {
  const insets = useSafeAreaInsets();
  const {height: screenHeight} = useWindowDimensions();
  const compact = screenHeight < 760;
  const isCommerce =
    selectedCategory === 8 || selectedCategory === '8';
  const isLand = selectedCategory === 7 || selectedCategory === '7';
  const options = useMemo(() => {
    if (isCommerce) {
      return TYPE_OPTIONS_COMMERCE;
    }
    if (isLand) {
      return TYPE_OPTIONS_LAND;
    }
    return TYPE_OPTIONS_GLOBAL;
  }, [isCommerce, isLand]);

  const [selectedIds, setSelectedIds] = useState(() =>
    Array.isArray(initialFilter)
      ? initialFilter.filter(Boolean)
      : initialFilter
        ? [initialFilter]
        : [],
  );

  useEffect(() => {
    setSelectedIds(
      Array.isArray(initialFilter)
        ? initialFilter.filter(Boolean)
        : initialFilter
          ? [initialFilter]
          : [],
    );
  }, [initialFilter, isCommerce, isLand]);
  const bottomInset = Math.max(insets.bottom, 8);

  const handleSave = () => {
    if (onSave) {
      onSave({type: selectedIds.length > 0 ? selectedIds : null});
    }
    if (onClose) onClose();
  };

  const handleClear = () => {
    setSelectedIds([]);
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
      <View style={styles.topRail}>
        <Pressable
          onPress={onClose}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          style={styles.handlePressArea}>
          <View style={styles.handle} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: compact ? 16 : 24,
            paddingBottom: bottomInset + (compact ? 20 : 52),
          },
        ]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <Image source={{uri: MENU_ICON}} style={styles.headerIcon} resizeMode="contain" />
          <Text style={styles.title}>סוג</Text>
        </View>

        <View style={[styles.radioList, compact && styles.radioListCompact]}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.radioRow}
              onPress={() => toggleOption(option.id)}
              activeOpacity={0.8}>
              <Text style={styles.radioLabel}>{option.label}</Text>
              <View style={styles.radioOuter}>
                {selectedIds.includes(option.id) ? (
                  <Image source={{uri: RADIO_ACTIVE_ICON}} style={styles.radioInnerImage} resizeMode="contain" />
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.footer, compact && styles.footerCompact]}>
          <TouchableOpacity style={styles.saveBtnWrap} onPress={handleSave} activeOpacity={0.9}>
            <LinearGradient
              colors={GOLD_GRADIENT}
              start={{x: 0.5, y: 0}}
              end={{x: 0.5, y: 1}}
              style={styles.saveBtnGradient}>
              <Text style={styles.saveBtnText}>שמור</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearWrap} onPress={handleClear}>
            <Text style={styles.clearText}>נקה</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  topRail: {
    height: 37,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handlePressArea: {
    width: 42,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#464646',
  },
  scroll: {flex: 1},
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  footerCompact: {
    marginTop: 12,
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
    alignItems: 'flex-end',
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
    justifyContent: 'flex-end',
    gap: 8,
    width: '100%',
    minHeight: 24,
  },
  radioLabel: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: RADIO_BORDER,
    backgroundColor: RADIO_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInnerImage: {
    width: 10,
    height: 10,
  },
  saveBtnWrap: {
    marginBottom: 12,
    width: '100%',
  },
  saveBtnGradient: {
    width: '100%',
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#1E1D27',
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.2,
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
