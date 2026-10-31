import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { memo, useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { BarChart, LineChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import {
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

const MONTHLY_CHART_HEIGHT = 220;
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
) {
  return {
    parentWidth: containerWidth,
    yAxisLabelWidth: yAxisWidth,
    formatYLabel: formatChartMoneyAxis,
    yAxisTextStyle: axisTextStyle,
    xAxisLabelTextStyle: axisTextStyle,
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
};

const MonthlyBarChart = memo(function MonthlyBarChart({
  barData,
  colors,
  axisTextStyle,
}: MonthlyBarChartProps) {
  const maxValue = Math.max(...barData.map((d) => d.value), 1) * 1.2;

  return (
    <StatsChartFrame height={MONTHLY_CHART_HEIGHT}>
      {({ plotWidth, containerWidth, height, yAxisWidth }) => {
        const n = Math.max(barData.length, 1);
        const spacing = 12;
        const barWidth = Math.min(
          28,
          Math.floor((plotWidth - 24 - spacing * (n - 1)) / n),
        );
        return (
          <BarChart
            {...chartCommonProps(containerWidth, yAxisWidth, axisTextStyle)}
            data={barData}
            width={plotWidth}
            height={height}
            barWidth={Math.max(barWidth, 8)}
            spacing={spacing}
            initialSpacing={8}
            endSpacing={8}
            roundedTop
            noOfSections={4}
            maxValue={maxValue}
            disableScroll
            isAnimated={false}
            backgroundColor={colors.chartBackground}
          />
        );
      }}
    </StatsChartFrame>
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
          {...chartCommonProps(containerWidth, yAxisWidth, axisTextStyle)}
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
  const strings = useMemo(() => t(language), [language]);
  const uf = useUnitFormat();
  const st = strings.stats;
  const locale = language === "ru" ? "ru-RU" : "en-US";

  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const refresh = useCallback(async () => {
    if (!vehicleId) {
      setFuelLogs([]);
      setExpenses([]);
      return;
    }
    const [fuel, ex] = await Promise.all([
      listFuelLogsByVehicle(db, vehicleId),
      listExpensesByVehicle(db, vehicleId),
    ]);
    setFuelLogs(fuel);
    setExpenses(ex);
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
        contentContainerStyle={[styles.content, styles.contentGap]}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{st.monthlySpend}</Text>
          <Text style={styles.hint}>{st.monthlyHint}</Text>
          {monthlyHasData ? (
            <MonthlyBarChart
              barData={barData}
              colors={colors}
              axisTextStyle={axisTextStyle}
            />
          ) : (
            <Text style={styles.placeholder}>{st.noData}</Text>
          )}
          {monthlyHasData && (
            <Text style={styles.legend}>
              {st.chartFuel} + {st.chartOther} · {currencyCode}
            </Text>
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
            <ConsumptionLineChart
              lineData={lineData}
              colors={colors}
              axisTextStyle={axisTextStyle}
            />
          ) : (
            <Text style={styles.placeholder}>{st.noData}</Text>
          )}
        </View>
      </ScreenScrollView>
    </SafeAreaView>
  );
}
