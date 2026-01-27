import React from 'react';
import { View, StyleSheet } from 'react-native';
import CategoryFrame1 from './CategoryFrame1';

/**
 * CategoryFrames Component
 * Container for category frame
 */
const CategoryFrames = ({
  style,
  homePage = 'pibnb',
  selected = 'Default',
  variant = 'Default',
}) => {
  return (
    <View style={[styles.container, style]}>
      <CategoryFrame1
        homePage="apartments"
        selected="Default"
        variant="Default"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: [{ translateX: -52 }],
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
});

export default CategoryFrames;
