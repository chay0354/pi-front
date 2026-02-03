import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';
import {
  Colors,
  FontSizes,
  LineHeights,
  Gaps,
  Dimensions,
} from '../constants/styles';

/**
 * ProfilePic Component
 * Profile picture with name text below
 * @param {string} profilePic - Path to profile picture image
 * @param {string} prop - Profile name text
 * @param {boolean} badge - Whether to show badge (not implemented)
 * @param {string} badgeAmount - Badge amount (not implemented)
 * @param {object} styleProps - Additional style properties (flex, minWidth, width)
 */
const ProfilePic = ({
  style,
  profilePic,
  prop,
  badge = false,
  badgeAmount = '-',
  profilePicFlex,
  profilePicMinWidth,
  profilePicWidth,
}) => {
  const profilePicStyle = {
    flex: profilePicFlex,
    minWidth: profilePicMinWidth,
    width: profilePicWidth,
  };

  // Map profile pic paths to require statements
  const getProfileImage = () => {
    if (profilePic?.includes('avatar1.png')) {
      return require('../assets/avatar1.png');
    }
    if (profilePic?.includes('avatar2.png')) {
      return require('../assets/avatar2.png');
    }
    if (profilePic?.includes('avatar3.png')) {
      return require('../assets/avatar3.png');
    }
    if (profilePic?.includes('avatar4.png')) {
      return require('../assets/avatar4.png');
    }
    if (profilePic?.includes('profile-image.png')) {
      return require('../assets/profile-image.png');
    }
    if (profilePic?.includes('profile-pic.png')) {
      return require('../assets/profile-pic.png');
    }
    if (profilePic?.includes('profile-pic1.png')) {
      return require('../assets/profile-pic1.png');
    }
    if (profilePic?.includes('profile-pic2.png')) {
      return require('../assets/profile-pic2.png');
    }
    if (profilePic?.includes('profile-pic3.png')) {
      return require('../assets/profile-pic3.png');
    }
    return require('../assets/profile-pic.png'); // default
  };

  return (
    <View style={[styles.profilePicParent, profilePicStyle, style]}>
      <Image
        source={getProfileImage()}
        style={styles.profilePicIcon}
        resizeMode="cover"
      />
      {prop ? <Text style={styles.profileName}>{prop}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  profilePicParent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: Gaps.gap12,
    width: Dimensions.width78,
  },
  profilePicIcon: {
    width: Dimensions.width78,
    height: Dimensions.height78,
    position: 'relative',
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.yellowIcons,
  },
  profileName: {
    alignSelf: 'stretch',
    position: 'relative',
    letterSpacing: 0.01,
    lineHeight: LineHeights.lh16,
    fontSize: FontSizes.fs14,
    color: Colors.white200,
    fontFamily: 'Rubik',
    textAlign: 'center',
  },
});

export default ProfilePic;
