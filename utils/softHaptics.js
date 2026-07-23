import {Platform, Vibration, NativeModules} from 'react-native';
import {requireOptionalNativeModule} from 'expo-modules-core';

/**
 * Soft carousel / picker tick.
 * Prefers ExpoHaptics (needs an iOS build that includes expo-haptics).
 * Falls back to a short Vibration pulse so ticks are never fully silent.
 */
export function playSoftTick() {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'ios') {
    try {
      const native =
        requireOptionalNativeModule('ExpoHaptics') ||
        NativeModules.ExpoHaptics ||
        null;
      if (native?.impactAsync) {
        // Light impact = soft but noticeable (selection can feel like "nothing").
        Promise.resolve(native.impactAsync('light')).catch(() => {});
        return;
      }
      if (native?.selectionAsync) {
        Promise.resolve(native.selectionAsync()).catch(() => {});
        return;
      }
    } catch {
      /* older IPA without ExpoHaptics */
    }
    // No native haptics in this binary — skip harsh system Vibration on iOS.
    return;
  }

  try {
    Vibration.vibrate(45);
  } catch {
    /* optional */
  }
}
