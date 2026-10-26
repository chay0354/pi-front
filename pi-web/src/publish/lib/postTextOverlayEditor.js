/**
 * Editor-side helpers from mobile utils/postTextOverlay.js.
 * Shared read/display helpers live in ./postTextOverlay — do not duplicate them.
 */
import {getListings} from '../../api/client';
import {parseListingGeneralDetails} from './publishRules';
import {
  POST_STAGE_HEADER_BAND,
  POST_STAGE_MARGIN_H,
  POST_STAGE_MARGIN_TOP,
  parsePostBackgroundGradientIndex,
} from './postTextOverlay';

const DEFAULT_FONT_SIZE = 20;
const STAGE_TEXT_PAD_LEFT = 2;
const STAGE_TEXT_PAD_RIGHT = 2;
const STAGE_TEXT_PAD_Y = 12;

const getTextBlockBoxWidth = stageWidth =>
  Math.max(80, Math.max(1, Number(stageWidth) || 300) - STAGE_TEXT_PAD_LEFT - STAGE_TEXT_PAD_RIGHT);

const getDefaultTextBlockY = (stageH, blockH = 40) => {
  const sh = Math.max(1, Number(stageH) || 1);
  const bh = Math.max(1, Number(blockH) || 1);
  return Math.max(STAGE_TEXT_PAD_Y, (sh - bh) / 2);
};

export const mapStageOverlayToPreview = (block, {stageOffsetX, stageOffsetY, stageWidth, stageHeight}) => {
  const stageW = Math.max(1, Number(stageWidth) || 1);
  const stageH = Math.max(1, Number(stageHeight) || 1);
  const boxWidth = getTextBlockBoxWidth(stageW);
  return {
    x: Math.round((Number(stageOffsetX) || 0) + (block.x ?? STAGE_TEXT_PAD_LEFT)),
    y: Math.round((Number(stageOffsetY) || 0) + (block.y ?? getDefaultTextBlockY(stageH, 40))),
    maxWidth: boxWidth,
  };
};

