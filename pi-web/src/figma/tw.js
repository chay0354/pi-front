/**
 * Converts the Tailwind subset emitted by Figma's code export into React inline
 * styles. Only used by generated illustration layers (src/components/figma);
 * the rest of the app is styled with CSS modules.
 */

const cache = new Map();

const FONT_WEIGHTS = {
  Regular: 400,
  Medium: 500,
  SemiBold: 600,
  Bold: 700,
};

function arbitrary(raw) {
  let v = raw.replace(/\\/g, '');
  // Figma tokens: var(--token/name,fallback) — token names are not valid CSS idents.
  v = v.replace(/var\(--[^,()]+,([^()]*(?:\([^()]*\))?[^()]*)\)/g, '$1');
  v = v.replace(/_/g, ' ');
  v = v.replace(/calc\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_, inner) =>
    `calc(${inner.replace(/([\d.%a-z)])([+-])(?=[\d.(a-z])/gi, '$1 $2 ')})`,
  );
  return v;
}

function length(token) {
  if (token === 'full') return '100%';
  if (token === 'px') return '1px';
  if (token === '0') return 0;
  if (token === '1/2') return '50%';
  if (token.startsWith('[')) return arbitrary(token.slice(1, -1));
  return null;
}

function insetValues(v) {
  const parts = v.split(/\s+/);
  const [t, r = t, b = t, l = r] = parts;
  return {top: t, right: r, bottom: b, left: l};
}

