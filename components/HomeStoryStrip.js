import React, {memo, useCallback} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';

const AVATAR = 66;
const OUTER = 78;
const ITEM_SPACING = 17;

const StoryRingItem = memo(function StoryRingItem({ring, onRingPress}) {
  const onPress = useCallback(() => onRingPress(ring), [onRingPress, ring]);

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel={`סטוריז של ${ring.display_name || 'משתמש'}`}>
      <View style={styles.storyRingOuter}>
        {ring.profile_image_url ? (
          <View style={styles.avatarClip}>
            <Image
              source={{uri: ring.profile_image_url}}
              style={styles.avatarImage}
              resizeMode="cover"
              fadeDuration={0}
            />
          </View>
        ) : (
          <View style={[styles.avatarClip, styles.avatarPlaceholder]} />
        )}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {ring.display_name || 'משתמש'}
      </Text>
    </TouchableOpacity>
  );
});

/**
 * Story rings (yellow border): users with at least one story slide (profile video and/or video posts); tap opens viewer.
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
        <ActivityIndicator color="#FFC40A" />
      </View>
    );
  }

  return (
    <FlatList
      data={rings}
      horizontal
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      nestedScrollEnabled={Platform.OS === 'android'}
      removeClippedSubviews={Platform.OS === 'android'}
      initialNumToRender={6}
      maxToRenderPerBatch={8}
      windowSize={5}
      contentContainerStyle={styles.row}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
};

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    alignItems: 'flex-start',
    paddingVertical: 4,
    flex: 1,
  },
  separator: {
    width: ITEM_SPACING,
  },
  item: {
    width: OUTER,
    alignItems: 'center',
    gap: 8,
  },
  storyRingOuter: {
    width: OUTER,
    height: OUTER,
    borderRadius: OUTER / 2,
    borderWidth: 3,
    borderColor: '#FFC40A',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarClip: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: AVATAR,
    height: AVATAR,
  },
  avatarPlaceholder: {
    backgroundColor: '#3d3c48',
  },
  label: {
    color: '#fff',
    fontSize: 12,
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
