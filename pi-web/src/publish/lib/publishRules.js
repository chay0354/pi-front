/** Publish / ערוך-פרסם rules — port of the matching part of mobile utils/constant.js. */
import {
  isB2BSubscriptionType,
  isBrokerLikeSubscriptionType,
  isCompanySubscriptionType,
  isProjectMarketerType,
  resolveSubscriptionType,
  subscriptionTypes,
} from '../../profile/lib/constant';

export {
  isB2BSubscriptionType,
  isBrokerLikeSubscriptionType,
  isCompanySubscriptionType,
  isProjectMarketerType,
  resolveSubscriptionType,
  subscriptionTypes,
};

/** Mobile `require('../assets/<path>')` → bundled URL (assets mirrored under src/assets/mobile).
 *  Recursive glob so nested paths (upload-ad/broker/house.png) resolve, not only top-level files. */
const mobileAssetUrls = import.meta.glob('../../assets/mobile/**/*', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const mobileAsset = path => mobileAssetUrls[`../../assets/mobile/${path}`] ?? '';

export const COMPANY_PLANS = {
  projects5: 'projects5',
  projects10: 'projects10',
  multi: 'multi',
};

export const COMPANY_PLAN_LISTING_LIMIT = {
  [COMPANY_PLANS.projects5]: 5,
  [COMPANY_PLANS.projects10]: 10,
  [COMPANY_PLANS.multi]: null,
};

export const COMPANY_PLAN_LABELS = {
  [COMPANY_PLANS.projects5]: 'מנוי ל-5 פרוייקטים',
  [COMPANY_PLANS.projects10]: 'מנוי ל-10 פרוייקטים',
  [COMPANY_PLANS.multi]: 'מנוי-ללא הגבלה פאי מולטי',
};

/** Listing cap for a company account, or null when unlimited / not a company. */
export function getCompanyListingLimit(user) {
  if (!user || typeof user !== 'object') return null;
  const plan = String(user.company_plan ?? user.companyPlan ?? '').trim();
  if (!plan) return null;
  return COMPANY_PLAN_LISTING_LIMIT[plan] ?? null;
}

/** Default feed-post label stored in `ads.description` (Edit/Publish badge). */
export const DEFAULT_POST_DESCRIPTION = 'פוסט';
/** Open-house feed posts (company, broker, project marketer) — same upload flow as פוסט. */
export const OPEN_HOUSE_POST_DESCRIPTION = 'בית פתוח';
/** Persisted in `ads.general_details.post_kind` for open-house feed posts. */
export const OPEN_HOUSE_POST_KIND = 'open_house';
/** Companion feed row for תמונה מכירתית — not editable from ערוך/פרסם. */
export const SALES_IMAGE_POST_KIND = 'sales_image';
export const OPEN_HOUSE_PLACE_KEY = 'open_house_place';
export const OPEN_HOUSE_DATE_KEY = 'open_house_date';

export function parseListingGeneralDetails(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function isReservedPostDescription(description) {
  const t = String(description || '').trim();
  const lower = t.toLowerCase();
  return t === DEFAULT_POST_DESCRIPTION || t === OPEN_HOUSE_POST_DESCRIPTION || lower === 'post';
}

export function isOpenHousePostDescription(description) {
  return String(description || '').trim() === OPEN_HOUSE_POST_DESCRIPTION;
}

export function isOpenHouseListing(listing) {
  if (!listing) return false;
  if (isOpenHousePostDescription(listing.description || listing.desc)) {
    return true;
  }
  const gd = parseListingGeneralDetails(listing.general_details);
  return gd?.post_kind === OPEN_HOUSE_POST_KIND;
}

export function isSalesImageCompanionListing(listing) {
  if (!listing) return false;
  const gd = parseListingGeneralDetails(listing.general_details);
  return gd?.post_kind === SALES_IMAGE_POST_KIND;
}

const normalizeCompanionMediaUrl = url => {
  if (url == null || url === '') return '';
  return String(url).trim().split('?')[0].toLowerCase();
};

const listingLooksLikeFeedPost = item => {
  if (!item) return false;
  if (item.feed_post === true || item.feed_post === 'true' || item.feed_post === 't' || item.isPostEntry === true) {
    return true;
  }
  const type = String(
    item.propertyType || item.property_type || item.propertyTypeRaw || item.apartmentTypeId || '',
  ).toLowerCase();
  if (type === 'post' || type === 'posts' || type === 'feed_post' || type.includes('post')) {
    return true;
  }
  const desc = String(item.description || item.desc || '').trim();
  return desc === DEFAULT_POST_DESCRIPTION || desc.toLowerCase() === 'post';
};

/** Hide תמונה מכירתית companion posts from ערוך/פרסם (edit only from the ad). */
export function excludeSalesImageCompanionListings(listings) {
  const rows = Array.isArray(listings) ? listings.filter(Boolean) : [];
  const salesUrls = new Set();
  for (const row of rows) {
    if (isSalesImageCompanionListing(row)) continue;
    const raw = row.sales_image_url ?? row.salesImageUrl;
    const url = raw != null && String(raw).trim() ? normalizeCompanionMediaUrl(raw) : '';
    if (url) salesUrls.add(url);
  }
  return rows.filter(row => {
    if (isSalesImageCompanionListing(row)) return false;
    if (!listingLooksLikeFeedPost(row)) return true;
    const main = normalizeCompanionMediaUrl(
      row.main_image_url || row.image_url || (typeof row.image === 'string' ? row.image : row.image?.uri),
    );
    const video = normalizeCompanionMediaUrl(row.video_url);
    if (main && salesUrls.has(main)) return false;
    if (video && salesUrls.has(video)) return false;
    return true;
  });
}

/** @returns {{ place: string, date: string } | null} */
export function getOpenHouseDetailsFromListing(listing) {
  if (!isOpenHouseListing(listing)) return null;
  const gd = parseListingGeneralDetails(listing?.general_details);
  return {
    place: String(gd?.[OPEN_HOUSE_PLACE_KEY] || '').trim(),
    date: String(gd?.[OPEN_HOUSE_DATE_KEY] || '').trim(),
  };
}

function formatOpenHouseOverlayName(rawName) {
  const n = String(rawName || '').trim();
  if (!n) return OPEN_HOUSE_POST_DESCRIPTION;
  if (n.includes('בית פתוח')) return n;
  return `בית פתוח ב${n}`;
}

/** Feed overlay — `בית פתוח` + name + ` - ` + date (wraps naturally on two lines). */
export function formatOpenHouseOverlayText(place, date) {
  const name = String(place || '').trim();
  const d = String(date || '').trim();
  if (!name && !d) return '';
  if (!name) return d ? `${OPEN_HOUSE_POST_DESCRIPTION} - ${d}` : '';
  if (!d) return formatOpenHouseOverlayName(name);
  return `${formatOpenHouseOverlayName(name)} - ${d}`;
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
    if (!desc || isReservedPostDescription(desc)) return OPEN_HOUSE_POST_DESCRIPTION;
    return desc;
  }
  if (!desc || isReservedPostDescription(desc)) return DEFAULT_POST_DESCRIPTION;
  return desc;
}

export function canCreateOpenHousePost(subscriptionTypeOrUser) {
  let sub = '';
  if (subscriptionTypeOrUser == null) {
    sub = '';
  } else if (typeof subscriptionTypeOrUser === 'string' || typeof subscriptionTypeOrUser === 'number') {
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
  return sub === subscriptionTypes.company || sub === subscriptionTypes.broker || sub === subscriptionTypes.projectMarketer;
}

/** Ad listing categories for brokers and project marketers (excludes BnB + שותפים). */
export function usesBrokerAdListingCategories(subscriptionType) {
  return isBrokerLikeSubscriptionType(subscriptionType);
}

/** Create-sheet icon for the בית פתוח row (company / broker / project marketer). */
export const CREATE_SHEET_OPEN_HOUSE_ICON = mobileAsset('upload-ad/broker/house.png');
/** Feed overlay pill (בית פתוח + house icon) — baked PNG from Figma. */
export const OPEN_HOUSE_FEED_TAG = mobileAsset('open-house-tag.png');

/** Valid DB `ads.category` ids (gaps 9/11 unused). */
export const LISTING_CATEGORY_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 10, 12]);

