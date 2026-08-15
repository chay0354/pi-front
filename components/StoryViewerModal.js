import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Dimensions,
  I18nManager,
  Animated,
  PanResponder,
  Easing,
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
import {
  feedBottomBarHeight,
  FEED_OVERLAY_ABOVE_BAR_GAP,
} from '../utils/feedLayout';
import {
  formatOpenHouseOverlayText,
  getOpenHouseDetailsFromListing,
  isOpenHouseListing,
  OPEN_HOUSE_FEED_TAG,
  OPEN_HOUSE_POST_DESCRIPTION,
} from '../utils/constant';
import {flexStart, hebrewTextAlign} from '../utils/rtlLayout';

const STORY_DURATION_MS = 12000;
const MEDIA_READY_TIMEOUT_MS = 2500;
const SCREEN_W = Dimensions.get('window').width;
const SWIPE_COMMIT_FRACTION = 0.25;
const SWIPE_COMMIT_VELOCITY = 0.35;
const STORY_TAP_MOVE_SLOP = 14;
const USER_SWITCH_MS = 280;
const PAGER_RUBBER_BAND = 0.32;
/** Same top bar as TikTokFeedScreen — overlay coords match the feed cell. */
const FEED_TOP_BAR_HEIGHT = 52;
const FEED_OVERLAY_LEFT_PX = 20;
const FEED_SIDEBAR_ZONE_PX = 88;
const FEED_OVERLAY_TEXT_MAX_WIDTH = Math.min(
  366,
  SCREEN_W - FEED_OVERLAY_LEFT_PX - FEED_SIDEBAR_ZONE_PX,
);

/** Web StyleSheet omits `direction`; keep post overlay chips/buttons RTL-aligned. */
const postOverlayRtlDirection =
  Platform.OS === 'web' ? {direction: 'rtl'} : null;

const webTextShadow = (color, offsetW, offsetH, radius) =>
  Platform.select({
    web: {textShadow: `${offsetW}px ${offsetH}px ${radius}px ${color}`},
    default: {
      textShadowColor: color,
      textShadowOffset: {width: offsetW, height: offsetH},
      textShadowRadius: radius,
    },
  });

/** App uses forceRTL — `row` / authored `left` flip. Stories stay Instagram LTR. */
const NATIVE_RTL = Platform.OS !== 'web' && I18nManager.isRTL;
const storyLtrRow = NATIVE_RTL ? 'row-reverse' : 'row';
const storyPagerLtrStyle =
  Platform.OS === 'web' ? {direction: 'ltr'} : null;

/** Instagram: swipe finger left → next user; finger right → previous user. */
function storyPanDx(dx) {
  return dx;
}

/**
 * forceRTL anchors the pager row to the right edge, so panel 0 sits off-screen
 * left. Offsets are measured from whichever edge the row is anchored to.
 */
function pagerOffsetForIndex(panelIndex, panelCount) {
  return NATIVE_RTL
    ? (panelCount - 1 - panelIndex) * SCREEN_W
    : -panelIndex * SCREEN_W;
}

function pagerOffsetBounds(panelCount) {
  const span = Math.max(0, panelCount - 1) * SCREEN_W;
  return NATIVE_RTL ? {minX: 0, maxX: span} : {minX: -span, maxX: 0};
}

function buildPanelScale(translateX, panelIndex, currentPanelIndex, panelCount) {
  const base = pagerOffsetForIndex(currentPanelIndex, panelCount);
  const dist = panelIndex - currentPanelIndex;
  if (dist === -1) {
    return translateX.interpolate({
      inputRange: [base - SCREEN_W, base, base + SCREEN_W],
      outputRange: [1, 0.86, 0.86],
      extrapolate: 'clamp',
    });
  }
  if (dist === 0) {
    return translateX.interpolate({
      inputRange: [base - SCREEN_W, base, base + SCREEN_W],
      outputRange: [0.92, 1, 0.92],
      extrapolate: 'clamp',
    });
  }
  if (dist === 1) {
    return translateX.interpolate({
      inputRange: [base - SCREEN_W, base, base + SCREEN_W],
      outputRange: [0.86, 0.86, 1],
      extrapolate: 'clamp',
    });
  }
  return 0.86;
}
/** Physical-left third = previous slide; rest = next (Instagram, window coords). */
function isStoryTapInPrevZone(gestureState) {
  const x =
    typeof gestureState.pageX === 'number'
      ? gestureState.pageX
      : gestureState.x0;
  return x < SCREEN_W * 0.33;
}

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
 * Story media: scale to CONTAIN inside the viewport — preserves aspect ratio;
 * letterboxes with black bars when the asset isn't 9:16.
 */
