import {Platform} from 'react-native';
// Import native module directly — package entry re-exports `./types` which
// Metro on Windows can fail to resolve as "Unable to resolve module ./types".
import ExpoDocumentPicker from 'expo-document-picker/build/ExpoDocumentPicker';

/**
 * Pick a single document for chat attach (iOS / Android).
 * Web is handled with `<input type="file">` in ChatScreen.
 *
 * @returns {Promise<{canceled: true, assets: null} | {canceled: false, assets: Array<{uri: string, name?: string, mimeType?: string, size?: number}>}>}
 */
export async function pickChatDocument() {
  if (Platform.OS === 'web') {
    return {canceled: true, assets: null};
  }

  return ExpoDocumentPicker.getDocumentAsync({
    type: ['*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
}
