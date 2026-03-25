import React, {useContext, useEffect} from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import {Colors, Spacing, BorderRadius, FontSizes} from '../constants/styles';
import {ContextHook} from '../hooks/ContextHook';
import {subscriptionTypes} from '../utils/constant';
import {getUserProfileImageUrl} from '../utils/userProfileImage';
import {getCurrentUser} from '../utils/api';

const isWeb = Platform.OS === 'web';

/** Native: require bundled assets. Web: files in public/more-icons/ (avoids /assets/assets/ 404). */
const MORE_ICONS_NATIVE = {
  terms: require('../assets/more-icons/icons-1.png'), // icons (1).png — תנאי שימוש
  accessibility: require('../assets/more-icons/icons-2.png'), // icons (2).png — הצהרת נגישות
  contact: require('../assets/more-icons/icons-3.png'), // icons (3).png — צור קשר
  transactionCancel: require('../assets/more-icons/icons-4.png'), // icons (4).png — ביטול עסקה
};

const MORE_ICONS_WEB_FILE = {
  terms: 'icons-1.png',
  accessibility: 'icons-2.png',
  contact: 'icons-3.png',
  transactionCancel: 'icons-4.png',
};

function getMoreIconSource(key) {
  if (isWeb && typeof window !== 'undefined') {
    const file = MORE_ICONS_WEB_FILE[key];
    return {uri: `${window.location.origin}/more-icons/${file}`};
  }
  return MORE_ICONS_NATIVE[key];
}

/** Set URLs when pages are ready; empty string shows a short “בקרוב” alert */
const LEGAL_DEFAULTS = {
  termsOfUseUrl: '',
  accessibilityStatementUrl: '',
  supportEmail: 'support@pi.co.il',
  transactionCancellationUrl: '',
};

/**
 * SettingsScreen Component
 * Settings/Options page with messages, subscriptions, and general settings
 */
