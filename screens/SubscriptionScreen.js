import React, {useState} from 'react';
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
 * SubscriptionScreen Component
 * Subscription signup page for brokers/realtors
 */
const SubscriptionScreen = ({
  onClose,
  onStart,
  subscriptionType = 'broker',
}) => {
  const [isAgreed, setIsAgreed] = useState(false);

  const getProfileQuestion = () => {
    switch (subscriptionType) {
      case 'company':
        return 'אמיר, אתה חברה?';
      case 'professional':
        return 'אבישג, אתה בעל מקצוע?';
      case 'broker':
      default:
        return 'אמיר, אתה מתווך?';
    }
  };

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

  const features = [
    '10 חזיתות שיווק וניהול למתווכים',
    'פרסום ומיתוג אישי למשרד התיווך שלך',
    "יצירת קשר וניהול לקוחות צ'אט פאי",
    'גיוס עובדים דרך הפלטפורמה',
    'פרסום מודעות בית פתוח, נכסים ופוסטים',
    'הצעת בלעדיות לנכסים',
    'איתור נכסים חדשים לפני כולם',
  ];

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

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profilePictureContainer}>
            <Image
              source={require('../assets/profile-pic.png')}
              style={styles.profilePicture}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.profileQuestion}>{getProfileQuestion()}</Text>
          <Text style={styles.profileSubtext}>
            אמת את חשבונך וקבל גישה מלאה לפלטפורמה!
          </Text>
        </View>

        {/* Features Box */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>מה כלול בגישה המלאה?</Text>
          <View style={styles.featuresList}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.featureText}>{feature}</Text>
                <Image
                  source={require('../assets/checkmark-icon.png')}
                  style={styles.checkmarkIcon}
                  resizeMode="contain"
                />
              </View>
            ))}
          </View>
        </View>

        {/* Agreement Section */}
        <View style={styles.agreementSection}>
          <View style={styles.agreementTextContainer}>
            <Text style={styles.agreementText}>
              אני מאשר/ת שלא אפרסם מודעות פיקטיביות
            </Text>
            <Text style={styles.disclaimerText}>
              במקרה של פרסום כוזב - התראה ראשונה תישלח, ובפעם השנייה תבוצע חסימה
              אוטומטית של החשבון.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsAgreed(!isAgreed)}
            style={styles.checkboxContainer}>
            <Image
              source={
                isAgreed
                  ? require('../assets/checkbox-selected.png')
                  : require('../assets/checkbox-unselected.png')
              }
              style={styles.checkbox}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            disabled={!isAgreed}
            onPress={() => {
              if (isAgreed && onStart) {
                onStart();
              }
            }}
            style={styles.buttonWrapper}>
            <Image
              source={
                isAgreed
                  ? require('../assets/start-button-enabled.png')
                  : require('../assets/start-button-disabled.png')
              }
              style={styles.startButtonImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.backButtonBottom}>
            <Text style={styles.backButtonText}>חזור</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  profileSection: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  profilePictureContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.yellowIcons,
    overflow: 'hidden',
  },
  profilePicture: {
    width: '100%',
    height: '100%',
  },
  profileQuestion: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.white100,
    textAlign: 'center',
  },
  profileSubtext: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  featuresContainer: {
    backgroundColor: '#2a2933',
    borderRadius: BorderRadius.roundCorner2XL,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.yellowIcons,
    gap: 16,
  },
  featuresTitle: {
    fontSize: FontSizes.fs18,
    fontWeight: '600',
    color: Colors.white100,
    textAlign: 'right',
    marginBottom: 8,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: Colors.white100,
    textAlign: 'right',
  },
  checkmarkIcon: {
    width: 24,
    height: 24,
  },
  agreementSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  checkboxContainer: {
    width: 24,
    height: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
  },
  agreementTextContainer: {
    flex: 1,
    gap: 8,
  },
  agreementText: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.white100,
    textAlign: 'right',
  },
  disclaimerText: {
    fontSize: 12,
    fontWeight: '300',
    color: Colors.grey200,
    textAlign: 'right',
  },
  actionsContainer: {
    gap: 16,
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  buttonWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  startButtonImage: {
    width: '100%',
    height: 56,
    maxWidth: 366,
  },
  backButtonBottom: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.grey200,
  },
});

export default SubscriptionScreen;
