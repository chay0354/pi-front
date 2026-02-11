export const categoryImages = {
  1: require('../assets/tik1.png'),
  2: require('../assets/tik2.png'),
  3: require('../assets/tik3.png'),
  4: require('../assets/tik4.png'),
  5: require('../assets/tik5.png'),
  6: require('../assets/tik6.png'),
  7: require('../assets/tik7.png'),
  8: require('../assets/tik8.png'),
  9: require('../assets/tik9.png'),
  10: require('../assets/tik10.png'),
  11: require('../assets/tik11.png'),
  12: require('../assets/tik12.png'),
};

export const subscriptionTypes = {
  user: 'user',
  company: 'company',
  professional: 'professional',
  broker: 'broker',
};

export const userCategories = [
  // {id: 1, name: 'חדש מקבלן', image: require('../assets/tik1.png')},
  {id: 2, name: 'משרדים', image: require('../assets/tik2.png')},
  {id: 3, name: 'שותפים', image: require('../assets/tik3.png')},
  {id: 4, name: 'גלובל', image: require('../assets/tik4.png')},
  {id: 5, categoryName: 'BNB', image: require('../assets/tik5.png')},
  {id: 6, name: 'מגזר דתי', image: require('../assets/tik6.png')},
  {id: 7, name: 'קרקעות', image: require('../assets/tik7.png')},
  {id: 8, name: 'מסחר', image: require('../assets/tik8.png')},
  // {id: 9, name: '', image: require('../assets/tik9.png')},
  {id: 10, name: 'דירות', image: require('../assets/tik10.png')},
  // {id: 11, name: '', image: require('../assets/tik11.png')},
  {id: 12, name: 'אקסלוסיב', image: require('../assets/tik12.png')},
];

export const brokerCategories = [
  {id: 1, name: 'חדש מקבלן', image: require('../assets/tik1.png')},
  {id: 2, name: 'משרדים', image: require('../assets/tik2.png')},
  // {id: 3, name: 'שותפים', image: require('../assets/tik3.png')},
  {id: 4, name: 'גלובל', image: require('../assets/tik4.png')},
  {id: 5, name: 'BNB', image: require('../assets/tik5.png')},
  {id: 6, name: 'מגזר דתי', image: require('../assets/tik6.png')},
  {id: 7, name: 'קרקעות', image: require('../assets/tik7.png')},
  {id: 8, name: 'מסחר', image: require('../assets/tik8.png')},
  // {id: 9, name: '', image: require('../assets/tik9.png')},
  {id: 10, name: 'דירות', image: require('../assets/tik10.png')},
  // {id: 11, name: '', image: require('../assets/tik11.png')},
  {id: 12, name: 'אקסלוסיב', image: require('../assets/tik12.png')},
];

