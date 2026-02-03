import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Colors, FontSizes, LineHeights, Dimensions} from '../constants/styles';

/**
 * POPULAR Component
 * Popular badge label
 */
const POPULAR = ({style}) => {
  return (
    <View style={[styles.popular, style]}>
      <Text style={styles.popularText}>POPULAR</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  popular: {
    height: Dimensions.height10,
    width: 71,
    position: 'relative',
  },
  popularText: {
    position: 'absolute',
    top: 0,
    left: 0,
    letterSpacing: 0.54,
    lineHeight: LineHeights.lh16,
    fontWeight: '500',
    fontSize: FontSizes.fs14,
    color: Colors.blue100,
    fontFamily: 'Rubik',
  },
});

export default POPULAR;
