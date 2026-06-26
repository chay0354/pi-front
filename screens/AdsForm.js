import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  ActivityIndicator,
  PanResponder,
  Dimensions,
  I18nManager,
  Alert,
} from 'react-native';
import {FormScrollProvider, useFormScroll} from '../utils/formKeyboardScroll';
import * as ImagePicker from 'expo-image-picker';
import {
  AD_VIDEO_PICKER_OPTIONS,
  ensureMediaLibraryPermission,
} from '../utils/mediaLibraryPermission';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {
  uploadFile,
  errorMessageFromUnknown,
  createListing,
  createSalesImageStory,
  updateListing,
  resolveSubscriptionId,
  getResolvedApiUrl,
} from '../utils/api';
import {getUserProfileImageUrl} from '../utils/userProfileImage';
import {
  brokerCategoryForm,
  companyCategoryForm,
  subscriptionTypes,
  userCategoryForm,
} from '../utils/constant';
import {fonts} from '../utils/fonts';
import {
  PRICE_COUNTER_STEP_DEFAULT,
  PRICE_COUNTER_STEP_PER_NIGHT,
  PRICE_COUNTER_STEP_ROOMMATE_BUDGET,
} from '../utils/priceInput';
import {PublishAdButton} from '../components/FormsElement/PublishAdButton';
import {buildGlobalGroundFieldList} from '../utils/globalGroundAdFields';
import {
  AccommodationOffers,
  AdditionalDetails,
  AddressDetails,
  ApartmentType,
  DisplayOptions,
  FormContainer,
  GeneralDetails,
  HospitalityNature,
  MultiImageWithVideo,
  MultiPicturesUpload,
  Preferences,
  PriceCount,
  ProfileVerification,
  PropertyCondition,
  PropertyType,
  Purpose,
  RadioIcon,
  SearchPurpose,
  ServiceAndFacility,
  Title,
  VideoUpload,
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
  PublishValidationModal,
} from '../components';
import {CompanyOffersLandSizes} from '../components/FormsElement/CompanyOffersLandSizes';
import {SharedSpacesCompany} from '../components/FormsElement/SharedSpacesCompany';
import {ContextHook} from '../hooks/ContextHook';

/** Company office upload (category 2) — same strings as `companyCategoryForm[2]` in constant.js */
const COMPANY_OFFICE_SIZES_SECTION_TITLE = 'הפרוייקט מציע משרדים בגדלים של';
const COMPANY_WHOLE_FLOOR_SECTION_TITLE = 'הפרוייקט מציע קומה שלמה';
/** Company commercial (category 8) — `companyCategoryForm[8]` */
const CAT8_COMMERCIAL_SIZES_SECTION_TITLE = 'הפרוייקט מציע שטחי מסחר בגדלים של';
const CAT8_WHOLE_FLOOR_SECTION_TITLE = 'הפרוייקט מציע קומה שלמה';

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

/**
 * Ensure every dynamic slot key exists in the payload (incl. zeros) so the API stores all rows.
 */
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

/**
 * Age Range Slider Component
 * Custom dual-handle range slider for age selection matching Figma design
 */
