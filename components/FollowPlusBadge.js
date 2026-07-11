import React, {useRef, useState} from 'react';
import {Animated, Easing, StyleSheet, TouchableOpacity} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Colors} from '../constants/styles';

/** System orange used for follow confirmation check (Instagram-style). */
export const FOLLOW_CHECK_COLOR = Colors.yellowIcons;

const CHECK_HOLD_MS = 900;

/**
 * Avatar follow control: white + → animated orange ✓ (like Instagram).
 * - `beforePress`: sync gate; return false to skip (e.g. open registration).
 * - `onPress`: async follow request; return false / throw to revert the check.
 */
export function FollowPlusBadge({
  onPress,
  beforePress,
  disabled = false,
  iconSize = 16,
  style,
  hitSlop,
  onPressIn,
  onPressOut,
  onAnimationComplete,
}) {
  const [showCheck, setShowCheck] = useState(false);
  const busyRef = useRef(false);
  const scale = useRef(new Animated.Value(1)).current;
  const opacityPlus = useRef(new Animated.Value(1)).current;
  const opacityCheck = useRef(new Animated.Value(0)).current;

  const revertToPlus = () => {
    setShowCheck(false);
    opacityPlus.setValue(1);
    opacityCheck.setValue(0);
    scale.setValue(1);
  };

  const runCheckAnimation = () => {
    setShowCheck(true);
    opacityPlus.setValue(1);
    opacityCheck.setValue(0);
    scale.setValue(1);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 0.72,
          duration: 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.22,
          duration: 170,
          easing: Easing.out(Easing.back(1.8)),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacityPlus, {
        toValue: 0,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(opacityCheck, {
        toValue: 1,
        duration: 150,
        delay: 35,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = async () => {
    if (busyRef.current || disabled || showCheck) return;
    if (typeof beforePress === 'function' && beforePress() === false) {
      return;
    }

    busyRef.current = true;
    runCheckAnimation();

    let ok = true;
    try {
      const result = await onPress?.();
      if (result === false) ok = false;
    } catch (_) {
      ok = false;
    }

    if (!ok) {
      revertToPlus();
      busyRef.current = false;
      onAnimationComplete?.();
      return;
    }

    setTimeout(() => {
      onAnimationComplete?.();
      busyRef.current = false;
    }, CHECK_HOLD_MS);
  };

  return (
    <TouchableOpacity
      style={style}
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled && !showCheck}
      activeOpacity={0.85}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={showCheck ? 'בקשת מעקב נשלחה' : 'עקוב'}>
      <Animated.View
        style={[
          styles.iconBox,
          {
            width: iconSize + 2,
            height: iconSize + 2,
            transform: [{scale}],
          },
        ]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.iconLayer, {opacity: opacityPlus}]}>
          <MaterialCommunityIcons name="plus" size={iconSize} color="#FFFFFF" />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.iconLayer, {opacity: opacityCheck}]}>
          <MaterialCommunityIcons
            name="check-bold"
            size={iconSize}
            color={FOLLOW_CHECK_COLOR}
          />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FollowPlusBadge;
