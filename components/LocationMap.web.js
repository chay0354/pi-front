import React, {useMemo} from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';

const MAP_HEIGHT = 230;

function googleEmbedSrc(address) {
  const q = encodeURIComponent(address);
  return `https://maps.google.com/maps?q=${q}&z=15&hl=iw&output=embed`;
}

function externalMapsUrl(address) {
  const q = encodeURIComponent(address);
  if (Platform.OS === 'ios') return `http://maps.apple.com/?q=${q}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export default function LocationMap({address, containerStyle}) {
  const addr = address && String(address).trim() ? String(address).trim() : '';
  const embedUri = useMemo(() => googleEmbedSrc(addr), [addr]);
  const mapsUri = useMemo(() => externalMapsUrl(addr), [addr]);

  if (!addr) return null;

  const openFullMap = async () => {
    if (!mapsUri) return;
    const supported = await Linking.canOpenURL(mapsUri);
    if (supported) await Linking.openURL(mapsUri);
  };

  return (
    <View style={containerStyle}>
      <View style={styles.wrap}>
        <View style={styles.mapFrame}>
          {React.createElement('iframe', {
            title: 'מיקום הנכס',
            src: embedUri,
            style: {width: '100%', height: MAP_HEIGHT, border: 0, display: 'block'},
            loading: 'lazy',
            referrerPolicy: 'no-referrer-when-downgrade',
          })}
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
    position: 'relative',
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

