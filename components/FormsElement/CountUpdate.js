import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Title} from './Title';
import {Divider} from './Divider';
import {Colors} from '../../constants/styles';
import {formLabelRowStyle, textAlign} from '../../utils/rtlLayout';
import {CounterStepper} from './CounterStepper';

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
  const [draft, setDraft] = useState(
    String(Math.max(minVal, Number(count ?? 0))),
  );
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
    setDraft(prev => {
      const clamped = parseDraftNumber(prev);
      safeSetCount(clamped);
      return String(clamped);
    });
  };

  const stepBy = delta => {
    // Always step from the visible draft (not a stale committed prop),
    // so +/- still works while the keyboard is open / draft is uncommitted.
    setDraft(prev => {
      const next = Math.max(minVal, parseDraftNumber(prev) + delta);
      safeSetCount(next);
      return String(next);
    });
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
      style={[
        styles.counterInput,
        variant === 'figmaOffice' && styles.counterInputFigma,
        counterInputStyle,
      ]}
    />
  );

  const figmaLabel = title ? (
    <View style={styles.figmaOfficeLabelRow}>
      <Text style={styles.figmaOfficeLabelText} numberOfLines={1}>
        {title}
      </Text>
      {required ? <Text style={styles.figmaOfficeStar}>*</Text> : null}
    </View>
  ) : null;

  if (variant === 'figmaOffice') {
    return (
      <View style={[{marginBottom: isLast ? 0 : 0}, containerStyle]}>
        {figmaLabel}
        {counterPill}
        {isDivider ? <Divider style={deviderStyle} /> : null}
      </View>
    );
  }

  return (
    <View style={[{marginBottom: isLast ? 0 : 20}, containerStyle]}>
      {title ? (
        <Title
          text={title}
          required={required}
          textStyle={{marginBottom: 0}}
        />
      ) : null}
      {counterPill}
      {isDivider ? <Divider style={deviderStyle} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  counterInput: {
    marginBottom: 0,
  },
  counterInputFigma: {
    marginBottom: 0,
  },
  figmaOfficeLabelRow: {
    ...formLabelRowStyle,
    marginBottom: 20,
  },
  figmaOfficeLabelText: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    flexShrink: 1,
    textAlign,
  },
  figmaOfficeStar: {
    color: Colors.yellowIcons,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    flexShrink: 0,
  },
});
