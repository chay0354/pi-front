import {useEffect} from 'react';
import {mdiClipboardAlertOutline} from '@mdi/js';
import MdiIcon from '../MdiIcon';
import styles from './PublishValidationModal.module.css';

/** Notice when publish is blocked by missing required fields (ad upload flows). */
export default function PublishValidationModal({
  visible,
  onClose,
  messages = [],
  title = 'חסרים שדות חובה',
  subtitle = 'לפני הפרסום השלימו את הפרטים הבאים:',
}) {
  const open = Boolean(visible) && messages.length > 0;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label={title} data-account-modal="">
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <div className={styles.iconCircle}>
          <MdiIcon path={mdiClipboardAlertOutline} size={47} color="#ffc40a" />
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
        <div className={styles.list}>
          {messages.map((msg, i) => (
            <div key={`${i}-${String(msg).slice(0, 24)}`} className={styles.row}>
              <span className={styles.bullet} aria-hidden="true">
                •
              </span>
              <span className={styles.itemText}>{msg}</span>
            </div>
          ))}
        </div>
        <button type="button" className={styles.btn} onClick={onClose} aria-label="הבנתי">
          הבנתי
        </button>
      </div>
    </div>
  );
}
