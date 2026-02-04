import {StyleSheet, Text, View} from 'react-native';
import React from 'react';

export const Divider = ({style}) => {
  return <View style={[styles.divider, style]} />;
};

const styles = StyleSheet.create({
  divider: {
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
