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
import {resolveStorySlideUri} from '../utils/videoPlayback';

const STORY_DURATION_MS = 12000;
const MEDIA_READY_TIMEOUT_MS = 2500;

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

function StorySlideMedia({slide, isMuted, isPaused, onReady}) {
  const webVideoRef = useRef(null);
  const uri = resolveStorySlideUri(slide);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = webVideoRef.current;
    if (!el || slide?.media_type !== 'video') return;
    if (isPaused) {
      el.pause();
      return;
    }
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }, [isPaused, slide?.media_type, uri]);

  if (!uri) {
    return (
      <View style={[styles.mediaFullScreen, styles.mediaPlaceholder]}>
        <Text style={styles.placeholderText}>אין מדיה</Text>
      </View>
    );
  }

  if (slide.media_type === 'video') {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.mediaFullScreen}>
          <video
            ref={webVideoRef}
            src={String(uri)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backgroundColor: '#000',
            }}
            autoPlay={!isPaused}
            muted={isMuted}
            loop
            playsInline
            preload="auto"
            onLoadedData={onReady}
            onCanPlay={onReady}
          />
        </View>
      );
    }

    return (
      <Video
        key={String(uri)}
        source={{uri: String(uri)}}
        style={styles.mediaFullScreen}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={!isPaused}
        isMuted={isMuted}
        useNativeControls={false}
        isLooping
        onLoad={onReady}
        onReadyForDisplay={onReady}
      />
    );
  }

  return (
    <Image
      key={String(uri)}
      source={{uri: String(uri)}}
      style={styles.mediaFullScreen}
      resizeMode="cover"
      onLoadEnd={onReady}
      onError={onReady}
    />
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
          />
          {mediaLoading ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator color="#FFFFFF" size="large" />
            </View>
          ) : null}
        </View>

        <View style={styles.tapZones} pointerEvents="box-none">
          <Pressable style={styles.tapZoneLeft} onPress={goPrev} />
          <Pressable style={styles.tapZoneRight} onPress={goNext} />
        </View>

        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
          locations={[0, 1]}
          style={[styles.overlayTop, {paddingTop: overlayPadTop}]}
          pointerEvents="box-none">
          <View style={styles.progressRow}>
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
                      {width: fillWidth},
                      dimVideoCurrent && {opacity: 0.45},
                    ]}
                  />
                </View>
              );
            })}
          </View>

          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.userRow}
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
            <View style={styles.actionsRow}>
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
  mediaFullScreen: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 5,
  },
  tapZoneLeft: {
    flex: 1,
  },
  tapZoneRight: {
    flex: 2,
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
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  userRow: {
    flexDirection: 'row',
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
    flexDirection: 'row',
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
