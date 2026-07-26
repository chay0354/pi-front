import React, {useEffect, useRef} from 'react';
import {loginOrRegisterWithGoogle} from '../utils/api';
import {
  getGoogleSignInConfigError,
  signInWithGoogleIdToken,
} from '../utils/googleAuth';

/**
 * Handles Google sign-in for regular-user registration / login.
 * Only triggerNonce starts a new attempt — parent re-renders must not reopen the picker.
 */
export default function GoogleRegistrationAuth({
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

    const configError = getGoogleSignInConfigError();
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
        const {idToken} = await signInWithGoogleIdToken();
        const {
          phone: phoneVal,
          name: nameVal,
          businessAddress: addressVal,
          intent: intentVal,
        } = propsRef.current;
        const reg = await loginOrRegisterWithGoogle(idToken, {
          phone: phoneVal,
          name: nameVal,
          businessAddress: addressVal,
          intent: intentVal,
        });
        if (!reg?.success || !reg?.subscription?.id) {
          propsRef.current.onError?.(
            reg?.error || 'לא הצלחנו להתחבר עם Google. נסה שוב.',
          );
          return;
        }
        propsRef.current.onSuccess?.(reg);
      } catch (err) {
        const msg = String(err?.message || err || '');
        if (
          /SIGN_IN_CANCELLED|canceled|cancelled|12501/i.test(msg) ||
          err?.code === 'SIGN_IN_CANCELLED'
        ) {
          return;
        }
        propsRef.current.onError?.(msg || 'התחברות עם Google נכשלה. נסה שוב.');
      } finally {
        finish();
      }
    })();
  }, [triggerNonce]);

  return null;
}
