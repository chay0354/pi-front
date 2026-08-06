import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {View, Platform, StyleSheet, ActivityIndicator} from 'react-native';
import {Video, ResizeMode} from 'expo-av';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {
  fitWidthMediaLayout,
  normalizeNaturalSize,
} from '../utils/fitWidthMedia';
import {forceLtrStyle} from '../utils/rtlLayout';

/** After a load error, wait before allowing another attempt for this uri. */
const ERROR_RETRY_MS = 15000;
const failedUris = new Map();

function uriRecentlyFailed(uri) {
  const at = failedUris.get(uri);
  return typeof at === 'number' && Date.now() - at < ERROR_RETRY_MS;
}

/**
 * TikTok feed video — Mux HLS (resolution-capped).
 *
 * `fitWidth` (listing ads): full container width, letterbox top/bottom — never
 * crop left/right. Default letterboxes feed posts (`contain`) so uploads are
 * never cropped on iOS/Android.
 *
 * While the first frame is decoding, show a gold loading spinner on black —
 * never the poster/thumbnail image (avoids a flash of still image before play).
 *
 * `prewarm` mounts the player paused+muted: ExoPlayer buffers and decodes the
 * first frame while offscreen, so by the time the user swipes in, the frame
 * is already decoded and playback is instant. TikTokFeedScreen keeps this
 * component mounted for currentIndex ±1 continuously (no settle-delay gate),
 * so the neighbor never loses its decoded state while the user is scrolling —
 * only 3 real players ever exist at once (A07-safe decoder budget).
 */
