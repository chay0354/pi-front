import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
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
/** Three copies of the list so we can jump silently in the middle block (infinite loop). */
const LOOP_COPIES = 3;

function positiveMod(value, modulus) {
  if (modulus <= 0) return 0;
  return ((value % modulus) + modulus) % modulus;
}

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

function nativeCarouselClosestIndex(
  scrollPosition,
  itemWidth,
  viewportWidth,
  totalItems,
) {
  const viewportCenter = scrollPosition + viewportWidth / 2;
  let closestIndex = 0;
  let minDistance = Infinity;
  for (let index = 0; index < totalItems; index++) {
    const itemCenter = (index + 0.5) * itemWidth;
    const distance = Math.abs(viewportCenter - itemCenter);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  }
  return closestIndex;
}

function nativeCarouselSnapScrollX(virtualCenterIndex, itemWidth) {
  return Math.max(0, (virtualCenterIndex - 1) * itemWidth);
}

/** Keep scroll position in the middle copy so swiping never hits a hard edge. */
function normalizeInfiniteCarouselPosition(
  virtualIndex,
  scrollX,
  listLength,
  itemWidth,
) {
  const n = listLength;
  if (n <= 1) {
    return {virtualIndex: Math.max(0, virtualIndex), scrollX};
  }
  let v = virtualIndex;
  let x = scrollX;
  const blockWidth = n * itemWidth;
  if (v < n) {
    v += n;
    x += blockWidth;
  } else if (v >= 2 * n) {
    v -= n;
    x -= blockWidth;
  }
  return {virtualIndex: v, scrollX: x};
}

function buildExtendedCarouselList(categories) {
  if (!categories?.length) return [];
  if (categories.length === 1) {
    return [{...categories[0], _carouselKey: `0-${categories[0].id}`}];
  }
  const out = [];
  for (let copy = 0; copy < LOOP_COPIES; copy++) {
    categories.forEach((item, i) => {
      out.push({
        ...item,
        _carouselKey: `${copy}-${item.id}-${i}`,
      });
    });
  }
  return out;
}

