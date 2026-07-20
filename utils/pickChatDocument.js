import {Platform} from 'react-native';
import {requireOptionalNativeModule} from 'expo-modules-core';

/**
 * Returns a picked file from the native ExpoDocumentPicker when that module is
 * linked in the binary. Returns null when unavailable so the app can use the
 * WebView file picker instead — never throws / warns about missing modules.
 */
export async function tryPickChatDocumentNative() {
  if (Platform.OS === 'web') return null;

  let native = null;
  try {
    native = requireOptionalNativeModule('ExpoDocumentPicker');
  } catch {
    return null;
  }
  if (!native || typeof native.getDocumentAsync !== 'function') {
    return null;
  }

  try {
    return await native.getDocumentAsync({
      type: ['*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
  } catch {
    return null;
  }
}
