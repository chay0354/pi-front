import React, {useState} from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {Colors, Spacing, BorderRadius, FontSizes} from '../constants/styles';
import {getCurrentUser} from '../utils/api';

const ONBOARDING_IMAGES = [
  require('../assets/onbording/1.png'),
  require('../assets/onbording/2.png'),
  require('../assets/onbording/3.png'),
  require('../assets/onbording/4.png'),
  require('../assets/onbording/5.png'),
  require('../assets/onbording/6.png'),
  require('../assets/onbording/7.png'),
  require('../assets/onbording/8.png'),
  require('../assets/onbording/9.png'),
  require('../assets/onbording/10.png'),
  require('../assets/onbording/11.png'),
  require('../assets/onbording/12.png'),
];

/**
 * LoginScreen Component
 * Login page for registered users to sign in
 */
const LoginScreen = ({onClose, onLoginSuccess, onSkipToHome}) => {
  const [email, setEmail] = useState('');
  const [subscriberNumber, setSubscriberNumber] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingIndex, setOnboardingIndex] = useState(0);

  const handleStartOnboarding = () => {
    setOnboardingIndex(0);
    setShowOnboarding(true);
  };

  const handleOnboardingFinish = () => {
    setShowOnboarding(false);
    setOnboardingIndex(0);
    if (onSkipToHome) onSkipToHome();
  };

  const handleOnboardingNext = () => {
    if (onboardingIndex >= ONBOARDING_IMAGES.length - 1) {
      handleOnboardingFinish();
      return;
    }
    setOnboardingIndex(idx => idx + 1);
  };

  const handleLogin = async () => {
    setErrorMessage(null);

    if (!email.trim() && !subscriberNumber.trim()) {
      setErrorMessage('אנא הזן כתובת מייל או מספר מנוי');
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await getCurrentUser(
        email.trim() || null,
        subscriberNumber.trim() || null,
      );
      console.log('Login response:', response);

      if (response && response.subscription) {
        // Check if user is verified
        if (response.subscription.status === 'verified') {
          // Successfully logged in
          if (onLoginSuccess) {
            onLoginSuccess(response.subscription);
          }
        } else {
          setErrorMessage(
            'החשבון שלך עדיין לא אומת. אנא השלם את תהליך האימות.',
          );
        }
      } else {
        setErrorMessage('משתמש לא נמצא. אנא בדוק את הפרטים שהזנת.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage(error.message || 'נכשל בהתחברות. אנא נסה שוב.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.brandWrap}>
          <Image source={require('../assets/logo.png')} style={styles.logoIcon} resizeMode="contain" />
          <Image
            source={require('../assets/its-just-simple.png')}
            style={styles.sloganImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.headerTitle}>התחברות</Text>
          <Text style={styles.instructionText}>הזן את כתובת המייל או מספר המנוי שלך</Text>

          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>כתובת מייל</Text>
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>מספר מנוי</Text>
            <TextInput
              style={styles.input}
              placeholder="הזן מספר מנוי"
              placeholderTextColor={Colors.grey200}
              value={subscriberNumber}
              onChangeText={setSubscriberNumber}
              keyboardType="numeric"
              textAlign="right"
            />
          </View>

          <TouchableOpacity
            disabled={(!email.trim() && !subscriberNumber.trim()) || isLoggingIn}
            style={[
              styles.loginButton,
              (!email.trim() && !subscriberNumber.trim()) || isLoggingIn
                ? styles.loginButtonDisabled
                : null,
            ]}
            onPress={handleLogin}
            activeOpacity={0.85}>
            {isLoggingIn ? (
              <ActivityIndicator color={Colors.white100} />
            ) : (
              <Text style={styles.loginButtonText}>התחבר</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.onboardingTestButton}
            onPress={handleStartOnboarding}
            activeOpacity={0.85}>
            <Text style={styles.onboardingTestButtonText}>test onbording</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showOnboarding ? (
        <OnboardingOverlay
          imageSource={ONBOARDING_IMAGES[onboardingIndex]}
          onNext={handleOnboardingNext}
          onSkip={handleOnboardingFinish}
        />
      ) : null}
    </View>
  );
};

const OnboardingOverlay = ({imageSource, onNext, onSkip}) => {
  const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
  const skipWidth = screenWidth * 0.3;
  const skipHeight = screenHeight * 0.1;
  const nextWidth = screenWidth * 0.4;
  const nextHeight = screenHeight * 0.2;
  return (
    <View style={styles.onboardingOverlay} pointerEvents="box-none">
      <Image
        source={imageSource}
        style={styles.onboardingImage}
        resizeMode="contain"
      />
      <TouchableOpacity
        activeOpacity={1}
        onPress={onSkip}
        style={[styles.onboardingSkipZone, {width: skipWidth, height: skipHeight}]}
      />
      <TouchableOpacity
        activeOpacity={1}
        onPress={onNext}
        style={[
          styles.onboardingNextZone,
          {
            width: nextWidth,
            height: nextHeight,
            left: (screenWidth - nextWidth) / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blue100,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  closeBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 24,
    color: Colors.white100,
    fontWeight: '300',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoIcon: {
    width: 94,
    height: 86,
  },
  sloganImage: {
    width: 112,
    height: 23,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: '#2B2A39',
    borderRadius: BorderRadius.roundCorner2XL,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,196,10,0.38)',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Rubik-Medium',
    color: Colors.white100,
    textAlign: 'right',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.14)',
    borderColor: '#ff4444',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#ffcccc',
    fontSize: FontSizes.sm,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
  },
  inputContainer: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    color: Colors.white100,
    marginBottom: 8,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
  },
  input: {
    backgroundColor: '#1F1E2A',
    borderColor: '#3B3A4C',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: Colors.white100,
    textAlign: 'right',
    fontFamily: 'Rubik-Regular',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3A394A',
  },
  dividerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginHorizontal: 10,
    fontFamily: 'Rubik-Regular',
  },
  loginButton: {
    backgroundColor: Colors.yellowIcons,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 54,
  },
  loginButtonDisabled: {
    backgroundColor: '#6D687B',
    opacity: 0.55,
  },
  loginButtonText: {
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    color: Colors.darkBackground,
  },
  onboardingTestButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,196,10,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingTestButtonText: {
    color: Colors.white100,
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  onboardingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E1D27',
    zIndex: 1000,
  },
  onboardingImage: {
    width: '100%',
    height: '100%',
  },
  onboardingSkipZone: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  onboardingNextZone: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'transparent',
  },
});

export default LoginScreen;
