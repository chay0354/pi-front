import React, {useEffect} from 'react';
import {loginOrRegisterWithGoogle} from '../utils/api';
import {
  getGoogleSignInConfigError,
  useGoogleIdTokenAuthRequest,
} from '../utils/googleAuth';

/**
 * Handles Google OAuth response for regular-user registration.
 * Isolated so expo-web-browser is only loaded when this screen mounts.
 */
export default function GoogleRegistrationAuth({
  onSuccess,
  onError,
  onLoadingChange,
  triggerNonce = 0,
  onTriggerConsumed,
}) {
  const [googleRequest, googleResponse, promptGoogleSignIn] =
    useGoogleIdTokenAuthRequest();

  useEffect(() => {
    if (!triggerNonce) return;
    const configError = getGoogleSignInConfigError();
    if (configError) {
      onError?.(configError);
      onTriggerConsumed?.();
      return;
    }
    if (!googleRequest) {
      onError?.('Google Sign-In עדיין נטען. נסה שוב בעוד רגע.');
      onTriggerConsumed?.();
      return;
    }

    onLoadingChange?.(true);
    promptGoogleSignIn()
      .catch(err => {
        onError?.(err?.message || 'לא ניתן לפתוח את Google Sign-In');
        onLoadingChange?.(false);
      })
      .finally(() => {
        onTriggerConsumed?.();
      });
  }, [
    triggerNonce,
    googleRequest,
    promptGoogleSignIn,
    onError,
    onLoadingChange,
    onTriggerConsumed,
  ]);

  useEffect(() => {
    if (googleResponse?.type !== 'success') {
      if (googleResponse?.type === 'error') {
        onLoadingChange?.(false);
        onError?.('התחברות עם Google נכשלה. נסה שוב.');
      } else if (
        googleResponse?.type === 'dismiss' ||
        googleResponse?.type === 'cancel'
      ) {
        onLoadingChange?.(false);
      }
      return;
    }

    const idToken =
      googleResponse.params?.id_token ||
      googleResponse.authentication?.idToken;
    if (!idToken) {
      onLoadingChange?.(false);
      onError?.('Google לא החזיר אסימון התחברות.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const reg = await loginOrRegisterWithGoogle(idToken);
        if (cancelled) return;
        if (!reg?.success || !reg?.subscription?.id) {
          onError?.(reg?.error || 'לא הצלחנו להתחבר עם Google. נסה שוב.');
          return;
        }
        onSuccess?.(reg);
      } catch (err) {
        if (!cancelled) {
          onError?.(err?.message || 'שגיאה בהתחברות עם Google');
        }
      } finally {
        if (!cancelled) onLoadingChange?.(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [googleResponse, onSuccess, onError, onLoadingChange]);

  return null;
}
