import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  InteractionManager,
  Animated,
  Easing,
  PanResponder,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
  Modal,
  Pressable,
  I18nManager,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {Video, ResizeMode, Audio} from 'expo-av';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {captureRef} from 'react-native-view-shot';
import {
  capturePostPreviewToDataUrl,
  resolvePostPreviewDomNode,
} from '../utils/capturePostPreviewWeb';
import {
  uploadFile,
  createListing,
  updateListing,
  createStory,
  resolveSubscriptionId,
} from '../utils/api';
import {forceLtrStyle} from '../utils/rtlLayout';
import {
  buildPostTextGeneralDetails,
  serializePostTextOverlays,
  parsePostTextOverlayPayload,
  parsePostEditorRestoreInfo,
  extractPostListingMediaUrls,
  parseListingHashtagsForEditor,
  hydratePostEditorBlocksFromOverlays,
} from '../utils/postTextOverlay';
import {useKeyboardInset} from '../utils/formKeyboardScroll';
import {
  PROFILE_RING_COLORS,
  PROFILE_RING_LOCATIONS,
} from '../components/ProfileAvatar';

const TAB_TEXT = 'טקסט';
const TAB_CAMERA = 'מצלמה';
const FORMAT_SELECTED_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 50;
const DEFAULT_FONT_SIZE = 20;
const POLYGON_TRACK_HEIGHT = 200;
const POLYGON_KNOB_SIZE = 20;
const POLYGON_FONT_SIZE_TRAVEL = POLYGON_TRACK_HEIGHT - POLYGON_KNOB_SIZE;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const fontSizeToSliderOffset = size => {
  const normalized = clamp(
    (size - MIN_FONT_SIZE) / (MAX_FONT_SIZE - MIN_FONT_SIZE),
    0,
    1,
  );
  return Math.round((1 - normalized) * POLYGON_FONT_SIZE_TRAVEL);
};

const sliderPageYToFontSize = (pageY, trackPageY) => {
  const relativeY = pageY - trackPageY;
  const offset = clamp(
    relativeY - POLYGON_KNOB_SIZE / 2,
    0,
    Math.max(POLYGON_FONT_SIZE_TRAVEL, 1),
  );
  const normalized = 1 - offset / Math.max(POLYGON_FONT_SIZE_TRAVEL, 1);
  return Math.round(
    MIN_FONT_SIZE + normalized * (MAX_FONT_SIZE - MIN_FONT_SIZE),
  );
};

/**
 * Vertical font-size control used while editing text.
 * Uses pageY (not locationY) and refuses gesture termination so parent
 * re-renders from live fontSize updates cannot steal the drag.
 */
const FontSizeSlider = React.memo(({value, onChange}) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const trackRef = useRef(null);
  const trackPageYRef = useRef(0);
  const draggingRef = useRef(false);
  const [displaySize, setDisplaySize] = useState(
    value ?? DEFAULT_FONT_SIZE,
  );

  useEffect(() => {
    if (!draggingRef.current) {
      setDisplaySize(value ?? DEFAULT_FONT_SIZE);
    }
  }, [value]);

  const measureTrack = callback => {
    const node = trackRef.current;
    if (!node?.measureInWindow) {
      callback?.();
      return;
    }
    node.measureInWindow((_x, y) => {
      if (typeof y === 'number' && Number.isFinite(y)) {
        trackPageYRef.current = y;
      }
      callback?.();
    });
  };

  const applyPageY = pageY => {
    if (!Number.isFinite(pageY)) return;
    const nextSize = sliderPageYToFontSize(pageY, trackPageYRef.current);
    setDisplaySize(nextSize);
    onChangeRef.current?.(nextSize);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: evt => {
        draggingRef.current = true;
        const pageY = evt?.nativeEvent?.pageY;
        measureTrack(() => applyPageY(pageY));
      },
      onPanResponderMove: evt => {
        applyPageY(evt?.nativeEvent?.pageY);
      },
      onPanResponderRelease: () => {
        draggingRef.current = false;
      },
      onPanResponderTerminate: () => {
        draggingRef.current = false;
      },
    }),
  ).current;

  return (
    <View
      style={styles.polygonSliderContainer}
      pointerEvents="auto"
      {...panResponder.panHandlers}>
      <View
        ref={trackRef}
        collapsable={false}
        style={styles.polygonTrack}
        onLayout={() => measureTrack()}>
        <Image
          source={require('../assets/editors/polygon.png')}
          style={styles.polygonIndicator}
          pointerEvents="none"
        />
        <View
          pointerEvents="none"
          style={[
            styles.polygonKnob,
            {top: fontSizeToSliderOffset(displaySize)},
          ]}
        />
      </View>
    </View>
  );
});

/** Figma 35:293454 — exact post text style fonts (סטייל 1–6). */
const TEXT_STYLES = [
  {label: 'סטייל 1', textStyle: {fontFamily: 'SecularOne-Regular'}},
  {label: 'סטייל 2', textStyle: {fontFamily: 'IBMPlexSansHebrew-Bold'}},
  {label: 'סטייל 3', textStyle: {fontFamily: 'Rubik-ExtraBold'}},
  {label: 'סטייל 4', textStyle: {fontFamily: 'Rubik-Regular'}},
  {label: 'סטייל 5', textStyle: {fontFamily: 'Alef-Regular'}},
  {label: 'סטייל 6', textStyle: {fontFamily: 'NotoSans-Regular'}},
];

const DEFAULT_TEXT_COLOR = '#FFFFFF';

const COLOR_PAGES = [
  [
    '#FFFFFF',
    '#DBDBDB',
    '#C7C7C7',
    '#B2B2B2',
    '#999999',
    '#7C7C7C',
    '#666666',
    '#353535',
    '#000000',
  ],
  [
    '#CC001E',
    '#FF3250',
    '#FF9C4C',
    '#FFD037',
    '#83D954',
    '#20C5B0',
    '#00A352',
    '#0099F7',
    '#325BED',
  ],
  [
    '#D16FFF',
    '#FD7F8D',
    '#FFCFD2',
    '#FFDAB0',
    '#FFBF77',
    '#A3612F',
    '#BC5100',
    '#730003',
    '#470C0D',
  ],
];

const getColorPageIndexForColor = color => {
  const target = String(color || DEFAULT_TEXT_COLOR).toUpperCase();
  const pageIndex = COLOR_PAGES.findIndex(page =>
    page.some(c => String(c).toUpperCase() === target),
  );
  return pageIndex >= 0 ? pageIndex : 0;
};

const BACKGROUND_GRADIENTS = [
  ['#2B2A39', '#5149C4'],
  ['#3B2600', '#8A5A0C'],
  ['#3B1014', '#6B1E27'],
  ['#043144', '#0F6F94'],
  ['#2C1A4A', '#533288'],
];

