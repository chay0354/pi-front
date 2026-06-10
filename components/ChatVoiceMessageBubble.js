import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  I18nManager,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Audio} from 'expo-av';
import {forceLtrStyle, hebrewTextAlign} from '../utils/rtlLayout';

const VOICE_WAVE_BAR_COUNT = 28;
const DEFAULT_CHAT_AVATAR = require('../assets/image-copy-10.png');
// On native force-RTL, authored `left` becomes physical-right (and vice-versa).
// Anchoring the fill/scrubber on the physical LEFT therefore needs `right` here.
const WAVE_RTL = Platform.OS !== 'web' && I18nManager.isRTL;

function buildVoiceWaveform(seed, count = VOICE_WAVE_BAR_COUNT) {
  let h = 2166136261;
  const s = String(seed ?? '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Array.from({length: count}, (_, i) => {
    const v = Math.abs(Math.sin((h + i * 17) * 0.41)) * 0.72 + 0.28;
    return 3 + Math.round(v * 15);
  });
}

function formatVoiceClock(totalSec) {
  const s = Math.max(0, Math.floor(Number(totalSec) || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function formatSentTime(createdAt) {
  if (!createdAt) return '';
  try {
    return new Date(createdAt).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function WaveformBars({bars, barColor, messageId}) {
  return (
    <View style={[styles.waveBarsRow, forceLtrStyle]}>
      {bars.map((height, index) => (
        <View key={`${messageId}-bar-${index}`} style={styles.waveBarSlot}>
          <View style={[styles.waveBar, {height, backgroundColor: barColor}]} />
        </View>
      ))}
    </View>
  );
}

export default function ChatVoiceMessageBubble({
  messageId,
  mediaUrl,
  isMe,
  createdAt,
  avatarUri,
  isPlaying,
  progress = 0,
  durationMs = 0,
  onTogglePlay,
  onDurationKnown,
}) {
  const bars = useMemo(
    () => buildVoiceWaveform(messageId, VOICE_WAVE_BAR_COUNT),
    [messageId],
  );
  const clampedProgress = Math.max(0, Math.min(1, Number(progress) || 0));
  const durationSec =
    durationMs > 0 ? Math.max(1, Math.round(durationMs / 1000)) : 0;
  const [trackWidth, setTrackWidth] = useState(0);
  const progressAnim = useRef(new Animated.Value(clampedProgress)).current;
  // Subtle entrance when the bubble first mounts (e.g. right after sending).
  const appearAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(appearAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  }, [appearAnim]);

  // Drive a smooth fill while playing: animate toward the end over the remaining
  // time, starting from wherever the head currently is. We deliberately do NOT
  // restart on every progress tick (that caused the stutter).
  useEffect(() => {
    if (isPlaying && durationMs > 0) {
      progressAnim.stopAnimation(current => {
        const remaining = Math.max(0, (1 - current) * durationMs);
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: remaining,
          easing: Easing.linear,
          useNativeDriver: false,
        }).start();
      });
    } else {
      progressAnim.stopAnimation();
    }
  }, [isPlaying, durationMs, progressAnim]);

  // When paused / seeked / finished, snap to the real position from the parent.
  useEffect(() => {
    if (!isPlaying) {
      progressAnim.stopAnimation();
      progressAnim.setValue(clampedProgress);
    }
  }, [clampedProgress, isPlaying, progressAnim]);

  useEffect(() => {
    if (!mediaUrl || durationMs > 0 || !onDurationKnown) return undefined;
    let cancelled = false;
    let sound = null;
    (async () => {
      try {
        await Audio.setAudioModeAsync({playsInSilentModeIOS: true});
        const created = await Audio.Sound.createAsync(
          {uri: mediaUrl},
          {shouldPlay: false},
        );
        sound = created.sound;
        const st = await sound.getStatusAsync();
        if (
          !cancelled &&
          st.isLoaded &&
          typeof st.durationMillis === 'number' &&
          st.durationMillis > 0
        ) {
          onDurationKnown(messageId, st.durationMillis);
        }
      } catch {
        /* ignore metadata load */
      } finally {
        if (sound) {
          sound.unloadAsync().catch(() => {});
        }
      }
    })();
    return () => {
      cancelled = true;
      if (sound) sound.unloadAsync().catch(() => {});
    };
  }, [mediaUrl, durationMs, messageId, onDurationKnown]);

  const theme = isMe
    ? {
        play: '#fff',
        bar: 'rgba(255,255,255,0.38)',
        barPlayed: 'rgba(255,255,255,0.95)',
        scrubber: '#fff',
        meta: 'rgba(255,255,255,0.88)',
        micBadge: '#fff',
        micBadgeIcon: '#2DD4BF',
      }
    : {
        play: 'rgba(55,53,72,0.72)',
        bar: 'rgba(55,53,72,0.28)',
        barPlayed: 'rgba(55,53,72,0.72)',
        scrubber: '#25D366',
        meta: 'rgba(55,53,72,0.62)',
        micBadge: '#25D366',
        micBadgeIcon: '#fff',
      };

  // Width is a size (never RTL-swapped) → safe as a percentage. Position uses
  // authored left/right, which we pick based on WAVE_RTL so it grows from the
  // physical left edge in both LTR and RTL.
  const fillWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });
  const dotPos = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });
  const fillAnchor = WAVE_RTL ? {right: 0} : {left: 0};
  const dotAnchor = WAVE_RTL
    ? {right: dotPos, marginRight: -5}
    : {left: dotPos, marginLeft: -5};

  return (
    <Animated.View
      style={[
        styles.root,
        {
          opacity: appearAnim,
          transform: [
            {
              scale: appearAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.92, 1],
              }),
            },
          ],
        },
      ]}>
      {/*
        App is force-RTL: first row child lands on the physical right.
        DOM order wave → play → avatar renders as avatar | play | wave (LTR),
        so the play button sits left of the waveform.
      */}
      <View style={styles.mainRow}>
        <View style={styles.waveColumn}>
          <View
            style={styles.waveTrack}
            onLayout={event => {
              const w = Math.round(event.nativeEvent.layout.width);
              if (w > 0 && w !== trackWidth) setTrackWidth(w);
            }}>
            <WaveformBars
              bars={bars}
              barColor={theme.bar}
              messageId={messageId}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.playedMask, fillAnchor, {width: fillWidth}]}>
              <View
                style={[
                  styles.waveBarsOverlay,
                  fillAnchor,
                  {width: trackWidth || 1},
                ]}>
                <WaveformBars
                  bars={bars}
                  barColor={theme.barPlayed}
                  messageId={`${messageId}-played`}
                />
              </View>
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.scrubber,
                dotAnchor,
                {backgroundColor: theme.scrubber},
              ]}
            />
          </View>
          <View style={[styles.metaRow, forceLtrStyle]}>
            <Text style={[styles.metaText, {color: theme.meta}]}>
              {formatSentTime(createdAt)}
            </Text>
            <Text style={[styles.metaText, {color: theme.meta}]}>
              {durationSec > 0 ? formatVoiceClock(durationSec) : '0:00'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={onTogglePlay}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'השהה הקלטה' : 'נגן הקלטה'}>
          <MaterialCommunityIcons
            name={isPlaying ? 'pause' : 'play'}
            size={22}
            color={theme.play}
            style={!isPlaying ? styles.playIconOffset : null}
          />
        </TouchableOpacity>
        {!isMe ? (
          <View style={styles.avatarWrap}>
            <Image
              source={avatarUri ? {uri: avatarUri} : DEFAULT_CHAT_AVATAR}
              style={styles.avatar}
              resizeMode="cover"
            />
            <View style={[styles.micBadge, {backgroundColor: theme.micBadge}]}>
              <MaterialCommunityIcons
                name="microphone"
                size={9}
                color={theme.micBadgeIcon}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    minWidth: 220,
    maxWidth: 268,
    marginBottom: 2,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    position: 'relative',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  micBadge: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  playBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    flexShrink: 0,
  },
  playIconOffset: {
    marginLeft: Platform.OS === 'ios' ? 2 : 1,
  },
  waveColumn: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  waveTrack: {
    width: '100%',
    height: 28,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 2,
    overflow: 'visible',
  },
  waveBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 24,
    gap: 2,
  },
  waveBarsOverlay: {
    position: 'absolute',
    top: 0,
    height: 24,
  },
  playedMask: {
    position: 'absolute',
    top: 2,
    height: 24,
    overflow: 'hidden',
  },
  waveBarSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  waveBar: {
    width: 2,
    borderRadius: 1,
    minHeight: 3,
  },
  scrubber: {
    position: 'absolute',
    top: '50%',
    marginTop: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.18,
        shadowRadius: 1.5,
      },
      android: {elevation: 2},
      default: {},
    }),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 11,
    fontFamily: 'Rubik-Regular',
    fontVariant: ['tabular-nums'],
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
  },
});
