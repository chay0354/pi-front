import {useCallback, useEffect, useRef, useState} from 'react';
import {Dimensions, Keyboard, Platform, StatusBar} from 'react-native';

/** Estimate bottom system-bar padding when native insets are consumed. */
function estimateAndroidNavBarHeight() {
  const screenH = Dimensions.get('screen').height;
  const windowH = Dimensions.get('window').height;
  const statusH = StatusBar.currentHeight || 0;
  return Math.max(0, Math.round(screenH - windowH - statusH));
}

/**
 * Bottom offset + negative margin for Android composers/toolbars above the keyboard.
 * Avoids double-lift when adjustResize already shrank the window, and pulls flush
 * when native nav-bar padding leaves a ghost gap.
 */
export function useAndroidKeyboardComposer(enabled = true) {
  const windowClosedRef = useRef(Dimensions.get('window').height);
  const navBarRef = useRef(estimateAndroidNavBarHeight());
  const [bottomOffset, setBottomOffset] = useState(0);
  const [marginBottom, setMarginBottom] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const syncFromCoords = useCallback(coords => {
    if (Platform.OS !== 'android') {
      setBottomOffset(0);
      setMarginBottom(0);
      setIsOpen(false);
      return;
    }

    if (!coords) {
      const winH = Dimensions.get('window').height;
      windowClosedRef.current = winH;
      navBarRef.current = Math.max(estimateAndroidNavBarHeight(), navBarRef.current);
      setBottomOffset(0);
      setMarginBottom(0);
      setIsOpen(false);
      return;
    }

    const kbH = Math.max(0, coords.height ?? 0);
    const winH = Dimensions.get('window').height;
    const closedH = windowClosedRef.current || winH;
    const resizeDelta = Math.max(0, closedH - winH);
    const screenY = coords.screenY;

    let offset = 0;
    // Window already resized for the keyboard — don't lift again in JS.
    if (resizeDelta < kbH * 0.85) {
      if (typeof screenY === 'number' && Number.isFinite(screenY) && screenY > 0) {
        offset = Math.max(0, winH - screenY);
      } else {
        offset = Math.max(0, kbH - resizeDelta);
      }
    }

    // Native nav-bar padding can leave a strip above the keys after adjustResize.
    let pull = 0;
    if (offset === 0 && kbH > 0) {
      pull = Math.max(navBarRef.current, estimateAndroidNavBarHeight());
      if (
        typeof screenY === 'number' &&
        Number.isFinite(screenY) &&
        screenY > 0 &&
        screenY < winH
      ) {
        pull = Math.max(pull, winH - screenY);
      }
      // Padding applied natively on android.R.id.content is invisible to
      // Dimensions — use a conservative fallback when resize already handled IME.
      if (pull === 0 && resizeDelta >= kbH * 0.85) {
        pull = 40;
      }
    }

    setBottomOffset(offset);
    setMarginBottom(pull > 0 ? -pull : 0);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') {
      syncFromCoords(null);
      return undefined;
    }

    let lastCoords = null;
    const resync = () => syncFromCoords(lastCoords);

    const onShow = event => {
      lastCoords = event?.endCoordinates ?? null;
      syncFromCoords(lastCoords);
      requestAnimationFrame(resync);
      setTimeout(resync, 60);
    };
    const onHide = () => {
      lastCoords = null;
      syncFromCoords(null);
    };

    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);
    const dimSub = Dimensions.addEventListener('change', resync);

    return () => {
      showSub?.remove?.();
      hideSub?.remove?.();
      dimSub?.remove?.();
    };
  }, [enabled, syncFromCoords]);

  return {bottomOffset, marginBottom, isOpen};
}
