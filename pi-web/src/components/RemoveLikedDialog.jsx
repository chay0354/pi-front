import {useEffect} from 'react';
import backdrop from '../assets/figma/dialog/backdrop.svg';
import styles from './RemoveLikedDialog.module.css';

/** "הסרת מודעה מהמועדפים" confirmation (Figma 744:79935). */
export default function RemoveLikedDialog({onConfirm, onCancel}) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <>
      <img className={styles.backdrop} src={backdrop} alt="" width={1920} height={1080} onClick={onCancel} />
      <section className={styles.dialog} role="alertdialog" aria-labelledby="remove-liked-title">
        <p id="remove-liked-title" className={styles.title} dir="rtl">
          הסרת מודעה מהמועדפים
        </p>
        <p className={styles.body} dir="auto">
          לאחר הסרה, לא ניתן יהיה להוסיף את המודעה מחדש למועדפים.
        </p>
        <div className={styles.buttons}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            ביטול
          </button>
          <button type="button" className={styles.confirm} onClick={onConfirm}>
            הסר מהרשימה
          </button>
        </div>
      </section>
    </>
  );
}
