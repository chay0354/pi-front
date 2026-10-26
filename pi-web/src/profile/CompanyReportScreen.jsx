import {useEffect, useMemo, useState} from 'react';
import {submitCompanyReport} from '../api/client';
import {useSession} from '../auth/session';
import styles from './CompanyReportScreen.module.css';

const REASONS = {
  company: [
    {key: 'construction_quality', label: 'בעיות באיכות הבנייה'},
    {key: 'delivery_deadline', label: 'החברה לא עמדה בזמני מסירת הפרויקט ללקוח'},
    {key: 'apartment_spec', label: 'החברה לא עמדה במפרט הדירה שהובטח'},
    {key: 'plan_changed_no_notice', label: 'החברה שינתה את התכנון בלי לעדכן את הלקוח'},
    {key: 'marketing_promises', label: 'החברה לא עמדה בהבטחותיה השיווקיות (למשל נוף לים)'},
    {key: 'other', label: 'סיבה אחרת'},
  ],
  professional: [
    {key: 'fictitious_listing', label: 'המודעה פיקטיבית'},
    {key: 'listing_error', label: 'מצאתי טעות במודעה'},
    {key: 'listing_not_current', label: 'המודעה אינה אקטואלית'},
    {key: 'wrong_phone_in_listing', label: 'מספר הטלפון במודעה שגוי'},
    {key: 'offensive_content', label: 'המודעה בעלת תוכן פוגעני'},
    {key: 'other', label: 'סיבה אחרת'},
  ],
  bnb: [
    {key: 'fictitious_listing', label: 'המודעה פיקטיבית'},
    {key: 'listing_error', label: 'מצאתי טעות במודעה'},
    {key: 'wrong_phone_in_listing', label: 'מספר הטלפון במודעה שגוי'},
    {key: 'offensive_content', label: 'המודעה בעלת תוכן פוגעני'},
    {key: 'fraud', label: 'זו הונאה'},
    {key: 'other', label: 'סיבה אחרת'},
  ],
  broker: [
    {key: 'listing_error', label: 'מצאתי טעות במודעה'},
    {key: 'listing_not_current', label: 'המודעה אינה אקטואלית'},
    {key: 'wrong_phone_in_listing', label: 'מספר הטלפון במודעה שגוי'},
    {key: 'offensive_content', label: 'המודעה בעלת תוכן פוגעני'},
    {key: 'broker_exclusivity_deadline', label: 'המתווך לא עמד בזמני מכירה של בלעדיות'},
    {key: 'price_or_details_mismatch', label: 'המחיר או אחד מפרטי המודעה שונים ממה שפורסם בפועל'},
    {key: 'business_listing_as_private', label: 'מודעה עסקית (מתווך/סוכן) המופיעה כמודעה פרטית'},
    {key: 'other', label: 'סיבה אחרת'},
  ],
};

const emailOk = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

export default function CompanyReportScreen({subjectType = 'company', reportedSubscriptionId, reportedListingId, displayName, onClose}) {
  const {currentUser} = useSession();
  const reasonsList = REASONS[subjectType] || REASONS.company;
  const [reasons, setReasons] = useState({});
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const u = currentUser;
    if (!u) return;
    const nextName = u.name || u.contact_person_name || u.business_name || u.broker_office_name || '';
    setName(prev => prev.trim() || String(nextName).trim());
    setEmail(prev => prev.trim() || String(u.email || '').trim());
    setPhone(prev => prev.trim() || String(u.phone || '').trim());
  }, [currentUser]);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const selected = useMemo(() => reasonsList.filter(r => reasons[r.key]).map(r => r.key), [reasons, reasonsList]);
  const canSubmit = (selected.length > 0 || description.trim()) && name.trim() && emailOk(email) && !submitting;

  const title =
    subjectType === 'broker'
      ? 'דווח על מתווך זה'
      : subjectType === 'bnb'
        ? 'דווח על מודעה זו'
        : subjectType === 'professional'
          ? displayName
            ? `דווח על ${displayName}`
            : 'דווח על בעל מקצוע'
          : 'דווח על חברה זו';

  const submit = async () => {
    if (!canSubmit) return;
    if (!emailOk(email)) {
      window.alert('נא להזין כתובת דוא״ל תקינה');
      return;
    }
    setSubmitting(true);
    const res = await submitCompanyReport({
      subjectType,
      reportedSubscriptionId,
      reportedListingId,
      companyDisplayName: displayName,
      reasonKeys: selected,
      description,
      reporterName: name,
      reporterPhone: phone,
      reporterEmail: email,
      reporterSubscriptionId: currentUser?.id || null,
    });
    setSubmitting(false);
    if (!res.success) {
      window.alert(res.error || 'שגיאה בשליחת הדיווח');
      return;
    }
    setDone(true);
  };

  return (
    <div className={styles.backdrop} data-account-modal="">
      <div className={styles.sheet} role="dialog" aria-label={title} dir="rtl">
        <button type="button" className={styles.handle} aria-label="סגור" onClick={onClose} />
        {done ? (
          <div className={styles.done}>
            <h2>הדיווח נשלח בהצלחה</h2>
            <button type="button" onClick={onClose}>סגור</button>
          </div>
        ) : (
          <div className={styles.body}>
            <h2>{title}</h2>
            {reasonsList.map(reason => (
              <button
                key={reason.key}
                type="button"
                className={styles.check}
                role="checkbox"
                aria-checked={!!reasons[reason.key]}
                onClick={() => setReasons(prev => ({...prev, [reason.key]: !prev[reason.key]}))}>
                <span className={reasons[reason.key] ? styles.boxOn : styles.box} />
                <span>{reason.label}</span>
              </button>
            ))}
            <label>
              תיאור
              <textarea value={description} placeholder="פרט את הבעיה שמצאת" onChange={e => setDescription(e.target.value)} />
            </label>
            <label>
              שם
              <input value={name} placeholder="השם המלא שלך" onChange={e => setName(e.target.value)} />
            </label>
            <label>
              מספר טלפון
              <input value={phone} placeholder="הזן מספר טלפון" onChange={e => setPhone(e.target.value)} />
            </label>
            <label>
              דוא״ל לקבלת תשובה
              <input value={email} placeholder="example@email.com" onChange={e => setEmail(e.target.value)} />
            </label>
            <button type="button" className={styles.send} disabled={!canSubmit} onClick={submit}>
              {submitting ? 'שולח...' : 'שלח דיווח'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