/**
 * Parse a listing category id; invalid/missing → fallback (default דירות).
 * Never silently coerce to 1 (חדש מקבלן).
 */
export function parseListingCategoryId(value, fallback = 10) {
  const n = parseInt(value, 10);
  if (Number.isFinite(n) && LISTING_CATEGORY_IDS.has(n)) return n;
  return fallback;
}

/** Regular / private end-user (not broker/company/professional). */
export function isRegularSubscriptionType(subscriptionType) {
  const t = resolveSubscriptionType(subscriptionType);
  return !(
    t === subscriptionTypes.broker ||
    t === subscriptionTypes.company ||
    t === subscriptionTypes.professional ||
    t === subscriptionTypes.projectMarketer
  );
}

export const PROJECT_OFFERS_SECTION_TITLE = 'הפרויקט מציע';
export const ASSET_OFFERS_SECTION_TITLE = 'הנכס מציע';

export function listingOffersSectionTitle(subscriptionType) {
  return isCompanySubscriptionType(subscriptionType) ? PROJECT_OFFERS_SECTION_TITLE : ASSET_OFFERS_SECTION_TITLE;
}

export function isListingOffersSectionTitle(title) {
  return title === PROJECT_OFFERS_SECTION_TITLE || title === ASSET_OFFERS_SECTION_TITLE;
}

