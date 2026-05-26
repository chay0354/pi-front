import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  memo,
  startTransition,
} from 'react';
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

/** Web: `flexDirection: row-reverse` inverts item X positions vs scroll offset math. */
function webCarouselItemCenterX(index, itemWidth, contentWidth) {
  return contentWidth - (index + 0.5) * itemWidth;
}

function webCarouselSnapScrollX(
  centerIndex,
  itemWidth,
  contentWidth,
  viewportWidth,
) {
  const itemCenter = webCarouselItemCenterX(centerIndex, itemWidth, contentWidth);
  const maxScroll = Math.max(0, contentWidth - viewportWidth);
  return Math.max(0, Math.min(itemCenter - viewportWidth / 2, maxScroll));
}

function webCarouselClosestIndex(
  scrollPosition,
  itemWidth,
  contentWidth,
  viewportWidth,
  listLength,
) {
  const viewportCenter = scrollPosition + viewportWidth / 2;
  let closestIndex = 0;
  let minDistance = Infinity;
  for (let index = 0; index < listLength; index++) {
    const itemCenter = webCarouselItemCenterX(index, itemWidth, contentWidth);
    const distance = Math.abs(viewportCenter - itemCenter);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  }
  return closestIndex;
}

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
        fadeDuration={0}
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

  const contentWidth = Math.max(viewportWidth, list.length * itemWidth);

  const runSnapToCenter = useCallback(
    scrollPosition => {
      if (viewportWidth <= 0) return;

      let closestIndex;
      let snapScrollX;

      if (Platform.OS === 'web') {
        closestIndex = webCarouselClosestIndex(
          scrollPosition,
          itemWidth,
          contentWidth,
          viewportWidth,
          list.length,
        );
        snapScrollX = webCarouselSnapScrollX(
          closestIndex,
          itemWidth,
          contentWidth,
          viewportWidth,
        );
      } else {
        const viewportCenter = scrollPosition + viewportWidth / 2;
        closestIndex = 0;
        let minDistance = Infinity;
        list.forEach((_, index) => {
          const itemCenter = (index + 0.5) * itemWidth;
          const distance = Math.abs(viewportCenter - itemCenter);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
          }
        });
        snapScrollX = Math.max(0, (closestIndex - 1) * itemWidth);
      }

      setCenterIndex(closestIndex);
      if (scrollViewRef.current && Math.abs(scrollPosition - snapScrollX) > 1) {
        scrollViewRef.current.scrollTo({
          x: snapScrollX,
          animated: Platform.OS !== 'android',
        });
        lastScrollPositionRef.current = snapScrollX;
      }
    },
    [viewportWidth, itemWidth, list, contentWidth],
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
        androidScrollNextEmitRef.current = now + 120;
      }

      if (Platform.OS === 'web') {
        const closestIndex = webCarouselClosestIndex(
          scrollPosition,
          itemWidth,
          contentWidth,
          viewportWidth,
          list.length,
        );
        setCenterIndex(closestIndex);
        return;
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

      const applyCenterIndex = nextIndex => {
        setCenterIndex(prev => {
          if (nextIndex === prev) return prev;
          const boundaryRight = (prev + 1) * itemWidth;
          const boundaryLeft = prev * itemWidth;
          if (nextIndex > prev && viewportCenter >= boundaryRight) return nextIndex;
          if (nextIndex < prev && viewportCenter <= boundaryLeft) return nextIndex;
          return prev;
        });
      };

      if (Platform.OS === 'android') {
        startTransition(() => applyCenterIndex(closestIndex));
      } else {
        applyCenterIndex(closestIndex);
      }
    },
    [viewportWidth, itemWidth, list, contentWidth],
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
      const scrollX =
        Platform.OS === 'web'
          ? webCarouselSnapScrollX(
              clamped,
              itemWidth,
              contentWidth,
              viewportWidth,
            )
          : Math.max(0, (clamped - 1) * itemWidth);
      setCenterIndex(clamped);
      lastScrollPositionRef.current = scrollX;
      scrollViewRef.current.scrollTo({x: scrollX, animated});
    },
    [viewportWidth, itemWidth, list.length, contentWidth],
  );

  const handleWebCategoryChipPress = useCallback(
    (index, categoryId) => {
      scrollToIndex(index, true);
      emitCategorySelect(categoryId);
    },
    [scrollToIndex, emitCategorySelect],
  );

  const snapInterval = itemWidth;
  const initialScrollX =
    viewportWidth > 0
      ? Platform.OS === 'web'
        ? webCarouselSnapScrollX(
            initialCenterIndex,
            itemWidth,
            contentWidth,
            viewportWidth,
          )
        : Math.max(0, (initialCenterIndex - 1) * itemWidth)
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
          Platform.OS === 'web' || initialScrollX <= 0
            ? undefined
            : {x: initialScrollX, y: 0}
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
        bounces={false}
        pagingEnabled={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={Platform.OS === 'android' ? 128 : 16}
        nestedScrollEnabled
        removeClippedSubviews={false}
        {...(Platform.OS === 'web'
          ? {style: styles.webCarouselScroll}
          : {
              snapToInterval: snapInterval,
              snapToAlignment: 'start',
              disableIntervalMomentum: true,
            })}
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
      {Platform.OS === 'web' ? (
        <View style={styles.webCategoryPicker}>
          {list.map((item, index) => {
            const selected = centerIndex === index;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.webCategoryChip,
                  selected && styles.webCategoryChipSelected,
                ]}
                onPress={() => handleWebCategoryChipPress(index, item.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{selected}}>
                <Text
                  style={[
                    styles.webCategoryChipText,
                    selected && styles.webCategoryChipTextSelected,
                  ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  webCarouselScroll: {
    width: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-x',
  },
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
  webCategoryPicker: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    width: '100%',
  },
  webCategoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(30, 29, 39, 0.85)',
  },
  webCategoryChipSelected: {
    borderColor: '#FFC40A',
    backgroundColor: 'rgba(255, 196, 10, 0.15)',
  },
  webCategoryChipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
  },
  webCategoryChipTextSelected: {
    color: '#FFC40A',
    fontFamily: 'Rubik-Medium',
  },
});

export default memo(Carusel);
