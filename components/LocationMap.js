import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const isWeb = Platform.OS === 'web';

const DEFAULT_LAT = 32.0853;
const DEFAULT_LON = 34.7818;

async function geocodeAddress(address) {
  if (!address || typeof address !== 'string' || !address.trim()) return { lat: DEFAULT_LAT, lon: DEFAULT_LON };
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address.trim())}&format=json&limit=1`,
      { headers: { 'User-Agent': 'RealEstateApp/1.0' } }
    );
    const data = await res.json();
    if (Array.isArray(data) && data[0] && data[0].lat != null && data[0].lon != null) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch (_) {}
  return { lat: DEFAULT_LAT, lon: DEFAULT_LON };
}

function buildMapHTML(lat, lon) {
  const latEsc = lat.toFixed(5);
  const lonEsc = lon.toFixed(5);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .leaflet-popup-content-wrapper { border-radius: 12px; padding: 0; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
    .leaflet-popup-content { margin: 12px 16px; font-family: system-ui, sans-serif; font-size: 15px; font-weight: 600; color: #1a1a1e; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${latEsc}, ${lonEsc}], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    var marker = L.circleMarker([${latEsc}, ${lonEsc}], {
      radius: 12,
      fillColor: '#ffc40a',
      color: '#fff',
      weight: 2,
      fillOpacity: 1
    }).addTo(map);
    marker.bindPopup('<div style="text-align:center; direction:rtl;">זה כאן</div>', {
      closeButton: false,
      offset: [0, -12]
    }).openPopup();
  </script>
</body>
</html>`;
}

export default function LocationMap({ address, style, containerStyle, onExpand }) {
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const webMapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    geocodeAddress(address).then(({ lat, lon }) => {
      if (!cancelled) {
        setCoords({ lat, lon });
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [address]);

  // On web: inject iframe into container (WebView doesn't support web platform)
  const webMapContainerId = 'location-map-iframe-container';
  useEffect(() => {
    if (!isWeb || !coords || typeof document === 'undefined') return;
    const el = document.getElementById(webMapContainerId);
    if (!el) return;
    const lat = coords.lat;
    const lon = coords.lon;
    const delta = 0.006;
    const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
    const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', embedUrl);
    iframe.setAttribute('title', 'Map');
    iframe.style.width = '100%';
    iframe.style.height = '200px';
    iframe.style.border = '0';
    iframe.style.borderRadius = '16px';
    iframe.style.display = 'block';
    el.appendChild(iframe);
    return () => { if (iframe.parentNode === el) el.removeChild(iframe); };
  }, [coords]);

  const openInBrowser = () => {
    if (coords) {
      const url = `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lon}&zoom=17`;
      if (isWeb && typeof window !== 'undefined') window.open(url, '_blank');
      else if (typeof onExpand === 'function') onExpand(url);
    }
  };

  if (loading || !coords) {
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.placeholder}>
          <ActivityIndicator size="large" color="#ffc40a" />
          <Text style={styles.placeholderText}>טוען מפה...</Text>
        </View>
      </View>
    );
  }

  // Web: render container and inject iframe in useEffect (WebView doesn't support web)
  if (isWeb) {
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={[styles.mapWrap, style, isWeb && styles.mapWrapWeb]}>
          <View
            ref={webMapRef}
            {...(isWeb ? { id: webMapContainerId } : {})}
            nativeID={webMapContainerId}
            style={styles.webMapInner}
            collapsable={false}
          />
          <TouchableOpacity style={styles.expandBtn} onPress={openInBrowser} activeOpacity={0.8}>
            <MaterialCommunityIcons name="arrow-expand" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Native: use WebView with Leaflet HTML (yellow marker + "זה כאן" popup)
  const WebView = require('react-native-webview').WebView;
  const html = buildMapHTML(coords.lat, coords.lon);
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.mapWrap, style]}>
        <WebView
          source={{ html }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
        />
        <TouchableOpacity style={styles.expandBtn} onPress={openInBrowser} activeOpacity={0.8}>
          <MaterialCommunityIcons name="arrow-expand" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'stretch',
    marginVertical: 12,
  },
  mapWrap: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1e',
  },
  mapWrapWeb: {
    position: 'relative',
  },
  webMapInner: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  webview: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  expandBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
});
