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
}) {
  const [natural, setNatural] = useState(null);

  useEffect(() => {
    setNatural(null);
  }, [uri]);

  const applyNaturalSize = useCallback((w, h) => {
    if (w > 0 && h > 0) setNatural({width: w, height: h});
  }, []);

  const layout = natural
    ? fitWidthMediaLayout(frameWidth, natural.width, natural.height)
    : null;

  if (!uri) return null;

  return (
    <View style={styles.container}>
      <Image
        source={{uri}}
        {...IMAGE_PROPS}
        style={[layout || {width: frameWidth, height: frameHeight}, imageStyle]}
        resizeMode={layout ? 'stretch' : 'contain'}
        onLoad={event => {
          const src = event?.nativeEvent?.source;
          const w = Number(src?.width) || 0;
          const h = Number(src?.height) || 0;
          if (w > 0 && h > 0) {
            applyNaturalSize(w, h);
            return;
          }
          Image.getSize(uri, applyNaturalSize, () => {});
        }}
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
});
