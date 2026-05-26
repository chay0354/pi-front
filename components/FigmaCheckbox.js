import React from 'react';
import {View, StyleSheet} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';

import {
  GOLD_GRADIENT_COLORS,
  GOLD_GRADIENT_LOCATIONS,
  goldGradientEnd,
  goldGradientStart,
} from '../utils/goldGradient';

// Figma-style circular checkbox used across TikTok-feed bottom filters.
const PILL_BORDER = '#4D4966';
const DOT_BG = '#27262F';
const CHECK_COLOR = '#F4AD39';
const BORDER_GOLD = '#CCA447';

const CheckVariant = ({checked, size, style}) => {
  if (!checked) {
    return (
      <View
        style={[
          styles.uncheckedRing,
          {width: size, height: size, borderRadius: size / 2},
          style,
        ]}
      />
    );
  }
  const innerSize = Math.max(size - 4, 0);
  return (
    <LinearGradient
      colors={GOLD_GRADIENT_COLORS}
      locations={GOLD_GRADIENT_LOCATIONS}
      start={goldGradientStart}
      end={goldGradientEnd}
      style={[
        styles.outerCentered,
        {width: size, height: size, borderRadius: size / 2},
        style,
      ]}>
      <View
        style={[
          styles.innerDarkCenter,
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

const DotVariant = ({checked, size, style}) => {
  const dotSize = Math.round(size * 0.4);
  return (
    <View
      style={[
        styles.outerCentered,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: checked ? BORDER_GOLD : PILL_BORDER,
          backgroundColor: DOT_BG,
        },
        style,
      ]}>
      {checked ? (
        <LinearGradient
          colors={GOLD_GRADIENT_COLORS}
          locations={GOLD_GRADIENT_LOCATIONS}
          start={goldGradientStart}
          end={goldGradientEnd}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
          }}
        />
      ) : null}
    </View>
  );
};

export const FigmaCheckbox = ({checked, size, style, variant = 'check'}) => {
  if (variant === 'dot') {
    return <DotVariant checked={checked} size={size ?? 22} style={style} />;
  }
  return <CheckVariant checked={checked} size={size ?? 24} style={style} />;
};

const styles = StyleSheet.create({
  uncheckedRing: {
    borderWidth: 1.5,
    borderColor: PILL_BORDER,
    backgroundColor: 'transparent',
  },
  outerCentered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDarkCenter: {
    backgroundColor: DOT_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FigmaCheckbox;
