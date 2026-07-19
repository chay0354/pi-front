import {Platform} from 'react-native';

/**
 * Try the native Expo document picker.
 * Returns null when the native module is not linked (old dev client) so callers
 * can fall back to the WebView picker — avoids crashing on requireNativeModule.
 *
 * @returns {Promise<null | {canceled: true, assets: null} | {canceled: false, assets: Array<{uri: string, name?: string, mimeType?: string, size?: number}>}>}
 */
export async function tryPickChatDocumentNative() {
  if (Platform.OS === 'web') return null;

  try {
    // Lazy require so a missing native module does not break ChatScreen import.
    // eslint-disable-next-line global-require
    const mod = require('expo-document-picker');
    const getDocumentAsync =
      typeof mod?.getDocumentAsync === 'function'
        ? mod.getDocumentAsync
        : typeof mod?.default?.getDocumentAsync === 'function'
          ? mod.default.getDocumentAsync
          : null;
    if (!getDocumentAsync) return null;

    return await getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
  } catch (e) {
    console.warn(
      '[pickChatDocument] native ExpoDocumentPicker unavailable:',
      e?.message || e,
    );
    return null;
  }
}
