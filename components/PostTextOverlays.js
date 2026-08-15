import React from 'react';
import {View, Text, StyleSheet, Platform, I18nManager} from 'react-native';
import {forceLtrStyle, physicalLeftStyle} from '../utils/rtlLayout';
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
 * Renders saved post text over feed media.
 * Prefers normalized nx/ny from measureInWindow at publish (WYSIWYG).
 *
 * X position uses physicalLeftStyle: measureInWindow is physical-left based,
 * but native forceRTL mirrors style `left` — without the pre-flip, every block
 * lands on the opposite side of the frame.
 */
const PostTextOverlays = ({
  overlays,
  previewWidth = 0,
  previewHeight = 0,
  coordsSpace = 'preview',
  feedWidth,
  feedHeight,
}) => {
  if (!Array.isArray(overlays) || overlays.length === 0) return null;

  return (
    <View style={styles.root} pointerEvents="none" collapsable={false}>
      {overlays.map((block, index) => {
        const visual = getPostTextVisualStyle(block.color, block.bgMode);
        const layout = scalePostTextOverlayBlock(block, {
          previewWidth,
          previewHeight,
          feedWidth,
          feedHeight,
          coordsSpace,
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
              physicalLeftStyle(
                layout.translateX,
                layout.width,
                feedWidth,
              ),
              {
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
                  paddingHorizontal: Math.round(10 * chipScale),
                  paddingVertical: Math.round(4 * chipScale),
                  borderRadius: Math.round(8 * chipScale),
                  overflow: 'hidden',
                },
              ]}>
              <Text
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
  },
  blockWrap: {
    position: 'absolute',
    justifyContent: 'center',
  },
  text: {
    flexShrink: 1,
  },
});

export default PostTextOverlays;
