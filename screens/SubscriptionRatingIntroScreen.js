import React from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {
  getHeaderTitle,
  isCompanySubscriptionType,
  subscriptionTypes,
} from '../utils/constant';
import {flexEnd} from '../utils/rtlLayout';
import {SvgXml} from '../utils/svgXml';
import {
  RATING_INTRO_GIFT_XML,
  RATING_INTRO_NUMBERED_STARS,
} from '../assets/subscription-rating/ratingIntroAssets';

const COMPANY_STAR_VALUES = [1, 2, 3, 4, 5];

const BG = '#1e1d27';
const MODAL_BACKDROP = '#00000080';
const CARD_BG = '#2b2a39';
const INNER_BG = '#343246';
const NUMBERED_STAR_SIZE = 30;

const SubscriptionRatingIntroScreen = ({
  onClose,
  onContinue,
  subscriptionType = subscriptionTypes.broker,
}) => {
  const insets = useSafeAreaInsets();
  const isCompany = isCompanySubscriptionType(subscriptionType);

  return (
    <View style={styles.container}>
      <View style={styles.overlay} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {paddingTop: insets.top},
        ]}
        showsVerticalScrollIndicator={false}>
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

        <View style={styles.popup}>
          <View style={styles.popupTopGroup}>
            <View style={styles.giftWrap}>
              <SvgXml xml={RATING_INTRO_GIFT_XML} width={40} height={40} />
            </View>

            <Text style={styles.title}>איזה יופי שהצטרפתם אלינו!</Text>

            <View
              style={[styles.ratingCard, isCompany && styles.companyRatingCard]}>
              {isCompany ? (
                <>
                  <View style={styles.numberedStarRow}>
                    {COMPANY_STAR_VALUES.map(value => (
                      <View key={value} style={styles.numberedStar}>
                        <SvgXml
                          xml={RATING_INTRO_NUMBERED_STARS[value - 1]}
                          width={NUMBERED_STAR_SIZE}
                          height={NUMBERED_STAR_SIZE}
                        />
                        <Text style={styles.numberedStarLabel}>
                          {String(value)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.companyStarBlock}>
                    <Image
                      source={require('../assets/tiktok/pistar.png')}
                      style={styles.companyPiBadge}
                      resizeMode="contain"
                    />
                    <View style={styles.companyCopy}>
                      <Text style={styles.bestRatingTextLead}>
                        קיבלתם את הדירוג הגבוה ביותר!
                      </Text>
                      <Text style={styles.companyGold}>5 כוכבי פאי</Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.bestRatingTextLead}>
                    עליכם לקבל את הדירוג הגבוה ביותר:
                  </Text>
                  <View style={styles.starWithGold}>
                    <Image
                      source={require('../assets/tiktok/pistar.png')}
                      style={styles.piBadgeIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.bestRatingGold}>5 כוכבי פאי</Text>
                  </View>
                </>
              )}
            </View>

            <Text style={styles.infoMain}>
              {'הקפידו לשמור על דירוג גבוה,\nהוא קובע את אמינות העסק שלכם.'}
            </Text>
          </View>

          <TouchableOpacity style={styles.ctaButton} onPress={onContinue}>
            <LinearGradient
              colors={['#FEE787', '#BD9947', '#9C6522']}
              locations={[0.0456, 0.5076, 0.8831]}
              start={{x: 0.5, y: 0}}
              end={{x: 0.5, y: 1}}
              style={styles.ctaGradient}>
              <Text style={styles.ctaText}>מעולה, בואו נתחיל!</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 414,
    alignSelf: 'center',
    backgroundColor: '#050611',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: MODAL_BACKDROP,
  },
  scrollView: {
    flex: 1,
    zIndex: 2,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 20,
  },
  header: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: flexEnd,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.white100,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  headerSpacer: {width: 40},
  popup: {
    width: '100%',
    maxWidth: 366,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 32,
  },
  popupTopGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 24,
  },
  giftWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#f7f3e6',
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    width: 326,
  },
  ratingCard: {
    width: '100%',
    maxWidth: 334,
    borderRadius: 12,
    backgroundColor: INNER_BG,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 24,
  },
  companyRatingCard: {
    gap: 12,
    paddingBottom: 18,
  },
  companyStarBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: -6,
  },
  numberedStarRow: {
    // forceRTL turns `row` into right→left. `row-reverse` puts 1 on the left.
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    width: '100%',
  },
  numberedStar: {
    width: NUMBERED_STAR_SIZE,
    height: NUMBERED_STAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberedStarLabel: {
    ...StyleSheet.absoluteFillObject,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: BG,
    fontSize: 14,
    lineHeight: 30,
    letterSpacing: 0.54,
    fontFamily: 'Rubik-Medium',
  },
  starWithGold: {
    width: '100%',
    alignItems: 'center',
    overflow: 'visible',
    marginTop: -28,
  },
  bestRatingTextLead: {
    color: Colors.white100,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Rubik-Medium',
    writingDirection: 'rtl',
  },
  companyPiBadge: {
    width: 88,
    height: 88,
  },
  companyCopy: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
    marginTop: -12,
  },
  companyGold: {
    color: '#ffbf3e',
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Rubik-Medium',
    writingDirection: 'rtl',
  },
  piBadgeIcon: {
    width: 88,
    height: 88,
  },
  bestRatingGold: {
    color: '#ffbf3e',
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Rubik-Medium',
    marginTop: -16,
    zIndex: 2,
  },
  infoMain: {
    color: Colors.white100,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    maxWidth: 322,
  },
  ctaButton: {
    width: '100%',
    height: 52,
    borderRadius: 1000,
    overflow: 'hidden',
  },
  ctaGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: BG,
    fontSize: 20,
    letterSpacing: 0.2,
    fontFamily: 'Rubik-Medium',
  },
});

export default SubscriptionRatingIntroScreen;
