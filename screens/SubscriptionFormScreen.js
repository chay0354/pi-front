import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/styles';
import { submitSubscription } from '../utils/api';

/**
 * SubscriptionFormScreen Component
 * Subscription form page with image/video upload and activity area selection
 */
const SubscriptionFormScreen = ({ onClose, onNext, subscriptionType = 'broker' }) => {
  const getHeaderTitle = () => {
    switch (subscriptionType) {
      case 'company':
        return 'מנוי לחברות';
      case 'professional':
        return 'מנוי לבעלי מקצוע';
      case 'broker':
      default:
        return 'מנוי למתווכים';
    }
  };
  const [activeTab, setActiveTab] = useState('images'); // 'images' or 'video'
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedSpecializations, setSelectedSpecializations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state for company
  const [companyName, setCompanyName] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [addDescription, setAddDescription] = useState(false);
  
  // Form state for broker
  const [brokerageLicenseNumber, setBrokerageLicenseNumber] = useState('');
  const [brokerOfficeName, setBrokerOfficeName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [dealerNumber, setDealerNumber] = useState('');
  const [phone1, setPhone1] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [selectedRegions, setSelectedRegions] = useState([]);
  
  // Form state for professional (keep existing)
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [phone2, setPhone2] = useState('');
  
  // Image state
  const [profilePicture, setProfilePicture] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [video, setVideo] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const types = [
    'תיווך',
    'עו"ד',
    'עיצוב פנים',
    'ייעוץ משכנתאות',
    'אדריכלות',
    'שמאות',
  ];

  const specializations = [
    'חוזים וקרקעות',
    'קבוצות רכישה',
    'נדל"ן',
    'השקעות',
  ];

  // Activity regions for broker subscription
  const activityRegions = [
    'ירושלים והסביבה',
    'מרכז - גוש דן',
    'מרכז - השפלה',
    'מרכז - השרון',
    'צפון - הגליל המערבי והעליון',
    'צפון - רמת הגולן',
    'דרום - באר שבע והנגב',
    'צפון - חיפה והעמקים',
    'דרום - אשדוד ואשקלון',
    'דרום - אילת והערבה',
    'יהודה ושומרון',
  ];

  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const toggleSpecialization = (specialization) => {
    setSelectedSpecializations((prev) =>
      prev.includes(specialization)
        ? prev.filter((s) => s !== specialization)
        : [...prev, specialization]
    );
  };

  const toggleRegion = (region) => {
    setSelectedRegions((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region]
    );
  };

  // Request image picker permissions
  const requestImagePermission = async () => {
    if (Platform.OS === 'web') {
      // On web, we can proceed without explicit permission
      return true;
    }
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to upload images!');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  };

  // Pick profile picture
  const pickProfilePicture = async () => {
    console.log('pickProfilePicture called');
    
    // Web fallback using file input
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setProfilePicture({
              uri: event.target.result,
              type: file.type,
              name: file.name,
            });
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
      return;
    }

    const hasPermission = await requestImagePermission();
    if (!hasPermission) {
      console.log('Permission denied');
      return;
    }

    try {
      console.log('Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('Image picker result:', result);
      if (!result.canceled && result.assets && result.assets[0]) {
        setProfilePicture(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', `Failed to pick image: ${error.message}`);
    }
  };

  // Pick additional image
  const pickAdditionalImage = async (index) => {
    console.log('pickAdditionalImage called for index:', index);
    
    // Web fallback using file input
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const newImages = [...additionalImages];
            newImages[index] = {
              uri: event.target.result,
              type: file.type,
              name: file.name,
            };
            setAdditionalImages(newImages);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
      return;
    }

    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newImages = [...additionalImages];
        newImages[index] = result.assets[0];
        setAdditionalImages(newImages);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', `Failed to pick image: ${error.message}`);
    }
  };

  // Pick company logo
  const pickCompanyLogo = async () => {
    console.log('pickCompanyLogo called');
    
    // Web fallback using file input
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setCompanyLogo({
              uri: event.target.result,
              type: file.type,
              name: file.name,
            });
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
      return;
    }

    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setCompanyLogo(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking logo:', error);
      Alert.alert('Error', `Failed to pick logo: ${error.message}`);
    }
  };

  // Pick video
  const pickVideo = async () => {
    console.log('pickVideo called');
    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Videos,
        allowsEditing: Platform.OS !== 'web',
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setVideo(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', `Failed to pick video: ${error.message}`);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    setErrorMessage(null); // Clear previous errors
    
    try {
      // Validate required fields
      const missingFields = [];
      
      if (subscriptionType === 'company') {
        if (!companyName) missingFields.push('שם החברה');
        if (!contactPersonName) missingFields.push('שם איש קשר');
        if (!companyEmail) missingFields.push('כתובת מייל');
        if (!officePhone) missingFields.push('מספר טלפון משרד');
      } else {
        // Broker/professional validation
        if (subscriptionType === 'broker') {
          if (!brokerageLicenseNumber) missingFields.push('מספר רשיון תיווך');
          if (!brokerOfficeName) missingFields.push('שם משרד המתווך');
          if (!agentName) missingFields.push('שם הסוכן');
          if (!email) missingFields.push('כתובת מייל');
          if (!phone1) missingFields.push('מספר טלפון');
          if (!profilePicture) missingFields.push('תמונת פרופיל');
        } else {
          // Professional validation (keep existing)
          if (!businessName) missingFields.push('שם העסק');
          if (!businessAddress) missingFields.push('כתובת בית העסק');
          if (!email) missingFields.push('כתובת מייל');
          if (!phone1) missingFields.push('מספר טלפון');
          if (!profilePicture) missingFields.push('תמונת פרופיל');
        }
      }

      if (missingFields.length > 0) {
        setErrorMessage(`אנא מלא את השדות הבאים: ${missingFields.join(', ')}`);
        return;
      }

      setIsSubmitting(true);

      // Prepare form data
      const formData = {
        subscriptionType,
        ...(subscriptionType === 'company' ? {
          businessName: companyName,
          contactPersonName,
          companyId,
          officePhone,
          mobilePhone,
          email: companyEmail,
          companyWebsite,
          description: addDescription ? description : null,
        } : subscriptionType === 'broker' ? {
          // Broker subscription
          name: agentName, // Backend expects 'name' for broker/professional
          brokerageLicenseNumber,
          brokerOfficeName,
          agentName,
          dealerNumber,
          phone: phone1,
          email,
          description,
          activityRegions: selectedRegions,
        } : {
          // Professional subscription (keep existing)
          name: businessName,
          businessName,
          businessAddress,
          dealerNumber,
          phone: phone1,
          phone2,
          email,
          description,
          types: selectedTypes,
          specializations: selectedSpecializations,
        }),
        agreedToTerms: true,
      };

      // Prepare files
      const files = {};
      if (profilePicture) files.profilePicture = profilePicture;
      if (additionalImages.length > 0) files.additionalImages = additionalImages.filter(img => img !== null);
      if (companyLogo) files.companyLogo = companyLogo;
      if (video && activeTab === 'video') files.video = video;

      // Submit to backend
      const response = await submitSubscription(formData, files);
      
      console.log('Form submission response:', response);
      
      if (response && response.success) {
        const userEmail = subscriptionType === 'company' ? companyEmail : email;
        console.log('Navigating to verification screen with:', {
          subscriptionId: response.subscriptionId,
          email: userEmail,
          verificationCode: response.verificationCode
        });
        
        // Store email and subscription ID for verification
        if (onNext) {
          onNext(response.subscriptionId, userEmail, response.verificationCode);
        } else {
          console.error('onNext callback is not defined!');
        }
      } else {
        throw new Error('Form submission failed - no success response');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMsg = error.message || 'נכשל בשליחת הטופס. אנא נסה שוב.';
      setErrorMessage(errorMsg);
      // Scroll to top to show error
      setTimeout(() => {
        // ScrollView will be scrolled to show error
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/subscription-background.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Image
              source={require('../assets/back-arrow-icon.png')}
              style={styles.backArrow}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Error Notice */}
        {errorMessage && (
          <View style={styles.errorNotice}>
            <Text style={styles.errorNoticeText}>{errorMessage}</Text>
            <TouchableOpacity
              onPress={() => setErrorMessage(null)}
              style={styles.errorCloseButton}
            >
              <Text style={styles.errorCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Progress Indicator - Only for non-company at top */}
        {subscriptionType !== 'company' && (
          <View style={styles.progressContainer}>
            <Image
              source={require('../assets/wizard-progress.png')}
              style={styles.progressImage}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Tab Selector - Only for non-company */}
        {subscriptionType !== 'company' && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={styles.tabFullWidth}
              onPress={() => {
                const newTab = activeTab === 'images' ? 'video' : 'images';
                setActiveTab(newTab);
                if (newTab === 'video' && !video) {
                  pickVideo();
                }
              }}
            >
              {activeTab === 'images' ? (
                <Image
                  source={require('../assets/tab-images-selected.png')}
                  style={styles.tabImageFullWidth}
                  resizeMode="contain"
                />
              ) : (
                <Image
                  source={require('../assets/tab-video-selected.png')}
                  style={styles.tabImageFullWidth}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Picture and Additional Images Section - Only for non-company */}
        {subscriptionType !== 'company' && (
          <>
            <View style={styles.sectionContainer}>
              {activeTab === 'images' ? (
                <>
                  <Text style={styles.sectionTitle}>תמונת פרופיל (חובה)</Text>
                  <TouchableOpacity onPress={pickProfilePicture} style={styles.imageUploadContainer}>
                    {profilePicture ? (
                      <Image
                        source={{ uri: profilePicture.uri }}
                        style={styles.imageInsert}
                        resizeMode="cover"
                      />
                    ) : (
                      <Image
                        source={require('../assets/image-insert.png')}
                        style={styles.imageInsert}
                        resizeMode="contain"
                      />
                    )}
                  </TouchableOpacity>
                  <Text style={styles.sectionTitle}>תמונות נוספות</Text>
                  <View style={styles.imageGrid}>
                    {[0, 1, 2, 3].map((index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.imagePlaceholder}
                        onPress={() => pickAdditionalImage(index)}
                      >
                        {additionalImages[index] ? (
                          <Image
                            source={{ uri: additionalImages[index].uri }}
                            style={styles.uploadedImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.plusIcon}>+</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>סרטון</Text>
                  <TouchableOpacity onPress={pickVideo} style={styles.imageUploadContainer}>
                    {video ? (
                      <Image
                        source={{ uri: video.uri }}
                        style={styles.imageInsert}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.videoPlaceholder}>
                        <Text style={styles.videoPlaceholderText}>לחץ להעלאת סרטון</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Company Logo Section - No Container */}
            <View style={styles.logoContainer}>
              <TouchableOpacity onPress={pickCompanyLogo}>
                {companyLogo ? (
                  <Image
                    source={{ uri: companyLogo.uri }}
                    style={styles.logoImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Image
                    source={require('../assets/office-logo-upload.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Type Section - Only for professional */}
            {subscriptionType === 'professional' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>סוג</Text>
                <View style={styles.optionsContainer}>
                  {types.map((type, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        selectedTypes.includes(type) && styles.optionButtonSelected,
                      ]}
                      onPress={() => toggleType(type)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedTypes.includes(type) && styles.optionTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Specialization Section - Only for professional */}
            {subscriptionType === 'professional' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>התמחות</Text>
                <View style={styles.optionsContainer}>
                  {specializations.map((specialization, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        selectedSpecializations.includes(specialization) && styles.optionButtonSelected,
                      ]}
                      onPress={() => toggleSpecialization(specialization)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedSpecializations.includes(specialization) && styles.optionTextSelected,
                        ]}
                      >
                        {specialization}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Progress Indicator - For company flow, above form */}
        {subscriptionType === 'company' && (
          <View style={styles.progressContainer}>
            <Image
              source={require('../assets/wizard-progress.png')}
              style={styles.progressImage}
              resizeMode="contain"
            />
          </View>
        )}

        {/* General Details Form Section */}
        <View style={styles.formSection}>
          {subscriptionType === 'company' && (
            <Text style={styles.sectionTitle}>פרטים כלליים</Text>
          )}
          
          {subscriptionType === 'company' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>שם החברה*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן שם חברה"
                  placeholderTextColor={Colors.grey200}
                  value={companyName}
                  onChangeText={setCompanyName}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>שם איש קשר*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן שם איש קשר"
                  placeholderTextColor={Colors.grey200}
                  value={contactPersonName}
                  onChangeText={setContactPersonName}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>מספר עוסק / ח.פ</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן מספר עוסק / ח.פ"
                  placeholderTextColor={Colors.grey200}
                  value={companyId}
                  onChangeText={setCompanyId}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>מספר טלפון משרד*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן מספר טלפון"
                  placeholderTextColor={Colors.grey200}
                  value={officePhone}
                  onChangeText={setOfficePhone}
                  keyboardType="phone-pad"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>מספר נייד</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן מספר נייד"
                  placeholderTextColor={Colors.grey200}
                  value={mobilePhone}
                  onChangeText={setMobilePhone}
                  keyboardType="phone-pad"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>כתובת מייל*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן כתובת מייל"
                  placeholderTextColor={Colors.grey200}
                  value={companyEmail}
                  onChangeText={setCompanyEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>כתובת אתר החברה*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן כתובת אתר"
                  placeholderTextColor={Colors.grey200}
                  value={companyWebsite}
                  onChangeText={setCompanyWebsite}
                  keyboardType="url"
                  autoCapitalize="none"
                  textAlign="right"
                />
              </View>

              <View style={styles.descriptionOption}>
                <Text style={styles.descriptionLabel}>הוסף תיאור</Text>
                <TouchableOpacity
                  onPress={() => setAddDescription(!addDescription)}
                  style={styles.checkboxCircle}
                >
                  {addDescription && <View style={styles.checkboxFilled} />}
                </TouchableOpacity>
              </View>
              
              {addDescription && (
                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.textArea}
                    placeholder="כתוב תיאור כללי על השירות שלך"
                    placeholderTextColor={Colors.grey200}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    textAlign="right"
                  />
                </View>
              )}
            </>
          ) : subscriptionType === 'broker' ? (
            <>
              {/* Activity Area Section - Only for broker */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>אזור פעילות</Text>
                <View style={styles.optionsContainer}>
                  {activityRegions.map((region, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        selectedRegions.includes(region) && styles.optionButtonSelected,
                      ]}
                      onPress={() => toggleRegion(region)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedRegions.includes(region) && styles.optionTextSelected,
                        ]}
                      >
                        {region}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* General Details Title for Broker */}
              <Text style={styles.sectionTitle}>פרטים כלליים</Text>

              {/* General Details for Broker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>מספר רשיון תיווך*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן מספר רישיון"
                  placeholderTextColor={Colors.grey200}
                  value={brokerageLicenseNumber}
                  onChangeText={setBrokerageLicenseNumber}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>שם משרד המתווך*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן שם משרד"
                  placeholderTextColor={Colors.grey200}
                  value={brokerOfficeName}
                  onChangeText={setBrokerOfficeName}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>שם הסוכן *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן שם מלא"
                  placeholderTextColor={Colors.grey200}
                  value={agentName}
                  onChangeText={setAgentName}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>מספר עוסק פטור</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן מספר עוסק פטור (אופציונאלי)"
                  placeholderTextColor={Colors.grey200}
                  value={dealerNumber}
                  onChangeText={setDealerNumber}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>מספר טלפון*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן מספר טלפון"
                  placeholderTextColor={Colors.grey200}
                  value={phone1}
                  onChangeText={setPhone1}
                  keyboardType="phone-pad"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>כתובת מייל*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן כתובת מייל"
                  placeholderTextColor={Colors.grey200}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>תיאור</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="כתוב תיאור כללי על השירות שלך"
                  placeholderTextColor={Colors.grey200}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlign="right"
                />
              </View>
            </>
          ) : (
            <>
              {/* Professional subscription - keep existing fields */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>שם העסק*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן שם"
                  placeholderTextColor={Colors.grey200}
                  value={businessName}
                  onChangeText={setBusinessName}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>כתובת בית העסק*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן כתובת"
                  placeholderTextColor={Colors.grey200}
                  value={businessAddress}
                  onChangeText={setBusinessAddress}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>מספר עוסק / ח.פ</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן מספר עוסק פטור (אופציונאלי)"
                  placeholderTextColor={Colors.grey200}
                  value={dealerNumber}
                  onChangeText={setDealerNumber}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>מספר טלפון 1*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן מספר טלפון"
                  placeholderTextColor={Colors.grey200}
                  value={phone1}
                  onChangeText={setPhone1}
                  keyboardType="phone-pad"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>מספר טלפון 2</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן מספר טלפון (אופציונאלי)"
                  placeholderTextColor={Colors.grey200}
                  value={phone2}
                  onChangeText={setPhone2}
                  keyboardType="phone-pad"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>כתובת מייל*</Text>
                <TextInput
                  style={styles.input}
                  placeholder="הזן כתובת מייל"
                  placeholderTextColor={Colors.grey200}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>תיאור</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="כתוב תיאור כללי על השירות שלך"
                  placeholderTextColor={Colors.grey200}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlign="right"
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.nextButton, isSubmitting && styles.nextButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white100} />
            ) : (
              <Text style={styles.nextButtonText}>הבא</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 414,
    alignSelf: 'center',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
    zIndex: 2,
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 24,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backArrow: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: FontSizes.fs18,
    fontWeight: '600',
    color: Colors.white100,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressImage: {
    width: 366,
    height: 32,
  },
  tabContainer: {
    width: '100%',
    marginBottom: 20,
  },
  tabFullWidth: {
    width: '100%',
    height: 60,
  },
  tabImageFullWidth: {
    width: '100%',
    height: 60,
  },
  section: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  sectionContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
    backgroundColor: '#2B2A39',
    borderRadius: BorderRadius.roundCorner2XL,
    padding: 16,
  },
  sectionTitle: {
    fontSize: FontSizes.fs18,
    fontWeight: '600',
    color: Colors.white100,
    textAlign: 'right',
  },
  imageInsert: {
    width: '100%',
    height: 200,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imagePlaceholder: {
    width: '47%',
    aspectRatio: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.grey200,
    borderRadius: BorderRadius.roundCorner2XL,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2933',
  },
  plusIcon: {
    fontSize: 32,
    color: Colors.grey200,
    fontWeight: '300',
  },
  logoContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
    paddingRight: 24,
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.br50,
    backgroundColor: '#2a2933',
    borderWidth: 1,
    borderColor: Colors.grey200,
  },
  optionButtonSelected: {
    backgroundColor: Colors.yellowIcons,
    borderColor: Colors.yellowIcons,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.white100,
  },
  optionTextSelected: {
    color: Colors.blue100,
    fontWeight: '600',
  },
  inputGroup: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.white100,
    textAlign: 'right',
  },
  formSection: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#2a2933',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.grey200,
    padding: 16,
    fontSize: 16,
    color: Colors.white100,
    textAlign: 'right',
  },
  textArea: {
    width: '100%',
    minHeight: 120,
    backgroundColor: '#2a2933',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.grey200,
    padding: 16,
    fontSize: 16,
    color: Colors.white100,
    textAlign: 'right',
    textAlignVertical: 'top',
  },
  nextButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#2B2A39',
    borderRadius: BorderRadius.roundCornerXL,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white100,
  },
  imageUploadContainer: {
    width: '100%',
    cursor: 'pointer',
  },
  uploadedImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.roundCorner2XL,
  },
  checkboxFilled: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.yellowIcons,
    alignSelf: 'center',
  },
  descriptionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.white100,
    textAlign: 'right',
  },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.grey200,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#2a2933',
    borderRadius: BorderRadius.roundCorner2XL,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.grey200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholderText: {
    fontSize: 16,
    color: Colors.grey200,
    textAlign: 'center',
  },
  errorNotice: {
    backgroundColor: '#ff4444',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#cc0000',
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 14,
    color: Colors.white100,
    textAlign: 'right',
    fontWeight: '500',
  },
  errorCloseButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  errorCloseText: {
    fontSize: 18,
    color: Colors.white100,
    fontWeight: 'bold',
  },
});

export default SubscriptionFormScreen;
