/**
 * Read-side port of mobile utils/postTextOverlay.js — what feed-post previews need
 * (payload parsing, display media, gradient wallpaper, block scaling). The editor
 * serialization helpers are not ported here.
 */
import {parseListingGeneralDetails} from './publishRules';

const DEFAULT_FONT_SIZE = 20;
/** Matches PostEditorScreen styles.stage marginHorizontal. */
export const POST_STAGE_MARGIN_H = 22;
/** Matches PostEditorScreen styles.stage marginTop. */
export const POST_STAGE_MARGIN_TOP = 10;
/** Approx header band above the stage when measureInWindow is unavailable. */
export const POST_STAGE_HEADER_BAND = 70;

/** Matches PostEditorScreen TEXT_STYLES / Figma 35:293454 (web families in feed/postText.js). */
export const POST_TEXT_STYLE_FONTS = [
  'SecularOne-Regular',
  'IBMPlexSansHebrew-Bold',
  'Rubik-ExtraBold',
  'Rubik-Regular',
  'Alef-Regular',
  'NotoSans-Regular',
];

const lightenColor = (hex, amount = 0.8) => {
  if (typeof hex !== 'string') return hex;
  let h = hex.trim();
  if (h[0] === '#') h = h.slice(1);
  if (h.length !== 6) return hex;
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return hex;
  const mix = ch => Math.round(ch + (255 - ch) * amount);
  const toHex = v => v.toString(16).padStart(2, '0');
  return `#${toHex(mix((num >> 16) & 255))}${toHex(mix((num >> 8) & 255))}${toHex(mix(num & 255))}`;
};

export const getPostTextVisualStyle = (baseColor, bgMode = 0) => {
  const color = baseColor || '#FFFFFF';
  if (bgMode === 1) return {textColor: '#FFFFFF', backgroundColor: color};
  if (bgMode === 2) return {textColor: color, backgroundColor: lightenColor(color, 0.8)};
  return {textColor: color, backgroundColor: 'transparent'};
};

/**
 * Read a saved overlay payload back from a listing. Returns null unless the
 * listing was created with explicit overlay data.
 */
export const parsePostTextOverlayPayload = listing => {
  let gd = parseListingGeneralDetails(listing?.general_details);
  if (!gd || typeof gd !== 'object') return null;
  if (
    listing?._preferSalesImage === true &&
    (!Array.isArray(gd.post_text_overlays) || gd.post_text_overlays.length === 0) &&
    gd.sales_image_editor &&
    typeof gd.sales_image_editor === 'object'
  ) {
    gd = gd.sales_image_editor;
  }
  const overlays = gd.post_text_overlays;
  if (!Array.isArray(overlays) || overlays.length === 0) return null;

  const previewWidth = Number(gd.post_overlay_preview_w) || Number(gd.post_overlay_stage_w) || 0;
  const previewHeight = Number(gd.post_overlay_preview_h) || Number(gd.post_overlay_stage_h) || 0;
  const hasNormalized = overlays.some(
    o => o?.coords === 'normalized' || (Number.isFinite(Number(o?.nx)) && Number.isFinite(Number(o?.ny))),
  );
  const coordsSpace = hasNormalized ? 'normalized' : Number(gd.post_overlay_preview_w) > 0 ? 'preview' : 'stage';

  return {overlays, previewWidth, previewHeight, coordsSpace};
};

/** Links a homepage story slide back to its feed-post listing (edit sync). */
export const FEED_POST_LISTING_ID_KEY = 'feed_listing_id';

/** Editor + TikTok feed — same color-background presets, same order. */
export const POST_BACKGROUND_GRADIENTS = [
  ['#2B2A39', '#5149C4'],
  ['#3B2600', '#8A5A0C'],
  ['#3B1014', '#6B1E27'],
  ['#043144', '#0F6F94'],
  ['#2C1A4A', '#533288'],
];

/** `Number(null) === 0` must never win — that turned every image post into gradient 0. */
export function parsePostBackgroundGradientIndex(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'boolean') return null;
  const idx = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(idx) || idx < 0) return null;
  return Math.floor(idx);
}

