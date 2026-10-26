import {useState} from 'react';
import {AccountScreen, Icon, PrimaryButton, RoundCheckbox, TextLink} from '../AccountUi';
import {getHeaderTitle, subscriptionTypes} from '../constants';
import brokerProfile from '../../assets/account/subscription-broker-profile.png';
import professionalProfile from '../../assets/account/subscription-professional-profile.png';
import companyProfile from '../../assets/account/subscription-company-profile.png';
import styles from './SubscriptionScreens.module.css';

const PROFILE_IMAGE = {
  [subscriptionTypes.broker]: brokerProfile,
  [subscriptionTypes.professional]: professionalProfile,
  [subscriptionTypes.company]: companyProfile,
  [subscriptionTypes.projectMarketer]: companyProfile,
};

const COMPANY_FEATURES = [
  '4 ערוצי פרסום לפרוייקט',
  'פרסום דירות חדשות ונבחרות',
  'קידום פרויקטים בחלון הכוח',
  'הצגת זמינות וקידום הפרויקט',
  "ניהול וקבלת לידים חמים בצ'אט פאי",
  "ניהול קשרי לקוחות דרך צ'אט פאי",
  'פרסום בית פתוח ומבצעי מכירה',
  'פרסום תדמית החברה וגיוס עובדים ',
];

const BROKER_FEATURES = [
  '10 חזיתות שיווק וניהול למתווכים',
  'פרסום ומיתוג אישי למשרד התיווך שלך',
  "יצירת קשר וניהול לקוחות צ'אט פאי",
  'גיוס עובדים דרך הפלטפורמה',
  'פרסום מודעות בית פתוח, נכסים ופוסטים',
  'הצעת בלעדיות לנכסים',
  'הצעות לשת״פ עם מתווכים',
  'איתור נכסים חדשים לפני כולם',
];

const PROFESSIONAL_FEATURES = [
  'עמוד פרופיל מקצועי לעסק',
  'פרסום סרטוני תדמית לעסק שלך',
  'הגברת אמינות ע"י חוות דעת מלקוחות',
  'קבלת דירוג בכוכבי פאי מלקוחות',
  'פרסום פוסטים וגיוס עובדים',
  "ניהול לידים מיידיים בפרופיל בצ'אט פאי",
  'ניהול עצמאי ללא נציג שירות',
];

function subscriptionCopy(type, isAgreed) {
  switch (type) {
    case subscriptionTypes.company:
      return {headline: 'אתם חברת נדל״ן?', subLead: 'בואו לעשות מנוי', subMid: ' ולקבל ', featuresTitle: 'מה כלול במנוי לחברות?'};
    case subscriptionTypes.projectMarketer:
      return {
        headline: 'אתם משווקי פרויקטים?',
        subLead: 'בואו לעשות מנוי',
        subMid: ' ולקבל ',
        featuresTitle: 'מה כלול במנוי למשווקי פרויקטים?',
      };
    case subscriptionTypes.professional:
      return {headline: 'בעלי מקצוע?', subLead: 'הירשמו למנוי וקבלו', subMid: ' ', featuresTitle: 'מה כלול בגישה המלאה?'};
    case subscriptionTypes.broker:
    default:
      return {
        headline: 'אמיר, אתה מתווך?',
        subLead: isAgreed ? 'אמת את חשבונך וקבל' : 'הירשמו למנוי וקבלו',
        subMid: ' ',
        featuresTitle: 'מה כלול בגישה המלאה?',
      };
  }
}

function featuresForType(type) {
  if (type === subscriptionTypes.company || type === subscriptionTypes.projectMarketer) return COMPANY_FEATURES;
  if (type === subscriptionTypes.professional) return PROFESSIONAL_FEATURES;
  return BROKER_FEATURES;
}

/** Subscription opener — hero, features card, broker "no fictitious ads" agreement. */
export default function SubscriptionScreen({subscriptionType = subscriptionTypes.broker, onClose, onStart}) {
  const [isAgreed, setIsAgreed] = useState(false);
  const requiresAgreement = subscriptionType === subscriptionTypes.broker;
  const canStart = !requiresAgreement || isAgreed;
  const copy = subscriptionCopy(subscriptionType, isAgreed);
  const features = featuresForType(subscriptionType);

  return (
    <AccountScreen title={getHeaderTitle(subscriptionType)} onBack={onClose} backdrop width={520}>
      <div className={styles.profileRing}>
        <span className={styles.profileFrame}>
          <img src={PROFILE_IMAGE[subscriptionType] || brokerProfile} alt="" />
        </span>
      </div>

      <div className={styles.hero}>
        <h2 className={styles.heroHeadline}>{copy.headline}</h2>
        <p className={styles.heroSubline}>
          {copy.subLead}
          {copy.subMid}
          <span className={styles.goldText}>גישה מלאה</span> לפלטפורמה!
        </p>
      </div>

      <section className={styles.featuresCard}>
        <h3 className={styles.featuresTitle}>{copy.featuresTitle}</h3>
        <ul className={styles.featuresList}>
          {features.map(feature => (
            <li key={feature} className={styles.featureRow}>
              <span>{feature}</span>
              <Icon name="check" size={24} color="#60e7ff" />
            </li>
          ))}
        </ul>
      </section>

      {requiresAgreement ? (
        <RoundCheckbox checked={isAgreed} onChange={setIsAgreed} className={styles.agreement}>
          <span className={styles.agreementTexts}>
            <span className={styles.agreementMain}>אני מאשר/ת שלא אפרסם מודעות פיקטיביות</span>
            <span className={styles.disclaimer}>
              במקרה של פרסום כוזב – התראה ראשונה תישלח, ובפעם השנייה תבוצע חסימה אוטומטית של החשבון.
            </span>
          </span>
        </RoundCheckbox>
      ) : null}

      <div className={styles.actions}>
        <PrimaryButton disabled={!canStart} onClick={() => canStart && onStart?.()}>
          התחל
        </PrimaryButton>
        <TextLink onClick={onClose}>חזור</TextLink>
      </div>
    </AccountScreen>
  );
}
