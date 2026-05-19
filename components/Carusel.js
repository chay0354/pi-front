import React, {useRef, useState, useEffect, useCallback, memo} from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Text,
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
    if (!isCenter) {
      scrollToIndex(index);
    }
    if (isCenter || index === 0 || index === listLength - 1) {
      onCategorySelect?.(item.id);
    }
  }, [isCenter, index, listLength, onCategorySelect, scrollToIndex, item.id]);

  const imageTransform = isCenter
    ? [{translateY: -15}]
    : [{scaleX: CATEGORY_SIDE_SCALE_X}, {scaleY: CATEGORY_SIDE_SCALE_Y}];

  return (
    <TouchableOpacity
      style={[styles.categoryItem, {width: itemWidth}]}
      onPress={onPress}
      activeOpacity={0.7}
      delayPressIn={0}>
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

const Carusel = ({categoriesList = userCategories, onCategorySelect}) => {
  const {width: screenWidth} = useWindowDimensions();
  const list =
    categoriesList && categoriesList.length > 0
      ? categoriesList
      : userCategories;
  const scrollViewRef = useRef(null);
  const hasInitialScrollDone = useRef(false);
  const lastScrollPositionRef = useRef(0);
  const androidScrollNextEmitRef = useRef(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const initialCenterIndex = Math.min(2, Math.max(0, list.length - 1));
  const [centerIndex, setCenterIndex] = useState(initialCenterIndex);
  const onCategorySelectRef = useRef(onCategorySelect);
  onCategorySelectRef.current = onCategorySelect;

  const emitCategorySelect = useCallback(id => {
    onCategorySelectRef.current?.(id);
  }, []);

  const viewportWidth = carouselWidth > 0 ? carouselWidth : screenWidth;
  const itemWidth = viewportWidth > 0 ? viewportWidth / 3 : 120;

  const runSnapToCenter = useCallback(
    scrollPosition => {
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
          animated: Platform.OS !== 'android',
        });
        lastScrollPositionRef.current = snapScrollX;
      }
    },
    [viewportWidth, itemWidth, list],
  );

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
    if (Platform.OS === 'android' || Platform.OS === 'web') {
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
      const maxIndex = Math.max(0, list.length - 1);
      const clamped = Math.max(0, Math.min(index, maxIndex));
      const scrollX = Math.max(0, (clamped - 1) * itemWidth);
      setCenterIndex(clamped);
      lastScrollPositionRef.current = scrollX;
      scrollViewRef.current.scrollTo({x: scrollX, animated});
    },
    [viewportWidth, itemWidth, list.length],
  );

  const snapInterval = itemWidth;
  const contentWidth = Math.max(viewportWidth, list.length * itemWidth);
  const initialScrollX =
    viewportWidth > 0
      ? Math.max(0, (initialCenterIndex - 1) * itemWidth)
      : 0;

  const scrollToInitialCenter = useCallback(
    (animated = false) => {
      if (viewportWidth <= 0 || !scrollViewRef.current) {
        return;
      }
      scrollViewRef.current.scrollTo({x: initialScrollX, animated});
      lastScrollPositionRef.current = initialScrollX;
      setCenterIndex(initialCenterIndex);
      hasInitialScrollDone.current = true;
    },
    [viewportWidth, initialScrollX, initialCenterIndex],
  );

  useEffect(() => {
    if (viewportWidth <= 0 || hasInitialScrollDone.current) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      scrollToInitialCenter(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [viewportWidth, scrollToInitialCenter]);

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
    <View>
      <ScrollView
        ref={scrollViewRef}
        contentOffset={
          initialScrollX > 0 ? {x: initialScrollX, y: 0} : undefined
        }
        onLayout={event => {
          const width = event?.nativeEvent?.layout?.width ?? 0;
          if (width > 0 && Math.abs(width - carouselWidth) > 0.5) {
            const isFirstMeasure = carouselWidth <= 0;
            setCarouselWidth(width);
            if (isFirstMeasure) {
              requestAnimationFrame(() => scrollToInitialCenter(false));
            }
          }
        }}
        contentContainerStyle={[
          styles.carouselContent,
          {width: contentWidth, minWidth: contentWidth},
        ]}
        horizontal
        scrollEnabled
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
        nestedScrollEnabled
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
  carouselContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  categoryItem: {
    height: 220,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    flexShrink: 0,
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
