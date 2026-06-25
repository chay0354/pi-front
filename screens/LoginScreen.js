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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Spacing, BorderRadius, FontSizes} from '../constants/styles';
import {loginWithPassword} from '../utils/api';

/**
 * LoginScreen Component
 * Login page for registered users to sign in
 */
const LoginScreen = ({onClose, onLoginSuccess, onForgotPassword}) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

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
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            {paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24},
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
          </View>

          <View style={styles.formCard}>
            <Text style={[styles.headerTitle, {textAlign: 'left'}]}>התחברות</Text>
            <Text style={[styles.instructionText, {textAlign: 'left'}]}>
              הזן את כתובת המייל והסיסמה שלך
            </Text>

            {errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, {textAlign: 'left'}]}>
                  {errorMessage}
                </Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, {textAlign: 'left'}]}>כתובת מייל</Text>
              <TextInput
                style={[styles.input, {textAlign: 'left'}]}
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
              <Text style={[styles.label, {textAlign: 'left'}]}>סיסמה</Text>
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
              onPress={() => {
                const trimmed = email.trim();
                if (!trimmed) {
                  Alert.alert('שגיאה', 'אנא הזן כתובת מייל לפני איפוס הסיסמה.');
                  return;
                }
                if (onForgotPassword) onForgotPassword(trimmed);
              }}
              activeOpacity={0.8}
              style={styles.forgotPasswordBtn}>
              <Text style={styles.forgotPasswordText}>שכחתם את הסיסמא?</Text>
            </TouchableOpacity>

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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blue100,
    width: '100%',
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  topBar: {
    flexDirection: 'row',
    marginBottom: 4,
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
    marginBottom: 10,
  },
  logoIcon: {
    width: 72,
    height: 66,
  },
  sloganImage: {
    width: 112,
    height: 23,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: '#2B2A39',
    borderRadius: BorderRadius.roundCorner2XL,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,196,10,0.38)',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 366,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    color: Colors.white100,
    marginBottom: 6,
  },
  instructionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: 'Rubik-Regular',
    marginBottom: 10,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.14)',
    borderColor: '#ff4444',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    color: '#ffcccc',
    fontSize: FontSizes.sm,
    fontFamily: 'Rubik-Regular',
  },
  inputContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: Colors.white100,
    marginBottom: 6,
    fontFamily: 'Rubik-Regular',
  },
  input: {
    backgroundColor: '#1F1E2A',
    borderColor: '#3B3A4C',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    paddingVertical: 10,
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
  forgotPasswordBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
    marginBottom: 4,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: Colors.yellowIcons,
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    textDecorationLine: 'underline',
  },
  loginButton: {
    backgroundColor: Colors.yellowIcons,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 46,
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
});

export default LoginScreen;
