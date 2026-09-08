import {Platform} from 'react-native';

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
 * The app runs forceRTL, which mirrors an authored `left` onto the physical
 * right. The native splash bitmap is never mirrored, so every view that has to
 * line up with it must lay out LTR or the whole frame lands mirrored.
 */
export const bootFrameLtrStyle = Platform.OS === 'web' ? {} : {direction: 'ltr'};

let frameSize = null;
const listeners = new Set();

/** Keeps every boot-time cover scaled off one box, even if the root resizes. */
export function subscribeBootFrame(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Size of the React root as measured by onLayout — deliberately NOT
 * Dimensions / useWindowDimensions. MainActivity pads android.R.id.content
 * above the system nav bar, so the window is taller than the box the native
 * splash was actually drawn into. Scaling `cover` off the window instead of
 * the real box moves the logo tens of pixels, which is what the eye reads as
 * a jump the moment the native splash hands over to React.
 *
 * Returns true when the value changed, so callers can re-render.
 */
export function setBootFrameSize(width, height) {
  const w = Math.round(Number(width) || 0);
  const h = Math.round(Number(height) || 0);
  if (w <= 0 || h <= 0) return false;
  if (frameSize && frameSize.width === w && frameSize.height === h) {
    return false;
  }
  frameSize = {width: w, height: h};
  listeners.forEach(listener => listener(frameSize));
  return true;
}

/** Measured root size, or null before the first layout. */
export function getBootFrameSize() {
  return frameSize;
}

/**
 * The logo rect the native splash is already showing, so the React frame can
 * draw it in the identical spot. expo-splash-screen renders the bitmap with
 * resizeMode "cover" (CENTER_CROP): scaled uniformly to fill, centered on both
 * axes. Reproducing that here is what stops the logo jumping when the native
 * splash hides — a fixed box only lines up on one screen size.
 *
 * `width` / `height` must be the measured frame, not the window.
 */
export function getBootSplashLogoRect(width, height) {
  const scale = Math.max(width / SPLASH_IMAGE.width, height / SPLASH_IMAGE.height);
  const drawnWidth = SPLASH_IMAGE.width * scale;
  const drawnHeight = SPLASH_IMAGE.height * scale;
  const offsetX = (width - drawnWidth) / 2;
  const offsetY = (height - drawnHeight) / 2;
  const rect = {
    x: offsetX + SPLASH_LOGO_FRACTION.x * drawnWidth,
    y: offsetY + SPLASH_LOGO_FRACTION.y * drawnHeight,
    width: SPLASH_LOGO_FRACTION.width * drawnWidth,
    height: SPLASH_LOGO_FRACTION.height * drawnHeight,
  };
  if (Platform.OS !== 'android') return rect;
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

/** True when two rects are close enough that no repaint is worth it. */
export function isSameRect(a, b) {
  if (!a || !b) return false;
  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}
