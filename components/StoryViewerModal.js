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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Video, ResizeMode} from 'expo-av';

const STORY_DURATION_MS = 12000;

/**
 * Full-screen story viewer: tap advances slide; progress segments at top.
 */
const StoryViewerModal = ({visible, ring, onClose}) => {
  const insets = useSafeAreaInsets();
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const startRef = useRef(0);
  const rafRef = useRef(null);

  const slides = ring?.slides || [];
  const total = slides.length;
  const currentSlide = total ? slides[slideIndex] : null;
  const currentIsVideo = currentSlide?.media_type === 'video';

  useEffect(() => {
    if (!visible || !total) {
      setSlideIndex(0);
      setProgress(0);
      return;
    }
    setSlideIndex(0);
    setProgress(0);
  }, [visible, ring?.subscription_id, total]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const goNext = useCallback(() => {
    setSlideIndex(i => {
      if (i + 1 >= total) {
        onClose?.();
        return i;
      }
      return i + 1;
    });
  }, [total, onClose]);

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

  const onTapContent = useCallback(() => {
    if (currentIsVideo) return;
    goNext();
  }, [goNext, currentIsVideo]);

  if (!ring || total === 0) return null;

  const slide = slides[slideIndex];
  const uri = slide?.media_url;

  const overlayPadTop = Math.max(insets.top, Platform.OS === 'ios' ? 8 : 4);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Full-bleed media: video uses native controls (not wrapped in Pressable). Images: tap advances. */}
        <View style={styles.mediaTap}>
          {uri && currentIsVideo ? (
            <Video
              source={{uri}}
              style={styles.mediaFullScreen}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              useNativeControls
              isLooping
            />
          ) : (
            <Pressable style={StyleSheet.absoluteFillObject} onPress={onTapContent}>
              {uri ? (
                <Image
                  source={{uri}}
                  style={styles.mediaFullScreen}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.mediaFullScreen, styles.mediaPlaceholder]}>
                  <Text style={styles.placeholderText}>אין מדיה</Text>
                </View>
              )}
            </Pressable>
          )}
        </View>

        {/* Progress + header on top */}
        <View
          style={[styles.overlayTop, {paddingTop: overlayPadTop}]}
          pointerEvents="box-none">
          <View style={styles.progressRow}>
            {slides.map((s, i) => (
              <View key={s.id || i} style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    s.media_type === 'video'
                      ? {width: '100%', opacity: 0.35}
                      : i < slideIndex
                        ? {width: '100%'}
                        : i === slideIndex
                          ? {width: `${progress * 100}%`}
                          : {width: '0%'},
                  ]}
                />
              </View>
            ))}
          </View>

          <View style={styles.topBar}>
            <View style={styles.userRow}>
              {ring.profile_image_url ? (
                <View style={styles.avatarClip}>
                  <Image
                    source={{uri: ring.profile_image_url}}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View style={[styles.avatarClip, styles.avatarPlaceholder]} />
              )}
              <Text style={styles.userName} numberOfLines={1}>
                {ring.display_name || 'משתמש'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={12}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  mediaTap: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaFullScreen: {
    width: '100%',
    height: '100%',
  },
  overlayTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
    paddingHorizontal: 8,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFC40A',
    borderRadius: 2,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarClip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFC40A',
    position: 'relative',
  },
  avatarImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  avatarPlaceholder: {
    backgroundColor: '#333',
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    color: '#fff',
    fontSize: 22,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
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
