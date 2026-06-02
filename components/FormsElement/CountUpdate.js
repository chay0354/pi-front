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
  const [draft, setDraft] = useState(
    String(Math.max(minVal, Number(count ?? 0))),
  );
  const inputWidth = Math.max(20, String(draft || '').length * 11);

  useEffect(() => {
    setDraft(String(Math.max(minVal, Number(count ?? 0))));
  }, [count, minVal]);

  const commitDraft = () => {
    const digitsOnly = String(draft || '').replace(/[^\d]/g, '');
    const nextVal = Number.parseInt(digitsOnly || String(minVal), 10);
    if (Number.isNaN(nextVal)) {
      setDraft(String(Math.max(minVal, Number(count ?? 0))));
      return;
    }
    const clamped = Math.max(minVal, nextVal);
    safeSetCount(clamped);
    setDraft(String(clamped));
  };

  const counterPill = (
    <CounterStepper
      inputRef={inputRef}
      value={draft}
      onChangeText={setDraft}
      onBlur={commitDraft}
      onSubmitEditing={commitDraft}
      onIncrement={() => safeSetCount((count ?? 0) + 1)}
      onDecrement={() => safeSetCount(Math.max(minVal, (count ?? 0) - 1))}
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
