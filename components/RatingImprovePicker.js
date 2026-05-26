import React, {useCallback} from 'react';
import {View, Pressable, StyleSheet, Text, Platform} from 'react-native';
import {SvgXml} from '../utils/svgXml';
import {FIGMA_RATING_STARS} from '../assets/improve/figmaRatingStarSvgs';

/**
 * 1:1 with Figma node 8:78507 — five discrete star/rating options (1…5).
 * Tile: #2B2A39, 12px radius, 10px padding. Star art via SvgXml (native-safe).
 */
const STAR_SIZE = 34.892;
const STAR_SIZE_5 = 50.892;
const STAR5_OFFSET = (STAR_SIZE - STAR_SIZE_5) / 2;
const TILE_PAD = 10;
const RADIUS = 12;
const GAP = 24;
const NUM_COLOR = '#1E1D27';

/**
 * @param {number} value 0 = no selection, 1…5 = selected
 * @param {(n: 1|2|3|4|5) => void} onChange
 */
const RatingImprovePicker = ({value = 0, onChange, style}) => {
  const v = value >= 0 && value <= 5 ? value : 0;

  const onPick = useCallback(
    n => {
      onChange?.(n);
    },
    [onChange],
  );

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.row} accessible={false}>
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
                style={[styles.starInner, isFifth && styles.starInnerFifthArt]}>
                {isFifth ? (
                  <View style={styles.star5Layer} pointerEvents="none">
                    <SvgXml
                      xml={starXml}
                      width={STAR_SIZE_5}
                      height={STAR_SIZE_5}
                    />
                  </View>
                ) : (
                  <SvgXml
                    xml={starXml}
                    width={STAR_SIZE}
                    height={STAR_SIZE}
                    style={styles.starSvg}
                  />
                )}
                <View style={styles.starNumberWrap} pointerEvents="none">
                  <Text style={styles.starNumber}>{String(n)}</Text>
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
    overflow: 'visible',
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    gap: GAP,
    overflow: 'visible',
    direction: 'ltr',
  },
  tile: {
    backgroundColor: '#2B2A39',
    padding: TILE_PAD,
    borderRadius: RADIUS,
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
    width: STAR_SIZE,
    height: STAR_SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starInnerFifthArt: {
    overflow: 'visible',
  },
  star5Layer: {
    position: 'absolute',
    left: STAR5_OFFSET,
    top: STAR5_OFFSET,
    width: STAR_SIZE_5,
    height: STAR_SIZE_5,
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
    paddingTop: 2,
    zIndex: 1,
  },
  starNumber: {
    color: NUM_COLOR,
    fontSize: 20,
    lineHeight: 20,
    fontFamily: 'Rubik-Medium',
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});

export default RatingImprovePicker;
