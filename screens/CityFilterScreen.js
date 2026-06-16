import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import FilterSaveButton from '../components/FilterSaveButton';
import FilterScreenBackBar from '../components/FilterScreenBackBar';
import {FigmaCheckbox} from '../components/FigmaCheckbox';
import {
  flexStart,
  forceLtrStyle,
  getRangeSliderPercentFromEvent,
  getSheetBottomInset,
  rangeSliderThumbStyle,
  rangeSliderTrailingFillStyle,
} from '../utils/rtlLayout';

const BG = '#2B2A39';
const DIVIDER = '#373548';
const INPUT_BORDER = '#8C85B3';
const TEXT_SECONDARY = '#D2D0DC';
const TEXT_CLUE = 'rgba(255,255,255,0.35)';

const DISTANCE_OPTIONS = [100, 80, 60, 40, 20];
const KNOB_SIZE = 22;

const BNB_REGIONS = [
  {id: 'north', label: 'צפון'},
  {id: 'south', label: 'דרום'},
  {id: 'center', label: 'מרכז'},
  {id: 'east', label: 'מזרח'},
  {id: 'west', label: 'מערב'},
];

function percentToDistanceKm(percent) {
  const steps = DISTANCE_OPTIONS.length - 1;
  const idx = Math.round(
    (Math.max(0, Math.min(100, percent)) / 100) * steps,
  );
  return DISTANCE_OPTIONS[idx];
}

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
  const isGlobal = selectedCategory === 4 || selectedCategory === '4';
  const isLand = selectedCategory === 7 || selectedCategory === '7';
  const isNewFromDeveloper = selectedCategory === 1 || selectedCategory === '1';
  // Default to 'sale' (למכירה) when opened without a prior rent/sale selection.
  const [purpose, setPurpose] = useState(
    initialFilter != null &&
      (initialFilter.purpose === 'rent' || initialFilter.purpose === 'sale')
      ? initialFilter.purpose
      : 'sale',
  ); // null | 'rent' | 'sale'
  const [country, setCountry] = useState(initialFilter?.country ?? '');
  const [city, setCity] = useState(initialFilter?.city ?? '');
  const [street, setStreet] = useState(initialFilter?.street ?? '');
  const [distanceKm, setDistanceKm] = useState(initialFilter?.distanceKm ?? 20);
  const [regions, setRegions] = useState(() => {
    const initial = initialFilter?.regions;
    return Array.isArray(initial)
      ? initial.map(r => String(r || '').trim()).filter(Boolean)
      : [];
  });
  const [immediateEntry, setImmediateEntry] = useState(
    initialFilter?.immediateEntry ?? false,
  );

  const [sliderWidth, setSliderWidth] = useState(1);
  const sliderWidthRef = useRef(1);
  const sliderWindowXRef = useRef(0);
  const sliderRef = useRef(null);

  const thumbPercent = useMemo(() => {
    const idx = Math.max(0, DISTANCE_OPTIONS.indexOf(distanceKm));
    return (idx / (DISTANCE_OPTIONS.length - 1)) * 100;
  }, [distanceKm]);

  const syncSliderMeasure = useCallback(() => {
    const node = sliderRef.current;
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((x, _y, width) => {
      if (width > 0) {
        sliderWindowXRef.current = x;
        sliderWidthRef.current = width;
        setSliderWidth(width);
      }
    });
  }, []);

  const percentFromNativeEvent = useCallback(nativeEvent => {
    return getRangeSliderPercentFromEvent(
      nativeEvent,
      sliderWidthRef.current,
      sliderWindowXRef.current,
      sliderRef,
    );
  }, []);

  const refreshMeasureThen = useCallback(
    (nativeEvent, onReady) => {
      const node = sliderRef.current;
      if (!node || typeof node.measureInWindow !== 'function') {
        onReady(percentFromNativeEvent(nativeEvent));
        return;
      }
      node.measureInWindow((x, _y, width) => {
        if (width > 0) {
          sliderWindowXRef.current = x;
          sliderWidthRef.current = width;
        }
        onReady(percentFromNativeEvent(nativeEvent));
      });
    },
    [percentFromNativeEvent],
  );

  const applyDistanceFromPercent = useCallback(percent => {
    setDistanceKm(percentToDistanceKm(percent));
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: evt => {
          refreshMeasureThen(evt.nativeEvent, applyDistanceFromPercent);
        },
        onPanResponderMove: evt => {
          refreshMeasureThen(evt.nativeEvent, applyDistanceFromPercent);
        },
      }),
    [applyDistanceFromPercent, refreshMeasureThen],
  );

  const hidePurpose = isBnb || isPartners || isGlobal || isNewFromDeveloper;

  const toggleRegion = regionId => {
    setRegions(prev =>
      prev.includes(regionId)
        ? prev.filter(id => id !== regionId)
        : [...prev, regionId],
    );
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        purpose: hidePurpose ? null : purpose,
        country: isGlobal ? country : null,
        city,
        street,
        distanceKm: isGlobal || isBnb ? null : distanceKm,
        regions: isBnb && regions.length > 0 ? regions : null,
        immediateEntry: isGlobal || isBnb || isLand ? null : immediateEntry,
      });
    }
    if (onClose) onClose();
  };

  const handleClear = () => {
    if (onSave) onSave(null);
    if (onClose) onClose();
  };
  const bottomInset = getSheetBottomInset(insets);
  const CheckCircle = ({checked}) => <FigmaCheckbox checked={checked} />;

  return (
    <View style={styles.container}>
      <View style={{height: insets.top}} />
      <FilterScreenBackBar onClose={onClose} />

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
            <View style={styles.purposeToggleTrack}>
              <TouchableOpacity
                style={styles.purposeSegment}
                activeOpacity={0.9}
                onPress={() => setPurpose(purpose === 'sale' ? null : 'sale')}>
                {purpose === 'sale' && (
                  <LinearGradient
                    colors={['#FEE787', '#BD9947', '#9C6522']}
                    locations={[0.0456, 0.5076, 0.8831]}
                    start={{x: 0.5, y: 0}}
                    end={{x: 0.5, y: 1}}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text
                  style={[
                    styles.purposeSegmentText,
                    purpose === 'sale' && styles.purposeSegmentTextActive,
                  ]}>
                  למכירה
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.purposeSegment}
                activeOpacity={0.9}
                onPress={() => setPurpose(purpose === 'rent' ? null : 'rent')}>
                {purpose === 'rent' && (
                  <LinearGradient
                    colors={['#FEE787', '#BD9947', '#9C6522']}
                    locations={[0.0456, 0.5076, 0.8831]}
                    start={{x: 0.5, y: 0}}
                    end={{x: 0.5, y: 1}}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text
                  style={[
                    styles.purposeSegmentText,
                    purpose === 'rent' && styles.purposeSegmentTextActive,
                  ]}>
                  להשכרה
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
          </>
        )}

        {isGlobal && (
          <>
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>ארץ</Text>
              <TextInput
                style={styles.input}
                placeholder="הזן שם ארץ"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={country}
                onChangeText={setCountry}
                textAlign="right"
              />
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
            textAlign="right"
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
            textAlign="right"
          />
        </View>
        <View style={styles.divider} />

        {!isGlobal && !isBnb && (
        <><View style={styles.fieldWrap}>
          <Text style={styles.label}>מרחק ממני (ק"מ)</Text>
          <View
            ref={sliderRef}
            style={styles.sliderTrackWrap}
            onLayout={syncSliderMeasure}
            {...panResponder.panHandlers}
            collapsable={false}>
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
                  const dotPct =
                    (idx / (DISTANCE_OPTIONS.length - 1)) * 100;
                  return (
                    <View
                      key={`dot-${idx}`}
                      style={[
                        styles.sliderDot,
                        rangeSliderThumbStyle(sliderWidth, dotPct, 4),
                      ]}
                    />
                  );
                })}
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{x: 0.5, y: 0}}
                  end={{x: 0.5, y: 1}}
                  style={[
                    styles.sliderTrackFill,
                    rangeSliderTrailingFillStyle(sliderWidth, thumbPercent),
                  ]}
                />
              </View>
              <LinearGradient
                colors={['#FFE073', '#FFBA30']}
                start={{x: 0.17, y: 0.13}}
                end={{x: 0.79, y: 0.87}}
                style={[
                  styles.sliderThumb,
                  rangeSliderThumbStyle(sliderWidth, thumbPercent, KNOB_SIZE),
                ]}
              />
            </View>
          </View>
        </View>
        <View style={styles.divider} /></>
        )}

        {isBnb && (
          <>
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>אזור</Text>
              <View style={styles.regionWrap}>
                {BNB_REGIONS.map(({id, label}) => (
                  <TouchableOpacity
                    key={id}
                    style={styles.checkRow}
                    onPress={() => toggleRegion(id)}
                    activeOpacity={0.8}>
                    <FigmaCheckbox checked={regions.includes(id)} />
                    <Text style={styles.checkLabel}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.divider} />
          </>
        )}

        {!isBnb && !isGlobal && !isLand && (
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
  purposeToggleTrack: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#1e1d27',
    borderRadius: 1000,
    padding: 10,
    marginBottom: 18,
  },
  purposeSegment: {
    flex: 1,
    height: 44,
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  purposeSegmentText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 20,
    letterSpacing: 0.2,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  purposeSegmentTextActive: {
    color: '#1e1d27',
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
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sliderTrackWrap: {
    marginTop: 10,
    paddingVertical: 10,
    ...forceLtrStyle,
  },
  sliderMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    ...forceLtrStyle,
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
    ...forceLtrStyle,
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
  regionWrap: {
    gap: 14,
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
