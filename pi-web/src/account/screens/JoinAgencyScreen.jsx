import {useState} from 'react';
import {joinAgencyWithCode} from '../../api/client';
import {AccountScreen, ErrorBox, Field, PasswordInput, PrimaryButton, TextInput} from '../AccountUi';
import {MIN_PASSWORD_LENGTH} from '../constants';
import styles from './AgencyScreens.module.css';

/** הצטרף לסוכנות קיימת — a marketer registers under a manager's invite code. */
export default function JoinAgencyScreen({onClose, onJoined}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = name.trim() && phone.trim() && email.trim() && password.length >= MIN_PASSWORD_LENGTH && code.trim();

  const handleSubmit = async e => {
    e?.preventDefault();
    if (!canSubmit || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await joinAgencyWithCode({
        email: email.trim(),
        password,
        name: name.trim() || null,
        phone: phone.trim(),
        code: code.trim().toUpperCase(),
      });
      onJoined?.(res?.subscription || null, res?.agency || null);
    } catch (err) {
      setError(err?.message || 'ההצטרפות נכשלה, נסה שוב');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AccountScreen title="הצטרפות לסוכנות" onBack={onClose} backdrop width={480}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <p className={styles.lead}>
          הזינו את פרטי החשבון והקוד שקיבלתם ממנהל הסוכנות. קוד הצטרפות יוסיף משווק חדש, וקוד החלפה יחליף משווק קיים בלי
          לאבד מודעות, פוסטים או שיחות.
        </p>

        <ErrorBox>{error}</ErrorBox>

        <Field label="שם מלא" required>
          <TextInput value={name} onChange={e => setName(e.target.value)} placeholder="הזן שם מלא" autoComplete="name" />
        </Field>
        <Field label="מספר טלפון" required>
          <TextInput type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="הזן מספר טלפון" autoComplete="tel" />
        </Field>
        <Field label="שם משתמש (מייל)" required>
          <TextInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="הזן כתובת מייל" autoComplete="email" />
        </Field>
        <Field label="סיסמה" required>
          <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder={`לפחות ${MIN_PASSWORD_LENGTH} תווים`} />
        </Field>
        <Field label="קוד הצטרפות" required>
          <TextInput
            className={styles.codeInput}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="הזן את הקוד"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>

        <PrimaryButton type="submit" disabled={!canSubmit} loading={submitting}>
          הצטרף לסוכנות
        </PrimaryButton>
      </form>
    </AccountScreen>
  );
}
