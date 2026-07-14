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

/** If naturalSize never arrives (common for some HLS streams), stop waiting. */
const LAYOUT_FALLBACK_MS = 450;

/**
 * Same as stories: always edge-to-edge horizontally.
 * Top/bottom letterboxing is OK; never leave side bars.
 * Taller-than-screen videos crop top/bottom via overflow hidden.
 */
function feedVideoLayout(naturalW, naturalH, containerW, containerH) {
  const w = Number(naturalW) || 0;
  const h = Number(naturalH) || 0;
  const cw = Math.max(1, Number(containerW) || 0);
  const ch = Math.max(1, Number(containerH) || 0);
  if (w <= 0 || h <= 0 || cw <= 0) {
    return {width: cw || '100%', height: ch || '100%'};
  }
  return {
    width: cw,
    height: cw * (h / w),
  };
}

/**
 * TikTok-style feed video — Mux HLS preferred, MP4 fallback.
 * Show cover immediately (never blank black); refine to width-fill when sized.
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
  const sizedRef = useRef(false);
  const naturalSizeRef = useRef(null);
  const containerSizeRef = useRef({width: 0, height: 0});
  const playLockRef = useRef(false);
  const lastPlayAttemptRef = useRef(0);
  const [ready, setReady] = useState(() => isFeedVideoReady(uri));
  const [videoLayout, setVideoLayout] = useState(null);

  const allowPrewarm = prewarm && !(Platform.OS === 'android' && isHlsUri(uri));
  const shouldPlay = isActive || allowPrewarm;
  const isAudible = isActive;
  const sized = videoLayout != null;

  isActiveRef.current = isActive;
  prewarmRef.current = allowPrewarm;

  const playNow = useCallback(async () => {
    const now = Date.now();
    // Avoid hammering playAsync when status updates fire rapidly (freezes Android).
    if (now - lastPlayAttemptRef.current < 320) return;
    if (playLockRef.current) return;
    lastPlayAttemptRef.current = now;
    playLockRef.current = true;
    try {
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
    } finally {
      playLockRef.current = false;
    }
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
    sizedRef.current = false;
    naturalSizeRef.current = null;
    setVideoLayout(null);
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

  const tryApplyLayout = useCallback(() => {
    const natural = naturalSizeRef.current;
    const {width: cw, height: ch} = containerSizeRef.current;
    if (!natural || cw <= 0 || ch <= 0) return;
    const next = feedVideoLayout(natural.w, natural.h, cw, ch);
    sizedRef.current = true;
    setVideoLayout(prev => {
      if (
        prev &&
        prev.width === next.width &&
        prev.height === next.height
      ) {
        return prev;
      }
      return next;
    });
    markReady();
  }, [markReady]);

  const applyNaturalSize = useCallback(
    (nw, nh, orientation) => {
      let w = Number(nw) || 0;
      let h = Number(nh) || 0;
      if (w <= 0 || h <= 0) return;
      if (orientation === 'portrait' && w > h) {
        const tmp = w;
        w = h;
        h = tmp;
      }
      naturalSizeRef.current = {w, h};
      tryApplyLayout();
    },
    [tryApplyLayout],
  );

  const handleContainerLayout = useCallback(
    event => {
      const {width, height} = event?.nativeEvent?.layout || {};
      const w = Math.round(Number(width) || 0);
      const h = Math.round(Number(height) || 0);
      if (w <= 0 || h <= 0) return;
      const prev = containerSizeRef.current;
      if (prev.width === w && prev.height === h) return;
      containerSizeRef.current = {width: w, height: h};
      tryApplyLayout();
    },
    [tryApplyLayout],
  );

  // If naturalSize never arrives, reveal video with cover fill anyway.
  useEffect(() => {
    if (sized || !uri) return undefined;
    const id = setTimeout(() => {
      if (sizedRef.current) return;
      const {width: cw, height: ch} = containerSizeRef.current;
      if (cw > 0 && ch > 0) {
        naturalSizeRef.current = naturalSizeRef.current || {w: cw, h: ch};
        sizedRef.current = true;
        setVideoLayout({width: cw, height: ch});
      }
      markReady();
    }, LAYOUT_FALLBACK_MS);
    return () => clearTimeout(id);
  }, [uri, sized, markReady]);

  // Start/stop immediately when focus changes — do not wait for decode/ready.
  useEffect(() => {
    if (shouldPlay) {
      playNow();
    } else {
      pauseNow();
    }
  }, [shouldPlay, isActive, allowPrewarm, uri, playNow, pauseNow]);

  const handleReadyForDisplay = useCallback(
    event => {
      const ns = event?.naturalSize;
      if (ns?.width && ns?.height) {
        applyNaturalSize(ns.width, ns.height, ns.orientation);
      }
      markReady();
      if (isActiveRef.current || prewarmRef.current) {
        playNow();
      }
    },
    [applyNaturalSize, markReady, playNow],
  );

  const handleLoad = useCallback(
    status => {
      const ns = status?.naturalSize;
      if (ns?.width && ns?.height) {
        applyNaturalSize(ns.width, ns.height, ns.orientation);
      }
      markReady();
      if (isActiveRef.current || prewarmRef.current) {
        playNow();
      }
    },
    [applyNaturalSize, markReady, playNow],
  );

  // Keep poster under the video until a frame is ready — including while active.
  // (Previously poster hid on isActive, which caused pure black screens.)
  const showPoster = Boolean(posterUri) && !ready;
  const showPlaceholder =
    !posterUri && !ready && placeholderSource;

  if (!uri) {
    return (
      <View style={[styles.root, style]} onLayout={handleContainerLayout}>
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
      <View style={[styles.root, style]} onLayout={handleContainerLayout}>
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
          style={{
            width: sized ? videoLayout.width : '100%',
            height: sized ? videoLayout.height : '100%',
            objectFit: sized ? 'fill' : 'cover',
            backgroundColor: 'transparent',
            display: 'block',
            // Stay visible with cover until sized — never blank black.
            opacity: 1,
          }}
          preload="auto"
          playsInline
          loop
          muted={!isAudible}
          onLoadedMetadata={e => {
            const el = e?.target || webVideoRef.current;
            if (el?.videoWidth && el?.videoHeight) {
              applyNaturalSize(el.videoWidth, el.videoHeight);
            }
            markReady();
            if (isActiveRef.current || prewarmRef.current) {
              playNow();
            }
          }}
          onLoadedData={() => {
            markReady();
            if (isActiveRef.current || prewarmRef.current) {
              playNow();
            }
          }}
          onCanPlay={() => {
            markReady();
            if (isActiveRef.current || prewarmRef.current) {
              playNow();
            }
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, style]} onLayout={handleContainerLayout}>
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
        style={sized ? videoLayout : styles.videoFill}
        resizeMode={sized ? ResizeMode.STRETCH : ResizeMode.COVER}
        shouldPlay={shouldPlay}
        isLooping
        isMuted={!isAudible}
        volume={isAudible ? 1.0 : 0}
        useNativeControls={false}
        usePoster={false}
        progressUpdateIntervalMillis={500}
        onReadyForDisplay={handleReadyForDisplay}
        onLoad={handleLoad}
        onPlaybackStatusUpdate={status => {
          if (!status?.isLoaded || status.isPlaying) return;
          if (status.isBuffering) return;
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    width: '60%',
    height: '60%',
    alignSelf: 'center',
    zIndex: 1,
  },
  videoFill: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});
