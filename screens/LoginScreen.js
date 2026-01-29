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
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/styles';
import { getCurrentUser } from '../utils/api';

/**
 * LoginScreen Component
 * Login page for registered users to sign in
 */
const LoginScreen = ({ onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [subscriberNumber, setSubscriberNumber] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    
    if (!email.trim() && !subscriberNumber.trim()) {
      setErrorMessage('אנא הזן כתובת מייל או מספר מנוי');
      return;
    }
    
    setIsLoggingIn(true);
    try {
      const response = await getCurrentUser(email.trim() || null, subscriberNumber.trim() || null);
      console.log('Login response:', response);
      
      if (response && response.subscription) {
        // Check if user is verified
        if (response.subscription.status === 'verified') {
          // Successfully logged in
          if (onLoginSuccess) {
            onLoginSuccess(response.subscription);
          }
        } else {
          setErrorMessage('החשבון שלך עדיין לא אומת. אנא השלם את תהליך האימות.');
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
            <Text style={styles.backText}>חזור</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>התחברות</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Instruction Section */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            הזן את כתובת המייל או מספר המנוי שלך
          </Text>
        </View>

        {/* Error Message */}
        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Email Input Field */}
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

        {/* Or Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>או</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Subscriber Number Input Field */}
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

        {/* Login Button */}
        <TouchableOpacity
          disabled={(!email.trim() && !subscriberNumber.trim()) || isLoggingIn}
          style={[
            styles.loginButton,
            (!email.trim() && !subscriberNumber.trim()) || isLoggingIn ? styles.loginButtonDisabled : null
          ]}
          onPress={handleLogin}
        >
          {isLoggingIn ? (
            <ActivityIndicator color={Colors.white100} />
          ) : (
            <Text style={styles.loginButtonText}>התחבר</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: FontSizes.md,
    color: Colors.white100,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.white100,
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 60,
  },
  instructionContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  instructionText: {
    fontSize: FontSizes.lg,
    color: Colors.white100,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    borderColor: '#ff4444',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: '#ffcccc',
    fontSize: FontSizes.md,
    textAlign: 'right',
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.md,
    color: Colors.white100,
    marginBottom: Spacing.sm,
    textAlign: 'right',
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.grey800,
    borderColor: Colors.grey700,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.white100,
    textAlign: 'right',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.grey700,
  },
  dividerText: {
    fontSize: FontSizes.sm,
    color: Colors.grey400,
    marginHorizontal: Spacing.md,
  },
  loginButton: {
    backgroundColor: Colors.yellowIcons,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    minHeight: 56,
  },
  loginButtonDisabled: {
    backgroundColor: Colors.grey700,
    opacity: 0.5,
  },
  loginButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.darkBackground,
  },
});

export default LoginScreen;
