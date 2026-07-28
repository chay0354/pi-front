import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Dimensions,
  I18nManager,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Video, ResizeMode} from 'expo-av';
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {
  ProfileAvatar,
  PROFILE_RING_COLORS,
  PROFILE_RING_LOCATIONS,
} from './index';
import PostTextOverlays from './PostTextOverlays';
import {resolveStorySlideUri} from '../utils/videoPlayback';
import {
  parsePostTextOverlayPayload,
} from '../utils/postTextOverlay';

const STORY_DURATION_MS = 12000;
const MEDIA_READY_TIMEOUT_MS = 2500;

/** App uses forceRTL — `row` / authored `left` flip. Stories stay Instagram LTR. */
const NATIVE_RTL = Platform.OS !== 'web' && I18nManager.isRTL;
const storyLtrRow = NATIVE_RTL ? 'row-reverse' : 'row';
/** Physical-left / physical-right hit targets under swapLeftAndRightInRTL. */
const tapZonePrevStyle = NATIVE_RTL
  ? {position: 'absolute', right: 0, top: 0, bottom: 0, width: '33%'}
  : {position: 'absolute', left: 0, top: 0, bottom: 0, width: '33%'};
const tapZoneNextStyle = NATIVE_RTL
  ? {position: 'absolute', left: 0, top: 0, bottom: 0, width: '67%'}
  : {position: 'absolute', right: 0, top: 0, bottom: 0, width: '67%'};
const progressFillAlign = NATIVE_RTL ? 'flex-end' : 'flex-start';

function preloadRingImages(ring) {
  if (!ring?.slides?.length) return;
  ring.slides.forEach(slide => {
    const uri = slide?.media_url;
    if (!uri || slide.media_type === 'video') return;
    Image.prefetch(String(uri)).catch(() => {});
  });
  const avatar = ring.profile_image_url;
  if (avatar) Image.prefetch(String(avatar)).catch(() => {});
}

/**
 * Story video: always edge-to-edge horizontally.
 * Top/bottom letterboxing is OK when the scaled video is shorter than the screen;
 * taller videos are cropped top/bottom (never leave side bars).
 */
function storyVideoLayout(naturalW, naturalH) {
  const {width: screenW, height: screenH} = Dimensions.get('window');
  const w = Number(naturalW) || 0;
  const h = Number(naturalH) || 0;
  if (w <= 0 || h <= 0) {
    return {width: screenW, height: screenH};
  }
  const displayH = screenW * (h / w);
  return {
    width: screenW,
    height: displayH,
  };
}

