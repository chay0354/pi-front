const DEFAULT_FONT_SIZE = 20;
const STAGE_TEXT_PAD_LEFT = 2;
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
  // Sales-image text lives under sales_image_editor on regular ads. Only read it
  // when explicitly editing/previewing the sales image — never on the main ad
  // media in the feed (that was drawing תמונה מכירתית text on the ad image).
  if (
    listing?._preferSalesImage === true &&
    (!Array.isArray(gd.post_text_overlays) ||
      gd.post_text_overlays.length === 0) &&
    gd.sales_image_editor &&
    typeof gd.sales_image_editor === 'object'
  ) {
    gd = gd.sales_image_editor;
  }
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

/** general_details fragment to persist overlay layout for a post. */
export const buildPostTextGeneralDetails = (
  postTextMeta,
  {
    sourceImageUrl = null,
    textBakedIntoImage = false,
    backgroundGradientIndex = null,
  } = {},
) => {
  if (!postTextMeta?.overlays?.length) {
    // Explicit clear so edits that remove all text don't leave stale overlays.
    return {
      post_text_overlays: [],
      post_overlay_preview_w: null,
      post_overlay_preview_h: null,
      post_source_image_url: null,
      post_text_baked: false,
      post_bg_gradient_index: null,
    };
  }
  const gd = {post_text_overlays: postTextMeta.overlays};
  if (postTextMeta.previewWidth > 0) {
    gd.post_overlay_preview_w = postTextMeta.previewWidth;
  }
  if (postTextMeta.previewHeight > 0) {
    gd.post_overlay_preview_h = postTextMeta.previewHeight;
  }
  const source =
    sourceImageUrl != null ? String(sourceImageUrl).trim() : '';
  if (source) {
    gd.post_source_image_url = source;
  }
  if (textBakedIntoImage) {
    gd.post_text_baked = true;
  }
  const gradientIdx = Number(backgroundGradientIndex);
  if (Number.isFinite(gradientIdx) && gradientIdx >= 0) {
    gd.post_bg_gradient_index = gradientIdx;
  }
  return gd;
};

/**
 * Editor restore info for a previously published post: whether the feed image
 * has the text burned in, the clean source image (if stored), and the gradient
 * background index for text-on-gradient posts.
 */
function resolveEditorGeneralDetails(listing) {
  const gd = parseListingGeneralDetails(listing?.general_details);
  if (!gd) return null;
  if (
    listing?._preferSalesImage &&
    gd.sales_image_editor &&
    typeof gd.sales_image_editor === 'object'
  ) {
    return gd.sales_image_editor;
  }
  return gd;
}

export function parsePostEditorRestoreInfo(listing) {
  const gd = resolveEditorGeneralDetails(listing);
  const source =
    gd?.post_source_image_url != null
      ? String(gd.post_source_image_url).trim()
      : '';
  const gradientIdx = Number(gd?.post_bg_gradient_index);
  return {
    textBaked: gd?.post_text_baked === true,
    sourceImageUrl: source || null,
    bgGradientIndex:
      Number.isFinite(gradientIdx) && gradientIdx >= 0 ? gradientIdx : null,
  };
}

/**
 * Clean background image for the editor (not a baked composite with text).
 * Prefers `post_source_image_url` when the feed image has text burned in.
 */
export function extractPostSourceImageUrl(listing) {
  const gd = resolveEditorGeneralDetails(listing);
  const source =
    gd?.post_source_image_url != null
      ? String(gd.post_source_image_url).trim()
      : '';
  return source || null;
}

/** True when feed should draw live text overlays (not already baked into pixels). */
export function shouldRenderPostTextOverlaysOnFeed(listing) {
  // Regular listing ads must never show post/sales text overlays on main media.
  const isFeedPost =
    listing?.feed_post === true ||
    listing?.feed_post === 'true' ||
    listing?.feed_post === 't' ||
    listing?.isPost === true ||
    listing?.type === 'post' ||
    listing?.type === 'feed_post';
  if (!isFeedPost) return false;

  const payload = parsePostTextOverlayPayload(listing);
  if (!payload?.overlays?.length) return false;
  const gd = parseListingGeneralDetails(listing?.general_details);
  if (gd?.post_text_baked === true) return false;
  return true;
}