const CarouselCategoryItem = memo(function CarouselCategoryItem({
  item,
  itemWidth,
  virtualIndex,
  virtualCenterIndex,
  onCategorySelect,
  scrollToVirtualIndex,
}) {
  const isCenter = virtualIndex === virtualCenterIndex;
  const isLeft = virtualIndex === virtualCenterIndex - 1;
  const isRight = virtualIndex === virtualCenterIndex + 1;
  const isFaded = !isCenter && !isLeft && !isRight;

  const source = isCenter
    ? item.image
    : virtualIndex < virtualCenterIndex
      ? item.imageLeft
      : item.imageRight;

  const onPress = useCallback(() => {
    if (!isCenter) {
      scrollToVirtualIndex(virtualIndex);
      return;
    }
    onCategorySelect?.(item.id);
  }, [
    isCenter,
    virtualIndex,
    onCategorySelect,
    scrollToVirtualIndex,
    item.id,
  ]);

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
  const listLength = list.length;
  const infiniteLoop = listLength > 1;
  const initialLogicalIndex = Math.min(2, Math.max(0, listLength - 1));
  const initialVirtualIndex = infiniteLoop
    ? listLength + initialLogicalIndex
    : initialLogicalIndex;
  const [virtualCenterIndex, setVirtualCenterIndex] =
    useState(initialVirtualIndex);
  const onCategorySelectRef = useRef(onCategorySelect);
  onCategorySelectRef.current = onCategorySelect;

  const emitCategorySelect = useCallback(id => {
    onCategorySelectRef.current?.(id);
  }, []);

  const categoryIdsKey = list.map(c => c.id).join(',');
  const extendedList = useMemo(
    () => buildExtendedCarouselList(list),
    [list, categoryIdsKey],
  );
  const totalItems = extendedList.length;

  const viewportWidth = carouselWidth > 0 ? carouselWidth : screenWidth;
  const itemWidth = viewportWidth > 0 ? viewportWidth / 3 : 120;
  const contentWidth = Math.max(viewportWidth, totalItems * itemWidth);
  const logicalCenterIndex = positiveMod(virtualCenterIndex, listLength);

  const jumpToScrollX = useCallback((scrollX, animated = false) => {
    if (!scrollViewRef.current) return;
    scrollViewRef.current.scrollTo({x: scrollX, animated});
    lastScrollPositionRef.current = scrollX;
  }, []);

  const runSnapToCenter = useCallback(
    scrollPosition => {
      if (viewportWidth <= 0 || totalItems === 0) return;

      let closestVirtualIndex;
      let snapScrollX;

      if (Platform.OS === 'web') {
        closestVirtualIndex = webCarouselClosestIndex(
          scrollPosition,
          itemWidth,
          contentWidth,
          viewportWidth,
          totalItems,
        );
        snapScrollX = webCarouselSnapScrollX(
          closestVirtualIndex,
          itemWidth,
          contentWidth,
          viewportWidth,
        );
      } else {
        closestVirtualIndex = nativeCarouselClosestIndex(
          scrollPosition,
          itemWidth,
          viewportWidth,
          totalItems,
        );
        snapScrollX = nativeCarouselSnapScrollX(closestVirtualIndex, itemWidth);
      }

      const normalized = infiniteLoop
        ? normalizeInfiniteCarouselPosition(
            closestVirtualIndex,
            snapScrollX,
            listLength,
            itemWidth,
          )
        : {virtualIndex: closestVirtualIndex, scrollX: snapScrollX};

      setVirtualCenterIndex(normalized.virtualIndex);

      const isLoopJump =
        infiniteLoop && normalized.scrollX !== snapScrollX;
      const targetScrollX = normalized.scrollX;
      if (
        scrollViewRef.current &&
        Math.abs(scrollPosition - targetScrollX) > 1
      ) {
        jumpToScrollX(
          targetScrollX,
          !isLoopJump && Platform.OS !== 'android',
        );
      }
    },
    [
      viewportWidth,
      itemWidth,
      contentWidth,
      totalItems,
      listLength,
      infiniteLoop,
      jumpToScrollX,
    ],
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

      const closestVirtualIndex =
        Platform.OS === 'web'
          ? webCarouselClosestIndex(
              scrollPosition,
              itemWidth,
              contentWidth,
              viewportWidth,
              totalItems,
            )
          : nativeCarouselClosestIndex(
              scrollPosition,
              itemWidth,
              viewportWidth,
              totalItems,
            );

      const applyVirtualCenter = nextIndex => {
        setVirtualCenterIndex(prev => (nextIndex === prev ? prev : nextIndex));
      };

      if (Platform.OS === 'android') {
        startTransition(() => applyVirtualCenter(closestVirtualIndex));
      } else {
        applyVirtualCenter(closestVirtualIndex);
      }
    },
    [viewportWidth, itemWidth, contentWidth, totalItems],
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

  const scrollToVirtualIndex = useCallback(
    (virtualIndex, animated = true) => {
      if (!scrollViewRef.current || viewportWidth <= 0 || totalItems === 0) {
        return;
      }
      const clamped = Math.max(0, Math.min(virtualIndex, totalItems - 1));
      const scrollX =
        Platform.OS === 'web'
          ? webCarouselSnapScrollX(
              clamped,
              itemWidth,
              contentWidth,
              viewportWidth,
            )
          : nativeCarouselSnapScrollX(clamped, itemWidth);
      setVirtualCenterIndex(clamped);
      jumpToScrollX(scrollX, animated);
    },
    [viewportWidth, itemWidth, contentWidth, totalItems, jumpToScrollX],
  );

  const scrollToIndex = useCallback(
    (logicalIndex, animated = true) => {
      if (!infiniteLoop) {
        scrollToVirtualIndex(logicalIndex, animated);
        return;
      }
      const clamped = Math.max(0, Math.min(logicalIndex, listLength - 1));
      scrollToVirtualIndex(listLength + clamped, animated);
    },
    [infiniteLoop, listLength, scrollToVirtualIndex],
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
            initialVirtualIndex,
            itemWidth,
            contentWidth,
            viewportWidth,
          )
        : nativeCarouselSnapScrollX(initialVirtualIndex, itemWidth)
      : 0;

  const scrollToInitialCenter = useCallback(
    (animated = false) => {
      if (viewportWidth <= 0 || !scrollViewRef.current) {
        return;
      }
      jumpToScrollX(initialScrollX, animated);
      setVirtualCenterIndex(initialVirtualIndex);
      hasInitialScrollDone.current = true;
    },
    [viewportWidth, initialScrollX, initialVirtualIndex, jumpToScrollX],
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

  const listRef = useRef(list);
  listRef.current = list;

  useEffect(() => {
    hasInitialScrollDone.current = false;
    setVirtualCenterIndex(initialVirtualIndex);
  }, [categoryIdsKey, initialVirtualIndex]);

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
        {extendedList.map((item, virtualIndex) => (
          <CarouselCategoryItem
            key={item._carouselKey}
            item={item}
            itemWidth={itemWidth}
            virtualIndex={virtualIndex}
            virtualCenterIndex={virtualCenterIndex}
            onCategorySelect={emitCategorySelect}
            scrollToVirtualIndex={scrollToVirtualIndex}
          />
        ))}
      </ScrollView>
      {Platform.OS === 'web' ? (
        <View style={styles.webCategoryPicker}>
          {list.map((item, index) => {
            const selected = logicalCenterIndex === index;
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
