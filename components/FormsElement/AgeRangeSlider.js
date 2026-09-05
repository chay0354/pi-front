import React, {useRef, useState, useMemo, useCallback, useEffect} from 'react';
import {View, Text, StyleSheet, PanResponder, Platform} from 'react-native';
import {getRangeSliderPercentFromEvent, rangeSliderFillRtlVisualStyle, rangeSliderThumbRtlVisualStyle, touchPercentToRangeValuePercent} from '../../utils/rtlLayout';

import {LinearGradient} from 'expo-linear-gradient';
/** Match PreferencesFilterScreen (Figma drawer — גיל מועדף). */
const GOLD_GRADIENT = ['#FFE56A', '#F7C63A', '#E5A80F'];
const GOLD_GRADIENT_LOCATIONS = [0.0456, 0.5076, 0.8831];
const TRACK_GRADIENT = ['#FFE073', '#FFBA30'];
const TRACK_GRADIENT_LOCATIONS = [0.1113, 0.8662];

const AGE_MIN = 18;
const AGE_MAX = 100;
const THUMB = 22;

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
  const [sliderWidth, setSliderWidth] = useState(1);
  const sliderWidthRef = useRef(1);
  const sliderWindowXRef = useRef(0);
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

  const syncSliderMeasure = useCallback(() => {
    const node = sliderContainerRef.current;
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((x, _y, width) => {
      if (width > 0) {
        sliderWidthRef.current = width;
        sliderWindowXRef.current = x;
        setSliderWidth(width);
      }
    });
  }, []);

  const handlePressAtPercent = useCallback(
    percent => {
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
    [applyPair],
  );

  const percentFromNativeEvent = useCallback(
    nativeEvent => {
      const raw = getRangeSliderPercentFromEvent(
        nativeEvent,
        sliderWidthRef.current,
        sliderWindowXRef.current,
        sliderContainerRef,
      );
      return touchPercentToRangeValuePercent(raw);
    },
    [],
  );

  const applyDragPercent = useCallback(
    percent => {
      const thumb = activeThumbRef.current;
      if (!thumb) return;
      const age = percentToAge(percent);
      if (thumb === 'min') {
        applyPair(age, maxValueRef.current);
      } else {
        applyPair(minValueRef.current, age);
      }
    },
    [applyPair],
  );

  const refreshMeasureThen = useCallback(
    (nativeEvent, onReady) => {
      const node = sliderContainerRef.current;
      if (!node || typeof node.measureInWindow !== 'function') {
        onReady(percentFromNativeEvent(nativeEvent));
        return;
      }
      node.measureInWindow((x, _y, width) => {
        if (width > 0) {
          sliderWidthRef.current = width;
          sliderWindowXRef.current = x;
        }
        onReady(percentFromNativeEvent(nativeEvent));
      });
    },
    [percentFromNativeEvent],
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
          refreshMeasureThen(evt.nativeEvent, percent => {
            handlePressAtPercent(percent);
          });
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

  const touchPercentFromClientX = useCallback(
    (clientX, rect) =>
      touchPercentToRangeValuePercent(
        getRangeSliderPercentFromEvent(
          {pageX: clientX},
          rect.width || sliderWidthRef.current,
          rect.left,
          sliderContainerRef,
        ),
      ),
    [],
  );

  const applyDragAtClientX = useCallback(
    clientX => {
      const el = sliderContainerRef.current;
      if (!el || typeof el.getBoundingClientRect !== 'function') return;
      const rect = el.getBoundingClientRect();
      const percent = touchPercentFromClientX(clientX, rect);
      const age = percentToAge(percent);
      const thumb = activeThumbRef.current;
      if (!thumb) return;
      if (thumb === 'min') {
        applyPair(age, maxValueRef.current);
      } else {
        applyPair(minValueRef.current, age);
      }
    },
    [applyPair, touchPercentFromClientX],
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
      webDraggingRef.current = true;
      handlePressAtPercent(
        touchPercentFromClientX(e.clientX, rect),
      );
    },
    [handlePressAtPercent, touchPercentFromClientX],
  );

  const webTouchStart = useCallback(
    e => {
      const touch = e.touches?.[0] || e.nativeEvent?.touches?.[0];
      if (!touch || !sliderContainerRef.current) return;
      const rect = sliderContainerRef.current.getBoundingClientRect?.();
      if (!rect) return;
      handlePressAtPercent(
        touchPercentFromClientX(
          touch.clientX ?? touch.pageX,
          rect,
        ),
      );
    },
    [handlePressAtPercent, touchPercentFromClientX],
  );

  const webTouchMove = useCallback(
    e => {
      const thumb = activeThumbRef.current;
      if (!thumb || !sliderContainerRef.current) return;
      const touch = e.touches?.[0] || e.nativeEvent?.touches?.[0];
      if (!touch) return;
      const rect = sliderContainerRef.current.getBoundingClientRect?.();
      if (!rect) return;
      const age = percentToAge(
        touchPercentFromClientX(
          touch.clientX ?? touch.pageX,
          rect,
        ),
      );
      if (thumb === 'min') {
        applyPair(age, maxValueRef.current);
      } else {
        applyPair(minValueRef.current, age);
      }
    },
    [applyPair],
  );

  const webTouchEnd = useCallback(() => {
    activeThumbRef.current = null;
  }, []);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, {textAlign: 'left'}]}>גיל מועדף</Text>
      <View style={styles.ageRangeRow}>
        <Text style={styles.ageRangeValue}>{minValue}</Text>
        <View style={styles.ageRangeSeparator} />
        <Text style={styles.ageRangeValue}>{maxValue}</Text>
      </View>
      <View
        ref={sliderContainerRef}
        style={[styles.sliderContainer, IS_WEB && styles.sliderContainerWeb]}
        onLayout={() => {
          syncSliderMeasure();
        }}
        {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
        onMouseDown={IS_WEB ? webMouseDown : undefined}
        onTouchStart={IS_WEB ? webTouchStart : undefined}
        onTouchMove={IS_WEB ? webTouchMove : undefined}
        onTouchEnd={IS_WEB ? webTouchEnd : undefined}
        collapsable={false}>
        <View style={styles.sliderTrack}>
          <LinearGradient
            colors={TRACK_GRADIENT}
            locations={TRACK_GRADIENT_LOCATIONS}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={[
              styles.sliderTrackFill,
              rangeSliderFillRtlVisualStyle(minPct, maxPct),
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
            rangeSliderThumbRtlVisualStyle(minPct),
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
            rangeSliderThumbRtlVisualStyle(maxPct),
            {pointerEvents: 'none'},
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
    height: 42,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderContainerWeb: {
    cursor: 'pointer',
    userSelect: 'none',
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
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    top: 10,
    zIndex: 2,
  },
});
