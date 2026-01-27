import React from 'react';
import { Image, StyleSheet } from 'react-native';

/**
 * StatusBarIcon Component
 * Displays the status bar image at the top of the screen
 */
const StatusBarIcon = ({ style }) => {
  return (
    <Image
      source={require('../assets/Status-bar@2x.png')}
      style={[styles.statusBarIcon, style]}
      resizeMode="cover"
    />
  );
};

const styles = StyleSheet.create({
  statusBarIcon: {
    alignSelf: 'stretch',
    height: 43,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxWidth: '100%',
  },
});

export default StatusBarIcon;
