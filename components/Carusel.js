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
  Animated,
  Vibration,
} from 'react-native';
import {userCategories} from '../utils/constant';

/** Min gap between consecutive tick pulses (ms). */
const TICK_MIN_GAP_MS = 36;
/** Stagger between multi-step ticks when scroll jumps over several categories. */
const TICK_STEP_STAGGER_MS = 40;
/**
 * One-shot pulse length (ms). Short pulses (<30ms) are often intangible
 * on budget Android motors (Samsung A0x).
 */
const TICK_VIBRATE_MS = 55;
/** Cap ticks from a single jump so a loop teleport never buzzes forever. */
const TICK_MAX_STEPS = 8;

const CATEGORY_SLOT_W = 174;
const CATEGORY_SLOT_H = 212;
const CATEGORY_SIDE_SCALE_X = 0.64;
const CATEGORY_SIDE_SCALE_Y = 142 / CATEGORY_SLOT_H;

const LOOP_COPIES = 7;
const CENTER_SWITCH_HYSTERESIS_RATIO = 0.12;
const SNAP_POSITION_EPSILON = 3;
const LOOP_EDGE_BUFFER_ITEMS = 1.5;

function positiveMod(value, modulus) {
  if (modulus <= 0) return 0;
  return ((value % modulus) + modulus) % modulus;
}

function webCarouselItemCenterX(index, itemWidth, contentWidth) {
  return contentWidth - (index + 0.5) * itemWidth;
}

