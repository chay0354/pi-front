import React from 'react';
import {View, TouchableOpacity, Image, StyleSheet} from 'react-native';
import POPULAR from './POPULAR';
import {Dimensions, Padding, BorderRadius} from '../constants/styles';

/**
 * Default Component
 * Popular badge wrapper with decorative icon
 */
const Default = ({style}) => {
  return (
    <View style={[styles.labeldefault, style]}>
      <TouchableOpacity style={styles.popularWrapper} activeOpacity={0.8}>
        <POPULAR />
      </TouchableOpacity>
      <Image
        source={require('../assets/Vector-212.svg')}
        style={styles.labeldefaultChild}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  labeldefault: {
    position: 'absolute',
    top: 42,
    left: 310,
    height: Dimensions.height48,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  popularWrapper: {
    padding: Padding.padding12,
    backgroundColor: 'transparent',
    height: 34,
    borderTopLeftRadius: BorderRadius.br10,
    borderTopRightRadius: BorderRadius.br10,
    borderBottomLeftRadius: BorderRadius.br0,
    borderBottomRightRadius: BorderRadius.br10,
    // Gradient background would need LinearGradient library
    backgroundColor: '#fee787',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  labeldefaultChild: {
    width: Dimensions.width16,
    height: Dimensions.height14,
    position: 'relative',
  },
});

export default Default;
