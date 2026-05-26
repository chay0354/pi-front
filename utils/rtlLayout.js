import {I18nManager, Platform} from 'react-native';

/**
 * RTL layout helpers (flex/text alignment). Kept separate from index.js to avoid
 * require cycles: screens must not import from the app entry barrel.
 */
export const textAlign = 'left';
export const flexEnd = 'flex-end';
export const flexStart = 'flex-start';

/**
 * Isolate LTR geometry (range sliders, min–max rows, ₪ inputs).
 * Always set direction so native RTL and web match Figma (web supports inline direction).
 */
export const forceLtrStyle = {direction: 'ltr'};

/** Force RTL on a container (native). Web relies on I18nManager / document dir. */
export const forceRtlStyle =
  Platform.OS === 'web' ? {} : {direction: 'rtl'};

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
