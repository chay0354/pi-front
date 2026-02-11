import {StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import {Colors} from '../../constants/styles';

export const CardPriceField = ({price, setPrice}) => {
  return (
    <View style={styles.priceInput}>
      <TouchableOpacity style={styles.counterButtonLeft}>
        <Text style={styles.counterButton}>+</Text>
      </TouchableOpacity>
      <View style={styles.counterDivider} />
      <View style={styles.counterValueContainer}>
        <Text style={styles.priceValue}>
          ₪ <Text style={styles.price}>0</Text>
        </Text>
      </View>
      <View style={styles.counterDivider} />
      <TouchableOpacity
        style={styles.counterButtonRight}
        onPress={() => setPrice(price + 10000)}>
        <Text style={styles.counterButton}>-</Text>
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
