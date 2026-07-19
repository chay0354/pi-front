import React, {useCallback, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const MAX_BYTES = 25 * 1024 * 1024;

const PICKER_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      background: #1e1d27;
      color: #fff;
      font-family: -apple-system, system-ui, sans-serif;
      padding: 24px;
      text-align: center;
    }
    p { margin: 0; opacity: 0.75; font-size: 14px; line-height: 1.4; }
    button {
      appearance: none;
      border: 0;
      background: #2DD4BF;
      color: #1e1d27;
      font-size: 16px;
      font-weight: 700;
      padding: 14px 28px;
      border-radius: 14px;
    }
    #status { min-height: 20px; font-size: 13px; opacity: 0.85; }
  </style>
</head>
<body>
  <input id="file" type="file" accept="*/*" style="display:none" />
  <p>בחרו קובץ לשליחה בצ׳אט<br/>(עד 25MB)</p>
  <button id="pick" type="button">בחר קובץ</button>
  <div id="status"></div>
  <script>
    var input = document.getElementById('file');
    var statusEl = document.getElementById('status');
    var MAX = ${MAX_BYTES};
    function post(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }
    function setStatus(t) { statusEl.textContent = t || ''; }
    document.getElementById('pick').onclick = function () { input.click(); };
    input.onchange = function () {
      var file = input.files && input.files[0];
      if (!file) {
        post({ canceled: true });
        return;
      }
      if (file.size > MAX) {
        setStatus('הקובץ גדול מדי (מקסימום 25MB)');
        post({ canceled: true, error: 'too_large' });
        return;
      }
      setStatus('טוען קובץ...');
      var reader = new FileReader();
      reader.onerror = function () {
        setStatus('קריאת הקובץ נכשלה');
        post({ canceled: true, error: 'read_failed' });
      };
      reader.onload = function () {
        var dataUrl = String(reader.result || '');
        var comma = dataUrl.indexOf(',');
        var base64 = comma >= 0 ? dataUrl.slice(comma + 1) : '';
        if (!base64) {
          post({ canceled: true, error: 'empty' });
          return;
        }
        post({
          canceled: false,
          name: file.name || ('file-' + Date.now()),
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          base64: base64
        });
      };
      reader.readAsDataURL(file);
    };
    setTimeout(function () { input.click(); }, 350);
  </script>
</body>
</html>`;

function safeExtFromName(name, mimeType) {
  const fromName = String(name || '').match(/\.([a-zA-Z0-9]{1,8})$/)?.[1];
  if (fromName) return fromName.toLowerCase();
  const mime = String(mimeType || '').toLowerCase();
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('word')) return 'docx';
  if (mime.includes('sheet') || mime.includes('excel')) return 'xlsx';
  return 'bin';
}

/**
 * Document picker that works without ExpoDocumentPicker native module
 * (uses WebView file input + expo-file-system cache write).
 */
export default function ChatDocumentPickerModal({visible, onCancel, onPicked}) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const handledRef = useRef(false);

  const finishCancel = useCallback(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    setBusy(false);
    onCancel?.();
  }, [onCancel]);

  const onMessage = useCallback(
    async event => {
      if (handledRef.current) return;
      let payload;
      try {
        payload = JSON.parse(event?.nativeEvent?.data || '{}');
      } catch {
        return;
      }
      if (payload?.canceled) {
        if (payload.error === 'too_large') {
          handledRef.current = true;
          setBusy(false);
          onCancel?.('הקובץ גדול מדי (מקסימום 25MB)');
          return;
        }
        finishCancel();
        return;
      }
      if (!payload?.base64) {
        finishCancel();
        return;
      }
      handledRef.current = true;
      setBusy(true);
      try {
        const name = payload.name || `file-${Date.now()}`;
        const mimeType = payload.mimeType || 'application/octet-stream';
        const ext = safeExtFromName(name, mimeType);
        const path = `${FileSystem.cacheDirectory}chat-file-${Date.now()}.${ext}`;
        await FileSystem.writeAsStringAsync(path, payload.base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        onPicked?.({
          uri: path,
          name,
          mimeType,
          size: payload.size,
        });
      } catch (e) {
        handledRef.current = false;
        setBusy(false);
        onCancel?.(e?.message || 'שמירת הקובץ נכשלה');
      }
    },
    [finishCancel, onCancel, onPicked],
  );

  if (Platform.OS === 'web') return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={finishCancel}
      onShow={() => {
        handledRef.current = false;
        setBusy(false);
      }}>
      <View style={[styles.root, {paddingTop: insets.top}]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={finishCancel}
            style={styles.closeBtn}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            accessibilityRole="button"
            accessibilityLabel="סגור">
            <MaterialCommunityIcons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>צרף קובץ</Text>
          <View style={styles.closeBtn} />
        </View>
        <View style={styles.webWrap}>
          <WebView
            originWhitelist={['*']}
            source={{html: PICKER_HTML}}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled
            allowFileAccess
            allowUniversalAccessFromFileURLs
            mixedContentMode="always"
            style={styles.webview}
          />
          {busy ? (
            <View style={styles.busyOverlay}>
              <ActivityIndicator size="large" color="#2DD4BF" />
              <Text style={styles.busyText}>מכין קובץ...</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1e1d27',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  webWrap: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#1e1d27',
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30,29,39,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  busyText: {
    color: '#fff',
    fontSize: 14,
  },
});
