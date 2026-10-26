import {useState, useRef, useEffect, useMemo, useCallback} from 'react';
import {mdiChevronLeft} from '@mdi/js';
import MdiIcon from './MdiIcon';
import {useSession} from '../auth/session';
import {pickFile} from '../account/AccountUi';
import CircleCropModal from '../account/CircleCropModal';
import {
  uploadFile,
  errorMessageFromUnknown,
  createListing,
  createSalesImageStory,
  updateListing,
} from '../api/listingsPublish';
import {getUserProfileImageUrl} from '../profile/lib/userProfileImage';
import {listingImageUrls} from '../profile/lib/listingGridCardFigma';
import {resolveAdVideoUri, resolveListingEditVideoSourceUrl} from '../profile/lib/videoPlayback';
import {getUserBnbHostLock} from './lib/bnbHostLock';
import {brokerCategoryForm, companyCategoryForm, userCategoryForm} from './lib/categoryForms';
import {
  listingOffersSectionTitle,
  localizeUploadFormFields,
  mobileAsset,
  parseListingCategoryId,
  resolveSubscriptionType,
  subscriptionTypes,
  isB2BSubscriptionType,
  SALES_IMAGE_POST_KIND,
  uploadProjectWording,
} from './lib/publishRules';
import {
  PRICE_COUNTER_STEP_DEFAULT,
  PRICE_COUNTER_STEP_PER_NIGHT,
  PRICE_COUNTER_STEP_ROOMMATE_BUDGET,
} from './lib/priceInput';
import {FormScrollProvider} from './lib/formKeyboardScroll';
import {buildGlobalGroundFieldList} from './lib/globalGroundAdFields';
import {resolvePublisherIdentityForSave} from './lib/listingPublisherIdentity';
import {PublishAdButton} from './fields/PublishAdButton';
import {CompanyOffersLandSizes} from './fields/CompanyOffersLandSizes';
import {SharedSpacesCompany} from './fields/SharedSpacesCompany';
import {
  AccommodationOffers,
  AdditionalDetails,
  AddressDetails,
  ApartmentType,
  DisplayOptions,
  GeneralDetails,
  HospitalityNature,
  MultiImageWithVideo,
  Preferences,
  PriceCount,
  ProfileVerification,
  PropertyCondition,
  PropertyType,
  Purpose,
  SearchPurpose,
  ServiceAndFacility,
  CancellationPolicy,
  ContactDetails,
  ProposedLand,
  RadioOptions,
  LandAddress,
  SalesImage,
  SaleAtPreSale,
  GeneralDetailsWithRadio,
  ConstructionStatus,
  PropertyAddress,
} from './fields';
import PublishValidationModal from './components/PublishValidationModal';
import styles from './AdsForm.module.css';

/** Company office upload (category 2) — same strings as `companyCategoryForm[2]` in categoryForms.js */
const COMPANY_OFFICE_SIZES_SECTION_TITLE = 'הפרוייקט מציע משרדים בגדלים של';
const COMPANY_WHOLE_FLOOR_SECTION_TITLE = 'הפרוייקט מציע קומה שלמה';
/** Company commercial (category 8) — `companyCategoryForm[8]` */
const CAT8_COMMERCIAL_SIZES_SECTION_TITLE = 'הפרוייקט מציע שטחי מסחר בגדלים של';
const CAT8_WHOLE_FLOOR_SECTION_TITLE = 'הפרוייקט מציע קומה שלמה';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PARTNER_FIXED_IMAGE = mobileAsset('image-insert-2.png');

function normalizeCompanyLandParcel(raw) {
  if (!raw || typeof raw !== 'object') {
    return {unit: 'dunam', area: 0, price: 0};
  }
  const unit = raw.unit === 'sqm' ? 'sqm' : 'dunam';
  return {
    unit,
    area: Math.max(0, Number(raw.area) || 0),
    price: Math.max(0, Number(raw.price) || 0),
  };
}

function maxRepeatSlotFromProjectOffers(po, keyRe) {
  if (!po || typeof po !== 'object') {
    return 0;
  }
  let max = 0;
  for (const key of Object.keys(po)) {
    const m = key.match(keyRe);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) {
        max = Math.max(max, n);
      }
    }
  }
  return max;
}

function buildCompanyOfficeRepeatGroups(count) {
  const rows = [];
  for (let i = 1; i <= count; i++) {
    rows.push({
      title: `משרד ${i}`,
      titleRequired: false,
      isSelected: true,
      fields: [
        {
          type: 'count',
          key: `office_${i}_area`,
          isArea: true,
          subTitle: 'גודל המשרד',
          subTitleRequired: true,
        },
        {
          type: 'price',
          key: `office_${i}_price`,
          subTitle: 'מחיר\u00A0למטר',
          subTitleRequired: true,
        },
      ],
    });
  }
  rows.push({
    title: 'הוסף משרד',
    titleRequired: false,
    isSelected: true,
    fields: [],
    isAddRepeatRow: true,
  });
  return rows;
}

function buildCompanyWholeFloorRepeatGroups(count) {
  const rows = [];
  for (let i = 1; i <= count; i++) {
    rows.push({
      title: `קומה שלמה ${i}`,
      titleRequired: false,
      isSelected: true,
      fields: [
        {
          type: 'count',
          key: `whole_floor_${i}_area`,
          isArea: true,
          subTitle: 'גודל הקומה',
          subTitleRequired: true,
        },
        {
          type: 'price',
          key: `whole_floor_${i}_price`,
          subTitle: 'מחיר\u00A0למטר',
          subTitleRequired: true,
        },
      ],
    });
  }
  rows.push({
    title: 'הוסף קומה שלמה',
    titleRequired: false,
    isSelected: true,
    fields: [],
    isAddRepeatRow: true,
  });
  return rows;
}

function buildCat8CommercialRepeatGroups(count) {
  const rows = [];
  for (let i = 1; i <= count; i++) {
    rows.push({
      title: `שטח מסחרי ${i}`,
      titleRequired: true,
      isSelected: true,
      fields: [
        {
          type: 'count',
          key: `cat8_commercial_space_${i}_sqm`,
          isArea: true,
          subTitle: 'גודל השטח',
          subTitleRequired: true,
        },
        {
          type: 'price',
          key: `cat8_commercial_space_${i}_price`,
          subTitle: 'מחיר\u00A0למטר',
          subTitleRequired: true,
        },
      ],
    });
  }
  rows.push({
    title: 'הוסף שטח מסחרי',
    titleRequired: true,
    isSelected: true,
    fields: [],
    isAddRepeatRow: true,
  });
  return rows;
}

function buildCat8WholeFloorRepeatGroups(count) {
  const rows = [];
  for (let i = 1; i <= count; i++) {
    rows.push({
      title: `קומה שלמה ${i}`,
      titleRequired: false,
      isSelected: true,
      fields: [
        {
          type: 'count',
          key: `cat8_whole_floor_${i}_sqm`,
          isArea: true,
          subTitle: 'גודל הקומה',
          subTitleRequired: true,
        },
        {
          type: 'price',
          key: `cat8_whole_floor_${i}_price`,
          subTitle: 'מחיר\u00A0למטר',
          subTitleRequired: true,
        },
      ],
    });
  }
  rows.push({
    title: 'הוסף קומה שלמה',
    titleRequired: false,
    isSelected: true,
    fields: [],
    isAddRepeatRow: true,
  });
  return rows;
}

/** Ensure every dynamic slot key exists in the payload (incl. zeros) so the API stores all rows. */
function padDynamicCompanyProjectOfferSlots(merged, listingCategory, slots) {
  if (!merged || typeof merged !== 'object') {
    return;
  }
  const {
    companyOfficeRepeatCount = 0,
    companyWholeFloorRepeatCount = 0,
    cat8CommercialRepeatCount = 0,
    cat8WholeFloorRepeatCount = 0,
  } = slots;
  if (listingCategory === 2) {
    for (let i = 1; i <= companyOfficeRepeatCount; i++) {
      const a = `office_${i}_area`;
      const p = `office_${i}_price`;
      merged[a] = merged[a] ?? 0;
      merged[p] = merged[p] ?? 0;
    }
    for (let i = 1; i <= companyWholeFloorRepeatCount; i++) {
      const a = `whole_floor_${i}_area`;
      const p = `whole_floor_${i}_price`;
      merged[a] = merged[a] ?? 0;
      merged[p] = merged[p] ?? 0;
    }
  }
  if (listingCategory === 8) {
    for (let i = 1; i <= cat8CommercialRepeatCount; i++) {
      const a = `cat8_commercial_space_${i}_sqm`;
      const p = `cat8_commercial_space_${i}_price`;
      merged[a] = merged[a] ?? 0;
      merged[p] = merged[p] ?? 0;
    }
    for (let i = 1; i <= cat8WholeFloorRepeatCount; i++) {
      const a = `cat8_whole_floor_${i}_sqm`;
      const p = `cat8_whole_floor_${i}_price`;
      merged[a] = merged[a] ?? 0;
      merged[p] = merged[p] ?? 0;
    }
  }
}

const isRemoteMediaUrl = uri => typeof uri === 'string' && (uri.startsWith('http://') || uri.startsWith('https://'));

const hasLocalMediaFile = fileObj => Boolean(fileObj?.uri) && !isRemoteMediaUrl(fileObj.uri);

/** Browser File → uploadFile shape `{uri, type, name, file}`. */
const pickedFileAsset = (file, kind = 'image') => {
  const isVideo = kind === 'video';
  return {
    uri: URL.createObjectURL(file),
    type: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
    name: file.name || (isVideo ? `video-${Date.now()}.mp4` : `photo-${Date.now()}.jpg`),
    file,
  };
};

const showAlert = (title, message) => window.alert(title ? `${title}\n\n${message}` : message);

