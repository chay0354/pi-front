import React, {useCallback, useEffect, useRef} from 'react';
import {Animated, Easing, Image, StyleSheet} from 'react-native';

const MIN_HOLD_MS = 1000;
const FADE_MS = 550;
const MAX_WAIT_MS = 4500;

/**
 * Opaque splash cover that fades out once Home has loaded underneath.
 * Single static image — no scene swaps or background transforms.
 */
export default function SplashHomeIntroOverlay({
  readyToDismiss,
  onComplete,
  onFirstPaint,
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const mountedAt = useRef(Date.now());
  const finishedRef = useRef(false);
  const firstPaintReportedRef = useRef(false);

  // onLayout fires once this view has an actual measured frame — a reliable
  // proxy for "about to paint." Two rAFs add margin so the native splash
  // only hides once this is confirmed on screen, not just mounted.
  const handleLayout = useCallback(() => {
    if (firstPaintReportedRef.current) return;
    firstPaintReportedRef.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onFirstPaint?.();
      });
    });
  }, [onFirstPaint]);

  const fadeOut = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) onComplete?.();
    });
  }, [opacity, onComplete]);

  useEffect(() => {
    mountedAt.current = Date.now();
    finishedRef.current = false;
    opacity.setValue(1);
  }, [opacity]);

  useEffect(() => {
    if (!readyToDismiss) return undefined;
    const elapsed = Date.now() - mountedAt.current;
    const delay = Math.max(0, MIN_HOLD_MS - elapsed);
    const timer = setTimeout(fadeOut, delay);
    return () => clearTimeout(timer);
  }, [readyToDismiss, fadeOut]);

  useEffect(() => {
    const maxTimer = setTimeout(fadeOut, MAX_WAIT_MS);
    return () => clearTimeout(maxTimer);
  }, [fadeOut]);

  return (
    <Animated.View
      pointerEvents="auto"
      onLayout={handleLayout}
      style={[styles.root, {opacity}]}>
      <Image
        source={require('../assets/SplashScreen.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1e1d27',
    zIndex: 9998,
    elevation: 9998,
  },
});
