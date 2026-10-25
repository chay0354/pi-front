import React from 'react';
import {View, Text, Image, Platform, StyleSheet} from 'react-native';
import {
  PI_RATING_BADGE_RING,
  PI_RATING_FIVE_STARS_COMPACT,
  getPiRatingCompositeSource,
  normalizePiRating,
} from '../utils/piRatingBadgeAssets';
import {forceLtrStyle} from '../utils/rtlLayout';

const BADGE_TEXT_COLOR = '#FFD275';

/**
 * assets/new-stars art is 559x446, so a square box wastes a fifth of its
 * height on nothing. Sizing each composite box to the art's own ratio lets the
 * icon grow mostly sideways instead of pushing the rows it sits in taller.
 */
const COMPOSITE_ASPECT = 446 / 559;

const composite = width => ({
  width,
  height: Math.round(width * COMPOSITE_ASPECT),
});

/**
 * Rating 5 draws the digit next to the ring art. Transforms are not mirrored
 * by RTL. iPhone keeps the digit a little left of the star. Android uses the
 * last committed offset, which sits the digit against the star.
 */
const DIGIT_SHIFT_X = Platform.OS === 'ios' ? -6 : 3;
/** Professionals directory badges: iPhone draws the digit ~6pt below the star's center. */
const LG_DIGIT_LIFT_IOS = Platform.OS === 'ios' ? 6 : 0;

const VARIANTS = {
  profile: {
    wrap: {gap: 2},
    text: {
      fontSize: 22,
      transform: [{translateX: DIGIT_SHIFT_X}, {translateY: -5}],
    },
    ring: {width: 85, height: 85, marginLeft: -7, top: -35},
    composite: composite(59),
  },
  listing: {
    wrap: {gap: 2, minWidth: 48, minHeight: 48},
    text: {
      fontSize: 18,
      transform: [{translateX: DIGIT_SHIFT_X}, {translateY: -2}],
    },
    ring: {width: 85, height: 85, marginLeft: -7, top: -16},
    composite: composite(56),
  },
  grid: {
    wrap: {gap: 2, position: 'relative', flexShrink: 0, overflow: 'visible'},
    text: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
      transform: [{translateX: DIGIT_SHIFT_X}, {translateY: 1}],
    },
    ring: {width: 60, height: 60, marginLeft: -6, top: -22},
    composite: composite(39),
  },
  list: {
    wrap: {gap: 2, position: 'relative', flexShrink: 0},
    text: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '500',
      transform: [{translateX: DIGIT_SHIFT_X}, {translateY: -2}],
    },
    ring: {width: 60, height: 60, marginLeft: -6, top: -22},
    composite: composite(42),
  },
  listLg: {
    wrap: {gap: 2, minWidth: 48, minHeight: 48, position: 'relative'},
    text: {
      fontSize: 20,
      lineHeight: 26,
      letterSpacing: 0.16,
      top: 4,
      transform: [
        {translateX: DIGIT_SHIFT_X},
        {translateY: -3 - LG_DIGIT_LIFT_IOS},
      ],
    },
    ring: {width: 72, height: 72, marginLeft: -7, top: -20},
    composite: composite(48),
  },
  cardLg: {
    wrap: {gap: 2, minWidth: 48, minHeight: 48, position: 'relative'},
    text: {
      fontSize: 22,
      lineHeight: 30,
      letterSpacing: 0.2,
      top: 4,
      transform: [
        {translateX: DIGIT_SHIFT_X},
        {translateY: -4 - LG_DIGIT_LIFT_IOS},
      ],
    },
    ring: {width: 72, height: 72, marginLeft: -7, top: -20},
    composite: composite(50),
  },
};

/**
 * Pi rating near a user / listing name.
 * Ratings 1–4: composite icon from `assets/new-stars` (number included).
 * Rating 5: unchanged legacy number + ring star.
 */
