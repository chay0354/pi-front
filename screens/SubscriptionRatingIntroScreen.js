import React from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  I18nManager,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {getHeaderTitle, subscriptionTypes} from '../utils/constant';
import {flexEnd} from '../index';

const BG = '#1e1d27';
const MODAL_BACKDROP = '#00000080';
const CARD_BG = '#2b2a39';
const INNER_BG = '#343246';

const SubscriptionRatingIntroScreen = ({
  onClose,
  onContinue,
  subscriptionType = subscriptionTypes.broker,
}) => {
  const insets = useSafeAreaInsets();
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
              <View style={styles.giftTopBar} />
              <View style={styles.giftBody} />
              <View style={styles.giftRibbonVertical} />
              <View style={styles.giftBowLeft} />
              <View style={styles.giftBowRight} />
            </View>

            <Text style={styles.title}>איזה יופי שהצטרפתם אלינו!</Text>

            <View style={[styles.ratingCard, styles.ratingCardCompact]}>
              <Text style={styles.bestRatingTextLead}>
                עליכם לקבל את הדירוג הגבוה ביותר:
              </Text>

              <View style={styles.ratingPiGroup}>
                <View style={styles.piBadgeWrap}>
                  <Image
                    source={require('../assets/tiktok/pistar.png')}
                    style={styles.piBadgeIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.bestRatingGold}>5 כוכבי פאי</Text>
              </View>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.infoMain}>
                הקפידו לשמור על דירוג גבוה,{'\n'}הוא קובע את אמינות העסק שלכם.
              </Text>
              <Text style={styles.infoSmall}>
                דירוג גבוה = יותר אמינות, יותר כוכבים{'\n'}
                דירוג נמוך= פחות אמינות, פחות כוכבים
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.ctaButton} onPress={onContinue}>
            <LinearGradient
              colors={['#FEE787', '#BD9947', '#9C6522']}
              locations={[0.0456, 0.5076, 0.8831]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
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
    paddingBottom: 24,
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
    position: 'relative',
  },
  giftTopBar: {
    position: 'absolute',
    top: 11,
    width: 32,
    height: 8,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#ffc40a',
    backgroundColor: 'transparent',
  },
  giftBody: {
    position: 'absolute',
    top: 19,
    width: 26,
    height: 18,
    borderWidth: 2,
    borderColor: '#ffc40a',
    borderTopWidth: 0,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: 'transparent',
  },
  giftRibbonVertical: {
    position: 'absolute',
    top: 11,
    width: 2,
    height: 26,
    backgroundColor: '#ffc40a',
    borderRadius: 1,
  },
  giftBowLeft: {
    position: 'absolute',
    top: 3,
    left: 9,
    width: 11,
    height: 8,
    borderWidth: 2,
    borderColor: '#15e3ff',
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    transform: [{rotate: '-6deg'}],
    backgroundColor: 'transparent',
  },
  giftBowRight: {
    position: 'absolute',
    top: 3,
    right: 9,
    width: 11,
    height: 8,
    borderWidth: 2,
    borderColor: '#15e3ff',
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    transform: [{rotate: '6deg'}],
    backgroundColor: 'transparent',
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
    gap: 18,
  },
  ratingCardCompact: {
    gap: 24,
    paddingVertical: 20,
  },
  ratingPiGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  bestRatingTextLead: {
    color: Colors.white100,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Rubik-Medium',
  },
  piBadgeWrap: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  piBadgeIcon: {
    width: 84,
    height: 84,
  },
  bestRatingGold: {
    color: '#ffbf3e',
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Rubik-Medium',
  },
  infoBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 18,
  },
  infoMain: {
    color: Colors.white100,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    maxWidth: 322,
  },
  infoSmall: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.54,
    fontFamily: 'Rubik-Regular',
    maxWidth: 322,
  },
  ctaButton: {
    width: '100%',
    height: 52,
    borderRadius: 1000,
    overflow: 'hidden',
    marginTop: 4,
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