const FeedVideoPlayerInner = React.forwardRef(function FeedVideoPlayerInner(
  {
    uri,
    isActive = false,
    prewarm = false,
    style,
    /** Kept for call-site compat; poster is never shown while waiting for video. */
    posterUri: _posterUri = '',
    children = null,
    /** Listing ads: edge-to-edge sides, letterbox top/bottom. Posts: contain. */
    fitWidth = false,
    /**
     * When set, overrides feed mute behavior (`!isActive`).
     * Home feature card uses this so mute stays under user control.
     */
    muted,
    onProgressChange,
    onPlaybackComplete,
  },
  ref,
) {
  const videoRef = useRef(null);
  const webVideoRef = useRef(null);
  const isActiveRef = useRef(isActive);
  /** Bumps when leaving active — invalidates in-flight playNow chains. */
  const playGenerationRef = useRef(0);
  const shouldPlayRef = useRef(false);
  const playLockRef = useRef(false);
  const lastPlayAttemptRef = useRef(0);
  const hasFrameRef = useRef(false);
  const userPausedRef = useRef(false);
  const sizedRef = useRef(false);
  const naturalSizeRef = useRef(null);
  const lastProgressRef = useRef(0);
  const lastCompleteAtRef = useRef(0);
  const onPlaybackCompleteRef = useRef(onPlaybackComplete);
  onPlaybackCompleteRef.current = onPlaybackComplete;
  const [hasFrame, setHasFrame] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [failed, setFailed] = useState(() => uriRecentlyFailed(uri));
  const [containerWidth, setContainerWidth] = useState(0);
  const [videoLayout, setVideoLayout] = useState(null);

  const shouldPlay = isActive && !failed && !userPaused;
  const shouldLoad = (isActive || prewarm) && !failed;
  const isAudible = muted === undefined ? isActive : !muted;

  isActiveRef.current = isActive;
  shouldPlayRef.current = shouldPlay;

  const emitPlaybackComplete = useCallback(() => {
    const now = Date.now();
    if (now - lastCompleteAtRef.current < 800) return;
    lastCompleteAtRef.current = now;
    onPlaybackCompleteRef.current?.();
  }, []);

  const noteProgress = useCallback(
    progress => {
      const p = Math.max(0, Math.min(1, Number(progress) || 0));
      if (lastProgressRef.current > 0.82 && p < 0.2) {
        emitPlaybackComplete();
      }
      lastProgressRef.current = p;
      onProgressChange?.(p);
    },
    [emitPlaybackComplete, onProgressChange],
  );

  useEffect(() => {
    userPausedRef.current = userPaused;
  }, [userPaused]);

  useEffect(() => {
    if (!isActive) {
      userPausedRef.current = false;
      setUserPaused(false);
    }
  }, [isActive]);

  useEffect(() => {
    hasFrameRef.current = false;
    setHasFrame(false);
    setFailed(uriRecentlyFailed(uri));
    sizedRef.current = false;
    naturalSizeRef.current = null;
    setVideoLayout(null);
    lastProgressRef.current = 0;
    lastCompleteAtRef.current = 0;
    onProgressChange?.(0);
  }, [uri, onProgressChange]);

  useEffect(() => {
    if (!fitWidth) {
      setVideoLayout(null);
      return;
    }
    sizedRef.current = false;
    setVideoLayout(null);
  }, [fitWidth, containerWidth, uri]);

  const trySizeVideo = useCallback(() => {
    if (!fitWidth) return;
    const ns = naturalSizeRef.current;
    if (!ns || containerWidth <= 0 || sizedRef.current) return;
    const layout = fitWidthMediaLayout(containerWidth, ns.width, ns.height);
    if (!layout) return;
    sizedRef.current = true;
    setVideoLayout(layout);
  }, [fitWidth, containerWidth]);

  const noteNaturalSize = useCallback(
    (nw, nh, orientation) => {
      if (!fitWidth) return;
      const normalized = normalizeNaturalSize({
        width: nw,
        height: nh,
        orientation,
      });
      if (!normalized) return;
      naturalSizeRef.current = normalized;
      trySizeVideo();
    },
    [fitWidth, trySizeVideo],
  );

  useEffect(() => {
    trySizeVideo();
  }, [trySizeVideo]);

  const toggleUserPause = useCallback(() => {
    if (!isActiveRef.current || failed) return;
    setUserPaused(prev => {
      const next = !prev;
      userPausedRef.current = next;
      return next;
    });
  }, [failed]);

  const markFrameReady = useCallback(() => {
    if (hasFrameRef.current) return;
    hasFrameRef.current = true;
    setHasFrame(true);
  }, []);

  const playNow = useCallback(async () => {
    if (!shouldPlayRef.current || !isActiveRef.current || userPausedRef.current) {
      return;
    }
    const now = Date.now();
    if (now - lastPlayAttemptRef.current < 400) return;
    if (playLockRef.current) return;
    lastPlayAttemptRef.current = now;
    playLockRef.current = true;
    const generation = playGenerationRef.current;
    try {
      if (Platform.OS === 'web') {
        const el = webVideoRef.current;
        if (!el || generation !== playGenerationRef.current) return;
        el.muted = muted === undefined ? false : !!muted;
        const play = el.play?.();
        if (play && typeof play.catch === 'function') play.catch(() => {});
        return;
      }
      const player = videoRef.current;
      if (!player || generation !== playGenerationRef.current) return;
      try {
        const audible = muted === undefined ? true : !muted;
        await player.setIsMutedAsync(!audible);
        if (generation !== playGenerationRef.current || !shouldPlayRef.current) {
          await player.setIsMutedAsync(true);
          await player.setVolumeAsync(0);
          await player.pauseAsync?.();
          return;
        }
        await player.setVolumeAsync(audible ? 1.0 : 0);
        if (generation !== playGenerationRef.current || !shouldPlayRef.current) {
          await player.setIsMutedAsync(true);
          await player.setVolumeAsync(0);
          await player.pauseAsync?.();
          return;
        }
        await player.playAsync();
        if (generation !== playGenerationRef.current || !shouldPlayRef.current) {
          await player.setIsMutedAsync(true);
          await player.setVolumeAsync(0);
          await player.pauseAsync?.();
        }
      } catch (_) {}
    } finally {
      playLockRef.current = false;
    }
  }, [muted]);

  const pauseNow = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        const el = webVideoRef.current;
        if (el) {
          el.pause?.();
          el.muted = true;
        }
        return;
      }
      const player = videoRef.current;
      if (!player) return;
      // Mute first so audio cannot leak if pause races with a play restart
      // (e.g. feed stays mounted under the profile screen).
      await player.setIsMutedAsync?.(true);
      await player.setVolumeAsync?.(0);
      await player.pauseAsync?.();
    } catch (_) {}
  }, []);

  const stopNow = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        const el = webVideoRef.current;
        if (el) {
          el.pause?.();
          el.muted = true;
          el.removeAttribute?.('src');
          el.load?.();
        }
        return;
      }
      const player = videoRef.current;
      if (!player) return;
      await player.setIsMutedAsync?.(true);
      await player.setVolumeAsync?.(0);
      await player.pauseAsync?.();
      await player.unloadAsync?.();
    } catch (_) {}
  }, []);

  // Mute/pause before paint when leaving the active page (profile covers feed).
  useLayoutEffect(() => {
    if (isActive) return;
    playGenerationRef.current += 1;
    pauseNow();
  }, [isActive, pauseNow]);

  // Keep mute in sync with explicit muted prop OR active page (default).
  useEffect(() => {
    const shouldMute = muted !== undefined ? !!muted : !isActive;
    if (Platform.OS === 'web') {
      const el = webVideoRef.current;
      if (el) el.muted = shouldMute;
      return;
    }
    const player = videoRef.current;
    if (!player) return;
    player.setIsMutedAsync(shouldMute).catch(() => {});
    player.setVolumeAsync(shouldMute ? 0 : 1).catch(() => {});
  }, [muted, isActive, uri]);

  // If React unmounts the native player, force unload — otherwise Android can
  // keep ExoPlayer audio after navigating to profile.
  useEffect(() => {
    return () => {
      const el = webVideoRef.current;
      if (el) {
        try {
          el.pause?.();
          el.muted = true;
        } catch (_) {}
      }
      const player = videoRef.current;
      if (!player) return;
      Promise.resolve()
        .then(() => player.setIsMutedAsync?.(true))
        .then(() => player.setVolumeAsync?.(0))
        .then(() => player.pauseAsync?.())
        .then(() => player.unloadAsync?.())
        .catch(() => {});
    };
  }, [uri]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = webVideoRef.current;
    if (!el || !uri) return;
    const onTimeUpdate = () => {
      if (el.duration > 0) noteProgress(el.currentTime / el.duration);
    };
    const onEnded = () => emitPlaybackComplete();
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('ended', onEnded);
    };
  }, [uri, noteProgress, emitPlaybackComplete]);

  useImperativeHandle(
    ref,
    () => ({
      play: playNow,
      pause: pauseNow,
      stop: stopNow,
      togglePause: toggleUserPause,
    }),
    [playNow, pauseNow, stopNow, toggleUserPause],
  );

  useEffect(() => {
    if (shouldPlay) {
      playNow();
    } else {
      pauseNow();
    }
  }, [shouldPlay, uri, playNow, pauseNow]);

  const handleReadyForDisplay = useCallback(
    event => {
      if (fitWidth) {
        const ns = event?.naturalSize;
        if (ns?.width && ns?.height) {
          noteNaturalSize(ns.width, ns.height, ns.orientation);
        }
      }
      markFrameReady();
      if (shouldPlayRef.current) playNow();
    },
    [fitWidth, noteNaturalSize, markFrameReady, playNow],
  );

  const handleLoad = useCallback(
    status => {
      if (fitWidth) {
        const ns = status?.naturalSize;
        if (ns?.width && ns?.height) {
          noteNaturalSize(ns.width, ns.height, ns.orientation);
        }
      }
      if (shouldPlayRef.current) playNow();
    },
    [fitWidth, noteNaturalSize, playNow],
  );

  const handleError = useCallback(() => {
    failedUris.set(uri, Date.now());
    setFailed(true);
    videoRef.current?.unloadAsync?.().catch(() => {});
  }, [uri]);

  const onContainerLayout = useCallback(
    e => {
      if (!fitWidth) return;
      const w = e?.nativeEvent?.layout?.width;
      if (w > 0 && Math.abs(w - containerWidth) > 0.5) {
        setContainerWidth(w);
      }
    },
    [fitWidth, containerWidth],
  );

  const sized = fitWidth && videoLayout != null;
  const showLoading = !failed && !hasFrame;

  const loadingLayer = showLoading ? (
    <View style={styles.loadingOverlay} pointerEvents="none">
      <ActivityIndicator size="large" color="#FFC40A" />
    </View>
  ) : null;

  // Post text overlays stay above the loader / video.
  // forceLtr: nx from measureInWindow is physical-left; RTL must not mirror it.
  const overlayLayer = children ? (
    <View
      style={[styles.overlaySlot, forceLtrStyle]}
      pointerEvents="box-none"
      collapsable={false}>
      {children}
    </View>
  ) : null;

  const playHintLayer =
    userPaused && isActive ? (
      <View style={styles.playHintOverlay} pointerEvents="none">
        <MaterialCommunityIcons
          name="play"
          size={58}
          color="rgba(255,255,255,0.38)"
          style={styles.playHintIcon}
        />
      </View>
    ) : null;

  if (!uri || !shouldLoad) {
    return (
      <View style={[styles.root, style]} onLayout={onContainerLayout}>
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#FFC40A" />
        </View>
        {overlayLayer}
        {playHintLayer}
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.root, style]} onLayout={onContainerLayout}>
        {loadingLayer}
        <video
          ref={webVideoRef}
          src={uri}
          style={
            fitWidth
              ? {
                  width: sized ? videoLayout.width : '100%',
                  height: sized ? videoLayout.height : '100%',
                  objectFit: sized ? 'fill' : 'contain',
                  backgroundColor: 'transparent',
                  display: 'block',
                  opacity: hasFrame || sized ? 1 : 0,
                  pointerEvents: 'none',
                }
              : [
                  styles.webVideo,
                  {
                    pointerEvents: 'none',
                    opacity: hasFrame ? 1 : 0,
                  },
                ]
          }
          preload="auto"
          playsInline
          loop
          muted={!isAudible}
          onLoadedMetadata={e => {
            if (fitWidth) {
              const el = e?.target || webVideoRef.current;
              if (el?.videoWidth && el?.videoHeight) {
                noteNaturalSize(el.videoWidth, el.videoHeight);
              }
            }
            if (shouldPlayRef.current) playNow();
          }}
          onLoadedData={() => {
            markFrameReady();
            if (shouldPlayRef.current) playNow();
          }}
          onCanPlay={() => {
            markFrameReady();
            if (shouldPlayRef.current) playNow();
          }}
          onError={handleError}
        />
        {overlayLayer}
        {playHintLayer}
      </View>
    );
  }

  return (
    <View style={[styles.root, style]} onLayout={onContainerLayout}>
      {loadingLayer}
      <Video
        key={String(uri)}
        ref={videoRef}
        pointerEvents="none"
        source={{uri}}
        style={
          fitWidth
            ? [
                sized ? videoLayout : styles.videoFill,
                {opacity: hasFrame || sized ? 1 : 0},
              ]
            : [styles.videoFill, {opacity: hasFrame ? 1 : 0}]
        }
        resizeMode={
          fitWidth
            ? sized
              ? ResizeMode.STRETCH
              : ResizeMode.CONTAIN
            : ResizeMode.CONTAIN
        }
        shouldPlay={shouldPlay}
        isLooping
        isMuted={!isAudible}
        volume={isAudible ? 1.0 : 0}
        useNativeControls={false}
        usePoster={false}
        progressUpdateIntervalMillis={onProgressChange ? 250 : 1000}
        onReadyForDisplay={handleReadyForDisplay}
        onLoad={handleLoad}
        onError={handleError}
        onPlaybackStatusUpdate={status => {
          if (!status?.isLoaded) return;
          if (status.durationMillis > 0) {
            noteProgress(status.positionMillis / status.durationMillis);
          }
          if (status.didJustFinish) {
            emitPlaybackComplete();
          }
          if (status.isPlaying || status.isBuffering) return;
          if (shouldPlayRef.current && !status.didJustFinish) {
            playNow();
          }
        }}
      />
      {overlayLayer}
      {playHintLayer}
    </View>
  );
});

export const FeedVideoPlayer = React.memo(FeedVideoPlayerInner);

/** Lightweight placeholder for far-offscreen feed pages (no Video mount). */
export function FeedVideoPosterPlaceholder({
  posterUri: _posterUri = '',
  style,
  children = null,
  fitWidth: _fitWidth = false,
}) {
  return (
    <View style={[styles.root, style]}>
      <View style={styles.loadingOverlay} pointerEvents="none">
        <ActivityIndicator size="large" color="#FFC40A" />
      </View>
      {children ? (
        <View
          style={[styles.overlaySlot, forceLtrStyle]}
          pointerEvents="box-none"
          collapsable={false}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  overlaySlot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  playHintOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playHintIcon: {
    marginLeft: 4,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  videoFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  webVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: 'transparent',
    display: 'block',
  },
});
