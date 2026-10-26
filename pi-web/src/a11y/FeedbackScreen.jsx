import {useEffect, useState} from 'react';
import {mdiChevronLeft} from '@mdi/js';
import MdiIcon from '../publish/MdiIcon';
import {submitImprovementFeedback, toSubscriptionId} from '../api/client';
import {useSession} from '../auth/session';
import {RatingImprovePicker} from '../profile/ProfileParts';
import styles from './FeedbackScreen.module.css';

export default function FeedbackScreen({onClose}) {
  const {currentUser} = useSession();
  const [step, setStep] = useState('form');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hasFeedbackText = message.trim() !== '';
  const sendDisabled = submitting || rating < 1 || !hasFeedbackText;

  const handleSubmit = async () => {
    if (sendDisabled) return;
    setSubmitting(true);
    const creatorName =
      (currentUser?.name && String(currentUser.name).trim()) ||
      (currentUser?.contact_person_name && String(currentUser.contact_person_name).trim()) ||
      (currentUser?.business_name && String(currentUser.business_name).trim()) ||
      (currentUser?.broker_office_name && String(currentUser.broker_office_name).trim()) ||
      null;
    const result = await submitImprovementFeedback({
      rating,
      improvementText: message,
      creatorSubscriptionId: toSubscriptionId(currentUser?.id),
      creatorEmail: currentUser?.email || null,
      creatorName,
      creatorSubscriptionType: currentUser?.subscription_type || null,
      creatorSubscriberNumber: currentUser?.subscriber_number || null,
      sourceScreen: 'feedbackSuggestion',
    });
    setSubmitting(false);
    if (!result.success) {
      window.alert('לא הצלחנו לשלוח את המשוב. נסה שוב.');
      return;
    }
    setStep('thanks');
  };

  return (
    <div className={styles.screen} dir="rtl">
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onClose} aria-label="חזרה">
          <MdiIcon path={mdiChevronLeft} size={36} color="#fff" />
        </button>
        <h1>הצעות לשיפור</h1>
        <span className={styles.backBtn} />
      </header>
      {step === 'thanks' ? (
        <button type="button" className={styles.thanks} onClick={onClose}>
          <p>תודה על המשוב</p>
          <span>חזרה</span>
        </button>
      ) : (
        <div className={styles.card}>
          <h2>נהנית מהחוויה?</h2>
          <p className={styles.hint}>דרג את החווייה שלך</p>
          <RatingImprovePicker value={rating} onChange={setRating} />
          <p className={styles.hint}>נשמח לשמוע מה חשבת ואיך נוכל להשתפר.</p>
          <textarea value={message} placeholder="כתוב משוב" onChange={e => setMessage(e.target.value)} />
          <button type="button" className={styles.send} disabled={sendDisabled} onClick={handleSubmit}>
            {submitting ? 'שולח...' : 'שלח משוב'}
          </button>
        </div>
      )}
    </div>
  );
}
