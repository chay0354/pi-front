/** Frame stroke color of each category tile variant (from its Figma rectangle SVG). */
const TILE_COLORS = {
  Variant12: '#FFDB61',
  Variant13: '#6854D8',
  Variant14: '#20BE6C',
  Variant15: '#00A7E4',
  Variant16: '#E39513',
  Variant17: '#A072F0',
  Variant18: '#A072F0',
  Variant19: '#ADFF90',
  Variant20: '#277DEA',
  apartments: '#60E7FF',
};

const cache = new Map();

/** Selected-tile glow ellipse (same geometry as the Figma one), tinted with the tile's color. */
export function tileGlowSrc(variant) {
  const color = TILE_COLORS[variant] || TILE_COLORS.Variant20;
  if (cache.has(color)) return cache.get(color);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="198" height="67" viewBox="0 0 198 67" fill="none" preserveAspectRatio="none" overflow="visible">` +
    `<g opacity="0.8" filter="url(#f)"><ellipse cx="99" cy="33.5" rx="85" ry="19.5" fill="url(#g)" fill-opacity="0.75"/></g>` +
    `<defs><filter id="f" x="0" y="0" width="198" height="67" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">` +
    `<feGaussianBlur stdDeviation="7"/></filter>` +
    `<radialGradient id="g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(99 33.5) scale(91.1818 20.9182)">` +
    `<stop stop-color="${color}"/><stop offset="0.879808" stop-color="${color}" stop-opacity="0"/></radialGradient></defs></svg>`;
  const src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  cache.set(color, src);
  return src;
}
