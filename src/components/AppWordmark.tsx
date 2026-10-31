import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/hooks/useAppTheme";

export function AppWordmark() {
  const { colors } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "baseline",
        },
        car: {
          fontSize: 22,
          fontWeight: "800",
          letterSpacing: 2,
          color: colors.text,
        },
        dash: {
          fontSize: 20,
          fontWeight: "300",
          color: colors.tint,
          marginHorizontal: 2,
        },
        log: {
          fontSize: 22,
          fontWeight: "600",
          letterSpacing: 3,
          color: colors.textSecondary,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.row} accessibilityRole="header">
      <Text style={styles.car}>CAR</Text>
      <Text style={styles.dash}>-</Text>
      <Text style={styles.log}>LOG</Text>
    </View>
  );
}
