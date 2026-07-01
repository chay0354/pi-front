import React, {
  forwardRef,
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
  PanResponder,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
  Modal,
  Pressable,
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
  createStory,
  resolveSubscriptionId,
} from '../utils/api';
import {forceLtrStyle} from '../utils/rtlLayout';
import {useKeyboardInset} from '../utils/formKeyboardScroll';

const TAB_TEXT = 'טקסט';
const TAB_CAMERA = 'מצלמה';
const FORMAT_SELECTED_GRADIENT = ['#FEE787', '#BD9947', '#9C6522'];
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 50;
const DEFAULT_FONT_SIZE = 20;
const POLYGON_TRACK_HEIGHT = 200;
const POLYGON_KNOB_SIZE = 20;
const TEXT_STYLES = [
  {label: 'סטייל 1', textStyle: {fontFamily: 'Rubik-Bold'}},
  {
    label: 'סטייל 2',
    textStyle: {fontFamily: 'Rubik-SemiBold'},
  },
  {
    label: 'סטייל 3',
    textStyle: {fontFamily: 'Rubik-Medium'},
  },
  {
    label: 'סטייל 4',
    textStyle: {fontFamily: 'Rubik-Regular'},
  },
  {
    label: 'סטייל 5',
    textStyle: {fontFamily: 'Rubik-Light'},
  },
];

const COLOR_PAGES = [
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
  [
    '#000000',
    '#353535',
    '#666666',
    '#7C7C7C',
    '#999999',
    '#B2B2B2',
    '#C7C7C7',
    '#DBDBDB',
    '#FFFFFF',
  ],
];

const BACKGROUND_GRADIENTS = [
  ['#2B2A39', '#5149C4'],
  ['#3B2600', '#8A5A0C'],
  ['#3B1014', '#6B1E27'],
  ['#043144', '#0F6F94'],
  ['#2C1A4A', '#533288'],
];

