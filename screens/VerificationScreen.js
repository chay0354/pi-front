import React, { useState, useEffect } from 'react';
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
import { resendVerificationCode } from '../utils/api';

/**
 * VerificationScreen Component
 * Email verification page for subscription
 */
const VerificationScreen = ({ onClose, onNext, subscriptionType = 'broker', email: propEmail, subscriptionId }) => {
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
  const [email, setEmail] = useState(propEmail || '');
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // Update email when prop changes
  useEffect(() => {
    if (propEmail) {
      setEmail(propEmail);
    }
  }, [propEmail]);
  
  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('שגיאה', 'אנא הזן כתובת מייל');
      return;
    }
    
    setIsSending(true);
    try {
      await resendVerificationCode(email.trim(), subscriptionId);
      setEmailSent(true);
      // Automatically navigate to verification code screen after 1 second
      setTimeout(() => {
        if (onNext) {
          onNext();
        }
      }, 1000);
    } catch (error) {
      console.error('Error sending verification code:', error);
      Alert.alert('שגיאה', error.message || 'נכשל בשליחת קוד האימות. אנא נסה שוב.');
      setIsSending(false);
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

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Image
            source={require('../assets/wizard-progress-step2.png')}
            style={styles.progressImage}
            resizeMode="contain"
          />
        </View>

        {/* Instruction Section */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            הזינו את המייל שלכם לקבלת קוד אימות
          </Text>
          <Image
            source={require('../assets/email-icon.png')}
            style={styles.emailIcon}
            resizeMode="contain"
          />
        </View>

        {/* Email Input Field */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="כתובת מייל"
            placeholderTextColor={Colors.grey200}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textAlign="right"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          disabled={!email.trim() || isSending}
          style={styles.submitButtonWrapper}
          onPress={handleSendCode}
        >
          {isSending ? (
            <View style={styles.submitButtonImage}>
              <ActivityIndicator color={Colors.white100} />
            </View>
          ) : (
            <Image
              source={
                email.trim()
                  ? require('../assets/submit-button-enabled.png')
                  : require('../assets/submit-button-disabled.png')
              }
              style={styles.submitButtonImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
        
        {/* Success Message */}
        {emailSent && (
          <View style={styles.successMessage}>
            <Text style={styles.successMessageText}>
              ✅ קוד האימות נשלח בהצלחה למייל שלך
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (onNext) {
                  onNext();
                }
              }}
              style={styles.continueButton}
            >
              <Text style={styles.continueButtonText}>המשך לקוד האימות</Text>
            </TouchableOpacity>
          </View>
        )}
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
    marginBottom: 40,
  },
  progressImage: {
    width: 366,
    height: 32,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: Colors.white100,
    textAlign: 'right',
  },
  emailIcon: {
    width: 24,
    height: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#2a2933',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.grey200,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.white100,
  },
  submitButtonWrapper: {
    width: '100%',
    marginTop: 8,
  },
  submitButtonImage: {
    width: '100%',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successMessage: {
    backgroundColor: '#2B2A39',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
    gap: 12,
  },
  successMessageText: {
    fontSize: 16,
    color: Colors.white100,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.grey200,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default VerificationScreen;
