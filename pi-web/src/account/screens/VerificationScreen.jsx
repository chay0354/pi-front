import {useState} from 'react';
import {
  applySubscriptionPromoCode,
  prepareSubscriptionSubmitPayload,
  resendVerificationCode,
  setSubscriptionPassword,
  submitSubscription,
  verifyEmail,
  verifyEmailSkipTest,
} from '../../api/client';
import {AccountScreen, Icon, PasswordInput, PrimaryButton, TextInput, TextLink, Wizard} from '../AccountUi';
import {
  DEFAULT_MONTHLY_LISTING_QUOTA,
  MIN_PASSWORD_LENGTH,
  SHOW_SKIP_EMAIL_VERIFICATION_TEST,
  getHeaderTitle,
  subscriptionTypes,
} from '../constants';
import emailIcon from '../../assets/account/email-icon.png';
import styles from './FormScreens.module.css';

const alertError = message => window.alert(`שגיאה\n\n${message}`);

/**
 * Wizard step 2 — set a password, send the email code (this is when the step-1 form is actually
 * submitted), optional coupon, then enter the 6-digit code.
 */
export default function VerificationScreen({
  subscriptionType = subscriptionTypes.broker,
  email: propEmail,
  subscriptionId: propSubscriptionId,
  pendingSubmit,
  onClose,
  onVerified,
  onSkipVerifiedTest,
}) {
  const displayEmail = String(propEmail || '').trim();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSkipTesting, setIsSkipTesting] = useState(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState(() => (pendingSubmit?.formData ? null : propSubscriptionId || null));
  const [promoCode, setPromoCode] = useState('');
  const [monthlyQuota, setMonthlyQuota] = useState(DEFAULT_MONTHLY_LISTING_QUOTA);
  const [promoApplied, setPromoApplied] = useState(false);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const activeSubscriptionId = subscriptionId || propSubscriptionId || null;
  const passwordsFilled = password.length >= MIN_PASSWORD_LENGTH && confirmPassword.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = password === confirmPassword;
  const passwordsReady = passwordsFilled && passwordsMatch;
  const isSendReady = passwordsReady && !!displayEmail && !verificationEmailSent;
  const passwordMismatch = confirmPassword.length > 0 && password.length > 0 && password !== confirmPassword;
  const canApplyPromo = !promoApplied && promoCode.trim().length >= 3 && !isApplyingPromo && (!!activeSubscriptionId || passwordsReady);
  const codeFilled = verificationCode.trim().length > 0;
  const canVerifyCode = verificationEmailSent && verificationCode.trim().length >= 6;
  const canShowSkipTest = SHOW_SKIP_EMAIL_VERIFICATION_TEST && onSkipVerifiedTest && (subscriptionId || pendingSubmit?.formData);

  const createSubscription = async () => {
    const prepared = await prepareSubscriptionSubmitPayload(pendingSubmit.formData, pendingSubmit.files || {});
    const created = await submitSubscription(prepared.formData, prepared.files);
    if (!created?.success || !created.subscriptionId) throw new Error(created?.error || 'נכשל בשמירת הטופס');
    setSubscriptionId(created.subscriptionId);
    return created.subscriptionId;
  };

  const ensureSubscriptionId = async () => {
    const existing = subscriptionId || propSubscriptionId || null;
    if (existing) return existing;
    if (!displayEmail) throw new Error('חסר מייל מהשלב הקודם. חזרו לשלב 1.');
    if (!passwordsReady) {
      throw new Error(`הגדירו סיסמה תואמת (לפחות ${MIN_PASSWORD_LENGTH} תווים) לפני הפעלת הקופון`);
    }
    if (!pendingSubmit?.formData) throw new Error('חסרים פרטי הרשמה. חזרו לשלב 1.');
    const subId = await createSubscription();
    await setSubscriptionPassword(subId, password);
    return subId;
  };

  const finishVerified = (subscription, subscriberNumber, complete = onVerified) => {
    if (!subscription || !complete) return;
    const sub = {...subscription};
    if (!sub.subscriber_number && subscriberNumber) sub.subscriber_number = subscriberNumber;
    if (!sub.max_published_listings && monthlyQuota > DEFAULT_MONTHLY_LISTING_QUOTA) {
      sub.max_published_listings = monthlyQuota;
    }
    complete(sub);
  };

  const handleSendVerificationEmail = async () => {
    if (isSending || verificationEmailSent) return;
    if (!displayEmail) return alertError('חסר מייל מהשלב הקודם. חזרו לשלב 1.');
    if (!passwordsFilled) return alertError(`הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`);
    if (!passwordsMatch) return alertError('הסיסמאות אינן תואמות');
    setIsSending(true);
    try {
      const subId = await ensureSubscriptionId();
      await resendVerificationCode(displayEmail, subId, password);
      setVerificationEmailSent(true);
      window.alert('הצלחה\n\nקוד האימות נשלח למייל שלך');
    } catch (error) {
      alertError(error.message || 'נכשל בשמירת הסיסמה או בשליחת מייל האימות');
    } finally {
      setIsSending(false);
    }
  };

  const handleApplyPromoCode = async () => {
    if (!canApplyPromo) return;
    setIsApplyingPromo(true);
    try {
      const subId = await ensureSubscriptionId();
      const result = await applySubscriptionPromoCode(subId, promoCode.trim());
      const quota = Number(result?.maxPublishedListings ?? result?.subscription?.max_published_listings) || DEFAULT_MONTHLY_LISTING_QUOTA;
      setMonthlyQuota(quota);
      setPromoApplied(true);
      const bonusMonths = Number(result?.bonusMonths) || 0;
      const totalMonths = Number(result?.totalMonths) || 3 + bonusMonths;
      window.alert(
        `קופון הופעל\n\n${
          bonusMonths > 0
            ? `המנוי שלך הוארך ב-${bonusMonths} חודשים נוספים — סה"כ ${totalMonths} חודשי שימוש`
            : 'הקופון הופעל בהצלחה'
        }`,
      );
    } catch (error) {
      alertError(error.message || 'קוד הקופון אינו תקף');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!canVerifyCode || isVerifyingCode) return;
    if (!subscriptionId) return alertError('חסר מזהה מנוי. שלחו קוד אימות קודם.');
    setIsVerifyingCode(true);
    try {
      const response = await verifyEmail(displayEmail, verificationCode.trim(), subscriptionId, password);
      if (response?.success && response.subscription) {
        finishVerified(response.subscription, response.subscriberNumber);
      } else {
        alertError(response?.error || 'קוד האימות שגוי. אנא נסה שוב.');
      }
    } catch (error) {
      alertError(error.message || 'קוד האימות שגוי. אנא נסה שוב.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (!verificationEmailSent || isResending || !displayEmail || !subscriptionId) return;
    setIsResending(true);
    try {
      await resendVerificationCode(displayEmail, subscriptionId, password);
      window.alert('הצלחה\n\nקוד האימות נשלח מחדש למייל שלך');
    } catch (error) {
      alertError(error.message || 'נכשל בשליחת הקוד מחדש');
    } finally {
      setIsResending(false);
    }
  };

  const handleSkipVerificationTest = async () => {
    if (!canShowSkipTest || isSkipTesting) return;
    if (!passwordsReady) {
      return alertError(`הגדירו סיסמה תואמת (לפחות ${MIN_PASSWORD_LENGTH} תווים) לפני דילוג האימות`);
    }
    setIsSkipTesting(true);
    try {
      let subId = subscriptionId;
      if (!subId && pendingSubmit?.formData) subId = await createSubscription();
      if (!subId) throw new Error('חסר מזהה מנוי');
      await setSubscriptionPassword(subId, password);
      const response = await verifyEmailSkipTest(displayEmail || undefined, subId, password);
      if (response?.success && response.subscription) {
        finishVerified(response.subscription, response.subscriberNumber, onSkipVerifiedTest);
      }
    } catch (err) {
      alertError(err.message || 'נכשל בדילוג האימות');
    } finally {
      setIsSkipTesting(false);
    }
  };

  const skipLink = canShowSkipTest ? (
    <TextLink className={styles.skipLink} disabled={isSkipTesting} onClick={handleSkipVerificationTest}>
      {isSkipTesting ? 'מדלג...' : 'דלג (בדיקה)'}
    </TextLink>
  ) : null;

  return (
    <AccountScreen title={getHeaderTitle(subscriptionType)} onBack={onClose} backdrop width={520} header={<Wizard step={2} />}>
      <section className={styles.verifySection}>
        <div className={styles.instructionRow}>
          <img src={emailIcon} alt="" />
          <span>הגדירו סיסמה ואשרו את המייל להמשך ההרשמה</span>
        </div>

        <div className={styles.readOnlyEmail} dir="ltr">
          {displayEmail}
        </div>

        <PasswordInput
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="סיסמה"
          show={showPassword}
          onToggleShow={() => setShowPassword(v => !v)}
        />
        <TextInput
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="אימות סיסמה"
          autoComplete="new-password"
          invalid={passwordMismatch}
        />
        {passwordMismatch ? <p className={styles.errorHint}>הסיסמאות אינן תואמות</p> : null}

        {verificationEmailSent ? (
          <div className={styles.sentBanner}>
            <Icon name="check-circle" size={24} color="#15e3ff" />
            <span>קוד נשלח למייל</span>
          </div>
        ) : (
          <PrimaryButton disabled={!isSendReady} loading={isSending} onClick={handleSendVerificationEmail}>
            שלח קוד אימות
          </PrimaryButton>
        )}
        {!verificationEmailSent ? skipLink : null}
        {!verificationEmailSent && !isSendReady ? (
          <p className={styles.sendHint}>
            {passwordMismatch
              ? 'הסיסמאות אינן תואמות'
              : passwordsMatch && !passwordsFilled
                ? `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`
                : `מלאו סיסמה ואימות סיסמה (לפחות ${MIN_PASSWORD_LENGTH} תווים)`}
          </p>
        ) : null}
      </section>

      <section className={styles.promoCard}>
        <div className={styles.promoHeader}>
          <Icon name="ticket" size={26} color="#F4AD39" />
          <span className={styles.promoTitle}>קוד קופון (אופציונלי)</span>
        </div>
        <p className={styles.promoSubtitle}>אם יש ברשותכם קוד קופון הזינו אותו כאן</p>
        {promoApplied ? (
          <span className={styles.promoBadge}>
            <Icon name="check" size={16} color="#15e3ff" />
            קופון פעיל
          </span>
        ) : null}
        <TextInput
          className={styles.upper}
          value={promoCode}
          onChange={e => setPromoCode(e.target.value.toUpperCase())}
          placeholder="הזינו קוד קופון"
          autoCorrect="off"
          spellCheck={false}
          disabled={promoApplied}
          filled={promoApplied}
        />
        <button type="button" className={styles.promoApply} disabled={!canApplyPromo} onClick={handleApplyPromoCode}>
          {isApplyingPromo ? <span className={styles.promoSpinner} /> : promoApplied ? 'הקופון הופעל' : 'החל קופון'}
        </button>
      </section>

      {verificationEmailSent ? (
        <section className={styles.codeSection}>
          <h3 className={styles.codeTitle}>הזינו את קוד האימות</h3>
          <p className={styles.codeSubtitle}>
            הקוד נשלח ל-<span dir="ltr">{displayEmail}</span>
          </p>
          <div className={`${styles.codeRow} ${codeFilled ? styles.codeRowFilled : ''}`}>
            {codeFilled ? (
              <button type="button" className={styles.codeClear} onClick={() => setVerificationCode('')} aria-label="נקה קוד">
                <Icon name="close" size={20} />
              </button>
            ) : null}
            <input
              className={styles.codeInput}
              value={verificationCode}
              onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="קוד אימות (6 ספרות)"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
            />
          </div>
          <PrimaryButton disabled={!canVerifyCode} loading={isVerifyingCode} onClick={handleVerifyCode}>
            אימות והמשך
          </PrimaryButton>
          <TextLink disabled={isResending} onClick={handleResendCode}>
            {isResending ? 'שולח...' : 'לא קיבלתי את הקוד'}
          </TextLink>
          {skipLink}
        </section>
      ) : null}
    </AccountScreen>
  );
}
