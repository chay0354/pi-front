import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  PanResponder,
  I18nManager,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {FigmaCheckbox} from '../components/FigmaCheckbox';
import FilterSaveButton from '../components/FilterSaveButton';
import {flexStart} from '../index';

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
  const bottomInset = Math.max(insets.bottom, 8);
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

  const [sliderWidth, setSliderWidth] = useState(
    Dimensions.get('window').width - 48,
  );
  const activeThumbRef = useRef(null);
  const sliderRef = useRef(null);
  const ageMinRef = useRef(ageMin);
  const ageMaxRef = useRef(ageMax);
  ageMinRef.current = ageMin;
  ageMaxRef.current = ageMax;

  const minPercent = ((ageMin - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;
  const maxPercent = ((ageMax - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;

  const updateFromPercent = (percent, isMin) => {
    const value = MIN_AGE + (percent / 100) * (MAX_AGE - MIN_AGE);
    const rounded = Math.round(value);
    const maxA = ageMaxRef.current;
    const minA = ageMinRef.current;
    if (isMin) setAgeMin(Math.max(MIN_AGE, Math.min(rounded, maxA - 1)));
    else setAgeMax(Math.min(MAX_AGE, Math.max(rounded, minA + 1)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: evt => {
        const touch = evt.nativeEvent.touches?.[0] || evt.nativeEvent;
        const rect = sliderRef.current?.getBoundingClientRect?.();
        const locationX =
          rect && touch.pageX != null
            ? touch.pageX - rect.left
            : (touch.locationX ?? 0);
        const w = sliderWidth || 1;
        const percent = Math.max(0, Math.min(100, (locationX / w) * 100));
        const minP =
          ((ageMinRef.current - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;
        const maxP =
          ((ageMaxRef.current - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;
        const minDist = Math.abs(percent - minP);
        const maxDist = Math.abs(percent - maxP);
        activeThumbRef.current = minDist < maxDist ? 'min' : 'max';
      },
      onPanResponderMove: evt => {
        const thumb = activeThumbRef.current;
        if (!thumb) return;
        const touch = evt.nativeEvent.touches?.[0] || evt.nativeEvent;
        const rect = sliderRef.current?.getBoundingClientRect?.();
        const locationX =
          rect && touch.pageX != null
            ? touch.pageX - rect.left
            : (touch.locationX ?? 0);
        const w = sliderWidth || 1;
        const percent = Math.max(0, Math.min(100, (locationX / w) * 100));
        updateFromPercent(percent, thumb === 'min');
      },
      onPanResponderRelease: () => {
        activeThumbRef.current = null;
      },
    }),
  ).current;

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
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onClose}
        style={styles.topRail}>
        <View style={styles.handleBar} />
      </TouchableOpacity>

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
          onLayout={e => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) setSliderWidth(w);
          }}
          {...panResponder.panHandlers}>
          <View style={styles.sliderTrack}>
            <LinearGradient
              colors={TRACK_GRADIENT}
              locations={TRACK_GRADIENT_LOCATIONS}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={[
                styles.sliderTrackFill,
                {
                  left: `${minPercent}%`,
                  width: `${maxPercent - minPercent}%`,
                },
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
              {left: `${minPercent}%`, pointerEvents: 'none'},
            ]}
          />
          <LinearGradient
            colors={GOLD_GRADIENT}
            locations={GOLD_GRADIENT_LOCATIONS}
            start={{x: 0.5, y: 0}}
            end={{x: 0.5, y: 1}}
            style={[
              styles.sliderThumb,
              {left: `${maxPercent}%`, pointerEvents: 'none'},
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
  topRail: {
    height: 37,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#464646',
    borderRadius: 3,
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
    direction: 'ltr',
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
    // justifyContent: 'center',
    gap: 10,
    marginBottom: 19,
    direction: 'ltr',
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
    height: 22,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 0,
    direction: 'ltr',
  },
  sliderTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 9,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 1000,
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
    marginLeft: -11,
    top: 0,
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