export const serializePostTextOverlays = (
  textBlocks,
  stageLayout,
  {
    textModeOverlayText = '',
    textContent = '',
    stageMapping = null,
    measuredContentById = null,
    previewBox = null,
  } = {},
) => {
  const blocks = Array.isArray(textBlocks) ? textBlocks : [];
  const stageW = stageLayout?.width > 0 ? stageLayout.width : 0;
  const stageH = stageLayout?.height > 0 ? stageLayout.height : 0;

  const previewWidth =
    previewBox?.w > 0
      ? previewBox.w
      : stageMapping?.previewWidth > 0
        ? stageMapping.previewWidth
        : stageW > 0
          ? stageW + POST_STAGE_MARGIN_H * 2
          : 0;
  const previewHeight =
    previewBox?.h > 0 ? previewBox.h : stageMapping?.previewHeight > 0 ? stageMapping.previewHeight : stageH;

  const stageOffsetX = stageMapping?.stageOffsetX != null ? stageMapping.stageOffsetX : POST_STAGE_MARGIN_H;
  const stageOffsetY =
    stageMapping?.stageOffsetY != null ? stageMapping.stageOffsetY : POST_STAGE_HEADER_BAND + POST_STAGE_MARGIN_TOP;

  const mapping = {
    stageOffsetX,
    stageOffsetY,
    stageWidth: stageMapping?.stageWidth > 0 ? stageMapping.stageWidth : stageW,
    stageHeight: stageMapping?.stageHeight > 0 ? stageMapping.stageHeight : stageH,
  };

  const canNormalize =
    previewBox?.w > 0 && previewBox?.h > 0 && measuredContentById && typeof measuredContentById === 'object';

  const overlays = blocks
    .filter(b => String(b?.text || '').trim())
    .map(b => {
      const fontSize = b.fontSize ?? DEFAULT_FONT_SIZE;
      const measured = canNormalize ? measuredContentById[b.id] : null;
      const previewPos = mapStageOverlayToPreview(b, mapping);

      const stageX = Number(b.x);
      const stageY = Number(b.y);
      const hasStagePos = Number.isFinite(stageX) && Number.isFinite(stageY);
      const base = {
        text: String(b.text).trim(),
        x: previewPos.x,
        y: previewPos.y,
        fontSize,
        color: b.color || '#FFFFFF',
        bgMode: b.bgMode ?? 0,
        textStyleIndex: b.textStyleIndex ?? 0,
        align: b.align || 'center',
        maxWidth: previewPos.maxWidth,
        ...(hasStagePos
          ? {
              stage_x: Math.round(stageX),
              stage_y: Math.round(stageY),
              stage_w: Math.round(mapping.stageWidth),
              stage_h: Math.round(mapping.stageHeight),
            }
          : null),
      };

      if (
        measured &&
        measured.w > 0 &&
        measured.h >= 0 &&
        Number.isFinite(measured.x) &&
        Number.isFinite(measured.y)
      ) {
        const nx = (measured.x - previewBox.x) / previewBox.w;
        const ny = (measured.y - previewBox.y) / previewBox.h;
        const nw = measured.w / previewBox.w;
        const nFont = fontSize / previewBox.h;
        return {
          ...base,
          x: Math.round(measured.x - previewBox.x),
          y: Math.round(measured.y - previewBox.y),
          maxWidth: Math.round(measured.w),
          nx: Number(nx.toFixed(5)),
          ny: Number(ny.toFixed(5)),
          nw: Number(nw.toFixed(5)),
          nFont: Number(nFont.toFixed(5)),
          nFontW: Number((fontSize / previewBox.w).toFixed(5)),
          nh: Number((measured.h / previewBox.h).toFixed(5)),
          coords: 'normalized',
        };
      }

      return base;
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
    coordsSpace: overlays.some(o => o.coords === 'normalized') ? 'normalized' : 'preview',
  };
};

export const buildPostTextGeneralDetails = (
  postTextMeta,
  {sourceImageUrl = null, textBakedIntoImage = false, backgroundGradientIndex = null} = {},
) => {
  if (!postTextMeta?.overlays?.length) {
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
  const source = sourceImageUrl != null ? String(sourceImageUrl).trim() : '';
  if (source) {
    gd.post_source_image_url = source;
  }
  if (textBakedIntoImage) {
    gd.post_text_baked = true;
  }
  gd.post_bg_gradient_index = parsePostBackgroundGradientIndex(backgroundGradientIndex);
  return gd;
};

export function parseListingHashtagsForEditor(listing) {
  if (Array.isArray(listing?.hashtags)) {
    return listing.hashtags.map(t => String(t || '').trim().replace(/^#+/, '')).filter(Boolean);
  }
  const gd = parseListingGeneralDetails(listing?.general_details);
  let raw = gd?.hashtags ?? null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      raw = Array.isArray(parsed) ? parsed : null;
    } catch {
      raw = raw
        .split(/[\s,]+/)
        .map(t => t.trim().replace(/^#+/, ''))
        .filter(Boolean);
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map(t => String(t || '').trim().replace(/^#+/, '')).filter(Boolean);
}

export function hydratePostEditorBlocksFromOverlays(payload, stageLayout) {
  if (!payload?.overlays?.length) return [];
  const stageW = stageLayout?.width > 0 ? stageLayout.width : 300;
  const stageH = stageLayout?.height > 0 ? stageLayout.height : 300;
  const stageOffsetX = POST_STAGE_MARGIN_H;
  const stageOffsetY = POST_STAGE_HEADER_BAND + POST_STAGE_MARGIN_TOP;
  const previewW = payload.previewWidth > 0 ? payload.previewWidth : stageW + POST_STAGE_MARGIN_H * 2;
  const previewH = payload.previewHeight > 0 ? payload.previewHeight : stageH + stageOffsetY;
  const boxWidth = getTextBlockBoxWidth(stageW);
  const TOUCH_PAD = 24;
  const innerW = Math.max(1, boxWidth - TOUCH_PAD * 2);

  return payload.overlays.map((overlay, index) => {
    let x = overlay.x ?? STAGE_TEXT_PAD_LEFT;
    let y = overlay.y ?? getDefaultTextBlockY(stageH, 40);
    const align = overlay.align || 'center';
    const savedStageX = Number(overlay.stage_x);
    const savedStageY = Number(overlay.stage_y);
    const savedStageW = Number(overlay.stage_w);
    const savedStageH = Number(overlay.stage_h);
    const nx = Number(overlay.nx);
    const ny = Number(overlay.ny);
    const nw = Number(overlay.nw);

    if (Number.isFinite(savedStageX) && Number.isFinite(savedStageY)) {
      const scaleX = savedStageW > 0 && stageW > 0 ? stageW / savedStageW : 1;
      const scaleY = savedStageH > 0 && stageH > 0 ? stageH / savedStageH : 1;
      x = savedStageX * scaleX;
      y = savedStageY * scaleY;
    } else if (
      (overlay.coords === 'normalized' || payload.coordsSpace === 'normalized') &&
      Number.isFinite(nx) &&
      Number.isFinite(ny)
    ) {
      const glyphLeft = nx * previewW - stageOffsetX;
      const glyphTop = ny * previewH - stageOffsetY;
      const glyphW = Number.isFinite(nw) && nw > 0 ? nw * previewW : Math.min(innerW, 120);
      if (align === 'right') {
        x = glyphLeft - TOUCH_PAD - (innerW - glyphW);
      } else if (align === 'center') {
        x = glyphLeft - TOUCH_PAD - (innerW - glyphW) / 2;
      } else {
        x = glyphLeft - TOUCH_PAD;
      }
      y = glyphTop - TOUCH_PAD;
    } else if (payload.coordsSpace === 'preview') {
      x = (overlay.x ?? 0) - stageOffsetX;
      y = (overlay.y ?? 0) - stageOffsetY;
    }
    x = Math.max(-boxWidth, Math.min(Number(x) || 0, stageW));
    y = Math.max(STAGE_TEXT_PAD_Y, Math.min(Number(y) || 0, stageH - 40 - STAGE_TEXT_PAD_Y));
    const fontSize =
      Number.isFinite(Number(overlay.nFont)) && Number(overlay.nFont) > 0
        ? Math.max(10, Math.round(Number(overlay.nFont) * previewH))
        : overlay.fontSize ?? DEFAULT_FONT_SIZE;
    return {
      id: `block-edit-${index}-${Date.now()}`,
      text: String(overlay.text || '').trim(),
      x,
      y,
      fontSize,
      color: overlay.color || '#FFFFFF',
      bgMode: overlay.bgMode ?? 0,
      textStyleIndex: overlay.textStyleIndex ?? 0,
      align,
      stackOrder: index + 1,
    };
  });
}

const normalizeMediaUrlForCompare = url => {
  if (url == null || url === '') return '';
  return String(url).trim().split('?')[0].toLowerCase();
};

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
  if (!generalDetails?.post_text_overlays?.length && adGd?.sales_image_editor && typeof adGd.sales_image_editor === 'object') {
    generalDetails = {...adGd.sales_image_editor};
  }

  if (!generalDetails?.post_text_overlays?.length && subscriptionId) {
    try {
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
    } catch {
      /* companion lookup is best-effort */
    }
  }

  const sourceImageUrl =
    (editorMeta?.sourceImageUrl && String(editorMeta.sourceImageUrl).trim()) ||
    (generalDetails?.post_source_image_url && String(generalDetails.post_source_image_url).trim()) ||
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
