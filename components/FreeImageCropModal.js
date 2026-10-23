import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {captureRef} from 'react-native-view-shot';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';

const MIN_CROP = 72;
const HANDLE = 44;
const MAX_ZOOM = 5;

function cropImageWeb(imageUri, cropRect) {
  const {originX, originY, width, height} = cropRect;
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width));
        canvas.height = Math.max(1, Math.round(height));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          img,
          originX,
          originY,
          width,
          height,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = imageUri;
  });
}

/** forceRTL mirrors gesture dx against `left`, same as the profile crop. */
function resizeCrop(start, dx, dy, corner, bounds) {
  const moveX = -dx;
  const moveY = dy;
  let left = start.x;
  let top = start.y;
  let right = start.x + start.w;
  let bottom = start.y + start.h;
  if (corner === 'nw' || corner === 'sw') left = start.x + moveX;
  if (corner === 'ne' || corner === 'se') right = start.x + start.w + moveX;
  if (corner === 'nw' || corner === 'ne') top = start.y + moveY;
  if (corner === 'sw' || corner === 'se') bottom = start.y + start.h + moveY;

  const min = MIN_CROP;
  const bL = bounds.x;
  const bT = bounds.y;
  const bR = bounds.x + bounds.width;
  const bB = bounds.y + bounds.height;
  left = Math.max(bL, Math.min(left, bR - min));
  right = Math.min(bR, Math.max(right, bL + min));
  top = Math.max(bT, Math.min(top, bB - min));
  bottom = Math.min(bB, Math.max(bottom, bT + min));
  if (right - left < min) {
    if (corner === 'nw' || corner === 'sw') left = right - min;
    else right = left + min;
  }
  if (bottom - top < min) {
    if (corner === 'nw' || corner === 'ne') top = bottom - min;
    else bottom = top + min;
  }
  return {x: left, y: top, w: right - left, h: bottom - top};
}

function moveCrop(start, dx, dy, bounds) {
  const x = Math.max(
    bounds.x,
    Math.min(start.x - dx, bounds.x + bounds.width - start.w),
  );
  const y = Math.max(
    bounds.y,
    Math.min(start.y + dy, bounds.y + bounds.height - start.h),
  );
  return {x, y, w: start.w, h: start.h};
}

function touchDistance(touches) {
  if (!touches || touches.length < 2) return 0;
  const dx = touches[0].pageX - touches[1].pageX;
  const dy = touches[0].pageY - touches[1].pageY;
  return Math.hypot(dx, dy);
}

function touchMidpoint(touches) {
  return {
    x: (touches[0].pageX + touches[1].pageX) / 2,
    y: (touches[0].pageY + touches[1].pageY) / 2,
  };
}

/** Smallest zoom at which the image still fills the crop window. */
function minZoomFor(crop, base) {
  if (!crop || !base?.width || !base?.height) return 1;
  return Math.max(1, crop.w / base.width, crop.h / base.height);
}

/** Keep the zoomed image covering the crop window so it never shows empty edges. */
function clampView(view, crop, base) {
  const zoom = Math.min(MAX_ZOOM, Math.max(minZoomFor(crop, base), view.zoom));
  const width = base.width * zoom;
  const height = base.height * zoom;
  const left = Math.min(crop.x, Math.max(view.left, crop.x + crop.w - width));
  const top = Math.min(crop.y, Math.max(view.top, crop.y + crop.h - height));
  return {zoom, left, top};
}

/**
 * Pinch scales the photo around the crop centre; the window itself stays put.
 * forceRTL mirrors gesture dx against `left`, same as moveCrop.
 */
function zoomView(start, factor, pan, crop, base) {
  const zoom = Math.min(MAX_ZOOM, Math.max(minZoomFor(crop, base), start.zoom * factor));
  const cx = crop.x + crop.w / 2;
  const cy = crop.y + crop.h / 2;
  const fx = (cx - start.left) / (base.width * start.zoom);
  const fy = (cy - start.top) / (base.height * start.zoom);
  return clampView(
    {
      zoom,
      left: cx - fx * base.width * zoom - pan.x,
      top: cy - fy * base.height * zoom + pan.y,
    },
    crop,
    base,
  );
}

function normalizeCropFractions(value) {
  if (!value) return null;
  const left = Number(value.left);
  const top = Number(value.top);
  const width = Number(value.width);
  const height = Number(value.height);
  if (![left, top, width, height].every(n => Number.isFinite(n))) return null;
  if (width <= 0.02 || height <= 0.02) return null;
  const l = Math.max(0, Math.min(left, 0.98));
  const t = Math.max(0, Math.min(top, 0.98));
  return {
    left: l,
    top: t,
    width: Math.max(0.02, Math.min(width, 1 - l)),
    height: Math.max(0.02, Math.min(height, 1 - t)),
  };
}

