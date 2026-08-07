import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {getBootSplashLogoRect} from './BootSplashFrame';

const HOLD_BEFORE_MS = 300; // stay at full initial size before moving
const MOVE_MS = 1800; // slow move up + shrink, all together
const TARGET_WAIT_MS = 250; // brief wait for Home's real logo measurement

/** Must stay in sync with `styles.logo` / menu in Home.js. */
export const HOME_HEADER_LOGO = {
  width: 130,
  height: 122,
  marginTop: -36,
  menuMarginTop: 20,
  menuHeight: 20,
};

/** Deterministic header-logo rect (avoids measureInWindow through 3D flip). */
export function getHomeHeaderLogoRect(screenWidth, insetsTop) {
  const y =
    (Number(insetsTop) || 0) +
    HOME_HEADER_LOGO.menuMarginTop +
    HOME_HEADER_LOGO.menuHeight +
    HOME_HEADER_LOGO.marginTop;
  return {
    x: (screenWidth - HOME_HEADER_LOGO.width) / 2,
    y,
    width: HOME_HEADER_LOGO.width,
    height: HOME_HEADER_LOGO.height,
  };
}

/**
 * Brief intro modal shown on Home — same logo as the header (`homeLogo.png`).
 * The logo holds large, then moves + shrinks to the header logo rect and
 * stays fully opaque. Home keeps its real logo hidden until this lands,
 * then we hand off so it feels like one continuous logo.
 */
export default function HomeIntroModal({
  visible,
  targetLayout,
  insetsTop = 0,
  onShown,
  onHidden,
  onIntroMoveStart,
}) {
  const {width: screenWidth, height: screenHeight} = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  // Target is frozen once the animation starts — if targetLayout changed
  // interpolation ranges mid-flight, the already-running progress value
  // would suddenly map to a different position/scale, looking like a jump.
  const [resolvedTarget, setResolvedTarget] = useState(null);

  // Initial "big logo" — same asset as Home header, just larger / centered.
  const initialRect = useMemo(
    () => getBootSplashLogoRect(screenWidth, screenHeight),
    [screenWidth, screenHeight],
  );

  const fallbackTargetRect = useMemo(
    () => getHomeHeaderLogoRect(screenWidth, insetsTop),
    [screenWidth, insetsTop],
  );

  const {
    translateX,
    translateY,
    scaleX,
    scaleY,
    backgroundScale,
    backgroundOpacity,
  } = useMemo(() => {
    // Always interpolate using *some* target (real once resolved, fallback
    // shape until then) so the transform array's structure never changes
    // between renders — switching it from [] to populated mid-flight was
    // causing React Native's native driver to visibly reset/re-attach the
    // view for a frame, looking like a jump right as the hold ends.
    const effectiveTarget = resolvedTarget || fallbackTargetRect;
    const scaleToX = effectiveTarget.width / initialRect.width;
    const scaleToY = effectiveTarget.height / initialRect.height;
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
      // Independent axes so the morph lands exactly on the header rect.
      scaleX: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, scaleToX],
      }),
      scaleY: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, scaleToY],
      }),
      // Background clears so Home shows underneath while the logo stays put.
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

  // Always-current layouts, readable from inside timers without a stale
  // closure (the start effect below only depends on `visible` / mount).
  const targetLayoutRef = useRef(targetLayout);
  const computedTargetRef = useRef(fallbackTargetRect);
  useEffect(() => {
    targetLayoutRef.current = targetLayout;
  }, [targetLayout]);
  useEffect(() => {
    computedTargetRef.current = fallbackTargetRect;
  }, [fallbackTargetRect]);

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
    let handoffFrame1;
    let handoffFrame2;

    const pickTarget = () => {
      // Prefer layout math over measureInWindow: the header logo sits inside
      // a perspective/rotateY flip face, and early measures often report a Y
      // that's too high — animation lands high, then jumps down on handoff.
      const measured = targetLayoutRef.current;
      const computed = computedTargetRef.current;
      if (
        measured &&
        measured.width > 0 &&
        measured.height > 0 &&
        Number.isFinite(measured.x) &&
        Number.isFinite(measured.y) &&
        Math.abs(measured.y - computed.y) <= 12 &&
        Math.abs(measured.x - computed.x) <= 24
      ) {
        return {
          x: measured.x,
          y: measured.y,
          width: computed.width,
          height: computed.height,
        };
      }
      return computed;
    };

    const startMove = target => {
      onIntroMoveStart?.();
      setResolvedTarget(target);
      Animated.timing(progress, {
        toValue: 1,
        duration: MOVE_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(({finished}) => {
        if (!finished) return;
        // Reveal the real header logo first, then drop the overlay after
        // two frames so they share a paint — no gap, no double logo flash.
        onHidden?.();
        handoffFrame1 = requestAnimationFrame(() => {
          handoffFrame2 = requestAnimationFrame(() => {
            setMounted(false);
          });
        });
      });
    };

    // Hold at full initial size first, then move to a stable target —
    // captured once via resolvedTarget, never updated mid-flight.
    holdTimer = setTimeout(() => {
      if (targetLayoutRef.current) {
        startMove(pickTarget());
        return;
      }
      waitTimer = setTimeout(() => {
        startMove(pickTarget());
      }, TARGET_WAIT_MS);
    }, HOLD_BEFORE_MS);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(waitTimer);
      if (handoffFrame1) cancelAnimationFrame(handoffFrame1);
      if (handoffFrame2) cancelAnimationFrame(handoffFrame2);
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
              transform: [{translateY}, {scale: backgroundScale}],
            },
          ]}
          resizeMode="cover"
          fadeDuration={0}
        />
        {/* Logo stays fully opaque — it IS the header logo until handoff. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.logoWrap,
            {
              left: initialRect.x,
              top: initialRect.y,
              width: initialRect.width,
              height: initialRect.height,
              transform: [{translateX}, {translateY}, {scaleX}, {scaleY}],
            },
          ]}>
          <Image
            source={require('../assets/homeLogo.png')}
            style={styles.logoImage}
            resizeMode="contain"
            fadeDuration={0}
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
