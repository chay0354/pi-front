/**
 * Web: capture preview DOM as JPEG data URL (replaces view-shot captureRef).
 */
import html2canvas from 'html2canvas';

/**
 * @param {HTMLElement} domElement
 * @returns {Promise<string>} data:image/jpeg;base64,...
 */
export async function capturePostPreviewToDataUrl(domElement) {
  if (typeof document === 'undefined' || !domElement) {
    throw new Error('Web capture requires a DOM element');
  }
  const scale = Math.min(
    2,
    (typeof window !== 'undefined' && window.devicePixelRatio) || 1,
  );
  const canvas = await html2canvas(domElement, {
    useCORS: true,
    allowTaint: true,
    logging: false,
    scale,
    backgroundColor: null,
  });
  return canvas.toDataURL('image/jpeg', 0.9);
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
