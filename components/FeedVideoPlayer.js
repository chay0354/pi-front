import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {View, Image, Platform, StyleSheet} from 'react-native';
import {Video, ResizeMode} from 'expo-av';
import {isHlsUri} from '../utils/videoPlayback';
import {
  isFeedVideoReady,
  markFeedVideoReady,
} from '../utils/feedVideoPreload';

const FEED_IMAGE_PROPS =
  Platform.OS === 'android' ? {fadeDuration: 0} : undefined;

/**
 * TikTok-style feed video — Mux HLS only (.m3u8).
 */
const FeedVideoPlayerInner = React.forwardRef(function FeedVideoPlayerInner(
  {
    uri,
    isActive = false,
    prewarm = false,
    style,
    placeholderSource = null,
    posterUri = '',
  },
  ref,
) {
  const videoRef = useRef(null);
  const webVideoRef = useRef(null);
  const isActiveRef = useRef(isActive);
  const prewarmRef = useRef(prewarm);
  const [ready, setReady] = useState(() => isFeedVideoReady(uri));

  const allowPrewarm = prewarm && !(Platform.OS === 'android' && isHlsUri(uri));
  const shouldPlay = isActive || allowPrewarm;
  const isAudible = isActive;

  isActiveRef.current = isActive;
  prewarmRef.current = allowPrewarm;

  const playNow = useCallback(async () => {
    if (Platform.OS === 'web') {
      const el = webVideoRef.current;
      if (!el) return;
      el.muted = !isActiveRef.current;
      const play = el.play?.();
      if (play && typeof play.catch === 'function') play.catch(() => {});
      return;
    }
    const player = videoRef.current;
    if (!player) return;
    try {
      if (isActiveRef.current) {
        await player.setIsMutedAsync(false);
      } else if (prewarmRef.current) {
        await player.setIsMutedAsync(true);
      }
      await player.playAsync();
    } catch (_) {}
  }, []);

  const pauseNow = useCallback(async () => {
    if (Platform.OS === 'web') {
      const el = webVideoRef.current;
      if (!el) return;
      el.pause?.();
      el.muted = true;
      try {
        el.currentTime = 0;
      } catch (_) {}
      return;
    }
    const player = videoRef.current;
    if (!player) return;
    try {
      await player.pauseAsync();
      await player.setIsMutedAsync(true);
    } catch (_) {}
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      play: playNow,
      pause: pauseNow,
    }),
    [pauseNow, playNow],
  );

  useEffect(() => {
    setReady(isFeedVideoReady(uri));
  }, [uri]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    return () => {
      videoRef.current?.unloadAsync?.().catch(() => {});
    };
  }, [uri]);

  const markReady = useCallback(() => {
    setReady(true);
    markFeedVideoReady(uri);
  }, [uri]);

  // Start/stop immediately when focus changes — do not wait for decode/ready.
  useEffect(() => {
    if (shouldPlay) {
      playNow();
    } else {
      pauseNow();
    }
  }, [shouldPlay, isActive, allowPrewarm, uri, playNow, pauseNow]);

  const handleReadyForDisplay = useCallback(() => {
    markReady();
    if (isActiveRef.current || prewarmRef.current) {
      playNow();
    }
  }, [markReady, playNow]);

  const handleLoad = useCallback(() => {
    markReady();
    if (isActiveRef.current || prewarmRef.current) {
      playNow();
    }
  }, [markReady, playNow]);

  const showPoster =
    Boolean(posterUri) && !ready && !isActive && !allowPrewarm;
  const showPlaceholder =
    !posterUri && !ready && !isActive && !allowPrewarm && placeholderSource;

  if (!uri) {
    return (
      <View style={[styles.root, style]}>
        {placeholderSource ? (
          <Image
            source={placeholderSource}
            style={styles.placeholder}
            resizeMode="contain"
          />
        ) : null}
      </View>
    );
  }

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
          style={[styles.webVideo, {opacity: ready || isActive ? 1 : 0}]}
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
        key={String(uri)}
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
        progressUpdateIntervalMillis={250}
        onReadyForDisplay={handleReadyForDisplay}
        onLoad={handleLoad}
        onPlaybackStatusUpdate={status => {
          if (!status?.isLoaded || status.isPlaying) return;
          if (isActiveRef.current || prewarmRef.current) {
            playNow();
          }
        }}
      />
    </View>
  );
});

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
