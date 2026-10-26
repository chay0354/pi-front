import {useState} from 'react';
import {Spinner} from './AccountUi';
import appleButtonImage from '../assets/account/apple.png';
import styles from './GoogleButton.module.css';

const APPLE_SRC = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID || 'com.pi.frontend';

let applePromise = null;

function loadApple() {
  if (window.AppleID?.auth) return Promise.resolve(window.AppleID);
  if (!applePromise) {
    applePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = APPLE_SRC;
      script.async = true;
      script.onload = () => (window.AppleID?.auth ? resolve(window.AppleID) : reject(new Error('Apple unavailable')));
      script.onerror = () => {
        applePromise = null;
        reject(new Error('Apple failed to load'));
      };
      document.head.appendChild(script);
    });
  }
  return applePromise;
}

/**
 * Mobile Apple pill. The click opens Apple's popup and returns an identity token
 * for the same /api/auth/apple call the app uses.
 */
export default function AppleButton({canStart = true, onBlocked, onToken, onError, disabled, loading}) {
  const [busy, setBusy] = useState(false);
  const blocked = disabled || loading || busy;

  const start = async () => {
    if (disabled || loading || busy) return;
    if (!canStart) {
      onBlocked?.();
      return;
    }
    setBusy(true);
    try {
      const AppleID = await loadApple();
      AppleID.auth.init({
        clientId: APPLE_CLIENT_ID,
        scope: 'name email',
        redirectURI: window.location.origin,
        usePopup: true,
      });
      const result = await AppleID.auth.signIn();
      const idToken = result?.authorization?.id_token || '';
      const person = result?.user?.name;
      const name = [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim();
      if (!idToken) {
        onError?.('לא הצלחנו להתחבר עם Apple. נסה שוב.');
        return;
      }
      onToken?.({idToken, name: name || null});
    } catch (err) {
      const msg = String(err?.error || err?.message || err || '');
      if (/popup_closed|cancel/i.test(msg)) return;
      onError?.(msg || 'התחברות עם Apple נכשלה. נסה שוב.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${styles.wrap} ${blocked ? styles.dim : ''}`}>
      <img className={styles.art} src={appleButtonImage} alt="" draggable={false} />
      <button type="button" className={styles.blocker} aria-label="המשך עם Apple" onClick={start} />
      {loading || busy ? (
        <span className={styles.loading}>
          <Spinner dark />
        </span>
      ) : null}
    </div>
  );
}
