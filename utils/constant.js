const EXCLUSIVE_CATEGORY_IMAGE = require('../assets/tik12.png');

export const categoryImages = {
  1: require('../assets/category1.png'),
  2: require('../assets/category2.png'),
  3: require('../assets/category3.png'),
  4: require('../assets/category4.png'),
  5: require('../assets/category5.png'),
  6: require('../assets/category6.png'),
  7: require('../assets/category7.png'),
  8: require('../assets/category8.png'),
  10: require('../assets/category10.png'),
  12: EXCLUSIVE_CATEGORY_IMAGE,
  // 1: require('../assets/tik1.png'),
  // 2: require('../assets/tik2.png'),
  // 3: require('../assets/tik3.png'),
  // 4: require('../assets/tik4.png'),
  // 5: require('../assets/tik5.png'),
  // 6: require('../assets/tik6.png'),
  // 7: require('../assets/tik7.png'),
  // 8: require('../assets/tik8.png'),
  // 9: require('../assets/tik9.png'),
  // 10: require('../assets/tik10.png'),
  // 11: require('../assets/tik11.png'),
  // 12: require('../assets/tik12.png'),
};

export const subscriptionTypes = {
  user: 'user',
  company: 'company',
  professional: 'professional',
  broker: 'broker',
  projectMarketer: 'project_marketer',
};

/** Broker, company, professional and project marketer — not regular (`user`) accounts. */
export function isB2BSubscriptionType(type) {
  const t = String(type || '').trim().toLowerCase();
  return (
    t === subscriptionTypes.broker ||
    t === subscriptionTypes.company ||
    t === subscriptionTypes.professional ||
    t === subscriptionTypes.projectMarketer
  );
}

/** משווק פרויקטים plans. Team plans may issue agency join codes. */
export const MARKETER_PLANS = {
  single: 'single',
  team5: 'team5',
  team10: 'team10',
};

export const MARKETER_PLAN_SEATS = {
  [MARKETER_PLANS.single]: null,
  [MARKETER_PLANS.team5]: 5,
  [MARKETER_PLANS.team10]: 10,
};

export function isProjectMarketerType(type) {
  return (
    String(type || '').trim().toLowerCase() === subscriptionTypes.projectMarketer
  );
}

/** Broker + משווק פרויקטים — same upload forms, profiles, feed overlays, and filters. */
export function isBrokerLikeSubscriptionType(subscriptionType) {
  const t = resolveSubscriptionType(subscriptionType);
  return t === subscriptionTypes.broker || t === subscriptionTypes.projectMarketer;
}

/** Marketing manager: project marketer on a team plan (has seats to fill). */
export function isMarketingManager(user) {
  if (!user) return false;
  if (!isProjectMarketerType(user.subscription_type ?? user.subscriptionType)) {
    return false;
  }
  const seats = Number(user.marketer_seat_limit ?? user.marketerSeatLimit);
  return Number.isFinite(seats) && seats > 0;
}

/** Default feed-post label stored in `ads.description` (Edit/Publish badge). */
export const DEFAULT_POST_DESCRIPTION = 'פוסט';
/** Open-house feed posts (company, broker, project marketer) — same upload flow as פוסט. */
export const OPEN_HOUSE_POST_DESCRIPTION = 'בית פתוח';
/** Persisted in `ads.general_details.post_kind` for open-house feed posts. */
export const OPEN_HOUSE_POST_KIND = 'open_house';

/** Sidebar chip id for feed posts only — must match TikTokFeedScreen filter tables. */
export const TIKTOK_POSTS_SIDEBAR_FILTER_BY_CATEGORY = {
  1: 'posts',
  2: 'posts',
  3: 'partners_posts',
  5: 'bnb_posts',
  7: 'land_posts',
  8: 'posts',
  10: 'posts',
};

export function tikTokPostsSidebarFilterForCategory(category) {
  const n = parseInt(String(category ?? ''), 10);
  if (!Number.isFinite(n)) return 'posts';
  return TIKTOK_POSTS_SIDEBAR_FILTER_BY_CATEGORY[n] ?? 'posts';
}

export function parseListingGeneralDetails(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
      return null;
    }
  }
  return null;
}

export function isOpenHouseListing(listing) {
  if (!listing) return false;
  if (isOpenHousePostDescription(listing.description || listing.desc)) {
    return true;
  }
  const gd = parseListingGeneralDetails(listing.general_details);
  return gd?.post_kind === OPEN_HOUSE_POST_KIND;
}

/** Badge label on Edit/Publish cards: פוסט vs בית פתוח. */
export function getFeedPostBadgeLabel(listing) {
  if (isOpenHouseListing(listing)) return OPEN_HOUSE_POST_DESCRIPTION;
  return DEFAULT_POST_DESCRIPTION;
}

/** Card caption when the stored description is the generic post label. */
export function getFeedPostCardCaption(listing) {
  const desc = String(listing?.description || listing?.desc || '').trim();
  if (isOpenHouseListing(listing)) {
    if (!desc || isReservedPostDescription(desc)) {
      return OPEN_HOUSE_POST_DESCRIPTION;
    }
    return desc;
  }
  if (!desc || isReservedPostDescription(desc)) {
    return DEFAULT_POST_DESCRIPTION;
  }
  return desc;
}

export function isReservedPostDescription(description) {
  const t = String(description || '').trim();
  const lower = t.toLowerCase();
  return (
    t === DEFAULT_POST_DESCRIPTION ||
    t === OPEN_HOUSE_POST_DESCRIPTION ||
    lower === 'post'
  );
}

export function isOpenHousePostDescription(description) {
  return String(description || '').trim() === OPEN_HOUSE_POST_DESCRIPTION;
}

export function canCreateOpenHousePost(subscriptionTypeOrUser) {
  let sub = '';
  if (subscriptionTypeOrUser == null) {
    sub = '';
  } else if (
    typeof subscriptionTypeOrUser === 'string' ||
    typeof subscriptionTypeOrUser === 'number'
  ) {
    sub = String(subscriptionTypeOrUser).toLowerCase().trim();
  } else if (typeof subscriptionTypeOrUser === 'object') {
    sub = String(
      subscriptionTypeOrUser.subscription_type ||
        subscriptionTypeOrUser.subscriptionType ||
        subscriptionTypeOrUser.type ||
        subscriptionTypeOrUser.subscription?.subscription_type ||
        '',
    )
      .toLowerCase()
      .trim();
  }
  return (
    sub === subscriptionTypes.company ||
    sub === subscriptionTypes.broker ||
    sub === subscriptionTypes.projectMarketer
  );
}

/** Ad listing categories for brokers and project marketers (excludes BnB + שותפים). */
export function usesBrokerAdListingCategories(subscriptionType) {
  return isBrokerLikeSubscriptionType(subscriptionType);
}

/** Create-sheet icon for the בית פתוח row (company / broker / project marketer). */
export const CREATE_SHEET_OPEN_HOUSE_ICON = require('../assets/upload-ad/broker/house.png');

/** Valid DB `ads.category` ids (gaps 9/11 unused). */
export const LISTING_CATEGORY_IDS = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 10, 12,
]);

/**
 * Parse a listing category id; invalid/missing → fallback (default דירות).
 * Never silently coerce to 1 (חדש מקבלן).
 */
export function parseListingCategoryId(value, fallback = 10) {
  const n = parseInt(value, 10);
  if (Number.isFinite(n) && LISTING_CATEGORY_IDS.has(n)) {
    return n;
  }
  return fallback;
}

/** Regular / private end-user (not broker/company/professional). */
export function isRegularSubscriptionType(subscriptionType) {
  const t = resolveSubscriptionType(subscriptionType);
  if (
    t === subscriptionTypes.broker ||
    t === subscriptionTypes.company ||
    t === subscriptionTypes.professional ||
    t === subscriptionTypes.projectMarketer
  ) {
    return false;
  }
  // 'user', aliases, or missing → treat as regular so AdsForm never falls
  // through to company/contractor forms for דירות.
  return true;
}

/**
 * Developer-company accounts use "פרויקט" in upload flows; all other types use "נכס".
 * Project marketers follow broker UX (נכס), not company project wording.
 */
export function isCompanySubscriptionType(subscriptionType) {
  const t = resolveSubscriptionType(subscriptionType);
  return t === subscriptionTypes.company;
}

export const PROJECT_OFFERS_SECTION_TITLE = 'הפרויקט מציע';
export const ASSET_OFFERS_SECTION_TITLE = 'הנכס מציע';