function storyMediaLayout(naturalW, naturalH) {
  const {width: screenW, height: screenH} = Dimensions.get('window');
  const w = Math.max(1, Number(naturalW) || screenW);
  const h = Math.max(1, Number(naturalH) || screenH);
  const scale = Math.min(screenW / w, screenH / h);
  return {
    width: Math.round(w * scale),
    height: Math.round(h * scale),
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
    const layout = storyMediaLayout(w, h);
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
    const layout = storyMediaLayout(w, h);
    setImageLayout(layout);
    onMediaLayoutRef.current?.(layout);
    requestAnimationFrame(() => {
      onReadyRef.current?.();
    });
  }, []);

  const applyImageFallbackLayout = useCallback(() => {
    if (sizedRef.current) return;
    sizedRef.current = true;
    const {width: screenW, height: screenH} = Dimensions.get('window');
    const layout = {width: screenW, height: screenH};
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
        if (!cancelled) applyImageFallbackLayout();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uri, slide?.media_type, applyImageNaturalSize, applyImageFallbackLayout]);

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
              objectFit: sized ? 'contain' : 'contain',
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
          resizeMode={ResizeMode.CONTAIN}
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
          styles.storyImageVisible,
        ]}
        resizeMode="contain"
        onLoad={event => {
          const src = event?.nativeEvent?.source;
          if (src?.width && src?.height) {
            applyImageNaturalSize(src.width, src.height);
            return;
          }
          applyImageFallbackLayout();
        }}
        onError={applyImageFallbackLayout}
      />
    </View>
  );
}

