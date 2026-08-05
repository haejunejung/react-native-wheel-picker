import React, { useCallback, useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import Animated, {
  clamp,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

import {
  DEFAULT_ENABLE_ITEM_PRESS,
  DEFAULT_OPTION_ITEM_HEIGHT,
  DEFAULT_VISIBLE_COUNT,
  MAX_TICK_LATENCY_MS,
  MIN_TICK_INTERVAL_MS,
  SCROLL_ANIMATION_DURATION,
  SCROLL_OFFSET_THRESHOLD,
} from "./constants";
import type { WheelPickerOption, WheelPickerStyles, WheelPickerValue } from "./types";
import { useControllableState, type UseControllableStateProps } from "./useControllableState";
import { usePreservedCallback } from "./usePreservedCallback";
import { useWheelPointerDrag } from "./useWheelPointerDrag";
import { noop } from "./utils";
import { WheelPickerItem } from "./WheelPickerItem";

export type WheelPickerProps<T extends WheelPickerValue = string> = UseControllableStateProps<
  NoInfer<T>
> & {
  /**
   * The options to be displayed in the wheel picker.
   */
  options: ReadonlyArray<WheelPickerOption<T>>;
  /**
   * The height of each option item in the wheel picker.
   * @default 40
   */
  optionItemHeight?: number;
  /**
   * The function to extract a unique key for each option item.
   * If not provided, the index of the option will be used as the key.
   */
  optionKeyExtractor?: (option: WheelPickerOption<T>, index: number) => string;
  /**
   * The number of visible options in the wheel picker. Must be an odd number.
   * @default 5
   */
  visibleCount?: number;
  /**
   * Boolean flag to enable or disable the press interaction on the option items.
   * When enabled, pressing an option item will select it and trigger the onChange callback.
   * @default true
   */
  enableItemPress?: boolean;
  /**
   * The styles to be applied to the wheel picker components.
   */
  styles?: WheelPickerStyles;
  /**
   * Callback function that is called when the value is changing (while scrolling).
   */
  onChanging?: (value: NoInfer<T>) => void;
};

export const WheelPicker = <T extends WheelPickerValue = string>(props: WheelPickerProps<T>) => {
  const {
    options,
    optionItemHeight = DEFAULT_OPTION_ITEM_HEIGHT,
    optionKeyExtractor = (_, index) => index.toString(),
    visibleCount = DEFAULT_VISIBLE_COUNT,
    value,
    defaultValue,
    onChange: onChangeProp = noop,
    onChanging: onChangingProp = noop,
    styles,
    enableItemPress = DEFAULT_ENABLE_ITEM_PRESS,
  } = props;

  const onChange = usePreservedCallback(onChangeProp);
  const onChanging = usePreservedCallback(onChangingProp);

  const [controllableState, setControllableState] = useControllableState<T>({
    value,
    defaultValue,
    onChange,
  });

  const containerHeight = visibleCount * optionItemHeight;
  const paddingVertical = (containerHeight - optionItemHeight) / 2;
  const radius = containerHeight / 2;
  const selectedIndex = React.useMemo(() => {
    return Math.max(
      options.findIndex((option) => option.value === controllableState),
      0,
    );
  }, [controllableState, options]);
  const initialOffsetY = selectedIndex * optionItemHeight;

  // Places the wheel before the first paint, so it never shows row 0 and jumps.
  // Frozen at mount on purpose, initialOffsetY is recomputed every render,
  // but we don't want to reset the scroll position if the selectedIndex changes after mount.
  // so we only use the initial value of initialOffsetY and never update it again.
  const [initialContentOffset] = React.useState({ x: 0, y: initialOffsetY });

  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();

  const offsetY = useSharedValue(initialContentOffset.y);
  const lastTickAt = useSharedValue<number>(0);

  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Index the wheel last reported through onChange.
  // Two jobs: it stops duplicate emissions, and it lets the sync effect below tell
  // "the parent applied our change" apart from "the parent rejected it / changed value on its own".
  const lastCommittedIndexRef = useRef<number>(selectedIndex);
  const lastSeenOffsetRef = useRef<number>(initialContentOffset.y);
  const didInitializeScrollRef = useRef<boolean>(false);
  const isTouchingRef = useRef<boolean>(false);
  const pendingSyncRef = useRef<boolean>(false);

  const scrollToIndex = useCallback(
    (index: number, animated: boolean = false) => {
      scrollViewRef.current?.scrollTo({ y: index * optionItemHeight, animated });
    },
    [optionItemHeight, scrollViewRef],
  );

  const cancelSettle = useCallback(() => {
    if (!settleTimerRef.current) return;

    clearTimeout(settleTimerRef.current);
    settleTimerRef.current = null;
  }, []);

  const settle = useCallback(
    (offset: number) => {
      cancelSettle();

      const nextIndex = clamp(Math.round(offset / optionItemHeight), 0, options.length - 1);
      const targetOffset = nextIndex * optionItemHeight;
      const option = options.at(nextIndex);

      if (Math.abs(offset - targetOffset) > SCROLL_OFFSET_THRESHOLD) scrollToIndex(nextIndex, true);
      if (nextIndex === lastCommittedIndexRef.current) return;
      if (!option) return;

      lastCommittedIndexRef.current = nextIndex;
      setControllableState(option.value);
    },
    [cancelSettle, optionItemHeight, options, scrollToIndex, setControllableState],
  );

  const scheduleSettle = useCallback(() => {
    cancelSettle();
    lastSeenOffsetRef.current = offsetY.value;

    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      const currentOffset = offsetY.value;

      if (Math.abs(currentOffset - lastSeenOffsetRef.current) > SCROLL_OFFSET_THRESHOLD) {
        scheduleSettle();
        return;
      }

      settle(currentOffset);
    }, SCROLL_ANIMATION_DURATION);
  }, [cancelSettle, offsetY, settle]);

  const syncScroll = useCallback(
    (index: number) => {
      if (index < 0) return;
      if (index === lastCommittedIndexRef.current) return;

      if (isTouchingRef.current) {
        pendingSyncRef.current = true;
        return;
      }
      pendingSyncRef.current = false;
      lastCommittedIndexRef.current = index;
      scrollToIndex(index, true);

      // A programmatic animated scroll leaves no drag or momentum trail to end it — on Android
      // it can emit offset updates and no callbacks at all. Arming the timer once is enough:
      // `scheduleSettle` re-checks the offset and re-arms itself until the wheel stops.
      scheduleSettle();
    },
    [scrollToIndex, scheduleSettle],
  );

  const emitChanging = useCallback(
    (index: number, emittedAt: number) => {
      const option = options.at(index);

      if (Date.now() - emittedAt > MAX_TICK_LATENCY_MS) return;
      if (!option) return;

      onChanging?.(option.value);
    },
    [onChanging, options],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      offsetY.value = event.contentOffset.y;

      // On web onScroll is the only scroll callback there is,
      // so it has to call scheduleSettle on every scroll event, and not just onEndDrag or onMomentumEnd.
      if (Platform.OS === "web") runOnJS(scheduleSettle)();
    },
  });

  const handleTouchStart = useCallback(() => {
    isTouchingRef.current = true;
  }, []);

  const handleTouchEnd = useCallback(() => {
    isTouchingRef.current = false;
    if (!pendingSyncRef.current) return;
    pendingSyncRef.current = false;

    syncScroll(selectedIndex);
  }, [selectedIndex, syncScroll]);

  const handleTouchCancel = useCallback(() => {
    isTouchingRef.current = false;
    if (!pendingSyncRef.current) return;
    pendingSyncRef.current = false;

    syncScroll(selectedIndex);
  }, [selectedIndex, syncScroll]);

  // Mouse drag + momentum scrolling for web. Inert on native: pointer events do not fire
  // there, and the ScrollView handles drag and momentum itself.
  const { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave } =
    useWheelPointerDrag({
      scrollViewRef,
      offsetY,
      optionItemHeight,
      optionCount: options.length,
      cancelSettle,
      scheduleSettle,
      pendingSyncRef,
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
    });

  const handleScrollStartDrag = useCallback(() => {
    cancelSettle();
  }, [cancelSettle]);

  const handleScrollEndDrag = useCallback(() => {
    scheduleSettle();
  }, [scheduleSettle]);

  const handleMomentumScrollBegin = useCallback(() => {
    cancelSettle();
  }, [cancelSettle]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      settle(event.nativeEvent.contentOffset.y);
    },
    [settle],
  );

  // Fallback for the initial placement, covering the platforms the contentOffset prop misses:
  // - web: react-native-web has never implemented the prop, it is silently dropped.
  //   (open since 2019: https://github.com/necolas/react-native-web/issues/1273)
  // - iOS: a known mount race can leave the list blank or at the wrong offset until touched.
  //   (closed as stale, not fixed: https://github.com/facebook/react-native/issues/33221)
  // onContentSizeChange is the earliest moment scrollTo works at all — before the content is
  // measured the max scroll distance is 0, so an earlier scrollTo silently clamps to 0.
  // Guarded to run once: the callback re-fires whenever the content resizes (e.g. options
  // change), and re-running would teleport the wheel back to its initial position.
  // Where contentOffset already landed, scrolling to the same position is a harmless no-op.
  const handleContentSizeChange = useCallback(() => {
    if (didInitializeScrollRef.current) return;
    if (options.length === 0) return;
    didInitializeScrollRef.current = true;
    scrollToIndex(selectedIndex, false);
  }, [scrollToIndex, selectedIndex, options.length]);

  const handleItemPress = useCallback(
    (index: number) => {
      scrollToIndex(index, true);

      // A programmatic scroll fires neither drag nor momentum events,
      // so the selection ahs to be settled manually
      scheduleSettle();
    },
    [scrollToIndex, scheduleSettle],
  );

  // Reports every row that passes through the center while the wheel is still moving.
  // Where onChange is the committed selection, this is the row being brushed past, so it
  // is meant for haptics or sound rather than state. Detection runs on the UI thread, which
  // keeps it exact no matter how busy the JS thread is.
  useAnimatedReaction(
    () => {
      return clamp(Math.round(offsetY.value / optionItemHeight), 0, options.length - 1);
    },
    (current, previous) => {
      const now = Date.now();

      if (previous === null || current === previous) return;
      if (now - lastTickAt.value < MIN_TICK_INTERVAL_MS) return;
      lastTickAt.value = now;

      runOnJS(emitChanging)(current, now);
    },
    [optionItemHeight, options.length, emitChanging],
  );

  // Keeps the wheel honest about value. The effect fires on every selectedIndex
  // change — React cannot tell "the wheel moved and value followed" apart from "value
  // moved and the wheel must follow", so syncScroll runs unconditionally and its
  // committed-index guard filters out the echo of our own onChange for free.
  useEffect(() => {
    syncScroll(selectedIndex);
  }, [selectedIndex, syncScroll]);

  useEffect(() => cancelSettle, [cancelSettle]);

  return (
    <View
      {...(Platform.OS === "web"
        ? {
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            onPointerLeave: handlePointerLeave,
          }
        : undefined)}
      style={[{ height: containerHeight }, styles?.root]}>
      {styles?.highlightedArea && (
        <View
          pointerEvents="none"
          style={[
            defaultStyles.highlightedArea,
            { height: optionItemHeight, top: paddingVertical },
            styles?.highlightedArea,
          ]}
        />
      )}
      <Animated.ScrollView
        ref={scrollViewRef}
        contentOffset={initialContentOffset}
        onContentSizeChange={handleContentSizeChange}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onScrollBeginDrag={handleScrollStartDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollBegin={handleMomentumScrollBegin}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        snapToInterval={optionItemHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={[{ paddingVertical }, styles?.contentContainer]}>
        {options.map((option, index) => (
          <WheelPickerItem
            key={optionKeyExtractor(option, index)}
            index={index}
            option={option}
            optionItemHeight={optionItemHeight}
            offsetY={offsetY}
            radius={radius}
            styles={styles}
            onPress={handleItemPress}
            enableItemPress={enableItemPress}
            isSelected={index === selectedIndex}
          />
        ))}
      </Animated.ScrollView>
      {styles?.scrim && (
        <View
          pointerEvents="none"
          style={[defaultStyles.scrimTop, { height: paddingVertical }, styles?.scrim]}
        />
      )}
      {styles?.scrim && (
        <View
          pointerEvents="none"
          style={[defaultStyles.scrimBottom, { height: paddingVertical }, styles?.scrim]}
        />
      )}
    </View>
  );
};

const defaultStyles = StyleSheet.create({
  highlightedArea: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  scrimTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1,
  },
  scrimBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
});
