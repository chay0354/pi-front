import {useCallback, useEffect, useRef} from 'react';
import {getRangeSliderPercentFromEvent, touchPercentToRangeValuePercent} from '../lib/rtlLayout';
import styles from './AgeRangeSlider.module.css';

const AGE_MIN = 18;
const AGE_MAX = 100;

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
 * Values run from the physical right (RTL track), like the mobile web branch.
 */
export const AgeRangeSlider = ({minValue, maxValue, onMinChange, onMaxChange}) => {
  const activeThumbRef = useRef(null);
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
      onMinChange?.(a);
      onMaxChange?.(b);
    },
    [onMinChange, onMaxChange],
  );

  const percentFromClientX = clientX =>
    touchPercentToRangeValuePercent(getRangeSliderPercentFromEvent({clientX}, 1, 0, sliderContainerRef));

  const handlePressAtPercent = percent => {
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
  };

  const onPointerDown = e => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    handlePressAtPercent(percentFromClientX(e.clientX));
  };

  const onPointerMove = e => {
    const thumb = activeThumbRef.current;
    if (!thumb) return;
    const age = percentToAge(percentFromClientX(e.clientX));
    if (thumb === 'min') applyPair(age, maxValueRef.current);
    else applyPair(minValueRef.current, age);
  };

  const onPointerEnd = () => {
    activeThumbRef.current = null;
  };

  return (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>גיל מועדף</span>
      <div className={styles.ageRangeRow}>
        <span className={styles.ageRangeValue}>{minValue}</span>
        <span className={styles.ageRangeSeparator} />
        <span className={styles.ageRangeValue}>{maxValue}</span>
      </div>
      <div
        ref={sliderContainerRef}
        className={styles.sliderContainer}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        role="group"
        aria-label={`גיל מועדף ${minValue}–${maxValue}`}>
        <div className={styles.sliderTrack}>
          <div className={styles.sliderTrackFill} style={{right: `${minPct}%`, width: `${Math.max(0, maxPct - minPct)}%`}} />
        </div>
        <div className={styles.sliderThumb} style={{right: `${minPct}%`}} />
        <div className={styles.sliderThumb} style={{right: `${maxPct}%`}} />
      </div>
    </div>
  );
};
