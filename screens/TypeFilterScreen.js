import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';

const BG = '#1a1926';
const BORDER = 'rgba(255,255,255,0.2)';

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

  const [selectedId, setSelectedId] = useState(initialFilter ?? null);

  useEffect(() => {
    setSelectedId(initialFilter ?? null);
  }, [initialFilter, isCommerce, isLand]);

  const handleSave = () => {
    if (onSave) {
      onSave({type: selectedId ?? null});
    }
    if (onClose) onClose();
  };

  const handleClear = () => {
    setSelectedId(null);
    if (onSave) {
      onSave({type: null});
    }
    if (onClose) onClose();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={onClose} hitSlop={12}>
        <MaterialCommunityIcons name="chevron-right" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.handleBar} />
        <View style={styles.header}>
          <Text style={styles.title}>סוג</Text>
        </View>

        <View style={styles.radioList}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.radioRow}
              onPress={() => setSelectedId(option.id)}
              activeOpacity={0.8}>
              <Text style={styles.radioLabel}>{option.label}</Text>
              <View style={[styles.radioOuter, selectedId === option.id && styles.radioOuterSelected]}>
                {selectedId === option.id ? (
                  <View style={styles.radioInner} />
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtnWrap} onPress={handleSave} activeOpacity={0.9}>
          <Image
            source={require('../assets/buy-rent/save.png')}
            style={styles.saveBtnImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearWrap} onPress={handleClear}>
          <Text style={styles.clearText}>נקה</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  backBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: BG,
  },
  handleBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    marginBottom: 16,
  },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { color: '#fff', fontSize: 18, fontFamily: 'Rubik-Medium' },
  radioList: { marginBottom: 32 },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 16,
    marginLeft: 40,
  },
  radioLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: '#fff' },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  saveBtnWrap: { marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnImage: { width: '100%', height: 54 },
  clearWrap: { alignItems: 'center' },
  clearText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, textDecorationLine: 'underline' },
});

export default TypeFilterScreen;
