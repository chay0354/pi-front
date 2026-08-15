import {
  subscriptionTypes,
  isCompanySubscriptionType,
  isProjectMarketerType,
} from './constant';

/**
 * Display name shown on profile, settings, and headers — must match
 * `getSubscription` / profile card logic per account type.
 */
export function resolveProfileDisplayName(user, {fallback = 'משתמש'} = {}) {
  if (!user || typeof user !== 'object') {
    return fallback;
  }
  const type = String(
    user.subscription_type || user.subscriptionType || '',
  ).toLowerCase();
  let name = '';
  if (isCompanySubscriptionType(type)) {
    name =
      user.business_name || user.name || user.contact_person_name || '';
  } else if (type === subscriptionTypes.broker) {
    name =
      user.broker_office_name ||
      user.business_name ||
      user.name ||
      user.contact_person_name ||
      '';
  } else if (isProjectMarketerType(type)) {
    // Registered via company flow — headline is business_name, not broker_office_name.
    name =
      user.business_name ||
      user.name ||
      user.contact_person_name ||
      user.broker_office_name ||
      '';
  } else {
    name =
      user.name ||
      user.business_name ||
      user.contact_person_name ||
      user.broker_office_name ||
      '';
  }
  const trimmed = String(name || '').trim();
  return trimmed || fallback;
}

/** Editable profile fields per account type (keys match `subscriptions` columns). */
export function getProfileEditFields(subscriptionType) {
  const t = String(subscriptionType || '').toLowerCase();
  const about = {
    key: 'description',
    label: 'אודות',
    placeholder: 'ספר/י קצת על עצמך',
    multiline: true,
  };
  const phonePad = {keyboardType: 'phone-pad'};
  const urlPad = {keyboardType: 'url'};

  if (t === subscriptionTypes.broker) {
    return [
      {
        key: 'broker_office_name',
        label: 'שם המשרד',
        placeholder: 'שם המשרד',
      },
      {key: 'name', label: 'שם הסוכן', placeholder: 'שם הסוכן'},
      {
        key: 'brokerage_license_number',
        label: 'מספר רישיון תיווך',
        placeholder: 'מספר רישיון',
      },
      {
        key: 'mobile_phone',
        label: 'טלפון נייד',
        placeholder: 'מספר טלפון נייד',
        ...phonePad,
      },
      {
        key: 'office_phone',
        label: 'טלפון משרד',
        placeholder: 'מספר טלפון משרד',
        ...phonePad,
      },
      {
        key: 'business_address',
        label: 'כתובת',
        placeholder: 'כתובת המשרד',
      },
      about,
    ];
  }

  if (isProjectMarketerType(t)) {
    return [
      {
        key: 'business_name',
        label: 'שם המשווק',
        placeholder: 'שם המשווק',
      },
      {
        key: 'contact_person_name',
        label: 'איש קשר',
        placeholder: 'שם איש הקשר',
      },
      {
        key: 'mobile_phone',
        label: 'טלפון נייד',
        placeholder: 'מספר טלפון נייד',
        ...phonePad,
      },
      {
        key: 'office_phone',
        label: 'טלפון משרד',
        placeholder: 'מספר טלפון משרד',
        ...phonePad,
      },
      {
        key: 'company_website',
        label: 'אתר אינטרנט',
        placeholder: 'https://',
        ...urlPad,
      },
      {
        key: 'business_address',
        label: 'כתובת',
        placeholder: 'כתובת',
      },
      about,
    ];
  }

  if (t === subscriptionTypes.company) {
    return [
      {key: 'business_name', label: 'שם החברה', placeholder: 'שם החברה'},
      {
        key: 'contact_person_name',
        label: 'איש קשר',
        placeholder: 'שם איש הקשר',
      },
      {
        key: 'mobile_phone',
        label: 'טלפון נייד',
        placeholder: 'מספר טלפון נייד',
        ...phonePad,
      },
      {
        key: 'office_phone',
        label: 'טלפון משרד',
        placeholder: 'מספר טלפון משרד',
        ...phonePad,
      },
      {
        key: 'company_website',
        label: 'אתר אינטרנט',
        placeholder: 'https://',
        ...urlPad,
      },
      {
        key: 'business_address',
        label: 'כתובת חברה',
        placeholder: 'כתובת החברה',
      },
      about,
    ];
  }

  if (t === subscriptionTypes.professional) {
    return [
      {key: 'name', label: 'שם העסק', placeholder: 'שם העסק'},
      {
        key: 'phone',
        label: 'טלפון',
        placeholder: 'מספר טלפון',
        ...phonePad,
      },
      {
        key: 'office_phone',
        label: 'טלפון נוסף',
        placeholder: 'מספר טלפון (אופציונלי)',
        ...phonePad,
      },
      {
        key: 'business_address',
        label: 'כתובת',
        placeholder: 'כתובת',
      },
      about,
    ];
  }

  return [
    {key: 'name', label: 'שם מלא', placeholder: 'שם מלא'},
    {
      key: 'phone',
      label: 'טלפון',
      placeholder: 'מספר טלפון',
      ...phonePad,
    },
    {
      key: 'business_address',
      label: 'כתובת',
      placeholder: 'רחוב, עיר',
    },
  ];
}

/** Seed edit form from `currentUser`, including legacy column aliases. */
export function hydrateProfileEditForm(user, fields) {
  const initial = {};
  const u = user && typeof user === 'object' ? user : {};
  fields.forEach(f => {
    let val = u[f.key] != null ? String(u[f.key]) : '';

    if (f.key === 'broker_office_name' && !val.trim() && u.business_name) {
      val = String(u.business_name);
    }
    if (f.key === 'business_name' && !val.trim() && u.broker_office_name) {
      val = String(u.broker_office_name);
    }
    if (f.key === 'name' && !val.trim()) {
      if (u.contact_person_name) val = String(u.contact_person_name);
      else if (u.business_name) val = String(u.business_name);
    }
    if (f.key === 'contact_person_name' && !val.trim() && u.name) {
      val = String(u.name);
    }
    if (f.key === 'mobile_phone' && !val.trim() && u.phone) {
      val = String(u.phone);
    }
    if (f.key === 'phone' && !val.trim()) {
      if (u.mobile_phone) val = String(u.mobile_phone);
      else if (u.phone) val = String(u.phone);
    }

    initial[f.key] = val;
  });
  return initial;
}

/**
 * Normalize save payload so profile contact rows stay in sync with edit fields.
 * Broker / company / marketer: `phone` legacy column mirrors mobile_phone.
 */
export function applyProfilePhoneSync(payload, subscriptionType) {
  const t = String(subscriptionType || '').toLowerCase();
  if (
    t === subscriptionTypes.professional ||
    t === subscriptionTypes.user
  ) {
    return payload;
  }
  if ('mobile_phone' in payload) {
    payload.phone = payload.mobile_phone;
  }
  return payload;
}
