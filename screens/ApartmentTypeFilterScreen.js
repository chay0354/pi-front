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

const APARTMENT_TYPES = [
  {id: 'apartment', label: 'דירה'},
  {id: 'studio', label: 'דירת סטודיו'},
  {id: 'garden', label: 'דירת גן'},
  {id: 'private_house', label: 'בית פרטי'},
  {id: 'duplex', label: 'דופלקס'},
  {id: 'penthouse', label: 'נטהאוז'},
];

const ApartmentTypeFilterScreen = ({onClose, onSave}) => {
  const [selectedId, setSelectedId] = useState(null);

  const handleSave = () => {
    if (onSave && selectedId) {
      onSave({apartmentType: selectedId});
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
        {/* Header: house icon + title */}
        <View style={styles.header}>
          <Image
            source={require('../assets/buttom-bar/appartment_type.png')}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.title}>סוג דירה</Text>
        </View>

        {/* Radio list */}
        <View style={styles.radioList}>
          {APARTMENT_TYPES.map((option) => (
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

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtnWrap} onPress={handleSave} activeOpacity={0.9}>
          <Image
            source={require('../assets/buy-rent/save.png')}
            style={styles.saveBtnImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Clear */}
        <TouchableOpacity style={styles.clearWrap} onPress={handleClear}>
          <Text style={styles.clearText}>נקה</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 36,
    height: 36,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    marginTop: 6,
  },
  radioList: {
    marginBottom: 32,
  },
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
  radioOuterSelected: {
    borderColor: '#fff',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  saveBtnWrap: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnImage: {
    width: '100%',
    height: 54,
  },
  clearWrap: {
    alignItems: 'center',
  },
  clearText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default ApartmentTypeFilterScreen;
