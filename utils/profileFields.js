import {
  subscriptionTypes,
  isCompanySubscriptionType,
  isProjectMarketerType,
  isTeamMarketerUnderManager,
  isMarketingManager,
  BROKER_ACTIVITY_REGIONS,
  PROFESSIONAL_FILTER_TYPES,
} from './constant';

const PROFILE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Placeholder / seed emails that must never be shown as a profile identity. */
export function isPlaceholderProfileEmail(email) {
  const e = String(email || '')
    .trim()
    .toLowerCase();
  if (!e) return true;
  return (
    e === 'broker-placeholder@example.com' ||
    e.includes('placeholder') ||
    e.endsWith('@placeholder.local')
  );
}

export function isProfileEmailString(value) {
  return PROFILE_EMAIL_RE.test(String(value || '').trim());
}

/** Real subscription email only — never a listing leftover or placeholder. */
export function resolveProfileEmail(user, extras = {}) {
  const candidates = [
    extras.preferred,
    user?.email,
    extras.fallback,
    user?.creator_email,
  ];
  for (const candidate of candidates) {
    const e = String(candidate || '').trim();
    if (e && isProfileEmailString(e) && !isPlaceholderProfileEmail(e)) {
      return e;
    }
  }
  return '';
}

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
    if (isTeamMarketerUnderManager(user)) {
      // Personal headline — business_name is copied from the marketing manager.
      name =
        user.name ||
        user.contact_person_name ||
        '';
    } else {
      // Registered via company flow — headline is business_name, not broker_office_name.
      name =
        user.business_name ||
        user.name ||
        user.contact_person_name ||
        user.broker_office_name ||
        '';
    }
  } else {
    name =
      user.name ||
      user.business_name ||
      user.contact_person_name ||
      user.broker_office_name ||
      '';
  }
  const trimmed = String(name || '').trim();
  if (!trimmed || isProfileEmailString(trimmed) || isPlaceholderProfileEmail(trimmed)) {
    return fallback;
  }
  return trimmed;
}

/** Field key for the business / office name on the edit-profile form. */
export function getProfileBusinessNameFieldKey(subscriptionType, user = null) {
  const t = String(subscriptionType || '').toLowerCase();
  if (t === subscriptionTypes.professional) return 'name';
  if (t === subscriptionTypes.broker) return 'broker_office_name';
  if (isProjectMarketerType(t)) {
    return isTeamMarketerUnderManager(user) ? 'name' : 'business_name';
  }
  if (t === subscriptionTypes.company) return 'business_name';
  return null;
}

/**
 * Broker, professional, and marketing managers keep a personal photo AND a
 * company logo. Regular marketers (solo or under an agency) only have a photo.
 * Company accounts edit the logo via the top avatar instead.
 */
export function hasSeparateProfileAndCompanyLogo(userOrType) {
  if (userOrType && typeof userOrType === 'object') {
    const t = String(
      userOrType.subscription_type || userOrType.subscriptionType || '',
    ).toLowerCase();
    if (
      t === subscriptionTypes.broker ||
      t === subscriptionTypes.professional
    ) {
      return true;
    }
    return isMarketingManager(userOrType);
  }
  const t = String(userOrType || '').toLowerCase();
  return (
    t === subscriptionTypes.broker || t === subscriptionTypes.professional
  );
}

export function canEditSeparateCompanyLogo(subscriptionType, user = null) {
  const t = String(
    subscriptionType || user?.subscription_type || user?.subscriptionType || '',
  ).toLowerCase();
  if (t === subscriptionTypes.broker || t === subscriptionTypes.professional) {
    return true;
  }
  if (isProjectMarketerType(t)) {
    return isMarketingManager(user || {subscription_type: t});
  }
  return false;
}

