import React, {useRef, useState, useEffect, useContext} from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  brokerCategories,
  companyCategories,
  subscriptionTypes,
  userCategories,
} from '../utils/constant';
import {ContextHook} from '../hooks/ContextHook';

const {width: screenWidth} = Dimensions.get('window');
const Carusel = ({style, onCategorySelect}) => {
  const {currentUser} = useContext(ContextHook);
  const categoriesList =
    currentUser?.subscription_type === subscriptionTypes.user
      ? userCategories
      : currentUser?.subscription_type === subscriptionTypes.broker
        ? brokerCategories
        : companyCategories;
  const scrollViewRef = useRef(null);
  // Start with item at index 2 centered (משרדים)
  const [centerIndex, setCenterIndex] = useState(0);

  const handleScroll = event => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
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

    categoriesList.forEach((_, index) => {
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

  const isCenterItem = index => {
    return index === centerIndex;
  };

  const isLeftItem = index => {
    return index === centerIndex - 1;
  };

  const isRightItem = index => {
    return index === centerIndex + 1;
  };

  const scrollToIndex = (index, animated = true) => {
    if (!scrollViewRef.current) {
      return;
    }

    const itemWidth = screenWidth / 3;
    const itemCenter = index * itemWidth + itemWidth / 2;
    const viewportCenter = screenWidth / 2;
    const scrollX = Math.max(0, itemCenter - viewportCenter);

    scrollViewRef.current.scrollTo({
      x: scrollX,
      animated,
    });
  };

  // Calculate initial scroll position to center item at index 2
  useEffect(() => {
    const itemCenter = (screenWidth / 0.33) * 2;
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
    <View style={[style]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={132}
        snapToAlignment="start"
        bounces={false}
        pagingEnabled={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}>
        {categoriesList.map((item, index) => {
          const isCenter = isCenterItem(index);
          const isLeft = isLeftItem(index);
          const isRight = isRightItem(index);
          const isFaded = !isCenter && !isLeft && !isRight;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.categoryItem}
              onPress={() => {
                if (
                  (isCenter ||
                    index === 0 ||
                    index === categoriesList.length - 1) &&
                  onCategorySelect
                ) {
                  onCategorySelect(item.id);
                } else {
                  scrollToIndex(index);
                }
              }}
              activeOpacity={0.7}>
              <Image
                source={
                  isCenter
                    ? item.image
                    : isLeft
                      ? item.imageLeft
                      : item.imageRight
                }
                resizeMode="contain"
                style={[
                  styles.tikImage,
                  isCenter && styles.centerImage,
                  isLeft && styles.leftImage,
                  isRight && styles.rightImage,
                  isFaded && styles.fadedImage,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  categoryItem: {
    width: screenWidth / 3,
    height: 142,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tikImage: {
    width: 104,
    height: 142,
  },
  centerImage: {
    width: 174,
    height: 212,
    marginTop: -15,
  },
  leftImage: {
    width: 104,
    height: 142,
  },
  rightImage: {
    width: 104,
    height: 142,
  },
  fadedImage: {
    opacity: 0.2,
    transform: [{rotate: '0deg'}],
  },
});

export default Carusel;
