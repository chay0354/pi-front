import {useCallback, useEffect, useRef, useState} from 'react';
import {mdiClose} from '@mdi/js';
import MdiIcon from '../../publish/MdiIcon';
import styles from './ChatDocumentPickerModal.module.css';

const MAX_BYTES = 25 * 1024 * 1024;

export default function ChatDocumentPickerModal({visible, onCancel, onPicked}) {
  const [busy, setBusy] = useState(false);
  const handledRef = useRef(false);
  const inputRef = useRef(null);

  const finishCancel = useCallback(
    message => {
      if (handledRef.current) return;
      handledRef.current = true;
      setBusy(false);
      onCancel?.(message);
    },
    [onCancel],
  );

  useEffect(() => {
    if (!visible) return undefined;
    handledRef.current = false;
    setBusy(false);
    const onKey = e => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      finishCancel();
    };
    window.addEventListener('keydown', onKey, true);
    const t = window.setTimeout(() => inputRef.current?.click(), 120);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.clearTimeout(t);
    };
  }, [visible, finishCancel]);

  const onChange = event => {
    if (handledRef.current) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      finishCancel();
      return;
    }
    if (file.size > MAX_BYTES) {
      handledRef.current = true;
      setBusy(false);
      onCancel?.('הקובץ גדול מדי (מקסימום 25MB)');
      return;
    }
    handledRef.current = true;
    setBusy(true);
    const uri = URL.createObjectURL(file);
    onPicked?.({
      uri,
      name: file.name || `file-${Date.now()}`,
      mimeType: file.type || 'application/octet-stream',
      type: file.type || 'application/octet-stream',
      size: file.size,
      file,
    });
  };

  if (!visible) return null;

  return (
    <div
      className={styles.root}
      data-account-modal=""
      role="dialog"
      aria-modal="true"
      aria-label="צרף קובץ">
      <div className={styles.header}>
        <button type="button" className={styles.closeBtn} onClick={() => finishCancel()} aria-label="סגור">
          <MdiIcon path={mdiClose} size={34} color="#fff" />
        </button>
        <h2 className={styles.title}>צרף קובץ</h2>
        <div className={styles.closeBtn} />
      </div>
      <div className={styles.body}>
        <p className={styles.hint}>
          בחרו קובץ לשליחה בצ׳אט
          <br />
          (עד 25MB)
        </p>
        <button type="button" className={styles.pickBtn} onClick={() => inputRef.current?.click()}>
          בחר קובץ
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="*/*"
          className={styles.hidden}
          onChange={onChange}
        />
        {busy ? (
          <div className={styles.busy}>
            <span className={styles.spinner} />
            <span>מכין קובץ...</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
