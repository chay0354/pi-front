import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
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
import {Audio, InterruptionModeAndroid, InterruptionModeIOS} from 'expo-av';
import {userCategories} from '../utils/constant';

const TICK_SOUND = require('../assets/sounds/carousel-tick.wav');
/** Min gap between ticks so a hard fling rattles instead of stuttering. */
const TICK_MIN_GAP_MS = 45;
const TICK_VOLUME = 0.85;
/** Pool so rapid ticks don't cancel each other on one Sound instance. */
const TICK_POOL_SIZE = 4;

/** Fixed slot + transform scales match prior 104×142 / 174×212 layout without per-frame width/height relayout (Android). */
const CATEGORY_SLOT_W = 174;
const CATEGORY_SLOT_H = 212;
const CATEGORY_SIDE_SCALE_X = 104 / CATEGORY_SLOT_W;
const CATEGORY_SIDE_SCALE_Y = 142 / CATEGORY_SLOT_H;
/**
 * Copies of the category list — scroll silently re-centers into the middle
 * block (infinite loop). Repositioning can't happen mid-fling (scrollTo kills
 * the momentum), so there must be enough runway for the hardest fling to
 * decay naturally before reaching a physical edge.
 */
const LOOP_COPIES = 7;
/** Light hysteresis during fling (drag uses none for live tracking). */
const CENTER_SWITCH_HYSTERESIS_RATIO = 0.12;
/** Near stop, freeze lit card until momentum ends. */
const MOMENTUM_COAST_FREEZE_VELOCITY = 0.35;
/** Skip end snap when already this close (avoids scrollTo feedback loops). */
const SNAP_POSITION_EPSILON = 3;
/** Reposition only when this close to a physical scroll edge. */
const LOOP_EDGE_BUFFER_ITEMS = 1.5;

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

function nativeCarouselItemCenterX(index, itemWidth) {
  return (index + 0.5) * itemWidth;
}

function closestIndexWithHysteresis(
  scrollPosition,
  itemWidth,
  viewportWidth,
  totalItems,
  currentCenterIndex,
  itemCenterX,
) {
  const viewportCenter = scrollPosition + viewportWidth / 2;
  let closestIndex = 0;
  let closestDistance = Infinity;

  for (let index = 0; index < totalItems; index++) {
    const distance = Math.abs(viewportCenter - itemCenterX(index, itemWidth));
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  }

  if (
    currentCenterIndex == null ||
    currentCenterIndex < 0 ||
    currentCenterIndex >= totalItems ||
    closestIndex === currentCenterIndex
  ) {
    return closestIndex;
  }

  const currentDistance = Math.abs(
    viewportCenter - itemCenterX(currentCenterIndex, itemWidth),
  );
  const hysteresis = itemWidth * CENTER_SWITCH_HYSTERESIS_RATIO;
  if (closestDistance + hysteresis < currentDistance) {
    return closestIndex;
  }
  return currentCenterIndex;
}

function nativeClosestIndexWithHysteresis(
  scrollPosition,
  itemWidth,
  viewportWidth,
  totalItems,
  currentCenterIndex,
) {
  return closestIndexWithHysteresis(
    scrollPosition,
    itemWidth,
    viewportWidth,
    totalItems,
    currentCenterIndex,
    nativeCarouselItemCenterX,
  );
}

function webClosestIndexWithHysteresis(
  scrollPosition,
  itemWidth,
  contentWidth,
  viewportWidth,
  totalItems,
  currentCenterIndex,
) {
  return closestIndexWithHysteresis(
    scrollPosition,
    itemWidth,
    viewportWidth,
    totalItems,
    currentCenterIndex,
    (index, width) => webCarouselItemCenterX(index, width, contentWidth),
  );
}

function nativeCarouselSnapScrollX(virtualCenterIndex, itemWidth) {
  return Math.max(0, (virtualCenterIndex - 1) * itemWidth);
}

