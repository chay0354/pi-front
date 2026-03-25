/**
 * Native (iOS/Android): stubs — real capture uses react-native-view-shot in PostEditorScreen.
 * This file exists so Metro never bundles html2canvas on native.
 */

export async function capturePostPreviewToDataUrl() {
  throw new Error('capturePostPreviewToDataUrl is web-only');
}

export function resolvePostPreviewDomNode() {
  return null;
}
