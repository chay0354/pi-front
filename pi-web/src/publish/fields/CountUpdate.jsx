import {useEffect, useRef, useState} from 'react';
import {Title} from './Title';
import {Divider} from './Divider';
import {CounterStepper} from './CounterStepper';
import {toWebStyle} from '../lib/rnStyle';
import styles from './fields.module.css';

export const CountUpdate = ({
  title,
  count,
  setCount,
  isArea = false,
  isLast = false,
  isDivider = true,
  min = 0,
  required = true,
  variant = 'default',
  counterInputStyle,
  containerStyle,
  deviderStyle,
}) => {
  const safeSetCount = typeof setCount === 'function' ? setCount : () => {};
  const minVal = typeof min === 'number' ? min : 0;
  const inputRef = useRef(null);
  const isFocusedRef = useRef(false);
  const [draft, setDraft] = useState(String(Math.max(minVal, Number(count ?? 0))));
  const inputWidth = Math.max(20, String(draft || '').length * 11);

  useEffect(() => {
    // Don't overwrite what the user is typing / mid-step while focused.
    if (isFocusedRef.current) return;
    const fromProp = Math.max(minVal, Number(count ?? 0) || 0);
    setDraft(prev => {
      const digitsOnly = String(prev || '').replace(/[^\d]/g, '');
      const prevNum = Number.parseInt(digitsOnly || String(minVal), 10);
      if (!Number.isNaN(prevNum) && prevNum === fromProp) return prev;
      return String(fromProp);
    });
  }, [count, minVal]);

  const parseDraftNumber = text => {
    const digitsOnly = String(text || '').replace(/[^\d]/g, '');
    const nextVal = Number.parseInt(digitsOnly || String(minVal), 10);
    if (Number.isNaN(nextVal)) {
      return Math.max(minVal, Number(count ?? 0) || 0);
    }
    return Math.max(minVal, nextVal);
  };

  const commitDraft = () => {
    isFocusedRef.current = false;
    const clamped = parseDraftNumber(draft);
    safeSetCount(clamped);
    setDraft(String(clamped));
  };

  const stepBy = delta => {
    // Step from the visible draft (not a stale committed prop) so +/- works mid-typing.
    const next = Math.max(minVal, parseDraftNumber(draft) + delta);
    safeSetCount(next);
    setDraft(String(next));
  };

  const counterPill = (
    <CounterStepper
      inputRef={inputRef}
      value={draft}
      onChangeText={text => {
        isFocusedRef.current = true;
        setDraft(text);
      }}
      onBlur={commitDraft}
      onSubmitEditing={commitDraft}
      onIncrement={() => stepBy(1)}
      onDecrement={() => stepBy(-1)}
      suffix={isArea ? 'מ"ר' : undefined}
      suffixAfter
      inputWidth={inputWidth}
      style={[{marginBottom: 0}, counterInputStyle]}
    />
  );

  if (variant === 'figmaOffice') {
    return (
      <div style={toWebStyle(containerStyle)}>
        {title ? (
          <div className={styles.figmaLabelRow}>
            <span className={styles.figmaLabelText}>{title}</span>
            {required ? <span className={styles.figmaLabelStar}>*</span> : null}
          </div>
        ) : null}
        {counterPill}
        {isDivider ? <Divider style={deviderStyle} /> : null}
      </div>
    );
  }

  return (
    <div style={{marginBottom: isLast ? 0 : 26, ...toWebStyle(containerStyle)}}>
      {title ? <Title text={title} required={required} textStyle={{marginBottom: 0}} /> : null}
      {counterPill}
      {isDivider ? <Divider style={deviderStyle} /> : null}
    </div>
  );
};
