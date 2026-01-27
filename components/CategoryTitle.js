import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes } from '../constants/styles';

/**
 * CategoryTitle Component
 * Category title text below category frame
 * @param {string} text - Category title (default: "דירות")
 * @param {string} homePage - Home page variant
 * @param {string} selected - Selected state
 * @param {string} variant - Variant type
 */
const CategoryTitle = ({
  style,
  homePage = 'pibnb',
  selected = 'Default',
  variant = 'Default',
  text = 'דירות',
}) => {
  return (
    <View style={[styles.categoryTitle, style]}>
      <Text style={styles.text}>{text}</Text>
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
  text: {
    position: 'relative',
    fontSize: FontSizes.fs18,
    color: Colors.white100,
    fontFamily: 'Rubik',
  },
});

export default CategoryTitle;
