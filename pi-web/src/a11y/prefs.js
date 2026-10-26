const STORAGE_KEY = 'pi_accessibility_prefs_v1';

export const FONT_SCALE_MIN = 1;
export const FONT_SCALE_MAX = 1.2;
export const FONT_SCALE_STEP = 0.1;

export const DEFAULT_ACCESSIBILITY_PREFS = {
  fontScale: 1,
  highContrast: false,
  readableFont: false,
  highlightLinks: false,
  reduceMotion: false,
};

const clampFontScale = value => {
  const n = Number(value);
  if (!Number.isFinite(n)) return FONT_SCALE_MIN;
  const snapped = Math.round(n / FONT_SCALE_STEP) * FONT_SCALE_STEP;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Number(snapped.toFixed(2))));
};

export function normalizeAccessibilityPrefs(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    fontScale: clampFontScale(src.fontScale),
    highContrast: src.highContrast === true,
    readableFont: src.readableFont === true,
    highlightLinks: src.highlightLinks === true,
    reduceMotion: src.reduceMotion === true,
  };
}

export function loadAccessibilityPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {...DEFAULT_ACCESSIBILITY_PREFS};
    return normalizeAccessibilityPrefs(JSON.parse(raw));
  } catch {
    return {...DEFAULT_ACCESSIBILITY_PREFS};
  }
}

export function saveAccessibilityPrefs(prefs) {
  const next = normalizeAccessibilityPrefs(prefs);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* in-memory prefs still apply */
  }
  return next;
}

export function stepFontScale(current, direction) {
  const delta = direction < 0 ? -FONT_SCALE_STEP : FONT_SCALE_STEP;
  return clampFontScale((Number(current) || 1) + delta);
}

const SKIP_FONT_TAGS = new Set(['SVG', 'PATH', 'IMG', 'VIDEO', 'CANVAS', 'PICTURE', 'SOURCE']);

let fontScaleLive = 1;
let fontObserver = null;
let fontPaintQueued = false;

/** True when the user turned animations off, or the browser asks for reduced motion. */
export function isReduceMotion() {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.classList.contains('pi-a11y-reduce-motion')) return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

function stageRoot() {
  return document.getElementById('pi-stage') || document.body;
}

function clearFontScale(el) {
  if (!el.dataset.piA11yFs && !el.dataset.piA11yBase) return;
  el.style.fontSize = '';
  el.style.lineHeight = '';
  delete el.dataset.piA11yFs;
  delete el.dataset.piA11yBase;
  delete el.dataset.piA11yLine;
}

function paintFonts(root, scale) {
  const reset = Math.abs(scale - 1) < 0.001;
  const scaleKey = String(scale);
  const nodes = root.querySelectorAll('*');
  for (const el of nodes) {
    if (SKIP_FONT_TAGS.has(el.tagName) || el.closest('svg')) continue;
    if (reset) {
      clearFontScale(el);
      continue;
    }
    let size = el.dataset.piA11yBase ? Number(el.dataset.piA11yBase) : NaN;
    let lineBase = el.dataset.piA11yLine ? Number(el.dataset.piA11yLine) : null;
    if (!Number.isFinite(size)) {
      const computed = parseFloat(getComputedStyle(el).fontSize);
      if (!Number.isFinite(computed) || computed <= 0) continue;
      size = computed;
      const line = getComputedStyle(el).lineHeight;
      lineBase = line.endsWith('px') ? parseFloat(line) : null;
      const parent = el.parentElement;
      if (parent?.dataset.piA11yBase && parent.style.fontSize) {
        const parentUsed = parseFloat(parent.style.fontSize);
        if (Number.isFinite(parentUsed) && Math.abs(computed - parentUsed) < 0.05) {
          size = Number(parent.dataset.piA11yBase);
        }
        if (lineBase != null && parent.style.lineHeight && parent.dataset.piA11yLine) {
          const parentLine = parseFloat(parent.style.lineHeight);
          if (Number.isFinite(parentLine) && Math.abs(lineBase - parentLine) < 0.05) {
            lineBase = Number(parent.dataset.piA11yLine);
          }
        }
      }
      el.dataset.piA11yBase = String(size);
      if (lineBase != null && Number.isFinite(lineBase)) el.dataset.piA11yLine = String(lineBase);
      else delete el.dataset.piA11yLine;
    }
    const expected = `${(size * scale).toFixed(2)}px`;
    if (el.dataset.piA11yFs === scaleKey && el.style.fontSize === expected) continue;
    el.style.fontSize = expected;
    if (lineBase != null && Number.isFinite(lineBase)) el.style.lineHeight = `${(lineBase * scale).toFixed(2)}px`;
    el.dataset.piA11yFs = scaleKey;
  }
}

