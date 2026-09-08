import React from 'react';
import {Image, View, StyleSheet} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';

/**
 * Official brand marks for the share sheet (WhatsApp, Instagram, Facebook, TikTok).
 * Copy stays a simple in-app glyph.
 */
export default function ShareBrandIcon({item, size = 48}) {
  if (item?.image) {
    const radius = item.tileRadius != null ? item.tileRadius : 12;
    const pad = item.iconPad != null ? item.iconPad : 0;
    const inner = Math.max(16, size - pad * 2);
    return (
      <View
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: item.tileColor || 'transparent',
          },
        ]}>
        <Image
          source={item.image}
          style={{width: inner, height: inner}}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: item?.color || '#FEE787',
        },
      ]}>
      <MaterialCommunityIcons
        name={item?.icon || 'link-variant'}
        size={Math.round(size * 0.46)}
        color="#1E1D27"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
