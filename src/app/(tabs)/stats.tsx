import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import {
  ConsumptionLineSvgChart,
  MonthlySpendSvgChart,
} from "@/components/stats/StatsSvgCharts";
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
import type { Expense, ExpenseCategory, FuelLog } from "@/types/models";
import { formatMoneyMinor } from "@/utils/money";

const MONTHLY_PLOT_HEIGHT = 208;
/** Plot + month labels + legend */
const MONTHLY_BLOCK_MIN_HEIGHT = MONTHLY_PLOT_HEIGHT + 44;
const CONSUMPTION_CHART_HEIGHT = 200;

const CATEGORY_COLORS = [
  "#208AEF",
  "#34A853",
  "#FBBC04",
  "#EA4335",
  "#9C27B0",
  "#00ACC1",
];

function statsDataFingerprint(fuel: FuelLog[], expenses: Expense[]): string {
  const fuelPart = fuel.map((l) => `${l.id}:${l.date}:${l.totalCost}`).join("|");
  const expensePart = expenses
    .map((e) => `${e.id}:${e.date}:${e.amount}`)
    .join("|");
  return `${fuel.length}#${fuelPart};;${expenses.length}#${expensePart}`;
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
  const dataFingerprintRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!vehicleId) {
      dataFingerprintRef.current = null;
      setFuelLogs([]);
      setExpenses([]);
      return;
    }
    const [fuel, ex] = await Promise.all([
      listFuelLogsByVehicle(db, vehicleId),
      listExpensesByVehicle(db, vehicleId),
    ]);
    const fingerprint = `${vehicleId}:${statsDataFingerprint(fuel, ex)}`;
    if (fingerprint === dataFingerprintRef.current) {
      return;
    }
    dataFingerprintRef.current = fingerprint;
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
        color: colors.tint,
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
      <ScreenScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{st.monthlySpend}</Text>
          <Text style={styles.hint}>{st.monthlyHint}</Text>
          {monthlyHasData ? (
            <View
              style={[
                styles.monthlyChartBlock,
                { minHeight: MONTHLY_BLOCK_MIN_HEIGHT },
              ]}
            >
              <MonthlySpendSvgChart
                height={MONTHLY_PLOT_HEIGHT}
                barData={barData}
                colors={colors}
                axisStyle={axisTextStyle}
                monthLabelStyle={monthLabelStyle}
                legend={`${st.chartFuel} + ${st.chartOther} · ${currencyCode}`}
              />
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
            <View style={styles.chartSlot}>
              <ConsumptionLineSvgChart
                height={CONSUMPTION_CHART_HEIGHT}
                lineData={lineData}
                colors={colors}
                axisStyle={axisTextStyle}
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
