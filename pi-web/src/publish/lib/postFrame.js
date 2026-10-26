import {useEffect, useState} from 'react';
import {letterboxRect} from './postTextOverlay';

/**
 * Single source of truth for how a feed post is laid out (port of mobile utils/postFrame.js).
 * A feed page can register its live size; every preview letterboxes that same frame.
 * Without a registered page the frame falls back to the authored canvas, then a phone 9:16.
 */

let feedPageSize = null;
const listeners = new Set();

export function setFeedPostPageSize(width, height) {
  const w = Math.round(Number(width) || 0);
  const h = Math.round(Number(height) || 0);
  if (!(w > 0) || !(h > 0)) return;
  if (feedPageSize && feedPageSize.width === w && feedPageSize.height === h) return;
  feedPageSize = {width: w, height: h};
  listeners.forEach(listener => {
    try {
      listener(feedPageSize);
    } catch {
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

export function useFeedPostPageSize() {
  const [size, setSize] = useState(feedPageSize);
  useEffect(() => subscribeFeedPostPageSize(setSize), []);
  return size;
}

export function resolvePostFrameAspect(overlayPayload, pageSize = feedPageSize) {
  if (pageSize?.width > 0 && pageSize?.height > 0) return pageSize.width / pageSize.height;
  const pw = Number(overlayPayload?.previewWidth) || 0;
  const ph = Number(overlayPayload?.previewHeight) || 0;
  if (pw > 0 && ph > 0) return pw / ph;
  return 9 / 16;
}

export function usePostFrameAspect(overlayPayload = null) {
  const pageSize = useFeedPostPageSize();
  return resolvePostFrameAspect(overlayPayload, pageSize);
}

export function resolvePostFrameInCell(cellWidth, cellHeight, overlayPayload, pageSize = feedPageSize) {
  return letterboxRect(cellWidth, cellHeight, resolvePostFrameAspect(overlayPayload, pageSize));
}

export function resolvePostFrameCoverWidth(cellWidth, cellHeight, overlayPayload, pageSize = feedPageSize) {
  const aspect = resolvePostFrameAspect(overlayPayload, pageSize);
  const cw = Math.max(0, Number(cellWidth) || 0);
  const ch = Math.max(0, Number(cellHeight) || 0);
  if (!(cw > 0) || !(ch > 0) || !(aspect > 0)) return {width: cw, height: ch, left: 0, top: 0};
  const height = cw / aspect;
  return {width: cw, height, left: 0, top: (ch - height) / 2};
}

export function resolvePostFrameCoverCell(cellWidth, cellHeight, overlayPayload, pageSize = feedPageSize) {
  const aspect = resolvePostFrameAspect(overlayPayload, pageSize);
  const cw = Math.max(0, Number(cellWidth) || 0);
  const ch = Math.max(0, Number(cellHeight) || 0);
  if (!(cw > 0) || !(ch > 0) || !(aspect > 0)) return {width: cw, height: ch, left: 0, top: 0};
  let width = cw;
  let height = cw / aspect;
  if (height < ch) {
    height = ch;
    width = ch * aspect;
  }
  return {width, height, left: (cw - width) / 2, top: (ch - height) / 2};
}