function isRemotePostStillUrl(raw) {
  const uri = raw != null ? String(raw).trim() : '';
  if (!uri || /^text-post-placeholder$/i.test(uri)) return false;
  if (!/^https?:\/\//i.test(uri)) return false;
  return !/\.(mp4|m3u8|webm|mov|m4v)(\?|$)/i.test(uri);
}

/** Full-screen color background for a text-on-gradient feed post, or null. */
export function resolvePostBackgroundGradient(listing) {
  if (!listing || typeof listing !== 'object') return null;
  const gd = parseListingGeneralDetails(listing.general_details);
  const idx = parsePostBackgroundGradientIndex(listing.postBgGradientIndex ?? gd?.post_bg_gradient_index);
  if (idx == null) return null;
  return POST_BACKGROUND_GRADIENTS[idx] || POST_BACKGROUND_GRADIENTS[0];
}

function resolveEditorGeneralDetails(listing) {
  const gd = parseListingGeneralDetails(listing?.general_details);
  if (!gd) return null;
  if (listing?._preferSalesImage && gd.sales_image_editor && typeof gd.sales_image_editor === 'object') {
    return gd.sales_image_editor;
  }
  return gd;
}

export function parsePostEditorRestoreInfo(listing) {
  const gd = resolveEditorGeneralDetails(listing);
  const source = gd?.post_source_image_url != null ? String(gd.post_source_image_url).trim() : '';
  return {
    textBaked: gd?.post_text_baked === true,
    sourceImageUrl: source || null,
    bgGradientIndex: parsePostBackgroundGradientIndex(gd?.post_bg_gradient_index),
  };
}

/** Clean background image for the editor (not a baked composite with text). */
export function extractPostSourceImageUrl(listing) {
  const gd = resolveEditorGeneralDetails(listing);
  const source = gd?.post_source_image_url != null ? String(gd.post_source_image_url).trim() : '';
  return source || null;
}

/** True when feed should draw live text overlays (not already baked into pixels). */
export function shouldRenderPostTextOverlaysOnFeed(listing) {
  const isFeedPost =
    listing?.feed_post === true ||
    listing?.feed_post === 'true' ||
    listing?.feed_post === 't' ||
    listing?.isPost === true ||
    listing?.isPostEntry === true ||
    listing?.isTextOnlyPost === true ||
    listing?.type === 'post' ||
    listing?.type === 'feed_post' ||
    listing?.propertyType === 'post';
  if (!isFeedPost) return false;
  const payload = parsePostTextOverlayPayload(listing);
  if (!payload?.overlays?.length) return false;
  const gd = parseListingGeneralDetails(listing?.general_details);
  if (gd?.post_text_baked === true) return false;
  return true;
}

/** Extract main image / video URLs from a listing row. */
export function extractPostListingMediaUrls(listing) {
  if (!listing || typeof listing !== 'object') {
    return {videoUrl: null, mainImageUrl: null};
  }
  if (listing._preferSalesImage) {
    const sourceImageUrl = extractPostSourceImageUrl(listing);
    const salesRaw = listing.sales_image_url ?? listing.salesImageUrl ?? null;
    const salesUrl = salesRaw != null && String(salesRaw).trim() !== '' ? String(salesRaw).trim() : null;
    const salesLooksLikeVideo =
      !!salesUrl && (/\.(mp4|m3u8|webm|mov|m4v)(\?|$)/i.test(salesUrl) || /\/videos?\//i.test(salesUrl));
    if (salesLooksLikeVideo) {
      return {videoUrl: salesUrl, mainImageUrl: sourceImageUrl || null};
    }
    if (sourceImageUrl) return {videoUrl: null, mainImageUrl: sourceImageUrl};
    if (salesUrl) return {videoUrl: null, mainImageUrl: salesUrl};
  }
  const listingVideos = listing.listing_videos || [];
  const videoUrl =
    (listing.video_url && String(listing.video_url).trim()) ||
    listingVideos[0]?.video_url ||
    listingVideos[0]?.video_playback_url ||
    null;
  const sourceImageUrl = extractPostSourceImageUrl(listing);
  const imgs = listing.listing_images || [];
  const main = imgs.find(i => i?.image_type === 'main');
  const mainImageUrl =
    sourceImageUrl ||
    (main?.image_url && String(main.image_url).trim()) ||
    (listing.main_image_url && String(listing.main_image_url).trim()) ||
    (listing.image && typeof listing.image === 'string' && String(listing.image).trim()) ||
    (Array.isArray(listing.images) && listing.images[0]?.uri ? String(listing.images[0].uri).trim() : null);
  return {
    videoUrl: videoUrl ? String(videoUrl).trim() : null,
    mainImageUrl: mainImageUrl ? String(mainImageUrl).trim() : null,
  };
}

/** Media URL(s) for thumbnail/card previews (composite when baked, clean bg when live text). */
export function resolveFeedPostDisplayMedia(listing) {
  const showOverlays = shouldRenderPostTextOverlaysOnFeed(listing);
  const {videoUrl, mainImageUrl} = extractPostListingMediaUrls(listing);
  if (videoUrl) return {videoUrl, imageUrl: null, showOverlays};
  if (showOverlays && mainImageUrl) return {videoUrl: null, imageUrl: mainImageUrl, showOverlays: true};
  const composite = (listing?.main_image_url && String(listing.main_image_url).trim()) || mainImageUrl || null;
  return {videoUrl: null, imageUrl: composite, showOverlays: false};
}

/** Live wallpaper/gradient is only for text-only posts; a real photo or video always wins. */
export function shouldUseLiveColorPostBackground(listing) {
  if (!resolvePostBackgroundGradient(listing)) return false;
  const {videoUrl, mainImageUrl} = extractPostListingMediaUrls(listing);
  if (videoUrl) return false;
  if (isRemotePostStillUrl(mainImageUrl)) return false;
  const feedImages = listing?.images;
  if (Array.isArray(feedImages)) {
    for (const img of feedImages) {
      const uri = typeof img === 'string' ? img : img?.uri || img?.url || img?.image_url;
      if (isRemotePostStillUrl(uri)) return false;
    }
  }
  const listingImages = listing?.listing_images;
  if (Array.isArray(listingImages)) {
    for (const img of listingImages) {
      const uri = typeof img === 'string' ? img : img?.image_url || img?.uri || img?.url;
      if (isRemotePostStillUrl(uri)) return false;
    }
  }
  return true;
}

/** Letterbox `aspect` (width/height) inside a cell. */
export function letterboxRect(cellWidth, cellHeight, aspect) {
  const a = aspect > 0 ? aspect : 9 / 16;
  const cw = Math.max(0, Number(cellWidth) || 0);
  const ch = Math.max(0, Number(cellHeight) || 0);
  if (!(cw > 0) || !(ch > 0)) return {width: 0, height: 0, left: 0, top: 0};
  let width = cw;
  let height = width / a;
  if (height > ch) {
    height = ch;
    width = height * a;
  }
  return {width, height, left: (cw - width) / 2, top: (ch - height) / 2};
}

/** Authored post canvas (the media+text stage — no editor/feed header). */
export function resolvePostStageCanvas(payload) {
  const overlays = Array.isArray(payload?.overlays) ? payload.overlays : [];
  const staged = overlays.find(o => Number(o?.stage_w) > 0 && Number(o?.stage_h) > 0);
  if (staged) return {width: Number(staged.stage_w), height: Number(staged.stage_h), source: 'stage'};
  const pw = Number(payload?.previewWidth) || 0;
  const ph = Number(payload?.previewHeight) || 0;
  if (pw > 0 && ph > 0) {
    return {
      width: Math.max(1, pw - POST_STAGE_MARGIN_H * 2),
      height: Math.max(1, ph - POST_STAGE_HEADER_BAND - POST_STAGE_MARGIN_TOP),
      source: 'preview-stripped',
    };
  }
  return {width: 9, height: 16, source: 'default'};
}

/** Scale a saved overlay block onto the target frame (normalized coords preferred). */
export const scalePostTextOverlayBlock = (
  block,
  {previewWidth, previewHeight, feedWidth, feedHeight, coordsSpace = 'preview', canvas = 'preview'},
) => {
  const isThumb = Number(feedWidth) > 0 && Number(feedWidth) < 220;
  const minFont = isThumb ? 5 : 10;
  const snapFont = raw => Math.max(minFont, Math.round(raw));
  const widthSlack = 2;
  const chipExtra = (fontSize, authoredFontSize) =>
    Number(block.bgMode) > 0 ? Math.ceil(20 * (fontSize / Math.max(1, authoredFontSize))) : 0;
  if (canvas === 'stage') {
    const stageW =
      Number(block.stage_w) > 0
        ? Number(block.stage_w)
        : previewWidth > 0
          ? Math.max(1, previewWidth - POST_STAGE_MARGIN_H * 2)
          : 0;
    const stageH =
      Number(block.stage_h) > 0
        ? Number(block.stage_h)
        : previewHeight > 0
          ? Math.max(1, previewHeight - POST_STAGE_HEADER_BAND - POST_STAGE_MARGIN_TOP)
          : 0;
    const stageX = Number(block.stage_x);
    const stageY = Number(block.stage_y);
    const authoredFontSize = block.fontSize ?? DEFAULT_FONT_SIZE;
    if (stageW > 0 && stageH > 0 && Number.isFinite(stageX) && Number.isFinite(stageY)) {
      const scale = feedWidth / stageW;
      const fontSize = snapFont(authoredFontSize * scale);
      return {
        translateX: Math.round(stageX * scale),
        translateY: Math.round(stageY * (feedHeight / stageH)),
        width: Math.ceil(
          (Number(block.maxWidth) > 0 ? Number(block.maxWidth) : stageW * 0.88) * scale +
            widthSlack +
            chipExtra(fontSize, authoredFontSize),
        ),
        padding: 0,
        fontSize,
        lineHeight: Math.round(fontSize * 1.15),
        scale: fontSize / Math.max(1, authoredFontSize),
        normalized: false,
      };
    }
    const nxStage = Number(block.nx);
    const nyStage = Number(block.ny);
    if (stageW > 0 && stageH > 0 && previewWidth > 0 && previewHeight > 0 && Number.isFinite(nxStage) && Number.isFinite(nyStage)) {
      const relX = (nxStage * previewWidth - POST_STAGE_MARGIN_H) / stageW;
      const relY = (nyStage * previewHeight - POST_STAGE_HEADER_BAND - POST_STAGE_MARGIN_TOP) / stageH;
      const nFontW = Number(block.nFontW);
      const scale = feedWidth / stageW;
      const fontSize = snapFont(
        Number.isFinite(nFontW) && nFontW > 0 ? nFontW * previewWidth * scale : authoredFontSize * scale,
      );
      const nw = Number(block.nw);
      return {
        translateX: Math.round(relX * feedWidth),
        translateY: Math.round(relY * feedHeight),
        width: Math.ceil(
          (Number.isFinite(nw) && nw > 0 ? nw * previewWidth : stageW * 0.88) * scale +
            widthSlack +
            chipExtra(fontSize, authoredFontSize),
        ),
        padding: 0,
        fontSize,
        lineHeight: Math.round(fontSize * 1.15),
        scale: fontSize / Math.max(1, authoredFontSize),
        normalized: true,
      };
    }
  }
  const nx = Number(block.nx);
  const ny = Number(block.ny);
  const nw = Number(block.nw);
  const nFont = Number(block.nFont);
  const hasNormalized =
    block.coords === 'normalized' ||
    coordsSpace === 'normalized' ||
    (Number.isFinite(nx) && Number.isFinite(ny) && nx >= -0.5 && nx <= 1.5 && ny >= -0.5 && ny <= 1.5);

  if (hasNormalized && Number.isFinite(nx) && Number.isFinite(ny)) {
    const authoredFontSize = block.fontSize ?? DEFAULT_FONT_SIZE;
    const nFontW = Number(block.nFontW);
    const rawFontSize =
      Number.isFinite(nFontW) && nFontW > 0
        ? nFontW * feedWidth
        : Number.isFinite(nFont) && nFont > 0 && previewWidth > 0 && previewHeight > 0
          ? nFont * previewHeight * (feedWidth / previewWidth)
          : Number.isFinite(nFont) && nFont > 0
            ? nFont * feedHeight
            : authoredFontSize * (previewWidth > 0 ? feedWidth / previewWidth : 1);
    const fontSize = snapFont(rawFontSize);
    const baseWidth = Number.isFinite(nw) && nw > 0 ? nw * feedWidth : feedWidth * 0.88;
    return {
      translateX: Math.round(nx * feedWidth),
      translateY: Math.round(ny * feedHeight),
      width: Math.ceil(baseWidth + widthSlack + chipExtra(fontSize, authoredFontSize)),
      padding: 0,
      fontSize,
      lineHeight: Math.round(fontSize * 1.15),
      scale: fontSize / Math.max(1, authoredFontSize),
      normalized: true,
    };
  }

  const useStageRemap = coordsSpace === 'stage';
  const mapWidth = useStageRemap && previewWidth > 0 ? previewWidth + POST_STAGE_MARGIN_H * 2 : previewWidth;
  const mapHeight =
    useStageRemap && previewHeight > 0 ? previewHeight + POST_STAGE_HEADER_BAND + POST_STAGE_MARGIN_TOP : previewHeight;
  const hasPreview = mapWidth > 0 && mapHeight > 0;
  const scaleX = hasPreview ? feedWidth / mapWidth : 1;
  const scaleY = hasPreview ? feedHeight / mapHeight : 1;
  const fontScale = hasPreview ? Math.min(scaleX, scaleY) : 1;
  const fontSize = snapFont((block.fontSize ?? DEFAULT_FONT_SIZE) * fontScale);
  const baseX = useStageRemap ? POST_STAGE_MARGIN_H + (block.x ?? 0) : block.x ?? 0;
  const baseY = useStageRemap ? POST_STAGE_HEADER_BAND + POST_STAGE_MARGIN_TOP + (block.y ?? 0) : block.y ?? 0;

  return {
    translateX: hasPreview ? Math.round(baseX * scaleX) : baseX,
    translateY: hasPreview ? Math.round(baseY * scaleY) : baseY,
    width:
      (block.maxWidth != null && hasPreview ? Math.round(block.maxWidth * scaleX) : Math.round(feedWidth * 0.88)) +
      widthSlack +
      chipExtra(fontSize, block.fontSize ?? DEFAULT_FONT_SIZE),
    padding: 0,
    fontSize,
    lineHeight: Math.round(fontSize * 1.15),
    scale: fontSize / Math.max(1, block.fontSize ?? DEFAULT_FONT_SIZE),
    normalized: false,
  };
};
