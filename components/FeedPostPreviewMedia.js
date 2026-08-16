import React, {useMemo, useState} from 'react';
import {View, Image, Text, StyleSheet} from 'react-native';
import {VideoPreviewThumb} from './FormsElement/VideoPreviewThumb';
import PostTextOverlays from './PostTextOverlays';
import {
  parsePostTextOverlayPayload,
  resolveFeedPostDisplayMedia,
  resolvePostStageCanvas,
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
 *
 * fit="post": scale the authored post canvas (no editor/feed header) to
 * cover the cell — crop overflow, no letterbox bars.
 */
export default function FeedPostPreviewMedia({
  listing,
  style,
  mediaStyle,
  resizeMode = 'cover',
  showOpenHouseChrome = true,
  fit = 'cover',
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
  const stageCanvas = useMemo(
    () => resolvePostStageCanvas(overlayPayload),
    [overlayPayload],
  );
  const postFrame = useMemo(() => {
    if (fit !== 'post' || !(layout.width > 0) || !(layout.height > 0)) {
      return {
        width: layout.width,
        height: layout.height,
        left: 0,
        top: 0,
      };
    }
    const aspect = stageCanvas.width / Math.max(1, stageCanvas.height);
    let width = layout.width;
    let height = width / aspect;
    if (height < layout.height) {
      height = layout.height;
      width = height * aspect;
    }
    return {
      width,
      height,
      left: (layout.width - width) / 2,
      top: (layout.height - height) / 2,
    };
  }, [fit, layout, stageCanvas.height, stageCanvas.width]);
  const openHouseOverlayText = useMemo(() => {
    if (!showOpenHouseChrome || !isOpenHouseListing(listing)) return '';
    const details = getOpenHouseDetailsFromListing(listing);
    if (!details) return '';
    return formatOpenHouseOverlayText(details.place, details.date);
  }, [listing, showOpenHouseChrome]);
  const tagScale = postFrame.height > 0 ? Math.min(1, postFrame.height / 230) : 1;
  const useStageCanvas = fit === 'post';

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
      <View
        style={
          useStageCanvas && postFrame.width > 0
            ? [
                styles.postCanvas,
                {
                  width: postFrame.width,
                  height: postFrame.height,
                  left: postFrame.left,
                  top: postFrame.top,
                },
              ]
            : styles.mediaFill
        }>
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
            resizeMode={useStageCanvas ? 'cover' : resizeMode}
          />
        ) : null}
        {showOverlays && postFrame.width > 0 && postFrame.height > 0 ? (
          <PostTextOverlays
            overlays={overlayPayload.overlays}
            previewWidth={overlayPayload.previewWidth}
            previewHeight={overlayPayload.previewHeight}
            coordsSpace={overlayPayload.coordsSpace}
            feedWidth={postFrame.width}
            feedHeight={postFrame.height}
            canvas={useStageCanvas ? 'stage' : 'preview'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: '#1a1a22',
  },
  postCanvas: {
    position: 'absolute',
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
