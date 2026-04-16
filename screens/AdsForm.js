import React, {useState, useRef, useEffect, useContext} from 'react';
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
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {Colors} from '../constants/styles';
import {uploadFile, createListing, toSubscriptionId} from '../utils/api';
import {getUserProfileImageUrl} from '../utils/userProfileImage';
import {
  brokerCategoryForm,
  companyCategoryForm,
  subscriptionTypes,
  userCategoryForm,
} from '../utils/constant';
import {fonts} from '../utils/fonts';
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
} from '../components';
import {CompanyOffersLandSizes} from '../components/FormsElement/CompanyOffersLandSizes';
import {ContextHook} from '../hooks/ContextHook';

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
}) => {
  const [propertyType, setPropertyType] = useState(null);
  const [cancellationPolicy, setCancellationPolicy] = useState(null);
  /** מחיר ללילה — "מחיר במבצע" / Hot deal (saved as ads.hot_deal) */
  const [hotDeal, setHotDeal] = useState(false);
  const [area, setArea] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [floor, setFloor] = useState(1);
  const [amenities, setAmenities] = useState({}); // { amenity: quantity or true }
  const [condition, setCondition] = useState(null);
  const [purpose, setPurpose] = useState('sale'); // 'sale' or 'rent'
  const [price, setPrice] = useState(1000000);
  const [projectName, setProjectName] = useState('');
  const [address, setAddress] = useState('');
  const [landParcel, setLandParcel] = useState('');
  const [landBlock, setLandBlock] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [hasVideo, setHasVideo] = useState(false);
  const [feedDisplayPriority, setFeedDisplayPriority] = useState('video'); // 'video' | 'mainImage' – what to show first on TikTok feed
  const [displayOption, setDisplayOption] = useState(null); // 'collage' or 'slideshow'
  const [exposureLevel, setExposureLevel] = useState('medium'); // 'low' | 'medium' | 'high' – how often ad is shown to others
  const {currentUser} = useContext(ContextHook);
  const formList =
    currentUser?.subscription_type === subscriptionTypes?.user
      ? userCategoryForm
      : currentUser?.subscription_type === subscriptionTypes?.broker
        ? brokerCategoryForm
        : companyCategoryForm;

  const [category, setCategory] = useState(
    initialCategory ? parseInt(initialCategory) : 1,
  ); // Category 1-11 (default: 1, or use initialCategory if provided)

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
  }, [category]);

  useEffect(() => {
    if (initialListing) {
      const gd = initialListing.general_details;
      let host =
        gd && typeof gd === 'object' &&
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
    const cat = initialListing.category != null ? parseInt(initialListing.category) : null;
    if (cat >= 1 && cat <= 12) setCategory(cat);
    setDescription(initialListing.description ?? '');
    setProjectName(
      initialListing.project_name != null
        ? String(initialListing.project_name)
        : '',
    );
    setAddress(initialListing.address != null ? String(initialListing.address) : '');
    let parcel =
      initialListing.land_parcel != null ? String(initialListing.land_parcel) : '';
    let block =
      initialListing.land_block != null ? String(initialListing.land_block) : '';
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
    } else {
      setBudget(initialListing.budget ?? 1000);
    }
    const imgs = initialListing.images ?? (initialListing.image ? [{uri: initialListing.image}] : []);
    if (imgs.length > 0) {
      const first = imgs[0];
      const uri = typeof first === 'string' ? first : first?.uri;
      if (uri) {
        setMainImage({uri});
        setMainImageUrl(uri);
      }
      if (imgs.length > 1) {
        const rest = imgs.slice(1).map(i => (typeof i === 'string' ? {uri: i} : {uri: i?.uri}));
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
    if (initialListing.general_details && typeof initialListing.general_details === 'object') {
      const gd = initialListing.general_details;
      setGeneralDetailsCounts(prev => ({
        ...prev,
        building_count: gd.building_count != null ? Number(gd.building_count) : prev.building_count,
        floor_count: gd.floor_count != null ? Number(gd.floor_count) : prev.floor_count,
        apartment_count: gd.apartment_count != null ? Number(gd.apartment_count) : prev.apartment_count,
      }));
    }
    if (initialListing.project_offers && typeof initialListing.project_offers === 'object') {
      setProjectOffers(prev => ({ ...prev, ...initialListing.project_offers }));
    }
    if (initialListing.construction_status != null) {
      setConstructionStatus(initialListing.construction_status);
    }
    if (['low', 'medium', 'high'].includes(String(initialListing.exposure_level || '').toLowerCase())) {
      setExposureLevel(String(initialListing.exposure_level).toLowerCase());
    }
    const cpRaw = initialListing.cancellation_policy ?? null;
    setCancellationPolicy(
      cpRaw != null && String(cpRaw).trim() !== '' ? String(cpRaw).trim() : null,
    );
    setHotDeal(
      initialListing.hot_deal === true ||
        initialListing.hot_deal === 'true' ||
        initialListing.hot_deal === 't' ||
        initialListing.hot_deal === 1,
    );
  }, [initialListing?.id]);

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

  // File input refs for web
  const mainImageInputRef = useRef(null);
  const [constructionStatus, setConstructionStatus] = useState(null);
  const additionalImageInputRefs = useRef([null, null, null, null]);
  const videoInputRef = useRef(null);
  const bnbBusinessLogoInputRef = useRef(null);
  const [bnbBusinessLogo, setBnbBusinessLogo] = useState(null);
  const [bnbBusinessLogoUrl, setBnbBusinessLogoUrl] = useState(null);
  // Land form radio groups (תב״ע, קרקע במושע, etc.) keyed by field title
  const [landRadioValues, setLandRadioValues] = useState({});
  // פרטים כלליים: כמות מבנים, מספר קומות, כמות דירות (for broker/company category 1)
  const [generalDetailsCounts, setGeneralDetailsCounts] = useState({
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

  const selectedAdditionalImagesCount = additionalImages.filter(Boolean).length;
  const totalSelectedImages =
    (mainImage ? 1 : 0) + selectedAdditionalImagesCount;

  const amenitiesWithQuantity = ['חנייה', 'מרפסת'];

  // Hydrate generaldetailswithradio groups with state so count/price fields are controlled
  const hydrateGeneralDetailsWithRadio = (groups) => {
    if (!groups || !groups.groups) return groups;
    const getValue = (key) => {
      if (key in generalDetailsCounts) return Number(generalDetailsCounts[key]) || 0;
      if (key in projectOffers) return Number(projectOffers[key]) || 0;
      if (key in otherFormValues) return Number(otherFormValues[key]) || 0;
      return 0;
    };
    const setValue = (key, val) => {
      const numVal = key.endsWith('_price') ? Number(val) || 0 : Math.max(0, Number(val) || 0);
      if (key in generalDetailsCounts) {
        setGeneralDetailsCounts(prev => ({ ...prev, [key]: numVal }));
      } else if (key in projectOffers) {
        setProjectOffers(prev => ({ ...prev, [key]: numVal }));
      } else {
        setOtherFormValues(prev => ({ ...prev, [key]: numVal }));
      }
    };
    return {
      ...groups,
      groups: groups.groups.map(grp => ({
        ...grp,
        fields: (grp.fields || []).map(f => {
          if ((f.type === 'count' || f.type === 'price') && f.key) {
            return {
              ...f,
              value: getValue(f.key),
              onChange: (val) => setValue(f.key, val),
            };
          }
          return f;
        }),
      })),
    };
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
          quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          const fileObj = {
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.filename || `photo-${Date.now()}.jpg`,
            file: asset, // Store for upload
          };
          setMainImage(fileObj);
        }
      } catch (error) {
        console.log('errrorr', error);
        alert('שגיאה בבחירת תמונה: ' + error.message);
      }
    }
  };

  const handleMainImageChange = event => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const fileObj = {
        uri: URL.createObjectURL(file),
        type: file.type,
        name: file.name,
        file: file, // Store actual file for upload later
      };
      setMainImage(fileObj);
      // Don't upload yet - will upload when publish button is pressed
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
          quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          const fileObj = {
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.filename || `photo-${Date.now()}.jpg`,
            file: asset,
          };
          const newImages = [...additionalImages];
          newImages[index] = fileObj;
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
      const fileObj = {
        uri: URL.createObjectURL(file),
        type: file.type,
        name: file.name,
        file: file,
      };
      const newImages = [...additionalImages];
      newImages[index] = fileObj;
      setAdditionalImages(newImages);
      // Don't upload yet - will upload when publish button is pressed
    }
  };

  const handleVideoUpload = async () => {
    if (Platform.OS === 'web' && videoInputRef.current) {
      videoInputRef.current.click();
    } else {
      // Native mobile - use expo-image-picker for video
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: true,
          quality: 1,
          // videoMaxDuration: 300, // 5 minutes max
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          const fileObj = {
            uri: asset.uri,
            type: asset.type || 'video/mp4',
            name: asset.filename || `video-${Date.now()}.mp4`,
            file: asset,
          };
          setVideoFile(fileObj);
          setHasVideo(true);
        }
      } catch (error) {
        console.log('errrorr', error);
        alert('שגיאה בבחירת סרטון: ' + error.message);
      }
    }
  };

  const handleVideoChange = event => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const fileObj = {
        uri: URL.createObjectURL(file),
        type: file.type,
        name: file.name,
        file: file,
      };
      setVideoFile(fileObj);
      // Don't upload yet - will upload when publish button is pressed
    }
  };

  const handlePublish = async () => {
    try {
      setUploading(true);

      const fields = formList[category]?.fields || [];
      const fieldKeys = fields.map(f => f.key);

      // Validate only fields that exist in this form
      if (category === 3) {
        if (!searchPurpose) {
          alert('אנא בחר מטרת חיפוש');
          setUploading(false);
          return;
        }
        if (!preferredApartmentType) {
          alert('אנא בחר סוג דירת שותפים מועדף');
          setUploading(false);
          return;
        }
        if (!budget || budget <= 0) {
          alert('אנא הזן תקציב');
          setUploading(false);
          return;
        }
        if (!description) {
          alert('אנא הזן פרטים נוספים');
          setUploading(false);
          return;
        }
      } else {
        if (fieldKeys.includes('propertytype') && !propertyType) {
          alert('אנא בחר סוג נכס');
          setUploading(false);
          return;
        }
        const needsAddressPhoneDescription =
          fieldKeys.includes('address-phone-description') ||
          fieldKeys.includes('propertyaddress') ||
          fieldKeys.includes('landaddress');
        const needsProjectNameAndAddress =
          fieldKeys.includes('propertyaddress');
        if (
          needsAddressPhoneDescription &&
          (!address || !phone || !description)
        ) {
          alert('אנא מלא את כל השדות הנדרשים (כתובת, טלפון, תיאור)');
          setUploading(false);
          return;
        }
        if (
          fieldKeys.includes('landaddress') &&
          (!String(address || '').trim() ||
            !String(landParcel || '').trim() ||
            !String(landBlock || '').trim())
        ) {
          alert('אנא מלא כתובת קרקע, חלקה וגוש');
          setUploading(false);
          return;
        }
        if (
          needsProjectNameAndAddress &&
          (!projectName?.trim() || !address?.trim())
        ) {
          alert('אנא מלא שם פרויקט וכתובת פרויקט');
          setUploading(false);
          return;
        }
        const needsMainImage =
          fieldKeys.includes('multiimagewithvideo') &&
          !fieldKeys.includes('profileverification');
        if (
          needsMainImage &&
          !mainImage &&
          additionalImages.filter(img => img).length === 0
        ) {
          alert('אנא העלה לפחות תמונה אחת');
          setUploading(false);
          return;
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
            alert(
              'בחרו לפחות סוג דירה אחד ב"הפרויקט מציע", או הפעילו שוב שורה שהוסרה (לחיצה על הכותרת).',
            );
            setUploading(false);
            return;
          }
        }
      }

      // Upload files to Supabase storage (or reuse existing URLs when editing)
      let uploadedMainImageUrl = null;
      const uploadedAdditionalImageUrls = [];
      let uploadedVideoUrl = null;
      if (initialListing && mainImage?.uri && !mainImage?.file) {
        uploadedMainImageUrl = mainImage.uri || mainImageUrl;
      }
      for (let i = 0; i < (additionalImages?.length || 0); i++) {
        if (additionalImages[i]?.uri && !additionalImages[i]?.file) {
          uploadedAdditionalImageUrls[i] = additionalImages[i].uri;
        }
      }

      // For category 3, upload user's image if provided, otherwise use fixed image (or keep existing when editing)
      if (category === 3) {
        if (uploadedMainImageUrl) {
          // Already have URL from initialListing (edit mode)
        } else if (mainImage && mainImage.file) {
          // User uploaded their own image - upload it
          try {
            setUploadProgress(prev => ({...prev, mainImage: true}));
            const formData = new FormData();
            formData.append('file', mainImage.file);
            formData.append('folder', 'listings/images');

            const response = await fetch(
              `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/upload`,
              {
                method: 'POST',
                body: formData,
              },
            );

            const data = await response.json();
            if (data.success && data.url) {
              uploadedMainImageUrl = data.url;
            } else {
              throw new Error(data.error || 'Failed to upload image');
            }
          } catch (error) {
            alert('שגיאה בהעלאת התמונה. נסה שוב.');
            setUploading(false);
            return;
          } finally {
            setUploadProgress(prev => ({...prev, mainImage: false}));
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
                `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/upload`,
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

      // Upload main image (skip for category 3; skip if already have URL from edit)
      if (category !== 3 && !uploadedMainImageUrl && mainImage && mainImage.file) {
        try {
          setUploadProgress(prev => ({...prev, mainImage: true}));
          const formData = new FormData();
          formData.append('file', mainImage.file);
          formData.append('folder', 'listings/images');

          const response = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/upload`,
            {
              method: 'POST',
              body: formData,
            },
          );

          const data = await response.json();
          if (data.success && data.url) {
            uploadedMainImageUrl = data.url;
          } else {
            throw new Error(data.error || 'Failed to upload main image');
          }
        } catch (error) {
          alert('שגיאה בהעלאת התמונה הראשית. נסה שוב.');
          setUploading(false);
          return;
        } finally {
          setUploadProgress(prev => ({...prev, mainImage: false}));
        }
      }

      // Upload additional images
      for (let i = 0; i < additionalImages.length; i++) {
        if (additionalImages[i] && additionalImages[i].file) {
          try {
            setUploadProgress(prev => ({
              ...prev,
              [`additional-${i}`]: true,
            }));
            const formData = new FormData();
            formData.append('file', additionalImages[i].file);
            formData.append('folder', 'listings/images');

            const response = await fetch(
              `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/upload`,
              {
                method: 'POST',
                body: formData,
              },
            );

            const data = await response.json();
            if (data.success && data.url) {
              uploadedAdditionalImageUrls[i] = data.url;
            } else {
            }
          } catch (error) {
          } finally {
            setUploadProgress(prev => ({
              ...prev,
              [`additional-${i}`]: false,
            }));
          }
        }
      }

      // Upload video if exists
      if (videoFile && videoFile.file) {
        try {
          setUploadProgress(prev => ({...prev, video: true}));
          const formData = new FormData();
          formData.append('file', videoFile.file);
          formData.append('folder', 'listings/videos');

          const response = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/upload`,
            {
              method: 'POST',
              body: formData,
            },
          );

          const data = await response.json();
          if (data.success && data.url) {
            uploadedVideoUrl = data.url;
          } else {
          }
        } catch (error) {
        } finally {
          setUploadProgress(prev => ({...prev, video: false}));
        }
      }

      let uploadedBnbBusinessLogoUrl = null;
      if (category === 5 && bnbHostType === 'business') {
        if (initialListing && bnbBusinessLogo?.uri && !bnbBusinessLogo?.file) {
          uploadedBnbBusinessLogoUrl =
            bnbBusinessLogo.uri || bnbBusinessLogoUrl;
        } else if (bnbBusinessLogo?.file) {
          try {
            setUploadProgress(prev => ({...prev, bnbBusinessLogo: true}));
            const formData = new FormData();
            formData.append('file', bnbBusinessLogo.file);
            formData.append('folder', 'listings/images');
            const response = await fetch(
              `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/upload`,
              {
                method: 'POST',
                body: formData,
              },
            );
            const data = await response.json();
            if (data.success && data.url) {
              uploadedBnbBusinessLogoUrl = data.url;
            } else {
              throw new Error(data.error || 'Failed to upload logo');
            }
          } catch (error) {
            alert('שגיאה בהעלאת הלוגו. נסה שוב.');
            setUploading(false);
            return;
          } finally {
            setUploadProgress(prev => ({...prev, bnbBusinessLogo: false}));
          }
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
              subscriptionId: toSubscriptionId(currentUser?.id) || null,
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
              subscriptionId: toSubscriptionId(currentUser?.id) || null,
              // Standard listing fields for other categories
              propertyType,
              area: parseInt(area) || 1,
              rooms: parseInt(rooms) || 1,
              floor: parseInt(floor) || 1,
              amenities: amenities || {},
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
              landInMortgage: landRadioValues['קרקע במושע'] || null,
              permit: landRadioValues['היתר'] || null,
              agriculturalLand: landRadioValues['קרקע חקלאית'] || null,
              landOwnership: landRadioValues['בעלות קרקע'] || null,
              generalDetails:
                Object.keys(generalDetailsCounts).length > 0
                  ? { ...generalDetailsCounts }
                  : undefined,
              projectOffers: (() => {
                const merged = { ...projectOffers, ...otherFormValues };
                const hasAny = Object.values(merged).some(v => v !== 0 && v !== undefined && v !== '');
                return hasAny ? merged : undefined;
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
              ...(fieldKeys.includes('cancellationpolicy') &&
                cancellationPolicy && {
                  cancellationPolicy,
                }),
              ...(fieldKeys.includes('pricepernight') && {
                pricePerNight: parseFloat(price) || 0,
                hotDeal: !!hotDeal,
              }),
            };

      // Create listing in database
      const result = await createListing(listingData);

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
      const errorMessage = error.message || 'שגיאה בפרסום המודעה. נסה שוב.';
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          style={[
            styles.backButton,
            Platform.OS === 'web' && {cursor: 'pointer'},
          ]}
          activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Title text={'יצירת מודעה'} textStyle={styles.headerTitle} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* For category 3, show new form fields. For other categories, show existing form */}

        <>
          {formList[category] &&
            formList[category].fields.map((field, index) => {
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
                    />
                  );
                case 'contactdetails':
                  return (
                    <ContactDetails
                      key="contactdetails"
                      showBnbBusinessLogo={
                        category === 5 && bnbHostType === 'business'
                      }
                      bnbBusinessLogo={bnbBusinessLogo}
                      onBnbBusinessLogoPress={handleBnbBusinessLogoUpload}
                      bnbBusinessLogoInputRef={bnbBusinessLogoInputRef}
                      onBnbBusinessLogoWebFileChange={
                        handleBnbBusinessLogoChange
                      }
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
                      addMorePhotos={field.addMorePhotos}
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
                    (c) => {
                      if (c.key) {
                        const raw = generalDetailsCounts[c.key];
                        const num =
                          raw !== undefined && raw !== null ? Number(raw) : 0;
                        return {
                          ...c,
                          value: Number.isFinite(num) ? num : 0,
                          setCount: (val) => {
                            const n = Math.max(0, Number(val) || 0);
                            setGeneralDetailsCounts((prev) => ({
                              ...prev,
                              [c.key]: n,
                            }));
                          },
                        };
                      }
                      const isAreaField = c.title && c.title.includes('שטח');
                      const isRoomsField =
                        c.title && c.title.includes('חדרים');
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
                      counterData={counterDataWithSetters}
                    />
                  );
                }
                case 'serviceandfacility':
                  return (
                    <ServiceAndFacility
                      key="serviceandfacility"
                      propertyType={propertyType}
                      setPropertyType={setPropertyType}
                      data={field.data || []}
                      title={field.title}
                    />
                  );
                case 'accommodationoffers':
                  return <AccommodationOffers key="accommodationoffers" />;
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
                      mainImage={mainImage}
                      handleMainImageUpload={handleMainImageUpload}
                      handleMainImageChange={handleMainImageChange}
                      mainImageInputRef={mainImageInputRef}
                      uploadProgress={uploadProgress}
                    />
                  );
                case 'saleatpresale':
                  return <SaleAtPreSale key="saleatpresale" />;
                case 'generaldetailswithradio': {
                  const toggleable =
                    field.groups?.toggleableOfferGroups === true;
                  return (
                    <GeneralDetailsWithRadio
                      key={`generaldetailswithradio-${index}`}
                      groups={hydrateGeneralDetailsWithRadio(field.groups)}
                      toggleableOfferGroups={toggleable}
                      offerToggleKeyPrefix={toggleable ? String(index) : ''}
                      isOfferGroupIncluded={
                        toggleable
                          ? title =>
                              projectOfferGroupsOn[`${index}-${title}`] !==
                              false
                          : undefined
                      }
                      onToggleOfferGroup={
                        toggleable
                          ? toggleProjectOfferGroup(index, field.groups)
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
                    <CompanyOffersLandSizes key="companyofferslandsizes" />
                  );
                default:
                  return null;
              }
            })}
        </>

        {/* Exposure level: how often this ad is shown to other users */}
        <FormContainer title="חשיפה בפייד">
          <View style={styles.exposureRow}>
            {[
              { value: 'low', label: 'נמוכה' },
              { value: 'medium', label: 'בינונית' },
              { value: 'high', label: 'גבוהה' },
            ].map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                onPress={() => setExposureLevel(value)}
                style={[styles.exposureOption, exposureLevel === value && styles.exposureOptionActive]}
                activeOpacity={0.7}>
                <Text style={[styles.exposureOptionText, exposureLevel === value && styles.exposureOptionTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.exposureHint}>
            {exposureLevel === 'low' && 'המודעה תופיע פחות למשתמשים אחרים'}
            {exposureLevel === 'medium' && 'חשיפה רגילה'}
            {exposureLevel === 'high' && 'המודעה תופיע יותר למשתמשים אחרים'}
          </Text>
        </FormContainer>

        {/* Publish Button */}
        <TouchableOpacity
          onPress={handlePublish}
          disabled={uploading}
          style={
            Platform.OS === 'web' && !uploading
              ? {cursor: 'pointer'}
              : undefined
          }
          activeOpacity={0.7}>
          <LinearGradient
            colors={['#FEE787', '#BD9947', '#9C6522']}
            locations={[0.0456, 0.5076, 0.8831]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.publishButton}>
            {uploading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.publishButtonText}>פרסם</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1D27',
    maxWidth: 414,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 15,
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
  scrollContent: {
    paddingBottom: 40,
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
  displayOption: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 25,
  },
  exposureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  exposureOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  exposureOptionActive: {
    backgroundColor: Colors.yellowIcons || '#D4AF37',
  },
  exposureOptionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  exposureOptionTextActive: {
    color: '#1a1a2e',
  },
  exposureHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  publishButton: {
    borderRadius: 25,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
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
    marginLeft: -10,
    marginTop: -8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});

export default AdsForm;
