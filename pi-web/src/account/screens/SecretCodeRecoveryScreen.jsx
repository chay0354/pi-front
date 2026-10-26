import {useEffect, useState} from 'react';
import {recoverPasswordByEmail} from '../../api/client';
import {AccountScreen, PrimaryButton, accountStyles as ui} from '../AccountUi';
import keyIcon from '../../assets/account/key.png';
import styles from './AuthScreens.module.css';

/** שכחתי סיסמה — sends to the given account email only (no typing). */
export function SecretCodeRecoveryScreen({onClose, onSent, userEmail = '', fromLogin = false}) {
  const [loading, setLoading] = useState(false);
  const accountEmail = String(userEmail || '').trim();

  useEffect(() => {
    if (!accountEmail) {
      window.alert(`שגיאה\n\n${fromLogin ? 'אנא הזן כתובת מייל.' : 'לא נמצא מייל בחשבון המחובר.'}`);
      onClose?.();
    }
  }, [accountEmail, fromLogin, onClose]);

  const handleSend = async () => {
    if (!accountEmail) return;
    setLoading(true);
    try {
      await recoverPasswordByEmail(accountEmail);
      onSent?.(accountEmail);
    } catch (e) {
      window.alert(`שגיאה\n\n${e.message || 'נכשל בשליחה. נסה שוב.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccountScreen title="שכחתי סיסמה" onBack={onClose} width={480}>
      <div className={`${ui.card} ${styles.keyCard}`}>
        <img className={styles.keyIcon} src={keyIcon} alt="" />
        <h2 className={styles.keyTitle}>שכחתי סיסמה</h2>
        <p className={styles.keyBody}>
          {fromLogin
            ? 'לחץ שלח וישלח אלייך מייל עם הסיסמה העדכנית שלך לכתובת המייל שהזנת:'
            : 'לחץ שלח וישלח אלייך מייל עם הסיסמה העדכנית שלך לכתובת המייל של החשבון המחובר:'}
        </p>
        <div className={styles.emailReadOnly} dir="ltr">
          {accountEmail || '—'}
        </div>
        <PrimaryButton onClick={handleSend} disabled={!accountEmail} loading={loading}>
          שלח
        </PrimaryButton>
      </div>
    </AccountScreen>
  );
}

/** Confirmation after the forgot-password email was requested. */
export function SecretCodeRecoverySentScreen({email, onBack}) {
  return (
    <AccountScreen title="שכחתי סיסמה" onBack={onBack} width={480}>
      <div className={`${ui.card} ${styles.keyCard}`}>
        <img className={styles.keyIcon} src={keyIcon} alt="" />
        <h2 className={styles.sentTitle}>הסיסמה בדרך אליך!</h2>
        <div>
          <p className={styles.sentLine}>שלחנו אליך מייל עם הסיסמה לכתובת</p>
          <p className={styles.sentLine} dir="ltr">
            {email || ''}
          </p>
        </div>
        <p className={styles.sentHint}>
          אנא בדוק את תיבת הדואר הנכנס שלך
          <br />
          (וגם את תיקיית הספאם).
        </p>
        <PrimaryButton onClick={onBack}>חזור</PrimaryButton>
      </div>
    </AccountScreen>
  );
}
