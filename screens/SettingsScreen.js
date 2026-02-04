import React, {useContext, useEffect, useState} from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {Colors, Spacing, BorderRadius, FontSizes} from '../constants/styles';
import {ContextHook} from '../hooks/ContextHook';
import {getCurrentUser} from '../utils/api';
import {subscriptionTypes} from '../utils/constant';

/**
 * SettingsScreen Component
 * Settings/Options page with messages, subscriptions, and general settings
 */
const SettingsScreen = ({
  onClose,
  onOpenSubscription,
  onLogout,
  onOpenLogin,
}) => {
  const {currentUser, setCurrentUser} = useContext(ContextHook);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  const handleLogout = () => {
    // Clear localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('pi_current_user');
        console.log('User logged out - cleared localStorage');
      }
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }

    // Clear current user state
    setCurrentUser(null);

    // Notify parent component
    if (onLogout) {
      onLogout();
    }
  };

  useEffect(() => {
    console.log('SettingsScreen - currentUser:', currentUser);
    if (currentUser) {
      console.log(
        'SettingsScreen - subscriber_number:',
        currentUser.subscriber_number,
      );
      console.log(
        'SettingsScreen - name:',
        currentUser.name ||
          currentUser.agent_name ||
          currentUser.contact_person_name,
      );
      console.log('SettingsScreen - email:', currentUser.email);
    }
  }, [currentUser]);
  const handleSubscriptionPress = type => {
    if (onOpenSubscription) {
      onOpenSubscription(type);
    }
  };
  return (
    <ScrollView
      style={styles.settingsScreen}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}>
      {/* Header with X button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <View style={styles.logoSection}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/its-just-simple.png')}
            style={styles.sloganImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* User Profile Card - Show above PiChat button */}
      {currentUser ? (
        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.editIconButton}>
            <Image
              source={require('../assets/pencil-icon.png')}
              style={styles.profileEditIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Profile content row: info on left, picture on right */}
          <View style={styles.profileContentRow}>
            {/* Name and Email on the left */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {currentUser.name ||
                  currentUser.agent_name ||
                  currentUser.contact_person_name ||
                  'משתמש'}
              </Text>
              <Text style={styles.profileEmail}>{currentUser.email || ''}</Text>
            </View>

            {/* Profile Picture on the right */}
            <View style={styles.profilePictureContainer}>
              {currentUser.profile_picture_url ? (
                <Image
                  source={{uri: currentUser.profile_picture_url}}
                  style={styles.profilePicture}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.profilePicturePlaceholder}>
                  <Text style={styles.profilePicturePlaceholderText}>
                    {(
                      (currentUser.name ||
                        currentUser.agent_name ||
                        currentUser.contact_person_name ||
                        'U')[0] || 'U'
                    ).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Subscriber Number at bottom */}
          <View style={styles.profileBottom}>
            <Text style={styles.subscriberNumber}>
              {currentUser.subscriber_number || 'לא זמין'}
            </Text>
            <Text style={styles.subscriberNumberLabel}>מספר מנוי</Text>
          </View>
        </View>
      ) : null}

      {/* Messages/Ads Section */}
      <View style={styles.section}>
        <Image
          source={require('../assets/buttons.png')}
          style={styles.buttonsImage}
          resizeMode="contain"
        />
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ניהול המודעות</Text>
          <TouchableOpacity style={styles.cardItem}>
            <Text style={styles.chevron}>›</Text>
            <Text style={styles.cardItemText}>ערוך / פרסם</Text>
            <Image
              source={require('../assets/pencil-icon.png')}
              style={styles.pencilIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Subscriptions Section */}
      <View style={styles.section}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>מנויים</Text>
          <TouchableOpacity
            style={styles.cardItem}
            onPress={() => handleSubscriptionPress(subscriptionTypes.company)}>
            <Text style={styles.chevron}>›</Text>
            <Text style={styles.cardItemText}>מנוי לחברות</Text>
            <Image
              source={require('../assets/subscription-company-icon.png')}
              style={styles.subscriptionIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardItem}
            onPress={() => handleSubscriptionPress(subscriptionTypes.broker)}>
            <Text style={styles.chevron}>›</Text>
            <Text style={styles.cardItemText}>מנוי למתווכים</Text>
            <Image
              source={require('../assets/subscription-broker-icon.png')}
              style={styles.subscriptionIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardItem}
            onPress={() => handleSubscriptionPress(subscriptionTypes.professional)}>
            <Text style={styles.chevron}>›</Text>
            <Text style={styles.cardItemText}>מנוי לבעלי מקצוע</Text>
            <Image
              source={require('../assets/subscription-professional-icon.png')}
              style={styles.subscriptionIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* General Settings Section */}
      <View style={styles.section}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>כללי</Text>
          <TouchableOpacity style={styles.cardItem}>
            <Text style={styles.chevron}>›</Text>
            <Text style={styles.cardItemText}>שחזור קוד סודי</Text>
            <Image
              source={require('../assets/lock-icon.png')}
              style={styles.generalIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardItem}>
            <Text style={styles.chevron}>›</Text>
            <Text style={styles.cardItemText}>מועדפים</Text>
            <Image
              source={require('../assets/favorites-icon.png')}
              style={styles.generalIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardItem}>
            <Text style={styles.chevron}>›</Text>
            <Text style={styles.cardItemText}>הצעות לשיפור</Text>
            <Image
              source={require('../assets/suggestions-icon.png')}
              style={styles.generalIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          {currentUser ? (
            <TouchableOpacity style={styles.cardItem} onPress={handleLogout}>
              <Text style={styles.chevron}>›</Text>
              <Text style={styles.cardItemText}>התנתק</Text>
              <Image
                source={require('../assets/logout-icon.png')}
                style={styles.generalIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.cardItem} onPress={onOpenLogin}>
              <Text style={styles.chevron}>›</Text>
              <Text style={styles.cardItemText}>התחבר</Text>
              <Image
                source={require('../assets/lock-icon.png')}
                style={styles.generalIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  settingsScreen: {
    flex: 1,
    backgroundColor: Colors.blue100,
    width: '100%',
    maxWidth: 414,
    alignSelf: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 24,
    gap: 24,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 7,
    left: 0,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeIcon: {
    fontSize: 24,
    color: Colors.white100,
    fontWeight: '300',
  },
  logoSection: {
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    height: 80,
    width: 90,
  },
  sloganImage: {
    height: 21,
    width: 100,
    marginTop: 4,
  },
  section: {
    width: '100%',
    gap: 12,
  },
  buttonsImage: {
    width: '100%',
    height: 50,
    maxWidth: 366,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#2a2933',
    borderRadius: BorderRadius.roundCorner2XL,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: FontSizes.fs18,
    color: Colors.white100,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
    justifyContent: 'space-between',
  },
  chevron: {
    fontSize: 24,
    color: Colors.white100,
    fontWeight: '300',
    width: 20,
  },
  cardItemText: {
    flex: 1,
    fontSize: 16,
    color: Colors.white100,
    fontWeight: '400',
    textAlign: 'right',
  },
  pencilIcon: {
    width: 27,
    height: 27,
  },
  subscriptionIcon: {
    width: 27,
    height: 27,
  },
  generalIcon: {
    width: 27,
    height: 27,
  },
  profileCard: {
    backgroundColor: '#2a2933',
    borderRadius: BorderRadius.roundCorner2XL,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.yellowIcons,
    position: 'relative',
    minHeight: 120,
  },
  editIconButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileEditIcon: {
    width: 20,
    height: 20,
    tintColor: Colors.white100,
  },
  profileContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    gap: 16,
  },
  profilePictureContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.yellowIcons,
    overflow: 'hidden',
    backgroundColor: '#1e1d27',
  },
  profileInfo: {
    flex: 1,
    alignItems: 'flex-end', // Right align for Hebrew
    justifyContent: 'center',
    marginRight: 12, // Space between text and picture
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white100,
    textAlign: 'right',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.grey200,
    textAlign: 'right',
  },
  profilePicture: {
    width: '100%',
    height: '100%',
  },
  profilePicturePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.yellowIcons,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicturePlaceholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.blue100,
  },
  profileBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3a3943',
  },
  subscriberNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white100,
  },
  subscriberNumberLabel: {
    fontSize: 14,
    color: Colors.grey200,
  },
});

export default SettingsScreen;
