import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { BarChart, LineChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";

import { listExpensesByVehicle } from "@/db/repositories/expenses";
import { listFuelLogsByVehicle } from "@/db/repositories/fuelLogs";
import { computeConsumptionIntervals } from "@/domain/fuel/calculations";
import {
  buildMonthlySpendSeries,
  consumptionChartPoints,
  expensesByCategory,
} from "@/domain/stats/charts";
import { t } from "@/i18n/translations";
import { useUnitFormat } from "@/hooks/useUnitFormat";
import { useSettingsStore } from "@/store/settingsStore";
import type { Expense, ExpenseCategory, FuelLog } from "@/types/models";
import { formatMoneyMinor } from "@/utils/money";

/** Space for Y-axis numeric labels (gifted-charts draws these outside `width`). */
const Y_AXIS_LABEL_WIDTH = 56;
const CHART_SIDE_INSET = 8;

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

function ChartFrame({ children }: { children: (plotWidth: number) => ReactNode }) {
  const [plotWidth, setPlotWidth] = useState(0);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const inner = event.nativeEvent.layout.width - Y_AXIS_LABEL_WIDTH - CHART_SIDE_INSET;
    setPlotWidth(Math.max(120, Math.floor(inner)));
  }, []);

  return (
    <View style={styles.chartFrame} onLayout={onLayout}>
      {plotWidth > 0 ? children(plotWidth) : null}
    </View>
  );
}

export default function StatsScreen() {
  const db = useSQLiteContext();
  const language = useSettingsStore((s) => s.language);
  const vehicleId = useSettingsStore((s) => s.selectedVehicleId);
  const currencyCode = useSettingsStore((s) => s.currency);
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

  const barData = monthly.map((m) => ({
    value: Math.round(m.totalMinor / 100),
    label: m.label,
    frontColor: "#208AEF",
  }));

  const categoryBars = categories.slice(0, 6).map((row, index) => ({
    value: Math.round(row.amountMinor / 100),
    label: categoryShort(row.category),
    frontColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));

  const lineData = consumption.map((p) => ({
    value: uf.chartConsumptionValue(p.value),
    label: p.label,
  }));

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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{st.monthlySpend}</Text>
          <Text style={styles.hint}>{st.monthlyHint}</Text>
          {monthlyHasData ? (
            <ChartFrame>
              {(plotWidth) => {
                const n = Math.max(barData.length, 1);
                const spacing = 12;
                const barWidth = Math.min(
                  28,
                  Math.floor((plotWidth - 24 - spacing * (n - 1)) / n),
                );
                return (
                  <BarChart
                    data={barData}
                    width={plotWidth}
                    barWidth={Math.max(barWidth, 8)}
                    spacing={spacing}
                    initialSpacing={12}
                    endSpacing={12}
                    roundedTop
                    yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}
                    formatYLabel={formatChartMoneyAxis}
                    yAxisTextStyle={styles.axisText}
                    xAxisLabelTextStyle={styles.axisText}
                    noOfSections={4}
                    maxValue={Math.max(...barData.map((d) => d.value), 1) * 1.2}
                    disableScroll
                  />
                );
              }}
            </ChartFrame>
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
            <>
              <ChartFrame>
                {(plotWidth) => (
                  <BarChart
                    horizontal
                    data={categoryBars}
                    width={plotWidth}
                    barWidth={22}
                    spacing={28}
                    initialSpacing={8}
                    endSpacing={12}
                    yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}
                    formatYLabel={formatChartMoneyAxis}
                    yAxisTextStyle={styles.axisText}
                    xAxisLabelTextStyle={styles.axisText}
                    noOfSections={4}
                    maxValue={
                      Math.max(...categoryBars.map((d) => d.value), 1) * 1.2
                    }
                    disableScroll
                  />
                )}
              </ChartFrame>
              {categories.slice(0, 6).map((row) => (
                <Text key={row.category} style={styles.categoryLine}>
                  {strings.expense.categories[row.category]}:{" "}
                  {formatMoneyMinor(row.amountMinor, locale)}
                </Text>
              ))}
            </>
          ) : (
            <Text style={styles.placeholder}>{st.noData}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{st.consumption}</Text>
          <Text style={styles.hint}>{consumptionHintText}</Text>
          {lineData.length >= 2 ? (
            <ChartFrame>
              {(plotWidth) => (
                <LineChart
                  data={lineData}
                  width={plotWidth}
                  spacing={40}
                  initialSpacing={12}
                  endSpacing={12}
                  color="#208AEF"
                  thickness={2}
                  yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}
                  yAxisTextStyle={styles.axisText}
                  xAxisLabelTextStyle={styles.axisText}
                  noOfSections={4}
                  maxValue={Math.max(...lineData.map((d) => d.value), 1) * 1.15}
                  disableScroll
                />
              )}
            </ChartFrame>
          ) : (
            <Text style={styles.placeholder}>{st.noData}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const CATEGORY_COLORS = ["#208AEF", "#34A853", "#FBBC04", "#EA4335", "#9C27B0", "#00ACC1"];

function categoryShort(category: ExpenseCategory): string {
  return category.slice(0, 3);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f7" },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  empty: { flex: 1, padding: 24, justifyContent: "center" },
  emptyText: { fontSize: 16, color: "#444" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: "600" },
  hint: { fontSize: 13, color: "#666", marginTop: 4, marginBottom: 12 },
  chartFrame: {
    width: "100%",
    overflow: "hidden",
    alignSelf: "stretch",
  },
  placeholder: { fontSize: 15, color: "#888", paddingVertical: 24 },
  axisText: { fontSize: 10, color: "#666" },
  legend: { fontSize: 12, color: "#888", marginTop: 8 },
  categoryLine: { fontSize: 14, color: "#444", marginTop: 6 },
});
