/** WeakMap cache: svg builder fn -> (color -> xml string). Avoids re-parsing SvgXml on every render. */
const svgXmlByBuilder = new WeakMap();

export function getCachedSvgXml(svgBuilder, color) {
  if (typeof svgBuilder !== 'function') return null;
  const colorKey = String(color ?? '');
  let byColor = svgXmlByBuilder.get(svgBuilder);
  if (!byColor) {
    byColor = new Map();
    svgXmlByBuilder.set(svgBuilder, byColor);
  }
  if (!byColor.has(colorKey)) {
    byColor.set(colorKey, svgBuilder(colorKey));
  }
  return byColor.get(colorKey);
}
