import React, {useRef, useState, useEffect, useCallback, memo} from 'react';
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

/** Fixed slot + transform scales match prior 104×142 / 174×212 layout without per-frame width/height relayout (Android). */
const CATEGORY_SLOT_W = 174;
const CATEGORY_SLOT_H = 212;
const CATEGORY_SIDE_SCALE_X = 104 / CATEGORY_SLOT_W;
const CATEGORY_SIDE_SCALE_Y = 142 / CATEGORY_SLOT_H;

const CarouselCategoryItem = memo(function CarouselCategoryItem({
  item,
  itemWidth,
  index,
  centerIndex,
  listLength,
  onCategorySelect,
  scrollToIndex,
}) {
  const isCenter = index === centerIndex;
  const isLeft = index === centerIndex - 1;
  const isRight = index === centerIndex + 1;
  const isFaded = !isCenter && !isLeft && !isRight;

  const source = isCenter
    ? item.image
    : index < centerIndex
      ? item.imageLeft
      : item.imageRight;

  const onPress = useCallback(() => {
    if (
      (isCenter || index === 0 || index === listLength - 1) &&
      onCategorySelect
    ) {
      onCategorySelect(item.id);
    } else {
      scrollToIndex(index);
    }
  }, [isCenter, index, listLength, onCategorySelect, scrollToIndex, item.id]);

  const imageTransform = isCenter
    ? [{translateY: -15}]
    : [{scaleX: CATEGORY_SIDE_SCALE_X}, {scaleY: CATEGORY_SIDE_SCALE_Y}];

  return (
    <TouchableOpacity
      style={[styles.categoryItem, {width: itemWidth}]}
      onPress={onPress}
      activeOpacity={0.7}>
      <Image
        source={source}
        resizeMode="contain"
        style={[
          styles.tikImageBase,
          isFaded && styles.fadedImage,
          {transform: imageTransform},
        ]}
      />
    </TouchableOpacity>
  );
});

const Carusel = ({
  style,
  categoriesList = userCategories,
  onCategorySelect,
}) => {
  const {width: screenWidth} = useWindowDimensions();
  // Use provided list or full list so all users can see all categories
  const list =
    categoriesList && categoriesList.length > 0
      ? categoriesList
      : userCategories;
  const scrollViewRef = useRef(null);
  const hasInitialScrollDone = useRef(false);
  const lastScrollPositionRef = useRef(0);
  /** Android: throttling onScroll setState avoids JS backlog that delays touch / scroll for seconds after a fling. */
  const androidScrollNextEmitRef = useRef(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const initialCenterIndex = Math.min(2, Math.max(0, list.length - 1));
  const [centerIndex, setCenterIndex] = useState(initialCenterIndex);
  const onCategorySelectRef = useRef(onCategorySelect);
  onCategorySelectRef.current = onCategorySelect;

  const emitCategorySelect = useCallback(id => {
    onCategorySelectRef.current?.(id);
  }, []);

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
        // Android: animated correction fights the gesture handler and can leave the scroll view
        // ignoring touches until the animation finishes.
        animated: Platform.OS !== 'android',
      });
    }
  };

  const handleScroll = useCallback(
    event => {
      const scrollPosition = event.nativeEvent.contentOffset.x;
      lastScrollPositionRef.current = scrollPosition;

      if (Platform.OS === 'android') {
        const now =
          typeof globalThis.performance !== 'undefined' &&
          typeof globalThis.performance.now === 'function'
            ? globalThis.performance.now()
            : Date.now();
        if (now < androidScrollNextEmitRef.current) {
          return;
        }
        androidScrollNextEmitRef.current = now + 80;
      }

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

      setCenterIndex(prev => {
        if (closestIndex === prev) return prev;
        const boundaryRight = (prev + 1) * itemWidth;
        const boundaryLeft = prev * itemWidth;
        if (closestIndex > prev && viewportCenter >= boundaryRight)
          return closestIndex;
        if (closestIndex < prev && viewportCenter <= boundaryLeft)
          return closestIndex;
        return prev;
      });
    },
    [viewportWidth, itemWidth, list],
  );

  const handleScrollBeginDrag = useCallback(() => {
    androidScrollNextEmitRef.current = 0;
  }, []);

  const handleScrollEndDrag = () => {
    if (Platform.OS === 'web') {
      runSnapToCenter(lastScrollPositionRef.current);
    } else if (Platform.OS === 'android') {
      // Short drags often never fire onMomentumScrollEnd; snap + sync center or touches stay wrong.
      runSnapToCenter(lastScrollPositionRef.current);
    }
  };

  const handleMomentumScrollEnd = event => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    runSnapToCenter(scrollPosition);
  };

  const scrollToIndex = useCallback(
    (index, animated = true) => {
      if (!scrollViewRef.current || viewportWidth <= 0) {
        return;
      }
      const scrollX = Math.max(0, (index - 1) * itemWidth);
      scrollViewRef.current.scrollTo({
        x: scrollX,
        animated,
      });
    },
    [viewportWidth, itemWidth],
  );

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

  const snapInterval = itemWidth;

  const categoryIdsKey = list.map(c => c.id).join(',');
  const listRef = useRef(list);
  listRef.current = list;

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    listRef.current.forEach(row => {
      [row.image, row.imageLeft, row.imageRight].forEach(src => {
        try {
          const resolved = Image.resolveAssetSource(src);
          if (resolved?.uri) {
            Image.prefetch(resolved.uri);
          }
        } catch (_) {
          /* ignore */
        }
      });
    });
  }, [categoryIdsKey]);

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
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={Platform.OS === 'android' ? 64 : 16}
        nestedScrollEnabled={Platform.OS === 'android'}
        removeClippedSubviews={false}
        {...(Platform.OS === 'android' ? {overScrollMode: 'never'} : {})}>
        {list.map((item, index) => (
          <CarouselCategoryItem
            key={item.id}
            item={item}
            itemWidth={itemWidth}
            index={index}
            centerIndex={centerIndex}
            listLength={list.length}
            onCategorySelect={emitCategorySelect}
            scrollToIndex={scrollToIndex}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  categoryItem: {
    height: 220,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  tikImageBase: {
    width: CATEGORY_SLOT_W,
    height: CATEGORY_SLOT_H,
  },
  fadedImage: {
    opacity: 0.2,
  },
});

export default Carusel;
