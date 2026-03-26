import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const MAP_HEIGHT = 200;

function googleEmbedSrc(address) {
  const q = encodeURIComponent(address);
  return `https://maps.google.com/maps?q=${q}&z=15&hl=iw&output=embed`;
}

/**
 * Embedded map for the listing address (Google Maps).
 */
export default function LocationMap({ address, containerStyle }) {
  const addr = (address && String(address).trim()) ? String(address).trim() : '';
  const embedUri = googleEmbedSrc(addr);

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
});
