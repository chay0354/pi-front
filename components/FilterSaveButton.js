import React, {useMemo} from 'react';
import {TouchableOpacity, Image, StyleSheet} from 'react-native';

const SAVE_BUTTON_PNG = require('../assets/buy-rent/save.png');

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
 * Gold full-width CTA PNG — default `save.png` (“שמור”) matches TikTok filter sheets.
 * Pass `source` for variants (e.g. `search.png` with label חפש).
 */
const FilterSaveButton = ({
  onPress,
  style,
  disabled,
  source = SAVE_BUTTON_PNG,
  accessibilityLabel = 'שמור',
}) => {
  const aspect = useMemo(() => aspectRatioFor(source), [source]);
  return (
    <TouchableOpacity
      style={[styles.wrap, style]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <Image
        source={source}
        style={[
          styles.image,
          {aspectRatio: aspect},
          disabled && styles.imageDisabled,
        ]}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: {width: '100%', alignItems: 'center'},
  image: {
    width: '100%',
    borderRadius: 846.154,
  },
  imageDisabled: {
    opacity: 0.45,
  },
});

export default FilterSaveButton;
