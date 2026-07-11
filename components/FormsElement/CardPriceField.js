import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {
  PRICE_COUNTER_STEP_DEFAULT,
  formatPriceInputDisplay,
  formatPriceInputDraft,
  parsePriceInputNumber,
} from '../../utils/priceInput';
import {Colors} from '../../constants/styles';
import {CounterStepper} from './CounterStepper';

export const CardPriceField = ({
  price = 0,
  setPrice,
  counterStep = PRICE_COUNTER_STEP_DEFAULT,
  style,
}) => {
  const safeSetPrice = typeof setPrice === 'function' ? setPrice : () => {};
  const step = counterStep;
  const inputRef = useRef(null);
  const isFocusedRef = useRef(false);
  const [draftPrice, setDraftPrice] = useState(() =>
    formatPriceInputDisplay(price),
  );
  const inputWidth = Math.max(20, String(draftPrice || '').length * 11);

  useEffect(() => {
    if (isFocusedRef.current) return;
    const display = formatPriceInputDisplay(price);
    setDraftPrice(prev => (prev === display ? prev : display));
  }, [price]);

  const handleDraftChange = text => {
    isFocusedRef.current = true;
    setDraftPrice(formatPriceInputDraft(text));
  };

  const commitDraftPrice = () => {
    isFocusedRef.current = false;
    setDraftPrice(prev => {
      const nextPrice = parsePriceInputNumber(prev);
      safeSetPrice(nextPrice);
      return formatPriceInputDisplay(nextPrice);
    });
  };

  const stepPriceBy = delta => {
    // Step from the visible draft so +/- works while typing / keyboard open.
    setDraftPrice(prev => {
      const base = parsePriceInputNumber(prev);
      const nextPrice = Math.max(0, Number(base || 0) + delta);
      safeSetPrice(nextPrice);
      return formatPriceInputDisplay(nextPrice);
    });
  };

  return (
    <CounterStepper
      inputRef={inputRef}
      value={draftPrice}
      onChangeText={handleDraftChange}
      onBlur={commitDraftPrice}
      onSubmitEditing={commitDraftPrice}
      onIncrement={() => stepPriceBy(step)}
      onDecrement={() => stepPriceBy(-step)}
      suffix="₪"
      suffixAfter
      suffixStyle={styles.currencySuffix}
      inputWidth={inputWidth}
      style={[styles.priceInput, style]}
    />
  );
};

const styles = StyleSheet.create({
  priceInput: {
    marginBottom: 0,
  },
  currencySuffix: {
    color: Colors.yellowIcons,
    fontFamily: 'Rubik-Medium',
  },
});
