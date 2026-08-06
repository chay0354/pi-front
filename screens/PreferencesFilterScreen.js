import React, {useState, useRef, useCallback, useMemo, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  PanResponder,
  Platform,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {FigmaCheckbox} from '../components/FigmaCheckbox';
import FilterSaveButton from '../components/FilterSaveButton';
import FilterScreenBackBar from '../components/FilterScreenBackBar';
import {
  flexStart,
  forceLtrStyle,
  getRangeSliderPercentFromEvent,
  getSheetBottomInset,
  rangeSliderFillRtlVisualStyle,
  rangeSliderThumbRtlVisualStyle,
  touchPercentToRangeValuePercent,
} from '../utils/rtlLayout';

// Figma: node 25:200959 (מגירה - העדפות)
const BG = '#2B2A39';
const DIVIDER = '#373548';
const PILL_BORDER = '#4D4966';
const DARK_INK = '#1E1D27';
const DOT_BG = '#27262F';
const GOLD_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const GOLD_GRADIENT_LOCATIONS = [0.0456, 0.5076, 0.8831];
const TRACK_GRADIENT = ['#FFE073', '#FFBA30'];
const TRACK_GRADIENT_LOCATIONS = [0.1113, 0.8662];

const MIN_AGE = 18;
const MAX_AGE = 100;

const PreferencesFilterScreen = ({initialFilter, onClose, onSave}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = getSheetBottomInset(insets);
  const [gender, setGender] = useState(initialFilter?.gender ?? 'female');
  const [ageMin, setAgeMin] = useState(initialFilter?.ageMin ?? 20);
  const [ageMax, setAgeMax] = useState(initialFilter?.ageMax ?? 40);
  const [nonSmoker, setNonSmoker] = useState(initialFilter?.nonSmoker ?? false);
  const [students, setStudents] = useState(initialFilter?.students ?? false);
  const [stableJob, setStableJob] = useState(initialFilter?.stableJob ?? false);
  const [occasionalJob, setOccasionalJob] = useState(
    initialFilter?.occasionalJob ?? false,
  );
  const [immediateEntry, setImmediateEntry] = useState(
    initialFilter?.immediateEntry ?? false,
  );

  const IS_WEB = Platform.OS === 'web';
  const [sliderWidth, setSliderWidth] = useState(1);
  const sliderWidthRef = useRef(1);
  const sliderWindowXRef = useRef(0);
  const activeThumbRef = useRef(null);
  const sliderRef = useRef(null);
  const ageMinRef = useRef(ageMin);
  const ageMaxRef = useRef(ageMax);
  ageMinRef.current = ageMin;
  ageMaxRef.current = ageMax;

  const minPercent = ((ageMin - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;
  const maxPercent = ((ageMax - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;

  const updateFromPercent = useCallback((percent, isMin) => {
    const value = MIN_AGE + (percent / 100) * (MAX_AGE - MIN_AGE);
    const rounded = Math.round(value);
    const maxA = ageMaxRef.current;
    const minA = ageMinRef.current;
    if (isMin) setAgeMin(Math.max(MIN_AGE, Math.min(rounded, maxA - 1)));
    else setAgeMax(Math.min(MAX_AGE, Math.max(rounded, minA + 1)));
  }, []);

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
    const raw = getRangeSliderPercentFromEvent(
      nativeEvent,
      sliderWidthRef.current,
      sliderWindowXRef.current,
      sliderRef,
    );
    return touchPercentToRangeValuePercent(raw);
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
          setSliderWidth(width);
        }
        onReady(percentFromNativeEvent(nativeEvent));
      });
    },
    [percentFromNativeEvent],
  );

  const handlePressAtPercent = useCallback(
    percent => {
      const value = MIN_AGE + (percent / 100) * (MAX_AGE - MIN_AGE);
      const rounded = Math.round(value);
      const minDist = Math.abs(rounded - ageMinRef.current);
      const maxDist = Math.abs(rounded - ageMaxRef.current);
      if (minDist <= maxDist) {
        activeThumbRef.current = 'min';
        updateFromPercent(percent, true);
      } else {
        activeThumbRef.current = 'max';
        updateFromPercent(percent, false);
      }
    },
    [updateFromPercent],
  );

  const applyDragPercent = useCallback(
    percent => {
      const thumb = activeThumbRef.current;
      if (!thumb) return;
      updateFromPercent(percent, thumb === 'min');
    },
    [updateFromPercent],
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
          refreshMeasureThen(evt.nativeEvent, handlePressAtPercent);
        },
        onPanResponderMove: evt => {
          if (!activeThumbRef.current) return;
          refreshMeasureThen(evt.nativeEvent, applyDragPercent);
        },
        onPanResponderRelease: () => {
          activeThumbRef.current = null;
        },
      }),
    [refreshMeasureThen, handlePressAtPercent, applyDragPercent],
  );

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      syncSliderMeasure();
    });
    return () => cancelAnimationFrame(frameId);
  }, [syncSliderMeasure]);

  const handleSave = () => {
    if (onSave) {
      onSave({
        gender,
        ageMin,
        ageMax,
        nonSmoker,
        students,
        stableJob,
        occasionalJob,
        immediateEntry,
      });
    }
    if (onClose) onClose();
  };

  const handleClear = () => {
    if (onSave) onSave(null);
    if (onClose) onClose();
  };

  const GenderPill = ({label, value}) => {
    const active = gender === value;
    const content = (
      <>
        <Text
          style={[
            styles.genderText,
            active ? styles.genderTextActive : styles.genderTextInactive,
          ]}>
          {label}
        </Text>
        <View
          style={[
            styles.genderDot,
            active ? styles.genderDotActive : styles.genderDotInactive,
          ]}>
          {active ? (
            <LinearGradient
              colors={GOLD_GRADIENT}
              locations={[0, 0.5517, 1]}
              start={{x: 0.805, y: 0}}
              end={{x: 0.5, y: 1}}
              style={styles.genderDotInner}
            />
          ) : null}
        </View>
      </>
    );
    if (active) {
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setGender(value)}
          style={styles.genderPillWrap}>
          <LinearGradient
            colors={GOLD_GRADIENT}
            locations={GOLD_GRADIENT_LOCATIONS}
            start={{x: 0.5, y: 0}}
            end={{x: 0.5, y: 1}}
            style={styles.genderPill}>
            {content}
          </LinearGradient>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setGender(value)}
        style={[
          styles.genderPillWrap,
          styles.genderPillInactive,
          styles.genderPill,
        ]}>
        {content}
      </TouchableOpacity>
    );
  };

  const CheckRow = ({label, checked, onToggle}) => (
    <TouchableOpacity
      style={styles.checkRow}
      onPress={onToggle}
      activeOpacity={0.8}>
      <FigmaCheckbox checked={checked} />
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={{height: insets.top}} />
      <FilterScreenBackBar onClose={onClose} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image
            source={require('../assets/tiktok/prefrences.png')}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.headerLabel}>העדפות</Text>
        </View>

        <Text style={styles.sectionLabel}>מין</Text>
        <View style={styles.genderRow}>
          <GenderPill label="אישה" value="female" />
          <GenderPill label="גבר" value="male" />
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>גיל מועדף</Text>
        <View style={styles.ageRangeRow}>
          <Text style={styles.ageRangeValue}>{ageMin}</Text>
          <View style={styles.ageRangeSeparator} />
          <Text style={styles.ageRangeValue}>{ageMax}</Text>
        </View>
        <View
          ref={sliderRef}
          style={styles.sliderContainer}
          onLayout={() => {
            syncSliderMeasure();
          }}
          {...panResponder.panHandlers}
          collapsable={false}>
          <View style={styles.sliderTrack}>
            <LinearGradient
              colors={TRACK_GRADIENT}
              locations={TRACK_GRADIENT_LOCATIONS}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={[
                styles.sliderTrackFill,
                rangeSliderFillRtlVisualStyle(minPercent, maxPercent),
              ]}
            />
          </View>
          <LinearGradient
            colors={GOLD_GRADIENT}
            locations={GOLD_GRADIENT_LOCATIONS}
            start={{x: 0.5, y: 0}}
            end={{x: 0.5, y: 1}}
            style={[
              styles.sliderThumb,
              rangeSliderThumbRtlVisualStyle(minPercent),
              {pointerEvents: 'none'},
            ]}
          />
          <LinearGradient
            colors={GOLD_GRADIENT}
            locations={GOLD_GRADIENT_LOCATIONS}
            start={{x: 0.5, y: 0}}
            end={{x: 0.5, y: 1}}
            style={[
              styles.sliderThumb,
              rangeSliderThumbRtlVisualStyle(maxPercent),
              {pointerEvents: 'none'},
            ]}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.checksWrap}>
          <CheckRow
            label="ללא מעשנים"
            checked={nonSmoker}
            onToggle={() => setNonSmoker(!nonSmoker)}
          />
          <CheckRow
            label="סטודנטים"
            checked={students}
            onToggle={() => setStudents(!students)}
          />
          <CheckRow
            label="בעלי עבודה מסודרת"
            checked={stableJob}
            onToggle={() => setStableJob(!stableJob)}
          />
          <CheckRow
            label="בעלי עבודה מזדמנת"
            checked={occasionalJob}
            onToggle={() => setOccasionalJob(!occasionalJob)}
          />
          <CheckRow
            label="כניסה מיידית"
            checked={immediateEntry}
            onToggle={() => setImmediateEntry(!immediateEntry)}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, {paddingBottom: bottomInset + 8}]}>
        <FilterSaveButton onPress={handleSave} style={styles.saveBtnWrap} />
        <TouchableOpacity
          style={styles.clearWrap}
          onPress={handleClear}
          activeOpacity={0.7}>
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
  scroll: {flex: 1},
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 24,
    height: 24,
    marginBottom: 10,
  },
  headerLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.54,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    textAlign: 'center',
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    marginBottom: 10,
    textAlign: 'left',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    ...forceLtrStyle,
  },
  genderPillWrap: {
    flex: 1,
    height: 40,
    borderRadius: 846,
    overflow: 'hidden',
  },
  genderPillInactive: {
    borderWidth: 1.5,
    borderColor: PILL_BORDER,
    backgroundColor: 'transparent',
  },
  genderPill: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 8,
    position: 'relative',
  },
  genderText: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    textAlign: 'center',
  },
  genderTextInactive: {
    color: '#FFFFFF',
  },
  genderTextActive: {
    color: DARK_INK,
  },
  genderDot: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderDotInactive: {
    borderWidth: 1.5,
    borderColor: PILL_BORDER,
    backgroundColor: 'transparent',
  },
  genderDotActive: {
    backgroundColor: DOT_BG,
  },
  genderDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 24,
  },
  ageRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 19,
  },
  ageRangeValue: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    minWidth: 24,
    textAlign: 'center',
  },
  ageRangeSeparator: {
    width: 10,
    height: 1.5,
    backgroundColor: '#FFFFFF',
  },
  sliderContainer: {
    width: '100%',
    height: 42,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 0,
  },
  sliderTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 1000,
    overflow: 'visible',
  },
  sliderTrackFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 1000,
    top: 0,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    top: 10,
    zIndex: 2,
  },
  checksWrap: {
    gap: 28,
  },
  checkRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 8,
  },
  checkLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    textAlign: 'left',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 24,
    alignItems: 'center',
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  saveBtnWrap: {
    width: '100%',
  },
  clearWrap: {
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});

export default PreferencesFilterScreen;