function defaultCrop(imageBox) {
  return {
    x: imageBox.left,
    y: imageBox.top,
    w: imageBox.width,
    h: imageBox.height,
  };
}

/** Fractions are of the source image, so the same window comes back on the next edit. */
function cropFromFractions(imageBox, fractions) {
  if (!fractions || !imageBox?.width || !imageBox?.height) return null;
  const maxR = imageBox.left + imageBox.width;
  const maxB = imageBox.top + imageBox.height;
  let w = Math.max(MIN_CROP, Math.min(fractions.width * imageBox.width, imageBox.width));
  let h = Math.max(MIN_CROP, Math.min(fractions.height * imageBox.height, imageBox.height));
  let x = imageBox.left + fractions.left * imageBox.width;
  let y = imageBox.top + fractions.top * imageBox.height;
  x = Math.max(imageBox.left, Math.min(x, maxR - w));
  y = Math.max(imageBox.top, Math.min(y, maxB - h));
  return {x, y, w, h};
}

function CornerBracket({corner}) {
  const edge = {
    nw: {borderTopWidth: 4, borderLeftWidth: 4},
    ne: {borderTopWidth: 4, borderRightWidth: 4},
    sw: {borderBottomWidth: 4, borderLeftWidth: 4},
    se: {borderBottomWidth: 4, borderRightWidth: 4},
  }[corner];
  return <View pointerEvents="none" style={[styles.bracket, edge]} />;
}

