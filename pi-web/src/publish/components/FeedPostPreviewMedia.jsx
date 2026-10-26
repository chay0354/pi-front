import {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {VideoPreviewThumb} from '../fields/VideoPreviewThumb';
import PostTextOverlays from './PostTextOverlays';
import PostFrameFitWidthImage from './PostFrameMedia';
import {
  parsePostTextOverlayPayload,
  parsePostEditorRestoreInfo,
  resolveFeedPostDisplayMedia,
  resolvePostBackgroundGradient,
  shouldUseLiveColorPostBackground,
} from '../lib/postTextOverlay';
import {resolvePostFrameCoverCell, resolvePostFrameInCell, useFeedPostPageSize} from '../lib/postFrame';
import {muxThumbnailUri} from '../../profile/lib/videoPlayback';
import {supabaseThumbUri} from '../../profile/lib/imageThumb';
import {
  formatOpenHouseOverlayText,
  getOpenHouseDetailsFromListing,
  isOpenHouseListing,
  OPEN_HOUSE_FEED_TAG,
} from '../lib/publishRules';
import playButton from '../../assets/mobile/play-button.png';
import {cx} from '../lib/rnStyle';
import styles from './FeedPostPreviewMedia.module.css';

/**
 * The one renderer for a feed post outside the feed itself (ערוך/פרסם, sales image, …).
 * Geometry comes from lib/postFrame, so media and text land in the same spot on every surface.
 * Web: `style` is a plain DOM style object; `className` sizes the frame.
 */
export default function FeedPostPreviewMedia({
  listing,
  posterUri = null,
  style,
  className,
  showOpenHouseChrome = true,
  showVideoPlayIcon = true,
  cropOverflow = false,
  showTextOverlays = true,
  stillMaxWidth = 0,
  children,
}) {
  const frameRef = useRef(null);
  const feedPageSize = useFeedPostPageSize();
  const [layout, setLayout] = useState({width: 0, height: 0});
  const [thumbFailed, setThumbFailed] = useState(false);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return undefined;
    // offsetWidth/Height are layout px — unaffected by the stage's CSS scale.
    const measure = () => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      if (width > 0 && height > 0) {
        setLayout(prev => (prev.width === width && prev.height === height ? prev : {width, height}));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const overlayPayload = useMemo(() => parsePostTextOverlayPayload(listing), [listing]);
  const restoreInfo = useMemo(() => parsePostEditorRestoreInfo(listing), [listing]);
  const {videoUrl, imageUrl} = useMemo(() => resolveFeedPostDisplayMedia(listing), [listing]);
  const isColorTextPost = shouldUseLiveColorPostBackground(listing);
  const gradientColors = useMemo(
    () => (isColorTextPost ? resolvePostBackgroundGradient(listing) : null),
    [isColorTextPost, listing],
  );
  const videoPosterUri = useMemo(() => {
    const explicit = posterUri != null ? String(posterUri).trim() : '';
    if (explicit && /^https?:\/\//i.test(explicit)) return explicit;
    const fromListing =
      listing?.poster_url || listing?.posterUrl || listing?.thumbnail_url || listing?.thumbnailUrl || null;
    const listingPoster = fromListing != null ? String(fromListing).trim() : '';
    if (listingPoster && /^https?:\/\//i.test(listingPoster)) return listingPoster;
    const mux = muxThumbnailUri(videoUrl, {time: 0, width: 480});
    if (mux) return mux;
    const still = imageUrl != null && /^https?:\/\//i.test(String(imageUrl)) ? String(imageUrl).trim() : '';
    if (still && !/\.(mp4|mov|m4v|webm|m3u8)(\?|#|$)/i.test(still)) return still;
    return '';
  }, [posterUri, videoUrl, imageUrl, listing]);
  const showOverlays =
    showTextOverlays !== false && Boolean(overlayPayload?.overlays?.length) && restoreInfo.textBaked !== true;
  const postFrame = useMemo(() => {
    if (!(layout.width > 0) || !(layout.height > 0)) {
      return {width: layout.width, height: layout.height, left: 0, top: 0};
    }
    const resolve = cropOverflow ? resolvePostFrameCoverCell : resolvePostFrameInCell;
    return resolve(layout.width, layout.height, overlayPayload, feedPageSize);
  }, [cropOverflow, feedPageSize, layout, overlayPayload]);
  const openHouseOverlayText = useMemo(() => {
    if (!showOpenHouseChrome || !isOpenHouseListing(listing)) return '';
    const details = getOpenHouseDetailsFromListing(listing);
    if (!details) return '';
    return formatOpenHouseOverlayText(details.place, details.date);
  }, [listing, showOpenHouseChrome]);
  const tagScale = postFrame.height > 0 ? Math.min(1, postFrame.height / 300) : 1;
  const stillUri =
    videoPosterUri ||
    (!isColorTextPost && imageUrl && /^https?:\/\//i.test(String(imageUrl)) ? String(imageUrl) : '');
  const [thumbFailedFor, setThumbFailedFor] = useState(stillUri);
  if (thumbFailedFor !== stillUri) {
    setThumbFailedFor(stillUri);
    setThumbFailed(false);
  }
  const displayStillUri = useMemo(() => {
    if (!stillUri || thumbFailed || !(stillMaxWidth > 0)) return stillUri;
    return supabaseThumbUri(stillUri, {width: stillMaxWidth}) || stillUri;
  }, [stillUri, stillMaxWidth, thumbFailed]);

  return (
    <div ref={frameRef} className={cx(styles.frame, className)} style={style}>
      <div
        className={postFrame.width > 0 ? styles.postCanvas : styles.mediaFill}
        style={
          postFrame.width > 0
            ? {width: postFrame.width, height: postFrame.height, left: postFrame.left, top: postFrame.top}
            : undefined
        }>
        {isColorTextPost && gradientColors ? (
          <div
            className={styles.mediaFill}
            style={{background: `linear-gradient(90deg, ${gradientColors[0]}, ${gradientColors[1]})`}}
          />
        ) : stillUri ? (
          <>
            <PostFrameFitWidthImage
              uri={displayStillUri}
              frameWidth={postFrame.width}
              frameHeight={postFrame.height}
              cover={cropOverflow}
              onError={displayStillUri !== stillUri ? () => setThumbFailed(true) : undefined}
            />
            {showVideoPlayIcon && videoUrl ? (
              <div className={styles.playOverlay}>
                <img className={styles.playIcon} src={playButton} alt="" />
              </div>
            ) : null}
          </>
        ) : videoUrl ? (
          <VideoPreviewThumb
            uri={videoUrl}
            posterUri={videoPosterUri || undefined}
            className={styles.videoFill}
            showPlayIcon={showVideoPlayIcon}
            resizeMode={cropOverflow ? 'cover' : 'contain'}
          />
        ) : imageUrl ? (
          <PostFrameFitWidthImage
            uri={imageUrl}
            frameWidth={postFrame.width}
            frameHeight={postFrame.height}
            cover={cropOverflow}
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
          <div className={styles.openHouseRoot}>
            <img
              className={styles.openHouseTag}
              src={OPEN_HOUSE_FEED_TAG}
              alt=""
              style={{width: Math.round(120 * tagScale), height: Math.round(36 * tagScale)}}
            />
            {openHouseOverlayText ? (
              <p className={styles.openHouseText} style={{fontSize: Math.max(13, Math.round(18 * tagScale))}}>
                {openHouseOverlayText}
              </p>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
