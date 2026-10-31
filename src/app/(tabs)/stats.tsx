import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { Text, View, type ScrollViewInstance } from "react-native";
import { BarChart, LineChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import {
  STATS_CHART_Y_AXIS_WIDTH,
  StatsChartFrame,
} from "@/components/StatsChartFrame";
import { listExpensesByVehicle } from "@/db/repositories/expenses";
import { listFuelLogsByVehicle } from "@/db/repositories/fuelLogs";
import { computeConsumptionIntervals } from "@/domain/fuel/calculations";
import {
  buildMonthlySpendSeries,
  consumptionChartPoints,
  expensesByCategory,
  type CategorySpend,
} from "@/domain/stats/charts";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useUnitFormat } from "@/hooks/useUnitFormat";
import { t } from "@/i18n/translations";
import { useSettingsStore } from "@/store/settingsStore";
import { createStatsScreenStyles } from "@/theme/screenStyles";
import type { AppColors } from "@/theme/colors";
import type { Expense, ExpenseCategory, FuelLog } from "@/types/models";
import { formatMoneyMinor } from "@/utils/money";

const MONTHLY_PLOT_HEIGHT = 208;
const MONTHLY_BLOCK_MIN_HEIGHT = MONTHLY_PLOT_HEIGHT + 36;
const CONSUMPTION_CHART_HEIGHT = 200;

const CATEGORY_COLORS = [
  "#208AEF",
  "#34A853",
  "#FBBC04",
  "#EA4335",
  "#9C27B0",
  "#00ACC1",
];

