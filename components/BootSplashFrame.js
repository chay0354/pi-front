import React, {useCallback, useRef} from 'react';
import {Image, StyleSheet, View, useWindowDimensions} from 'react-native';

/** assets/SplashScreen.png — the bitmap expo-splash-screen shows natively. */
const SPLASH_IMAGE = {width: 1242, height: 2688};

/**
 * Where homeLogo.png's canvas sits inside SplashScreen.png, as a fraction of
 * that bitmap. Measured by diffing SplashScreen.png against splashBack.png
 * (the same artwork without the logo): the logo is composited at 1.5896x with
 * its content starting at (178, 824).
 */
const SPLASH_LOGO_FRACTION = {
  x: 0.142037,
  y: 0.302407,
  width: 0.716731,
  height: 0.312243,
};

/**
 * The logo rect the native splash is already showing, so the React frame can
 * draw it in the identical spot. expo-splash-screen renders the bitmap with
 * resizeMode "cover" (CENTER_CROP): scaled uniformly to fill, centered on both
 * axes. Reproducing that here is what stops the logo jumping when the native
 * splash hides — a fixed box only lines up on one screen size.
 *
 * Must match HomeIntroModal's initial logo rect.
 */
export function getBootSplashLogoRect(screenWidth, screenHeight) {
  const scale = Math.max(
    screenWidth / SPLASH_IMAGE.width,
    screenHeight / SPLASH_IMAGE.height,
  );
  const drawnWidth = SPLASH_IMAGE.width * scale;
  const drawnHeight = SPLASH_IMAGE.height * scale;
  const offsetX = (screenWidth - drawnWidth) / 2;
  const offsetY = (screenHeight - drawnHeight) / 2;
  return {
    x: offsetX + SPLASH_LOGO_FRACTION.x * drawnWidth,
    y: offsetY + SPLASH_LOGO_FRACTION.y * drawnHeight,
    width: SPLASH_LOGO_FRACTION.width * drawnWidth,
    height: SPLASH_LOGO_FRACTION.height * drawnHeight,
  };
}

/**
 * Static boot frame — identical to HomeIntroModal t=0 so handoffs never flash.
 */
export default function BootSplashFrame({onFirstPaint}) {
  const {width: screenWidth, height: screenHeight} = useWindowDimensions();
  const reportedRef = useRef(false);
  const logoRect = getBootSplashLogoRect(screenWidth, screenHeight);

  const handleLayout = useCallback(() => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onFirstPaint?.();
      });
    });
  }, [onFirstPaint]);

  return (
    <View style={styles.root} onLayout={handleLayout} pointerEvents="none">
      <Image
        source={require('../assets/splashBack.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        fadeDuration={0}
      />
      <Image
        source={require('../assets/homeLogo.png')}
        style={[
          styles.logo,
          {
            left: logoRect.x,
            top: logoRect.y,
            width: logoRect.width,
            height: logoRect.height,
          },
        ]}
        resizeMode="contain"
        fadeDuration={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1e1d27',
    zIndex: 10000,
    elevation: 10000,
  },
  logo: {
    position: 'absolute',
  },
});
