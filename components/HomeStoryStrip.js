import React, {memo, useCallback} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  I18nManager,
} from 'react-native';
import ProfileAvatar, {
  PROFILE_RING_COLORS,
} from './ProfileAvatar';

const OUTER = 76;
const ITEM_SPACING = 15;

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

const StoryRingItem = memo(function StoryRingItem({ring, onRingPress}) {
  const onPress = useCallback(() => onRingPress(ring), [onRingPress, ring]);

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
        subscriptionType={ring}
      />
      <Text style={styles.label} numberOfLines={1}>
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
  const renderItem = useCallback(
    ({item}) => (
      <View style={rtlUnwrapStyle}>
        <StoryRingItem ring={item} onRingPress={onRingPress} />
      </View>
    ),
    [onRingPress],
  );

  const keyExtractor = useCallback(item => String(item.subscription_id), []);

  if (loading && rings.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={PROFILE_RING_COLORS[1]} />
      </View>
    );
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
    alignItems: 'center',
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
    gap: 6,
  },
  label: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
    width: OUTER + 8,
    fontFamily: 'Rubik-Regular',
  },
  loadingWrap: {
    justifyContent: 'center',
    paddingHorizontal: 20,
    minHeight: OUTER,
  },
});

export default memo(HomeStoryStrip);
