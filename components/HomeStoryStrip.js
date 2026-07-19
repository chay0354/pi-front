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
import {forceLtrStyle} from '../utils/rtlLayout';

const OUTER = 76;
const ITEM_SPACING = 15;

/**
 * App is forceRTL — horizontal FlatList natively starts on the right and
 * scrolls right→left. `inverted` cancels that flip so the strip scrolls
 * left→right (first ring on the left).
 */
const invertForLtrScroll = I18nManager.isRTL;

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
 */
const HomeStoryStrip = ({rings = [], onRingPress, loading = false}) => {
  const renderItem = useCallback(
    ({item}) => <StoryRingItem ring={item} onRingPress={onRingPress} />,
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
    <View style={[styles.stripWrap, forceLtrStyle]}>
      <FlatList
        data={rings}
        horizontal
        inverted={invertForLtrScroll}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={Platform.OS === 'android'}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        style={[styles.list, forceLtrStyle]}
        contentContainerStyle={[styles.row, forceLtrStyle]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  stripWrap: {
    width: '100%',
    alignSelf: 'stretch',
  },
  list: {
    width: '100%',
  },
  // NOTE: no `flex: 1` here — pinning the content container to the viewport
  // width made the strip unscrollable (5+ rings were unreachable).
  row: {
    paddingHorizontal: 20,
    alignItems: 'flex-start',
    paddingVertical: 4,
    flexGrow: 1,
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
