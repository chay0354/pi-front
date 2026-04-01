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
import MapView, {Marker, Callout} from 'react-native-maps';

const MAP_HEIGHT = 230;
const DEFAULT_DELTA = 0.008;

function googleEmbedSrc(address) {
  const q = encodeURIComponent(address);
  return `https://maps.google.com/maps?q=${q}&z=15&hl=iw&output=embed`;
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
  const embedUri = useMemo(() => googleEmbedSrc(addr), [addr]);
  const mapsUri = useMemo(() => externalMapsUrl(addr), [addr]);
  const [region, setRegion] = useState(null);

  if (!addr) return null;

  useEffect(() => {
    let isMounted = true;

    async function fetchCoords() {
      if (Platform.OS === 'web') return;
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
  }, [addr]);

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
    ) : coords && region ? (
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
      <WebView
        style={styles.webView}
        source={{uri: embedUri}}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
      />
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
