import {useState} from 'react';
import {loginOrRegisterWithApple, loginOrRegisterWithGoogle, loginWithPassword} from '../../api/client';
import {AccountScreen, OrDivider, Spinner} from '../AccountUi';
import AppleButton from '../AppleButton';
import GoogleButton from '../GoogleButton';
import logo from '../../assets/menu/logo.png';
import styles from './AuthScreens.module.css';

const canEnter = sub => sub?.status === 'verified' || sub?.status === 'active';

/** התחברות — mobile LoginScreen. */
export default function LoginScreen({onClose, onLoginSuccess, onForgotPassword}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const busy = isLoggingIn || googleLoading || appleLoading;

  const handleLogin = async e => {
    e?.preventDefault();
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage('אנא הזן כתובת מייל');
      return;
    }
    if (!password) {
      setErrorMessage('אנא הזן סיסמה');
      return;
    }
    setIsLoggingIn(true);
    try {
      const response = await loginWithPassword(email.trim(), password);
      if (canEnter(response?.subscription)) {
        onLoginSuccess?.(response.subscription);
      } else if (response?.subscription) {
        setErrorMessage('החשבון שלך עדיין לא אומת. אנא השלם את תהליך האימות.');
      } else {
        setErrorMessage('מייל או סיסמה שגויים. אנא נסה שוב.');
      }
    } catch (error) {
      if (error.code === 'NO_PASSWORD_SET') {
        setErrorMessage(error.message || 'לא הוגדרה סיסמה לחשבון. התחבר עם Google או הירשם מחדש.');
      } else if (error.code === 'SUBSCRIPTION_EXPIRED') {
        setErrorMessage(error.message || 'תוקף המנוי הסתיים. לחידוש המנוי צרו קשר עם שירות הלקוחות.');
      } else if (/שירות ההתחברות לא זמין|Cannot POST \/api\/auth\/login/i.test(String(error.message || ''))) {
        setErrorMessage('שירות ההתחברות לא זמין בשרת. נסה שוב בעוד דקה.');
      } else {
        setErrorMessage(error.message || 'נכשל בהתחברות. אנא נסה שוב.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleCredential = async idToken => {
    if (!idToken) return;
    setErrorMessage(null);
    setGoogleLoading(true);
    try {
      const reg = await loginOrRegisterWithGoogle(idToken, {intent: 'login'});
      const sub = reg?.subscription;
      if (reg?.success && canEnter(sub) && sub?.id) {
        onLoginSuccess?.(sub);
        return;
      }
      setErrorMessage(reg?.error || 'החשבון שלך עדיין לא אומת. אנא השלם את תהליך האימות.');
    } catch {
      setErrorMessage('התחברות עם Google נכשלה. נסה שוב.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleToken = async ({idToken, name}) => {
    if (!idToken) return;
    setErrorMessage(null);
    setAppleLoading(true);
    try {
      const reg = await loginOrRegisterWithApple(idToken, {intent: 'login', name});
      const sub = reg?.subscription;
      if (reg?.success && canEnter(sub) && sub?.id) {
        onLoginSuccess?.(sub);
        return;
      }
      setErrorMessage(reg?.error || 'החשבון שלך עדיין לא אומת. אנא השלם את תהליך האימות.');
    } catch {
      setErrorMessage('התחברות עם Apple נכשלה. נסה שוב.');
    } finally {
      setAppleLoading(false);
    }
  };

  const handleForgot = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      window.alert('שגיאה\n\nאנא הזן כתובת מייל לפני איפוס הסיסמה.');
      return;
    }
    onForgotPassword?.(trimmed);
  };

  const canSubmit = email.trim() && password && !busy;

  return (
    <AccountScreen title="" onBack={onClose} backLabel="סגור" backIcon="close" width={480}>
      <img className={styles.logo} src={logo} alt="פאי 2701" />
      <form className={styles.loginCard} onSubmit={handleLogin} noValidate>
        <div>
          <h2 className={styles.loginTitle}>התחברות</h2>
          <p className={styles.loginInstruction}>הזן את כתובת המייל והסיסמה שלך</p>
        </div>

        {errorMessage ? (
          <div className={styles.loginError} role="alert">
            {errorMessage}
          </div>
        ) : null}

        <label className={styles.loginField}>
          <span className={styles.loginLabel}>כתובת מייל</span>
          <input
            className={styles.loginInput}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="הזן כתובת מייל"
            autoComplete="email"
            autoFocus
          />
        </label>

        <label className={styles.loginField}>
          <span className={styles.loginLabel}>סיסמה</span>
          <span className={styles.loginPasswordRow}>
            <button type="button" className={styles.loginToggle} onClick={() => setShowPassword(v => !v)}>
              {showPassword ? 'הסתר' : 'הצג'}
            </button>
            <input
              className={styles.loginInputBare}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="הזן סיסמה"
              autoComplete="current-password"
            />
          </span>
        </label>

        <button type="button" className={styles.loginForgot} onClick={handleForgot}>
          שכחתם את הסיסמא?
        </button>

        <button
          type="submit"
          className={`${styles.loginButton} ${canSubmit ? '' : styles.loginButtonDisabled}`}
          disabled={!canSubmit}>
          {isLoggingIn ? <Spinner /> : 'התחבר'}
        </button>

        <OrDivider />

        <GoogleButton
          text="signin_with"
          disabled={busy && !googleLoading}
          loading={googleLoading}
          onCredential={handleGoogleCredential}
          onError={setErrorMessage}
        />
        <AppleButton
          disabled={busy && !appleLoading}
          loading={appleLoading}
          onToken={handleAppleToken}
          onError={setErrorMessage}
        />
      </form>
    </AccountScreen>
  );
}
