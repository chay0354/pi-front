const DEFAULT_FONT_SIZE = 20;
const STAGE_TEXT_PAD_LEFT = 8;
const STAGE_TEXT_PAD_RIGHT = 2;
const STAGE_TEXT_PAD_Y = 12;
/** Matches PostEditorScreen styles.stage marginHorizontal. */
export const POST_STAGE_MARGIN_H = 22;
/** Matches PostEditorScreen styles.stage marginTop. */
export const POST_STAGE_MARGIN_TOP = 10;
/** Approx header band above the stage when measureInWindow is unavailable. */
export const POST_STAGE_HEADER_BAND = 70;

/** Matches PostEditorScreen TEXT_STYLES / Figma 35:293454. */
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
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const mix = (ch, amt) => Math.round(ch + (255 - ch) * amt);
  const toHex = v => v.toString(16).padStart(2, '0');
  return `#${toHex(mix(r, amount))}${toHex(mix(g, amount))}${toHex(
    mix(b, amount),
  )}`;
};

export const getPostTextVisualStyle = (baseColor, bgMode = 0) => {
  const color = baseColor || '#FFFFFF';
  if (bgMode === 1) {
    return {textColor: '#FFFFFF', backgroundColor: color};
  }
  if (bgMode === 2) {
    return {textColor: color, backgroundColor: lightenColor(color, 0.8)};
  }
  return {textColor: color, backgroundColor: 'transparent'};
};

const getTextBlockBoxWidth = stageWidth =>
  Math.max(
    80,
    Math.max(1, Number(stageWidth) || 300) -
      STAGE_TEXT_PAD_LEFT -
      STAGE_TEXT_PAD_RIGHT,
  );

const getDefaultTextBlockY = (stageH, blockH = 40) => {
  const sh = Math.max(1, Number(stageH) || 1);
  const bh = Math.max(1, Number(blockH) || 1);
  return Math.max(STAGE_TEXT_PAD_Y, (sh - bh) / 2);
};

/** Map stage-local coords to preview-root coords (full editor canvas). */
export const mapStageOverlayToPreview = (
  block,
  {stageOffsetX, stageOffsetY, stageWidth, stageHeight},
) => {
  const stageW = Math.max(1, Number(stageWidth) || 1);
  const stageH = Math.max(1, Number(stageHeight) || 1);
  const boxWidth = getTextBlockBoxWidth(stageW);
  return {
    x: Math.round(
      (Number(stageOffsetX) || 0) + (block.x ?? STAGE_TEXT_PAD_LEFT),
    ),
    y: Math.round(
      (Number(stageOffsetY) || 0) +
        (block.y ?? getDefaultTextBlockY(stageH, 40)),
    ),
    maxWidth: boxWidth,
  };
};

/**
 * Convert the editor's text blocks into a serializable overlay payload plus a
 * plain-text description. Positions are stored in preview-root coordinates so
 * the feed can scale them to any screen size while keeping the exact layout.
 */
export const serializePostTextOverlays = (
  textBlocks,
  stageLayout,
  {textModeOverlayText = '', textContent = '', stageMapping = null} = {},
) => {
  const blocks = Array.isArray(textBlocks) ? textBlocks : [];
  const stageW = stageLayout?.width > 0 ? stageLayout.width : 0;
  const stageH = stageLayout?.height > 0 ? stageLayout.height : 0;

  const previewWidth =
    stageMapping?.previewWidth > 0
      ? stageMapping.previewWidth
      : stageW > 0
        ? stageW + POST_STAGE_MARGIN_H * 2
        : 0;
  const previewHeight =
    stageMapping?.previewHeight > 0 ? stageMapping.previewHeight : stageH;

  const stageOffsetX =
    stageMapping?.stageOffsetX != null
      ? stageMapping.stageOffsetX
      : POST_STAGE_MARGIN_H;
  const stageOffsetY =
    stageMapping?.stageOffsetY != null
      ? stageMapping.stageOffsetY
      : POST_STAGE_HEADER_BAND + POST_STAGE_MARGIN_TOP;

  const mapping = {
    stageOffsetX,
    stageOffsetY,
    stageWidth: stageMapping?.stageWidth > 0 ? stageMapping.stageWidth : stageW,
    stageHeight:
      stageMapping?.stageHeight > 0 ? stageMapping.stageHeight : stageH,
  };

  const overlays = blocks
    .filter(b => String(b?.text || '').trim())
    .map(b => {
      const previewPos = mapStageOverlayToPreview(b, mapping);
      return {
        text: String(b.text).trim(),
        x: previewPos.x,
        y: previewPos.y,
        fontSize: b.fontSize ?? DEFAULT_FONT_SIZE,
        color: b.color || '#FFFFFF',
        bgMode: b.bgMode ?? 0,
        textStyleIndex: b.textStyleIndex ?? 0,
        align: b.align || 'center',
        maxWidth: previewPos.maxWidth,
      };
    });

  let description = overlays
    .map(o => o.text)
    .join('\n')
    .trim();
  if (!description) {
    description = String(textModeOverlayText || textContent || '').trim();
  }

  return {
    description,
    overlays,
    previewWidth,
    previewHeight,
    hasText: overlays.length > 0,
  };
};

