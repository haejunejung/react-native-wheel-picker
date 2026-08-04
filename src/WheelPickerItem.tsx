import { memo, useCallback } from "react";
import { Pressable, Text } from "react-native";
import type { TextStyle } from "react-native";

import type { SharedValue } from "react-native-reanimated";
import Animated, { clamp, useAnimatedStyle } from "react-native-reanimated";

import { DEFAULT_PERSPECTIVE } from "./constants";
import type { WheelPickerOption, WheelPickerStyles, WheelPickerValue } from "./types";

export type WheelPickerItemProps<T extends WheelPickerValue = string> = {
  index: number;
  option: WheelPickerOption<T>;
  optionItemHeight: number;
  offsetY: SharedValue<number>;
  radius: number;
  styles?: WheelPickerStyles;
  isSelected: boolean;
  enableItemPress: boolean;
  onPress: (index: number) => void;
};

const radToDeg = (rad: number) => {
  "worklet";
  return (rad * 180) / Math.PI;
};

const WheelPickerItem_ = <T extends WheelPickerValue = string>(props: WheelPickerItemProps<T>) => {
  const {
    index,
    option,
    optionItemHeight,
    offsetY,
    radius,
    styles,
    enableItemPress,
    isSelected,
    onPress,
  } = props;

  const animatedStyle = useAnimatedStyle(() => {
    const relativeY = index * optionItemHeight - offsetY.value;
    const theta = relativeY / radius;
    const clampedTheta = clamp(theta, -Math.PI / 2, Math.PI / 2);

    return {
      transform: [
        { perspective: DEFAULT_PERSPECTIVE },
        { translateY: radius * Math.sin(clampedTheta) - relativeY },
        { rotateX: `${-radToDeg(clampedTheta)}deg` },
      ],
      opacity: Math.cos(clampedTheta),
    };
  });

  const handlePress = useCallback(() => {
    if (!enableItemPress) return;
    onPress?.(index);
  }, [enableItemPress, index, onPress]);

  return (
    <Animated.View style={[{ height: optionItemHeight }, styles?.itemContainer, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        disabled={!enableItemPress}
        onPress={handlePress}>
        <Text style={[noSelectStyle, styles?.itemText]}>{option.label}</Text>
      </Pressable>
    </Animated.View>
  );
};

const noSelectStyle: TextStyle = { userSelect: "none" };

WheelPickerItem_.displayName = "WheelPickerItem";

export const WheelPickerItem = memo(WheelPickerItem_) as typeof WheelPickerItem_;
