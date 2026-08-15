import React, {useMemo, useState} from 'react';
import {View, Image, Text, StyleSheet} from 'react-native';
import {VideoPreviewThumb} from './FormsElement/VideoPreviewThumb';
import PostTextOverlays from './PostTextOverlays';
import {
  parsePostTextOverlayPayload,
  resolveFeedPostDisplayMedia,
} from '../utils/postTextOverlay';
import {
  formatOpenHouseOverlayText,
  getOpenHouseDetailsFromListing,
  isOpenHouseListing,
  OPEN_HOUSE_FEED_TAG,
} from '../utils/constant';

/**
 * Feed-post thumbnail/preview — background media plus live text layers and
 * open-house chrome (matches TikTok feed composition in small cards/grids).
 */
export default function FeedPostPreviewMedia({
  listing,
  style,
  mediaStyle,
  resizeMode = 'cover',
  showOpenHouseChrome = true,
  children,
}) {
  const [layout, setLayout] = useState({width: 0, height: 0});
  const overlayPayload = useMemo(
    () => parsePostTextOverlayPayload(listing),
    [listing],
  );
  const {videoUrl, imageUrl, showOverlays} = useMemo(
    () => resolveFeedPostDisplayMedia(listing),
    [listing],
  );
  const openHouseOverlayText = useMemo(() => {
    if (!showOpenHouseChrome || !isOpenHouseListing(listing)) return '';
    const details = getOpenHouseDetailsFromListing(listing);
    if (!details) return '';
    return formatOpenHouseOverlayText(details.place, details.date);
  }, [listing, showOpenHouseChrome]);
  const tagScale = layout.height > 0 ? Math.min(1, layout.height / 230) : 1;

  return (
    <View
      style={[styles.frame, style]}
      onLayout={event => {
        const {width, height} = event.nativeEvent.layout;
        if (width > 0 && height > 0) {
          setLayout(prev =>
            prev.width === width && prev.height === height
              ? prev
              : {width, height},
          );
        }
      }}>
      {videoUrl ? (
        <VideoPreviewThumb
          uri={videoUrl}
          style={[styles.mediaFill, {borderRadius: 0}]}
          videoStyle={[styles.mediaFill, mediaStyle]}
        />
      ) : imageUrl ? (
        <Image
          source={{uri: imageUrl}}
          style={[styles.mediaFill, mediaStyle]}
          resizeMode={resizeMode}
        />
      ) : null}
      {showOverlays && layout.width > 0 && layout.height > 0 ? (
        <PostTextOverlays
          overlays={overlayPayload.overlays}
          previewWidth={overlayPayload.previewWidth}
          previewHeight={overlayPayload.previewHeight}
          coordsSpace={overlayPayload.coordsSpace}
          feedWidth={layout.width}
          feedHeight={layout.height}
        />
      ) : null}
      {showOpenHouseChrome && isOpenHouseListing(listing) ? (
        <View style={styles.openHouseRoot} pointerEvents="none">
          <Image
            source={OPEN_HOUSE_FEED_TAG}
            style={[
              styles.openHouseTag,
              {
                width: Math.round(92 * tagScale),
                height: Math.round(28 * tagScale),
              },
            ]}
            resizeMode="contain"
          />
          {openHouseOverlayText ? (
            <Text
              style={[
                styles.openHouseText,
                {fontSize: Math.max(10, Math.round(14 * tagScale))},
              ]}
              numberOfLines={3}>
              {openHouseOverlayText}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: '#1a1a22',
  },
  mediaFill: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  openHouseRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  openHouseTag: {
    marginBottom: 6,
  },
  openHouseText: {
    color: '#FFFFFF',
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    writingDirection: 'rtl',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
});
