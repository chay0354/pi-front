/** Live post text, same placement rules as the mobile feed overlays. */

const DEFAULT_FONT_SIZE = 20;

const POST_TEXT_FONTS = [
  {family: 'Secular One', weight: 400},
  {family: 'IBM Plex Sans Hebrew', weight: 700},
  {family: 'Rubik', weight: 800},
  {family: 'Rubik', weight: 400},
  {family: 'Alef', weight: 400},
  {family: 'Noto Sans', weight: 400},
];

function lightenColor(hex, amount = 0.8) {
  if (typeof hex !== 'string') return hex;
  let h = hex.trim();
  if (h[0] === '#') h = h.slice(1);
  if (h.length !== 6) return hex;
  const num = parseInt(h, 16);
  if (!Number.isFinite(num)) return hex;
  const mix = ch => Math.round(ch + (255 - ch) * amount);
  const toHex = v => v.toString(16).padStart(2, '0');
  return `#${toHex(mix((num >> 16) & 255))}${toHex(mix((num >> 8) & 255))}${toHex(mix(num & 255))}`;
}

export function postTextFont(index) {
  return POST_TEXT_FONTS[index] || POST_TEXT_FONTS[0];
}

export function postTextVisual(baseColor, bgMode = 0) {
  const color = baseColor || '#FFFFFF';
  if (bgMode === 1) return {textColor: '#FFFFFF', backgroundColor: color};
  if (bgMode === 2) return {textColor: color, backgroundColor: lightenColor(color, 0.8)};
  return {textColor: color, backgroundColor: 'transparent'};
}

/** Phone-shaped frame centered in the card, same idea as the mobile letterbox. */
export function postTextFrame(cellWidth, cellHeight, previewWidth, previewHeight) {
  const aspect = previewWidth > 0 && previewHeight > 0 ? previewWidth / previewHeight : 9 / 16;
  const cw = Math.max(0, cellWidth);
  const ch = Math.max(0, cellHeight);
  let width = cw;
  let height = width / aspect;
  if (height > ch) {
    height = ch;
    width = height * aspect;
  }
  return {
    width,
    height,
    left: (cw - width) / 2,
    top: (ch - height) / 2,
  };
}

/** Place one saved block on the phone-shaped frame (not the wide card). */
export function layoutPostTextBlock(block, {previewWidth, previewHeight, feedWidth, feedHeight}) {
  const nx = Number(block.nx);
  const ny = Number(block.ny);
  const nw = Number(block.nw);
  const nFont = Number(block.nFont);
  const nFontW = Number(block.nFontW);
  const authored = Number(block.fontSize) > 0 ? Number(block.fontSize) : DEFAULT_FONT_SIZE;
  const normalized =
    block.coords === 'normalized' ||
    (Number.isFinite(nx) && Number.isFinite(ny) && nx >= -0.5 && nx <= 1.5 && ny >= -0.5 && ny <= 1.5);

  if (normalized && Number.isFinite(nx) && Number.isFinite(ny)) {
    const rawFont =
      Number.isFinite(nFontW) && nFontW > 0
        ? nFontW * feedWidth
        : Number.isFinite(nFont) && nFont > 0 && previewWidth > 0 && previewHeight > 0
          ? nFont * previewHeight * (feedWidth / previewWidth)
          : Number.isFinite(nFont) && nFont > 0
            ? nFont * feedHeight
            : authored * (previewWidth > 0 ? feedWidth / previewWidth : 1);
    const fontSize = Math.max(10, Math.round(rawFont));
    const chip = Number(block.bgMode) > 0 ? Math.ceil(20 * (fontSize / authored)) : 0;
    const baseWidth = Number.isFinite(nw) && nw > 0 ? nw * feedWidth : feedWidth * 0.88;
    return {
      x: Math.round(nx * feedWidth),
      y: Math.round(ny * feedHeight),
      width: Math.ceil(baseWidth + 2 + chip),
      fontSize,
      lineHeight: Math.round(fontSize * 1.15),
      chipScale: fontSize / authored,
    };
  }

  const hasPreview = previewWidth > 0 && previewHeight > 0;
  const scaleX = hasPreview ? feedWidth / previewWidth : 1;
  const scaleY = hasPreview ? feedHeight / previewHeight : 1;
  const fontSize = Math.max(10, Math.round(authored * (hasPreview ? Math.min(scaleX, scaleY) : 1)));
  const chip = Number(block.bgMode) > 0 ? Math.ceil(20 * (fontSize / authored)) : 0;
  return {
    x: Math.round((Number(block.x) || 0) * scaleX),
    y: Math.round((Number(block.y) || 0) * scaleY),
    width: Math.ceil((Number(block.maxWidth) > 0 ? Number(block.maxWidth) * scaleX : feedWidth * 0.88) + 2 + chip),
    fontSize,
    lineHeight: Math.round(fontSize * 1.15),
    chipScale: fontSize / authored,
  };
}