export default function AdsForm({
  onClose,
  onPublish,
  initialCategory = null,
  initialListing = null,
  initialBnbHostType = null,
  /** Navigate to post composer for current category; return path is set by App. */
  onOpenPostEditor = null,
  /** False while the sales-image editor covers this form, so Escape stays on the editor. */
  active = true,
  /** Set when PostEditor returns to AdsForm after publishing a sales-image post. */
  pendingSalesImageFromEditor = null,
  onPendingSalesImageConsumed = null,
  currentUser: currentUserProp,
}) {
  const session = useSession();
  const currentUser = currentUserProp !== undefined ? currentUserProp : session.currentUser;

  const rootRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const [propertyType, setPropertyType] = useState(null);
  const [serviceAndFacilities, setServiceAndFacilities] = useState({});
  const [cancellationPolicy, setCancellationPolicy] = useState(null);
  /** מחיר ללילה — "מחיר במבצע" / Hot deal (saved as ads.hot_deal) */
  const [hotDeal, setHotDeal] = useState(false);
  const [area, setArea] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [floor, setFloor] = useState(1);
  const [amenities, setAmenities] = useState({});
  const [optionSecondValues, setOptionSecondValues] = useState({});
  const [condition, setCondition] = useState(null);
  const [purpose, setPurpose] = useState('sale');
  const [price, setPrice] = useState(1000000);
  const [projectName, setProjectName] = useState('');
  const [address, setAddress] = useState('');
  const [landParcel, setLandParcel] = useState('');
  const [landBlock, setLandBlock] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [contactFullName, setContactFullName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [hasVideo, setHasVideo] = useState(false);
  /** 'video' | 'mainImage' — what to show first on the TikTok feed */
  const [feedDisplayPriority, setFeedDisplayPriority] = useState('video');
  /** 'collage' | 'slideshow' */
  const [displayOption, setDisplayOption] = useState(null);
  /** 'low' | 'medium' | 'high' — how often the ad is shown to others */
  const [exposureLevel, setExposureLevel] = useState('medium');
  const formList = useMemo(() => {
    const t = resolveSubscriptionType(currentUser);
    if (t === subscriptionTypes.broker || t === subscriptionTypes.projectMarketer) {
      return brokerCategoryForm;
    }
    if (t === subscriptionTypes.company || t === subscriptionTypes.professional) {
      // companyCategoryForm has no key `1` — merge broker’s חדש מקבלן project form
      return {
        ...companyCategoryForm,
        1: {
          ...brokerCategoryForm[1],
          role: 'company',
        },
      };
    }
    // Regular users (and missing/alias types) never use company/contractor forms.
    return userCategoryForm;
  }, [currentUser]);

  /** DB category (default דירות=10, never silent חדש מקבלן=1) */
  const [category, setCategory] = useState(() => parseListingCategoryId(initialCategory, 10));
  const offersSectionTitle = listingOffersSectionTitle(currentUser?.subscription_type);
  /** גלובל + סוג נכס "קרקע": same sections/order as קרקעות (cat. 7) */
  const adsFormFields = useMemo(() => {
    const raw = buildGlobalGroundFieldList(formList, category, propertyType) ?? formList[category]?.fields ?? [];
    return localizeUploadFormFields(raw, currentUser?.subscription_type);
  }, [formList, category, propertyType, currentUser?.subscription_type]);

  /** 'enter' | 'bring_in' | 'partner' */
  const [searchPurpose, setSearchPurpose] = useState(null);
  const [preferredApartmentType, setPreferredApartmentType] = useState(null);
  /** 'female' | 'male' */
  const [preferredGender, setPreferredGender] = useState(null);
  const [preferredAgeMin, setPreferredAgeMin] = useState(20);
  const [preferredAgeMax, setPreferredAgeMax] = useState(100);
  const [preferences, setPreferences] = useState({});
  const [budget, setBudget] = useState(1000);
  /** BnB category 5: from feed sheet — persisted in general_details.bnb_host_type */
  const [bnbHostType, setBnbHostType] = useState(null);
  const [guestCount, setGuestCount] = useState(1);
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  /** Pre-sale tag — stored in ads.sale_at_presale (boolean). */
  const [saleAtPresale, setSaleAtPresale] = useState(false);
  const [sharedSpacesCompany, setSharedSpacesCompany] = useState(false);

  const [mainImage, setMainImage] = useState(null);
  const [mainImageUrl, setMainImageUrl] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [, setAdditionalImageUrls] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [publishValidationVisible, setPublishValidationVisible] = useState(false);
  const [publishValidationMessages, setPublishValidationMessages] = useState([]);

  const mainImageInputRef = useRef(null);
  const [constructionStatus, setConstructionStatus] = useState(null);
  const additionalImageInputRefs = useRef([null, null, null, null]);
  const videoInputRef = useRef(null);
  const bnbBusinessLogoInputRef = useRef(null);
  const [bnbBusinessLogo, setBnbBusinessLogo] = useState(null);
  const [bnbBusinessLogoUrl, setBnbBusinessLogoUrl] = useState(null);
  const [bnbLogoCropUri, setBnbLogoCropUri] = useState(null);
  const [bnbLogoCropVisible, setBnbLogoCropVisible] = useState(false);
  const [partnerPhotoCropUri, setPartnerPhotoCropUri] = useState(null);
  const [partnerPhotoCropVisible, setPartnerPhotoCropVisible] = useState(false);
  const [adImageCrop, setAdImageCrop] = useState(null);
  const adImageSourceRef = useRef({main: null, extra: {}});
  const [partnerPhotoSourceUri, setPartnerPhotoSourceUri] = useState(null);
  /** Sales image (תמונה מכירתית) — stored in ads.sales_image_url. */
  const salesImageInputRef = useRef(null);
  const [salesImage, setSalesImage] = useState(null);
  const [salesImageUrl, setSalesImageUrl] = useState(null);
  /** Editable text layers for תמונה מכירתית (re-open post editor). */
  const [salesImageEditorMeta, setSalesImageEditorMeta] = useState(null);
  /** True when a companion story still needs to be created on publish. */
  const salesImageCompanionPendingRef = useRef(false);
  /** True when PostEditor already published the sales image as a story. */
  const salesImageStoryAlreadyCreatedRef = useRef(false);
  /** Original sales image URL when the edit form opened — backend syncs mirrors on change. */
  const initialSalesImageUrlRef = useRef(null);
  /** Land form radio groups (תב״ע, קרקע במושע, etc.) keyed by field title */
  const [landRadioValues, setLandRadioValues] = useState({});
  /** פרטים כלליים: כמות מבנים, מספר קומות, כמות דירות (broker/company category 1) */
  const [generalDetailsCounts, setGeneralDetailsCounts] = useState({
    sqm_area: 0,
    building_count: 0,
    floor_count: 0,
    apartment_count: 0,
    shop_count: 0,
    parking_structured_count: 0,
  });
  /** הפרויקט מציע: area, rooms, price per apartment type */
  const [projectOffers, setProjectOffers] = useState({
    rooms_3_area: 0,
    rooms_3_price: 0,
    rooms_4_area: 0,
    rooms_4_price: 0,
    rooms_5_area: 0,
    rooms_5_price: 0,
    garden_area: 0,
    garden_rooms: 0,
    garden_price: 0,
    penthouse_area: 0,
    penthouse_rooms: 0,
    penthouse_price: 0,
    private_area: 0,
    private_rooms: 0,
    private_price: 0,
  });
  /** Form keys not in generalDetailsCounts/projectOffers (e.g. office_1_area, whole_floor_1_price) */
  const [otherFormValues, setOtherFormValues] = useState({});
  /** `${fieldIndex}-${groupTitle}` → false = row removed from "הפרויקט מציע" */
  const [projectOfferGroupsOn, setProjectOfferGroupsOn] = useState({});
  /** "הפרויקט מציע" accordion — `${fieldIndex}-${groupTitle}` → true = expanded (default collapsed) */
  const [projectOfferGroupsExpanded, setProjectOfferGroupsExpanded] = useState({});
  /** Company category 2 (משרדים): dynamic משרד 1… / קומה שלמה 1… rows */
  const [companyOfficeRepeatCount, setCompanyOfficeRepeatCount] = useState(0);
  const [companyWholeFloorRepeatCount, setCompanyWholeFloorRepeatCount] = useState(0);
  /** Company category 8 (מסחר): dynamic שטח מסחרי / קומה שלמה rows */
  const [cat8CommercialRepeatCount, setCat8CommercialRepeatCount] = useState(0);
  const [cat8WholeFloorRepeatCount, setCat8WholeFloorRepeatCount] = useState(0);
  /** Company category 7 (קרקעות): persisted as `company_offers_land_sizes` */
  const [companyLandParcels, setCompanyLandParcels] = useState([]);
  /** Broker / regular user category 7 — persisted as `proposed_land`. */
  const [proposedLand, setProposedLand] = useState({
    unit: 'dunam',
    area: 0.5,
  });

  useEffect(() => {
    if (!active) return undefined;
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-account-modal]')) return;
      if (!rootRef.current || rootRef.current.offsetParent === null) return;
      e.stopPropagation();
      onCloseRef.current?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active]);

  useEffect(() => {
    if (initialCategory == null || initialCategory === '') {
      return;
    }
    const categoryNum = parseListingCategoryId(initialCategory, null);
    if (categoryNum != null) {
      setCategory(categoryNum);
    }
  }, [initialCategory]);

  useEffect(() => {
    setProjectOfferGroupsOn({});
    setProjectOfferGroupsExpanded({});
    if (parseInt(category, 10) !== 7) {
      setCompanyLandParcels([]);
    }
  }, [category]);

  // עריכת מודעה: פתח אוטומטית רק שורות שיש בהן נתונים ב-project_offers
  useEffect(() => {
    if (!initialListing?.id) {
      return;
    }
    const po = initialListing.project_offers;
    if (!po || typeof po !== 'object') {
      return;
    }
    const next = {};
    adsFormFields.forEach((field, fieldIndex) => {
      if (field.key !== 'generaldetailswithradio' || field.groups?.title !== offersSectionTitle) {
        return;
      }
      (field.groups.groups || []).forEach(grp => {
        const keys = (grp.fields || []).map(f => f.key).filter(Boolean);
        const hasData = keys.some(k => {
          const v = po[k];
          return v != null && Number(v) > 0;
        });
        if (hasData) {
          next[`${fieldIndex}-${grp.title}`] = true;
        }
      });
    });
    if (Object.keys(next).length > 0) {
      setProjectOfferGroupsExpanded(prev => ({...prev, ...next}));
    }
  }, [initialListing?.id, adsFormFields, offersSectionTitle]);

  useEffect(() => {
    if (!initialListing?.id || parseInt(category, 10) !== 2) {
      return;
    }
    const po = initialListing.project_offers;
    if (!po || typeof po !== 'object') {
      return;
    }
    const next = {};
    adsFormFields.forEach((field, fieldIndex) => {
      if (field.key !== 'generaldetailswithradio') {
        return;
      }
      const sectionTitle = field.groups?.title;
      if (sectionTitle !== COMPANY_OFFICE_SIZES_SECTION_TITLE && sectionTitle !== COMPANY_WHOLE_FLOOR_SECTION_TITLE) {
        return;
      }
      const prefix = sectionTitle === COMPANY_OFFICE_SIZES_SECTION_TITLE ? 'office' : 'whole_floor';
      for (let i = 1; i <= 40; i++) {
        const ak = `${prefix}_${i}_area`;
        const pk = `${prefix}_${i}_price`;
        const has = (po[ak] != null && Number(po[ak]) > 0) || (po[pk] != null && Number(po[pk]) > 0);
        if (has) {
          const rowTitle = prefix === 'office' ? `משרד ${i}` : `קומה שלמה ${i}`;
          next[`${fieldIndex}-${rowTitle}`] = true;
        }
      }
    });
    if (Object.keys(next).length > 0) {
      setProjectOfferGroupsExpanded(prev => ({...prev, ...next}));
    }
  }, [initialListing?.id, initialListing?.project_offers, category, adsFormFields]);

  useEffect(() => {
    if (!initialListing?.id || parseInt(category, 10) !== 8) {
      return;
    }
    const po = initialListing.project_offers;
    if (!po || typeof po !== 'object') {
      return;
    }
    const next = {};
    adsFormFields.forEach((field, fieldIndex) => {
      if (field.key !== 'generaldetailswithradio') {
        return;
      }
      const sectionTitle = field.groups?.title;
      if (sectionTitle !== CAT8_COMMERCIAL_SIZES_SECTION_TITLE && sectionTitle !== CAT8_WHOLE_FLOOR_SECTION_TITLE) {
        return;
      }
      const isCommercial = sectionTitle === CAT8_COMMERCIAL_SIZES_SECTION_TITLE;
      for (let i = 1; i <= 40; i++) {
        const ak = isCommercial ? `cat8_commercial_space_${i}_sqm` : `cat8_whole_floor_${i}_sqm`;
        const pk = isCommercial ? `cat8_commercial_space_${i}_price` : `cat8_whole_floor_${i}_price`;
        const has = (po[ak] != null && Number(po[ak]) > 0) || (po[pk] != null && Number(po[pk]) > 0);
        if (has) {
          const rowTitle = isCommercial ? `שטח מסחרי ${i}` : `קומה שלמה ${i}`;
          next[`${fieldIndex}-${rowTitle}`] = true;
        }
      }
    });
    if (Object.keys(next).length > 0) {
      setProjectOfferGroupsExpanded(prev => ({...prev, ...next}));
    }
  }, [initialListing?.id, initialListing?.project_offers, category, adsFormFields]);

  useEffect(() => {
    const fields = formList?.[category]?.fields || [];
    const hasPricePerNight = fields.some(field => field?.key === 'pricepernight');
    if (!hasPricePerNight) return;
    // New BnB upload: use 1000/night instead of the sale default (1_000_000).
    if (initialListing) return;
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0 || numericPrice === 1_000_000) {
      setPrice(1000);
    }
  }, [category, formList, initialListing, price]);

  const lockedBnbHostType = getUserBnbHostLock(currentUser);

  useEffect(() => {
    if (initialListing) {
      const gd = initialListing.general_details;
      let host =
        gd && typeof gd === 'object' && (gd.bnb_host_type === 'private' || gd.bnb_host_type === 'business')
          ? gd.bnb_host_type
          : null;
      if (!host && initialListing.bnb_business_logo_url) {
        host = 'business';
      }
      setBnbHostType(host);
      return;
    }
    setBnbHostType(
      lockedBnbHostType ||
        (initialBnbHostType === 'private' || initialBnbHostType === 'business' ? initialBnbHostType : null),
    );
  }, [initialListing, initialBnbHostType, lockedBnbHostType]);

  // Pre-fill form when editing an existing listing
  useEffect(() => {
    if (!initialListing) return;
    const cat = parseListingCategoryId(initialListing.category, null);
    if (cat != null) setCategory(cat);
    const ptRaw = initialListing.property_type ?? initialListing.propertyType;
    if (ptRaw != null && String(ptRaw).trim() !== '') {
      setPropertyType(String(ptRaw).trim());
    }
    setDescription(initialListing.description ?? '');
    setProjectName(initialListing.project_name != null ? String(initialListing.project_name) : '');
    setAddress(initialListing.address != null ? String(initialListing.address) : '');
    let parcel = initialListing.land_parcel != null ? String(initialListing.land_parcel) : '';
    let block = initialListing.land_block != null ? String(initialListing.land_block) : '';
    if ((!parcel || !block) && initialListing.land_address != null && String(initialListing.land_address).trim()) {
      const segs = String(initialListing.land_address)
        .split(/\s*\|\s*/)
        .map(x => x.trim())
        .filter(Boolean);
      for (const seg of segs) {
        if (!parcel && seg.startsWith('חלקה')) {
          parcel = seg.replace(/^חלקה\s*/, '').trim();
        }
        if (!block && seg.startsWith('גוש')) {
          block = seg.replace(/^גוש\s*/, '').trim();
        }
      }
    }
    setLandParcel(parcel);
    setLandBlock(block);
    setPhone(initialListing.phone != null ? String(initialListing.phone) : '');
    setContactFullName(
      initialListing.contact_details?.full_name != null ? String(initialListing.contact_details.full_name) : '',
    );
    setContactEmail(initialListing.contact_details?.email != null ? String(initialListing.contact_details.email) : '');
    if (
      cat === 5 &&
      initialListing.price_per_night != null &&
      String(initialListing.price_per_night).trim() !== '' &&
      !Number.isNaN(Number(initialListing.price_per_night))
    ) {
      setPrice(Number(initialListing.price_per_night));
    } else {
      setPrice(initialListing.price ?? 1000000);
    }
    // שותפים: API may store amount in price; keep form in sync with budget field
    if (cat === 3) {
      const b = initialListing.budget;
      const p = initialListing.price;
      setBudget(
        b != null && b !== '' && !Number.isNaN(Number(b))
          ? Number(b)
          : p != null && p !== '' && !Number.isNaN(Number(p))
            ? Number(p)
            : 1000,
      );
      const amin = initialListing.preferred_age_min ?? initialListing.preferredAgeMin;
      const amax = initialListing.preferred_age_max ?? initialListing.preferredAgeMax;
      if (amin != null && String(amin).trim() !== '' && !Number.isNaN(Number(amin))) {
        setPreferredAgeMin(Math.max(18, Math.min(100, Math.round(Number(amin)))));
      }
      if (amax != null && String(amax).trim() !== '' && !Number.isNaN(Number(amax))) {
        setPreferredAgeMax(Math.max(18, Math.min(100, Math.round(Number(amax)))));
      }
    } else {
      setBudget(initialListing.budget ?? 1000);
    }
    const imageUrlList = listingImageUrls(initialListing);
    if (imageUrlList.length > 0) {
      setMainImage({uri: imageUrlList[0]});
      setMainImageUrl(imageUrlList[0]);
      if (imageUrlList.length > 1) {
        const rest = imageUrlList.slice(1).map(uri => ({uri}));
        setAdditionalImages(rest);
        setAdditionalImageUrls(imageUrlList.slice(1));
      } else {
        setAdditionalImages([]);
        setAdditionalImageUrls([]);
      }
    } else {
      setMainImage(null);
      setMainImageUrl(null);
      setAdditionalImages([]);
      setAdditionalImageUrls([]);
    }
    const editVideoUrl = resolveListingEditVideoSourceUrl(initialListing) || resolveAdVideoUri(initialListing);
    if (editVideoUrl) {
      setVideoUrl(editVideoUrl);
      setVideoFile({uri: editVideoUrl});
      setHasVideo(true);
    } else {
      setVideoUrl(null);
      setVideoFile(null);
      setHasVideo(false);
    }
    if (initialListing.purpose != null && String(initialListing.purpose).trim()) {
      setPurpose(String(initialListing.purpose).trim());
    }
    if (initialListing.condition != null && String(initialListing.condition).trim()) {
      setCondition(String(initialListing.condition).trim());
    }
    if (initialListing.amenities && typeof initialListing.amenities === 'object') {
      setAmenities({...initialListing.amenities});
    }
    if (initialListing.rooms != null && !Number.isNaN(Number(initialListing.rooms))) {
      setRooms(Math.max(0, Math.round(Number(initialListing.rooms))));
    }
    if (initialListing.floor != null && !Number.isNaN(Number(initialListing.floor))) {
      setFloor(Math.max(0, Math.round(Number(initialListing.floor))));
    }
    if (initialListing.area != null && !Number.isNaN(Number(initialListing.area))) {
      setArea(Math.max(0, Math.round(Number(initialListing.area))));
    }
    const feedPri = initialListing.feed_display_priority;
    if (feedPri === 'mainImage' || feedPri === 'video') {
      setFeedDisplayPriority(feedPri);
    }
    if (initialListing.display_option === 'collage' || initialListing.display_option === 'slideshow') {
      setDisplayOption(initialListing.display_option);
    }
    if (initialListing.search_purpose != null) {
      setSearchPurpose(String(initialListing.search_purpose).trim() || null);
    }
    const aptType = initialListing.preferred_apartment_type ?? initialListing.hospitality_nature ?? null;
    if (aptType != null && String(aptType).trim()) {
      setPreferredApartmentType(String(aptType).trim());
    }
    if (initialListing.preferred_gender != null) {
      setPreferredGender(String(initialListing.preferred_gender).trim() || null);
    }
    if (initialListing.preferences && typeof initialListing.preferences === 'object') {
      setPreferences({...initialListing.preferences});
    }
    const landRadios = {};
    if (initialListing.plan_approval) {
      landRadios['תב״ע'] = initialListing.plan_approval;
    }
    if (initialListing.land_in_mortgage) {
      landRadios['קרקע במושע'] = initialListing.land_in_mortgage;
    }
    if (initialListing.permit) {
      landRadios['היתר'] = initialListing.permit;
    }
    if (initialListing.agricultural_land) {
      landRadios['קרקע חקלאית'] = initialListing.agricultural_land;
    }
    if (initialListing.land_ownership) {
      landRadios['בעלות קרקע'] = initialListing.land_ownership;
    }
    if (Object.keys(landRadios).length > 0) {
      setLandRadioValues(prev => ({...prev, ...landRadios}));
    }
    const bnbLogoRaw = initialListing.bnb_business_logo_url ?? initialListing.bnbBusinessLogoUrl ?? null;
    if (bnbLogoRaw) {
      const u = String(bnbLogoRaw).trim();
      setBnbBusinessLogo({uri: u});
      setBnbBusinessLogoUrl(u);
    } else {
      setBnbBusinessLogo(null);
      setBnbBusinessLogoUrl(null);
    }
    if (initialListing.general_details && typeof initialListing.general_details === 'object') {
      const gd = initialListing.general_details;
      const listingAreaNum =
        initialListing.area != null && !Number.isNaN(Number(initialListing.area))
          ? Math.max(0, Math.round(Number(initialListing.area)))
          : null;
      setGeneralDetailsCounts(prev => ({
        ...prev,
        sqm_area:
          gd.sqm_area != null && gd.sqm_area !== ''
            ? Number(gd.sqm_area)
            : listingAreaNum != null && listingAreaNum > 0
              ? listingAreaNum
              : prev.sqm_area,
        building_count: gd.building_count != null ? Number(gd.building_count) : prev.building_count,
        floor_count: gd.floor_count != null ? Number(gd.floor_count) : prev.floor_count,
        apartment_count: gd.apartment_count != null ? Number(gd.apartment_count) : prev.apartment_count,
        shop_count: gd.shop_count != null ? Number(gd.shop_count) : prev.shop_count,
      }));
      if (gd.guest_count != null && !Number.isNaN(Number(gd.guest_count))) {
        setGuestCount(Math.max(1, Number(gd.guest_count)));
      }
      if (gd.check_in_date) {
        setCheckInDate(String(gd.check_in_date));
      }
      if (gd.check_out_date) {
        setCheckOutDate(String(gd.check_out_date));
      }
    } else if (initialListing.area != null && !Number.isNaN(Number(initialListing.area))) {
      const a = Math.max(0, Math.round(Number(initialListing.area)));
      if (a > 0) {
        setGeneralDetailsCounts(prev => ({
          ...prev,
          sqm_area: prev.sqm_area > 0 ? prev.sqm_area : a,
        }));
      }
    }
    if (initialListing.project_offers && typeof initialListing.project_offers === 'object') {
      setProjectOffers(prev => ({...prev, ...initialListing.project_offers}));
    }
    const subType = String(currentUser?.subscription_type || '').toLowerCase();
    const isCompanyLike = subType === subscriptionTypes.company || subType === subscriptionTypes.professional;
    if (cat === 2 && isCompanyLike) {
      const po = initialListing.project_offers;
      if (po && typeof po === 'object') {
        setCompanyOfficeRepeatCount(maxRepeatSlotFromProjectOffers(po, /^office_(\d+)_/));
        setCompanyWholeFloorRepeatCount(maxRepeatSlotFromProjectOffers(po, /^whole_floor_(\d+)_/));
      } else {
        setCompanyOfficeRepeatCount(0);
        setCompanyWholeFloorRepeatCount(0);
      }
    }
    if (cat === 8 && isCompanyLike) {
      const po = initialListing.project_offers;
      if (po && typeof po === 'object') {
        setCat8CommercialRepeatCount(maxRepeatSlotFromProjectOffers(po, /cat8_commercial_space_(\d+)_/));
        setCat8WholeFloorRepeatCount(maxRepeatSlotFromProjectOffers(po, /cat8_whole_floor_(\d+)_/));
      } else {
        setCat8CommercialRepeatCount(0);
        setCat8WholeFloorRepeatCount(0);
      }
    }
    if (cat === 7 && isCompanyLike) {
      const raw = initialListing.company_offers_land_sizes ?? initialListing.companyOffersLandSizes;
      if (Array.isArray(raw)) {
        setCompanyLandParcels(raw.map(normalizeCompanyLandParcel));
      } else if (raw && typeof raw === 'object' && Array.isArray(raw.parcels)) {
        setCompanyLandParcels(raw.parcels.map(normalizeCompanyLandParcel));
      } else {
        setCompanyLandParcels([]);
      }
    } else {
      setCompanyLandParcels([]);
    }
    {
      const rawPl = initialListing.proposed_land ?? initialListing.proposedLand;
      let pl = rawPl;
      if (typeof rawPl === 'string' && rawPl.trim()) {
        try {
          pl = JSON.parse(rawPl);
        } catch {
          pl = null;
        }
      }
      if (pl && typeof pl === 'object') {
        setProposedLand({
          unit: pl.unit === 'sqm' ? 'sqm' : 'dunam',
          area: Number(pl.area) > 0 ? Number(pl.area) : 0.5,
        });
      } else {
        setProposedLand({unit: 'dunam', area: 0.5});
      }
    }
    if (initialListing.sale_at_presale !== undefined) {
      setSaleAtPresale(
        initialListing.sale_at_presale === true ||
          initialListing.sale_at_presale === 'true' ||
          initialListing.sale_at_presale === 't',
      );
    }
    {
      const gdShared =
        initialListing.general_details && typeof initialListing.general_details === 'object'
          ? initialListing.general_details.shared_spaces_company
          : undefined;
      const sharedRaw = initialListing.shared_spaces_company ?? gdShared;
      setSharedSpacesCompany(sharedRaw === true || sharedRaw === 'true' || sharedRaw === 't');
    }
    const salesImageRaw = initialListing.sales_image_url ?? initialListing.salesImageUrl ?? null;
    if (salesImageRaw && String(salesImageRaw).trim() !== '') {
      const u = String(salesImageRaw).trim();
      setSalesImage({uri: u});
      setSalesImageUrl(u);
      initialSalesImageUrlRef.current = u;
      salesImageCompanionPendingRef.current = false;
      salesImageStoryAlreadyCreatedRef.current = true;
      let gd = initialListing.general_details ?? null;
      if (typeof gd === 'string') {
        try {
          gd = JSON.parse(gd);
        } catch {
          gd = null;
        }
      }
      if (!gd || typeof gd !== 'object') gd = null;
      const editorGd = gd?.sales_image_editor;
      if (editorGd && typeof editorGd === 'object') {
        setSalesImageEditorMeta({
          generalDetails: editorGd,
          sourceImageUrl: editorGd.post_source_image_url || null,
        });
      } else {
        setSalesImageEditorMeta(null);
      }
    } else if (!pendingSalesImageFromEditor?.url) {
      // Listing has no sales media. Skip wipe when PostEditor just returned a draft.
      setSalesImage(null);
      setSalesImageUrl(null);
      initialSalesImageUrlRef.current = null;
      salesImageCompanionPendingRef.current = false;
      salesImageStoryAlreadyCreatedRef.current = false;
      setSalesImageEditorMeta(null);
    }
    if (initialListing.construction_status != null) {
      setConstructionStatus(initialListing.construction_status);
    }
    if (['low', 'medium', 'high'].includes(String(initialListing.exposure_level || '').toLowerCase())) {
      setExposureLevel(String(initialListing.exposure_level).toLowerCase());
    }
    const cpRaw = initialListing.cancellation_policy ?? null;
    setCancellationPolicy(cpRaw != null && String(cpRaw).trim() !== '' ? String(cpRaw).trim() : null);
    const sfRaw = initialListing.service_facility ?? initialListing.serviceFacility;
    if (sfRaw && typeof sfRaw === 'object') {
      const hydrated = {};
      if (sfRaw.selected != null && String(sfRaw.selected).trim() !== '' && sfRaw.selected !== true) {
        hydrated[String(sfRaw.selected).trim()] = true;
      }
      Object.keys(sfRaw).forEach(key => {
        if (key !== 'selected' && sfRaw[key] === true) {
          hydrated[key] = true;
        }
      });
      setServiceAndFacilities(hydrated);
    } else {
      setServiceAndFacilities({});
    }
    setHotDeal(
      initialListing.hot_deal === true ||
        initialListing.hot_deal === 'true' ||
        initialListing.hot_deal === 't' ||
        initialListing.hot_deal === 1,
    );
    // Only re-prefill when the listing identity changes — not when subscription_type
    // updates (that used to wipe a just-composed תמונה מכירתית).
  }, [initialListing?.id]);

  useEffect(() => {
    const pending = pendingSalesImageFromEditor;
    if (!pending?.url) return;
    const url = String(pending.url).trim();
    if (!url) return;
    setSalesImage({uri: url});
    setSalesImageUrl(url);
    if (pending.generalDetails && typeof pending.generalDetails === 'object') {
      setSalesImageEditorMeta({
        generalDetails: pending.generalDetails,
        sourceImageUrl: pending.sourceImageUrl || null,
      });
    }
    salesImageStoryAlreadyCreatedRef.current =
      pending.storyAlreadyCreated === true ||
      pending.feedPostAlreadyCreated === true ||
      Boolean(String(initialSalesImageUrlRef.current || '').trim());
    salesImageCompanionPendingRef.current = !salesImageStoryAlreadyCreatedRef.current;
    onPendingSalesImageConsumed?.();
  }, [pendingSalesImageFromEditor, onPendingSalesImageConsumed]);

  const selectedAdditionalImagesCount = additionalImages.filter(Boolean).length;
  const totalSelectedImages = (mainImage ? 1 : 0) + selectedAdditionalImagesCount;

  const isCompanyOfficeUpload = useMemo(() => {
    if (parseInt(category, 10) !== 2) {
      return false;
    }
    const t = String(currentUser?.subscription_type || '').toLowerCase();
    return t === subscriptionTypes.company || t === subscriptionTypes.professional;
  }, [category, currentUser?.subscription_type]);

  const isCompanyCommercialUpload = useMemo(() => {
    if (parseInt(category, 10) !== 8) {
      return false;
    }
    const t = String(currentUser?.subscription_type || '').toLowerCase();
    return t === subscriptionTypes.company || t === subscriptionTypes.professional;
  }, [category, currentUser?.subscription_type]);

  const amenitiesWithQuantity = ['חנייה', 'מרפסת', 'מרפסת לסוכה'];

  /** Hydrate generaldetailswithradio groups with state so count/price fields are controlled. */
  const hydrateGeneralDetailsWithRadio = groups => {
    if (!groups || !groups.groups) return groups;
    const getValue = key => {
      if (key in generalDetailsCounts) return Number(generalDetailsCounts[key]) || 0;
      if (key in projectOffers) return Number(projectOffers[key]) || 0;
      if (key in otherFormValues) return Number(otherFormValues[key]) || 0;
      return 0;
    };
    const setValue = (key, val) => {
      const numVal = key.endsWith('_price') ? Number(val) || 0 : Math.max(0, Number(val) || 0);
      if (key in generalDetailsCounts) {
        setGeneralDetailsCounts(prev => ({...prev, [key]: numVal}));
      } else if (key in projectOffers) {
        setProjectOffers(prev => ({...prev, [key]: numVal}));
      } else {
        setOtherFormValues(prev => ({...prev, [key]: numVal}));
      }
    };
    const mapGroupFields = grp => ({
      ...grp,
      fields: (grp.fields || []).map(f => {
        if ((f.type === 'count' || f.type === 'price') && f.key) {
          return {
            ...f,
            value: getValue(f.key),
            onChange: val => setValue(f.key, val),
          };
        }
        if (f.type === 'boolean_toggle' && f.key) {
          return {
            ...f,
            value: getValue(f.key),
            onChange: selected => setValue(f.key, selected ? 1 : 0),
          };
        }
        return f;
      }),
    });
    if (isCompanyOfficeUpload) {
      const t = groups.title;
      if (t === COMPANY_OFFICE_SIZES_SECTION_TITLE) {
        return {
          ...groups,
          groups: buildCompanyOfficeRepeatGroups(companyOfficeRepeatCount).map(mapGroupFields),
        };
      }
      if (t === COMPANY_WHOLE_FLOOR_SECTION_TITLE) {
        return {
          ...groups,
          groups: buildCompanyWholeFloorRepeatGroups(companyWholeFloorRepeatCount).map(mapGroupFields),
        };
      }
    }
    if (isCompanyCommercialUpload) {
      const t = groups.title;
      if (t === CAT8_COMMERCIAL_SIZES_SECTION_TITLE) {
        return {
          ...groups,
          groups: buildCat8CommercialRepeatGroups(cat8CommercialRepeatCount).map(mapGroupFields),
        };
      }
      if (t === CAT8_WHOLE_FLOOR_SECTION_TITLE) {
        return {
          ...groups,
          groups: buildCat8WholeFloorRepeatGroups(cat8WholeFloorRepeatCount).map(mapGroupFields),
        };
      }
    }
    return {
      ...groups,
      groups: groups.groups.map(mapGroupFields),
    };
  };

  const handleCompanyRepeatRowAdd = useCallback(
    sectionTitle => {
      const c = parseInt(category, 10);
      if (c === 2) {
        if (sectionTitle === COMPANY_OFFICE_SIZES_SECTION_TITLE) {
          setCompanyOfficeRepeatCount(x => x + 1);
        } else if (sectionTitle === COMPANY_WHOLE_FLOOR_SECTION_TITLE) {
          setCompanyWholeFloorRepeatCount(x => x + 1);
        }
      }
      if (c === 8) {
        if (sectionTitle === CAT8_COMMERCIAL_SIZES_SECTION_TITLE) {
          setCat8CommercialRepeatCount(x => x + 1);
        } else if (sectionTitle === CAT8_WHOLE_FLOOR_SECTION_TITLE) {
          setCat8WholeFloorRepeatCount(x => x + 1);
        }
      }
    },
    [category],
  );

  useEffect(() => {
    if (parseInt(category, 10) !== 2) {
      setCompanyOfficeRepeatCount(0);
      setCompanyWholeFloorRepeatCount(0);
    }
    if (parseInt(category, 10) !== 8) {
      setCat8CommercialRepeatCount(0);
      setCat8WholeFloorRepeatCount(0);
    }
  }, [category]);

  const toggleProjectOfferExpand = fieldIndex => title => {
    const stateKey = `${fieldIndex}-${title}`;
    setProjectOfferGroupsExpanded(prev => ({
      ...prev,
      [stateKey]: !prev[stateKey],
    }));
  };

  const toggleProjectOfferGroup = (fieldIndex, groupsDef) => title => {
    const stateKey = `${fieldIndex}-${title}`;
    setProjectOfferGroupsOn(prev => {
      const wasOn = prev[stateKey] !== false;
      if (wasOn) {
        const grp = (groupsDef.groups || []).find(g => g.title === title);
        const keys = (grp?.fields || []).map(f => f.key).filter(Boolean);
        if (keys.length) {
          setProjectOffers(p => {
            const n = {...p};
            keys.forEach(k => {
              if (k in n) {
                n[k] = 0;
              }
            });
            return n;
          });
          setOtherFormValues(o => {
            const n = {...o};
            keys.forEach(k => {
              delete n[k];
            });
            return n;
          });
        }
      }
      return {...prev, [stateKey]: !wasOn};
    });
  };

  const toggleAmenity = amenity => {
    if (amenities[amenity]) {
      const newAmenities = {...amenities};
      delete newAmenities[amenity];
      setAmenities(newAmenities);
    } else {
      setAmenities({
        ...amenities,
        [amenity]: amenitiesWithQuantity.includes(amenity) ? 1 : true,
      });
    }
  };

  const toggleServiceAndFacility = facilityName => {
    setServiceAndFacilities(prev => {
      if (prev[facilityName]) {
        const next = {...prev};
        delete next[facilityName];
        return next;
      }
      return {...prev, [facilityName]: true};
    });
  };

  const setAmenityQuantity = (amenity, quantity) => {
    setAmenities({
      ...amenities,
      [amenity]: quantity,
    });
  };

  const setOptionSecondValue = (key, value) => {
    setOptionSecondValues(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const isPartnerAd = parseInt(category, 10) === 3;

  const openPartnerPhotoCropper = uri => {
    const source = uri || partnerPhotoSourceUri || mainImage?.uri;
    if (!source) return;
    if (uri && uri !== partnerPhotoSourceUri) {
      setPartnerPhotoSourceUri(uri);
    }
    setPartnerPhotoCropUri(source);
    setPartnerPhotoCropVisible(true);
  };

  const handlePartnerPhotoCropConfirm = result => {
    if (result?.uri) {
      setMainImage({
        uri: result.uri,
        type: 'image/jpeg',
        name: `partner-${Date.now()}.jpg`,
        file: result.file,
      });
    } else if (result?.error) {
      window.alert(result.error);
    }
    setPartnerPhotoCropVisible(false);
    setPartnerPhotoCropUri(null);
  };

  const handlePartnerPhotoCropCancel = () => {
    setPartnerPhotoCropVisible(false);
    setPartnerPhotoCropUri(null);
  };

  const applyMainImageFile = file => {
    const picked = pickedFileAsset(file, 'image');
    if (isPartnerAd) {
      openPartnerPhotoCropper(picked.uri);
      return;
    }
    adImageSourceRef.current.main = picked.uri;
    setMainImage(picked);
  };

  const handleMainImageUpload = async () => {
    if (mainImageInputRef.current) {
      mainImageInputRef.current.click();
      return;
    }
    try {
      const file = await pickFile('image/*');
      if (file) applyMainImageFile(file);
    } catch (error) {
      window.alert('שגיאה בבחירת תמונה: ' + error.message);
    }
  };

  const handleMainImageChange = event => {
    const file = event?.target?.files?.[0];
    if (file) {
      applyMainImageFile(file);
      event.target.value = '';
    }
  };

  const applySalesImageFile = file => {
    const alreadyMirrored = Boolean(String(initialSalesImageUrlRef.current || '').trim());
    salesImageCompanionPendingRef.current = !alreadyMirrored;
    salesImageStoryAlreadyCreatedRef.current = alreadyMirrored;
    setSalesImageEditorMeta(null);
    setSalesImage({
      uri: URL.createObjectURL(file),
      type: file.type || 'image/jpeg',
      name: file.name || `sales-${Date.now()}.jpg`,
      file,
    });
  };

  const handleSalesImageUpload = async () => {
    if (salesImageInputRef.current) {
      salesImageInputRef.current.click();
      return;
    }
    try {
      const file = await pickFile('image/*');
      if (file) applySalesImageFile(file);
    } catch (error) {
      window.alert('שגיאה בבחירת תמונה: ' + error.message);
    }
  };

  const handleSalesImageChange = event => {
    const file = event?.target?.files?.[0];
    if (file) {
      applySalesImageFile(file);
    }
  };

  const openBnbLogoCropper = uri => {
    if (!uri) return;
    setBnbLogoCropUri(uri);
    setBnbLogoCropVisible(true);
  };

  const handleBnbLogoCropConfirm = result => {
    if (result?.uri) {
      setBnbBusinessLogo({
        uri: result.uri,
        type: 'image/jpeg',
        name: `bnb-logo-${Date.now()}.jpg`,
        file: result.file,
      });
    }
    setBnbLogoCropVisible(false);
    setBnbLogoCropUri(null);
  };

  const handleBnbLogoCropCancel = () => {
    setBnbLogoCropVisible(false);
    setBnbLogoCropUri(null);
  };

  const handleBnbBusinessLogoUpload = async () => {
    if (bnbBusinessLogoInputRef.current) {
      bnbBusinessLogoInputRef.current.click();
      return;
    }
    try {
      const file = await pickFile('image/*');
      if (file) openBnbLogoCropper(URL.createObjectURL(file));
    } catch (error) {
      window.alert('שגיאה בבחירת לוגו: ' + (error.message || ''));
    }
  };

  const handleBnbBusinessLogoChange = event => {
    const file = event?.target?.files?.[0];
    if (file) {
      openBnbLogoCropper(URL.createObjectURL(file));
    }
  };

  const openAdImageEditor = slot => {
    const currentUri = slot === 'main' ? mainImage?.uri : additionalImages[slot]?.uri;
    const source =
      slot === 'main'
        ? adImageSourceRef.current.main || currentUri
        : adImageSourceRef.current.extra[slot] || currentUri;
    if (!source) return;
    setAdImageCrop({slot, uri: source});
  };

  const handleAdImageCropConfirm = result => {
    const slot = adImageCrop?.slot;
    setAdImageCrop(null);
    if (result?.error) {
      window.alert(result.error);
      return;
    }
    if (!result?.uri || slot == null) return;
    const file = {
      uri: result.uri,
      type: 'image/jpeg',
      name: `ad-${Date.now()}.jpg`,
      file: result.file,
    };
    if (slot === 'main') {
      setMainImage(file);
      return;
    }
    setAdditionalImages(prev => {
      const next = [...prev];
      next[slot] = file;
      return next;
    });
  };

  const applyAdditionalImageFile = (index, file) => {
    const picked = pickedFileAsset(file, 'image');
    adImageSourceRef.current.extra[index] = picked.uri;
    setAdditionalImages(prev => {
      const next = [...prev];
      next[index] = picked;
      return next;
    });
  };

  const handleAdditionalImageUpload = async index => {
    if (additionalImageInputRefs.current[index]) {
      additionalImageInputRefs.current[index].click();
      return;
    }
    try {
      const file = await pickFile('image/*');
      if (file) applyAdditionalImageFile(index, file);
    } catch (error) {
      window.alert('שגיאה בבחירת תמונה: ' + error.message);
    }
  };

  const handleAdditionalImageChange = (index, event) => {
    const file = event?.target?.files?.[0];
    if (file) {
      applyAdditionalImageFile(index, file);
    }
  };

  const applyVideoFile = file => {
    setVideoFile(pickedFileAsset(file, 'video'));
    setHasVideo(true);
  };

  const handleVideoUpload = async () => {
    if (videoInputRef.current) {
      videoInputRef.current.click();
      return;
    }
    try {
      const file = await pickFile('video/*');
      if (file) applyVideoFile(file);
    } catch (error) {
      showAlert('שגיאה בבחירת סרטון', error?.message || 'לא ניתן לפתוח את ספריית הסרטונים.');
    }
  };

  const handleVideoChange = event => {
    const file = event?.target?.files?.[0];
    if (file) {
      applyVideoFile(file);
    }
  };

  /** Same rules as handlePublish validation — drives gray vs yellow publish button. */
  const publishBlockingErrors = useMemo(() => {
    const fields = adsFormFields;
    const fieldKeys = fields.map(f => f.key);
    const publishErrors = [];
    if (category === 3) {
      if (!searchPurpose) {
        publishErrors.push('בחרו מטרת חיפוש');
      }
      if (!preferredApartmentType) {
        publishErrors.push('בחרו סוג דירת שותפים מועדף');
      }
      if (!budget || budget <= 0) {
        publishErrors.push('הזינו תקציב');
      }
      if (!String(description || '').trim()) {
        publishErrors.push('הזינו פרטים נוספים');
      }
    } else {
      if (fieldKeys.includes('propertytype') && !propertyType) {
        publishErrors.push('בחרו סוג נכס');
      }
      const needsAddressPhoneDescription =
        fieldKeys.includes('address-phone-description') ||
        fieldKeys.includes('propertyaddress') ||
        fieldKeys.includes('landaddress');
      const needsProjectNameAndAddress = fieldKeys.includes('propertyaddress');
      if (needsAddressPhoneDescription) {
        if (!String(address || '').trim()) {
          publishErrors.push('הזינו כתובת');
        }
        if (!String(phone || '').trim()) {
          publishErrors.push('הזינו טלפון');
        }
        if (!String(description || '').trim()) {
          publishErrors.push('הזינו תיאור');
        }
      }
      if (fieldKeys.includes('landaddress')) {
        if (!String(address || '').trim()) {
          publishErrors.push('הזינו כתובת קרקע');
        }
        if (!String(landParcel || '').trim()) {
          publishErrors.push('הזינו חלקה');
        }
        if (!String(landBlock || '').trim()) {
          publishErrors.push('הזינו גוש');
        }
      }
      if (needsProjectNameAndAddress) {
        if (!String(projectName || '').trim()) {
          publishErrors.push(uploadProjectWording('הזינו שם פרויקט', currentUser?.subscription_type));
        }
        if (!String(address || '').trim()) {
          publishErrors.push(uploadProjectWording('הזינו כתובת פרויקט', currentUser?.subscription_type));
        }
      }
      const needsMainImage = fieldKeys.includes('multiimagewithvideo') && !fieldKeys.includes('profileverification');
      if (
        needsMainImage &&
        !mainImage &&
        additionalImages.filter(img => img).length === 0 &&
        !videoFile &&
        !videoUrl
      ) {
        publishErrors.push('העלו לפחות תמונה אחת או סרטון');
      }
      for (let fi = 0; fi < fields.length; fi++) {
        const f = fields[fi];
        if (!f.groups?.toggleableOfferGroups) {
          continue;
        }
        const titles = (f.groups.groups || []).map(g => g.title);
        const anyOn = titles.some(t => projectOfferGroupsOn[`${fi}-${t}`] !== false);
        if (!anyOn) {
          publishErrors.push(
            uploadProjectWording(
              'בחרו לפחות סוג דירה אחד ב"הפרויקט מציע", או הפעילו שוב שורה שהוסרה.',
              currentUser?.subscription_type,
            ),
          );
          break;
        }
      }
    }
    return publishErrors;
  }, [
    category,
    adsFormFields,
    searchPurpose,
    preferredApartmentType,
    budget,
    description,
    propertyType,
    address,
    phone,
    landParcel,
    landBlock,
    projectName,
    mainImage,
    additionalImages,
    videoFile,
    videoUrl,
    projectOfferGroupsOn,
    currentUser?.subscription_type,
  ]);

  /** Mandatory fields satisfied — yellow asset + press enabled (still respects uploading). */
  const formReadyToPublish = publishBlockingErrors.length === 0;

  const editingRawId =
    initialListing?.id != null && initialListing.id !== '' ? String(initialListing.id).trim() : '';
  const isEditingAd = editingRawId.length > 0 && UUID_RE.test(editingRawId);

  const uploadAdsMedia = async (fileObj, folder, progressKey, options = {}) => {
    if (!hasLocalMediaFile(fileObj)) return null;
    const isVideo = String(folder || '').includes('video');
    setUploadProgress(prev => ({...prev, [progressKey]: true}));
    try {
      const result = await uploadFile(fileObj, folder, {
        timeoutMs: options.timeoutMs ?? (isVideo ? 300000 : 120000),
      });
      if (!result?.url) {
        throw new Error(errorMessageFromUnknown(result?.error, 'Upload failed'));
      }
      return result.url;
    } finally {
      setUploadProgress(prev => ({...prev, [progressKey]: false}));
    }
  };

  const handlePublish = async () => {
    try {
      setUploading(true);

      // Must match rendered `adsFormFields` so validation & companion-story logic stay in sync with visible fields.
      const fields = adsFormFields;
      const fieldKeys = fields.map(f => f.key);
      const generalDetailsField = fields.find(f => f.key === 'generaldetails');
      const selectedOptionSecondValues = {};
      (generalDetailsField?.data || []).forEach(amenity => {
        const amenityKey = amenity?.title || amenity;
        const optionSecondKey = amenity?.optionSecond?.title;
        if (!optionSecondKey || !amenities?.[amenityKey]) return;
        const value = optionSecondValues?.[optionSecondKey];
        if (typeof value === 'string' && value.trim()) {
          selectedOptionSecondValues[optionSecondKey] = value;
        }
      });
      const amenitiesForPayload = {
        ...(amenities || {}),
        ...selectedOptionSecondValues,
      };
      const generalDetailsForPayload = {
        ...generalDetailsCounts,
        ...(guestCount > 0 ? {guest_count: Number(guestCount)} : {}),
        ...(checkInDate ? {check_in_date: checkInDate} : {}),
        ...(checkOutDate ? {check_out_date: checkOutDate} : {}),
        ...(salesImageEditorMeta?.generalDetails && typeof salesImageEditorMeta.generalDetails === 'object'
          ? {sales_image_editor: salesImageEditorMeta.generalDetails}
          : {}),
      };
      const accommodationOffersPayload =
        guestCount || checkInDate || checkOutDate
          ? {
              guest_count: Number(guestCount) || 1,
              check_in_date: checkInDate || null,
              check_out_date: checkOutDate || null,
            }
          : undefined;
      const selectedServiceFacilities = Object.keys(serviceAndFacilities).filter(key => serviceAndFacilities[key]);
      const serviceFacilityPayload =
        selectedServiceFacilities.length > 0
          ? Object.fromEntries(selectedServiceFacilities.map(key => [key, true]))
          : undefined;
      const contactDetailsPayload =
        contactFullName || contactEmail || phone || address || description
          ? {
              full_name: contactFullName || null,
              email: contactEmail || null,
              phone: phone || null,
              address: address || null,
              description: description || null,
            }
          : undefined;

      const publishErrors = [...publishBlockingErrors];
      if (publishErrors.length > 0) {
        setPublishValidationMessages([...new Set(publishErrors)]);
        setPublishValidationVisible(true);
        setUploading(false);
        return;
      }

      // Upload files to Supabase storage (or reuse existing URLs when editing)
      let uploadedMainImageUrl = null;
      const uploadedAdditionalImageUrls = [];
      let uploadedVideoUrl = null;
      if (initialListing && mainImage?.uri && !hasLocalMediaFile(mainImage)) {
        uploadedMainImageUrl = mainImage.uri || mainImageUrl;
      } else if (
        initialListing &&
        !mainImage?.uri &&
        (mainImageUrl || initialListing.main_image_url || initialListing.mainImageUrl)
      ) {
        // Keep the existing main image on update if local state was briefly lost.
        uploadedMainImageUrl = mainImageUrl || initialListing.main_image_url || initialListing.mainImageUrl || null;
      }
      if (initialListing && videoFile?.uri && !hasLocalMediaFile(videoFile)) {
        uploadedVideoUrl = videoFile.uri || videoUrl;
      }
      for (let i = 0; i < (additionalImages?.length || 0); i++) {
        if (additionalImages[i]?.uri && !hasLocalMediaFile(additionalImages[i])) {
          uploadedAdditionalImageUrls[i] = additionalImages[i].uri;
        }
      }

      // Category 3: upload the user's image if provided, otherwise the fixed image (or keep existing when editing)
      if (category === 3) {
        if (uploadedMainImageUrl) {
          // Already have URL from initialListing (edit mode)
        } else if (hasLocalMediaFile(mainImage)) {
          try {
            uploadedMainImageUrl = await uploadAdsMedia(mainImage, 'listings/images', 'mainImage');
          } catch {
            window.alert('שגיאה בהעלאת התמונה. נסה שוב.');
            setUploading(false);
            return;
          }
        } else {
          try {
            setUploadProgress(prev => ({...prev, mainImage: true}));
            const response = await fetch(PARTNER_FIXED_IMAGE);
            const blob = await response.blob();
            const file = new File([blob], 'image-insert-2.png', {
              type: 'image/png',
            });
            const uploadData = await uploadFile(
              {
                uri: URL.createObjectURL(file),
                type: 'image/png',
                name: 'image-insert-2.png',
                file,
                size: file.size,
              },
              'listings/images',
            );
            if (uploadData?.url) {
              uploadedMainImageUrl = uploadData.url;
            } else {
              throw new Error(uploadData?.error || 'Failed to upload fixed image');
            }
          } catch {
            window.alert('שגיאה בהעלאת התמונה הקבועה. נסה שוב.');
            setUploading(false);
            return;
          } finally {
            setUploadProgress(prev => ({...prev, mainImage: false}));
          }
        }
      }

      const uploadJobs = [];

      if (category !== 3 && !uploadedMainImageUrl && hasLocalMediaFile(mainImage)) {
        uploadJobs.push({
          key: 'main',
          index: null,
          fatal: true,
          fatalMessage: 'שגיאה בהעלאת התמונה הראשית. נסה שוב.',
          run: () => uploadAdsMedia(mainImage, 'listings/images', 'mainImage'),
        });
      }

      for (let i = 0; i < additionalImages.length; i++) {
        if (hasLocalMediaFile(additionalImages[i])) {
          uploadJobs.push({
            key: 'additional',
            index: i,
            fatal: false,
            run: () => uploadAdsMedia(additionalImages[i], 'listings/images', `additional-${i}`),
          });
        }
      }

      if (!uploadedVideoUrl && hasLocalMediaFile(videoFile)) {
        uploadJobs.push({
          key: 'video',
          index: null,
          fatal: true,
          fatalMessage: 'שגיאה בהעלאת הסרטון. נסה שוב.',
          run: () => uploadAdsMedia(videoFile, 'listings/videos', 'video'),
        });
      }

      let uploadedSalesImageUrl = null;
      if (salesImage?.uri && !hasLocalMediaFile(salesImage)) {
        uploadedSalesImageUrl = salesImage.uri || salesImageUrl;
      } else if (hasLocalMediaFile(salesImage)) {
        uploadJobs.push({
          key: 'sales',
          index: null,
          fatal: false,
          run: () => uploadAdsMedia(salesImage, 'listings/images', 'salesImage'),
        });
      }

      let uploadedBnbBusinessLogoUrl = null;
      if (category === 5 && bnbHostType === 'business') {
        if (initialListing && bnbBusinessLogo?.uri && !hasLocalMediaFile(bnbBusinessLogo)) {
          uploadedBnbBusinessLogoUrl = bnbBusinessLogo.uri || bnbBusinessLogoUrl;
        } else if (hasLocalMediaFile(bnbBusinessLogo)) {
          uploadJobs.push({
            key: 'bnbLogo',
            index: null,
            fatal: true,
            fatalMessage: 'שגיאה בהעלאת הלוגו. נסה שוב.',
            run: () => uploadAdsMedia(bnbBusinessLogo, 'listings/images', 'bnbBusinessLogo'),
          });
        }
      }

      const uploadOutcomes = await Promise.all(
        uploadJobs.map(async job => {
          try {
            const url = await job.run();
            return {...job, ok: true, url};
          } catch (error) {
            return {...job, ok: false, error};
          }
        }),
      );

      for (const outcome of uploadOutcomes) {
        if (!outcome.ok) {
          if (outcome.fatal) {
            const detail = errorMessageFromUnknown(outcome.error, '');
            window.alert(
              detail && detail !== outcome.fatalMessage ? `${outcome.fatalMessage}\n${detail}` : outcome.fatalMessage,
            );
            setUploading(false);
            return;
          }
          continue;
        }
        if (outcome.key === 'main') {
          uploadedMainImageUrl = outcome.url;
        } else if (outcome.key === 'additional') {
          uploadedAdditionalImageUrls[outcome.index] = outcome.url;
        } else if (outcome.key === 'video') {
          uploadedVideoUrl = outcome.url;
        } else if (outcome.key === 'sales') {
          uploadedSalesImageUrl = outcome.url;
        } else if (outcome.key === 'bnbLogo') {
          uploadedBnbBusinessLogoUrl = outcome.url;
        }
      }

      const listingCategory = parseListingCategoryId(category, parseListingCategoryId(initialCategory, 10));

      const rawEditId =
        initialListing?.id != null && initialListing.id !== ''
          ? String(initialListing.id).trim()
          : initialListing?.ad_number != null && initialListing.ad_number !== ''
            ? String(initialListing.ad_number).trim()
            : '';
      const existingListingId = rawEditId && UUID_RE.test(rawEditId) ? rawEditId : null;
      const publisher = resolvePublisherIdentityForSave(initialListing, currentUser, {
        editing: Boolean(existingListingId),
      });

      const listingData =
        category === 3
          ? {
              status: 'published',
              subscriptionType: publisher.subscriptionType,
              subscriptionId: publisher.subscriptionId,
              searchPurpose,
              preferredApartmentType,
              preferredGender,
              preferredAgeMin,
              preferredAgeMax,
              preferences,
              budget: parseFloat(budget) || 0,
              description: description.trim(),
              mainImageUrl: uploadedMainImageUrl,
              videoUrl: uploadedVideoUrl,
              hasVideo: !!uploadedVideoUrl,
              profileImageUrl: getUserProfileImageUrl(currentUser),
              category: listingCategory,
              // Defaults for required fields that don't apply to category 3
              propertyType: 'office',
              area: 1,
              rooms: 1,
              floor: 1,
              purpose: 'rent',
              price: parseFloat(budget) || 0,
              address: '',
              phone: '',
              additionalImageUrls: [],
            }
          : {
              status: 'published',
              subscriptionType: publisher.subscriptionType,
              subscriptionId: publisher.subscriptionId,
              propertyType,
              area: (() => {
                const sqm = Number(generalDetailsCounts.sqm_area);
                if (Number.isFinite(sqm) && sqm > 0) {
                  return Math.round(sqm);
                }
                return parseInt(area, 10) || 1;
              })(),
              rooms: parseInt(rooms) || 1,
              floor: parseInt(floor) || 1,
              amenities: amenitiesForPayload,
              condition: condition || null,
              purpose: purpose || 'sale',
              price: parseFloat(price) || 0,
              projectName: projectName.trim() || undefined,
              address: address.trim(),
              landAddress: address.trim() || undefined,
              landParcel: landParcel.trim() || undefined,
              landBlock: landBlock.trim() || undefined,
              phone: phone.trim(),
              description: description.trim(),
              displayOption: totalSelectedImages >= 2 ? displayOption || null : null,
              mainImageUrl: uploadedMainImageUrl,
              additionalImageUrls: uploadedAdditionalImageUrls.filter(
                url => url !== null && url !== undefined && url !== '',
              ),
              videoUrl: uploadedVideoUrl,
              hasVideo: !!uploadedVideoUrl,
              profileImageUrl: getUserProfileImageUrl(currentUser),
              feed_display_priority: feedDisplayPriority,
              exposure_level: exposureLevel,
              category: listingCategory,
              planApproval: landRadioValues['תב״ע'] || null,
              landInMortgage: landRadioValues['קרקע במושע'] || null,
              permit: landRadioValues['היתר'] || null,
              agriculturalLand: landRadioValues['קרקע חקלאית'] || null,
              landOwnership: landRadioValues['בעלות קרקע'] || null,
              generalDetails: Object.keys(generalDetailsForPayload).length > 0 ? generalDetailsForPayload : undefined,
              saleAtPresale: saleAtPresale === true,
              sharedSpacesCompany: sharedSpacesCompany === true,
              salesImageUrl: uploadedSalesImageUrl || null,
              projectOffers: (() => {
                const merged = {...projectOffers, ...otherFormValues};
                padDynamicCompanyProjectOfferSlots(merged, listingCategory, {
                  companyOfficeRepeatCount,
                  companyWholeFloorRepeatCount,
                  cat8CommercialRepeatCount,
                  cat8WholeFloorRepeatCount,
                });
                const hasAnyNonZero = Object.values(merged).some(v => v !== 0 && v !== undefined && v !== '');
                const forceDynamicSlots =
                  (listingCategory === 2 && (companyOfficeRepeatCount > 0 || companyWholeFloorRepeatCount > 0)) ||
                  (listingCategory === 8 && (cat8CommercialRepeatCount > 0 || cat8WholeFloorRepeatCount > 0));
                return hasAnyNonZero || forceDynamicSlots ? merged : undefined;
              })(),
              constructionStatus: constructionStatus || undefined,
              ...(listingCategory === 5 &&
                (lockedBnbHostType || bnbHostType === 'private' || bnbHostType === 'business') && {
                  bnbHostType: lockedBnbHostType || bnbHostType,
                }),
              ...(listingCategory === 5 &&
                bnbHostType === 'business' &&
                uploadedBnbBusinessLogoUrl && {
                  bnbBusinessLogoUrl: uploadedBnbBusinessLogoUrl,
                }),
              ...(listingCategory === 5 &&
                preferredApartmentType && {
                  hospitalityNature: preferredApartmentType,
                }),
              ...(listingCategory === 5 &&
                serviceFacilityPayload && {
                  serviceFacility: serviceFacilityPayload,
                }),
              ...(listingCategory === 5 &&
                accommodationOffersPayload && {
                  accommodationOffers: accommodationOffersPayload,
                }),
              ...(listingCategory === 5 &&
                contactDetailsPayload && {
                  contactDetails: contactDetailsPayload,
                }),
              ...(fieldKeys.includes('cancellationpolicy') &&
                cancellationPolicy && {
                  cancellationPolicy,
                }),
              ...(fieldKeys.includes('pricepernight') && {
                pricePerNight: parseFloat(price) || 0,
                hotDeal: !!hotDeal,
              }),
              ...(listingCategory === 7 && {
                proposedLand: {
                  unit: proposedLand.unit === 'sqm' ? 'sqm' : 'dunam',
                  area: Number(proposedLand.area) || 0,
                  price: parseFloat(price) || 0,
                },
                companyOffersLandSizes: (Array.isArray(companyLandParcels) ? companyLandParcels : []).map(p => ({
                  unit: p.unit === 'sqm' ? 'sqm' : 'dunam',
                  area: Number(p.area) || 0,
                  price: Number(p.price) || 0,
                })),
              }),
            };

      const result = existingListingId
        ? await updateListing(existingListingId, listingData)
        : await createListing(listingData);

      // Mirror תמונה מכירתית as a home story + companion feed post on first
      // create only. Later edits update those rows via PUT syncSalesImageMirrors.
      const publisherSubId = publisher.subscriptionId;
      const prevSalesUrl = initialSalesImageUrlRef.current ? String(initialSalesImageUrlRef.current).trim() : '';
      const nextSalesUrl = uploadedSalesImageUrl ? String(uploadedSalesImageUrl).trim() : '';
      const salesImageChangedOnEdit =
        Boolean(existingListingId && prevSalesUrl && nextSalesUrl) && prevSalesUrl !== nextSalesUrl;
      const hadExistingSalesImage = Boolean(existingListingId && prevSalesUrl);
      const shouldCreateSalesImageStory =
        isB2BSubscriptionType(currentUser?.subscription_type) &&
        !!uploadedSalesImageUrl &&
        fieldKeys.includes('salesimage') &&
        !hadExistingSalesImage &&
        (salesImageChangedOnEdit ||
          salesImageCompanionPendingRef.current ||
          !salesImageStoryAlreadyCreatedRef.current);
      if (shouldCreateSalesImageStory) {
        if (!publisherSubId) {
          console.warn('[AdsForm] Companion sales-image skipped: no subscription id on currentUser');
        } else {
          const listingIdForMirrors = String(result?.id || result?.listing?.id || existingListingId || '').trim();
          const companionIds = {
            post_kind: SALES_IMAGE_POST_KIND,
            ...(listingIdForMirrors
              ? {
                  source_ad_id: listingIdForMirrors,
                  feed_listing_id: listingIdForMirrors,
                }
              : {}),
          };
          try {
            await createSalesImageStory({
              imageUrl: uploadedSalesImageUrl,
              subscriptionId: publisherSubId,
              // Baked photo sales images must not carry overlay metadata (the story would redraw the text).
              generalDetails: (() => {
                const gd = salesImageEditorMeta?.generalDetails;
                const baked = gd?.post_text_baked;
                const isBaked = baked === true || baked === 'true' || baked === 't' || baked === 1;
                if (!gd || typeof gd !== 'object' || isBaked) {
                  return companionIds;
                }
                return {
                  ...gd,
                  ...companionIds,
                };
              })(),
            });
          } catch (mirrorErr) {
            console.warn(
              '[AdsForm] Companion sales-image story failed:',
              errorMessageFromUnknown(mirrorErr, 'Unknown error'),
            );
          }
          if (!salesImageChangedOnEdit) {
            try {
              const salesUrlStr = String(uploadedSalesImageUrl).trim();
              const salesIsVideo =
                /\.(mp4|m3u8|webm|mov|m4v)(\?|$)/i.test(salesUrlStr) || /\/videos?\//i.test(salesUrlStr);
              const salesEditorGd =
                salesImageEditorMeta?.generalDetails && typeof salesImageEditorMeta.generalDetails === 'object'
                  ? salesImageEditorMeta.generalDetails
                  : undefined;
              await createListing({
                category: listingCategory,
                status: 'published',
                subscriptionId: publisherSubId,
                subscriptionType: publisher.subscriptionType,
                ...(salesIsVideo
                  ? {
                      videoUrl: salesUrlStr,
                      hasVideo: true,
                      feedDisplayPriority: 'video',
                    }
                  : {mainImageUrl: salesUrlStr}),
                // Neutral description — the ad's name/description must never appear on the companion post.
                description: 'פוסט',
                feedPost: true,
                feed_post: true,
                propertyType: 'post',
                price: 0,
                // post_kind hides this row from ערוך/פרסם — edit only on the ad.
                generalDetails: {
                  ...(salesEditorGd && typeof salesEditorGd === 'object' ? salesEditorGd : {}),
                  ...companionIds,
                },
              });
            } catch (postErr) {
              console.warn(
                '[AdsForm] Companion sales-image post failed:',
                errorMessageFromUnknown(postErr, 'Unknown error'),
              );
            }
          }
          salesImageCompanionPendingRef.current = false;
          salesImageStoryAlreadyCreatedRef.current = true;
          initialSalesImageUrlRef.current = String(uploadedSalesImageUrl).trim();
          setSalesImage({uri: uploadedSalesImageUrl});
          setSalesImageUrl(uploadedSalesImageUrl);
        }
      }

      if (onPublish) {
        onPublish({
          ...listingData,
          isUpdate: !!existingListingId,
          id: result.id || result.listing?.id,
          mainImage: uploadedMainImageUrl ? {uri: uploadedMainImageUrl} : null,
          additionalImages: uploadedAdditionalImageUrls.filter(url => url).map(url => ({uri: url})),
          video: uploadedVideoUrl ? {uri: uploadedVideoUrl} : null,
        });
      }
    } catch (error) {
      window.alert(errorMessageFromUnknown(error, 'שגיאה בפרסום המודעה. נסה שוב.'));
    } finally {
      setUploading(false);
    }
  };

  const renderField = (field, index) => {
    switch (field.key) {
      case 'profileverification':
        return (
          <ProfileVerification
            key="profileverification"
            mainImage={mainImage}
            setMainImage={setMainImage}
            uploadProgress={uploadProgress}
            handleMainImageUpload={handleMainImageUpload}
            handleMainImageChange={handleMainImageChange}
            mainImageInputRef={mainImageInputRef}
            onEditExistingImage={() => openPartnerPhotoCropper(partnerPhotoSourceUri || mainImage?.uri)}
            hasVideo={hasVideo}
            setHasVideo={setHasVideo}
            videoFile={videoFile}
            handleVideoUpload={handleVideoUpload}
            handleVideoChange={handleVideoChange}
            videoInputRef={videoInputRef}
          />
        );
      case 'searchpurpose':
        return <SearchPurpose key="searchpurpose" searchPurpose={searchPurpose} setSearchPurpose={setSearchPurpose} />;
      case 'apartmenttype':
        return (
          <ApartmentType
            key="apartmenttype"
            preferredApartmentType={preferredApartmentType}
            setPreferredApartmentType={setPreferredApartmentType}
          />
        );
      case 'preferences':
        return (
          <Preferences
            key="preferences"
            preferences={preferences}
            setPreferences={setPreferences}
            preferredGender={preferredGender}
            setPreferredGender={setPreferredGender}
            preferredAgeMin={preferredAgeMin}
            setPreferredAgeMin={setPreferredAgeMin}
            preferredAgeMax={preferredAgeMax}
            setPreferredAgeMax={setPreferredAgeMax}
          />
        );
      case 'price':
        return (
          <PriceCount
            key="price"
            price={category === 3 ? budget : price}
            setPrice={category === 3 ? setBudget : setPrice}
            title={category === 3 ? (searchPurpose === 'bring_in' ? 'שכר דירה' : 'התקציב שלי') : 'מחיר'}
            counterStep={category === 3 ? PRICE_COUNTER_STEP_ROOMMATE_BUDGET : PRICE_COUNTER_STEP_DEFAULT}
          />
        );
      case 'pricepernight':
        return (
          <PriceCount
            key="pricepernight"
            price={price}
            setPrice={setPrice}
            title={field.title}
            isPricePerNight={true}
            hotDeal={hotDeal}
            setHotDeal={setHotDeal}
            counterStep={PRICE_COUNTER_STEP_PER_NIGHT}
          />
        );
      case 'contactdetails':
        return (
          <ContactDetails
            key="contactdetails"
            contactFullName={contactFullName}
            setContactFullName={setContactFullName}
            address={address}
            setAddress={setAddress}
            contactEmail={contactEmail}
            setContactEmail={setContactEmail}
            phone={phone}
            setPhone={setPhone}
            description={description}
            setDescription={setDescription}
            showBnbBusinessLogo={category === 5 && bnbHostType === 'business'}
            isBnbBusinessHost={category === 5 && bnbHostType === 'business'}
            bnbBusinessLogo={bnbBusinessLogo}
            onBnbBusinessLogoPress={handleBnbBusinessLogoUpload}
            bnbBusinessLogoInputRef={bnbBusinessLogoInputRef}
            onBnbBusinessLogoWebFileChange={handleBnbBusinessLogoChange}
          />
        );
      case 'additionaldetails':
        return <AdditionalDetails key="additionaldetails" description={description} setDescription={setDescription} />;
      case 'multiimagewithvideo':
        return (
          <MultiImageWithVideo
            key="multiimagewithvideo"
            category={category}
            mainImage={mainImage}
            setMainImage={setMainImage}
            uploadProgress={uploadProgress}
            handleMainImageUpload={handleMainImageUpload}
            handleMainImageChange={handleMainImageChange}
            mainImageInputRef={mainImageInputRef}
            additionalImages={additionalImages}
            handleAdditionalImageUpload={handleAdditionalImageUpload}
            handleAdditionalImageChange={handleAdditionalImageChange}
            additionalImageInputRefs={additionalImageInputRefs}
            onEditMainImage={() => openAdImageEditor('main')}
            onEditAdditionalImage={openAdImageEditor}
            hasVideo={hasVideo}
            setHasVideo={setHasVideo}
            videoFile={videoFile}
            handleVideoUpload={handleVideoUpload}
            handleVideoChange={handleVideoChange}
            videoInputRef={videoInputRef}
            wayToDisplayAd={field.wayToDisplayAd}
            feedDisplayPriority={feedDisplayPriority}
            setFeedDisplayPriority={setFeedDisplayPriority}
          />
        );
      case 'hospitalitynature':
        return (
          <HospitalityNature
            key="hospitalitynature"
            preferredApartmentType={preferredApartmentType}
            setPreferredApartmentType={setPreferredApartmentType}
          />
        );
      case 'displayoptions':
        // Always offer collage / slideshow. A single photo ignores the choice (see publish payload).
        return <DisplayOptions key="displayoptions" displayOption={displayOption} setDisplayOption={setDisplayOption} />;
      case 'propertytype':
        return (
          <PropertyType
            key="propertytype"
            propertyType={propertyType}
            setPropertyType={setPropertyType}
            propertyTypes={field.data || []}
            title={field.title}
          />
        );
      case 'proposedland':
        return (
          <ProposedLand
            key="proposedland"
            unit={proposedLand.unit}
            setUnit={next => setProposedLand(prev => ({...prev, unit: next}))}
            area={proposedLand.area}
            setArea={next => setProposedLand(prev => ({...prev, area: next}))}
          />
        );
      case 'radiooptions':
        return (
          <RadioOptions
            key={`radiooptions-${index}`}
            data={field.data}
            title={field.title}
            selectedValue={landRadioValues[field.title]}
            onChange={value =>
              setLandRadioValues(prev => ({
                ...prev,
                [field.title]: value,
              }))
            }
          />
        );
      case 'landaddress':
        return (
          <LandAddress
            key="landaddress"
            address={address}
            setAddress={setAddress}
            landParcel={landParcel}
            setLandParcel={setLandParcel}
            landBlock={landBlock}
            setLandBlock={setLandBlock}
            phone={phone}
            setPhone={setPhone}
            description={description}
            setDescription={setDescription}
          />
        );
      case 'propertyaddress':
        return (
          <PropertyAddress
            key="propertyaddress"
            projectName={projectName}
            setProjectName={setProjectName}
            address={address}
            setAddress={setAddress}
            phone={phone}
            setPhone={setPhone}
            description={description}
            setDescription={setDescription}
            subscriptionType={currentUser?.subscription_type}
          />
        );
      case 'generaldetails': {
        const counterDataWithSetters = (field.counterData || []).map(c => {
          if (c.key) {
            const raw = generalDetailsCounts[c.key];
            const num = raw !== undefined && raw !== null ? Number(raw) : 0;
            return {
              ...c,
              value: Number.isFinite(num) ? num : 0,
              setCount: val => {
                const n = Math.max(0, Number(val) || 0);
                setGeneralDetailsCounts(prev => ({
                  ...prev,
                  [c.key]: n,
                }));
              },
            };
          }
          const isAreaField = c.title && c.title.includes('שטח');
          const isRoomsField = c.title && c.title.includes('חדרים');
          const isFloorField = c.title && c.title.includes('קומה');
          return {
            ...c,
            value: isAreaField ? area : isRoomsField ? rooms : isFloorField ? floor : c.value,
            setCount: isAreaField
              ? setArea
              : isRoomsField
                ? setRooms
                : isFloorField
                  ? setFloor
                  : () => {},
          };
        });
        return (
          <GeneralDetails
            key="generaldetails"
            area={area}
            setArea={setArea}
            rooms={rooms}
            setRooms={setRooms}
            floor={floor}
            setFloor={setFloor}
            amenities={amenities}
            setAmenities={setAmenities}
            toggleAmenity={toggleAmenity}
            setAmenityQuantity={setAmenityQuantity}
            amenitiesWithQuantity={amenitiesWithQuantity}
            isArea={field.isArea}
            isRooms={field.isRooms}
            isFloor={field.isFloor}
            amenitiesData={field.data}
            optionSecondValues={optionSecondValues}
            setOptionSecondValue={setOptionSecondValue}
            counterData={counterDataWithSetters}
          />
        );
      }
      case 'serviceandfacility':
        return (
          <ServiceAndFacility
            key="serviceandfacility"
            facilities={serviceAndFacilities}
            toggleFacility={toggleServiceAndFacility}
            data={field.data || []}
            title={field.title}
          />
        );
      case 'accommodationoffers':
        return (
          <AccommodationOffers
            key="accommodationoffers"
            guestCount={guestCount}
            setGuestCount={setGuestCount}
            checkInDate={checkInDate}
            setCheckInDate={setCheckInDate}
            checkOutDate={checkOutDate}
            setCheckOutDate={setCheckOutDate}
          />
        );
      case 'cancellationpolicy':
        return (
          <CancellationPolicy
            key="cancellationpolicy"
            cancellationPolicy={cancellationPolicy}
            setCancellationPolicy={setCancellationPolicy}
            data={field.data || []}
            title={field.title}
          />
        );
      case 'propertycondition':
        return <PropertyCondition key="propertycondition" condition={condition} setCondition={setCondition} />;
      case 'purpose':
        return <Purpose key="purpose" purpose={purpose} setPurpose={setPurpose} />;
      case 'address-phone-description':
        return (
          <AddressDetails
            key="address-phone-description"
            address={address}
            setAddress={setAddress}
            phone={phone}
            setPhone={setPhone}
            description={description}
            setDescription={setDescription}
          />
        );
      case 'salesimage':
        return (
          <SalesImage
            key="salesimage"
            salesImage={salesImage}
            handleSalesImageUpload={handleSalesImageUpload}
            handleSalesImageChange={handleSalesImageChange}
            salesImageInputRef={salesImageInputRef}
            uploadProgress={uploadProgress}
            isEditing={isEditingAd}
            salesImageEditorMeta={salesImageEditorMeta}
            onPressCreateSalesImage={
              onOpenPostEditor
                ? () => {
                    const fromForm = parseInt(String(category), 10);
                    const fromInitial = initialCategory != null ? parseInt(String(initialCategory), 10) : NaN;
                    const listingCat =
                      Number.isFinite(fromForm) && fromForm > 0
                        ? fromForm
                        : Number.isFinite(fromInitial) && fromInitial > 0
                          ? fromInitial
                          : null;
                    const salesUrl =
                      salesImageUrl || (salesImage?.uri ? String(salesImage.uri).trim() : '') || null;
                    onOpenPostEditor({
                      categoryId: listingCat,
                      salesImageUrl: salesUrl,
                      isEditingAd,
                      salesImageEditorMeta,
                      adListing: initialListing,
                    });
                  }
                : undefined
            }
          />
        );
      case 'saleatpresale':
        return (
          <SaleAtPreSale
            key="saleatpresale"
            isSelected={saleAtPresale}
            onToggle={setSaleAtPresale}
            subscriptionType={currentUser?.subscription_type}
          />
        );
      case 'sharedspacescompany':
        return (
          <SharedSpacesCompany
            key="sharedspacescompany"
            isSelected={sharedSpacesCompany}
            onToggle={setSharedSpacesCompany}
          />
        );
      case 'generaldetailswithradio': {
        const toggleable = field.groups?.toggleableOfferGroups === true;
        const companyOfficeGeneralDetailsFigma = isCompanyOfficeUpload && field.groups?.title === 'פרטים כלליים';
        /** פרטים כלליים / הפרויקט מציע / similar blocks — rows collapsed by default */
        const accordionForRadioGroups = companyOfficeGeneralDetailsFigma
          ? false
          : !toggleable || field.groups?.title === offersSectionTitle;
        return (
          <GeneralDetailsWithRadio
            key={`generaldetailswithradio-${index}`}
            groups={hydrateGeneralDetailsWithRadio(field.groups)}
            toggleableOfferGroups={toggleable}
            offerToggleKeyPrefix={toggleable ? String(index) : ''}
            accordionGroups={accordionForRadioGroups}
            companyOfficeGeneralDetailsFigma={companyOfficeGeneralDetailsFigma}
            isOfferGroupExpanded={
              accordionForRadioGroups ? title => projectOfferGroupsExpanded[`${index}-${title}`] === true : undefined
            }
            onToggleOfferExpand={accordionForRadioGroups ? toggleProjectOfferExpand(index) : undefined}
            isOfferGroupIncluded={
              toggleable ? title => projectOfferGroupsOn[`${index}-${title}`] !== false : undefined
            }
            onToggleOfferGroup={toggleable ? toggleProjectOfferGroup(index, field.groups) : undefined}
            onAddRepeatableRow={
              isCompanyOfficeUpload || isCompanyCommercialUpload ? handleCompanyRepeatRowAdd : undefined
            }
          />
        );
      }
      case 'constructionstatus':
        return (
          <ConstructionStatus
            key="constructionstatus"
            data={field.data || []}
            title={field.title}
            constructionStatus={constructionStatus}
            setConstructionStatus={setConstructionStatus}
          />
        );
      case 'companyofferslandsizes':
        return (
          <CompanyOffersLandSizes
            key="companyofferslandsizes"
            lands={companyLandParcels}
            setLands={setCompanyLandParcels}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div ref={rootRef} className={styles.screen}>
      <div className={styles.scroll}>
        <header className={styles.header}>
          <button type="button" className={styles.backBtn} onClick={onClose} aria-label="חזרה">
            <MdiIcon path={mdiChevronLeft} size={34} color="#fff" />
          </button>
          <h1 className={styles.headerTitle}>יצירת מודעה</h1>
          <span className={styles.headerSpacer} aria-hidden="true" />
        </header>
        <FormScrollProvider>
          <div className={styles.column}>{adsFormFields.map(renderField)}</div>
        </FormScrollProvider>
      </div>
      <div className={styles.publishFooter}>
        <div className={styles.publishFooterInner}>
          <PublishAdButton
            onPress={handlePublish}
            uploading={uploading}
            ready={formReadyToPublish}
            isEditing={isEditingAd}
          />
        </div>
      </div>

      <PublishValidationModal
        visible={publishValidationVisible}
        messages={publishValidationMessages}
        onClose={() => setPublishValidationVisible(false)}
      />
      {bnbLogoCropVisible && bnbLogoCropUri ? (
        <CircleCropModal
          imageUri={bnbLogoCropUri}
          onCancel={handleBnbLogoCropCancel}
          onConfirm={handleBnbLogoCropConfirm}
          title="חתוך את לוגו העסק"
        />
      ) : null}
      {partnerPhotoCropVisible && partnerPhotoCropUri ? (
        <CircleCropModal
          imageUri={partnerPhotoCropUri}
          onCancel={handlePartnerPhotoCropCancel}
          onConfirm={handlePartnerPhotoCropConfirm}
          title="חתוך את התמונה"
        />
      ) : null}
      {adImageCrop?.uri ? (
        <CircleCropModal
          imageUri={adImageCrop.uri}
          onCancel={() => setAdImageCrop(null)}
          onConfirm={handleAdImageCropConfirm}
          title="עריכת תמונה"
        />
      ) : null}
    </div>
  );
}
