import {useEffect} from 'react';
import {mdiClose} from '@mdi/js';
import MdiIcon from '../publish/MdiIcon';
import {CHAT_FIRST_MESSAGE_NUDGE} from './appDownload';
import {AppDownloadQr} from './AppDownloadQr';
import styles from './ChatAppNudge.module.css';

/** Small side card after the first message in a Pi chat. */
export function ChatAppNudge({onClose}) {
  useEffect(() => {
    const onKey = event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <aside className={styles.card} dir="rtl" data-account-modal="" role="dialog" aria-label="הזמנה לאפליקציה">
      <button type="button" className={styles.close} aria-label="סגירה" onClick={onClose}>
        <MdiIcon path={mdiClose} size={22} color="#fff" />
      </button>
      <p className={styles.text}>{CHAT_FIRST_MESSAGE_NUDGE}</p>
      <AppDownloadQr size={156} />
    </aside>
  );
}
