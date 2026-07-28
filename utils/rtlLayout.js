import {I18nManager, Platform} from 'react-native';

/**
 * RTL layout helpers (flex/text alignment). Kept separate from index.js to avoid
 * require cycles: screens must not import from the app entry barrel.
 *
 * With I18nManager.forceRTL(true): flex-start = physical right, flex-end = physical left.
 * Hebrew body text: under swapLeftAndRightInRTL, literal textAlign 'right' lands on the
 * physical left — use hebrewTextAlign (+ writingDirection: 'rtl') for message/copy text.
 */
export const textAlign = 'right';
/** Physical right for Hebrew under forceRTL + swapLeftAndRightInRTL on native. */
export const hebrewTextAlign = Platform.OS === 'web' ? 'right' : 'left';
export const flexEnd = 'flex-end';
export const flexStart = 'flex-start';

/** Section titles / field labels in Hebrew ad forms. */
export const formHeadingStyle = {
  alignSelf: 'flex-start',
  textAlign: 'right',
  width: '100%',
};

/**
 * Wrap form cards so headings, labels, and stacks read RTL (web + native).
 * NOTE: no explicit `width` — these cards use `marginHorizontal`, and a forced
 * `width: '100%'` would add to (not subtract from) the margins, overflowing the
 * parent by the margin amount and clipping on the left under RTL. Without a
 * width the card stretches to fill the parent minus its margins.
 */
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

/**
 * Isolate LTR geometry (range sliders, min–max rows, ₪ inputs).
 * Always set direction so native RTL and web match Figma (web supports inline direction).
 */
export const forceLtrStyle = {direction: 'ltr'};

/** Force RTL on a container (native). Web relies on I18nManager / document dir. */
export const forceRtlStyle =
  Platform.OS === 'web' ? {} : {direction: 'rtl'};

/**
 * Absolute `left` that lands on a PHYSICAL x from measureInWindow.
 *
 * Native forceRTL + swapLeftAndRightInRTL mirrors authored `left` to the
 * physical right (0 = physical right). Pre-flip so the view's left edge sits
 * at physical `x`. Web does not mirror absolute `left` — use `x` as-is.
 */
export function physicalLeftStyle(x, width, parentWidth) {
  const px = Math.round(Number(x) || 0);
  const w = Math.max(0, Math.round(Number(width) || 0));
  const parentW = Math.max(0, Math.round(Number(parentWidth) || 0));
  const nativeRtl = Platform.OS !== 'web' && I18nManager.isRTL;
  return {
    left: nativeRtl && parentW > 0 ? parentW - px - w : px,
    width: w,
    maxWidth: w,
  };
}

/** Bottom safe-area padding for filter sheets / bottom chrome (min 8px). */
export function getSheetBottomInset(insets, min = 8) {
  return Math.max(Number(insets?.bottom) || 0, min);
}

export const RANGE_SLIDER_THUMB_SIZE = 22;

function useNativeRtlSliderMirror() {
  return Platform.OS !== 'web' && I18nManager.isRTL;
}

/** Under swapLeftAndRightInRTL, `left`/`width` % are mirrored — flip percent on native. */
function mirrorSliderPercent(percent) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  return useNativeRtlSliderMirror() ? 100 - p : p;
}

/**
 * Dual-handle range slider thumb. Uses `left` % (reliable on screen under RTL swap).
 */
export function rangeSliderThumbStyle(
  _trackWidth,
  percent,
  thumbSize = RANGE_SLIDER_THUMB_SIZE,
) {
  const p = mirrorSliderPercent(percent);
  return {
    left: `${p}%`,
    marginLeft: -thumbSize / 2,
  };
}

/**
 * Dual-handle range slider thumb — for containers with `forceLtrStyle`.
 * Always anchors from the physical left via translateX (RTL-proof on Android).
 */
