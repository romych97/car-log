import { StyleSheet, Text, View } from "react-native";

export function AppWordmark() {
  return (
    <View style={styles.row} accessibilityRole="header">
      <Text style={styles.car}>CAR</Text>
      <Text style={styles.dash}>-</Text>
      <Text style={styles.log}>LOG</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  car: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#1C1C1E",
  },
  dash: {
    fontSize: 20,
    fontWeight: "300",
    color: "#208AEF",
    marginHorizontal: 2,
  },
  log: {
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 3,
    color: "#3A3A3C",
  },
});
