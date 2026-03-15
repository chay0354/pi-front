import React, {useState} from 'react';
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

// סוג (Type) options for global category – matches design: דירות, פנטהאוזים, etc.
const TYPE_OPTIONS = [
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

const TypeFilterScreen = ({initialFilter, onClose, onSave}) => {
  const [selectedId, setSelectedId] = useState(initialFilter ?? null);

  const handleSave = () => {
    if (onSave && selectedId) {
      onSave({type: selectedId});
    }
    if (onClose) onClose();
  };

  const handleClear = () => {
    setSelectedId(null);
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
          {TYPE_OPTIONS.map((option) => (
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