/**
 * Read a saved overlay payload back from a listing. Returns null unless the
 * listing was created with explicit overlay data — this is the strict gate that
 * prevents regular ads (which only have a description) from ever showing text.
 */
export const parsePostTextOverlayPayload = listing => {
  let gd = listing?.general_details;
  if (typeof gd === 'string') {
    try {
      gd = JSON.parse(gd);
    } catch (_) {
      gd = null;
    }
  }
  if (!gd || typeof gd !== 'object') return null;
  const overlays = gd.post_text_overlays;
  if (!Array.isArray(overlays) || overlays.length === 0) return null;

  const previewWidth =
    Number(gd.post_overlay_preview_w) ||
    Number(gd.post_overlay_stage_w) ||
    0;
  const previewHeight =
    Number(gd.post_overlay_preview_h) ||
    Number(gd.post_overlay_stage_h) ||
    0;
  const coordsSpace = Number(gd.post_overlay_preview_w) > 0 ? 'preview' : 'stage';

  return {
    overlays,
    previewWidth,
    previewHeight,
    coordsSpace,
  };
};

/** general_details fragment to persist overlay layout for a video post. */
export const buildPostTextGeneralDetails = postTextMeta => {
  if (!postTextMeta?.overlays?.length) return null;
  const gd = {post_text_overlays: postTextMeta.overlays};
  if (postTextMeta.previewWidth > 0) {
    gd.post_overlay_preview_w = postTextMeta.previewWidth;
  }
  if (postTextMeta.previewHeight > 0) {
    gd.post_overlay_preview_h = postTextMeta.previewHeight;
  }
  return gd;
};

/** Extract main image / video URLs from a listing row for post editor hydration. */
export function extractPostListingMediaUrls(listing) {
  if (!listing || typeof listing !== 'object') {
    return {videoUrl: null, mainImageUrl: null};
  }
  const listingVideos = listing.listing_videos || [];
  const videoUrl =
    (listing.video_url && String(listing.video_url).trim()) ||
    listingVideos[0]?.video_url ||
    listingVideos[0]?.video_playback_url ||
    null;
  const imgs = listing.listing_images || [];
  const main = imgs.find(i => i?.image_type === 'main');
  let mainImageUrl =
    (main?.image_url && String(main.image_url).trim()) ||
    (listing.main_image_url && String(listing.main_image_url).trim()) ||
    (listing.image && String(listing.image).trim()) ||
    (Array.isArray(listing.images) && listing.images[0]?.uri
      ? String(listing.images[0].uri).trim()
      : null);
  if (mainImageUrl && /post_\d/i.test(mainImageUrl) && !videoUrl) {
    /* keep placeholder for text-only posts */
  }
  return {
    videoUrl: videoUrl ? String(videoUrl).trim() : null,
    mainImageUrl: mainImageUrl ? String(mainImageUrl).trim() : null,
  };
}

function parseListingGeneralDetails(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return null;
    try {
      const parsed = JSON.parse(s);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : null;
    } catch (_) {
      return null;
    }
  }
  return null;
}

