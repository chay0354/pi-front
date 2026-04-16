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

const BG = '#2B2A39';
const DIVIDER = '#373548';
const GOLD_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const RADIO_BORDER = '#A5A5A5';
const MENU_ICON =
  'https://www.figma.com/api/mcp/asset/58414622-21a1-4975-b28d-8ec0405f5152';

const APARTMENT_TYPES = [
  {id: 'apartment', label: 'דירה'},
  {id: 'studio', label: 'דירת סטודיו'},
  {id: 'garden', label: 'דירת גן'},
  {id: 'private_house', label: 'בית פרטי'},
  {id: 'duplex', label: 'דופלקס'},
  {id: 'penthouse', label: 'נטהאוז'},
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
          <Text style={styles.title}>סוג דירה</Text>
        </View>

        <View style={[styles.radioList, compact && styles.radioListCompact]}>
          {APARTMENT_TYPES.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.radioRow}
              onPress={() => setSelectedId(option.id)}
              activeOpacity={0.8}>
              <Text style={styles.radioLabel}>{option.label}</Text>
              <View style={styles.radioOuter}>
                {selectedId === option.id ? (
                  <View style={styles.radioInner} />
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    flexGrow: 1,
    justifyContent: 'space-between',
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
    letterSpacing: 0.54,
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
    gap: 16,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  footerCompact: {
    marginTop: 12,
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

export default ApartmentTypeFilterScreen;
