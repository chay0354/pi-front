import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MAP_HEIGHT = 200;

function googleEmbedSrc(address) {
  const q = encodeURIComponent(address);
  return `https://maps.google.com/maps?q=${q}&z=15&hl=iw&output=embed`;
}

/**
 * Embedded map for the listing address (Google Maps). Tap footer to open full maps app.
 */
export default function LocationMap({ address, containerStyle }) {
  const addr = (address && String(address).trim()) ? String(address).trim() : '';
  const embedUri = googleEmbedSrc(addr);

  const openMaps = () => {
    if (!addr) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    Linking.openURL(url).catch(() => {});
  };

  if (!addr) return null;

  const mapNode =
    Platform.OS === 'web'
      ? React.createElement('iframe', {
          title: 'מיקום הנכס',
          src: embedUri,
          style: {
            width: '100%',
            height: MAP_HEIGHT,
            border: 0,
            display: 'block',
          },
          loading: 'lazy',
          referrerPolicy: 'no-referrer-when-downgrade',
        })
      : (
        <WebView
          style={styles.webView}
          source={{ uri: embedUri }}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
        />
      );

  return (
    <View style={containerStyle}>
      <View style={styles.wrap}>
        <View style={styles.mapFrame}>
          {mapNode}
        </View>
        <TouchableOpacity activeOpacity={0.85} onPress={openMaps}>
          <View style={styles.footer}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#ffc40a" />
            <Text style={styles.address} numberOfLines={2}>{addr}</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.hint}>הקש על הכתובת לפתיחה בגוגל מפות</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  mapFrame: {
    width: '100%',
    height: MAP_HEIGHT,
    backgroundColor: 'rgba(22,26,38,1)',
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    width: '100%',
    height: MAP_HEIGHT,
    backgroundColor: 'transparent',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  address: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    textAlign: 'right',
    lineHeight: 20,
  },
  hint: {
    paddingBottom: 10,
    paddingHorizontal: 12,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    textAlign: 'center',
  },
});