/** Swap פרויקט → נכס in upload UI copy for non-company users. */
export function uploadProjectWording(text, subscriptionType) {
  if (text == null || isCompanySubscriptionType(subscriptionType)) return text;
  return String(text).replace(/פרויקט/g, 'נכס');
}

function localizeUploadFormField(field, subscriptionType) {
  if (isCompanySubscriptionType(subscriptionType) || !field) return field;
  if (!field.groups?.title?.includes('פרויקט')) return field;
  return {
    ...field,
    groups: {...field.groups, title: uploadProjectWording(field.groups.title, subscriptionType)},
  };
}

export function localizeUploadFormFields(fields, subscriptionType) {
  if (!Array.isArray(fields) || isCompanySubscriptionType(subscriptionType)) return fields || [];
  return fields.map(f => localizeUploadFormField(f, subscriptionType));
}

/** Bottom create-sheet listing title: company → פרויקט; marketers and all others → נכס. */
export function getCreateSheetListingAssetLabel(subscriptionType) {
  return resolveSubscriptionType(subscriptionType) === subscriptionTypes.company ? 'פרויקט' : 'נכס';
}

/** Bottom create-sheet listing subtitle for standard property categories. */
export function getCreateSheetListingAssetSubtitle(subscriptionType) {
  return resolveSubscriptionType(subscriptionType) === subscriptionTypes.company
    ? 'פרסמו פרויקט'
    : 'פרסמו נכס למכירה או להשכרה';
}

