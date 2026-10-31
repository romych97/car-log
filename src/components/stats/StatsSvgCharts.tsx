import { memo, useMemo } from "react";
import { Dimensions, Text, View } from "react-native";
import Svg, { Line, Polyline, Rect, Text as SvgText } from "react-native-svg";

import type { AppColors } from "@/theme/colors";

/** Minimum space for Y-axis tick labels (actual width grows with label text). */
const Y_AXIS_MIN_WIDTH = 40;

const CHART_HORIZONTAL_INSET = 64;
const GRID_SECTIONS = 4;
const MONTH_LABEL_ROW_HEIGHT = 18;

function chartContainerWidth(): number {
  return Math.floor(Dimensions.get("window").width - CHART_HORIZONTAL_INSET);
}

function yAxisWidthForScale(
  maxValue: number,
  formatLabel: (value: number) => string,
): number {
  let maxChars = 0;
  for (let i = 0; i <= GRID_SECTIONS; i++) {
    const value = maxValue * (1 - i / GRID_SECTIONS);
    maxChars = Math.max(maxChars, formatLabel(value).length);
  }
  return Math.max(Y_AXIS_MIN_WIDTH, Math.ceil(maxChars * 7) + 10);
}

export function formatChartMoneyAxisValue(n: number): string {
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n);
  const abs = Math.abs(rounded);
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${rounded < 0 ? "-" : ""}${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (abs >= 1000) {
    return `${rounded < 0 ? "-" : ""}${Math.round(abs / 1000)}k`;
  }
  return String(rounded);
}

function formatConsumptionAxisValue(n: number): string {
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n * 10) / 10);
}

type AxisStyle = { fontSize: number; color: string };

function usePlotMetrics(
  height: number,
  maxValue: number,
  formatLabel: (value: number) => string,
) {
  return useMemo(() => {
    const containerWidth = chartContainerWidth();
    const yAxisWidth = yAxisWidthForScale(maxValue, formatLabel);
    const plotWidth = Math.max(100, containerWidth - yAxisWidth);
    return {
      containerWidth,
      yAxisWidth,
      plotWidth,
      plotHeight: height,
      plotLeft: yAxisWidth,
    };
  }, [height, maxValue, formatLabel]);
}

type GridProps = {
  height: number;
  maxValue: number;
  colors: AppColors;
  axisStyle: AxisStyle;
  formatLabel: (value: number) => string;
};

function ChartGrid({
  height,
  maxValue,
  colors,
  axisStyle,
  formatLabel,
}: GridProps) {
  const { containerWidth, plotWidth, plotHeight, plotLeft } = usePlotMetrics(
    height,
    maxValue,
    formatLabel,
  );

  const ticks = useMemo(() => {
    const items: { y: number; value: number }[] = [];
    for (let i = 0; i <= GRID_SECTIONS; i++) {
      const ratio = i / GRID_SECTIONS;
      items.push({
        y: ratio * plotHeight,
        value: maxValue * (1 - ratio),
      });
    }
    return items;
  }, [maxValue, plotHeight]);

  return (
    <Svg width={containerWidth} height={height}>
      {ticks.map(({ y, value }, index) => (
        <Line
          key={`grid-${index}`}
          x1={plotLeft}
          y1={y}
          x2={plotLeft + plotWidth}
          y2={y}
          stroke={colors.border}
          strokeWidth={1}
        />
      ))}
      {ticks.map(({ y, value }, index) => (
        <SvgText
          key={`ylabel-${index}`}
          x={plotLeft - 6}
          y={y + 4}
          fontSize={axisStyle.fontSize}
          fill={axisStyle.color}
          textAnchor="end"
        >
          {formatLabel(value)}
        </SvgText>
      ))}
      <Line
        x1={plotLeft}
        y1={plotHeight}
        x2={plotLeft + plotWidth}
        y2={plotHeight}
        stroke={colors.border}
        strokeWidth={1}
      />
      <Line
        x1={plotLeft}
        y1={0}
        x2={plotLeft}
        y2={plotHeight}
        stroke={colors.border}
        strokeWidth={1}
      />
    </Svg>
  );
}

export type MonthlyBarPoint = {
  value: number;
  label: string;
  color: string;
};

