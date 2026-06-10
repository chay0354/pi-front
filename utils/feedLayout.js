/** Figma bottom bar content height — excludes device safe-area inset. */
export const FEED_BOTTOM_BAR_CONTENT_HEIGHT = 74;

/** Gap (px) between TikTok feed overlay chrome and the top of the bottom bar. */
export const FEED_OVERLAY_ABOVE_BAR_GAP = 12;

/** Gap (px) below the top bar for slideshow page-indicator dots. */
export const FEED_IMAGE_INDICATOR_TOP_GAP = 8;

/** Screen `top` for image swipe dots (below top bar, all devices). */
export function feedImageIndicatorTop(topBarHeight = 0) {
  const top = Math.max(0, Number(topBarHeight) || 0);
  return top + FEED_IMAGE_INDICATOR_TOP_GAP;
}

/** Total height of the bottom bar (content + home-indicator inset). */
export function feedBottomBarHeight(bottomInset = 0) {
  const safe = Math.max(0, Number(bottomInset) || 0);
  return FEED_BOTTOM_BAR_CONTENT_HEIGHT + safe;
}

/** Screen `bottom` for the feed chrome layer (bar top + gap). */
export function feedChromeScreenBottom(bottomBarHeight = 0) {
  const bar = Math.max(0, Number(bottomBarHeight) || 0);
  return bar + FEED_OVERLAY_ABOVE_BAR_GAP;
}
