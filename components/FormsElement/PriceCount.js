import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {Colors} from '../../constants/styles';
import {
  PRICE_COUNTER_STEP_DEFAULT,
  formatPriceInputDisplay,
  formatPriceInputDraft,
  parsePriceInputNumber,
} from '../../utils/priceInput';
import {flexStart, hebrewTextAlign} from '../../utils/rtlLayout';
import {FigmaCheckbox} from '../FigmaCheckbox';
import {Title} from './Title';
import {FormContainer} from './FormContainer';
import {Divider} from './Divider';
import {CounterStepper} from './CounterStepper';

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
      setPrice(nextPrice);
      return formatPriceInputDisplay(nextPrice);
    });
  };

  const stepPriceBy = delta => {
    // Step from the visible draft so +/- works while typing / keyboard open.
    setDraftPrice(prev => {
      const base = parsePriceInputNumber(prev);
      const nextPrice = Math.max(0, Number(base || 0) + delta);
      setPrice(nextPrice);
      return formatPriceInputDisplay(nextPrice);
    });
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
        suffixStyle={styles.currencySuffix}
        inputWidth={inputWidth}
        style={styles.priceInput}
      />
      {isPricePerNight && (
        <View style={styles.hotDealSection}>
          <Divider style={styles.hotDealDivider} />
          <View style={styles.hotDealHeaderRow}>
            <TouchableOpacity
              style={styles.hotDealToggleRow}
              onPress={() => setHotDeal?.(v => !v)}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityState={{checked: !!hotDeal}}
              accessibilityLabel="הוסף מחיר במבצע">
              <FigmaCheckbox checked={!!hotDeal} size={24} />
              <Text style={styles.hotDealToggleLabel}>הוסף</Text>
            </TouchableOpacity>
            <View style={styles.hotDealBadge}>
              <Text style={styles.hotDealBadgeText}>Hot deal</Text>
            </View>
          </View>
          <Text style={styles.hotDealDescription}>
            אם ברצונכם לקבוע עסקה אטרקטיבית, בחירה באופציה זו תדגיש שהמחיר
            המפורסם הינו מחיר במבצע.
          </Text>
        </View>
      )}
    </FormContainer>
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
  hotDealSection: {
    width: '100%',
  },
  hotDealDivider: {
    marginVertical: 20,
  },
  hotDealHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 10,
    width: '100%',
  },
  hotDealToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 24,
  },
  hotDealToggleLabel: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
  },
  hotDealBadge: {
    backgroundColor: Colors.yellowIcons,
    height: 22,
    paddingHorizontal: 10,
    borderRadius: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotDealBadgeText: {
    color: '#1E1D27',
    fontSize: 14,
    lineHeight: 16,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.55,
  },
  hotDealDescription: {
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    color: '#9E9DA4',
    marginTop: 10,
    fontSize: 15,
    fontFamily: 'Rubik-Regular',
    lineHeight: 22,
    paddingRight: 32,
    width: '100%',
  },
});
