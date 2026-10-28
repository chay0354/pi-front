import {mdiChevronLeft, mdiClose} from '@mdi/js';
import MdiIcon from './MdiIcon';
import {mobileAsset} from './lib/publishRules';
import styles from './CreateAdSheet.module.css';

export const CREATE_SHEET_POST_ICON = mobileAsset('ad-uplaud/posts.png');

export function CreateAdSheetDivider() {
  return <div className={styles.divider} />;
}

export function CreateAdSheetRow({title, subtitle, iconSource, onPress}) {
  return (
    <button type="button" className={styles.option} onClick={onPress}>
      <MdiIcon path={mdiChevronLeft} size={31} color="#fff" />
      <span className={styles.contentGroup}>
        <span className={styles.textColumn}>
          <span className={styles.title}>{title}</span>
          <span className={styles.subtitle}>{subtitle}</span>
        </span>
        <img src={iconSource} alt="" className={styles.icon} />
      </span>
    </button>
  );
}

/** "צור מודעה" drawer — slides in from the left edge of its host. */
export default function CreateAdSheet({children, onClose, title = 'פרסם מודעה'}) {
  return (
    <div className={styles.root} data-account-modal="">
      <button type="button" className={styles.overlay} aria-label="סגור" onClick={onClose} />
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <header className={styles.header}>
          <h2 className={styles.headerTitle}>{title}</h2>
          <button type="button" className={styles.closeBtn} aria-label="סגור" onClick={onClose}>
            <MdiIcon path={mdiClose} size={26} color="#fff" />
          </button>
        </header>
        <div className={styles.options}>{children}</div>
      </div>
    </div>
  );
}