function apply(style, transforms, cls) {
  const neg = cls.startsWith('-');
  const c = neg ? cls.slice(1) : cls;
  let m;

  switch (c) {
    case 'absolute':
    case 'relative':
      style.position = c;
      return;
    case 'block':
      style.display = 'block';
      return;
    case 'flex':
      style.display = 'flex';
      return;
    case 'contents':
      style.display = 'contents';
      return;
    case 'flex-col':
      style.flexDirection = 'column';
      return;
    case 'flex-none':
      style.flex = 'none';
      return;
    case 'shrink-0':
      style.flexShrink = 0;
      return;
    case 'content-stretch':
      style.alignContent = 'stretch';
      return;
    case 'items-center':
      style.alignItems = 'center';
      return;
    case 'items-start':
      style.alignItems = 'flex-start';
      return;
    case 'items-end':
      style.alignItems = 'flex-end';
      return;
    case 'justify-center':
      style.justifyContent = 'center';
      return;
    case 'justify-end':
      style.justifyContent = 'flex-end';
      return;
    case 'justify-between':
      style.justifyContent = 'space-between';
      return;
    case 'max-w-none':
      style.maxWidth = 'none';
      return;
    case 'overflow-clip':
      style.overflow = 'clip';
      return;
    case 'mix-blend-multiply':
      style.mixBlendMode = 'multiply';
      return;
    case 'whitespace-nowrap':
      style.whiteSpace = 'nowrap';
      return;
    case 'capitalize':
      style.textTransform = 'capitalize';
      return;
    case 'not-italic':
      style.fontStyle = 'normal';
      return;
    case 'font-normal':
      style.fontWeight = 400;
      return;
    case 'text-center':
      style.textAlign = 'center';
      return;
    case 'text-white':
      style.color = '#fff';
      return;
    case 'bg-white':
      style.background = '#fff';
      return;
    case 'bg-gradient-to-b':
      transforms.gradient = 'to bottom';
      return;
    case 'mask-alpha':
      style.maskMode = 'alpha';
      return;
    case 'mask-intersect':
      style.maskComposite = 'intersect';
      return;
    case 'mask-no-clip':
      style.maskClip = 'no-clip';
      return;
    case 'mask-no-repeat':
      style.maskRepeat = 'no-repeat';
      return;
    case 'inset-0':
      Object.assign(style, {top: 0, right: 0, bottom: 0, left: 0});
      return;
    case 'translate-x-1/2':
      transforms.tx = neg ? '-50%' : '50%';
      return;
    case 'translate-y-1/2':
      transforms.ty = neg ? '-50%' : '50%';
      return;
    case 'rotate-180':
      transforms.rotate = '180deg';
      return;
    case 'scale-x-100':
      transforms.sx = neg ? -1 : 1;
      return;
    case 'scale-y-100':
      transforms.sy = neg ? -1 : 1;
      return;
    default:
      break;
  }

  if ((m = c.match(/^\[([a-z-]+):(.+)\]$/))) {
    const prop = m[1].replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    style[prop] = arbitrary(m[2]);
    return;
  }
  if ((m = c.match(/^size-(.+)$/))) {
    const v = length(m[1]);
    if (v != null) style.width = style.height = v;
    return;
  }
  if ((m = c.match(/^(w|h|min-w)-(.+)$/))) {
    const v = length(m[2]);
    const prop = {w: 'width', h: 'height', 'min-w': 'minWidth'}[m[1]];
    if (v != null) style[prop] = v;
    return;
  }
  if ((m = c.match(/^(left|right|top|bottom)-(.+)$/))) {
    const v = length(m[2]);
    if (v != null) style[m[1]] = neg && typeof v === 'string' ? `-${v}` : v;
    return;
  }
  if ((m = c.match(/^inset-\[(.+)\]$/))) {
    Object.assign(style, insetValues(arbitrary(m[1])));
    return;
  }
  if ((m = c.match(/^(p[xytblr]?|m[xytblr]?)-\[(.+)\]$/))) {
    const v = arbitrary(m[2]);
    const kind = m[1][0] === 'p' ? 'padding' : 'margin';
    const side = m[1].slice(1);
    const map = {
      '': [''],
      x: ['Left', 'Right'],
      y: ['Top', 'Bottom'],
      t: ['Top'],
      b: ['Bottom'],
      l: ['Left'],
      r: ['Right'],
    };
    for (const s of map[side]) style[kind + s] = v;
    return;
  }
  if ((m = c.match(/^gap-\[(.+)\]$/))) {
    style.gap = arbitrary(m[1]);
    return;
  }
  if ((m = c.match(/^flex-\[(.+)\]$/))) {
    style.flex = arbitrary(m[1]);
    return;
  }
  if ((m = c.match(/^rotate-\[(.+)\]$/))) {
    const v = arbitrary(m[1]);
    transforms.rotate = neg ? `-${v}` : v;
    return;
  }
  if ((m = c.match(/^skew-x-\[(.+)\]$/))) {
    const v = arbitrary(m[1]);
    transforms.skew = neg ? `-${v}` : v;
    return;
  }
  if ((m = c.match(/^rounded-\[(.+)\]$/))) {
    style.borderRadius = arbitrary(m[1]);
    return;
  }
  if ((m = c.match(/^bg-\[(.+)\]$/))) {
    style.background = arbitrary(m[1]);
    return;
  }
  if ((m = c.match(/^from-\[(.+)\]$/))) {
    transforms.from = arbitrary(m[1]);
    return;
  }
  if ((m = c.match(/^to-\[(.+)\]$/))) {
    transforms.to = arbitrary(m[1]);
    return;
  }
  if ((m = c.match(/^drop-shadow-\[(.+)\]$/))) {
    style.filter = `drop-shadow(${arbitrary(m[1])})`;
    return;
  }
  if ((m = c.match(/^mask-position-\[(.+)\]$/))) {
    style.maskPosition = arbitrary(m[1]);
    return;
  }
  if ((m = c.match(/^mask-size-\[(.+)\]$/))) {
    style.maskSize = arbitrary(m[1]);
    return;
  }
  if ((m = c.match(/^leading-\[(.+)\]$/))) {
    style.lineHeight = arbitrary(m[1]);
    return;
  }
  if (c === 'leading-normal' || c === 'leading-[normal]') {
    style.lineHeight = 'normal';
    return;
  }
  if ((m = c.match(/^font-\['([^:]+):([^']+)'\]$/))) {
    style.fontFamily = `'${m[1]}', sans-serif`;
    style.fontWeight = FONT_WEIGHTS[m[2]] ?? 400;
    return;
  }
  if ((m = c.match(/^text-\[(.+)\]$/))) {
    const v = m[1];
    if (v.startsWith('color:')) style.color = arbitrary(v.slice(6));
    else if (v.startsWith('#') || v.startsWith('rgb')) style.color = arbitrary(v);
    else style.fontSize = arbitrary(v);
    return;
  }
}

export function tw(classes) {
  if (!classes) return undefined;
  const hit = cache.get(classes);
  if (hit) return hit;

  const style = {};
  const t = {};
  for (const cls of classes.split(/\s+/)) {
    if (cls) apply(style, t, cls);
  }
  if (t.tx || t.ty) style.translate = `${t.tx || 0} ${t.ty || 0}`;
  if (t.rotate) style.rotate = t.rotate;
  if (t.sx != null || t.sy != null) style.scale = `${t.sx ?? 1} ${t.sy ?? 1}`;
  if (t.skew) style.transform = `skewX(${t.skew})`;
  if (t.gradient) {
    style.background = `linear-gradient(${t.gradient}, ${t.from || 'transparent'}, ${t.to || 'transparent'})`;
  }

  cache.set(classes, style);
  return style;
}
