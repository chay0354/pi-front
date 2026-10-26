import qrSrc from './app-download-qr.svg';
import styles from './AppDownloadQr.module.css';

export function AppDownloadQr({size = 180}) {
  return (
    <div className={styles.wrap}>
      <img className={styles.code} src={qrSrc} width={size} height={size} alt="קוד QR להורדת האפליקציה" />
      <p className={styles.caption} dir="rtl">
        סרקו להורדה
      </p>
    </div>
  );
}
