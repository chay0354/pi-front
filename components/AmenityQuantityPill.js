import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {
  GOLD_GRADIENT_COLORS,
  GOLD_GRADIENT_LOCATIONS,
  goldGradientEnd,
  goldGradientStart,
} from '../utils/goldGradient';

/** Pill inner row is always LTR: circle left, number right (matches Figma / filter screens). */
const pillInnerDirection = {direction: 'ltr'};

/**
 * Selected quantity pill (56×40) — parking count, rooms, amenity qty, etc.
 * Figma: indicator circle on the left, number on the right (inside the pill).
 * forceLtr keeps that order on web and native RTL.
 */
export default function AmenityQuantityPill({
  qty,
  selected,
  onPress,
  style,
  textSize = 18,
  inactiveBorderColor = '#4D4966',
}) {
  const dot = selected ? (
    <View style={styles.amenityQuantityDotSelected}>
      <LinearGradient
        colors={GOLD_GRADIENT_COLORS}
        locations={GOLD_GRADIENT_LOCATIONS}
        start={goldGradientStart}
        end={goldGradientEnd}
        style={styles.amenityQuantityDotInner}
      />
    </View>
  ) : (
    <View
      style={[styles.amenityQuantityDot, {borderColor: inactiveBorderColor}]}
    />
  );

  const pillRowStyle = [styles.pillRow, pillInnerDirection];

  return (
    <TouchableOpacity onPress={onPress} style={style} activeOpacity={0.85}>
      {selected ? (
        <LinearGradient
          colors={GOLD_GRADIENT_COLORS}
          locations={GOLD_GRADIENT_LOCATIONS}
          start={goldGradientStart}
          end={goldGradientEnd}
          style={[styles.amenityQuantityButtonSelected, ...pillRowStyle]}>
          {dot}
          <Text
            style={[
              selected
                ? styles.amenityQuantityTextSelected
                : styles.amenityQuantityText,
              {fontSize: textSize},
            ]}>
            {qty}
          </Text>
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.amenityQuantityButton,
            ...pillRowStyle,
            {borderColor: inactiveBorderColor},
          ]}>
          {dot}
          <Text
            style={[styles.amenityQuantityText, {fontSize: textSize}]}>
            {qty}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  amenityQuantityButton: {
    borderWidth: 1.5,
    borderRadius: 846.154,
    width: 56,
    height: 40,
    paddingHorizontal: 8,
  },
  amenityQuantityButtonSelected: {
    borderRadius: 846.154,
    width: 56,
    height: 40,
    paddingHorizontal: 8,
  },
  amenityQuantityText: {
    color: '#fff',
    fontFamily: 'Rubik-Medium',
  },
  amenityQuantityTextSelected: {
    color: '#1E1D27',
    fontFamily: 'Rubik-Medium',
  },
  amenityQuantityDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    marginRight: 6,
  },
  amenityQuantityDotSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#27262F',
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amenityQuantityDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
