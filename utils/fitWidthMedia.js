/**
 * Fit media to full container width (edge-to-edge left/right).
 * Height follows the natural aspect ratio — shorter media letterboxes
 * top/bottom; taller media may clip top/bottom inside an overflow:hidden parent.
 * Never creates side bars / never crops left or right.
 */
export function fitWidthMediaLayout(containerW, naturalW, naturalH) {
  const cw = Math.max(1, Number(containerW) || 1);
  const w = Number(naturalW) || 0;
  const h = Number(naturalH) || 0;
  if (w <= 0 || h <= 0) {
    return null;
  }
  return {
    width: cw,
    height: cw * (h / w),
  };
}

/** Normalize expo-av naturalSize (portrait orientation swap). */
export function normalizeNaturalSize(ns) {
  if (!ns) return null;
  let w = Number(ns.width) || 0;
  let h = Number(ns.height) || 0;
  if (w <= 0 || h <= 0) return null;
  if (ns.orientation === 'portrait' && w > h) {
    return {width: h, height: w};
  }
  return {width: w, height: h};
}
