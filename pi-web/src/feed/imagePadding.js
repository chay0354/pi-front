/**
 * Finds solid-colour padding baked into an uploaded image (e.g. a portrait
 * photo exported onto a square dark canvas) so the feed can frame the photo
 * itself instead of the padding.
 */

const SAMPLE_MAX = 240;
const TOLERANCE = 18;
/** Ignore slivers: trim only when a side is at least this share of the image. */
const MIN_TRIM = 0.03;
const MIN_CONTENT = 0.2;

const near = (data, i, ref) =>
  Math.abs(data[i] - ref[0]) <= TOLERANCE &&
  Math.abs(data[i + 1] - ref[1]) <= TOLERANCE &&
  Math.abs(data[i + 2] - ref[2]) <= TOLERANCE;

/**
 * @returns {{x: number, y: number, width: number, height: number} | null}
 *   Content box in natural pixels, or null when there is no padding to trim
 *   (or the pixels can't be read, e.g. a host without CORS).
 */
export function detectImagePadding(img) {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh) return null;
  const scale = Math.min(1, SAMPLE_MAX / Math.max(nw, nh));
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));

  let data;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    ctx.drawImage(img, 0, 0, w, h);
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return null;
  }

  const px = (x, y) => (y * w + x) * 4;
  const ref = [data[0], data[1], data[2]];
  const rowSolid = y => {
    for (let x = 0; x < w; x++) if (!near(data, px(x, y), ref)) return false;
    return true;
  };
  const colSolid = (x, top, bottom) => {
    for (let y = top; y <= bottom; y++) if (!near(data, px(x, y), ref)) return false;
    return true;
  };

  let top = 0;
  while (top < h && rowSolid(top)) top++;
  let bottom = h - 1;
  while (bottom > top && rowSolid(bottom)) bottom--;
  if (top >= bottom) return null;
  let left = 0;
  while (left < w && colSolid(left, top, bottom)) left++;
  let right = w - 1;
  while (right > left && colSolid(right, top, bottom)) right--;

  const trims = [top / h, (h - 1 - bottom) / h, left / w, (w - 1 - right) / w];
  if (!trims.some(t => t >= MIN_TRIM)) return null;
  const cw = right - left + 1;
  const ch = bottom - top + 1;
  if (cw / w < MIN_CONTENT || ch / h < MIN_CONTENT) return null;

  return {
    x: left / scale,
    y: top / scale,
    width: cw / scale,
    height: ch / scale,
  };
}
