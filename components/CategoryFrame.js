import React from 'react';
import {View, Image, StyleSheet} from 'react-native';
import Layer1 from './Layer1';
import Component5 from './Component5';
import {
  Colors,
  BorderRadius,
  Padding,
  Gaps,
  Dimensions,
  Shadows,
} from '../constants/styles';

/**
 * CategoryFrame Component
 * Category card frame with Pi character
 * @param {string} homePage - Home page variant
 * @param {string} selected - Selected state
 * @param {string} variant - Variant type
 * @param {string} category - Category type
 */
const CategoryFrame = ({
  style,
  homePage = 'pibnb',
  selected = 'Default',
  variant = 'Default',
  category,
}) => {
  return (
    <View style={[styles.categoryFrame, style]}>
      <View style={styles.piCategoryParent}>
        <Layer1 type="defult" text="Apartments" />
        <Component5 category={category} />
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
    width: Dimensions.width104,
    height: Dimensions.height104,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  piCategoryParent: {
    width: Dimensions.width104,
    boxShadow: '0px 0px 50px rgba(96, 231, 255, 0.5)',
    borderRadius: BorderRadius.roundCornerXL,
    backgroundColor: Colors.blue100,
    borderWidth: 1,
    borderColor: Colors.categoriesApartments,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: Padding.padding8,
    gap: Gaps.gap8,
  },
  checkbox: {
    width: Dimensions.width24,
    height: Dimensions.height24,
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

export default CategoryFrame;
