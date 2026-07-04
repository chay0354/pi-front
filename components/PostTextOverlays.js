import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {forceLtrStyle} from '../utils/rtlLayout';
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
            <Text
              style={[
                styles.text,
                {
                  color: visual.textColor,
                  fontSize: layout.fontSize,
                  lineHeight: layout.lineHeight,
                  textAlign: align,
                  writingDirection: 'rtl',
                  fontFamily,
                },
                hasBackground && {
                  backgroundColor: visual.backgroundColor,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  alignSelf: 'center',
                },
              ]}>
              {block.text}
            </Text>
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