export function listingOffersSectionTitle(subscriptionType) {
  return isCompanySubscriptionType(subscriptionType)
    ? PROJECT_OFFERS_SECTION_TITLE
    : ASSET_OFFERS_SECTION_TITLE;
}

export function isListingOffersSectionTitle(title) {
  return (
    title === PROJECT_OFFERS_SECTION_TITLE ||
    title === ASSET_OFFERS_SECTION_TITLE
  );
}

/** Swap פרויקט → נכס in upload UI copy for non-company users. */
export function uploadProjectWording(text, subscriptionType) {
  if (text == null || isCompanySubscriptionType(subscriptionType)) {
    return text;
  }
  return String(text).replace(/פרויקט/g, 'נכס');
}

function localizeUploadFormField(field, subscriptionType) {
  if (isCompanySubscriptionType(subscriptionType) || !field) return field;
  if (!field.groups?.title?.includes('פרויקט')) return field;
  return {
    ...field,
    groups: {
      ...field.groups,
      title: uploadProjectWording(field.groups.title, subscriptionType),
    },
  };
}

export function localizeUploadFormFields(fields, subscriptionType) {
  if (!Array.isArray(fields) || isCompanySubscriptionType(subscriptionType)) {
    return fields || [];
  }
  return fields.map(f => localizeUploadFormField(f, subscriptionType));
}

/** Bottom create-sheet listing title: company → פרויקט; marketers and all others → נכס. */
export function getCreateSheetListingAssetLabel(subscriptionType) {
  const t = resolveSubscriptionType(subscriptionType);
  return t === subscriptionTypes.company ? 'פרויקט' : 'נכס';
}

/** Bottom create-sheet listing subtitle for standard property categories. */
export function getCreateSheetListingAssetSubtitle(subscriptionType) {
  const t = resolveSubscriptionType(subscriptionType);
  return t === subscriptionTypes.company
    ? 'פרסמו פרויקט'
    : 'פרסמו נכס למכירה או להשכרה';
}

/** Title + subtitle for the listing row in the TikTok / create-ad bottom sheet. */
export function getListingSheetCopy(selectedCategory, subscriptionType) {
  const cat = parseInt(String(selectedCategory ?? '').trim(), 10);
  const assetLabel = getCreateSheetListingAssetLabel(subscriptionType);
  if (cat === 10) {
    return {
      title: assetLabel,
      subtitle: 'פרסם נכס למכירה או השכרה',
    };
  }
  if (cat === 3) {
    return {
      title: 'פרסם מודעה',
      subtitle: 'צור מודעה כדי להיכנס, להכניס או למצוא שותף',
    };
  }
  if (cat === 7) {
    return {title: 'קרקע', subtitle: 'פרסם קרקע למכירה או השכרה'};
  }
  if (cat === 8) {
    return {
      title: 'נכס מסחרי',
      subtitle: 'פרסם נכס מסחרי למכירה או השכרה',
    };
  }
  if (cat === 4 || cat === 6 || cat === 12) {
    return {title: 'נכס', subtitle: 'פרסם נכס למכירה או השכרה'};
  }
  return {title: 'משרד', subtitle: 'פרסם משרד למכירה או השכרה'};
}

/** Gold profile ring: company, broker, professional. Regular `user` uses teal ring in ProfileAvatar. */
export const shouldShowProfileGoldRing = subscriptionType => {
  const t = resolveSubscriptionType(subscriptionType);
  return (
    t === subscriptionTypes.company ||
    t === subscriptionTypes.professional ||
    t === subscriptionTypes.broker ||
    t === subscriptionTypes.projectMarketer
  );
};

/** Normalize subscription type from strings, users, listings, or chat peers. */
export function resolveSubscriptionType(source) {
  if (source == null) return '';
  if (typeof source === 'string' || typeof source === 'number') {
    return String(source).toLowerCase().trim();
  }
  if (typeof source !== 'object') return '';
  const subObj =
    source.subscription && typeof source.subscription === 'object'
      ? source.subscription
      : null;
  const candidates = [
    source.subscription_type,
    source.subscriptionType,
    source.type,
    source.creator_subscription_type,
    source.created_by_subscription_type,
    source.recentSubscriptionType,
    subObj?.subscription_type,
    subObj?.subscriptionType,
    subObj?.type,
    source.creator?.subscription_type,
  ];
  for (const v of candidates) {
    if (v != null && String(v).trim() !== '') {
      return String(v).toLowerCase().trim();
    }
  }
  return '';
};

/**
 * DB `ads.category` values where a **regular** (`subscription_type === 'user'`) user may
 * open "פרסם מודעה" from the create sheet. Other categories (e.g. 1 חדש מקבלן) show
 * post-only for regular users; brokers/companies keep both actions.
 */
export const regularUserAdListingCategoryIds = new Set([
  2, 3, 4, 5, 6, 7, 8, 10, 12,
]);

/**
 * DB `ads.category` values where a **broker** or **project marketer** sees "פרסם מודעה"
 * in the create sheet (ערוך/פרסם + TikTok compose).
 * Excludes BnB (5) and שותפים (3) — those tabs are post / בית פתוח only.
 */
export const brokerSheetAdListingCategoryIds = new Set([
  1, 2, 4, 6, 7, 8, 10, 12,
]);

/**
 * DB `ads.category` values where **company** (not professional) users see "פרסם מודעה"
 * (ערוך/פרסם מודעה sheet + TikTok feed compose row).
 * Matches product tabs: חדש מקבלן (1), גלובל (4), מגזר דתי (6), יוקרה (12), קרקעות (7),
 * מסחר (8), משרדים (2). BnB (5) is regular-user only — not companies.
 */
export const companySheetAdListingCategoryIds = new Set([
  1, 2, 4, 6, 7, 8, 12,
]);

/** Whether the create sheet shows a listing/ad row (not post-only) for this user + DB category. */
export function canShowListingAdInCreateSheet(
  subscriptionType,
  listingCategoryId,
) {
  const sub = resolveSubscriptionType(subscriptionType);
  const n = Number(listingCategoryId);
  if (!Number.isFinite(n)) {
    return false;
  }
  if (sub === subscriptionTypes.professional) {
    return false;
  }
  if (isBrokerLikeSubscriptionType(sub)) {
    return brokerSheetAdListingCategoryIds.has(n);
  }
  if (sub === subscriptionTypes.company) {
    return companySheetAdListingCategoryIds.has(n);
  }
  // Regular users + missing/alias types (never treat as company).
  return regularUserAdListingCategoryIds.has(n);
}

/** EditPublishAd + ListingAnalysis: UI strip id → DB `ads.category`. */
export const EDIT_PROFILE_UI_TO_LISTING_CATEGORY_ID = {
  1: 1,
  2: 5,
  3: 4,
  4: 6,
  5: 12,
  6: 7,
  7: 8,
  8: 2,
  9: 10,
  10: 3,
};

const LISTING_TO_EDIT_PROFILE_UI_CATEGORY_ID = Object.entries(
  EDIT_PROFILE_UI_TO_LISTING_CATEGORY_ID,
).reduce((acc, [uiId, listingId]) => {
  acc[listingId] = Number(uiId);
  return acc;
}, {});

export function toEditProfileUiCategoryId(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 9;
  return LISTING_TO_EDIT_PROFILE_UI_CATEGORY_ID[n] ?? n;
}

export function resolveListingCategoryFromEditProfileUi(uiCategoryId) {
  const n = Number(uiCategoryId);
  if (!Number.isFinite(n)) return null;
  return EDIT_PROFILE_UI_TO_LISTING_CATEGORY_ID[n] ?? n;
}

const NEW_BUILDER_EDIT_PROFILE_UI_CATEGORY_ID = 1;

/** Strip order: under forceRTL the first item sits on the physical right. */
export function orderPublishCategoriesStrip(strip) {
  if (!strip?.length) return strip || [];
  const newBuilder = strip.find(
    cat => cat.id === NEW_BUILDER_EDIT_PROFILE_UI_CATEGORY_ID,
  );
  if (!newBuilder) return strip;
  return [
    newBuilder,
    ...strip.filter(cat => cat.id !== NEW_BUILDER_EDIT_PROFILE_UI_CATEGORY_ID),
  ];
}

/** Categories on EditPublishAd carousel — all tabs for every user; ad create sheet still uses `canShowListingAdInCreateSheet`. */
export function getPublishCategoriesStrip(_subscriptionType) {
  return orderPublishCategoriesStrip(categoriesEditProfile);
}

