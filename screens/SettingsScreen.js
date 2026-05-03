import React, {useContext, useEffect, useState} from 'react';
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
import {ProfileAvatar} from '../components';
import {Colors, BorderRadius, FontSizes} from '../constants/styles';
import {ContextHook} from '../hooks/ContextHook';
import {subscriptionTypes} from '../utils/constant';
import {getUserProfileImageUrl} from '../utils/userProfileImage';
import {getCurrentUser, getFollowHubRows, toSubscriptionId} from '../utils/api';

/** Set URLs when pages are ready; empty string shows a short “בקרוב” alert */
const LEGAL_DEFAULTS = {
  termsOfUseUrl: '',
  accessibilityStatementUrl: '',
  supportEmail: 'support@pi.co.il',
  transactionCancellationUrl: '',
};

// Figma node 74:6022 assets (messages pill / PiChat badge)
const PI_CHAT_BAR = require('../assets/menu/pichat.png');
const FIGMA_NAV_CHEVRON_ICON =
  'https://www.figma.com/api/mcp/asset/de89ae2d-1d73-4568-9437-ba7ce08b581d';
const MENU_ICONS = {
  edit: require('../assets/pencil-icon.png'),
  updates: require('../assets/menu/updates.png'),
  favorites: require('../assets/favorites-icon.png'),
  company: require('../assets/subscription-company-icon.png'),
  broker: require('../assets/subscription-broker-icon.png'),
  professional: require('../assets/subscription-professional-icon.png'),
  secret: require('../assets/lock-icon.png'),
  feedback: require('../assets/suggestions-icon.png'),
  terms: require('../assets/more-icons/icons-1.png'),
  accessibility: require('../assets/more-icons/icons-2.png'),
  contact: require('../assets/more-icons/icons-3.png'),
  cancel: require('../assets/more-icons/icons-4.png'),
  logout: require('../assets/logout-icon.png'),
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
  onOpenOwnProfile,
  onEditProfile,
  unreadChatCount = 0,
  termsOfUseUrl = LEGAL_DEFAULTS.termsOfUseUrl,
  accessibilityStatementUrl = LEGAL_DEFAULTS.accessibilityStatementUrl,
  supportEmail = LEGAL_DEFAULTS.supportEmail,
  transactionCancellationUrl = LEGAL_DEFAULTS.transactionCancellationUrl,
  onOpenFollowHub,
}) => {
  const {currentUser, setCurrentUser} = useContext(ContextHook);
  const isLoggedBroker = currentUser?.subscription_type === subscriptionTypes.broker;
  const isLoggedProfessional =
    currentUser?.subscription_type === subscriptionTypes.professional;
  const isLoggedCompany = currentUser?.subscription_type === subscriptionTypes.company;
  const isLoggedRegular = currentUser?.subscription_type === subscriptionTypes.user;
  const [followingPreviewRows, setFollowingPreviewRows] = useState([]);
  const [followingPreviewLoading, setFollowingPreviewLoading] = useState(false);
  const viewerId = toSubscriptionId(
    currentUser?.id || currentUser?.subscription_id || currentUser?.owner_id,
  );

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

  useEffect(() => {
    if (!isLoggedRegular || !viewerId) {
      setFollowingPreviewRows([]);
      setFollowingPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setFollowingPreviewLoading(true);
    getFollowHubRows({
      userId: viewerId,
      viewerId,
      tab: 'following',
      q: '',
    })
      .then(data => {
        if (cancelled) return;
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        setFollowingPreviewRows(rows.slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setFollowingPreviewRows([]);
      })
      .finally(() => {
        if (!cancelled) setFollowingPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedRegular, viewerId]);
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
  const renderChevron = () => (
    <View style={styles.chevron}>
      <Image
        source={{uri: FIGMA_NAV_CHEVRON_ICON}}
        style={styles.chevronIcon}
        resizeMode="contain"
      />
    </View>
  );
  const renderMenuIcon = type => (
    <View style={styles.menuIconBase}>
      <Image source={MENU_ICONS[type]} style={styles.menuIconSingle} resizeMode="contain" />
    </View>
  );
  const openBrokerUpdates = () => {
    Alert.alert('עדכון נכסים חדשים שעולים', 'התוכן יהיה זמין בקרוב.');
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

      {currentUser ? (
        <View style={styles.profileCard}>
          <View style={styles.profileContentRow}>
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
            <View style={styles.profileMainInfoWrap}>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {settingsProfileDisplayName}
                </Text>
                {currentUser.email ? (
                  <Text style={styles.profileEmail} numberOfLines={1}>
                    {currentUser.email}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => onOpenOwnProfile && onOpenOwnProfile()}
                activeOpacity={0.8}>
                <ProfileAvatar
                  uri={settingsProfilePicUrl}
                  name={settingsProfileDisplayName}
                  size={82}
                />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.profileDivider} />
          {currentUser.subscription_type !== subscriptionTypes.user &&
          currentUser.subscriber_number != null &&
          String(currentUser.subscriber_number).trim() !== '' ? (
            <View style={styles.profileBottom}>
              <Text style={styles.subscriberNumber}>
                {String(currentUser.subscriber_number)}
              </Text>
              <Text style={styles.subscriberNumberLabel}>מספר מנוי</Text>
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
          <Image source={PI_CHAT_BAR} style={styles.buttonsImage} resizeMode="contain" />
          {unreadChatCount > 0 ? (
            <View
              style={styles.chatBadge}
              accessibilityRole="text"
              accessibilityLabel={`הודעות חדשות: ${unreadChatCount > 99 ? 'יותר מ־99' : unreadChatCount}`}>
              <Text style={styles.chatBadgeText} numberOfLines={1}>
                {unreadChatCount > 99 ? '99+' : String(unreadChatCount)}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
        {isLoggedRegular ? (
          <TouchableOpacity
            style={styles.followingPreviewWrap}
            activeOpacity={0.8}
            onPress={() => onOpenFollowHub && onOpenFollowHub('following')}>
            <Text style={styles.followingPreviewTitle}>במעקב</Text>
            <View style={styles.followingPreviewAvatars}>
              {followingPreviewLoading ? (
                <Text style={styles.followingPreviewHint}>...</Text>
              ) : followingPreviewRows.length === 0 ? (
                <Text style={styles.followingPreviewHint}>אין עדיין מעקבים</Text>
              ) : (
                followingPreviewRows.map((row, idx) => {
                  const raw =
                    getUserProfileImageUrl(row) ||
                    row?.profile_image_url ||
                    row?.profile_picture_url ||
                    null;
                  return (
                    <View
                      key={row?.id || row?.subscription_id || `following-preview-${idx}`}
                      style={styles.followingPreviewAvatarWrap}>
                      <Image
                        source={
                          raw
                            ? {uri: String(raw)}
                            : require('../assets/image-copy-10.png')
                        }
                        style={styles.followingPreviewAvatar}
                        resizeMode="cover"
                      />
                    </View>
                  );
                })
              )}
            </View>
          </TouchableOpacity>
        ) : null}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ניהול המודעות</Text>
          <TouchableOpacity style={[styles.cardItem, styles.cardItemDivider]} onPress={onOpenEditPublishAd}>
            {renderChevron()}
            <Text style={styles.cardItemText}>ערוך / פרסם פוסט</Text>
            {renderMenuIcon('edit')}
          </TouchableOpacity>
          {isLoggedBroker ? (
            <TouchableOpacity style={[styles.cardItem, styles.cardItemDivider]} onPress={openBrokerUpdates}>
              {renderChevron()}
              <Text style={styles.cardItemText}>עדכון נכסים חדשים שעולים</Text>
              {renderMenuIcon('updates')}
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.cardItem} onPress={() => onOpenFavorites && onOpenFavorites()}>
            {renderChevron()}
            <Text style={styles.cardItemText}>מועדפים</Text>
            {renderMenuIcon('favorites')}
          </TouchableOpacity>
        </View>
      </View>

      {/* Subscriptions Section */}
      {!isLoggedBroker && !isLoggedProfessional && !isLoggedCompany ? (
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>מנויים</Text>
            <TouchableOpacity
              style={[styles.cardItem, styles.cardItemDivider]}
              onPress={() => handleSubscriptionPress(subscriptionTypes.company)}>
              {renderChevron()}
              <Text style={styles.cardItemText}>מנוי לחברות</Text>
              {renderMenuIcon('company')}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cardItem, styles.cardItemDivider]}
              onPress={() => handleSubscriptionPress(subscriptionTypes.broker)}>
              {renderChevron()}
              <Text style={styles.cardItemText}>מנוי למתווכים</Text>
              {renderMenuIcon('broker')}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cardItem}
              onPress={() => handleSubscriptionPress(subscriptionTypes.professional)}>
              {renderChevron()}
              <Text style={styles.cardItemText}>מנוי לבעלי מקצוע</Text>
              {renderMenuIcon('professional')}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* General Settings Section */}
      <View style={styles.section}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>כללי</Text>
          <TouchableOpacity
            style={[styles.cardItem, styles.cardItemDivider]}
            onPress={() => onOpenSecretCodeRecovery && onOpenSecretCodeRecovery()}>
            {renderChevron()}
            <Text style={styles.cardItemText}>שחזור קוד סודי</Text>
            {renderMenuIcon('secret')}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cardItem, styles.cardItemDivider]}
            onPress={() => onOpenFeedback && onOpenFeedback()}>
            {renderChevron()}
            <Text style={styles.cardItemText}>הצעות לשיפור</Text>
            {renderMenuIcon('feedback')}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardItem, styles.cardItemDivider]}
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
            {renderChevron()}
            <Text style={styles.cardItemText}>תנאי שימוש</Text>
            {renderMenuIcon('terms')}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cardItem, styles.cardItemDivider]}
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
            {renderChevron()}
            <Text style={styles.cardItemText}>הצהרת נגישות</Text>
            {renderMenuIcon('accessibility')}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cardItem, styles.cardItemDivider]}
            onPress={openContact}
            activeOpacity={0.8}>
            {renderChevron()}
            <Text style={styles.cardItemText}>צור קשר</Text>
            {renderMenuIcon('contact')}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cardItem, styles.cardItemDivider]}
            onPress={() =>
              openUrlOrPlaceholder(
                transactionCancellationUrl,
                'ביטול עסקה',
              )
            }
            activeOpacity={0.8}>
            {renderChevron()}
            <Text style={styles.cardItemText}>ביטול עסקה</Text>
            {renderMenuIcon('cancel')}
          </TouchableOpacity>

          {currentUser ? (
            <TouchableOpacity style={styles.cardItem} onPress={handleLogout}>
              {renderChevron()}
              <Text style={styles.cardItemText}>התנתק</Text>
              {renderMenuIcon('logout')}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.cardItem} onPress={onOpenLogin}>
              {renderChevron()}
              <Text style={styles.cardItemText}>התחבר</Text>
              {renderMenuIcon('secret')}
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
    top: '50%',
    left: 0,
    width: 40,
    height: 40,
    marginTop: -20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeIcon: {
    fontSize: 18,
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
    height: 44,
    position: 'relative',
    maxWidth: 313,
    alignSelf: 'center',
    overflow: 'visible',
  },
  buttonsImage: {
    width: '100%',
    height: 44,
    maxWidth: 313,
    alignSelf: 'center',
    overflow: 'visible',
  },
  followingPreviewWrap: {
    width: '100%',
    maxWidth: 313,
    alignSelf: 'center',
    marginTop: 2,
    marginBottom: 2,
    alignItems: 'flex-end',
    gap: 8,
  },
  followingPreviewTitle: {
    color: '#D2D0DC',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  followingPreviewAvatars: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    minHeight: 34,
  },
  followingPreviewAvatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#FEE787',
    overflow: 'hidden',
    backgroundColor: '#1E1D27',
  },
  followingPreviewAvatar: {
    width: '100%',
    height: '100%',
  },
  followingPreviewHint: {
    color: '#8C85B3',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
  },
  chatBadge: {
    position: 'absolute',
    top: -2,
    right: 2,
    minWidth: 24,
    height: 24,
    minHeight: 24,
    borderRadius: 12,
    backgroundColor: '#5EEAD4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    zIndex: 10,
    elevation: 6,
    shadowColor: '#5EEAD4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: '#1E1D27',
  },
  chatBadgeText: {
    color: '#1a1a2e',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Rubik-Medium',
    includeFontPadding: false,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#2b2a39',
    borderRadius: 12,
    padding: 18,
    gap: 24,
  },
  cardTitle: {
    fontSize: FontSizes.fs18,
    color: Colors.textSecondary,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    marginBottom: -8,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
    paddingVertical: 0,
    gap: 10,
    justifyContent: 'space-between',
  },
  cardItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#222132',
    paddingBottom: 16,
  },
  chevron: {
    width: 11,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  chevronIcon: {
    width: 6,
    height: 11,
  },
  cardItemText: {
    flex: 1,
    fontSize: 16,
    color: Colors.white100,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    lineHeight: 32,
    textAlign: 'right',
  },
  menuIconBase: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuIconSingle: {
    width: 24,
    height: 24,
  },
  profileCard: {
    backgroundColor: '#2b2a39',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEE787',
    position: 'relative',
    minHeight: 153,
    shadowColor: '#595132',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 6,
  },
  editIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2b2a39',
    marginTop: 2,
  },
  profileEditIcon: {
    width: 26.667,
    height: 26.667,
  },
  profileContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  profileMainInfoWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  profilePictureContainer: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: Colors.yellowIcons,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2b2a39',
  },
  /** Gradient gold ring for the profile avatar, matches the Figma 1:1 (gold gradient 4.5% → 50.7% → 88.3%). */
  profilePictureRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Dark inner mask so the gold gradient reads as a ring, with a visible gap around the photo. */
  profilePictureInnerWrap: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2b2a39',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  profileInfo: {
    width: 200,
    maxWidth: 200,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
    color: Colors.textSecondary,
    textAlign: 'right',
    width: '100%',
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(210,208,220,0.5)',
    textAlign: 'right',
    letterSpacing: 0.5447,
    lineHeight: 16,
    width: '100%',
  },
  profilePicture: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  profilePicturePlaceholder: {
    backgroundColor: '#1e1d27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicturePlaceholderText: {
    fontSize: 22,
    fontWeight: '500',
    color: Colors.white100,
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#3A394A',
    marginTop: 10,
    marginBottom: 10,
  },
  profileBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriberNumber: {
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    color: Colors.white100,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
  },
  subscriberNumberLabel: {
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    color: Colors.white100,
    fontFamily: 'Rubik-Regular',
    fontWeight: '400',
  },
});

export default SettingsScreen;
