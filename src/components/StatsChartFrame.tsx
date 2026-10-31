import { useMemo, type ReactNode } from "react";
import { Dimensions, StyleSheet, View } from "react-native";

/** Width reserved for Y-axis labels (gifted-charts renders beside `width`). */
export const STATS_CHART_Y_AXIS_WIDTH = 38;

/** Horizontal padding: screen (16) + scroll content (16) + card (16×2). */
const CHART_HORIZONTAL_INSET = 64;

export type StatsChartLayout = {
  containerWidth: number;
  plotWidth: number;
  height: number;
  yAxisWidth: number;
};

function computeChartLayout(height: number): StatsChartLayout {
  const containerWidth = Math.floor(
    Dimensions.get("window").width - CHART_HORIZONTAL_INSET,
  );
  const yAxisWidth = STATS_CHART_Y_AXIS_WIDTH;
  const plotWidth = Math.max(100, containerWidth - yAxisWidth);
  return { containerWidth, plotWidth, height, yAxisWidth };
}

type StatsChartFrameProps = {
  height: number;
  children: (layout: StatsChartLayout) => ReactNode;
};

/** Fixed-size chart slot — no onLayout (avoids scroll jump / vertical stretch). */
export function StatsChartFrame({ height, children }: StatsChartFrameProps) {
  const layout = useMemo(() => computeChartLayout(height), [height]);

  return (
    <View
      style={[styles.frame, { height }]}
      pointerEvents="none"
      collapsable={false}
    >
      {children(layout)}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    overflow: "hidden",
    alignSelf: "stretch",
  },
});
