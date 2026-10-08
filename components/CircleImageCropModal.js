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
import {Video, ResizeMode} from 'expo-av';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';

const CROP_SIZE = Math.min(320, Dimensions.get('window').width - 48);
/** 25% — same floor as before the 10% steps, so minus can pass 100%. */
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
/** Half the crop box — makes the mask ring reach past the stage corners. */
const MASK_THICKNESS = Math.ceil(CROP_SIZE / 2);
/** Extra slack (px) past each image edge — you can keep panning a bit after the photo ends. */
const PAN_OVERSCROLL = 80;

function getBaseScale(imgSize, fit, frameW, frameH) {
  const byWidth = frameW / imgSize.width;
  const byHeight = frameH / imgSize.height;
  return fit === 'contain'
    ? Math.min(byWidth, byHeight)
    : Math.max(byWidth, byHeight);
}

function getScaledLayout(imgSize, pan, zoom, fit = 'cover', frameW = CROP_SIZE, frameH = CROP_SIZE) {
  const baseScale = getBaseScale(imgSize, fit, frameW, frameH);
  const totalScale = baseScale * zoom;
  const displayW = imgSize.width * totalScale;
  const displayH = imgSize.height * totalScale;
  const imageLeft = frameW / 2 - displayW / 2 + pan.x;
  const imageTop = frameH / 2 - displayH / 2 + pan.y;
  return {baseScale, totalScale, displayW, displayH, imageLeft, imageTop};
}

function clampPan(pan, displayW, displayH, frameW = CROP_SIZE, frameH = CROP_SIZE) {
  // pan = {0,0} is the CENTERED image, so the valid range is symmetric:
  // ±(overhang/2) reaches each image edge exactly, plus overscroll slack.
  const halfX = Math.max(0, (displayW - frameW) / 2) + PAN_OVERSCROLL;
  const halfY = Math.max(0, (displayH - frameH) / 2) + PAN_OVERSCROLL;
  return {
    x: Math.min(halfX, Math.max(-halfX, pan.x)),
    y: Math.min(halfY, Math.max(-halfY, pan.y)),
  };
}

