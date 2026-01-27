import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

/**
 * Menu1 Component
 * Hamburger menu icon component
 */
const Menu1 = ({ style }) => {
  return (
    <View style={[styles.menu, style]}>
      <Image
        source={require('../assets/material-symbols-menu.svg')}
        style={styles.materialSymbolsmenuIcon}
        resizeMode="contain"
      />
      <Image
        source={require('../assets/image-7@2x.png')}
        style={styles.image7Icon}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  menu: {
    height: 24,
    width: 24,
    position: 'relative',
  },
  materialSymbolsmenuIcon: {
    position: 'absolute',
    height: '100%',
    width: '100%',
    top: '12.92%',
    right: '0.42%',
    bottom: '-12.92%',
    left: '-0.42%',
    display: 'none',
  },
  image7Icon: {
    position: 'absolute',
    height: '179.17%',
    width: '179.17%',
    top: '-28.75%',
    right: '1183.75%',
    bottom: '-50.42%',
    left: '-1262.92%',
    borderRadius: 200,
    display: 'none',
  },
});

export default Menu1;
