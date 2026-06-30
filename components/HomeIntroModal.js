import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

const HOLD_BEFORE_MS =300; // stay at full initial size before moving
const MOVE_MS = 1800; // slow move up + shrink + fade, all together
const TARGET_WAIT_MS = 250; // brief wait for Home's real logo measurement

const SPLASH_LOGO_ASPECT = 2187 / 1242; // matches assets/splashLogo.png

/**
 * Brief intro modal shown on Home — same background + logo imagery as the
 * splash screen. The logo holds at full initial size, then slowly moves up,
 * shrinks, and fades (all in one synced animation) to land exactly on
 * Home's real header logo (measured via targetLayout). Only relevant once
 * (per Home mount), not shown while onboarding/terms gate are covering the
 * screen (controlled by the `visible` prop from the parent).
 */
export default function HomeIntroModal({
  visible,
  targetLayout,
  onShown,
  onHidden,
}) {
  const {width: screenWidth, height: screenHeight} = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  // Target is frozen once the animation starts — if targetLayout changed
  // interpolation ranges mid-flight, the already-running progress value
  // would suddenly map to a different position/scale, looking like a jump.
  const [resolvedTarget, setResolvedTarget] = useState(null);

  // Initial "big logo" presentation — should match how large the logo
  // appears in the actual native splash screen, i.e. filling most of the
  // screen, not a small floating box. splashLogo.png's own proportions are
  // close to a full phone screen, so fit it as large as possible within the
  // screen bounds (preserving aspect ratio, no distortion) rather than
  // capping it to a small fixed size.
  const initialRect = useMemo(() => {
    // const maxWidth = screenWidth * 0.92;
    // const maxHeight = screenHeight * 0.8;
    // let width = maxWidth;
    // let height = width * SPLASH_LOGO_ASPECT;
    // if (height > maxHeight) {
    //   height = maxHeight;
    //   width = height / SPLASH_LOGO_ASPECT;
    // }
    return {
      x: (screenWidth - 290) / 2,
      y: (screenHeight - 353) / 2,
      width: 290,
      height: 280,
    };
  }, [screenWidth, screenHeight]);

  const fallbackTargetRect = useMemo(
    () => ({
      x: screenWidth / 2 - 65,
      y: screenHeight * 0.08,
      // Matches Home's actual logo style (width:130, height:122) — this is
      // an estimate of where Home's real logo sits, used only if
      // measurement hasn't arrived yet, so it should match that target's
      // shape, not splashLogo.png's own (much taller) aspect ratio.
      width: 130,
      height: 122,
    }),
    [screenWidth, screenHeight],
  );

  const {
    translateX,
    translateY,
    scale,
    opacity,
    backgroundScale,
    backgroundOpacity,
  } = useMemo(() => {
    // Always interpolate using *some* target (real once resolved, fallback
    // shape until then) so the transform array's structure never changes
    // between renders — switching it from [] to populated mid-flight (even
    // though the interpolated values are identity at progress=0) was
    // causing React Native's native driver to visibly reset/re-attach the
    // view for a frame, looking like a jump right as the hold ends.
    const effectiveTarget = resolvedTarget || fallbackTargetRect;
    const scaleTo = effectiveTarget.width / initialRect.width;
    const initialCenterX = initialRect.x + initialRect.width / 2;
    const initialCenterY = initialRect.y + initialRect.height / 2;
    const targetCenterX = effectiveTarget.x + effectiveTarget.width / 2;
    const targetCenterY = effectiveTarget.y + effectiveTarget.height / 2;
    return {
      translateX: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, targetCenterX - initialCenterX],
      }),
      translateY: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, targetCenterY - initialCenterY],
      }),
      scale: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, scaleTo],
      }),
      // Logo fades 1 -> 0 in sync with its own move/shrink, not as a
      // separate step afterward.
      opacity: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
      // Background gets the same kind of treatment as the logo — its own
      // scale + fade synced to the same progress, instead of just riding
      // along on a flat parent opacity.
      backgroundScale: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.12],
      }),
      backgroundOpacity: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
    };
  }, [resolvedTarget, fallbackTargetRect, initialRect, progress]);

  // Always-current targetLayout, readable from inside timers without a
  // stale closure (the start effect below only depends on `visible`).
  const targetLayoutRef = useRef(targetLayout);
  useEffect(() => {
    targetLayoutRef.current = targetLayout;
  }, [targetLayout]);

  useEffect(() => {
    if (!visible) return undefined;
    setMounted(true);
    setResolvedTarget(null);
    progress.setValue(0);
    // Fire immediately (not on completion) so the parent can mark "shown"
    // right away — guarantees the intro can never replay even if this
    // component unmounts mid-animation (e.g. user navigates away from Home).
    onShown?.();

    let holdTimer;
    let waitTimer;

    const startMove = target => {
      setResolvedTarget(target);
      Animated.timing(progress, {
        toValue: 1,
        duration: MOVE_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(({finished}) => {
        if (finished) {
          setMounted(false);
          onHidden?.();
        }
      });
    };

    // Hold at full initial size first, then move once we have a real
    // (or, after a short wait, fallback) target — captured once via
    // resolvedTarget, never updated again once the animation begins.
    holdTimer = setTimeout(() => {
      if (targetLayoutRef.current) {
        startMove(targetLayoutRef.current);
        return;
      }
      waitTimer = setTimeout(() => {
        startMove(targetLayoutRef.current || fallbackTargetRect);
      }, TARGET_WAIT_MS);
    }, HOLD_BEFORE_MS);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(waitTimer);
    };
    // Intentionally run once on mount only, reading `visible`'s value at
    // that moment — NOT reactively on every `visible` change. onShown()
    // above triggers a parent re-render that flips showIntroModal (and thus
    // this `visible` prop) back to false moments after the animation
    // starts; if this effect depended on [visible], that change would tear
    // down and rebuild it, clearing the timers and freezing the animation
    // almost immediately. Once started, the sequence must run to completion
    // regardless of what the prop does afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) return null;

  return (
    <View style={styles.overlayRoot} pointerEvents="auto">
      <Animated.View style={styles.root}>
        {/* Solid backdrop fades too — without this, the root's own opaque
            color stays visible after the image fades out, covering Home. */}
        <Animated.View
          style={[styles.backdrop, {opacity: backgroundOpacity}]}
          pointerEvents="none"
        />
        <Animated.Image
          source={require('../assets/splashBack.png')}
          style={[
            styles.backgroundImage,
            {
              opacity: backgroundOpacity,
              // Same translateY as the logo — moves up together, in sync.
              transform: [{translateY}, {scale: backgroundScale}],
            },
          ]}
          resizeMode="cover"
          fadeDuration={0}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.logoWrap,
            {
              left: initialRect.x,
              top: initialRect.y,
              width: initialRect.width,
              height: initialRect.height,
              opacity,
              transform: [{translateX}, {translateY}, {scale}],
            },
          ]}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1e1d27',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  logoWrap: {
    position: 'absolute',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
});
