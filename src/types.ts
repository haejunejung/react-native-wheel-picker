import type { StyleProp, TextStyle, ViewStyle } from "react-native";

export type WheelPickerValue = string | number;

export type WheelPickerOption<T extends WheelPickerValue = string> = {
  value: T;
  /** Rendered by the library inside its own <Text> — style it via `styles.itemText`. */
  label: string;
};

export type WheelPickerStyles = {
  /**
   * The outer wrapper that hosts the wheel, the highlighted area, and the mask.
   */
  root?: StyleProp<ViewStyle>;
  /**
   * The ScrollView's content container. Merged after the built-in vertical padding.
   */
  contentContainer?: StyleProp<ViewStyle>;
  /**
   * The highlighted area that indicates the currently selected option.
   * It renders under the label of the selected option, so an opaque background color is recommended.
   */
  highlightedArea?: StyleProp<ViewStyle>;
  /**
   * Each row's container that applies before the drum transform, which stays in control.
   */
  itemContainer?: StyleProp<ViewStyle>;
  /**
   * Every option label — the library wraps `label` in its own <Text>, and this is the
   * slot for its typography (color, fontSize, textAlign, ...).
   */
  itemText?: StyleProp<TextStyle>;
  /**
   * The two gradient masks that fade out the unselected options at the top and bottom of the wheel.
   */
  scrim?: StyleProp<ViewStyle>;
};
