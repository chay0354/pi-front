import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {PRICE_COUNTER_STEP_DEFAULT} from '../../utils/priceInput';
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
  const [draftPrice, setDraftPrice] = useState(String(Number(price || 0)));
  const inputWidth = Math.max(20, String(draftPrice || '').length * 11);

  useEffect(() => {
    setDraftPrice(String(Number(price || 0)));
  }, [price]);

  const commitDraftPrice = () => {
    const digitsOnly = String(draftPrice || '').replace(/[^\d]/g, '');
    const parsed = Number.parseInt(digitsOnly || '0', 10);
    const nextPrice = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    safeSetPrice(nextPrice);
    setDraftPrice(String(nextPrice));
  };

  return (
    <CounterStepper
      inputRef={inputRef}
      value={draftPrice}
      onChangeText={setDraftPrice}
      onBlur={commitDraftPrice}
      onSubmitEditing={commitDraftPrice}
      onIncrement={() => safeSetPrice((price || 0) + step)}
      onDecrement={() => safeSetPrice(Math.max(0, (price || 0) - step))}
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
