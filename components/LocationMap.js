import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import {WebView} from 'react-native-webview';

// Avoid resolving react-native-maps on web bundle.
let MapView = null;
let Marker = null;
let Callout = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Callout = Maps.Callout;
}

const MAP_HEIGHT = 230;
const DEFAULT_DELTA = 0.008;

function googleEmbedSrc(address) {
  const q = encodeURIComponent(address);
  return `https://maps.google.com/maps?q=${q}&z=15&hl=iw&output=embed`;
}

/** Google Embed API rejects direct navigation — must load inside an iframe (WebView needs HTML wrapper). */
function googleEmbedHtml(address) {
  const src = googleEmbedSrc(address).replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="he">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #161a26; }
  iframe { border: 0; width: 100%; height: 100%; display: block; }
</style>
</head>
<body>
<iframe title="מיקום הנכס" src="${src}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
</body>
</html>`;
}

function hasNativeMapsSdkKey() {
  if (Platform.OS === 'android') {
    return Boolean(String(process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY || '').trim());
  }
  if (Platform.OS === 'ios') {
    return true;
  }
  return false;
}

function externalMapsUrl(address) {
  const q = encodeURIComponent(address);
  if (Platform.OS === 'ios') {
    return `http://maps.apple.com/?q=${q}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/**
 * Embedded map for the listing address (Google Maps).
 */
export default function LocationMap({address, containerStyle}) {
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const addr = address && String(address).trim() ? String(address).trim() : '';
  const embedHtml = useMemo(() => googleEmbedHtml(addr), [addr]);
  const mapsUri = useMemo(() => externalMapsUrl(addr), [addr]);
  const [region, setRegion] = useState(null);
  const useNativeMap = hasNativeMapsSdkKey();

  useEffect(() => {
    if (!addr) return undefined;
    let isMounted = true;

    async function fetchCoords() {
      if (Platform.OS === 'web' || !useNativeMap) return;
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          addr,
        )}`;
        const res = await fetch(url, {
          headers: {Accept: 'application/json'},
        });
        const data = await res.json();
        const first = Array.isArray(data) ? data[0] : null;
        const nextCoords =
          first && first.lat && first.lon
            ? {
                latitude: Number(first.lat),
                longitude: Number(first.lon),
              }
            : null;
        if (isMounted) {
          setCoords(nextCoords);
          setRegion(
            nextCoords
              ? {
                  ...nextCoords,
                  latitudeDelta: DEFAULT_DELTA,
                  longitudeDelta: DEFAULT_DELTA,
                }
              : null,
          );
        }
      } catch (_err) {
        if (isMounted) {
          setCoords(null);
          setRegion(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchCoords();
    return () => {
      isMounted = false;
    };
  }, [addr, useNativeMap]);

  if (!addr) return null;

  const openFullMap = async () => {
    if (!mapsUri) return;
    const supported = await Linking.canOpenURL(mapsUri);
    if (supported) {
      await Linking.openURL(mapsUri);
    }
  };

  const mapNode =
    Platform.OS === 'web' ? (
      React.createElement('iframe', {
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
    ) : loading ? (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="small" color="#f2c200" />
      </View>
    ) : useNativeMap && coords && region && MapView && Marker && Callout ? (
      <View style={styles.nativeMapWrap}>
        <MapView
          style={styles.map}
          region={region}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          onRegionChangeComplete={setRegion}>
          <Marker coordinate={coords}>
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutText}>זה כאן</Text>
              </View>
            </Callout>
          </Marker>
        </MapView>
        <TouchableOpacity
          onPress={openFullMap}
          activeOpacity={0.85}
          style={styles.expandButton}>
          {/* <Text style={styles.expandIcon}>⤢</Text> */}
          <Image
            source={require('../assets/full_screen.png')}
            style={styles.expandIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.nativeMapWrap}>
        <WebView
          style={styles.webView}
          source={{html: embedHtml}}
          originWhitelist={['*']}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
        />
        <TouchableOpacity
          onPress={openFullMap}
          activeOpacity={0.85}
          style={styles.expandButton}>
          <Image
            source={require('../assets/full_screen.png')}
            style={styles.expandIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    );

  return (
    <View style={containerStyle}>
      <View style={styles.wrap}>
        <View style={styles.mapFrame}>{mapNode}</View>
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
  map: {
    width: '100%',
    height: MAP_HEIGHT,
  },
  nativeMapWrap: {
    width: '100%',
    height: MAP_HEIGHT,
    position: 'relative',
  },
  loaderWrap: {
    width: '100%',
    height: MAP_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callout: {
    backgroundColor: '#f3f3f4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  calloutText: {
    color: '#2d2d3f',
    fontSize: 18,
    fontWeight: '700',
  },
  expandButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandIcon: {
    width: 24,
    height: 24,
  },
});
