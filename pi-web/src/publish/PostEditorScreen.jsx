import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {mdiChevronLeft} from '@mdi/js';
import MdiIcon from './MdiIcon';
import PostTargetProfessionalsSheet from './components/PostTargetProfessionalsSheet';
import OpenHouseDetailsModal from './components/OpenHouseDetailsModal';
import {uploadFile, createListing, updateListing, createStory} from '../api/listingsPublish';
import {deleteActiveStoriesByMediaUrl, deleteActiveStoriesByFeedListingId} from '../api/stories';
import {resolvePublisherIdentityForSave} from './lib/listingPublisherIdentity';
import {
  DEFAULT_POST_DESCRIPTION,
  isReservedPostDescription,
  OPEN_HOUSE_POST_DESCRIPTION,
  OPEN_HOUSE_POST_KIND,
  OPEN_HOUSE_PLACE_KEY,
  OPEN_HOUSE_DATE_KEY,
  getOpenHouseDetailsFromListing,
  isB2BSubscriptionType,
  mobileAsset,
} from './lib/publishRules';
import {
  FEED_POST_LISTING_ID_KEY,
  parsePostTextOverlayPayload,
  parsePostEditorRestoreInfo,
  extractPostListingMediaUrls,
  POST_BACKGROUND_GRADIENTS,
  shouldUseLiveColorPostBackground,
} from './lib/postTextOverlay';
import {
  serializePostTextOverlays,
  buildPostTextGeneralDetails,
  parseListingHashtagsForEditor,
  hydratePostEditorBlocksFromOverlays,
} from './lib/postTextOverlayEditor';
import {capturePostPreviewToDataUrl, measureCssBox, resolvePostPreviewDomNode} from './lib/capturePostPreview';
import {GOLD_GRADIENT_COLORS, GOLD_GRADIENT_LOCATIONS} from './lib/goldGradient';
import {gradientCss} from './lib/rnStyle';
import styles from './PostEditorScreen.module.css';

const TAB_TEXT = 'טקסט';
const TAB_CAMERA = 'מצלמה';
const FORMAT_SELECTED_GRADIENT = gradientCss({
  colors: ['#FFE56A', '#F7C63A', '#E5A80F'],
  start: {x: 0.5, y: 0},
  end: {x: 0.5, y: 1},
});
const PROFILE_RING_CSS = gradientCss({
  colors: GOLD_GRADIENT_COLORS,
  locations: GOLD_GRADIENT_LOCATIONS,
  start: {x: 0, y: 0.5},
  end: {x: 1, y: 0.5},
});
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 50;
const DEFAULT_FONT_SIZE = 20;
const POLYGON_TRACK_HEIGHT = 200;
const POLYGON_KNOB_SIZE = 20;
const POLYGON_FONT_SIZE_TRAVEL = POLYGON_TRACK_HEIGHT - POLYGON_KNOB_SIZE;
const STAGE_TEXT_PAD_Y = 12;
const STAGE_TEXT_PAD_LEFT = 2;
const STAGE_TEXT_PAD_RIGHT = 2;
const TEXT_BLOCK_TAP_MOVE_PX = 8;
const TEXT_BLOCK_TOUCH_PAD = 24;
const DEFAULT_TEXT_COLOR = '#FFFFFF';

const TEXT_STYLES = [
  {label: 'סטייל 1', fontFamily: "'Secular One', sans-serif", fontWeight: 400},
  {label: 'סטייל 2', fontFamily: "'IBM Plex Sans Hebrew', sans-serif", fontWeight: 700},
  {label: 'סטייל 3', fontFamily: 'Rubik, sans-serif', fontWeight: 800},
  {label: 'סטייל 4', fontFamily: 'Rubik, sans-serif', fontWeight: 400},
  {label: 'סטייל 5', fontFamily: 'Alef, sans-serif', fontWeight: 400},
  {label: 'סטייל 6', fontFamily: "'Noto Sans', sans-serif", fontWeight: 400},
];

const COLOR_PAGES = [
  ['#FFFFFF', '#DBDBDB', '#C7C7C7', '#B2B2B2', '#999999', '#7C7C7C', '#666666', '#353535', '#000000'],
  ['#CC001E', '#FF3250', '#FF9C4C', '#FFD037', '#83D954', '#20C5B0', '#00A352', '#0099F7', '#325BED'],
  ['#D16FFF', '#FD7F8D', '#FFCFD2', '#FFDAB0', '#FFBF77', '#A3612F', '#BC5100', '#730003', '#470C0D'],
];

const BACKGROUND_GRADIENTS = POST_BACKGROUND_GRADIENTS;

const closeIconSrc = mobileAsset('editors/close.png');
const galleryIconSrc = mobileAsset('editors/gallery.png');
const polygonSrc = mobileAsset('editors/polygon.png');
const penIconSrc = mobileAsset('editors/penIcon.png');
const formatIconSrc = mobileAsset('editors/Action-icons.png');
const formatIconSelectedSrc = mobileAsset('editors/Action-icons-selected.png');
const publishBtnSrc = mobileAsset('post-button.png');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const fontSizeToSliderOffset = size => {
  const normalized = clamp((size - MIN_FONT_SIZE) / (MAX_FONT_SIZE - MIN_FONT_SIZE), 0, 1);
  return Math.round((1 - normalized) * POLYGON_FONT_SIZE_TRAVEL);
};

const sliderPageYToFontSize = (pageY, trackPageY, trackHeight) => {
  const visualTravel = Math.max((trackHeight || POLYGON_TRACK_HEIGHT) - POLYGON_KNOB_SIZE, 1);
  const relativeY = pageY - trackPageY;
  const offset = clamp(relativeY - POLYGON_KNOB_SIZE / 2, 0, visualTravel);
  const normalized = 1 - offset / visualTravel;
  return Math.round(MIN_FONT_SIZE + normalized * (MAX_FONT_SIZE - MIN_FONT_SIZE));
};

const getColorPageIndexForColor = color => {
  const target = String(color || DEFAULT_TEXT_COLOR).toUpperCase();
  const pageIndex = COLOR_PAGES.findIndex(page => page.some(c => String(c).toUpperCase() === target));
  return pageIndex >= 0 ? pageIndex : 0;
};

const createTextBlockId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const VIDEO_EXT_REGEX = /\.(mp4|mov|m4v|webm|ogg|ogv)$/i;

const isVideoAsset = asset => {
  const kind = String(asset?.type || '').toLowerCase();
  const mime = String(asset?.mimeType || asset?.type || '').toLowerCase();
  const uri = String(asset?.uri || '');
  return kind === 'video' || mime.startsWith('video/') || VIDEO_EXT_REGEX.test(uri);
};

const inferVideoExtension = asset => {
  const uri = String(asset?.uri || '');
  const match = uri.match(VIDEO_EXT_REGEX);
  if (match?.[1]) return `.${String(match[1]).toLowerCase()}`;
  const mime = String(asset?.mimeType || asset?.type || '').toLowerCase();
  if (mime === 'video/webm') return '.webm';
  if (mime === 'video/ogg') return '.ogg';
  if (mime === 'video/quicktime') return '.mov';
  return '.mp4';
};

const inferImageMimeFromUri = uri => {
  const lower = String(uri || '').toLowerCase();
  if (lower.includes('.png') || lower.startsWith('data:image/png')) return 'image/png';
  if (lower.includes('.webp') || lower.startsWith('data:image/webp')) return 'image/webp';
  if (lower.includes('.heic') || lower.includes('.heif')) return 'image/heic';
  return 'image/jpeg';
};

const postHasTextOverlays = textBlocks =>
  Array.isArray(textBlocks) && textBlocks.some(b => String(b?.text || '').trim().length > 0);

const postHasStickerOverlays = mediaImages => Array.isArray(mediaImages) && mediaImages.length > 0;

const lightenColor = (hex, amount = 0.8) => {
  if (typeof hex !== 'string') return hex;
  let h = hex.trim();
  if (h[0] === '#') h = h.slice(1);
  if (h.length !== 6) return hex;
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return hex;
  const mix = (ch, amt) => Math.round(ch + (255 - ch) * amt);
  const toHex = v => v.toString(16).padStart(2, '0');
  return `#${toHex(mix((num >> 16) & 255, amount))}${toHex(mix((num >> 8) & 255, amount))}${toHex(mix(num & 255, amount))}`;
};

const getTextVisualStyle = (baseColor, bgMode = 0) => {
  const color = baseColor || '#FFFFFF';
  if (bgMode === 1) return {textColor: '#FFFFFF', backgroundColor: color};
  if (bgMode === 2) return {textColor: color, backgroundColor: lightenColor(color, 0.8)};
  return {textColor: color, backgroundColor: 'transparent'};
};

const physicalTextAlign = align => align;

const alignToFlexSelf = align => (align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center');

const getTextBlockBoxWidth = stageWidth =>
  Math.max(80, Math.max(1, Number(stageWidth) || 300) - STAGE_TEXT_PAD_LEFT - STAGE_TEXT_PAD_RIGHT);

const clampTextBlockPositionLoose = (x, y, blockW, blockH, stageW, stageH) => {
  const sw = Math.max(1, Number(stageW) || 1);
  const sh = Math.max(1, Number(stageH) || 1);
  const bw = Math.max(1, Number(blockW) || 1);
  const bh = Math.max(1, Number(blockH) || 1);
  return {
    x: Math.max(-bw, Math.min(Number(x) || 0, sw)),
    y: Math.max(STAGE_TEXT_PAD_Y, Math.min(Number(y) || 0, sh - bh - STAGE_TEXT_PAD_Y)),
  };
};

const getDefaultTextBlockY = (stageH, blockH = 40) => {
  const sh = Math.max(1, Number(stageH) || 1);
  const bh = Math.max(1, Number(blockH) || 1);
  return Math.max(STAGE_TEXT_PAD_Y, (sh - bh) / 2);
};

const measureNodeInWindow = node => Promise.resolve(measureCssBox(node));

const measurePostStageMapping = (previewEl, stageEl) => {
  const preview = measureCssBox(previewEl);
  const stage = measureCssBox(stageEl);
  if (!preview || !stage || !(preview.w > 0) || !(preview.h > 0) || !(stage.w > 0) || !(stage.h > 0)) {
    return Promise.resolve(null);
  }
  return Promise.resolve({
    stageOffsetX: stage.x - preview.x,
    stageOffsetY: stage.y - preview.y,
    previewWidth: preview.w,
    previewHeight: preview.h,
    stageWidth: stage.w,
    stageHeight: stage.h,
  });
};

const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));

