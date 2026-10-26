import html2canvas from 'html2canvas';

/** `#pi-stage` is CSS-scaled. Visual pixels are not the editor's font pixels. */
export function stageCssScale(node) {
  const stage =
    (node && typeof node.closest === 'function' && node.closest('#pi-stage')) ||
    (typeof document !== 'undefined' ? document.getElementById('pi-stage') : null);
  if (!stage) return 1;
  const visual = stage.getBoundingClientRect().width;
  const css = stage.offsetWidth;
  if (!(visual > 0) || !(css > 0)) return 1;
  return visual / css;
}

/** Bounding box in the same CSS pixels `fontSize` is authored in. */
export function measureCssBox(node) {
  if (!node || typeof node.getBoundingClientRect !== 'function') return null;
  const rect = node.getBoundingClientRect();
  if (!(rect.width > 0) || !(rect.height >= 0) || !Number.isFinite(rect.left) || !Number.isFinite(rect.top)) {
    return null;
  }
  const scale = stageCssScale(node);
  return {
    x: rect.left / scale,
    y: rect.top / scale,
    w: rect.width / scale,
    h: rect.height / scale,
  };
}

export async function capturePostPreviewToDataUrl(domElement, options = {}) {
  if (typeof document === 'undefined' || !domElement) {
    throw new Error('Web capture requires a DOM element');
  }
  const {minShortSidePx = 1080, jpegQuality = 0.95, maxScale = 4} = options;

  // offsetWidth ignores the stage transform, so the bitmap keeps the same
  // text-to-frame ratio the editor shows.
  const shortSideCss = Math.min(domElement.offsetWidth, domElement.offsetHeight) || 400;
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
  const scaleForResolution = minShortSidePx / shortSideCss;
  const scale = Math.min(maxScale, Math.max(2, dpr, scaleForResolution));

  const stage = document.getElementById('pi-stage');
  const stageW = stage?.offsetWidth || 0;
  const stageH = stage?.offsetHeight || 0;

  const canvas = await html2canvas(domElement, {
    useCORS: true,
    allowTaint: true,
    logging: false,
    scale,
    backgroundColor: null,
    ...(stageW > 0 && stageH > 0 ? {windowWidth: stageW, windowHeight: stageH, scrollX: 0, scrollY: 0} : {}),
    onclone: doc => {
      const cloned = doc.getElementById('pi-stage');
      if (!cloned || !(stageW > 0) || !(stageH > 0)) return;
      cloned.style.transform = 'none';
      cloned.style.width = `${stageW}px`;
      cloned.style.height = `${stageH}px`;
    },
  });
  return canvas.toDataURL('image/jpeg', jpegQuality);
}

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
