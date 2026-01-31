import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/styles';
import { uploadFile, createListing } from '../utils/api';

/**
 * OfficeListingScreen Component
 * Form for creating an office listing
 */
const OfficeListingScreen = ({ onClose, onPublish, initialCategory = null }) => {
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
  const [category, setCategory] = useState(initialCategory || 1); // Category 1-11 (default: 1, or use initialCategory if provided)
  
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
  const additionalImageInputRefs = useRef([null, null, null, null]);
  const videoInputRef = useRef(null);

  const amenitiesWithQuantity = ['חנייה', 'מרפסת'];
  
  const toggleAmenity = (amenity) => {
    if (amenities[amenity]) {
      const newAmenities = { ...amenities };
      delete newAmenities[amenity];
      setAmenities(newAmenities);
    } else {
      setAmenities({
        ...amenities,
        [amenity]: amenitiesWithQuantity.includes(amenity) ? 1 : true
      });
    }
  };

  const setAmenityQuantity = (amenity, quantity) => {
    setAmenities({
      ...amenities,
      [amenity]: quantity
    });
  };

  // File upload handlers
  const handleMainImageUpload = () => {
    if (Platform.OS === 'web' && mainImageInputRef.current) {
      mainImageInputRef.current.click();
    }
  };

  const handleMainImageChange = (event) => {
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

  const handleAdditionalImageUpload = (index) => {
    if (Platform.OS === 'web' && additionalImageInputRefs.current[index]) {
      additionalImageInputRefs.current[index].click();
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

  const handleVideoUpload = () => {
    if (Platform.OS === 'web' && videoInputRef.current) {
      videoInputRef.current.click();
    }
  };

  const handleVideoChange = (event) => {
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
      
      // Validate required fields
      if (!propertyType) {
        alert('אנא בחר סוג נכס');
        setUploading(false);
        return;
      }
      if (!address || !phone || !description) {
        alert('אנא מלא את כל השדות הנדרשים');
        setUploading(false);
        return;
      }
      if (!mainImage && additionalImages.filter(img => img).length === 0) {
        alert('אנא העלה לפחות תמונה אחת');
        setUploading(false);
        return;
      }
      
      // Upload files to Supabase storage
      let uploadedMainImageUrl = null;
      const uploadedAdditionalImageUrls = [];
      let uploadedVideoUrl = null;
      
      // Upload main image
      if (mainImage && mainImage.file) {
        try {
          setUploadProgress(prev => ({ ...prev, mainImage: true }));
          const formData = new FormData();
          formData.append('file', mainImage.file);
          formData.append('folder', 'listings/images');
          
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/upload`, {
            method: 'POST',
            body: formData,
          });
          
          const data = await response.json();
          if (data.success && data.url) {
            uploadedMainImageUrl = data.url;
          } else {
            throw new Error(data.error || 'Failed to upload main image');
          }
        } catch (error) {
          console.error('Error uploading main image:', error);
          alert('שגיאה בהעלאת התמונה הראשית. נסה שוב.');
          setUploading(false);
          return;
        } finally {
          setUploadProgress(prev => ({ ...prev, mainImage: false }));
        }
      }
      
      // Upload additional images
      for (let i = 0; i < additionalImages.length; i++) {
        if (additionalImages[i] && additionalImages[i].file) {
          try {
            setUploadProgress(prev => ({ ...prev, [`additional-${i}`]: true }));
            const formData = new FormData();
            formData.append('file', additionalImages[i].file);
            formData.append('folder', 'listings/images');
            
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/upload`, {
              method: 'POST',
              body: formData,
            });
            
            const data = await response.json();
            if (data.success && data.url) {
              uploadedAdditionalImageUrls[i] = data.url;
            } else {
              console.error(`Failed to upload additional image ${i}:`, data.error);
            }
          } catch (error) {
            console.error(`Error uploading additional image ${i}:`, error);
          } finally {
            setUploadProgress(prev => ({ ...prev, [`additional-${i}`]: false }));
          }
        }
      }
      
      // Upload video if exists
      if (videoFile && videoFile.file) {
        try {
          setUploadProgress(prev => ({ ...prev, video: true }));
          const formData = new FormData();
          formData.append('file', videoFile.file);
          formData.append('folder', 'listings/videos');
          
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/upload`, {
            method: 'POST',
            body: formData,
          });
          
          const data = await response.json();
          if (data.success && data.url) {
            uploadedVideoUrl = data.url;
          } else {
            console.error('Failed to upload video:', data.error);
          }
        } catch (error) {
          console.error('Error uploading video:', error);
        } finally {
          setUploadProgress(prev => ({ ...prev, video: false }));
        }
      }
      
      // Prepare listing data with uploaded Supabase URLs
      const listingData = {
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
        additionalImageUrls: uploadedAdditionalImageUrls.filter(url => url !== null && url !== undefined && url !== ''),
        videoUrl: uploadedVideoUrl,
        hasVideo: !!uploadedVideoUrl,
        category: parseInt(category) || 1, // Category 1-11 - ensure it's an integer
      };

      console.log('📝 Publishing listing with data:', {
        ...listingData,
        category: listingData.category,
        hasMainImage: !!listingData.mainImageUrl,
        additionalImagesCount: listingData.additionalImageUrls.length,
        hasVideo: listingData.hasVideo
      });

      // Create listing in database
      const result = await createListing(listingData);
      
      console.log('Listing created successfully:', result);
      
      // Pass to parent with Supabase URLs
      if (onPublish) {
        onPublish({
          ...listingData,
          id: result.id || result.listing?.id,
          mainImage: uploadedMainImageUrl ? { uri: uploadedMainImageUrl } : null,
          additionalImages: uploadedAdditionalImageUrls.filter(url => url).map(url => ({ uri: url })),
          video: uploadedVideoUrl ? { uri: uploadedVideoUrl } : null,
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>יצירת מודעה</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Container 0: Category Selection */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>
            בחר קטגוריה<Text style={styles.required}>*</Text>
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScrollView}>
            <View style={styles.categoryGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((catNum) => (
                <TouchableOpacity
                  key={catNum}
                  style={[
                    styles.categoryItem,
                    category === catNum && styles.categoryItemSelected
                  ]}
                  onPress={() => setCategory(catNum)}
                >
                  <Image
                    source={require(`../assets/tik${catNum}.png`)}
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
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>
            תמונת נושא או הדמייה<Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity 
            style={styles.imageUploadArea}
            onPress={handleMainImageUpload}
          >
            {uploadProgress.mainImage ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.uploadButtonText}>מעלה תמונה...</Text>
              </View>
            ) : mainImage ? (
              <Image 
                source={{ uri: mainImage.uri }} 
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
                style={{ display: 'none' }}
                onChange={handleMainImageChange}
              />
            )}
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, styles.sectionTitleMargin]}>תמונות נוספות</Text>
          <View style={styles.additionalImagesGrid}>
            {[0, 1, 2, 3].map((index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.imagePlaceholder}
                onPress={() => handleAdditionalImageUpload(index)}
                disabled={uploadProgress[`additional-${index}`]}
              >
                {uploadProgress[`additional-${index}`] ? (
                  <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                ) : additionalImages[index] ? (
                  <Image 
                    source={{ uri: additionalImages[index].uri }} 
                    style={styles.uploadedImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.plusIcon}>+</Text>
                )}
                {Platform.OS === 'web' && (
                  <input
                    ref={el => additionalImageInputRefs.current[index] = el}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleAdditionalImageChange(index, e)}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={styles.videoOption}
            onPress={() => setHasVideo(!hasVideo)}
          >
            <View style={styles.radioButton}>
              {hasVideo && (
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.radioButtonGradient}
                >
                  <Image 
                    source={require('../assets/checkbox-selected.png')} 
                    style={styles.radioButtonSelected}
                    resizeMode="contain"
                  />
                </LinearGradient>
              )}
            </View>
            <View style={styles.radioSpacer} />
            <Text style={styles.videoOptionText}>הוסף סרטון</Text>
          </TouchableOpacity>

          {/* Video Upload Section - shown when checkbox is selected */}
          {hasVideo && (
            <View style={styles.videoUploadSection}>
              <TouchableOpacity 
                style={styles.videoUploadArea}
                onPress={handleVideoUpload}
                disabled={uploadProgress.video}
              >
                {uploadProgress.video ? (
                  <View style={styles.videoPreview}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.videoPreviewText}>מעלה סרטון...</Text>
                  </View>
                ) : videoFile ? (
                  <View style={styles.videoPreview}>
                    {Platform.OS === 'web' ? (
                      <video
                        src={videoFile.uri}
                        style={styles.videoPreviewElement}
                        controls={false}
                      />
                    ) : (
                      <Text style={styles.videoPreviewText}>Video Selected</Text>
                    )}
                  </View>
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
                    style={{ display: 'none' }}
                    onChange={handleVideoChange}
                  />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Container 2: Display Options */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>בחרו אפשרויות תצוגה נוספות</Text>
          <View style={styles.displayOptions}>
            <TouchableOpacity 
              style={styles.displayOption}
              onPress={() => setDisplayOption(displayOption === 'collage' ? null : 'collage')}
            >
              <View style={styles.displayOptionContent}>
                <Text style={styles.displayOptionTitle}>קולאז'</Text>
                <View style={styles.radioSpacer} />
                <View style={styles.radioButton}>
                  {displayOption === 'collage' && (
                    <LinearGradient
                      colors={['#FEE787', '#BD9947', '#9C6522']}
                      locations={[0.0456, 0.5076, 0.8831]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.radioButtonGradient}
                    >
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
              onPress={() => setDisplayOption(displayOption === 'slideshow' ? null : 'slideshow')}
            >
              <View style={styles.displayOptionContent}>
                <Text style={styles.displayOptionTitle}>מצגת</Text>
                <View style={styles.radioSpacer} />
                <View style={styles.radioButton}>
                  {displayOption === 'slideshow' && (
                    <LinearGradient
                      colors={['#FEE787', '#BD9947', '#9C6522']}
                      locations={[0.0456, 0.5076, 0.8831]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.radioButtonGradient}
                    >
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
              <Text style={styles.displayOptionSubtitle}>תמונות מתחלפות</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Container 3: Property Type */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>
            סוג הנכס<Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setPropertyType('office')}
            >
              <Text style={styles.radioOptionText}>משרד</Text>
              <View style={styles.radioSpacer} />
              {propertyType === 'office' ? (
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.radioButtonGradient}
                >
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
              onPress={() => setPropertyType('floor')}
            >
              <Text style={styles.radioOptionText}>קומה שלמה</Text>
              <View style={styles.radioSpacer} />
              {propertyType === 'floor' ? (
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.radioButtonGradient}
                >
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
          <Text style={styles.sectionTitle}>פרטים כלליים</Text>
          
          {/* Area */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>
              שטח הנכס<Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.counterInput}>
              <TouchableOpacity 
                style={styles.counterButtonLeft}
                onPress={() => setArea(Math.max(1, area - 1))}
              >
                <Text style={styles.counterButton}>+</Text>
              </TouchableOpacity>
              <View style={styles.counterDivider} />
              <View style={styles.counterValueContainer}>
                <Text style={styles.counterValue}>{area} מ"ר</Text>
              </View>
              <View style={styles.counterDivider} />
              <TouchableOpacity 
                style={styles.counterButtonRight}
                onPress={() => setArea(area + 1)}
              >
                <Text style={styles.counterButton}>-</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Rooms */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>
              מספר חדרים<Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.counterInput}>
              <TouchableOpacity 
                style={styles.counterButtonLeft}
                onPress={() => setRooms(Math.max(1, rooms - 1))}
              >
                <Text style={styles.counterButton}>+</Text>
              </TouchableOpacity>
              <View style={styles.counterDivider} />
              <View style={styles.counterValueContainer}>
                <Text style={styles.counterValue}>{rooms}</Text>
              </View>
              <View style={styles.counterDivider} />
              <TouchableOpacity 
                style={styles.counterButtonRight}
                onPress={() => setRooms(rooms + 1)}
              >
                <Text style={styles.counterButton}>-</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Floor */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>
              קומה<Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.counterInput}>
              <TouchableOpacity 
                style={styles.counterButtonLeft}
                onPress={() => setFloor(Math.max(1, floor - 1))}
              >
                <Text style={styles.counterButton}>+</Text>
              </TouchableOpacity>
              <View style={styles.counterDivider} />
              <View style={styles.counterValueContainer}>
                <Text style={styles.counterValue}>{floor}</Text>
              </View>
              <View style={styles.counterDivider} />
              <TouchableOpacity 
                style={styles.counterButtonRight}
                onPress={() => setFloor(floor + 1)}
              >
                <Text style={styles.counterButton}>-</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Amenities */}
          {['חנייה', 'מרפסת', 'מעלית', 'ממ"ד', 'כניסה מיידית'].map((amenity) => {
            const isSelected = !!amenities[amenity];
            const hasQuantity = amenitiesWithQuantity.includes(amenity);
            const quantity = hasQuantity ? (amenities[amenity] || 0) : null;
            
            return (
              <View key={amenity} style={styles.amenityRow}>
                {/* Amenity label and checkbox */}
                <TouchableOpacity
                  style={styles.amenityOption}
                  onPress={() => toggleAmenity(amenity)}
                >
                  <Text style={styles.amenityText}>{amenity}</Text>
                  <View style={styles.radioSpacer} />
                  {isSelected ? (
                    <LinearGradient
                      colors={['#FEE787', '#BD9947', '#9C6522']}
                      locations={[0.0456, 0.5076, 0.8831]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.radioButtonGradient}
                    >
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
                
                {/* Quantity selector for amenities that need it - below the amenity row */}
                {hasQuantity && isSelected && (
                  <View style={styles.amenityQuantitySelector}>
                    {[4, 3, 2, 1].map((qty) => (
                      <TouchableOpacity
                        key={qty}
                        onPress={() => setAmenityQuantity(amenity, qty)}
                        style={styles.amenityQuantityButtonContainer}
                      >
                        {quantity === qty ? (
                          <LinearGradient
                            colors={['#FEE787', '#BD9947', '#9C6522']}
                            locations={[0.0456, 0.5076, 0.8831]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.amenityQuantityButtonSelected}
                          >
                            <Text style={styles.amenityQuantityTextSelected}>{qty}</Text>
                            <View style={styles.amenityQuantityDotSelected}>
                              <LinearGradient
                                colors={['#FEE787', '#BD9947', '#9C6522']}
                                locations={[0.0456, 0.5076, 0.8831]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.amenityQuantityDotInner}
                              />
                            </View>
                          </LinearGradient>
                        ) : (
                          <View style={styles.amenityQuantityButton}>
                            <Text style={styles.amenityQuantityText}>{qty}</Text>
                            <View style={styles.amenityQuantityDot} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Container 5: Property Condition */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>
            מצב הנכס<Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.segmentedButtons}>
            {['ישן', 'משופץ', 'חדש'].map((cond) => (
              <TouchableOpacity
                key={cond}
                onPress={() => setCondition(cond)}
                style={styles.segmentedButtonContainer}
              >
                {condition === cond ? (
                  <LinearGradient
                    colors={['#FEE787', '#BD9947', '#9C6522']}
                    locations={[0.0456, 0.5076, 0.8831]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.segmentedButton, styles.segmentedButtonSelected]}
                  >
                    <Text style={styles.segmentedButtonTextSelected}>
                      {cond}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.segmentedButton}>
                    <Text style={styles.segmentedButtonText}>
                      {cond}
                    </Text>
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
              style={styles.purposeButtonContainer}
            >
              {purpose === 'sale' ? (
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.purposeButton, styles.purposeButtonSelected, styles.purposeButtonGradient]}
                >
                  <Text style={styles.purposeButtonTextSelected}>
                    למכירה
                  </Text>
                  <LinearGradient
                    colors={['#FEE787', '#BD9947', '#9C6522']}
                    locations={[0.0456, 0.5076, 0.8831]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.radioButtonGradient}
                  >
                    <Image 
                      source={require('../assets/checkbox-selected.png')} 
                      style={styles.radioButtonSelected}
                      resizeMode="contain"
                    />
                  </LinearGradient>
                </LinearGradient>
              ) : (
                <View style={styles.purposeButton}>
                  <Text style={styles.purposeButtonText}>
                    למכירה
                  </Text>
                  <View style={styles.radioButton}>
                    {false && <View style={styles.radioButtonSelected} />}
                  </View>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPurpose('rent')}
              style={styles.purposeButtonContainer}
            >
              {purpose === 'rent' ? (
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.purposeButton, styles.purposeButtonSelected, styles.purposeButtonGradient]}
                >
                  <Text style={styles.purposeButtonTextSelected}>
                    להשכרה
                  </Text>
                  <LinearGradient
                    colors={['#FEE787', '#BD9947', '#9C6522']}
                    locations={[0.0456, 0.5076, 0.8831]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.radioButtonGradient}
                  >
                    <Image 
                      source={require('../assets/checkbox-selected.png')} 
                      style={styles.radioButtonSelected}
                      resizeMode="contain"
                    />
                  </LinearGradient>
                </LinearGradient>
              ) : (
                <View style={styles.purposeButton}>
                  <Text style={styles.purposeButtonText}>
                    להשכרה
                  </Text>
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
          <Text style={styles.sectionTitle}>
            מחיר<Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.priceInput}>
            <TouchableOpacity 
              style={styles.counterButtonLeft}
              onPress={() => setPrice(Math.max(0, price - 10000))}
            >
              <Text style={styles.counterButton}>+</Text>
            </TouchableOpacity>
            <View style={styles.counterDivider} />
            <View style={styles.counterValueContainer}>
              <Text style={styles.priceValue}>₪ {price.toLocaleString()}</Text>
            </View>
            <View style={styles.counterDivider} />
            <TouchableOpacity 
              style={styles.counterButtonRight}
              onPress={() => setPrice(price + 10000)}
            >
              <Text style={styles.counterButton}>-</Text>
            </TouchableOpacity>
          </View>
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
            <TouchableOpacity>
              <Text style={styles.phoneDropdown}>▼</Text>
            </TouchableOpacity>
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

        {/* Publish Button */}
        <TouchableOpacity
          onPress={handlePublish}
          disabled={uploading}
        >
          <LinearGradient
            colors={['#FEE787', '#BD9947', '#9C6522']}
            locations={[0.0456, 0.5076, 0.8831]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.publishButton}
          >
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
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  sectionTitleMargin: {
    marginTop: 20,
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
    justifyContent: 'flex-end',
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
    overflow: 'hidden',
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
    width: '100%',
    height: 80,
    borderRadius: 20,
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
    justifyContent: 'flex-end',
    paddingVertical: 12,
    marginBottom: 15,
  },
  radioOptionSelected: {
    // Add selected styling if needed
  },
  radioOptionText: {
    color: '#fff',
    fontSize: 16,
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
  amenityRow: {
    marginBottom: 15,
  },
  amenityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
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
    justifyContent: 'flex-end',
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
    justifyContent: 'flex-end',
  },
  amenityQuantityButtonSelected: {
    borderRadius: 846.154,
    width: 56,
    height: 40,
    paddingHorizontal: 8,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
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
    width: 12,
    height: 12,
    borderRadius: 6,
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
  phoneDropdown: {
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
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
  publishButton: {
    borderRadius: 25,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
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
  videoPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
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
});

export default OfficeListingScreen;
