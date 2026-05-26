import {I18nManager, Platform} from 'react-native';

/** Figma gold CTA / pill gradient — rgb(254,231,135) → rgb(189,153,71) → rgb(156,101,34) */
export const GOLD_GRADIENT_COLORS = ['#FEE787', '#BD9947', '#9C6522'];
export const GOLD_GRADIENT_LOCATIONS = [0.0456, 0.5076, 0.8831];

const FIGMA_START = {x: 0, y: 0};
const FIGMA_END = {x: 1, y: 1};

/**
 * expo-linear-gradient diagonal on native RTL mirrors vs web (~125deg CSS).
 * Swap endpoints on native RTL so light stays top-left like Figma/web.
 */
export const goldGradientStart =
  Platform.OS !== 'web' && I18nManager.isRTL ? FIGMA_END : FIGMA_START;
export const goldGradientEnd =
  Platform.OS !== 'web' && I18nManager.isRTL ? FIGMA_START : FIGMA_END;