const SettingsScreen = ({
  onClose,
  onOpenEditPublishAd,
  onOpenChat,
  onOpenSubscription,
  onLogout,
  onOpenLogin,
  onOpenSecretCodeRecovery,
  onOpenFavorites,
  onOpenFeedback,
  onOpenTermsOfUse,
  onOpenAccessibilityStatement,
  onEditProfile,
  unreadChatCount = 0,
  termsOfUseUrl = LEGAL_DEFAULTS.termsOfUseUrl,
  accessibilityStatementUrl = LEGAL_DEFAULTS.accessibilityStatementUrl,
  supportEmail = LEGAL_DEFAULTS.supportEmail,
  transactionCancellationUrl = LEGAL_DEFAULTS.transactionCancellationUrl,
}) => {
  const {currentUser, setCurrentUser} = useContext(ContextHook);

  const openUrlOrPlaceholder = async (url, titleHebrew) => {
    const u = url && String(url).trim();
    if (!u) {
      Alert.alert(titleHebrew, 'התוכן יהיה זמין בקרוב.');
      return;
    }
    try {
      const can = await Linking.canOpenURL(u);
      if (can) {
        await Linking.openURL(u);
      } else {
        Alert.alert(titleHebrew, 'לא ניתן לפתוח את הקישור.');
      }
    } catch (e) {
      Alert.alert(titleHebrew, 'לא ניתן לפתוח את הקישור.');
    }
  };

  const openContact = async () => {
    const email = supportEmail && String(supportEmail).trim();
    if (!email) {
      Alert.alert('צור קשר', 'התוכן יהיה זמין בקרוב.');
      return;
    }
    const mailto = `mailto:${email}`;
    try {
      await Linking.openURL(mailto);
    } catch (e) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = mailto;
      } else {
        Alert.alert('צור קשר', email);
      }
    }
  };

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

  // Refresh subscription from API so profile_picture_url / company_logo_url are not stale vs AsyncStorage
  useEffect(() => {
    const email = currentUser?.email && String(currentUser.email).trim();
    if (!email) return;
    let cancelled = false;
    getCurrentUser(email)
      .then(data => {
        if (cancelled || !data?.success || !data.subscription) return;
        const sub = data.subscription;
        setCurrentUser(prev => {
          if (!prev) return prev;
          if (
            String(prev.email || '')
              .trim()
              .toLowerCase() !== String(sub.email || '').trim().toLowerCase()
          ) {
            return prev;
          }
          return {...prev, ...sub};
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentUser?.email, setCurrentUser]);
  const handleSubscriptionPress = type => {
    if (onOpenSubscription) {
      onOpenSubscription(type);
    }
  };

  const settingsProfileDisplayName = currentUser
    ? currentUser.name ||
      currentUser.agent_name ||
      currentUser.contact_person_name ||
      currentUser.business_name ||
      'משתמש'
    : '';
  const settingsProfilePicUrl = currentUser
    ? getUserProfileImageUrl(currentUser)
    : null;

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

      {currentUser ? (
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.editIconButton}
            onPress={() => onEditProfile && onEditProfile()}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            activeOpacity={0.7}>
            <Image
              source={require('../assets/pencil-icon.png')}
              style={styles.profileEditIcon}
              resizeMode="contain"
              tintColor={Colors.white100}
            />
          </TouchableOpacity>
          <View style={styles.profileContentRow}>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{settingsProfileDisplayName}</Text>
              {currentUser.email ? (
                <Text style={styles.profileEmail}>{currentUser.email}</Text>
              ) : null}
            </View>
            <View style={styles.profilePictureContainer}>
              {settingsProfilePicUrl ? (
                <Image
                  source={{uri: String(settingsProfilePicUrl)}}
                  style={styles.profilePicture}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.profilePicturePlaceholder}>
                  <Text style={styles.profilePicturePlaceholderText}>
                    {String(settingsProfileDisplayName).trim().charAt(0).toUpperCase() ||
                      '?'}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {currentUser.subscription_type !== subscriptionTypes.user &&
          currentUser.subscriber_number != null &&
          String(currentUser.subscriber_number).trim() !== '' ? (
            <View style={styles.profileBottom}>
              <Text style={styles.subscriberNumberLabel}>מספר מנוי</Text>
              <Text style={styles.subscriberNumber}>
                {String(currentUser.subscriber_number)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Messages/Ads Section */}
      <View style={styles.section}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onOpenChat}
          style={styles.buttonsImageWrap}>
          <Image
            source={require('../assets/buttons.png')}
            style={styles.buttonsImage}
            resizeMode="contain"
          />
          {unreadChatCount > 0 && (
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>
                {unreadChatCount > 99 ? '99+' : String(unreadChatCount)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ניהול המודעות</Text>
          <TouchableOpacity style={styles.cardItem} onPress={onOpenEditPublishAd}>
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
          <TouchableOpacity
            style={styles.cardItem}
            onPress={() => onOpenSecretCodeRecovery && onOpenSecretCodeRecovery()}>
            <Text style={styles.chevron}>›</Text>
            <Text style={styles.cardItemText}>שחזור קוד סודי</Text>
            <Image
              source={require('../assets/lock-icon.png')}
              style={styles.generalIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardItem}
            onPress={() => onOpenFavorites && onOpenFavorites()}>
            <Text style={styles.chevron}>›</Text>
            <Text style={styles.cardItemText}>מועדפים</Text>
            <Image
              source={require('../assets/favorites-icon.png')}
              style={styles.generalIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardItem}
            onPress={() => onOpenFeedback && onOpenFeedback()}>
            <Text style={styles.chevron}>›</Text>
            <Text style={styles.cardItemText}>הצעות לשיפור</Text>
            <Image
              source={require('../assets/suggestions-icon.png')}
              style={styles.generalIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardItem, styles.legalRowTop, styles.legalRowDivider]}
            onPress={() => {
              const u = termsOfUseUrl && String(termsOfUseUrl).trim();
              if (u) {
                openUrlOrPlaceholder(termsOfUseUrl, 'תנאי שימוש');
              } else if (onOpenTermsOfUse) {
                onOpenTermsOfUse();
              } else {
                openUrlOrPlaceholder('', 'תנאי שימוש');
              }
            }}
            activeOpacity={0.8}>
            <Text style={styles.chevron}>›</Text>
            <Text style={styles.cardItemText}>תנאי שימוש</Text>
            <View style={styles.legalIconWrap}>
              <Image
                source={getMoreIconSource('terms')}
                style={styles.legalIconImage}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cardItem, styles.legalRowDivider]}
            onPress={() => {
              const u =
                accessibilityStatementUrl &&
                String(accessibilityStatementUrl).trim();
              if (u) {
                openUrlOrPlaceholder(
                  accessibilityStatementUrl,
                  'הצהרת נגישות',
                );
              } else if (onOpenAccessibilityStatement) {
                onOpenAccessibilityStatement();
              } else {
                openUrlOrPlaceholder('', 'הצהרת נגישות');
              }
            }}
            activeOpacity={0.8}>
            <Text style={styles.chevron}>›</Text>
            <Text style={styles.cardItemText}>הצהרת נגישות</Text>
            <View style={styles.legalIconWrap}>
              <Image
                source={getMoreIconSource('accessibility')}
                style={styles.legalIconImage}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cardItem, styles.legalRowDivider]}
            onPress={openContact}
            activeOpacity={0.8}>
            <Text style={styles.chevron}>›</Text>
            <Text style={styles.cardItemText}>צור קשר</Text>
            <View style={styles.legalIconWrap}>
              <Image
                source={getMoreIconSource('contact')}
                style={styles.legalIconImage}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardItem}
            onPress={() =>
              openUrlOrPlaceholder(
                transactionCancellationUrl,
                'ביטול עסקה',
              )
            }
            activeOpacity={0.8}>
            <Text style={styles.chevron}>›</Text>
            <Text style={styles.cardItemText}>ביטול עסקה</Text>
            <View style={styles.legalIconWrap}>
              <Image
                source={getMoreIconSource('transactionCancel')}
                style={styles.legalIconImage}
                resizeMode="contain"
              />
            </View>
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
  buttonsImageWrap: {
    width: '100%',
    height: 40,
    position: 'relative',
    maxWidth: 366,
    alignSelf: 'center',
    overflow: 'visible',
  },
  buttonsImage: {
    width: '100%',
    height: 40,
    maxWidth: 366,
    alignSelf: 'center',
  },
  chatBadge: {
    position: 'absolute',
    top: 0,
    right: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#5EEAD4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    zIndex: 10,
    elevation: 4,
    shadowColor: '#5EEAD4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 4,
  },
  chatBadgeText: {
    color: '#1a1a2e',
    fontSize: 12,
    fontWeight: '700',
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
    width: 20,
    height: 20,
  },
  subscriptionIcon: {
    width: 20,
    height: 20,
  },
  generalIcon: {
    width: 20,
    height: 20,
  },
  legalRowTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#3a3943',
    marginTop: 4,
    paddingTop: 14,
  },
  legalRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3a3943',
  },
  legalIconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalIconImage: {
    width: 20,
    height: 20,
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
