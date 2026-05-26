import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

function getGoogleClientIds() {
  const webClientId = String(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  ).trim();
  const iosClientId = String(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || webClientId,
  ).trim();
  const androidClientId = String(
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || webClientId,
  ).trim();
  return {webClientId, iosClientId, androidClientId};
}

export function isGoogleSignInConfigured() {
  const {webClientId} = getGoogleClientIds();
  return Boolean(webClientId);
}

/** Hook config for Google ID-token sign-in (Expo Auth Session). */
export function useGoogleIdTokenAuthRequest() {
  const {webClientId, iosClientId, androidClientId} = getGoogleClientIds();
  return Google.useIdTokenAuthRequest({
    webClientId,
    iosClientId,
    androidClientId,
  });
}

export function getGoogleSignInConfigError() {
  if (isGoogleSignInConfigured()) return null;
  return 'Google Sign-In לא מוגדר. הוסף EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ל-.env והפעל מחדש את Expo.';
}