/** ניתוח מודעות: only categories where this user may publish ads (not post-only tabs). */
export function getAnalysisCategoriesStrip(subscriptionType) {
  const filtered = categoriesEditProfile.filter(cat =>
    canShowListingAdInCreateSheet(
      subscriptionType,
      resolveListingCategoryFromEditProfileUi(cat.id),
    ),
  );
  return orderPublishCategoriesStrip(filtered);
}

/** All subscription types except professional may open ניתוח מודעות. */
export function canAccessListingAnalysis(subscriptionType) {
  const sub = String(subscriptionType ?? '').trim().toLowerCase();
  return sub !== subscriptionTypes.professional;
}

/** Default residential/global strip icon (חדש מקבלן for non–regular-user accounts). */
export const RESIDENTIAL_LISTING_SHEET_ICON = require('../assets/upload-ad/1.png');
/** House icon — brokers (residential strip) and regular users (partners + listed categories). */
export const BROKER_RESIDENTIAL_LISTING_SHEET_ICON = require('../assets/upload-ad/broker/house.png');
/** Office icon for משרדים (category 2) in the create sheet — all user types. */
export const BROKER_OFFICE_LISTING_SHEET_ICON = require('../assets/upload-ad/broker/office.png');

const BROKER_RESIDENTIAL_LISTING_SHEET_CATEGORY_IDS = new Set([1, 4, 6, 10, 12]);
/** Regular users: שותפים, גלובל, מגזר דתי, דירות, יוקרה. */
const REGULAR_USER_HOUSE_LISTING_SHEET_CATEGORY_IDS = new Set([3, 4, 6, 10, 12]);

/** Icon for the top create-sheet row (listing/ad), not the פוסט row. */
export function getCreateSheetListingIcon(
  selectedCategory,
  subscriptionType = null,
) {
  const id = parseInt(String(selectedCategory ?? '').trim(), 10);
  const sub = String(subscriptionType ?? '').toLowerCase();
  const isBrokerLike = usesBrokerAdListingCategories(sub);
  const isRegularUser = sub === subscriptionTypes.user;

  if (id === 2) {
    return BROKER_OFFICE_LISTING_SHEET_ICON;
  }

  if (isBrokerLike) {
    if (BROKER_RESIDENTIAL_LISTING_SHEET_CATEGORY_IDS.has(id)) {
      return BROKER_RESIDENTIAL_LISTING_SHEET_ICON;
    }
  }

  if (isRegularUser && REGULAR_USER_HOUSE_LISTING_SHEET_CATEGORY_IDS.has(id)) {
    return BROKER_RESIDENTIAL_LISTING_SHEET_ICON;
  }

  if (BROKER_RESIDENTIAL_LISTING_SHEET_CATEGORY_IDS.has(id)) {
    return RESIDENTIAL_LISTING_SHEET_ICON;
  }
  if (id === 3) {
    return require('../assets/image22221.png');
  }
  if (id === 7) {
    return require('../assets/categories/image-copy.png');
  }
  if (id === 8) {
    return require('../assets/categories/image.png');
  }
  return require('../assets/post-office-icon.png');
}

/**
 * "דלג על אימות מייל (בדיקה)" — backend POST /api/subscription/verify-skip-test.
 */
export const showSkipEmailVerificationTest = true;

/** Monthly ad publish limit without a promo code (coupons add bonus on top). */
export const DEFAULT_MONTHLY_LISTING_QUOTA = 65;

export const userCategories = [
  // Home carousel (row-reverse): first item = rightmost. Reversed visual order vs prior list.
  {
    id: 1,
    name: 'חדש מקבלן',
    image: require('../assets/category1.png'),
    imageLeft: require('../assets/category1Left.png'),
    imageRight: require('../assets/category1Right.png'),
  },
  {
    id: 5,
    name: 'BNB',
    image: require('../assets/category5.png'),
    imageLeft: require('../assets/category5Left.png'),
    imageRight: require('../assets/category5Right.png'),
  },
  {
    id: 4,
    name: 'גלובל',
    image: require('../assets/category4.png'),
    imageLeft: require('../assets/category4Left.png'),
    imageRight: require('../assets/category4Right.png'),
  },
  {
    id: 6,
    name: 'מגזר דתי',
    image: require('../assets/category6.png'),
    imageLeft: require('../assets/category6Left.png'),
    imageRight: require('../assets/category6Right.png'),
  },
  {
    id: 8,
    name: 'מסחר',
    image: require('../assets/category8.png'),
    imageLeft: require('../assets/category8Left.png'),
    imageRight: require('../assets/category8Right.png'),
  },
  {
    id: 7,
    name: 'קרקעות',
    image: require('../assets/category7.png'),
    imageLeft: require('../assets/category7Left.png'),
    imageRight: require('../assets/category7Right.png'),
  },
  {
    id: 12,
    name: 'יוקרה',
    image: require('../assets/category12.png'),
    imageLeft: require('../assets/category12Left.png'),
    imageRight: require('../assets/category12Right.png'),
  },
  {
    id: 3,
    name: 'שותפים',
    image: require('../assets/category3.png'),
    imageLeft: require('../assets/category3Left.png'),
    imageRight: require('../assets/category3Right.png'),
  },
  {
    id: 2,
    name: 'משרדים',
    image: require('../assets/category2.png'),
    imageLeft: require('../assets/category2Left.png'),
    imageRight: require('../assets/category2Right.png'),
  },
  {
    id: 10,
    name: 'דירות',
    image: require('../assets/category10.png'),
    imageLeft: require('../assets/category10Left.png'),
    imageRight: require('../assets/category10Right.png'),
  },
];

/** Home carousel always opens with דירות centered. */
export const DEFAULT_HOME_CAROUSEL_CATEGORY_ID = 10;

export const categoriesEditProfile = [
  {
    id: 9,
    name: 'דירות',
    image: require('../assets/category_9.png'),
    selectedImage: require('../assets/category_selected_9.png'),
  },
  {
    id: 8,
    name: 'משרדים',
    image: require('../assets/category_8.png'),
    selectedImage: require('../assets/category_selected_8.png'),
  },
  {
    id: 7,
    name: 'מסחר',
    image: require('../assets/category_7.png'),
    selectedImage: require('../assets/category_selected_7.png'),
  },
  {
    id: 6,
    name: 'קרקעות',
    image: require('../assets/category_6.png'),
    selectedImage: require('../assets/category_selected_6.png'),
  },
  {
    id: 5,
    name: 'יוקרה',
    image: require('../assets/category_5.png'),
    selectedImage: require('../assets/category_selected_5.png'),
  },
  {
    id: 4,
    name: 'מגזר דתי',
    image: require('../assets/category_4.png'),
    selectedImage: require('../assets/category_selected_4.png'),
  },
  {
    id: 3,
    name: 'גלובל',
    image: require('../assets/category_3.png'),
    selectedImage: require('../assets/category_selected_3.png'),
  },
  {
    id: 2,
    name: 'BNB',
    image: require('../assets/category_2.png'),
    selectedImage: require('../assets/category_selected_2.png'),
  },
  {
    id: 1,
    name: 'חדש מקבלן',
    image: require('../assets/category_1.png'),
    selectedImage: require('../assets/category_selected_1.png'),
  },
  {
    id: 10,
    name: 'שותפים',
    image: require('../assets/category_10.png'),
    selectedImage: require('../assets/category_selected_10.png'),
  },
];

export const brokerCategories = [
  {
    id: 6,
    name: 'מגזר דתי',
    image: require('../assets/category6.png'),
    imageLeft: require('../assets/category6Left.png'),
    imageRight: require('../assets/category6Right.png'),
  },
  {
    id: 4,
    name: 'גלובל',
    image: require('../assets/category4.png'),
    imageLeft: require('../assets/category4Left.png'),
    imageRight: require('../assets/category4Right.png'),
  },
  {
    id: 5,
    name: 'BNB',
    image: require('../assets/category5.png'),
    imageLeft: require('../assets/category5Left.png'),
    imageRight: require('../assets/category5Right.png'),
  },
  {
    id: 1,
    name: 'חדש מקבלן',
    image: require('../assets/category1.png'),
    imageLeft: require('../assets/category1Left.png'),
    imageRight: require('../assets/category1Right.png'),
  },
  {
    id: 10,
    name: 'דירות',
    image: require('../assets/category10.png'),
    imageLeft: require('../assets/category10Left.png'),
    imageRight: require('../assets/category10Right.png'),
  },
  {
    id: 2,
    name: 'משרדים',
    image: require('../assets/category2.png'),
    imageLeft: require('../assets/category2Left.png'),
    imageRight: require('../assets/category2Right.png'),
  },
  {
    id: 12,
    name: 'יוקרה',
    image: require('../assets/category12.png'),
    imageLeft: require('../assets/category12Left.png'),
    imageRight: require('../assets/category12Right.png'),
  },
  {
    id: 7,
    name: 'קרקעות',
    image: require('../assets/category7.png'),
    imageLeft: require('../assets/category7Left.png'),
    imageRight: require('../assets/category7Right.png'),
  },
  {
    id: 8,
    name: 'מסחר',
    image: require('../assets/category8.png'),
    imageLeft: require('../assets/category8Left.png'),
    imageRight: require('../assets/category8Right.png'),
  },
];

