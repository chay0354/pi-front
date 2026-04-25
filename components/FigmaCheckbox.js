import React from 'react';
import {View, StyleSheet} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';

// Single source of truth for the Figma-style circular checkbox used across
// all TikTok-feed bottom filters (Preferences, Apartment Type, City, Office,
// Price). See Figma node 25:201204 (unchecked) / 25:201206 (checked).
//
// Usage:
//   <FigmaCheckbox checked={value} />
//
// Layout: 24 × 24 circle. Checked state = gold gradient ring (#FEE787 ->
// #BD9947 -> #9C6522) + dark inner (#27262F) + gold check glyph (#F4AD39).
// Unchecked state = 1.5 px border (#4D4966), transparent interior.

const GOLD_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const GOLD_GRADIENT_LOCATIONS = [0.0456, 0.5076, 0.8831];
const PILL_BORDER = '#4D4966';
const DOT_BG = '#27262F';
const CHECK_COLOR = '#F4AD39';

export const FigmaCheckbox = ({checked, size = 24, style}) => {
  if (!checked) {
    return (
      <View
        style={[
          styles.unchecked,
          {width: size, height: size, borderRadius: size / 2},
          style,
        ]}
      />
    );
  }

  const innerSize = Math.max(size - 4, 0);
  return (
    <LinearGradient
      colors={GOLD_GRADIENT}
      locations={GOLD_GRADIENT_LOCATIONS}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={[
        styles.outer,
        {width: size, height: size, borderRadius: size / 2},
        style,
      ]}>
      <View
        style={[
          styles.inner,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          },
        ]}>
        <MaterialCommunityIcons
          name="check"
          size={Math.round(size * 0.58)}
          color={CHECK_COLOR}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  unchecked: {
    borderWidth: 1.5,
    borderColor: PILL_BORDER,
    backgroundColor: 'transparent',
  },
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    backgroundColor: DOT_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FigmaCheckbox;
