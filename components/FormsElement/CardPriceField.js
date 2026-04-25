import {StyleSheet, Text, View, TouchableOpacity, TextInput} from 'react-native';
import {Colors} from '../../constants/styles';
import React, {useEffect, useState} from 'react';

export const CardPriceField = ({price = 0, setPrice}) => {
  const safeSetPrice = typeof setPrice === 'function' ? setPrice : () => {};
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
    <View style={styles.priceInput}>
      <TouchableOpacity
        style={styles.counterButtonLeft}
        onPress={() => safeSetPrice(Math.max(0, (price || 0) - 10000))}>
        <Text style={styles.counterButtonMinus}>−</Text>
      </TouchableOpacity>
      <View style={styles.counterDivider} />
      <View style={styles.counterValueContainer}>
        <View style={styles.priceValueRow}>
          <Text style={styles.priceValue}>₪</Text>
          <TextInput
            style={[styles.priceValueInput, {width: inputWidth}]}
            value={draftPrice}
            onChangeText={setDraftPrice}
            onBlur={commitDraftPrice}
            onSubmitEditing={commitDraftPrice}
            keyboardType="numeric"
            returnKeyType="done"
            textAlign="center"
          />
        </View>
      </View>
      <View style={styles.counterDivider} />
      <TouchableOpacity
        style={styles.counterButtonRight}
        onPress={() => safeSetPrice((price || 0) + 10000)}>
        <Text style={styles.counterButtonPlus}>+</Text>
      </TouchableOpacity>
    </View>
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
    marginBottom: 22,
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
    marginLeft: 6,
  },
  counterButtonLeft: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 32,
    borderBottomLeftRadius: 32,
  },
  counterButtonRight: {
    flex: 1,
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
    backgroundColor: '#343243',
  },
  counterValueContainer: {
    flex: 2,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
