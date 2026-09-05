import React, {useState, useRef, useEffect, useMemo} from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Image,
  Platform,
  ActivityIndicator,
  PanResponder,
  Dimensions,
  I18nManager,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  AD_VIDEO_PICKER_OPTIONS,
  ensureMediaLibraryPermission,
} from '../utils/mediaLibraryPermission';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {uploadFile, createListing} from '../utils/api';
import {categoryImages} from '../utils/constant';
import {FigmaCheckbox} from '../components/FigmaCheckbox';
import AmenityQuantityPill from '../components/AmenityQuantityPill';
import {RadioIcon} from '../components/FormsElement/RadioIcon';
import PublishValidationModal from '../components/PublishValidationModal';
import {PRICE_COUNTER_STEP_DEFAULT} from '../utils/priceInput';
import {flexStart, formHeadingStyle, formRtlContainerStyle} from '../utils/rtlLayout';
import {CountUpdate} from '../components/FormsElement/CountUpdate';
import {CardPriceField} from '../components/FormsElement/CardPriceField';
import {Title} from '../components/FormsElement/Title';
import {PublishAdButton} from '../components/FormsElement/PublishAdButton';
import {VideoPreviewThumb} from '../components/FormsElement/VideoPreviewThumb';
import {Divider} from '../components/FormsElement/Divider';

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
      <Text style={styles.preferenceLabel}>גיל מועדף</Text>
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
 * OfficeListingScreen Component
 * Form for creating an office listing
 */
