import { useState } from "react";
import type { ViewStyle } from "react-native";
import { StyleSheet, Text, View } from "react-native";

import { StatusBar } from "expo-status-bar";

import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import type { WheelPickerStyles } from "@haejunejung/react-native-wheel-picker";
import { WheelPicker } from "@haejunejung/react-native-wheel-picker";

const OPTION_ITEM_HEIGHT = 40;
const VISIBLE_COUNT = 5;

const options = Array(60)
  .fill(null)
  .map((_, i) => ({ value: i, label: String(i) }));

/**
 * All labels are drawn in the selected color (itemText); the area outside the
 * band is washed with a translucent scrim of the background color, so the
 * unselected color is derived rather than set directly. The band
 * (highlightedArea) sits behind the labels, so it uses an opaque color as-is.
 */
const rootBase: ViewStyle = {
  width: 224,
  borderRadius: 8,
  borderWidth: 1,
  paddingHorizontal: 4,
  overflow: "hidden",
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
};

const itemBase: ViewStyle = { justifyContent: "center" };

const lightPickerStyles: WheelPickerStyles = {
  root: {
    ...rootBase,
    borderColor: "#e4e4e7",
    backgroundColor: "#ffffff",
  },
  itemContainer: itemBase,
  itemText: { textAlign: "center", fontSize: 14, color: "#09090b" },
  highlightedArea: {
    borderRadius: 6,
    backgroundColor: "#f4f4f5",
  },
  scrim: { backgroundColor: "rgba(255, 255, 255, 0.65)" },
};

const darkPickerStyles: WheelPickerStyles = {
  root: {
    ...rootBase,
    borderColor: "rgba(63, 63, 70, 0.8)",
    backgroundColor: "#18181b",
  },
  itemContainer: itemBase,
  itemText: { textAlign: "center", fontSize: 14, color: "#fafafa" },
  highlightedArea: {
    borderRadius: 6,
    backgroundColor: "#27272a",
  },
  scrim: { backgroundColor: "rgba(24, 24, 27, 0.7)" },
};

const PickerPanel = ({ dark }: { dark: boolean }) => {
  const [value, setValue] = useState(0);

  return (
    <View style={[styles.panel, dark && styles.panelDark]}>
      <Text style={[styles.valueText, dark && styles.valueTextDark]}>
        {dark ? "Dark" : "Light"} · value: {value}
      </Text>
      <WheelPicker
        options={options}
        optionItemHeight={OPTION_ITEM_HEIGHT}
        visibleCount={VISIBLE_COUNT}
        value={value}
        onChange={setValue}
        styles={dark ? darkPickerStyles : lightPickerStyles}
      />
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="auto" />
        <View style={styles.container}>
          <PickerPanel dark={false} />
          <PickerPanel dark />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f4f5",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  panel: {
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#ffffff",
  },
  panelDark: {
    backgroundColor: "#09090b",
  },
  valueText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#09090b",
  },
  valueTextDark: {
    color: "#fafafa",
  },
});
