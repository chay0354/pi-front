import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import StringValue from './StringValue';
import { Colors, FontSizes, Gaps, Dimensions } from '../constants/styles';

/**
 * Layer1 Component
 * Pi category icon with text
 * @param {string} text - Category text
 * @param {string} type - Type variant
 */
const Layer1 = ({ style, type = 'defult', text }) => {
  return (
    <View style={[styles.piCategory, style]}>
      <Image
        source={require('../assets/Layer-1.svg')}
        style={styles.layer1Icon}
        resizeMode="contain"
      />
      <StringValue type={type} text={text} />
    </View>
  );
};

const styles = StyleSheet.create({
  piCategory: {
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Gaps.gap2,
  },
  layer1Icon: {
    height: Dimensions.height16,
    width: Dimensions.width22,
    position: 'relative',
  },
});

export default Layer1;