function webCarouselSnapScrollX(
  centerIndex,
  itemWidth,
  contentWidth,
  viewportWidth,
) {
  const itemCenter = webCarouselItemCenterX(
    centerIndex,
    itemWidth,
    contentWidth,
  );
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

function middleCopyStart(listLength) {
  return Math.floor(LOOP_COPIES / 2) * listLength;
}

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
      out.push({...item, _carouselKey: `${copy}-${item.id}-${i}`});
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
  scrollAnim,
  viewportWidth,
}) {
  const isCenter = virtualIndex === virtualCenterIndex;

  // All animation — including which image is visible — is driven by scrollAnim
  // on the native thread. No JS state is used for image selection, so there is
  // no flash when an item crosses the center point mid-scroll.
  const {wrapperStyle, centerOpacity, leftOpacity, rightOpacity} = useMemo(() => {
    const itemCenter = (virtualIndex + 0.5) * itemWidth;
    const staticOffset = itemCenter - viewportWidth / 2;
    // offset > 0: item is to the right of viewport center; < 0: to the left
    const offset = Animated.subtract(staticOffset, scrollAnim);
    const iW = itemWidth;
    const scale = offset.interpolate({
      inputRange: [-2 * iW, -iW, 0, iW, 2 * iW],
      outputRange: [CATEGORY_SIDE_SCALE_X, CATEGORY_SIDE_SCALE_X, 1, CATEGORY_SIDE_SCALE_X, CATEGORY_SIDE_SCALE_X],
      extrapolate: 'clamp',
    });

    const translateY = offset.interpolate({
      inputRange: [-iW, 0, iW],
      outputRange: [0, -2, 0],
      extrapolate: 'clamp',
    });

    const overallOpacity = offset.interpolate({
      inputRange: [-2 * iW, -1.5 * iW, -iW, 0, iW, 1.5 * iW, 2 * iW],
      outputRange: [0.2, 0.2, 1, 1, 1, 0.2, 0.2],
      extrapolate: 'clamp',
    });

    // Image crossfade — driven entirely on the native thread.
    // Center image becomes fully opaque at ±0.5*iW (slot boundary) so even
    // during fast flings the correct image is visible before the item settles.
    // The transition spans 0.5*iW → 0.7*iW on each side to stay smooth.
    const centerOp = offset.interpolate({
      inputRange: [-0.7 * iW, -0.5 * iW, 0, 0.5 * iW, 0.7 * iW],
      outputRange: [0, 1, 1, 1, 0],
      extrapolate: 'clamp',
    });

    const leftOp = offset.interpolate({
      inputRange: [-2 * iW, -0.7 * iW, -0.5 * iW, 0],
      outputRange: [1, 1, 0, 0],
      extrapolate: 'clamp',
    });

    const rightOp = offset.interpolate({
      inputRange: [0, 0.5 * iW, 0.7 * iW, 2 * iW],
      outputRange: [0, 0, 1, 1],
      extrapolate: 'clamp',
    });

    return {
      wrapperStyle: {transform: [{scale}, {translateY}], opacity: overallOpacity},
      centerOpacity: centerOp,
      leftOpacity: leftOp,
      rightOpacity: rightOp,
    };
  }, [virtualIndex, itemWidth, viewportWidth, scrollAnim]);

  const onPress = useCallback(() => {
    if (!isCenter) {
      scrollToVirtualIndex(virtualIndex);
      return;
    }
    onCategorySelect?.(item.id);
  }, [isCenter, virtualIndex, onCategorySelect, scrollToVirtualIndex, item.id]);

  return (
    <TouchableOpacity
      style={[styles.categoryItem, {width: itemWidth}]}
      onPress={onPress}
      activeOpacity={0.7}
      delayPressIn={0}>
      <Animated.View style={[styles.imageSlot, wrapperStyle]}>
        {/* imageRight: shown when this slot is to the right of center */}
        <Animated.Image
          source={item.imageRight}
          resizeMode="contain"
          fadeDuration={0}
          style={[styles.tikImageBase, {opacity: rightOpacity}]}
        />
        {/* imageLeft: shown when this slot is to the left of center */}
        <Animated.Image
          source={item.imageLeft}
          resizeMode="contain"
          fadeDuration={0}
          style={[styles.tikImageBase, styles.imageOverlay, {opacity: leftOpacity}]}
        />
        {/* center image: fades in as this slot reaches the center position */}
        <Animated.Image
          source={item.image}
          resizeMode="contain"
          fadeDuration={0}
          style={[styles.tikImageBase, styles.imageOverlay, {opacity: centerOpacity}]}
        />
      </Animated.View>
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

  // Animated.Value that tracks scroll X — drives all per-item transforms on the native thread.
  const scrollAnimRef = useRef(null);
  if (!scrollAnimRef.current) {
    scrollAnimRef.current = new Animated.Value(0);
  }

  const emitCategorySelect = useCallback(id => {
    onCategorySelectRef.current?.(id);
  }, []);

  const lastTickAtRef = useRef(0);
  const tickTimersRef = useRef([]);

  useEffect(() => {
    return () => {
      tickTimersRef.current.forEach(id => clearTimeout(id));
      tickTimersRef.current = [];
    };
  }, []);

  const playTick = useCallback(() => {
    if (Platform.OS === 'web') return;
    const now = Date.now();
    if (now - lastTickAtRef.current < TICK_MIN_GAP_MS) {
      return;
    }
    lastTickAtRef.current = now;
    try {
      Vibration.vibrate(TICK_VIBRATE_MS);
    } catch {
      /* haptic is optional UX polish */
    }
  }, []);

  /**
   * Fire one vibration per category slot crossed (not only the landing category).
   * Uses virtual indices so fast flings that skip scroll frames still tick each pass.
   */
  const tickIfLogicalChange = useCallback(
    (prevVirtualIndex, nextVirtualIndex) => {
      if (listLength <= 1) return;
      if (nextVirtualIndex === prevVirtualIndex) return;

      const delta = nextVirtualIndex - prevVirtualIndex;
      const absDelta = Math.abs(delta);
      // Infinite-loop teleports jump by ~listLength copies — sync silently.
      if (absDelta > listLength) {
        return;
      }

      // Count how many distinct logical categories were crossed.
      let logicalSteps = 0;
      const dir = delta > 0 ? 1 : -1;
      for (let s = 1; s <= absDelta; s++) {
        const from = positiveMod(prevVirtualIndex + dir * (s - 1), listLength);
        const to = positiveMod(prevVirtualIndex + dir * s, listLength);
        if (from !== to) {
          logicalSteps += 1;
        }
      }
      if (logicalSteps <= 0) return;

      const steps = Math.min(logicalSteps, TICK_MAX_STEPS);
      tickTimersRef.current.forEach(id => clearTimeout(id));
      tickTimersRef.current = [];
      for (let i = 0; i < steps; i++) {
        if (i === 0) {
          playTick();
        } else {
          const id = setTimeout(() => {
            // Allow staggered multi-pass ticks even if gap would block them.
            lastTickAtRef.current = 0;
            playTick();
          }, i * TICK_STEP_STAGGER_MS);
          tickTimersRef.current.push(id);
        }
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
    if (animated) {
      // Animated scroll: let Animated.event drive scrollAnim naturally as the
      // ScrollView animates. Setting isProgrammatic or calling setValue here
      // would snap the native interpolation instantly, causing a visual jump.
      scrollViewRef.current.scrollTo({x: scrollX, animated: true});
      lastScrollPositionRef.current = scrollX;
      previousScrollXRef.current = scrollX;
    } else {
      // Instant jump: sync scrollAnim immediately and block re-entrant JS logic.
      isProgrammaticScrollRef.current = true;
      scrollViewRef.current.scrollTo({x: scrollX, animated: false});
      scrollAnimRef.current.setValue(scrollX);
      lastScrollPositionRef.current = scrollX;
      previousScrollXRef.current = scrollX;
      requestAnimationFrame(() => {
        isProgrammaticScrollRef.current = false;
      });
    }
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
      scrollAnimRef.current.setValue(nextScrollX);
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
    scrollPosition => {
      // Always track the nearest category with no hysteresis so every category
      // you pass while dragging or coasting gets a center update + tick.
      applyVirtualCenter(closestVirtualIndexForScroll(scrollPosition, false));
    },
    [applyVirtualCenter, closestVirtualIndexForScroll],
  );

  const handleScroll = useCallback(
    event => {
      const scrollPosition = event.nativeEvent.contentOffset.x;
      const now =
        typeof globalThis.performance !== 'undefined' &&
        typeof globalThis.performance.now === 'function'
          ? globalThis.performance.now()
          : Date.now();
      previousScrollXRef.current = scrollPosition;
      lastScrollSampleRef.current = {x: scrollPosition, t: now};
      lastScrollPositionRef.current = scrollPosition;

      if (isProgrammaticScrollRef.current || isSnappingRef.current) {
        return;
      }

      // Update center (+ tick) on every scroll frame so each category you pass fires.
      updateLitCenterDuringScroll(scrollPosition);

      if (Platform.OS === 'android') {
        if (now < androidScrollNextEmitRef.current) {
          return;
        }
        androidScrollNextEmitRef.current = now + 48;
      }

      repositionInfiniteLoopIfNeeded(scrollPosition);
    },
    [updateLitCenterDuringScroll, repositionInfiniteLoopIfNeeded],
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
      if (!animated) {
        // Instant jump: set state immediately since no scroll events will fire.
        tickIfLogicalChange(virtualCenterIndexRef.current, clamped);
        virtualCenterIndexRef.current = clamped;
        setVirtualCenterIndex(clamped);
      }
      // Animated scroll: let handleScroll/applyVirtualCenter update state
      // progressively as the animation runs — pre-setting it here causes a
      // visual jump because the scale snaps before the ScrollView arrives.
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
          if (resolved?.uri) Image.prefetch(resolved.uri);
        } catch (_) {
          /* ignore */
        }
      });
    });
  }, [categoryIdsKey]);

  // Build Animated.event handler once per relevant dependency change.
  // useNativeDriver: true keeps all transform/opacity interpolations on the native thread.
  const animatedScrollHandler = useMemo(
    () =>
      Animated.event(
        [{nativeEvent: {contentOffset: {x: scrollAnimRef.current}}}],
        {useNativeDriver: true, listener: handleScroll},
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleScroll],
  );

  return (
    <View>
      <Animated.ScrollView
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
        decelerationRate={Platform.OS === 'ios' ? 0.992 : 'normal'}
        bounces={false}
        pagingEnabled={false}
        onScroll={animatedScrollHandler}
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
            scrollAnim={scrollAnimRef.current}
            viewportWidth={viewportWidth}
          />
        ))}
      </Animated.ScrollView>
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
  imageSlot: {
    width: CATEGORY_SLOT_W,
    height: CATEGORY_SLOT_H,
  },
  tikImageBase: {
    width: CATEGORY_SLOT_W,
    height: CATEGORY_SLOT_H,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
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