const AgeRangeSlider = ({minValue, maxValue, onMinChange, onMaxChange}) => {
  const [sliderWidth, setSliderWidth] = useState(300);
  const [activeThumb, setActiveThumb] = useState(null); // 'min' or 'max'
  const sliderContainerRef = useRef(null);

  const minPosition = (minValue / 100) * 100;
  const maxPosition = (maxValue / 100) * 100;

  const handleSliderPress = evt => {
    if (!sliderContainerRef.current) return;

    const {locationX} = evt.nativeEvent;
    const percent = Math.max(0, Math.min(100, (locationX / sliderWidth) * 100));

    // Determine which thumb is closer
    const minDist = Math.abs(percent - minPosition);
    const maxDist = Math.abs(percent - maxPosition);

    if (minDist < maxDist) {
      setActiveThumb('min');
      const newMin = Math.max(18, Math.min(maxValue - 1, Math.round(percent)));
      onMinChange(newMin);
    } else {
      setActiveThumb('max');
      const newMax = Math.max(minValue + 1, Math.min(100, Math.round(percent)));
      onMaxChange(newMax);
    }
  };

  const handleThumbPress = thumb => {
    setActiveThumb(thumb);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: evt => {
        const {locationX} = evt.nativeEvent;
        const percent = (locationX / sliderWidth) * 100;

        // Determine which thumb is closer
        const minDist = Math.abs(percent - minPosition);
        const maxDist = Math.abs(percent - maxPosition);

        if (minDist < maxDist) {
          setActiveThumb('min');
        } else {
          setActiveThumb('max');
        }
      },
      onPanResponderMove: evt => {
        if (activeThumb === null) return;

        const {locationX} = evt.nativeEvent;
        const percent = Math.max(
          0,
          Math.min(100, (locationX / sliderWidth) * 100),
        );

        if (activeThumb === 'min') {
          const newMin = Math.max(
            18,
            Math.min(maxValue - 1, Math.round(percent)),
          );
          onMinChange(newMin);
        } else {
          const newMax = Math.max(
            minValue + 1,
            Math.min(100, Math.round(percent)),
          );
          onMaxChange(newMax);
        }
      },
      onPanResponderRelease: () => {
        setActiveThumb(null);
      },
    }),
  ).current;

  return (
    <View style={styles.preferenceSection}>
      <Title text="גיל מועדף" />
      <View style={styles.ageRangeContainer}>
        <Text style={styles.ageRangeText}>
          {minValue} - {maxValue}
        </Text>
        <View
          ref={sliderContainerRef}
          style={styles.ageRangeSliderContainer}
          onLayout={event => {
            const {width} = event.nativeEvent.layout;
            if (width > 0) {
              setSliderWidth(width);
            }
          }}
          {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
          onStartShouldSetResponder={() => true}
          onResponderGrant={handleSliderPress}
          onTouchStart={
            Platform.OS === 'web'
              ? e => {
                  const touch = e.touches?.[0] || e.nativeEvent?.touches?.[0];
                  if (touch && sliderContainerRef.current) {
                    const rect =
                      sliderContainerRef.current.getBoundingClientRect?.();
                    if (rect) {
                      const locationX = touch.clientX - rect.left;
                      handleSliderPress({nativeEvent: {locationX}});
                    }
                  }
                }
              : undefined
          }>
          <View style={styles.ageRangeSliderTrack}>
            <View
              style={[
                styles.ageRangeSliderFill,
                {
                  left: `${minPosition}%`,
                  width: `${maxPosition - minPosition}%`,
                },
              ]}
            />
            <TouchableOpacity
              style={[styles.ageRangeSliderThumb, {left: `${minPosition}%`}]}
              onPressIn={() => handleThumbPress('min')}
              activeOpacity={1}
            />
            <TouchableOpacity
              style={[styles.ageRangeSliderThumb, {left: `${maxPosition}%`}]}
              onPressIn={() => handleThumbPress('max')}
              activeOpacity={1}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const isRemoteMediaUrl = uri =>
  typeof uri === 'string' &&
  (uri.startsWith('http://') || uri.startsWith('https://'));

const hasLocalMediaFile = fileObj =>
  Boolean(fileObj?.uri) && !isRemoteMediaUrl(fileObj.uri);

/** Normalize expo-image-picker / web File into uploadFile shape. */
const fileFromPickerAsset = (asset, kind = 'image') => {
  if (!asset?.uri) return null;
  const isVideo =
    kind === 'video' ||
    String(asset.type || '').toLowerCase() === 'video' ||
    String(asset.mimeType || '').startsWith('video/');
  const defaultMime = isVideo ? 'video/mp4' : 'image/jpeg';
  const defaultName = isVideo
    ? `video-${Date.now()}.mp4`
    : `photo-${Date.now()}.jpg`;
  const type =
    asset.mimeType ||
    (String(asset.type || '').includes('/') ? asset.type : defaultMime);
  const name = asset.fileName || asset.filename || defaultName;
  return {uri: asset.uri, type, name};
};

/** Smaller JPEGs upload faster on mobile; still sharp enough for listing photos. */
const AD_IMAGE_PICKER_QUALITY = 0.85;

const ADS_FORM_HEADER_HEIGHT = 64;
const ADS_FORM_PUBLISH_FOOTER_HEIGHT = 92;

/**
 * AdsForm Component
 * Form for creating an office listing
 */
const AdsForm = ({
  onClose,
  onPublish,
  initialCategory = null,
  initialListing = null,
  initialBnbHostType = null,
  /** Navigate to post composer for current category; return path is set by App. */
  onOpenPostEditor = null,
  /** Set when PostEditor returns to AdsForm after publishing a sales-image post. */
  pendingSalesImageFromEditor = null,
  onPendingSalesImageConsumed = null,
}) => {
  const insets = useSafeAreaInsets();
  const [propertyType, setPropertyType] = useState(null);
  const [serviceAndFacilityType, setServiceAndFacilityType] = useState(null);
  const [cancellationPolicy, setCancellationPolicy] = useState(null);
  /** מחיר ללילה — "מחיר במבצע" / Hot deal (saved as ads.hot_deal) */
  const [hotDeal, setHotDeal] = useState(false);
  const [area, setArea] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [floor, setFloor] = useState(1);
  const [amenities, setAmenities] = useState({}); // { amenity: quantity or true }
  const [optionSecondValues, setOptionSecondValues] = useState({});
  const [condition, setCondition] = useState(null);
  const [purpose, setPurpose] = useState('sale'); // 'sale' or 'rent'
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
  const [feedDisplayPriority, setFeedDisplayPriority] = useState('video'); // 'video' | 'mainImage' – what to show first on TikTok feed
  const [displayOption, setDisplayOption] = useState(null); // 'collage' or 'slideshow'
  const [exposureLevel, setExposureLevel] = useState('medium'); // 'low' | 'medium' | 'high' – how often ad is shown to others
  const {currentUser} = useContext(ContextHook);
  const formList = useMemo(() => {
    const t = String(currentUser?.subscription_type || '').toLowerCase();
    if (t === subscriptionTypes.user) {
      return userCategoryForm;
    }
    if (t === subscriptionTypes.broker) {
      return brokerCategoryForm;
    }
    // company & professional: `companyCategoryForm` had no key `1` — merge broker’s חדש מקבלן project form
    return {
      ...companyCategoryForm,
      1: {
        ...brokerCategoryForm[1],
        role: 'company',
      },
    };
  }, [currentUser?.subscription_type]);

  const [category, setCategory] = useState(
    initialCategory ? parseInt(initialCategory) : 1,
  ); // Category 1-11 (default: 1, or use initialCategory if provided)
  /** גלובל + סוג נכס "קרקע": same sections/order as קרקעות (cat. 7), hide irrelevant blocks */
  const adsFormFields = useMemo(() => {
    return (
      buildGlobalGroundFieldList(formList, category, propertyType) ??
      formList[category]?.fields ??
      []
    );
  }, [formList, category, propertyType]);

  // New fields for category 3 (חדש מקבלן)
  const [searchPurpose, setSearchPurpose] = useState(null); // 'enter', 'bring_in', 'partner'
  const [preferredApartmentType, setPreferredApartmentType] = useState(null); // 'regular', 'studio', 'garden', 'duplex', 'penthouse', 'private'
  const [preferredGender, setPreferredGender] = useState(null); // 'female', 'male'
  const [preferredAgeMin, setPreferredAgeMin] = useState(20);
  const [preferredAgeMax, setPreferredAgeMax] = useState(100);
  const [preferences, setPreferences] = useState({}); // { nonSmokers: false, students: false, etc. }
  const [budget, setBudget] = useState(1000);
  /** BnB category 5: from feed sheet — persisted in general_details.bnb_host_type */
  const [bnbHostType, setBnbHostType] = useState(null);
  const [guestCount, setGuestCount] = useState(1);
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  /** Pre-sale tag — stored in ads.sale_at_presale (boolean). */
  const [saleAtPresale, setSaleAtPresale] = useState(false);
  const [sharedSpacesCompany, setSharedSpacesCompany] = useState(false);

  // Update category when initialCategory prop changes
  useEffect(() => {
    if (initialCategory) {
      const categoryNum = parseInt(initialCategory);
      if (categoryNum >= 1 && categoryNum <= 11) {
        setCategory(categoryNum);
      }
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
      if (
        field.key !== 'generaldetailswithradio' ||
        field.groups?.title !== 'הפרויקט מציע'
      ) {
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
  }, [initialListing?.id, adsFormFields]);

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
      if (
        sectionTitle !== COMPANY_OFFICE_SIZES_SECTION_TITLE &&
        sectionTitle !== COMPANY_WHOLE_FLOOR_SECTION_TITLE
      ) {
        return;
      }
      const prefix =
        sectionTitle === COMPANY_OFFICE_SIZES_SECTION_TITLE
          ? 'office'
          : 'whole_floor';
      for (let i = 1; i <= 40; i++) {
        const ak = `${prefix}_${i}_area`;
        const pk = `${prefix}_${i}_price`;
        const has =
          (po[ak] != null && Number(po[ak]) > 0) ||
          (po[pk] != null && Number(po[pk]) > 0);
        if (has) {
          const rowTitle = prefix === 'office' ? `משרד ${i}` : `קומה שלמה ${i}`;
          next[`${fieldIndex}-${rowTitle}`] = true;
        }
      }
    });
    if (Object.keys(next).length > 0) {
      setProjectOfferGroupsExpanded(prev => ({...prev, ...next}));
    }
  }, [
    initialListing?.id,
    initialListing?.project_offers,
    category,
    adsFormFields,
  ]);

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
      if (
        sectionTitle !== CAT8_COMMERCIAL_SIZES_SECTION_TITLE &&
        sectionTitle !== CAT8_WHOLE_FLOOR_SECTION_TITLE
      ) {
        return;
      }
      const isCommercial = sectionTitle === CAT8_COMMERCIAL_SIZES_SECTION_TITLE;
      for (let i = 1; i <= 40; i++) {
        const ak = isCommercial
          ? `cat8_commercial_space_${i}_sqm`
          : `cat8_whole_floor_${i}_sqm`;
        const pk = isCommercial
          ? `cat8_commercial_space_${i}_price`
          : `cat8_whole_floor_${i}_price`;
        const has =
          (po[ak] != null && Number(po[ak]) > 0) ||
          (po[pk] != null && Number(po[pk]) > 0);
        if (has) {
          const rowTitle = isCommercial ? `שטח מסחרי ${i}` : `קומה שלמה ${i}`;
          next[`${fieldIndex}-${rowTitle}`] = true;
        }
      }
    });
    if (Object.keys(next).length > 0) {
      setProjectOfferGroupsExpanded(prev => ({...prev, ...next}));
    }
  }, [
    initialListing?.id,
    initialListing?.project_offers,
    category,
    adsFormFields,
  ]);

  useEffect(() => {
    const fields = formList?.[category]?.fields || [];
    const hasPricePerNight = fields.some(
      field => field?.key === 'pricepernight',
    );
    if (!hasPricePerNight) return;
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setPrice(1000);
    }
  }, [category, formList, price]);

  useEffect(() => {
    if (initialListing) {
      const gd = initialListing.general_details;
      let host =
        gd &&
        typeof gd === 'object' &&
        (gd.bnb_host_type === 'private' || gd.bnb_host_type === 'business')
          ? gd.bnb_host_type
          : null;
      if (!host && initialListing.bnb_business_logo_url) {
        host = 'business';
      }
      setBnbHostType(host);
      return;
    }
    setBnbHostType(
      initialBnbHostType === 'private' || initialBnbHostType === 'business'
        ? initialBnbHostType
        : null,
    );
  }, [initialListing, initialBnbHostType]);

  // Pre-fill form when editing an existing listing
  useEffect(() => {
    if (!initialListing) return;
    const cat =
      initialListing.category != null
        ? parseInt(initialListing.category)
        : null;
    if (cat >= 1 && cat <= 12) setCategory(cat);
    const ptRaw = initialListing.property_type ?? initialListing.propertyType;
    if (ptRaw != null && String(ptRaw).trim() !== '') {
      setPropertyType(String(ptRaw).trim());
    }
    setDescription(initialListing.description ?? '');
    setProjectName(
      initialListing.project_name != null
        ? String(initialListing.project_name)
        : '',
    );
    setAddress(
      initialListing.address != null ? String(initialListing.address) : '',
    );
    let parcel =
      initialListing.land_parcel != null
        ? String(initialListing.land_parcel)
        : '';
    let block =
      initialListing.land_block != null
        ? String(initialListing.land_block)
        : '';
    if (
      (!parcel || !block) &&
      initialListing.land_address != null &&
      String(initialListing.land_address).trim()
    ) {
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
      initialListing.contact_details?.full_name != null
        ? String(initialListing.contact_details.full_name)
        : '',
    );
    setContactEmail(
      initialListing.contact_details?.email != null
        ? String(initialListing.contact_details.email)
        : '',
    );
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
      const amin =
        initialListing.preferred_age_min ?? initialListing.preferredAgeMin;
      const amax =
        initialListing.preferred_age_max ?? initialListing.preferredAgeMax;
      if (
        amin != null &&
        String(amin).trim() !== '' &&
        !Number.isNaN(Number(amin))
      ) {
        setPreferredAgeMin(
          Math.max(18, Math.min(100, Math.round(Number(amin)))),
        );
      }
      if (
        amax != null &&
        String(amax).trim() !== '' &&
        !Number.isNaN(Number(amax))
      ) {
        setPreferredAgeMax(
          Math.max(18, Math.min(100, Math.round(Number(amax)))),
        );
      }
    } else {
      setBudget(initialListing.budget ?? 1000);
    }
    const imgs =
      initialListing.images ??
      (initialListing.image ? [{uri: initialListing.image}] : []);
    if (imgs.length > 0) {
      const first = imgs[0];
      const uri = typeof first === 'string' ? first : first?.uri;
      if (uri) {
        setMainImage({uri});
        setMainImageUrl(uri);
      }
      if (imgs.length > 1) {
        const rest = imgs
          .slice(1)
          .map(i => (typeof i === 'string' ? {uri: i} : {uri: i?.uri}));
        setAdditionalImages(rest.filter(i => i?.uri));
        setAdditionalImageUrls(rest.map(i => i?.uri).filter(Boolean));
      }
    }
    const bnbLogoRaw =
      initialListing.bnb_business_logo_url ??
      initialListing.bnbBusinessLogoUrl ??
      null;
    if (bnbLogoRaw) {
      const u = String(bnbLogoRaw).trim();
      setBnbBusinessLogo({uri: u});
      setBnbBusinessLogoUrl(u);
    } else {
      setBnbBusinessLogo(null);
      setBnbBusinessLogoUrl(null);
    }
    if (
      initialListing.general_details &&
      typeof initialListing.general_details === 'object'
    ) {
      const gd = initialListing.general_details;
      const listingAreaNum =
        initialListing.area != null &&
        !Number.isNaN(Number(initialListing.area))
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
        building_count:
          gd.building_count != null
            ? Number(gd.building_count)
            : prev.building_count,
        floor_count:
          gd.floor_count != null ? Number(gd.floor_count) : prev.floor_count,
        apartment_count:
          gd.apartment_count != null
            ? Number(gd.apartment_count)
            : prev.apartment_count,
        shop_count:
          gd.shop_count != null ? Number(gd.shop_count) : prev.shop_count,
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
    } else if (
      initialListing.area != null &&
      !Number.isNaN(Number(initialListing.area))
    ) {
      const a = Math.max(0, Math.round(Number(initialListing.area)));
      if (a > 0) {
        setGeneralDetailsCounts(prev => ({
          ...prev,
          sqm_area: prev.sqm_area > 0 ? prev.sqm_area : a,
        }));
      }
    }
    if (
      initialListing.project_offers &&
      typeof initialListing.project_offers === 'object'
    ) {
      setProjectOffers(prev => ({...prev, ...initialListing.project_offers}));
    }
    const subType = String(currentUser?.subscription_type || '').toLowerCase();
    const isCompanyLike =
      subType === subscriptionTypes.company ||
      subType === subscriptionTypes.professional;
    if (cat === 2 && isCompanyLike) {
      const po = initialListing.project_offers;
      if (po && typeof po === 'object') {
        setCompanyOfficeRepeatCount(
          maxRepeatSlotFromProjectOffers(po, /^office_(\d+)_/),
        );
        setCompanyWholeFloorRepeatCount(
          maxRepeatSlotFromProjectOffers(po, /^whole_floor_(\d+)_/),
        );
      } else {
        setCompanyOfficeRepeatCount(0);
        setCompanyWholeFloorRepeatCount(0);
      }
    }
    if (cat === 8 && isCompanyLike) {
      const po = initialListing.project_offers;
      if (po && typeof po === 'object') {
        setCat8CommercialRepeatCount(
          maxRepeatSlotFromProjectOffers(po, /cat8_commercial_space_(\d+)_/),
        );
        setCat8WholeFloorRepeatCount(
          maxRepeatSlotFromProjectOffers(po, /cat8_whole_floor_(\d+)_/),
        );
      } else {
        setCat8CommercialRepeatCount(0);
        setCat8WholeFloorRepeatCount(0);
      }
    }
    if (cat === 7 && isCompanyLike) {
      const raw =
        initialListing.company_offers_land_sizes ??
        initialListing.companyOffersLandSizes;
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
    if (initialListing.sale_at_presale !== undefined) {
      setSaleAtPresale(
        initialListing.sale_at_presale === true ||
          initialListing.sale_at_presale === 'true' ||
          initialListing.sale_at_presale === 't',
      );
    }
    {
      const gdShared =
        initialListing.general_details &&
        typeof initialListing.general_details === 'object'
          ? initialListing.general_details.shared_spaces_company
          : undefined;
      const sharedRaw =
        initialListing.shared_spaces_company ?? gdShared;
      setSharedSpacesCompany(
        sharedRaw === true || sharedRaw === 'true' || sharedRaw === 't',
      );
    }
    const salesImageRaw =
      initialListing.sales_image_url ?? initialListing.salesImageUrl ?? null;
    if (salesImageRaw && String(salesImageRaw).trim() !== '') {
      const u = String(salesImageRaw).trim();
      setSalesImage({uri: u});
      setSalesImageUrl(u);
      salesImageCompanionPendingRef.current = false;
      salesImageStoryAlreadyCreatedRef.current = true;
    } else {
      setSalesImage(null);
      setSalesImageUrl(null);
      salesImageCompanionPendingRef.current = false;
      salesImageStoryAlreadyCreatedRef.current = false;
    }
    if (initialListing.construction_status != null) {
      setConstructionStatus(initialListing.construction_status);
    }
    if (
      ['low', 'medium', 'high'].includes(
        String(initialListing.exposure_level || '').toLowerCase(),
      )
    ) {
      setExposureLevel(String(initialListing.exposure_level).toLowerCase());
    }
    const cpRaw = initialListing.cancellation_policy ?? null;
    setCancellationPolicy(
      cpRaw != null && String(cpRaw).trim() !== ''
        ? String(cpRaw).trim()
        : null,
    );
    setHotDeal(
      initialListing.hot_deal === true ||
        initialListing.hot_deal === 'true' ||
        initialListing.hot_deal === 't' ||
        initialListing.hot_deal === 1,
    );
  }, [initialListing?.id, currentUser?.subscription_type]);

  // Request camera and media library permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS !== 'web') {
        try {
          const cameraStatus =
            await ImagePicker.requestCameraPermissionsAsync();
          const mediaLibraryStatus =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

          if (
            cameraStatus.status !== 'granted' ||
            mediaLibraryStatus.status !== 'granted'
          ) {
            alert('נדרשת הרשאה לגישה לספריית המדיה כדי להעלות תמונות וסרטונים');
          }
        } catch (error) {
          console.error('Permission request error:', error);
        }
      }
    };

    requestPermissions();
  }, []);

  useEffect(() => {
    const pending = pendingSalesImageFromEditor;
    if (!pending?.url) return;
    const url = String(pending.url).trim();
    if (!url) return;
    setSalesImage({uri: url});
    setSalesImageUrl(url);
    salesImageStoryAlreadyCreatedRef.current =
      pending.storyAlreadyCreated === true ||
      pending.feedPostAlreadyCreated === true;
    salesImageCompanionPendingRef.current = !salesImageStoryAlreadyCreatedRef.current;
    onPendingSalesImageConsumed?.();
  }, [pendingSalesImageFromEditor, onPendingSalesImageConsumed]);

  // Media uploads - store file objects and uploaded URLs
  const [mainImage, setMainImage] = useState(null);
  const [mainImageUrl, setMainImageUrl] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [additionalImageUrls, setAdditionalImageUrls] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  // Loading states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [publishValidationVisible, setPublishValidationVisible] =
    useState(false);
  const [publishValidationMessages, setPublishValidationMessages] = useState(
    [],
  );

  // File input refs for web
  const mainImageInputRef = useRef(null);
  const [constructionStatus, setConstructionStatus] = useState(null);
  const additionalImageInputRefs = useRef([null, null, null, null]);
  const videoInputRef = useRef(null);
  const bnbBusinessLogoInputRef = useRef(null);
  const [bnbBusinessLogo, setBnbBusinessLogo] = useState(null);
  const [bnbBusinessLogoUrl, setBnbBusinessLogoUrl] = useState(null);
  /** Sales image (תמונה מכירתית) — stored in ads.sales_image_url. */
  const salesImageInputRef = useRef(null);
  const [salesImage, setSalesImage] = useState(null);
  const [salesImageUrl, setSalesImageUrl] = useState(null);
  /** True when a companion story still needs to be created on publish. */
  const salesImageCompanionPendingRef = useRef(false);
  /** True when PostEditor already published the sales image as a story. */
  const salesImageStoryAlreadyCreatedRef = useRef(false);
  // Land form radio groups (תב״ע, קרקע במושב, etc.) keyed by field title
  const [landRadioValues, setLandRadioValues] = useState({});
  // פרטים כלליים: כמות מבנים, מספר קומות, כמות דירות (for broker/company category 1)
  const [generalDetailsCounts, setGeneralDetailsCounts] = useState({
    sqm_area: 0,
    building_count: 0,
    floor_count: 0,
    apartment_count: 0,
    shop_count: 0,
    parking_structured_count: 0,
  });
  // הפרויקט מציע: דירות 3/4/5 חדרים, דירות גן, פנטהאוזים, בתים פרטיים (area, rooms, price per type)
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
  // Catch-all for company (and any) form keys not in generalDetailsCounts/projectOffers (e.g. office_1_area, whole_floor_1_price)
  const [otherFormValues, setOtherFormValues] = useState({});
  // בלעדי (10): הסרת סוגי דירה מ"הפרויקט מציע" — מפתח `${fieldIndex}-${groupTitle}` → false = מוסתר
  const [projectOfferGroupsOn, setProjectOfferGroupsOn] = useState({});
  /** "הפרויקט מציע": אקורדיון — מפתח `${fieldIndex}-${groupTitle}` → true = שדות פתוחים (ברירת מחדל סגור) */
  const [projectOfferGroupsExpanded, setProjectOfferGroupsExpanded] = useState(
    {},
  );
  /** Company category 2 (משרדים): dynamic משרד 1… / קומה שלמה 1… rows; default 0 visible slots */
  const [companyOfficeRepeatCount, setCompanyOfficeRepeatCount] = useState(0);
  const [companyWholeFloorRepeatCount, setCompanyWholeFloorRepeatCount] =
    useState(0);
  /** Company category 8 (מסחר): dynamic שטח מסחרי / קומה שלמה rows */
  const [cat8CommercialRepeatCount, setCat8CommercialRepeatCount] = useState(0);
  const [cat8WholeFloorRepeatCount, setCat8WholeFloorRepeatCount] = useState(0);
  /** Company category 7 (קרקעות): dynamic קרקע rows — persisted as `company_offers_land_sizes` */
  const [companyLandParcels, setCompanyLandParcels] = useState([]);

  const selectedAdditionalImagesCount = additionalImages.filter(Boolean).length;
  const totalSelectedImages =
    (mainImage ? 1 : 0) + selectedAdditionalImagesCount;

  const isCompanyOfficeUpload = useMemo(() => {
    if (parseInt(category, 10) !== 2) {
      return false;
    }
    const t = String(currentUser?.subscription_type || '').toLowerCase();
    return (
      t === subscriptionTypes.company || t === subscriptionTypes.professional
    );
  }, [category, currentUser?.subscription_type]);

  const isCompanyCommercialUpload = useMemo(() => {
    if (parseInt(category, 10) !== 8) {
      return false;
    }
    const t = String(currentUser?.subscription_type || '').toLowerCase();
    return (
      t === subscriptionTypes.company || t === subscriptionTypes.professional
    );
  }, [category, currentUser?.subscription_type]);

  const amenitiesWithQuantity = ['חנייה', 'מרפסת'];

  // Hydrate generaldetailswithradio groups with state so count/price fields are controlled
  const hydrateGeneralDetailsWithRadio = groups => {
    if (!groups || !groups.groups) return groups;
    const getValue = key => {
      if (key in generalDetailsCounts)
        return Number(generalDetailsCounts[key]) || 0;
      if (key in projectOffers) return Number(projectOffers[key]) || 0;
      if (key in otherFormValues) return Number(otherFormValues[key]) || 0;
      return 0;
    };
    const setValue = (key, val) => {
      const numVal = key.endsWith('_price')
        ? Number(val) || 0
        : Math.max(0, Number(val) || 0);
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
          groups: buildCompanyOfficeRepeatGroups(companyOfficeRepeatCount).map(
            mapGroupFields,
          ),
        };
      }
      if (t === COMPANY_WHOLE_FLOOR_SECTION_TITLE) {
        return {
          ...groups,
          groups: buildCompanyWholeFloorRepeatGroups(
            companyWholeFloorRepeatCount,
          ).map(mapGroupFields),
        };
      }
    }
    if (isCompanyCommercialUpload) {
      const t = groups.title;
      if (t === CAT8_COMMERCIAL_SIZES_SECTION_TITLE) {
        return {
          ...groups,
          groups: buildCat8CommercialRepeatGroups(
            cat8CommercialRepeatCount,
          ).map(mapGroupFields),
        };
      }
      if (t === CAT8_WHOLE_FLOOR_SECTION_TITLE) {
        return {
          ...groups,
          groups: buildCat8WholeFloorRepeatGroups(
            cat8WholeFloorRepeatCount,
          ).map(mapGroupFields),
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
      return {...prev, [stateKey]: wasOn ? false : true};
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

  // File upload handlers
  const handleMainImageUpload = async () => {
    if (Platform.OS === 'web' && mainImageInputRef.current) {
      mainImageInputRef.current.click();
    } else {
      // Native mobile - use expo-image-picker
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: AD_IMAGE_PICKER_QUALITY,
        });

        if (!result.canceled && result.assets[0]) {
          setMainImage(fileFromPickerAsset(result.assets[0], 'image'));
        }
      } catch (error) {
        alert('שגיאה בבחירת תמונה: ' + error.message);
      }
    }
  };

  const handleMainImageChange = event => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setMainImage({
        uri: URL.createObjectURL(file),
        type: file.type || 'image/jpeg',
        name: file.name || `photo-${Date.now()}.jpg`,
      });
      // Don't upload yet - will upload when publish button is pressed
    }
  };

  const handleSalesImageUpload = async () => {
    if (Platform.OS === 'web' && salesImageInputRef.current) {
      salesImageInputRef.current.click();
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: AD_IMAGE_PICKER_QUALITY,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        salesImageCompanionPendingRef.current = true;
        salesImageStoryAlreadyCreatedRef.current = false;
        setSalesImage({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.filename || `sales-${Date.now()}.jpg`,
          file: asset,
        });
      }
    } catch (error) {
      alert('שגיאה בבחירת תמונה: ' + error.message);
    }
  };

  const handleSalesImageChange = event => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      salesImageCompanionPendingRef.current = true;
      salesImageStoryAlreadyCreatedRef.current = false;
      setSalesImage({
        uri: URL.createObjectURL(file),
        type: file.type,
        name: file.name,
        file,
      });
    }
  };

  const handleBnbBusinessLogoUpload = async () => {
    if (Platform.OS === 'web' && bnbBusinessLogoInputRef.current) {
      bnbBusinessLogoInputRef.current.click();
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.92,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setBnbBusinessLogo({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.filename || `bnb-logo-${Date.now()}.jpg`,
          file: asset,
        });
      }
    } catch (error) {
      alert('שגיאה בבחירת לוגו: ' + (error.message || ''));
    }
  };

  const handleBnbBusinessLogoChange = event => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setBnbBusinessLogo({
        uri: URL.createObjectURL(file),
        type: file.type,
        name: file.name,
        file,
      });
    }
  };

  const handleAdditionalImageUpload = async index => {
    if (Platform.OS === 'web' && additionalImageInputRefs.current[index]) {
      additionalImageInputRefs.current[index].click();
    } else {
      // Native mobile - use expo-image-picker
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: AD_IMAGE_PICKER_QUALITY,
        });

        if (!result.canceled && result.assets[0]) {
          const newImages = [...additionalImages];
          newImages[index] = fileFromPickerAsset(result.assets[0], 'image');
          setAdditionalImages(newImages);
        }
      } catch (error) {
        alert('שגיאה בבחירת תמונה: ' + error.message);
      }
    }
  };

  const handleAdditionalImageChange = (index, event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const newImages = [...additionalImages];
      newImages[index] = {
        uri: URL.createObjectURL(file),
        type: file.type || 'image/jpeg',
        name: file.name || `photo-${Date.now()}.jpg`,
      };
      setAdditionalImages(newImages);
    }
  };

  const handleVideoUpload = async () => {
    if (Platform.OS === 'web' && videoInputRef.current) {
      videoInputRef.current.click();
      return;
    }
    try {
      const permitted = await ensureMediaLibraryPermission();
      if (!permitted) return;
      const result = await ImagePicker.launchImageLibraryAsync(
        AD_VIDEO_PICKER_OPTIONS,
      );
      if (!result.canceled && result.assets?.[0]) {
        setVideoFile(fileFromPickerAsset(result.assets[0], 'video'));
        setHasVideo(true);
      }
    } catch (error) {
      Alert.alert(
        'שגיאה בבחירת סרטון',
        error?.message || 'לא ניתן לפתוח את ספריית הסרטונים.',
      );
    }
  };

  const handleVideoChange = event => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setVideoFile({
        uri: URL.createObjectURL(file),
        type: file.type || 'video/mp4',
        name: file.name || `video-${Date.now()}.mp4`,
      });
      setHasVideo(true);
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
          publishErrors.push('הזינו שם פרויקט');
        }
        if (!String(address || '').trim()) {
          publishErrors.push('הזינו כתובת פרויקט');
        }
      }
      const needsMainImage =
        fieldKeys.includes('multiimagewithvideo') &&
        !fieldKeys.includes('profileverification');
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
        const anyOn = titles.some(
          t => projectOfferGroupsOn[`${fi}-${t}`] !== false,
        );
        if (!anyOn) {
          publishErrors.push(
            'בחרו לפחות סוג דירה אחד ב"הפרויקט מציע", או הפעילו שוב שורה שהוסרה.',
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
  ]);

  /** Mandatory fields satisfied — yellow asset + press enabled (still respects uploading). */
  const formReadyToPublish = publishBlockingErrors.length === 0;

  const uploadAdsMedia = async (fileObj, folder, progressKey, options = {}) => {
    if (!hasLocalMediaFile(fileObj)) return null;
    const isVideo = String(folder || '').includes('video');
    setUploadProgress(prev => ({...prev, [progressKey]: true}));
    try {
      const result = await uploadFile(fileObj, folder, {
        timeoutMs: options.timeoutMs ?? (isVideo ? 300000 : 120000),
      });
      if (!result?.url) {
        throw new Error(
          errorMessageFromUnknown(result?.error, 'Upload failed'),
        );
      }
      return result.url;
    } finally {
      setUploadProgress(prev => ({...prev, [progressKey]: false}));
    }
  };

  const handlePublish = async () => {
    try {
      setUploading(true);

      // Must match rendered `adsFormFields` so validation & companion-story logic stay in sync with visible fields (e.g. salesimage).
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
      };
      const accommodationOffersPayload =
        guestCount || checkInDate || checkOutDate
          ? {
              guest_count: Number(guestCount) || 1,
              check_in_date: checkInDate || null,
              check_out_date: checkOutDate || null,
            }
          : undefined;
      const serviceFacilityPayload = serviceAndFacilityType
        ? {selected: serviceAndFacilityType}
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
      }
      if (initialListing && videoFile?.uri && !hasLocalMediaFile(videoFile)) {
        uploadedVideoUrl = videoFile.uri || videoUrl;
      }
      for (let i = 0; i < (additionalImages?.length || 0); i++) {
        if (additionalImages[i]?.uri && !hasLocalMediaFile(additionalImages[i])) {
          uploadedAdditionalImageUrls[i] = additionalImages[i].uri;
        }
      }

      // For category 3, upload user's image if provided, otherwise use fixed image (or keep existing when editing)
      if (category === 3) {
        if (uploadedMainImageUrl) {
          // Already have URL from initialListing (edit mode)
        } else if (hasLocalMediaFile(mainImage)) {
          // User uploaded their own image - upload it
          try {
            uploadedMainImageUrl = await uploadAdsMedia(
              mainImage,
              'listings/images',
              'mainImage',
            );
          } catch (error) {
            alert('שגיאה בהעלאת התמונה. נסה שוב.');
            setUploading(false);
            return;
          }
        } else {
          // No user image - upload the fixed image from assets
          try {
            if (Platform.OS === 'web') {
              setUploadProgress(prev => ({...prev, mainImage: true}));
              // Fetch the image from the asset
              const imageModule = require('../assets/image-insert-2.png');
              const imageUrl =
                typeof imageModule === 'string'
                  ? imageModule
                  : imageModule.default || imageModule;

              // Fetch the image and convert to blob
              const response = await fetch(imageUrl);
              const blob = await response.blob();
              const file = new File([blob], 'image-insert-2.png', {
                type: 'image/png',
              });

              const formData = new FormData();
              formData.append('file', file);
              formData.append('folder', 'listings/images');

              const uploadResponse = await fetch(
                `${getResolvedApiUrl()}/api/upload`,
                {
                  method: 'POST',
                  body: formData,
                },
              );

              const uploadData = await uploadResponse.json();
              if (uploadData.success && uploadData.url) {
                uploadedMainImageUrl = uploadData.url;
              } else {
                throw new Error(
                  uploadData.error || 'Failed to upload fixed image',
                );
              }
            } else {
              // For native, you might need a different approach
            }
          } catch (error) {
            alert('שגיאה בהעלאת התמונה הקבועה. נסה שוב.');
            setUploading(false);
            return;
          } finally {
            setUploadProgress(prev => ({...prev, mainImage: false}));
          }
        }
      }

      // Upload remaining media in parallel (much faster than one-by-one on mobile).
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
            run: () =>
              uploadAdsMedia(
                additionalImages[i],
                'listings/images',
                `additional-${i}`,
              ),
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
        if (
          initialListing &&
          bnbBusinessLogo?.uri &&
          !hasLocalMediaFile(bnbBusinessLogo)
        ) {
          uploadedBnbBusinessLogoUrl =
            bnbBusinessLogo.uri || bnbBusinessLogoUrl;
        } else if (hasLocalMediaFile(bnbBusinessLogo)) {
          uploadJobs.push({
            key: 'bnbLogo',
            index: null,
            fatal: true,
            fatalMessage: 'שגיאה בהעלאת הלוגו. נסה שוב.',
            run: () =>
              uploadAdsMedia(
                bnbBusinessLogo,
                'listings/images',
                'bnbBusinessLogo',
              ),
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
            alert(
              detail && detail !== outcome.fatalMessage
                ? `${outcome.fatalMessage}\n${detail}`
                : outcome.fatalMessage,
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

      // Prepare listing data with uploaded Supabase URLs
      const listingCategory =
        parseInt(category) || (initialCategory ? parseInt(initialCategory) : 1);

      // For category 3, use different data structure
      const listingData =
        category === 3
          ? {
              status: 'published',
              subscriptionType: currentUser?.subscription_type || null,
              subscriptionId: resolveSubscriptionId(currentUser),
              // Category 3 specific fields
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
              // Set defaults for required fields that don't apply to category 3
              propertyType: 'office', // Default
              area: 1,
              rooms: 1,
              floor: 1,
              purpose: 'rent', // Default for shared apartments
              price: parseFloat(budget) || 0,
              address: '', // Not required for category 3
              phone: '', // Not required for category 3
              additionalImageUrls: [], // Empty array for category 3
            }
          : {
              status: 'published',
              subscriptionType: currentUser?.subscription_type || null,
              subscriptionId: resolveSubscriptionId(currentUser),
              // Standard listing fields for other categories
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
              displayOption: displayOption || null,
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
              // Land form radio values (when present)
              planApproval: landRadioValues['תב״ע'] || null,
              landInMortgage: landRadioValues['קרקע במושב'] || null,
              permit: landRadioValues['היתר'] || null,
              agriculturalLand: landRadioValues['קרקע חקלאית'] || null,
              landOwnership: landRadioValues['בעלות קרקע'] || null,
              generalDetails:
                Object.keys(generalDetailsForPayload).length > 0
                  ? generalDetailsForPayload
                  : undefined,
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
                const hasAnyNonZero = Object.values(merged).some(
                  v => v !== 0 && v !== undefined && v !== '',
                );
                const forceDynamicSlots =
                  (listingCategory === 2 &&
                    (companyOfficeRepeatCount > 0 ||
                      companyWholeFloorRepeatCount > 0)) ||
                  (listingCategory === 8 &&
                    (cat8CommercialRepeatCount > 0 ||
                      cat8WholeFloorRepeatCount > 0));
                return hasAnyNonZero || forceDynamicSlots ? merged : undefined;
              })(),
              constructionStatus: constructionStatus || undefined,
              ...(listingCategory === 5 &&
                (bnbHostType === 'private' || bnbHostType === 'business') && {
                  bnbHostType,
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
                companyOffersLandSizes: (Array.isArray(companyLandParcels)
                  ? companyLandParcels
                  : []
                ).map(p => ({
                  unit: p.unit === 'sqm' ? 'sqm' : 'dunam',
                  area: Number(p.area) || 0,
                  price: Number(p.price) || 0,
                })),
              }),
            };

      const uuidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const rawEditId =
        initialListing?.id != null && initialListing.id !== ''
          ? String(initialListing.id).trim()
          : initialListing?.ad_number != null && initialListing.ad_number !== ''
            ? String(initialListing.ad_number).trim()
            : '';
      const existingListingId =
        rawEditId && uuidRe.test(rawEditId) ? rawEditId : null;

      const result = existingListingId
        ? await updateListing(existingListingId, listingData)
        : await createListing(listingData);

      // Mirror תמונה מכירתית as both a home story (bottom strip) AND a feed
      // post in the same category as the ad.
      const publisherSubId = resolveSubscriptionId(currentUser);
      const shouldCreateSalesImageStory =
        uploadedSalesImageUrl &&
        fieldKeys.includes('salesimage') &&
        !salesImageStoryAlreadyCreatedRef.current &&
        (hasLocalMediaFile(salesImage) || salesImageCompanionPendingRef.current);
      if (shouldCreateSalesImageStory) {
        if (!publisherSubId) {
          console.warn(
            '[AdsForm] Companion sales-image skipped: no subscription id on currentUser',
          );
        } else {
          try {
            await createSalesImageStory({
              imageUrl: uploadedSalesImageUrl,
              subscriptionId: publisherSubId,
            });
          } catch (mirrorErr) {
            console.warn(
              '[AdsForm] Companion sales-image story failed:',
              errorMessageFromUnknown(mirrorErr, 'Unknown error'),
            );
          }
          // Also publish the sales image as a feed post in the ad's category.
          try {
            await createListing({
              category: listingCategory,
              status: 'published',
              subscriptionId: publisherSubId,
              subscriptionType: currentUser?.subscription_type || null,
              mainImageUrl: uploadedSalesImageUrl,
              description: description.trim() || 'פוסט',
              feedPost: true,
              feed_post: true,
              propertyType: 'post',
              price: 0,
            });
          } catch (postErr) {
            console.warn(
              '[AdsForm] Companion sales-image post failed:',
              errorMessageFromUnknown(postErr, 'Unknown error'),
            );
          }
          salesImageCompanionPendingRef.current = false;
          salesImageStoryAlreadyCreatedRef.current = true;
          setSalesImage({uri: uploadedSalesImageUrl});
          setSalesImageUrl(uploadedSalesImageUrl);
        }
      }

      // Pass to parent with Supabase URLs
      if (onPublish) {
        onPublish({
          ...listingData,
          id: result.id || result.listing?.id,
          mainImage: uploadedMainImageUrl ? {uri: uploadedMainImageUrl} : null,
          additionalImages: uploadedAdditionalImageUrls
            .filter(url => url)
            .map(url => ({uri: url})),
          video: uploadedVideoUrl ? {uri: uploadedVideoUrl} : null,
        });
      }

      // Close the screen
      if (onClose) {
        onClose();
      }
    } catch (error) {
      const errorMessage =
        errorMessageFromUnknown(error, 'שגיאה בפרסום המודעה. נסה שוב.');
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };


  const publishButton = (
    <PublishAdButton
      onPress={handlePublish}
      uploading={uploading}
      ready={formReadyToPublish}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <TouchableOpacity
          onPress={onClose}
          style={[Platform.OS === 'web' && {cursor: 'pointer'}]}
          activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Title text={'יצירת מודעה'} textStyle={styles.headerTitle} />
      </View>

      <FormScrollProvider
        headerOffset={insets.top + ADS_FORM_HEADER_HEIGHT}
        footerOffset={ADS_FORM_PUBLISH_FOOTER_HEIGHT + insets.bottom}>
        <AdsFormKeyboardScroll
          publishButton={publishButton}
          bottomInset={insets.bottom}>
        {/* For category 3, show new form fields. For other categories, show existing form */}

        <>
          {adsFormFields.map((field, index) => {
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
                    hasVideo={hasVideo}
                    setHasVideo={setHasVideo}
                    videoFile={videoFile}
                    handleVideoUpload={handleVideoUpload}
                    handleVideoChange={handleVideoChange}
                    videoInputRef={videoInputRef}
                  />
                );
              case 'searchpurpose':
                return (
                  <SearchPurpose
                    key="searchpurpose"
                    searchPurpose={searchPurpose}
                    setSearchPurpose={setSearchPurpose}
                  />
                );
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
                    title={category === 3 ? 'התקציב שלי' : 'מחיר'}
                    counterStep={
                      category === 3
                        ? PRICE_COUNTER_STEP_ROOMMATE_BUDGET
                        : PRICE_COUNTER_STEP_DEFAULT
                    }
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
                    showBnbBusinessLogo={
                      category === 5 && bnbHostType === 'business'
                    }
                    bnbBusinessLogo={bnbBusinessLogo}
                    onBnbBusinessLogoPress={handleBnbBusinessLogoUpload}
                    bnbBusinessLogoInputRef={bnbBusinessLogoInputRef}
                    onBnbBusinessLogoWebFileChange={handleBnbBusinessLogoChange}
                  />
                );
              case 'additionaldetails':
                return (
                  <AdditionalDetails
                    key="additionaldetails"
                    description={description}
                    setDescription={setDescription}
                  />
                );
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
                // TODO
                return (
                  <HospitalityNature
                    key="hospitalitynature"
                    preferredApartmentType={preferredApartmentType}
                    setPreferredApartmentType={setPreferredApartmentType}
                  />
                );
              case 'displayoptions':
                // Show display mode choices only when there are 2+ images.
                if (totalSelectedImages < 2) {
                  return null;
                }
                return (
                  <DisplayOptions
                    key="displayoptions"
                    displayOption={displayOption}
                    setDisplayOption={setDisplayOption}
                  />
                );
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
                return <ProposedLand key="proposedland" />;
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
                  />
                );
              case 'generaldetails': {
                const counterDataWithSetters = (field.counterData || []).map(
                  c => {
                    if (c.key) {
                      const raw = generalDetailsCounts[c.key];
                      const num =
                        raw !== undefined && raw !== null ? Number(raw) : 0;
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
                      value: isAreaField
                        ? area
                        : isRoomsField
                          ? rooms
                          : isFloorField
                            ? floor
                            : c.value,
                      setCount: isAreaField
                        ? setArea
                        : isRoomsField
                          ? setRooms
                          : isFloorField
                            ? setFloor
                            : () => {},
                    };
                  },
                );
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
                    propertyType={serviceAndFacilityType}
                    setPropertyType={setServiceAndFacilityType}
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
                return (
                  <PropertyCondition
                    key="propertycondition"
                    condition={condition}
                    setCondition={setCondition}
                  />
                );
              case 'purpose':
                return (
                  <Purpose
                    key="purpose"
                    purpose={purpose}
                    setPurpose={setPurpose}
                  />
                );
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
                    onPressCreateSalesImage={
                      onOpenPostEditor
                        ? () => {
                            const fromForm = parseInt(String(category), 10);
                            const fromInitial =
                              initialCategory != null
                                ? parseInt(String(initialCategory), 10)
                                : NaN;
                            const listingCat =
                              Number.isFinite(fromForm) && fromForm > 0
                                ? fromForm
                                : Number.isFinite(fromInitial) &&
                                    fromInitial > 0
                                  ? fromInitial
                                  : null;
                            onOpenPostEditor(listingCat);
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
                const companyOfficeGeneralDetailsFigma =
                  isCompanyOfficeUpload &&
                  field.groups?.title === 'פרטים כלליים';
                /** פרטים כלליים / הפרויקט מציע / כל בלוק דומה — שורות סגורות כברירת מחדל */
                const accordionForRadioGroups = companyOfficeGeneralDetailsFigma
                  ? false
                  : !toggleable || field.groups?.title === 'הפרויקט מציע';
                return (
                  <GeneralDetailsWithRadio
                    key={`generaldetailswithradio-${index}`}
                    groups={hydrateGeneralDetailsWithRadio(field.groups)}
                    toggleableOfferGroups={toggleable}
                    offerToggleKeyPrefix={toggleable ? String(index) : ''}
                    accordionGroups={accordionForRadioGroups}
                    companyOfficeGeneralDetailsFigma={
                      companyOfficeGeneralDetailsFigma
                    }
                    isOfferGroupExpanded={
                      accordionForRadioGroups
                        ? title =>
                            projectOfferGroupsExpanded[`${index}-${title}`] ===
                            true
                        : undefined
                    }
                    onToggleOfferExpand={
                      accordionForRadioGroups
                        ? toggleProjectOfferExpand(index)
                        : undefined
                    }
                    isOfferGroupIncluded={
                      toggleable
                        ? title =>
                            projectOfferGroupsOn[`${index}-${title}`] !== false
                        : undefined
                    }
                    onToggleOfferGroup={
                      toggleable
                        ? toggleProjectOfferGroup(index, field.groups)
                        : undefined
                    }
                    onAddRepeatableRow={
                      isCompanyOfficeUpload || isCompanyCommercialUpload
                        ? handleCompanyRepeatRowAdd
                        : undefined
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
          })}
        </>

        </AdsFormKeyboardScroll>
      </FormScrollProvider>
      <PublishValidationModal
        visible={publishValidationVisible}
        messages={publishValidationMessages}
        onClose={() => setPublishValidationVisible(false)}
      />
    </View>
  );
};

function AdsFormKeyboardScroll({children, publishButton, bottomInset = 0}) {
  const {scrollRef, keyboardInset, onScroll} = useFormScroll();

  return (
    <View style={styles.keyboardAvoid}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {paddingBottom: keyboardInset > 0 ? keyboardInset + 16 : 24},
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        scrollEventThrottle={16}>
        {children}
      </ScrollView>
      <View
        style={[
          styles.publishFooter,
          {
            paddingBottom: Math.max(bottomInset, 8),
            marginBottom: keyboardInset,
          },
        ]}>
        {publishButton}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1D27',
    maxWidth: 414,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backArrow: {
    color: '#fff',
    fontSize: 32,
  },
  headerTitle: {
    textAlign: 'center',
    flex: 1,
    marginBottom: 0,
    alignSelf: 'center',
    paddingRight: 22,
    // textAlignVertical: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#1E1D27',
  },
  keyboardAvoid: {
    flex: 1,
  },
  publishFooter: {
    backgroundColor: '#1E1D27',
    paddingTop: 4,
  },
  scrollContent: {
    paddingBottom: 24,
    backgroundColor: '#1E1D27',
  },
  required: {
    color: Colors.yellowIcons,
  },
  displayOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  preferenceSection: {
    marginBottom: 20,
  },
  ageRangeContainer: {
    paddingVertical: 10,
  },
  ageRangeText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 5,
    textAlign: 'left',
    fontFamily: 'Rubik-Medium',
  },
  ageRangeSliderContainer: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 10,
  },
  ageRangeSliderTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    position: 'relative',
  },
  ageRangeSliderFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: Colors.yellowIcons,
    borderRadius: 2,
    top: 0,
  },
  ageRangeSliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.yellowIcons,
    borderWidth: 2,
    borderColor: '#fff',
    marginStart: -10,
    marginTop: -8,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 3px rgba(0,0,0,0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
      },
    }),
  },
});

export default AdsForm;
