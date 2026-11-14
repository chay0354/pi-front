import styles from './RightDrawer.module.css';

/** Settings screen in the same right-hand slot as the side menu and profile editor. */
export default function RightDrawer({label, onClose, children}) {
  return (
    <div className={styles.root}>
      {onClose ? (
        <button type="button" className={styles.backdrop} aria-label="סגירה" tabIndex={-1} onClick={onClose} />
      ) : null}
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