/** Title + subtitle for the listing row in the TikTok / create-ad bottom sheet. */
export function getListingSheetCopy(selectedCategory, subscriptionType) {
  const cat = parseInt(String(selectedCategory ?? '').trim(), 10);
  const assetLabel = getCreateSheetListingAssetLabel(subscriptionType);
  if (cat === 10) return {title: assetLabel, subtitle: 'פרסם נכס למכירה או השכרה'};
  if (cat === 3) return {title: 'פרסם מודעה', subtitle: 'צור מודעה כדי להיכנס, להכניס או למצוא שותף'};
  if (cat === 7) return {title: 'קרקע', subtitle: 'פרסם קרקע למכירה או השכרה'};
  if (cat === 8) return {title: 'נכס מסחרי', subtitle: 'פרסם נכס מסחרי למכירה או השכרה'};
  if (cat === 4 || cat === 6 || cat === 12) return {title: 'נכס', subtitle: 'פרסם נכס למכירה או השכרה'};
  if (cat === 2) {
    const isCompany = resolveSubscriptionType(subscriptionType) === subscriptionTypes.company;
    return {
      title: isCompany ? 'משרדים' : 'משרד',
      subtitle: isCompany ? 'פרסמו פרויקט' : 'פרסם משרד למכירה או השכרה',
    };
  }
  return {title: 'משרד', subtitle: 'פרסם משרד למכירה או השכרה'};
}

/** DB `ads.category` values where a regular user may open "פרסם מודעה" from the create sheet. */
export const regularUserAdListingCategoryIds = new Set([2, 3, 4, 5, 6, 7, 8, 10, 12]);

/** Broker / project marketer — excludes BnB (5) and שותפים (3). */
export const brokerSheetAdListingCategoryIds = new Set([1, 2, 4, 6, 7, 8, 10, 12]);

/** Company — BnB (5) is regular-user only. */
export const companySheetAdListingCategoryIds = new Set([1, 2, 4, 6, 7, 8, 12]);

