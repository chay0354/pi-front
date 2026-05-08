import React, {useEffect, useMemo, useState} from 'react';
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
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {
  resendVerificationCode,
  verifyEmail,
  verifyEmailSkipTest,
} from '../utils/api';
import {
  getHeaderTitle,
  subscriptionTypes,
  showSkipEmailVerificationTest,
} from '../utils/constant';

const BG = '#1e1d27';
const CARD_BG = '#2b2a39';
const BORDER = '#8c85b3';
const CTA_BG = '#4d4966';

const VerificationScreen = ({
  onClose,
  onNext,
  onSkipVerifiedTest,
  subscriptionType = subscriptionTypes.broker,
  email: propEmail,
  subscriptionId,
}) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState(propEmail || '');
  const [companyCode, setCompanyCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifyingCompanyCode, setIsVerifyingCompanyCode] = useState(false);
  const [isSkipTesting, setIsSkipTesting] = useState(false);
  const showCompanyCodeCard =
    subscriptionType === subscriptionTypes.company;

  useEffect(() => {
    if (propEmail) setEmail(propEmail);
  }, [propEmail]);

  const canSendEmailCode = useMemo(() => email.trim().length > 0, [email]);
  const canVerifyCompanyCode = useMemo(
    () => companyCode.trim().length > 0 && (!!email || !!subscriptionId),
    [companyCode, email, subscriptionId],
  );

  const handleSendCode = async () => {
    if (!canSendEmailCode) {
      Alert.alert('שגיאה', 'אנא הזן כתובת מייל');
      return;
    }

    setIsSending(true);
    try {
      await resendVerificationCode(email.trim(), subscriptionId);
      if (onNext) onNext();
    } catch (error) {
      Alert.alert('שגיאה', error.message || 'נכשל בשליחת קוד האימות. אנא נסה שוב.');
      setIsSending(false);
    }
  };

  const handleVerifyCompanyCode = async () => {
    if (!canVerifyCompanyCode) return;
    setIsVerifyingCompanyCode(true);
    try {
      const response = await verifyEmail(email, companyCode.trim(), subscriptionId);
      if (response?.success && response?.subscription) {
        if (!response.subscription.subscriber_number && response.subscriberNumber) {
          response.subscription.subscriber_number = response.subscriberNumber;
        }
        if (onSkipVerifiedTest) {
          onSkipVerifiedTest(response.subscription);
        } else if (onNext) {
          onNext();
        }
      } else {
        Alert.alert('שגיאה', response?.error || 'קוד האימות שגוי. אנא נסה שוב.');
      }
    } catch (error) {
      Alert.alert('שגיאה', error.message || 'קוד האימות שגוי. אנא נסה שוב.');
    } finally {
      setIsVerifyingCompanyCode(false);
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
        contentContainerStyle={[styles.contentContainer, {paddingTop: insets.top}]}
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

        <View style={styles.sectionOne}>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionText}>
              הזינו את המייל שלכם לקבלת קוד אימות
            </Text>
            <Image
              source={require('../assets/email-icon.png')}
              style={styles.emailIcon}
              resizeMode="contain"
            />
          </View>

          <View
            style={[
              styles.inputRow,
              canSendEmailCode && styles.inputRowFilled,
            ]}>
            {canSendEmailCode && (
              <TouchableOpacity
                onPress={() => setEmail('')}
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
              style={[styles.inputField, canSendEmailCode && styles.inputFieldFilled]}
              placeholder="כתובת מייל"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign="right"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.ctaButton,
              !canSendEmailCode && styles.ctaButtonDisabled,
              isSending && styles.ctaButtonDisabled,
            ]}
            disabled={!canSendEmailCode || isSending}
            onPress={handleSendCode}>
            {isSending ? (
              <ActivityIndicator color={Colors.white100} />
            ) : canSendEmailCode ? (
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
        </View>

        {showCompanyCodeCard && (
          <View style={styles.companyCodeCard}>
            <Text style={styles.companyCodeInfoText}>
              אם ברשותכם קוד אימות חברה, אנא הזינו{'\n'}אותו כאן:
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputField}
                placeholder="הזינו קוד אימות"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={companyCode}
                onChangeText={setCompanyCode}
                textAlign="right"
                keyboardType={
                  Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'
                }
              />
            </View>
            <TouchableOpacity
              style={[
                styles.ctaButton,
                (!canVerifyCompanyCode || isVerifyingCompanyCode) &&
                  styles.ctaButtonDisabled,
              ]}
              disabled={!canVerifyCompanyCode || isVerifyingCompanyCode}
              onPress={handleVerifyCompanyCode}>
              {isVerifyingCompanyCode ? (
                <ActivityIndicator color={Colors.white100} />
              ) : (
                <Text style={styles.ctaButtonTextDisabled}>שלח</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {showSkipEmailVerificationTest && subscriptionId && onSkipVerifiedTest && (
          <TouchableOpacity
            style={styles.skipTestLink}
            disabled={isSkipTesting}
            onPress={async () => {
              setIsSkipTesting(true);
              try {
                const response = await verifyEmailSkipTest(undefined, subscriptionId);
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
  sectionOne: {
    paddingHorizontal: 24,
    gap: 20,
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
    textAlign: 'right',
    fontSize: 18,
    lineHeight: 32,
    fontFamily: 'Rubik-Regular',
  },
  emailIcon: {
    width: 28,
    height: 28,
  },
  pillInput: {
    width: '100%',
    height: 52,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Rubik-Regular',
    fontSize: 20,
    letterSpacing: 0.2,
    textAlign: 'right',
  },
  pillInputFilled: {
    color: Colors.white100,
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
    borderColor: '#ffc40a',
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
  companyCodeCard: {
    marginTop: 20,
    marginHorizontal: 24,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 24,
  },
  companyCodeInfoText: {
    width: '100%',
    textAlign: 'center',
    color: Colors.white100,
    fontSize: 18,
    lineHeight: 32,
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
