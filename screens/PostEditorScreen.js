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
  toSubscriptionId,
} from '../utils/api';
import {forceLtrStyle} from '../utils/rtlLayout';

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
  return kind === 'video' || mime.startsWith('video/') || VIDEO_EXT_REGEX.test(uri);
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
 * - Fully UNCONTROLLED (uses defaultValue) — on Android, controlled
 *   multiline TextInputs can drop typed characters when the parent
 *   re-renders. Uncontrolled avoids this entirely.
 * - Tracks the latest text in a ref (updated from BOTH onChangeText and
 *   onChange) so finishEditing can read it via getText().
 * - Reads the underlying native input value as a last-resort fallback so
 *   we never lose what the user actually typed.
 */
const EditingTextBox = forwardRef(
  ({initialText, onTextChange, ...inputProps}, ref) => {
    const initial = String(initialText ?? '');
    const textRef = useRef(initial);
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
          const fromRef = textRef.current;
          if (fromRef && String(fromRef).length > 0) return String(fromRef);
          // Fallback to whatever the native input currently shows
          const native = readNativeValue();
          if (native && String(native).length > 0) return String(native);
          return String(fromRef ?? '');
        },
        focus: () => inputRef.current?.focus?.(),
        blur: () => inputRef.current?.blur?.(),
      }),
      [],
    );

    const handleText = next => {
      const v = String(next ?? '');
      textRef.current = v;
      onTextChange?.(v);
    };

    return (
      <TextInput
        {...inputProps}
        ref={inputRef}
        defaultValue={initial}
        onChangeText={handleText}
        onChange={e => {
          const t = e?.nativeEvent?.text;
          if (typeof t === 'string') handleText(t);
        }}
      />
    );
  },
);

