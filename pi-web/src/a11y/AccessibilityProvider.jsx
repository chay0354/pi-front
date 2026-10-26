import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {
  DEFAULT_ACCESSIBILITY_PREFS,
  applyAccessibilityRuntime,
  loadAccessibilityPrefs,
  normalizeAccessibilityPrefs,
  saveAccessibilityPrefs,
} from './prefs';

const AccessibilityContext = createContext({
  prefs: DEFAULT_ACCESSIBILITY_PREFS,
  applyPrefs: () => {},
  resetPrefs: () => {},
});

export function AccessibilityProvider({children}) {
  const [prefs, setPrefs] = useState(DEFAULT_ACCESSIBILITY_PREFS);

  useEffect(() => {
    const loaded = loadAccessibilityPrefs();
    setPrefs(loaded);
    applyAccessibilityRuntime(loaded);
  }, []);

  const applyPrefs = useCallback(next => {
    const normalized = normalizeAccessibilityPrefs(next);
    setPrefs(normalized);
    applyAccessibilityRuntime(normalized);
    saveAccessibilityPrefs(normalized);
  }, []);

  const resetPrefs = useCallback(() => {
    applyPrefs({...DEFAULT_ACCESSIBILITY_PREFS});
  }, [applyPrefs]);

  const value = useMemo(() => ({prefs, applyPrefs, resetPrefs}), [prefs, applyPrefs, resetPrefs]);
  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export const useAccessibility = () => useContext(AccessibilityContext);
