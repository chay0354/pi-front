import React from 'react';
import {StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import {Title} from './Title';
import {Divider} from './Divider';

export const CountUpdate = ({
  title,
  count,
  setCount,
  isArea = false,
  isLast = false,
  isDivider = true,
  counterInputStyle,
  containerStyle,
  deviderStyle,
}) => {
  return (
    <View style={[{marginBottom: isLast ? 0 : 20}, containerStyle]}>
      {title && <Title text={title} required textStyle={{marginBottom: 15}} />}
      <View style={[styles.counterInput, counterInputStyle]}>
        <TouchableOpacity
          style={styles.counterButtonLeft}
          onPress={() => setCount(Math.max(1, count - 1))}>
          <Text style={styles.counterButton}>+</Text>
        </TouchableOpacity>
        <View style={styles.counterDivider} />
        <View style={styles.counterValueContainer}>
          <Text style={styles.counterValue}>
            {count} {isArea ? 'מ"ר' : ''}
          </Text>
        </View>
        <View style={styles.counterDivider} />
        <TouchableOpacity
          style={styles.counterButtonRight}
          onPress={() => setCount(count + 1)}>
          <Text style={styles.counterButton}>-</Text>
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
