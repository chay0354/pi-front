import React, {memo, useCallback, useRef, useState} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
  I18nManager,
} from 'react-native';
import {Video, ResizeMode} from 'expo-av';
import {resolveStorySlideUri} from '../utils/videoPlayback';
import ProfileAvatar, {
  PROFILE_RING_COLORS,
} from './ProfileAvatar';

/** Figma 7:24450 — 78pt ring, 66pt photo (6pt inset), 20pt between rings. */
const OUTER = 78;
const ITEM_SPACING = 20;
const PHOTO_INSET = 6;
/** ProfileAvatar ring band is size·3.5/82; the gap fills the rest of the inset. */
const STORY_RING_GAP = PHOTO_INSET - (OUTER * 3.5) / 82;

/**
 * App is forceRTL, so a horizontal FlatList naturally starts on the right and
 * scrolls right→left. We want Instagram-style LTR: first ring on the physical
 * left, scroll left→right.
 *
 * Do NOT combine `inverted` with `direction: 'ltr'` — that double-flips on
 * Android/iOS. Use the scaleX unwrap instead on native RTL.
 */
const NATIVE_RTL = Platform.OS !== 'web' && I18nManager.isRTL;
const rtlUnwrapStyle = NATIVE_RTL ? {transform: [{scaleX: -1}]} : null;
const VIDEO_FILE = /\.(mp4|mov|webm|m4v|m3u8)(\?|#|$)/i;

function isRingVideoSlide(slide) {
  if (!slide) return false;
  if (String(slide.media_type || '').toLowerCase() === 'video') return true;
  const uri = String(slide.media_url || slide.media_playback_url || '');
  return VIDEO_FILE.test(uri);
}

/** Newest video slide in the ring, preferring the uploaded file over HLS. */
function ringVideoUri(ring) {
  const slides = Array.isArray(ring?.slides) ? ring.slides : [];
  let chosen = null;
  for (const slide of slides) {
    if (isRingVideoSlide(slide)) chosen = slide;
  }
  if (!chosen) return '';
  const direct = String(chosen.media_url || '').trim();
  if (/\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(direct)) return direct;
  return String(resolveStorySlideUri(chosen) || direct).trim();
}

const StoryRingVideo = memo(function StoryRingVideo({uri, poster, playing}) {
  return (
    <View style={styles.videoFill} pointerEvents="none">
      {poster ? (
        <Image source={{uri: poster}} style={styles.videoFill} resizeMode="cover" />
      ) : null}
      <Video
        source={{uri}}
        style={styles.videoFill}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        volume={0}
        shouldPlay={playing}
        useNativeControls={false}
      />
    </View>
  );
});

const StoryRingItem = memo(function StoryRingItem({ring, onRingPress, playing}) {
  const onPress = useCallback(() => onRingPress(ring), [onRingPress, ring]);
  const videoUri = ringVideoUri(ring);

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel={`סטוריז של ${ring.display_name || 'משתמש'}`}>
      <ProfileAvatar
        uri={ring.profile_image_url}
        name={ring.display_name}
        size={OUTER}
        ringGap={STORY_RING_GAP}
        subscriptionType={ring}
        content={
          videoUri ? (
            <StoryRingVideo
              uri={videoUri}
              poster={ring.profile_image_url}
              playing={playing}
            />
          ) : null
        }
      />
      <Text style={styles.label} numberOfLines={2}>
        {ring.display_name || 'משתמש'}
      </Text>
    </TouchableOpacity>
  );
});

/**
 * Story rings: same gold gradient ring as ProfileAvatar; tap opens viewer.
 * Always LTR scroll (left → right), independent of app RTL.
 */
const HomeStoryStrip = ({rings = [], onRingPress, loading = false}) => {
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const onViewableItemsChanged = useRef(({viewableItems}) => {
    setVisibleIds(
      new Set(viewableItems.map(entry => String(entry?.item?.subscription_id || ''))),
    );
  }).current;
  const viewabilityConfig = useRef({itemVisiblePercentThreshold: 40}).current;

  const renderItem = useCallback(
    ({item}) => {
      const id = String(item?.subscription_id || '');
      const playing = visibleIds.size === 0 || visibleIds.has(id);
      return (
        <View style={rtlUnwrapStyle}>
          <StoryRingItem ring={item} onRingPress={onRingPress} playing={playing} />
        </View>
      );
    },
    [onRingPress, visibleIds],
  );

  const keyExtractor = useCallback(item => String(item.subscription_id), []);

  if (loading && rings.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={PROFILE_RING_COLORS[1]} />
      </View>
    );
  }

  if (!loading && rings.length === 0) {
    return null;
  }

  return (
    <View style={styles.stripWrap}>
      <FlatList
        data={rings}
        horizontal
        inverted={false}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={Platform.OS === 'android'}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        style={[styles.list, rtlUnwrapStyle]}
        contentContainerStyle={styles.row}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  stripWrap: {
    width: '100%',
    alignSelf: 'stretch',
    // Web: CSS direction is enough. Native uses scaleX unwrap above.
    ...(Platform.OS === 'web' ? {direction: 'ltr'} : null),
  },
  list: {
    width: '100%',
    ...(Platform.OS === 'web' ? {direction: 'ltr'} : null),
  },
  // NOTE: no `flex: 1` here — pinning the content container to the viewport
  // width made the strip unscrollable (5+ rings were unreachable).
  row: {
    paddingHorizontal: 20,
    // Top-align so a two-line name grows downward and the ring stays put.
    alignItems: 'flex-start',
    paddingVertical: 4,
    flexGrow: 1,
    ...(Platform.OS === 'web' ? {direction: 'ltr'} : null),
  },
  separator: {
    width: ITEM_SPACING,
  },
  item: {
    width: OUTER,
    alignItems: 'center',
    gap: 12,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.14,
    textAlign: 'center',
    width: OUTER,
    fontFamily: 'Rubik-Regular',
  },
  videoFill: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  loadingWrap: {
    justifyContent: 'center',
    paddingHorizontal: 20,
    minHeight: OUTER,
  },
});

export default memo(HomeStoryStrip);
