import React, { useRef, useState, useEffect } from 'react';
import { View, ScrollView, Image, StyleSheet, Dimensions } from 'react-native';
import { BorderRadius, Padding, Gaps, Colors } from '../constants/styles';

/**
 * Carusel Component
 * Horizontal scrollable category carousel with tik images
 * Center item is determined by visual position in viewport
 * Left and right items are tilted, less lit, and positioned higher
 * @param {string} property1 - Property type (default: "דירות")
 */
const Carusel = ({ style, property1 = 'דירות' }) => {
  // Array of tik images from tik1.png to tik11.png
  const tikImages = Array.from({ length: 11 }, (_, i) => i + 1);
  const scrollViewRef = useRef(null);
  // Start with item at index 2 centered (משרדים)
  const [centerIndex, setCenterIndex] = useState(2);

  // Map tik image numbers to require statements
  const getTikImage = (num) => {
    const imageMap = {
      1: require('../assets/tik1.png'),
      2: require('../assets/tik2.png'),
      3: require('../assets/tik3.png'),
      4: require('../assets/tik4.png'),
      5: require('../assets/tik5.png'),
      6: require('../assets/tik6.png'),
      7: require('../assets/tik7.png'),
      8: require('../assets/tik8.png'),
      9: require('../assets/tik9.png'),
      10: require('../assets/tik10.png'),
      11: require('../assets/tik11.png'),
    };
    return imageMap[num] || imageMap[1];
  };

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const screenWidth = Dimensions.get('window').width;
    const viewportCenter = scrollPosition + screenWidth / 2;
    
    // Calculate which item is closest to viewport center
    // Each item is 120px wide with 12px gap = 132px total spacing
    const itemWidth = 120;
    const itemGap = 12;
    const itemSpacing = itemWidth + itemGap;
    const paddingLeft = 24;
    
    // Find the index of the item closest to viewport center
    let closestIndex = 0;
    let minDistance = Infinity;
    
    tikImages.forEach((_, index) => {
      const itemLeft = paddingLeft + index * itemSpacing;
      const itemCenter = itemLeft + itemWidth / 2;
      const distance = Math.abs(viewportCenter - itemCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    setCenterIndex(closestIndex);
  };

  const isCenterItem = (index) => {
    return index === centerIndex;
  };

  const isLeftItem = (index) => {
    return index === centerIndex - 1;
  };

  const isRightItem = (index) => {
    return index === centerIndex + 1;
  };

  // Calculate initial scroll position to center item at index 2
  useEffect(() => {
    const screenWidth = Dimensions.get('window').width;
    const itemWidth = 120;
    const itemGap = 12;
    const itemSpacing = itemWidth + itemGap;
    const paddingLeft = 24;
    
    // Calculate position to center item at index 2
    const targetIndex = 2;
    const itemLeft = paddingLeft + targetIndex * itemSpacing;
    const itemCenter = itemLeft + itemWidth / 2;
    const viewportCenter = screenWidth / 2;
    const initialScrollX = itemCenter - viewportCenter;
    
    // Scroll to initial position after a short delay to ensure layout is complete
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: initialScrollX,
          animated: false,
        });
      }
    }, 100);
  }, []);

  return (
    <View style={[styles.carusel, style]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        decelerationRate="fast"
        snapToInterval={132}
        snapToAlignment="start"
        bounces={false}
        pagingEnabled={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {tikImages.map((num, index) => {
          const isCenter = isCenterItem(index);
          const isLeft = isLeftItem(index);
          const isRight = isRightItem(index);
          const isFaded = !isCenter && !isLeft && !isRight;

          return (
            <View key={num} style={styles.categoryItem}>
              <Image
                source={getTikImage(num)}
                style={[
                  styles.tikImage,
                  isCenter && styles.centerImage,
                  isLeft && styles.leftImage,
                  isRight && styles.rightImage,
                  isFaded && styles.fadedImage,
                ]}
                resizeMode="cover"
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  carusel: {
    width: '100%',
    height: 150,
    maxWidth: 366,
    alignSelf: 'center',
    position: 'relative',
  },
  scrollView: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingRight: 24,
    gap: 12,
    alignItems: 'center',
    paddingVertical: 0,
  },
  categoryItem: {
    width: 120,
    height: 120,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tikImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  centerImage: {
    opacity: 1,
    transform: [{ rotate: '0deg' }],
  },
  leftImage: {
    opacity: 0.4,
    transform: [{ rotate: '12deg' }, { translateY: -8 }],
  },
  rightImage: {
    opacity: 0.4,
    transform: [{ rotate: '-12deg' }, { translateY: -8 }],
  },
  fadedImage: {
    opacity: 0.2,
    transform: [{ rotate: '0deg' }],
  },
});

export default Carusel;