const showAlert = (title, message) => {
  const text = message ? `${title}\n\n${message}` : title;
  window.alert(text);
};

const isRemoteMediaUri = uri => /^https?:\/\//i.test(String(uri || '').trim());

const pickedFileAsset = file => {
  const mime = String(file?.type || '');
  const isVideo = mime.startsWith('video/');
  return {
    uri: URL.createObjectURL(file),
    type: isVideo ? 'video' : 'image',
    mimeType: mime || (isVideo ? 'video/mp4' : 'image/jpeg'),
    fileName: file.name || (isVideo ? `video-${Date.now()}.mp4` : `photo-${Date.now()}.jpg`),
    name: file.name || (isVideo ? `video-${Date.now()}.mp4` : `photo-${Date.now()}.jpg`),
    file,
  };
};

const horizontalGradientCss = colors =>
  gradientCss({
    colors: Array.isArray(colors) ? colors : ['#2B2A39', '#5149C4'],
    start: {x: 0, y: 0.5},
    end: {x: 1, y: 0.5},
  });

function FontSizeSlider({value, onChange}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const trackRef = useRef(null);
  const trackRectRef = useRef({top: 0, height: POLYGON_TRACK_HEIGHT});
  const draggingRef = useRef(false);
  const [displaySize, setDisplaySize] = useState(value ?? DEFAULT_FONT_SIZE);

  useEffect(() => {
    if (!draggingRef.current) setDisplaySize(value ?? DEFAULT_FONT_SIZE);
  }, [value]);

  const measureTrack = () => {
    const node = trackRef.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    if (Number.isFinite(r.top) && r.height > 0) {
      trackRectRef.current = {top: r.top, height: r.height};
    }
  };

  const applyPageY = pageY => {
    if (!Number.isFinite(pageY)) return;
    const nextSize = sliderPageYToFontSize(pageY, trackRectRef.current.top, trackRectRef.current.height);
    setDisplaySize(nextSize);
    onChangeRef.current?.(nextSize);
  };

  const onPointerDown = e => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    measureTrack();
    applyPageY(e.clientY);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = e => {
    if (!draggingRef.current) return;
    applyPageY(e.clientY);
  };

  const onPointerUp = () => {
    draggingRef.current = false;
  };

  return (
    <div
      className={styles.polygonSlider}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}>
      <div ref={trackRef} className={styles.polygonTrack}>
        <img src={polygonSrc} alt="" className={styles.polygonIndicator} />
        <span className={styles.polygonKnob} style={{top: fontSizeToSliderOffset(displaySize)}} />
      </div>
    </div>
  );
}

