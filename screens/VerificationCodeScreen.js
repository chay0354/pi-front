import React, {useState} from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Colors} from '../constants/styles';
import {
  verifyEmail,
  resendVerificationCode,
  verifyEmailSkipTest,
} from '../utils/api';
import {
  getHeaderTitle,
  subscriptionTypes,
  showSkipEmailVerificationTest,
} from '../utils/constant';

const BG = '#1e1d27';
const CARD_BG = '#2b2a39';
const BORDER_DEFAULT = '#8c85b3';
const BORDER_FILLED = '#ffc40a';
const CTA_BG = '#4d4966';
const SUCCESS_CIRCLE = '#15e3ff';

/**
 * Verification code screen aligned with Figma node 10:7015 (broker step 2 - code).
 */
const VerificationCodeScreen = ({
  onClose,
  onNext,
  subscriptionType = subscriptionTypes.broker,
  email,
  subscriptionId,
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSkipTesting, setIsSkipTesting] = useState(false);
  const codeFilled = verificationCode.trim().length > 0;
  const canSubmit = codeFilled && (!!email || !!subscriptionId);

  const handleSubmit = async () => {
    if (!canSubmit || isVerifying) return;
    setIsVerifying(true);
    try {
      const response = await verifyEmail(
        email,
        verificationCode.trim(),
        subscriptionId,
      );
      if (response && response.success) {
        if (
          response.subscription &&
          !response.subscription.subscriber_number &&
          response.subscriberNumber
        ) {
          response.subscription.subscriber_number = response.subscriberNumber;
        }
        if (onNext) onNext(response.subscription);
      } else {
        Alert.alert('שגיאה', response?.error || 'קוד האימות שגוי. אנא נסה שוב.');
      }
    } catch (error) {
      Alert.alert('שגיאה', error.message || 'קוד האימות שגוי. אנא נסה שוב.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email || isResending) return;
    setIsResending(true);
    try {
      await resendVerificationCode(email, subscriptionId);
      Alert.alert('הצלחה', 'קוד האימות נשלח מחדש');
    } catch (error) {
      Alert.alert('שגיאה', error.message || 'נכשל בשליחת הקוד מחדש');
    } finally {
      setIsResending(false);
    }
  };

  const renderStep = (label, active) => (
    <View
      style={[
        styles.wizardStep,
        active ? styles.wizardStepActive : styles.wizardStepInactive,
      ]}>
      <Text
        style={[
          styles.wizardStepText,
          active ? styles.wizardStepTextActive : styles.wizardStepTextInactive,
        ]}>
        {label}
      </Text>
    </View>
  );

  return (
    <ImageBackground
      source={require('../assets/subscription-background.png')}
      style={styles.container}
      resizeMode="cover">
      <View style={styles.overlay} />
      <ScrollView keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={24}
                color={Colors.white100}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{getHeaderTitle(subscriptionType)}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.wizardRow}>
            {renderStep('3', false)}
            <View style={styles.wizardLine} />
            {renderStep('2', true)}
            <View style={styles.wizardLine} />
            {renderStep('1', false)}
          </View>
        </View>

        <View style={styles.cardWrap}>
          <View style={styles.card}>
            <View style={styles.successCircle}>
              <MaterialCommunityIcons name="check" size={20} color={SUCCESS_CIRCLE} />
            </View>

            <View style={styles.titleBlock}>
              <Text style={styles.title}>קוד האימות נשלח בהצלחה</Text>
              <Text style={styles.subtitle}> הזינו את קוד האימות ליצירת המנוי</Text>
            </View>

            <View
              style={[
                styles.inputRow,
                codeFilled && styles.inputRowFilled,
              ]}>
              {codeFilled && (
                <TouchableOpacity
                  onPress={() => setVerificationCode('')}
                  style={styles.clearButton}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <MaterialCommunityIcons
                    name="close"
                    size={18}
                    color={Colors.white100}
                  />
                </TouchableOpacity>
              )}
              <TextInput
                style={[styles.inputField, codeFilled && styles.inputFieldFilled]}
                placeholder="קוד אימות"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                textAlign="right"
                maxLength={6}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit || isVerifying}
              style={[
                styles.ctaButton,
                (!canSubmit || isVerifying) && styles.ctaButtonDisabled,
              ]}>
              {isVerifying ? (
                <ActivityIndicator color={Colors.white100} />
              ) : canSubmit ? (
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.ctaButtonGradient}>
                  <Text style={styles.ctaButtonTextActive}>שלח</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.ctaButtonTextDisabled}>שלח</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendLinkWrap}
              onPress={handleResend}
              disabled={isResending || !email}>
              <Text style={styles.resendLinkText}>
                {isResending ? 'שולח...' : 'לא קיבלתי את הקוד'}
              </Text>
            </TouchableOpacity>

            {showSkipEmailVerificationTest && subscriptionId && onNext && (
              <TouchableOpacity
                style={styles.skipTestLink}
                disabled={isSkipTesting}
                onPress={async () => {
                  setIsSkipTesting(true);
                  try {
                    const response = await verifyEmailSkipTest(
                      email || undefined,
                      subscriptionId,
                    );
                    if (response?.success && response.subscription) {
                      onNext(response.subscription);
                    }
                  } catch (err) {
                    Alert.alert(
                      'שגיאה',
                      err.message ||
                        'דילוג אימות זמין רק כשהשרת מוגדר (ALLOW_SKIP_EMAIL_VERIFICATION=1)',
                    );
                  } finally {
                    setIsSkipTesting(false);
                  }
                }}>
                <Text style={styles.skipTestLinkText}>
                  {isSkipTesting ? 'מדלג...' : 'דלג על אימות מייל (בדיקה)'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
    zIndex: 2,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 40,
    gap: 10,
  },
  topSection: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: BG,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
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
  headerTitle: {
    fontSize: 18,
    color: Colors.white100,
    fontFamily: 'Rubik-Regular',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  wizardRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wizardLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#4d4966',
  },
  wizardStep: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardStepInactive: {
    backgroundColor: '#4d4966',
  },
  wizardStepActive: {
    borderWidth: 2,
    borderColor: '#F4AD39',
    backgroundColor: 'transparent',
  },
  wizardStepText: {
    fontSize: 24,
    lineHeight: 31,
    fontFamily: 'Rubik-Medium',
  },
  wizardStepTextInactive: {
    color: 'rgba(210,208,220,0.6)',
  },
  wizardStepTextActive: {
    color: '#F4AD39',
  },
  cardWrap: {
    width: '100%',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 18,
  },
  successCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: SUCCESS_CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: '#f7f3e6',
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
  },
  subtitle: {
    color: Colors.white100,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 32,
    fontFamily: 'Rubik-Regular',
  },
  inputRow: {
    width: '100%',
    height: 52,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 16,
    overflow: 'hidden',
  },
  inputRowFilled: {
    borderColor: BORDER_FILLED,
  },
  clearButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  inputField: {
    flex: 1,
    height: '100%',
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Rubik-Regular',
    fontSize: 20,
    letterSpacing: 0.2,
    textAlign: 'right',
    backgroundColor: 'transparent',
  },
  inputFieldFilled: {
    color: Colors.white100,
  },
  ctaButton: {
    width: '100%',
    height: 52,
    borderRadius: 1000,
    backgroundColor: CTA_BG,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonDisabled: {
    opacity: 0.4,
  },
  ctaButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonTextDisabled: {
    color: Colors.white100,
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Medium',
  },
  ctaButtonTextActive: {
    color: BG,
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Medium',
  },
  resendLinkWrap: {
    minHeight: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendLinkText: {
    fontSize: 18,
    color: Colors.white100,
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontFamily: 'Rubik-Regular',
  },
  skipTestLink: {
    paddingVertical: 4,
  },
  skipTestLinkText: {
    fontSize: 13,
    color: '#f5a623',
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontFamily: 'Rubik-Medium',
  },
});

export default VerificationCodeScreen;
