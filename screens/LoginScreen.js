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
  I18nManager,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Spacing, BorderRadius, FontSizes} from '../constants/styles';
import {loginWithPassword} from '../utils/api';

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
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

    if (!email.trim()) {
      setErrorMessage('אנא הזן כתובת מייל');
      return;
    }
    if (!password) {
      setErrorMessage('אנא הזן סיסמה');
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await loginWithPassword(email.trim(), password);
      console.log('Login response:', response);

      const status = response?.subscription?.status;
      const canEnter = status === 'verified' || status === 'active';
      if (canEnter && response?.subscription) {
        if (onLoginSuccess) {
          onLoginSuccess(response.subscription);
        }
      } else if (response?.subscription) {
        setErrorMessage(
          'החשבון שלך עדיין לא אומת. אנא השלם את תהליך האימות.',
        );
      } else {
        setErrorMessage('מייל או סיסמה שגויים. אנא נסה שוב.');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'NO_PASSWORD_SET') {
        setErrorMessage(
          error.message ||
            'לא הוגדרה סיסמה לחשבון. הירשמו מחדש והשלימו שליחת קוד אימות עם סיסמה.',
        );
      } else {
        setErrorMessage(error.message || 'נכשל בהתחברות. אנא נסה שוב.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <View style={[styles.container]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {paddingTop: insets.top + 28},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.topBar, styles.alignEnd]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            activeOpacity={0.8}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.brandWrap}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          {/* <Image
            source={require('../assets/its-just-simple.png')}
            style={styles.sloganImage}
            resizeMode="contain"
          /> */}
        </View>

        <View style={styles.formCard}>
          <Text style={[styles.headerTitle, {textAlign:'left'}]}>התחברות</Text>
          <Text style={[styles.instructionText, {textAlign:'left'}]}>
            הזן את כתובת המייל והסיסמה שלך
          </Text>

          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, {textAlign:'left'}]}>
                {errorMessage}
              </Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={[styles.label, {textAlign:'left'}]}>כתובת מייל</Text>
            <TextInput
              style={[styles.input, {textAlign:'left'}]}
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
            <Text style={[styles.label, {textAlign:'left'}]}>סיסמה</Text>
            <View style={styles.passwordRow}>
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                style={styles.passwordToggle}
                activeOpacity={0.8}>
                <Text style={styles.passwordToggleText}>
                  {showPassword ? 'הסתר' : 'הצג'}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="הזן סיסמה"
                placeholderTextColor={Colors.grey200}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textAlign="right"
              />
            </View>
          </View>

          <TouchableOpacity
            disabled={!email.trim() || !password || isLoggingIn}
            style={[
              styles.loginButton,
              !email.trim() || !password || isLoggingIn
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
            <Text style={styles.onboardingTestButtonText}>
              מבחן עלייה למטוס
            </Text>
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
  const skipWidth = screenWidth * 0.1;
  const skipHeight = screenHeight * 0.1;
  const nextWidth = screenWidth * 0.4;
  const nextHeight = screenHeight * 0.2;
  // RTL mirrors left/right — use start side so the tap zone stays visually top-right.
  const skipCorner = I18nManager.isRTL ? {left: 0} : {right: 0};
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
        style={[
          styles.onboardingSkipZone,
          skipCorner,
          {width: skipWidth, height: skipHeight},
        ]}
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
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  alignStart: {
    justifyContent: 'flex-start',
  },
  alignEnd: {
    justifyContent: 'flex-end',
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
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 16,
    color: Colors.textSecondary,
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
    fontFamily: 'Rubik-Regular',
  },
  inputContainer: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    color: Colors.white100,
    marginBottom: 8,
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1E2A',
    borderColor: '#3B3A4C',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  passwordToggle: {
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  passwordToggleText: {
    color: Colors.yellowIcons,
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
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
    backgroundColor: 'transparent',
  },
  onboardingNextZone: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'transparent',
  },
});

export default LoginScreen;