const EditingTextBox = forwardRef(({initialText, onTextChange, className, style, placeholder}, ref) => {
  const initial = String(initialText ?? '');
  const textRef = useRef(initial);
  const [text, setText] = useState(initial);
  const inputRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      getText: () => {
        const fromState = String(textRef.current ?? '');
        if (fromState.length > 0) return fromState;
        const native = inputRef.current?.value;
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

  return (
    <textarea
      id="post-editor-text-input"
      ref={inputRef}
      className={className}
      style={style}
      value={text}
      placeholder={placeholder}
      rows={2}
      dir="rtl"
      onChange={e => handleText(e.target.value)}
    />
  );
});

function DraggableTextBlock({
  block,
  stageWidth,
  stageHeight,
  selectedColor,
  zIndex,
  isBeingEdited,
  onPress,
  onUpdatePosition,
  onBringToFront,
  onRegisterMeasure,
}) {
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  const onUpdatePositionRef = useRef(onUpdatePosition);
  onUpdatePositionRef.current = onUpdatePosition;
  const onBringToFrontRef = useRef(onBringToFront);
  onBringToFrontRef.current = onBringToFront;
  const isBeingEditedRef = useRef(isBeingEdited);
  isBeingEditedRef.current = isBeingEdited;
  const contentRef = useRef(null);
  const wrapperRef = useRef(null);
  const stageScaleRef = useRef(1);
  const touchStartRef = useRef({x: 0, y: 0, posX: 0, posY: 0});
  const hasMoved = useRef(false);
  const gestureActive = useRef(false);
  const blockSizeRef = useRef({w: 0, h: 0});
  const textLayoutRef = useRef({x: 0, w: 0});
  const [pos, setPos] = useState({
    x: block.x ?? STAGE_TEXT_PAD_LEFT,
    y: block.y ?? getDefaultTextBlockY(stageHeight, 40),
  });
  const posRef = useRef(pos);
  posRef.current = pos;

  const stageW = stageWidth > 0 ? stageWidth : 300;
  const stageH = stageHeight > 0 ? stageHeight : 300;
  const boxWidth = getTextBlockBoxWidth(stageW);

  const clampFreePosition = useCallback(
    (x, y) => {
      const blockH = blockSizeRef.current.h || 40;
      const clampedY = Math.max(STAGE_TEXT_PAD_Y, Math.min(Number(y) || 0, stageH - blockH - STAGE_TEXT_PAD_Y));
      const t = textLayoutRef.current;
      if (!(t.w > 0)) return {x: Number(x) || 0, y: clampedY};
      const minX = STAGE_TEXT_PAD_LEFT - t.x;
      const maxX = stageW - STAGE_TEXT_PAD_RIGHT - (t.x + t.w);
      return {
        x: Math.min(Math.max(Number(x) || 0, minX), Math.max(minX, maxX)),
        y: clampedY,
      };
    },
    [stageH, stageW],
  );

  useEffect(() => {
    if (gestureActive.current) return;
    setPos(
      clampFreePosition(block.x ?? STAGE_TEXT_PAD_LEFT, block.y ?? getDefaultTextBlockY(stageH, blockSizeRef.current.h || 40)),
    );
  }, [block.id, block.x, block.y, block.text, block.fontSize, block.align, stageWidth, stageHeight, stageH, clampFreePosition]);

  useEffect(() => {
    if (!onRegisterMeasure) return undefined;
    const id = block.id;
    onRegisterMeasure(id, () => measureNodeInWindow(contentRef.current));
    return () => onRegisterMeasure(id, null);
  }, [block.id, onRegisterMeasure]);

  const readStageScale = () => {
    const node = wrapperRef.current?.parentElement;
    if (!node) return 1;
    const r = node.getBoundingClientRect();
    return r.width > 0 ? r.width / Math.max(1, node.offsetWidth) : 1;
  };

  const endGesture = () => {
    if (isBeingEditedRef.current) {
      gestureActive.current = false;
      return;
    }
    const moved = hasMoved.current;
    gestureActive.current = false;
    hasMoved.current = false;
    onBringToFrontRef.current?.(block.id);
    if (!moved) {
      onPressRef.current?.();
      return;
    }
    const clamped = clampFreePosition(posRef.current.x, posRef.current.y);
    setPos(clamped);
    onUpdatePositionRef.current?.(block.id, clamped.x, clamped.y);
  };

  const onPointerDown = e => {
    if (isBeingEditedRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    gestureActive.current = true;
    hasMoved.current = false;
    stageScaleRef.current = readStageScale();
    touchStartRef.current = {x: e.clientX, y: e.clientY, posX: posRef.current.x, posY: posRef.current.y};
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = e => {
    if (isBeingEditedRef.current || !gestureActive.current) return;
    const scale = stageScaleRef.current || 1;
    const dx = (e.clientX - touchStartRef.current.x) / scale;
    const dy = (e.clientY - touchStartRef.current.y) / scale;
    if (Math.abs(dx) > TEXT_BLOCK_TAP_MOVE_PX || Math.abs(dy) > TEXT_BLOCK_TAP_MOVE_PX) {
      hasMoved.current = true;
    }
    if (!hasMoved.current) return;
    const next = clampFreePosition(touchStartRef.current.posX + dx, touchStartRef.current.posY + dy);
    setPos(next);
  };

  const onContentLayout = el => {
    if (!el || gestureActive.current) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (!(w > 0)) return;
    textLayoutRef.current = {x: el.offsetLeft, w};
    blockSizeRef.current = {w: boxWidth, h: h || blockSizeRef.current.h};
    const cur = posRef.current;
    const next = clampFreePosition(cur.x, cur.y);
    if (Math.abs(next.x - cur.x) > 1 || Math.abs(next.y - cur.y) > 1) {
      setPos(next);
      onUpdatePositionRef.current(block.id, next.x, next.y);
    }
  };

  const visual = getTextVisualStyle(block.color ?? selectedColor, block.bgMode ?? 0);
  const font = TEXT_STYLES[block.textStyleIndex ?? 0] || TEXT_STYLES[0];
  const fontSize = block.fontSize ?? DEFAULT_FONT_SIZE;

  return (
    <div
      ref={wrapperRef}
      className={styles.textBlock}
      style={{
        zIndex,
        width: boxWidth,
        maxWidth: boxWidth,
        left: pos.x,
        top: pos.y,
        padding: TEXT_BLOCK_TOUCH_PAD,
        opacity: isBeingEdited ? 0 : 1,
        pointerEvents: isBeingEdited ? 'none' : 'auto',
      }}
      onPointerDown={isBeingEdited ? undefined : onPointerDown}
      onPointerMove={isBeingEdited ? undefined : onPointerMove}
      onPointerUp={isBeingEdited ? undefined : endGesture}
      onPointerCancel={isBeingEdited ? undefined : endGesture}>
      {isBeingEdited ? null : (
        <div
          ref={node => {
            contentRef.current = node;
            onContentLayout(node);
          }}
          className={styles.textBlockContent}
          style={{alignSelf: alignToFlexSelf(block.align ?? 'center')}}>
          <div
            className={visual.backgroundColor !== 'transparent' ? styles.textBlockChip : undefined}
            style={visual.backgroundColor !== 'transparent' ? {backgroundColor: visual.backgroundColor} : undefined}>
            <p
              className={styles.centerText}
              dir="rtl"
              style={{
                color: visual.textColor,
                textAlign: physicalTextAlign(block.align ?? 'center'),
                fontFamily: font.fontFamily,
                fontWeight: font.fontWeight,
                fontSize,
                lineHeight: `${Math.round(fontSize * 1.15)}px`,
              }}>
              {block.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function DraggableImage({id, uri, stageWidth, stageHeight, zIndex, onBringToFront}) {
  const imageSize = Math.min(stageWidth, stageHeight) * 0.45;
  const touchPad = 40;
  const [pos, setPos] = useState({
    x: (stageWidth - imageSize) / 2 - touchPad,
    y: (stageHeight - imageSize) / 2 - touchPad,
  });
  const [scale, setScale] = useState(1);
  const dragRef = useRef({active: false, x: 0, y: 0, ox: 0, oy: 0, pointers: new Map(), pinchDist: 0, pinchScale: 1});

  const pointerList = () => [...dragRef.current.pointers.values()];

  const onPointerDown = e => {
    onBringToFront?.(id);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current.pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
    dragRef.current.active = true;
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;
    dragRef.current.ox = pos.x;
    dragRef.current.oy = pos.y;
    const all = pointerList();
    if (all.length >= 2) {
      const d = Math.hypot(all[0].x - all[1].x, all[0].y - all[1].y);
      dragRef.current.pinchDist = d;
      dragRef.current.pinchScale = scale;
    }
  };

  const onPointerMove = e => {
    if (!dragRef.current.active) return;
    dragRef.current.pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
    const all = pointerList();
    if (all.length >= 2 && dragRef.current.pinchDist > 0) {
      const d = Math.hypot(all[0].x - all[1].x, all[0].y - all[1].y);
      setScale(clamp(dragRef.current.pinchScale * (d / dragRef.current.pinchDist), 0.3, 5));
      return;
    }
    setPos({
      x: dragRef.current.ox + (e.clientX - dragRef.current.x),
      y: dragRef.current.oy + (e.clientY - dragRef.current.y),
    });
  };

  const onPointerUp = e => {
    dragRef.current.pointers.delete(e.pointerId);
    if (dragRef.current.pointers.size < 2) {
      dragRef.current.pinchDist = 0;
      const rest = pointerList()[0];
      if (rest) {
        dragRef.current.x = rest.x;
        dragRef.current.y = rest.y;
        dragRef.current.ox = pos.x;
        dragRef.current.oy = pos.y;
      } else {
        dragRef.current.active = false;
      }
    }
  };

  return (
    <div
      className={styles.sticker}
      style={{zIndex, left: pos.x, top: pos.y, padding: touchPad, transform: `scale(${scale})`}}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}>
      <img src={uri} alt="" className={styles.stickerImg} style={{width: imageSize, height: imageSize}} draggable={false} />
    </div>
  );
}

export default function PostEditorScreen({
  onClose,
  onPublish,
  currentUser,
  selectedCategory,
  publishCategoryId = null,
  publishTarget = 'post',
  skipStoryPublish = false,
  initialListing = null,
  defaultPostDescription = DEFAULT_POST_DESCRIPTION,
}) {
  const [activeTab, setActiveTab] = useState(TAB_TEXT);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadTimerRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturingStoryFrame, setCapturingStoryFrame] = useState(false);
  const [textModeOverlayText, setTextModeOverlayText] = useState('');
  const [textContent, setTextContent] = useState('');
  const [mediaImages, setMediaImages] = useState([]);
  const [backgroundImageUri, setBackgroundImageUri] = useState(null);
  const [backgroundImageAsset, setBackgroundImageAsset] = useState(null);
  const [backgroundVideoAsset, setBackgroundVideoAsset] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [textAlignMode, setTextAlignMode] = useState('center');
  const [selectedTextStyleIndex, setSelectedTextStyleIndex] = useState(0);
  const [colorPageIndex, setColorPageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_TEXT_COLOR);
  const [selectedBackgroundGradientIndex, setSelectedBackgroundGradientIndex] = useState(0);
  const [textBlocks, setTextBlocks] = useState([]);
  const [editingTextBlockId, setEditingTextBlockId] = useState(null);
  const [showMediaSourceSheet, setShowMediaSourceSheet] = useState(false);
  const [showProfessionalTargetSheet, setShowProfessionalTargetSheet] = useState(false);
  const [showOpenHouseDetailsModal, setShowOpenHouseDetailsModal] = useState(false);
  const [openHouseDraft, setOpenHouseDraft] = useState({place: '', date: ''});
  const openHouseDetailsRef = useRef({place: '', date: ''});
  const notifyProfessionalTypesRef = useRef([]);
  const [hashtags, setHashtags] = useState([]);
  const [showHashtagModal, setShowHashtagModal] = useState(false);
  const [hashtagInput, setHashtagInput] = useState('');
  const [formatToolbarHeight, setFormatToolbarHeight] = useState(72);
  const [stageLayout, setStageLayout] = useState({width: 0, height: 0});
  const postPreviewRef = useRef(null);
  const backgroundMediaRef = useRef(null);
  const stageRef = useRef(null);
  const editingInputRef = useRef(null);
  const editingFieldLayoutRef = useRef(null);
  const editingTextDraftRef = useRef('');
  const editingOriginRef = useRef({x: null, y: null});
  const isFinishingEditRef = useRef(false);
  const editingTextBlockIdRef = useRef(null);
  const stageLayoutRef = useRef({width: 0, height: 0});
  const textBlockMeasureRefs = useRef(new Map());
  const textBlocksRef = useRef(textBlocks);
  textBlocksRef.current = textBlocks;
  const maxStageHeightRef = useRef(0);
  const [lockedStageHeight, setLockedStageHeight] = useState(0);
  const maxPreviewHeightRef = useRef(0);
  const [lockedPreviewHeight, setLockedPreviewHeight] = useState(0);
  const activeTabRef = useRef(activeTab);
  const nextStackOrderRef = useRef(1);
  const fileInputRef = useRef(null);
  const objectUrlsRef = useRef([]);
  const originalVideoUrlRef = useRef(null);
  const originalMainImageUrlRef = useRef(null);
  const originalStoryMediaUrlRef = useRef(null);
  const didHydrateListingRef = useRef(false);
  const didHydrateOverlaysRef = useRef(false);
  const colorsPagerRef = useRef(null);

  const editingListingId = initialListing?.id != null ? String(initialListing.id).trim() : '';
  const isEditMode = Boolean(editingListingId);
  const isOpenHousePost = defaultPostDescription === OPEN_HOUSE_POST_DESCRIPTION && publishTarget !== 'story';
  const isSalesImageEditor = publishTarget === 'story';

  const rememberObjectUrl = url => {
    if (url && String(url).startsWith('blob:')) objectUrlsRef.current.push(url);
  };

  const editorSessionKey = useMemo(() => {
    if (!initialListing) return 'new';
    const id = initialListing.id != null ? String(initialListing.id).trim() : '';
    const sales = initialListing.sales_image_url ?? initialListing.salesImageUrl ?? '';
    const main = initialListing.main_image_url ?? '';
    return `${id}|${String(sales).trim()}|${String(main).trim()}|${initialListing._preferSalesImage ? 'sales' : 'post'}`;
  }, [initialListing]);

  useEffect(() => {
    didHydrateListingRef.current = false;
    didHydrateOverlaysRef.current = false;
    originalVideoUrlRef.current = null;
    originalMainImageUrlRef.current = null;
    originalStoryMediaUrlRef.current = null;
    setTextBlocks([]);
    setEditingTextBlockId(null);
    editingTextDraftRef.current = '';
    editingFieldLayoutRef.current = null;
    editingOriginRef.current = {x: null, y: null};
    isFinishingEditRef.current = false;
    setBackgroundImageUri(null);
    setBackgroundImageAsset(null);
    setBackgroundVideoAsset(null);
    setMediaImages([]);
    setTextContent('');
    setTextModeOverlayText('');
    nextStackOrderRef.current = 1;
    if (isOpenHousePost && initialListing) {
      const details = getOpenHouseDetailsFromListing(initialListing);
      if (details) openHouseDetailsRef.current = details;
    } else if (!isOpenHousePost) {
      openHouseDetailsRef.current = {place: '', date: ''};
    }
  }, [editorSessionKey, isOpenHousePost, initialListing]);

  useEffect(
    () => () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    },
    [],
  );

  const resolvedPublishCategory = useMemo(() => {
    const fromNav =
      publishCategoryId != null && String(publishCategoryId).trim() !== ''
        ? parseInt(String(publishCategoryId).trim(), 10)
        : NaN;
    if (Number.isFinite(fromNav) && fromNav > 0) return fromNav;
    if (selectedCategory != null && String(selectedCategory).trim() !== '') {
      const fromFeed = parseInt(String(selectedCategory).trim(), 10);
      if (Number.isFinite(fromFeed) && fromFeed > 0) return fromFeed;
    }
    return 8;
  }, [publishCategoryId, selectedCategory]);

  const hasTextBlockContent = textBlocks.some(b => b.text && String(b.text).trim().length > 0);
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
    originalStoryMediaUrlRef.current = videoUrl || mainImageUrl || null;
    setHashtags(isSalesImageEditor ? [] : parseListingHashtagsForEditor(initialListing));
    if (videoUrl) {
      setBackgroundVideoAsset({uri: videoUrl, mimeType: 'video/mp4', fileName: null});
      setBackgroundImageUri(null);
      setBackgroundImageAsset(null);
      setMediaImages([]);
      activeTabRef.current = TAB_CAMERA;
      setActiveTab(TAB_CAMERA);
      return;
    }
    const isColorTextPost = shouldUseLiveColorPostBackground(initialListing);
    const bakedGradientOnly =
      restoreInfo.textBaked && !restoreInfo.sourceImageUrl && (!mainImageUrl || restoreInfo.bgGradientIndex != null);
    if (isColorTextPost || bakedGradientOnly) {
      originalMainImageUrlRef.current = null;
      setBackgroundImageUri(null);
      setBackgroundImageAsset(null);
      setBackgroundVideoAsset(null);
      if (restoreInfo.bgGradientIndex != null) setSelectedBackgroundGradientIndex(restoreInfo.bgGradientIndex);
      activeTabRef.current = TAB_TEXT;
      setActiveTab(TAB_TEXT);
      return;
    }
    if (mainImageUrl) {
      setBackgroundImageUri(mainImageUrl);
      setBackgroundImageAsset(null);
      setBackgroundVideoAsset(null);
      activeTabRef.current = TAB_CAMERA;
      setActiveTab(TAB_CAMERA);
      return;
    }
    const desc = String(initialListing.description || '').trim();
    if (desc && !isReservedPostDescription(desc)) {
      setTextContent(desc);
      activeTabRef.current = TAB_TEXT;
      setActiveTab(TAB_TEXT);
    }
  }, [initialListing, editorSessionKey, isSalesImageEditor]);

  useEffect(() => {
    if (!initialListing || didHydrateOverlaysRef.current) return;
    if (!(stageLayout.width > 0 && stageLayout.height > 0)) return;
    const payload = parsePostTextOverlayPayload(initialListing);
    didHydrateOverlaysRef.current = true;
    let blocks = payload?.overlays?.length
      ? hydratePostEditorBlocksFromOverlays(payload, stageLayout).filter(b => String(b?.text || '').trim())
      : [];
    if (!blocks.length) {
      const desc = String(initialListing.description || '').trim();
      if (desc && !isReservedPostDescription(desc)) {
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
    const {videoUrl, mainImageUrl} = extractPostListingMediaUrls(initialListing);
    const restore = parsePostEditorRestoreInfo(initialListing);
    const rebuiltFromGradient =
      shouldUseLiveColorPostBackground(initialListing) ||
      (restore.textBaked && !restore.sourceImageUrl && (!mainImageUrl || restore.bgGradientIndex != null));
    const hasMediaBackground = Boolean(videoUrl) || (Boolean(mainImageUrl) && !rebuiltFromGradient);
    const nextTab = hasMediaBackground ? TAB_CAMERA : TAB_TEXT;
    activeTabRef.current = nextTab;
    setActiveTab(nextTab);
  }, [initialListing, stageLayout.width, stageLayout.height, editorSessionKey]);

  const resetUploadProgress = useCallback(() => {
    if (uploadTimerRef.current) {
      clearTimeout(uploadTimerRef.current);
      uploadTimerRef.current = null;
    }
    setUploadProgress(0);
  }, []);

  const startUploadProgress = useCallback(() => {
    resetUploadProgress();
    setUploadProgress(0.08);
    uploadTimerRef.current = setTimeout(() => {
      setUploadProgress(0.28);
      uploadTimerRef.current = setTimeout(() => {
        setUploadProgress(0.62);
        uploadTimerRef.current = setTimeout(() => {
          setUploadProgress(0.88);
        }, 5200);
      }, 2200);
    }, 320);
  }, [resetUploadProgress]);

  const finishUploadProgress = useCallback(
    () =>
      new Promise(resolve => {
        if (uploadTimerRef.current) {
          clearTimeout(uploadTimerRef.current);
          uploadTimerRef.current = null;
        }
        setUploadProgress(1);
        setTimeout(resolve, 260);
      }),
    [],
  );

  const registerTextBlockMeasure = useCallback((id, measureFn) => {
    if (!id) return;
    if (typeof measureFn === 'function') textBlockMeasureRefs.current.set(id, measureFn);
    else textBlockMeasureRefs.current.delete(id);
  }, []);

  const syncEditingToBlock = partial => {
    if (!editingTextBlockId) return;
    setTextBlocks(prev => prev.map(b => (b.id === editingTextBlockId ? {...b, ...partial} : b)));
  };

  const syncEditingDraft = text => {
    editingTextDraftRef.current = String(text ?? '');
  };

  const syncEditingDraftFromInput = () => {
    const latest = String(editingInputRef.current?.getText?.() ?? editingTextDraftRef.current ?? '');
    editingTextDraftRef.current = latest;
    return latest;
  };

  const readLatestEditingText = () => {
    const draft = String(editingTextDraftRef.current ?? '');
    const fromBox = String(editingInputRef.current?.getText?.() ?? '');
    if (fromBox.trim().length >= draft.trim().length) return fromBox;
    return draft;
  };

  const finishEditing = () => {
    if (!editingTextBlockId || isFinishingEditRef.current) return;
    syncEditingDraftFromInput();
    const blockId = editingTextBlockId;
    const capturedText = readLatestEditingText().trim();
    isFinishingEditRef.current = true;
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
    const inputH = editingFieldLayoutRef.current?.height ?? 90;
    const origin = editingOriginRef.current || {x: null, y: null};
    const restoreX = origin.x != null && origin.x !== undefined ? origin.x : STAGE_TEXT_PAD_LEFT;
    const restoreY = origin.y != null && origin.y !== undefined ? origin.y : getDefaultTextBlockY(stageHForFinish, inputH);
    setTextBlocks(prev => {
      const cur = prev.find(b => b.id === blockId);
      const text = capturedText || String(cur?.text ?? '').trim();
      if (!text) return prev.filter(b => b.id !== blockId);
      const nextPos = clampTextBlockPositionLoose(restoreX, restoreY, boxW, inputH, stageW, stageHForFinish);
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
              editGen: (b.editGen ?? 0) + 1,
            }
          : b,
      );
    });
    editingFieldLayoutRef.current = null;
    editingOriginRef.current = {x: null, y: null};
    editingTextDraftRef.current = '';
    editingInputRef.current?.blur?.();
    setEditingTextBlockId(null);
    isFinishingEditRef.current = false;
  };

  const beginEditTextBlock = useCallback(id => {
    const block = textBlocksRef.current.find(b => b.id === id);
    if (!block) return;
    editingTextDraftRef.current = block.text ?? '';
    editingOriginRef.current = {
      x: block.x != null ? block.x : null,
      y: block.y != null ? block.y : null,
    };
    setSelectedTextStyleIndex(block.textStyleIndex ?? 0);
    setSelectedColor(block.color ?? DEFAULT_TEXT_COLOR);
    setTextAlignMode(block.align ?? 'center');
    setSelectedFormat('aa');
    setEditingTextBlockId(id);
    requestAnimationFrame(() => {
      setTimeout(() => editingInputRef.current?.focus?.(), 32);
    });
  }, []);

  const updateBlockPosition = (id, x, y) => {
    const sw = stageLayoutRef.current.width || stageLayout.width || 300;
    const sh = maxStageHeightRef.current || stageLayoutRef.current.height || stageLayout.height || 300;
    const clamped = clampTextBlockPositionLoose(x, y, getTextBlockBoxWidth(sw), 40, sw, sh);
    setTextBlocks(prev => prev.map(b => (b.id === id ? {...b, x: clamped.x, y: clamped.y} : b)));
  };

  const bringMediaImageToFront = id => {
    if (!id) return;
    setMediaImages(prev => {
      const nextOrder = nextStackOrderRef.current++;
      return prev.map(img => (img.id === id ? {...img, stackOrder: nextOrder} : img));
    });
  };

  const bringTextBlockToFront = id => {
    if (!id) return;
    setTextBlocks(prev => {
      const nextOrder = nextStackOrderRef.current++;
      return prev.map(block => (block.id === id ? {...block, stackOrder: nextOrder} : block));
    });
  };

  const addTextBlock = () => {
    const id = createTextBlockId();
    setTextAlignMode('center');
    setSelectedColor(DEFAULT_TEXT_COLOR);
    setTextBlocks(prev => [
      ...prev,
      {
        id,
        text: '',
        color: DEFAULT_TEXT_COLOR,
        textStyleIndex: selectedTextStyleIndex,
        fontSize: DEFAULT_FONT_SIZE,
        align: 'center',
        x: null,
        y: null,
        stackOrder: nextStackOrderRef.current++,
      },
    ]);
    editingTextDraftRef.current = '';
    editingOriginRef.current = {x: null, y: null};
    setEditingTextBlockId(id);
    setSelectedFormat('aa');
    requestAnimationFrame(() => editingInputRef.current?.focus?.());
  };

  const addHashtagFromInput = () => {
    const raw = String(hashtagInput || '')
      .replace(/^#+/, '')
      .trim();
    if (!raw) return;
    setHashtags(prev => {
      const cleaned = raw.replace(/\s+/g, ' ').slice(0, 50);
      if (!cleaned || prev.includes(cleaned) || prev.length >= 30) return prev;
      return [...prev, cleaned];
    });
    setHashtagInput('');
  };

  const removeHashtag = tag => setHashtags(prev => prev.filter(t => t !== tag));

  const applyBackgroundImage = uri => {
    if (!uri) return;
    setBackgroundVideoAsset(null);
    setBackgroundImageUri(uri);
  };

  const applyBackgroundVideo = asset => {
    if (!asset?.uri) return;
    setBackgroundImageUri(null);
    setBackgroundImageAsset(null);
    setMediaImages([]);
    setBackgroundVideoAsset({
      uri: asset.uri,
      mimeType: asset?.mimeType || asset?.type || null,
      fileName: asset?.fileName || asset?.name || null,
      file: asset?.file || null,
      type: asset?.type,
      name: asset?.name,
    });
  };

  const clearAllEditorState = () => {
    setBackgroundImageUri(null);
    setBackgroundImageAsset(null);
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
  };

  const switchToCameraTab = () => {
    if (activeTabRef.current !== TAB_CAMERA) clearAllEditorState();
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
    rememberObjectUrl(asset.uri);
    setBackgroundImageAsset(asset);
    applyBackgroundImage(asset.uri);
  };

  const openFilePicker = mode => {
    const input = fileInputRef.current;
    if (!input) return;
    if (mode === 'photo') input.accept = 'image/*';
    else if (mode === 'video') input.accept = 'video/*';
    else input.accept = 'image/*,video/*';
    input.value = '';
    input.click();
  };

  const onFilePicked = e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const asset = pickedFileAsset(file);
    rememberObjectUrl(asset.uri);
    applyCameraCaptureAsset(asset);
  };

  const runCameraTabMediaAction = action => {
    setShowMediaSourceSheet(false);
    openFilePicker(action === 'photo' ? 'photo' : action === 'video' ? 'video' : 'library');
  };

  const openCameraTabMediaPicker = () => {
    switchToCameraTab();
    setShowMediaSourceSheet(true);
  };

  const pickBackgroundImageFromGallery = () => openFilePicker('library');

  const handlePublish = async () => {
    if (publishing) return;
    if (!canPublish) {
      showAlert('לא ניתן לפרסם', 'הוסף תמונה או סרטון מהמצלמה או מהגלריה, או טקסט (Aa), ואז לחץ שוב כדי להעלות ולפרסם.');
      return;
    }

    try {
      setPublishing(true);
      if (publishTarget !== 'story') startUploadProgress();
      if (editingTextBlockId) {
        finishEditing();
        await new Promise(resolve => setTimeout(resolve, 120));
      }
      await waitFrame();
      const stageMapping = await measurePostStageMapping(postPreviewRef.current, stageRef.current);
      const previewBox = await measureNodeInWindow(postPreviewRef.current);
      const blocksForSave = textBlocksRef.current;
      const measuredContentById = {};
      await Promise.all(
        (blocksForSave || []).map(async block => {
          if (!block?.id || !String(block.text || '').trim()) return;
          const measureFn = textBlockMeasureRefs.current.get(block.id);
          if (!measureFn) return;
          const box = await measureFn();
          if (box) measuredContentById[block.id] = box;
        }),
      );
      const layoutForSave = stageLayoutRef.current?.width > 0 ? stageLayoutRef.current : stageLayout;
      const postTextMeta = serializePostTextOverlays(blocksForSave, layoutForSave, {
        textModeOverlayText,
        textContent,
        stageMapping,
        measuredContentById,
        previewBox,
      });
      const customCaption = String(postTextMeta.description || '').trim();
      const listingDescription =
        customCaption && !isReservedPostDescription(customCaption) ? customCaption : defaultPostDescription;
      const hasVideoBackground = Boolean(backgroundVideoAsset?.uri);
      const hasTextOverlays = postHasTextOverlays(blocksForSave);
      const hasStickerOverlays = postHasStickerOverlays(mediaImages);
      const usedGradientBackground = !hasVideoBackground && !backgroundImageUri;
      const isGradientTextFeedPost =
        publishTarget !== 'story' && usedGradientBackground && hasTextOverlays && !hasStickerOverlays;
      const mustBakeComposite = hasStickerOverlays || (publishTarget === 'story' && hasTextOverlays && !hasVideoBackground);
      const canUploadPhotoDirectly = Boolean(backgroundImageUri) && !hasVideoBackground && !mustBakeComposite;
      const willCapturePreview = !hasVideoBackground && !canUploadPhotoDirectly;

      if (willCapturePreview) {
        setIsCapturing(true);
        await waitFrame();
        if (publishTarget === 'story') await new Promise(resolve => setTimeout(resolve, 120));
      }

      const capturePreviewToFile = async () => {
        await new Promise(resolve => setTimeout(resolve, publishTarget === 'story' ? 200 : 120));
        const el = resolvePostPreviewDomNode(postPreviewRef, 'post-editor-preview-root');
        if (!el) throw new Error('לא ניתן לצלם את התצוגה בדפדפן');
        return capturePostPreviewToDataUrl(
          el,
          publishTarget === 'story'
            ? {minShortSidePx: 1440, jpegQuality: 0.96, maxScale: 4}
            : {minShortSidePx: 1080, jpegQuality: 0.94, maxScale: 4},
        );
      };

      const uploadImagePayload = async (uri, folderPrefix) => {
        const fromCapture = typeof uri === 'string' && uri.startsWith('data:');
        const localAsset = !fromCapture && backgroundImageAsset?.uri === uri ? backgroundImageAsset : null;
        const uploadResult = await uploadFile(
          {
            uri,
            type: localAsset?.mimeType || inferImageMimeFromUri(uri),
            name: localAsset?.name || `${publishTarget === 'story' ? 'story' : 'post'}_${Date.now()}.jpg`,
            file: localAsset?.file || undefined,
          },
          folderPrefix === 'story' ? 'stories/images' : 'listings/images',
        );
        const imageUrl = uploadResult?.url;
        if (!imageUrl) throw new Error('העלאה הצליחה בלי כתובת קובץ');
        return imageUrl;
      };

      let mainImageUrl = null;
      let videoUrl = null;
      let sourceImageUrlForEdit = null;
      let textBakedIntoImage = false;

      if (hasVideoBackground) {
        const sameVideo = isRemoteMediaUri(backgroundVideoAsset.uri) && backgroundVideoAsset.uri === originalVideoUrlRef.current;
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
              file: backgroundVideoAsset.file || undefined,
            },
            publishTarget === 'story' ? 'stories/videos' : 'listings/videos',
            {timeoutMs: 300000},
          );
          videoUrl = videoUpload?.url;
          if (!videoUrl) throw new Error('העלאת הסרטון נכשלה');
        }
      } else if (canUploadPhotoDirectly) {
        const sameImage = isRemoteMediaUri(backgroundImageUri) && backgroundImageUri === originalMainImageUrlRef.current;
        if (sameImage && originalMainImageUrlRef.current) {
          mainImageUrl = originalMainImageUrlRef.current;
        } else {
          mainImageUrl = await uploadImagePayload(backgroundImageUri, publishTarget);
        }
      } else if (isGradientTextFeedPost) {
        // Mobile snapshots the color background only. Live overlays then draw
        // the text at the frame size, so the feed matches the editor.
        const backgroundEl = backgroundMediaRef.current;
        const captureUri = backgroundEl
          ? await capturePostPreviewToDataUrl(backgroundEl, {minShortSidePx: 1080, jpegQuality: 0.94, maxScale: 4})
          : await capturePreviewToFile();
        mainImageUrl = await uploadImagePayload(captureUri, publishTarget);
        textBakedIntoImage = false;
      } else {
        if (backgroundImageUri) {
          const sameSource = isRemoteMediaUri(backgroundImageUri) && backgroundImageUri === originalMainImageUrlRef.current;
          if (sameSource && originalMainImageUrlRef.current) {
            sourceImageUrlForEdit = originalMainImageUrlRef.current;
          } else {
            sourceImageUrlForEdit = await uploadImagePayload(backgroundImageUri, publishTarget);
          }
        }
        let captureUri;
        try {
          captureUri = await capturePreviewToFile();
        } catch (captureError) {
          if (backgroundImageUri) captureUri = backgroundImageUri;
          else throw captureError;
        }
        mainImageUrl = await uploadImagePayload(captureUri, publishTarget);
        if (hasTextOverlays && !isGradientTextFeedPost) textBakedIntoImage = true;
      }

      const url = videoUrl || mainImageUrl;
      if (!url) throw new Error('העלאה הצליחה בלי כתובת קובץ');

      const publisher = resolvePublisherIdentityForSave(initialListing, currentUser, {editing: isEditMode});
      const subId = publisher.subscriptionId;
      const subType = publisher.subscriptionType;
      if (!subId) {
        showAlert('לא ניתן לפרסם', 'נדרש חשבון מנוי מאומת (עם מזהה מנוי) כדי לפרסם.');
        return;
      }

      const overlayGeneralDetails = {
        ...buildPostTextGeneralDetails(postTextMeta, {
          sourceImageUrl: textBakedIntoImage ? sourceImageUrlForEdit : null,
          textBakedIntoImage,
          backgroundGradientIndex: usedGradientBackground ? selectedBackgroundGradientIndex : null,
        }),
        ...(defaultPostDescription === OPEN_HOUSE_POST_DESCRIPTION
          ? {
              post_kind: OPEN_HOUSE_POST_KIND,
              [OPEN_HOUSE_PLACE_KEY]: openHouseDetailsRef.current?.place?.trim() || '',
              [OPEN_HOUSE_DATE_KEY]: openHouseDetailsRef.current?.date?.trim() || '',
            }
          : {}),
      };

      let createdListing = null;
      let updatedListing = null;
      if (publishTarget === 'story') {
        if (!skipStoryPublish) {
          if (!isB2BSubscriptionType(currentUser?.subscription_type)) {
            throw new Error('Stories are only available for business accounts');
          }
          await createStory({
            subscription_id: subId,
            media_url: url,
            general_details: hasVideoBackground && hasTextOverlays ? overlayGeneralDetails : undefined,
          });
        }
      } else if (isEditMode) {
        const updatePayload = videoUrl
          ? {
              category: resolvedPublishCategory,
              status: 'published',
              subscriptionId: subId,
              subscriptionType: subType,
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
              subscriptionType: subType,
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
          subscriptionType: subType,
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
          notify_professional_types: notifyProfessionalTypesRef.current,
        });
      } else {
        createdListing = await createListing({
          category: resolvedPublishCategory,
          status: 'published',
          subscriptionId: subId,
          subscriptionType: subType,
          mainImageUrl,
          description: listingDescription,
          feedPost: true,
          feed_post: true,
          propertyType: 'post',
          price: 0,
          hashtags,
          generalDetails: overlayGeneralDetails,
          notify_professional_types: notifyProfessionalTypesRef.current,
        });
      }

      const shouldPublishFeedPostCompanionStory =
        publishTarget !== 'story' && !skipStoryPublish && isB2BSubscriptionType(subType || currentUser?.subscription_type);
      let needsCompanionStory = shouldPublishFeedPostCompanionStory;
      if (shouldPublishFeedPostCompanionStory && isEditMode) {
        const sync = updatedListing?.feedPostStorySync;
        const mediaChangedLocally = String(url || '').trim() !== String(originalStoryMediaUrlRef.current || '').trim();
        const needsVisualStoryRebake = hasStickerOverlays || textBakedIntoImage || mediaChangedLocally;
        const hadCompanionStory = sync ? sync.storyMatched === true || Number(sync.storyRemoved || 0) > 0 : null;
        if (hadCompanionStory === false) needsCompanionStory = false;
        else needsCompanionStory = needsVisualStoryRebake || sync?.mediaChanged === true;
      }
      if (needsCompanionStory) {
        try {
          const resolvedListingId =
            editingListingId ||
            updatedListing?.id ||
            updatedListing?.listing?.id ||
            createdListing?.id ||
            createdListing?.listing?.id ||
            null;
          if (isEditMode && resolvedListingId) {
            try {
              await deleteActiveStoriesByFeedListingId({
                subscriptionId: subId,
                listingId: resolvedListingId,
                mediaUrl: originalStoryMediaUrlRef.current,
              });
            } catch (removeErr) {
              console.warn('[PostEditor] Remove companion story by listing failed:', removeErr?.message || removeErr);
            }
          } else if (isEditMode && originalStoryMediaUrlRef.current) {
            try {
              await deleteActiveStoriesByMediaUrl({
                subscriptionId: subId,
                mediaUrl: originalStoryMediaUrlRef.current,
              });
            } catch (removeErr) {
              console.warn('[PostEditor] Remove old companion story failed:', removeErr?.message || removeErr);
            }
          }

          let storyMediaUrl = url;
          let storyGeneralDetails;
          const storyUsesLiveText = hasTextOverlays && !hasStickerOverlays && !textBakedIntoImage;
          const openHouseStoryDetails =
            defaultPostDescription === OPEN_HOUSE_POST_DESCRIPTION
              ? {
                  post_kind: OPEN_HOUSE_POST_KIND,
                  [OPEN_HOUSE_PLACE_KEY]: openHouseDetailsRef.current?.place?.trim() || '',
                  [OPEN_HOUSE_DATE_KEY]: openHouseDetailsRef.current?.date?.trim() || '',
                }
              : null;

          if (storyUsesLiveText) {
            storyGeneralDetails = overlayGeneralDetails;
          } else if (hasStickerOverlays) {
            setCapturingStoryFrame(true);
            setIsCapturing(true);
            await waitFrame();
            await waitFrame();
            await new Promise(resolve => setTimeout(resolve, 260));
            const el = resolvePostPreviewDomNode(postPreviewRef, 'post-editor-preview-root');
            if (!el) throw new Error('לא ניתן לצלם את התצוגה בדפדפן');
            const storyCaptureUri = await capturePostPreviewToDataUrl(el, {
              minShortSidePx: 1440,
              jpegQuality: 0.96,
              maxScale: 4,
            });
            storyMediaUrl = await uploadImagePayload(storyCaptureUri, 'story');
            setCapturingStoryFrame(false);
            if (openHouseStoryDetails) storyGeneralDetails = openHouseStoryDetails;
          } else if (openHouseStoryDetails) {
            storyGeneralDetails = openHouseStoryDetails;
          }

          const resolvedListingIdForStory =
            editingListingId ||
            updatedListing?.id ||
            updatedListing?.listing?.id ||
            createdListing?.id ||
            createdListing?.listing?.id ||
            null;
          if (resolvedListingIdForStory) {
            storyGeneralDetails = {
              ...(storyGeneralDetails || {}),
              [FEED_POST_LISTING_ID_KEY]: resolvedListingIdForStory,
            };
          }
          await createStory({
            subscription_id: subId,
            media_url: storyMediaUrl,
            general_details: storyGeneralDetails,
          });
        } catch (storyErr) {
          console.warn('[PostEditor] Companion story for feed post failed:', storyErr?.message || storyErr);
        }
      }

      if (publishTarget !== 'story') await finishUploadProgress();

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
        generalDetails: overlayGeneralDetails,
        sourceImageUrl: sourceImageUrlForEdit || null,
      });
    } catch (error) {
      showAlert('שגיאה', error?.message || (isEditMode ? 'העדכון נכשל' : 'הפרסום נכשל'));
    } finally {
      setCapturingStoryFrame(false);
      setIsCapturing(false);
      setPublishing(false);
      resetUploadProgress();
      notifyProfessionalTypesRef.current = [];
    }
  };

  const proceedAfterOpenHouseDetails = () => {
    const isNewFeedPost = publishTarget !== 'story' && !isEditMode;
    if (isNewFeedPost && canPublish && !isOpenHousePost) {
      setShowProfessionalTargetSheet(true);
      return;
    }
    handlePublish();
  };

  const handlePublishPress = () => {
    if (publishing) return;
    if (!canPublish) {
      showAlert('לא ניתן לפרסם', 'הוסף תמונה או סרטון מהמצלמה או מהגלריה, או טקסט (Aa), ואז לחץ שוב כדי להעלות ולפרסם.');
      return;
    }
    if (isOpenHousePost) {
      setOpenHouseDraft({...openHouseDetailsRef.current});
      setShowOpenHouseDetailsModal(true);
      return;
    }
    proceedAfterOpenHouseDetails();
  };

  const handleOpenHouseDetailsCancel = () => {
    if (publishing) return;
    setShowOpenHouseDetailsModal(false);
  };

  const handleOpenHouseDetailsConfirm = ({place, date}) => {
    if (!String(place || '').trim() || !String(date || '').trim()) {
      showAlert('חסר מידע', 'יש למלא מיקום ותאריך לבית הפתוח.');
      return;
    }
    openHouseDetailsRef.current = {place: String(place).trim(), date: String(date).trim()};
    setShowOpenHouseDetailsModal(false);
    proceedAfterOpenHouseDetails();
  };

  const handleProfessionalTargetSkip = () => {
    notifyProfessionalTypesRef.current = [];
    setShowProfessionalTargetSheet(false);
    handlePublish();
  };

  const handleProfessionalTargetConfirm = types => {
    notifyProfessionalTypesRef.current = Array.isArray(types) ? types : [];
    setShowProfessionalTargetSheet(false);
    handlePublish();
  };

  const selectedBackgroundGradient = useMemo(() => {
    return BACKGROUND_GRADIENTS[selectedBackgroundGradientIndex] ?? BACKGROUND_GRADIENTS[0];
  }, [selectedBackgroundGradientIndex]);

  const editingBlock = useMemo(
    () => textBlocks.find(b => b.id === editingTextBlockId) || null,
    [textBlocks, editingTextBlockId],
  );

  const showTextFormatToolbar = Boolean(editingTextBlockId) && !isCapturing;
  const lockPreviewLayout = Boolean(editingTextBlockId);
  const isFullFrameCapture = isCapturing && capturingStoryFrame;
  const effectiveStageHeight = Math.max(stageLayout.height, lockedStageHeight, maxStageHeightRef.current);
  const pinStageHeight = (lockPreviewLayout && lockedStageHeight > 0) || (textBlocks.length > 0 && effectiveStageHeight > 0);

  const webToolbarInputMarginBottom = useMemo(() => {
    if (!editingTextBlockId || isCapturing) return 0;
    if (selectedFormat === 'color') return 260;
    if (selectedFormat === 'aa') return 140;
    return 88;
  }, [selectedFormat, editingTextBlockId, isCapturing]);

  const editingInputBottom = useMemo(() => {
    if (!editingTextBlockId || isCapturing) return 12;
    return Math.max(Math.max(formatToolbarHeight, 72), webToolbarInputMarginBottom) + 12;
  }, [editingTextBlockId, isCapturing, formatToolbarHeight, webToolbarInputMarginBottom]);

  useEffect(() => {
    editingTextBlockIdRef.current = editingTextBlockId;
  }, [editingTextBlockId]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (!editingTextBlockId) return undefined;
    requestAnimationFrame(() => editingInputRef.current?.focus?.());
    return undefined;
  }, [editingTextBlockId]);

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-account-modal]')) return;
      e.stopPropagation();
      if (!publishing) onClose?.();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, publishing]);

  useEffect(() => {
    if (!showMediaSourceSheet && !showHashtagModal) return undefined;
    const onKey = e => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setShowMediaSourceSheet(false);
      setShowHashtagModal(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [showMediaSourceSheet, showHashtagModal]);

  const showPostUploadProgress = publishing && publishTarget !== 'story';
  const editingVisual = getTextVisualStyle(editingBlock?.color ?? selectedColor, editingBlock?.bgMode ?? 0);
  const editingFontSize = editingBlock?.fontSize ?? DEFAULT_FONT_SIZE;
  const editingFont = TEXT_STYLES[selectedTextStyleIndex] || TEXT_STYLES[0];

  const onStageLayout = el => {
    if (!el) return;
    const layout = {width: el.offsetWidth, height: el.offsetHeight};
    stageLayoutRef.current = layout;
    if (!editingTextBlockIdRef.current && layout.height > maxStageHeightRef.current) {
      maxStageHeightRef.current = layout.height;
      setLockedStageHeight(layout.height);
    }
    if (layout.width !== stageLayout.width || layout.height !== stageLayout.height) {
      setStageLayout(layout);
    }
  };

  const onPreviewLayout = el => {
    if (!el) return;
    const h = el.offsetHeight;
    if (h > 0 && !editingTextBlockIdRef.current && h > maxPreviewHeightRef.current) {
      maxPreviewHeightRef.current = h;
      setLockedPreviewHeight(h);
    }
  };

  const onColorsPagerScroll = e => {
    const w = e.currentTarget.clientWidth || 1;
    const page = Math.min(Math.max(Math.round(e.currentTarget.scrollLeft / w) || 0, 0), COLOR_PAGES.length - 1);
    setColorPageIndex(page);
  };

  const isEditingPost = initialListing != null && publishTarget !== 'story';

  return (
    <div className={isEditingPost ? styles.screenHost : styles.backdrop}>
    <div className={isEditingPost ? `${styles.screen} ${styles.screenFull}` : styles.screen} dir="rtl">
      <header className={styles.topNav}>
        <button
          type="button"
          className={`${styles.backBtn} ${publishing ? styles.backBtnDisabled : ''}`}
          disabled={publishing}
          aria-label="חזרה"
          onClick={onClose}>
          <MdiIcon path={mdiChevronLeft} size={34} color="#fff" />
        </button>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === TAB_CAMERA ? styles.tabTextActive : ''}`}
            onClick={openCameraTabMediaPicker}>
            {TAB_CAMERA}
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === TAB_TEXT ? styles.tabTextActive : ''}`}
            onClick={() => {
              if (activeTab === TAB_TEXT) return;
              clearAllEditorState();
              setActiveTab(TAB_TEXT);
            }}>
            {TAB_TEXT}
          </button>
        </div>
        <button
          type="button"
          className={`${styles.publishBtn} ${!canPublish && !publishing ? styles.publishBtnMuted : ''}`}
          disabled={publishing}
          aria-label={publishTarget === 'story' ? 'סיום' : isEditMode ? 'עדכן פוסט' : 'פרסם והעלה'}
          onClick={handlePublishPress}>
          {publishTarget === 'story' ? (
            <span className={styles.finishBtnPill}>
              <span className={styles.finishBtnText}>סיום</span>
            </span>
          ) : (
            <img src={publishBtnSrc} alt="" className={styles.publishBtnImage} />
          )}
        </button>
        {showPostUploadProgress ? (
          <div className={styles.uploadProgressWrap}>
            <div className={styles.uploadProgressTrack}>
              <div
                className={styles.uploadProgressFill}
                style={{width: `${Math.round(uploadProgress * 100)}%`, background: PROFILE_RING_CSS}}
              />
            </div>
            <span className={styles.uploadProgressLabel}>מעלה פוסט...</span>
          </div>
        ) : null}
      </header>

      <div
        ref={node => {
          postPreviewRef.current = node;
          onPreviewLayout(node);
        }}
        id="post-editor-preview-root"
        className={`${styles.previewRoot} ${isFullFrameCapture ? styles.storyCaptureFill : ''}`}>
        <div
          ref={backgroundMediaRef}
          className={`${styles.backgroundMediaLayer} ${lockPreviewLayout && lockedPreviewHeight > 0 ? styles.backgroundMediaLocked : ''}`}
          style={lockPreviewLayout && lockedPreviewHeight > 0 ? {height: lockedPreviewHeight} : undefined}>
          {backgroundVideoAsset?.uri ? (
            <video
              className={styles.backgroundMedia}
              src={backgroundVideoAsset.uri}
              autoPlay={!editingTextBlockId}
              loop
              muted={Boolean(editingTextBlockId)}
              playsInline
              controls={false}
            />
          ) : backgroundImageUri ? (
            <img src={backgroundImageUri} alt="" className={`${styles.backgroundMedia} ${styles.backgroundImage}`} />
          ) : (
            <div
              className={styles.backgroundGradient}
              style={{background: horizontalGradientCss(selectedBackgroundGradient)}}
            />
          )}
        </div>

        <div className={styles.editorRoot}>
          {isCapturing ? (
            <div className={styles.headerContainer} />
          ) : (
            <div className={styles.headerContainer}>
              <button
                type="button"
                className={styles.toolBtn}
                aria-label="נקה"
                onClick={() => {
                  clearAllEditorState();
                  setActiveTab(TAB_TEXT);
                }}>
                <img src={closeIconSrc} alt="" className={styles.closeIcon} />
              </button>
              <div className={styles.previewTools}>
                <button type="button" className={styles.toolBtn} aria-label="גלריה" onClick={pickBackgroundImageFromGallery}>
                  <img src={galleryIconSrc} alt="" className={styles.galleryIcon} />
                </button>
                <button type="button" className={styles.toolBtn} aria-label="טקסט" onClick={addTextBlock}>
                  <span className={styles.aaBtnText}>Aa</span>
                </button>
                {!isSalesImageEditor ? (
                  <button type="button" className={styles.hashtagBtn} aria-label="האשטאגים" onClick={() => setShowHashtagModal(true)}>
                    <span className={styles.hashtagBtnSymbol}>#</span>
                    {hashtags.length > 0 ? (
                      <span className={styles.hashtagBadge}>
                        <span className={styles.hashtagBadgeText}>{hashtags.length}</span>
                      </span>
                    ) : null}
                  </button>
                ) : null}
                {editingTextBlockId ? (
                  <button type="button" className={styles.doneBtn} onClick={finishEditing}>
                    בוצע
                  </button>
                ) : null}
                {activeTab !== TAB_CAMERA || backgroundImageUri || backgroundVideoAsset?.uri ? (
                  <button
                    type="button"
                    className={styles.colorToggleButton}
                    aria-label="רקע"
                    onClick={() => {
                      if (backgroundImageUri || backgroundVideoAsset?.uri) {
                        setBackgroundImageUri(null);
                        setBackgroundImageAsset(null);
                        setBackgroundVideoAsset(null);
                        return;
                      }
                      setSelectedBackgroundGradientIndex(prev => {
                        const next = (prev + 1) % BACKGROUND_GRADIENTS.length;
                        return Number.isFinite(next) ? next : 0;
                      });
                    }}>
                    <span
                      className={styles.colorPreview}
                      style={{background: horizontalGradientCss(selectedBackgroundGradient)}}
                    />
                  </button>
                ) : null}
              </div>
            </div>
          )}

          <div className={styles.stageColumn}>
            <div
              ref={node => {
                stageRef.current = node;
                onStageLayout(node);
              }}
              className={`${styles.stage} ${pinStageHeight && effectiveStageHeight > 0 ? styles.stagePinned : ''}`}
              style={pinStageHeight && effectiveStageHeight > 0 ? {height: effectiveStageHeight} : undefined}>
              <div className={styles.stageLtr} dir="ltr">
                {stageLayout.width > 0 &&
                  effectiveStageHeight > 0 &&
                  mediaImages.map((img, idx) => (
                    <DraggableImage
                      key={img.id}
                      id={img.id}
                      uri={img.uri}
                      stageWidth={stageLayout.width}
                      stageHeight={effectiveStageHeight}
                      zIndex={img.stackOrder ?? idx + 1}
                      onBringToFront={bringMediaImageToFront}
                    />
                  ))}
                {textBlocks.map((block, idx) => (
                  <DraggableTextBlock
                    key={block.id}
                    block={block}
                    stageWidth={stageLayout.width}
                    stageHeight={effectiveStageHeight}
                    selectedColor={selectedColor}
                    zIndex={block.stackOrder ?? idx + 1}
                    isBeingEdited={block.id === editingTextBlockId}
                    onPress={() => beginEditTextBlock(block.id)}
                    onUpdatePosition={updateBlockPosition}
                    onBringToFront={bringTextBlockToFront}
                    onRegisterMeasure={registerTextBlockMeasure}
                  />
                ))}
                {editingTextBlockId && !isCapturing ? (
                  <div className={styles.editingOverlay} dir="ltr">
                    <FontSizeSlider value={editingFontSize} onChange={nextSize => syncEditingToBlock({fontSize: nextSize})} />
                    <div
                      className={styles.editingInputRow}
                      style={{bottom: editingInputBottom, justifyContent: alignToFlexSelf(textAlignMode)}}
                      ref={node => {
                        if (node) editingFieldLayoutRef.current = {height: node.offsetHeight, width: node.offsetWidth};
                      }}>
                      <EditingTextBox
                        key={editingTextBlockId}
                        ref={editingInputRef}
                        initialText={editingBlock?.text ?? ''}
                        onTextChange={syncEditingDraft}
                        placeholder="הקלד משהו..."
                        className={styles.editingTextInput}
                        style={{
                          color: editingVisual.textColor,
                          backgroundColor: editingVisual.backgroundColor,
                          textAlign: physicalTextAlign(textAlignMode),
                          fontFamily: editingFont.fontFamily,
                          fontWeight: editingFont.fontWeight,
                          fontSize: editingFontSize,
                          lineHeight: `${Math.round(editingFontSize * 1.15)}px`,
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {showTextFormatToolbar ? (
            <div
              className={styles.keyboardControls}
              ref={node => {
                if (node) {
                  const h = node.offsetHeight;
                  if (h > 0 && Math.abs(h - formatToolbarHeight) > 1) setFormatToolbarHeight(h);
                }
              }}
              style={{paddingBottom: 13}}>
              {selectedFormat === 'aa' ? (
                <div className={styles.textStylesScroll}>
                  <div className={styles.textStylesRow} dir="ltr">
                    {TEXT_STYLES.map((styleItem, index) => (
                      <button
                        key={styleItem.label}
                        type="button"
                        className={`${styles.textStylePill} ${selectedTextStyleIndex === index ? styles.textStylePillActive : ''}`}
                        style={{fontFamily: styleItem.fontFamily, fontWeight: styleItem.fontWeight}}
                        onClick={() => {
                          setSelectedTextStyleIndex(index);
                          syncEditingToBlock({textStyleIndex: index});
                        }}>
                        {styleItem.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedFormat === 'color' ? (
                <div className={styles.colorsRow}>
                  <span className={styles.eyedropperBtn}>
                    <img src={penIconSrc} alt="" className={styles.eyedropperInner} />
                  </span>
                  <div ref={colorsPagerRef} className={styles.colorsPager} dir="ltr" onScroll={onColorsPagerScroll}>
                    {COLOR_PAGES.map((pageColors, pageIndex) => (
                      <div key={pageIndex} className={styles.colorsListPage}>
                        {pageColors.map(color => {
                          const isSelected =
                            String(selectedColor || DEFAULT_TEXT_COLOR).toUpperCase() === String(color).toUpperCase();
                          const isLightSwatch =
                            String(color).toUpperCase() === '#FFFFFF' ||
                            String(color).toUpperCase() === '#DBDBDB' ||
                            String(color).toUpperCase() === '#C7C7C7';
                          return (
                            <button
                              key={color}
                              type="button"
                              className={styles.colorSwatch}
                              style={{
                                backgroundColor: color,
                                borderWidth: isSelected ? 2 : 1,
                                borderColor: isSelected ? '#FEE787' : isLightSwatch ? '#9A9A9A' : '#FFFFFF',
                              }}
                              aria-label={color}
                              onClick={() => {
                                setSelectedColor(color);
                                syncEditingToBlock({color});
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedFormat === 'color' ? (
                <div className={styles.paginationDotsRow}>
                  {COLOR_PAGES.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`${styles.paginationDot} ${colorPageIndex === index ? styles.paginationDotActive : ''}`}
                      aria-label={`צבעים ${index + 1}`}
                      onClick={() => {
                        setColorPageIndex(index);
                        const pager = colorsPagerRef.current;
                        if (pager) pager.scrollTo({left: index * pager.clientWidth, behavior: 'smooth'});
                      }}
                    />
                  ))}
                </div>
              ) : null}

              <div className={styles.bottomBar}>
                <button
                  type="button"
                  className={styles.bottomBarItem}
                  onClick={() => setSelectedFormat(prev => (prev === 'aa' ? null : 'aa'))}>
                  {selectedFormat === 'aa' ? (
                    <span className={styles.bottomBarItemGradient} style={{background: FORMAT_SELECTED_GRADIENT}}>
                      <span
                        className={styles.aaBtnText}
                        style={{
                          color: '#1E1D27',
                          fontFamily: TEXT_STYLES[selectedTextStyleIndex].fontFamily,
                          fontWeight: TEXT_STYLES[selectedTextStyleIndex].fontWeight,
                        }}>
                        Aa
                      </span>
                    </span>
                  ) : (
                    <span
                      className={styles.aaBtnText}
                      style={{
                        fontFamily: TEXT_STYLES[selectedTextStyleIndex].fontFamily,
                        fontWeight: TEXT_STYLES[selectedTextStyleIndex].fontWeight,
                      }}>
                      Aa
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className={styles.bottomBarItem}
                  onClick={() => {
                    setSelectedFormat(prev => {
                      const next = prev === 'color' ? null : 'color';
                      if (next === 'color') setColorPageIndex(getColorPageIndexForColor(selectedColor));
                      return next;
                    });
                  }}>
                  {selectedFormat === 'color' ? (
                    <span className={styles.bottomBarItemGradient} style={{background: FORMAT_SELECTED_GRADIENT}}>
                      <img src={formatIconSelectedSrc} alt="" className={styles.formatBtnIcon} />
                    </span>
                  ) : (
                    <img src={formatIconSrc} alt="" className={styles.formatBtnIcon} />
                  )}
                </button>

                <button
                  type="button"
                  className={styles.alignBtn}
                  aria-label="יישור"
                  onClick={() => {
                    const next = textAlignMode === 'left' ? 'center' : textAlignMode === 'center' ? 'right' : 'left';
                    setTextAlignMode(next);
                    syncEditingToBlock({align: next, x: STAGE_TEXT_PAD_LEFT});
                    editingOriginRef.current = {...(editingOriginRef.current || {}), x: STAGE_TEXT_PAD_LEFT};
                  }}>
                  <span
                    className={`${styles.alignIcon} ${
                      textAlignMode === 'left'
                        ? styles.alignIconLeft
                        : textAlignMode === 'center'
                          ? styles.alignIconCenter
                          : styles.alignIconRight
                    }`}>
                    <span className={`${styles.alignLine} ${styles.alignLineLong}`} />
                    <span className={`${styles.alignLine} ${styles.alignLineMedium}`} />
                    <span className={`${styles.alignLine} ${styles.alignLineShort}`} />
                  </span>
                </button>

                <div
                  className={styles.backgroundBtnContainer}
                  style={{backgroundColor: (editingBlock?.bgMode ?? 0) === 0 ? 'transparent' : '#ffffff'}}>
                  <button
                    type="button"
                    className={styles.backgroundBtn}
                    style={{
                      borderColor: (editingBlock?.bgMode ?? 0) === 0 ? '#ffffff' : '#000000',
                      color: (editingBlock?.bgMode ?? 0) === 0 ? '#ffffff' : '#000000',
                    }}
                    aria-label="רקע לטקסט"
                    onClick={() => {
                      if (!editingTextBlockId) return;
                      setTextBlocks(prev =>
                        prev.map(b => {
                          if (b.id !== editingTextBlockId) return b;
                          return {...b, bgMode: ((b.bgMode ?? 0) + 1) % 3};
                        }),
                      );
                    }}>
                    A
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className={styles.hiddenFile}
        accept="image/*,video/*"
        onChange={onFilePicked}
      />

      {showMediaSourceSheet ? (
        <div className={styles.modalRoot} data-account-modal="" role="dialog" aria-modal="true" aria-label="מצלמה">
          <div className={styles.mediaSheetBackdrop} onClick={() => setShowMediaSourceSheet(false)}>
            <div className={styles.mediaSheetCard} onClick={e => e.stopPropagation()}>
              <div className={styles.mediaSheetHandle} />
              <h2 className={styles.mediaSheetTitle}>מצלמה</h2>
              <p className={styles.mediaSheetSubtitle}>בחר איך להוסיף תמונה או סרטון</p>
              <button type="button" className={styles.mediaSheetOption} onClick={() => runCameraTabMediaAction('photo')}>
                צלם תמונה
              </button>
              <button type="button" className={styles.mediaSheetOption} onClick={() => runCameraTabMediaAction('video')}>
                צלם סרטון
              </button>
              <button type="button" className={styles.mediaSheetOption} onClick={() => runCameraTabMediaAction('library')}>
                בחר מהגלריה
              </button>
              <button type="button" className={styles.mediaSheetCancel} onClick={() => setShowMediaSourceSheet(false)}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showHashtagModal && !isSalesImageEditor ? (
        <div className={styles.modalRoot} data-account-modal="" role="dialog" aria-modal="true" aria-label="האשטאגים">
          <div className={styles.hashtagBackdrop} onClick={() => setShowHashtagModal(false)}>
            <div className={styles.hashtagCard} onClick={e => e.stopPropagation()}>
              <h2 className={styles.hashtagTitle}>האשטאגים</h2>
              <p className={styles.hashtagSubtitle}>הוסף האשטאגים לפוסט כדי שיהיה קל יותר למצוא אותו</p>
              <div className={styles.hashtagInputRow}>
                <input
                  className={styles.hashtagInput}
                  value={hashtagInput}
                  onChange={e => setHashtagInput(e.target.value)}
                  placeholder="הקלד האשטאג..."
                  dir="rtl"
                  autoCapitalize="none"
                  autoCorrect="off"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addHashtagFromInput();
                    }
                  }}
                />
                <button
                  type="button"
                  className={styles.hashtagAddBtn}
                  disabled={!hashtagInput.trim()}
                  onClick={addHashtagFromInput}>
                  הוסף
                </button>
              </div>
              {hashtags.length > 0 ? (
                <div className={styles.hashtagChipsWrap}>
                  {hashtags.map(tag => (
                    <button key={tag} type="button" className={styles.hashtagChip} onClick={() => removeHashtag(tag)}>
                      <span>#{tag}</span>
                      <span className={styles.hashtagChipRemove}>×</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={styles.hashtagEmpty}>אין האשטאגים עדיין</p>
              )}
              <button type="button" className={styles.hashtagDoneBtn} onClick={() => setShowHashtagModal(false)}>
                סיום
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <OpenHouseDetailsModal
        visible={showOpenHouseDetailsModal}
        initialPlace={openHouseDraft.place}
        initialDate={openHouseDraft.date}
        submitting={publishing}
        onCancel={handleOpenHouseDetailsCancel}
        onConfirm={handleOpenHouseDetailsConfirm}
      />

      <PostTargetProfessionalsSheet
        visible={showProfessionalTargetSheet}
        submitting={publishing}
        onSkip={handleProfessionalTargetSkip}
        onConfirm={handleProfessionalTargetConfirm}
      />
    </div>
    </div>
  );
}