function scheduleFontPaint() {
  if (fontPaintQueued || Math.abs(fontScaleLive - 1) < 0.001) return;
  fontPaintQueued = true;
  requestAnimationFrame(() => {
    fontPaintQueued = false;
    paintFonts(stageRoot(), fontScaleLive);
  });
}

function watchFontScale(scale) {
  fontScaleLive = scale;
  paintFonts(stageRoot(), scale);
  if (Math.abs(scale - 1) < 0.001) {
    fontObserver?.disconnect();
    fontObserver = null;
    return;
  }
  if (fontObserver) return;
  const root = stageRoot();
  fontObserver = new MutationObserver(scheduleFontPaint);
  fontObserver.observe(root, {childList: true, subtree: true});
}

function ensureA11yStyles() {
  let el = document.querySelector('style[data-pi-a11y]');
  if (!el) {
    el = document.createElement('style');
    el.setAttribute('data-pi-a11y', 'true');
    document.head.appendChild(el);
  }
  el.textContent = `
    html.pi-a11y-contrast,
    html.pi-a11y-contrast body,
    html.pi-a11y-contrast #pi-stage {
      background: #000 !important;
      color: #fff !important;
    }
    html.pi-a11y-contrast #pi-stage * {
      background-color: #000 !important;
      background-image: none !important;
      color: #fff !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    html.pi-a11y-contrast #pi-stage img,
    html.pi-a11y-contrast #pi-stage video,
    html.pi-a11y-contrast #pi-stage svg,
    html.pi-a11y-contrast #pi-stage canvas {
      background-color: transparent !important;
      background-image: none !important;
      color: inherit !important;
    }
    html.pi-a11y-contrast #pi-stage button,
    html.pi-a11y-contrast #pi-stage a,
    html.pi-a11y-contrast #pi-stage input,
    html.pi-a11y-contrast #pi-stage textarea,
    html.pi-a11y-contrast #pi-stage select {
      outline: 2px solid #ffe56a !important;
      outline-offset: 2px;
    }
    html.pi-a11y-readable body,
    html.pi-a11y-readable * {
      letter-spacing: 0.06em !important;
      word-spacing: 0.08em !important;
    }
    html.pi-a11y-links a,
    html.pi-a11y-links [role="link"],
    html.pi-a11y-links button {
      text-decoration: underline !important;
      text-underline-offset: 3px;
      outline: 2px solid #ffe56a !important;
      outline-offset: 2px;
    }
    html.pi-a11y-reduce-motion *,
    html.pi-a11y-reduce-motion *::before,
    html.pi-a11y-reduce-motion *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  `;
}

/** Classes and text scale the site actually honors. Zoom is not used — it clips the stage. */
export function applyAccessibilityRuntime(prefs) {
  const next = normalizeAccessibilityPrefs(prefs);
  const root = document.documentElement;
  root.classList.toggle('pi-a11y-contrast', next.highContrast);
  root.classList.toggle('pi-a11y-readable', next.readableFont);
  root.classList.toggle('pi-a11y-links', next.highlightLinks);
  root.classList.toggle('pi-a11y-reduce-motion', next.reduceMotion);
  root.style.setProperty('--pi-font-scale', String(next.fontScale));
  root.style.zoom = '';
  ensureA11yStyles();
  watchFontScale(next.fontScale);
  window.dispatchEvent(new CustomEvent('pi-a11y'));
}