function StorySlideMedia({slide, isMuted, isPaused, onReady, onMediaLayout}) {
  const webVideoRef = useRef(null);
  const uri = resolveStorySlideUri(slide);
  const [videoLayout, setVideoLayout] = useState(null);
  const [imageLayout, setImageLayout] = useState(null);
  const sizedRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const onMediaLayoutRef = useRef(onMediaLayout);
  onReadyRef.current = onReady;
  onMediaLayoutRef.current = onMediaLayout;

  useEffect(() => {
    sizedRef.current = false;
    setVideoLayout(null);
    setImageLayout(null);
    onMediaLayoutRef.current?.(null);
  }, [uri]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = webVideoRef.current;
    if (!el || slide?.media_type !== 'video') return;
    if (isPaused || !videoLayout) {
      el.pause();
      return;
    }
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }, [isPaused, slide?.media_type, uri, videoLayout]);

  const applyNaturalSize = useCallback((nw, nh) => {
    if (sizedRef.current) return;
    const w = Number(nw) || 0;
    const h = Number(nh) || 0;
    if (w <= 0 || h <= 0) return;
    sizedRef.current = true;
    const layout = storyVideoLayout(w, h);
    setVideoLayout(layout);
    onMediaLayoutRef.current?.(layout);
    // Reveal only after layout is committed — avoids the cover→sized jump.
    requestAnimationFrame(() => {
      onReadyRef.current?.();
    });
  }, []);

  const applyImageNaturalSize = useCallback((nw, nh) => {
    if (sizedRef.current) return;
    const w = Number(nw) || 0;
    const h = Number(nh) || 0;
    if (w <= 0 || h <= 0) return;
    sizedRef.current = true;
    // Full width like story video — short editor captures were ~50% with contain.
    const layout = storyVideoLayout(w, h);
    setImageLayout(layout);
    onMediaLayoutRef.current?.(layout);
    requestAnimationFrame(() => {
      onReadyRef.current?.();
    });
  }, []);

  useEffect(() => {
    if (slide?.media_type === 'video' || !uri) return undefined;
    let cancelled = false;
    Image.getSize(
      String(uri),
      (w, h) => {
        if (!cancelled) applyImageNaturalSize(w, h);
      },
      () => {
        if (!cancelled) onReadyRef.current?.();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uri, slide?.media_type, applyImageNaturalSize]);

  if (!uri) {
    return (
      <View style={[styles.mediaFullScreen, styles.mediaPlaceholder]}>
        <Text style={styles.placeholderText}>אין מדיה</Text>
      </View>
    );
  }

  if (slide.media_type === 'video') {
    const sized = videoLayout != null;
    if (Platform.OS === 'web') {
      return (
        <View style={styles.mediaVideoClip}>
          <video
            ref={webVideoRef}
            src={String(uri)}
            style={{
              width: sized ? videoLayout.width : '100%',
              height: sized ? videoLayout.height : '100%',
              objectFit: sized ? 'fill' : 'cover',
              backgroundColor: '#000',
              display: 'block',
              opacity: sized ? 1 : 0,
            }}
            autoPlay={sized && !isPaused}
            muted={isMuted}
            loop
            playsInline
            preload="auto"
            onLoadedMetadata={e => {
              const el = e?.target || webVideoRef.current;
              if (el?.videoWidth && el?.videoHeight) {
                applyNaturalSize(el.videoWidth, el.videoHeight);
              }
            }}
          />
        </View>
      );
    }

    return (
      <View style={styles.mediaVideoClip}>
        <Video
          key={String(uri)}
          source={{uri: String(uri)}}
          style={[
            sized ? videoLayout : styles.mediaFullScreen,
            {opacity: sized ? 1 : 0},
          ]}
          resizeMode={sized ? ResizeMode.STRETCH : ResizeMode.COVER}
          shouldPlay={sized && !isPaused}
          isMuted={isMuted}
          useNativeControls={false}
          isLooping
          onLoad={status => {
            const ns = status?.naturalSize;
            if (ns?.width && ns?.height) {
              let nw = ns.width;
              let nh = ns.height;
              if (ns.orientation === 'portrait' && nw > nh) {
                nw = ns.height;
                nh = ns.width;
              }
              applyNaturalSize(nw, nh);
            }
          }}
          onReadyForDisplay={event => {
            const ns = event?.naturalSize;
            if (ns?.width && ns?.height) {
              applyNaturalSize(ns.width, ns.height);
            }
          }}
        />
      </View>
    );
  }

  const imageSized = imageLayout != null;
  return (
    <View style={styles.mediaVideoClip}>
      <Image
        key={String(uri)}
        source={{uri: String(uri)}}
        style={[
          imageSized ? imageLayout : styles.mediaFullScreen,
          {opacity: imageSized ? 1 : 0},
        ]}
        resizeMode={imageSized ? 'stretch' : 'contain'}
        onLoad={event => {
          const src = event?.nativeEvent?.source;
          applyImageNaturalSize(src?.width, src?.height);
        }}
        onError={onReady}
      />
    </View>
  );
}

const StoryViewerModal = ({
  visible,
  ring,
  prevRing = null,
  nextRing = null,
  onClose,
  onAdvanceToNextUser,
  onAdvanceToPrevUser,
  onOpenProfile,
}) => {
  const insets = useSafeAreaInsets();
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  /** Actual on-screen media box (contain/fit) — overlays must use this, not the window. */
  const [mediaFrame, setMediaFrame] = useState(null);
  const timerRef = useRef(null);
  const startRef = useRef(0);
  const rafRef = useRef(null);
  const mediaReadyTimerRef = useRef(null);
  const slideIndexRef = useRef(0);

  const slides = ring?.slides || [];
  const total = slides.length;
  const currentSlide = total ? slides[slideIndex] : null;

  slideIndexRef.current = slideIndex;

  useEffect(() => {
    preloadRingImages(ring);
  }, [ring?.subscription_id]);

  useEffect(() => {
    preloadRingImages(prevRing);
    preloadRingImages(nextRing);
  }, [prevRing?.subscription_id, nextRing?.subscription_id]);

  useEffect(() => {
    if (!visible || !total) {
      slideIndexRef.current = 0;
      setSlideIndex(0);
      setProgress(0);
      setMediaLoading(false);
      return;
    }
    slideIndexRef.current = 0;
    setSlideIndex(0);
    setProgress(0);
    setMediaLoading(true);
  }, [visible, ring?.subscription_id, total]);

  useEffect(() => {
    setMediaLoading(true);
    setMediaFrame(null);
    if (mediaReadyTimerRef.current) {
      clearTimeout(mediaReadyTimerRef.current);
    }
    mediaReadyTimerRef.current = setTimeout(() => {
      setMediaLoading(false);
    }, MEDIA_READY_TIMEOUT_MS);
    return () => {
      if (mediaReadyTimerRef.current) {
        clearTimeout(mediaReadyTimerRef.current);
        mediaReadyTimerRef.current = null;
      }
    };
  }, [slideIndex, currentSlide ? resolveStorySlideUri(currentSlide) : null]);

  const handleMediaReady = useCallback(() => {
    if (mediaReadyTimerRef.current) {
      clearTimeout(mediaReadyTimerRef.current);
      mediaReadyTimerRef.current = null;
    }
    setMediaLoading(false);
  }, []);

  const handleMediaLayout = useCallback(layout => {
    if (
      layout &&
      Number(layout.width) > 0 &&
      Number(layout.height) > 0
    ) {
      setMediaFrame({
        width: Number(layout.width),
        height: Number(layout.height),
      });
      return;
    }
    setMediaFrame(null);
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const advanceToNextUser = useCallback(() => {
    if (onAdvanceToNextUser) {
      onAdvanceToNextUser();
      return;
    }
    onClose?.();
  }, [onAdvanceToNextUser, onClose]);

  const advanceToPrevUser = useCallback(() => {
    if (prevRing && onAdvanceToPrevUser) {
      onAdvanceToPrevUser();
    }
  }, [prevRing, onAdvanceToPrevUser]);

  const goNext = useCallback(() => {
    const i = slideIndexRef.current;
    if (i + 1 >= total) {
      advanceToNextUser();
      return;
    }
    setSlideIndex(i + 1);
  }, [total, advanceToNextUser]);

  const goPrev = useCallback(() => {
    const i = slideIndexRef.current;
    if (i > 0) {
      setSlideIndex(i - 1);
      return;
    }
    advanceToPrevUser();
  }, [advanceToPrevUser]);

  useEffect(() => {
    if (!visible || !ring || !total) return;
    clearTimers();
    const slide = ring.slides[slideIndex];
    if (slide?.media_type === 'video') {
      setProgress(0);
      return;
    }
    setProgress(0);
    startRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(1, elapsed / STORY_DURATION_MS);
      setProgress(p);
      if (p >= 1) {
        goNext();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return clearTimers;
  }, [visible, slideIndex, total, goNext, clearTimers, ring]);

  const onPressProfile = useCallback(() => {
    if (!ring) return;
    clearTimers();
    onOpenProfile?.(ring);
  }, [ring, onOpenProfile, clearTimers]);

  if (!ring || total === 0) return null;

  const overlayPadTop = Math.max(insets.top, Platform.OS === 'ios' ? 8 : 4);
  const storyTextPayload = (() => {
    const gd = currentSlide?.general_details;
    if (!gd || typeof gd !== 'object') return null;
    // Photo sales images / stories bake text into pixels — never redraw live
    // layers (full-screen scaling made text bigger and wrap to extra lines).
    const baked = gd.post_text_baked;
    if (baked === true || baked === 'true' || baked === 't' || baked === 1) {
      return null;
    }
    return parsePostTextOverlayPayload({general_details: gd});
  })();
  const overlayFrameW = mediaFrame?.width || 0;
  const overlayFrameH = mediaFrame?.height || 0;
  const showLiveText =
    !!storyTextPayload?.overlays?.length &&
    overlayFrameW > 0 &&
    overlayFrameH > 0;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.mediaLayer}>
          <StorySlideMedia
            slide={currentSlide}
            isMuted={isMuted}
            isPaused={false}
            onReady={handleMediaReady}
            onMediaLayout={handleMediaLayout}
          />
          {showLiveText ? (
            <View style={styles.textOverlayAlign} pointerEvents="none">
              <View
                style={{
                  width: overlayFrameW,
                  height: overlayFrameH,
                }}>
                <PostTextOverlays
                  overlays={storyTextPayload.overlays}
                  previewWidth={storyTextPayload.previewWidth}
                  previewHeight={storyTextPayload.previewHeight}
                  coordsSpace={storyTextPayload.coordsSpace}
                  feedWidth={overlayFrameW}
                  feedHeight={overlayFrameH}
                />
              </View>
            </View>
          ) : null}
          {mediaLoading ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator color="#FFFFFF" size="large" />
            </View>
          ) : null}
        </View>

        {/* Physical LTR: left = previous, right = next (compensates forceRTL swap). */}
        <View style={styles.tapZones} pointerEvents="box-none">
          <Pressable
            style={tapZonePrevStyle}
            onPress={goPrev}
            accessibilityLabel="הקודם"
          />
          <Pressable
            style={tapZoneNextStyle}
            onPress={goNext}
            accessibilityLabel="הבא"
          />
        </View>

        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
          locations={[0, 1]}
          style={[styles.overlayTop, {paddingTop: overlayPadTop}]}
          pointerEvents="box-none">
          <View style={[styles.progressRow, {flexDirection: storyLtrRow}]}>
            {slides.map((s, i) => {
              let fillWidth = '0%';
              if (i < slideIndex) {
                fillWidth = '100%';
              } else if (i === slideIndex) {
                fillWidth =
                  s.media_type === 'video' ? '100%' : `${progress * 100}%`;
              }
              const dimVideoCurrent =
                s.media_type === 'video' && i === slideIndex;
              return (
                <View key={s.id || i} style={styles.progressTrack}>
                  <LinearGradient
                    colors={PROFILE_RING_COLORS}
                    locations={PROFILE_RING_LOCATIONS}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={[
                      styles.progressFill,
                      {
                        width: fillWidth,
                        alignSelf: progressFillAlign,
                      },
                      dimVideoCurrent && {opacity: 0.45},
                    ]}
                  />
                </View>
              );
            })}
          </View>

          <View style={[styles.topBar, {flexDirection: storyLtrRow}]}>
            <TouchableOpacity
              style={[styles.userRow, {flexDirection: storyLtrRow}]}
              onPress={onPressProfile}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`פרופיל של ${ring.display_name || 'משתמש'}`}>
              <ProfileAvatar
                uri={ring.profile_image_url}
                name={ring.display_name}
                size={52}
                subscriptionType={ring}
              />
              <Text style={styles.userName} numberOfLines={1}>
                {ring.display_name || 'משתמש'}
              </Text>
            </TouchableOpacity>
            <View style={[styles.actionsRow, {flexDirection: storyLtrRow}]}>
              <TouchableOpacity
                onPress={() => setIsMuted(m => !m)}
                style={styles.actionBtn}
                hitSlop={8}
                activeOpacity={0.7}>
                <MaterialCommunityIcons
                  name={isMuted ? 'volume-off' : 'volume-high'}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={styles.actionBtn}
                hitSlop={8}
                activeOpacity={0.7}>
                <MaterialCommunityIcons
                  name="close"
                  size={28}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  mediaLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  /** Center live text over the letterboxed media frame (same box as the image). */
  textOverlayAlign: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaFullScreen: {
    width: '100%',
    height: '100%',
  },
  mediaVideoClip: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  overlayTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressRow: {
    gap: 4,
    marginBottom: 13,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 20,
  },
  topBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  userRow: {
    alignItems: 'center',
    gap: 13,
    flexShrink: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 18,
    fontFamily: 'Rubik-SemiBold',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
    flexShrink: 1,
  },
  actionsRow: {
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0d12',
  },
  placeholderText: {
    color: '#888',
  },
});

export default StoryViewerModal;