export function rangeSliderThumbLtrVisualStyle(
  trackWidth,
  percent,
  thumbSize = RANGE_SLIDER_THUMB_SIZE,
) {
  const w = Math.max(0, Number(trackWidth) || 0);
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  if (w <= 0) {
    return {opacity: 0};
  }
  const x = Math.max(0, Math.min(w, (p / 100) * w)) - thumbSize / 2;
  return {left: 0, transform: [{translateX: x}]};
}

/** Single-thumb slider: filled segment from `percent` to the track end (LTR visual, pixel-based). */
export function rangeSliderTrailingFillLtrVisualStyle(trackWidth, percent) {
  const w = Math.max(0, Number(trackWidth) || 0);
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const start = (p / 100) * w;
  return {
    left: 0,
    width: Math.max(0, w - start),
    transform: [{translateX: start}],
  };
}

/** Dual-handle range slider fill between min and max (LTR visual, pixel-based). */
export function rangeSliderFillLtrVisualStyle(
  trackWidth,
  minPercent,
  maxPercent,
) {
  const w = Math.max(0, Number(trackWidth) || 0);
  const minP = Math.max(0, Math.min(100, Number(minPercent) || 0));
  const maxP = Math.max(0, Math.min(100, Number(maxPercent) || 0));
  const start = (minP / 100) * w;
  const width = Math.max(0, ((maxP - minP) / 100) * w);
  return {left: 0, width, transform: [{translateX: start}]};
}

/** Dual-handle range slider fill between min and max. */
export function rangeSliderFillStyle(_trackWidth, minPercent, maxPercent) {
  const minP = Math.max(0, Math.min(100, Number(minPercent) || 0));
  const maxP = Math.max(0, Math.min(100, Number(maxPercent) || 0));

  if (useNativeRtlSliderMirror()) {
    return {
      left: `${100 - minP}%`,
      width: `${Math.max(0, maxP - minP)}%`,
    };
  }

  return {
    left: `${minP}%`,
    width: `${Math.max(0, maxP - minP)}%`,
  };
}

/**
 * Map a pan/touch to 0–100% along an LTR range track.
 * Prefer pageX + measureInWindow. Sliders use forceLtrStyle so locationX is LTR too.
 */
export function getRangeSliderPercentFromEvent(
  nativeEvent,
  trackWidth,
  windowX = 0,
  sliderViewRef,
) {
  const w = Math.max(1, Number(trackWidth) || 1);
  const ne = nativeEvent;
  const touch = ne.touches?.[0] || ne;
  const pageX =
    typeof touch.pageX === 'number' && !Number.isNaN(touch.pageX)
      ? touch.pageX
      : typeof ne.pageX === 'number' && !Number.isNaN(ne.pageX)
        ? ne.pageX
        : null;

  if (pageX != null && typeof windowX === 'number' && !Number.isNaN(windowX)) {
    const touchX = pageX - windowX;
    return Math.max(0, Math.min(100, (touchX / w) * 100));
  }

  const locationX =
    typeof touch.locationX === 'number' && !Number.isNaN(touch.locationX)
      ? touch.locationX
      : typeof ne.locationX === 'number' && !Number.isNaN(ne.locationX)
        ? ne.locationX
        : null;

  if (locationX != null) {
    return Math.max(0, Math.min(100, (locationX / w) * 100));
  }

  const node = sliderViewRef?.current;
  if (
    node &&
    typeof node.getBoundingClientRect === 'function' &&
    pageX != null
  ) {
    const rect = node.getBoundingClientRect();
    const x = pageX - rect.left;
    return Math.max(0, Math.min(100, (x / (rect.width || w)) * 100));
  }

  return 0;
}

/** Single-thumb slider: filled segment from `percent` to the track end (e.g. distance slider). */
export function rangeSliderTrailingFillStyle(_trackWidth, percent) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));

  if (useNativeRtlSliderMirror()) {
    return {
      left: `${100 - p}%`,
      right: 0,
    };
  }

  return {
    left: `${p}%`,
    right: 0,
  };
}
