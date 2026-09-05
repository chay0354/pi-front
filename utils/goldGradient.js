import {I18nManager, Platform} from 'react-native';

/** Yellow-gold accent — brighter/yellower than antique gold. */
export const GOLD_GRADIENT_COLORS = ['#FFE56A', '#F7C63A', '#E5A80F'];
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
