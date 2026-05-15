import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  I18nManager,
  Image,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import FilterSaveButton from '../components/FilterSaveButton';
import {FigmaCheckbox} from '../components/FigmaCheckbox';
import {flexStart} from '../index';

const BG = '#2B2A39';
const DIVIDER = '#373548';
const INPUT_BORDER = '#8C85B3';
const TEXT_SECONDARY = '#D2D0DC';
const TEXT_CLUE = 'rgba(255,255,255,0.35)';

const DISTANCE_OPTIONS = [100, 80, 60, 40, 20];
const KNOB_SIZE = 22;

// Figma assets for node 12:74885
const FIGMA_CITY_ICON = require('../assets/buttom-bar/city.png');

const CityFilterScreen = ({
  initialFilter,
  onClose,
  onSave,
  selectedCategory,
}) => {
  const insets = useSafeAreaInsets();
  const {height: screenHeight} = useWindowDimensions();
  const compact = screenHeight < 760;
  const isBnb = selectedCategory === 5 || selectedCategory === '5';
  const isPartners = selectedCategory === 3 || selectedCategory === '3';
  // null = do not filter by rent/sale (מחיר/עיר style "no filter" until user picks a purpose)
  const [purpose, setPurpose] = useState(
    initialFilter != null &&
      (initialFilter.purpose === 'rent' || initialFilter.purpose === 'sale')
      ? initialFilter.purpose
      : null,
  ); // null | 'rent' | 'sale'
  const [city, setCity] = useState(initialFilter?.city ?? '');
  const [street, setStreet] = useState(initialFilter?.street ?? '');
  const [distanceKm, setDistanceKm] = useState(initialFilter?.distanceKm ?? 20);
  const [immediateEntry, setImmediateEntry] = useState(
    initialFilter?.immediateEntry ?? false,
  );

  // Non-functional for now; slider only reflects the static default value.
  // Drag / tap wiring will be added in a follow-up.
  const thumbLeft = useMemo(() => {
    const idx = Math.max(0, DISTANCE_OPTIONS.indexOf(distanceKm));
    const ratio = idx / (DISTANCE_OPTIONS.length - 1);
    return `${ratio * 100}%`;
  }, [distanceKm]);

  const hidePurpose = isBnb || isPartners;

  const handleSave = () => {
    if (onSave) {
      onSave({
        purpose: hidePurpose ? null : purpose,
        city,
        street,
        distanceKm,
        immediateEntry: isBnb ? null : immediateEntry,
      });
    }
    if (onClose) onClose();
  };

  const handleClear = () => {
    if (onSave) onSave(null);
    if (onClose) onClose();
  };
  const bottomInset = Math.max(insets.bottom, 8);
  const CheckCircle = ({checked}) => <FigmaCheckbox checked={checked} />;

  return (
    <View style={styles.container}>
      <View style={{height: insets.top}} />
      <View style={styles.topRail}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onClose}
          style={styles.handlePressArea}>
          <View style={styles.handle} />
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
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
            source={FIGMA_CITY_ICON}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.title}>עיר</Text>
        </View>

        {!hidePurpose && (
          <>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>עיר</Text>
            </View>
            <View style={styles.purposeList}>
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setPurpose('rent')}
                activeOpacity={0.8}>
                <Text style={styles.checkLabel}>להשכרה</Text>
                <View style={styles.checkboxImageWrap}>
                  <CheckCircle checked={purpose === 'rent'} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setPurpose('sale')}
                activeOpacity={0.8}>
                <Text style={styles.checkLabel}>למכירה</Text>
                <View style={styles.checkboxImageWrap}>
                  <CheckCircle checked={purpose === 'sale'} />
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
          </>
        )}

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>עיר</Text>
          <TextInput
            style={styles.input}
            placeholder="הזן שם עיר"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={city}
            onChangeText={setCity}
            textAlign="left"
          />
        </View>
        <View style={styles.divider} />

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>רחוב</Text>
          <TextInput
            style={styles.input}
            placeholder="הזן שם רחוב"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={street}
            onChangeText={setStreet}
            textAlign="left"
          />
        </View>
        <View style={styles.divider} />

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>מרחק ממני (ק"מ)</Text>
          <View style={styles.sliderTrackWrap} pointerEvents="none">
            <View style={styles.sliderMarkers}>
              {DISTANCE_OPTIONS.map(km => (
                <View key={km} style={styles.sliderMarkerCell}>
                  <Text style={styles.sliderMarkerText}>{km}</Text>
                </View>
              ))}
            </View>
            <View style={styles.sliderRow}>
              <View style={styles.sliderTrack}>
                {DISTANCE_OPTIONS.map((_, idx) => {
                  if (idx === DISTANCE_OPTIONS.length - 1) return null;
                  return (
                    <View
                      key={`dot-${idx}`}
                      style={[
                        styles.sliderDot,
                        {
                          left: `${(idx / (DISTANCE_OPTIONS.length - 1)) * 100}%`,
                          marginLeft: -2,
                        },
                      ]}
                    />
                  );
                })}
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{x: 0.5, y: 0}}
                  end={{x: 0.5, y: 1}}
                  style={[styles.sliderTrackFill, {left: thumbLeft}]}
                />
              </View>
              <LinearGradient
                colors={['#FFE073', '#FFBA30']}
                start={{x: 0.17, y: 0.13}}
                end={{x: 0.79, y: 0.87}}
                style={[
                  styles.sliderThumb,
                  {
                    left: thumbLeft,
                    marginLeft: -(KNOB_SIZE / 2),
                  },
                ]}
              />
            </View>
          </View>
        </View>
        <View style={styles.divider} />

        {!isBnb && (
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setImmediateEntry(!immediateEntry)}
            activeOpacity={0.8}>
            <Text style={styles.checkLabel}>כניסה מיידית</Text>
            <View style={styles.checkboxImageWrap}>
              <CheckCircle checked={immediateEntry} />
            </View>
          </TouchableOpacity>
        )}
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  headerCompact: {
    marginBottom: 18,
  },
  headerIcon: {
    width: 24,
    height: 24,
  },
  title: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.54,
    fontFamily: 'Rubik-Regular',
    marginTop: 8,
  },
  sectionTitleRow: {
    width: '100%',
    alignItems: flexStart,
    marginBottom: 18,
  },
  sectionTitle: {
    color: TEXT_SECONDARY,
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    textAlign: 'left',
  },
  purposeList: {
    alignItems: flexStart,
    marginBottom: 18,
  },
  fieldWrap: {
    marginBottom: 18,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginBottom: 20,
  },
  label: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    marginBottom: 8,
    textAlign: 'left',
    letterSpacing: 0.14,
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 999,
    height: 52,
    paddingVertical: 10,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  sliderTrackWrap: {
    marginTop: 10,
  },
  sliderMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 11,
    marginBottom: 14,
  },
  sliderMarkerCell: {
    width: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderMarkerText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  sliderRow: {
    height: KNOB_SIZE,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#D2D0DC',
    borderRadius: 1000,
    position: 'relative',
    marginHorizontal: KNOB_SIZE / 2,
  },
  sliderDot: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A5A3B6',
  },
  sliderTrackFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    borderRadius: 1000,
  },
  sliderThumb: {
    position: 'absolute',
    top: 0,
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    borderWidth: 2,
    borderColor: '#2B2A39',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    marginBottom: 14,
    gap: 8,
  },
  checkboxImageWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
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

export default CityFilterScreen;
