import {useRef} from 'react';
import {assignRef, dp, toWebStyle} from '../lib/rnStyle';
import styles from './CounterStepper.module.css';

/**
 * Figma "כמות" stepper — pill border #8C85B3, + | value | − in LTR geometry.
 * `inputWidth` is mobile dp (same contract as mobile); `style` / `suffixStyle` are RN-style objects.
 */
export const CounterStepper = ({
  value,
  onChangeText,
  onBlur,
  onSubmitEditing,
  onIncrement,
  onDecrement,
  suffix,
  suffixAfter = true,
  suffixStyle,
  inputRef,
  editable = true,
  style,
  inputWidth,
}) => {
  const resolvedWidth = inputWidth != null ? inputWidth : Math.max(36, String(value ?? '').length * 14 + 10);
  const lastPressAtRef = useRef(0);
  const localInputRef = useRef(null);

  const runStep = handler => {
    if (typeof handler !== 'function') return;
    const now = Date.now();
    // Ignore accidental double-fires from overlapping handlers.
    if (now - lastPressAtRef.current < 40) return;
    lastPressAtRef.current = now;
    handler();
  };

  const suffixNode = suffix ? (
    <span className={styles.suffix} style={toWebStyle(suffixStyle)}>
      {suffix}
    </span>
  ) : null;

  return (
    <div dir="ltr" className={styles.pill} style={toWebStyle(style)}>
      <button
        type="button"
        className={styles.sideButton}
        onClick={() => runStep(onIncrement)}
        aria-label="Increase">
        <span className={styles.plusIcon}>+</span>
      </button>

      <div className={styles.center} onClick={() => editable && localInputRef.current?.focus()}>
        <div className={styles.valueRow}>
          {!suffixAfter ? suffixNode : null}
          {editable ? (
            <input
              ref={node => {
                localInputRef.current = node;
                assignRef(inputRef, node);
              }}
              className={styles.valueInput}
              style={{width: dp(resolvedWidth)}}
              value={String(value ?? '')}
              onChange={e => onChangeText?.(e.target.value)}
              onBlur={onBlur}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onSubmitEditing?.();
                  e.currentTarget.blur();
                }
              }}
              inputMode="numeric"
              enterKeyHint="done"
            />
          ) : (
            <span className={styles.valueText}>{String(value ?? '')}</span>
          )}
          {suffixAfter ? suffixNode : null}
        </div>
      </div>

      <button
        type="button"
        className={styles.sideButton}
        onClick={() => runStep(onDecrement)}
        aria-label="Decrease">
        <span className={styles.minusIcon}>−</span>
      </button>
    </div>
  );
};
