import {useEffect, useState} from 'react';
import {mdiChevronLeft} from '@mdi/js';
import MdiIcon from '../MdiIcon';
import styles from './OpenHouseDetailsModal.module.css';

/**
 * Shown after the user taps פרסם on a בית פתוח post — collects place + date.
 */
export default function OpenHouseDetailsModal({
  visible,
  initialPlace = '',
  initialDate = '',
  onCancel,
  onConfirm,
  submitting = false,
}) {
  const [place, setPlace] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (!visible) return;
    setPlace(String(initialPlace || '').trim());
    setDate(String(initialDate || '').trim());
  }, [visible, initialPlace, initialDate]);

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = e => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (!submitting) onCancel?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [visible, submitting, onCancel]);

  if (!visible) return null;

  const handleConfirm = () => {
    if (submitting) return;
    onConfirm?.({place: place.trim(), date: date.trim()});
  };

  const canSubmit = Boolean(place.trim() && date.trim()) && !submitting;

  return (
    <div className={styles.root} data-account-modal="" role="dialog" aria-modal="true" aria-label="פרטי בית פתוח">
      <button type="button" className={styles.backdrop} aria-label="ביטול" disabled={submitting} onClick={onCancel} />
      <div className={styles.card}>
        <h2 className={styles.title}>פרטי בית פתוח</h2>
        <p className={styles.subtitle}>הזינו מיקום ותאריך — יוצגו על הפוסט בפיד</p>

        <label className={styles.label} htmlFor="open-house-place">
          שם / מיקום
        </label>
        <input
          id="open-house-place"
          className={styles.input}
          value={place}
          onChange={e => setPlace(e.target.value)}
          disabled={submitting}
          dir="rtl"
          autoComplete="off"
        />

        <label className={styles.label} htmlFor="open-house-date">
          תאריך
        </label>
        <input
          id="open-house-date"
          className={styles.input}
          value={date}
          onChange={e => setDate(e.target.value)}
          disabled={submitting}
          dir="rtl"
          autoComplete="off"
          onKeyDown={e => {
            if (e.key === 'Enter' && canSubmit) handleConfirm();
          }}
        />

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={submitting}>
            ביטול
          </button>
          <button type="button" className={styles.confirmBtn} onClick={handleConfirm} disabled={!canSubmit}>
            <span>המשך לפרסום</span>
            <MdiIcon path={mdiChevronLeft} size={29} color="#1E1D27" />
          </button>
        </div>
      </div>
    </div>
  );
}
