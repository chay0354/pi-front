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
  Platform,
  I18nManager,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import FilterSaveButton from '../components/FilterSaveButton';
import FilterScreenBackBar from '../components/FilterScreenBackBar';
import {FigmaCheckbox} from '../components/FigmaCheckbox';
import {
  flexStart,
  getRangeSliderPercentFromEvent,
  getSheetBottomInset,
} from '../utils/rtlLayout';

const BG = '#2B2A39';
const DIVIDER = '#373548';
const INPUT_BORDER = '#8C85B3';
const TEXT_SECONDARY = '#D2D0DC';
const TEXT_CLUE = 'rgba(255,255,255,0.35)';

const DISTANCE_SNAP_VALUES = [null, 0.5, 1, 2, 3, 4];
const CUSTOM_MARKER_PERCENT = 100;
const SNAP_MARKER_COUNT = DISTANCE_SNAP_VALUES.length;
const KNOB_SIZE = 22;
const DOT_SIZE = 4;
const MARKER_CELL_WIDTH = 38;
const UNLIMITED_MARKER_WIDTH = 54;
const CUSTOM_MARKER_INPUT_WIDTH = 44;
const IS_WEB = Platform.OS === 'web';

function parseInitialDistanceState(km) {
  if (km == null || km === '') {
    return {distanceKm: null, customInput: ''};
  }
  const n = Number(km);
  if (!Number.isFinite(n) || n <= 0) {
    return {distanceKm: null, customInput: ''};
  }
  const isPreset = DISTANCE_SNAP_VALUES.includes(n);
  return {
    distanceKm: n,
    customInput: isPreset ? '' : String(km).trim(),
  };
}

function formatSnapMarkerLabel(value) {
  if (value == null) return 'ללא הגבלה';
  return String(value);
}

function snapIndexToPercent(index) {
  return (index / SNAP_MARKER_COUNT) * CUSTOM_MARKER_PERCENT;
}

/**
 * Same RTL-visual technique as PriceFilterScreen: the app forces RTL +
 * swapLeftAndRightInRTL, so authored `left: X%` is mirrored to `right: X%`
 * (0% sits on the physical right). All slider parts use this single helper so
 * the thumb, dots and markers mirror identically and stay aligned. Touch X is
 * physical-LTR, so we flip it to value% (see touchPercentToValuePercent).
 *
 * valuePercent: 0% = ללא הגבלה (physical right) … 100% = custom km (physical left).
 */
function sliderPosStyle(percent, size) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  return IS_WEB
    ? {right: `${p}%`, marginRight: -size / 2}
    : {left: `${p}%`, marginLeft: -size / 2};
}

/** Gold fill anchored at the ללא הגבלה (physical right) end, growing toward the thumb. */
function distanceFillStyle(percent) {
  const w = Math.max(0, Math.min(100, Number(percent) || 0));
  return IS_WEB ? {right: '0%', width: `${w}%`} : {left: '0%', width: `${w}%`};
}

/** km value → valuePercent (ללא הגבלה→0 … custom→100). */
function distanceValueToPercent(value) {
  if (value != null && !DISTANCE_SNAP_VALUES.includes(value)) {
    return CUSTOM_MARKER_PERCENT;
  }
  const idx =
    value == null ? 0 : Math.max(0, DISTANCE_SNAP_VALUES.indexOf(value));
  return snapIndexToPercent(idx);
}

const SLIDER_IS_RTL_VISUAL = IS_WEB || I18nManager.isRTL;
const touchPercentToValuePercent = touchPercent =>
  SLIDER_IS_RTL_VISUAL ? 100 - touchPercent : touchPercent;

const BNB_REGIONS = [
  {id: 'north', label: 'צפון'},
  {id: 'south', label: 'דרום'},
  {id: 'center', label: 'מרכז'},
  {id: 'east', label: 'מזרח'},
  {id: 'west', label: 'מערב'},
];

/** valuePercent → km (0%→ללא הגבלה … max snap→4, custom at 100% when input has a value). */
function parseCustomDistanceKm(input) {
  const trimmed = String(input || '')
    .trim()
    .replace(',', '.');
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (Number.isFinite(n) && n > 0) return n;
  return null;
}

