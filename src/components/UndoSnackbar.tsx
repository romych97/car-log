import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  message: string;
  actionLabel: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
};

export function UndoSnackbar({
  visible,
  message,
  actionLabel,
  onUndo,
  onDismiss,
  durationMs = 5000,
}: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!visible) return;

    timerRef.current = setTimeout(onDismiss, durationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, durationMs, onDismiss]);

  if (!visible) return null;

  return (
    <View style={styles.bar} accessibilityRole="alert">
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      <Pressable
        onPress={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          onUndo();
        }}
        hitSlop={8}
      >
        <Text style={styles.action}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: "#323232",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  message: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
  },
  action: {
    color: "#7EC8FF",
    fontSize: 16,
    fontWeight: "600",
  },
});
