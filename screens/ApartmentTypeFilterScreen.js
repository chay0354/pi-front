import React, {useState} from 'react';
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
import {FigmaCheckbox} from '../components/FigmaCheckbox';

const BG = '#2B2A39';
const DIVIDER = '#373548';
const GOLD_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const MENU_ICON = require('../assets/buttom-bar/appartment_type.png');

const APARTMENT_TYPES = [
  {id: 'apartment', label: 'דירה'},
  {id: 'studio', label: 'דירת סטודיו'},
  {id: 'garden', label: 'דירת גן'},
  {id: 'private_house', label: 'בית פרטי'},
  {id: 'duplex', label: 'דופלקס'},
  {id: 'penthouse', label: 'פנטהאוז'},
];

const ApartmentTypeFilterScreen = ({initialFilter, onClose, onSave}) => {
  const insets = useSafeAreaInsets();
  const {height: screenHeight} = useWindowDimensions();
  const compact = screenHeight < 760;
  const [selectedId, setSelectedId] = useState(initialFilter ?? null);

  const handleSave = () => {
    if (onSave && selectedId) {
      onSave({apartmentType: selectedId});
    }
    if (onClose) onClose();
  };

  const handleClear = () => {
    setSelectedId(null);
  };
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <View style={styles.container}>
      <View style={styles.topRail}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onClose}
          style={styles.handlePressArea}>
          <View style={styles.handle} />
        </TouchableOpacity>
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
        <View style={styles.topGroup}>
          <View style={[styles.header, compact && styles.headerCompact]}>
            <Image source={MENU_ICON} style={styles.headerIcon} resizeMode="contain" />
            <Text style={styles.title}>סוג דירה</Text>
          </View>

          <View style={[styles.radioList, compact && styles.radioListCompact]}>
            {APARTMENT_TYPES.map((option) => {
              const checked = selectedId === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={styles.radioRow}
                  onPress={() => setSelectedId(option.id)}
                  activeOpacity={0.8}>
                  <Text style={styles.radioLabel}>{option.label}</Text>
                  <FigmaCheckbox checked={checked} />
                </TouchableOpacity>
              );
            })}
          </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    flexGrow: 1,
    justifyContent: 'space-between',
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
    alignItems: 'flex-end',
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
    justifyContent: 'flex-end',
    gap: 16,
  },
  radioLabel: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  footerCompact: {},
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

export default ApartmentTypeFilterScreen;