const DraggableTextBlock = React.memo(
  ({
    block,
    stageWidth,
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
    // Tracks whether initial alignment-based positioning has been applied
    const hasAligned = useRef(false);

    // block.x === null means "needs alignment computation on first layout"
    const initialX =
      block.x === null
        ? Math.max(0, (stageWidth > 0 ? stageWidth : 300) / 2 - 75)
        : (block.x ?? 0);

    const position = useRef(
      new Animated.ValueXY({x: initialX, y: block.y ?? 0}),
    ).current;

    useEffect(() => {
      hasAligned.current = false;
      const sw = stageWidth > 0 ? stageWidth : 300;
      const nextX =
        block.x === null || block.x === undefined
          ? Math.max(0, sw / 2 - 75)
          : block.x;
      const nextY = block.y ?? 0;
      position.setValue({x: nextX, y: nextY});
    }, [block.id, block.x, block.y, stageWidth]);

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
            onUpdatePositionRef.current(
              block.id,
              position.x._value,
              position.y._value,
            );
          }
        },
      }),
    ).current;

    const handleLayout = e => {
      if (hasAligned.current) return;
      // Skip alignment while the block is being edited. During edit the
      // visible Text is empty (opacity 0, text="") so wrapper width is just
      // padding — aligning here would commit a wrong x/y and pin the block
      // to (0,0) once Done is pressed. Defer until the block is actually
      // shown with its real text content.
      if (isBeingEdited) return;
      if (block.x !== null && block.x !== undefined) {
        hasAligned.current = true;
        return;
      }
      hasAligned.current = true;
      const blockW = e.nativeEvent.layout.width;
      const sw = stageWidth > 0 ? stageWidth : 300;
      let newX;
      if (block.align === 'center') {
        newX = (sw - blockW) / 2;
      } else if (block.align === 'right') {
        newX = sw - blockW - 10;
      } else {
        newX = 10;
      }
      position.x.setValue(newX);
      onUpdatePositionRef.current(block.id, newX, position.y._value);
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
            opacity: isBeingEdited ? 0 : 1,
            // translateX/Y — not swapped by I18nManager.swapLeftAndRightInRTL (unlike `left`/`top`)
            transform: position.getTranslateTransform(),
          },
          visual.backgroundColor !== 'transparent' && {
            backgroundColor: visual.backgroundColor,
          },
        ]}
        {...panResponder.panHandlers}>
        <Text
          style={[
            styles.centerText,
            TEXT_STYLES[block.textStyleIndex ?? 0]?.textStyle,
            {
              color: visual.textColor,
              textAlign: block.align ?? 'right',
              writingDirection: 'rtl',
              fontSize: block.fontSize ?? DEFAULT_FONT_SIZE,
              lineHeight: Math.round(
                (block.fontSize ?? DEFAULT_FONT_SIZE) * 1.15,
              ),
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
  const [textAlignMode, setTextAlignMode] = useState('right');
  const [selectedTextStyleIndex, setSelectedTextStyleIndex] = useState(0);
  const [colorPageIndex, setColorPageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(COLOR_PAGES[0][0]);
  const [selectedBackgroundGradientIndex, setSelectedBackgroundGradientIndex] =
    useState(0);
  const [colorsPagerWidth, setColorsPagerWidth] = useState(0);
  const [textBlocks, setTextBlocks] = useState([]);
  const [editingTextBlockId, setEditingTextBlockId] = useState(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showMediaSourceSheet, setShowMediaSourceSheet] = useState(false);
  const [formatToolbarHeight, setFormatToolbarHeight] = useState(72);
  const [stageLayout, setStageLayout] = useState({width: 0, height: 0});
  const postPreviewRef = useRef(null);
  const editingInputRef = useRef(null);
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
    b => (b.text && String(b.text).trim().length > 0),
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
      setIsCapturing(true);
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
      const hasVideoBackground = Boolean(backgroundVideoAsset?.uri);
      let payload;
      let folder;

      if (hasVideoBackground) {
        payload = {
          uri: backgroundVideoAsset.uri,
          type: backgroundVideoAsset.mimeType || 'video/mp4',
          name:
            backgroundVideoAsset.fileName ||
            `${publishTarget === 'story' ? 'story' : 'post'}_${Date.now()}${inferVideoExtension(backgroundVideoAsset)}`,
        };
        folder = publishTarget === 'story' ? 'stories/videos' : 'listings/videos';
      } else {
        let captureUri;
        if (Platform.OS === 'web') {
          const el = resolvePostPreviewDomNode(
            postPreviewRef,
            'post-editor-preview-root',
          );
          if (!el) {
            throw new Error('לא ניתן לצלם את התצוגה בדפדפן');
          }
          captureUri = await capturePostPreviewToDataUrl(
            el,
            publishTarget === 'story'
              ? {minShortSidePx: 1440, jpegQuality: 0.96, maxScale: 4}
              : {minShortSidePx: 1080, jpegQuality: 0.94, maxScale: 4},
          );
        } else {
          captureUri = await captureRef(postPreviewRef.current, {
            format: 'jpg',
            quality: publishTarget === 'story' ? 0.95 : 0.9,
            result: 'tmpfile',
          });
        }

        payload = {
          uri: captureUri,
          type: 'image/jpeg',
          name: `${publishTarget === 'story' ? 'story' : 'post'}_${Date.now()}.jpg`,
        };
        folder = publishTarget === 'story' ? 'stories/images' : 'listings/images';
      }

      const uploadResult = await uploadFile(payload, folder);
      const url = uploadResult?.url;
      if (!url) {
        throw new Error('העלאה הצליחה בלי כתובת קובץ');
      }

      const subId = toSubscriptionId(currentUser?.id);
      if (!subId) {
        Alert.alert(
          'לא ניתן לפרסם',
          'נדרש חשבון מנוי מאומת (עם מזהה מנוי) כדי לפרסם.',
        );
        return;
      }

      if (publishTarget === 'story') {
        await createStory({subscription_id: subId, media_url: url});
      } else {
        await createListing({
          category: resolvedPublishCategory,
          status: 'published',
          subscriptionId: subId,
          subscriptionType: currentUser?.subscription_type || null,
          mainImageUrl: url,
          description: 'פוסט',
          feedPost: true,
          feed_post: true,
          propertyType: 'post',
          price: 0,
        });
      }

      onPublish?.({url, publishTarget});
      onClose?.();
    } catch (error) {
      console.log('handlePublish error:', error);
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

  useEffect(() => {
    const onShow = () => {
      setIsKeyboardVisible(true);
    };
    const onHide = () => {
      setIsKeyboardVisible(false);
      setSelectedFormat(null);
    };

    // iOS: willShow/willHide gives smoother & reliable coordinates
    const showSub = Keyboard.addListener('keyboardWillShow', onShow);
    const hideSub = Keyboard.addListener('keyboardWillHide', onHide);
    // Android: willShow isn't always fired
    const showSub2 = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub2 = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      showSub?.remove?.();
      hideSub?.remove?.();
      showSub2?.remove?.();
      hideSub2?.remove?.();
    };
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

  const readLatestEditingText = () => {
    const fromBox = editingInputRef.current?.getText?.();
    if (fromBox != null && String(fromBox).length > 0) {
      return String(fromBox);
    }
    return String(editingTextDraftRef.current ?? '');
  };

  const finishEditing = () => {
    if (!editingTextBlockId) return;
    const blockId = editingTextBlockId;

    // CRITICAL: Capture text into a local variable BEFORE any setState calls.
    // React 18 batches state updates so updater functions run AFTER this
    // event handler returns. By then refs may have been cleared. Closing
    // over a local variable guarantees the captured value is preserved.
    const capturedText = readLatestEditingText().trim();

    isFinishingEditRef.current = true;

    // Prefer the largest stage height we've ever measured (i.e. before the
    // keyboard opened). At Done time the keyboard is still up, so
    // stageLayoutRef.current.height is the smaller, keyboard-shrunken value.
    // Using that would place the text near the top of the full-size stage.
    const stageH =
      maxStageHeightRef.current > 0
        ? maxStageHeightRef.current
        : stageLayoutRef.current.height > 0
          ? stageLayoutRef.current.height
          : stageLayout.height > 0
            ? stageLayout.height
            : 300;

    setTextBlocks(prev => {
      const cur = prev.find(b => b.id === blockId);
      const text = capturedText || String(cur?.text ?? '').trim();
      if (!text) {
        return prev.filter(b => b.id !== blockId);
      }
      const isNew = cur?.x === null || cur?.x === undefined;
      const hadY = cur?.y != null && cur?.y !== undefined;
      return prev.map(b =>
        b.id === blockId
          ? {
              ...b,
              text,
              color: selectedColor,
              textStyleIndex: selectedTextStyleIndex,
              align: textAlignMode,
              x: isNew ? (textAlignMode === 'left' ? 10 : null) : b.x,
              y: hadY
                ? b.y
                : isNew
                  ? Math.max(24, Math.min(stageH * 0.42, stageH - 72))
                  : b.y,
            }
          : b,
      );
    });

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
    setTextAlignMode(block.align ?? 'right');
    setSelectedFormat('aa');
    requestAnimationFrame(() => {
      if (editingInputRef.current?.focus) editingInputRef.current.focus();
    });
  };

  const updateBlockPosition = (id, x, y) => {
    setTextBlocks(prev => prev.map(b => (b.id === id ? {...b, x, y} : b)));
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
      const requested =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
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
          console.log('runCameraTabMediaAction web error:', e);
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
          console.log('runCameraTabMediaAction error:', e);
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
    isFinishingEditRef.current = false;
    setSelectedFormat(null);
    setTextModeOverlayText('');
    setTextContent('');
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
    } catch (e) {
      console.log('pickBackgroundImageFromGallery error:', e);
    }
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
        {activeTab === TAB_CAMERA && backgroundVideoAsset?.uri ? (
          <Video
            source={{uri: backgroundVideoAsset.uri}}
            style={styles.backgroundVideo}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted
            useNativeControls={Platform.OS === 'web'}
          />
        ) : activeTab === TAB_CAMERA && backgroundImageUri ? (
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
          keyboardVerticalOffset={0}>
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
                {editingTextBlockId && (
                  <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={finishEditing}>
                    <Text style={styles.doneBtnText}>Done</Text>
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
          <View style={styles.stageColumn}>
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
                style={[styles.editingOverlay, styles.stageLtrDirection]}
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
                            updateFontSizeFromSliderY(e.nativeEvent.locationY)
                          }
                          onResponderMove={e =>
                            updateFontSizeFromSliderY(e.nativeEvent.locationY)
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
                                top: getSliderOffsetFromSize(editingFontSize),
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <View
                        style={[
                          styles.editingInputRow,
                          {
                            alignSelf:
                              textAlignMode === 'left'
                                ? 'flex-start'
                                : textAlignMode === 'right'
                                  ? 'flex-end'
                                  : 'center',
                            marginBottom: editingInputMarginBottom,
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
                            TEXT_STYLES[selectedTextStyleIndex]?.textStyle,
                            {
                              color: visual.textColor,
                              backgroundColor: visual.backgroundColor,
                              textAlign: textAlignMode,
                              writingDirection: 'rtl',
                              fontSize: editingFontSize,
                              lineHeight: Math.round(editingFontSize * 1.15),
                            },
                          ]}
                          multiline
                          textAlignVertical="center"
                          autoCorrect
                          autoCapitalize="sentences"
                          returnKeyType="done"
                          onSubmitEditing={finishEditing}
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
                {
                  paddingBottom:
                    Platform.OS === 'web'
                      ? Math.max(bottom, 10)
                      : Math.max(bottom, 8),
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
                            Math.max(e.nativeEvent.layoutMeasurement.width, 1),
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
                        colorPageIndex === index && styles.paginationDotActive,
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
                    <View style={[styles.alignLine, styles.alignLineMedium]} />
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
            style={[styles.mediaSheetCard, {paddingBottom: Math.max(bottom, 28)}]}
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
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    paddingVertical: 5,
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
    right: -28,
    top: 10,
    width: 40,
    height: POLYGON_TRACK_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  polygonTrack: {
    width: 32,
    height: POLYGON_TRACK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  editingInputRow: {
    width: '100%',
    maxWidth: 620,
    flexDirection: 'row-reverse',
    alignItems: 'center',
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
    flex: 1,
    minHeight: 90,
    maxWidth: 560,
    fontSize: 20,
    lineHeight: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    writingDirection: 'rtl',
    paddingHorizontal: 20,
    borderRadius: 20,
    paddingVertical: 12,
  },
  keyboardControls: {
    width: '100%',
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
    marginBottom: 26,
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