const createTextBlockId = () =>
  `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
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

const postHasVisualOverlays = (textBlocks, mediaImages) =>
  (Array.isArray(textBlocks) &&
    textBlocks.some(b => String(b?.text || '').trim().length > 0)) ||
  (Array.isArray(mediaImages) && mediaImages.length > 0);

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
/** Inset from the stage start edge (LTR coords inside stageLtr). */
const STAGE_TEXT_PAD_LEFT = 8;
/** Smaller right inset — keeps the clip border closer to the phone edge. */
const STAGE_TEXT_PAD_RIGHT = 2;

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

const getDefaultTextBlockY = (stageH, blockH = 40) => {
  const sh = Math.max(1, Number(stageH) || 1);
  const bh = Math.max(1, Number(blockH) || 1);
  return Math.max(STAGE_TEXT_PAD_Y, (sh - bh) / 2);
};

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

    const touchStartTime = useRef(0);
    const hasMoved = useRef(false);
    const hasAligned = useRef(false);
    const blockSizeRef = useRef({w: 0, h: 0});

    const stageW = stageWidth > 0 ? stageWidth : 300;
    const stageH = stageHeight > 0 ? stageHeight : 300;
    const boxWidth = getTextBlockBoxWidth(stageW);

    const initialPos = clampTextBlockPosition(
      block.x ?? STAGE_TEXT_PAD_LEFT,
      block.y ?? getDefaultTextBlockY(stageH, blockSizeRef.current.h || 40),
      boxWidth,
      40,
      stageW,
      stageH,
    );

    const position = useRef(
      new Animated.ValueXY({x: initialPos.x, y: initialPos.y}),
    ).current;

    useEffect(() => {
      hasAligned.current = false;
      const nextPos = clampTextBlockPosition(
        block.x ?? STAGE_TEXT_PAD_LEFT,
        block.y ?? getDefaultTextBlockY(stageH, blockSizeRef.current.h || 40),
        boxWidth,
        blockSizeRef.current.h || 40,
        stageW,
        stageH,
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
    ]);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          onBringToFrontRef.current?.(block.id);
          touchStartTime.current = Date.now();
          hasMoved.current = false;
          position.setOffset({
            x: position.x._value,
            y: position.y._value,
          });
          position.setValue({x: 0, y: 0});
        },
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5) {
            hasMoved.current = true;
          }
          if (hasMoved.current) {
            position.setValue({x: g.dx, y: g.dy});
          }
        },
        onPanResponderRelease: () => {
          position.flattenOffset();
          const elapsed = Date.now() - touchStartTime.current;
          if (!hasMoved.current && elapsed < 400) {
            onPressRef.current();
          } else {
            const blockH = blockSizeRef.current.h || 40;
            const clamped = clampTextBlockPosition(
              position.x._value,
              position.y._value,
              boxWidth,
              blockH,
              stageW,
              stageH,
            );
            position.setValue({x: clamped.x, y: clamped.y});
            onUpdatePositionRef.current(block.id, clamped.x, clamped.y);
          }
        },
      }),
    ).current;

    const handleLayout = e => {
      if (isBeingEdited) return;

      const blockH = e.nativeEvent.layout.height;
      blockSizeRef.current = {w: boxWidth, h: blockH};

      const hasText = String(block.text ?? '').trim().length > 0;
      if (hasText && blockH < 8) return;

      const targetX = block.x ?? STAGE_TEXT_PAD_LEFT;
      const targetY =
        block.y ??
        position.y._value ??
        getDefaultTextBlockY(stageH, blockSizeRef.current.h || blockH);
      const clamped = clampTextBlockPosition(
        targetX,
        targetY,
        boxWidth,
        blockH,
        stageW,
        stageH,
      );

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

    const visual = getTextVisualStyle(
      block.color ?? selectedColor,
      block.bgMode ?? 0,
    );

    return (
      <Animated.View
        onLayout={handleLayout}
        style={[
          styles.centerTextWrapper,
          {
            zIndex,
            left: 0,
            top: 0,
            width: boxWidth,
            maxWidth: boxWidth,
            opacity: isBeingEdited ? 0 : 1,
            transform: position.getTranslateTransform(),
          },
        ]}
        {...panResponder.panHandlers}>
        <Text
          style={[
            styles.centerText,
            TEXT_STYLES[block.textStyleIndex ?? 0]?.textStyle,
            {
              color: visual.textColor,
              textAlign: block.align ?? 'center',
              writingDirection: 'rtl',
              fontSize: block.fontSize ?? DEFAULT_FONT_SIZE,
              lineHeight: Math.round(
                (block.fontSize ?? DEFAULT_FONT_SIZE) * 1.15,
              ),
            },
            // Background hugs the text content itself rather than the full
            // drag-handle width (boxWidth, kept wide on the wrapper above for
            // a comfortable touch/drag target).
            visual.backgroundColor !== 'transparent' && {
              backgroundColor: visual.backgroundColor,
              alignSelf: 'center',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
            },
          ]}>
          {block.text}
        </Text>
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
}) => {
  const insets = useSafeAreaInsets();
  const top = insets.top;
  const bottom = insets.bottom;
  const [activeTab, setActiveTab] = useState(TAB_TEXT);
  const [publishing, setPublishing] = useState(false);
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
  const [selectedColor, setSelectedColor] = useState(COLOR_PAGES[0][0]);
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
  const editingInputRef = useRef(null);
  const editingFieldLayoutRef = useRef(null);
  const editingTextDraftRef = useRef('');
  const isFinishingEditRef = useRef(false);
  const stageLayoutRef = useRef({width: 0, height: 0});
  // Track the largest stage height ever observed (i.e. with the keyboard
  // closed). New text blocks are positioned relative to this so they don't
  // end up at the top of the screen once the keyboard dismisses.
  const maxStageHeightRef = useRef(0);
  const activeTabRef = useRef(activeTab);
  const nextStackOrderRef = useRef(1);
  const fontSizeTravel = POLYGON_TRACK_HEIGHT - POLYGON_KNOB_SIZE;

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
      Keyboard.dismiss();
      if (editingTextBlockId) {
        finishEditing();
        await new Promise(resolve => setTimeout(resolve, 120));
      }
      setIsCapturing(true);
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
      const listingDescription = (() => {
        const lines = textBlocks
          .map(b => String(b?.text || '').trim())
          .filter(Boolean);
        if (lines.length) return lines.join('\n');
        const fallback = String(textModeOverlayText || textContent || '').trim();
        return fallback || 'פוסט';
      })();
      const hasVideoBackground = Boolean(backgroundVideoAsset?.uri);
      const hasVisualOverlays = postHasVisualOverlays(textBlocks, mediaImages);
      const canUploadPhotoDirectly =
        Boolean(backgroundImageUri) && !hasVideoBackground && !hasVisualOverlays;

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

      if (hasVideoBackground && hasVisualOverlays) {
        const captureUri = await capturePreviewToFile();
        mainImageUrl = await uploadImagePayload(captureUri, publishTarget);
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
      } else if (hasVideoBackground) {
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
      } else if (canUploadPhotoDirectly) {
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
      } else {
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

      let createdListing = null;
      if (publishTarget === 'story') {
        await createStory({subscription_id: subId, media_url: url});
      } else if (videoUrl && mainImageUrl && hasVisualOverlays) {
        createdListing = await createListing({
          category: resolvedPublishCategory,
          status: 'published',
          subscriptionId: subId,
          subscriptionType: currentUser?.subscription_type || null,
          mainImageUrl,
          videoUrl,
          hasVideo: true,
          feedDisplayPriority: 'mainImage',
          description: listingDescription,
          feedPost: true,
          feed_post: true,
          propertyType: 'post',
          price: 0,
          hashtags,
        });
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
        });
      }

      onPublish?.({
        url,
        publishTarget,
        isVideo: hasVideoBackground,
        category: resolvedPublishCategory,
        id: createdListing?.id ?? createdListing?.listing?.id ?? null,
      });
      onClose?.();
    } catch (error) {
      Alert.alert('שגיאה', error?.message || 'הפרסום נכשל');
    } finally {
      setIsCapturing(false);
      setPublishing(false);
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

  // RN Web often never fires Keyboard show/hide; still show the format bar while editing text.
  const showTextFormatToolbar =
    Boolean(editingTextBlockId) &&
    !isCapturing &&
    (isKeyboardVisible || Platform.OS === 'web');

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

  /** Space above the format toolbar so the inline editor is not covered. */
  const editingInputMarginBottom = useMemo(() => {
    if (Platform.OS === 'web') {
      return webToolbarInputMarginBottom;
    }
    if (!editingTextBlockId || isCapturing) {
      return 0;
    }
    if (!isKeyboardVisible) {
      return Math.max(formatToolbarHeight, 72) + 8;
    }
    return Math.max(formatToolbarHeight, 72) + 12;
  }, [
    webToolbarInputMarginBottom,
    editingTextBlockId,
    isCapturing,
    isKeyboardVisible,
    formatToolbarHeight,
  ]);

  /** Safe-area padding under the format bar (keyboard lift uses `bottom` on Android). */
  const formatToolbarSafeBottom = Math.max(bottom, 8);

  useEffect(() => {
    const onShow = () => {
      setIsKeyboardVisible(true);
    };
    const onHide = () => {
      setIsKeyboardVisible(false);
      setSelectedFormat(null);
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
    requestAnimationFrame(() => {
      if (editingInputRef.current?.focus) editingInputRef.current.focus();
    });
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

    // Use the live stage size (keyboard still up) so Y matches where the user typed.
    const stageHForFinish =
      stageLayoutRef.current.height > 0
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
    const targetY =
      fieldLayout?.y != null
        ? fieldLayout.y
        : getDefaultTextBlockY(stageHForFinish, inputH);

    setTextBlocks(prev => {
      const cur = prev.find(b => b.id === blockId);
      const text = capturedText || String(cur?.text ?? '').trim();
      if (!text) {
        return prev.filter(b => b.id !== blockId);
      }
      const isNew = cur?.x === null || cur?.x === undefined;
      const hadY = cur?.y != null && cur?.y !== undefined;
      const nextPos = clampTextBlockPosition(
        isNew ? STAGE_TEXT_PAD_LEFT : (cur?.x ?? STAGE_TEXT_PAD_LEFT),
        hadY ? cur.y : targetY,
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
              color: selectedColor,
              textStyleIndex: selectedTextStyleIndex,
              align: textAlignMode,
              x: nextPos.x,
              y: nextPos.y,
            }
          : b,
      );
    });

    editingFieldLayoutRef.current = null;
    editingTextDraftRef.current = '';
    setEditingTextBlockId(null);
    isFinishingEditRef.current = false;
    editingInputRef.current?.blur?.();
    Keyboard.dismiss();
  };

  const getSliderOffsetFromSize = size => {
    const normalized = clamp(
      (size - MIN_FONT_SIZE) / (MAX_FONT_SIZE - MIN_FONT_SIZE),
      0,
      1,
    );
    return Math.round((1 - normalized) * fontSizeTravel);
  };

  const updateFontSizeFromSliderY = locationY => {
    if (!editingTextBlockId) return;
    const offset = clamp(
      locationY - POLYGON_KNOB_SIZE / 2,
      0,
      Math.max(fontSizeTravel, 1),
    );
    const normalized = 1 - offset / Math.max(fontSizeTravel, 1);
    const nextSize = Math.round(
      MIN_FONT_SIZE + normalized * (MAX_FONT_SIZE - MIN_FONT_SIZE),
    );
    syncEditingToBlock({fontSize: nextSize});
  };

  const beginEditTextBlock = id => {
    const block = textBlocks.find(b => b.id === id);
    if (!block) return;
    const initialText = block.text ?? '';
    editingTextDraftRef.current = initialText;
    setEditingTextBlockId(id);
    setSelectedTextStyleIndex(block.textStyleIndex ?? 0);
    setSelectedColor(block.color ?? COLOR_PAGES[0][0]);
    setTextAlignMode(block.align ?? 'center');
    setSelectedFormat('aa');
    requestAnimationFrame(() => {
      if (editingInputRef.current?.focus) editingInputRef.current.focus();
    });
  };

  const updateBlockPosition = (id, x, y) => {
    const sw = stageLayoutRef.current.width || stageLayout.width || 300;
    const sh =
      maxStageHeightRef.current ||
      stageLayoutRef.current.height ||
      stageLayout.height ||
      300;
    const clamped = clampTextBlockPosition(
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
    const newBlock = {
      id,
      text: '',
      color: selectedColor,
      textStyleIndex: selectedTextStyleIndex,
      fontSize: DEFAULT_FONT_SIZE,
      align: 'center',
      x: null,
      y: null,
      stackOrder: nextStackOrderRef.current++,
    };
    setTextBlocks(prev => [...prev, newBlock]);
    editingTextDraftRef.current = '';
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
    isFinishingEditRef.current = false;
    setSelectedFormat(null);
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
      setMediaImages(prev => [
        ...prev,
        {
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          uri: asset.uri,
          stackOrder: nextStackOrderRef.current++,
        },
      ]);
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topNav, {paddingTop: top}]}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.backBtn}
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
          accessibilityLabel="פרסם והעלה"
          style={[
            styles.publishBtn,
            !canPublish && !publishing && styles.publishBtnMuted,
          ]}>
          <Image
            source={require('../assets/camera/postbutton.png')}
            style={styles.publishBtnImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
      <View
        ref={postPreviewRef}
        nativeID="post-editor-preview-root"
        collapsable={false}
        style={styles.backgroundContainer}>
        {backgroundVideoAsset?.uri ? (
          <Video
            source={{uri: backgroundVideoAsset.uri}}
            style={styles.backgroundVideo}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted={false}
            volume={1.0}
            useNativeControls={Platform.OS === 'web'}
          />
        ) : backgroundImageUri ? (
          <Image
            source={{uri: backgroundImageUri}}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={selectedBackgroundGradient}
            start={{x: 0, y: 0.5}}
            end={{x: 1, y: 0.5}}
            style={styles.backgroundGradient}
          />
        )}
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
                  {activeTab !== TAB_CAMERA && (
                    <TouchableOpacity
                      style={styles.colorToggleButton}
                      onPress={() => {
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
            <View
              style={[
                styles.stageColumn,
                showTextFormatToolbar && {
                  paddingBottom:
                    formatToolbarHeight + (keyboardInset > 0 ? keyboardInset : 0),
                },
              ]}>
              <View
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
                            <View
                              style={styles.polygonSliderContainer}
                              pointerEvents="box-none">
                              <View
                                style={styles.polygonTrack}
                                onStartShouldSetResponder={() => true}
                                onMoveShouldSetResponder={() => true}
                                onResponderGrant={e =>
                                  updateFontSizeFromSliderY(
                                    e.nativeEvent.locationY,
                                  )
                                }
                                onResponderMove={e =>
                                  updateFontSizeFromSliderY(
                                    e.nativeEvent.locationY,
                                  )
                                }>
                                <Image
                                  source={require('../assets/editors/polygon.png')}
                                  style={styles.polygonIndicator}
                                />
                                <View
                                  pointerEvents="none"
                                  style={[
                                    styles.polygonKnob,
                                    {
                                      top: getSliderOffsetFromSize(
                                        editingFontSize,
                                      ),
                                    },
                                  ]}
                                />
                              </View>
                            </View>
                            <View
                              onLayout={e => {
                                editingFieldLayoutRef.current =
                                  e.nativeEvent.layout;
                              }}
                              style={[
                                styles.editingInputRow,
                                {marginBottom: editingInputMarginBottom},
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
                                    textAlign: textAlignMode,
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
                                  // Multiline keyboard "Done" on Android/iOS usually blurs
                                  // without firing onSubmitEditing — commit on blur instead.
                                  if (Platform.OS !== 'web') {
                                    requestAnimationFrame(() =>
                                      finishEditing(),
                                    );
                                  }
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
                  <View style={styles.textStylesRow}>
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
                  </View>
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
                          {pageColors.map(color => (
                            <TouchableOpacity
                              key={color}
                              style={[
                                styles.colorSwatchOuter,
                                {
                                  backgroundColor: color,
                                  borderWidth: selectedColor === color ? 2 : 1,
                                },
                              ]}
                              onPress={() => {
                                setSelectedColor(color);
                                syncEditingToBlock({color});
                              }}
                            />
                          ))}
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
                      setSelectedFormat(prev =>
                        prev === 'color' ? null : 'color',
                      );
                      setColorPageIndex(0);
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
                      syncEditingToBlock({align: next});
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
  editorKeyboardAvoid: {
    flex: 1,
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
    width: 76,
    height: 30,
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
    justifyContent: 'center',
    paddingHorizontal: 8,
    zIndex: 999999,
    elevation: 999999,
  },
  polygonSliderContainer: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 40,
    height: POLYGON_TRACK_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000000,
    elevation: 1000000,
  },
  polygonTrack: {
    width: 32,
    height: POLYGON_TRACK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  editingInputRow: {
    width: '100%',
    paddingLeft: STAGE_TEXT_PAD_LEFT,
    paddingRight: STAGE_TEXT_PAD_RIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
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
    elevation: 24,
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
  textStylesRow: {
    marginHorizontal: 22,
    marginBottom: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#27262F66',
    marginHorizontal: 2,
  },
  textStylePillActive: {
    backgroundColor: '#FFFFFF',
  },
  textStylePillText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Rubik-Regular',
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
    backgroundColor: 'red',
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
