import React, {useCallback, useRef} from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {bootFrameLtrStyle, setBootFrameSize} from '../utils/bootFrame';

export {getBootSplashLogoRect} from '../utils/bootFrame';

/**
 * Static boot cover — the same bitmap expo-splash-screen already drew
 * (`SplashScreen.png`, resizeMode cover, 100% of the React root).
 * One image, no separate logo, so hiding the native splash cannot shift
 * the building or the Pi.
 *
 * Layout is still measured here so HomeIntroModal can place its moving
 * logo on the same box the native splash used.
 */
export default function BootSplashFrame({onFirstPaint}) {
  const reportedRef = useRef(false);
  const onFirstPaintRef = useRef(onFirstPaint);
  onFirstPaintRef.current = onFirstPaint;

  const handleLayout = useCallback(event => {
    const {width, height} = event.nativeEvent.layout;
    setBootFrameSize(width, height);
    if (reportedRef.current) return;
    reportedRef.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onFirstPaintRef.current?.();
      });
    });
  }, []);

  return (
    <View
      style={[styles.root, bootFrameLtrStyle]}
      onLayout={handleLayout}
      pointerEvents="none"
      collapsable={false}>
      <Image
        source={require('../assets/SplashScreen.png')}
        style={styles.splash}
        resizeMode="cover"
        fadeDuration={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1e1d27',
    overflow: 'hidden',
  },
  splash: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
});
