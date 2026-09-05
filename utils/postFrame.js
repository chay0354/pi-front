import {useEffect, useState} from 'react';
import {Dimensions} from 'react-native';
import {letterboxRect} from './postTextOverlay';

/**
 * Single source of truth for how a feed post is laid out.
 *
 * The TikTok feed page is the reference frame: it registers its live size here,
 * and every other surface (profile grid, ערוך/פרסם cards, hashtag explore, chat,
 * share sheet, sales image) letterboxes that same frame into its cell. Text and
 * media are then placed on identical geometry everywhere, so a post can never
 * look different from screen to screen.
 */

let feedPageSize = null;
const listeners = new Set();

/** Called by the feed with its real page box (screen width × page height). */
export function setFeedPostPageSize(width, height) {
  const w = Math.round(Number(width) || 0);
  const h = Math.round(Number(height) || 0);
  if (!(w > 0) || !(h > 0)) return;
  if (feedPageSize && feedPageSize.width === w && feedPageSize.height === h) {
    return;
  }
  feedPageSize = {width: w, height: h};
  listeners.forEach(listener => {
    try {
      listener(feedPageSize);
    } catch (_) {
      /* a bad subscriber must not break the feed */
    }
  });
}

export function getFeedPostPageSize() {
  return feedPageSize;
}

function subscribeFeedPostPageSize(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-render a preview when the feed reports (or changes) its page size. */
export function useFeedPostPageSize() {
  const [size, setSize] = useState(feedPageSize);
  useEffect(() => subscribeFeedPostPageSize(setSize), []);
  return size;
}

/**
 * Aspect (width/height) of the post frame. Prefers the live feed page, then the
 * canvas the post was authored on, then the phone screen.
 */
export function resolvePostFrameAspect(overlayPayload, pageSize = feedPageSize) {
  if (pageSize?.width > 0 && pageSize?.height > 0) {
    return pageSize.width / pageSize.height;
  }
  const pw = Number(overlayPayload?.previewWidth) || 0;
  const ph = Number(overlayPayload?.previewHeight) || 0;
  if (pw > 0 && ph > 0) return pw / ph;
  const {width, height} = Dimensions.get('window');
  if (width > 0 && height > 0) return width / height;
  return 9 / 16;
}

/** Aspect for a card whose media area should be shaped like a feed page. */
export function usePostFrameAspect(overlayPayload = null) {
  const pageSize = useFeedPostPageSize();
  return resolvePostFrameAspect(overlayPayload, pageSize);
}

/** The post frame centered inside a cell — same shape as a feed page. */
export function resolvePostFrameInCell(
  cellWidth,
  cellHeight,
  overlayPayload,
  pageSize = feedPageSize,
) {
  return letterboxRect(
    cellWidth,
    cellHeight,
    resolvePostFrameAspect(overlayPayload, pageSize),
  );
}

/**
 * Fit the post to the cell width (same scale as the feed, just narrower) and
 * let top/bottom overflow. The cell clips those edges — used when a card must
 * keep its original height without shrinking the post.
 */
export function resolvePostFrameCoverWidth(
  cellWidth,
  cellHeight,
  overlayPayload,
  pageSize = feedPageSize,
) {
  const aspect = resolvePostFrameAspect(overlayPayload, pageSize);
  const cw = Math.max(0, Number(cellWidth) || 0);
  const ch = Math.max(0, Number(cellHeight) || 0);
  if (!(cw > 0) || !(ch > 0) || !(aspect > 0)) {
    return {width: cw, height: ch, left: 0, top: 0};
  }
  const width = cw;
  const height = cw / aspect;
  return {
    width,
    height,
    left: 0,
    top: (ch - height) / 2,
  };
}
