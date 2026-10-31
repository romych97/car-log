import type { ScrollViewProps } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

/** ScrollView that plays nicely with charts and nested gestures (RNGH root). */
export function ScreenScrollView(props: ScrollViewProps) {
  return (
    <ScrollView
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      overScrollMode="never"
      {...props}
    />
  );
}
