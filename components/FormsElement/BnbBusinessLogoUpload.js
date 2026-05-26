import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Text,
  Platform,
  I18nManager,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Colors} from '../../constants/styles';
import {flexEnd} from '../../utils/rtlLayout';
/**
 * Circular logo placeholder for BnB "business" flow only — gold ring, לוגו label, + control.
 */
export const BnbBusinessLogoUpload = ({
  logo,
  onPress,
  inputRef,
  onWebFileChange,
}) => {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.circle}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityLabel="העלאת לוגו עסקי">
        {logo?.uri ? (
          <Image
            source={{uri: logo.uri}}
            style={styles.imageFill}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.placeholderLabel}>לוגו</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.fab}
        onPress={onPress}
        activeOpacity={0.85}
        hitSlop={10}>
        <MaterialCommunityIcons
          name="plus"
          size={17}
          color={Colors.whiteGeneral}
        />
      </TouchableOpacity>
      {Platform.OS === 'web' && inputRef && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{display: 'none'}}
          onChange={onWebFileChange}
        />
      )}
    </View>
  );
};

// Slightly compact; align toward visual right (RTL: flex-start, LTR: flex-end)
const SIZE = 92;
const RING = 2;

const styles = StyleSheet.create({
  wrap: {
    width: SIZE + 6,
    height: SIZE + 6,
    alignSelf: flexEnd,
    marginBottom: 16,
    marginTop: 6,
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: RING,
    borderColor: Colors.yellowIcons,
    backgroundColor: '#252436',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageFill: {
    width: SIZE - RING * 2,
    height: SIZE - RING * 2,
    borderRadius: (SIZE - RING * 2) / 2,
  },
  placeholderLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    fontFamily: 'Rubik-Medium',
  },
  fab: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1e1d27',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 0,
    right: 0,
  },
});