/** Kept aligned with `userCategories` for any screen that branches on company vs user. Home uses `userCategories` for everyone. */
export const companyCategories = userCategories;

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

/** Professionals directory filter — סוג (fixed list). */
export const PROFESSIONAL_FILTER_TYPES = [
  'תיווך',
  'עורך דין',
  'עיצוב פנים',
  'יועץ משכנתאות',
  'שמאות',
  'אדריכלות',
  'מלווה משקיעים',
];

/** Professionals directory filter — התמחות options per סוג. */
export const PROFESSIONAL_SPECIALIZATIONS_BY_TYPE = {
  תיווך: [
    'קבוצות רכישה',
    'קרקעות',
    'השקעות',
    'קומבינציה',
    'נדלן מיסחרי',
    'נדלן למגורים',
    'שיווק פרוייקטים',
  ],
  'עורך דין': [
    'חוזים וקרקעות',
    'השקעות',
    'קבוצות רכישה',
    'התחדשות עירונית',
    'מכר ורכישה',
    'מיסוי',
    'נדל״ן מסחרי מניב',
  ],
  'עיצוב פנים': [
    'מגורים',
    'מיסחרי וקמעוני',
    'משרדים',
    'חללי עבודה',
    'תעשייתי',
    'שינוי דיירים',
  ],
  אדריכלות: [
    'תכנון סטטוטורי',
    'בניה רוויה',
    'וילות',
    'מיסחרי',
    'ציבורי',
    'שימור מיבנים',
  ],
  'יועץ משכנתאות': [
    'מגורים דירה ראשונה',
    'מחזור משכנתאות',
    'ליווי פיננסי למשקעים',
    'משכנתאות מסחריות',
    'ליווי פרוייקטים',
  ],
  'מלווה משקיעים': [
    'עסקאות אקזיט',
    'נדל״ן מניב ותזרים',
    'נדל״ן בן לאומי',
    'השקעות',
    'שלבים מוקדמים',
  ],
  שמאות: [
    'שמאות תקן 21',
    'שמאות למשכנתאות',
    'הטילי השבחה ומיסוי',
    'הערכת שווי חברות',
    'קרקעות ופרוייקטים',
  ],
};

/** Map filter labels to values stored on professional profiles (legacy aliases). */
export const PROFESSIONAL_TYPE_DB_ALIASES = {
  תיווך: ['תיווך'],
  'עורך דין': ['עורך דין', 'עו"ד', 'עו״ד'],
  'עיצוב פנים': ['עיצוב פנים'],
  'יועץ משכנתאות': ['יועץ משכנתאות', 'ייעוץ משכנתאות'],
  שמאות: ['שמאות'],
  אדריכלות: ['אדריכלות'],
  'מלווה משקיעים': ['מלווה משקיעים'],
};

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

export function professionalMatchesTypeFilter(filterType, itemTypes) {
  const aliases = PROFESSIONAL_TYPE_DB_ALIASES[filterType] || [filterType];
  const typeSet = new Set(
    (Array.isArray(itemTypes) ? itemTypes : []).map(v => String(v || '').trim()),
  );
  return aliases.some(alias => typeSet.has(alias));
}

// Shared BnB (category 5) ad form fields – used by user, broker, and company
const bnbFormFields = [
  {key: 'multiimagewithvideo', wayToDisplayAd: true},
  {key: 'hospitalitynature'},
  {
    key: 'propertytype',
    data: [
      {name: 'room', title: 'חדר'},
      {name: 'housing_unit', title: 'יחידת דיור'},
      {name: 'house', title: 'בית'},
      {name: 'B&B', title: 'צימר'},
      {name: 'holiday_apartment', title: 'דירת נופש'},
      {name: 'villa', title: 'וילה'},
      {name: 'special', title: 'מיוחדים'},
    ],
    title: 'סוג',
  },
  {
    key: 'generaldetails',
    counterData: [
      {title: 'מספר חדרים', isArea: false, value: 0, required: true},
      {title: 'קומה', isArea: false, value: 0, isLast: true, required: true},
    ],
    data: [
      {
        title: 'כמות חניות',
        option: [1, 2, 3, 4],
        optionSecond: {title: 'חנייה בתשלום', option: ['כן', 'ללא']},
      },
      {title: 'חנייה בתשלום'},
    ],
  },
  {
    key: 'serviceandfacility',
    data: [
      {name: 'pool', title: 'בריכה'},
      {name: 'merger', title: 'מיזוג'},
      {name: 'fridge', title: 'מקרר'},
      {name: 'laundry', title: 'כביסה'},
      {name: 'eater', title: 'אוכל'},
      {name: 'kitchen', title: 'מטבח'},
      {name: 'locker', title: 'ארון'},
      {name: 'tv', title: 'טלויזיה'},
      {name: 'safe', title: 'כספת'},
      {name: 'smoke_detector', title: 'גלאי עשן'},
      {name: 'wifi_internet', title: 'אינטרנט wifi'},
      {name: 'private_services', title: 'שירותים פרטיים'},
      {name: 'shared_services', title: 'שירותים משותפים'},
      {name: 'private_shower', title: 'מקלחת פרטית'},
      {name: 'shared_shower', title: 'מקלחת משותפת'},
      {name: 'accessible_place', title: 'מקום נגיש'},
      {name: 'suitable_for_animals', title: 'מתאים לבעלי חיים'},
      {name: 'suitable_for_smokers', title: 'מתאים למעשנים'},
    ],
    title: 'שירותים ומתקנים במקום',
  },
  {key: 'accommodationoffers'},
  {
    key: 'cancellationpolicy',
    data: [{name: 'without_penalty', title: 'ללא קנס'}],
    title: 'מדיניות ביטולים',
  },
  {key: 'pricepernight', title: 'מחיר ללילה'},
  {key: 'contactdetails'},
];

