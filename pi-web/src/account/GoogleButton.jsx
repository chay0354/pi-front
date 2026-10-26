import {useEffect, useRef, useState} from 'react';
import {Spinner} from './AccountUi';
import {GOOGLE_WEB_CLIENT_ID} from './constants';
import googleButtonImage from '../assets/account/google.png';
import styles from './GoogleButton.module.css';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
let gisPromise = null;
let initialized = false;
/** GIS takes a single global callback; route each credential to the button that was pressed. */
let activeHandler = null;

function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => (window.google?.accounts?.id ? resolve(window.google) : reject(new Error('GIS unavailable')));
      script.onerror = () => {
        gisPromise = null;
        reject(new Error('GIS failed to load'));
      };
      document.head.appendChild(script);
    });
  }
  return gisPromise;
}

function ensureInitialized(google) {
  if (initialized) return;
  google.accounts.id.initialize({
    client_id: GOOGLE_WEB_CLIENT_ID,
    callback: response => activeHandler?.(response?.credential || null),
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  initialized = true;
}

/**
 * The mobile "Google" pill artwork with the real GIS button laid invisibly on top, so the click
 * opens Google's own popup. When `canStart` is false the click is intercepted and `onBlocked` runs
 * (mobile validates the social name/phone before starting Google).
 */
export default function GoogleButton({text = 'signup_with', canStart = true, onBlocked, onCredential, onError, disabled, loading}) {
  const hostRef = useRef(null);
  const handlerRef = useRef(onCredential);
  const [ready, setReady] = useState(false);
  handlerRef.current = onCredential;

  useEffect(() => {
    let cancelled = false;
    loadGis()
      .then(google => {
        if (cancelled || !hostRef.current) return;
        ensureInitialized(google);
        hostRef.current.innerHTML = '';
        google.accounts.id.renderButton(hostRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          width: 326,
          locale: 'he',
        });
        setReady(true);
      })
      .catch(() => !cancelled && setReady(false));
    return () => {
      cancelled = true;
    };
  }, [text]);

  const arm = () => {
    activeHandler = credential => handlerRef.current?.(credential);
  };

  const blocked = disabled || loading || !canStart || !ready;
  const onBlockedClick = () => {
    if (disabled || loading) return;
    if (!canStart) {
      onBlocked?.();
      return;
    }
    if (!ready) onError?.('לא הצלחנו להתחבר עם Google. נסה שוב.');
  };

  return (
    <div className={`${styles.wrap} ${disabled || loading ? styles.dim : ''}`} onPointerDownCapture={arm}>
      <img className={styles.art} src={googleButtonImage} alt="" draggable={false} />
      <div ref={hostRef} className={styles.gis} aria-label="המשך עם Google" />
      {blocked ? (
        <button type="button" className={styles.blocker} onClick={onBlockedClick} aria-label="המשך עם Google" />
      ) : null}
      {loading ? (
        <span className={styles.loading}>
          <Spinner dark />
        </span>
      ) : null}
    </div>
  );
}
