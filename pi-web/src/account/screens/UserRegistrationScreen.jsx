import {useCallback, useState} from 'react';
import {checkEmailAvailable, loginOrRegisterWithApple, loginOrRegisterWithGoogle, registerRegularUser, uploadProfilePicture} from '../../api/client';
import {
  AccountScreen,
  ErrorBox,
  Field,
  Icon,
  OrDivider,
  PasswordInput,
  PhoneInput,
  PrimaryButton,
  TextInput,
  accountStyles as ui,
  pickFile,
} from '../AccountUi';
import CircleCropModal from '../CircleCropModal';
import AppleButton from '../AppleButton';
import GoogleButton from '../GoogleButton';
import {MIN_PASSWORD_LENGTH, subscriptionTypes} from '../constants';
import {ProfileAvatar} from '../../profile/ProfileParts';
import styles from './AuthScreens.module.css';

const validLock = lock => (lock === 'business' || lock === 'private' ? lock : null);

/**
 * הירשם ופרסם מודעה — regular (`user`) sign-up. `bnbHostLock` / `bnbBusinessRegistration` come from
 * the guest BnB publish intent: a business host registers with "שם העסק" and a gold avatar ring.
 */
export default function UserRegistrationScreen({onSuccess, onCancel, bnbBusinessRegistration = false, bnbHostLock = null}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [socialName, setSocialName] = useState('');
  const [socialPhone, setSocialPhone] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [cropUri, setCropUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [socialError, setSocialError] = useState(null);

  const isBnbBusinessSignup = bnbBusinessRegistration || bnbHostLock === 'business';
  const nameFieldLabel = isBnbBusinessSignup ? 'שם העסק' : 'שם מלא';
  const nameFieldPlaceholder = isBnbBusinessSignup ? 'שם העסק' : 'שם פרטי ומשפחה';
  const nameRequiredMessage = isBnbBusinessSignup ? 'אנא הזן שם עסק' : 'אנא הזן שם מלא';
  const busy = submitting || googleLoading || appleLoading;

  const finishAuthWithSubscription = useCallback(
    (reg, {fallbackEmail = '', fallbackName = '', fallbackPhone = '', fallbackProfilePictureUrl = null, fallbackAddress = ''} = {}) => {
      if (!reg || !reg.success || !reg.subscription || !reg.subscription.id) {
        setErrorMessage(reg?.error || 'לא הצלחנו להתחבר. נסה שוב.');
        return false;
      }
      const sub = reg.subscription;
      onSuccess?.({
        ...sub,
        id: sub.id,
        subscription_type: sub.subscription_type || subscriptionTypes.user,
        email: sub.email || fallbackEmail,
        name: sub.name || fallbackName || sub.email || fallbackEmail,
        phone: sub.phone || fallbackPhone || null,
        business_address: sub.business_address || fallbackAddress || null,
        profile_picture_url: sub.profile_picture_url || fallbackProfilePictureUrl || null,
        status: sub.status || 'verified',
        _justCreated: reg.created === true,
      });
      return true;
    },
    [onSuccess],
  );

  const pickProfileImage = async () => {
    const file = await pickFile('image/*');
    if (file) setCropUri(URL.createObjectURL(file));
  };

  const handleRegister = async e => {
    e?.preventDefault();
    setErrorMessage(null);
    const name = fullName.trim();
    const emailTrim = email.trim();
    const phoneTrim = phone.trim();
    const addressTrim = address.trim();

    if (!name) return setErrorMessage(nameRequiredMessage);
    if (!emailTrim) return setErrorMessage('אנא הזן כתובת מייל');
    if (!phoneTrim) return setErrorMessage('אנא הזן מספר טלפון');
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setErrorMessage(`הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`);
    }
    if (password !== confirmPassword) return setErrorMessage('הסיסמאות אינן תואמות');

    setSubmitting(true);
    try {
      const emailCheck = await checkEmailAvailable(emailTrim);
      if (!emailCheck?.available) {
        setErrorMessage(
          emailCheck?.error || 'כתובת המייל כבר רשומה במערכת. התחבר עם המייל הקיים או השתמש במייל אחר.',
        );
        return;
      }

      let profilePictureUrl = null;
      if (profileImage) {
        try {
          const data = await uploadProfilePicture(profileImage);
          if (data?.url) profilePictureUrl = data.url;
        } catch (uploadErr) {
          console.warn('Profile picture upload failed:', uploadErr);
        }
      }

      let reg;
      try {
        reg = await registerRegularUser({
          email: emailTrim,
          name,
          phone: phoneTrim,
          businessAddress: addressTrim || null,
          profilePictureUrl,
          password,
          bnbHostLock: validLock(bnbHostLock),
        });
      } catch (regErr) {
        setErrorMessage(regErr?.message || 'שגיאה בשמירת המשתמש. נסה שוב.');
        return;
      }
      if (!reg || !reg.success || !reg.subscription || !reg.subscription.id) {
        setErrorMessage(reg?.error || 'לא הצלחנו ליצור את המשתמש. נסה שוב.');
        return;
      }
      finishAuthWithSubscription(reg, {
        fallbackEmail: emailTrim,
        fallbackName: name,
        fallbackPhone: phoneTrim,
        fallbackAddress: addressTrim,
        fallbackProfilePictureUrl: profilePictureUrl,
      });
    } catch (err) {
      setErrorMessage(err.message || 'אירעה שגיאה. נסה שוב.');
    } finally {
      setSubmitting(false);
    }
  };

  const socialFieldsError = provider => {
    if (!socialName.trim()) {
      return isBnbBusinessSignup
        ? `אנא הזן שם עסק לפני ההרשמה עם ${provider}`
        : `אנא הזן שם מלא לפני ההרשמה עם ${provider}`;
    }
    if (!socialPhone.trim()) return `אנא הזן מספר טלפון לפני ההרשמה עם ${provider}`;
    return null;
  };

  const handleGoogleCredential = async idToken => {
    if (!idToken) return;
    setErrorMessage(null);
    setSocialError(null);
    setGoogleLoading(true);
    try {
      const reg = await loginOrRegisterWithGoogle(idToken, {
        phone: socialPhone.trim(),
        name: socialName.trim() || null,
        businessAddress: address.trim() || null,
        intent: 'register',
        bnbHostLock: validLock(bnbHostLock),
      });
      if (!reg?.success) {
        setSocialError(reg?.error || 'לא הצלחנו להתחבר עם Google. נסה שוב.');
        return;
      }
      finishAuthWithSubscription(reg, {
        fallbackPhone: socialPhone.trim(),
        fallbackName: socialName.trim(),
        fallbackAddress: address.trim(),
      });
    } catch {
      setSocialError('התחברות עם Google נכשלה. נסה שוב.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleToken = async ({idToken, name}) => {
    if (!idToken) return;
    setErrorMessage(null);
    setSocialError(null);
    setAppleLoading(true);
    try {
      const reg = await loginOrRegisterWithApple(idToken, {
        phone: socialPhone.trim(),
        name: socialName.trim() || name || null,
        businessAddress: address.trim() || null,
        intent: 'register',
        bnbHostLock: validLock(bnbHostLock),
      });
      if (!reg?.success) {
        setSocialError(reg?.error || 'לא הצלחנו להתחבר עם Apple. נסה שוב.');
        return;
      }
      finishAuthWithSubscription(reg, {
        fallbackPhone: socialPhone.trim(),
        fallbackName: socialName.trim() || name || '',
        fallbackAddress: address.trim(),
      });
    } catch {
      setSocialError('התחברות עם Apple נכשלה. נסה שוב.');
    } finally {
      setAppleLoading(false);
    }
  };

  const socialFieldsMessage = socialFieldsError('Google');

  const cropModal = cropUri ? (
    <CircleCropModal
      imageUri={cropUri}
      title="חתוך את תמונת הפרופיל"
      onCancel={() => setCropUri(null)}
      onConfirm={result => {
        if (result?.uri) setProfileImage({...result, name: `profile-${Date.now()}.jpg`});
        setCropUri(null);
      }}
    />
  ) : null;

  return (
    <AccountScreen title="" onBack={onCancel} backLabel="חזרה" surface width={460} overlay={cropModal}>
      <form className={styles.registerCard} onSubmit={handleRegister} noValidate>
        <div className={styles.profileSection}>
          <button type="button" className={styles.avatarBtn} onClick={pickProfileImage} aria-label="בחר תמונת פרופיל">
            <ProfileAvatar
              uri={profileImage?.uri || null}
              size={96}
              subscriptionType={subscriptionTypes.user}
              forceGoldRing={bnbBusinessRegistration}
            />
            {!profileImage ? (
              <span className={styles.avatarBadge}>
                <Icon name="plus" size={20} color="#fff" />
              </span>
            ) : null}
          </button>
          <span className={styles.profileLabel}>תמונת פרופיל</span>
        </div>

        <div className={styles.titleBlockCenter}>
          <h2 className={ui.headline}>הירשם ופרסם מודעה</h2>
          <p className={styles.subtitle}>בוא נתחיל - זה ייקח שניות בודדות</p>
        </div>

        <div className={styles.formBlock}>
          <ErrorBox>{errorMessage}</ErrorBox>

          <Field label={nameFieldLabel} required>
            <TextInput value={fullName} onChange={e => setFullName(e.target.value)} placeholder={nameFieldPlaceholder} autoComplete="name" />
          </Field>
          <Field label="כתובת מייל" required>
            <TextInput
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              autoComplete="email"
            />
          </Field>
          <Field label="סיסמה" required>
            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="בחרו סיסמה"
              show={showPassword}
              onToggleShow={() => setShowPassword(v => !v)}
            />
          </Field>
          <Field label="אימות סיסמה" required>
            <TextInput
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="הזינו שוב את הסיסמה"
              autoComplete="new-password"
            />
          </Field>
          <Field label="טלפון">
            <PhoneInput value={phone} onChange={e => setPhone(e.target.value)} />
          </Field>
          <Field label="כתובת">
            <TextInput value={address} onChange={e => setAddress(e.target.value)} placeholder="רחוב, עיר" autoComplete="street-address" />
          </Field>
        </div>

        <PrimaryButton type="submit" disabled={busy && !submitting} loading={submitting}>
          הרשם ופרסם מודעה
        </PrimaryButton>

        <OrDivider />

        <div className={styles.formBlock}>
          <Field label={isBnbBusinessSignup ? 'שם העסק להרשמה עם Google / Apple' : 'שם מלא להרשמה עם Google / Apple'} required>
            <TextInput
              value={socialName}
              onChange={e => {
                setSocialName(e.target.value);
                if (socialError) setSocialError(null);
              }}
              placeholder={nameFieldPlaceholder}
            />
          </Field>
          <Field label="טלפון להרשמה עם Google / Apple" required>
            <PhoneInput
              value={socialPhone}
              onChange={e => {
                setSocialPhone(e.target.value);
                if (socialError) setSocialError(null);
              }}
            />
          </Field>

          <GoogleButton
            text="signup_with"
            canStart={!socialFieldsMessage}
            onBlocked={() => {
              setErrorMessage(null);
              setSocialError(socialFieldsMessage);
            }}
            disabled={busy && !googleLoading}
            loading={googleLoading}
            onCredential={handleGoogleCredential}
            onError={setSocialError}
          />
          <AppleButton
            canStart={!socialFieldsError('Apple')}
            onBlocked={() => {
              setErrorMessage(null);
              setSocialError(socialFieldsError('Apple'));
            }}
            disabled={busy && !appleLoading}
            loading={appleLoading}
            onToken={handleAppleToken}
            onError={setSocialError}
          />

          {socialError ? (
            <div className={styles.socialError} role="alert">
              {socialError}
            </div>
          ) : null}
        </div>
      </form>
    </AccountScreen>
  );
}