function StoryRingSlidePanel({
  ring,
  slideIndex = 0,
  isMuted,
  isPaused,
  isActive,
  onReady,
  onMediaLayout,
  overlayBand,
}) {
  const slides = ring?.slides || [];
  const slide = slides[slideIndex] || slides[0] || null;
  const [mediaLoading, setMediaLoading] = useState(isActive);
  const [mediaFrame, setMediaFrame] = useState(null);
  const mediaReadyTimerRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      setMediaLoading(false);
      return undefined;
    }
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
  }, [isActive, slideIndex, slide ? resolveStorySlideUri(slide) : null]);

  const handleMediaReady = useCallback(() => {
    if (mediaReadyTimerRef.current) {
      clearTimeout(mediaReadyTimerRef.current);
      mediaReadyTimerRef.current = null;
    }
    setMediaLoading(false);
    if (isActive) onReady?.();
  }, [isActive, onReady]);

  const handleMediaLayout = useCallback(
    layout => {
      if (
        layout &&
        Number(layout.width) > 0 &&
        Number(layout.height) > 0
      ) {
        const frame = {
          width: Number(layout.width),
          height: Number(layout.height),
        };
        setMediaFrame(frame);
        if (isActive) onMediaLayout?.(frame);
        return;
      }
      setMediaFrame(null);
      if (isActive) onMediaLayout?.(null);
    },
    [isActive, onMediaLayout],
  );

  const storyTextPayload = (() => {
    if (!isActive || !slide) return null;
    const gd = slide?.general_details;
    if (!gd || typeof gd !== 'object') return null;
    const baked = gd.post_text_baked;
    if (baked === true || baked === 'true' || baked === 't' || baked === 1) {
      return null;
    }
    return parsePostTextOverlayPayload({general_details: gd});
  })();
  const openHouseOverlayText = (() => {
    if (!isActive || !slide?.general_details) return '';
    const listing = {general_details: slide.general_details};
    if (!isOpenHouseListing(listing)) return null;
    const details = getOpenHouseDetailsFromListing(listing);
    if (!details) return '';
    return formatOpenHouseOverlayText(details.place, details.date);
  })();
  // Same band + scale as TikTok feed (top/bottom chrome inset, feedPageHeight).
  const showLiveText =
    !!storyTextPayload?.overlays?.length &&
    mediaFrame != null &&
    overlayBand?.height > 0;
  const showOpenHouseOverlay = isActive && openHouseOverlayText != null;

  if (!slide) {
    return (
      <View style={[styles.mediaFullScreen, styles.mediaPlaceholder]}>
        <Text style={styles.placeholderText}>אין מדיה</Text>
      </View>
    );
  }

  return (
    <View style={styles.panelFill}>
      <StorySlideMedia
        slide={slide}
        isMuted={isMuted}
        isPaused={isPaused || !isActive}
        onReady={handleMediaReady}
        onMediaLayout={handleMediaLayout}
      />
      {showLiveText ? (
        <View
          style={[
            styles.textOverlayBand,
            {
              top: overlayBand.top,
              bottom: overlayBand.bottom,
            },
          ]}
          pointerEvents="none">
          <PostTextOverlays
            overlays={storyTextPayload.overlays}
            previewWidth={storyTextPayload.previewWidth}
            previewHeight={storyTextPayload.previewHeight}
            coordsSpace={storyTextPayload.coordsSpace}
            feedWidth={overlayBand.width}
            feedHeight={overlayBand.height}
          />
        </View>
      ) : null}
      {showOpenHouseOverlay ? (
        <View
          style={[
            styles.openHouseOverlayWrap,
            postOverlayRtlDirection,
            {
              bottom:
                (overlayBand?.bottom ?? 0) + FEED_OVERLAY_ABOVE_BAR_GAP,
            },
          ]}
          pointerEvents="none">
          <View style={styles.openHouseTagRow}>
            <Image
              source={OPEN_HOUSE_FEED_TAG}
              style={styles.openHouseTagImage}
              resizeMode="contain"
              accessibilityLabel={OPEN_HOUSE_POST_DESCRIPTION}
            />
          </View>
          {openHouseOverlayText ? (
            <Text
              style={styles.openHouseOverlayText}
              numberOfLines={3}
              ellipsizeMode="tail">
              {openHouseOverlayText}
            </Text>
          ) : null}
        </View>
      ) : null}
      {isActive && mediaLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      ) : null}
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
  const overlayBand = useMemo(() => {
    const top = FEED_TOP_BAR_HEIGHT + insets.top;
    const bottom = feedBottomBarHeight(insets.bottom);
    const height = Math.max(1, Dimensions.get('window').height - top - bottom);
    return {top, bottom, width: SCREEN_W, height};
  }, [insets.top, insets.bottom]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isUserPanning, setIsUserPanning] = useState(false);
  const [isUserSwitching, setIsUserSwitching] = useState(false);
  const timerRef = useRef(null);
  const startRef = useRef(0);
  const rafRef = useRef(null);
  const slideIndexRef = useRef(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const baseOffsetRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const isSwitchingRef = useRef(false);

  const slides = ring?.slides || [];
  const total = slides.length;
  const currentSlide = total ? slides[slideIndex] : null;
  const hasPrevUser = Boolean(prevRing?.slides?.length);
  const hasNextUser = Boolean(nextRing?.slides?.length);

  const pagerPanels = useMemo(() => {
    const panels = [];
    if (hasPrevUser) {
      panels.push({key: `prev-${prevRing.subscription_id}`, ring: prevRing});
    }
    if (ring) {
      panels.push({key: `current-${ring.subscription_id}`, ring});
    }
    if (hasNextUser) {
      panels.push({key: `next-${nextRing.subscription_id}`, ring: nextRing});
    }
    return panels;
  }, [hasPrevUser, hasNextUser, prevRing, nextRing, ring]);

  const currentPanelIndex = hasPrevUser ? 1 : 0;

  slideIndexRef.current = slideIndex;

  const syncBaseOffset = useCallback(
    (animated = false) => {
      const base = pagerOffsetForIndex(currentPanelIndex, pagerPanels.length);
      baseOffsetRef.current = base;
      dragStartOffsetRef.current = base;
      if (animated) {
        Animated.timing(translateX, {
          toValue: base,
          duration: USER_SWITCH_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      } else {
        translateX.setValue(base);
      }
    },
    [currentPanelIndex, pagerPanels.length, translateX],
  );

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
      setIsUserPanning(false);
      setIsUserSwitching(false);
      isSwitchingRef.current = false;
      return;
    }
    slideIndexRef.current = 0;
    setSlideIndex(0);
    setProgress(0);
    setIsUserSwitching(false);
    isSwitchingRef.current = false;
  }, [visible, ring?.subscription_id, total]);

  useEffect(() => {
    if (!visible) return;
    syncBaseOffset(false);
  }, [visible, ring?.subscription_id, currentPanelIndex, syncBaseOffset]);

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

  const commitUserSwitch = useCallback(
    (direction, releaseVelocity = 0) => {
      if (isSwitchingRef.current) return;
      isSwitchingRef.current = true;
      setIsUserSwitching(true);
      const base = baseOffsetRef.current;
      const target =
        direction === 'next'
          ? base - SCREEN_W
          : direction === 'prev'
            ? base + SCREEN_W
            : base;

      Animated.spring(translateX, {
        toValue: target,
        velocity: releaseVelocity,
        useNativeDriver: true,
        tension: 148,
        friction: 22,
        restDisplacementThreshold: 0.5,
        restSpeedThreshold: 0.5,
      }).start(({finished}) => {
        isSwitchingRef.current = false;
        setIsUserSwitching(false);
        if (!finished) {
          syncBaseOffset(false);
          return;
        }
        if (direction === 'next') {
          advanceToNextUser();
        } else if (direction === 'prev') {
          advanceToPrevUser();
        }
        syncBaseOffset(false);
      });
    },
    [advanceToNextUser, advanceToPrevUser, syncBaseOffset, translateX],
  );

  const goNext = useCallback(() => {
    const i = slideIndexRef.current;
    if (i + 1 >= total) {
      if (hasNextUser) {
        commitUserSwitch('next');
      } else {
        advanceToNextUser();
      }
      return;
    }
    setSlideIndex(i + 1);
  }, [total, advanceToNextUser, hasNextUser, commitUserSwitch]);

  const goPrev = useCallback(() => {
    const i = slideIndexRef.current;
    if (i > 0) {
      setSlideIndex(i - 1);
      return;
    }
    if (hasPrevUser) {
      commitUserSwitch('prev');
    } else {
      advanceToPrevUser();
    }
  }, [advanceToPrevUser, hasPrevUser, commitUserSwitch]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isSwitchingRef.current,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !isSwitchingRef.current &&
          (Math.abs(gestureState.dx) > STORY_TAP_MOVE_SLOP ||
            Math.abs(gestureState.dy) > STORY_TAP_MOVE_SLOP),
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          !isSwitchingRef.current &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 10,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          clearTimers();
          translateX.stopAnimation(value => {
            dragStartOffsetRef.current =
              typeof value === 'number' ? value : baseOffsetRef.current;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const dx = storyPanDx(gestureState.dx);
          if (
            Math.abs(dx) > STORY_TAP_MOVE_SLOP ||
            Math.abs(gestureState.dy) > STORY_TAP_MOVE_SLOP
          ) {
            setIsUserPanning(true);
          }
          let next = dragStartOffsetRef.current + dx;
          const base = baseOffsetRef.current;
          const {minX, maxX} = pagerOffsetBounds(pagerPanels.length);
          if (!hasPrevUser && next > base) {
            next = base + dx * PAGER_RUBBER_BAND;
          } else if (!hasNextUser && next < base) {
            next = base + dx * PAGER_RUBBER_BAND;
          } else {
            next = Math.max(minX, Math.min(maxX, next));
          }
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, gestureState) => {
          setIsUserPanning(false);
          const dx = storyPanDx(gestureState.dx);
          const dy = gestureState.dy;
          const vx = storyPanDx(gestureState.vx);
          const threshold = SCREEN_W * SWIPE_COMMIT_FRACTION;
          const flingNext = vx <= -SWIPE_COMMIT_VELOCITY;
          const flingPrev = vx >= SWIPE_COMMIT_VELOCITY;
          const releaseVelocity = vx * 1000;
          const isHorizontalSwipe =
            Math.abs(dx) > Math.abs(dy) &&
            (Math.abs(dx) > threshold || flingNext || flingPrev);

          // Finger swipe → switch user at any slide (Instagram-style).
          if (isHorizontalSwipe) {
            if ((dx <= -threshold || flingNext) && hasNextUser) {
              commitUserSwitch('next', releaseVelocity);
              return;
            }
            if ((dx >= threshold || flingPrev) && hasPrevUser) {
              commitUserSwitch('prev', releaseVelocity);
              return;
            }
            if ((dx <= -threshold || flingNext) && !hasNextUser) {
              Animated.timing(translateX, {
                toValue: baseOffsetRef.current - SCREEN_W * PAGER_RUBBER_BAND,
                duration: USER_SWITCH_MS,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }).start(({finished}) => {
                if (finished) onClose?.();
                else syncBaseOffset(false);
              });
              return;
            }

            Animated.spring(translateX, {
              toValue: baseOffsetRef.current,
              velocity: releaseVelocity,
              useNativeDriver: true,
              tension: 148,
              friction: 22,
            }).start();
            return;
          }

          // Short press → previous / next slide within the current user.
          if (
            Math.abs(dx) < STORY_TAP_MOVE_SLOP &&
            Math.abs(dy) < STORY_TAP_MOVE_SLOP
          ) {
            if (isStoryTapInPrevZone(gestureState)) {
              goPrev();
            } else {
              goNext();
            }
            return;
          }

          Animated.spring(translateX, {
            toValue: baseOffsetRef.current,
            velocity: releaseVelocity,
            useNativeDriver: true,
            tension: 148,
            friction: 22,
          }).start();
        },
        onPanResponderTerminate: () => {
          setIsUserPanning(false);
          Animated.spring(translateX, {
            toValue: baseOffsetRef.current,
            useNativeDriver: true,
            tension: 148,
            friction: 22,
          }).start();
        },
      }),
    [
      clearTimers,
      commitUserSwitch,
      goNext,
      goPrev,
      hasNextUser,
      hasPrevUser,
      onClose,
      pagerPanels.length,
      syncBaseOffset,
      translateX,
    ],
  );

  useEffect(() => {
    if (!visible || !ring || !total || isUserPanning || isUserSwitching) return;
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
  }, [
    visible,
    slideIndex,
    total,
    goNext,
    clearTimers,
    ring,
    isUserPanning,
    isUserSwitching,
  ]);

  const onPressProfile = useCallback(() => {
    if (!ring) return;
    clearTimers();
    onOpenProfile?.(ring);
  }, [ring, onOpenProfile, clearTimers]);

  if (!ring || total === 0) return null;

  const overlayPadTop = Math.max(insets.top, Platform.OS === 'ios' ? 8 : 4);
  const blockTapZones = isUserPanning || isUserSwitching;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={[styles.mediaLayer, storyPagerLtrStyle]}>
          <Animated.View
            style={[
              styles.pagerRow,
              storyPagerLtrStyle,
              {
                flexDirection: storyLtrRow,
                width: pagerPanels.length * SCREEN_W,
                transform: [{translateX}],
              },
            ]}>
            {pagerPanels.map((panel, index) => {
              const isCurrent = index === currentPanelIndex;
              const panelScale = buildPanelScale(
                translateX,
                index,
                currentPanelIndex,
                pagerPanels.length,
              );
              return (
                <Animated.View
                  key={panel.key}
                  style={[
                    styles.panelPage,
                    {
                      width: SCREEN_W,
                      transform: [{scale: panelScale}],
                    },
                  ]}>
                  <StoryRingSlidePanel
                    ring={panel.ring}
                    slideIndex={isCurrent ? slideIndex : 0}
                    isMuted={isMuted}
                    isPaused={!isCurrent || isUserPanning || isUserSwitching}
                    isActive={isCurrent}
                    overlayBand={overlayBand}
                  />
                </Animated.View>
              );
            })}
          </Animated.View>
        </View>

        {/* Full-screen gestures: swipe = switch user; tap = next/prev slide. */}
        <View
          style={styles.gestureLayer}
          pointerEvents={blockTapZones ? 'none' : 'auto'}
          {...panResponder.panHandlers}
        />

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
    overflow: 'hidden',
  },
  pagerRow: {
    height: '100%',
  },
  panelPage: {
    height: '100%',
    overflow: 'hidden',
  },
  panelFill: {
    flex: 1,
    backgroundColor: '#000',
  },
  /** Same inset band as TikTok feed — overlay coords land identically. */
  textOverlayBand: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  openHouseOverlayWrap: {
    position: 'absolute',
    left: FEED_OVERLAY_LEFT_PX,
    width: FEED_OVERLAY_TEXT_MAX_WIDTH,
    maxWidth: FEED_OVERLAY_TEXT_MAX_WIDTH,
    alignItems: flexStart,
    zIndex: 4,
  },
  openHouseTagRow: {
    width: '100%',
    alignItems: flexStart,
    marginBottom: 12,
  },
  openHouseTagImage: {
    width: 150,
    height: 56,
  },
  openHouseOverlayText: {
    color: '#F7F3E6',
    fontSize: 24,
    lineHeight: 31,
    fontFamily: 'Rubik-SemiBold',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: FEED_OVERLAY_TEXT_MAX_WIDTH,
    marginBottom: 10,
    ...webTextShadow('rgba(0, 0, 0, 0.7)', 0, 1, 3),
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
  storyImageVisible: {
    opacity: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  gestureLayer: {
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
