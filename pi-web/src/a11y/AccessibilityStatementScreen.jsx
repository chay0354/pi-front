import {useEffect} from 'react';
import {mdiChevronLeft} from '@mdi/js';
import MdiIcon from '../publish/MdiIcon';
import {ACCESSIBILITY_STATEMENT_HEBREW} from './statementContent';
import styles from './AccessibilityStatementScreen.module.css';

export default function AccessibilityStatementScreen({onClose}) {
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.screen} dir="rtl">
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onClose} aria-label="חזרה">
          <MdiIcon path={mdiChevronLeft} size={32} color="#1e1d27" />
        </button>
        <h1>הצהרת נגישות — פאי 2701</h1>
        <span className={styles.backBtn} />
      </header>
      <div className={styles.body}>{ACCESSIBILITY_STATEMENT_HEBREW}</div>
    </div>
  );
}
