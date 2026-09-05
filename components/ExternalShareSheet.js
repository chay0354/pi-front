import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {
  EXTERNAL_SHARE_PLATFORMS,
  listingIdForShare,
  shareListingToPlatform,
} from '../utils/externalShare';

/**
 * Platform share sheet for a listing/post — WhatsApp, Instagram, Facebook,
 * TikTok, copy. Sends the /p/:id link that opens that item in the Pi app.
 */
export default function ExternalShareSheet({
  visible,
  listing,
  caption = '',
  title = 'שיתוף',
  onClose,
  onShareCounted,
}) {
  const listingId = listingIdForShare(listing);

  const handlePress = async platformId => {
    if (typeof onClose === 'function') onClose();
    try {
      await shareListingToPlatform({
        platformId,
        listingId,
        caption,
        onShareCounted,
      });
    } catch (err) {
      console.warn('[ExternalShareSheet]', err?.message || err);
    }
  };

  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.root}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="סגור"
        />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.row}>
            {EXTERNAL_SHARE_PLATFORMS.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.btn}
                onPress={() => handlePress(item.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`שתף ב${item.label}`}>
                <View style={[styles.icon, {backgroundColor: item.color}]}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={22}
                    color={item.id === 'copy' ? '#1E1D27' : '#fff'}
                  />
                </View>
                <Text style={styles.label}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  card: {
    backgroundColor: '#1E1D27',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  btn: {
    alignItems: 'center',
    width: 58,
    gap: 6,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
});
