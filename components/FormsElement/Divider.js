import {StyleSheet, Text, View} from 'react-native';
import React from 'react';

export const Divider = ({style}) => {
  return <View style={[styles.divider, style]} />;
};

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: '#1E1D27',
  },
});
