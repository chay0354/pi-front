const DEFAULT_FONT_SIZE = 20;
const STAGE_TEXT_PAD_LEFT = 8;
const STAGE_TEXT_PAD_RIGHT = 2;
const STAGE_TEXT_PAD_Y = 12;

export const POST_TEXT_STYLE_FONTS = [
  'Rubik-Bold',
  'Rubik-SemiBold',
  'Rubik-Medium',
  'Rubik-Regular',
  'Rubik-Light',
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

/**
 * Convert the editor's text blocks into a serializable overlay payload plus a
 * plain-text description. Stage dimensions are stored so the feed can scale the
 * text to any screen size while keeping the exact editor layout.
 */
export const serializePostTextOverlays = (
  textBlocks,
  stageLayout,
  {textModeOverlayText = '', textContent = ''} = {},
) => {
  const blocks = Array.isArray(textBlocks) ? textBlocks : [];
  const stageW = stageLayout?.width > 0 ? stageLayout.width : 0;
  const stageH = stageLayout?.height > 0 ? stageLayout.height : 0;
  const boxWidth = stageW > 0 ? getTextBlockBoxWidth(stageW) : null;

  const overlays = blocks
    .filter(b => String(b?.text || '').trim())
    .map(b => ({
      text: String(b.text).trim(),
      x: Math.round(b.x ?? STAGE_TEXT_PAD_LEFT),
      y: Math.round(b.y ?? getDefaultTextBlockY(stageH, 40)),
      fontSize: b.fontSize ?? DEFAULT_FONT_SIZE,
      color: b.color || '#FFFFFF',
      bgMode: b.bgMode ?? 0,
      textStyleIndex: b.textStyleIndex ?? 0,
      align: b.align || 'center',
      maxWidth: boxWidth,
    }));

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
    stageWidth: stageW,
    stageHeight: stageH,
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
  return {
    overlays,
    stageWidth: Number(gd.post_overlay_stage_w) || 0,
    stageHeight: Number(gd.post_overlay_stage_h) || 0,
  };
};

/** general_details fragment to persist overlay layout for a video post. */
export const buildPostTextGeneralDetails = postTextMeta => {
  if (!postTextMeta?.overlays?.length) return null;
  const gd = {post_text_overlays: postTextMeta.overlays};
  if (postTextMeta.stageWidth > 0) gd.post_overlay_stage_w = postTextMeta.stageWidth;
  if (postTextMeta.stageHeight > 0) gd.post_overlay_stage_h = postTextMeta.stageHeight;
  return gd;
};

/** Scale a saved overlay block from editor stage coords to feed coords. */
export const scalePostTextOverlayBlock = (
  block,
  {stageWidth, stageHeight, feedWidth, feedHeight},
) => {
  const hasStage = stageWidth > 0 && stageHeight > 0;
  const scaleX = hasStage ? feedWidth / stageWidth : 1;
  const scaleY = hasStage ? feedHeight / stageHeight : 1;
  const uniformScale = hasStage ? Math.min(scaleX, scaleY) : 1;
  const fontSize = Math.max(
    10,
    Math.round((block.fontSize ?? DEFAULT_FONT_SIZE) * uniformScale),
  );
  return {
    left: hasStage ? Math.round((block.x ?? 0) * scaleX) : block.x ?? 0,
    top: hasStage ? Math.round((block.y ?? 0) * scaleY) : block.y ?? 0,
    fontSize,
    lineHeight: Math.round(fontSize * 1.15),
    maxWidth:
      block.maxWidth != null && hasStage
        ? Math.round(block.maxWidth * scaleX)
        : Math.round(feedWidth * 0.88),
  };
};
