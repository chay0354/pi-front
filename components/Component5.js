import React from 'react';
import {View, Image, StyleSheet} from 'react-native';
import {Dimensions} from '../constants/styles';

/**
 * Component5 Component
 * Pi character illustration for category
 * @param {string} category - Category type
 */
const Component5 = ({style, category = 'base'}) => {
  return (
    <View style={[styles.component5, style]}>
      <Image
        source={require('../assets/Group-1000003633@2x.png')}
        style={styles.component5Child}
        resizeMode="cover"
      />
      <Image
        source={require('../assets/Union.svg')}
        style={styles.unionIcon}
        resizeMode="contain"
      />
      <Image
        source={require('../assets/Group-1000003632@2x.png')}
        style={styles.component5Item}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  component5: {
    alignSelf: 'stretch',
    height: Dimensions.height64,
    position: 'relative',
  },
  component5Child: {
    position: 'absolute',
    height: '84.22%',
    width: '43.86%',
    top: '9.84%',
    right: '-0.11%',
    bottom: '5.94%',
    left: '56.25%',
  },
  unionIcon: {
    position: 'relative',
    width: Dimensions.width0,
    height: Dimensions.height0,
  },
  component5Item: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -42}, {translateY: -25.7}],
    width: Dimensions.width49,
    height: Dimensions.height55_5,
  },
});

export default Component5;
