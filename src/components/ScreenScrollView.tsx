import { ScrollView, type ScrollViewProps } from "react-native";

/** Main screen scroll — use RN ScrollView (RNGH ScrollView can block vertical pan). */
export function ScreenScrollView(props: ScrollViewProps) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews={false}
      {...props}
    />
  );
}
