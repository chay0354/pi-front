import React, {useState, useRef} from 'react';
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
  I18nManager,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {Video, ResizeMode} from 'expo-av';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Spacing, BorderRadius, FontSizes} from '../constants/styles';
import {getHeaderTitle, subscriptionTypes} from '../utils/constant';
import {flexEnd, flexStart} from '../index';

/**
 * SubscriptionFormScreen Component
 * Subscription form page with image/video upload and activity area selection
 */
const SubscriptionFormScreen = ({
  onClose,
  onNext,
  subscriptionType = subscriptionTypes.broker,
}) => {
  const insets = useSafeAreaInsets();
  const isCompanyFlow = subscriptionType === subscriptionTypes.company;
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

  // Image state (profile pic is chosen on this screen; uploaded to bucket when you press Next/Submit)
  const [profilePicture, setProfilePicture] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [video, setVideo] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const profileVideoPreviewRef = useRef(null);

  const types = [
    'תיווך',
    'עו"ד',
    'עיצוב פנים',
    'ייעוץ משכנתאות',
    'אדריכלות',
    'שמאות',
  ];

  const specializations = ['חוזים וקרקעות', 'קבוצות רכישה', 'נדל"ן', 'השקעות'];

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

  const toggleType = type => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    );
  };

  const toggleSpecialization = specialization => {
    setSelectedSpecializations(prev =>
      prev.includes(specialization)
        ? prev.filter(s => s !== specialization)
        : [...prev, specialization],
    );
  };

  const toggleRegion = region => {
    setSelectedRegions(prev =>
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region],
    );
  };

  // Request image picker permissions
  const requestImagePermission = async () => {
    if (Platform.OS === 'web') {
      // On web, we can proceed without explicit permission
      return true;
    }

    try {
      const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Sorry, we need camera roll permissions to upload images!',
        );
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
      input.onchange = e => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = event => {
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
        mediaTypes: 'images',
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
  const pickAdditionalImage = async index => {
    console.log('pickAdditionalImage called for index:', index);

    // Web fallback using file input
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = event => {
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
        mediaTypes: 'images',
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
      input.onchange = e => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = event => {
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
        mediaTypes: 'images',
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
        mediaTypes: 'videos',
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

      if (subscriptionType === subscriptionTypes.company) {
        if (!companyName) missingFields.push('שם החברה');
        if (!contactPersonName) missingFields.push('שם איש קשר');
        if (!companyEmail) missingFields.push('כתובת מייל');
        if (!officePhone) missingFields.push('מספר טלפון משרד');
      } else {
        // Broker/professional validation
        if (subscriptionType === subscriptionTypes.broker) {
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
        ...(subscriptionType === subscriptionTypes.company
          ? {
              businessName: companyName,
              contactPersonName,
              companyId,
              officePhone,
              mobilePhone,
              email: companyEmail,
              companyWebsite,
              description: addDescription ? description : null,
            }
          : subscriptionType === subscriptionTypes.broker
            ? {
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
              }
            : {
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
        // Step 2 sends the email via resend-code; never on this submit.
        deferVerificationEmail: true,
      };

      // Prepare files (profile pic chosen on this screen → uploaded to profile-pics when you press Next)
      const files = {};
      const profilePicIsUrl =
        profilePicture?.uri &&
        (profilePicture.uri.startsWith('http://') ||
          profilePicture.uri.startsWith('https://'));
      if (profilePicIsUrl) {
        formData.profile_picture_url = profilePicture.uri;
      } else if (profilePicture) {
        files.profilePicture = profilePicture;
      }

      const hasProfileImage = !!profilePicIsUrl || !!files.profilePicture;
      console.log(
        '[SubscriptionFormScreen] Next (stage 2 → verification): profile image included:',
        hasProfileImage,
        hasProfileImage
          ? '(will be uploaded to profile-pics bucket)'
          : '(no image)',
      );

      if (additionalImages.length > 0)
        files.additionalImages = additionalImages.filter(img => img !== null);

      const companyLogoIsUrl =
        companyLogo?.uri &&
        (companyLogo.uri.startsWith('http://') ||
          companyLogo.uri.startsWith('https://'));
      if (companyLogoIsUrl) {
        formData.company_logo_url = companyLogo.uri;
      } else if (companyLogo) {
        files.companyLogo = companyLogo;
      }
      console.log(
        '[SubscriptionFormScreen] Submitting company logo for subscription_type=',
        subscriptionType,
        '-> company_logo_url target column. hasLogo:',
        !!companyLogo,
      );
      if (video && activeTab === 'video') files.video = video;

      const userEmail =
        subscriptionType === subscriptionTypes.company ? companyEmail : email;
      const localProfileImage =
        (companyLogo && companyLogo.uri) ||
        (profilePicture && profilePicture.uri) ||
        null;

      // Defer API submit until step 2 "שלח קוד אימות" — avoids email on screen open.
      if (onNext) {
        onNext({
          email: userEmail,
          localProfileImage,
          pendingSubmit: {formData, files},
        });
      } else {
        console.error('onNext callback is not defined!');
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

  const companyCanProceed =
    companyName.trim() &&
    contactPersonName.trim() &&
    officePhone.trim() &&
    companyEmail.trim() &&
    companyWebsite.trim();
  const brokerCanProceed =
    brokerageLicenseNumber.trim() &&
    brokerOfficeName.trim() &&
    agentName.trim() &&
    phone1.trim() &&
    email.trim() &&
    !!profilePicture;
  const professionalCanProceed =
    businessName.trim() &&
    businessAddress.trim() &&
    phone1.trim() &&
    email.trim() &&
    !!profilePicture;

  const renderCompanyLabel = (label, required = false) => (
    <View style={styles.companyLabelRow}>
      {required && <Text style={styles.companyRequiredMark}>*</Text>}
      <Text style={styles.companyInputLabel}>{label}</Text>
    </View>
  );

  return (
    <ImageBackground
      source={require('../assets/subscription-background.png')}
      style={styles.container}
      resizeMode="cover">
      <View style={[styles.overlay, styles.companyOverlay]} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          styles.companyContentContainer,
          {paddingTop: insets.top},
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Top nav section (dark wrapper with header + wizard) */}
        <View style={styles.topNavSection}>
          <View style={styles.topNavHeader}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={24}
                color={Colors.white100}
              />
            </TouchableOpacity>
            <Text style={styles.topNavHeaderTitle}>
              {getHeaderTitle(subscriptionType)}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.companyWizard}>
            <View style={styles.companyWizardStepInactive}>
              <Text style={styles.companyWizardStepInactiveText}>3</Text>
            </View>
            <View style={styles.companyWizardLine} />
            <View style={styles.companyWizardStepInactive}>
              <Text style={styles.companyWizardStepInactiveText}>2</Text>
            </View>
            <View style={styles.companyWizardLine} />
            <View style={styles.companyWizardStepActive}>
              <Text style={styles.companyWizardStepActiveText}>1</Text>
            </View>
          </View>
        </View>

        {/* Error Notice */}
        {errorMessage && (
          <View style={styles.errorNotice}>
            <Text style={styles.errorNoticeText}>{errorMessage}</Text>
            <TouchableOpacity
              onPress={() => setErrorMessage(null)}
              style={styles.errorCloseButton}>
              <Text style={styles.errorCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab Selector - Only for non-company */}
        {subscriptionType !== subscriptionTypes.company && (
          <View style={styles.brokerTabContainer}>
            <TouchableOpacity
              style={styles.brokerTabPill}
              onPress={() => setActiveTab('images')}>
              {activeTab === 'images' ? (
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.brokerTabPillActiveGradient}>
                  <Text
                    style={[
                      styles.brokerTabPillText,
                      styles.brokerTabPillTextActive,
                    ]}>
                    תמונות
                  </Text>
                </LinearGradient>
              ) : (
                <Text style={styles.brokerTabPillText}>תמונות</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.brokerTabPill}
              onPress={() => setActiveTab('video')}>
              {activeTab === 'video' ? (
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.brokerTabPillActiveGradient}>
                  <Text
                    style={[
                      styles.brokerTabPillText,
                      styles.brokerTabPillTextActive,
                    ]}>
                    סרטון
                  </Text>
                </LinearGradient>
              ) : (
                <Text style={styles.brokerTabPillText}>סרטון</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Picture and Additional Images Section - Only for non-company */}
        {subscriptionType !== subscriptionTypes.company && (
          <>
            <View style={styles.sectionContainer}>
              {activeTab === 'images' ? (
                <>
                  <Text style={styles.brokerCardTitle}>
                    תמונת פרופיל (חובה)
                  </Text>
                  <View style={styles.profileImageWrap}>
                    {profilePicture ? (
                      <>
                        <TouchableOpacity
                          onPress={pickProfilePicture}
                          activeOpacity={0.92}
                          style={styles.profileImageFrame}>
                          <Image
                            source={{uri: profilePicture.uri}}
                            style={styles.profileImageFilled}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setProfilePicture(null)}
                          style={styles.mediaRemoveButton}
                          accessibilityLabel="הסר תמונה"
                          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                          <MaterialCommunityIcons
                            name="close"
                            size={18}
                            color={Colors.white100}
                          />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        onPress={pickProfilePicture}
                        activeOpacity={0.92}
                        style={styles.profileImageFrameEmpty}>
                        <View style={styles.profileImageEmptyContent}>
                          <MaterialCommunityIcons
                            name="account-circle-outline"
                            size={64}
                            color="rgba(255,255,255,0.4)"
                          />
                          <Text style={styles.profileImagePlaceholderText}>
                            תמונת פרופיל
                          </Text>
                          <View style={styles.brokerUploadButton}>
                            <Text style={styles.brokerUploadButtonText}>
                              העלאת תמונה
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.brokerCardTitle}>תמונות נוספות</Text>
                  <View style={styles.additionalImagesRows}>
                    {[
                      [0, 1],
                      [2, 3],
                    ].map((row, rowIndex) => (
                      <View key={rowIndex} style={styles.additionalImageRow}>
                        {row.map(index => (
                          <View key={index} style={styles.additionalImageWrap}>
                            {additionalImages[index] ? (
                              <>
                                <TouchableOpacity
                                  activeOpacity={0.92}
                                  style={styles.additionalImageFrame}
                                  onPress={() => pickAdditionalImage(index)}>
                                  <Image
                                    source={{uri: additionalImages[index].uri}}
                                    style={styles.uploadedImage}
                                    resizeMode="cover"
                                  />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => {
                                    const next = [...additionalImages];
                                    next[index] = null;
                                    setAdditionalImages(next);
                                  }}
                                  style={styles.mediaRemoveButtonSmall}
                                  accessibilityLabel="הסר תמונה"
                                  hitSlop={{
                                    top: 8,
                                    bottom: 8,
                                    left: 8,
                                    right: 8,
                                  }}>
                                  <MaterialCommunityIcons
                                    name="close"
                                    size={14}
                                    color={Colors.white100}
                                  />
                                </TouchableOpacity>
                              </>
                            ) : (
                              <TouchableOpacity
                                style={styles.additionalImagePlaceholder}
                                onPress={() => pickAdditionalImage(index)}>
                                <Text style={styles.additionalImagePlusIcon}>
                                  +
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.brokerCardTitle}>סרטון (חובה)</Text>
                  {video ? (
                    <View style={styles.videoPreviewContainer}>
                      <TouchableOpacity
                        activeOpacity={0.92}
                        onPress={pickVideo}
                        style={styles.videoPreviewFrame}>
                        <Video
                          ref={profileVideoPreviewRef}
                          key={video.uri}
                          source={{uri: video.uri}}
                          style={styles.videoPreviewVideo}
                          resizeMode={ResizeMode.COVER}
                          useNativeControls={false}
                          shouldPlay={false}
                          isMuted
                          isLooping={false}
                          onLoad={() => {
                            profileVideoPreviewRef.current
                              ?.setPositionAsync(0)
                              .catch(() => {});
                          }}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.videoRemoveButton}
                        onPress={() => setVideo(null)}
                        accessibilityLabel="הסר סרטון"
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                        <MaterialCommunityIcons
                          name="close-thick"
                          size={20}
                          color={Colors.white100}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={pickVideo}
                      style={styles.imageUploadContainer}>
                      <View style={styles.videoUploadPlaceholder}>
                        <MaterialCommunityIcons
                          name="video-outline"
                          size={64}
                          color="rgba(255,255,255,0.4)"
                        />
                        <Text style={styles.videoUploadPlaceholderText}>
                          העלה סרטון
                        </Text>
                        <View style={styles.videoUploadButton}>
                          <Text style={styles.videoUploadButtonText}>
                            העלאת סרטון
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            {/* Company Logo Section - No Container */}
            <View style={styles.companyLogoWrap}>
              <TouchableOpacity
                onPress={pickCompanyLogo}
                style={styles.companyLogoTouch}>
                <View style={styles.companyLogoCircle}>
                  <View style={styles.companyLogoInnerFrame}>
                    {companyLogo ? (
                      <Image
                        source={{uri: companyLogo.uri}}
                        style={styles.companyLogoImageFilled}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.companyLogoPlaceholderText}>
                        לוגו{'\n'}חברה
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.companyLogoAddBadge}>
                  <Text style={styles.companyLogoAddBadgeText}>+</Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.companyDivider} />

            {/* Type Section - Only for professional */}
            {subscriptionType === subscriptionTypes.professional && (
              <View style={styles.professionalTagSection}>
                <Text style={styles.sectionTitle}>סוג</Text>
                <View style={styles.optionsContainer}>
                  {types.map((type, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        selectedTypes.includes(type) &&
                          styles.optionButtonSelected,
                      ]}
                      onPress={() => toggleType(type)}>
                      <Text
                        style={[
                          styles.optionText,
                          selectedTypes.includes(type) &&
                            styles.optionTextSelected,
                        ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Specialization Section - Only for professional */}
            {subscriptionType === subscriptionTypes.professional && (
              <View style={styles.professionalTagSection}>
                <Text style={styles.sectionTitle}>התמחות</Text>
                <View style={styles.optionsContainer}>
                  {specializations.map((specialization, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        selectedSpecializations.includes(specialization) &&
                          styles.optionButtonSelected,
                      ]}
                      onPress={() => toggleSpecialization(specialization)}>
                      <Text
                        style={[
                          styles.optionText,
                          selectedSpecializations.includes(specialization) &&
                            styles.optionTextSelected,
                        ]}>
                        {specialization}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {isCompanyFlow && (
          <>
            <View style={styles.companyLogoWrap}>
              <TouchableOpacity
                onPress={pickCompanyLogo}
                style={styles.companyLogoTouch}>
                <View style={styles.companyLogoCircle}>
                  <View style={styles.companyLogoInnerFrame}>
                    {companyLogo ? (
                      <Image
                        source={{uri: companyLogo.uri}}
                        style={styles.companyLogoImageFilled}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.companyLogoPlaceholderText}>
                        לוגו{'\n'}חברה
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.companyLogoAddBadge}>
                  <Text style={styles.companyLogoAddBadgeText}>+</Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.companyDivider} />
          </>
        )}

        {/* General Details Form Section */}
        <View
          style={[
            styles.formSection,
            isCompanyFlow && styles.companyFormSection,
            subscriptionType === subscriptionTypes.broker &&
              styles.brokerFormSection,
            subscriptionType === subscriptionTypes.professional &&
              styles.professionalFormSection,
          ]}>
          {subscriptionType === subscriptionTypes.company && (
            <Text style={[styles.sectionTitle, styles.companySectionTitle]}>
              פרטים כלליים
            </Text>
          )}

          {subscriptionType === subscriptionTypes.company ? (
            <>
              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('שם החברה', true)}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן שם מלא"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={companyName}
                  onChangeText={setCompanyName}
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('שם איש קשר', true)}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן שם איש קשר"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={contactPersonName}
                  onChangeText={setContactPersonName}
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('מספר עוסק / ח.פ')}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן מספר עוסק / ח.פ"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={companyId}
                  onChangeText={setCompanyId}
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('מספר טלפון משרד', true)}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן מספר טלפון"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={officePhone}
                  onChangeText={setOfficePhone}
                  keyboardType="phone-pad"
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('מספר נייד')}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן מספר נייד"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={mobilePhone}
                  onChangeText={setMobilePhone}
                  keyboardType="phone-pad"
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('כתובת מייל', true)}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן כתובת מייל"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={companyEmail}
                  onChangeText={setCompanyEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('כתובת אתר החברה', true)}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן כתובת אתר"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={companyWebsite}
                  onChangeText={setCompanyWebsite}
                  keyboardType="url"
                  autoCapitalize="none"
                  textAlign="left"
                />
              </View>

              <View style={styles.companyDescriptionOption}>
                <Text style={styles.companyDescriptionLabel}>הוסף תיאור</Text>
                <TouchableOpacity
                  onPress={() => setAddDescription(!addDescription)}
                  style={[
                    styles.companyDescriptionCheckbox,
                    addDescription && styles.companyDescriptionCheckboxChecked,
                  ]}>
                  {addDescription && (
                    <MaterialCommunityIcons
                      name="check"
                      size={14}
                      color={Colors.yellowIcons}
                    />
                  )}
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
                    textAlign="left"
                  />
                </View>
              )}
            </>
          ) : subscriptionType === subscriptionTypes.broker ? (
            <>
              {/* Activity Area Section - Only for broker */}
              <View style={styles.brokerSection}>
                <Text style={styles.brokerSectionTitle}>אזור פעילות</Text>
                <View style={styles.brokerChipsContainer}>
                  {activityRegions.map((region, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.brokerChip,
                        selectedRegions.includes(region) &&
                          styles.brokerChipSelected,
                      ]}
                      onPress={() => toggleRegion(region)}>
                      <Text
                        style={[
                          styles.brokerChipText,
                          selectedRegions.includes(region) &&
                            styles.brokerChipTextSelected,
                        ]}>
                        {region}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.companyDivider} />

              {/* General Details Title for Broker */}
              <Text style={[styles.sectionTitle, styles.companySectionTitle]}>
                פרטים כלליים
              </Text>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('מספר רשיון תיווך', true)}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן מספר רישיון"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={brokerageLicenseNumber}
                  onChangeText={setBrokerageLicenseNumber}
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('שם משרד המתווך', true)}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן שם משרד"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={brokerOfficeName}
                  onChangeText={setBrokerOfficeName}
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('שם הסוכן', true)}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן שם מלא"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={agentName}
                  onChangeText={setAgentName}
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('מספר עוסק פטור')}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן מספר עוסק פטור (אופציונאלי)"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={dealerNumber}
                  onChangeText={setDealerNumber}
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('מספר טלפון', true)}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן מספר טלפון"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={phone1}
                  onChangeText={setPhone1}
                  keyboardType="phone-pad"
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('כתובת מייל', true)}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן כתובת מייל"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('תיאור')}
                <TextInput
                  style={[styles.companyTextArea]}
                  placeholder="כתוב תיאור כללי על השירות שלך"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlign="left"
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.companyDivider} />
              <Text style={[styles.sectionTitle, styles.companySectionTitle]}>
                פרטים כלליים
              </Text>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('שם העסק', true)}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן שם"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={businessName}
                  onChangeText={setBusinessName}
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('כתובת בית העסק', true)}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן כתובת"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={businessAddress}
                  onChangeText={setBusinessAddress}
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('מספר עוסק / ח.פ')}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן מספר עוסק פטור (אופציונאלי)"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={dealerNumber}
                  onChangeText={setDealerNumber}
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('מספר טלפון 1', true)}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן מספר טלפון"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={phone1}
                  onChangeText={setPhone1}
                  keyboardType="phone-pad"
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('מספר טלפון 2')}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן מספר טלפון (אופציונאלי)"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={phone2}
                  onChangeText={setPhone2}
                  keyboardType="phone-pad"
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('כתובת מייל', true)}
                <TextInput
                  style={[styles.input, styles.companyInput]}
                  placeholder="הזן כתובת מייל"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign="left"
                />
              </View>

              <View style={styles.companyInputGroup}>
                {renderCompanyLabel('תיאור')}
                <TextInput
                  style={[styles.companyTextArea]}
                  placeholder="כתוב תיאור כללי על השירות שלך"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlign="left"
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              styles.companyNextButton,
              isCompanyFlow &&
                !companyCanProceed &&
                styles.companyNextButtonDisabled,
              subscriptionType === subscriptionTypes.broker &&
                !brokerCanProceed &&
                styles.companyNextButtonDisabled,
              subscriptionType === subscriptionTypes.professional &&
                !professionalCanProceed &&
                styles.companyNextButtonDisabled,
              isSubmitting && styles.nextButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={
              isSubmitting ||
              (isCompanyFlow && !companyCanProceed) ||
              (subscriptionType === subscriptionTypes.broker &&
                !brokerCanProceed) ||
              (subscriptionType === subscriptionTypes.professional &&
                !professionalCanProceed)
            }>
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white100} />
            ) : (
              <Text
                style={[
                  styles.nextButtonText,
                  styles.companyNextButtonText,
                  isCompanyFlow &&
                    !companyCanProceed &&
                    styles.companyNextButtonTextDisabled,
                ]}>
                הבא
              </Text>
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
  companyOverlay: {
    backgroundColor: '#1e1d27',
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
  companyContentContainer: {
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 24,
    gap: 16,
    alignItems: 'center',
  },
  topNavSection: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#1e1d27',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    gap: 16,
  },
  topNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 40,
  },
  topNavHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    color: Colors.white100,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  companyHeader: {
    marginBottom: 0,
    minHeight: 93,
    paddingTop: 43,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    backgroundColor: '#1e1d27',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: flexEnd,
  },
  headerTitle: {
    fontSize: FontSizes.fs18,
    fontWeight: '600',
    color: Colors.white100,
    flex: 1,
    textAlign: 'center',
  },
  companyHeaderTitle: {
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
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
  companyWizard: {
    width: '100%',
    maxWidth: 366,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 12,
  },
  companyWizardLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#4d4966',
  },
  companyWizardStepInactive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4d4966',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyWizardStepInactiveText: {
    color: 'rgba(210,208,220,0.6)',
    fontSize: 24,
    lineHeight: 31,
    fontFamily: 'Rubik-Medium',
  },
  companyWizardStepActive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F4AD39',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  companyWizardStepActiveText: {
    color: '#F4AD39',
    fontSize: 24,
    lineHeight: 31,
    fontFamily: 'Rubik-Medium',
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
    maxWidth: 366,
    alignSelf: 'center',
    gap: 24,
    marginBottom: 4,
    backgroundColor: '#2B2A39',
    borderRadius: BorderRadius.roundCorner2XL,
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginHorizontal: 24,
  },
  sectionTitle: {
    fontSize: FontSizes.fs18,
    fontWeight: '600',
    color: Colors.white100,
    textAlign: 'left',
  },
  companySectionTitle: {
    width: '100%',
    color: Colors.textSecondary,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
  },
  imageInsert: {
    width: '100%',
    height: 200,
  },
  videoPreviewContainer: {
    width: '100%',
    position: 'relative',
  },
  videoPreviewFrame: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.roundCorner2XL,
    overflow: 'hidden',
    backgroundColor: '#1a1a22',
  },
  videoPreviewVideo: {
    width: '100%',
    height: '100%',
  },
  videoRemoveButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  /** Full-bleed marketing PNGs (camera/button chrome); contain + room so nothing is cropped */
  videoUploadPlaceholder: {
    width: '100%',
    height: 234,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  videoUploadPlaceholderText: {
    fontSize: 20,
    fontFamily: 'Rubik-Regular',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  videoUploadButton: {
    backgroundColor: '#4D4966',
    paddingHorizontal: 20.308,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 846.154,
  },
  videoUploadButtonText: {
    color: Colors.white100,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
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
  companyLogoWrap: {
    width: '100%',
    maxWidth: 366,
    alignSelf: 'center',
    alignItems: 'center',
    marginTop: 2,
    paddingHorizontal: 24,
  },
  companyLogoTouch: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyLogoCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: '#F4AD39',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  companyLogoInnerFrame: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#2f2d43',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  companyLogoImageFilled: {
    width: '100%',
    height: '100%',
  },
  companyLogoPlaceholderText: {
    fontSize: 18,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    fontFamily: 'Rubik-Regular',
  },
  companyLogoAddBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#1e1d27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyLogoAddBadgeText: {
    color: '#ffffff',
    fontSize: 24,
    fontFamily: 'Rubik-Regular',
    lineHeight: 24,
    marginTop: -1,
  },
  companyDivider: {
    height: 1,
    width: '100%',
    maxWidth: 366,
    alignSelf: 'center',
    backgroundColor: '#2e2c44',
    opacity: 0.9,
    marginBottom: 6,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: flexStart,
    paddingRight: 6,
  },
  professionalTagSection: {
    width: '100%',
    maxWidth: 366,
    alignSelf: 'center',
    gap: 24,
    marginBottom: 16,
  },
  optionButton: {
    paddingHorizontal: 9.286,
    height: 27.143,
    borderRadius: 35.714,
    backgroundColor: 'transparent',
    borderWidth: 0.714,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonSelected: {
    backgroundColor: 'transparent',
    borderColor: '#ffc40a',
  },
  optionText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    color: '#ffffff',
  },
  optionTextSelected: {
    color: '#ffc40a',
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
    textAlign: 'left',
  },
  formSection: {
    width: '100%',
    maxWidth: 366,
    alignSelf: 'center',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  brokerFormSection: {
    gap: 28,
  },
  professionalFormSection: {
    gap: 24,
  },
  companyFormSection: {
    width: '100%',
    maxWidth: 366,
    alignSelf: 'center',
    gap: 10,
    paddingHorizontal: 0,
  },
  companyInputGroup: {
    width: '100%',
    gap: 10,
  },
  companyLabelRow: {
    flexDirection: 'row',
    justifyContent: flexStart,
    alignItems: 'center',
    gap: 2,
    paddingRight: 16,
  },
  companyRequiredMark: {
    color: '#ffc40a',
    fontSize: 14,
    letterSpacing: 0.14,
    fontFamily: 'Rubik-Regular',
    lineHeight: 14,
  },
  companyInputLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    letterSpacing: 0.14,
    fontFamily: 'Rubik-Regular',
    lineHeight: 14,
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
    textAlign: 'left',
  },
  companyInput: {
    height: 52,
    borderRadius: 1000,
    borderColor: '#8c85b3',
    backgroundColor: 'transparent',
    fontSize: 20,
    letterSpacing: 0.2,
    color: '#ffffff',
    fontFamily: 'Rubik-Regular',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    textAlign: 'left',
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
  companyNextButton: {
    height: 52,
    borderRadius: 1000,
    backgroundColor: '#4d4966',
    marginTop: 4,
  },
  companyNextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white100,
  },
  companyNextButtonText: {
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    color: '#ffffff',
  },
  companyNextButtonTextDisabled: {
    color: 'rgba(255,255,255,0.6)',
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
  companyDescriptionOption: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 8,
    marginTop: 2,
  },
  companyDescriptionLabel: {
    fontSize: 18,
    color: '#ffffff',
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
  },
  companyDescriptionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyDescriptionCheckboxChecked: {
    borderColor: '#F4AD39',
  },
  companyTextArea: {
    width: '100%',
    minHeight: 248,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#8c85b3',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 18,
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    textAlignVertical: 'top',
  },
  brokerTabContainer: {
    width: '100%',
    maxWidth: 366,
    alignSelf: 'center',
    flexDirection: 'row-reverse',
    backgroundColor: '#2b2a39',
    borderRadius: 1000,
    padding: 10,
    marginTop: 4,
    marginHorizontal: 24,
  },
  brokerTabPill: {
    flex: 1,
    height: 44,
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brokerTabPillActiveGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brokerTabPillText: {
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.2,
  },
  brokerTabPillTextActive: {
    color: '#1e1d27',
    fontFamily: 'Rubik-Medium',
  },
  brokerCardTitle: {
    width: '100%',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    color: Colors.textSecondary,
    textAlign: 'left',
  },
  profileImageWrap: {
    width: '100%',
    position: 'relative',
  },
  profileImageFrame: {
    width: '100%',
    height: 234,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1f1e2b',
  },
  profileImageFrameEmpty: {
    width: '100%',
    height: 234,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageEmptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    width: '100%',
  },
  profileImagePlaceholderText: {
    fontSize: 20,
    fontFamily: 'Rubik-Regular',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  brokerUploadButton: {
    backgroundColor: '#4D4966',
    paddingHorizontal: 20.308,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 846.154,
  },
  brokerUploadButtonText: {
    color: Colors.white100,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Rubik-Medium',
  },
  profileImageFilled: {
    width: '100%',
    height: '100%',
  },
  mediaRemoveButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(30,29,39,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaRemoveButtonSmall: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(30,29,39,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  additionalImagesRows: {
    width: '100%',
    gap: 24,
  },
  additionalImageRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 24,
  },
  additionalImageWrap: {
    flex: 1,
    height: 147,
    position: 'relative',
  },
  additionalImageFrame: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1f1e2b',
  },
  additionalImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  additionalImagePlusIcon: {
    fontSize: 24,
    lineHeight: 24,
    color: Colors.white100,
    fontFamily: 'Rubik-Regular',
  },
  brokerSection: {
    width: '100%',
    gap: 24,
    marginBottom: 0,
  },
  brokerSectionTitle: {
    width: '100%',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    color: Colors.textSecondary,
    textAlign: 'left',
  },
  brokerChipsContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: flexStart,
  },
  brokerChip: {
    paddingHorizontal: 9,
    height: 28,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brokerChipSelected: {
    backgroundColor: 'transparent',
    borderColor: '#ffc40a',
  },
  brokerChipText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    color: '#ffffff',
  },
  brokerChipTextSelected: {
    color: '#ffc40a',
    fontFamily: 'Rubik-Medium',
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.white100,
    textAlign: 'left',
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
    textAlign: 'left',
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
