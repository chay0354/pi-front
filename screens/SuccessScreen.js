import React from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import {Colors, Spacing, BorderRadius, FontSizes} from '../constants/styles';

/**
 * SuccessScreen Component
 * Registration success/completion screen
 */
const SuccessScreen = ({
  onClose,
  onGoHome,
  onStartPublishing,
  subscriptionType = 'broker',
  subscription,
}) => {
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
  return (
    <ImageBackground
      source={require('../assets/subscription-background.png')}
      style={styles.container}
      resizeMode="cover">
      <View style={styles.overlay} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
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
            source={require('../assets/wizard-progress-step3.png')}
            style={styles.progressImage}
            resizeMode="contain"
          />
        </View>

        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profilePictureContainer}>
            {subscription?.profile_picture_url ? (
              <Image
                source={{uri: subscription.profile_picture_url}}
                style={styles.profilePicture}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={require('../assets/profile-pic-success.png')}
                style={styles.profilePicture}
                resizeMode="cover"
              />
            )}
            <View style={styles.checkmarkOverlay}>
              <Image
                source={require('../assets/success-checkmark.png')}
                style={styles.checkmarkSmall}
                resizeMode="contain"
              />
            </View>
          </View>
          <Text style={styles.userName}>
            {subscription?.name ||
              subscription?.agent_name ||
              subscription?.contact_person_name ||
              'משתמש'}
          </Text>
          <Text style={styles.userEmail}>{subscription?.email || ''}</Text>
        </View>

        {/* Success Message */}
        <View style={styles.messageSection}>
          <Text style={styles.successTitle}>הרישום בוצע בהצלחה!</Text>
          <Text style={styles.successSubtext}>
            ניתן לפרסם עד 65 מודעות בכל הקטגוריות
          </Text>
        </View>

        {/* Subscriber Number Section */}
        <View style={styles.subscriberContainer}>
          <Text style={styles.subscriberLabel}>מספר מנוי</Text>
          <Text style={styles.subscriberNumber}>
            {subscription?.subscriber_number || 'טוען...'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.publishButtonWrapper}
            onPress={() => {
              if (onStartPublishing) {
                onStartPublishing();
              }
            }}>
            <Image
              source={require('../assets/start-publishing-button.png')}
              style={styles.publishButtonImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.homeLink}
            onPress={() => {
              if (onGoHome) {
                onGoHome();
              }
            }}>
            <Text style={styles.homeLinkText}>קח אותי לעמוד הבית</Text>
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
  profileSection: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  profilePictureContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Colors.yellowIcons,
    position: 'relative',
  },
  profilePicture: {
    width: '100%',
    height: '100%',
  },
  checkmarkOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white100,
  },
  checkmarkSmall: {
    width: 18,
    height: 18,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.white100,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.grey200,
    textAlign: 'center',
  },
  messageSection: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white100,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.white100,
    textAlign: 'center',
  },
  subscriberContainer: {
    backgroundColor: '#2B2A39',
    borderRadius: BorderRadius.roundCorner2XL,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  subscriberLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.white100,
    textAlign: 'center',
  },
  subscriberNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white100,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 16,
    alignItems: 'center',
  },
  publishButtonWrapper: {
    width: '100%',
  },
  publishButtonImage: {
    width: '100%',
    height: 56,
  },
  homeLink: {
    paddingVertical: 12,
  },
  homeLinkText: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.white100,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

export default SuccessScreen;
