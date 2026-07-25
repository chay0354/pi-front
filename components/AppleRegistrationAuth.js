import React, {useEffect, useRef} from 'react';
import {loginOrRegisterWithApple} from '../utils/api';
import {
  getAppleSignInConfigError,
  signInWithAppleIdToken,
} from '../utils/appleAuth';

/**
 * Handles Apple sign-in for regular-user registration / login (iOS).
 */
export default function AppleRegistrationAuth({
  onSuccess,
  onError,
  onLoadingChange,
  triggerNonce = 0,
  onTriggerConsumed,
  phone = null,
  name = null,
  businessAddress = null,
  intent = 'register',
}) {
  const busyRef = useRef(false);

  useEffect(() => {
    if (!triggerNonce) return;
    if (busyRef.current) return;

    const configError = getAppleSignInConfigError();
    if (configError) {
      onError?.(configError);
      onTriggerConsumed?.();
      return;
    }

    let cancelled = false;
    busyRef.current = true;
    onLoadingChange?.(true);

    (async () => {
      try {
        const apple = await signInWithAppleIdToken();
        if (cancelled) return;
        const reg = await loginOrRegisterWithApple(apple.identityToken, {
          phone,
          name: name || apple.name || null,
          businessAddress,
          intent,
        });
        if (cancelled) return;
        if (!reg?.success || !reg?.subscription?.id) {
          onError?.(reg?.error || 'לא הצלחנו להתחבר עם Apple. נסה שוב.');
          return;
        }
        onSuccess?.(reg);
      } catch (err) {
        if (cancelled) return;
        const msg = String(err?.message || err || '');
        const code = err?.code;
        // User dismissed the sheet — not an error toast.
        if (
          code === 'ERR_REQUEST_CANCELED' ||
          /ERR_REQUEST_CANCELED|canceled|cancelled/i.test(msg)
        ) {
          return;
        }
        onError?.(msg || 'התחברות עם Apple נכשלה. נסה שוב.');
      } finally {
        busyRef.current = false;
        if (!cancelled) onLoadingChange?.(false);
        onTriggerConsumed?.();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    triggerNonce,
    onSuccess,
    onError,
    onLoadingChange,
    onTriggerConsumed,
    phone,
    name,
    businessAddress,
    intent,
  ]);

  return null;
}