/** Extract main image / video URLs from a listing row for post editor hydration. */
export function extractPostListingMediaUrls(listing) {
  if (!listing || typeof listing !== 'object') {
    return {videoUrl: null, mainImageUrl: null};
  }
  if (listing._preferSalesImage) {
    // Prefer clean source when text was baked into the sales composite so
    // overlays can be edited instead of tapping dead pixels on the bake.
    const sourceImageUrl = extractPostSourceImageUrl(listing);
    const salesRaw =
      listing.sales_image_url ?? listing.salesImageUrl ?? null;
    const salesUrl =
      salesRaw != null && String(salesRaw).trim() !== ''
        ? String(salesRaw).trim()
        : null;
    const salesLooksLikeVideo =
      !!salesUrl &&
      (/\.(mp4|m3u8|webm|mov|m4v)(\?|$)/i.test(salesUrl) ||
        /\/videos?\//i.test(salesUrl));
    if (salesLooksLikeVideo) {
      return {
        videoUrl: salesUrl,
        mainImageUrl: sourceImageUrl || null,
      };
    }
    if (sourceImageUrl) {
      return {videoUrl: null, mainImageUrl: sourceImageUrl};
    }
    if (salesUrl) {
      return {videoUrl: null, mainImageUrl: salesUrl};
    }
  }
  const listingVideos = listing.listing_videos || [];
  const videoUrl =
    (listing.video_url && String(listing.video_url).trim()) ||
    listingVideos[0]?.video_url ||
    listingVideos[0]?.video_playback_url ||
    null;
  // Prefer the clean source image so re-opened edits get editable text layers
  // instead of a baked composite with text burned in.
  const sourceImageUrl = extractPostSourceImageUrl(listing);
  const imgs = listing.listing_images || [];
  const main = imgs.find(i => i?.image_type === 'main');
  let mainImageUrl =
    sourceImageUrl ||
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
    // Loose x clamp: text can be freely positioned, so the box may hang past
    // the stage edges; the editor re-clamps precisely against glyph bounds.
    x = Math.max(-boxWidth, Math.min(Number(x) || 0, stageW));
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

const normalizeMediaUrlForCompare = url => {
  if (url == null || url === '') return '';
  return String(url).trim().split('?')[0].toLowerCase();
};

/**
 * Build PostEditor initialListing for תמונה מכירתית edit.
 * Loads overlay metadata from the ad (sales_image_editor) or the companion
 * feed post that shares the same image URL (older ads like #24).
 */
export async function resolveSalesImageEditorListing({
  salesImageUrl,
  subscriptionId,
  editorMeta = null,
  adGeneralDetails = null,
}) {
  const trimmed = String(salesImageUrl || '').trim();
  if (!trimmed) return null;

  let generalDetails =
    editorMeta?.generalDetails && typeof editorMeta.generalDetails === 'object'
      ? {...editorMeta.generalDetails}
      : null;

  const adGd = parseListingGeneralDetails(adGeneralDetails);
  if (
    (!generalDetails?.post_text_overlays?.length) &&
    adGd?.sales_image_editor &&
    typeof adGd.sales_image_editor === 'object'
  ) {
    generalDetails = {...adGd.sales_image_editor};
  }

  if (!generalDetails?.post_text_overlays?.length && subscriptionId) {
    try {
      const {getListings} = await import('./api');
      const res = await getListings({
        subscription_id: subscriptionId,
        feed_post: true,
        status: 'published',
      });
      const target = normalizeMediaUrlForCompare(trimmed);
      const companion = (res?.listings || []).find(
        row =>
          normalizeMediaUrlForCompare(row?.main_image_url) === target ||
          normalizeMediaUrlForCompare(row?.video_url) === target,
      );
      if (companion?.general_details) {
        const pgd = parseListingGeneralDetails(companion.general_details);
        if (Array.isArray(pgd?.post_text_overlays) && pgd.post_text_overlays.length) {
          generalDetails = {...pgd};
        }
      }
    } catch (_) {
      /* companion lookup is best-effort */
    }
  }

  const sourceImageUrl =
    (editorMeta?.sourceImageUrl &&
      String(editorMeta.sourceImageUrl).trim()) ||
    (generalDetails?.post_source_image_url &&
      String(generalDetails.post_source_image_url).trim()) ||
    null;

  const listing = {
    _preferSalesImage: true,
    sales_image_url: trimmed,
    main_image_url: trimmed,
  };

  if (generalDetails && typeof generalDetails === 'object') {
    listing.general_details = sourceImageUrl
      ? {...generalDetails, post_source_image_url: sourceImageUrl}
      : generalDetails;
  }

  return listing;
}