const OfficeListingScreen = ({onClose, onPublish, initialCategory = null}) => {
  const insets = useSafeAreaInsets();
  const [propertyType, setPropertyType] = useState(null);
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

  // Media uploads - store file objects and uploaded URLs
  const [mainImage, setMainImage] = useState(null);
  const [mainImageUrl, setMainImageUrl] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [additionalImageUrls, setAdditionalImageUrls] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  // Loading states
  const [uploading, setUploading] = useState(false);
  const [publishValidationVisible, setPublishValidationVisible] =
    useState(false);
  const [publishValidationMessages, setPublishValidationMessages] = useState(
    [],
  );
  const [uploadProgress, setUploadProgress] = useState({});

  // File input refs for web
  const mainImageInputRef = useRef(null);
  const additionalImageInputRefs = useRef([null, null, null, null]);
  const videoInputRef = useRef(null);

  // Request camera and media library permissions on mount (native)
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
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setMainImage({
          uri: asset.uri,
          type: asset.type || asset.mimeType || 'image/jpeg',
          name: asset.fileName || asset.filename || `photo-${Date.now()}.jpg`,
          file: asset,
        });
      }
    } catch (error) {
      alert('שגיאה בבחירת תמונה: ' + error.message);
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
      return;
    }
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
          type: asset.type || asset.mimeType || 'image/jpeg',
          name: asset.fileName || asset.filename || `photo-${Date.now()}.jpg`,
          file: asset,
        };
        const newImages = [...additionalImages];
        newImages[index] = fileObj;
        setAdditionalImages(newImages);
      }
    } catch (error) {
      alert('שגיאה בבחירת תמונה: ' + error.message);
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
      return;
    }
    try {
      const permitted = await ensureMediaLibraryPermission();
      if (!permitted) return;
      const result = await ImagePicker.launchImageLibraryAsync(
        AD_VIDEO_PICKER_OPTIONS,
      );

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setVideoFile({
          uri: asset.uri,
          type: asset.type || asset.mimeType || 'video/mp4',
          name: asset.fileName || asset.filename || `video-${Date.now()}.mp4`,
          file: asset,
        });
        setHasVideo(true);
      }
    } catch (error) {
      alert('שגיאה בבחירת סרטון: ' + error.message);
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
      setHasVideo(true);
    }
  };

  const publishBlockingErrors = useMemo(() => {
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
      if (!propertyType) {
        publishErrors.push('בחרו סוג נכס');
      }
      if (!String(address || '').trim()) {
        publishErrors.push('הזינו כתובת');
      }
      if (!String(phone || '').trim()) {
        publishErrors.push('הזינו טלפון');
      }
      if (!String(description || '').trim()) {
        publishErrors.push('הזינו תיאור');
      }
      if (!mainImage && additionalImages.filter(img => img).length === 0) {
        publishErrors.push('העלו לפחות תמונה אחת');
      }
    }
    return publishErrors;
  }, [
    category,
    searchPurpose,
    preferredApartmentType,
    budget,
    description,
    propertyType,
    address,
    phone,
    mainImage,
    additionalImages,
  ]);

  const formReadyToPublish = publishBlockingErrors.length === 0;

  const handlePublish = async () => {
    try {
      setUploading(true);

      const publishErrors = [...publishBlockingErrors];
      if (publishErrors.length > 0) {
        setPublishValidationMessages([...new Set(publishErrors)]);
        setPublishValidationVisible(true);
        setUploading(false);
        return;
      }

      // Upload files directly to Supabase (signed URL) — never through Vercel.
      let uploadedMainImageUrl = null;
      const uploadedAdditionalImageUrls = [];
      let uploadedVideoUrl = null;

      const uploadMedia = async (fileObj, folder, progressKey) => {
        if (!fileObj?.uri && !fileObj?.file) return null;
        setUploadProgress(prev => ({...prev, [progressKey]: true}));
        try {
          const result = await uploadFile(
            {
              uri: fileObj.uri,
              type: fileObj.type,
              name: fileObj.name,
              file: fileObj.file,
              size: fileObj.file?.size || fileObj.fileSize,
              fileSize: fileObj.fileSize,
            },
            folder,
            {
              timeoutMs: String(folder).includes('video') ? 300000 : 120000,
            },
          );
          if (!result?.url) {
            throw new Error(result?.error || 'Failed to upload file');
          }
          return result.url;
        } finally {
          setUploadProgress(prev => ({...prev, [progressKey]: false}));
        }
      };

      // For category 3, upload user's image if provided, otherwise use fixed image
      if (category === 3) {
        if (mainImage && (mainImage.uri || mainImage.file)) {
          try {
            uploadedMainImageUrl = await uploadMedia(
              mainImage,
              'listings/images',
              'mainImage',
            );
          } catch (error) {
            console.error('Error uploading user image for category 3:', error);
            alert('שגיאה בהעלאת התמונה. נסה שוב.');
            setUploading(false);
            return;
          }
        } else {
          try {
            if (Platform.OS === 'web') {
              setUploadProgress(prev => ({...prev, mainImage: true}));
              const imageModule = require('../assets/image-insert-2.png');
              const imageUrl =
                typeof imageModule === 'string'
                  ? imageModule
                  : imageModule.default || imageModule;
              const response = await fetch(imageUrl);
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
                throw new Error(
                  uploadData?.error || 'Failed to upload fixed image',
                );
              }
            }
          } catch (error) {
            console.error('Error uploading fixed image for category 3:', error);
            alert('שגיאה בהעלאת התמונה הקבועה. נסה שוב.');
            setUploading(false);
            return;
          } finally {
            setUploadProgress(prev => ({...prev, mainImage: false}));
          }
        }
      }

      // Upload main image (skip for category 3)
      if (category !== 3 && mainImage && (mainImage.uri || mainImage.file)) {
        try {
          uploadedMainImageUrl = await uploadMedia(
            mainImage,
            'listings/images',
            'mainImage',
          );
        } catch (error) {
          console.error('Error uploading main image:', error);
          alert(
            error?.message?.includes('גדול מדי')
              ? error.message
              : 'שגיאה בהעלאת התמונה הראשית. נסה שוב.',
          );
          setUploading(false);
          return;
        }
      }

      // Upload additional images
      for (let i = 0; i < additionalImages.length; i++) {
        if (additionalImages[i] && (additionalImages[i].uri || additionalImages[i].file)) {
          try {
            uploadedAdditionalImageUrls[i] = await uploadMedia(
              additionalImages[i],
              'listings/images',
              `additional-${i}`,
            );
          } catch (error) {
            console.error(`Error uploading additional image ${i}:`, error);
          }
        }
      }

      // Upload video if exists — signed URL path (large files must not hit Vercel)
      if (videoFile && (videoFile.uri || videoFile.file)) {
        try {
          uploadedVideoUrl = await uploadMedia(
            videoFile,
            'listings/videos',
            'video',
          );
        } catch (error) {
          console.error('Error uploading video:', error);
          alert(
            error?.message ||
              'שגיאה בהעלאת הסרטון. נסו סרטון קצר יותר או באיכות נמוכה יותר.',
          );
          setUploading(false);
          return;
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
      console.error('Error publishing listing:', error);
      const errorMessage = error.message || 'שגיאה בפרסום המודעה. נסה שוב.';
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={{height: insets.top}} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>יצירת מודעה</Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="always"
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Container 0: Category Selection */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>
            בחר קטגוריה<Text style={styles.required}>*</Text>
          </Text>
          <ScrollView
            keyboardShouldPersistTaps="always"
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScrollView}>
            <View style={styles.categoryGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(catNum => (
                <TouchableOpacity
                  key={catNum}
                  style={[
                    styles.categoryItem,
                    category === catNum && styles.categoryItemSelected,
                  ]}
                  onPress={() => setCategory(catNum)}>
                  <Image
                    source={categoryImages[catNum]}
                    style={styles.categoryImage}
                    resizeMode="cover"
                  />
                  {category === catNum && (
                    <View style={styles.categorySelectedIndicator}>
                      <Text style={styles.categorySelectedText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Container 1: Images and Video */}
        {/* For category 3 (חדש מקבלן), show fixed image instead of upload fields */}
        {category === 3 ? (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>
              תמונת נושא או הדמייה<Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.fixedImageContainer}>
              {mainImage ? (
                <Image
                  source={{uri: mainImage.uri}}
                  style={styles.fixedImage}
                  resizeMode="contain"
                />
              ) : (
                <Image
                  source={require('../assets/image-insert-2.png')}
                  style={styles.fixedImage}
                  resizeMode="contain"
                />
              )}
              <TouchableOpacity
                style={styles.uploadButtonOverlay}
                onPress={handleMainImageUpload}
                disabled={uploadProgress.mainImage}>
                {uploadProgress.mainImage && (
                  <ActivityIndicator size="small" color="#fff" />
                )}
              </TouchableOpacity>
              {Platform.OS === 'web' && (
                <input
                  ref={mainImageInputRef}
                  type="file"
                  accept="image/*"
                  style={{display: 'none'}}
                  onChange={handleMainImageChange}
                />
              )}
            </View>

            <TouchableOpacity
              style={styles.videoOption}
              onPress={() => setHasVideo(!hasVideo)}>
              <Text style={styles.videoOptionText}>הוסף סרטון</Text>
              <View style={styles.radioSpacer} />
              <RadioIcon isSelected={hasVideo} useFigmaStyle />
            </TouchableOpacity>

            {/* Video Upload Section - shown when checkbox is selected */}
            {hasVideo && (
              <View style={styles.videoUploadSection}>
                <TouchableOpacity
                  style={styles.videoUploadArea}
                  onPress={handleVideoUpload}
                  disabled={uploadProgress.video}>
                  {uploadProgress.video ? (
                    <View style={styles.videoPreview}>
                      <ActivityIndicator size="large" color="#fff" />
                      <Text style={styles.videoPreviewText}>מעלה סרטון...</Text>
                    </View>
                  ) : videoFile?.uri ? (
                    <VideoPreviewThumb uri={videoFile.uri} style={styles.videoPreviewFill} />
                  ) : (
                    <View style={styles.videoUploadContent}>
                      <Image
                        source={require('../assets/image-insert.png')}
                        style={styles.videoUploadImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  {Platform.OS === 'web' && (
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      style={{display: 'none'}}
                      onChange={handleVideoChange}
                    />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>
              תמונת נושא או הדמייה<Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.imageUploadArea}
              onPress={handleMainImageUpload}>
              {uploadProgress.mainImage ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.uploadButtonText}>מעלה תמונה...</Text>
                </View>
              ) : mainImage ? (
                <Image
                  source={{uri: mainImage.uri}}
                  style={styles.uploadedImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.uploadButtonContainer}>
                  <Text style={styles.uploadButtonText}>העלאת תמונה</Text>
                </View>
              )}
              {Platform.OS === 'web' && (
                <input
                  ref={mainImageInputRef}
                  type="file"
                  accept="image/*"
                  style={{display: 'none'}}
                  onChange={handleMainImageChange}
                />
              )}
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, styles.sectionTitleMargin]}>
              תמונות נוספות
            </Text>
            <View style={styles.additionalImagesGrid}>
              {[0, 1, 2, 3].map(index => (
                <TouchableOpacity
                  key={index}
                  style={styles.imagePlaceholder}
                  onPress={() => handleAdditionalImageUpload(index)}
                  disabled={uploadProgress[`additional-${index}`]}>
                  {uploadProgress[`additional-${index}`] ? (
                    <View style={styles.uploadingContainer}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  ) : additionalImages[index] ? (
                    <Image
                      source={{uri: additionalImages[index].uri}}
                      style={styles.uploadedImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.plusIcon}>+</Text>
                  )}
                  {Platform.OS === 'web' && (
                    <input
                      ref={el => (additionalImageInputRefs.current[index] = el)}
                      type="file"
                      accept="image/*"
                      style={{display: 'none'}}
                      onChange={e => handleAdditionalImageChange(index, e)}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.videoOption}
              onPress={() => setHasVideo(!hasVideo)}>
              <Text style={styles.videoOptionText}>הוסף סרטון</Text>
              <View style={styles.radioSpacer} />
              <RadioIcon isSelected={hasVideo} useFigmaStyle />
            </TouchableOpacity>

            {/* Video Upload Section - shown when checkbox is selected */}
            {hasVideo && (
              <View style={styles.videoUploadSection}>
                <TouchableOpacity
                  style={styles.videoUploadArea}
                  onPress={handleVideoUpload}
                  disabled={uploadProgress.video}>
                  {uploadProgress.video ? (
                    <View style={styles.videoPreview}>
                      <ActivityIndicator size="large" color="#fff" />
                      <Text style={styles.videoPreviewText}>מעלה סרטון...</Text>
                    </View>
                  ) : videoFile?.uri ? (
                    <VideoPreviewThumb uri={videoFile.uri} style={styles.videoPreviewFill} />
                  ) : (
                    <Image
                      source={require('../assets/image-insert.png')}
                      style={styles.videoUploadImage}
                      resizeMode="contain"
                    />
                  )}
                  {Platform.OS === 'web' && (
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      style={{display: 'none'}}
                      onChange={handleVideoChange}
                    />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* For category 3, show new form fields. For other categories, show existing form */}
        {category === 3 ? (
          <>
            {/* Container 2: Search Purpose */}
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>
                מטרת החיפוש<Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOptionWithDescription}
                  onPress={() => setSearchPurpose('enter')}>
                  <View style={styles.radioOptionContent}>
                    <Text style={styles.radioOptionTitle}>מחפש להיכנס</Text>
                    <Text style={styles.radioOptionDescription}>
                      אני מחפש להיכנס לדירת שותפים קיימת.
                    </Text>
                  </View>
                  <View style={styles.radioSpacer} />
                  {searchPurpose === 'enter' ? (
                    <LinearGradient
                      colors={['#FFE56A', '#F7C63A', '#E5A80F']}
                      locations={[0.0456, 0.5076, 0.8831]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 1}}
                      style={styles.radioButtonGradient}>
                      <Image
                        source={require('../assets/checkbox-selected.png')}
                        style={styles.radioButtonSelected}
                        resizeMode="contain"
                      />
                    </LinearGradient>
                  ) : (
                    <View style={styles.radioButton} />
                  )}
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.radioOptionWithDescription}
                  onPress={() => setSearchPurpose('bring_in')}>
                  <View style={styles.radioOptionContent}>
                    <Text style={styles.radioOptionTitle}>מחפש להכניס</Text>
                    <Text style={styles.radioOptionDescription}>
                      מחפש לי חדר בדירה השותפים שבה אני גר. אני מעוניין למצוא
                      שותף חדש לגור איתי.
                    </Text>
                  </View>
                  <View style={styles.radioSpacer} />
                  {searchPurpose === 'bring_in' ? (
                    <LinearGradient
                      colors={['#FFE56A', '#F7C63A', '#E5A80F']}
                      locations={[0.0456, 0.5076, 0.8831]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 1}}
                      style={styles.radioButtonGradient}>
                      <Image
                        source={require('../assets/checkbox-selected.png')}
                        style={styles.radioButtonSelected}
                        resizeMode="contain"
                      />
                    </LinearGradient>
                  ) : (
                    <View style={styles.radioButton} />
                  )}
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.radioOptionWithDescription}
                  onPress={() => setSearchPurpose('partner')}>
                  <View style={styles.radioOptionContent}>
                    <Text style={styles.radioOptionTitle}>מחפש שותף</Text>
                    <Text style={styles.radioOptionDescription}>
                      אני מחפש ליצור חיבורים חדשים עם אנשים ולחפש ביחד דירת
                      שותפים.
                    </Text>
                  </View>
                  <View style={styles.radioSpacer} />
                  {searchPurpose === 'partner' ? (
                    <LinearGradient
                      colors={['#FFE56A', '#F7C63A', '#E5A80F']}
                      locations={[0.0456, 0.5076, 0.8831]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 1}}
                      style={styles.radioButtonGradient}>
                      <Image
                        source={require('../assets/checkbox-selected.png')}
                        style={styles.radioButtonSelected}
                        resizeMode="contain"
                      />
                    </LinearGradient>
                  ) : (
                    <View style={styles.radioButton} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Container 3: Preferred Apartment Type */}
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>
                סוג דירת השותפים המועדף<Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.radioGroup}>
                {[
                  {value: 'regular', label: 'דירה רגילה'},
                  {value: 'studio', label: 'דירת סטודיו'},
                  {value: 'garden', label: 'דירת גן'},
                  {value: 'duplex', label: 'דופלקס'},
                  {value: 'penthouse', label: 'נטהאוז'},
                  {value: 'private', label: 'בית פרטי'},
                ].map((option, index) => (
                  <React.Fragment key={option.value}>
                    {index > 0 && <View style={styles.divider} />}
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setPreferredApartmentType(option.value)}>
                      <Text style={styles.radioOptionText}>{option.label}</Text>
                      <View style={styles.radioSpacer} />
                      {preferredApartmentType === option.value ? (
                        <LinearGradient
                          colors={['#FFE56A', '#F7C63A', '#E5A80F']}
                          locations={[0.0456, 0.5076, 0.8831]}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 1}}
                          style={styles.radioButtonGradient}>
                          <Image
                            source={require('../assets/checkbox-selected.png')}
                            style={styles.radioButtonSelected}
                            resizeMode="contain"
                          />
                        </LinearGradient>
                      ) : (
                        <View style={styles.radioButton} />
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            </View>

            {/* Container 4: Preferences */}
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>העדפות</Text>

              {/* Gender */}
              <View style={styles.preferenceSection}>
                <Text style={styles.preferenceLabel}>מין</Text>
                <View style={styles.genderButtons}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      preferredGender === 'female' &&
                        styles.genderButtonSelected,
                    ]}
                    onPress={() => setPreferredGender('female')}>
                    <Text
                      style={[
                        styles.genderButtonText,
                        preferredGender === 'female' &&
                          styles.genderButtonTextSelected,
                      ]}>
                      אישה
                    </Text>
                    <View style={styles.radioSpacer} />
                    {preferredGender === 'female' ? (
                      <View style={styles.genderRadioSelected} />
                    ) : (
                      <View style={styles.genderRadioUnselected} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      preferredGender === 'male' && styles.genderButtonSelected,
                    ]}
                    onPress={() => setPreferredGender('male')}>
                    <Text
                      style={[
                        styles.genderButtonText,
                        preferredGender === 'male' &&
                          styles.genderButtonTextSelected,
                      ]}>
                      גבר
                    </Text>
                    <View style={styles.radioSpacer} />
                    {preferredGender === 'male' ? (
                      <View style={styles.genderRadioSelected} />
                    ) : (
                      <View style={styles.genderRadioUnselected} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Age Range */}
              <AgeRangeSlider
                minValue={preferredAgeMin}
                maxValue={preferredAgeMax}
                onMinChange={setPreferredAgeMin}
                onMaxChange={setPreferredAgeMax}
              />

              {/* Checkboxes */}
              <View style={styles.preferenceSection}>
                {[
                  {key: 'nonSmokers', label: 'ללא מעשנים'},
                  {key: 'students', label: 'סטודנטים'},
                  {key: 'stableJob', label: 'בעלי עבודה מסודרת'},
                  {key: 'occasionalJob', label: 'בעלי עבודה מזדמנת'},
                  {key: 'immediateEntry', label: 'כניסה מיידית'},
                ].map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={styles.preferenceCheckbox}
                    onPress={() =>
                      setPreferences({
                        ...preferences,
                        [option.key]: !preferences[option.key],
                      })
                    }>
                    <Text style={styles.preferenceCheckboxText}>
                      {option.label}
                    </Text>
                    <View style={styles.radioSpacer} />
                    {preferences[option.key] ? (
                      <LinearGradient
                        colors={['#FFE56A', '#F7C63A', '#E5A80F']}
                        locations={[0.0456, 0.5076, 0.8831]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                        style={styles.radioButtonGradient}>
                        <Image
                          source={require('../assets/checkbox-selected.png')}
                          style={styles.radioButtonSelected}
                          resizeMode="contain"
                        />
                      </LinearGradient>
                    ) : (
                      <View style={styles.radioButton} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Container 5: Budget */}
            <View style={styles.formContainer}>
              <Title text="התקציב שלי" required />
              <CardPriceField
                price={budget}
                setPrice={setBudget}
                counterStep={1000}
              />
            </View>

            {/* Container 6: Additional Details */}
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>פרטים נוספים</Text>
              <Text style={styles.inputLabel}>
                פרטים נוספים<Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder="כתוב תיאור"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>
          </>
        ) : (
          <>
            {/* Container 2: Display Options */}
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>
                בחרו אפשרויות תצוגה נוספות
              </Text>
              <View style={styles.displayOptions}>
                <TouchableOpacity
                  style={styles.displayOption}
                  onPress={() =>
                    setDisplayOption(
                      displayOption === 'collage' ? null : 'collage',
                    )
                  }>
                  <View style={styles.displayOptionContent}>
                    <Text style={styles.displayOptionTitle}>קולאז'</Text>
                    <View style={styles.radioSpacer} />
                    <View style={styles.radioButton}>
                      {displayOption === 'collage' && (
                        <LinearGradient
                          colors={['#FFE56A', '#F7C63A', '#E5A80F']}
                          locations={[0.0456, 0.5076, 0.8831]}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 1}}
                          style={styles.radioButtonGradient}>
                          <Image
                            source={require('../assets/checkbox-selected.png')}
                            style={styles.radioButtonSelected}
                            resizeMode="contain"
                          />
                        </LinearGradient>
                      )}
                    </View>
                  </View>
                  <Image
                    source={require('../assets/Frame1261158884.png')}
                    style={styles.displayOptionImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.displayOptionSubtitle}>תצוגה משולבת</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.displayOption}
                  onPress={() =>
                    setDisplayOption(
                      displayOption === 'slideshow' ? null : 'slideshow',
                    )
                  }>
                  <View style={styles.displayOptionContent}>
                    <Text style={styles.displayOptionTitle}>מצגת</Text>
                    <View style={styles.radioSpacer} />
                    <View style={styles.radioButton}>
                      {displayOption === 'slideshow' && (
                        <LinearGradient
                          colors={['#FFE56A', '#F7C63A', '#E5A80F']}
                          locations={[0.0456, 0.5076, 0.8831]}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 1}}
                          style={styles.radioButtonGradient}>
                          <Image
                            source={require('../assets/checkbox-selected.png')}
                            style={styles.radioButtonSelected}
                            resizeMode="contain"
                          />
                        </LinearGradient>
                      )}
                    </View>
                  </View>
                  <Image
                    source={require('../assets/Frame1261158883.png')}
                    style={styles.displayOptionImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.displayOptionSubtitle}>
                    תמונות מתחלפות
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Container 3: Property Type */}
            <View style={styles.formContainer}>
              <Title text="סוג הנכס" required textStyle={{marginBottom: 0}} />
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setPropertyType('office')}>
                  <Text style={styles.radioOptionText}>משרד</Text>
                  <View style={styles.radioSpacer} />
                  {propertyType === 'office' ? (
                    <LinearGradient
                      colors={['#FFE56A', '#F7C63A', '#E5A80F']}
                      locations={[0.0456, 0.5076, 0.8831]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 1}}
                      style={styles.radioButtonGradient}>
                      <Image
                        source={require('../assets/checkbox-selected.png')}
                        style={styles.radioButtonSelected}
                        resizeMode="contain"
                      />
                    </LinearGradient>
                  ) : (
                    <View style={styles.radioButton}>
                      {false && <View style={styles.radioButtonSelected} />}
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setPropertyType('floor')}>
                  <Text style={styles.radioOptionText}>קומה שלמה</Text>
                  <View style={styles.radioSpacer} />
                  {propertyType === 'floor' ? (
                    <LinearGradient
                      colors={['#FFE56A', '#F7C63A', '#E5A80F']}
                      locations={[0.0456, 0.5076, 0.8831]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 1}}
                      style={styles.radioButtonGradient}>
                      <Image
                        source={require('../assets/checkbox-selected.png')}
                        style={styles.radioButtonSelected}
                        resizeMode="contain"
                      />
                    </LinearGradient>
                  ) : (
                    <View style={styles.radioButton}>
                      {false && <View style={styles.radioButtonSelected} />}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Container 4: General Details */}
            <View style={styles.formContainer}>
              <Text style={[styles.generalDetailsHeading, formHeadingStyle]}>
                פרטים כלליים
              </Text>

              <CountUpdate
                variant="figmaOffice"
                title="שטח הנכס"
                required
                count={area}
                setCount={setArea}
                isArea
                min={1}
                isDivider={false}
                isLast={false}
              />
              <Divider style={styles.generalDetailsDivider} />
              <CountUpdate
                variant="figmaOffice"
                title="מספר חדרים"
                required
                count={rooms}
                setCount={setRooms}
                min={1}
                isDivider={false}
                isLast={false}
              />
              <Divider style={styles.generalDetailsDivider} />
              <CountUpdate
                variant="figmaOffice"
                title="קומה"
                required
                count={floor}
                setCount={setFloor}
                min={1}
                isDivider={false}
                isLast={false}
              />

              {/* Amenities */}
              {['חנייה', 'מרפסת', 'מעלית', 'ממ"ד', 'כניסה מיידית'].map(
                amenity => {
                  const isSelected = !!amenities[amenity];
                  const hasQuantity = amenitiesWithQuantity.includes(amenity);
                  const quantity = hasQuantity ? amenities[amenity] || 0 : null;

                  return (
                    <View key={amenity} style={styles.amenityRow}>
                      {/* Amenity label and checkbox */}
                      <TouchableOpacity
                        style={styles.amenityOption}
                        onPress={() => toggleAmenity(amenity)}>
                        <Text style={styles.amenityText}>{amenity}</Text>
                        <View style={styles.radioSpacer} />
                        <FigmaCheckbox checked={isSelected} />
                      </TouchableOpacity>

                      {/* Quantity selector for amenities that need it - below the amenity row */}
                      {hasQuantity && isSelected && (
                        <View style={styles.amenityQuantitySelector}>
                          {[4, 3, 2, 1].map(qty => (
                            <AmenityQuantityPill
                              key={qty}
                              qty={qty}
                              selected={quantity === qty}
                              onPress={() => setAmenityQuantity(amenity, qty)}
                              style={styles.amenityQuantityButtonContainer}
                              textSize={14}
                              inactiveBorderColor="#8C85B3"
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                },
              )}
            </View>

            {/* Container 5: Property Condition */}
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>
                מצב הנכס<Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.segmentedButtons}>
                {['ישן', 'משופץ', 'חדש'].map(cond => (
                  <TouchableOpacity
                    key={cond}
                    onPress={() => setCondition(cond)}
                    style={styles.segmentedButtonContainer}>
                    {condition === cond ? (
                      <LinearGradient
                        colors={['#FFE56A', '#F7C63A', '#E5A80F']}
                        locations={[0.0456, 0.5076, 0.8831]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                        style={[
                          styles.segmentedButton,
                          styles.segmentedButtonSelected,
                        ]}>
                        <Text style={styles.segmentedButtonTextSelected}>
                          {cond}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.segmentedButton}>
                        <Text style={styles.segmentedButtonText}>{cond}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Container 6: Purpose */}
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>
                מטרת הפרסום<Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.purposeButtons}>
                <TouchableOpacity
                  onPress={() => setPurpose('sale')}
                  style={styles.purposeButtonContainer}>
                  {purpose === 'sale' ? (
                    <LinearGradient
                      colors={['#FFE56A', '#F7C63A', '#E5A80F']}
                      locations={[0.0456, 0.5076, 0.8831]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 1}}
                      style={[
                        styles.purposeButton,
                        styles.purposeButtonSelected,
                        styles.purposeButtonGradient,
                      ]}>
                      <Text style={styles.purposeButtonTextSelected}>
                        למכירה
                      </Text>
                      <LinearGradient
                        colors={['#FFE56A', '#F7C63A', '#E5A80F']}
                        locations={[0.0456, 0.5076, 0.8831]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                        style={styles.radioButtonGradient}>
                        <Image
                          source={require('../assets/checkbox-selected.png')}
                          style={styles.radioButtonSelected}
                          resizeMode="contain"
                        />
                      </LinearGradient>
                    </LinearGradient>
                  ) : (
                    <View style={styles.purposeButton}>
                      <Text style={styles.purposeButtonText}>למכירה</Text>
                      <View style={styles.radioButton}>
                        {false && <View style={styles.radioButtonSelected} />}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPurpose('rent')}
                  style={styles.purposeButtonContainer}>
                  {purpose === 'rent' ? (
                    <LinearGradient
                      colors={['#FFE56A', '#F7C63A', '#E5A80F']}
                      locations={[0.0456, 0.5076, 0.8831]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 1}}
                      style={[
                        styles.purposeButton,
                        styles.purposeButtonSelected,
                        styles.purposeButtonGradient,
                      ]}>
                      <Text style={styles.purposeButtonTextSelected}>
                        להשכרה
                      </Text>
                      <LinearGradient
                        colors={['#FFE56A', '#F7C63A', '#E5A80F']}
                        locations={[0.0456, 0.5076, 0.8831]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                        style={styles.radioButtonGradient}>
                        <Image
                          source={require('../assets/checkbox-selected.png')}
                          style={styles.radioButtonSelected}
                          resizeMode="contain"
                        />
                      </LinearGradient>
                    </LinearGradient>
                  ) : (
                    <View style={styles.purposeButton}>
                      <Text style={styles.purposeButtonText}>להשכרה</Text>
                      <View style={styles.radioButton}>
                        {false && <View style={styles.radioButtonSelected} />}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Container 7: Price */}
            <View style={styles.formContainer}>
              <Title text="מחיר" required />
              <CardPriceField
                price={price}
                setPrice={setPrice}
                counterStep={PRICE_COUNTER_STEP_DEFAULT}
              />
            </View>

            {/* Address Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>פרטי כתובת הנכס</Text>
              <Text style={styles.inputLabel}>
                כתובת הנכס<Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="הזן עיר, רחוב ומספר"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={address}
                onChangeText={setAddress}
              />
            </View>

            {/* Phone Section */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>
                טלפון<Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.phoneInput}>
                <TextInput
                  style={styles.phoneTextInput}
                  placeholder="00 000 0000"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Description Section */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>
                תיאור<Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder="כתוב תיאור"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>
          </>
        )}

        {/* Publish Button — full PNG; aspect ratio from asset */}
        <PublishAdButton
          onPress={handlePublish}
          uploading={uploading}
          ready={formReadyToPublish}
          style={{marginBottom: 8}}
        />
      </ScrollView>
      <PublishValidationModal
        visible={publishValidationVisible}
        messages={publishValidationMessages}
        onClose={() => setPublishValidationVisible(false)}
      />
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
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#1E1D27',
  },
  scrollContent: {
    paddingBottom: 40,
    backgroundColor: '#1E1D27',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  formContainer: {
    backgroundColor: '#2B2A39',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    ...formRtlContainerStyle,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    flexShrink: 0,
  },
  sectionTitleMargin: {
    marginTop: 20,
  },
  generalDetailsHeading: {
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    color: '#D2D0DC',
    marginBottom: 24,
  },
  generalDetailsDivider: {
    height: 1,
    backgroundColor: '#343243',
    marginVertical: 20,
  },
  required: {
    color: Colors.yellowIcons,
  },
  imageUploadArea: {
    width: '100%',
    height: 200,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2B2A39',
  },
  uploadButtonContainer: {
    backgroundColor: '#4D4966',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  additionalImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imagePlaceholder: {
    width: '48%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2B2A39',
    marginBottom: 10,
  },
  plusIcon: {
    color: '#fff',
    fontSize: 32,
  },
  videoOption: {
    flexDirection: 'row',
    justifyContent: flexStart,
    alignItems: 'center',
  },
  videoOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  videoUploadSection: {
    marginTop: 20,
  },
  videoUploadArea: {
    width: '100%',
    minHeight: 200,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: '#2B2A39',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  videoUploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  videoUploadImage: {
    width: '100%',
    height: '100%',
    minHeight: 200,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  radioButtonGradient: {
    width: 23,
    height: 23,
    borderRadius: 11.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCA447',
    backgroundColor: '#27262F',
  },
  radioButtonSelected: {
    width: 17,
    height: 17,
  },
  displayOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  displayOption: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 25,
  },
  displayOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    justifyContent: 'center',
  },
  displayOptionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  displayOptionImage: {
    width: 104,
    height: 68,
    alignSelf: 'center',
    borderRadius: 12,
    marginBottom: 8,
  },
  displayOptionSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  radioGroup: {
    // Removed gap, using marginBottom on radioOption instead
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    paddingVertical: 12,
    marginBottom: 15,
  },
  radioOptionSelected: {
    // Add selected styling if needed
  },
  radioOptionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'right',
    flexShrink: 1,
  },
  radioSpacer: {
    width: 15,
  },
  inputRow: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  counterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    backgroundColor: '#2B2A39',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#8C85B3',
    overflow: 'hidden',
  },
  counterButtonLeft: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 32,
    borderBottomLeftRadius: 32,
  },
  counterButtonRight: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
  },
  counterButton: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  counterDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#8C85B3',
  },
  counterValueContainer: {
    flex: 2,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueInput: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    minWidth: 0,
    textAlign: 'center',
    paddingVertical: 0,
  },
  counterValueSuffix: {
    color: '#fff',
    fontSize: 16,
    marginRight: 6,
  },
  amenityRow: {
    marginBottom: 15,
  },
  amenityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    paddingVertical: 12,
  },
  amenityText: {
    color: '#fff',
    fontSize: 16,
  },
  amenityQuantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    justifyContent: flexStart,
  },
  amenityQuantityButtonContainer: {
    marginLeft: 8,
  },
  amenityQuantityButton: {
    backgroundColor: '#2B2A39',
    borderWidth: 1,
    borderColor: '#8C85B3',
    borderRadius: 846.154,
    width: 56,
    height: 40,
    paddingHorizontal: 8,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
  },
  amenityQuantityButtonSelected: {
    borderRadius: 846.154,
    width: 56,
    height: 40,
    paddingHorizontal: 8,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
  },
  amenityQuantityText: {
    color: '#fff',
    fontSize: 14,
  },
  amenityQuantityTextSelected: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  amenityQuantityDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#8C85B3',
    marginLeft: 6,
  },
  amenityQuantityDotSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1A1B3A',
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amenityQuantityDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  segmentedButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  segmentedButtonContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedButtonSelected: {
    borderColor: 'transparent',
  },
  segmentedButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  segmentedButtonTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  purposeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  purposeButtonContainer: {
    flex: 1,
    marginHorizontal: 7.5,
  },
  purposeButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  purposeButtonSelected: {
    borderColor: 'transparent',
  },
  purposeButtonGradient: {
    overflow: 'hidden',
  },
  purposeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  purposeButtonTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    backgroundColor: '#2B2A39',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#8C85B3',
    overflow: 'hidden',
  },
  priceValue: {
    color: Colors.yellowIcons,
    fontSize: 20,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#1E1D27',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#8C85B3',
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1D27',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#8C85B3',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginTop: 10,
  },
  phoneTextInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    backgroundColor: '#1E1D27',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#8C85B3',
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  uploadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  fixedImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#2B2A39',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fixedImage: {
    width: '100%',
    height: '100%',
  },
  uploadButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  uploadButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  uploadButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoPreviewFill: {
    width: '100%',
    height: '100%',
  },
  videoPreviewText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  videoPreviewElement: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  categoryScrollView: {
    marginTop: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 5,
  },
  categoryItem: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
  },
  categoryItemSelected: {
    borderColor: Colors.yellowIcons,
    borderWidth: 3,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categorySelectedIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.yellowIcons,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySelectedText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  radioOptionWithDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  radioOptionContent: {
    flex: 1,
    marginRight: 15,
  },
  radioOptionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  radioOptionDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 5,
  },
  preferenceSection: {
    marginBottom: 20,
  },
  preferenceLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: '#2B2A39',
  },
  genderButtonSelected: {
    borderColor: Colors.yellowIcons,
    backgroundColor: '#4A4538', // Dark olive-brown background like in Figma
  },
  genderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
  },
  genderButtonTextSelected: {
    color: Colors.yellowIcons,
    fontWeight: '600',
  },
  genderRadioSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.yellowIcons,
    borderWidth: 2,
    borderColor: Colors.yellowIcons,
  },
  genderRadioUnselected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent',
  },
  ageRangeContainer: {
    paddingVertical: 10,
  },
  ageRangeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 15,
    textAlign: 'left',
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
  preferenceCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  preferenceCheckboxText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
});

export default OfficeListingScreen;
