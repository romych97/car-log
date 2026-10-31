import { forwardRef } from "react";
import {
  ScrollView,
  StyleSheet,
  type ScrollViewInstance,
  type ScrollViewProps,
} from "react-native";

const scrollViewStyle = StyleSheet.create({
  root: { flex: 1 },
});

/** Main screen scroll — use RN ScrollView (RNGH ScrollView can block vertical pan). */
export const ScreenScrollView = forwardRef<ScrollViewInstance, ScrollViewProps>(
  function ScreenScrollView(props, ref) {
    const { style, keyboardDismissMode = "none", ...rest } = props;
    return (
      <ScrollView
        ref={ref}
        style={[scrollViewStyle.root, style]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={keyboardDismissMode}
        removeClippedSubviews={false}
        nestedScrollEnabled={false}
        overScrollMode="never"
        {...rest}
      />
    );
  },
);
