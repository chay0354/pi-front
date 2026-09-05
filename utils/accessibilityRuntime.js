import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {
  DEFAULT_ACCESSIBILITY_PREFS,
  normalizeAccessibilityPrefs,
} from './accessibilityPrefs';

let livePrefs = {...DEFAULT_ACCESSIBILITY_PREFS};
let patched = false;
let webStylesInjected = false;

export function getLiveAccessibilityPrefs() {
  return livePrefs;
}

export function applyAccessibilityRuntime(prefs) {
  livePrefs = normalizeAccessibilityPrefs(prefs);
  applyDefaultProps();
  applyWebClasses(livePrefs);
  ensurePatched();
}

function applyDefaultProps() {
  if (Text.defaultProps == null) Text.defaultProps = {};
  Text.defaultProps.allowFontScaling = false;
  Text.defaultProps.maxFontSizeMultiplier = 1;

  if (TextInput.defaultProps == null) TextInput.defaultProps = {};
  TextInput.defaultProps.allowFontScaling = false;
  TextInput.defaultProps.maxFontSizeMultiplier = 1;
}

function flattenStyle(style) {
  if (style == null) return {};
  try {
    return StyleSheet.flatten(style) || {};
  } catch (_) {
    return {};
  }
}

function scaleTextStyle(flat, scale) {
  if (!scale || Math.abs(scale - 1) < 0.001) return null;
  if (typeof flat.fontSize !== 'number') return null;
  const next = {fontSize: flat.fontSize * scale};
  if (typeof flat.lineHeight === 'number') {
    next.lineHeight = flat.lineHeight * scale;
  }
  return next;
}

function isLightishColor(color) {
  if (typeof color !== 'string') return false;
  const c = color.trim().toLowerCase();
  return (
    c === '#fff' ||
    c === '#ffffff' ||
    c === 'white' ||
    c === '#fee787' ||
    c === '#ffe56a' ||
    c === '#f5e6a8' ||
    c === '#fff8dc'
  );
}

function decorateTextProps(props) {
  if (!props) return props;
  const prefs = livePrefs;
  const flat = flattenStyle(props.style);
  const extras = [];

  const scaled = scaleTextStyle(flat, prefs.fontScale);
  if (scaled) extras.push(scaled);

  if (prefs.highContrast) {
    extras.push({
      color: isLightishColor(flat.color) ? flat.color || '#FFFFFF' : '#FFE56A',
    });
  }

  if (prefs.readableFont) {
    extras.push({
      letterSpacing: Math.max(Number(flat.letterSpacing) || 0, 0.65),
    });
  }

  if (prefs.highlightLinks && props.accessibilityRole === 'link') {
    extras.push({
      textDecorationLine: 'underline',
      textDecorationColor: '#FFE56A',
    });
  }

  if (extras.length === 0) {
    return {
      ...props,
      allowFontScaling: false,
    };
  }

  return {
    ...props,
    allowFontScaling: false,
    style: [props.style, extras],
  };
}

function decorateInputProps(props) {
  if (!props) return props;
  const prefs = livePrefs;
  const flat = flattenStyle(props.style);
  const extras = [];

  const scaled = scaleTextStyle(flat, prefs.fontScale);
  if (scaled) extras.push(scaled);

  if (prefs.highContrast) {
    extras.push({
      color: isLightishColor(flat.color) ? flat.color || '#FFFFFF' : '#FFE56A',
    });
  }

  if (prefs.readableFont) {
    extras.push({
      letterSpacing: Math.max(Number(flat.letterSpacing) || 0, 0.55),
    });
  }

  if (extras.length === 0) {
    return {
      ...props,
      allowFontScaling: false,
    };
  }

  return {
    ...props,
    allowFontScaling: false,
    style: [props.style, extras],
  };
}

function decorateLinkContainerProps(props) {
  if (!props || livePrefs.highlightLinks !== true) return props;
  if (props.accessibilityRole !== 'link') return props;
  return {
    ...props,
    style: [
      props.style,
      {
        borderWidth: 2,
        borderColor: '#FFE56A',
      },
    ],
  };
}

function wrapForwardRefRender(Component, decorate) {
  try {
    if (!Component || typeof Component.render !== 'function') return false;
    if (Component.render.__piA11yPatched) return true;
    const original = Component.render;
    const wrapped = function piA11yRender(props, ref) {
      return original.call(this, decorate(props), ref);
    };
    wrapped.__piA11yPatched = true;
    Component.render = wrapped;
    return true;
  } catch (_) {
    return false;
  }
}

function wrapClassRender(Component, decorate) {
  try {
    const proto = Component && Component.prototype;
    if (!proto || typeof proto.render !== 'function') return false;
    if (proto.render.__piA11yPatched) return true;
    const original = proto.render;
    const wrapped = function piA11yClassRender() {
      const element = original.call(this);
      if (!React.isValidElement(element)) return element;
      const nextProps = decorate(this.props);
      if (nextProps === this.props) return element;
      return React.cloneElement(element, {
        style: nextProps.style,
      });
    };
    wrapped.__piA11yPatched = true;
    proto.render = wrapped;
    return true;
  } catch (_) {
    return false;
  }
}

function ensurePatched() {
  if (patched) return;
  wrapForwardRefRender(Text, decorateTextProps);
  wrapForwardRefRender(TextInput, decorateInputProps);
  wrapForwardRefRender(Pressable, decorateLinkContainerProps);
  wrapClassRender(TouchableOpacity, decorateLinkContainerProps);
  patched = true;
}

function applyWebClasses(prefs) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('pi-a11y-contrast', prefs.highContrast);
  root.classList.toggle('pi-a11y-readable', prefs.readableFont);
  root.classList.toggle('pi-a11y-links', prefs.highlightLinks);
  root.classList.toggle('pi-a11y-reduce-motion', prefs.reduceMotion);
  root.style.setProperty('--pi-font-scale', String(prefs.fontScale));
  ensureWebA11yStyles();
}

function ensureWebA11yStyles() {
  if (webStylesInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.setAttribute('data-pi-a11y', 'true');
  el.textContent = `
    html.pi-a11y-contrast { background: #000 !important; }
    html.pi-a11y-contrast body { background: #000 !important; }
    html.pi-a11y-readable body,
    html.pi-a11y-readable * {
      letter-spacing: 0.06em !important;
      word-spacing: 0.08em !important;
    }
    html.pi-a11y-links a,
    html.pi-a11y-links [role="link"] {
      text-decoration: underline !important;
      text-underline-offset: 3px;
      outline: 2px solid #FFE56A;
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
  document.head.appendChild(el);
  webStylesInjected = true;
}

ensurePatched();
applyAccessibilityRuntime(DEFAULT_ACCESSIBILITY_PREFS);
