import React, {useState, useMemo, useEffect, useRef, useCallback} from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  PanResponder,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {captureRef} from 'react-native-view-shot';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';

const CROP_SIZE = Math.min(320, Dimensions.get('window').width - 48);
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
/** Extra slack (px) past each image edge — you can keep panning a bit after the photo ends. */
const PAN_OVERSCROLL = 80;

function getScaledLayout(imgSize, pan, zoom) {
  const baseScale = Math.max(CROP_SIZE / imgSize.width, CROP_SIZE / imgSize.height);
  const totalScale = baseScale * zoom;
  const displayW = imgSize.width * totalScale;
  const displayH = imgSize.height * totalScale;
  const imageLeft = CROP_SIZE / 2 - displayW / 2 + pan.x;
  const imageTop = CROP_SIZE / 2 - displayH / 2 + pan.y;
  return {baseScale, totalScale, displayW, displayH, imageLeft, imageTop};
}

function clampPan(pan, displayW, displayH) {
  // pan = {0,0} is the CENTERED image, so the valid range is symmetric:
  // ±(overhang/2) reaches each image edge exactly, plus overscroll slack.
  // (The old asymmetric [CROP-display, 0] clamp let one side pan twice as
  // far as needed while the opposite side got stuck before the edge.)
  const halfX = Math.max(0, (displayW - CROP_SIZE) / 2) + PAN_OVERSCROLL;
  const halfY = Math.max(0, (displayH - CROP_SIZE) / 2) + PAN_OVERSCROLL;
  return {
    x: Math.min(halfX, Math.max(-halfX, pan.x)),
    y: Math.min(halfY, Math.max(-halfY, pan.y)),
  };
}

function getCropRect(imgSize, pan, zoom) {
  const {totalScale, displayW, displayH, imageLeft, imageTop} = getScaledLayout(
    imgSize,
    pan,
    zoom,
  );
  const originX = Math.max(0, -imageLeft / totalScale);
  const originY = Math.max(0, -imageTop / totalScale);
  const cropW = Math.min(CROP_SIZE / totalScale, imgSize.width - originX);
  const cropH = Math.min(CROP_SIZE / totalScale, imgSize.height - originY);
  return {
    originX: Math.round(originX),
    originY: Math.round(originY),
    width: Math.round(cropW),
    height: Math.round(cropH),
    displayW,
    displayH,
    imageLeft,
    imageTop,
  };
}

async function cropImageWeb(imageUri, cropRect) {
  const {originX, originY, width, height} = cropRect;
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, originX, originY, width, height, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = imageUri;
  });
}

const CircleImageCropModal = ({
  visible,
  imageUri,
  onCancel,
  onConfirm,
  title = 'חתוך את הלוגו',
}) => {
  const insets = useSafeAreaInsets();
  const [imgSize, setImgSize] = useState({width: 1, height: 1});
  const [pan, setPan] = useState({x: 0, y: 0});
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const panStartRef = useRef({x: 0, y: 0});
  const panRef = useRef({x: 0, y: 0});
  const cropRef = useRef(null);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    if (!visible || !imageUri) return;
    setPan({x: 0, y: 0});
    setZoom(1);
    panStartRef.current = {x: 0, y: 0};
    Image.getSize(
      imageUri,
      (width, height) => setImgSize({width, height}),
      () => setImgSize({width: 1, height: 1}),
    );
  }, [visible, imageUri]);

  const cropLayout = useMemo(
    () => getCropRect(imgSize, pan, zoom),
    [imgSize, pan, zoom],
  );

  const applyPan = useCallback(
    nextPan => {
      const {displayW, displayH} = getScaledLayout(imgSize, nextPan, zoom);
      const clamped = clampPan(nextPan, displayW, displayH);
      setPan(clamped);
      panRef.current = clamped;
    },
    [imgSize, zoom],
  );

  useEffect(() => {
    if (!visible) return;
    applyPan(panRef.current);
  }, [zoom, visible, imgSize, applyPan]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          panStartRef.current = {...panRef.current};
        },
        onPanResponderMove: (_, gesture) => {
          applyPan({
            x: panStartRef.current.x - gesture.dx,
            y: panStartRef.current.y + gesture.dy,
          });
        },
      }),
    [applyPan],
  );

  const adjustZoom = delta => {
    setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta)));
  };

  const handleConfirm = useCallback(async () => {
    if (!imageUri || saving) return;
    setSaving(true);
    try {
      let uri;
      if (Platform.OS === 'web') {
        uri = await cropImageWeb(imageUri, cropLayout);
      } else {
        uri = await captureRef(cropRef, {
          format: 'jpg',
          quality: 0.85,
          result: 'tmpfile',
        });
      }
      onConfirm?.({uri});
    } catch (err) {
      console.warn('[CircleImageCropModal]', err?.message || err);
    } finally {
      setSaving(false);
    }
  }, [imageUri, saving, cropLayout, onConfirm]);

  if (!imageUri) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={onCancel}>
      <View
        style={[
          styles.root,
          {paddingTop: insets.top, paddingBottom: insets.bottom},
        ]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onCancel}
            style={styles.headerBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="ביטול">
            <MaterialCommunityIcons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.cropArea}>
          <View style={styles.cropStage} {...panResponder.panHandlers}>
            <View
              ref={cropRef}
              collapsable={false}
              style={styles.cropCircle}>
              <Image
                source={{uri: imageUri}}
                style={{
                  width: cropLayout.displayW,
                  height: cropLayout.displayH,
                  position: 'absolute',
                  left: cropLayout.imageLeft,
                  top: cropLayout.imageTop,
                }}
              />
            </View>
          </View>
          <Text style={styles.hintText}>גרור כדי למקם · השתמש בזום לדיוק</Text>
        </View>

        <View style={styles.zoomRow}>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() => adjustZoom(-0.25)}
            disabled={zoom <= MIN_ZOOM}
            accessibilityRole="button"
            accessibilityLabel="הקטן">
            <MaterialCommunityIcons name="minus" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() => adjustZoom(0.25)}
            disabled={zoom >= MAX_ZOOM}
            accessibilityRole="button"
            accessibilityLabel="הגדל">
            <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          disabled={saving}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="אישור">
          {saving ? (
            <ActivityIndicator color={Colors.white100} />
          ) : (
            <Text style={styles.confirmBtnText}>אישור</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1e1d27',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
  },
  cropArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#1e1d27',
  },
  cropStage: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1d27',
  },
  cropCircle: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: CROP_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#BD9947',
    backgroundColor: '#1e1d27',
  },
  hintText: {
    marginTop: 20,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 16,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2b2a39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    minWidth: 56,
    textAlign: 'center',
  },
  confirmBtn: {
    marginHorizontal: 24,
    marginBottom: 16,
    height: 52,
    borderRadius: 1000,
    backgroundColor: '#4d4966',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
  },
});

export default CircleImageCropModal;