type MonthlySpendChartProps = {
  height: number;
  barData: MonthlyBarPoint[];
  colors: AppColors;
  axisStyle: AxisStyle;
  monthLabelStyle: { fontSize: number; color: string; marginTop: number };
  legend?: string;
};

export const MonthlySpendSvgChart = memo(function MonthlySpendSvgChart({
  height,
  barData,
  colors,
  axisStyle,
  monthLabelStyle,
  legend,
}: MonthlySpendChartProps) {
  const maxValue = Math.max(...barData.map((d) => d.value), 1) * 1.2;
  const formatMoney = formatChartMoneyAxisValue;
  const { containerWidth, plotWidth, plotHeight, plotLeft } = usePlotMetrics(
    height,
    maxValue,
    formatMoney,
  );

  const bars = useMemo(() => {
    const n = Math.max(barData.length, 1);
    const spacing = 8;
    const side = 6;
    const barWidth = Math.max(
      8,
      Math.floor((plotWidth - side * 2 - spacing * (n - 1)) / n),
    );
    let x = plotLeft + side;
    const result: {
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
    }[] = [];
    for (const item of barData) {
      const barHeight = (item.value / maxValue) * plotHeight;
      result.push({
        x,
        y: plotHeight - barHeight,
        width: barWidth,
        height: Math.max(barHeight, item.value > 0 ? 1 : 0),
        color: item.color,
      });
      x += barWidth + spacing;
    }
    return result;
  }, [barData, maxValue, plotHeight, plotLeft, plotWidth]);

  return (
    <View style={{ width: "100%" }}>
      <View style={{ height, width: containerWidth }}>
        <ChartGrid
          height={height}
          maxValue={maxValue}
          colors={colors}
          axisStyle={axisStyle}
          formatLabel={formatMoney}
        />
        <Svg
          width={containerWidth}
          height={height}
          style={{ position: "absolute", left: 0, top: 0 }}
        >
          {bars.map((bar, index) => (
            <Rect
              key={`bar-${index}`}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill={bar.color}
            />
          ))}
        </Svg>
      </View>
      <View
        style={{
          flexDirection: "row",
          marginLeft: plotLeft,
          marginTop: monthLabelStyle.marginTop,
          width: plotWidth,
          minHeight: MONTH_LABEL_ROW_HEIGHT,
          paddingHorizontal: 6,
        }}
      >
        {barData.map((item, index) => (
          <Text
            key={`${item.label}-${index}`}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: monthLabelStyle.fontSize,
              color: monthLabelStyle.color,
            }}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        ))}
      </View>
      {legend ? (
        <Text
          style={{
            marginLeft: plotLeft,
            marginTop: 10,
            fontSize: 12,
            color: colors.textMuted,
          }}
        >
          {legend}
        </Text>
      ) : null}
    </View>
  );
});

export type LinePoint = { value: number; label: string };

type ConsumptionLineChartProps = {
  height: number;
  lineData: LinePoint[];
  colors: AppColors;
  axisStyle: AxisStyle;
};

export const ConsumptionLineSvgChart = memo(function ConsumptionLineSvgChart({
  height,
  lineData,
  colors,
  axisStyle,
}: ConsumptionLineChartProps) {
  const maxValue = Math.max(...lineData.map((d) => d.value), 1) * 1.15;
  const { containerWidth, plotWidth, plotHeight, plotLeft } = usePlotMetrics(
    height,
    maxValue,
    formatConsumptionAxisValue,
  );

  const polylinePoints = useMemo(() => {
    const count = lineData.length;
    if (count < 2) return "";
    const side = 8;
    const usable = plotWidth - side * 2;
    const step = usable / (count - 1);
    return lineData
      .map((point, index) => {
        const x = plotLeft + side + step * index;
        const y =
          plotHeight - (point.value / maxValue) * plotHeight;
        return `${x},${y}`;
      })
      .join(" ");
  }, [lineData, maxValue, plotHeight, plotLeft, plotWidth]);

  return (
    <View style={{ height, width: containerWidth }}>
      <ChartGrid
        height={height}
        maxValue={maxValue}
        colors={colors}
        axisStyle={axisStyle}
        formatLabel={formatConsumptionAxisValue}
      />
      <Svg
        width={containerWidth}
        height={height}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={colors.tint}
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
});