export const userCategoryForm = {
  2: {
    role: 'user',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'displayoptions'},
      {
        key: 'propertytype',
        title: 'סןג הנכס',
        data: [
          {name: 'office', title: 'משרד'},
          {name: 'whole_floor', title: 'קומה שלמה'},
        ],
      },
      {
        key: 'generaldetails',
        counterData: [
          {
            title: 'שטח הנכס',
            isArea: true,
            value: 0,
            required: true,
          },
          {
            title: 'מספר חדרים',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'קומה',
            isArea: false,
            value: 0,
            isLast: true,
            required: true,
          },
        ],
        data: [
          {
            title: 'חנייה',
            option: [1, 2, 3, 4],
          },
          {
            title: 'מרפסת',
            option: [1, 2, 3, 4],
          },
          {title: 'מעלית'},
          {title: 'ממ״ד'},
          {title: 'כניסה מיידית'},
        ],
      },
      {
        key: 'propertycondition',
      },
      {
        key: 'purpose',
      },
      {
        key: 'price',
      },
      {
        key: 'address-phone-description',
      },
    ],
  },
  3: {
    role: 'user',
    fields: [
      {key: 'profileverification'},
      {key: 'profilepictureupload'},
      {key: 'searchpurpose'},
      {key: 'apartmenttype'},
      {key: 'preferences'},
      {key: 'price'},
      {key: 'additionaldetails'},
    ],
  },
  4: {
    role: 'user',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'displayoptions'},
      {
        key: 'propertytype',
        title: 'סןג הנכס',
        data: [
          {name: 'apartment', title: 'דירה'},
          {name: 'penthouse', title: 'פנטהאוז'},
          {name: 'private_house', title: 'בית פרטי'},
          {name: 'villa', title: 'וילה'},
          {name: 'estate', title: 'אחוזה'},
          {name: 'hotel', title: 'בית מלון'},
          {name: 'multi_family', title: 'רב משפחתי'},
          {name: 'office', title: 'משרד'},
          {name: 'trade', title: 'מסחר'},
          {name: 'ground', title: 'קרקע'},
        ],
      },
      {
        key: 'generaldetails',
        counterData: [
          {
            title: 'שטח הנכס',
            isArea: true,
            value: 0,
            required: true,
          },
          {
            title: 'מספר חדרים',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'קומה',
            isArea: false,
            value: 0,
            isLast: true,
            required: true,
          },
        ],
        data: [
          {
            title: 'חנייה',
            option: [1, 2, 3, 4],
          },
          {
            title: 'מרפסת',
            option: [1, 2, 3, 4],
          },
          {title: 'מעלית'},
          {title: 'ממ״ד'},
          {title: 'כניסה מיידית'},
        ],
      },
      {
        key: 'propertycondition',
      },
      {
        key: 'purpose',
      },
      {
        key: 'price',
      },
      {
        key: 'address-phone-description',
      },
    ],
  },
  5: {role: 'user', fields: bnbFormFields},
  6: {
    role: 'user',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'displayoptions'},
      {
        key: 'propertytype',
        title: 'סןג הנכס',
        data: [
          {name: 'apartment', title: 'דירה'},
          {name: 'garden_apartment', title: 'דירת גן'},
          {name: 'penthouse', title: 'פנטהאוז'},
          {name: 'duplex', title: 'דופלקס'},
          {name: 'private_house', title: 'בית פרטי'},
        ],
      },
      {
        key: 'generaldetails',
        counterData: [
          {
            title: 'שטח הנכס',
            isArea: true,
            value: 0,
            required: true,
          },
          {
            title: 'מספר חדרים',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'קומה',
            isArea: false,
            value: 0,
            isLast: true,
            required: true,
          },
        ],
        data: [
          {
            title: 'חנייה',
            option: [1, 2, 3, 4],
          },
          {
            title: 'מרפסת לסוכה',
            distance: 'גודל מרפסת',
          },
          {title: 'מעלית שבת'},
          {title: 'ממ״ד'},
          {title: 'כניסה מיידית'},
        ],
      },
      {
        key: 'propertycondition',
      },
      {
        key: 'purpose',
      },
      {
        key: 'price',
      },
      {
        key: 'address-phone-description',
      },
    ],
  },
  7: {
    role: 'user',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'displayoptions'},
      {
        key: 'proposedland',
      },
      {
        key: 'radiooptions',
        title: 'תב״ע',
        data: [
          {name: 'happy', title: 'מאושרת'},
          {name: 'nothing', title: 'אין'},
          {name: 'there_is', title: 'יש'},
        ],
      },
      {
        key: 'radiooptions',
        title: 'קרקע במושע',
        data: [
          {name: 'not', title: 'לא'},
          {name: 'yes', title: 'כן'},
        ],
      },
      {
        key: 'radiooptions',
        title: 'היתר',
        data: [
          {name: 'nothing', title: 'אין'},
          {name: 'there_is', title: 'יש'},
        ],
      },
      {
        key: 'radiooptions',
        title: 'קרקע חקלאית',
        data: [
          {name: 'not', title: 'לא'},
          {name: 'yes', title: 'כן'},
        ],
      },
      {
        key: 'radiooptions',
        title: 'בעלות קרקע',
        data: [
          {name: 'administration', title: 'מינהל'},
          {name: 'private', title: 'פרטי'},
        ],
      },
      {
        key: 'purpose',
      },
      {
        key: 'price',
      },
      {
        key: 'landaddress',
      },
    ],
  },
  8: {
    role: 'user',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'displayoptions'},
      {
        key: 'propertytype',
        title: 'סןג הנכס',
        data: [
          {name: 'store', title: 'חנות'},
          {name: 'shopping_center', title: 'קומה שלמה'},
          {name: 'industrial_buildings', title: 'מבני תעשייה'},
          {name: 'warehouse', title: 'מחסן'},
          {name: 'commercial_space', title: 'שטח מסחרי'},
          {name: 'whole_floor', title: 'קומה שלמה'},
        ],
      },
      {
        key: 'generaldetails',
        counterData: [
          {
            title: 'שטח הנכס',
            isArea: true,
            value: 0,
            required: true,
          },
          {
            title: 'מספר חדרים',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'קומה',
            isArea: false,
            value: 0,
            isLast: true,
            required: true,
          },
        ],
        data: [
          {
            title: 'חנייה',
            option: [1, 2, 3, 4],
          },
          {
            title: 'מרפסת',
            option: [1, 2, 3, 4],
          },
          {title: 'מעלית'},
          {title: 'ממ״ד'},
          {title: 'כניסה מיידית'},
        ],
      },
      {
        key: 'purpose',
      },
      {
        key: 'price',
      },
      {
        key: 'address-phone-description',
      },
    ],
  },
  10: {
    role: 'user',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'displayoptions'},
      {
        key: 'propertytype',
        title: 'סןג הנכס',
        data: [
          {name: 'apartment', title: 'דירה'},
          {name: 'studio_apartment', title: 'דירת סטודיו'},
          {name: 'garden_apartment', title: 'דירת גן'},
          {name: 'duplex', title: 'דופלקס'},
          {name: 'penthouse', title: 'פנטהאוז'},
          {name: 'private_house', title: 'בית פרטי'},
        ],
      },
      {
        key: 'generaldetails',
        counterData: [
          {
            title: 'שטח הנכס',
            isArea: true,
            value: 0,
            required: true,
          },
          {
            title: 'מספר חדרים',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'קומה',
            isArea: false,
            value: 0,
            isLast: true,
            required: true,
          },
        ],
        data: [
          {
            title: 'חנייה',
            option: [1, 2, 3, 4],
          },
          {
            title: 'מרפסת',
            option: [1, 2, 3, 4],
          },
          {title: 'מעלית'},
          {title: 'ממ״ד'},
          {title: 'כניסה מיידית'},
        ],
      },
      {
        key: 'propertycondition',
      },
      {
        key: 'purpose',
      },
      {
        key: 'price',
      },
      {
        key: 'address-phone-description',
      },
    ],
  },
  12: {
    role: 'user',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'displayoptions'},
      {
        key: 'propertytype',
        title: 'סןג הנכס',
        data: [
          {name: 'apartment', title: 'דירה'},
          {name: 'private_house', title: 'בית פרטי'},
          {name: 'villa', title: 'וילה'},
          {name: 'penthouse', title: 'פנטהאוז'},
        ],
      },
      {
        key: 'generaldetails',
        counterData: [
          {
            title: 'שטח הנכס',
            isArea: true,
            value: 0,
            required: true,
          },
          {
            title: 'מספר חדרים',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'קומה',
            isArea: false,
            value: 0,
            isLast: true,
            required: true,
          },
        ],
        data: [
          {
            title: 'חנייה',
            option: [1, 2, 3, 4],
          },
          {
            title: 'מרפסת',
            option: [1, 2, 3, 4],
          },
          {title: 'מעלית'},
          {title: 'ממ״ד'},
          {title: 'כניסה מיידית'},
        ],
      },
      {
        key: 'propertycondition',
      },
      {
        key: 'purpose',
      },
      {
        key: 'price',
      },
      {
        key: 'address-phone-description',
      },
    ],
  },
};

