import {Image} from 'react-native';

/**
 * {@link Image.resolveAssetSource} is not always present (e.g. some react-native-web stubs).
 * Do not `require('react-native/Libraries/Image/resolveAssetSource')` — Metro will bundle
 * react-native internals that break web (500 on index.bundle, MIME type application/json).
 * Some bundlers return a URL string from require('file.png') on web.
 * @param {number|string|{uri?: string}} source
 * @returns {{ uri?: string, width?: number, height?: number } | null}
 */
export function resolveBundledAssetSource(source) {
  if (source == null) {
    return null;
  }
  if (typeof source === 'object' && typeof source.uri === 'string') {
    return {uri: source.uri, width: source.width, height: source.height};
  }
  if (typeof source === 'string' && source.length > 0) {
    return {uri: source};
  }
  if (Image && typeof Image.resolveAssetSource === 'function') {
    const r = Image.resolveAssetSource(source);
    if (r) {
      return r;
    }
  }
  return null;
}
