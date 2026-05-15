import React, {useRef, useState, useMemo, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Platform,
  I18nManager,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
/** Match PreferencesFilterScreen (Figma drawer — גיל מועדף). */
const GOLD_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const GOLD_GRADIENT_LOCATIONS = [0.0456, 0.5076, 0.8831];
const TRACK_GRADIENT = ['#FFE073', '#FFBA30'];
const TRACK_GRADIENT_LOCATIONS = [0.1113, 0.8662];

const AGE_MIN = 18;
const AGE_MAX = 100;
const THUMB = 22;
const THUMB_R = -THUMB / 2;

function ageToPercent(age) {
  const a = Math.max(AGE_MIN, Math.min(AGE_MAX, Number(age) || AGE_MIN));
  return ((a - AGE_MIN) / (AGE_MAX - AGE_MIN)) * 100;
}

function percentToAge(percent) {
  const p = Math.max(0, Math.min(100, percent));
  return Math.round(AGE_MIN + (p / 100) * (AGE_MAX - AGE_MIN));
}

/**
 * Partners — גיל מועדף (Figma 9:144344). Wires to preferredAgeMin/Max → DB.
 */
const IS_WEB = Platform.OS === 'web';

export const AgeRangeSlider = ({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}) => {
  /** Native: seed width so first drag works before onLayout; web: measure via DOM. */
  const [sliderWidth, setSliderWidth] = useState(IS_WEB ? 0 : 320);
  const activeThumbRef = useRef(null);
  const webDraggingRef = useRef(false);
  const sliderContainerRef = useRef(null);
  const minValueRef = useRef(minValue);
  const maxValueRef = useRef(maxValue);

  useEffect(() => {
    minValueRef.current = minValue;
    maxValueRef.current = maxValue;
  }, [minValue, maxValue]);

  const minPct = ageToPercent(minValue);
  const maxPct = ageToPercent(maxValue);

  const applyPair = useCallback(
    (lo, hi) => {
      let a = Math.max(AGE_MIN, Math.min(AGE_MAX, Math.round(lo)));
      let b = Math.max(AGE_MIN, Math.min(AGE_MAX, Math.round(hi)));
      if (a >= b) {
        if (activeThumbRef.current === 'min') {
          a = Math.max(AGE_MIN, b - 1);
        } else {
          b = Math.min(AGE_MAX, a + 1);
        }
      }
      onMinChange(a);
      onMaxChange(b);
    },
    [onMinChange, onMaxChange],
  );

  const getTrackWidth = useCallback(() => {
    const el = sliderContainerRef.current;
    if (el && typeof el.getBoundingClientRect === 'function' && IS_WEB) {
      const w = el.getBoundingClientRect().width;
      if (w > 0) return w;
    }
    return sliderWidth > 0 ? sliderWidth : 1;
  }, [sliderWidth]);

  const handlePressAtX = useCallback(
    locationX => {
      const w = getTrackWidth();
      if (!w) return;
      const percent = (locationX / w) * 100;
      const touchedAge = percentToAge(percent);
      const minDist = Math.abs(touchedAge - Number(minValueRef.current));
      const maxDist = Math.abs(touchedAge - Number(maxValueRef.current));
      if (minDist <= maxDist) {
        activeThumbRef.current = 'min';
        applyPair(touchedAge, maxValueRef.current);
      } else {
        activeThumbRef.current = 'max';
        applyPair(minValueRef.current, touchedAge);
      }
    },
    [getTrackWidth, applyPair],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: evt => {
          const {locationX} = evt.nativeEvent;
          handlePressAtX(locationX);
        },
        onPanResponderMove: evt => {
          const thumb = activeThumbRef.current;
          if (!thumb) return;
          const w = sliderWidth > 0 ? sliderWidth : getTrackWidth();
          if (!w) return;
          const {locationX} = evt.nativeEvent;
          const percent = Math.max(0, Math.min(100, (locationX / w) * 100));
          const age = percentToAge(percent);
          if (thumb === 'min') {
            applyPair(age, maxValueRef.current);
          } else {
            applyPair(minValueRef.current, age);
          }
        },
        onPanResponderRelease: () => {
          activeThumbRef.current = null;
        },
      }),
    [sliderWidth, getTrackWidth, handlePressAtX, applyPair],
  );

  const applyDragAtClientX = useCallback(
    clientX => {
      const el = sliderContainerRef.current;
      if (!el || typeof el.getBoundingClientRect !== 'function') return;
      const rect = el.getBoundingClientRect();
      const w = rect.width || sliderWidth || 1;
      const locationX = clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (locationX / w) * 100));
      const age = percentToAge(percent);
      const thumb = activeThumbRef.current;
      if (!thumb) return;
      if (thumb === 'min') {
        applyPair(age, maxValueRef.current);
      } else {
        applyPair(minValueRef.current, age);
      }
    },
    [sliderWidth, applyPair],
  );

  useEffect(() => {
    if (!IS_WEB) return;
    const onMove = e => {
      if (!webDraggingRef.current) return;
      applyDragAtClientX(e.clientX);
    };
    const onUp = () => {
      webDraggingRef.current = false;
      activeThumbRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [applyDragAtClientX]);

  const webMouseDown = useCallback(
    e => {
      if (!IS_WEB) return;
      if (typeof e.preventDefault === 'function') e.preventDefault();
      const el = sliderContainerRef.current;
      if (!el || typeof el.getBoundingClientRect !== 'function') return;
      const rect = el.getBoundingClientRect();
      const w = rect.width;
      if (!(w > 0)) return;
      const locationX = e.clientX - rect.left;
      webDraggingRef.current = true;
      handlePressAtX(locationX);
    },
    [handlePressAtX],
  );

  const webTouchStart = useCallback(
    e => {
      const touch = e.touches?.[0] || e.nativeEvent?.touches?.[0];
      if (!touch || !sliderContainerRef.current) return;
      const rect = sliderContainerRef.current.getBoundingClientRect?.();
      if (!rect) return;
      const locationX = touch.clientX - rect.left;
      handlePressAtX(locationX);
    },
    [handlePressAtX],
  );

  const webTouchMove = useCallback(
    e => {
      const thumb = activeThumbRef.current;
      if (!thumb || !sliderContainerRef.current) return;
      const touch = e.touches?.[0] || e.nativeEvent?.touches?.[0];
      if (!touch) return;
      const rect = sliderContainerRef.current.getBoundingClientRect?.();
      if (!rect) return;
      const w = rect.width || sliderWidth || 1;
      const locationX = touch.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (locationX / w) * 100));
      const age = percentToAge(percent);
      if (thumb === 'min') {
        applyPair(age, maxValueRef.current);
      } else {
        applyPair(minValueRef.current, age);
      }
    },
    [sliderWidth, applyPair],
  );

  const webTouchEnd = useCallback(() => {
    activeThumbRef.current = null;
  }, []);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, {textAlign:'left'}]}>גיל מועדף</Text>
      <View style={styles.ageRangeRow}>
        <Text style={styles.ageRangeValue}>{minValue}</Text>
        <View style={styles.ageRangeSeparator} />
        <Text style={styles.ageRangeValue}>{maxValue}</Text>
      </View>
      <View
        ref={sliderContainerRef}
        style={[styles.sliderContainer, IS_WEB && styles.sliderContainerWeb]}
        onLayout={e => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setSliderWidth(w);
        }}
        {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
        onStartShouldSetResponder={() => true}
        onMouseDown={IS_WEB ? webMouseDown : undefined}
        onTouchStart={IS_WEB ? webTouchStart : undefined}
        onTouchMove={IS_WEB ? webTouchMove : undefined}
        onTouchEnd={IS_WEB ? webTouchEnd : undefined}>
        <View style={styles.sliderTrack}>
          <LinearGradient
            colors={TRACK_GRADIENT}
            locations={TRACK_GRADIENT_LOCATIONS}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={[
              styles.sliderTrackFill,
              {
                left: `${minPct}%`,
                width: `${Math.max(0, maxPct - minPct)}%`,
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
            {left: `${minPct}%`, pointerEvents: 'none'},
          ]}
        />
        <LinearGradient
          colors={GOLD_GRADIENT}
          locations={GOLD_GRADIENT_LOCATIONS}
          start={{x: 0.5, y: 0}}
          end={{x: 0.5, y: 1}}
          style={[
            styles.sliderThumb,
            {left: `${maxPct}%`, pointerEvents: 'none'},
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    width: '100%',
    alignSelf: 'stretch',
  },
  /** PreferencesFilterScreen `sectionLabel` */
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    marginBottom: 10,
  },
  ageRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    /** Taller hit area than the 22px visual so drag works on web / fat fingers */
    height: 44,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderContainerWeb: {
    cursor: 'pointer',
    userSelect: 'none',
  },
  sliderTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    /** Vertically centered in 44px hit box (same 9px inset as 22px-tall drawer) */
    top: '50%',
    marginTop: -2,
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
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    marginLeft: THUMB_R,
    top: '50%',
    marginTop: -THUMB / 2,
    zIndex: 2,
  },
});