export const brokerCategoryForm = {
  1: {
    role: 'broker',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {key: 'saleatpresale'},
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'פרטים כלליים',
          titleRequired: false,
          groups: [
            {
              title: 'כמות מבנים',
              titleRequired: true,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'building_count',
                  isArea: false,
                  value: 0,
                  subTitle: '',
                  subTitleRequired: false,
                },
              ],
            },
            {
              title: 'מספר קומות',
              titleRequired: true,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'floor_count',
                  isArea: false,
                  value: 0,
                  subTitle: '',
                  subTitleRequired: false,
                },
              ],
            },
            {
              title: 'כמות דירות',
              titleRequired: true,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'apartment_count',
                  isArea: false,
                  value: 0,
                  subTitle: '',
                  subTitleRequired: false,
                },
              ],
            },
          ],
        },
      },
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'הפרויקט מציע',
          titleRequired: true,
          groups: [
            {
              title: 'דירות 3 חדרים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'rooms_3_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'rooms_3_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'דירות 4 חדרים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'rooms_4_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'rooms_4_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'דירות 5 חדרים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'rooms_5_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'rooms_5_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'דירות גן',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'garden_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'count',
                  key: 'garden_rooms',
                  isArea: false,
                  value: 0,
                  subTitle: 'כמות חדרים',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'garden_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'פנטהאוזים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'penthouse_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'count',
                  key: 'penthouse_rooms',
                  isArea: false,
                  value: 0,
                  subTitle: 'כמות חדרים',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'penthouse_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'בתים פרטיים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'private_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'count',
                  key: 'private_rooms',
                  isArea: false,
                  value: 0,
                  subTitle: 'כמות חדרים',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'private_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
          ],
        },
      },
      {
        key: 'constructionstatus',
        title: 'מצב בניה',
        data: [
          {name: 'on_paper', title: 'על הנייר'},
          {name: 'beginning_of_construction', title: 'תחילת בנייה'},
          {name: 'middle_of_construction', title: 'אמצע בנייה'},
          {name: 'built', title: 'בנוי'},
        ],
      },
      {
        key: 'propertyaddress',
      },
    ],
  },
  2: {
    role: 'broker',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {
        key: 'propertytype',
        title: 'סןג הנכס',
        data: [
          {name: 'office', title: 'משרד'},
          {name: 'whole_floor', title: 'קומה שלמה'},
        ],
      },
      {
        key: 'generaldetails',
        counterData: [
          {
            title: 'שטח הנכס',
            isArea: true,
            value: 0,
            required: true,
          },
          {
            title: 'מספר חדרים',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'קומה',
            isArea: false,
            value: 0,
            isLast: true,
            required: true,
          },
        ],
        data: [
          {
            title: 'חנייה',
            option: [1, 2, 3, 4],
          },
          {
            title: 'מרפסת',
            option: [1, 2, 3, 4],
          },
          {title: 'מעלית'},
          {title: 'ממ״ד'},
          {title: 'כניסה מיידית'},
        ],
      },
      {
        key: 'propertycondition',
      },
      {
        key: 'purpose',
      },
      {
        key: 'price',
      },
      {
        key: 'address-phone-description',
      },
    ],
  },
  // שותפים (category 3) — same flow as userCategoryForm[3]; was missing so broker edit/create showed an empty form
  3: {
    role: 'broker',
    fields: [
      {key: 'profileverification'},
      {key: 'profilepictureupload'},
      {key: 'searchpurpose'},
      {key: 'apartmenttype'},
      {key: 'preferences'},
      {key: 'price'},
      {key: 'additionaldetails'},
    ],
  },
  4: {
    role: 'broker',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {
        key: 'propertytype',
        title: 'סןג הנכס',
        data: [
          {name: 'apartment', title: 'דירה'},
          {name: 'penthouse', title: 'פנטהאוז'},
          {name: 'private_house', title: 'בית פרטי'},
          {name: 'villa', title: 'וילה'},
          {name: 'estate', title: 'אחוזה'},
          {name: 'hotel', title: 'בית מלון'},
          {name: 'multi_family', title: 'רב משפחתי'},
          {name: 'office', title: 'משרד'},
          {name: 'trade', title: 'מסחר'},
          {name: 'ground', title: 'קרקע'},
        ],
      },
      {
        key: 'generaldetails',
        counterData: [
          {
            title: 'שטח הנכס',
            isArea: true,
            value: 0,
            required: true,
          },
          {
            title: 'מספר חדרים',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'קומה',
            isArea: false,
            value: 0,
            isLast: true,
            required: true,
          },
        ],
        data: [
          {
            title: 'חנייה',
            option: [1, 2, 3, 4],
          },
          {
            title: 'מרפסת',
            option: [1, 2, 3, 4],
          },
          {title: 'מעלית'},
          {title: 'ממ״ד'},
          {title: 'כניסה מיידית'},
        ],
      },
      {
        key: 'propertycondition',
      },
      {
        key: 'purpose',
      },
      {
        key: 'price',
      },
      {
        key: 'address-phone-description',
      },
    ],
  },
  5: {role: 'broker', fields: bnbFormFields},
  6: {
    role: 'broker',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {
        key: 'propertytype',
        title: 'סןג הנכס',
        data: [
          {name: 'apartment', title: 'דירה'},
          {name: 'private_house', title: 'בית פרטי'},
          {name: 'villa', title: 'וילה'},
          {name: 'penthouse', title: 'פנטהאוז'},
        ],
      },
      {
        key: 'generaldetails',
        counterData: [
          {
            title: 'שטח הנכס',
            isArea: true,
            value: 0,
            required: true,
          },
          {
            title: 'מספר חדרים',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'קומה',
            isArea: false,
            value: 0,
            isLast: true,
            required: true,
          },
        ],
        data: [
          {
            title: 'חנייה',
            option: [1, 2, 3, 4],
          },
          {
            title: 'מרפסת לסוכה',
            distance: 'גודל מרפסת',
          },
          {title: 'מעלית שבת'},
          {title: 'ממ״ד'},
          {title: 'כניסה מיידית'},
        ],
      },
      {
        key: 'propertycondition',
      },
      {
        key: 'purpose',
      },
      {
        key: 'price',
      },
      {
        key: 'address-phone-description',
      },
    ],
  },
  7: {
    role: 'broker',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {
        key: 'proposedland',
      },
      {
        key: 'radiooptions',
        title: 'תב״ע',
        data: [
          {name: 'happy', title: 'מאושרת'},
          {name: 'nothing', title: 'אין'},
          {name: 'there_is', title: 'יש'},
        ],
      },
      {
        key: 'radiooptions',
        title: 'קרקע במושע',
        data: [
          {name: 'not', title: 'לא'},
          {name: 'yes', title: 'כן'},
        ],
      },
      {
        key: 'radiooptions',
        title: 'היתר',
        data: [
          {name: 'nothing', title: 'אין'},
          {name: 'there_is', title: 'יש'},
        ],
      },
      {
        key: 'radiooptions',
        title: 'קרקע חקלאית',
        data: [
          {name: 'not', title: 'לא'},
          {name: 'yes', title: 'כן'},
        ],
      },
      {
        key: 'radiooptions',
        title: 'בעלות קרקע',
        data: [
          {name: 'administration', title: 'מינהל'},
          {name: 'private', title: 'פרטי'},
        ],
      },
      {
        key: 'price',
      },
      {
        key: 'landaddress',
      },
    ],
  },
  8: {
    role: 'broker',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {
        key: 'propertytype',
        title: 'סןג הנכס',
        data: [
          {name: 'store', title: 'חנות'},
          {name: 'shopping_center', title: 'קומה שלמה'},
          {name: 'industrial_buildings', title: 'מבני תעשייה'},
          {name: 'warehouse', title: 'מחסן'},
          {name: 'commercial_space', title: 'שטח מסחרי'},
          {name: 'whole_floor', title: 'קומה שלמה'},
        ],
      },
      {
        key: 'generaldetails',
        counterData: [
          {
            title: 'שטח הנכס',
            isArea: true,
            value: 0,
            required: true,
          },
          {
            title: 'מספר חדרים',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'קומה',
            isArea: false,
            value: 0,
            isLast: true,
            required: true,
          },
        ],
        data: [
          {
            title: 'חנייה',
            option: [1, 2, 3, 4],
          },
          {
            title: 'מרפסת',
            option: [1, 2, 3, 4],
          },
          {title: 'מעלית'},
          {title: 'ממ״ד'},
          {title: 'כניסה מיידית'},
        ],
      },
      {
        key: 'purpose',
      },
      {
        key: 'price',
      },
      {
        key: 'address-phone-description',
      },
    ],
  },
  10: {
    role: 'broker',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {
        key: 'propertytype',
        title: 'סןג הנכס',
        data: [
          {name: 'apartment', title: 'דירה'},
          {name: 'studio_apartment', title: 'דירת סטודיו'},
          {name: 'garden_apartment', title: 'דירת גן'},
          {name: 'duplex', title: 'דופלקס'},
          {name: 'penthouse', title: 'פנטהאוז'},
          {name: 'private_house', title: 'בית פרטי'},
        ],
      },
      {
        key: 'generaldetails',
        counterData: [
          {
            title: 'שטח הנכס',
            isArea: true,
            value: 0,
            required: true,
          },
          {
            title: 'מספר חדרים',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'קומה',
            isArea: false,
            value: 0,
            isLast: true,
            required: true,
          },
        ],
        data: [
          {
            title: 'חנייה',
            option: [1, 2, 3, 4],
          },
          {
            title: 'מרפסת',
            option: [1, 2, 3, 4],
          },
          {title: 'מעלית'},
          {title: 'ממ״ד'},
          {title: 'כניסה מיידית'},
        ],
      },
      {
        key: 'propertycondition',
      },
      {
        key: 'purpose',
      },
      {
        key: 'price',
      },
      {
        key: 'address-phone-description',
      },
    ],
  },
  12: {
    role: 'broker',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {
        key: 'propertytype',
        title: 'סןג הנכס',
        data: [
          {name: 'apartment', title: 'דירה'},
          {name: 'private_house', title: 'בית פרטי'},
          {name: 'villa', title: 'וילה'},
          {name: 'penthouse', title: 'פנטהאוז'},
        ],
      },
      {
        key: 'generaldetails',
        counterData: [
          {
            title: 'שטח הנכס',
            isArea: true,
            value: 0,
            required: true,
          },
          {
            title: 'מספר חדרים',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'קומה',
            isArea: false,
            value: 0,
            isLast: true,
            required: true,
          },
        ],
        data: [
          {
            title: 'חנייה',
            option: [1, 2, 3, 4],
          },
          {
            title: 'מרפסת',
            option: [1, 2, 3, 4],
          },
          {title: 'מעלית'},
          {title: 'ממ״ד'},
          {title: 'כניסה מיידית'},
        ],
      },
      {
        key: 'propertycondition',
      },
      {
        key: 'purpose',
      },
      {
        key: 'price',
      },
      {
        key: 'address-phone-description',
      },
    ],
  },
};

