import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {normalizeVirtualTourUrl, virtualTourEmbedUrl} from '../utils/virtualTour';

const PREVIEW_HEIGHT = 230;
/** Players (YouTube/Vimeo/Drive) need a real https origin when wrapped in an iframe. */
const IFRAME_BASE_URL = 'https://pi-back.vercel.app';
const PLAYER_HOSTS = /^https:\/\/(www\.youtube\.com\/embed|player\.vimeo\.com\/video|drive\.google\.com\/file)\//i;

function iframeHtml(src) {
  const safe = src.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#161a26}iframe{border:0;width:100%;height:100%;display:block}</style>
</head><body>
<iframe src="${safe}" allow="autoplay; fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
</body></html>`;
}

function webSource(embedUrl) {
  if (PLAYER_HOSTS.test(embedUrl)) {
    return {html: iframeHtml(embedUrl), baseUrl: IFRAME_BASE_URL};
  }
  return {uri: embedUrl};
}

function TourWebView({embedUrl, style, scrollEnabled}) {
  const [loading, setLoading] = useState(true);
  const source = useMemo(() => webSource(embedUrl), [embedUrl]);
  if (Platform.OS === 'web') {
    return React.createElement('iframe', {
      title: 'הדמיית הפרויקט',
      src: embedUrl,
      style: {width: '100%', height: '100%', border: 0, display: 'block'},
      allow: 'autoplay; fullscreen; xr-spatial-tracking; gyroscope; accelerometer',
      allowFullScreen: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
    });
  }
  return (
    <View style={style}>
      <WebView
        style={styles.webView}
        source={source}
        originWhitelist={['https://*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction
        setSupportMultipleWindows={false}
        nestedScrollEnabled
        scrollEnabled={scrollEnabled}
        onLoadEnd={() => setLoading(false)}
      />
      {loading ? (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="small" color="#f2c200" />
        </View>
      ) : null}
    </View>
  );
}

/** Company project visualization / 3D tour: inline preview + full-screen viewer. */
export default function VirtualTourEmbed({url, containerStyle}) {
  const insets = useSafeAreaInsets();
  const [fullScreen, setFullScreen] = useState(false);
  const tourUrl = normalizeVirtualTourUrl(url);
  const embedUrl = virtualTourEmbedUrl(url);
  if (!tourUrl || !embedUrl) return null;

  const openExternal = () => {
    Linking.openURL(tourUrl).catch(() => {});
  };

  return (
    <View style={containerStyle}>
      <Text style={styles.title}>הדמיית הפרויקט</Text>
      <View style={styles.frame}>
        <TourWebView
          embedUrl={embedUrl}
          style={styles.preview}
          scrollEnabled={false}
        />
        {Platform.OS === 'web' ? null : (
          <TouchableOpacity
            onPress={() => setFullScreen(true)}
            activeOpacity={0.9}
            style={styles.tapLayer}
            accessibilityRole="button"
            accessibilityLabel="הדמיה במסך מלא">
            <View style={styles.expandButton}>
              <Image
                source={require('../assets/full_screen.png')}
                style={styles.expandIcon}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity onPress={openExternal} activeOpacity={0.8}>
        <Text style={styles.externalLink}>פתיחה בדפדפן</Text>
      </TouchableOpacity>
      <Modal
        visible={fullScreen}
        animationType="slide"
        presentationStyle="fullScreen"
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={() => setFullScreen(false)}>
        <View style={[styles.modal, {paddingTop: insets.top}]}>
          <View style={styles.modalBar}>
            <Text style={styles.modalTitle}>הדמיית הפרויקט</Text>
            <TouchableOpacity
              onPress={() => setFullScreen(false)}
              style={styles.closeButton}
              accessibilityLabel="סגירה"
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          {fullScreen ? (
            <TourWebView
              embedUrl={embedUrl}
              style={[styles.modalBody, {paddingBottom: insets.bottom}]}
              scrollEnabled
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: Platform.OS === 'web' ? 'right' : 'left',
    writingDirection: 'rtl',
    marginBottom: 10,
  },
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  frame: {
    width: '100%',
    height: PREVIEW_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(22,26,38,1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: PREVIEW_HEIGHT,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandIcon: {
    width: 22,
    height: 22,
  },
  externalLink: {
    color: '#f2c200',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: Platform.OS === 'web' ? 'right' : 'left',
    writingDirection: 'rtl',
    marginTop: 10,
    textDecorationLine: 'underline',
  },
  modal: {
    flex: 1,
    backgroundColor: '#14131B',
  },
  modalBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 20,
  },
  modalBody: {
    flex: 1,
  },
});