export function PiRatingBadge({
  rating,
  variant = 'grid',
  style,
  textStyle,
  /** Optional display text (e.g. formatted average) — five-star layouts only. */
  label,
  /** Extra style for the separate 5-star ring, not the digit. */
  ringStyle,
  accessibilityLabel = 'דירוג Pi',
}) {
  const n = normalizePiRating(rating);
  const v = VARIANTS[variant] || VARIANTS.grid;
  const isFive = n >= 5;
  const compositeSource = getPiRatingCompositeSource(n);
  const displayLabel = label != null ? String(label) : String(n);

  if (variant === 'compactFollow') {
    if (isFive) {
      return (
        <View
          style={[
            styles.compactFollowWrap,
            Platform.OS === 'ios' ? forceLtrStyle : null,
            style,
          ]}>
          <Text style={[styles.compactFollowText, textStyle]}>{displayLabel}</Text>
          <View style={styles.compactFiveWrap} pointerEvents="none">
            <Image
              source={PI_RATING_FIVE_STARS_COMPACT}
              style={styles.compactFiveImage}
              resizeMode="contain"
            />
          </View>
        </View>
      );
    }
    return (
      <Image
        source={compositeSource}
        style={[styles.compactFollowComposite, style]}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  if (variant === 'compactSearch') {
    if (isFive) {
      return (
        <View
          style={[
            styles.compactSearchGroup,
            // iOS lays this row out left-to-right, which put the star before
            // the digit. row-reverse under an LTR lock puts the digit first.
            Platform.OS === 'ios'
              ? [forceLtrStyle, {flexDirection: 'row-reverse'}]
              : null,
            style,
          ]}>
          <View style={styles.compactFiveWrap} pointerEvents="none">
            <Image
              source={PI_RATING_FIVE_STARS_COMPACT}
              style={styles.compactFiveImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.compactSearchText, textStyle]}>{displayLabel}</Text>
        </View>
      );
    }
    return (
      <Image
        source={compositeSource}
        style={[styles.compactSearchComposite, style]}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  if (isFive) {
    return (
      <View
        style={[
          styles.badgeWrap,
          v.wrap,
          forceLtrStyle,
          style,
          // Android RTL + row-reverse puts the digit on the left and the
          // absolute ring on its right. iOS row-reverse under the LTR lock
          // swaps them, so the iPhone row is a plain left-to-right row.
          Platform.OS === 'ios'
            ? {
                alignSelf: 'flex-start',
                position: 'relative',
                flexDirection: 'row',
              }
            : null,
        ]}
        pointerEvents="box-none">
        <Text style={[styles.badgeText, v.text, textStyle]}>{displayLabel}</Text>
        <Image
          source={PI_RATING_BADGE_RING}
          style={[styles.badgeRing, v.ring, ringStyle]}
          resizeMode="cover"
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.badgeWrap, v.wrap, forceLtrStyle, style]}
      pointerEvents="box-none">
      <Image
        source={compositeSource}
        style={[styles.badgeComposite, v.composite]}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badgeWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  badgeText: {
    color: BADGE_TEXT_COLOR,
    fontFamily: 'Rubik-Medium',
    zIndex: 1,
    ...forceLtrStyle,
  },
  badgeRing: {
    position: 'absolute',
    ...(Platform.OS === 'web' ? {objectFit: 'cover'} : {}),
  },
  badgeComposite: {
    ...(Platform.OS === 'web' ? {objectFit: 'contain'} : {}),
  },
  compactFollowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'ios' ? 10 : 4,
  },
  compactFollowText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    letterSpacing: 0.14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'left',
  },
  compactFollowComposite: {
    width: 22,
    height: 18,
  },
  compactFiveWrap: {
    width: 16,
    height: 16,
    position: 'relative',
    overflow: 'visible',
    flexShrink: 0,
  },
  compactFiveImage: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 24,
    height: 24,
    ...(Platform.OS === 'web' ? {objectFit: 'contain'} : {}),
  },
  compactSearchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'ios' ? 8 : 2,
  },
  compactSearchText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    letterSpacing: 0.14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'right',
    minWidth: 11,
  },
  compactSearchComposite: {
    width: 22,
    height: 18,
  },
});

export default PiRatingBadge;
