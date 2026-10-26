/** Upload-ad form definitions — verbatim port of mobile utils/constant.js. */

// Shared BnB (category 5) ad form fields – used by user, broker, and company
export const bnbFormFields = [
  {key: 'multiimagewithvideo', wayToDisplayAd: true},
  {key: 'displayoptions'},
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
        title: 'סוג הנכס',
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
        title: 'סוג הנכס',
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
        title: 'סוג הנכס',
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
        title: 'סוג הנכס',
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
  10: {
    role: 'user',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'displayoptions'},
      {
        key: 'propertytype',
        title: 'סוג הנכס',
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
        title: 'סוג הנכס',
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
        title: 'סוג הנכס',
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
        title: 'סוג הנכס',
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
        title: 'סוג הנכס',
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
        title: 'סוג הנכס',
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
  10: {
    role: 'broker',
    fields: [
      {key: 'multiimagewithvideo', wayToDisplayAd: true},
      {key: 'salesimage'},
      {key: 'displayoptions'},
      {
        key: 'propertytype',
        title: 'סוג הנכס',
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
        title: 'סוג הנכס',
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
        title: 'סוג הנכס',
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
