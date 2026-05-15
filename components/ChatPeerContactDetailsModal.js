import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  Alert,
  Image,
  SafeAreaView,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {ProfileAvatar} from './ProfileAvatar';

/** Matches Figma main-deep-blue / blue-100 */
const BG = '#1e1d27';
/** headline/bigger/semibold — white-300 */
const NAME_COLOR = '#f7f3e6';
const LABEL_SECONDARY = '#d2d0dc';
const WHITE = '#ffffff';

const DEFAULT_AVATAR = require('../assets/image-copy-10.png');
const PHONE_ASSET = require('../assets/pi-chat/phone.png');

const toTelUrl = (raw) => {
  if (raw == null || !String(raw).trim()) return null;
  const cleaned = String(raw).replace(/[^\d+]/g, '');
  if (!cleaned || cleaned === '+') return null;
  return `tel:${cleaned}`;
};

/**
 * Full-screen "פרטי קשר" — Figma node 7:6684 (Pi chat contact details).
 */
const ChatPeerContactDetailsModal = ({
  visible,
  onClose,
  displayName,
  avatarUri,
  phone,
}) => {
  const name =
    displayName != null && String(displayName).trim()
      ? String(displayName).trim()
      : 'משתמש';
  const tel = phone != null && String(phone).trim() ? String(phone).trim() : null;
  const telUrl = tel ? toTelUrl(tel) : null;

  const handleDial = async () => {
    if (!telUrl) return;
    try {
      await Linking.openURL(telUrl);
    } catch (_) {
      Alert.alert('', 'לא ניתן לחייג כעת');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.root}>
          <View style={styles.topNav}>
            <View style={styles.navRow}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.backHit}
                accessibilityRole="button"
                accessibilityLabel="חזור"
                hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
                activeOpacity={0.75}>
                <MaterialCommunityIcons name="chevron-left" size={28} color={WHITE} />
              </TouchableOpacity>
              <View style={styles.navTitleSlot}>
                <Text style={styles.navTitle}>פרטי קשר</Text>
              </View>
              <View style={styles.navTrailing} />
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.profileBlock}>
              <ProfileAvatar
                uri={avatarUri || null}
                name={name}
                size={117}
                placeholderImage={DEFAULT_AVATAR}
              />
              <Text style={styles.displayName} numberOfLines={2}>
                {name}
              </Text>
            </View>

            {tel ? (
              <View style={styles.phoneBlock}>
                <Image source={PHONE_ASSET} style={styles.phoneIcon} resizeMode="contain" />
                <Text style={styles.phoneLabel}>טלפון נייד</Text>
                <TouchableOpacity onPress={handleDial} activeOpacity={0.7} accessibilityRole="link">
                  <Text style={styles.phoneValue}>{tel}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.noPhone}>אין מספר טלפון זמין</Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  /** shadow 3 — Figma 0,10,20 #0000001A; top corners 24 */
  topNav: {
    backgroundColor: BG,
    paddingHorizontal: 16,
    paddingBottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {elevation: 8},
      default: {},
    }),
  },
  navRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  backHit: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 1000,
  },
  navTitleSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    color: WHITE,
    textAlign: 'center',
  },
  navTrailing: {
    width: 40,
    height: 40,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 40,
    alignItems: 'center',
  },
  profileBlock: {
    alignItems: 'center',
    gap: 14,
    maxWidth: 280,
  },
  /** headline/bigger/semibold 28 / 31 */
  displayName: {
    fontFamily: 'Rubik-SemiBold',
    fontSize: 28,
    lineHeight: 31,
    color: NAME_COLOR,
    textAlign: 'center',
  },
  phoneBlock: {
    marginTop: 40,
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  phoneIcon: {
    width: 24,
    height: 24,
  },
  phoneLabel: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.54,
    color: LABEL_SECONDARY,
    textAlign: 'center',
  },
  /** body/medium/regular — link underline */
  phoneValue: {
    fontFamily: 'Rubik-Regular',
    fontSize: 18,
    lineHeight: 34,
    color: WHITE,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  noPhone: {
    marginTop: 32,
    fontFamily: 'Rubik-Regular',
    fontSize: 15,
    color: LABEL_SECONDARY,
    textAlign: 'center',
  },
});

export default ChatPeerContactDetailsModal;
