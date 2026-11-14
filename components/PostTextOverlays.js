import React, {useState} from 'react';
import {View, Text, StyleSheet, Platform, I18nManager} from 'react-native';
import {forceLtrStyle} from '../utils/rtlLayout';
import {
  getPostTextVisualStyle,
  POST_TEXT_STYLE_FONTS,
  scalePostTextOverlayBlock,
} from '../utils/postTextOverlay';

/** Literal textAlign is swapped by Android under forceRTL — map physical side
 * to the literal value that lands there (same logic as the post editor). */
const physicalTextAlign = align => {
  if (Platform.OS === 'web' || !I18nManager.isRTL) return align;
  if (align === 'left') return 'right';
  if (align === 'right') return 'left';
  return 'center';
};

/**
 * `left: 0` inside a 28px host. After layout, x near 0 means authored `left`
 * is the physical left. x near the far edge means this phone still mirrors
 * `left` (iOS Hebrew vs English locale disagrees with forceRTL).
 */
const leftAxisMirroredFromProbe = x => Number(x) > 10;

/**
 * Renders saved post text over feed media.
 * Prefers normalized nx/ny from measureInWindow at publish (WYSIWYG).
 *
 * The layer is forced LTR so `left` is the physical left on both phone
 * languages. A probe still checks: if this device mirrors `left` anyway,
 * the x is pre-flipped so the glyphs stay where they were placed.
 */
const PostTextOverlays = ({
  overlays,
  previewWidth = 0,
  previewHeight = 0,
  coordsSpace = 'preview',
  feedWidth,
  feedHeight,
  canvas = 'preview',
}) => {
  const [leftMirrored, setLeftMirrored] = useState(false);
  if (!Array.isArray(overlays) || overlays.length === 0) return null;

  const placeLeft = (x, width) => {
    const parentW = Number(feedWidth) || 0;
    const w = Math.max(0, Number(width) || 0);
    const px = Number(x) || 0;
    if (!leftMirrored || !(parentW > 0)) return px;
    return parentW - px - w;
  };

  return (
    <View style={styles.root} pointerEvents="none" collapsable={false}>
      <View style={styles.probeHost} pointerEvents="none" collapsable={false}>
        <View
          collapsable={false}
          style={styles.probeMark}
          onLayout={e => {
            const next = leftAxisMirroredFromProbe(e?.nativeEvent?.layout?.x);
            setLeftMirrored(prev => (prev === next ? prev : next));
          }}
        />
      </View>
      {overlays.map((block, index) => {
        const visual = getPostTextVisualStyle(block.color, block.bgMode);
        const layout = scalePostTextOverlayBlock(block, {
          previewWidth,
          previewHeight,
          feedWidth,
          feedHeight,
          coordsSpace,
          canvas,
        });
        const fontFamily =
          POST_TEXT_STYLE_FONTS[block.textStyleIndex ?? 0] ||
          POST_TEXT_STYLE_FONTS[0];
        const hasBackground = visual.backgroundColor !== 'transparent';
        const align = block.align || 'center';
        const isNormalized = layout.normalized === true;
        // Editor draws the chip at 10/4/8 around the authored font size; the
        // same ratio must hold here or the text wraps at a different word.
        const chipScale = layout.scale > 0 ? layout.scale : 1;

        return (
          <View
            key={`${index}-${String(block.text || '').slice(0, 12)}`}
            collapsable={false}
            style={[
              styles.blockWrap,
              {
                left: placeLeft(layout.translateX, layout.width),
                width: layout.width,
                maxWidth: layout.width,
                top: layout.translateY,
                padding: layout.padding ?? 0,
              },
            ]}>
            <View
              style={[
                forceLtrStyle,
                {
                  alignSelf: isNormalized
                    ? 'stretch'
                    : align === 'left'
                      ? 'flex-start'
                      : align === 'right'
                        ? 'flex-end'
                        : 'center',
                  maxWidth: '100%',
                },
                hasBackground && {
                  backgroundColor: visual.backgroundColor,
                  paddingHorizontal: Math.max(1, Math.floor(10 * chipScale)),
                  paddingVertical: Math.max(1, Math.floor(4 * chipScale)),
                  borderRadius: Math.max(2, Math.floor(8 * chipScale)),
                  overflow: 'hidden',
                },
              ]}>
              <Text
                allowFontScaling={false}
                includeFontPadding={false}
                textBreakStrategy="simple"
                style={[
                  styles.text,
                  {
                    color: visual.textColor,
                    fontSize: layout.fontSize,
                    lineHeight: layout.lineHeight,
                    textAlign: physicalTextAlign(align),
                    writingDirection: 'rtl',
                    fontFamily,
                  },
                ]}>
                {block.text}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    ...forceLtrStyle,
  },
  probeHost: {
    position: 'absolute',
    width: 28,
    height: 2,
    opacity: 0,
    top: 0,
    left: 0,
  },
  probeMark: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4,
    height: 2,
  },
  blockWrap: {
    position: 'absolute',
    justifyContent: 'center',
  },
  text: {
    flexShrink: 0,
  },
});

export default PostTextOverlays;
