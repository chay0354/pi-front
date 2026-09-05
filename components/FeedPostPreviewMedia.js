import React, {useMemo, useState} from 'react';
import {View, Image, Text, StyleSheet} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {VideoPreviewThumb} from './FormsElement/VideoPreviewThumb';
import PostTextOverlays from './PostTextOverlays';
import PostFrameFitWidthImage from './PostFrameMedia';
import {
  parsePostTextOverlayPayload,
  parsePostEditorRestoreInfo,
  resolveFeedPostDisplayMedia,
  resolvePostBackgroundGradient,
  shouldUseLiveColorPostBackground,
} from '../utils/postTextOverlay';
import {
  resolvePostFrameCoverWidth,
  resolvePostFrameInCell,
  useFeedPostPageSize,
} from '../utils/postFrame';
import {muxThumbnailUri} from '../utils/videoPlayback';
import {
  formatOpenHouseOverlayText,
  getOpenHouseDetailsFromListing,
  isOpenHouseListing,
  OPEN_HOUSE_FEED_TAG,
} from '../utils/constant';

/**
 * The one renderer for a feed post outside the feed itself (profile grid,
 * ערוך/פרסם, hashtag explore, chat, share sheet, sales image).
 *
 * Geometry comes from `utils/postFrame`, which mirrors the live TikTok feed
 * page, so media and text land in exactly the same spot on every surface.
 */
export default function FeedPostPreviewMedia({
  listing,
  posterUri = null,
  style,
  showOpenHouseChrome = true,
  showVideoPlayIcon = true,
  /** Scale to cell width and clip top/bottom instead of letterboxing. */
  cropOverflow = false,
  children,
}) {
  const feedPageSize = useFeedPostPageSize();
  const [layout, setLayout] = useState({width: 0, height: 0});
  const overlayPayload = useMemo(
    () => parsePostTextOverlayPayload(listing),
    [listing],
  );
  const restoreInfo = useMemo(
    () => parsePostEditorRestoreInfo(listing),
    [listing],
  );
  const {videoUrl, imageUrl} = useMemo(
    () => resolveFeedPostDisplayMedia(listing),
    [listing],
  );
  const isColorTextPost = shouldUseLiveColorPostBackground(listing);
  const gradientColors = useMemo(
    () => (isColorTextPost ? resolvePostBackgroundGradient(listing) : null),
    [isColorTextPost, listing],
  );
  const videoPosterUri = useMemo(() => {
    const explicit = posterUri != null ? String(posterUri).trim() : '';
    if (explicit && /^https?:\/\//i.test(explicit)) return explicit;
    const mux = muxThumbnailUri(videoUrl, {time: 0, width: 480});
    return mux || '';
  }, [posterUri, videoUrl]);
  const showOverlays =
    Boolean(overlayPayload?.overlays?.length) && restoreInfo.textBaked !== true;
  const postFrame = useMemo(() => {
    if (!(layout.width > 0) || !(layout.height > 0)) {
      return {width: layout.width, height: layout.height, left: 0, top: 0};
    }
    const resolve = cropOverflow
      ? resolvePostFrameCoverWidth
      : resolvePostFrameInCell;
    return resolve(
      layout.width,
      layout.height,
      overlayPayload,
      feedPageSize,
    );
  }, [cropOverflow, feedPageSize, layout, overlayPayload]);
  const openHouseOverlayText = useMemo(() => {
    if (!showOpenHouseChrome || !isOpenHouseListing(listing)) return '';
    const details = getOpenHouseDetailsFromListing(listing);
    if (!details) return '';
    return formatOpenHouseOverlayText(details.place, details.date);
  }, [listing, showOpenHouseChrome]);
  const tagScale = postFrame.height > 0 ? Math.min(1, postFrame.height / 230) : 1;
  const stillUri =
    videoPosterUri ||
    (!isColorTextPost && imageUrl && /^https?:\/\//i.test(String(imageUrl))
      ? String(imageUrl)
      : '');

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
          postFrame.width > 0
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
        {isColorTextPost && gradientColors ? (
          <LinearGradient
            colors={gradientColors}
            start={{x: 0, y: 0.5}}
            end={{x: 1, y: 0.5}}
            style={styles.mediaFill}
          />
        ) : stillUri ? (
          <PostFrameFitWidthImage
            uri={stillUri}
            frameWidth={postFrame.width}
            frameHeight={postFrame.height}
          />
        ) : videoUrl ? (
          <VideoPreviewThumb
            uri={videoUrl}
            style={[styles.mediaFill, {borderRadius: 0}]}
            videoStyle={styles.mediaFill}
            showPlayIcon={showVideoPlayIcon}
            resizeMode="contain"
          />
        ) : imageUrl ? (
          <PostFrameFitWidthImage
            uri={imageUrl}
            frameWidth={postFrame.width}
            frameHeight={postFrame.height}
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
            canvas="preview"
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
