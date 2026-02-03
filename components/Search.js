import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';
import {Colors, FontSizes, Gaps} from '../constants/styles';

/**
 * Search Component
 * Search button with navigation icon
 * @param {string} vector190 - Path to vector icon (not used in RN, kept for compatibility)
 */
const Search = ({style, vector190}) => {
  return (
    <View style={[styles.search, style]}>
      <View style={styles.navigationalIcon}>
        {vector190 && (
          <Image
            source={require('../assets/Vector-190.svg')}
            style={styles.navigationalIconChild}
            resizeMode="contain"
          />
        )}
      </View>
      <Text style={styles.searchText}>חפשו עוד</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  search: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.9,
  },
  navigationalIcon: {
    height: 16,
    width: 11,
    position: 'relative',
    display: 'none',
  },
  navigationalIconChild: {
    position: 'absolute',
    top: 2.9,
    left: 2.2,
    width: 5.3,
    height: 10.5,
  },
  searchText: {
    fontSize: FontSizes.fs18,
    color: Colors.yellowTextCTA,
    fontFamily: 'Rubik',
  },
});

export default Search;
