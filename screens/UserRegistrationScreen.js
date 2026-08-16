import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {ensureMediaLibraryPermission} from '../utils/mediaLibraryPermission';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {subscriptionTypes} from '../utils/constant';
import {uploadProfilePicture, registerRegularUser, checkEmailAvailable} from '../utils/api';
import {useKeyboardInset} from '../utils/formKeyboardScroll';
import {flexStart} from '../utils/rtlLayout';
import {ProfileAvatar} from '../components';
import CircleImageCropModal from '../components/CircleImageCropModal';

const UserRegistrationScreen = ({
  onSuccess,
  onCancel,
  onOpenLogin: _onOpenLogin,
  selectedCategory: _selectedCategory,
  /** Guest BnB "פרסם כעסק" — gold ring on registration only; account stays regular user. */
  bnbBusinessRegistration = false,
}) => {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [socialPhone, setSocialPhone] = useState('');
  const [socialName, setSocialName] = useState('');
  const [address, setAddress] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleTrigger, setGoogleTrigger] = useState(0);
  const [GoogleAuthComponent, setGoogleAuthComponent] = useState(null);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleTrigger, setAppleTrigger] = useState(0);
  const [AppleAuthComponent, setAppleAuthComponent] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [socialError, setSocialError] = useState(null);
  const scrollRef = React.useRef(null);
  const scrollYRef = React.useRef(0);
  const focusedTargetRef = React.useRef(null);

  const scrollFocusedIntoView = useCallback(
    event => {
      const target = event?.target;
      if (target) focusedTargetRef.current = target;
      const run = () => {
        if (!scrollRef.current) return;
        const keyboardHeight = Math.max(0, keyboardInset || 0);
        const visibleBottom =
          Dimensions.get('window').height -
          keyboardHeight -
          Math.max(insets.bottom, 12) -
          28;

        if (typeof target?.measureInWindow !== 'function') {
          scrollRef.current.scrollToEnd?.({animated: true});
          return;
        }

        target.measureInWindow((_x, fieldTop, _w, fieldHeight) => {
          const fieldBottom = fieldTop + (fieldHeight || 0);
          if (fieldBottom <= visibleBottom) return;
          scrollRef.current.scrollTo({
            y: scrollYRef.current + (fieldBottom - visibleBottom) + 20,
            animated: true,
          });
        });
      };

      requestAnimationFrame(run);
      // Keyboard animation finishes after focus; nudge again.
      setTimeout(run, Platform.OS === 'android' ? 280 : 100);
      if (Platform.OS === 'android') setTimeout(run, 450);
    },
    [keyboardInset, insets.bottom],
  );

  useEffect(() => {
    if (keyboardInset <= 0 || !focusedTargetRef.current) return;
    scrollFocusedIntoView({target: focusedTargetRef.current});
  }, [keyboardInset, scrollFocusedIntoView]);
  const [cropUri, setCropUri] = useState(null);
  const [cropVisible, setCropVisible] = useState(false);
  const MIN_PASSWORD_LENGTH = 8;
  const GOOGLE_BUTTON_IMAGE = require('../assets/registrations/google.png');
  const APPLE_BUTTON_IMAGE = require('../assets/registrations/apple.png');

  const finishAuthWithSubscription = useCallback(
    (
      reg,
      {
        fallbackEmail = '',
        fallbackName = '',
        fallbackPhone = '',
        fallbackProfilePictureUrl = null,
        fallbackAddress = '',
      } = {},
    ) => {
      if (!reg || !reg.success || !reg.subscription || !reg.subscription.id) {
        setErrorMessage(
          (reg && reg.error) || 'לא הצלחנו להתחבר. נסה שוב.',
        );
        return false;
      }

      const sub = reg.subscription;
      const user = {
        ...sub,
        id: sub.id,
        subscription_type: sub.subscription_type || subscriptionTypes.user,
        email: sub.email || fallbackEmail,
        name: sub.name || fallbackName || sub.email || fallbackEmail,
        phone: sub.phone || fallbackPhone || null,
        business_address:
          sub.business_address || fallbackAddress || null,
        profile_picture_url:
          sub.profile_picture_url || fallbackProfilePictureUrl || null,
        status: sub.status || 'verified',
      };

      if (onSuccess) onSuccess(user);
      return true;
    },
    [onSuccess],
  );

  const requestMediaPermission = async () => {
    if (Platform.OS !== 'web') {
      try {
        await ImagePicker.requestCameraPermissionsAsync();
        const {status} =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'נדרשת הרשאה',
            'נדרשת הרשאה לספריית התמונות להעלאת תמונת פרופיל.',
          );
        }
      } catch (error) {
        console.error('Permission request error:', error);
      }
    }
  };

  useEffect(() => {
    requestMediaPermission();
  }, []);

  const openProfileCropper = uri => {
    if (!uri) return;
    setCropUri(uri);
    setCropVisible(true);
  };

  const handleProfileCropConfirm = result => {
    if (result?.uri) {
      setProfileImage({
        uri: result.uri,
        type: 'image/jpeg',
        name: `profile-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        fileName: `profile-${Date.now()}.jpg`,
      });
    }
    setCropVisible(false);
    setCropUri(null);
  };

  const handleProfileCropCancel = () => {
    setCropVisible(false);
    setCropUri(null);
  };

  const pickProfileImage = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        const file = e.target.files?.[0];
        if (file) {
          openProfileCropper(URL.createObjectURL(file));
        }
      };
      input.click();
      return;
    }

    try {
      const permitted = await ensureMediaLibraryPermission();
      if (!permitted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled && result.assets[0]) {
        openProfileCropper(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('שגיאה', 'לא ניתן לבחור תמונה. נסה שוב.');
    }
  };

  const handleRegister = async () => {
    setErrorMessage(null);
    const name = fullName.trim();
    const emailTrim = email.trim();
    const phoneTrim = phone.trim();
    const addressTrim = address.trim();

    if (!name) {
      setErrorMessage('אנא הזן שם מלא');
      return;
    }
    if (!emailTrim) {
      setErrorMessage('אנא הזן כתובת מייל');
      return;
    }
    if (!phoneTrim) {
      setErrorMessage('אנא הזן מספר טלפון');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('הסיסמאות אינן תואמות');
      return;
    }

    const emailCheck = await checkEmailAvailable(emailTrim);
    if (!emailCheck?.available) {
      setErrorMessage(
        emailCheck?.error ||
          'כתובת המייל כבר רשומה במערכת. התחבר עם המייל הקיים או השתמש במייל אחר.',
      );
      return;
    }

    setSubmitting(true);
    try {
      let profilePictureUrl = null;
      if (profileImage && profileImage.uri) {
        try {
          const file = {
            uri: profileImage.uri,
            type: profileImage.mimeType || profileImage.type || 'image/jpeg',
            name:
              profileImage.fileName ||
              profileImage.uri?.split('/').pop() ||
              'profile.jpg',
          };
          const data = await uploadProfilePicture(file);
          if (data && data.url) profilePictureUrl = data.url;
        } catch (uploadErr) {
          console.warn('Profile picture upload failed:', uploadErr);
        }
      }
      let reg;
      try {
        reg = await registerRegularUser({
          email: emailTrim,
          name,
          phone: phoneTrim,
          businessAddress: addressTrim || null,
          profilePictureUrl,
          password,
        });
      } catch (regErr) {
        console.error('registerRegularUser threw:', regErr);
        setErrorMessage(regErr?.message || 'שגיאה בשמירת המשתמש. נסה שוב.');
        return;
      }

      if (!reg || !reg.success || !reg.subscription || !reg.subscription.id) {
        setErrorMessage(
          (reg && reg.error) || 'לא הצלחנו ליצור את המשתמש. נסה שוב.',
        );
        return;
      }

      finishAuthWithSubscription(reg, {
        fallbackEmail: emailTrim,
        fallbackName: name,
        fallbackPhone: phoneTrim,
        fallbackAddress: addressTrim,
        fallbackProfilePictureUrl: profilePictureUrl,
      });
    } catch (err) {
      setErrorMessage(err.message || 'אירעה שגיאה. נסה שוב.');
    } finally {
      setSubmitting(false);
    }
  };

  const showSocialError = message => {
    setSocialError(message);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd?.({animated: true});
    });
  };

  const validateSocialFields = providerLabel => {
    const nameTrim = socialName.trim();
    const phoneTrim = socialPhone.trim();
    if (!nameTrim) {
      showSocialError(`אנא הזן שם מלא לפני ההרשמה עם ${providerLabel}`);
      return null;
    }
    if (!phoneTrim) {
      showSocialError(`אנא הזן מספר טלפון לפני ההרשמה עם ${providerLabel}`);
      return null;
    }
    return {nameTrim, phoneTrim};
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSocialError(null);
    if (!validateSocialFields('Google')) return;
    const webClientId = String(
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    ).trim();
    if (!webClientId) {
      showSocialError(
        'Google Sign-In לא מוגדר. הוסף EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ל-.env והפעל מחדש את Expo.',
      );
      return;
    }

    setGoogleLoading(true);
    try {
      let AuthComponent = GoogleAuthComponent;
      if (!AuthComponent) {
        const mod = await import('../components/GoogleRegistrationAuth');
        AuthComponent = mod.default;
        setGoogleAuthComponent(() => AuthComponent);
      }
      setGoogleTrigger(n => n + 1);
    } catch (err) {
      setGoogleLoading(false);
      showSocialError(
        err?.message ||
          'Google Sign-In דורש rebuild של האפליקציה: npm run android',
      );
    }
  };

  const handleAppleSignIn = async () => {
    setErrorMessage(null);
    setSocialError(null);
    if (!validateSocialFields('Apple')) return;

    setAppleLoading(true);
    try {
      let AuthComponent = AppleAuthComponent;
      if (!AuthComponent) {
        const mod = await import('../components/AppleRegistrationAuth');
        AuthComponent = mod.default;
        setAppleAuthComponent(() => AuthComponent);
      }
      setAppleTrigger(n => n + 1);
    } catch (err) {
      setAppleLoading(false);
      showSocialError(
        err?.message ||
          'Apple Sign-In דורש rebuild של האפליקציה: npm run ios',
      );
    }
  };

  const busy = submitting || googleLoading || appleLoading;

  const bottomPad =
    Math.max(insets.bottom, 16) + 48 + Math.max(0, keyboardInset);

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, {paddingTop: insets.top + 8}]}>
        <TouchableOpacity
          onPress={onCancel}
          style={styles.backButton}
          hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
          accessibilityRole="button"
          accessibilityLabel="חזרה">
          <MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        onScroll={e => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {paddingBottom: bottomPad},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.mainContent}>
            <View style={styles.profileSection}>
              <TouchableOpacity
                onPress={pickProfileImage}
                activeOpacity={0.85}
                style={styles.avatarWrap}
                accessibilityRole="button"
                accessibilityLabel="בחר תמונת פרופיל">
                <ProfileAvatar
                  uri={profileImage?.uri || null}
                  name={fullName}
                  size={82}
                  subscriptionType={subscriptionTypes.user}
                  forceGoldRing={bnbBusinessRegistration}
                  imageStyle={
                    Platform.OS === 'web' ? {objectFit: 'cover'} : undefined
                  }
                />
                {!profileImage ? (
                  <View style={styles.avatarAddBadge}>
                    <MaterialCommunityIcons
                      name="plus"
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>
                ) : null}
              </TouchableOpacity>
              <Text style={styles.profileLabel}>תמונת פרופיל</Text>
            </View>

            <View style={styles.headerBlock}>
              <Text style={styles.title}>הירשם ופרסם מודעה</Text>
              <Text style={styles.subtitle}>
                בוא נתחיל - זה ייקח שניות בודדות
              </Text>
            </View>

            <View style={styles.formBlock}>
              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <View style={styles.inputWrap}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>שם מלא</Text>
                  <Text style={styles.requiredMark}>*</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="שם פרטי ומשפחה"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={scrollFocusedIntoView}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputWrap}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>כתובת מייל</Text>
                  <Text style={styles.requiredMark}>*</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="example@gmail.com"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={scrollFocusedIntoView}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputWrap}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>סיסמה</Text>
                  <Text style={styles.requiredMark}>*</Text>
                </View>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="בחרו סיסמה"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={scrollFocusedIntoView}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    textAlign="right"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(v => !v)}
                    style={styles.passwordToggle}
                    activeOpacity={0.8}>
                    <MaterialCommunityIcons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputWrap}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>אימות סיסמה</Text>
                  <Text style={styles.requiredMark}>*</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="הזינו שוב את הסיסמה"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={scrollFocusedIntoView}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.label}>טלפון</Text>
                <View style={styles.phoneRow}>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="00 000 0000"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={phone}
                    onChangeText={setPhone}
                    onFocus={scrollFocusedIntoView}
                    keyboardType="phone-pad"
                    textAlign="left"
                  />
                  <TouchableOpacity
                    style={styles.countrySelector}
                    activeOpacity={0.8}>
                    <Text style={styles.countryChevron}>⌄</Text>
                    <Text style={styles.countryCode}>IL</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.label}>כתובת</Text>
                <TextInput
                  style={styles.input}
                  placeholder="רחוב, עיר"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={address}
                  onChangeText={setAddress}
                  onFocus={scrollFocusedIntoView}
                  textAlign="right"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={busy}
              style={styles.registerButtonWrap}
              activeOpacity={0.9}>
              <LinearGradient
                colors={['#FEE787', '#BD9947', '#9C6522']}
                locations={[0.045575, 0.50763, 0.88314]}
                start={{x: 0.5, y: 0}}
                end={{x: 0.5, y: 1}}
                style={styles.registerButton}>
                {submitting ? (
                  <ActivityIndicator color="#1E1D27" />
                ) : (
                  <Text style={styles.registerButtonText}>
                    הרשם ופרסם מודעה
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>או</Text>
              <View style={styles.orLine} />
            </View>

            <View style={styles.socialWrap}>
              <View style={styles.inputWrap}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>שם מלא להרשמה עם Google / Apple</Text>
                  <Text style={styles.requiredMark}>*</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="שם פרטי ומשפחה"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={socialName}
                  onChangeText={text => {
                    setSocialName(text);
                    if (socialError) setSocialError(null);
                  }}
                  onFocus={scrollFocusedIntoView}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputWrap}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>טלפון להרשמה עם Google / Apple</Text>
                  <Text style={styles.requiredMark}>*</Text>
                </View>
                <View style={styles.phoneRow}>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="00 000 0000"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={socialPhone}
                    onChangeText={text => {
                      setSocialPhone(text);
                      if (socialError) setSocialError(null);
                    }}
                    onFocus={scrollFocusedIntoView}
                    keyboardType="phone-pad"
                    textAlign="left"
                  />
                  <TouchableOpacity
                    style={styles.countrySelector}
                    activeOpacity={0.8}>
                    <Text style={styles.countryChevron}>⌄</Text>
                    <Text style={styles.countryCode}>IL</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.socialButtonImageWrap}
                onPress={handleGoogleSignIn}
                disabled={busy}
                activeOpacity={0.85}>
                <Image
                  source={GOOGLE_BUTTON_IMAGE}
                  style={[
                    styles.socialButtonImage,
                    busy && styles.socialButtonDisabled,
                  ]}
                  resizeMode="cover"
                />
                {googleLoading ? (
                  <View style={styles.socialLoadingOverlay}>
                    <ActivityIndicator color="#1E1D27" />
                  </View>
                ) : null}
              </TouchableOpacity>

              {Platform.OS === 'ios' ? (
                <TouchableOpacity
                  style={styles.socialButtonImageWrap}
                  onPress={handleAppleSignIn}
                  disabled={busy}
                  activeOpacity={0.85}>
                  <Image
                    source={APPLE_BUTTON_IMAGE}
                    style={[
                      styles.socialButtonImage,
                      busy && styles.socialButtonDisabled,
                    ]}
                    resizeMode="cover"
                  />
                  {appleLoading ? (
                    <View style={styles.socialLoadingOverlay}>
                      <ActivityIndicator color="#1E1D27" />
                    </View>
                  ) : null}
                </TouchableOpacity>
              ) : null}

              {socialError ? (
                <View style={styles.socialErrorContainer}>
                  <Text style={styles.socialErrorText}>{socialError}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>
      {GoogleAuthComponent ? (
        <GoogleAuthComponent
          triggerNonce={googleTrigger}
          onTriggerConsumed={() => {}}
          onLoadingChange={setGoogleLoading}
          onError={msg => showSocialError(msg)}
          phone={socialPhone.trim()}
          name={socialName.trim() || null}
          businessAddress={address.trim() || null}
          onSuccess={reg =>
            finishAuthWithSubscription(reg, {
              fallbackPhone: socialPhone.trim(),
              fallbackName: socialName.trim(),
              fallbackAddress: address.trim(),
            })
          }
        />
      ) : null}
      {Platform.OS === 'ios' && AppleAuthComponent ? (
        <AppleAuthComponent
          triggerNonce={appleTrigger}
          onTriggerConsumed={() => {}}
          onLoadingChange={setAppleLoading}
          onError={msg => showSocialError(msg)}
          phone={socialPhone.trim()}
          name={socialName.trim() || null}
          businessAddress={address.trim() || null}
          onSuccess={reg =>
            finishAuthWithSubscription(reg, {
              fallbackPhone: socialPhone.trim(),
              fallbackName: socialName.trim(),
              fallbackAddress: address.trim(),
            })
          }
        />
      ) : null}
      <CircleImageCropModal
        visible={cropVisible}
        imageUri={cropUri}
        onCancel={handleProfileCropCancel}
        onConfirm={handleProfileCropConfirm}
        title="חתוך את תמונת הפרופיל"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2B2A39',
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 4,
    width: '100%',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  card: {
    backgroundColor: '#2B2A39',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 36,
    gap: 32,
    maxWidth: 366,
    alignSelf: 'center',
    width: '100%',
  },
  mainContent: {
    width: '100%',
    gap: 28,
  },
  headerBlock: {
    width: '100%',
    gap: 14,
    alignItems: 'center',
  },
  title: {
    width: '100%',
    fontSize: 28,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    color: '#F7F3E6',
    textAlign: 'center',
  },
  subtitle: {
    width: '100%',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  formBlock: {
    width: '100%',
    gap: 20,
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarAddBadge: {
    position: 'absolute',
    bottom: -5,
    ...(Platform.OS === 'web' ? {right: -5} : {left: -5}),
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1D27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLabel: {
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0.14,
    color: '#D2D0DC',
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  errorContainer: {
    backgroundColor: 'rgba(255,0,0,0.15)',
    borderRadius: 12,
    padding: 12,
    width: '100%',
  },
  errorText: {
    color: '#ffcccc',
    fontSize: 14,
    textAlign: 'left',
  },
  inputWrap: {
    width: '100%',
    gap: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: flexStart,
    gap: 2,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0.14,
    color: '#D2D0DC',
    textAlign: 'left',
    fontFamily: 'Rubik-Regular',
  },
  requiredMark: {
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0.14,
    color: '#D2D0DC',
    textAlign: 'left',
    fontFamily: 'Rubik-Regular',
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8C85B3',
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Regular',
    color: '#FFFFFF',
    height: 52,
    textAlign: 'left',
    writingDirection: 'rtl',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8C85B3',
    borderRadius: 1000,
    height: 52,
    paddingLeft: 10,
    paddingRight: 16,
    overflow: 'hidden',
  },
  passwordToggle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  passwordInput: {
    flex: 1,
    fontSize: 20,
    lineHeight: 20,
    color: '#FFFFFF',
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    height: '100%',
    backgroundColor: 'transparent',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8C85B3',
    borderRadius: 1000,
    height: 52,
    overflow: 'hidden',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 78,
    height: 50,
    borderRightWidth: 1,
    borderRightColor: '#343243',
  },
  countryChevron: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 24,
    fontFamily: 'Rubik-Regular',
    marginTop: -6,
  },
  countryCode: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 34,
    fontFamily: 'Rubik-Regular',
    marginTop: -1,
  },
  phoneInput: {
    flex: 1,
    fontSize: 20,
    lineHeight: 20,
    color: '#FFFFFF',
    paddingVertical: 0,
    paddingHorizontal: 14,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    writingDirection: 'rtl',
    height: '100%',
  },
  registerButtonWrap: {
    width: '100%',
    borderRadius: 1000,
    overflow: 'hidden',
    height: 52,
  },
  registerButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: 0.2,
    color: '#1E1D27',
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    width: '100%',
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#343243',
  },
  orText: {
    fontSize: 18,
    lineHeight: 22,
    color: '#FFFFFF',
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  socialWrap: {
    width: '100%',
    gap: 14,
    alignItems: 'center',
  },
  socialErrorContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,0,0,0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 2,
  },
  socialErrorText: {
    color: '#ffcccc',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Rubik-Regular',
  },
  socialButtonImageWrap: {
    width: 326,
    height: 52,
    borderRadius: 1000,
    overflow: 'hidden',
    position: 'relative',
  },
  socialButtonImage: {
    width: '100%',
    height: '100%',
  },
  socialButtonDisabled: {
    opacity: 0.55,
  },
  socialLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(43, 42, 57, 0.35)',
  },
});

export default UserRegistrationScreen;
