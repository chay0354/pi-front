import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';
import {Colors, FontSizes, Gaps, Dimensions} from '../constants/styles';

/**
 * SectionName Component
 * Section title with optional icon
 * @param {string} text - Section title text (default: "פרוייקטים נבחרים")
 */
const SectionName = ({style, text = 'פרוייקטים נבחרים'}) => {
  return (
    <View style={[styles.sectionName, style]}>
      <View style={styles.parent}>
        <View style={styles.div}>
          <Text style={styles.div2}>*</Text>
        </View>
        <Text style={styles.div3}>{text}</Text>
      </View>
      <View style={styles.icons}>
        <Image
          source={require('../assets/Rectangle-34624980.svg')}
          style={styles.iconsChild}
          resizeMode="contain"
        />
        <View style={styles.iconsItem} />
        <View style={styles.iconsInner} />
        <View style={styles.ellipseDiv} />
        <View style={styles.iconsChild2} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionName: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4.3,
  },
  parent: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  div: {
    height: 13,
    width: Dimensions.width9,
    position: 'relative',
    display: 'none',
  },
  div2: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  div3: {
    position: 'relative',
    color: Colors.textSecondary,
    fontSize: FontSizes.fs18,
    fontFamily: 'Rubik',
  },
  icons: {
    height: Dimensions.height28,
    width: Dimensions.width28,
    position: 'relative',
    display: 'none',
  },
  iconsChild: {
    position: 'absolute',
    top: 1,
    left: 2,
    width: 25.2,
    height: 25.7,
  },
  iconsItem: {
    position: 'absolute',
    top: 6,
    left: 7.5,
    borderRadius: 50,
    backgroundColor: '#34f3e0',
    width: Dimensions.width2,
    height: Dimensions.height2,
  },
  iconsInner: {
    position: 'absolute',
    top: 18,
    left: 7.5,
    borderRadius: 50,
    backgroundColor: '#34f3e0',
    width: Dimensions.width2,
    height: Dimensions.height2,
  },
  ellipseDiv: {
    position: 'absolute',
    top: 12,
    left: 7.5,
    borderRadius: 50,
    backgroundColor: '#34f3e0',
    width: Dimensions.width2,
    height: Dimensions.height2,
  },
  iconsChild2: {
    position: 'absolute',
    top: 12,
    left: 20,
    borderRadius: 50,
    backgroundColor: '#34f3e0',
    width: Dimensions.width2,
    height: Dimensions.height2,
  },
});

export default SectionName;