function getCropRect(imgSize, pan, zoom, fit = 'cover', frameW = CROP_SIZE, frameH = CROP_SIZE) {
  const {totalScale, displayW, displayH, imageLeft, imageTop} = getScaledLayout(
    imgSize,
    pan,
    zoom,
    fit,
    frameW,
    frameH,
  );
  const originX = Math.max(0, -imageLeft / totalScale);
  const originY = Math.max(0, -imageTop / totalScale);
  const cropW = Math.min(frameW / totalScale, imgSize.width - originX);
  const cropH = Math.min(frameH / totalScale, imgSize.height - originY);
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

function touchDistance(touches) {
  if (!touches || touches.length < 2) return 0;
  const dx = touches[0].pageX - touches[1].pageX;
  const dy = touches[0].pageY - touches[1].pageY;
  return Math.hypot(dx, dy);
}

/** Zoomed-out frame: the photo sits inside the window with the editor background. */
async function composeFramedImageWeb(imageUri, layout, frameW = CROP_SIZE, frameH = CROP_SIZE) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = frameW;
        canvas.height = frameH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1e1d27';
        ctx.fillRect(0, 0, frameW, frameH);
        ctx.drawImage(
          img,
          layout.imageLeft,
          layout.imageTop,
          layout.displayW,
          layout.displayH,
        );
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = imageUri;
  });
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
  shape = 'circle',
  fit = 'cover',
  /** Crop window. Defaults to the square used by the profile-picture circle. */
  frameWidth = CROP_SIZE,
  frameHeight = CROP_SIZE,
  /** 'image' crops a photo. 'video' frames a profile video inside the same window. */
  media = 'image',
  /**
   * Draw on top of an already-open modal instead of presenting a second one.
   * iOS cannot present two RN modals; the crop screen never appears.
   */
  embedded = false,
}) => {
  const insets = useSafeAreaInsets();
  const frameW = Math.max(1, frameWidth);
  const frameH = Math.max(1, frameHeight);
  const [imgSize, setImgSize] = useState({width: 1, height: 1});
  const [pan, setPan] = useState({x: 0, y: 0});
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [mediaReady, setMediaReady] = useState(media !== 'video');
  const panStartRef = useRef({x: 0, y: 0});
  const panRef = useRef({x: 0, y: 0});
  const zoomRef = useRef(1);
  const pinchRef = useRef({active: false, startDist: 0, startZoom: 1});
  const cropRef = useRef(null);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    if (!visible || !imageUri) return;
    setPan({x: 0, y: 0});
    setZoom(1);
    panStartRef.current = {x: 0, y: 0};
    if (media === 'video') {
      setMediaReady(false);
      setImgSize({width: frameW, height: frameH});
      return;
    }
    setMediaReady(true);
    Image.getSize(
      imageUri,
      (width, height) => setImgSize({width, height}),
      () => setImgSize({width: 1, height: 1}),
    );
  }, [visible, imageUri, media, frameW, frameH]);

  const cropLayout = useMemo(
    () => getCropRect(imgSize, pan, zoom, fit, frameW, frameH),
    [imgSize, pan, zoom, fit, frameW, frameH],
  );

  const applyPan = useCallback(
    nextPan => {
      const {displayW, displayH} = getScaledLayout(
        imgSize,
        nextPan,
        zoomRef.current,
        fit,
        frameW,
        frameH,
      );
      const clamped = clampPan(nextPan, displayW, displayH, frameW, frameH);
      setPan(clamped);
      panRef.current = clamped;
    },
    [imgSize, fit, frameW, frameH],
  );

  const setZoomClamped = useCallback(next => {
    const value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    zoomRef.current = value;
    setZoom(value);
  }, []);

  useEffect(() => {
    if (!visible) return;
    applyPan(panRef.current);
  }, [zoom, visible, imgSize, applyPan]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          panStartRef.current = {...panRef.current};
          pinchRef.current = {
            active: false,
            startDist: 0,
            startZoom: zoomRef.current,
            gestureX: 0,
            gestureY: 0,
          };
        },
        onPanResponderMove: (evt, gesture) => {
          const touches = evt.nativeEvent.touches || [];
          if (touches.length >= 2) {
            const dist = touchDistance(touches);
            if (!pinchRef.current.active || pinchRef.current.startDist <= 0) {
              pinchRef.current.active = true;
              pinchRef.current.startDist = dist || 1;
              pinchRef.current.startZoom = zoomRef.current;
              return;
            }
            const next =
              pinchRef.current.startZoom * (dist / pinchRef.current.startDist);
            setZoomClamped(next);
            applyPan(panRef.current);
            return;
          }
          if (pinchRef.current.active) {
            pinchRef.current.active = false;
            pinchRef.current.startDist = 0;
            panStartRef.current = {...panRef.current};
            pinchRef.current.gestureX = gesture.dx;
            pinchRef.current.gestureY = gesture.dy;
          }
          applyPan({
            x:
              panStartRef.current.x -
              (gesture.dx - (pinchRef.current.gestureX || 0)),
            y:
              panStartRef.current.y +
              (gesture.dy - (pinchRef.current.gestureY || 0)),
          });
        },
        onPanResponderRelease: () => {
          pinchRef.current.active = false;
        },
        onPanResponderTerminate: () => {
          pinchRef.current.active = false;
        },
      }),
    [applyPan, setZoomClamped],
  );

  const adjustZoom = delta => {
    setZoom(prev => {
      const stepped = Math.round((prev + delta) * 10) / 10;
      const value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, stepped));
      zoomRef.current = value;
      return value;
    });
  };

  const handleConfirm = useCallback(async () => {
    if (!imageUri || saving) return;
    if (media === 'video') {
      if (!mediaReady || imgSize.width <= 1 || imgSize.height <= 1) {
        onConfirm?.({error: 'הסרטון עדיין נטען. נסו שוב.'});
        return;
      }
      onConfirm?.({
        crop: {
          aspect: imgSize.width / imgSize.height,
          frameLeft: cropLayout.imageLeft / frameW,
          frameTop: cropLayout.imageTop / frameH,
          frameWidth: cropLayout.displayW / frameW,
          frameHeight: cropLayout.displayH / frameH,
        },
      });
      return;
    }
    setSaving(true);
    try {
      const shrunkInsideFrame =
        cropLayout.displayW < frameW - 1 || cropLayout.displayH < frameH - 1;
      const keepsFullImage =
        !shrunkInsideFrame &&
        cropLayout.width >= imgSize.width - 2 &&
        cropLayout.height >= imgSize.height - 2;
      let uri;
      if (keepsFullImage) {
        uri = imageUri;
      } else if (Platform.OS === 'web') {
        uri = shrunkInsideFrame
          ? await composeFramedImageWeb(imageUri, cropLayout, frameW, frameH)
          : await cropImageWeb(imageUri, cropLayout);
      } else {
        uri = await captureRef(cropRef, {
          format: 'jpg',
          quality: 0.85,
          result: 'tmpfile',
        });
      }
      onConfirm?.({uri});
    } catch (err) {
      const message =
        err?.message || 'לא ניתן לחתוך את התמונה. נסה/י שוב.';
      console.warn('[CircleImageCropModal]', message);
      onConfirm?.({error: message});
    } finally {
      setSaving(false);
    }
  }, [imageUri, saving, cropLayout, imgSize, onConfirm, frameW, frameH, media, mediaReady]);

  const frame = !imageUri ? null : (
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
          <View
            style={[styles.cropStage, {width: frameW, height: frameH}]}
            {...panResponder.panHandlers}>
            <View
              ref={cropRef}
              collapsable={false}
              style={[styles.cropCapture, {width: frameW, height: frameH}]}>
              {media === 'video' ? (
                <Video
                  source={{uri: imageUri}}
                  style={{
                    width: cropLayout.displayW,
                    height: cropLayout.displayH,
                    position: 'absolute',
                    left: cropLayout.imageLeft,
                    top: cropLayout.imageTop,
                  }}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isLooping
                  isMuted
                  useNativeControls={false}
                  pointerEvents="none"
                  onReadyForDisplay={event => {
                    const width = event?.naturalSize?.width;
                    const height = event?.naturalSize?.height;
                    if (width > 0 && height > 0) {
                      setImgSize({width, height});
                      setMediaReady(true);
                    }
                  }}
                />
              ) : (
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
              )}
              {media === 'video' && !mediaReady ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : null}
            </View>
            {shape === 'circle' ? (
              <View pointerEvents="none" style={styles.cropMaskRing} />
            ) : null}
            <View
              pointerEvents="none"
              style={
                shape === 'circle' ? styles.cropGuideRing : styles.cropGuideSquare
              }
            />
          </View>
          <Text style={styles.hintText}>
            {shape === 'circle'
              ? 'גרור כדי למקם · צבוט או השתמש בפלוס ומינוס לזום'
              : 'גרור כדי לבחור את החלק · צבוט או השתמש בפלוס ומינוס לזום'}
          </Text>
        </View>

        <View style={styles.zoomRow}>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() => adjustZoom(-ZOOM_STEP)}
            disabled={zoom <= MIN_ZOOM}
            accessibilityRole="button"
            accessibilityLabel="הקטן">
            <MaterialCommunityIcons name="minus" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() => adjustZoom(ZOOM_STEP)}
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
  );

  if (embedded) {
    if (!visible || !frame) return null;
    return <View style={styles.embeddedHost}>{frame}</View>;
  }

  if (!frame) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={onCancel}>
      {frame}
    </Modal>
  );
};

const styles = StyleSheet.create({
  embeddedHost: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    elevation: 50,
  },
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
    overflow: 'hidden',
  },
  /**
   * Saved output stays a full square photo. Masking the captured view to a
   * circle baked dark corners into the file, so re-editing showed black wedges.
   */
  cropCapture: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    overflow: 'hidden',
    backgroundColor: '#1e1d27',
  },
  /** Ring border punches a circular hole — dims everything outside the circle. */
  cropMaskRing: {
    position: 'absolute',
    left: -MASK_THICKNESS,
    top: -MASK_THICKNESS,
    width: CROP_SIZE + MASK_THICKNESS * 2,
    height: CROP_SIZE + MASK_THICKNESS * 2,
    borderRadius: CROP_SIZE / 2 + MASK_THICKNESS,
    borderWidth: MASK_THICKNESS,
    borderColor: 'rgba(30, 29, 39, 0.82)',
  },
  cropGuideRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CROP_SIZE / 2,
    borderWidth: 2,
    borderColor: '#F7C63A',
  },
  cropGuideSquare: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#F7C63A',
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
