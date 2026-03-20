import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Keyboard,
  Dimensions,
  Platform,
  Animated,
  PanResponder,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {captureRef} from 'react-native-view-shot';
import {uploadFile} from '../utils/api';

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

const DraggableTextBlock = React.memo(
  ({
    block,
    stageWidth,
    selectedColor,
    zIndex,
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
      hasAligned.current = true;
      // Only recompute if this is a freshly placed block (x was null)
      if (block.x !== null && block.x !== undefined) return;
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
            left: position.x,
            top: position.y,
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
              textAlign: block.align ?? 'center',
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
          left: animX,
          top: animY,
          transform: [{scale: animScale}],
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

const PostEditorScreen = ({onClose}) => {
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
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [textAlignMode, setTextAlignMode] = useState('left');
  const [selectedTextStyleIndex, setSelectedTextStyleIndex] = useState(0);
  const [colorPageIndex, setColorPageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(COLOR_PAGES[0][0]);
  const [selectedBackgroundGradientIndex, setSelectedBackgroundGradientIndex] =
    useState(0);
  const [colorsPagerWidth, setColorsPagerWidth] = useState(0);
  const [textBlocks, setTextBlocks] = useState([]);
  const [editingTextBlockId, setEditingTextBlockId] = useState(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [stageLayout, setStageLayout] = useState({width: 0, height: 0});
  const postPreviewRef = useRef(null);
  const editingInputRef = useRef(null);
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

  const handlePublish = async () => {
    if (publishing || !canPublish) return;

    try {
      setPublishing(true);
      setIsCapturing(true);
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
      const captureUri = await captureRef(postPreviewRef.current, {
        format: 'jpg',
        quality: 0.9,
        result: 'tmpfile',
      });

      const payload = {
        uri: captureUri,
        type: 'image/jpeg',
        name: `post_${Date.now()}.jpg`,
      };

      await uploadFile(payload, 'listings/images');
      onClose?.();
    } catch (error) {
      console.log('handlePublish error:', error);
    } finally {
      setIsCapturing(false);
      setPublishing(false);
    }
  };

  const canPublish =
    Boolean(backgroundImageUri) ||
    mediaImages.length > 0 ||
    (activeTab === TAB_TEXT ? textModeOverlayText : textContent.trim());

  const selectedBackgroundGradient = useMemo(() => {
    const fallback = BACKGROUND_GRADIENTS[0];
    return BACKGROUND_GRADIENTS[selectedBackgroundGradientIndex] ?? fallback;
  }, [selectedBackgroundGradientIndex]);

  const editingBlock = useMemo(
    () => textBlocks.find(b => b.id === editingTextBlockId) || null,
    [textBlocks, editingTextBlockId],
  );

  useEffect(() => {
    const onShow = e => {
      setIsKeyboardVisible(true);
      const winH = Dimensions.get('window')?.height ?? 0;
      const screenY = e?.endCoordinates?.screenY;
      const height = e?.endCoordinates?.height;
      const insetFromScreenY =
        Number.isFinite(winH) && Number.isFinite(screenY)
          ? Math.max(0, winH - screenY)
          : 0;
      const insetFromHeight = Number.isFinite(height) ? height : 0;
      const inset = Math.max(insetFromScreenY, insetFromHeight, 0);
      setKeyboardInset(inset);
    };
    const onHide = () => {
      setIsKeyboardVisible(false);
      setKeyboardInset(0);
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

  useEffect(() => {
    if (!editingTextBlockId) return;
    const input = editingInputRef.current;
    if (!input || typeof input.setNativeProps !== 'function') return;
    const baseColor = editingBlock?.color ?? selectedColor;
    const mode = editingBlock?.bgMode ?? 0;
    const currentFontSize = editingBlock?.fontSize ?? DEFAULT_FONT_SIZE;
    const {textColor} = getTextVisualStyle(baseColor, mode);
    input.setNativeProps({
      style: {
        color: textColor,
        textAlign: textAlignMode,
        fontSize: currentFontSize,
        lineHeight: Math.round(currentFontSize * 1.15),
        ...(TEXT_STYLES[selectedTextStyleIndex]?.textStyle ?? {}),
      },
    });
  }, [
    editingTextBlockId,
    editingBlock,
    selectedColor,
    textAlignMode,
    selectedTextStyleIndex,
  ]);

  const syncEditingToBlock = partial => {
    if (!editingTextBlockId) return;
    setTextBlocks(prev =>
      prev.map(b => (b.id === editingTextBlockId ? {...b, ...partial} : b)),
    );
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
    setEditingTextBlockId(id);
    setSelectedTextStyleIndex(block.textStyleIndex ?? 0);
    setSelectedColor(block.color ?? COLOR_PAGES[0][0]);
    setTextAlignMode(block.align ?? 'left');
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
    setEditingTextBlockId(id);
    setSelectedFormat('aa');
    requestAnimationFrame(() => {
      if (editingInputRef.current?.focus) editingInputRef.current.focus();
    });
  };

  const finishEditing = () => {
    if (!editingTextBlockId) return;
    const stageH = stageLayout.height > 0 ? stageLayout.height : 300;
    setTextBlocks(prev => {
      const cur = prev.find(b => b.id === editingTextBlockId);
      const text = (cur?.text ?? '').trim();
      if (!text) return prev.filter(b => b.id !== editingTextBlockId);
      const isNew = cur?.x === null || cur?.x === undefined;
      return prev.map(b =>
        b.id === editingTextBlockId
          ? {
              ...b,
              text,
              color: selectedColor,
              textStyleIndex: selectedTextStyleIndex,
              align: textAlignMode,
              // New block: left is exact, center/right measured by DraggableTextBlock onLayout
              x: isNew ? (textAlignMode === 'left' ? 10 : null) : b.x,
              y: isNew ? stageH / 2 - 15 : b.y,
            }
          : b,
      );
    });
    setEditingTextBlockId(null);
    Keyboard.dismiss();
  };

  const applyBackgroundImage = uri => {
    if (!uri) return;
    setBackgroundImageUri(uri);
  };

  const clearAllEditorState = () => {
    setBackgroundImageUri(null);
    setMediaImages([]);
    setTextBlocks([]);
    setEditingTextBlockId(null);
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
        mediaTypes: 'Images',
        allowsEditing: false,
        quality: 1,
      });

      // Keep existing background when user cancels.
      if (result?.canceled) return;
      const asset = result?.assets?.[0];
      if (!asset?.uri) return;
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

  const openCameraAndSetBackground = async () => {
    try {
      if (activeTab !== TAB_CAMERA) {
        clearAllEditorState();
      }
      setActiveTab(TAB_CAMERA);
      if (Platform.OS !== 'web') {
        const existing = await ImagePicker.getCameraPermissionsAsync();
        let status = existing?.status;
        if (status !== 'granted') {
          const requested = await ImagePicker.requestCameraPermissionsAsync();
          status = requested?.status;
        }
        if (status !== 'granted') return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'Images',
        allowsEditing: false,
        quality: 1,
      });

      if (result?.canceled) return;
      if (activeTabRef.current !== TAB_CAMERA) return;
      const asset = result?.assets?.[0];
      if (!asset?.uri) return;
      applyBackgroundImage(asset.uri);
    } catch (e) {
      console.log('openCameraAndSetBackground error:', e);
    }
  };

  return (
    <View style={[styles.container]}>
      <View
        style={{
          backgroundColor: '#1E1D27',
          paddingTop: top,
          paddingBottom: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
        }}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.backBtn}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.tabs}>
          <TouchableOpacity onPress={openCameraAndSetBackground}>
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
          disabled={publishing || !canPublish}
          style={[styles.publishBtn, !canPublish && styles.publishBtnDisabled]}>
          <Image
            source={require('../assets/camera/postbutton.png')}
            style={styles.publishBtnImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
      <View
        ref={postPreviewRef}
        collapsable={false}
        style={styles.backgroundContainer}>
        {activeTab === TAB_CAMERA && backgroundImageUri ? (
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
          <View
            style={styles.stage}
            onLayout={e => setStageLayout(e.nativeEvent.layout)}>
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
            {textBlocks
              .filter(b => b.id !== editingTextBlockId)
              .map((block, idx) => (
                <DraggableTextBlock
                  key={block.id}
                  block={block}
                  stageWidth={stageLayout.width}
                  selectedColor={selectedColor}
                  zIndex={block.stackOrder ?? idx + 1}
                  onPress={() => beginEditTextBlock(block.id)}
                  onUpdatePosition={updateBlockPosition}
                  onBringToFront={bringTextBlockToFront}
                />
              ))}

            {editingTextBlockId && !isCapturing && (
              <View style={styles.editingOverlay} pointerEvents="box-none">
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

                      <TextInput
                        ref={editingInputRef}
                        value={
                          textBlocks.find(b => b.id === editingTextBlockId)
                            ?.text ?? ''
                        }
                        onChangeText={t => syncEditingToBlock({text: t})}
                        placeholder="Type something..."
                        placeholderTextColor="rgba(255,255,255,0.55)"
                        selectionColor={visual.textColor}
                        style={[
                          styles.editingTextInput,
                          TEXT_STYLES[selectedTextStyleIndex]?.textStyle,
                          {
                            color: visual.textColor,
                            backgroundColor: visual.backgroundColor,
                            textAlign: textAlignMode,
                            fontSize: editingFontSize,
                            alignSelf:
                              textAlignMode === 'left'
                                ? 'flex-start'
                                : textAlignMode === 'right'
                                  ? 'flex-end'
                                  : 'center',
                            marginBottom: isKeyboardVisible ? 400 : 0,
                          },
                        ]}
                        multiline
                        textAlignVertical="center"
                        autoCorrect
                        autoCapitalize="sentences"
                        returnKeyType="done"
                        onSubmitEditing={finishEditing}
                      />
                    </>
                  );
                })()}
              </View>
            )}
          </View>

          {isKeyboardVisible && editingTextBlockId && !isCapturing && (
            <View
              style={[
                styles.keyboardControls,
                {bottom: keyboardInset, paddingBottom: 5},
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
      </View>
    </View>
  );
};

export default PostEditorScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backgroundContainer: {
    flex: 1,
    position: 'relative',
  },
  editorRoot: {
    flex: 1,
    position: 'relative',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  backArrow: {
    color: '#fff',
    fontSize: 32,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
  },
  headerContainer: {
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    left: -28,
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
    flexDirection: 'row',
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
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    paddingVertical: 5,
  },
  keyboardControls: {
    position: 'absolute',
    left: 0,
    right: 0,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorsRow: {
    marginHorizontal: 22,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyedropperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  eyedropperInner: {
    width: 28,
    height: 28,
  },
  colorsList: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
  },
  colorsPager: {
    flex: 1,
  },
  colorsListPage: {
    flexDirection: 'row',
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
});