export const companyCategories = [
  // {id: 1, name: 'חדש מקבלן', image: require('../assets/tik1.png')},
  {id: 2, name: 'משרדים', image: require('../assets/tik2.png')},
  // {id: 3, name: 'שותפים', image: require('../assets/tik3.png')},
  {id: 4, name: 'גלובל', image: require('../assets/tik4.png')},
  {id: 5, name: 'BNB', image: require('../assets/tik5.png')},
  {id: 6, name: 'מגזר דתי', image: require('../assets/tik6.png')},
  {id: 7, name: 'קרקעות', image: require('../assets/tik7.png')},
  {id: 8, name: 'מסחר', image: require('../assets/tik8.png')},
  // {id: 9, name: '', image: require('../assets/tik9.png')},
  {id: 10, name: 'דירות', image: require('../assets/tik10.png')},
  // {id: 11, name: '', image: require('../assets/tik11.png')},
  {id: 12, name: 'אקסלוסיב', image: require('../assets/tik12.png')},
];

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
      {title: 'כמות חניות', option: [1, 2, 3, 4], optionSecond: {title: 'חנייה בתשלום', option: ['כן', 'ללא']}},
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
  {key: 'cancellationpolicy', data: [{name: 'without_penalty', title: 'ללא קנס'}], title: 'מדיניות ביטולים'},
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
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
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
              title: 'דירות 4 חדרים',
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
                  type: 'price',
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
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
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
              title: 'דירות גן',
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
              title: 'פנטהאוזים',
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
              title: 'בתים פרטיים',
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
          ],
        },
      },
      {
        key: 'consructionstatus',
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
                  isArea: false,
                  value: 0,
                  subTitle: '',
                  subTitleRequired: false,
                },
              ],
            },
            {
              title: 'כולל מרכז מסחרי',
              titleRequired: true,
              isSelected: true,
              fields: [],
            },
          ],
        },
      },
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'הפרוייקט מציע משרדים בגדלים של',
          titleRequired: true,
          groups: [
            {
              title: 'משרד 1',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל המשרד',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  value: 0,
                  subTitle: 'מחיר למטר',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'משרד 2',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל המשרד',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  isArea: false,
                  value: 0,
                  subTitle: 'מחיר למטר',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'הוסף משרד',
              titleRequired: false,
              isSelected: true,
              fields: [],
            },
          ],
        },
      },
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'הפרוייקט מציע קומה שלמה',
          titleRequired: true,
          groups: [
            {
              title: 'קומה שלמה 1',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל הקומה',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  value: 0,
                  subTitle: 'מחיר למטר',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'קומה שלמה 2',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל הקומה',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  isArea: false,
                  value: 0,
                  subTitle: 'מחיר למטר',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'הוסף קומה שלמה',
              titleRequired: false,
              isSelected: true,
              fields: [],
            },
          ],
        },
      },
      {
        key: 'consructionstatus',
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
          groups: [
            {
              title: 'דירות 3 חדרים',
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
                  type: 'price',
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
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
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
              title: 'דירות 5 חדרים',
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
                  type: 'price',
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
        key: 'consructionstatus',
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
          groups: [
            {
              title: 'דירות 3 חדרים',
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
                  type: 'price',
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
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
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
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
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
          ],
        },
      },
      {
        key: 'consructionstatus',
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
          groups: [
            {
              title: 'שטח מסחרי 1',
              titleRequired: true,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  isArea: false,
                  value: 0,
                  subTitle: 'גודל השטח',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  value: 0,
                  subTitle: 'מחיר למטר',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'הוסף שטח מסחרי',
              titleRequired: true,
              isSelected: true,
              fields: [],
            },
          ],
        },
      },
      {
        key: 'generaldetailswithradio',
        groups: {
          title: 'הפרוייקט מציע קומה שלמה',
          titleRequired: true,
          groups: [
            {
              title: 'קומה שלמה 1',
              titleRequired: false,
              isSelected: true,
              fields: [
                {
                  type: 'count',
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל הקומה',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  value: 0,
                  subTitle: 'מחיר למטר',
                  subTitleRequired: true,
                },
              ],
            },
            {
              title: 'הוסף קומה שלמה',
              titleRequired: false,
              isSelected: true,
              fields: [],
            },
          ],
        },
      },
      {
        key: 'generaldetails',
        counterData: [
          {
            title: 'כמות מבנים',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'מספר קומות',
            isArea: false,
            value: 0,
            required: true,
          },
          {
            title: 'מספר חנויות',
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
        key: 'consructionstatus',
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
          groups: [
            {
              title: 'דירות 3 חדרים',
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
                  type: 'price',
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
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  isArea: false,
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
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
                  subTitleRequired: true,
                },
                {
                  type: 'price',
                  isArea: false,
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
                  isArea: false,
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
        key: 'consructionstatus',
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
          groups: [
            {
              title: 'דירות 3 חדרים',
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
                  type: 'price',
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
                  isArea: true,
                  value: 0,
                  subTitle: 'גודל',
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
              title: 'דירות 5 חדרים',
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
                  type: 'price',
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
              title: 'בית פרטי',
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
          ],
        },
      },
      {
        key: 'consructionstatus',
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
