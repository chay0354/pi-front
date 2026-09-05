import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  DEFAULT_ACCESSIBILITY_PREFS,
  loadAccessibilityPrefs,
  normalizeAccessibilityPrefs,
  saveAccessibilityPrefs,
  stepFontScale,
} from '../utils/accessibilityPrefs';
import {applyAccessibilityRuntime} from '../utils/accessibilityRuntime';

const AccessibilityContext = createContext({
  prefs: DEFAULT_ACCESSIBILITY_PREFS,
  ready: false,
  applyEpoch: 0,
  applyPrefs: () => {},
  setPref: () => {},
  bumpFont: () => {},
  resetPrefs: () => {},
});

export function AccessibilityProvider({children}) {
  const [prefs, setPrefs] = useState(DEFAULT_ACCESSIBILITY_PREFS);
  const [ready, setReady] = useState(false);
  const [applyEpoch, setApplyEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadAccessibilityPrefs().then(loaded => {
      if (cancelled) return;
      setPrefs(loaded);
      applyAccessibilityRuntime(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyPrefs = useCallback(next => {
    const normalized = normalizeAccessibilityPrefs(next);
    setPrefs(normalized);
    applyAccessibilityRuntime(normalized);
    saveAccessibilityPrefs(normalized);
    setApplyEpoch(epoch => epoch + 1);
  }, []);

  const setPref = useCallback(
    (key, value) => {
      applyPrefs({...prefs, [key]: value});
    },
    [applyPrefs, prefs],
  );

  const bumpFont = useCallback(
    direction => {
      applyPrefs({...prefs, fontScale: stepFontScale(prefs.fontScale, direction)});
    },
    [applyPrefs, prefs],
  );

  const resetPrefs = useCallback(() => {
    applyPrefs({...DEFAULT_ACCESSIBILITY_PREFS});
  }, [applyPrefs]);

  const value = useMemo(
    () => ({
      prefs,
      ready,
      applyEpoch,
      applyPrefs,
      setPref,
      bumpFont,
      resetPrefs,
    }),
    [applyEpoch, applyPrefs, bumpFont, prefs, ready, resetPrefs, setPref],
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
