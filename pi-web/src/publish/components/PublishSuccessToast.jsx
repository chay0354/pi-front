import {useEffect, useId} from 'react';
import styles from './PublishSuccessToast.module.css';

const AUTO_DISMISS_MS = 4500;

function SuccessIcon({size = 52}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M37.5 19.5C37.5 29.4411 29.4411 37.5 19.5 37.5C9.55887 37.5 1.5 29.4411 1.5 19.5C1.5 9.55887 9.55887 1.5 19.5 1.5C29.4411 1.5 37.5 9.55887 37.5 19.5Z"
        stroke={`url(#${id}a)`}
        strokeWidth="1.5"
      />
      <path
        d="M27 15L17.375 25L13 20.4545"
        stroke={`url(#${id}b)`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id={`${id}a`} x1="2.7" y1="-1.47612" x2="41.0091" y2="8.06851" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34F3E0" />
          <stop offset="1" stopColor="#04CFE1" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="13.4667" y1="14.1733" x2="27.5732" y2="19.0937" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34F3E0" />
          <stop offset="1" stopColor="#04CFE1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function CloseIcon({size = 36}) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M9 9L19.5 19.5" stroke="#FFFFFF" strokeWidth="1.77778" strokeLinecap="round" />
      <path d="M9 19.5L19.5 9" stroke="#FFFFFF" strokeWidth="1.77778" strokeLinecap="round" />
    </svg>
  );
}

/** Figma node 1:171116 — publish success toaster. */
export default function PublishSuccessToast({visible = false, message = 'המודעה שלכם פורסמה בהצלחה!', onDismiss}) {
  useEffect(() => {
    if (!visible) return undefined;
    const id = setTimeout(() => {
      onDismiss?.();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [visible, onDismiss]);

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onDismiss?.();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div className={styles.root} data-account-modal="">
      <button type="button" className={styles.backdrop} onClick={onDismiss} aria-label="סגור" />
      <div className={styles.toast} role="status">
        <button type="button" className={styles.closeBtn} onClick={onDismiss} aria-label="סגור">
          <CloseIcon />
        </button>
        <div className={styles.successIconWrap}>
          <SuccessIcon />
        </div>
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
}
