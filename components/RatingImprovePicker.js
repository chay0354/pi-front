import React, {useCallback} from 'react';
import {View, Image, Pressable, StyleSheet, Text, Platform} from 'react-native';
/**
 * 1:1 with Figma node 8:79005 — five discrete star/rating options (1…5) + optional layout for profile.
 * Each option: dark tile #2B2A39, 12px radius, 10px padding, 35px star art from design export.
 */
const STAR_SOURCES = [
  require('../assets/improve/figma-star-1.svg'),
  require('../assets/improve/figma-star-2.svg'),
  require('../assets/improve/figma-star-3.svg'),
  require('../assets/improve/figma-star-4.svg'),
  require('../assets/improve/figma-star-5.svg'),
];

const STAR_SIZE = 35;
/** Fifth star art only; tile slot stays 35×35, icon may extend past the cube. */
const STAR_SIZE_5 = 52;
const STAR5_OFFSET = (STAR_SIZE - STAR_SIZE_5) / 2; // center oversized icon on 35px slot
const TILE_PAD = 10;
const RADIUS = 12;
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
              }
            >
              <View
                style={[styles.starInner, isFifth && styles.starInnerFifthArt]}>
                {isFifth ? (
                  <View style={styles.star5Layer} pointerEvents="none">
                    <Image
                      source={STAR_SOURCES[4]}
                      style={styles.star5LayerImg}
                      resizeMode="contain"
                      accessible={false}
                    />
                  </View>
                ) : (
                  <Image
                    source={STAR_SOURCES[n - 1]}
                    style={styles.starImg}
                    resizeMode="contain"
                    accessible={false}
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
    overflow: 'visible',
    writingDirection: 'rtl',
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
  star5LayerImg: {
    width: '100%',
    height: '100%',
    ...Platform.select({web: {display: 'block', userSelect: 'none'}, default: {}}),
  },
  starImg: {
    ...StyleSheet.absoluteFillObject,
    width: STAR_SIZE,
    height: STAR_SIZE,
    zIndex: 0,
    ...Platform.select({web: {display: 'block', userSelect: 'none'}, default: {}}),
  },
  starNumberWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  starNumber: {
    color: NUM_COLOR,
    fontSize: 20,
    lineHeight: 20,
    fontFamily: 'Rubik-Medium',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});

export default RatingImprovePicker;
