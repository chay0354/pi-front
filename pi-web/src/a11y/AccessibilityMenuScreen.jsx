import {useEffect, useMemo, useState} from 'react';
import {mdiChevronLeft, mdiEmailOutline, mdiToggleSwitch, mdiToggleSwitchOffOutline} from '@mdi/js';
import MdiIcon from '../publish/MdiIcon';
import {useAccessibility} from './AccessibilityProvider';
import {DEFAULT_ACCESSIBILITY_PREFS, FONT_SCALE_MAX, FONT_SCALE_MIN, stepFontScale} from './prefs';
import AccessibilityStatementScreen from './AccessibilityStatementScreen';
import styles from './AccessibilityMenuScreen.module.css';

const A11Y_EMAIL = 'info@pi2701.co.il';

const prefsEqual = (a, b) =>
  a.fontScale === b.fontScale &&
  a.highContrast === b.highContrast &&
  a.readableFont === b.readableFont &&
  a.highlightLinks === b.highlightLinks &&
  a.reduceMotion === b.reduceMotion;

function ToggleRow({label, description, value, onToggle}) {
  return (
    <button type="button" className={styles.row} role="switch" aria-checked={value} onClick={onToggle}>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{label}</span>
        {description ? <span className={styles.rowHint}>{description}</span> : null}
      </span>
      <MdiIcon path={value ? mdiToggleSwitch : mdiToggleSwitchOffOutline} size={42} color={value ? '#FEE787' : '#8C85B3'} />
    </button>
  );
}

export default function AccessibilityMenuScreen({onClose}) {
  const {prefs, applyPrefs, resetPrefs} = useAccessibility();
  const [draft, setDraft] = useState(prefs);
  const [statement, setStatement] = useState(false);

  useEffect(() => {
    setDraft(prefs);
  }, [prefs]);

  useEffect(() => {
    if (statement) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, statement]);

  const percent = Math.round(draft.fontScale * 100);
  const canShrink = draft.fontScale > FONT_SCALE_MIN + 0.001;
  const canGrow = draft.fontScale < FONT_SCALE_MAX - 0.001;
  const isDirty = useMemo(() => !prefsEqual(draft, prefs), [draft, prefs]);

  const openMail = () => {
    const url = `mailto:${A11Y_EMAIL}?subject=${encodeURIComponent('פנייה בנושא נגישות — פאי 2701')}`;
    window.location.href = url;
  };

  const handleSave = () => {
    if (isDirty) applyPrefs(draft);
    window.alert('ההגדרות נשמרו וחלות עכשיו בכל המסכים.');
  };

  const handleReset = () => {
    setDraft({...DEFAULT_ACCESSIBILITY_PREFS});
    resetPrefs();
    window.alert('ההגדרות אופסו לכל המסכים.');
  };

  if (statement) return <AccessibilityStatementScreen onClose={() => setStatement(false)} />;

  return (
    <div className={styles.screen} dir="rtl">
      <div className={styles.scroll}>
        <header className={styles.header}>
          <button type="button" className={styles.backBtn} onClick={onClose} aria-label="חזרה">
            <MdiIcon path={mdiChevronLeft} size={36} color="#fff" />
          </button>
          <h1>נגישות</h1>
          <span className={styles.backBtn} />
        </header>
        <p className={styles.lead}>
          בחרו את ההתאמות ולחצו שמור. ההגדרות נשמרות במכשיר וחלות על כל המסכים באפליקציה, בהתאם לתקן הישראלי 5568 ול־WCAG 2.0 ברמה AA.
        </p>
        <section className={styles.card}>
          <h2>התאמות תצוגה</h2>
          <div className={styles.row}>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>גודל טקסט</span>
              <span className={styles.rowHint}>הגדלה או הקטנה של הכתב במערכת</span>
            </span>
            <span className={styles.stepper}>
              <button type="button" disabled={!canGrow} aria-label="הגדל טקסט" onClick={() => setDraft(prev => ({...prev, fontScale: stepFontScale(prev.fontScale, 1)}))}>
                א+
              </button>
              <span aria-label={`גודל טקסט ${percent} אחוז`}>{percent}%</span>
              <button type="button" disabled={!canShrink} aria-label="הקטן טקסט" onClick={() => setDraft(prev => ({...prev, fontScale: stepFontScale(prev.fontScale, -1)}))}>
                א−
              </button>
            </span>
          </div>
          <ToggleRow
            label="ניגודיות גבוהה"
            description="רקע כהה וטקסט בהיר לקריאה ברורה יותר"
            value={draft.highContrast}
            onToggle={() => setDraft(prev => ({...prev, highContrast: !prev.highContrast}))}
          />
          <ToggleRow
            label="גופן קריא"
            description="ריווח אותיות מוגדל לקריאה נוחה יותר"
            value={draft.readableFont}
            onToggle={() => setDraft(prev => ({...prev, readableFont: !prev.readableFont}))}
          />
          <ToggleRow
            label="הדגשת קישורים"
            description="קו תחתון ומסגרת סביב קישורים"
            value={draft.highlightLinks}
            onToggle={() => setDraft(prev => ({...prev, highlightLinks: !prev.highlightLinks}))}
          />
          <ToggleRow
            label="עצירת אנימציות"
            description="מפחית תנועה אוטומטית במסך"
            value={draft.reduceMotion}
            onToggle={() => setDraft(prev => ({...prev, reduceMotion: !prev.reduceMotion}))}
          />
        </section>
        <section className={styles.card}>
          <h2>מידע ופניות</h2>
          <button type="button" className={styles.row} onClick={() => setStatement(true)}>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>הצהרת נגישות</span>
              <span className={styles.rowHint}>תקן ישראלי 5568, WCAG 2.0 AA ופרטי אחראית הנגישות</span>
            </span>
            <MdiIcon path={mdiChevronLeft} size={26} color="#C9C7D6" />
          </button>
          <button type="button" className={styles.row} onClick={openMail}>
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>פנייה בנושא נגישות</span>
              <span className={styles.rowHint}>אחראית נגישות: מלי אשכנזי · {A11Y_EMAIL}</span>
            </span>
            <MdiIcon path={mdiEmailOutline} size={26} color="#C9C7D6" />
          </button>
        </section>
        <button type="button" className={styles.reset} onClick={handleReset}>
          איפוס הגדרות
        </button>
      </div>
      <footer className={styles.footer}>
        <button type="button" className={isDirty ? styles.save : styles.saveIdle} onClick={handleSave}>
          שמור
        </button>
      </footer>
    </div>
  );
}
