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
 * First item: add story (+). Rest: profile rings with yellow border (active stories).
 */
const HomeStoryStrip = ({
  rings = [],
  onAddPress,
  onRingPress,
  loading = false,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      <TouchableOpacity
        style={styles.item}
        onPress={onAddPress}
        activeOpacity={0.85}
        accessibilityLabel="הוסף סטורי">
        <View style={styles.addOuter}>
          <View style={styles.addInner}>
            <Text style={styles.addPlus}>+</Text>
          </View>
        </View>
        <Text style={styles.label} numberOfLines={1}>
          חדש
        </Text>
      </TouchableOpacity>

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
          accessibilityLabel={`סטורי של ${ring.display_name || 'משתמש'}`}>
          <View style={styles.storyRingOuter}>
            {ring.profile_image_url ? (
              <Image
                source={{uri: ring.profile_image_url}}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
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
  addOuter: {
    width: OUTER,
    height: OUTER,
    borderRadius: OUTER / 2,
    borderWidth: 3,
    borderColor: '#FFC40A',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addInner: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: 'rgba(30,29,39,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPlus: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '300',
    marginTop: -4,
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
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
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
