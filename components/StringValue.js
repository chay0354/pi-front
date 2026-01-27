import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes, Dimensions } from '../constants/styles';

/**
 * StringValue Component
 * Category name text component
 * @param {string} text - Category name (default: "Apartments")
 * @param {string} type - Type variant (not used, kept for compatibility)
 */
const StringValue = ({ style, type = 'defult', text = 'Apartments' }) => {
  return (
    <View style={[styles.stringValue, style]}>
      <Text style={styles.name}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  stringValue: {
    height: Dimensions.height8,
    width: Dimensions.width66,
    position: 'relative',
  },
  name: {
    position: 'absolute',
    top: 0,
    left: 0,
    textTransform: 'capitalize',
    fontWeight: '600',
    fontSize: FontSizes.fs11_9,
    color: Colors.white100,
    fontFamily: 'Mirza',
  },
});

export default StringValue;
