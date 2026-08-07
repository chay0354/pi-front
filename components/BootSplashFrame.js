import React, {useCallback, useRef} from 'react';
import {Image, StyleSheet, View, useWindowDimensions} from 'react-native';

/** Must match HomeIntroModal initial logo rect. */
export function getBootSplashLogoRect(screenWidth, screenHeight) {
  return {
    x: (screenWidth - 290) / 2,
    y: (screenHeight - 353) / 2,
    width: 290,
    height: 280,
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
