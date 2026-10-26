import {gradientCss} from './rnStyle';

/** Yellow-gold accent — brighter/yellower than antique gold. */
export const GOLD_GRADIENT_COLORS = ['#FFE56A', '#F7C63A', '#E5A80F'];
export const GOLD_GRADIENT_LOCATIONS = [0.0456, 0.5076, 0.8831];

/** Web keeps the Figma direction (light top-left); mobile only swaps on native RTL. */
export const goldGradientStart = {x: 0, y: 0};
export const goldGradientEnd = {x: 1, y: 1};

export const GOLD_GRADIENT_CSS = gradientCss({
  colors: GOLD_GRADIENT_COLORS,
  locations: GOLD_GRADIENT_LOCATIONS,
  start: goldGradientStart,
  end: goldGradientEnd,
});
