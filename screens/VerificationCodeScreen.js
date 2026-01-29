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
import { verifyEmail, resendVerificationCode } from '../utils/api';

/**
 * VerificationCodeScreen Component
 * Screen for entering verification code after email is sent
 */
const VerificationCodeScreen = ({ onClose, onNext, subscriptionType = 'broker', email, subscriptionId }) => {
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
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

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

        {/* Success Message Card */}
        <View style={styles.cardContainer}>
          {/* Success Checkmark */}
          <View style={styles.checkmarkContainer}>
            <Image
              source={require('../assets/success-checkmark.png')}
              style={styles.checkmarkImage}
              resizeMode="contain"
            />
          </View>

          {/* Success Message */}
          <Text style={styles.successTitle}>קוד האימות נשלח בהצלחה</Text>
          <Text style={styles.instructionText}>
            הזינו את קוד האימות ליצירת המנוי
          </Text>

          {/* Verification Code Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="קוד אימות"
              placeholderTextColor={Colors.grey200}
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              textAlign="right"
              maxLength={6}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            disabled={!verificationCode.trim() || isVerifying || (!email && !subscriptionId)}
            style={styles.submitButtonWrapper}
            onPress={async () => {
              if (verificationCode.trim() && (email || subscriptionId) && onNext) {
                setIsVerifying(true);
                try {
                  console.log('Verifying code:', { email, subscriptionId, code: verificationCode.trim() });
                  const response = await verifyEmail(email, verificationCode.trim(), subscriptionId);
                  console.log('Verification response:', response);
                  if (response && response.success) {
                    console.log('Verification successful, navigating to next screen');
                    console.log('Subscription object:', response.subscription);
                    console.log('Subscriber number in response:', response.subscription?.subscriber_number);
                    console.log('Subscriber number field:', response.subscriberNumber);
                    // Make sure subscriber_number is set
                    if (response.subscription && !response.subscription.subscriber_number && response.subscriberNumber) {
                      response.subscription.subscriber_number = response.subscriberNumber;
                    }
                    onNext(response.subscription);
                  } else {
                    Alert.alert('שגיאה', response?.error || 'קוד האימות שגוי. אנא נסה שוב.');
                  }
                } catch (error) {
                  console.error('Verification error:', error);
                  Alert.alert('שגיאה', error.message || 'קוד האימות שגוי. אנא נסה שוב.');
                } finally {
                  setIsVerifying(false);
                }
              } else {
                console.log('Cannot verify:', { 
                  hasCode: !!verificationCode.trim(), 
                  hasEmail: !!email, 
                  hasSubscriptionId: !!subscriptionId, 
                  hasOnNext: !!onNext 
                });
              }
            }}
          >
            {isVerifying ? (
              <View style={styles.submitButtonImage}>
                <ActivityIndicator color={Colors.white100} />
              </View>
            ) : (
              <Image
                source={
                  verificationCode.trim() && email
                    ? require('../assets/submit-button-enabled.png')
                    : require('../assets/submit-button-disabled.png')
                }
                style={styles.submitButtonImage}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>

          {/* Didn't Receive Code Link */}
          <TouchableOpacity
            style={styles.resendLink}
            onPress={async () => {
              if (!email) {
                Alert.alert('שגיאה', 'אימייל לא זמין');
                return;
              }
              setIsResending(true);
              try {
                await resendVerificationCode(email, subscriptionId);
                Alert.alert('הצלחה', 'קוד האימות נשלח מחדש');
              } catch (error) {
                Alert.alert('שגיאה', error.message || 'נכשל בשליחת הקוד מחדש');
              } finally {
                setIsResending(false);
              }
            }}
            disabled={isResending || !email}
          >
            <Text style={styles.resendLinkText}>
              {isResending ? 'שולח...' : 'לא קיבלתי את הקוד'}
            </Text>
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
    marginBottom: 40,
  },
  progressImage: {
    width: 366,
    height: 32,
  },
  cardContainer: {
    backgroundColor: '#2B2A39',
    borderRadius: BorderRadius.roundCorner2XL,
    padding: 24,
    gap: 20,
    alignItems: 'center',
  },
  checkmarkContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  checkmarkImage: {
    width: 60,
    height: 60,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.white100,
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.grey200,
    textAlign: 'center',
    marginBottom: 8,
  },
  inputContainer: {
    width: '100%',
    marginTop: 8,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#2a2933',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.grey200,
    paddingHorizontal: 16,
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 0.2,
    textAlign: 'right',
  },
  submitButtonWrapper: {
    width: '100%',
    marginTop: 8,
  },
  submitButtonImage: {
    width: '100%',
    height: 56,
  },
  resendLink: {
    marginTop: 8,
    paddingVertical: 8,
  },
  resendLinkText: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.grey200,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

export default VerificationCodeScreen;