const createTextBlockId = () =>
  `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const VIDEO_EXT_REGEX = /\.(mp4|mov|m4v|webm|ogg|ogv)$/i;

const isVideoAsset = asset => {
  const kind = String(asset?.type || '').toLowerCase();
  const mime = String(asset?.mimeType || '').toLowerCase();
  const uri = String(asset?.uri || '');
  return (
    kind === 'video' || mime.startsWith('video/') || VIDEO_EXT_REGEX.test(uri)
  );
};

const inferVideoExtension = asset => {
  const uri = String(asset?.uri || '');
  const match = uri.match(VIDEO_EXT_REGEX);
  if (match?.[1]) return `.${String(match[1]).toLowerCase()}`;
  const mime = String(asset?.mimeType || '').toLowerCase();
  if (mime === 'video/webm') return '.webm';
  if (mime === 'video/ogg') return '.ogg';
  if (mime === 'video/quicktime') return '.mov';
  return '.mp4';
};

const inferImageMimeFromUri = uri => {
  const lower = String(uri || '').toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.heic') || lower.includes('.heif')) return 'image/heic';
  return 'image/jpeg';
};

const postHasTextOverlays = textBlocks =>
  Array.isArray(textBlocks) &&
  textBlocks.some(b => String(b?.text || '').trim().length > 0);

const postHasStickerOverlays = mediaImages =>
  Array.isArray(mediaImages) && mediaImages.length > 0;

const lightenColor = (hex, amount = 0.8) => {
  if (typeof hex !== 'string') return hex;
  let h = hex.trim();
  if (h[0] === '#') h = h.slice(1);
  if (h.length !== 6) return hex;
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return hex;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const mix = (ch, amt) => Math.round(ch + (255 - ch) * amt);
  const nr = mix(r, amount);
  const ng = mix(g, amount);
  const nb = mix(b, amount);
  const toHex = v => v.toString(16).padStart(2, '0');
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
};

const getTextVisualStyle = (baseColor, bgMode = 0) => {
  const color = baseColor || '#FFFFFF';
  if (bgMode === 1) {
    return {textColor: '#FFFFFF', backgroundColor: color};
  }
  if (bgMode === 2) {
    return {textColor: color, backgroundColor: lightenColor(color, 0.8)};
  }
  return {textColor: color, backgroundColor: 'transparent'};
};

/**
 * Self-contained editing text input.
 * - Uses internal state (not parent-controlled) so Android/iOS keep typed
 *   text when the parent re-renders (toolbar, keyboard inset, styles).
 * - Tracks the latest text in a ref (updated from onChangeText, onChange,
 *   and onEndEditing) so finishEditing can read it via getText().
 * - Reads the underlying native input value as a last-resort fallback so
 *   we never lose what the user actually typed when Done is pressed.
 */
const EditingTextBox = forwardRef(
  ({initialText, onTextChange, onEndEditing, ...inputProps}, ref) => {
    const initial = String(initialText ?? '');
    const textRef = useRef(initial);
    const [text, setText] = useState(initial);
    const inputRef = useRef(null);

    const readNativeValue = () => {
      const input = inputRef.current;
      if (!input) return '';
      // Web: react-native-web exposes _node for the DOM input
      if (Platform.OS === 'web') {
        const dom =
          input?._node ??
          input?._inputRef ??
          (typeof document !== 'undefined'
            ? document.getElementById('post-editor-text-input')
            : null);
        if (dom && typeof dom.value === 'string') return dom.value;
      }
      // Internal RN TextInput last seen native text (best-effort)
      if (typeof input._lastNativeText === 'string') {
        return input._lastNativeText;
      }
      return '';
    };

    useImperativeHandle(
      ref,
      () => ({
        getText: () => {
          const fromState = String(textRef.current ?? '');
          if (fromState.length > 0) return fromState;
          const native = readNativeValue();
          if (native && String(native).length > 0) return String(native);
          return fromState;
        },
        focus: () => inputRef.current?.focus?.(),
        blur: () => inputRef.current?.blur?.(),
      }),
      [],
    );

    const handleText = next => {
      const v = String(next ?? '');
      if (v === textRef.current) return;
      textRef.current = v;
      setText(v);
      onTextChange?.(v);
    };

    const handleEndEditing = e => {
      const t = e?.nativeEvent?.text;
      // Android/iOS multiline often reports nativeEvent.text as "" on blur even
      // when the field still contains text — never wipe a non-empty draft.
      if (typeof t === 'string' && t.length > 0) {
        handleText(t);
      } else {
        onTextChange?.(textRef.current);
      }
      onEndEditing?.(e);
    };

    return (
      <TextInput
        {...inputProps}
        ref={inputRef}
        value={text}
        onChangeText={handleText}
        onChange={e => {
          const t = e?.nativeEvent?.text;
          if (typeof t === 'string') handleText(t);
        }}
        onEndEditing={handleEndEditing}
      />
    );
  },
);

const STAGE_TEXT_PAD_Y = 12;
/** Insets from the stage edges — kept small and symmetric so text can sit
 * right up against both phone edges. */
const STAGE_TEXT_PAD_LEFT = 2;
const STAGE_TEXT_PAD_RIGHT = 2;

/**
 * Literal textAlign values are swapped by Android under forceRTL +
 * swapLeftAndRightInRTL (literal 'left' paints on the physical right). Map a
 * *physical* side to the literal value that actually lands there on native.
 */
const physicalTextAlign = align => {
  if (Platform.OS === 'web' || !I18nManager.isRTL) return align;
  if (align === 'left') return 'right';
  if (align === 'right') return 'left';
  return 'center';
};

/** Physical flex placement for the align mode (containers are forced LTR). */
const alignToFlexSelf = align =>
  align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

const getTextBlockBoxWidth = stageWidth =>
  Math.max(
    80,
    Math.max(1, Number(stageWidth) || 300) -
      STAGE_TEXT_PAD_LEFT -
      STAGE_TEXT_PAD_RIGHT,
  );

const clampTextBlockPosition = (x, y, blockW, blockH, stageW, stageH) => {
  const sw = Math.max(1, Number(stageW) || 1);
  const sh = Math.max(1, Number(stageH) || 1);
  const bw = Math.min(
    Math.max(1, Number(blockW) || 1),
    sw - STAGE_TEXT_PAD_LEFT - STAGE_TEXT_PAD_RIGHT,
  );
  const bh = Math.max(1, Number(blockH) || 1);
  return {
    x: Math.max(
      STAGE_TEXT_PAD_LEFT,
      Math.min(Number(x) || 0, sw - bw - STAGE_TEXT_PAD_RIGHT),
    ),
    y: Math.max(
      STAGE_TEXT_PAD_Y,
      Math.min(Number(y) || 0, sh - bh - STAGE_TEXT_PAD_Y),
    ),
  };
};

/**
 * Loose clamp for free-positioned text: the box spans the whole stage, so the
 * strict clamp above pins x in place. State-level updates keep the dragged x
 * (the DraggableTextBlock re-clamps precisely against measured glyph bounds);
 * this just prevents wildly out-of-range values.
 */
const clampTextBlockPositionLoose = (x, y, blockW, blockH, stageW, stageH) => {
  const sw = Math.max(1, Number(stageW) || 1);
  const sh = Math.max(1, Number(stageH) || 1);
  const bw = Math.max(1, Number(blockW) || 1);
  const bh = Math.max(1, Number(blockH) || 1);
  return {
    x: Math.max(-bw, Math.min(Number(x) || 0, sw)),
    y: Math.max(
      STAGE_TEXT_PAD_Y,
      Math.min(Number(y) || 0, sh - bh - STAGE_TEXT_PAD_Y),
    ),
  };
};

const getDefaultTextBlockY = (stageH, blockH = 40) => {
  const sh = Math.max(1, Number(stageH) || 1);
  const bh = Math.max(1, Number(blockH) || 1);
  return Math.max(STAGE_TEXT_PAD_Y, (sh - bh) / 2);
};

const measurePostStageMapping = (previewRef, stageRef) =>
  new Promise(resolve => {
    const previewNode = previewRef?.current;
    const stageNode = stageRef?.current;
    if (
      !previewNode?.measureInWindow ||
      !stageNode?.measureInWindow
    ) {
      resolve(null);
      return;
    }
    previewNode.measureInWindow((px, py, pw, ph) => {
      stageNode.measureInWindow((sx, sy, sw, sh) => {
        if (!(pw > 0) || !(ph > 0) || !(sw > 0) || !(sh > 0)) {
          resolve(null);
          return;
        }
        resolve({
          stageOffsetX: sx - px,
          stageOffsetY: sy - py,
          previewWidth: pw,
          previewHeight: ph,
          stageWidth: sw,
          stageHeight: sh,
        });
      });
    });
  });

/** Tap vs drag: keep generous so tiny finger jitter still opens the editor. */
const TEXT_BLOCK_TAP_MOVE_PX = 8;
const TEXT_BLOCK_TOUCH_PAD = 24;

const DraggableTextBlock = React.memo(
  ({
    block,
    stageWidth,
    stageHeight,
    selectedColor,
    zIndex,
    isBeingEdited,
    onPress,
    onUpdatePosition,
    onBringToFront,
  }) => {
    const onPressRef = useRef(onPress);
    onPressRef.current = onPress;
    const onUpdatePositionRef = useRef(onUpdatePosition);
    onUpdatePositionRef.current = onUpdatePosition;
    const onBringToFrontRef = useRef(onBringToFront);
    onBringToFrontRef.current = onBringToFront;
    const isBeingEditedRef = useRef(isBeingEdited);
    isBeingEditedRef.current = isBeingEdited;
    const blockIdRef = useRef(block.id);
    blockIdRef.current = block.id;

    const touchStartRef = useRef({pageX: 0, pageY: 0, x: 0, y: 0});
    const hasMoved = useRef(false);
    const gestureActive = useRef(false);
    const hasAligned = useRef(false);
    const blockSizeRef = useRef({w: 0, h: 0});
    /** Rendered text content bounds inside the wide drag box ({x offset, width}). */
    const textLayoutRef = useRef({x: 0, w: 0});

    const stageW = stageWidth > 0 ? stageWidth : 300;
    const stageH = stageHeight > 0 ? stageHeight : 300;
    const boxWidth = getTextBlockBoxWidth(stageW);

    /**
     * Free-drag clamp: the drag box spans the whole stage width, so clamping
     * the box itself pins x in place. Instead clamp so the *visible text
     * content* (measured from the inner <Text>) stays inside the stage — the
     * box may hang past an edge, letting the text move anywhere on screen.
     */
    const clampFreePosition = (x, y) => {
      const blockH = blockSizeRef.current.h || 40;
      const clampedY = Math.max(
        STAGE_TEXT_PAD_Y,
        Math.min(Number(y) || 0, stageH - blockH - STAGE_TEXT_PAD_Y),
      );
      const t = textLayoutRef.current;
      if (!(t.w > 0)) {
        return {x: Number(x) || 0, y: clampedY};
      }
      const minX = STAGE_TEXT_PAD_LEFT - t.x;
      const maxX = stageW - STAGE_TEXT_PAD_RIGHT - (t.x + t.w);
      return {
        x: Math.min(Math.max(Number(x) || 0, minX), Math.max(minX, maxX)),
        y: clampedY,
      };
    };
    const clampFreePositionRef = useRef(clampFreePosition);
    clampFreePositionRef.current = clampFreePosition;

    const initialPos = clampFreePosition(
      block.x ?? STAGE_TEXT_PAD_LEFT,
      block.y ?? getDefaultTextBlockY(stageH, blockSizeRef.current.h || 40),
    );

    const position = useRef(
      new Animated.ValueXY({x: initialPos.x, y: initialPos.y}),
    ).current;

    useEffect(() => {
      if (gestureActive.current) return;
      hasAligned.current = false;
      const nextPos = clampFreePositionRef.current(
        block.x ?? STAGE_TEXT_PAD_LEFT,
        block.y ?? getDefaultTextBlockY(stageH, blockSizeRef.current.h || 40),
      );
      position.setValue({x: nextPos.x, y: nextPos.y});
    }, [
      block.id,
      block.x,
      block.y,
      block.text,
      block.fontSize,
      block.align,
      stageWidth,
      stageHeight,
      position,
      stageH,
    ]);

    const endGestureAsTapOrDragRef = useRef(() => {});
    endGestureAsTapOrDragRef.current = () => {
      if (isBeingEditedRef.current) {
        gestureActive.current = false;
        return;
      }
      const id = blockIdRef.current;
      const moved = hasMoved.current;
      gestureActive.current = false;
      hasMoved.current = false;
      if (!moved) {
        onBringToFrontRef.current?.(id);
        onPressRef.current?.();
        return;
      }
      onBringToFrontRef.current?.(id);
      const clamped = clampFreePositionRef.current(
        position.x._value,
        position.y._value,
      );
      position.setValue({x: clamped.x, y: clamped.y});
      onUpdatePositionRef.current?.(id, clamped.x, clamped.y);
    };

    const handleResponderGrant = () => {
      if (isBeingEditedRef.current) return;
      gestureActive.current = true;
      hasMoved.current = false;
      touchStartRef.current = {
        pageX: 0,
        pageY: 0,
        x: position.x._value,
        y: position.y._value,
      };
    };

    const handleResponderMove = (_, g) => {
      if (isBeingEditedRef.current) return;
      if (
        Math.abs(g.dx) > TEXT_BLOCK_TAP_MOVE_PX ||
        Math.abs(g.dy) > TEXT_BLOCK_TAP_MOVE_PX
      ) {
        hasMoved.current = true;
      }
      if (!hasMoved.current) return;
      const next = clampFreePositionRef.current(
        touchStartRef.current.x + g.dx,
        touchStartRef.current.y + g.dy,
      );
      position.setValue({x: next.x, y: next.y});
    };

    const handleResponderRelease = () => {
      endGestureAsTapOrDragRef.current();
    };

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isBeingEditedRef.current,
        onStartShouldSetPanResponderCapture: () => !isBeingEditedRef.current,
        onMoveShouldSetPanResponder: () => !isBeingEditedRef.current,
        onMoveShouldSetPanResponderCapture: () => !isBeingEditedRef.current,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: handleResponderGrant,
        onPanResponderMove: handleResponderMove,
        onPanResponderRelease: handleResponderRelease,
        onPanResponderTerminate: handleResponderRelease,
      }),
    ).current;

    const handleLayout = e => {
      if (isBeingEdited || gestureActive.current) return;

      const blockH = e.nativeEvent.layout.height;
      blockSizeRef.current = {w: boxWidth, h: blockH};

      const hasText = String(block.text ?? '').trim().length > 0;
      if (hasText && blockH < 8) return;

      const targetX = block.x ?? STAGE_TEXT_PAD_LEFT;
      const targetY =
        block.y ??
        position.y._value ??
        getDefaultTextBlockY(stageH, blockSizeRef.current.h || blockH);
      const clamped = clampFreePositionRef.current(targetX, targetY);

      if (
        hasAligned.current &&
        Math.abs(clamped.x - position.x._value) < 1 &&
        Math.abs(clamped.y - position.y._value) < 1
      ) {
        return;
      }

      hasAligned.current = true;
      position.setValue({x: clamped.x, y: clamped.y});
      onUpdatePositionRef.current(block.id, clamped.x, clamped.y);
    };

    const handleContentLayout = e => {
      if (gestureActive.current) return;
      const l = e?.nativeEvent?.layout;
      if (!l || !(l.width > 0)) return;
      textLayoutRef.current = {x: l.x, w: l.width};
      blockSizeRef.current = {
        w: boxWidth,
        h: l.height || blockSizeRef.current.h,
      };
      const cur = {x: position.x._value, y: position.y._value};
      const next = clampFreePositionRef.current(cur.x, cur.y);
      if (Math.abs(next.x - cur.x) > 1 || Math.abs(next.y - cur.y) > 1) {
        position.setValue(next);
        onUpdatePositionRef.current(block.id, next.x, next.y);
      }
    };

    const visual = getTextVisualStyle(
      block.color ?? selectedColor,
      block.bgMode ?? 0,
    );

    return (
      <Animated.View
        onLayout={handleLayout}
        pointerEvents={isBeingEdited ? 'none' : 'auto'}
        collapsable={false}
        {...(isBeingEdited ? {} : panResponder.panHandlers)}
        style={[
          styles.centerTextWrapper,
          {
            zIndex,
            elevation: Platform.OS === 'android' ? Math.max(12, zIndex + 12) : 0,
            left: 0,
            top: 0,
            width: boxWidth,
            maxWidth: boxWidth,
            opacity: isBeingEdited ? 0 : 1,
            padding: TEXT_BLOCK_TOUCH_PAD,
            transform: position.getTranslateTransform(),
          },
        ]}>
        <View
          onLayout={handleContentLayout}
          pointerEvents="none"
          style={{
            alignSelf: alignToFlexSelf(block.align ?? 'center'),
            maxWidth: '100%',
          }}>
          <Text
            pointerEvents="none"
            style={[
              styles.centerText,
              TEXT_STYLES[block.textStyleIndex ?? 0]?.textStyle,
              {
                color: visual.textColor,
                textAlign: physicalTextAlign(block.align ?? 'center'),
                writingDirection: 'rtl',
                fontSize: block.fontSize ?? DEFAULT_FONT_SIZE,
                lineHeight: Math.round(
                  (block.fontSize ?? DEFAULT_FONT_SIZE) * 1.15,
                ),
              },
              visual.backgroundColor !== 'transparent' && {
                backgroundColor: visual.backgroundColor,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
              },
            ]}>
            {block.text}
          </Text>
        </View>
      </Animated.View>
    );
  },
);

const DraggableImage = React.memo(
  ({id, uri, stageWidth, stageHeight, zIndex, onBringToFront}) => {
    const imageSize = Math.min(stageWidth, stageHeight) * 0.45;
    const TOUCH_PAD = 40;

    const posX = useRef((stageWidth - imageSize) / 2 - TOUCH_PAD);
    const posY = useRef((stageHeight - imageSize) / 2 - TOUCH_PAD);
    const curScale = useRef(1);

    const animX = useRef(new Animated.Value(posX.current)).current;
    const animY = useRef(new Animated.Value(posY.current)).current;
    const animScale = useRef(new Animated.Value(1)).current;

    const touchMap = useRef({});
    const dragStart = useRef({x: 0, y: 0});
    const dragOrigin = useRef({x: 0, y: 0});
    const pinchBaseDist = useRef(0);
    const pinchBaseScale = useRef(1);
    const isPinching = useRef(false);

    const getDist = (a, b) =>
      Math.sqrt((a.pageX - b.pageX) ** 2 + (a.pageY - b.pageY) ** 2);

    const allTouches = () => Object.values(touchMap.current);

    const handleGrant = e => {
      onBringToFront?.(id);
      const t = e.nativeEvent;
      touchMap.current = {};
      if (t.touches && t.touches.length > 0) {
        t.touches.forEach(tc => {
          touchMap.current[tc.identifier] = {pageX: tc.pageX, pageY: tc.pageY};
        });
      } else {
        touchMap.current[t.identifier ?? 0] = {pageX: t.pageX, pageY: t.pageY};
      }
      dragStart.current = {x: t.pageX, y: t.pageY};
      dragOrigin.current = {x: posX.current, y: posY.current};
      pinchBaseDist.current = 0;
      isPinching.current = false;
    };

    const handleMove = e => {
      const t = e.nativeEvent;
      if (t.touches && t.touches.length > 0) {
        t.touches.forEach(tc => {
          touchMap.current[tc.identifier] = {pageX: tc.pageX, pageY: tc.pageY};
        });
      } else {
        touchMap.current[t.identifier ?? 0] = {pageX: t.pageX, pageY: t.pageY};
      }

      const all = allTouches();
      if (all.length >= 2) {
        isPinching.current = true;
        const d = getDist(all[0], all[1]);
        if (pinchBaseDist.current === 0) {
          pinchBaseDist.current = d;
          pinchBaseScale.current = curScale.current;
        } else {
          const s = clamp(
            pinchBaseScale.current * (d / pinchBaseDist.current),
            0.3,
            5,
          );
          curScale.current = s;
          animScale.setValue(s);
        }
      } else if (!isPinching.current) {
        const dx = t.pageX - dragStart.current.x;
        const dy = t.pageY - dragStart.current.y;
        posX.current = dragOrigin.current.x + dx;
        posY.current = dragOrigin.current.y + dy;
        animX.setValue(posX.current);
        animY.setValue(posY.current);
      }
    };

    const handleRelease = e => {
      const t = e.nativeEvent;
      if (t.touches && t.touches.length > 0) {
        touchMap.current = {};
        t.touches.forEach(tc => {
          touchMap.current[tc.identifier] = {pageX: tc.pageX, pageY: tc.pageY};
        });
      } else {
        delete touchMap.current[t.identifier ?? 0];
      }
      const all = allTouches();
      if (all.length < 2) {
        pinchBaseDist.current = 0;
        isPinching.current = false;
        if (all.length === 1) {
          dragStart.current = {x: all[0].pageX, y: all[0].pageY};
          dragOrigin.current = {x: posX.current, y: posY.current};
        }
      }
    };

    return (
      <Animated.View
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={handleGrant}
        onResponderMove={handleMove}
        onResponderRelease={handleRelease}
        onResponderTerminate={handleRelease}
        style={{
          position: 'absolute',
          zIndex,
          transform: [
            {translateX: animX},
            {translateY: animY},
            {scale: animScale},
          ],
          padding: TOUCH_PAD,
        }}>
        <Image
          source={{uri}}
          style={{width: imageSize, height: imageSize}}
          resizeMode="contain"
        />
      </Animated.View>
    );
  },
);

const PostEditorScreen = ({
  onClose,
  onPublish,
  currentUser,
  selectedCategory,
  /** Explicit listing category for this editor session (from navigation); overrides stale global feed category */
  publishCategoryId = null,
  publishTarget = 'post',
  /** When true, story publish is skipped (sales-image edit — story syncs on ad save). */
  skipStoryPublish = false,
  /** When set, editor opens in edit mode for an existing feed post. */
  initialListing = null,
}) => {
  const insets = useSafeAreaInsets();
  const top = insets.top;
  const bottom = insets.bottom;
  const [activeTab, setActiveTab] = useState(TAB_TEXT);
  const [publishing, setPublishing] = useState(false);
  const uploadProgressAnim = useRef(new Animated.Value(0)).current;
  const uploadProgressLoopRef = useRef(null);
  const [topNavWidth, setTopNavWidth] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [textModeOverlayText, setTextModeOverlayText] = useState('');
  const [textContent, setTextContent] = useState('');
  const [mediaImages, setMediaImages] = useState([]);
  const [backgroundImageUri, setBackgroundImageUri] = useState(null);
  const [backgroundVideoAsset, setBackgroundVideoAsset] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [textAlignMode, setTextAlignMode] = useState('center');
  const [selectedTextStyleIndex, setSelectedTextStyleIndex] = useState(0);
  const [colorPageIndex, setColorPageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_TEXT_COLOR);
  const [selectedBackgroundGradientIndex, setSelectedBackgroundGradientIndex] =
    useState(0);
  const [colorsPagerWidth, setColorsPagerWidth] = useState(0);
  const [textBlocks, setTextBlocks] = useState([]);
  const [editingTextBlockId, setEditingTextBlockId] = useState(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const keyboardInset = useKeyboardInset();
  const [showMediaSourceSheet, setShowMediaSourceSheet] = useState(false);
  const [hashtags, setHashtags] = useState([]);
  const [showHashtagModal, setShowHashtagModal] = useState(false);
  const [hashtagInput, setHashtagInput] = useState('');
  const [formatToolbarHeight, setFormatToolbarHeight] = useState(72);
  const [stageLayout, setStageLayout] = useState({width: 0, height: 0});
  const postPreviewRef = useRef(null);
  const stageRef = useRef(null);
  const editingInputRef = useRef(null);
  const editingFieldLayoutRef = useRef(null);
  const editingTextDraftRef = useRef('');
  // Where the block sat before edit mode — restored on finish so the
  // temporary "above keyboard" edit slot never becomes the saved position.
  const editingOriginRef = useRef({x: null, y: null});
  const isFinishingEditRef = useRef(false);
  const editingTextBlockIdRef = useRef(null);
  const suppressBlurFinishRef = useRef(false);
  const stageLayoutRef = useRef({width: 0, height: 0});
  // Track the largest stage height ever observed (i.e. with the keyboard
  // closed). New text blocks are positioned relative to this so they don't
  // end up at the top of the screen once the keyboard dismisses.
  const maxStageHeightRef = useRef(0);
  const activeTabRef = useRef(activeTab);
  const nextStackOrderRef = useRef(1);
  const editingListingId =
    initialListing?.id != null ? String(initialListing.id).trim() : '';
  const isEditMode = Boolean(editingListingId);
  const originalVideoUrlRef = useRef(null);
  const originalMainImageUrlRef = useRef(null);
  const didHydrateListingRef = useRef(false);
  const didHydrateOverlaysRef = useRef(false);

  const editorSessionKey = useMemo(() => {
    if (!initialListing) return 'new';
    const id =
      initialListing.id != null ? String(initialListing.id).trim() : '';
    const sales =
      initialListing.sales_image_url ?? initialListing.salesImageUrl ?? '';
    const main = initialListing.main_image_url ?? '';
    return `${id}|${String(sales).trim()}|${String(main).trim()}|${initialListing._preferSalesImage ? 'sales' : 'post'}`;
  }, [initialListing]);

  useEffect(() => {
    didHydrateListingRef.current = false;
    didHydrateOverlaysRef.current = false;
    originalVideoUrlRef.current = null;
    originalMainImageUrlRef.current = null;
    setTextBlocks([]);
    setEditingTextBlockId(null);
    editingTextDraftRef.current = '';
    editingFieldLayoutRef.current = null;
    editingOriginRef.current = {x: null, y: null};
    isFinishingEditRef.current = false;
    setBackgroundImageUri(null);
    setBackgroundVideoAsset(null);
    setMediaImages([]);
    setTextContent('');
    setTextModeOverlayText('');
    nextStackOrderRef.current = 1;
  }, [editorSessionKey]);

  const isRemoteMediaUri = uri =>
    /^https?:\/\//i.test(String(uri || '').trim());

  const stylePresets = useMemo(
    () => [
      {fontWeight: '400', letterSpacing: 0},
      {fontWeight: '500', letterSpacing: 0.5},
      {fontWeight: '600', letterSpacing: 0.5},
      {fontWeight: '700', letterSpacing: 1},
      {fontWeight: '800', letterSpacing: 1.2},
    ],
    [],
  );

  const resolvedPublishCategory = useMemo(() => {
    const fromNav =
      publishCategoryId != null && String(publishCategoryId).trim() !== ''
        ? parseInt(String(publishCategoryId).trim(), 10)
        : NaN;
    if (Number.isFinite(fromNav) && fromNav > 0) {
      return fromNav;
    }
    if (selectedCategory != null && String(selectedCategory).trim() !== '') {
      const fromFeed = parseInt(String(selectedCategory).trim(), 10);
      if (Number.isFinite(fromFeed) && fromFeed > 0) {
        return fromFeed;
      }
    }
    return 8;
  }, [publishCategoryId, selectedCategory]);

  const hasTextBlockContent = textBlocks.some(
    b => b.text && String(b.text).trim().length > 0,
  );

  const canPublish =
    Boolean(backgroundImageUri) ||
    Boolean(backgroundVideoAsset?.uri) ||
    mediaImages.length > 0 ||
    hasTextBlockContent ||
    Boolean((textModeOverlayText || '').trim()) ||
    Boolean((textContent || '').trim());

  useEffect(() => {
    if (!initialListing || didHydrateListingRef.current) return;
    didHydrateListingRef.current = true;
    const {videoUrl, mainImageUrl} = extractPostListingMediaUrls(initialListing);
    const restoreInfo = parsePostEditorRestoreInfo(initialListing);
    originalVideoUrlRef.current = videoUrl;
    originalMainImageUrlRef.current = mainImageUrl;
    setHashtags(parseListingHashtagsForEditor(initialListing));
    if (videoUrl) {
      setBackgroundVideoAsset({
        uri: videoUrl,
        mimeType: 'video/mp4',
        fileName: null,
      });
      setBackgroundImageUri(null);
      setMediaImages([]);
      activeTabRef.current = TAB_CAMERA;
      setActiveTab(TAB_CAMERA);
      return;
    }
    // Feed image with text burned in and no clean source stored (e.g. a
    // text-on-gradient post): never use the baked composite as background —
    // the hydrated text blocks would appear on top of their own baked copy
    // (every text shown twice). Restore the gradient background instead.
    if (restoreInfo.textBaked && !restoreInfo.sourceImageUrl) {
      originalMainImageUrlRef.current = null;
      setBackgroundImageUri(null);
      setBackgroundVideoAsset(null);
      if (restoreInfo.bgGradientIndex != null) {
        setSelectedBackgroundGradientIndex(restoreInfo.bgGradientIndex);
      }
      activeTabRef.current = TAB_CAMERA;
      setActiveTab(TAB_CAMERA);
      return;
    }
    if (mainImageUrl) {
      setBackgroundImageUri(mainImageUrl);
      setBackgroundVideoAsset(null);
      activeTabRef.current = TAB_CAMERA;
      setActiveTab(TAB_CAMERA);
      return;
    }
    const desc = String(initialListing.description || '').trim();
    if (desc && desc !== 'פוסט' && desc.toLowerCase() !== 'post') {
      setTextContent(desc);
      activeTabRef.current = TAB_TEXT;
      setActiveTab(TAB_TEXT);
    }
  }, [initialListing, editorSessionKey]);

  useEffect(() => {
    if (!initialListing || didHydrateOverlaysRef.current) return;
    if (!(stageLayout.width > 0 && stageLayout.height > 0)) return;
    const payload = parsePostTextOverlayPayload(initialListing);
    didHydrateOverlaysRef.current = true;
    let blocks = payload?.overlays?.length
      ? hydratePostEditorBlocksFromOverlays(payload, stageLayout).filter(b =>
          String(b?.text || '').trim(),
        )
      : [];
    // Older posts / sales images may only have description + baked pixels.
    // Still create a live text layer so tap-to-edit works.
    if (!blocks.length) {
      const desc = String(initialListing.description || '').trim();
      if (desc && desc !== 'פוסט' && desc.toLowerCase() !== 'post') {
        blocks = [
          {
            id: createTextBlockId(),
            text: desc,
            color: DEFAULT_TEXT_COLOR,
            textStyleIndex: 0,
            fontSize: DEFAULT_FONT_SIZE,
            align: 'center',
            x: STAGE_TEXT_PAD_LEFT,
            y: getDefaultTextBlockY(stageLayout.height, 40),
            stackOrder: 1,
            bgMode: 0,
          },
        ];
      }
    }
    if (!blocks.length) return;
    nextStackOrderRef.current = blocks.length + 1;
    setTextBlocks(blocks);
    activeTabRef.current = TAB_CAMERA;
    setActiveTab(TAB_CAMERA);
  }, [initialListing, stageLayout.width, stageLayout.height, editorSessionKey]);

  useEffect(
    () => () => {
      uploadProgressLoopRef.current?.stop?.();
    },
    [],
  );

  const resetUploadProgress = useCallback(() => {
    uploadProgressLoopRef.current?.stop?.();
    uploadProgressLoopRef.current = null;
    uploadProgressAnim.stopAnimation();
    uploadProgressAnim.setValue(0);
  }, [uploadProgressAnim]);

  const startUploadProgress = useCallback(() => {
    resetUploadProgress();
    uploadProgressLoopRef.current = Animated.sequence([
      Animated.timing(uploadProgressAnim, {
        toValue: 0.28,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(uploadProgressAnim, {
        toValue: 0.62,
        duration: 2200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(uploadProgressAnim, {
        toValue: 0.88,
        duration: 5200,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]);
    uploadProgressLoopRef.current.start();
  }, [resetUploadProgress, uploadProgressAnim]);

  const finishUploadProgress = useCallback(
    () =>
      new Promise(resolve => {
        uploadProgressLoopRef.current?.stop?.();
        uploadProgressLoopRef.current = null;
        Animated.timing(uploadProgressAnim, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start(({finished}) => {
          if (finished) resolve();
        });
      }),
    [uploadProgressAnim],
  );

  const showPostUploadProgress =
    publishing && publishTarget !== 'story';

  const uploadProgressWidth = uploadProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(topNavWidth, 1)],
  });

  const handlePublish = async () => {
    if (publishing) return;
    if (!canPublish) {
      Alert.alert(
        'לא ניתן לפרסם',
        'הוסף תמונה או סרטון מהמצלמה או מהגלריה, או טקסט (Aa), ואז לחץ שוב כדי להעלות ולפרסם.',
      );
      return;
    }

    try {
      setPublishing(true);
      if (publishTarget !== 'story') {
        startUploadProgress();
      }
      Keyboard.dismiss();
      if (editingTextBlockId) {
        finishEditing();
        await new Promise(resolve => setTimeout(resolve, 120));
      }
      setIsCapturing(true);
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
      const stageMapping = await measurePostStageMapping(
        postPreviewRef,
        stageRef,
      );
      const postTextMeta = serializePostTextOverlays(textBlocks, stageLayout, {
        textModeOverlayText,
        textContent,
        stageMapping,
      });
      const listingDescription = postTextMeta.description || 'פוסט';
      const hasVideoBackground = Boolean(backgroundVideoAsset?.uri);
      const hasTextOverlays = postHasTextOverlays(textBlocks);
      const hasStickerOverlays = postHasStickerOverlays(mediaImages);
      // Stickers always bake. Story photos with text also bake so home stories
      // show the text (stories have no live overlay layer unless metadata is set).
      // Feed posts keep live text layers for re-edit without baking.
      const mustBakeComposite =
        hasStickerOverlays ||
        (publishTarget === 'story' && hasTextOverlays && !hasVideoBackground);
      const canUploadPhotoDirectly =
        Boolean(backgroundImageUri) &&
        !hasVideoBackground &&
        !mustBakeComposite;

      const capturePreviewToFile = async () => {
        await new Promise(resolve =>
          InteractionManager.runAfterInteractions(() => resolve()),
        );
        await new Promise(resolve =>
          setTimeout(resolve, Platform.OS === 'android' ? 300 : 120),
        );
        if (Platform.OS === 'web') {
          const el = resolvePostPreviewDomNode(
            postPreviewRef,
            'post-editor-preview-root',
          );
          if (!el) {
            throw new Error('לא ניתן לצלם את התצוגה בדפדפן');
          }
          return capturePostPreviewToDataUrl(
            el,
            publishTarget === 'story'
              ? {minShortSidePx: 1440, jpegQuality: 0.96, maxScale: 4}
              : {minShortSidePx: 1080, jpegQuality: 0.94, maxScale: 4},
          );
        }
        return captureRef(postPreviewRef.current, {
          format: 'jpg',
          quality: publishTarget === 'story' ? 0.95 : 0.9,
          result: 'tmpfile',
        });
      };

      const uploadImagePayload = async (uri, folderPrefix) => {
        const uploadResult = await uploadFile(
          {
            uri,
            type: 'image/jpeg',
            name: `${publishTarget === 'story' ? 'story' : 'post'}_${Date.now()}.jpg`,
          },
          folderPrefix === 'story' ? 'stories/images' : 'listings/images',
        );
        const imageUrl = uploadResult?.url;
        if (!imageUrl) {
          throw new Error('העלאה הצליחה בלי כתובת קובץ');
        }
        return imageUrl;
      };

      let mainImageUrl = null;
      let videoUrl = null;
      let sourceImageUrlForEdit = null;
      let textBakedIntoImage = false;

      if (hasVideoBackground) {
        const sameVideo =
          isRemoteMediaUri(backgroundVideoAsset.uri) &&
          backgroundVideoAsset.uri === originalVideoUrlRef.current;
        if (sameVideo && originalVideoUrlRef.current) {
          videoUrl = originalVideoUrlRef.current;
        } else {
          const videoUpload = await uploadFile(
            {
              uri: backgroundVideoAsset.uri,
              type: backgroundVideoAsset.mimeType || 'video/mp4',
              name:
                backgroundVideoAsset.fileName ||
                `${publishTarget === 'story' ? 'story' : 'post'}_${Date.now()}${inferVideoExtension(backgroundVideoAsset)}`,
            },
            publishTarget === 'story' ? 'stories/videos' : 'listings/videos',
            {timeoutMs: 300000},
          );
          videoUrl = videoUpload?.url;
          if (!videoUrl) {
            throw new Error('העלאת הסרטון נכשלה');
          }
        }
      } else if (canUploadPhotoDirectly) {
        const sameImage =
          isRemoteMediaUri(backgroundImageUri) &&
          backgroundImageUri === originalMainImageUrlRef.current;
        if (sameImage && originalMainImageUrlRef.current) {
          mainImageUrl = originalMainImageUrlRef.current;
        } else {
          const imageUpload = await uploadFile(
            {
              uri: backgroundImageUri,
              type: inferImageMimeFromUri(backgroundImageUri),
              name: `${publishTarget === 'story' ? 'story' : 'post'}_${Date.now()}.jpg`,
            },
            publishTarget === 'story' ? 'stories/images' : 'listings/images',
          );
          mainImageUrl = imageUpload?.url;
          if (!mainImageUrl) {
            throw new Error('העלאה הצליחה בלי כתובת קובץ');
          }
        }
      } else {
        // Bake stickers (+ text) into the feed image, but keep a clean source
        // so re-opening the editor can restore editable text layers.
        if (backgroundImageUri) {
          const sameSource =
            isRemoteMediaUri(backgroundImageUri) &&
            backgroundImageUri === originalMainImageUrlRef.current;
          if (sameSource && originalMainImageUrlRef.current) {
            sourceImageUrlForEdit = originalMainImageUrlRef.current;
          } else {
            sourceImageUrlForEdit = await uploadImagePayload(
              backgroundImageUri,
              publishTarget,
            );
          }
        }
        let captureUri;
        try {
          captureUri = await capturePreviewToFile();
        } catch (captureError) {
          if (backgroundImageUri) {
            captureUri = backgroundImageUri;
          } else {
            throw captureError;
          }
        }
        mainImageUrl = await uploadImagePayload(captureUri, publishTarget);
        // The capture burned the text into the image — the feed must NOT draw
        // live overlays on top of it (every text would show twice).
        if (hasTextOverlays) {
          textBakedIntoImage = true;
        }
      }

      const url = videoUrl || mainImageUrl;
      if (!url) {
        throw new Error('העלאה הצליחה בלי כתובת קובץ');
      }

      const subId = resolveSubscriptionId(currentUser);
      if (!subId) {
        Alert.alert(
          'לא ניתן לפרסם',
          'נדרש חשבון מנוי מאומת (עם מזהה מנוי) כדי לפרסם.',
        );
        return;
      }

      // Always persist text overlay layout (photo + video) so coming back to
      // edit can restore and change the texts. When text was baked into a
      // composite, store the clean source image URL (photo bg) or the gradient
      // index (gradient bg) so edit mode can rebuild without the baked copy.
      const usedGradientBackground =
        !hasVideoBackground && !backgroundImageUri;
      const overlayGeneralDetails = buildPostTextGeneralDetails(postTextMeta, {
        sourceImageUrl: textBakedIntoImage ? sourceImageUrlForEdit : null,
        textBakedIntoImage,
        backgroundGradientIndex: usedGradientBackground
          ? selectedBackgroundGradientIndex
          : null,
      });

      let createdListing = null;
      let updatedListing = null;
      if (publishTarget === 'story') {
        if (!skipStoryPublish) {
          await createStory({
            subscription_id: subId,
            media_url: url,
            // Video stories keep live text layers; photo stories bake text into pixels.
            general_details:
              hasVideoBackground && hasTextOverlays
                ? overlayGeneralDetails
                : undefined,
          });
        }
      } else if (isEditMode) {
        const updatePayload = videoUrl
          ? {
              category: resolvedPublishCategory,
              status: 'published',
              subscriptionId: subId,
              subscriptionType: currentUser?.subscription_type || null,
              videoUrl,
              hasVideo: true,
              feedDisplayPriority: 'video',
              description: listingDescription,
              feedPost: true,
              feed_post: true,
              propertyType: 'post',
              price: 0,
              hashtags,
              generalDetails: overlayGeneralDetails,
            }
          : {
              category: resolvedPublishCategory,
              status: 'published',
              subscriptionId: subId,
              subscriptionType: currentUser?.subscription_type || null,
              mainImageUrl,
              description: listingDescription,
              feedPost: true,
              feed_post: true,
              propertyType: 'post',
              price: 0,
              hashtags,
              generalDetails: overlayGeneralDetails,
            };
        updatedListing = await updateListing(editingListingId, updatePayload);
      } else if (videoUrl) {
        createdListing = await createListing({
          category: resolvedPublishCategory,
          status: 'published',
          subscriptionId: subId,
          subscriptionType: currentUser?.subscription_type || null,
          videoUrl,
          hasVideo: true,
          feedDisplayPriority: 'video',
          description: listingDescription,
          feedPost: true,
          feed_post: true,
          propertyType: 'post',
          price: 0,
          hashtags,
          generalDetails: overlayGeneralDetails,
        });
      } else {
        createdListing = await createListing({
          category: resolvedPublishCategory,
          status: 'published',
          subscriptionId: subId,
          subscriptionType: currentUser?.subscription_type || null,
          mainImageUrl,
          description: listingDescription,
          feedPost: true,
          feed_post: true,
          propertyType: 'post',
          price: 0,
          hashtags,
          generalDetails: overlayGeneralDetails,
        });
      }

      if (publishTarget !== 'story') {
        await finishUploadProgress();
      }

      onPublish?.({
        url,
        publishTarget,
        isVideo: hasVideoBackground,
        category: resolvedPublishCategory,
        id:
          updatedListing?.id ??
          updatedListing?.listing?.id ??
          createdListing?.id ??
          createdListing?.listing?.id ??
          (isEditMode ? editingListingId : null),
        isEdit: isEditMode,
        // So תמונה מכירתית / story return can reopen with editable text layers.
        generalDetails: overlayGeneralDetails,
        sourceImageUrl: sourceImageUrlForEdit || null,
      });
    } catch (error) {
      Alert.alert(
        'שגיאה',
        error?.message || (isEditMode ? 'העדכון נכשל' : 'הפרסום נכשל'),
      );
    } finally {
      setIsCapturing(false);
      setPublishing(false);
      resetUploadProgress();
    }
  };

  const selectedBackgroundGradient = useMemo(() => {
    const fallback = BACKGROUND_GRADIENTS[0];
    return BACKGROUND_GRADIENTS[selectedBackgroundGradientIndex] ?? fallback;
  }, [selectedBackgroundGradientIndex]);

  const editingBlock = useMemo(
    () => textBlocks.find(b => b.id === editingTextBlockId) || null,
    [textBlocks, editingTextBlockId],
  );

  // Show format tools whenever a text block is being edited — don't depend on
  // keyboard visibility alone (video focus / Android SurfaceView can flicker it).
  const showTextFormatToolbar =
    Boolean(editingTextBlockId) && !isCapturing;

  const webToolbarInputMarginBottom = useMemo(() => {
    if (Platform.OS !== 'web' || !editingTextBlockId || isCapturing) {
      return 0;
    }
    if (selectedFormat === 'color') {
      return 260;
    }
    if (selectedFormat === 'aa') {
      return 140;
    }
    return 88;
  }, [selectedFormat, editingTextBlockId, isCapturing]);

  /**
   * Fixed edit slot: sit just above the format toolbar + keyboard so the
   * soft keyboard never covers the text being typed.
   */
  const editingInputBottom = useMemo(() => {
    if (!editingTextBlockId || isCapturing) {
      return 12;
    }
    const toolbarH = Math.max(formatToolbarHeight, 72);
    if (Platform.OS === 'web') {
      return Math.max(toolbarH, webToolbarInputMarginBottom) + 12;
    }
    return toolbarH + Math.max(keyboardInset, 0) + 12;
  }, [
    editingTextBlockId,
    isCapturing,
    formatToolbarHeight,
    keyboardInset,
    webToolbarInputMarginBottom,
  ]);

  /** Safe-area padding under the format bar (keyboard lift uses `bottom` on Android). */
  const formatToolbarSafeBottom = Math.max(bottom, 8);

  useEffect(() => {
    editingTextBlockIdRef.current = editingTextBlockId;
  }, [editingTextBlockId]);

  useEffect(() => {
    const onShow = () => {
      setIsKeyboardVisible(true);
    };
    const onHide = () => {
      setIsKeyboardVisible(false);
      // Don't clear format tools mid-edit — video/audio focus can hide the
      // keyboard briefly without the user intending to leave edit mode.
      if (!editingTextBlockIdRef.current) {
        setSelectedFormat(null);
      }
    };

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub?.remove?.();
      hideSub?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (keyboardInset <= 0) {
      setIsKeyboardVisible(false);
    } else if (Platform.OS === 'web') {
      setIsKeyboardVisible(true);
    }
  }, [keyboardInset]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editingTextBlockId) return;
    // Give the keyboard/input a moment after opening edit — video pause and
    // Android focus fights can fire spurious blur/keyboard events.
    suppressBlurFinishRef.current = true;
    const t = setTimeout(() => {
      suppressBlurFinishRef.current = false;
    }, 450);
    requestAnimationFrame(() => {
      if (editingInputRef.current?.focus) editingInputRef.current.focus();
    });
    return () => clearTimeout(t);
  }, [editingTextBlockId]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const syncEditingToBlock = partial => {
    if (!editingTextBlockId) return;
    setTextBlocks(prev =>
      prev.map(b => (b.id === editingTextBlockId ? {...b, ...partial} : b)),
    );
  };

  // Mirror the EditingTextBox local state into a parent ref so finishEditing
  // can read it even if the box has unmounted/blurred. EditingTextBox calls
  // this on every keystroke.
  const syncEditingDraft = text => {
    const next = String(text ?? '');
    editingTextDraftRef.current = next;
  };

  const syncEditingDraftFromInput = () => {
    const latest = String(
      editingInputRef.current?.getText?.() ?? editingTextDraftRef.current ?? '',
    );
    editingTextDraftRef.current = latest;
    return latest;
  };

  const readLatestEditingText = () => {
    const draft = String(editingTextDraftRef.current ?? '');
    const fromBox = String(editingInputRef.current?.getText?.() ?? '');
    // Prefer whichever source has more content (handles Done/blur sync lag).
    if (fromBox.trim().length >= draft.trim().length) return fromBox;
    return draft;
  };

  const finishEditing = () => {
    if (!editingTextBlockId || isFinishingEditRef.current) return;
    syncEditingDraftFromInput();
    const blockId = editingTextBlockId;

    // CRITICAL: Capture text into a local variable BEFORE any setState calls.
    const capturedText = readLatestEditingText().trim();

    isFinishingEditRef.current = true;

    // Always clamp against the full (keyboard-closed) stage so finishing
    // edit does not pin the block to the temporary above-keyboard slot.
    const stageHForFinish =
      maxStageHeightRef.current > 0
        ? maxStageHeightRef.current
        : stageLayoutRef.current.height > 0
          ? stageLayoutRef.current.height
          : stageLayout.height > 0
            ? stageLayout.height
            : 300;

    const stageW =
      stageLayoutRef.current.width > 0
        ? stageLayoutRef.current.width
        : stageLayout.width > 0
          ? stageLayout.width
          : 300;
    const boxW = getTextBlockBoxWidth(stageW);
    const fieldLayout = editingFieldLayoutRef.current;
    const inputH = fieldLayout?.height ?? 90;
    const origin = editingOriginRef.current || {x: null, y: null};
    const restoreX =
      origin.x != null && origin.x !== undefined
        ? origin.x
        : STAGE_TEXT_PAD_LEFT;
    const restoreY =
      origin.y != null && origin.y !== undefined
        ? origin.y
        : getDefaultTextBlockY(stageHForFinish, inputH);

    setTextBlocks(prev => {
      const cur = prev.find(b => b.id === blockId);
      const text = capturedText || String(cur?.text ?? '').trim();
      if (!text) {
        return prev.filter(b => b.id !== blockId);
      }
      // Loose clamp: keep the user's free-dragged x (strict clamp would snap
      // the full-width box back to the stage edge).
      const nextPos = clampTextBlockPositionLoose(
        restoreX,
        restoreY,
        boxW,
        inputH,
        stageW,
        stageHForFinish,
      );
      return prev.map(b =>
        b.id === blockId
          ? {
              ...b,
              text,
              color: selectedColor || DEFAULT_TEXT_COLOR,
              textStyleIndex: selectedTextStyleIndex,
              align: textAlignMode,
              x: nextPos.x,
              y: nextPos.y,
            }
          : b,
      );
    });

    editingFieldLayoutRef.current = null;
    editingOriginRef.current = {x: null, y: null};
    editingTextDraftRef.current = '';
    setEditingTextBlockId(null);
    isFinishingEditRef.current = false;
    editingInputRef.current?.blur?.();
    Keyboard.dismiss();
  };

  const textBlocksRef = useRef(textBlocks);
  textBlocksRef.current = textBlocks;

  const beginEditTextBlock = useCallback(id => {
    const block = textBlocksRef.current.find(b => b.id === id);
    if (!block) return;
    const initialText = block.text ?? '';
    editingTextDraftRef.current = initialText;
    editingOriginRef.current = {
      x: block.x != null ? block.x : null,
      y: block.y != null ? block.y : null,
    };
    setSelectedTextStyleIndex(block.textStyleIndex ?? 0);
    setSelectedColor(block.color ?? DEFAULT_TEXT_COLOR);
    setTextAlignMode(block.align ?? 'center');
    setSelectedFormat('aa');
    setEditingTextBlockId(id);
    // Focus after the editing input mounts (single rAF is often too early).
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          editingInputRef.current?.focus?.();
        }, 32);
      });
    });
  }, []);

  const updateBlockPosition = (id, x, y) => {
    const sw = stageLayoutRef.current.width || stageLayout.width || 300;
    const sh =
      maxStageHeightRef.current ||
      stageLayoutRef.current.height ||
      stageLayout.height ||
      300;
    // Values arrive already precision-clamped by DraggableTextBlock against
    // the measured glyph bounds; loose clamp only guards absurd values.
    const clamped = clampTextBlockPositionLoose(
      x,
      y,
      getTextBlockBoxWidth(sw),
      40,
      sw,
      sh,
    );
    setTextBlocks(prev =>
      prev.map(b => (b.id === id ? {...b, x: clamped.x, y: clamped.y} : b)),
    );
  };

  const bringMediaImageToFront = id => {
    if (!id) return;
    setMediaImages(prev => {
      const nextOrder = nextStackOrderRef.current++;
      return prev.map(img =>
        img.id === id ? {...img, stackOrder: nextOrder} : img,
      );
    });
  };

  const bringTextBlockToFront = id => {
    if (!id) return;
    setTextBlocks(prev => {
      const nextOrder = nextStackOrderRef.current++;
      return prev.map(block =>
        block.id === id ? {...block, stackOrder: nextOrder} : block,
      );
    });
  };

  const addTextBlock = () => {
    const id = createTextBlockId();
    setTextAlignMode('center');
    setSelectedColor(DEFAULT_TEXT_COLOR);
    const newBlock = {
      id,
      text: '',
      color: DEFAULT_TEXT_COLOR,
      textStyleIndex: selectedTextStyleIndex,
      fontSize: DEFAULT_FONT_SIZE,
      align: 'center',
      x: null,
      y: null,
      stackOrder: nextStackOrderRef.current++,
    };
    setTextBlocks(prev => [...prev, newBlock]);
    editingTextDraftRef.current = '';
    // New text has no saved spot yet — finishEditing will place it at stage center.
    editingOriginRef.current = {x: null, y: null};
    setEditingTextBlockId(id);
    setSelectedFormat('aa');
    requestAnimationFrame(() => {
      if (editingInputRef.current?.focus) editingInputRef.current.focus();
    });
  };

  const addHashtagFromInput = () => {
    const raw = String(hashtagInput || '')
      .replace(/^#+/, '')
      .trim();
    if (!raw) return;
    setHashtags(prev => {
      const cleaned = raw.replace(/\s+/g, '').slice(0, 50);
      if (!cleaned || prev.includes(cleaned)) return prev;
      if (prev.length >= 30) return prev;
      return [...prev, cleaned];
    });
    setHashtagInput('');
  };

  const removeHashtag = tag => {
    setHashtags(prev => prev.filter(t => t !== tag));
  };

  const applyBackgroundImage = uri => {
    if (!uri) return;
    setBackgroundVideoAsset(null);
    setBackgroundImageUri(uri);
  };

  const applyBackgroundVideo = asset => {
    if (!asset?.uri) return;
    setBackgroundImageUri(null);
    setMediaImages([]);
    setBackgroundVideoAsset({
      uri: asset.uri,
      mimeType: asset?.mimeType || null,
      fileName: asset?.fileName || null,
    });
  };

  const switchToCameraTab = () => {
    if (activeTabRef.current !== TAB_CAMERA) {
      clearAllEditorState();
    }
    activeTabRef.current = TAB_CAMERA;
    setActiveTab(TAB_CAMERA);
  };

  const applyCameraCaptureAsset = asset => {
    if (!asset?.uri) return;
    switchToCameraTab();
    if (isVideoAsset(asset)) {
      applyBackgroundVideo(asset);
      return;
    }
    applyBackgroundImage(asset.uri);
  };

  const requestCameraPermissions = async () => {
    if (Platform.OS === 'web') return true;
    const existing = await ImagePicker.getCameraPermissionsAsync();
    let status = existing?.status;
    if (status !== 'granted') {
      const requested = await ImagePicker.requestCameraPermissionsAsync();
      status = requested?.status;
    }
    if (status !== 'granted') {
      Alert.alert('', 'נדרשת גישה למצלמה כדי לצלם תמונה או סרטון');
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermissions = async () => {
    if (Platform.OS === 'web') return true;
    const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
    let status = existing?.status;
    if (status !== 'granted') {
      const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
      status = requested?.status;
    }
    if (status !== 'granted') {
      Alert.alert('', 'נדרשת גישה לגלריה כדי לבחור תמונה או סרטון');
      return false;
    }
    return true;
  };

  const takePhotoWithCamera = async () => {
    if (Platform.OS !== 'web') {
      const permitted = await requestCameraPermissions();
      if (!permitted) return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (result?.canceled) return;
    applyCameraCaptureAsset(result?.assets?.[0]);
  };

  const takeVideoWithCamera = async () => {
    if (Platform.OS !== 'web') {
      const permitted = await requestCameraPermissions();
      if (!permitted) return;
      const mic = await Audio.requestPermissionsAsync();
      if (mic.status !== 'granted') {
        Alert.alert('', 'נדרשת גישה למיקרופון כדי לצלם סרטון');
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: 60,
    });
    if (result?.canceled) return;
    applyCameraCaptureAsset(result?.assets?.[0]);
  };

  const pickExistingMediaForCameraTab = async () => {
    if (Platform.OS !== 'web') {
      const permitted = await requestMediaLibraryPermissions();
      if (!permitted) return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });
    if (result?.canceled) return;
    applyCameraCaptureAsset(result?.assets?.[0]);
  };

  /**
   * Must launch camera/gallery in the same user-gesture turn as the button
   * press. Any await/setTimeout before launchCameraAsync on web causes the
   * browser to silently block the file picker.
   */
  const runCameraTabMediaAction = action => {
    if (Platform.OS === 'web') {
      const pickerPromise =
        action === 'photo'
          ? ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 1,
            })
          : action === 'video'
            ? ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: false,
                quality: 1,
                videoMaxDuration: 60,
              })
            : ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: false,
                quality: 1,
              });
      setShowMediaSourceSheet(false);

      pickerPromise
        .then(result => {
          if (result?.canceled) return;
          applyCameraCaptureAsset(result?.assets?.[0]);
        })
        .catch(e => {
          Alert.alert('שגיאה', 'לא ניתן לפתוח את המצלמה או הגלריה. נסה שוב.');
        });
      return;
    }

    runNativeCameraTabMediaAction(action);
  };

  const runNativeCameraTabMediaAction = action => {
    setShowMediaSourceSheet(false);
    const launch = () => {
      void (async () => {
        try {
          if (action === 'photo') {
            await takePhotoWithCamera();
          } else if (action === 'video') {
            await takeVideoWithCamera();
          } else if (action === 'library') {
            await pickExistingMediaForCameraTab();
          }
        } catch (e) {
          Alert.alert('שגיאה', 'לא ניתן לפתוח את המצלמה או הגלריה. נסה שוב.');
        }
      })();
    };
    if (Platform.OS === 'android') {
      InteractionManager.runAfterInteractions(launch);
    } else {
      launch();
    }
  };

  const openCameraTabMediaPicker = () => {
    switchToCameraTab();
    setShowMediaSourceSheet(true);
  };

  const clearAllEditorState = () => {
    setBackgroundImageUri(null);
    setBackgroundVideoAsset(null);
    setMediaImages([]);
    setTextBlocks([]);
    setEditingTextBlockId(null);
    editingTextDraftRef.current = '';
    editingFieldLayoutRef.current = null;
    editingOriginRef.current = {x: null, y: null};
    isFinishingEditRef.current = false;
    setSelectedFormat(null);
    setSelectedColor(DEFAULT_TEXT_COLOR);
    setColorPageIndex(0);
    setTextModeOverlayText('');
    setTextContent('');
    setTextAlignMode('center');
    setHashtags([]);
    setHashtagInput('');
    setShowHashtagModal(false);
    nextStackOrderRef.current = 1;
    Keyboard.dismiss();
  };

  const pickBackgroundImageFromGallery = async () => {
    try {
      if (Platform.OS !== 'web') {
        const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
        let status = existing?.status;
        if (status !== 'granted') {
          const requested =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          status = requested?.status;
        }
        if (status !== 'granted') return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
      });

      // Keep existing background when user cancels.
      if (result?.canceled) return;
      const asset = result?.assets?.[0];
      if (!asset?.uri) return;
      if (isVideoAsset(asset)) {
        applyBackgroundVideo(asset);
        return;
      }
      // Gallery button: replace the stage background (not an overlay sticker).
      applyBackgroundImage(asset.uri);
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <View
        style={[styles.topNav, {paddingTop: top}]}
        onLayout={e => setTopNavWidth(e.nativeEvent.layout.width)}>
        <TouchableOpacity
          onPress={onClose}
          disabled={publishing}
          style={[styles.backBtn, publishing && styles.backBtnDisabled]}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.tabs}>
          <TouchableOpacity onPress={openCameraTabMediaPicker}>
            <Text
              style={[
                styles.tabText,
                activeTab === TAB_CAMERA && styles.tabTextActive,
              ]}>
              {TAB_CAMERA}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (activeTab === TAB_TEXT) return;
              clearAllEditorState();
              setActiveTab(TAB_TEXT);
            }}>
            <Text
              style={[
                styles.tabText,
                activeTab === TAB_TEXT && styles.tabTextActive,
              ]}>
              {TAB_TEXT}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={publishing}
          accessibilityRole="button"
          accessibilityLabel={
            publishTarget === 'story'
              ? 'סיום'
              : isEditMode
                ? 'עדכן פוסט'
                : 'פרסם והעלה'
          }
          style={[
            styles.publishBtn,
            !canPublish && !publishing && styles.publishBtnMuted,
          ]}>
          {publishTarget === 'story' ? (
            // Sales image flow (צור תמונה מכירתית): the editor returns to the
            // ad form instead of publishing a post — so the action is "סיום".
            <View style={styles.finishBtnPill}>
              <Text style={styles.finishBtnText}>סיום</Text>
            </View>
          ) : (
            <Image
              source={require('../assets/post-button.png')}
              style={styles.publishBtnImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
        {showPostUploadProgress ? (
          <View style={styles.uploadProgressWrap} pointerEvents="none">
            <View style={styles.uploadProgressTrack}>
              <Animated.View
                style={[
                  styles.uploadProgressFillOuter,
                  {width: uploadProgressWidth},
                ]}>
                <LinearGradient
                  colors={PROFILE_RING_COLORS}
                  locations={PROFILE_RING_LOCATIONS}
                  start={{x: 0, y: 0.5}}
                  end={{x: 1, y: 0.5}}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>
            </View>
            <Text style={styles.uploadProgressLabel}>מעלה פוסט...</Text>
          </View>
        ) : null}
      </View>
      <View
        ref={postPreviewRef}
        nativeID="post-editor-preview-root"
        collapsable={false}
        style={styles.backgroundContainer}>
        <View
          pointerEvents="none"
          collapsable={false}
          style={styles.backgroundMediaLayer}>
          {backgroundVideoAsset?.uri ? (
            <Video
              source={{uri: backgroundVideoAsset.uri}}
              style={styles.backgroundVideo}
              resizeMode={ResizeMode.COVER}
              // Pause while editing text so the video surface / audio focus
              // cannot steal touches or dismiss the keyboard mid-type.
              shouldPlay={!editingTextBlockId}
              isLooping
              isMuted={Boolean(editingTextBlockId)}
              volume={editingTextBlockId ? 0 : 1.0}
              useNativeControls={false}
              pointerEvents="none"
            />
          ) : backgroundImageUri ? (
            <Image
              source={{uri: backgroundImageUri}}
              style={styles.backgroundImage}
              resizeMode="cover"
              pointerEvents="none"
            />
          ) : (
            <LinearGradient
              colors={selectedBackgroundGradient}
              start={{x: 0, y: 0.5}}
              end={{x: 1, y: 0.5}}
              style={styles.backgroundGradient}
              pointerEvents="none"
            />
          )}
        </View>
        <KeyboardAvoidingView
          style={styles.editorKeyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={100}
        >
          <View style={styles.editorRoot}>
            {!isCapturing && (
              <View style={styles.headerContainer}>
                <TouchableOpacity
                  onPress={() => {
                    clearAllEditorState();
                    setActiveTab(TAB_TEXT);
                  }}
                  style={styles.closeIconContainer}>
                  <Image
                    source={require('../assets/editors/close.png')}
                    style={styles.closeIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <View style={styles.previewContainer}>
                  <TouchableOpacity
                    style={styles.closeIconContainer}
                    onPress={pickBackgroundImageFromGallery}>
                    <Image
                      source={require('../assets/editors/gallery.png')}
                      style={styles.galleryIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeIconContainer}
                    onPress={addTextBlock}>
                    <Text style={styles.AaStyleBtnText}>Aa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.hashtagBtn}
                    accessibilityRole="button"
                    accessibilityLabel="האשטאגים"
                    onPress={() => setShowHashtagModal(true)}>
                    <Text style={styles.hashtagBtnSymbol}>#</Text>
                    {hashtags.length > 0 && (
                      <View style={styles.hashtagBadge}>
                        <Text style={styles.hashtagBadgeText}>
                          {hashtags.length}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {editingTextBlockId && (
                    <TouchableOpacity
                      style={styles.doneBtn}
                      onPress={finishEditing}>
                      <Text style={styles.doneBtnText}>בוצע</Text>
                    </TouchableOpacity>
                  )}
                  {(activeTab !== TAB_CAMERA ||
                    backgroundImageUri ||
                    backgroundVideoAsset?.uri) && (
                    <TouchableOpacity
                      style={styles.colorToggleButton}
                      onPress={() => {
                        // If a photo/video is the stage background, restore the color gradient.
                        if (backgroundImageUri || backgroundVideoAsset?.uri) {
                          setBackgroundImageUri(null);
                          setBackgroundVideoAsset(null);
                          return;
                        }
                        setSelectedBackgroundGradientIndex(prev => {
                          const next = (prev + 1) % BACKGROUND_GRADIENTS.length;
                          return Number.isFinite(next) ? next : 0;
                        });
                      }}>
                      <LinearGradient
                        colors={selectedBackgroundGradient}
                        start={{x: 0, y: 0.5}}
                        end={{x: 1, y: 0.5}}
                        style={styles.colorPreview}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            <View style={styles.stageColumn}>
              <View
                ref={stageRef}
                style={styles.stage}
                onLayout={e => {
                  const layout = e.nativeEvent.layout;
                  stageLayoutRef.current = layout;
                  if (layout.height > maxStageHeightRef.current) {
                    maxStageHeightRef.current = layout.height;
                  }
                  setStageLayout(layout);
                }}>
                <View style={styles.stageLtr} pointerEvents="box-none">
                  {stageLayout.width > 0 &&
                    stageLayout.height > 0 &&
                    mediaImages.map((img, idx) => (
                      <DraggableImage
                        key={img.id}
                        id={img.id}
                        uri={img.uri}
                        stageWidth={stageLayout.width}
                        stageHeight={stageLayout.height}
                        zIndex={img.stackOrder ?? idx + 1}
                        onBringToFront={bringMediaImageToFront}
                      />
                    ))}
                  {textBlocks.map((block, idx) => (
                    <DraggableTextBlock
                      key={block.id}
                      block={block}
                      stageWidth={stageLayout.width}
                      stageHeight={stageLayout.height}
                      selectedColor={selectedColor}
                      zIndex={block.stackOrder ?? idx + 1}
                      isBeingEdited={block.id === editingTextBlockId}
                      onPress={() => beginEditTextBlock(block.id)}
                      onUpdatePosition={updateBlockPosition}
                      onBringToFront={bringTextBlockToFront}
                    />
                  ))}

                  {editingTextBlockId && !isCapturing && (
                    <View
                      style={[
                        styles.editingOverlay,
                        styles.stageLtrDirection,
                      ]}
                      pointerEvents="box-none">
                      {(() => {
                        const visual = getTextVisualStyle(
                          editingBlock?.color ?? selectedColor,
                          editingBlock?.bgMode ?? 0,
                        );
                        const editingFontSize =
                          editingBlock?.fontSize ?? DEFAULT_FONT_SIZE;
                        return (
                          <>
                            <FontSizeSlider
                              value={editingFontSize}
                              onChange={nextSize =>
                                syncEditingToBlock({fontSize: nextSize})
                              }
                            />
                            <View
                              onLayout={e => {
                                editingFieldLayoutRef.current =
                                  e.nativeEvent.layout;
                              }}
                              style={[
                                styles.editingInputRow,
                                {
                                  bottom: editingInputBottom,
                                  // Physically place the input at the stage
                                  // left/center/right to preview the final
                                  // block position (row is forced LTR).
                                  justifyContent:
                                    alignToFlexSelf(textAlignMode),
                                },
                              ]}>
                              <EditingTextBox
                                key={editingTextBlockId}
                                ref={editingInputRef}
                                nativeID="post-editor-text-input"
                                initialText={editingBlock?.text ?? ''}
                                onTextChange={syncEditingDraft}
                                placeholder="הקלד משהו..."
                                placeholderTextColor="rgba(255,255,255,0.55)"
                                selectionColor={visual.textColor}
                                style={[
                                  styles.editingTextInput,
                                  TEXT_STYLES[selectedTextStyleIndex]
                                    ?.textStyle,
                                  {
                                    color: visual.textColor,
                                    backgroundColor: visual.backgroundColor,
                                    textAlign: physicalTextAlign(textAlignMode),
                                    writingDirection: 'rtl',
                                    fontSize: editingFontSize,
                                    lineHeight: Math.round(
                                      editingFontSize * 1.15,
                                    ),
                                  },
                                ]}
                                multiline
                                textAlignVertical="center"
                                autoCorrect
                                autoCapitalize="sentences"
                                returnKeyType="done"
                                blurOnSubmit
                                submitBehavior="blurAndSubmit"
                                onSubmitEditing={() => {
                                  syncEditingDraftFromInput();
                                  finishEditing();
                                }}
                                onEndEditing={() => {
                                  syncEditingDraftFromInput();
                                  // Do NOT auto-finish on blur: background video
                                  // (Android SurfaceView / audio focus) and format
                                  // toolbar taps can blur the field. Commit via
                                  // בוצע / keyboard Done (onSubmitEditing) only.
                                }}
                              />
                            </View>
                          </>
                        );
                      })()}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {showTextFormatToolbar && (
              <View
                onLayout={e => {
                  const h = e.nativeEvent.layout.height;
                  if (h > 0 && Math.abs(h - formatToolbarHeight) > 1) {
                    setFormatToolbarHeight(h);
                  }
                }}
                style={[
                  styles.keyboardControls,
                  keyboardInset > 0 ? {bottom: keyboardInset} : null,
                  {
                    paddingTop: 10,
                    paddingBottom:
                      Platform.OS === 'web'
                        ? Math.max(bottom, keyboardInset > 0 ? 8 : 10)
                        : formatToolbarSafeBottom,
                  },
                ]}>
                {selectedFormat === 'aa' && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.textStylesScroll}
                    contentContainerStyle={styles.textStylesRow}
                    keyboardShouldPersistTaps="always">
                    {TEXT_STYLES.map((styleItem, index) => (
                      <TouchableOpacity
                        key={styleItem.label}
                        style={[
                          styles.textStylePill,
                          selectedTextStyleIndex === index &&
                            styles.textStylePillActive,
                        ]}
                        onPress={() => {
                          setSelectedTextStyleIndex(index);
                          syncEditingToBlock({textStyleIndex: index});
                        }}>
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.85}
                          style={[
                            styles.textStylePillText,
                            styleItem.textStyle,
                            selectedTextStyleIndex === index &&
                              styles.textStylePillTextActive,
                          ]}>
                          {styleItem.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {selectedFormat === 'color' && (
                  <View
                    style={styles.colorsRow}
                    onLayout={e =>
                      setColorsPagerWidth(e.nativeEvent.layout.width - 48)
                    }>
                    <TouchableOpacity
                      style={styles.eyedropperBtn}
                      onPress={() => {}}>
                      <Image
                        source={require('../assets/editors/penIcon.png')}
                        style={styles.eyedropperInner}
                      />
                    </TouchableOpacity>
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      onMomentumScrollEnd={e => {
                        const page =
                          Math.round(
                            e.nativeEvent.contentOffset.x /
                              Math.max(
                                e.nativeEvent.layoutMeasurement.width,
                                1,
                              ),
                          ) || 0;
                        const clampedPage = Math.min(
                          Math.max(page, 0),
                          COLOR_PAGES.length - 1,
                        );
                        setColorPageIndex(clampedPage);
                      }}
                      style={styles.colorsPager}
                      contentContainerStyle={{flexGrow: 1}}>
                      {COLOR_PAGES.map((pageColors, pageIndex) => (
                        <View
                          key={pageIndex}
                          style={[
                            styles.colorsListPage,
                            colorsPagerWidth > 0 && {width: colorsPagerWidth},
                          ]}>
                          {pageColors.map(color => {
                            const isSelected =
                              String(selectedColor || DEFAULT_TEXT_COLOR)
                                .toUpperCase() === String(color).toUpperCase();
                            const isLightSwatch =
                              String(color).toUpperCase() === '#FFFFFF' ||
                              String(color).toUpperCase() === '#DBDBDB' ||
                              String(color).toUpperCase() === '#C7C7C7';
                            return (
                              <TouchableOpacity
                                key={color}
                                style={[
                                  styles.colorSwatchOuter,
                                  {
                                    backgroundColor: color,
                                    borderWidth: isSelected ? 2 : 1,
                                    borderColor: isSelected
                                      ? '#FEE787'
                                      : isLightSwatch
                                        ? '#9A9A9A'
                                        : '#FFFFFF',
                                  },
                                ]}
                                onPress={() => {
                                  setSelectedColor(color);
                                  syncEditingToBlock({color});
                                }}
                              />
                            );
                          })}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {selectedFormat === 'color' && (
                  <View style={styles.paginationDotsRow}>
                    {COLOR_PAGES.map((_, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.paginationDot,
                          colorPageIndex === index &&
                            styles.paginationDotActive,
                        ]}
                      />
                    ))}
                  </View>
                )}

                <View style={styles.bottomBar}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedFormat(prev => (prev === 'aa' ? null : 'aa'));
                    }}
                    style={[styles.bottomBarItem]}>
                    {selectedFormat === 'aa' ? (
                      <LinearGradient
                        colors={FORMAT_SELECTED_GRADIENT}
                        start={{x: 0.5, y: 0}}
                        end={{x: 0.5, y: 1}}
                        style={styles.bottomBarItemGradientInner}>
                        <Text
                          style={[
                            styles.AaStyleBtnText,
                            TEXT_STYLES[selectedTextStyleIndex].textStyle,
                            {color: '#1E1D27'},
                          ]}>
                          Aa
                        </Text>
                      </LinearGradient>
                    ) : (
                      <Text
                        style={[
                          styles.AaStyleBtnText,
                          TEXT_STYLES[selectedTextStyleIndex].textStyle,
                        ]}>
                        Aa
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedFormat(prev => {
                        const next = prev === 'color' ? null : 'color';
                        if (next === 'color') {
                          setColorPageIndex(
                            getColorPageIndexForColor(selectedColor),
                          );
                        }
                        return next;
                      });
                    }}
                    style={styles.bottomBarItem}>
                    {selectedFormat === 'color' ? (
                      <LinearGradient
                        colors={FORMAT_SELECTED_GRADIENT}
                        start={{x: 0.5, y: 0}}
                        end={{x: 0.5, y: 1}}
                        style={styles.bottomBarItemGradientInner}>
                        <Image
                          source={require('../assets/editors/Action-icons-selected.png')}
                          style={styles.formatBtnIcon}
                          resizeMode="contain"
                        />
                      </LinearGradient>
                    ) : (
                      <Image
                        source={require('../assets/editors/Action-icons.png')}
                        style={styles.formatBtnIcon}
                        resizeMode="contain"
                      />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      const next =
                        textAlignMode === 'left'
                          ? 'center'
                          : textAlignMode === 'center'
                            ? 'right'
                            : 'left';
                      setTextAlignMode(next);
                      // Snap the block box back to the stage span so the
                      // content lands at the true stage left/center/right
                      // (alignSelf places it physically), keeping the same y.
                      syncEditingToBlock({align: next, x: STAGE_TEXT_PAD_LEFT});
                      editingOriginRef.current = {
                        ...(editingOriginRef.current || {}),
                        x: STAGE_TEXT_PAD_LEFT,
                      };
                    }}
                    style={styles.alignBtn}>
                    <View
                      style={[
                        styles.alignIcon,
                        textAlignMode === 'left' && styles.alignIconLeft,
                        textAlignMode === 'center' && styles.alignIconCenter,
                        textAlignMode === 'right' && styles.alignIconRight,
                      ]}>
                      <View style={[styles.alignLine, styles.alignLineLong]} />
                      <View
                        style={[styles.alignLine, styles.alignLineMedium]}
                      />
                      <View style={[styles.alignLine, styles.alignLineShort]} />
                    </View>
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.backgroundBtnContainer,
                      {
                        backgroundColor:
                          (editingBlock?.bgMode ?? 0) === 0
                            ? 'transparent'
                            : '#ffffff',
                      },
                    ]}>
                    <TouchableOpacity
                      onPress={() => {
                        if (!editingTextBlockId) return;
                        setTextBlocks(prev =>
                          prev.map(b => {
                            if (b.id !== editingTextBlockId) return b;
                            const currentMode = b.bgMode ?? 0;
                            const nextMode = (currentMode + 1) % 3; // 0 -> 1 -> 2 -> 0
                            return {...b, bgMode: nextMode};
                          }),
                        );
                      }}
                      style={[
                        styles.backgroundBtn,
                        {
                          borderColor:
                            (editingBlock?.bgMode ?? 0) === 0
                              ? '#ffffff'
                              : '#000000',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.backgroundBtnText,
                          (() => {
                            return {
                              color:
                                (editingBlock?.bgMode ?? 0) === 0
                                  ? '#ffffff'
                                  : '#000000',
                            };
                          })(),
                        ]}>
                        A
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>

      <Modal
        visible={showMediaSourceSheet}
        transparent
        animationType="slide"
        statusBarTranslucent={Platform.OS === 'android'}
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowMediaSourceSheet(false)}>
        <Pressable
          style={styles.mediaSheetBackdrop}
          onPress={() => setShowMediaSourceSheet(false)}>
          <View
            style={[
              styles.mediaSheetCard,
              {paddingBottom: Math.max(bottom, 28)},
            ]}
            onStartShouldSetResponder={() => true}>
            <View style={styles.mediaSheetHandle} />
            <Text style={styles.mediaSheetTitle}>מצלמה</Text>
            <Text style={styles.mediaSheetSubtitle}>
              בחר איך להוסיף תמונה או סרטון
            </Text>
            <TouchableOpacity
              style={styles.mediaSheetOption}
              activeOpacity={0.7}
              onPress={() => runCameraTabMediaAction('photo')}>
              <Text style={styles.mediaSheetOptionText}>צלם תמונה</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mediaSheetOption}
              activeOpacity={0.7}
              onPress={() => runCameraTabMediaAction('video')}>
              <Text style={styles.mediaSheetOptionText}>צלם סרטון</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mediaSheetOption}
              activeOpacity={0.7}
              onPress={() => runCameraTabMediaAction('library')}>
              <Text style={styles.mediaSheetOptionText}>בחר מהגלריה</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mediaSheetCancel}
              activeOpacity={0.7}
              onPress={() => setShowMediaSourceSheet(false)}>
              <Text style={styles.mediaSheetCancelText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showHashtagModal}
        transparent
        animationType="fade"
        statusBarTranslucent={Platform.OS === 'android'}
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowHashtagModal(false)}>
        <Pressable
          style={styles.hashtagBackdrop}
          onPress={() => {
            Keyboard.dismiss();
            setShowHashtagModal(false);
          }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[
              styles.hashtagAvoid,
              keyboardInset > 0 ? {paddingBottom: keyboardInset} : null,
            ]}>
            <View
              style={styles.hashtagCard}
              onStartShouldSetResponder={() => true}>
              <Text style={styles.hashtagTitle}>האשטאגים</Text>
              <Text style={styles.hashtagSubtitle}>
                הוסף האשטאגים לפוסט כדי שיהיה קל יותר למצוא אותו
              </Text>

              <View style={styles.hashtagInputRow}>
                <TextInput
                  style={styles.hashtagInput}
                  value={hashtagInput}
                  onChangeText={setHashtagInput}
                  placeholder="הקלד האשטאג..."
                  placeholderTextColor="#999999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={addHashtagFromInput}
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  style={[
                    styles.hashtagAddBtn,
                    !hashtagInput.trim() && styles.hashtagAddBtnDisabled,
                  ]}
                  disabled={!hashtagInput.trim()}
                  onPress={addHashtagFromInput}>
                  <Text style={styles.hashtagAddBtnText}>הוסף</Text>
                </TouchableOpacity>
              </View>

              {hashtags.length > 0 ? (
                <View style={styles.hashtagChipsWrap}>
                  {hashtags.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={styles.hashtagChip}
                      activeOpacity={0.7}
                      onPress={() => removeHashtag(tag)}>
                      <Text style={styles.hashtagChipText}>#{tag}</Text>
                      <Text style={styles.hashtagChipRemove}>×</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.hashtagEmpty}>אין האשטאגים עדיין</Text>
              )}

              <TouchableOpacity
                style={styles.hashtagDoneBtn}
                activeOpacity={0.85}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowHashtagModal(false);
                }}>
                <Text style={styles.hashtagDoneBtnText}>סיום</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
};

export default PostEditorScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    writingDirection: 'rtl',
  },
  topNav: {
    backgroundColor: '#1E1D27',
    paddingBottom: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  uploadProgressWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 4,
    alignItems: 'center',
  },
  uploadProgressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  uploadProgressFillOuter: {
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#FEE787',
    shadowOpacity: 0.55,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 0},
    elevation: 4,
  },
  uploadProgressLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'Rubik-Regular',
    letterSpacing: 0.2,
  },
  backBtnDisabled: {
    opacity: 0.35,
  },
  stageLtr: {
    ...StyleSheet.absoluteFillObject,
    ...forceLtrStyle,
  },
  stageLtrDirection: {
    ...forceLtrStyle,
  },
  backgroundContainer: {
    flex: 1,
    position: 'relative',
  },
  backgroundMediaLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    elevation: 0,
  },
  editorKeyboardAvoid: {
    flex: 1,
    zIndex: 2,
    // Keep editor UI (text + inputs) above Android video SurfaceView.
    elevation: Platform.OS === 'android' ? 12 : 0,
  },
  editorRoot: {
    flex: 1,
    position: 'relative',
    writingDirection: 'rtl',
  },
  stageColumn: {
    flex: 1,
    minHeight: 0,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  backArrow: {
    color: '#fff',
    fontSize: 32,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {cursor: 'pointer'} : {}),
  },
  publishBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {cursor: 'pointer'} : {}),
  },
  publishBtnMuted: {
    opacity: 0.45,
  },
  publishBtnImage: {
    width: 82,
    height: 38,
  },
  /** "סיום" pill — same footprint as the פרסם post-button.png asset. */
  finishBtnPill: {
    width: 82,
    height: 38,
    borderRadius: 15,
    backgroundColor: '#FFC40A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtnText: {
    color: '#000',
    fontSize: 15,
    fontFamily: 'Rubik-Regular',
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  headerContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 22,
    paddingTop: 15,
    minHeight: 55,
    zIndex: 20,
    elevation: Platform.OS === 'android' ? 20 : 0,
  },
  closeIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#00000066',
  },
  closeIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  previewContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  galleryIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  tabTextActive: {
    color: '#fff',
    fontFamily: 'Rubik-Medium',
  },
  bottomBar: {
    marginHorizontal: 22,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2B2A39',
    paddingHorizontal: 8,
    height: 56,
    borderRadius: 12,
  },
  doneBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Rubik-Medium',
  },
  stage: {
    flex: 1,
    marginTop: 10,
    marginHorizontal: 22,
    zIndex: 10,
    elevation: Platform.OS === 'android' ? 10 : 0,
  },
  centerTextLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  centerTextWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    // alignItems: 'center',
  },
  centerText: {
    fontSize: 20,
    lineHeight: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  editingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
    zIndex: 999999,
    elevation: Platform.OS === 'android' ? 24 : 999999,
  },
  polygonSliderContainer: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 56,
    height: POLYGON_TRACK_HEIGHT + 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000002,
    elevation: Platform.OS === 'android' ? 40 : 1000002,
  },
  polygonTrack: {
    width: 40,
    height: POLYGON_TRACK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  editingInputRow: {
    position: 'absolute',
    // Keep a left gutter clear so the growing text field never covers the size slider.
    left: 56,
    right: 0,
    paddingLeft: STAGE_TEXT_PAD_LEFT,
    paddingRight: STAGE_TEXT_PAD_RIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000001,
    elevation: Platform.OS === 'android' ? 30 : 0,
  },
  polygonIndicator: {
    width: 28,
    height: POLYGON_TRACK_HEIGHT,
    resizeMode: 'contain',
    opacity: 0.9,
  },
  polygonKnob: {
    position: 'absolute',
    width: POLYGON_KNOB_SIZE,
    height: POLYGON_KNOB_SIZE,
    borderRadius: POLYGON_KNOB_SIZE / 2,
    borderWidth: 1.5,
    borderColor: '#D4D7E6',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    elevation: 3,
  },
  editingTextInput: {
    // alignSelf: 'center',
    maxWidth: '100%',
    minHeight: 25,
    fontSize: 20,
    lineHeight: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    writingDirection: 'rtl',
    paddingHorizontal: 12,
    borderRadius: 10,
    paddingVertical: 12,
  },
  keyboardControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    flexShrink: 0,
    zIndex: 100,
    elevation: Platform.OS === 'android' ? 32 : 24,
    backgroundColor:
      Platform.OS === 'web' ? '#1a1926' : 'rgba(30, 29, 39, 0.98)',
  },
  editorCanvas: {
    flex: 1,
    marginHorizontal: 22,
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.18)',
    overflow: 'hidden',
  },
  editorEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  editorEmptyStateText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  textBlocksContainer: {
    padding: 14,
    gap: 12,
  },
  textBlockInput: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.22)',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  textStylesScroll: {
    marginBottom: 15,
    maxHeight: 38,
  },
  textStylesRow: {
    paddingHorizontal: 22,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  colorsRow: {
    marginHorizontal: 22,
    marginBottom: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  eyedropperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  eyedropperInner: {
    width: 28,
    height: 28,
  },
  colorsList: {
    flexDirection: 'row-reverse',
    flex: 1,
    justifyContent: 'space-between',
  },
  colorsPager: {
    flex: 1,
  },
  colorsListPage: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colorSwatchOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  paginationDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF33',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
  },
  textStylePill: {
    paddingHorizontal: 10,
    height: 38,
    minWidth: 69,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#27262F66',
  },
  textStylePillActive: {
    backgroundColor: '#FFFFFF',
  },
  textStylePillText: {
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.5447,
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
  textStylePillTextActive: {
    color: '#1E1D27',
  },
  bottomBarItem: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  bottomBarItemGradientInner: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  AaStyleBtnText: {color: '#fff', fontSize: 18, fontFamily: 'Rubik-Regular'},
  formatBtnIcon: {
    width: 23,
    height: 23,
  },
  alignBtn: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  alignIcon: {
    width: 26,
    height: 15,
    justifyContent: 'space-between',
  },
  alignIconLeft: {
    alignItems: 'flex-start',
  },
  alignIconCenter: {
    alignItems: 'center',
  },
  alignIconRight: {
    alignItems: 'flex-end',
  },
  alignLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  alignLineLong: {
    width: 18,
  },
  alignLineMedium: {
    width: 12,
  },
  alignLineShort: {
    width: 6,
  },
  backgroundBtnContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  backgroundBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#FFFFFF',
    marginHorizontal: 8,
  },
  backgroundBtnText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  colorToggleButton: {
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderRadius: 17.5,
    borderColor: '#FFFFFF',
  },
  colorPreview: {
    width: 29,
    height: 29,
    borderRadius: 14.5,
  },
  hashtagBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#00000066',
  },
  hashtagBtnSymbol: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Rubik-Medium',
    lineHeight: 26,
  },
  hashtagBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#FF3250',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hashtagBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Rubik-Bold',
  },
  hashtagBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    // Shift the popup a bit above center.
    paddingBottom: 160,
  },
  hashtagAvoid: {
    width: '100%',
    alignItems: 'center',
  },
  hashtagCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    writingDirection: 'rtl',
  },
  hashtagTitle: {
    fontSize: 19,
    fontFamily: 'Rubik-Bold',
    color: '#1E1D27',
    textAlign: 'right',
    marginBottom: 4,
  },
  hashtagSubtitle: {
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    color: '#777777',
    textAlign: 'right',
    marginBottom: 16,
  },
  hashtagInputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  hashtagInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E2E8',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    color: '#1E1D27',
    textAlign: 'right',
    writingDirection: 'rtl',
    backgroundColor: '#FAFAFB',
  },
  hashtagAddBtn: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#1E1D27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hashtagAddBtnDisabled: {
    opacity: 0.4,
  },
  hashtagAddBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Rubik-Medium',
  },
  hashtagChipsWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  hashtagChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#EEF1FB',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  hashtagChipText: {
    color: '#2D7DF0',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    writingDirection: 'rtl',
  },
  hashtagChipRemove: {
    color: '#2D7DF0',
    fontSize: 18,
    lineHeight: 18,
    fontFamily: 'Rubik-Bold',
  },
  hashtagEmpty: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    color: '#AAAAAA',
    textAlign: 'center',
  },
  hashtagDoneBtn: {
    marginTop: 22,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1E1D27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hashtagDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  mediaSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  mediaSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 10,
    paddingHorizontal: 20,
    writingDirection: 'rtl',
  },
  mediaSheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8D8D8',
    marginBottom: 14,
  },
  mediaSheetTitle: {
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    color: '#1E1D27',
    textAlign: 'right',
    marginBottom: 4,
  },
  mediaSheetSubtitle: {
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    color: '#666666',
    textAlign: 'right',
    marginBottom: 16,
  },
  mediaSheetOption: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  mediaSheetOptionText: {
    fontSize: 17,
    fontFamily: 'Rubik-Regular',
    color: '#1E1D27',
    textAlign: 'right',
  },
  mediaSheetCancel: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  mediaSheetCancelText: {
    fontSize: 17,
    fontFamily: 'Rubik-Medium',
    color: '#CC001E',
  },
});
