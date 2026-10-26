import {useEffect, useState} from 'react';
import {mdiCheck} from '@mdi/js';
import MdiIcon from '../MdiIcon';
import {PROFESSIONAL_FILTER_TYPES} from '../lib/publishRules';
import {GOLD_GRADIENT_CSS} from '../lib/goldGradient';
import styles from './PostTargetProfessionalsSheet.module.css';

/**
 * Shown right before a new feed post is published. Lets the poster tag the post
 * with professional types so matching professionals and, for תיווך, brokers get a chat
 * notification from the system "עדכונים על פוסטים רלוונטים" account.
 */
export default function PostTargetProfessionalsSheet({visible, onSkip, onConfirm, submitting = false}) {
  const [selectedTypes, setSelectedTypes] = useState([]);

  useEffect(() => {
    if (!visible) return undefined;
    setSelectedTypes([]);
    const onKey = e => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (!submitting) onSkip?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [visible, submitting, onSkip]);

  if (!visible) return null;

  const toggleType = type => {
    setSelectedTypes(prev => (prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]));
  };

  const handleSkip = () => {
    if (submitting) return;
    onSkip?.();
  };

  const handleConfirm = () => {
    if (submitting) return;
    onConfirm?.(selectedTypes);
  };

  return (
    <div className={styles.root} data-account-modal="" role="dialog" aria-modal="true" aria-label="הפוסט הזה רלוונטי לבעלי מקצוע?">
      <button type="button" className={styles.overlay} aria-label="סגור" disabled={submitting} onClick={handleSkip} />
      <div className={styles.sheet}>
        <div className={styles.grabberWrap}>
          <span className={styles.grabber} />
        </div>
        <h2 className={styles.title}>הפוסט הזה רלוונטי לבעלי מקצוע?</h2>
        <p className={styles.subtitle}>
          בחר אחד או יותר מהתחומים הבאים ובעלי מקצוע רשומים בתחום יקבלו הודעה בצ׳אט על הפוסט שלך, או המשך
          לפרסום בלי לתייג
        </p>
        <div className={styles.chipsScroll}>
          {PROFESSIONAL_FILTER_TYPES.map(type => {
            const isSelected = selectedTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                disabled={submitting}
                className={styles.chipTouchable}
                onClick={() => toggleType(type)}>
                {isSelected ? (
                  <span className={styles.chipSelected} style={{background: GOLD_GRADIENT_CSS}}>
                    <MdiIcon path={mdiCheck} size={18} color="#1E1D27" />
                    <span className={styles.chipSelectedText}>{type}</span>
                  </span>
                ) : (
                  <span className={styles.chip}>
                    <span className={styles.chipText}>{type}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className={styles.actionsRow}>
          <button type="button" className={styles.skipBtn} disabled={submitting} onClick={handleSkip}>
            לא, המשך לפרסום
          </button>
          <button
            type="button"
            className={styles.confirmBtnWrap}
            disabled={submitting || selectedTypes.length === 0}
            onClick={handleConfirm}>
            <span className={styles.confirmBtn} style={{background: GOLD_GRADIENT_CSS}}>
              פרסם ושלח לבעלי מקצוע
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
