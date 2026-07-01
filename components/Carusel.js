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
import {
  userCategories,
  DEFAULT_HOME_CAROUSEL_CATEGORY_ID,
} from '../utils/constant';

const TICK_MIN_GAP_MS = 10;
/** Short pulse so rapid category ticks don't queue/block on Android during fast swipes. */
const CAROUSEL_HAPTIC_PULSE_MS = 18;
const CAROUSEL_HAPTIC_BURST_GAP_MS = 10;
const CAROUSEL_HAPTIC_BURST_MAX = 5;

function logicalStepsCrossed(prevLogical, nextLogical, listLength) {
  if (prevLogical === nextLogical || listLength <= 1) return 0;
  const forward = (nextLogical - prevLogical + listLength) % listLength;
  const backward = (prevLogical - nextLogical + listLength) % listLength;
  return Math.min(forward, backward) || 1;
}

function fireCarouselHaptic(crossed = 1) {
  if (Platform.OS === 'web') return;
  const count = Math.min(Math.max(1, crossed), CAROUSEL_HAPTIC_BURST_MAX);

  if (Platform.OS === 'android') {
    Vibration.cancel();
    if (count > 1) {
      const pattern = [0];
      for (let i = 0; i < count; i += 1) {
        pattern.push(CAROUSEL_HAPTIC_PULSE_MS);
        if (i < count - 1) {
          pattern.push(CAROUSEL_HAPTIC_BURST_GAP_MS);
        }
      }
      Vibration.vibrate(pattern);
      return;
    }
  }

  Vibration.vibrate(CAROUSEL_HAPTIC_PULSE_MS);
}

const CATEGORY_SLOT_W = 174;
const CATEGORY_SLOT_H = 212;
/** Side slots stay at this scale; only the centered item renders at 1.0. */
const CATEGORY_SIDE_SCALE = 0.64;

const LOOP_COPIES = 7;
const CENTER_SWITCH_HYSTERESIS_RATIO = 0.12;
const MOMENTUM_COAST_FREEZE_VELOCITY = 0.35;
const SNAP_POSITION_EPSILON = 3;
const LOOP_EDGE_BUFFER_ITEMS = 1.5;
/** Delay before the invisible copy-rebase; must exceed the OS animated scrollTo
 *  glide so the soft landing is never cut short. */
