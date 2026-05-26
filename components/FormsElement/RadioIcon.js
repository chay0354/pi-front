import React from 'react';
import {View, StyleSheet, Image} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {FigmaCheckbox} from '../FigmaCheckbox';
import {
  GOLD_GRADIENT_COLORS,
  GOLD_GRADIENT_LOCATIONS,
  goldGradientEnd,
  goldGradientStart,
} from '../../utils/goldGradient';

/**
 * Classic selected state matches list radios in OfficeListingScreen (e.g. סוג דירה):
 * one gradient disc + checkbox PNG — not a double ring.
 *
 * @param {boolean} [useFigmaStyle] — TikTok / Figma glyph check; only for
 *   פרטים כלליים / הפרויקט מציע accordion rows.
 */
export const RadioIcon = ({isSelected, useFigmaStyle}) => {
  if (useFigmaStyle) {
    return <FigmaCheckbox checked={!!isSelected} size={24} />;
  }
  if (!isSelected) {
    return <View style={styles.unselected} />;
  }
  return (
    <LinearGradient
      colors={GOLD_GRADIENT_COLORS}
      locations={GOLD_GRADIENT_LOCATIONS}
      start={goldGradientStart}
      end={goldGradientEnd}
      style={styles.selectedGradient}>
      <Image
        source={require('../../assets/checkbox-selected.png')}
        style={styles.checkImage}
        resizeMode="contain"
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  unselected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
  },
  selectedGradient: {
    width: 23,
    height: 23,
    borderRadius: 11.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCA447',
    backgroundColor: '#27262F',
  },
  checkImage: {
    width: 17,
    height: 17,
  },
});
