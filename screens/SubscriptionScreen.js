import React, {useMemo, useState} from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Platform,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, BorderRadius} from '../constants/styles';
import {getHeaderTitle, subscriptionTypes} from '../utils/constant';

const BLUE_100 = '#1e1d27';
const WHITE_HEADLINE = '#f7f3e6';
const GOLD_HIGHLIGHT = '#ffbf3e';
const CARD_BG = '#2b2a39';
const CARD_BORDER = '#fee787';
const BUTTON_BG = '#4d4966';
const BUTTON_TEXT_DARK = '#1e1d27';
const CHECK_TEAL = '#60e7ff';
const CONTENT_MAX = 366;
const BROKER_FIGMA_PROFILE_IMAGE =
  'https://www.figma.com/api/mcp/asset/b3dcda94-a154-4ec5-ab87-1f32d1c961d1';
const PROFESSIONAL_FIGMA_PROFILE_IMAGE =
  'https://www.figma.com/api/mcp/asset/e6fb61e0-7322-402e-856f-cbd2886b04ad';

const COMPANY_FEATURES = [
  '4 ערוצי פרסום לפרוייקט',
  'פרסום דירות חדשות ונבחרות',
  'קידום פרויקטים בחלון הכוח',
  'הצגת זמינות וקידום הפרויקט',
  "ניהול וקבלת לידים חמים בצ'אט פאי",
  "ניהול קשרי לקוחות דרך צ'אט פאי",
  'פרסום בית פתוח ומבצעי מכירה',
  'פרסום תדמית החברה וגיוס עובדים ',
];

const BROKER_FEATURES = [
  '10 חזיתות שיווק וניהול למתווכים',
  'פרסום ומיתוג אישי למשרד התיווך שלך',
  "יצירת קשר וניהול לקוחות צ'אט פאי",
  'גיוס עובדים דרך הפלטפורמה',
  'פרסום מודעות בית פתוח, נכסים ופוסטים',
  'הצעת בלעדיות לנכסים',
  'איתור נכסים חדשים לפני כולם',
];

const PROFESSIONAL_FEATURES = [
  'עמוד פרופיל מקצועי לעסק',
  'פרסום סרטוני תדמית לעסק שלך',
  'הגברת אמינות ע"י חוות דעת מלקוחות',
  'קבלת דירוג בכוכבי פאי מלקוחות',
  'פרסום פוסטים וגיוס עובדים',
  "ניהול לידים מיידיים בפרופיל בצ'אט פאי",
  'ניהול עצמאי ללא נציג שירות',
];

function getFirstName(user) {
  if (!user || typeof user !== 'object') return '';
  const candidates = [
    user.first_name,
    user.firstName,
    user.name,
    user.contact_person_name,
  ];
  for (const c of candidates) {
    if (c == null) continue;
    const str = String(c).trim();
    if (!str) continue;
    return str.split(/\s+/)[0];
  }
  return '';
}

/**
 * Headline / subtitle copy for the subscription opener (Figma 10:7038 / 10:7079
 * for broker, 11:2949 / 11:2998 for company, etc.).
 *
 * For the broker flow the screen has two visual states:
 *   - Not agreed: generic headline ("מתווכים?") + invitation subtitle
 *   - Agreed:    personalized headline ("{שם}, אתה מתווך?") + verification subtitle
 */
function subscriptionCopy(type, isAgreed, user) {
  switch (type) {
    case subscriptionTypes.company:
      return {
        headline: 'אתם חברת נדל״ן?',
        subLead: 'בואו לעשות מנוי',
        subMid: ' ולקבל ',
        featuresTitle: 'מה כלול במנוי לחברות?',
      };
    case subscriptionTypes.professional: {
      return {
        headline: 'בעלי מקצוע?',
        subLead: 'הירשמו למנוי וקבלו',
        subMid: ' ',
        featuresTitle: 'מה כלול בגישה המלאה?',
      };
    }
    case subscriptionTypes.broker:
    default: {
      return {
        headline: 'אמיר, אתה מתווך?',
        subLead: isAgreed ? 'אמת את חשבונך וקבל' : 'הירשמו למנוי וקבלו',
        subMid: ' ',
        featuresTitle: 'מה כלול בגישה המלאה?',
      };
    }
  }
}

