import React from 'react';
import {View, Text, StyleSheet, Platform, I18nManager} from 'react-native';
import {forceLtrStyle} from '../utils/rtlLayout';

/** Literal textAlign is swapped by Android under forceRTL — map physical side
 * to the literal value that lands there (same logic as the post editor). */
const physicalTextAlign = align => {
  if (Platform.OS === 'web' || !I18nManager.isRTL) return align;
  if (align === 'left') return 'right';
  if (align === 'right') return 'left';
  return 'center';
};
import {
  getPostTextVisualStyle,
  POST_TEXT_STYLE_FONTS,
  scalePostTextOverlayBlock,
} from '../utils/postTextOverlay';

/**
 * Renders saved post text blocks over feed media, mirroring the editor layout
 * (position, font, size, color, background). Only used for posts that carry an
 * explicit overlay payload — regular ads never reach this component.
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
    <View style={[styles.root, forceLtrStyle]} pointerEvents="none">
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

        return (
          <View
            key={`${index}-${String(block.text || '').slice(0, 12)}`}
            style={[
              styles.blockWrap,
              {
                left: 0,
                top: 0,
                width: layout.width,
                maxWidth: layout.width,
                transform: [
                  {translateX: layout.translateX},
                  {translateY: layout.translateY},
                ],
              },
            ]}>
            {/* Same hugging-content structure as the editor's
                DraggableTextBlock so feed placement matches the editor. */}
            <View
              style={{
                alignSelf:
                  align === 'left'
                    ? 'flex-start'
                    : align === 'right'
                      ? 'flex-end'
                      : 'center',
                maxWidth: '100%',
              }}>
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
                  hasBackground && {
                    backgroundColor: visual.backgroundColor,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
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
