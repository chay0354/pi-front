import React from 'react';
import {Image, StyleSheet} from 'react-native';

/**
 * MenuIcon Component
 * Floating menu icon button
 * @param {string} variant - Variant type (default: "ללא נוטיפיקציה")
 */
const MenuIcon = ({style, variant = 'ללא נוטיפיקציה'}) => {
  return (
    <Image
      source={require('../assets/menu.svg')}
      style={[styles.menuIcon, style]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  menuIcon: {
    width: 40,
    height: 40,
    position: 'absolute',
    right: 24,
    bottom: 73,
    zIndex: 2,
  },
});

export default MenuIcon;
