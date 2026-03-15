import {StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import {Colors} from '../../constants/styles';

export const CardPriceField = ({price = 0, setPrice}) => {
  const safeSetPrice = typeof setPrice === 'function' ? setPrice : () => {};
  return (
    <View style={styles.priceInput}>
      <TouchableOpacity
        style={styles.counterButtonLeft}
        onPress={() => safeSetPrice(Math.max(0, (price || 0) - 10000))}>
        <Text style={styles.counterButtonMinus}>−</Text>
      </TouchableOpacity>
      <View style={styles.counterDivider} />
      <View style={styles.counterValueContainer}>
        <Text style={styles.priceValue}>
          ₪ <Text style={styles.price}>{(price || 0).toLocaleString()}</Text>
        </Text>
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
