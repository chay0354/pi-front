import React from 'react';
import {View, Image, StyleSheet} from 'react-native';
import CategoryFrame from './CategoryFrame';
import Frame1171276078 from './Frame1171276078';
import {Spacing, Dimensions, BorderRadius} from '../constants/styles';

/**
 * CategoryFrame1 Component
 * Complete category card with frame and title
 */
const CategoryFrame1 = ({
  style,
  homePage = 'pibnb',
  selected = 'Default',
  variant = 'Default',
}) => {
  return (
    <View style={[styles.categoryFrame, style]}>
      <CategoryFrame
        homePage="apartments"
        selected="Default"
        variant="Default"
        category="apartments"
      />
      <View style={styles.categorytitleChevrondefaulParent}>
        <Frame1171276078
          homePage="apartments"
          selected="Default"
          variant="Default"
        />
        <View style={styles.checkbox}>
          <Image
            source={require('../assets/Ellipse-650.svg')}
            style={styles.checkboxChild}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/Icon.svg')}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  categoryFrame: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing.m,
  },
  categorytitleChevrondefaulParent: {
    width: 98,
    height: Dimensions.height24,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  checkbox: {
    height: Dimensions.height24,
    width: Dimensions.width24,
    position: 'relative',
    display: 'none',
  },
  checkboxChild: {
    position: 'absolute',
    top: 1,
    left: 1,
    borderRadius: BorderRadius.br6,
    width: Dimensions.width22,
    height: Dimensions.height22,
  },
  icon: {
    position: 'absolute',
    height: '25.83%',
    width: '37.5%',
    top: '40%',
    right: '30.42%',
    bottom: '34.17%',
    left: '32.08%',
  },
});

export default CategoryFrame1;
