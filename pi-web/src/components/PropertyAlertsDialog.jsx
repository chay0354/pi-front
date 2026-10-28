import {useEffect, useState} from 'react';
import {getPropertyAlerts, savePropertyAlerts} from '../api/client';
import styles from './PropertyAlertsDialog.module.css';

const FALLBACK_OPTIONS = [
  {id: 10, label: 'דירות'},
  {id: 1, label: 'חדש מקבלן'},
  {id: 12, label: 'יוקרה'},
  {id: 2, label: 'משרדים'},
  {id: 8, label: 'מסחר'},
  {id: 7, label: 'קרקעות'},
  {id: 5, label: 'BNB'},
  {id: 3, label: 'שותפים'},
  {id: 6, label: 'מגזר דתי'},
  {id: 4, label: 'גלובל'},
];

export default function PropertyAlertsDialog({subscriptionId, email, onClose}) {
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState([]);
  const [options, setOptions] = useState(FALLBACK_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getPropertyAlerts(subscriptionId)
      .then(data => {
        if (cancelled || !data?.success) return;
        setEnabled(data.enabled === true);
        setSelected(Array.isArray(data.categories) ? data.categories.map(Number) : []);
        if (Array.isArray(data.options) && data.options.length) setOptions(data.options);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'לא הצלחנו לטעון את הבחירה');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subscriptionId]);

  const toggleCategory = id => {
    setSelected(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
  };

  const onSave = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await savePropertyAlerts({subscriptionId, enabled, categories: selected});
      if (!data?.success) throw new Error(data?.error || 'השמירה נכשלה');
      onClose();
    } catch (err) {
      setError(err.message || 'השמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.layer} role="presentation">
      <button type="button" className={styles.backdrop} aria-label="סגירה" onClick={onClose} />
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="property-alerts-title">
        <div className={styles.head}>
          <button type="button" className={styles.close} onClick={onClose} aria-label="סגירה">
            ✕
          </button>
          <p className={styles.kicker}>PI 2701</p>
        </div>
        <h2 id="property-alerts-title">עדכון נכסים חדשים</h2>
        <p className={styles.lead}>בחרו אם לקבל מייל על כל נכס חדש שעולה, ובאילו קטגוריות.</p>
        {email ? <p className={styles.mail}>{email}</p> : null}

        {loading ? (
          <p className={styles.lead}>טוען…</p>
        ) : (
          <>
            <button
              type="button"
              className={styles.toggle}
              aria-pressed={enabled}
              onClick={() => setEnabled(value => !value)}>
              <span className={enabled ? styles.trackOn : styles.track}>
                <span className={enabled ? styles.knobOn : styles.knob} />
              </span>
              <span>אני מעוניין לקבל התראות על נכסים למייל</span>
            </button>
            {enabled ? (
              <div className={styles.categories}>
                <p className={styles.section}>קטגוריות</p>
                <div className={styles.chips}>
                  {options.map(option => {
                    const on = selected.includes(Number(option.id));
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={on ? styles.chipOn : styles.chip}
                        aria-pressed={on}
                        onClick={() => toggleCategory(Number(option.id))}>
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className={styles.hint}>
                  {selected.length
                    ? 'על כל נכס חדש בקטגוריות שסומנו יישלח מייל.'
                    : 'בחרו לפחות קטגוריה אחת כדי להתחיל לקבל מיילים.'}
                </p>
              </div>
            ) : null}
          </>
        )}

        {error ? <p className={styles.error}>{error}</p> : null}
        <button type="button" className={styles.save} onClick={onSave} disabled={saving || loading}>
          {saving ? 'שומר…' : 'שמירה'}
        </button>
      </section>
    </div>
  );
}
