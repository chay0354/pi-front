import {subscriptionTypes} from '../profile/lib/constant';

export {subscriptionTypes};

export const MIN_PASSWORD_LENGTH = 8;

/** Monthly ad publish limit without a promo code (coupons add bonus on top). */
export const DEFAULT_MONTHLY_LISTING_QUOTA = 65;

/** Mobile shows the "דלג (בדיקה)" verification shortcut while testing. */
export const SHOW_SKIP_EMAIL_VERIFICATION_TEST = true;

export const GOLD_GRADIENT = 'linear-gradient(180deg, #ffe56a 4.56%, #f7c63a 50.76%, #e5a80f 88.31%)';

export const getHeaderTitle = subscriptionType => {
  switch (subscriptionType) {
    case subscriptionTypes.company:
      return 'מנוי לחברות';
    case subscriptionTypes.professional:
      return 'מנוי לבעלי מקצוע';
    case subscriptionTypes.projectMarketer:
      return 'מנוי למשווקי פרויקטים';
    case subscriptionTypes.broker:
    default:
      return 'מנוי למתווכים';
  }
};

export const MARKETER_PLANS = {single: 'single', team5: 'team5', team10: 'team10'};

/** מנוי לחברות plans — the plan caps how many listings may stay published. */
export const COMPANY_PLANS = {projects5: 'projects5', projects10: 'projects10', multi: 'multi'};

export const BROKER_ACTIVITY_REGIONS = [
  'ירושלים והסביבה',
  'מרכז - גוש דן',
  'מרכז - השפלה',
  'מרכז - השרון',
  'צפון - הגליל המערבי והעליון',
  'צפון - רמת הגולן',
  'דרום - באר שבע והנגב',
  'צפון - חיפה והעמקים',
  'דרום - אשדוד ואשקלון',
  'דרום - אילת והערבה',
  'יהודה ושומרון',
];

const PROFESSIONAL_SPECIALIZATIONS_BY_TYPE = {
  תיווך: ['קבוצות רכישה', 'קרקעות', 'השקעות', 'קומבינציה', 'נדלן מיסחרי', 'נדלן למגורים', 'שיווק פרוייקטים'],
  'עורך דין': ['חוזים וקרקעות', 'השקעות', 'קבוצות רכישה', 'התחדשות עירונית', 'מכר ורכישה', 'מיסוי', 'נדל״ן מסחרי מניב'],
  'עיצוב פנים': ['מגורים', 'מיסחרי וקמעוני', 'משרדים', 'חללי עבודה', 'תעשייתי', 'שינוי דיירים'],
  אדריכלות: ['תכנון סטטוטורי', 'בניה רוויה', 'וילות', 'מיסחרי', 'ציבורי', 'שימור מיבנים'],
  'יועץ משכנתאות': ['מגורים דירה ראשונה', 'מחזור משכנתאות', 'ליווי פיננסי למשקעים', 'משכנתאות מסחריות', 'ליווי פרוייקטים'],
  'מלווה משקיעים': ['עסקאות אקזיט', 'נדל״ן מניב ותזרים', 'נדל״ן בן לאומי', 'השקעות', 'שלבים מוקדמים'],
  שמאות: ['שמאות תקן 21', 'שמאות למשכנתאות', 'הטילי השבחה ומיסוי', 'הערכת שווי חברות', 'קרקעות ופרוייקטים'],
};

/** תיווך is not a professional trade — brokers have their own account type. */
export const PROFESSIONAL_SIGNUP_TYPES = [
  'עורך דין',
  'עיצוב פנים',
  'יועץ משכנתאות',
  'שמאות',
  'אדריכלות',
  'מלווה משקיעים',
];

export const BROKER_SPECIALIZATIONS = PROFESSIONAL_SPECIALIZATIONS_BY_TYPE['תיווך'];

export function getProfessionalSpecializationsForTypes(selectedTypes = []) {
  const seen = new Set();
  const out = [];
  (Array.isArray(selectedTypes) ? selectedTypes : []).forEach(type => {
    (PROFESSIONAL_SPECIALIZATIONS_BY_TYPE[type] || []).forEach(spec => {
      if (seen.has(spec)) return;
      seen.add(spec);
      out.push(spec);
    });
  });
  return out;
}

export const GOOGLE_WEB_CLIENT_ID = String(
  import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ||
    '965378472819-ldlt6e207oh67p0ugcbhi7i4afo1ck49.apps.googleusercontent.com',
).trim();
