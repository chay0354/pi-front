import {Platform} from 'react-native';

/**
 * Native Sign in with Apple (iOS only).
 * Requires expo-apple-authentication + usesAppleSignIn + App ID capability.
 */
export function isAppleSignInSupported() {
  return Platform.OS === 'ios';
}

export function getAppleSignInConfigError() {
  if (!isAppleSignInSupported()) {
    return 'התחברות עם Apple זמינה רק ב-iPhone / iPad';
  }
  return null;
}

function formatAppleFullName(fullName) {
  if (!fullName || typeof fullName !== 'object') return null;
  const parts = [fullName.givenName, fullName.middleName, fullName.familyName]
    .map(p => (p != null ? String(p).trim() : ''))
    .filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

export async function signInWithAppleIdToken() {
  const configError = getAppleSignInConfigError();
  if (configError) {
    throw new Error(configError);
  }

  let AppleAuthentication;
  try {
    AppleAuthentication = require('expo-apple-authentication');
  } catch (err) {
    throw new Error(
      'Apple Sign-In דורש rebuild של האפליקציה (npm run ios / EAS).',
    );
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error('Sign in with Apple לא זמין במכשיר זה');
  }

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const identityToken =
    credential?.identityToken != null
      ? String(credential.identityToken).trim()
      : '';
  if (!identityToken) {
    throw new Error('Apple לא החזיר אסימון התחברות.');
  }

  return {
    identityToken,
    appleUserId: credential?.user ? String(credential.user) : null,
    email: credential?.email ? String(credential.email).trim() : null,
    name: formatAppleFullName(credential?.fullName),
  };
}