function featuresForType(type) {
  switch (type) {
    case subscriptionTypes.company:
      return COMPANY_FEATURES;
    case subscriptionTypes.professional:
      return PROFESSIONAL_FEATURES;
    case subscriptionTypes.broker:
    default:
      return BROKER_FEATURES;
  }
}

/**
 * SubscriptionScreen — layout and tokens aligned with Figma (מנוי לחברות frame).
 */
const SubscriptionScreen = ({
  onClose,
  onStart,
  subscriptionType = subscriptionTypes.broker,
  currentUser = null,
}) => {
  const [isAgreed, setIsAgreed] = useState(false);
  const insets = useSafeAreaInsets();
  const copy = useMemo(
    () => subscriptionCopy(subscriptionType, isAgreed, currentUser),
    [subscriptionType, isAgreed, currentUser],
  );
  const features = useMemo(() => featuresForType(subscriptionType), [subscriptionType]);

  const handleStart = () => {
    if (!isAgreed || !onStart) return;
    onStart();
  };

  const topPad = Math.max(insets.top, Platform.OS === 'web' ? 12 : 8);

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../assets/subscription-background.png')}
        style={styles.bgImage}
        resizeMode="cover">
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(30,29,39,0.15)', 'rgba(30,29,39,0.55)', BLUE_100]}
          locations={[0.12, 0.42, 1]}
          style={StyleSheet.absoluteFill}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            {paddingTop: topPad + 8, paddingBottom: Math.max(insets.bottom, 28)},
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.backButton}
              hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.white100} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{getHeaderTitle(subscriptionType)}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.profileBlock}>
            <View style={styles.profileRing}>
              <View style={styles.profileImageFrame}>
                <Image
                  source={
                    subscriptionType === subscriptionTypes.professional
                      ? {uri: PROFESSIONAL_FIGMA_PROFILE_IMAGE}
                      : subscriptionType === subscriptionTypes.broker
                        ? {uri: BROKER_FIGMA_PROFILE_IMAGE}
                      : require('../assets/subscription-company-profile.png')
                  }
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              </View>
            </View>
          </View>

          <View style={styles.heroTextBlock}>
            <Text style={styles.headline}>{copy.headline}</Text>
            <Text style={styles.subline} dir="rtl">
              <Text style={styles.sublineBase}>{copy.subLead}</Text>
              <Text style={styles.sublineBase}>{copy.subMid}</Text>
              <Text style={styles.sublineGold}>גישה מלאה</Text>
              <Text style={styles.sublineBase}> לפלטפורמה!</Text>
            </Text>
          </View>

          <View style={styles.featuresCard}>
            <Text style={styles.featuresCardTitle}>{copy.featuresTitle}</Text>
            <View style={styles.featuresList}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Text style={styles.featureText}>{feature}</Text>
                  <View style={styles.featureCheckIconWrap}>
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={CHECK_TEAL}
                      style={styles.featureCheckIcon}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.agreementBlock}>
            <View style={styles.agreementRow}>
              <View style={styles.agreementTexts}>
                <Text style={styles.agreementMain}>
                  אני מאשר/ת שלא אפרסם מודעות פיקטיביות
                </Text>
                <Text style={styles.disclaimerText}>
                  במקרה של פרסום כוזב – התראה ראשונה תישלח, ובפעם השנייה תבוצע חסימה
                  אוטומטית של החשבון.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAgreed(!isAgreed)}
                style={styles.checkboxHit}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                {isAgreed ? (
                  <View style={styles.checkboxChecked}>
                    <MaterialCommunityIcons name="check" size={14} color="#F4AD39" />
                  </View>
                ) : (
                  <View style={styles.checkboxEmpty} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.actionsBlock}>
            <TouchableOpacity
              disabled={!isAgreed}
              onPress={handleStart}
              activeOpacity={0.85}
              style={[
                styles.primaryButton,
                !isAgreed && styles.primaryButtonDisabled,
                isAgreed && styles.primaryButtonEnabled,
              ]}>
              {isAgreed ? (
                <LinearGradient
                  colors={['#FEE787', '#BD9947', '#9C6522']}
                  locations={[0.0456, 0.5076, 0.8831]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.primaryButtonGradient}>
                  <Text style={[styles.primaryButtonText, styles.primaryButtonTextEnabled]}>
                    התחל
                  </Text>
                </LinearGradient>
              ) : (
                <Text style={styles.primaryButtonText}>התחל</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.backLinkWrap}>
              <Text style={styles.backLinkText}>חזור</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: 414,
    alignSelf: 'center',
    backgroundColor: BLUE_100,
  },
  bgImage: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: CONTENT_MAX + 48,
    height: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    color: Colors.white100,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  profileBlock: {
    alignItems: 'center',
    marginTop: 4,
  },
  profileRing: {
    width: 109,
    height: 109,
    borderRadius: 54.5,
    borderWidth: 2.8,
    borderColor: '#F4AD39',
    backgroundColor: '#2b2a39',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileImageFrame: {
    width: 94,
    height: 94,
    borderRadius: 47,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  heroTextBlock: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    alignItems: 'center',
    gap: 16,
  },
  headline: {
    width: '100%',
    fontSize: 28,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    color: WHITE_HEADLINE,
    textAlign: 'center',
  },
  subline: {
    width: '100%',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  sublineBase: {
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    color: WHITE_HEADLINE,
  },
  sublineGold: {
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    color: GOLD_HIGHLIGHT,
  },
  featuresCard: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    backgroundColor: CARD_BG,
    borderRadius: BorderRadius.roundCorner2XL,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 20,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(89, 81, 50, 0.4)',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 1,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
      default: {
        shadowColor: 'rgba(89, 81, 50, 0.4)',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 1,
        shadowRadius: 15,
      },
    }),
  },
  featuresCardTitle: {
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    color: Colors.textSecondary,
    textAlign: 'right',
    width: '100%',
  },
  featuresList: {
    width: '100%',
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
  },
  featureCheckIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  featureCheckIcon: {
    lineHeight: 24,
  },
  featureText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 20,
    fontFamily: 'Rubik-Regular',
    color: Colors.white100,
    textAlign: 'right',
  },
  agreementBlock: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    marginTop: 4,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
  },
  agreementTexts: {
    flex: 1,
    gap: 8,
  },
  agreementMain: {
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    color: Colors.white100,
    textAlign: 'right',
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Rubik-Regular',
    letterSpacing: 0.54,
    color: Colors.textSecondary,
    textAlign: 'right',
    maxWidth: 322,
    alignSelf: 'flex-end',
  },
  checkboxHit: {
    paddingTop: 2,
  },
  checkboxImage: {
    width: 24,
    height: 24,
  },
  checkboxChecked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#F4AD39',
    margin: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    margin: 1,
  },
  actionsBlock: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    gap: 24,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 1000,
    backgroundColor: BUTTON_BG,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    width: '100%',
    height: '100%',
    paddingHorizontal: 24,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonEnabled: {
    opacity: 1,
  },
  primaryButtonText: {
    fontSize: 20,
    fontFamily: 'Rubik-Medium',
    color: Colors.white100,
    letterSpacing: 0.2,
  },
  primaryButtonTextEnabled: {
    color: BUTTON_TEXT_DARK,
  },
  backLinkWrap: {
    minHeight: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    color: Colors.white100,
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
});

export default SubscriptionScreen;
