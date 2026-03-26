/**
 * Web: capture preview DOM as JPEG data URL (replaces view-shot captureRef).
 */
import html2canvas from 'html2canvas';

/**
 * @param {HTMLElement} domElement
 * @param {{ minShortSidePx?: number, jpegQuality?: number, maxScale?: number }} [options]
 * @returns {Promise<string>} data:image/jpeg;base64,...
 */
export async function capturePostPreviewToDataUrl(domElement, options = {}) {
  if (typeof document === 'undefined' || !domElement) {
    throw new Error('Web capture requires a DOM element');
  }
  const {
    minShortSidePx = 1080,
    jpegQuality = 0.95,
    maxScale = 4,
  } = options;

  const rect = domElement.getBoundingClientRect();
  const shortSideCss = Math.min(rect.width, rect.height) || 400;
  const dpr =
    typeof window !== 'undefined' && window.devicePixelRatio
      ? window.devicePixelRatio
      : 1;
  // At least 2× so DPR=1 desktops are not blurry; scale up layout so shorter axis reaches minShortSidePx.
  const scaleForResolution = minShortSidePx / shortSideCss;
  const scale = Math.min(
    maxScale,
    Math.max(2, dpr, scaleForResolution),
  );

  const canvas = await html2canvas(domElement, {
    useCORS: true,
    allowTaint: true,
    logging: false,
    scale,
    backgroundColor: null,
  });
  return canvas.toDataURL('image/jpeg', jpegQuality);
}

/**
 * @param {React.MutableRefObject} ref
 * @param {string} [nativeId]
 * @returns {HTMLElement|null}
 */
export function resolvePostPreviewDomNode(ref, nativeId) {
  const c = ref?.current;
  if (c && typeof c === 'object' && c.nodeType === 1) {
    return c;
  }
  if (typeof HTMLElement !== 'undefined' && c instanceof HTMLElement) {
    return c;
  }
  if (nativeId && typeof document !== 'undefined') {
    const byId = document.getElementById(nativeId);
    if (byId) return byId;
  }
  return null;
}
