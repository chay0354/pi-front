/**
 * Helpers for porting React Native style props to the web.
 *
 * Style props coming from the ad form keep the mobile shape (RN keys, dp numbers).
 * `toWebStyle` flattens them, scales dp → web px (the form column is ~1.3× the phone)
 * and maps RN-only keys. Mobile runs with forceRTL + swapLeftAndRightInRTL, so
 * `left/right` and `marginLeft/Right` mean start/end — they map to logical CSS
 * properties, which flip the same way inside `dir="ltr"` subtrees.
 */

export const DP = 1.3;

export const dp = value => Math.round(Number(value) * DP * 2) / 2;

export const cx = (...names) => names.filter(Boolean).join(' ');

const UNITLESS = new Set(['flex', 'flexGrow', 'flexShrink', 'opacity', 'zIndex', 'fontWeight', 'aspectRatio', 'order']);

const RENAME = {
  marginHorizontal: 'marginInline',
  marginVertical: 'marginBlock',
  paddingHorizontal: 'paddingInline',
  paddingVertical: 'paddingBlock',
  marginLeft: 'marginInlineStart',
  marginRight: 'marginInlineEnd',
  marginStart: 'marginInlineStart',
  marginEnd: 'marginInlineEnd',
  paddingLeft: 'paddingInlineStart',
  paddingRight: 'paddingInlineEnd',
  paddingStart: 'paddingInlineStart',
  paddingEnd: 'paddingInlineEnd',
  left: 'insetInlineStart',
  right: 'insetInlineEnd',
  start: 'insetInlineStart',
  end: 'insetInlineEnd',
  borderLeftWidth: 'borderInlineStartWidth',
  borderRightWidth: 'borderInlineEndWidth',
  borderLeftColor: 'borderInlineStartColor',
  borderRightColor: 'borderInlineEndColor',
  borderTopLeftRadius: 'borderStartStartRadius',
  borderTopRightRadius: 'borderStartEndRadius',
  borderBottomLeftRadius: 'borderEndStartRadius',
  borderBottomRightRadius: 'borderEndEndRadius',
};

const DROP = new Set([
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
  'elevation',
  'resizeMode',
  'writingDirection',
  'textAlignVertical',
  'includeFontPadding',
  'tintColor',
  'textShadowColor',
  'textShadowOffset',
  'textShadowRadius',
  'textDecorationLine',
]);

const FONT_WEIGHTS = {
  'Rubik-Light': 300,
  'Rubik-Regular': 400,
  'Rubik-Medium': 500,
  'Rubik-SemiBold': 600,
  'Rubik-Bold': 700,
  'Rubik-ExtraBold': 800,
};

/** `StyleSheet.flatten` equivalent. */
export function flatten(style, out = {}) {
  if (!style) return out;
  if (Array.isArray(style)) {
    for (const s of style) flatten(s, out);
    return out;
  }
  if (typeof style === 'object') Object.assign(out, style);
  return out;
}

function transformToCss(list) {
  if (!Array.isArray(list)) return typeof list === 'string' ? list : undefined;
  return list
    .map(t => {
      const [key, val] = Object.entries(t || {})[0] || [];
      if (!key) return '';
      if (key.startsWith('translate')) return `${key}(${typeof val === 'number' ? dp(val) + 'px' : val})`;
      if (key.startsWith('rotate') || key.startsWith('skew')) return `${key}(${val})`;
      return `${key}(${val})`;
    })
    .join(' ');
}

/** RN style (object / array / falsy) → React DOM inline style. */
export function toWebStyle(style) {
  const flat = flatten(style);
  const out = {};
  for (const [key, value] of Object.entries(flat)) {
    if (value === undefined || DROP.has(key)) continue;
    if (key === 'fontFamily') {
      const w = FONT_WEIGHTS[value];
      if (w && flat.fontWeight == null) out.fontWeight = w;
      continue;
    }
    if (key === 'transform') {
      out.transform = transformToCss(value);
      continue;
    }
    if (key === 'textAlign') {
      out.textAlign = value === 'left' || value === 'right' ? 'start' : value;
      continue;
    }
    const target = RENAME[key] || key;
    out[target] = typeof value === 'number' && !UNITLESS.has(key) ? dp(value) : value;
  }
  if (flat.textDecorationLine) out.textDecoration = flat.textDecorationLine;
  return out;
}

/** expo-linear-gradient props → CSS `linear-gradient(...)` (physical direction). */
export function gradientCss({colors = [], locations, start = {x: 0.5, y: 0}, end = {x: 0.5, y: 1}} = {}) {
  const dx = (end?.x ?? 0.5) - (start?.x ?? 0.5);
  const dy = (end?.y ?? 1) - (start?.y ?? 0);
  const angle = Math.round(((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360);
  const stops = colors.map((c, i) => {
    const loc = Array.isArray(locations) ? locations[i] : undefined;
    return typeof loc === 'number' ? `${c} ${Math.round(loc * 10000) / 100}%` : c;
  });
  return `linear-gradient(${angle}deg, ${stops.join(', ')})`;
}

/** Forward a DOM node to an object ref or callback ref (mobile passes either). */
export function assignRef(ref, node) {
  if (!ref) return;
  if (typeof ref === 'function') ref(node);
  else ref.current = node;
}

/** `Image` source → URL (`require()` result, `{uri}`, or a string). */
export function imageSrc(source) {
  if (!source) return '';
  if (typeof source === 'string') return source;
  return source.uri || source.default || '';
}

/** Hidden file inputs sit inside clickable areas; a programmatic `.click()` must not bubble back. */
export const stopClick = e => e.stopPropagation();