/** Whether the create sheet shows a listing/ad row (not post-only) for this user + DB category. */
export function canShowListingAdInCreateSheet(subscriptionType, listingCategoryId) {
  const sub = resolveSubscriptionType(subscriptionType);
  const n = Number(listingCategoryId);
  if (!Number.isFinite(n)) return false;
  if (sub === subscriptionTypes.professional) return false;
  if (isBrokerLikeSubscriptionType(sub)) return brokerSheetAdListingCategoryIds.has(n);
  if (sub === subscriptionTypes.company) return companySheetAdListingCategoryIds.has(n);
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

const LISTING_TO_EDIT_PROFILE_UI_CATEGORY_ID = Object.entries(EDIT_PROFILE_UI_TO_LISTING_CATEGORY_ID).reduce(
  (acc, [uiId, listingId]) => {
    acc[listingId] = Number(uiId);
    return acc;
  },
  {},
);

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

export const categoriesEditProfile = [
  {id: 9, name: 'דירות', image: mobileAsset('category_9.png'), selectedImage: mobileAsset('category_selected_9.png')},
  {id: 8, name: 'משרדים', image: mobileAsset('category_8.png'), selectedImage: mobileAsset('category_selected_8.png')},
  {id: 7, name: 'מסחר', image: mobileAsset('category_7.png'), selectedImage: mobileAsset('category_selected_7.png')},
  {id: 6, name: 'קרקעות', image: mobileAsset('category_6.png'), selectedImage: mobileAsset('category_selected_6.png')},
  {id: 5, name: 'יוקרה', image: mobileAsset('category_5.png'), selectedImage: mobileAsset('category_selected_5.png')},
  {id: 4, name: 'מגזר דתי', image: mobileAsset('category_4.png'), selectedImage: mobileAsset('category_selected_4.png')},
  {id: 3, name: 'גלובל', image: mobileAsset('category_3.png'), selectedImage: mobileAsset('category_selected_3.png')},
  {id: 2, name: 'BNB', image: mobileAsset('category_2.png'), selectedImage: mobileAsset('category_selected_2.png')},
  {id: 1, name: 'חדש מקבלן', image: mobileAsset('category_1.png'), selectedImage: mobileAsset('category_selected_1.png')},
  {id: 10, name: 'שותפים', image: mobileAsset('category_10.png'), selectedImage: mobileAsset('category_selected_10.png')},
];

const NEW_BUILDER_EDIT_PROFILE_UI_CATEGORY_ID = 1;

/** Strip order: the first item sits on the right (RTL). */
export function orderPublishCategoriesStrip(strip) {
  if (!strip?.length) return strip || [];
  const newBuilder = strip.find(cat => cat.id === NEW_BUILDER_EDIT_PROFILE_UI_CATEGORY_ID);
  if (!newBuilder) return strip;
  return [newBuilder, ...strip.filter(cat => cat.id !== NEW_BUILDER_EDIT_PROFILE_UI_CATEGORY_ID)];
}

/** Categories on EditPublishAd carousel — all tabs for every user. */
export function getPublishCategoriesStrip() {
  return orderPublishCategoriesStrip(categoriesEditProfile);
}

/** ניתוח מודעות: publishable listing categories + Pi Partners (שותפים). */
export function getAnalysisCategoriesStrip(subscriptionType) {
  const filtered = categoriesEditProfile.filter(cat => {
    const listingId = resolveListingCategoryFromEditProfileUi(cat.id);
    if (listingId === 3) return true;
    return canShowListingAdInCreateSheet(subscriptionType, listingId);
  });
  return orderPublishCategoriesStrip(filtered);
}

/** All subscription types except professional may open ניתוח מודעות. */
export function canAccessListingAnalysis(subscriptionType) {
  return String(subscriptionType ?? '').trim().toLowerCase() !== subscriptionTypes.professional;
}

export const RESIDENTIAL_LISTING_SHEET_ICON = mobileAsset('upload-ad/1.png');
export const BROKER_RESIDENTIAL_LISTING_SHEET_ICON = mobileAsset('upload-ad/broker/house.png');
export const BROKER_OFFICE_LISTING_SHEET_ICON = mobileAsset('upload-ad/broker/office.png');

const BROKER_RESIDENTIAL_LISTING_SHEET_CATEGORY_IDS = new Set([1, 4, 6, 10, 12]);
/** Regular users: שותפים, גלובל, מגזר דתי, דירות, יוקרה. */
const REGULAR_USER_HOUSE_LISTING_SHEET_CATEGORY_IDS = new Set([3, 4, 6, 10, 12]);

/** Icon for the top create-sheet row (listing/ad), not the פוסט row. */
export function getCreateSheetListingIcon(selectedCategory, subscriptionType = null) {
  const id = parseInt(String(selectedCategory ?? '').trim(), 10);
  const sub = String(subscriptionType ?? '').toLowerCase();
  const isBrokerLike = usesBrokerAdListingCategories(sub);
  const isRegularUser = sub === subscriptionTypes.user;

  if (id === 2) return BROKER_OFFICE_LISTING_SHEET_ICON;
  if (isBrokerLike && BROKER_RESIDENTIAL_LISTING_SHEET_CATEGORY_IDS.has(id)) {
    return BROKER_RESIDENTIAL_LISTING_SHEET_ICON;
  }
  if (isRegularUser && REGULAR_USER_HOUSE_LISTING_SHEET_CATEGORY_IDS.has(id)) {
    return BROKER_RESIDENTIAL_LISTING_SHEET_ICON;
  }
  if (BROKER_RESIDENTIAL_LISTING_SHEET_CATEGORY_IDS.has(id)) return RESIDENTIAL_LISTING_SHEET_ICON;
  if (id === 3) return mobileAsset('image22221.png');
  if (id === 7) return mobileAsset('categories/image-copy.png');
  if (id === 8) return mobileAsset('categories/image.png');
  return mobileAsset('post-office-icon.png');
}

/** Monthly ad publish limit without a promo code (coupons add bonus on top). */
export const DEFAULT_MONTHLY_LISTING_QUOTA = 65;

/** Professional types a feed post can tag (PostTargetProfessionalsSheet). */
export const PROFESSIONAL_FILTER_TYPES = [
  'תיווך',
  'עורך דין',
  'עיצוב פנים',
  'יועץ משכנתאות',
  'שמאות',
  'אדריכלות',
  'מלווה משקיעים',
];
