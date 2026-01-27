import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import CategoryTitle1 from './CategoryTitle1';
import { Gaps, Dimensions } from '../constants/styles';

/**
 * Frame1171276078 Component
 * Category title with chevron icon
 */
const Frame1171276078 = ({
  style,
  homePage = 'pibnb',
  selected = 'Default',
  variant = 'Default',
}) => {
  return (
    <View style={[styles.categorytitleChevrondefaul, style]}>
      <Image
        source={require('../assets/Frame-1171276078.svg')}
        style={styles.categorytitleChevrondefaulChild}
        resizeMode="contain"
      />
      <CategoryTitle1
        homePage="apartments"
        selected="Default"
        variant="Default"
        homePage1="apartments"
        selected1="Default"
        variant1="Default"
        text="דירות"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  categorytitleChevrondefaul: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Gaps.gap3,
  },
  categorytitleChevrondefaulChild: {
    height: Dimensions.height11,
    width: Dimensions.width9,
  },
});

export default Frame1171276078;
