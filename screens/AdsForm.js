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
import {
  brokerCategoryForm,
  categoryImages,
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
  ProfilePictureUpload,
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
  ConsructionStatus,
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
const AdsForm = ({onClose, onPublish, initialCategory = null}) => {
  const [propertyType, setPropertyType] = useState(null);
  const [cancellationPolicy, setCancellationPolicy] = useState(null);
  const [area, setArea] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [floor, setFloor] = useState(1);
  const [amenities, setAmenities] = useState({}); // { amenity: quantity or true }
  const [condition, setCondition] = useState(null);
  const [purpose, setPurpose] = useState('sale'); // 'sale' or 'rent'
  const [price, setPrice] = useState(1000000);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [hasVideo, setHasVideo] = useState(false);
  const [displayOption, setDisplayOption] = useState(null); // 'collage' or 'slideshow'
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

  // Update category when initialCategory prop changes
  useEffect(() => {
    if (initialCategory) {
      const categoryNum = parseInt(initialCategory);
      if (categoryNum >= 1 && categoryNum <= 11) {
        setCategory(categoryNum);
      }
    }
  }, [initialCategory]);

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
  const [consructionStatus, setConsructionStatus] = useState(null);
  const additionalImageInputRefs = useRef([null, null, null, null]);
  const videoInputRef = useRef(null);
  // Land form radio groups (תב״ע, קרקע במושע, etc.) keyed by field title
  const [landRadioValues, setLandRadioValues] = useState({});

  const amenitiesWithQuantity = ['חנייה', 'מרפסת'];

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
        if (needsAddressPhoneDescription && (!address || !phone || !description)) {
          alert('אנא מלא את כל השדות הנדרשים (כתובת, טלפון, תיאור)');
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
      }

      // Upload files to Supabase storage
      let uploadedMainImageUrl = null;
      const uploadedAdditionalImageUrls = [];
      let uploadedVideoUrl = null;

      // For category 3, upload user's image if provided, otherwise use fixed image
      if (category === 3) {
        if (mainImage && mainImage.file) {
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

      // Upload main image (skip for category 3)
      if (category !== 3 && mainImage && mainImage.file) {
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
              address: address.trim(),
              phone: phone.trim(),
              description: description.trim(),
              displayOption: displayOption || null,
              mainImageUrl: uploadedMainImageUrl,
              additionalImageUrls: uploadedAdditionalImageUrls.filter(
                url => url !== null && url !== undefined && url !== '',
              ),
              videoUrl: uploadedVideoUrl,
              hasVideo: !!uploadedVideoUrl,
              category: listingCategory,
              // Land form radio values (when present)
              planApproval: landRadioValues['תב״ע'] || null,
              landInMortgage: landRadioValues['קרקע במושע'] || null,
              permit: landRadioValues['היתר'] || null,
              agriculturalLand: landRadioValues['קרקע חקלאית'] || null,
              landOwnership: landRadioValues['בעלות קרקע'] || null,
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
          style={[styles.backButton, Platform.OS === 'web' && {cursor: 'pointer'}]}
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
                      price={price}
                      setPrice={setPrice}
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
                    />
                  );
                case 'contactdetails':
                  return <ContactDetails key="contactdetails" />;
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
                      address={address}
                      setAddress={setAddress}
                      phone={phone}
                      setPhone={setPhone}
                      description={description}
                      setDescription={setDescription}
                    />
                  );
                case 'generaldetails':
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
                      counterData={field.counterData}
                    />
                  );
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
                case 'generaldetailswithradio':
                  return (
                    <GeneralDetailsWithRadio
                      key={`generaldetailswithradio-${index}`}
                      groups={field.groups}
                    />
                  );
                case 'consructionstatus':
                  return (
                    <ConsructionStatus
                      key="consructionstatus"
                      data={field.data || []}
                      title={field.title}
                      consructionStatus={consructionStatus}
                      setConsructionStatus={setConsructionStatus}
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

        {/* Publish Button */}
        <TouchableOpacity
          onPress={handlePublish}
          disabled={uploading}
          style={Platform.OS === 'web' && !uploading ? {cursor: 'pointer'} : undefined}
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
