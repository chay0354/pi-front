import {
  StyleSheet,
  Text,
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
import {Title} from './Title';
import {FormContainer} from './FormContainer';
import {Divider} from './Divider';
import {RadioWithText} from './RadioWithText';
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
  const rowEndAlign = 'flex-start';
  const inputRef = useRef(null);
  const [draftPrice, setDraftPrice] = useState(() =>
    formatPriceInputDisplay(price),
  );
  const inputWidth = Math.max(20, String(draftPrice || '').length * 11);

  useEffect(() => {
    setDraftPrice(formatPriceInputDisplay(price));
  }, [price]);

  const handleDraftChange = text => {
    setDraftPrice(formatPriceInputDraft(text));
  };

  const commitDraftPrice = () => {
    const nextPrice = parsePriceInputNumber(draftPrice);
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
        onIncrement={() => setPrice(Number(price || 0) + counterStep)}
        onDecrement={() =>
          setPrice(Math.max(0, Number(price || 0) - counterStep))
        }
        suffix="₪"
        suffixAfter
        suffixStyle={styles.currencySuffix}
        inputWidth={inputWidth}
        style={styles.priceInput}
      />
      {isPricePerNight && (
        <View>
          <Divider style={{marginVertical: 20}} />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: rowEndAlign,
            }}>
            <RadioWithText
              title={'הוסף ״מחיר במבצע״'}
              name={'sale_price'}
              setName={() => setHotDeal?.(v => !v)}
              index={0}
              isSelected={!!hotDeal}
              radioOptionStyle={{
                paddingTop: 0,
                paddingLeft: 10,
              }}
            />
            {hotDeal ? (
              <View style={styles.hotDealContainer}>
                <Text style={styles.hotDealText}>Hot deal</Text>
              </View>
            ) : null}
          </View>
          <Text
            style={{
              textAlign: 'left',
              color: '#9E9DA4',
              marginTop: 10,
              fontSize: 15,
              fontFamily: 'Rubik-Regular',
            }}>
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
  hotDealContainer: {
    backgroundColor: Colors.yellowIcons,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  hotDealText: {
    color: '#1E1D27',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
});
