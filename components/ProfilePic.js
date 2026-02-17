import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';
import {
  Colors,
  FontSizes,
  LineHeights,
  Gaps,
  Dimensions,
} from '../constants/styles';

const ProfilePic = ({style, prop, item}) => {
  return (
    <View style={[styles.profilePicParent, style]}>
      <View style={styles.profilePicIconContainer}>
        <Image
          source={item.profilePic}
          style={styles.profilePicIcon}
          resizeMode="cover"
        />
      </View>
      {item.name ? <Text style={styles.profileName}>{item.name}</Text> : null}
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
  profilePicIconContainer: {
    width: Dimensions.width78,
    height: Dimensions.height78,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.yellowIcons,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicIcon: {
    width: Dimensions.width66,
    height: Dimensions.height66,
    borderRadius: 33,
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
