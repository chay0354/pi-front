import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Text,
  Platform,
  I18nManager,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
} from 'react-native-svg';
import {Colors} from '../../constants/styles';
import {flexEnd} from '../../utils/rtlLayout';
import {
  PROFILE_RING_COLORS,
  PROFILE_RING_LOCATIONS,
} from '../ProfileAvatar';

let gradientIdCounter = 0;
const nextGradientId = () =>
  `bnbLogoRing-${Date.now().toString(36)}-${(gradientIdCounter++).toString(36)}`;

const RING_RATIO = 3.5 / 82;
const GAP_RATIO = 2 / 82;
// Slightly compact; align toward visual right (RTL: flex-start, LTR: flex-end)
const SIZE = 92;

// swapLeftAndRightInRTL mirrors left/right on native — left lands on visual right.
const fabCornerStyle =
  Platform.OS === 'web'
    ? {right: 0}
    : I18nManager.isRTL
      ? {left: 0}
      : {right: 0};

/**
 * Circular logo placeholder for BnB "business" flow only — gold gradient ring, לוגו label, + control.
 */
export const BnbBusinessLogoUpload = ({
  logo,
  onPress,
  inputRef,
  onWebFileChange,
}) => {
  const [gradientId] = useState(nextGradientId);
  const ringWidth = Math.max(1, SIZE * RING_RATIO);
  const gap = Math.max(0, SIZE * GAP_RATIO);
  const inset = ringWidth + gap;
  const circleRadius = (SIZE - ringWidth) / 2;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityLabel="העלאת לוגו עסקי"
        style={styles.circleTouch}>
        <View style={styles.circleOuter}>
          <Svg
            width={SIZE}
            height={SIZE}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none">
            <Defs>
              <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                {PROFILE_RING_COLORS.map((color, i) => (
                  <Stop
                    key={`${gradientId}-${i}`}
                    offset={
                      PROFILE_RING_LOCATIONS[i] ??
                      i / Math.max(1, PROFILE_RING_COLORS.length - 1)
                    }
                    stopColor={color}
                  />
                ))}
              </SvgLinearGradient>
            </Defs>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={circleRadius}
              stroke={`url(#${gradientId})`}
              strokeWidth={ringWidth}
              fill="none"
            />
          </Svg>
          <View
            style={[
              styles.circleInner,
              {
                top: inset,
                left: inset,
                right: inset,
                bottom: inset,
              },
            ]}>
            {logo?.uri ? (
              <Image
                source={{uri: logo.uri}}
                style={styles.imageFill}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.placeholderLabel}>לוגו</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.fab, fabCornerStyle]}
        onPress={onPress}
        activeOpacity={0.85}
        hitSlop={10}>
        <MaterialCommunityIcons
          name="plus"
          size={17}
          color={Colors.whiteGeneral}
        />
      </TouchableOpacity>
      {Platform.OS === 'web' && inputRef && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{display: 'none'}}
          onChange={onWebFileChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: SIZE + 6,
    height: SIZE + 6,
    alignSelf: flexEnd,
    marginBottom: 16,
    marginTop: 6,
  },
  circleTouch: {
    width: SIZE,
    height: SIZE,
  },
  circleOuter: {
    width: SIZE,
    height: SIZE,
  },
  circleInner: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#252436',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageFill: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  placeholderLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    fontFamily: 'Rubik-Medium',
  },
  fab: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1e1d27',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 0,
  },
});
