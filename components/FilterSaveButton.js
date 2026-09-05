import React, {useMemo} from 'react';
import {
  TouchableOpacity,
  Image,
  StyleSheet,
  View,
  Text,
  Platform,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';

function aspectRatioFor(asset) {
  const fn = Image.resolveAssetSource;
  if (typeof fn === 'function') {
    const src = fn(asset);
    if (src?.width > 0 && src?.height > 0) {
      return src.width / src.height;
    }
  }
  return 336 / 44;
}

/**
 * Default: pill gold CTA (vertical gradient + label), matching filter-sheet reference.
 * Pass `source` for a full-width PNG CTA with the same image layout as AdsForm.
 */
const FilterSaveButton = ({
  onPress,
  style,
  disabled,
  source,
  title = 'שמור',
  accessibilityLabel = 'שמור',
}) => {
  const imageMode = source != null;
  const aspect = useMemo(() => {
    if (imageMode) {
      return aspectRatioFor(source);
    }
    return null;
  }, [imageMode, source]);

  if (imageMode) {
    return (
      <TouchableOpacity
        style={[styles.wrap, style]}
        onPress={onPress}
        activeOpacity={disabled ? 1 : 0.85}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}>
        <View style={styles.mediaWrap}>
          <Image
            source={source}
            style={[
              styles.image,
              {aspectRatio: aspect},
              disabled && styles.mediaDisabled,
            ]}
            resizeMode="contain"
          />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.wrap, style]}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.85}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <LinearGradient
        colors={['#FFE56A', '#F7C63A', '#E5A80F']}
        start={{x: 0.5, y: 0}}
        end={{x: 0.5, y: 1}}
        style={[
          styles.pillGradient,
          disabled && styles.mediaDisabled,
        ]}>
        <Text style={styles.pillText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'stretch',
  },
  mediaWrap: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'stretch',
    ...Platform.select({
      web: {fontSize: 0, lineHeight: 0},
      default: {},
    }),
  },
  image: {
    width: '100%',
    height: undefined,
    marginVertical: 0,
    paddingVertical: 0,
    ...Platform.select({
      web: {
        display: 'block',
        verticalAlign: 'top',
      },
      default: {},
    }),
  },
  pillGradient: {
    width: '100%',
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.28)',
      },
    }),
  },
  pillText: {
    color: '#1C1C2E',
    fontSize: 20,
    fontFamily: 'Rubik-Bold',
    textAlign: 'center',
  },
  mediaDisabled: {
    opacity: 0.45,
  },
});

export default FilterSaveButton;
