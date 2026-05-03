import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

const AVATAR = 66;
const OUTER = 78;

/**
 * Story rings (yellow border): users with at least one story slide (profile video and/or video posts); tap opens viewer.
 */
const HomeStoryStrip = ({
  rings = [],
  onRingPress,
  loading = false,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {loading && rings.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#FFC40A" />
        </View>
      ) : null}

      {rings.map(ring => (
        <TouchableOpacity
          key={ring.subscription_id}
          style={styles.item}
          onPress={() => onRingPress(ring)}
          activeOpacity={0.85}
          accessibilityLabel={`סטוריז של ${ring.display_name || 'משתמש'}`}>
          <View style={styles.storyRingOuter}>
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
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {ring.display_name || 'משתמש'}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    gap: 17,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
    paddingVertical: 4,
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
  /** Fixed size + absolute fill so web always applies cover (no intrinsic 114×114 bleed). */
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
    paddingHorizontal: 12,
    minHeight: OUTER,
  },
});

export default HomeStoryStrip;