/** Hashtags from listing.general_details or top-level hashtags. */
export function parseListingHashtagsForEditor(listing) {
  if (Array.isArray(listing?.hashtags)) {
    return listing.hashtags
      .map(t => String(t || '').trim().replace(/^#+/, ''))
      .filter(Boolean);
  }
  const gd = parseListingGeneralDetails(listing?.general_details);
  let raw = gd?.hashtags ?? null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      raw = Array.isArray(parsed) ? parsed : null;
    } catch (_) {
      raw = raw
        .split(/[\s,]+/)
        .map(t => t.trim().replace(/^#+/, ''))
        .filter(Boolean);
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map(t => String(t || '').trim().replace(/^#+/, ''))
    .filter(Boolean);
}

/** Map saved overlay payload back into PostEditor text block shape. */
export function hydratePostEditorBlocksFromOverlays(payload, stageLayout) {
  if (!payload?.overlays?.length) return [];
  const stageW = stageLayout?.width > 0 ? stageLayout.width : 300;
  const stageH = stageLayout?.height > 0 ? stageLayout.height : 300;
  const stageOffsetX = POST_STAGE_MARGIN_H;
  const stageOffsetY = POST_STAGE_HEADER_BAND + POST_STAGE_MARGIN_TOP;

  return payload.overlays.map((overlay, index) => {
    let x = overlay.x ?? STAGE_TEXT_PAD_LEFT;
    let y = overlay.y ?? getDefaultTextBlockY(stageH, 40);
    if (payload.coordsSpace === 'preview') {
      x = (overlay.x ?? 0) - stageOffsetX;
      y = (overlay.y ?? 0) - stageOffsetY;
    }
    const boxWidth = getTextBlockBoxWidth(stageW);
    x = Math.max(
      STAGE_TEXT_PAD_LEFT,
      Math.min(Number(x) || 0, stageW - boxWidth - STAGE_TEXT_PAD_RIGHT),
    );
    y = Math.max(
      STAGE_TEXT_PAD_Y,
      Math.min(Number(y) || 0, stageH - 40 - STAGE_TEXT_PAD_Y),
    );
    return {
      id: `block-edit-${index}-${Date.now()}`,
      text: String(overlay.text || '').trim(),
      x,
      y,
      fontSize: overlay.fontSize ?? DEFAULT_FONT_SIZE,
      color: overlay.color || '#FFFFFF',
      bgMode: overlay.bgMode ?? 0,
      textStyleIndex: overlay.textStyleIndex ?? 0,
      align: overlay.align || 'center',
      stackOrder: index + 1,
    };
  });
}

/** Scale a saved overlay block from preview coords to feed coords. */
export const scalePostTextOverlayBlock = (
  block,
  {previewWidth, previewHeight, feedWidth, feedHeight, coordsSpace = 'preview'},
) => {
  const useStageRemap = coordsSpace === 'stage';
  const mapWidth =
    useStageRemap && previewWidth > 0
      ? previewWidth + POST_STAGE_MARGIN_H * 2
      : previewWidth;
  const mapHeight =
    useStageRemap && previewHeight > 0
      ? previewHeight + POST_STAGE_HEADER_BAND + POST_STAGE_MARGIN_TOP
      : previewHeight;
  const hasPreview = mapWidth > 0 && mapHeight > 0;
  const scaleX = hasPreview ? feedWidth / mapWidth : 1;
  const scaleY = hasPreview ? feedHeight / mapHeight : 1;
  const uniformScale = hasPreview ? Math.min(scaleX, scaleY) : 1;
  const fontSize = Math.max(
    10,
    Math.round((block.fontSize ?? DEFAULT_FONT_SIZE) * uniformScale),
  );

  const baseX = useStageRemap
    ? POST_STAGE_MARGIN_H + (block.x ?? 0)
    : block.x ?? 0;
  const baseY = useStageRemap
    ? POST_STAGE_HEADER_BAND + POST_STAGE_MARGIN_TOP + (block.y ?? 0)
    : block.y ?? 0;

  return {
    translateX: hasPreview ? Math.round(baseX * scaleX) : baseX,
    translateY: hasPreview ? Math.round(baseY * scaleY) : baseY,
    width:
      block.maxWidth != null && hasPreview
        ? Math.round(block.maxWidth * scaleX)
        : Math.round(feedWidth * 0.88),
    fontSize,
    lineHeight: Math.round(fontSize * 1.15),
  };
};