function formatChartMoneyAxis(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${n < 0 ? "-" : ""}${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (abs >= 1000) {
    return `${n < 0 ? "-" : ""}${Math.round(abs / 1000)}k`;
  }
  return String(Math.round(n));
}

function chartCommonProps(
  containerWidth: number,
  yAxisWidth: number,
  axisTextStyle: { fontSize: number; color: string },
  colors: AppColors,
) {
  return {
    parentWidth: containerWidth,
    yAxisLabelWidth: yAxisWidth,
    formatYLabel: formatChartMoneyAxis,
    yAxisTextStyle: axisTextStyle,
    xAxisLabelTextStyle: axisTextStyle,
    rulesType: "solid" as const,
    rulesColor: colors.border,
    rulesThickness: 1,
    xAxisColor: colors.border,
    yAxisColor: colors.border,
    xAxisThickness: 1,
    yAxisThickness: 1,
  };
}

type CategorySpendBarsProps = {
  rows: CategorySpend[];
  locale: string;
  categoryLabel: (category: ExpenseCategory) => string;
  styles: ReturnType<typeof createStatsScreenStyles>;
};

function CategorySpendBars({
  rows,
  locale,
  categoryLabel,
  styles,
}: CategorySpendBarsProps) {
  const slice = rows.slice(0, 6);
  const maxMinor = Math.max(...slice.map((r) => r.amountMinor), 1);

  return (
    <View style={styles.categoryChart}>
      {slice.map((row, index) => {
        const ratio = row.amountMinor / maxMinor;
        return (
          <View key={row.category} style={styles.categoryRow}>
            <Text style={styles.categoryLabel} numberOfLines={1}>
              {categoryLabel(row.category)}
            </Text>
            <View style={styles.categoryTrack}>
              <View
                style={[
                  styles.categoryFill,
                  {
                    width: `${Math.max(ratio * 100, row.amountMinor > 0 ? 4 : 0)}%`,
                    backgroundColor:
                      CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                  },
                ]}
              />
            </View>
            <Text style={styles.categoryAmount}>
              {formatMoneyMinor(row.amountMinor, locale)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

type MonthlyBarChartProps = {
  barData: { value: number; label: string; frontColor: string }[];
  colors: AppColors;
  axisTextStyle: { fontSize: number; color: string };
  monthLabelStyle: { fontSize: number; color: string; marginTop: number };
};

function MonthlyMonthLabels({
  labels,
  labelStyle,
}: {
  labels: string[];
  labelStyle: { fontSize: number; color: string; marginTop: number };
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        marginLeft: STATS_CHART_Y_AXIS_WIDTH,
        marginTop: labelStyle.marginTop,
        paddingHorizontal: 6,
      }}
    >
      {labels.map((label, index) => (
        <Text
          key={`${label}-${index}`}
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: labelStyle.fontSize,
            color: labelStyle.color,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      ))}
    </View>
  );
}

const MonthlyBarChart = memo(function MonthlyBarChart({
  barData,
  colors,
  axisTextStyle,
  monthLabelStyle,
}: MonthlyBarChartProps) {
  const maxValue = Math.max(...barData.map((d) => d.value), 1) * 1.2;
  const chartData = useMemo(
    () => barData.map((d) => ({ ...d, label: "" })),
    [barData],
  );
  const monthLabels = useMemo(
    () => barData.map((d) => d.label),
    [barData],
  );

  return (
    <>
      <StatsChartFrame height={MONTHLY_PLOT_HEIGHT}>
        {({ plotWidth, containerWidth, height, yAxisWidth }) => {
          const n = Math.max(chartData.length, 1);
          const spacing = 8;
          const side = 6;
          const barWidth = Math.max(
            8,
            Math.floor((plotWidth - side * 2 - spacing * (n - 1)) / n),
          );
          const labelWidth = barWidth + spacing;

          return (
            <BarChart
              {...chartCommonProps(
                containerWidth,
                yAxisWidth,
                axisTextStyle,
                colors,
              )}
              data={chartData}
              width={plotWidth}
              height={height}
              barWidth={barWidth}
              spacing={spacing}
              labelWidth={labelWidth}
              initialSpacing={side}
              endSpacing={side}
              adjustToWidth
              roundedTop={false}
              roundedBottom={false}
              barBorderRadius={0}
              xAxisLabelsHeight={0}
              labelsExtraHeight={0}
              noOfSections={4}
              maxValue={maxValue}
              disableScroll
              isAnimated={false}
              backgroundColor={colors.chartBackground}
            />
          );
        }}
      </StatsChartFrame>
      <MonthlyMonthLabels labels={monthLabels} labelStyle={monthLabelStyle} />
    </>
  );
});

type ConsumptionLineChartProps = {
  lineData: { value: number; label: string }[];
  colors: AppColors;
  axisTextStyle: { fontSize: number; color: string };
};

const ConsumptionLineChart = memo(function ConsumptionLineChart({
  lineData,
  colors,
  axisTextStyle,
}: ConsumptionLineChartProps) {
  const maxValue = Math.max(...lineData.map((d) => d.value), 1) * 1.15;

  return (
    <StatsChartFrame height={CONSUMPTION_CHART_HEIGHT}>
      {({ plotWidth, containerWidth, height, yAxisWidth }) => (
        <LineChart
          {...chartCommonProps(
            containerWidth,
            yAxisWidth,
            axisTextStyle,
            colors,
          )}
          data={lineData}
          width={plotWidth}
          height={height}
          spacing={40}
          initialSpacing={8}
          endSpacing={8}
          color={colors.tint}
          thickness={2}
          noOfSections={4}
          maxValue={maxValue}
          disableScroll
          isAnimated={false}
          backgroundColor={colors.chartBackground}
        />
      )}
    </StatsChartFrame>
  );
});

export default function StatsScreen() {
  const db = useSQLiteContext();
  const language = useSettingsStore((s) => s.language);
  const vehicleId = useSettingsStore((s) => s.selectedVehicleId);
  const currencyCode = useSettingsStore((s) => s.currency);
  const { colors } = useAppTheme();
  const styles = useMemo(
    () => createStatsScreenStyles(colors),
    [colors],
  );
  const axisTextStyle = useMemo(
    () => ({ fontSize: 10, color: colors.chartAxis }),
    [colors.chartAxis],
  );
  const monthLabelStyle = useMemo(
    () => ({
      fontSize: styles.monthLabels.fontSize,
      color: styles.monthLabels.color,
      marginTop: styles.monthLabels.marginTop,
    }),
    [styles.monthLabels],
  );
  const strings = useMemo(() => t(language), [language]);
  const uf = useUnitFormat();
  const st = strings.stats;
  const locale = language === "ru" ? "ru-RU" : "en-US";

  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollYRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!vehicleId) {
      setFuelLogs([]);
      setExpenses([]);
      return;
    }
    const savedY = scrollYRef.current;
    const [fuel, ex] = await Promise.all([
      listFuelLogsByVehicle(db, vehicleId),
      listExpensesByVehicle(db, vehicleId),
    ]);
    setFuelLogs(fuel);
    setExpenses(ex);
    if (savedY > 0) {
      scrollYRef.current = savedY;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ y: savedY, animated: false });
        });
      });
    }
  }, [db, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const monthly = useMemo(
    () => buildMonthlySpendSeries(fuelLogs, expenses, 6, undefined, language),
    [fuelLogs, expenses, language],
  );

  const categories = useMemo(
    () => expensesByCategory(expenses, 365),
    [expenses],
  );

  const consumption = useMemo(() => {
    const intervals = computeConsumptionIntervals(fuelLogs);
    return consumptionChartPoints(intervals);
  }, [fuelLogs]);

  const monthlyHasData = monthly.some((m) => m.totalMinor > 0);
  const categoryHasData = categories.length > 0;

  const barData = useMemo(
    () =>
      monthly.map((m) => ({
        value: Math.round(m.totalMinor / 100),
        label: m.label,
        frontColor: colors.tint,
      })),
    [monthly, colors.tint],
  );

  const lineData = useMemo(
    () =>
      consumption.map((p) => ({
        value: uf.chartConsumptionValue(p.value),
        label: p.label,
      })),
    [consumption, uf],
  );

  const consumptionHintText =
    uf.distanceUnit === "mi" && uf.volumeUnit === "gal"
      ? st.consumptionHintMpg
      : st.consumptionHint;

  if (!vehicleId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>{st.title}</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{st.noVehicle}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{st.title}</Text>
      </View>
      <ScreenScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollYRef.current = event.nativeEvent.contentOffset.y;
        }}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{st.monthlySpend}</Text>
          <Text style={styles.hint}>{st.monthlyHint}</Text>
          {monthlyHasData ? (
            <View
              style={[
                styles.monthlyChartBlock,
                { minHeight: MONTHLY_BLOCK_MIN_HEIGHT },
              ]}
              collapsable={false}
            >
              <MonthlyBarChart
                barData={barData}
                colors={colors}
                axisTextStyle={axisTextStyle}
                monthLabelStyle={monthLabelStyle}
              />
              <Text style={styles.legend}>
                {st.chartFuel} + {st.chartOther} · {currencyCode}
              </Text>
            </View>
          ) : (
            <Text style={styles.placeholder}>{st.noData}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{st.byCategory}</Text>
          <Text style={styles.hint}>{st.byCategoryHint}</Text>
          {categoryHasData ? (
            <CategorySpendBars
              rows={categories}
              locale={locale}
              categoryLabel={(c) => strings.expense.categories[c]}
              styles={styles}
            />
          ) : (
            <Text style={styles.placeholder}>{st.noData}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{st.consumption}</Text>
          <Text style={styles.hint}>{consumptionHintText}</Text>
          {lineData.length >= 2 ? (
            <View style={styles.chartSlot} collapsable={false}>
              <ConsumptionLineChart
                lineData={lineData}
                colors={colors}
                axisTextStyle={axisTextStyle}
              />
            </View>
          ) : (
            <Text style={styles.placeholder}>{st.noData}</Text>
          )}
        </View>
      </ScreenScrollView>
    </SafeAreaView>
  );
}
