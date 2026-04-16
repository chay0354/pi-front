import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import {userCategories} from '../utils/constant';

const Carusel = ({style, categoriesList = userCategories, onCategorySelect}) => {
  const {width: screenWidth} = useWindowDimensions();
  // Use provided list or full list so all users can see all categories
  const list = categoriesList && categoriesList.length > 0 ? categoriesList : userCategories;
  const scrollViewRef = useRef(null);
  const hasInitialScrollDone = useRef(false);
  const lastScrollPositionRef = useRef(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const initialCenterIndex = Math.min(2, Math.max(0, list.length - 1));
  const [centerIndex, setCenterIndex] = useState(initialCenterIndex);

  // Use real carousel viewport width for stable center math (web + native).
  const viewportWidth = carouselWidth > 0 ? carouselWidth : screenWidth;
  const itemWidth = viewportWidth > 0 ? viewportWidth / 3 : 120;

  const runSnapToCenter = scrollPosition => {
    if (viewportWidth <= 0) return;
    const viewportCenter = scrollPosition + viewportWidth / 2;
    let closestIndex = 0;
    let minDistance = Infinity;
    list.forEach((_, index) => {
      const itemCenter = (index + 0.5) * itemWidth;
      const distance = Math.abs(viewportCenter - itemCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    setCenterIndex(closestIndex);
    const snapScrollX = Math.max(0, (closestIndex - 1) * itemWidth);
    if (scrollViewRef.current && Math.abs(scrollPosition - snapScrollX) > 1) {
      scrollViewRef.current.scrollTo({
        x: snapScrollX,
        animated: true,
      });
    }
  };

  const handleScroll = event => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    lastScrollPositionRef.current = scrollPosition;
    const viewportCenter = scrollPosition + viewportWidth / 2;

    // Use same itemWidth as layout so center detection matches visible items
    let closestIndex = 0;
    let minDistance = Infinity;

    list.forEach((_, index) => {
      const itemCenter = (index + 0.5) * itemWidth;
      const distance = Math.abs(viewportCenter - itemCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    setCenterIndex(prev => {
      if (closestIndex === prev) return prev;
      // Hysteresis: only switch when viewport has clearly crossed the boundary
      const boundaryRight = (prev + 1) * itemWidth;
      const boundaryLeft = prev * itemWidth;
      if (closestIndex > prev && viewportCenter >= boundaryRight) return closestIndex;
      if (closestIndex < prev && viewportCenter <= boundaryLeft) return closestIndex;
      return prev;
    });
  };

  const handleScrollEndDrag = () => {
    // Keep web deterministic; native relies on momentum end.
    if (Platform.OS === 'web') {
      runSnapToCenter(lastScrollPositionRef.current);
    }
  };

  const handleMomentumScrollEnd = event => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    runSnapToCenter(scrollPosition);
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
    if (!scrollViewRef.current || viewportWidth <= 0) {
      return;
    }

    const scrollX = Math.max(0, (index - 1) * itemWidth);

    scrollViewRef.current.scrollTo({
      x: scrollX,
      animated,
    });
  };

  // Initial scroll once per mount: center the intended item when we have valid dimensions.
  useEffect(() => {
    if (viewportWidth <= 0 || hasInitialScrollDone.current) {
      return;
    }

    const initialScrollX = Math.max(0, (initialCenterIndex - 1) * itemWidth);

    const runAfterLayout = () => {
      if (scrollViewRef.current && !hasInitialScrollDone.current) {
        scrollViewRef.current.scrollTo({
          x: initialScrollX,
          animated: false,
        });
        hasInitialScrollDone.current = true;
      }
    };

    // Delay so ScrollView has been laid out (web, Android, iOS)
    const t = setTimeout(runAfterLayout, 150);
    return () => clearTimeout(t);
  }, [viewportWidth, itemWidth, initialCenterIndex]);

  const snapInterval = Math.round(itemWidth);

  return (
    <View style={[style]}>
      <ScrollView
        ref={scrollViewRef}
        onLayout={event => {
          const width = event?.nativeEvent?.layout?.width ?? 0;
          if (width > 0 && Math.abs(width - carouselWidth) > 0.5) {
            setCarouselWidth(width);
          }
        }}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="start"
        bounces={false}
        pagingEnabled={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}>
        {list.map((item, index) => {
          const isCenter = isCenterItem(index);
          const isLeft = isLeftItem(index);
          const isRight = isRightItem(index);
          const isFaded = !isCenter && !isLeft && !isRight;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.categoryItem, {width: itemWidth}]}
              onPress={() => {
                if (
                  (isCenter ||
                    index === 0 ||
                    index === list.length - 1) &&
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
                    : index < centerIndex
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
