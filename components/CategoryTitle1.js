import React from 'react';
import {View, StyleSheet} from 'react-native';
import CategoryTitle from './CategoryTitle';

/**
 * CategoryTitle1 Component
 * Wrapper for CategoryTitle
 */
const CategoryTitle1 = ({
  style,
  homePage = 'pibnb',
  selected = 'Default',
  variant = 'Default',
  homePage1,
  selected1,
  variant1,
  text,
}) => {
  return (
    <View style={[styles.categoryTitle, style]}>
      <CategoryTitle
        homePage={homePage1}
        selected={selected1}
        variant={variant1}
        text={text}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  categoryTitle: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CategoryTitle1;
