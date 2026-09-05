import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'pi_accessibility_prefs_v1';

export const FONT_SCALE_MIN = 1;
export const FONT_SCALE_MAX = 2;
export const FONT_SCALE_STEP = 0.15;

export const DEFAULT_ACCESSIBILITY_PREFS = {
  fontScale: 1,
  highContrast: false,
  readableFont: false,
  highlightLinks: false,
  reduceMotion: false,
};

const clampFontScale = value => {
  const n = Number(value);
  if (!Number.isFinite(n)) return FONT_SCALE_MIN;
  const snapped =
    Math.round(n / FONT_SCALE_STEP) * FONT_SCALE_STEP;
  return Math.min(
    FONT_SCALE_MAX,
    Math.max(FONT_SCALE_MIN, Number(snapped.toFixed(2))),
  );
};

export function normalizeAccessibilityPrefs(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    fontScale: clampFontScale(src.fontScale),
    highContrast: src.highContrast === true,
    readableFont: src.readableFont === true,
    highlightLinks: src.highlightLinks === true,
    reduceMotion: src.reduceMotion === true,
  };
}

export async function loadAccessibilityPrefs() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {...DEFAULT_ACCESSIBILITY_PREFS};
    return normalizeAccessibilityPrefs(JSON.parse(raw));
  } catch (_) {
    return {...DEFAULT_ACCESSIBILITY_PREFS};
  }
}

export async function saveAccessibilityPrefs(prefs) {
  const next = normalizeAccessibilityPrefs(prefs);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (_) {
    /* ignore persist failures — in-memory prefs still apply */
  }
  return next;
}

export function stepFontScale(current, direction) {
  const delta = direction < 0 ? -FONT_SCALE_STEP : FONT_SCALE_STEP;
  return clampFontScale((Number(current) || 1) + delta);
}
