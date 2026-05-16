import React, {useMemo, useState} from 'react';
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
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {flexEnd} from '../index';

import {
  resendVerificationCode,
  setSubscriptionPassword,
  submitSubscription,
  verifyEmail,
  verifyEmailSkipTest,
} from '../utils/api';
import {
  getHeaderTitle,
  subscriptionTypes,
  showSkipEmailVerificationTest,
} from '../utils/constant';

const BG = '#1e1d27';
const BORDER = '#8c85b3';
const BORDER_FILLED = '#ffc40a';
const SUCCESS_CIRCLE = '#15e3ff';
const CTA_BG = '#4d4966';
const MIN_PASSWORD_LENGTH = 8;

/**
 * B2B registration step 2 (broker, company, professional — same screen, 3 App routes).
 * Password is saved via set-password + resend-code on send, and again on verify / skip-test.
 */
const VerificationScreen = ({
  onClose,
  onVerified,
  onSkipVerifiedTest,
  subscriptionType = subscriptionTypes.broker,
  email: propEmail,
  subscriptionId: propSubscriptionId,
  pendingSubmit,
}) => {
  const insets = useSafeAreaInsets();
  const displayEmail = String(propEmail || '').trim();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSkipTesting, setIsSkipTesting] = useState(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState(() =>
    pendingSubmit?.formData ? null : propSubscriptionId || null,
  );

  const passwordsFilled =
    password.length >= MIN_PASSWORD_LENGTH &&
    confirmPassword.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = password === confirmPassword;
  const passwordsReady = passwordsFilled && passwordsMatch;
  const isSendReady =
    passwordsReady && !!displayEmail && !verificationEmailSent;

  const handleSendVerificationEmail = async () => {
    console.log('[VerificationScreen] send verification code: pressed', {
      displayEmail,
      passwordsReady,
      passwordsFilled,
      passwordsMatch,
      isSendReady,
      isSending,
      verificationEmailSent,
      subscriptionId,
      hasPendingSubmit: Boolean(pendingSubmit?.formData),
    });

    if (isSending || verificationEmailSent) {
      console.log(
        '[VerificationScreen] send verification code: skipped (sending or already sent)',
      );
      return;
    }
    if (!displayEmail) {
      console.warn('[VerificationScreen] send verification code: missing email');
      Alert.alert('שגיאה', 'חסר מייל מהשלב הקודם. חזרו לשלב 1.');
      return;
    }
    if (!passwordsFilled) {
      console.warn('[VerificationScreen] send verification code: password too short');
      Alert.alert(
        'שגיאה',
        `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`,
      );
      return;
    }
    if (!passwordsMatch) {
      console.warn('[VerificationScreen] send verification code: passwords mismatch');
      Alert.alert('שגיאה', 'הסיסמאות אינן תואמות');
      return;
    }

    setIsSending(true);
    console.log('[VerificationScreen] send verification code: started');
    try {
      let subId = subscriptionId;
      if (!subId && pendingSubmit?.formData) {
        console.log('[VerificationScreen] submitSubscription: start');
        const created = await submitSubscription(
          pendingSubmit.formData,
          pendingSubmit.files || {},
        );
        console.log('[VerificationScreen] submitSubscription: done', {
          success: created?.success,
          subscriptionId: created?.subscriptionId,
          verificationEmailDeferred: created?.verificationEmailDeferred,
        });
        if (!created?.success || !created.subscriptionId) {
          throw new Error(created?.error || 'נכשל בשמירת הטופס');
        }
        subId = created.subscriptionId;
        setSubscriptionId(subId);
      }
      if (!subId) {
        throw new Error('חסר מזהה מנוי. חזרו לשלב 1 ונסו שוב.');
      }

      console.log('[VerificationScreen] setSubscriptionPassword: start', {subId});
      await setSubscriptionPassword(subId, password);
      console.log('[VerificationScreen] setSubscriptionPassword: success');

      console.log('[VerificationScreen] resendVerificationCode: start', {
        email: displayEmail,
        subscriptionId: subId,
      });
      const sendResult = await resendVerificationCode(
        displayEmail,
        subId,
        password,
      );
      console.log('[VerificationScreen] resendVerificationCode: success', sendResult);
      setVerificationEmailSent(true);
      console.log('[VerificationScreen] send verification code: completed');
      Alert.alert('הצלחה', 'קוד האימות נשלח למייל שלך');
    } catch (error) {
      console.error('[VerificationScreen] send verification code: failed', error);
      Alert.alert(
        'שגיאה',
        error.message || 'נכשל בשמירת הסיסמה או בשליחת מייל האימות',
      );
    } finally {
      setIsSending(false);
      console.log('[VerificationScreen] send verification code: finished');
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

  const passwordMismatch = useMemo(
    () =>
      confirmPassword.length > 0 &&
      password.length > 0 &&
      password !== confirmPassword,
    [password, confirmPassword],
  );

  const codeFilled = verificationCode.trim().length > 0;
  const canVerifyCode =
    verificationEmailSent && verificationCode.trim().length >= 6;

  const finishVerified = (subscription, subscriberNumber) => {
    if (!subscription || !onVerified) return;
    const sub = {...subscription};
    if (!sub.subscriber_number && subscriberNumber) {
      sub.subscriber_number = subscriberNumber;
    }
    onVerified(sub);
  };

  const handleVerifyCode = async () => {
    if (!canVerifyCode || isVerifyingCode) return;
    setIsVerifyingCode(true);
    try {
      if (!subscriptionId) {
        Alert.alert('שגיאה', 'חסר מזהה מנוי. שלחו קוד אימות קודם.');
        return;
      }
      const response = await verifyEmail(
        displayEmail,
        verificationCode.trim(),
        subscriptionId,
        password,
      );
      if (response?.success && response.subscription) {
        finishVerified(response.subscription, response.subscriberNumber);
      } else {
        Alert.alert(
          'שגיאה',
          response?.error || 'קוד האימות שגוי. אנא נסה שוב.',
        );
      }
    } catch (error) {
      Alert.alert('שגיאה', error.message || 'קוד האימות שגוי. אנא נסה שוב.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (!verificationEmailSent || isResending || !displayEmail || !subscriptionId)
      return;
    setIsResending(true);
    try {
      await resendVerificationCode(
        displayEmail,
        subscriptionId,
        password,
      );
      Alert.alert('הצלחה', 'קוד האימות נשלח מחדש למייל שלך');
    } catch (error) {
      Alert.alert('שגיאה', error.message || 'נכשל בשליחת הקוד מחדש');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/subscription-background.png')}
      style={styles.container}
      resizeMode="cover">
      <View style={styles.overlay} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {paddingTop: insets.top},
        ]}
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
            <Text style={styles.headerTitle}>
              {getHeaderTitle(subscriptionType)}
            </Text>
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

        <View style={styles.sectionOne}>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionText}>
              הגדירו סיסמה ואשרו את המייל להמשך ההרשמה
            </Text>
            <Image
              source={require('../assets/email-icon.png')}
              style={styles.emailIcon}
              resizeMode="contain"
            />
          </View>

          <View style={styles.readOnlyEmailRow}>
            <Text style={styles.readOnlyEmailText}>{displayEmail}</Text>
          </View>

          <View style={styles.inputRow}>
            <TouchableOpacity
              onPress={() => setShowPassword(v => !v)}
              style={styles.eyeButton}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={Colors.white100}
              />
            </TouchableOpacity>
            <TextInput
              style={styles.inputField}
              placeholder="סיסמה"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textAlign="left"
            />
          </View>

          <View
            style={[
              styles.inputRow,
              passwordMismatch && styles.inputRowError,
            ]}>
            <TextInput
              style={styles.inputField}
              placeholder="אימות סיסמה"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textAlign="left"
            />
          </View>
          {passwordMismatch ? (
            <Text style={styles.errorHint}>הסיסמאות אינן תואמות</Text>
          ) : null}

          {verificationEmailSent ? (
            <View style={styles.sentBanner}>
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={SUCCESS_CIRCLE}
              />
              <Text style={styles.sentBannerText}>קוד נשלח למייל</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleSendVerificationEmail}
              disabled={!isSendReady || isSending}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={[
                styles.sendCodeButton,
                (!isSendReady || isSending) && styles.sendCodeButtonDisabled,
              ]}>
              {isSending ? (
                <ActivityIndicator color={Colors.white100} />
              ) : isSendReady ? (
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.sendCodeButtonGradient}>
                  <Text style={styles.sendCodeButtonTextActive}>
                    שלח קוד אימות
                  </Text>
                </LinearGradient>
              ) : (
                <Text style={styles.sendCodeButtonTextMuted}>שלח קוד אימות</Text>
              )}
            </TouchableOpacity>
          )}
          {!verificationEmailSent && !isSendReady ? (
            <Text style={styles.sendHint}>
              {passwordMismatch
                ? 'הסיסמאות אינן תואמות'
                : passwordsMatch && !passwordsFilled
                  ? `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`
                  : `מלאו סיסמה ואימות סיסמה (לפחות ${MIN_PASSWORD_LENGTH} תווים)`}
            </Text>
          ) : null}
        </View>

        {verificationEmailSent ? (
          <View style={styles.codeEntrySection}>
            <Text style={styles.codeEntryTitle}>הזינו את קוד האימות</Text>
            <Text style={styles.codeEntrySubtitle}>
              הקוד נשלח ל-{displayEmail}
            </Text>

            <View
              style={[
                styles.inputRow,
                codeFilled && styles.inputRowFilled,
              ]}>
              {codeFilled ? (
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
              ) : null}
              <TextInput
                style={[styles.inputField, codeFilled && styles.inputFieldFilled]}
                placeholder="קוד אימות (6 ספרות)"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                textAlign="left"
                maxLength={6}
                autoFocus
              />
            </View>

            <TouchableOpacity
              onPress={handleVerifyCode}
              disabled={!canVerifyCode || isVerifyingCode}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={[
                styles.sendCodeButton,
                (!canVerifyCode || isVerifyingCode) && styles.sendCodeButtonDisabled,
              ]}>
              {isVerifyingCode ? (
                <ActivityIndicator color={Colors.white100} />
              ) : canVerifyCode ? (
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.sendCodeButtonGradient}>
                  <Text style={styles.sendCodeButtonTextActive}>אימות והמשך</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.sendCodeButtonTextMuted}>אימות והמשך</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendLinkWrap}
              disabled={isResending}
              onPress={handleResendCode}>
              <Text style={styles.resendLinkText}>
                {isResending ? 'שולח...' : 'לא קיבלתי את הקוד'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {showSkipEmailVerificationTest &&
          subscriptionId &&
          onSkipVerifiedTest && (
            <TouchableOpacity
              style={styles.skipTestLink}
              disabled={isSkipTesting}
              onPress={async () => {
                if (!passwordsReady) {
                  Alert.alert(
                    'שגיאה',
                    `הגדירו סיסמה תואמת (לפחות ${MIN_PASSWORD_LENGTH} תווים) לפני דילוג האימות`,
                  );
                  return;
                }
                setIsSkipTesting(true);
                try {
                  let subId = subscriptionId;
                  if (!subId && pendingSubmit?.formData) {
                    const created = await submitSubscription(
                      pendingSubmit.formData,
                      pendingSubmit.files || {},
                    );
                    if (!created?.success || !created.subscriptionId) {
                      throw new Error(created?.error || 'נכשל בשמירת הטופס');
                    }
                    subId = created.subscriptionId;
                    setSubscriptionId(subId);
                  }
                  if (!subId) {
                    throw new Error('חסר מזהה מנוי');
                  }
                  await setSubscriptionPassword(subId, password);
                  const response = await verifyEmailSkipTest(
                    displayEmail || undefined,
                    subId,
                    password,
                  );
                  if (response?.success && response.subscription) {
                    onSkipVerifiedTest(response.subscription);
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
    gap: 20,
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
    alignItems: flexEnd,
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
  sectionOne: {
    paddingHorizontal: 24,
    gap: 16,
  },
  instructionRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
    gap: 10,
  },
  instructionText: {
    flex: 1,
    color: Colors.white100,
    textAlign: 'left',
    fontSize: 18,
    lineHeight: 32,
    fontFamily: 'Rubik-Regular',
  },
  emailIcon: {
    width: 28,
    height: 28,
  },
  readOnlyEmailRow: {
    width: '100%',
    minHeight: 52,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#ffc40a',
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,196,10,0.08)',
  },
  readOnlyEmailText: {
    color: Colors.white100,
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    textAlign: 'left',
  },
  inputRow: {
    width: '100%',
    height: 52,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 16,
    overflow: 'hidden',
  },
  inputRowFilled: {
    borderColor: BORDER_FILLED,
  },
  inputRowDisabled: {
    opacity: 0.45,
  },
  inputRowError: {
    borderColor: '#ff6b6b',
  },
  clearButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  inputFieldFilled: {
    color: Colors.white100,
  },
  inputFieldDisabled: {
    color: 'rgba(255,255,255,0.25)',
  },
  eyeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  inputField: {
    flex: 1,
    height: '100%',
    color: Colors.white100,
    fontFamily: 'Rubik-Regular',
    fontSize: 20,
    letterSpacing: 0.2,
    textAlign: 'left',
    backgroundColor: 'transparent',
  },
  errorHint: {
    color: '#ff9b9b',
    fontSize: 14,
    textAlign: 'left',
    fontFamily: 'Rubik-Regular',
    marginTop: -8,
  },
  sendCodeButton: {
    width: '100%',
    height: 52,
    borderRadius: 1000,
    backgroundColor: CTA_BG,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  sendCodeButtonDisabled: {
    opacity: 0.4,
  },
  sendCodeButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCodeButtonTextMuted: {
    color: Colors.white100,
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Medium',
  },
  sendCodeButtonTextActive: {
    color: BG,
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Medium',
  },
  sentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 1000,
    backgroundColor: 'rgba(21,227,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(21,227,255,0.35)',
  },
  sentBannerText: {
    color: SUCCESS_CIRCLE,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
  codeEntrySection: {
    paddingHorizontal: 24,
    gap: 14,
  },
  codeEntryTitle: {
    color: '#f7f3e6',
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'left',
  },
  codeEntrySubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
    marginTop: -6,
  },
  sendHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'left',
    fontFamily: 'Rubik-Regular',
  },
  resendLinkWrap: {
    minHeight: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendLinkText: {
    fontSize: 16,
    color: Colors.white100,
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontFamily: 'Rubik-Regular',
  },
  skipTestLink: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginTop: 2,
  },
  skipTestLinkText: {
    fontSize: 13,
    color: '#f5a623',
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontFamily: 'Rubik-Medium',
  },
});

export default VerificationScreen;
