import React from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  I18nManager,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {getHeaderTitle, subscriptionTypes} from '../utils/constant';
import {getUserProfileImageUrl} from '../utils/userProfileImage';
import {flexEnd} from '../index';

const BG = '#1e1d27';

const SuccessScreen = ({
  onClose,
  onGoHome,
  onStartPublishing,
  subscriptionType = subscriptionTypes.broker,
  subscription,
  localProfileImage = null,
}) => {
  const insets = useSafeAreaInsets();
  const isCompany =
    subscriptionType === subscriptionTypes.company ||
    String(subscription?.subscription_type || '').toLowerCase() === 'company';
  const companyLogoUrl =
    subscription?.company_logo_url || subscription?.companyLogoUrl || null;
  const serverImageUrl = isCompany
    ? companyLogoUrl || getUserProfileImageUrl(subscription)
    : getUserProfileImageUrl(subscription);
  const successProfilePicUrl = serverImageUrl || localProfileImage || null;
  const displayName =
    subscription?.business_name ||
    subscription?.broker_office_name ||
    subscription?.name ||
    subscription?.contact_person_name ||
    'קבוצת אביב';
  const displayEmail = subscription?.email || 'amirlevi@gmail.com';
  const subscriberNumber = subscription?.subscriber_number || '112345235';

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
      <ScrollView
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
            {renderStep('3', true)}
            <View style={styles.wizardLine} />
            {renderStep('2', false)}
            <View style={styles.wizardLine} />
            {renderStep('1', false)}
          </View>
        </View>

        <View style={styles.mainSection}>
          <View style={styles.profileSection}>
            <View style={styles.profilePictureContainer}>
              <View style={styles.profilePictureFrame}>
                {successProfilePicUrl ? (
                  <Image
                    source={{uri: successProfilePicUrl}}
                    style={styles.profilePicture}
                    resizeMode="cover"
                    key={successProfilePicUrl}
                  />
                ) : (
                  <Image
                    source={require('../assets/profile-pic-success.png')}
                    style={styles.profilePicture}
                    resizeMode="cover"
                  />
                )}
              </View>
              <View style={styles.checkmarkOverlay}>
                <MaterialCommunityIcons
                  name="check"
                  size={16}
                  color="#15e3ff"
                />
              </View>
            </View>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{displayEmail}</Text>
          </View>

          <View style={styles.successTitleBlock}>
            <Text style={styles.successTitle}>הרישום בוצע בהצלחה!</Text>
            <Text style={styles.successSubtitle}>
              ניתן לפרסם עד 65 מודעות בכל הקטגוריות
            </Text>
          </View>

          <View style={styles.subscriberCardWrap}>
            <View style={styles.subscriberContainer}>
              <Text style={styles.subscriberLabel}>מספר מנוי</Text>
              <Text style={styles.subscriberNumber}>{subscriberNumber}</Text>
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.publishButton}
              onPress={() => {
                if (onStartPublishing) onStartPublishing();
              }}>
              <LinearGradient
                colors={['#FEE787', '#BD9947', '#9C6522']}
                locations={[0.0456, 0.5076, 0.8831]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.publishButtonGradient}>
                <Text style={styles.publishButtonText}>התחל לפרסם מודעות</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeLink}
              onPress={() => {
                if (onGoHome) onGoHome();
              }}>
              <Text style={styles.homeLinkText}>קח אותי לעמוד הבית</Text>
            </TouchableOpacity>
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
  mainSection: {
    width: '100%',
    alignItems: 'center',
    gap: 28,
  },
  profileSection: {
    alignItems: 'center',
    gap: 8,
  },
  profilePictureContainer: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    borderColor: Colors.yellowIcons,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePictureFrame: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  profilePicture: {
    width: '100%',
    height: '100%',
  },
  checkmarkOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: BG,
    borderWidth: 1.5,
    borderColor: '#15e3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.14,
    color: Colors.white100,
    textAlign: 'center',
    fontFamily: 'Rubik-Regular',
  },
  userEmail: {
    marginTop: -2,
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'Rubik-Regular',
  },
  successTitleBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  successTitle: {
    fontSize: 28,
    lineHeight: 31,
    color: '#f7f3e6',
    textAlign: 'center',
    fontFamily: 'Rubik-SemiBold',
    width: 326,
  },
  successSubtitle: {
    fontSize: 18,
    lineHeight: 32,
    color: Colors.white100,
    textAlign: 'center',
    fontFamily: 'Rubik-Regular',
    width: 326,
  },
  subscriberCardWrap: {
    width: '100%',
    paddingHorizontal: 24,
  },
  subscriberContainer: {
    width: '100%',
    backgroundColor: '#2B2A39',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fee787',
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 24,
    shadowColor: 'rgba(89,81,50,0.4)',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 6,
  },
  subscriberLabel: {
    fontSize: 20,
    color: Colors.white100,
    textAlign: 'center',
    fontFamily: 'Rubik-Regular',
  },
  subscriberNumber: {
    fontSize: 28,
    lineHeight: 34,
    color: Colors.white100,
    textAlign: 'center',
    fontFamily: 'Rubik-SemiBold',
    letterSpacing: 0.5,
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
  },
  publishButton: {
    width: 372,
    maxWidth: '100%',
    height: 52,
    borderRadius: 1000,
    overflow: 'hidden',
  },
  publishButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButtonText: {
    fontSize: 20,
    letterSpacing: 0.2,
    color: BG,
    fontFamily: 'Rubik-Medium',
  },
  homeLink: {
    paddingVertical: 4,
  },
  homeLinkText: {
    fontSize: 18,
    lineHeight: 22,
    color: Colors.white100,
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontFamily: 'Rubik-Regular',
  },
});

export default SuccessScreen;
