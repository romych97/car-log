import { ScrollView, StyleSheet, type ScrollViewProps } from "react-native";

const scrollViewStyle = StyleSheet.create({
  root: { flex: 1 },
});

/** Main screen scroll — use RN ScrollView (RNGH ScrollView can block vertical pan). */
export function ScreenScrollView(props: ScrollViewProps) {
  const { style, ...rest } = props;
  return (
    <ScrollView
      style={[scrollViewStyle.root, style]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      removeClippedSubviews={false}
      nestedScrollEnabled={false}
      overScrollMode="never"
      {...rest}
    />
  );
}
