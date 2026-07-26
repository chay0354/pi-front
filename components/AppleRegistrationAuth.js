import React, {useEffect, useRef} from 'react';
import {loginOrRegisterWithApple} from '../utils/api';
import {
  getAppleSignInConfigError,
  signInWithAppleIdToken,
} from '../utils/appleAuth';

/**
 * Handles Apple sign-in for regular-user registration / login (iOS).
 * Only triggerNonce starts a new attempt — parent re-renders must not reopen the sheet.
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
  const lastHandledNonceRef = useRef(0);
  const propsRef = useRef({});
  propsRef.current = {
    onSuccess,
    onError,
    onLoadingChange,
    onTriggerConsumed,
    phone,
    name,
    businessAddress,
    intent,
  };

  useEffect(() => {
    if (!triggerNonce) return;
    if (triggerNonce === lastHandledNonceRef.current) return;
    if (busyRef.current) return;

    lastHandledNonceRef.current = triggerNonce;
    busyRef.current = true;
    propsRef.current.onLoadingChange?.(true);

    const configError = getAppleSignInConfigError();
    if (configError) {
      busyRef.current = false;
      propsRef.current.onLoadingChange?.(false);
      propsRef.current.onError?.(configError);
      propsRef.current.onTriggerConsumed?.();
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      busyRef.current = false;
      propsRef.current.onLoadingChange?.(false);
      propsRef.current.onTriggerConsumed?.();
    };

    (async () => {
      try {
        const apple = await signInWithAppleIdToken();
        const {
          phone: phoneVal,
          name: nameVal,
          businessAddress: addressVal,
          intent: intentVal,
        } = propsRef.current;
        const reg = await loginOrRegisterWithApple(apple.identityToken, {
          phone: phoneVal,
          name: nameVal || apple.name || null,
          businessAddress: addressVal,
          intent: intentVal,
        });
        if (!reg?.success || !reg?.subscription?.id) {
          propsRef.current.onError?.(
            reg?.error || 'לא הצלחנו להתחבר עם Apple. נסה שוב.',
          );
          return;
        }
        propsRef.current.onSuccess?.(reg);
      } catch (err) {
        const msg = String(err?.message || err || '');
        const code = err?.code;
        if (
          code === 'ERR_REQUEST_CANCELED' ||
          /ERR_REQUEST_CANCELED|canceled|cancelled/i.test(msg)
        ) {
          return;
        }
        propsRef.current.onError?.(msg || 'התחברות עם Apple נכשלה. נסה שוב.');
      } finally {
        finish();
      }
    })();
  }, [triggerNonce]);

  return null;
}
