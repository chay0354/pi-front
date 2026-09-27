import React, {useCallback, useEffect, useState} from 'react';
import {Image, Platform, StyleSheet, View} from 'react-native';
import {fitWidthMediaLayout} from '../utils/fitWidthMedia';

const IMAGE_PROPS = Platform.OS === 'android' ? {fadeDuration: 0} : undefined;

/**
 * Still media inside a post frame, laid out with the feed's rule: full frame
 * width, height from the natural aspect (letterbox top/bottom, never side bars).
 */
export default function PostFrameFitWidthImage({
  uri,
  frameWidth,
  frameHeight,
  imageStyle,
  onError,
  /** Fill the frame completely (crop overflow) instead of fitting to width. */
  cover = false,
}) {
  const [natural, setNatural] = useState(null);

  useEffect(() => {
    setNatural(null);
  }, [uri]);

  const applyNaturalSize = useCallback((w, h) => {
    if (w > 0 && h > 0) setNatural({width: w, height: h});
  }, []);

  const layout = !cover && natural
    ? fitWidthMediaLayout(frameWidth, natural.width, natural.height)
    : null;

  if (!uri) return null;

  return (
    <View style={styles.container}>
      <Image
        source={{uri}}
        {...IMAGE_PROPS}
        style={[cover ? styles.fill : layout ? layout : styles.fill, imageStyle]}
        resizeMode={cover ? 'cover' : layout ? 'stretch' : 'cover'}
        onLoad={
          cover
            ? undefined // cover fills the frame — natural size is never read
            : event => {
                const src = event?.nativeEvent?.source;
                const w = Number(src?.width) || 0;
                const h = Number(src?.height) || 0;
                if (w > 0 && h > 0) {
                  applyNaturalSize(w, h);
                  return;
                }
                Image.getSize(uri, applyNaturalSize, () => {});
              }
        }
        onError={onError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
