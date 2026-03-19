import React from 'react';
import {StyleSheet, Text, View, TouchableOpacity, Platform} from 'react-native';
import {Title} from './Title';
import {Divider} from './Divider';

const handleMinus = (safeSetCount, count, minVal) => {
  safeSetCount(Math.max(minVal, (count ?? 0) - 1));
};
const handlePlus = (safeSetCount, count) => {
  safeSetCount((count ?? 0) + 1);
};

const isWeb = Platform.OS === 'web';

export const CountUpdate = ({
  title,
  count,
  setCount,
  isArea = false,
  isLast = false,
  isDivider = true,
  min = 0,
  counterInputStyle,
  containerStyle,
  deviderStyle,
}) => {
  const safeSetCount = typeof setCount === 'function' ? setCount : () => {};
  const minVal = typeof min === 'number' ? min : 0;
  const minusHandler = () => handleMinus(safeSetCount, count, minVal);
  const plusHandler = () => handlePlus(safeSetCount, count);
  const buttonStyleWeb = isWeb ? { cursor: 'pointer', minWidth: 44, minHeight: 44 } : {};

  if (isWeb) {
    return (
      <View style={[{marginBottom: isLast ? 0 : 20}, containerStyle]}>
        {title && <Title text={title} required textStyle={{marginBottom: 15}} />}
        <View style={[styles.counterInput, counterInputStyle]}>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); minusHandler(); }}
            style={{
              flex: 1,
              height: '100%',
              minHeight: 52,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#fff',
              fontSize: 22,
              fontFamily: 'Rubik-Medium',
              borderTopLeftRadius: 32,
              borderBottomLeftRadius: 32,
            }}
            aria-label="Decrease"
          >
            −
          </button>
          <View style={styles.counterDivider} />
          <View style={styles.counterValueContainer}>
            <Text style={styles.counterValue}>
              {count ?? 0} {isArea ? 'מ"ר' : ''}
            </Text>
          </View>
          <View style={styles.counterDivider} />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); plusHandler(); }}
            style={{
              flex: 1,
              height: '100%',
              minHeight: 52,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#fff',
              fontSize: 16,
              fontFamily: 'Rubik-Medium',
              borderTopRightRadius: 32,
              borderBottomRightRadius: 32,
            }}
            aria-label="Increase"
          >
            +
          </button>
        </View>
        {isDivider && <Divider style={deviderStyle} />}
      </View>
    );
  }

  return (
    <View style={[{marginBottom: isLast ? 0 : 20}, containerStyle]}>
      {title && <Title text={title} required textStyle={{marginBottom: 15}} />}
      <View style={[styles.counterInput, counterInputStyle]}>
        <TouchableOpacity
          style={[styles.counterButtonLeft, buttonStyleWeb]}
          onPress={minusHandler}
          activeOpacity={0.7}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Decrease"
        >
          <Text style={styles.counterButtonMinus}>−</Text>
        </TouchableOpacity>
        <View style={styles.counterDivider} />
        <View style={styles.counterValueContainer}>
          <Text style={styles.counterValue}>
            {count ?? 0} {isArea ? 'מ"ר' : ''}
          </Text>
        </View>
        <View style={styles.counterDivider} />
        <TouchableOpacity
          style={[styles.counterButtonRight, buttonStyleWeb]}
          onPress={plusHandler}
          activeOpacity={0.7}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Increase"
        >
          <Text style={styles.counterButtonPlus}>+</Text>
        </TouchableOpacity>
      </View>
      {isDivider && <Divider style={deviderStyle} />}
    </View>
  );
};

const styles = StyleSheet.create({
  counterInput: {
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
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  counterButtonMinus: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Rubik-Medium',
  },
  counterButtonPlus: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
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
  counterValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
