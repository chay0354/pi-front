/**
 * Web port of mobile utils/rtlLayout.js (Platform.OS === 'web' branches).
 *
 * The page is `dir="rtl"`: flex-start = physical right, flex-end = physical left.
 * Values are RN-style objects (dp); pass them through `toWebStyle` before rendering.
 */
export const textAlign = 'right';
export const hebrewTextAlign = 'right';
export const flexEnd = 'flex-end';
export const flexStart = 'flex-start';

/** Section titles / field labels in Hebrew ad forms. */
export const formHeadingStyle = {
  alignSelf: 'flex-start',
  textAlign: 'right',
  width: '100%',
};

export const formRtlContainerStyle = {direction: 'rtl'};

/** Required label row: title then star (displays as …נכס* under RTL). */
export const formLabelRowStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  alignSelf: 'flex-start',
  flexWrap: 'nowrap',
  gap: 8,
  width: '100%',
  minHeight: 24,
};

/** Isolate LTR geometry (range sliders, min–max rows, ₪ inputs). On DOM nodes prefer `dir="ltr"`. */
export const forceLtrStyle = {direction: 'ltr'};

export const forceRtlStyle = {};

/** Absolute `left` that lands on a physical x (web does not mirror `left`). */
export function physicalLeftStyle(x, width) {
  const px = Math.round(Number(x) || 0);
  const w = Math.max(0, Math.round(Number(width) || 0));
  return {left: px, width: w, maxWidth: w};
}

/** Bottom safe-area padding for filter sheets / bottom chrome (min 8px). */
export function getSheetBottomInset(insets, min = 8) {
  return Math.max(Number(insets?.bottom) || 0, min);
}

export const RANGE_SLIDER_THUMB_SIZE = 22;

const clampPercent = percent => Math.max(0, Math.min(100, Number(percent) || 0));

export function rangeSliderThumbStyle(_trackWidth, percent, thumbSize = RANGE_SLIDER_THUMB_SIZE) {
  return {left: `${clampPercent(percent)}%`, marginLeft: -thumbSize / 2};
}

export function rangeSliderThumbLtrVisualStyle(trackWidth, percent, thumbSize = RANGE_SLIDER_THUMB_SIZE) {
  const w = Math.max(0, Number(trackWidth) || 0);
  if (w <= 0) return {opacity: 0};
  const x = Math.max(0, Math.min(w, (clampPercent(percent) / 100) * w)) - thumbSize / 2;
  return {left: 0, transform: `translateX(${x}px)`};
}

export function rangeSliderTrailingFillLtrVisualStyle(trackWidth, percent) {
  const w = Math.max(0, Number(trackWidth) || 0);
  const start = (clampPercent(percent) / 100) * w;
  return {left: 0, width: Math.max(0, w - start), transform: `translateX(${start}px)`};
}

export function rangeSliderFillLtrVisualStyle(trackWidth, minPercent, maxPercent) {
  const w = Math.max(0, Number(trackWidth) || 0);
  const minP = clampPercent(minPercent);
  const maxP = clampPercent(maxPercent);
  const start = (minP / 100) * w;
  return {left: 0, width: Math.max(0, ((maxP - minP) / 100) * w), transform: `translateX(${start}px)`};
}

export function rangeSliderFillStyle(_trackWidth, minPercent, maxPercent) {
  const minP = clampPercent(minPercent);
  const maxP = clampPercent(maxPercent);
  return {left: `${minP}%`, width: `${Math.max(0, maxP - minP)}%`};
}

/**
 * Pointer → 0–100% along the track from the physical left. Uses the bounding rect
 * ratio, so it is independent of the CSS scale applied to the stage.
 */
export function getRangeSliderPercentFromEvent(event, trackWidth, windowX = 0, sliderViewRef) {
  const clientX = event?.clientX ?? event?.pageX ?? event?.touches?.[0]?.clientX;
  const node = sliderViewRef?.current;
  if (node && typeof node.getBoundingClientRect === 'function' && typeof clientX === 'number') {
    const rect = node.getBoundingClientRect();
    return clampPercent(((clientX - rect.left) / (rect.width || 1)) * 100);
  }
  if (typeof clientX === 'number') {
    return clampPercent(((clientX - windowX) / Math.max(1, Number(trackWidth) || 1)) * 100);
  }
  return 0;
}

/** Web `dir=rtl`: value percent runs from the physical right. */
export function touchPercentToRangeValuePercent(touchPercent) {
  return 100 - clampPercent(touchPercent);
}

export function rangeSliderThumbRtlVisualStyle(percent, thumbSize = RANGE_SLIDER_THUMB_SIZE) {
  return {right: `${clampPercent(percent)}%`, marginRight: -thumbSize / 2};
}

export function rangeSliderFillRtlVisualStyle(minPercent, maxPercent) {
  const min = clampPercent(minPercent);
  const max = clampPercent(maxPercent);
  return {right: `${min}%`, width: `${Math.max(0, max - min)}%`};
}

export function rangeSliderTrailingFillStyle(_trackWidth, percent) {
  return {left: `${clampPercent(percent)}%`, right: 0};
}