/** Editable profile fields per account type (keys match `subscriptions` columns). */
export function getProfileEditFields(subscriptionType, user = null) {
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
        key: 'activity_regions',
        label: 'אזור פעילות',
        type: 'chips',
        options: BROKER_ACTIVITY_REGIONS,
      },
      {
        key: 'brokerage_license_number',
        label: 'מספר רשיון תיווך',
        placeholder: 'הזן מספר רישיון',
      },
      {
        key: 'broker_office_name',
        label: 'שם משרד המתווך',
        placeholder: 'הזן שם משרד',
      },
      {key: 'name', label: 'שם הסוכן', placeholder: 'הזן שם מלא'},
      {
        key: 'dealer_number',
        label: 'מספר- ח.פ/עוסק/פטור',
        placeholder: 'הזן מספר- ח.פ/עוסק/פטור (אופציונאלי)',
      },
      {
        key: 'phone',
        label: 'מספר טלפון',
        placeholder: 'הזן מספר טלפון',
        ...phonePad,
      },
      {
        ...about,
        label: 'תיאור',
        placeholder: 'כתוב תיאור כללי על השירות שלך',
      },
    ];
  }

  if (isProjectMarketerType(t)) {
    const nameField = isTeamMarketerUnderManager(user)
      ? {
          key: 'name',
          label: 'שם המשווק',
          placeholder: 'שם המשווק',
        }
      : {
          key: 'business_name',
          label: 'שם המשווק',
          placeholder: 'שם המשווק',
        };
    return [
      nameField,
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
      {
        key: 'types',
        label: 'סוג',
        type: 'chips',
        options: PROFESSIONAL_FILTER_TYPES,
      },
      {
        key: 'specializations',
        label: 'התמחות',
        type: 'chips',
        optionsFrom: 'professionalTypes',
        emptyHint: 'בחר סוג כדי לראות התמחויות רלוונטיות',
      },
      {key: 'name', label: 'שם העסק', placeholder: 'הזן שם'},
      {
        key: 'business_address',
        label: 'כתובת בית העסק',
        placeholder: 'הזן כתובת',
      },
      {
        key: 'dealer_number',
        label: 'מספר- ח.פ/עוסק/פטור',
        placeholder: 'הזן מספר- ח.פ/עוסק/פטור (אופציונאלי)',
      },
      {
        key: 'phone',
        label: 'מספר טלפון 1',
        placeholder: 'הזן מספר טלפון',
        ...phonePad,
      },
      {
        key: 'office_phone',
        label: 'מספר טלפון 2',
        placeholder: 'הזן מספר טלפון (אופציונאלי)',
        ...phonePad,
      },
      {
        ...about,
        label: 'תיאור',
        placeholder: 'כתוב תיאור כללי על השירות שלך',
      },
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
    if (
      f.type === 'chips' ||
      f.key === 'activity_regions' ||
      f.key === 'types' ||
      f.key === 'specializations'
    ) {
      const raw = u[f.key];
      if (Array.isArray(raw)) {
        initial[f.key] = raw.map(v => String(v).trim()).filter(Boolean);
      } else if (typeof raw === 'string' && raw.trim()) {
        try {
          const parsed = JSON.parse(raw);
          initial[f.key] = Array.isArray(parsed)
            ? parsed.map(v => String(v).trim()).filter(Boolean)
            : raw
                .split(',')
                .map(v => v.trim())
                .filter(Boolean);
        } catch {
          initial[f.key] = raw
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);
        }
      } else {
        initial[f.key] = [];
      }
      return;
    }

    let val = u[f.key] != null ? String(u[f.key]) : '';

    if (f.key === 'broker_office_name' && !val.trim() && u.business_name) {
      val = String(u.business_name);
    }
    if (f.key === 'business_name' && !val.trim() && u.broker_office_name) {
      val = String(u.broker_office_name);
    }
    if (f.key === 'name' && !val.trim()) {
      if (u.contact_person_name) val = String(u.contact_person_name);
      else if (!isTeamMarketerUnderManager(u) && u.business_name) {
        val = String(u.business_name);
      }
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
  if (t === subscriptionTypes.user) {
    return payload;
  }
  if (t === subscriptionTypes.professional) {
    if ('name' in payload) {
      payload.business_name = payload.name;
    }
    return payload;
  }
  if ('mobile_phone' in payload) {
    payload.phone = payload.mobile_phone;
  }
  if (t === subscriptionTypes.broker && 'phone' in payload) {
    payload.mobile_phone = payload.phone;
  }
  return payload;
}
