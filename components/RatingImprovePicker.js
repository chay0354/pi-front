import React, {useCallback, useMemo, useState} from 'react';
import {View, Pressable, StyleSheet, Text, Platform} from 'react-native';
import {SvgXml} from '../utils/svgXml';
import {FIGMA_RATING_STARS} from '../assets/improve/figmaRatingStarSvgs';

/**
 * Figma node 8:78507 — five discrete star/rating options (1…5).
 * Scales down on narrow containers so the row stays on screen.
 */
const BASE_STAR_SIZE = 34.892;
const BASE_STAR_SIZE_5 = 50.892;
const BASE_TILE_PAD = 10;
const BASE_RADIUS = 12;
const BASE_GAP = 24;
const BASE_NUM_SIZE = 20;
const NUM_COLOR = '#1E1D27';

const BASE_TILE_WIDTH = BASE_STAR_SIZE + BASE_TILE_PAD * 2;
const BASE_ROW_WIDTH = BASE_TILE_WIDTH * 5 + BASE_GAP * 4;

function scaleDim(value, scale) {
  return Math.max(1, Math.round(value * scale * 1000) / 1000);
}

/**
 * @param {number} value 0 = no selection, 1…5 = selected
 * @param {(n: 1|2|3|4|5) => void} onChange
 */
const RatingImprovePicker = ({value = 0, onChange, style}) => {
  const v = value >= 0 && value <= 5 ? value : 0;
  const [containerWidth, setContainerWidth] = useState(0);

  const scale = useMemo(() => {
    if (containerWidth <= 0) return 1;
    return Math.min(1, containerWidth / BASE_ROW_WIDTH);
  }, [containerWidth]);

  const dims = useMemo(() => {
    const starSize = scaleDim(BASE_STAR_SIZE, scale);
    const starSize5 = scaleDim(BASE_STAR_SIZE_5, scale);
    const tilePad = scaleDim(BASE_TILE_PAD, scale);
    const gap = scaleDim(BASE_GAP, scale);
    const radius = scaleDim(BASE_RADIUS, scale);
    const numSize = scaleDim(BASE_NUM_SIZE, scale);
    const star5Offset = (starSize - starSize5) / 2;
    return {
      starSize,
      starSize5,
      tilePad,
      gap,
      radius,
      numSize,
      star5Offset,
    };
  }, [scale]);

  const onPick = useCallback(
    n => {
      onChange?.(n);
    },
    [onChange],
  );

  const onWrapLayout = useCallback(event => {
    const w = event?.nativeEvent?.layout?.width;
    if (w > 0) setContainerWidth(w);
  }, []);

  return (
    <View
      style={[styles.wrap, style]}
      onLayout={onWrapLayout}
      collapsable={false}>
      <View
        style={[styles.row, {gap: dims.gap, maxWidth: BASE_ROW_WIDTH * scale}]}
        accessible={false}>
        {[1, 2, 3, 4, 5].map(n => {
          const selected = v === n;
          const isFifth = n === 5;
          const starXml = FIGMA_RATING_STARS[n - 1];
          return (
            <Pressable
              key={n}
              onPress={() => onPick(n)}
              style={({pressed}) => [
                styles.tile,
                {
                  padding: dims.tilePad,
                  borderRadius: dims.radius,
                },
                isFifth && styles.tileFifth,
                selected && styles.tileSelected,
                pressed && styles.tilePressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                v === 0
                  ? `בחר דירוג ${n} מתוך 5`
                  : v === n
                    ? `דירוג ${n} מתוך 5, נבחר`
                    : `בחר דירוג ${n} מתוך 5`
              }>
              <View
                style={[
                  styles.starInner,
                  {
                    width: dims.starSize,
                    height: dims.starSize,
                  },
                  isFifth && styles.starInnerFifthArt,
                ]}>
                {isFifth ? (
                  <View
                    style={[
                      styles.star5Layer,
                      {
                        left: dims.star5Offset,
                        top: dims.star5Offset,
                        width: dims.starSize5,
                        height: dims.starSize5,
                      },
                    ]}
                    pointerEvents="none">
                    <SvgXml
                      xml={starXml}
                      width={dims.starSize5}
                      height={dims.starSize5}
                    />
                  </View>
                ) : (
                  <SvgXml
                    xml={starXml}
                    width={dims.starSize}
                    height={dims.starSize}
                    style={styles.starSvg}
                  />
                )}
                <View style={styles.starNumberWrap} pointerEvents="none">
                  <Text
                    style={[
                      styles.starNumber,
                      {fontSize: dims.numSize, lineHeight: dims.numSize},
                    ]}>
                    {String(n)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    alignSelf: 'center',
    overflow: 'hidden',
    direction: 'ltr',
  },
  tile: {
    backgroundColor: '#2B2A39',
    borderWidth: 0,
  },
  tileFifth: {
    overflow: 'visible',
    zIndex: 2,
  },
  tileSelected: {
    borderWidth: 2,
    borderColor: '#FFC40A',
  },
  tilePressed: {
    opacity: 0.9,
  },
  starInner: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starInnerFifthArt: {
    overflow: 'visible',
  },
  star5Layer: {
    position: 'absolute',
    zIndex: 0,
    ...Platform.select({web: {userSelect: 'none'}, default: {}}),
  },
  starSvg: {
    zIndex: 0,
    ...Platform.select({web: {display: 'block', userSelect: 'none'}, default: {}}),
  },
  starNumberWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 7,
    zIndex: 1,
  },
  starNumber: {
    color: NUM_COLOR,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});

export default RatingImprovePicker;
