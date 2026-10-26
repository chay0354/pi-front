import {useEffect, useRef, useState} from 'react';
import {
  PRICE_COUNTER_STEP_DEFAULT,
  formatPriceInputDisplay,
  formatPriceInputDraft,
  parsePriceInputNumber,
} from '../lib/priceInput';
import {Colors} from '../lib/styles';
import {CounterStepper} from './CounterStepper';

const currencySuffix = {color: Colors.yellowIcons, fontFamily: 'Rubik-Medium'};

export const CardPriceField = ({price = 0, setPrice, counterStep = PRICE_COUNTER_STEP_DEFAULT, style}) => {
  const safeSetPrice = typeof setPrice === 'function' ? setPrice : () => {};
  const step = counterStep;
  const inputRef = useRef(null);
  const isFocusedRef = useRef(false);
  const [draftPrice, setDraftPrice] = useState(() => formatPriceInputDisplay(price));
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
    const nextPrice = parsePriceInputNumber(draftPrice);
    safeSetPrice(nextPrice);
    setDraftPrice(formatPriceInputDisplay(nextPrice));
  };

  const stepPriceBy = delta => {
    // Step from the visible draft so +/- works while typing.
    const base = parsePriceInputNumber(draftPrice);
    const nextPrice = Math.max(0, Number(base || 0) + delta);
    safeSetPrice(nextPrice);
    setDraftPrice(formatPriceInputDisplay(nextPrice));
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
      suffixStyle={currencySuffix}
      inputWidth={inputWidth}
      style={[{marginBottom: 0}, style]}
    />
  );
};