const SNAP_SETTLE_MS = 380;

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

    // Step scale: sides fixed at CATEGORY_SIDE_SCALE, full size only at center
    // (no gradual grow/shrink while scrolling between slots).
    const scale = offset.interpolate({
      inputRange: [-iW, -0.06 * iW, 0, 0.06 * iW, iW],
      outputRange: [
        CATEGORY_SIDE_SCALE,
        CATEGORY_SIDE_SCALE,
        1,
        CATEGORY_SIDE_SCALE,
        CATEGORY_SIDE_SCALE,
      ],
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
      wrapperStyle: {transform: [{scale}], opacity: overallOpacity},
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
  const snapSettleTimerRef = useRef(null);
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
    const defaultIdx = list.findIndex(
      c => Number(c.id) === DEFAULT_HOME_CAROUSEL_CATEGORY_ID,
    );
    if (defaultIdx >= 0) return defaultIdx;
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

  const tickIfLogicalChange = useCallback(
    (prevVirtualIndex, nextVirtualIndex) => {
      if (listLength <= 1) {
        return;
      }
      const prevLogical = positiveMod(prevVirtualIndex, listLength);
      const nextLogical = positiveMod(nextVirtualIndex, listLength);
      const crossed = logicalStepsCrossed(prevLogical, nextLogical, listLength);
      if (crossed === 0) {
        return;
      }

      const now = Date.now();
      if (now - lastTickAtRef.current < TICK_MIN_GAP_MS) {
        return;
      }
      lastTickAtRef.current = now;
      fireCarouselHaptic(crossed);
    },
    [listLength],
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

      // Web keeps the original instant normalize + jump (no drift on desktop).
      if (Platform.OS === 'web') {
        const closestWeb = webCarouselClosestIndex(
          scrollPosition,
          itemWidth,
          contentWidth,
          viewportWidth,
          totalItems,
        );
        const snapWeb = webCarouselSnapScrollX(
          closestWeb,
          itemWidth,
          contentWidth,
          viewportWidth,
        );
        const normalizedWeb = infiniteLoop
          ? normalizeInfiniteCarouselPosition(
              closestWeb,
              snapWeb,
              listLength,
              itemWidth,
            )
          : {virtualIndex: closestWeb, scrollX: snapWeb};
        tickIfLogicalChange(
          virtualCenterIndexRef.current,
          normalizedWeb.virtualIndex,
        );
        virtualCenterIndexRef.current = normalizedWeb.virtualIndex;
        setVirtualCenterIndex(normalizedWeb.virtualIndex);
        if (
          scrollViewRef.current &&
          Math.abs(scrollPosition - normalizedWeb.scrollX) >
            SNAP_POSITION_EPSILON
        ) {
          jumpToScrollX(normalizedWeb.scrollX, false);
        }
        requestAnimationFrame(() => {
          isSnappingRef.current = false;
        });
        return;
      }

      // Native: gentle "roulette" landing. The OS momentum has already coasted
      // and slowed; here we only ease the last fraction of a slot so it settles
      // softly onto center instead of snapping in one tick.
      const closestVirtualIndex = nativeCarouselClosestIndex(
        scrollPosition,
        itemWidth,
        viewportWidth,
        totalItems,
      );
      const snapScrollX = nativeCarouselSnapScrollX(
        closestVirtualIndex,
        itemWidth,
      );

      // Light up / haptic-tick the category we're landing on (current copy) so
      // the on-screen centered item is the one that reads as selected.
      tickIfLogicalChange(virtualCenterIndexRef.current, closestVirtualIndex);
      virtualCenterIndexRef.current = closestVirtualIndex;
      setVirtualCenterIndex(closestVirtualIndex);

      const needsSettle =
        Math.abs(scrollPosition - snapScrollX) > SNAP_POSITION_EPSILON;

      if (needsSettle && scrollViewRef.current) {
        // Animated glide → scrollAnim follows on the native thread, so scale +
        // crossfade ease in together for a soft stop.
        scrollViewRef.current.scrollTo({x: snapScrollX, animated: true});
      }
      lastScrollPositionRef.current = snapScrollX;
      previousScrollXRef.current = snapScrollX;

      // After the soft landing, silently rebase to the middle copy so the
      // infinite loop always has runway. Invisible: same logical item, same
      // on-screen position.
      if (snapSettleTimerRef.current) {
        clearTimeout(snapSettleTimerRef.current);
      }
      snapSettleTimerRef.current = setTimeout(
        () => {
          snapSettleTimerRef.current = null;
          if (infiniteLoop && listLength > 1 && scrollViewRef.current) {
            const logical = positiveMod(closestVirtualIndex, listLength);
            const middleVirtual = middleCopyStart(listLength) + logical;
            const rebaseX = nativeCarouselSnapScrollX(middleVirtual, itemWidth);
            if (
              Math.abs(rebaseX - lastScrollPositionRef.current) >
              SNAP_POSITION_EPSILON
            ) {
              isProgrammaticScrollRef.current = true;
              scrollViewRef.current.scrollTo({x: rebaseX, animated: false});
              scrollAnimRef.current.setValue(rebaseX);
              lastScrollPositionRef.current = rebaseX;
              previousScrollXRef.current = rebaseX;
              virtualCenterIndexRef.current = middleVirtual;
              setVirtualCenterIndex(middleVirtual);
              requestAnimationFrame(() => {
                isProgrammaticScrollRef.current = false;
              });
            }
          }
          isSnappingRef.current = false;
        },
        (needsSettle ? SNAP_SETTLE_MS : 0) + 24,
      );
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
    (scrollPosition, velocity) => {
      if (isDraggingRef.current) {
        applyVirtualCenter(closestVirtualIndexForScroll(scrollPosition, false));
        return;
      }
      if (velocity < MOMENTUM_COAST_FREEZE_VELOCITY) {
        return;
      }
      applyVirtualCenter(closestVirtualIndexForScroll(scrollPosition, true));
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

      if (isProgrammaticScrollRef.current || isSnappingRef.current) {
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
    // Re-grabbing mid-settle: cancel the pending soft-landing/rebase so the new
    // gesture takes over immediately (feels like grabbing a spinning wheel).
    if (snapSettleTimerRef.current) {
      clearTimeout(snapSettleTimerRef.current);
      snapSettleTimerRef.current = null;
    }
    isSnappingRef.current = false;
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

  useEffect(
    () => () => {
      if (snapSettleTimerRef.current) {
        clearTimeout(snapSettleTimerRef.current);
        snapSettleTimerRef.current = null;
      }
    },
    [],
  );

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
        decelerationRate={Platform.OS === 'ios' ? 0.994 : 0.99}
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
