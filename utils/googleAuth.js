import {Platform} from 'react-native';

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

export function getGoogleSignInConfigError() {
  if (isGoogleSignInConfigured()) return null;
  return 'Google Sign-In לא מוגדר. הוסף EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ל-.env והפעל מחדש את Expo.';
}

/** Reversed iOS URL scheme for the config plugin / Info.plist. */
export function getGoogleIosUrlScheme() {
  const {iosClientId} = getGoogleClientIds();
  const id = String(iosClientId || '')
    .replace(/\.apps\.googleusercontent\.com$/i, '')
    .trim();
  return id ? `com.googleusercontent.apps.${id}` : '';
}

/**
 * Native Google Sign-In (Play Services / iOS SDK).
 * Avoids expo-auth-session browser redirects that Google rejects on Android
 * with Error 400: invalid_request.
 */
export async function signInWithGoogleIdToken() {
  const configError = getGoogleSignInConfigError();
  if (configError) {
    throw new Error(configError);
  }

  let GoogleSignin;
  try {
    ({GoogleSignin} = require('@react-native-google-signin/google-signin'));
  } catch (err) {
    throw new Error(
      'Google Sign-In דורש rebuild של האפליקציה (npm run android / iOS).',
    );
  }

  const {webClientId, iosClientId} = getGoogleClientIds();
  GoogleSignin.configure({
    webClientId,
    iosClientId: Platform.OS === 'ios' ? iosClientId : undefined,
    offlineAccess: false,
    forceCodeForRefreshToken: false,
  });

  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
  }

  // Clear any stale session so the account picker shows again.
  try {
    const current = await GoogleSignin.getCurrentUser();
    if (current) {
      await GoogleSignin.signOut();
    }
  } catch (_) {
    /* ignore */
  }

  const result = await GoogleSignin.signIn();
  let idToken =
    result?.idToken ||
    result?.data?.idToken ||
    null;

  if (!idToken) {
    try {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens?.idToken || null;
    } catch (_) {
      /* ignore */
    }
  }

  if (!idToken) {
    throw new Error('Google לא החזיר אסימון התחברות.');
  }

  return {idToken, user: result?.user || result?.data?.user || null};
}
