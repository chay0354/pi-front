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
import {LinearGradient} from 'expo-linear-gradient';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {ProfileAvatar} from './index';

const STORY_DURATION_MS = 12000;
const STORY_ACCENT_COLORS = ['#FFE073', '#FFBA30'];

/**
 * Full-screen story viewer: tap advances slide; progress segments at top.
 */
const StoryViewerModal = ({visible, ring, onClose}) => {
  const insets = useSafeAreaInsets();
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef(null);
  const startRef = useRef(0);
  const rafRef = useRef(null);
  const videoRef = useRef(null);

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
              ref={videoRef}
              source={{uri}}
              style={styles.mediaFullScreen}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isMuted={isMuted}
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

        {/* Progress + header on top (Figma node 98:92) */}
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
                    colors={STORY_ACCENT_COLORS}
                    locations={[0.1113, 0.8662]}
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
            <View style={styles.userRow}>
              <ProfileAvatar
                uri={ring.profile_image_url}
                name={ring.display_name}
                size={52}
                ringColors={STORY_ACCENT_COLORS}
                ringLocations={[0, 1]}
              />
              <Text style={styles.userName} numberOfLines={1}>
                {ring.display_name || 'משתמש'}
              </Text>
            </View>
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
