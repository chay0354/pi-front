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
 * DB `ads.category` values where a **broker** sees "פרסם מודעה" in the create sheet
 * (ערוך/פרסם מודעה). Same strip subset: חדש מקבלן, דירות, משרדים, מסחר, קרקעות, יוקרה, מגזר דתי, גלובל.
 * Excludes e.g. BnB (5), שותפים (3) — those show פוסט only for brokers.
 */
export const brokerSheetAdListingCategoryIds = new Set([
  1, 2, 4, 6, 7, 8, 10, 12,
]);

/**
 * DB `ads.category` values where **company** (not professional) users see "פרסם מודעה"
 * (ערוך/פרסם מודעה sheet + TikTok feed compose row).
 * Matches product tabs: גלובל (4), מגזר דתי (6), יוקרה (12), קרקעות (7), מסחר (8),
 * משרדים (2), דירות / בלעדי (10). Professional accounts never get this listing row.
 */
export const companySheetAdListingCategoryIds = new Set([
  2, 4, 6, 7, 8, 10, 12,
]);

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
  const isBroker = sub === subscriptionTypes.broker;
  const isRegularUser = sub === subscriptionTypes.user;

  if (id === 2) {
    return BROKER_OFFICE_LISTING_SHEET_ICON;
  }

  if (isBroker) {
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
    case subscriptionTypes.broker:
    default:
      return 'מנוי למתווכים';
  }
};

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
        title: 'קרקע במושב',
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
        title: 'קרקע במושב',
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
        title: 'קרקע במושב',
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
              title: 'שטח הנכס',
              titleRequired: true,
              subTitle: '',
              subTitleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  key: 'sqm_area',
                  isArea: true,
                  value: 0,
                },
              ],
            },
            {
              title: 'כמות מבנים',
              titleRequired: true,
              subTitle: '',
              subTitleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  isArea: false,
                  value: 0,
                },
              ],
            },
            {
              title: 'מספר קומות',
              titleRequired: true,
              subTitle: '',
              subTitleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  isArea: false,
                  value: 0,
                },
              ],
            },
            {
              title: 'כמות דירות',
              titleRequired: true,
              subTitle: '',
              subTitleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
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
                  isArea: false,
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
                  isArea: false,
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