/** Index of the first item in the middle copy of the extended list. */
function middleCopyStart(listLength) {
  return Math.floor(LOOP_COPIES / 2) * listLength;
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
  const target = middleCopyStart(n) + positiveMod(virtualIndex, n);
  return {
    virtualIndex: target,
    scrollX: scrollX + (target - virtualIndex) * itemWidth,
  };
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

const Carusel = ({
  categoriesList = userCategories,
  onCategorySelect,
  initialCategoryId = null,
}) => {
  const {width: screenWidth} = useWindowDimensions();
  const list =
    categoriesList && categoriesList.length > 0
      ? categoriesList
      : userCategories;
  const scrollViewRef = useRef(null);
  const hasInitialScrollDone = useRef(false);
  const lastScrollPositionRef = useRef(0);
  const androidScrollNextEmitRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const isSnappingRef = useRef(false);
  const previousScrollXRef = useRef(0);
  const lastScrollSampleRef = useRef({x: 0, t: 0});
  const virtualCenterIndexRef = useRef(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const listLength = list.length;
  const infiniteLoop = listLength > 1;
  const initialLogicalIndex = useMemo(() => {
    if (initialCategoryId != null && String(initialCategoryId).trim() !== '') {
      const target = Number(initialCategoryId);
      const idx = list.findIndex(c => Number(c.id) === target);
      if (idx >= 0) return idx;
    }
    return Math.min(2, Math.max(0, listLength - 1));
  }, [list, listLength, initialCategoryId]);
  const initialVirtualIndex = infiniteLoop
    ? middleCopyStart(listLength) + initialLogicalIndex
    : initialLogicalIndex;
  virtualCenterIndexRef.current = initialVirtualIndex;
  const [virtualCenterIndex, setVirtualCenterIndex] =
    useState(initialVirtualIndex);
  const onCategorySelectRef = useRef(onCategorySelect);
  onCategorySelectRef.current = onCategorySelect;

  const emitCategorySelect = useCallback(id => {
    onCategorySelectRef.current?.(id);
  }, []);

  // Picker-wheel tick: plays when a new category passes center during user
  // scrolling. Silent re-centering (loop jumps) keeps the same logical
  // category, so it never ticks.
  const tickPoolRef = useRef([]);
  const tickPoolCursorRef = useRef(0);
  const lastTickAtRef = useRef(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }
    let mounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
        const pool = await Promise.all(
          Array.from({length: TICK_POOL_SIZE}, async () => {
            const {sound} = await Audio.Sound.createAsync(TICK_SOUND, {
              volume: TICK_VOLUME,
              shouldPlay: false,
            });
            return sound;
          }),
        );
        if (mounted) {
          tickPoolRef.current = pool;
        } else {
          await Promise.all(pool.map(s => s.unloadAsync().catch(() => {})));
        }
      } catch {
        /* tick is optional UX polish */
      }
    })();
    return () => {
      mounted = false;
      const pool = tickPoolRef.current;
      tickPoolRef.current = [];
      Promise.all(pool.map(s => s.unloadAsync().catch(() => {}))).catch(
        () => {},
      );
    };
  }, []);

  const playTick = useCallback(() => {
    const now = Date.now();
    if (now - lastTickAtRef.current < TICK_MIN_GAP_MS) {
      return;
    }
    lastTickAtRef.current = now;
    const pool = tickPoolRef.current;
    if (!pool.length) {
      return;
    }
    const sound = pool[tickPoolCursorRef.current % pool.length];
    tickPoolCursorRef.current += 1;
    (async () => {
      try {
        const status = await sound.getStatusAsync();
        if (!status.isLoaded) {
          return;
        }
        if (status.isPlaying) {
          await sound.stopAsync();
        }
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch {
        /* ignore overlapping tick races */
      }
    })();
  }, []);

  /** Tick only when the logical (mod listLength) category actually changes. */
  const tickIfLogicalChange = useCallback(
    (prevVirtualIndex, nextVirtualIndex) => {
      if (
        listLength > 1 &&
        positiveMod(nextVirtualIndex, listLength) !==
          positiveMod(prevVirtualIndex, listLength)
      ) {
        playTick();
      }
    },
    [listLength, playTick],
  );

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
    isProgrammaticScrollRef.current = true;
    scrollViewRef.current.scrollTo({x: scrollX, animated});
    lastScrollPositionRef.current = scrollX;
    previousScrollXRef.current = scrollX;
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
    });
  }, []);

  const runSnapToCenter = useCallback(
    scrollPosition => {
      if (viewportWidth <= 0 || totalItems === 0 || isSnappingRef.current) {
        return;
      }
      isSnappingRef.current = true;

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

      tickIfLogicalChange(
        virtualCenterIndexRef.current,
        normalized.virtualIndex,
      );
      virtualCenterIndexRef.current = normalized.virtualIndex;
      setVirtualCenterIndex(normalized.virtualIndex);

      const targetScrollX = normalized.scrollX;
      if (
        scrollViewRef.current &&
        Math.abs(scrollPosition - targetScrollX) > SNAP_POSITION_EPSILON
      ) {
        jumpToScrollX(targetScrollX, false);
      }

      requestAnimationFrame(() => {
        isSnappingRef.current = false;
      });
    },
    [
      viewportWidth,
      itemWidth,
      contentWidth,
      totalItems,
      listLength,
      infiniteLoop,
      jumpToScrollX,
      tickIfLogicalChange,
    ],
  );

  const applyVirtualCenter = useCallback(
    nextIndex => {
      const prevIndex = virtualCenterIndexRef.current;
      if (nextIndex === prevIndex) {
        return;
      }
      virtualCenterIndexRef.current = nextIndex;
      setVirtualCenterIndex(nextIndex);
      tickIfLogicalChange(prevIndex, nextIndex);
    },
    [tickIfLogicalChange],
  );

  const closestVirtualIndexForScroll = useCallback(
    (scrollPosition, useHysteresis = true) => {
      const currentCenter = virtualCenterIndexRef.current;
      if (Platform.OS === 'web') {
        if (!useHysteresis) {
          return webCarouselClosestIndex(
            scrollPosition,
            itemWidth,
            contentWidth,
            viewportWidth,
            totalItems,
          );
        }
        return webClosestIndexWithHysteresis(
          scrollPosition,
          itemWidth,
          contentWidth,
          viewportWidth,
          totalItems,
          currentCenter,
        );
      }
      if (!useHysteresis) {
        return nativeCarouselClosestIndex(
          scrollPosition,
          itemWidth,
          viewportWidth,
          totalItems,
        );
      }
      return nativeClosestIndexWithHysteresis(
        scrollPosition,
        itemWidth,
        viewportWidth,
        totalItems,
        currentCenter,
      );
    },
    [viewportWidth, itemWidth, contentWidth, totalItems],
  );

  const scrollVelocityPxPerMs = useCallback(scrollPosition => {
    const now =
      typeof globalThis.performance !== 'undefined' &&
      typeof globalThis.performance.now === 'function'
        ? globalThis.performance.now()
        : Date.now();
    const prev = lastScrollSampleRef.current;
    const elapsed = now - prev.t;
    if (elapsed <= 0) {
      return 0;
    }
    return Math.abs(scrollPosition - prev.x) / elapsed;
  }, []);

  const repositionInfiniteLoopIfNeeded = useCallback(
    scrollPosition => {
      if (!infiniteLoop || listLength <= 1 || !scrollViewRef.current) {
        return false;
      }

      const maxScroll = Math.max(0, contentWidth - viewportWidth);
      const edgeBuffer = itemWidth * LOOP_EDGE_BUFFER_ITEMS;
      const atPhysicalEdge =
        scrollPosition <= edgeBuffer ||
        scrollPosition >= maxScroll - edgeBuffer;
      if (!atPhysicalEdge) {
        return false;
      }

      const closestVirtualIndex = nativeCarouselClosestIndex(
        scrollPosition,
        itemWidth,
        viewportWidth,
        totalItems,
      );
      const logicalIndex = positiveMod(closestVirtualIndex, listLength);
      const middleVirtualIndex = middleCopyStart(listLength) + logicalIndex;
      const nextScrollX = nativeCarouselSnapScrollX(
        middleVirtualIndex,
        itemWidth,
      );

      if (Math.abs(nextScrollX - scrollPosition) <= SNAP_POSITION_EPSILON) {
        return false;
      }

      isProgrammaticScrollRef.current = true;
      scrollViewRef.current.scrollTo({x: nextScrollX, animated: false});
      lastScrollPositionRef.current = nextScrollX;
      previousScrollXRef.current = nextScrollX;
      virtualCenterIndexRef.current = middleVirtualIndex;
      setVirtualCenterIndex(middleVirtualIndex);
      requestAnimationFrame(() => {
        isProgrammaticScrollRef.current = false;
      });
      return true;
    },
    [
      infiniteLoop,
      listLength,
      itemWidth,
      contentWidth,
      viewportWidth,
      totalItems,
    ],
  );

  const updateLitCenterDuringScroll = useCallback(
    (scrollPosition, velocity) => {
      if (isDraggingRef.current) {
        applyVirtualCenter(
          closestVirtualIndexForScroll(scrollPosition, false),
        );
        return;
      }

      if (velocity < MOMENTUM_COAST_FREEZE_VELOCITY) {
        return;
      }

      applyVirtualCenter(
        closestVirtualIndexForScroll(scrollPosition, true),
      );
    },
    [applyVirtualCenter, closestVirtualIndexForScroll],
  );

  const handleScroll = useCallback(
    event => {
      const scrollPosition = event.nativeEvent.contentOffset.x;
      const velocity = scrollVelocityPxPerMs(scrollPosition);
      const now =
        typeof globalThis.performance !== 'undefined' &&
        typeof globalThis.performance.now === 'function'
          ? globalThis.performance.now()
          : Date.now();
      previousScrollXRef.current = scrollPosition;
      lastScrollSampleRef.current = {x: scrollPosition, t: now};
      lastScrollPositionRef.current = scrollPosition;

      if (
        isProgrammaticScrollRef.current ||
        isSnappingRef.current
      ) {
        return;
      }

      updateLitCenterDuringScroll(scrollPosition, velocity);

      if (!isDraggingRef.current) {
        return;
      }

      if (Platform.OS === 'android') {
        if (now < androidScrollNextEmitRef.current) {
          return;
        }
        androidScrollNextEmitRef.current = now + 48;
      }

      repositionInfiniteLoopIfNeeded(scrollPosition);
    },
    [
      updateLitCenterDuringScroll,
      repositionInfiniteLoopIfNeeded,
      scrollVelocityPxPerMs,
    ],
  );

  const handleScrollBeginDrag = useCallback(() => {
    isDraggingRef.current = true;
    androidScrollNextEmitRef.current = 0;
    previousScrollXRef.current = lastScrollPositionRef.current;
    lastScrollSampleRef.current = {x: lastScrollPositionRef.current, t: 0};
  }, []);

  const handleScrollEndDrag = () => {
    isDraggingRef.current = false;
    if (Platform.OS === 'web') {
      runSnapToCenter(lastScrollPositionRef.current);
    }
  };

  const handleMomentumScrollEnd = event => {
    if (isProgrammaticScrollRef.current || isSnappingRef.current) {
      return;
    }
    isDraggingRef.current = false;
    let scrollPosition = event.nativeEvent.contentOffset.x;
    if (repositionInfiniteLoopIfNeeded(scrollPosition)) {
      scrollPosition = lastScrollPositionRef.current;
    }
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
      tickIfLogicalChange(virtualCenterIndexRef.current, clamped);
      virtualCenterIndexRef.current = clamped;
      setVirtualCenterIndex(clamped);
      jumpToScrollX(scrollX, animated);
    },
    [
      viewportWidth,
      itemWidth,
      contentWidth,
      totalItems,
      jumpToScrollX,
      tickIfLogicalChange,
    ],
  );

  const scrollToIndex = useCallback(
    (logicalIndex, animated = true) => {
      if (!infiniteLoop) {
        scrollToVirtualIndex(logicalIndex, animated);
        return;
      }
      const clamped = Math.max(0, Math.min(logicalIndex, listLength - 1));
      scrollToVirtualIndex(middleCopyStart(listLength) + clamped, animated);
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
      virtualCenterIndexRef.current = initialVirtualIndex;
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
    virtualCenterIndexRef.current = initialVirtualIndex;
    setVirtualCenterIndex(initialVirtualIndex);
  }, [categoryIdsKey, initialVirtualIndex]);

  useEffect(() => {
    if (viewportWidth <= 0 || initialCategoryId == null) {
      return;
    }
    const target = Number(initialCategoryId);
    const idx = list.findIndex(c => Number(c.id) === target);
    if (idx < 0) return;
    scrollToIndex(idx, false);
  }, [initialCategoryId, list, viewportWidth, scrollToIndex]);

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
        decelerationRate="normal"
        bounces={false}
        pagingEnabled={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        nestedScrollEnabled
        removeClippedSubviews={false}
        {...(Platform.OS === 'web' ? {style: styles.webCarouselScroll} : {})}
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