const FreeImageCropModal = ({
  visible,
  imageUri,
  onCancel,
  onConfirm,
  title = 'עריכת תמונה',
  initialCrop = null,
}) => {
  const insets = useSafeAreaInsets();
  const cropRef = useRef(null);
  const cropState = useRef(null);
  const initialCropRef = useRef(null);
  const seededRef = useRef(false);
  const boundsRef = useRef(null);
  const baseBoxRef = useRef(null);
  const viewRef = useRef(null);
  const pinchRef = useRef({active: false, startDist: 0, startView: null, startMid: null});
  const [imgSize, setImgSize] = useState({width: 1, height: 1});
  const [stage, setStage] = useState({width: 0, height: 0});
  const [crop, setCrop] = useState(null);
  const [view, setView] = useState(null);
  const [sourceReady, setSourceReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cropState.current = crop;
  }, [crop]);

  useEffect(() => {
    seededRef.current = false;
    initialCropRef.current = normalizeCropFractions(initialCrop);
    setCrop(null);
    viewRef.current = null;
    setView(null);
    setSourceReady(false);
    if (!visible || !imageUri) return undefined;
    let cancelled = false;
    Image.getSize(
      imageUri,
      (width, height) => {
        if (cancelled) return;
        setImgSize({width, height});
        setSourceReady(true);
      },
      () => {
        if (cancelled) return;
        setImgSize({width: 1, height: 1});
        setSourceReady(true);
      },
    );
    return () => {
      cancelled = true;
    };
    // Read initialCrop only when this image opens. A fresh object each render must not move the frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, imageUri]);

  /** Image fitted to the stage at zoom 1 — the reference for crop fractions. */
  const baseBox = useMemo(() => {
    if (!stage.width || !stage.height || imgSize.width < 2) return null;
    const scale = Math.min(stage.width / imgSize.width, stage.height / imgSize.height);
    const width = imgSize.width * scale;
    const height = imgSize.height * scale;
    return {
      left: (stage.width - width) / 2,
      top: (stage.height - height) / 2,
      width,
      height,
    };
  }, [stage, imgSize]);
  baseBoxRef.current = baseBox;

  useEffect(() => {
    if (!visible || !sourceReady || !baseBox || seededRef.current) return;
    seededRef.current = true;
    const nextView = {zoom: 1, left: baseBox.left, top: baseBox.top};
    viewRef.current = nextView;
    setView(nextView);
    setCrop(
      cropFromFractions(baseBox, initialCropRef.current) || defaultCrop(baseBox),
    );
  }, [visible, sourceReady, baseBox]);

  /** Where the (possibly zoomed) image is drawn on the stage right now. */
  const imageBox = useMemo(() => {
    if (!baseBox || !view) return null;
    return {
      left: view.left,
      top: view.top,
      width: baseBox.width * view.zoom,
      height: baseBox.height * view.zoom,
    };
  }, [baseBox, view]);

  const bounds = useMemo(() => {
    if (!imageBox || !stage.width || !stage.height) return null;
    const x = Math.max(0, imageBox.left);
    const y = Math.max(0, imageBox.top);
    const right = Math.min(stage.width, imageBox.left + imageBox.width);
    const bottom = Math.min(stage.height, imageBox.top + imageBox.height);
    return {x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y)};
  }, [imageBox, stage]);
  boundsRef.current = bounds;

  const updateView = useCallback(next => {
    viewRef.current = next;
    setView(next);
  }, []);

  const updateCrop = useCallback(next => {
    cropState.current = next;
    setCrop(next);
  }, []);

  const makeCornerResponder = useCallback(
    corner =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          cropState.grant = cropState.current;
        },
        onPanResponderMove: (_, gesture) => {
          const start = cropState.grant;
          if (!start || !bounds) return;
          updateCrop(resizeCrop(start, gesture.dx, gesture.dy, corner, bounds));
        },
        onPanResponderRelease: () => {
          cropState.grant = null;
        },
        onPanResponderTerminate: () => {
          cropState.grant = null;
        },
      }),
    [bounds, updateCrop],
  );

  const cornerResponders = useMemo(
    () => ({
      nw: makeCornerResponder('nw'),
      ne: makeCornerResponder('ne'),
      sw: makeCornerResponder('sw'),
      se: makeCornerResponder('se'),
    }),
    [makeCornerResponder],
  );

  const stageResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: evt => {
          const current = cropState.current;
          cropState.grant = current;
          pinchRef.current = {active: false, startDist: 0, startView: null, startMid: null};
          const touch = evt.nativeEvent;
          const x = touch.locationX ?? 0;
          const y = touch.locationY ?? 0;
          cropState.drag =
            current &&
            x >= current.x &&
            x <= current.x + current.w &&
            y >= current.y &&
            y <= current.y + current.h;
        },
        onPanResponderMove: (evt, gesture) => {
          const box = boundsRef.current;
          const start = cropState.grant || cropState.current;
          if (!start || !box) return;
          const touches = evt.nativeEvent.touches || [];
          if (touches.length >= 2) {
            const base = baseBoxRef.current;
            const currentView = viewRef.current;
            const currentCrop = cropState.current;
            if (!base || !currentView || !currentCrop) return;
            const dist = touchDistance(touches);
            const mid = touchMidpoint(touches);
            if (!pinchRef.current.active || pinchRef.current.startDist <= 0) {
              pinchRef.current = {
                active: true,
                startDist: dist || 1,
                startView: currentView,
                startMid: mid,
              };
              return;
            }
            const factor = (dist || 1) / pinchRef.current.startDist;
            const pan = {
              x: mid.x - pinchRef.current.startMid.x,
              y: mid.y - pinchRef.current.startMid.y,
            };
            updateView(
              zoomView(pinchRef.current.startView, factor, pan, currentCrop, base),
            );
            return;
          }
          if (pinchRef.current.active) {
            pinchRef.current = {
              active: false,
              startDist: 0,
              startView: null,
              startMid: null,
            };
            cropState.grant = cropState.current;
            cropState.drag = false;
            return;
          }
          if (!cropState.drag) return;
          updateCrop(moveCrop(start, gesture.dx, gesture.dy, box));
        },
        onPanResponderRelease: () => {
          cropState.grant = null;
          cropState.drag = false;
          pinchRef.current.active = false;
        },
        onPanResponderTerminate: () => {
          cropState.grant = null;
          cropState.drag = false;
          pinchRef.current.active = false;
        },
      }),
    [updateCrop, updateView],
  );

  const sourceRect = useMemo(() => {
    if (!crop || !imageBox || imgSize.width < 2) return null;
    const scale = imgSize.width / imageBox.width;
    const originX = Math.max(0, (crop.x - imageBox.left) * scale);
    const originY = Math.max(0, (crop.y - imageBox.top) * scale);
    const width = Math.min(imgSize.width - originX, crop.w * scale);
    const height = Math.min(imgSize.height - originY, crop.h * scale);
    return {originX, originY, width, height};
  }, [crop, imageBox, imgSize]);

  const handleConfirm = useCallback(async () => {
    if (!imageUri || !sourceRect || saving) return;
    setSaving(true);
    try {
      const full =
        sourceRect.originX <= 1 &&
        sourceRect.originY <= 1 &&
        sourceRect.width >= imgSize.width - 2 &&
        sourceRect.height >= imgSize.height - 2;
      let uri = imageUri;
      if (!full) {
        if (Platform.OS === 'web') {
          uri = await cropImageWeb(imageUri, sourceRect);
        } else {
          uri = await captureRef(cropRef, {
            format: 'jpg',
            quality: 0.9,
            result: 'tmpfile',
          });
        }
      }
      const cropFractions =
        imgSize.width > 1 && imgSize.height > 1
          ? {
              left: sourceRect.originX / imgSize.width,
              top: sourceRect.originY / imgSize.height,
              width: sourceRect.width / imgSize.width,
              height: sourceRect.height / imgSize.height,
            }
          : null;
      onConfirm?.({uri, crop: normalizeCropFractions(cropFractions)});
    } catch (err) {
      onConfirm?.({error: err?.message || 'לא ניתן לחתוך את התמונה. נסה/י שוב.'});
    } finally {
      setSaving(false);
    }
  }, [imageUri, sourceRect, saving, imgSize, onConfirm]);

  const frame = !imageUri ? null : (
    <View style={[styles.root, {paddingTop: insets.top, paddingBottom: insets.bottom}]}>
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

      <View
        style={styles.stage}
        onLayout={event => {
          const {width, height} = event.nativeEvent.layout;
          setStage(prev =>
            prev.width === width && prev.height === height ? prev : {width, height},
          );
        }}>
        {imageBox && crop ? (
          <>
            <Image
              source={{uri: imageUri}}
              style={{
                position: 'absolute',
                left: imageBox.left,
                top: imageBox.top,
                width: imageBox.width,
                height: imageBox.height,
              }}
            />
            <View
              pointerEvents="none"
              style={[styles.dim, {left: 0, top: 0, width: stage.width, height: crop.y}]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.dim,
                {
                  left: 0,
                  top: crop.y + crop.h,
                  width: stage.width,
                  height: Math.max(0, stage.height - (crop.y + crop.h)),
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[styles.dim, {left: 0, top: crop.y, width: crop.x, height: crop.h}]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.dim,
                {
                  left: crop.x + crop.w,
                  top: crop.y,
                  width: Math.max(0, stage.width - (crop.x + crop.w)),
                  height: crop.h,
                },
              ]}
            />

            <View
              ref={cropRef}
              collapsable={false}
              style={[styles.cropWindow, {left: crop.x, top: crop.y, width: crop.w, height: crop.h}]}>
              <Image
                source={{uri: imageUri}}
                style={{
                  position: 'absolute',
                  width: imageBox.width,
                  height: imageBox.height,
                  left: imageBox.left - crop.x,
                  top: imageBox.top - crop.y,
                }}
              />
            </View>

            <View
              pointerEvents="none"
              style={[
                styles.frame,
                {left: crop.x, top: crop.y, width: crop.w, height: crop.h},
              ]}>
              <View style={[styles.gridV, {left: '33.33%'}]} />
              <View style={[styles.gridV, {left: '66.66%'}]} />
              <View style={[styles.gridH, {top: '33.33%'}]} />
              <View style={[styles.gridH, {top: '66.66%'}]} />
            </View>

            <View style={styles.gestureLayer} {...stageResponder.panHandlers} />

            {['nw', 'ne', 'sw', 'se'].map(corner => {
              const handleLeft =
                corner === 'nw' || corner === 'sw' ? crop.x - HANDLE / 2 : crop.x + crop.w - HANDLE / 2;
              const handleTop =
                corner === 'nw' || corner === 'ne' ? crop.y - HANDLE / 2 : crop.y + crop.h - HANDLE / 2;
              return (
                <View
                  key={corner}
                  style={[styles.handleHit, {left: handleLeft, top: handleTop}]}
                  {...cornerResponders[corner].panHandlers}>
                  <CornerBracket corner={corner} />
                </View>
              );
            })}
          </>
        ) : (
          <ActivityIndicator color="#FFFFFF" />
        )}
      </View>

      <Text style={styles.hintText}>
        גררו את המסגרת, צבטו כדי להגדיל או להקטין את התמונה, או משכו את הפינות
      </Text>

      <TouchableOpacity
        style={styles.confirmBtn}
        onPress={handleConfirm}
        disabled={saving || !crop}
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
  root: {
    flex: 1,
    backgroundColor: '#111014',
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
  stage: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#111014',
    overflow: 'hidden',
  },
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cropWindow: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: '#111014',
  },
  frame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
  },
  gestureLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  gridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  handleHit: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  bracket: {
    width: 26,
    height: 26,
    borderColor: '#FFFFFF',
  },
  hintText: {
    marginTop: 16,
    marginHorizontal: 24,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  confirmBtn: {
    marginHorizontal: 24,
    marginTop: 16,
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

export default FreeImageCropModal;