export const companyCategoryForm = {
  2: {
    role: 'company',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true, addMorePhotos: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {key: 'saleatpresale'},
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'פרטים כלליים',
          titleRequired: false,
          groups: [
            {
              title: 'כמות מבנים',
              titleRequired: true,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'building_count',
                  isArea: false,
                  value: 0,
                  subTitle: '',
                  subTitleRequired: false,
                },
              ],
            },
            {
              title: 'מספר קומות',
              titleRequired: true,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'floor_count',
                  isArea: false,
                  value: 0,
                  subTitle: '',
                  subTitleRequired: false,
                },
              ],
            },
            {
              title: 'כולל מרכז מסחרי',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'boolean_toggle',
                  key: 'shop_count',
                },
              ],
            },
          ],
        },
      },
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'הפרוייקט מציע משרדים בגדלים של',
          titleRequired: true,
          groups: [],
        },
      },
      {
        key: 'sharedspacescompany',
      },
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'הפרוייקט מציע קומה שלמה',
          titleRequired: true,
          groups: [],
        },
      },
      {
        key: 'constructionstatus',
        title: 'מצב בניה',
        data: [
          {name: 'on_paper', title: 'על הנייר'},
          {name: 'beginning_of_construction', title: 'תחילת בנייה'},
          {name: 'middle_of_construction', title: 'אמצע בנייה'},
          {name: 'built', title: 'בנוי'},
        ],
      },
      {
        key: 'propertyaddress',
      },
    ],
  },
  // שותפים (category 3) — same as userCategoryForm[3]; was missing so company edit/create showed an empty form
  3: {
    role: 'company',
    fields: [
      {key: 'profileverification'},
      {key: 'profilepictureupload'},
      {key: 'searchpurpose'},
      {key: 'apartmenttype'},
      {key: 'preferences'},
      {key: 'price'},
      {key: 'additionaldetails'},
    ],
  },
  4: {
    role: 'company',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true, addMorePhotos: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {key: 'saleatpresale'},
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'פרטים כלליים',
          titleRequired: false,
          groups: [
            {
              title: 'כמות מבנים',
              titleRequired: true,
              isSelected: true,
              fields: [
                {type: 'count', key: 'building_count', isArea: false, value: 0},
              ],
            },
            {
              title: 'מספר קומות',
              titleRequired: true,
              isSelected: true,
              fields: [
                {type: 'count', key: 'floor_count', isArea: false, value: 0},
              ],
            },
            {
              title: 'כמות דירות',
              titleRequired: true,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'apartment_count',
                  isArea: false,
                  value: 0,
                },
              ],
            },
          ],
        },
      },
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'הפרויקט מציע',
          titleRequired: true,
          groups: [
            {
              title: 'דירות 3 חדרים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'rooms_3_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'rooms_3_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'דירות 4 חדרים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'rooms_4_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'rooms_4_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'דירות 5 חדרים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'rooms_5_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'rooms_5_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'פנטהאוזים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'penthouse_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'count',
                  key: 'penthouse_rooms',
                  isArea: false,
                  value: 0,
                  subTitle: 'כמות חדרים',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'penthouse_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'בתים פרטיים',
              titleRequired: false,
              isSelected: true,
              fields: [],
            },
            {
              title: 'וילות',
              titleRequired: false,
              isSelected: true,
              fields: [],
            },
            {
              title: 'אחוזות',
              titleRequired: false,
              isSelected: true,
              fields: [],
            },
            {
              title: 'בתי מלון',
              titleRequired: false,
              isSelected: true,
              fields: [],
            },
            {
              title: 'רב משפחתי', // Multi-family
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'count',
                  isArea: false,
                  value: 0,
                  subTitle: 'כמות חדרים',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'משרדים',
              titleRequired: false,
              isSelected: true,
              fields: [],
            },
            {
              title: 'מסחרי',
              titleRequired: false,
              isSelected: true,
              fields: [],
            },
            {
              title: 'קרקעות',
              titleRequired: false,
              isSelected: true,
              fields: [],
            },
          ],
        },
      },
      {
        key: 'constructionstatus',
        title: 'מצב בניה',
        data: [
          {name: 'on_paper', title: 'על הנייר'},
          {name: 'beginning_of_construction', title: 'תחילת בנייה'},
          {name: 'middle_of_construction', title: 'אמצע בנייה'},
          {name: 'built', title: 'בנוי'},
        ],
      },
      {
        key: 'propertyaddress',
      },
    ],
  },
  5: {role: 'company', fields: bnbFormFields},
  6: {
    role: 'company',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true, addMorePhotos: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {key: 'saleatpresale'},
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'פרטים כלליים',
          titleRequired: false,
          groups: [
            {
              title: 'כמות מבנים',
              titleRequired: true,
              isSelected: true,
              fields: [
                {type: 'count', key: 'building_count', isArea: false, value: 0},
              ],
            },
            {
              title: 'מספר קומות',
              titleRequired: true,
              isSelected: true,
              fields: [
                {type: 'count', key: 'floor_count', isArea: false, value: 0},
              ],
            },
            {
              title: 'כמות דירות',
              titleRequired: true,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'apartment_count',
                  isArea: false,
                  value: 0,
                },
              ],
            },
          ],
        },
      },
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'הפרויקט מציע',
          titleRequired: true,
          groups: [
            {
              title: 'דירות 3 חדרים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'rooms_3_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'rooms_3_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
                {
                  type: 'radiowithtext',
                  value: 0,
                  title: 'כולל מעלית שבת',
                  titleRequired: false,
                },
                {
                  type: 'radiowithtext',
                  value: 0,
                  title: 'כולל מרפסת לסוכה',
                  titleRequired: false,
                },
                {
                  type: 'count',
                  key: 'rooms_3_balcony_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל מרפסת',
                  subTitleRequired: false,
                },
              ],
            },
            {
              title: 'דירות 4 חדרים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'rooms_4_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'rooms_4_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
                {
                  type: 'radiowithtext',
                  value: 0,
                  title: 'כולל מעלית שבת',
                  titleRequired: false,
                },
                {
                  type: 'radiowithtext',
                  value: 0,
                  title: 'כולל מרפסת לסוכה',
                  titleRequired: false,
                },
                {
                  type: 'count',
                  key: 'rooms_4_balcony_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל מרפסת',
                  subTitleRequired: false,
                },
              ],
            },
            {
              title: 'דירות 5 חדרים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'rooms_5_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'rooms_5_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
                {
                  type: 'radiowithtext',
                  value: 0,
                  title: 'כולל מעלית שבת',
                  titleRequired: false,
                },
                {
                  type: 'radiowithtext',
                  value: 0,
                  title: 'כולל מרפסת לסוכה',
                  titleRequired: false,
                },
                {
                  type: 'count',
                  key: 'rooms_5_balcony_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל מרפסת',
                  subTitleRequired: false,
                },
              ],
            },
            {
              title: 'דירות גן',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'garden_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'count',
                  key: 'garden_rooms',
                  isArea: false,
                  value: 0,
                  subTitle: 'כמות חדרים',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'garden_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
                {
                  type: 'radiowithtext',
                  value: 0,
                  title: 'כולל מרפסת לסוכה',
                  titleRequired: false,
                },
                {
                  type: 'radiowithtext',
                  value: 0,
                  title: 'כולל מרפסת לסוכה',
                  titleRequired: false,
                },
                {
                  type: 'count',
                  key: 'garden_balcony_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל מרפסת',
                  subTitleRequired: false,
                },
              ],
            },
            {
              title: 'פנטהאוזים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'penthouse_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'count',
                  key: 'penthouse_rooms',
                  isArea: false,
                  value: 0,
                  subTitle: 'כמות חדרים',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'penthouse_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
                {
                  type: 'radiowithtext',
                  value: 0,
                  title: 'כולל מרפסת לסוכה',
                  titleRequired: false,
                },
                {
                  type: 'radiowithtext',
                  value: 0,
                  title: 'כולל מרפסת לסוכה',
                  titleRequired: false,
                },
                {
                  type: 'count',
                  key: 'penthouse_balcony_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל מרפסת',
                  subTitleRequired: false,
                },
              ],
            },
            {
              title: 'בתים פרטיים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'private_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'count',
                  key: 'private_rooms',
                  isArea: false,
                  value: 0,
                  subTitle: 'כמות חדרים',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'private_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
          ],
        },
      },
      {
        key: 'constructionstatus',
        title: 'מצב בניה',
        data: [
          {name: 'on_paper', title: 'על הנייר'},
          {name: 'beginning_of_construction', title: 'תחילת בנייה'},
          {name: 'middle_of_construction', title: 'אמצע בנייה'},
          {name: 'built', title: 'בנוי'},
        ],
      },
      {
        key: 'propertyaddress',
      },
    ],
  },
  7: {
    role: 'company',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true, addMorePhotos: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {
        key: 'companyofferslandsizes',
      },
      {
        key: 'radiooptions',
        title: 'תב״ע',
        data: [
          {name: 'happy', title: 'מאושרת'},
          {name: 'nothing', title: 'אין'},
          {name: 'there_is', title: 'יש'},
        ],
      },
      {
        key: 'radiooptions',
        title: 'קרקע במושע',
        data: [
          {name: 'not', title: 'לא'},
          {name: 'yes', title: 'כן'},
        ],
      },
      {
        key: 'radiooptions',
        title: 'היתר',
        data: [
          {name: 'nothing', title: 'אין'},
          {name: 'there_is', title: 'יש'},
        ],
      },
      {
        key: 'radiooptions',
        title: 'קרקע חקלאית',
        data: [
          {name: 'not', title: 'לא'},
          {name: 'yes', title: 'כן'},
        ],
      },
      {
        key: 'radiooptions',
        title: 'בעלות קרקע',
        data: [
          {name: 'administration', title: 'מינהל'},
          {name: 'private', title: 'פרטי'},
        ],
      },
      {
        key: 'landaddress',
      },
    ],
  },
  8: {
    role: 'company',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true, addMorePhotos: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {key: 'saleatpresale'},
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'הפרוייקט מציע שטחי מסחר בגדלים של',
          titleRequired: false,
          groups: [],
        },
      },
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'הפרוייקט מציע קומה שלמה',
          titleRequired: true,
          groups: [],
        },
      },
      {
        key: 'generaldetails',
        counterData: [
          {
            title: 'כמות מבנים',
            key: 'building_count',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'מספר קומות',
            key: 'floor_count',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'מספר חנויות',
            key: 'shop_count',
            isArea: false,
            value: 0,
            isLast: true,
            required: true,
          },
        ],
        data: [
          {
            title: 'חניה',
            option: [1, 2, 3, 4],
          },
          {title: 'מעלית'},
          {title: 'ממ״ד'},
        ],
      },
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'פרטים כלליים',
          titleRequired: true,
          groups: [
            {
              title: 'כמות מבנים',
              titleRequired: true,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'building_count',
                  isArea: false,
                  value: 0,
                },
              ],
            },
            {
              title: 'מספר קומות',
              titleRequired: true,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'floor_count',
                  isArea: false,
                  value: 0,
                },
              ],
            },
            {
              title: 'מספר חנויות',
              titleRequired: true,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'shop_count',
                  isArea: false,
                  value: 0,
                },
              ],
            },
            {
              title: 'חניה',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'parking_structured_count',
                  isArea: false,
                  value: 0,
                },
              ],
            },
            {
              title: 'מעלית',
              titleRequired: false,
              isSelected: true,
              fields: [],
            },
            {
              title: 'ממ״ד',
              titleRequired: false,
              isSelected: true,
              fields: [],
            },
          ],
        },
      },
      {
        key: 'constructionstatus',
        title: 'מצב בניה',
        data: [
          {name: 'on_paper', title: 'על הנייר'},
          {name: 'beginning_of_construction', title: 'תחילת בנייה'},
          {name: 'middle_of_construction', title: 'אמצע בנייה'},
          {name: 'built', title: 'בנוי'},
        ],
      },
      {
        key: 'propertyaddress',
      },
    ],
  },
  10: {
    role: 'company',
    // דירות — apartment listing (was wrongly copied from חדש מקבלן project form)
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true, addMorePhotos: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {
        key: 'propertytype',
        title: 'סןג הנכס',
        data: [
          {name: 'apartment', title: 'דירה'},
          {name: 'studio_apartment', title: 'דירת סטודיו'},
          {name: 'garden_apartment', title: 'דירת גן'},
          {name: 'duplex', title: 'דופלקס'},
          {name: 'penthouse', title: 'פנטהאוז'},
          {name: 'private_house', title: 'בית פרטי'},
        ],
      },
      {
        key: 'generaldetails',
        counterData: [
          {
            title: 'שטח הנכס',
            isArea: true,
            value: 0,
            required: true,
          },
          {
            title: 'מספר חדרים',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'קומה',
            isArea: false,
            value: 0,
            isLast: true,
            required: true,
          },
        ],
        data: [
          {
            title: 'חנייה',
            option: [1, 2, 3, 4],
          },
          {
            title: 'מרפסת',
            option: [1, 2, 3, 4],
          },
          {title: 'מעלית'},
          {title: 'ממ״ד'},
          {title: 'כניסה מיידית'},
        ],
      },
      {
        key: 'propertycondition',
      },
      {
        key: 'purpose',
      },
      {
        key: 'price',
      },
      {
        key: 'address-phone-description',
      },
    ],
  },
  12: {
    role: 'company',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true, addMorePhotos: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {key: 'saleatpresale'},
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'פרטים כלליים',
          titleRequired: false,
          groups: [
            {
              title: 'כמות מבנים',
              titleRequired: true,
              isSelected: true,
              fields: [
                {type: 'count', key: 'building_count', isArea: false, value: 0},
              ],
            },
            {
              title: 'מספר קומות',
              titleRequired: true,
              isSelected: true,
              fields: [
                {type: 'count', key: 'floor_count', isArea: false, value: 0},
              ],
            },
            {
              title: 'כמות דירות',
              titleRequired: true,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'apartment_count',
                  isArea: false,
                  value: 0,
                },
              ],
            },
          ],
        },
      },
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'הפרויקט מציע',
          titleRequired: true,
          toggleableOfferGroups: true,
          groups: [
            {
              title: 'דירות 3 חדרים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'rooms_3_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'rooms_3_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'דירות 4 חדרים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'rooms_4_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'rooms_4_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'דירות 5 חדרים',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'rooms_5_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'rooms_5_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'פנטהאוז',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'penthouse_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'count',
                  key: 'penthouse_rooms',
                  isArea: false,
                  value: 0,
                  subTitle: 'כמות חדרים',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'penthouse_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'בית פרטי',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'private_area',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'count',
                  key: 'private_rooms',
                  isArea: false,
                  value: 0,
                  subTitle: 'כמות חדרים',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  key: 'private_price',
                  value: 0,
                  subTitle: 'הוסף מחיר ״החל מ-״',
                  subTitleRequired: true,
                },
              ],
            },
          ],
        },
      },
      {
        key: 'constructionstatus',
        title: 'מצב בניה',
        data: [
          {name: 'on_paper', title: 'על הנייר'},
          {name: 'beginning_of_construction', title: 'תחילת בנייה'},
          {name: 'middle_of_construction', title: 'אמצע בנייה'},
          {name: 'built', title: 'בנוי'},
        ],
      },
      {
        key: 'propertyaddress',
      },
    ],
  },
};
