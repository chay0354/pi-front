import React, {useImperativeHandle, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const ACCENT = '#FFC40A';
/** Matches FeedVideoPlayer's progressUpdateIntervalMillis so the fill glides between ticks. */
const TICK_MS = 250;
const TOUCH_HEIGHT = 26;
/** Track sits this far above the touch zone's bottom; the zone dips into the bar below for touch slop. */
export const FEED_PROGRESS_TRACK_OFFSET = 10;
const IDLE = {track: 3, dot: 8};
const SCRUB = {track: 6, dot: 14};
/** After a seek, ignore player ticks until it reports the new position. */
const SEEK_SETTLE_MS = 700;

function formatTime(ms) {
  const total = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * TikTok-style playback bar for the feed — fills from the physical left, even under RTL.
 * Native forceRTL mirrors authored left/right, so the anchors differ per platform.
 * Driven imperatively via `setProgress(0..1, durationMs)` so the feed never
 * re-renders per tick. Drag or tap to scrub; `onSeek(fraction)` fires on release.
 */
const FeedVideoProgressBar = React.forwardRef(function FeedVideoProgressBar(
  {style, onSeek},
  ref,
) {
  const progress = useRef(new Animated.Value(0)).current;
  const lastRef = useRef(0);
  const durationRef = useRef(0);
  const scrubbingRef = useRef(false);
  const holdUntilRef = useRef(0);
  const trackRef = useRef(null);
  const trackBoxRef = useRef({x: 0, width: 0});
  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubLabel, setScrubLabel] = useState('');

  useImperativeHandle(
    ref,
    () => ({
      setProgress: (value, durationMs) => {
        if (durationMs > 0) durationRef.current = durationMs;
        if (scrubbingRef.current || Date.now() < holdUntilRef.current) return;
        const p = Math.max(0, Math.min(1, Number(value) || 0));
        const prev = lastRef.current;
        lastRef.current = p;
        if (p < prev || p - prev > 0.5) {
          progress.stopAnimation();
          progress.setValue(p);
          return;
        }
        Animated.timing(progress, {
          toValue: p,
          duration: TICK_MS,
          easing: Easing.linear,
          useNativeDriver: false,
        }).start();
      },
      reset: () => {
        lastRef.current = 0;
        durationRef.current = 0;
        holdUntilRef.current = 0;
        progress.stopAnimation();
        progress.setValue(0);
      },
    }),
    [progress],
  );

  const measureTrack = () => {
    trackRef.current?.measureInWindow?.((x, _y, width) => {
      if (width > 0) trackBoxRef.current = {x, width};
    });
  };

  /** Physical pageX → fraction; the fill grows from the left edge. */
  const fractionAt = pageX => {
    const {x, width} = trackBoxRef.current;
    if (!(width > 0)) return lastRef.current;
    return Math.max(0, Math.min(1, (pageX - x) / width));
  };

  const showAt = fraction => {
    lastRef.current = fraction;
    progress.stopAnimation();
    progress.setValue(fraction);
    const dur = durationRef.current;
    setScrubLabel(
      dur > 0 ? `${formatTime(fraction * dur)} / ${formatTime(dur)}` : '',
    );
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: e => {
          measureTrack();
          scrubbingRef.current = true;
          setScrubbing(true);
          showAt(fractionAt(e.nativeEvent.pageX));
        },
        onPanResponderMove: e => {
          showAt(fractionAt(e.nativeEvent.pageX));
        },
        onPanResponderRelease: e => {
          const f = fractionAt(e.nativeEvent.pageX);
          showAt(f);
          scrubbingRef.current = false;
          holdUntilRef.current = Date.now() + SEEK_SETTLE_MS;
          setScrubbing(false);
          onSeekRef.current?.(f);
        },
        onPanResponderTerminate: () => {
          scrubbingRef.current = false;
          setScrubbing(false);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const size = scrubbing ? SCRUB : IDLE;

  return (
    <View
      style={[styles.touchZone, style]}
      onLayout={measureTrack}
      {...panResponder.panHandlers}>
      {scrubbing && scrubLabel ? (
        <View style={styles.timeLabelWrap} pointerEvents="none">
          <Text style={styles.timeLabel}>{scrubLabel}</Text>
        </View>
      ) : null}
      <View
        ref={trackRef}
        collapsable={false}
        pointerEvents="none"
        style={[
          styles.track,
          {height: size.track, borderRadius: size.track / 2},
        ]}>
        <Animated.View
          style={[styles.fill, {width, borderRadius: size.track / 2}]}>
          <View
            style={[
              styles.dot,
              {
                width: size.dot,
                height: size.dot,
                borderRadius: size.dot / 2,
                top: (size.track - size.dot) / 2,
              },
              Platform.OS === 'web'
                ? {right: -size.dot / 2}
                : {left: -size.dot / 2},
            ]}
          />
        </Animated.View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  touchZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TOUCH_HEIGHT,
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: FEED_PROGRESS_TRACK_OFFSET,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    ...(Platform.OS === 'web' ? {left: 0} : {right: 0}),
    backgroundColor: ACCENT,
  },
  dot: {
    position: 'absolute',
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 0},
    elevation: 2,
  },
  /** Clears the listing/post caption block that sits just above the bar. */
  timeLabelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 230,
    alignItems: 'center',
  },
  timeLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Rubik-SemiBold',
    writingDirection: 'ltr',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});

export default FeedVideoProgressBar;
