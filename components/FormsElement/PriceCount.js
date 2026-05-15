import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Pressable,
  I18nManager,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {Colors} from '../../constants/styles';
import {PRICE_COUNTER_STEP_DEFAULT} from '../../utils/priceInput';
import {Title} from './Title';
import {FormContainer} from './FormContainer';
import {Divider} from './Divider';
import {RadioWithText} from './RadioWithText';

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
  const sideSpacing = {marginLeft: 6};
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
    setPrice(nextPrice);
    setDraftPrice(String(nextPrice));
  };

  return (
    <FormContainer>
      <Title text={title} required />
      <View style={styles.priceInput}>
        <TouchableOpacity
          style={styles.counterButtonLeft}
          onPress={() =>
            setPrice(Math.max(0, Number(price || 0) - counterStep))
          }>
          <Text style={styles.counterButtonMinus}>−</Text>
        </TouchableOpacity>
        <View style={styles.counterDivider} />
        <Pressable
          style={styles.counterValueContainer}
          onPress={() => inputRef.current?.focus?.()}>
          <View style={styles.priceValueRow}>
            <Text style={styles.priceValue}>₪</Text>
            <TextInput
              ref={inputRef}
              style={[styles.priceValueInput, sideSpacing, {width: inputWidth}]}
              value={draftPrice}
              onChangeText={setDraftPrice}
              onBlur={commitDraftPrice}
              onSubmitEditing={commitDraftPrice}
              keyboardType="numeric"
              returnKeyType="done"
              textAlign="center"
              showSoftInputOnFocus
            />
          </View>
        </Pressable>
        <View style={styles.counterDivider} />
        <TouchableOpacity
          style={styles.counterButtonRight}
          onPress={() => setPrice(Number(price || 0) + counterStep)}>
          <Text style={styles.counterButtonPlus}>+</Text>
        </TouchableOpacity>
      </View>
      {isPricePerNight && (
        <View>
          <Divider style={{marginVertical: 20}} />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: rowEndAlign,
            }}>
            {hotDeal ? (
              <View style={styles.hotDealContainer}>
                <Text style={styles.hotDealText}>Hot deal</Text>
              </View>
            ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#2B2A39',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#8C85B3',
    overflow: 'hidden',
  },
  priceValue: {
    color: Colors.yellowIcons,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  price: {color: Colors.whiteGeneral},
  priceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceValueInput: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    minWidth: 0,
    textAlign: 'center',
    paddingVertical: 0,
  },
  counterButtonLeft: {
    width: 52,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 32,
    borderBottomLeftRadius: 32,
  },
  counterButtonRight: {
    width: 52,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
  },
  counterButton: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  counterButtonMinus: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '600',
  },
  counterButtonPlus: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  counterDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#8C85B3',
  },
  counterValueContainer: {
    flex: 1,
    minWidth: 158,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
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
