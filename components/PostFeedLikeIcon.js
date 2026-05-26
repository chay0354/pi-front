import React from 'react';
import {Image, Platform, StyleSheet} from 'react-native';

const POST_LIKE_ICON = require('../assets/tiktok/likes.png');
const LIKED_COLOR = '#FFC40A';
const DEFAULT_COLOR = '#FFFFFF';

/** Same likes.png asset; turns gold when liked (web uses CSS filter because PNG tintColor is unreliable). */
export function PostFeedLikeIcon({liked = false, size = 32, style}) {
  return (
    <Image
      source={POST_LIKE_ICON}
      style={[
        styles.icon,
        {width: size, height: size},
        Platform.OS === 'web'
          ? liked
            ? styles.webLiked
            : null
          : {tintColor: liked ? LIKED_COLOR : DEFAULT_COLOR},
        style,
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 32,
    height: 32,
  },
  webLiked: {
    filter:
      'brightness(0) saturate(100%) invert(84%) sepia(47%) saturate(2384%) hue-rotate(358deg) brightness(103%) contrast(101%)',
  },
});

export default PostFeedLikeIcon;
