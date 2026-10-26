import {useEffect, useRef, useState} from 'react';
import {Colors} from '../lib/styles';
import {
  PRICE_COUNTER_STEP_DEFAULT,
  formatPriceInputDisplay,
  formatPriceInputDraft,
  parsePriceInputNumber,
} from '../lib/priceInput';
import {FigmaCheckbox} from '../components/FigmaCheckbox';
import {Title} from './Title';
import {FormContainer} from './FormContainer';
import {Divider} from './Divider';
import {CounterStepper} from './CounterStepper';
import styles from './fields.module.css';

const currencySuffix = {color: Colors.yellowIcons, fontFamily: 'Rubik-Medium'};

export const PriceCount = ({
  price,
  setPrice,
  title,
  isPricePerNight = false,
  hotDeal = false,
  setHotDeal,
  /** ₪ increment/decrement for − / + buttons */
  counterStep = PRICE_COUNTER_STEP_DEFAULT,
}) => {
  const inputRef = useRef(null);
  const isFocusedRef = useRef(false);
  const [draftPrice, setDraftPrice] = useState(() => formatPriceInputDisplay(price));
  const inputWidth = Math.max(36, String(draftPrice || '').length * 14 + 10);

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
    setPrice(nextPrice);
    setDraftPrice(formatPriceInputDisplay(nextPrice));
  };

  const stepPriceBy = delta => {
    // Step from the visible draft so +/- works while typing.
    const base = parsePriceInputNumber(draftPrice);
    const nextPrice = Math.max(0, Number(base || 0) + delta);
    setPrice(nextPrice);
    setDraftPrice(formatPriceInputDisplay(nextPrice));
  };

  return (
    <FormContainer>
      <Title text={title} required />
      <CounterStepper
        inputRef={inputRef}
        value={draftPrice}
        onChangeText={handleDraftChange}
        onBlur={commitDraftPrice}
        onSubmitEditing={commitDraftPrice}
        onIncrement={() => stepPriceBy(counterStep)}
        onDecrement={() => stepPriceBy(-counterStep)}
        suffix="₪"
        suffixAfter
        suffixStyle={currencySuffix}
        inputWidth={inputWidth}
        style={{marginBottom: 0}}
      />
      {isPricePerNight && (
        <div className={styles.hotDealSection}>
          <Divider style={{marginVertical: 20}} />
          <div className={styles.hotDealHeaderRow}>
            <button
              type="button"
              className={styles.hotDealToggleRow}
              onClick={() => setHotDeal?.(v => !v)}
              role="checkbox"
              aria-checked={!!hotDeal}
              aria-label="הוסף מחיר במבצע">
              <FigmaCheckbox checked={!!hotDeal} size={24} />
              <span className={styles.hotDealToggleLabel}>הוסף</span>
            </button>
            <div className={styles.hotDealBadge}>
              <span className={styles.hotDealBadgeText}>Hot deal</span>
            </div>
          </div>
          <p className={styles.hotDealDescription}>
            אם ברצונכם לקבוע עסקה אטרקטיבית, בחירה באופציה זו תדגיש שהמחיר המפורסם הינו מחיר במבצע.
          </p>
        </div>
      )}
    </FormContainer>
  );
};
