import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, Image, Platform, StyleSheet} from 'react-native';
import {Video, ResizeMode} from 'expo-av';
import {
  isFeedVideoReady,
  markFeedVideoReady,
} from '../utils/feedVideoPreload';

const FEED_IMAGE_PROPS =
  Platform.OS === 'android' ? {fadeDuration: 0} : undefined;

/**
 * TikTok-style feed video. Adjacent items `prewarm` (play muted) so the next
 * swipe lands on an already-decoded frame — unmute only when `isActive`.
 */
function FeedVideoPlayerInner({
  uri,
  posterUri = '',
  isActive = false,
  prewarm = false,
  style,
  placeholderSource = null,
}) {
  const videoRef = useRef(null);
  const webVideoRef = useRef(null);
  const isActiveRef = useRef(isActive);
  const prewarmRef = useRef(prewarm);
  const [ready, setReady] = useState(() => isFeedVideoReady(uri));

  const shouldPlay = isActive || prewarm;
  const isAudible = isActive;

  isActiveRef.current = isActive;
  prewarmRef.current = prewarm;

  useEffect(() => {
    setReady(isFeedVideoReady(uri));
  }, [uri]);

  const markReady = useCallback(() => {
    setReady(true);
    markFeedVideoReady(uri);
  }, [uri]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const el = webVideoRef.current;
      if (!el || !ready) return;
      if (isActive) {
        el.muted = false;
        const play = el.play?.();
        if (play && typeof play.catch === 'function') play.catch(() => {});
      } else if (prewarm) {
        el.muted = true;
        const play = el.play?.();
        if (play && typeof play.catch === 'function') play.catch(() => {});
      } else {
        el.pause?.();
        el.muted = true;
        try {
          el.currentTime = 0;
        } catch (_) {}
      }
      return;
    }

    const player = videoRef.current;
    if (!player) return;

    (async () => {
      try {
        if (!shouldPlay) {
          await player.pauseAsync();
        }
      } catch (_) {}
    })();
  }, [isActive, prewarm, ready, shouldPlay, uri]);

  const handleReadyForDisplay = useCallback(() => {
    markReady();
  }, [markReady]);

  const handleLoad = useCallback(() => {
    markReady();
  }, [markReady]);

  const showPoster = Boolean(posterUri) && !ready && !isActive && !prewarm;
  const showPlaceholder =
    !posterUri && !ready && !isActive && !prewarm && placeholderSource;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.root, style]}>
        {showPoster ? (
          <Image
            source={{uri: posterUri}}
            {...FEED_IMAGE_PROPS}
            style={styles.poster}
            resizeMode="cover"
          />
        ) : null}
        {showPlaceholder ? (
          <Image
            source={placeholderSource}
            style={styles.placeholder}
            resizeMode="contain"
          />
        ) : null}
        <video
          ref={webVideoRef}
          src={uri}
          style={[styles.webVideo, {opacity: ready ? 1 : 0}]}
          preload="auto"
          playsInline
          loop
          muted={!isAudible}
          onLoadedData={handleLoad}
          onCanPlay={handleLoad}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, style]}>
      {showPoster ? (
        <Image
          source={{uri: posterUri}}
          {...FEED_IMAGE_PROPS}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : null}
      {showPlaceholder ? (
        <Image
          source={placeholderSource}
          style={styles.placeholder}
          resizeMode="contain"
        />
      ) : null}
      <Video
        ref={videoRef}
        source={{uri}}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay={shouldPlay}
        isLooping
        isMuted={!isAudible}
        volume={isAudible ? 1.0 : 0}
        useNativeControls={false}
        usePoster={false}
        progressUpdateIntervalMillis={100}
        onReadyForDisplay={handleReadyForDisplay}
        onLoad={handleLoad}
        onPlaybackStatusUpdate={status => {
          if (!status?.isLoaded || status.isPlaying) return;
          if (isActiveRef.current || prewarmRef.current) {
            videoRef.current?.playAsync().catch(() => {});
          }
        }}
      />
    </View>
  );
}

export const FeedVideoPlayer = React.memo(FeedVideoPlayerInner);

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    width: '60%',
    height: '60%',
    alignSelf: 'center',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  webVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    backgroundColor: '#000',
  },
});