function percentToDistanceValue(percent, customInput = '') {
  const p = Math.max(0, Math.min(CUSTOM_MARKER_PERCENT, percent));
  const customKm = parseCustomDistanceKm(customInput);
  const slotCount = customKm != null ? SNAP_MARKER_COUNT + 1 : SNAP_MARKER_COUNT;
  const idx = Math.round((p / CUSTOM_MARKER_PERCENT) * (slotCount - 1));
  if (customKm != null && idx >= SNAP_MARKER_COUNT) {
    return customKm;
  }
  const clampedIdx = Math.min(Math.max(0, idx), SNAP_MARKER_COUNT - 1);
  return DISTANCE_SNAP_VALUES[clampedIdx];
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
  const initialDistance = parseInitialDistanceState(initialFilter?.distanceKm);
  const [distanceKm, setDistanceKm] = useState(initialDistance.distanceKm);
  const [customDistanceInput, setCustomDistanceInput] = useState(
    initialDistance.customInput,
  );
  const [regions, setRegions] = useState(() => {
    const initial = initialFilter?.regions;
    return Array.isArray(initial)
      ? initial.map(r => String(r || '').trim()).filter(Boolean)
      : [];
  });
  const [immediateEntry, setImmediateEntry] = useState(
    initialFilter?.immediateEntry ?? false,
  );

  const sliderWidthRef = useRef(1);
  const sliderWindowXRef = useRef(0);
  const sliderRef = useRef(null);
  const customDistanceInputRef = useRef(null);
  const [customInputFocused, setCustomInputFocused] = useState(false);

  const thumbPercent = useMemo(() => {
    if (customInputFocused) {
      return CUSTOM_MARKER_PERCENT;
    }
    return distanceValueToPercent(distanceKm);
  }, [customInputFocused, distanceKm]);

  const syncSliderMeasure = useCallback(() => {
    const node = sliderRef.current;
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((x, _y, width) => {
      if (width > 0) {
        sliderWindowXRef.current = x;
        sliderWidthRef.current = width;
      }
    });
  }, []);

  const percentFromNativeEvent = useCallback(nativeEvent => {
    const touchPercent = getRangeSliderPercentFromEvent(
      nativeEvent,
      sliderWidthRef.current,
      sliderWindowXRef.current,
      sliderRef,
    );
    return touchPercentToValuePercent(touchPercent);
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
    setDistanceKm(percentToDistanceValue(percent, customDistanceInput));
    setCustomInputFocused(false);
    customDistanceInputRef.current?.blur?.();
  }, [customDistanceInput]);

  const handleCustomDistanceFocus = useCallback(() => {
    setCustomInputFocused(true);
    const trimmed = String(customDistanceInput || '')
      .trim()
      .replace(',', '.');
    if (trimmed === '') return;
    const n = Number(trimmed);
    if (Number.isFinite(n) && n > 0) {
      setDistanceKm(n);
    }
  }, [customDistanceInput]);

  const handleCustomDistanceChange = useCallback(text => {
    setCustomDistanceInput(text);
    const trimmed = String(text || '')
      .trim()
      .replace(',', '.');
    if (trimmed === '') {
      if (!customInputFocused) {
        setDistanceKm(null);
      }
      return;
    }
    const n = Number(trimmed);
    if (Number.isFinite(n) && n > 0) {
      setDistanceKm(n);
    }
  }, [customInputFocused]);

  const resolveDistanceKmForSave = useCallback(() => distanceKm, [distanceKm]);

  /** Swipe למכירה ↔ להשכרה on the pill track (row-reverse: sale left, rent right). */
  const purposePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.1,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.25,
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) < 16 || Math.abs(g.dx) <= Math.abs(g.dy)) return;
          setPurpose(g.dx > 0 ? 'rent' : 'sale');
        },
      }),
    [],
  );

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
      const trimmedCity = String(city || '').trim();
      const trimmedStreet = String(street || '').trim();
      const trimmedCountry = String(country || '').trim();
      onSave({
        purpose: hidePurpose ? null : purpose,
        country: isGlobal && trimmedCountry ? trimmedCountry : null,
        city: trimmedCity || null,
        street: trimmedStreet || null,
        distanceKm: isGlobal || isBnb ? null : resolveDistanceKmForSave(),
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
            <View
              style={styles.purposeToggleTrack}
              {...purposePanResponder.panHandlers}
              collapsable={false}>
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

        {!isBnb && !isGlobal && !isLand && (
          <>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setImmediateEntry(!immediateEntry)}
              activeOpacity={0.8}>
              <Text style={styles.checkLabel}>כניסה מיידית</Text>
              <View style={styles.checkboxImageWrap}>
                <CheckCircle checked={immediateEntry} />
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />
          </>
        )}

        {!isGlobal && !isBnb && (
        <><View style={styles.fieldWrap}>
          <Text style={styles.label}>מרחק ממני</Text>
          <View
            ref={sliderRef}
            style={styles.sliderTrackWrap}
            onLayout={syncSliderMeasure}
            collapsable={false}>
            <View style={styles.sliderMarkers} pointerEvents="box-none">
              {DISTANCE_SNAP_VALUES.map((value, index) => (
                <View
                  key={value == null ? 'unlimited' : String(value)}
                  pointerEvents="none"
                  style={[
                    styles.sliderMarkerCell,
                    value == null && styles.sliderMarkerCellWide,
                    sliderPosStyle(
                      snapIndexToPercent(index),
                      value == null ? UNLIMITED_MARKER_WIDTH : MARKER_CELL_WIDTH,
                    ),
                  ]}>
                  <Text
                    style={[
                      styles.sliderMarkerText,
                      value == null && styles.sliderMarkerTextSmall,
                    ]}
                    numberOfLines={1}>
                    {formatSnapMarkerLabel(value)}
                  </Text>
                </View>
              ))}
              <View
                style={[
                  styles.sliderMarkerCell,
                  styles.sliderMarkerCustomCell,
                  sliderPosStyle(
                    CUSTOM_MARKER_PERCENT,
                    CUSTOM_MARKER_INPUT_WIDTH,
                  ),
                ]}>
                <TextInput
                  ref={customDistanceInputRef}
                  style={styles.sliderMarkerInput}
                  placeholder="…"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={customDistanceInput}
                  onChangeText={handleCustomDistanceChange}
                  onFocus={handleCustomDistanceFocus}
                  onBlur={() => {
                    setCustomInputFocused(false);
                    if (String(customDistanceInput || '').trim() === '') {
                      setDistanceKm(null);
                    }
                  }}
                  keyboardType="decimal-pad"
                  textAlign="center"
                  returnKeyType="done"
                />
              </View>
            </View>
            <View
              style={styles.sliderRow}
              {...panResponder.panHandlers}
              collapsable={false}>
              <View style={styles.sliderTrack} />
              <LinearGradient
                colors={['#FEE787', '#BD9947', '#9C6522']}
                locations={[0.0456, 0.5076, 0.8831]}
                start={{x: 0.5, y: 0}}
                end={{x: 0.5, y: 1}}
                style={[styles.sliderTrackFill, distanceFillStyle(thumbPercent)]}
              />
              {DISTANCE_SNAP_VALUES.map((value, index) => {
                if (index === 0 || index === 1 || index === SNAP_MARKER_COUNT - 1) {
                  return null;
                }
                return (
                  <View
                    key={`dot-${value}`}
                    style={[
                      styles.sliderDot,
                      sliderPosStyle(snapIndexToPercent(index), DOT_SIZE),
                    ]}
                  />
                );
              })}
              <LinearGradient
                colors={['#FFE073', '#FFBA30']}
                start={{x: 0.17, y: 0.13}}
                end={{x: 0.79, y: 0.87}}
                style={[styles.sliderThumb, sliderPosStyle(thumbPercent, KNOB_SIZE)]}
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
    marginHorizontal: KNOB_SIZE / 2,
    paddingVertical: 10,
  },
  sliderMarkers: {
    position: 'relative',
    height: 32,
    marginBottom: 14,
  },
  sliderMarkerCell: {
    position: 'absolute',
    top: 0,
    width: MARKER_CELL_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderMarkerCellWide: {
    width: UNLIMITED_MARKER_WIDTH,
  },
  sliderMarkerCustomCell: {
    zIndex: 4,
    elevation: 4,
  },
  sliderMarkerText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  sliderMarkerTextSmall: {
    fontSize: 11,
    lineHeight: 14,
  },
  sliderMarkerInput: {
    width: CUSTOM_MARKER_INPUT_WIDTH,
    height: 32,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    writingDirection: 'ltr',
    backgroundColor: BG,
  },
  sliderRow: {
    height: KNOB_SIZE,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (KNOB_SIZE - 4) / 2,
    height: 4,
    backgroundColor: '#D2D0DC',
    borderRadius: 1000,
  },
  sliderDot: {
    position: 'absolute',
    top: (KNOB_SIZE - DOT_SIZE) / 2,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#A5A3B6',
  },
  sliderTrackFill: {
    position: 'absolute',
    top: (KNOB_SIZE - 4) / 2,
    height: 4,
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
