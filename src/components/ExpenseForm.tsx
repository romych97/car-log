import { AppTextInput } from "@/components/AppTextInput";
import { useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { DatePickerField } from "@/components/DatePickerField";
import { useSQLiteContext } from "expo-sqlite";
import { startOfDay } from "date-fns";

import {
  deleteExpense,
  insertExpense,
  updateExpense,
} from "@/db/repositories/expenses";
import { getCurrentOdometer } from "@/db/repositories/vehicles";
import { MAX_ODOMETER_JUMP_KM } from "@/domain/fuel/calculations";
import { useAppTheme } from "@/hooks/useAppTheme";
import { t } from "@/i18n/translations";
import { useUnitFormat } from "@/hooks/useUnitFormat";
import { createFormScreenStyles } from "@/theme/screenStyles";
import type { Expense, ExpenseCategory, Vehicle } from "@/types/models";
import { createId } from "@/utils/id";
import { formatMoneyMinor, parseMoneyToMinor } from "@/utils/money";

const CATEGORIES: ExpenseCategory[] = [
  "service",
  "insurance",
  "tax",
  "fine",
  "parking",
  "wash",
  "parts",
  "other",
];

type Props = {
  vehicle: Vehicle;
  existing?: Expense;
  initialOdometer?: number;
  onSaved: () => void;
  onCancel: () => void;
  language: "ru" | "en";
};

export function ExpenseForm({
  vehicle,
  existing,
  initialOdometer,
  onSaved,
  onCancel,
  language,
}: Props) {
  const db = useSQLiteContext();
  const { colors } = useAppTheme();
  const styles = useMemo(
    () => createFormScreenStyles(colors),
    [colors],
  );
  const strings = useMemo(() => t(language), [language]);
  const es = strings.expense;
  const uf = useUnitFormat();
  const u = strings.units;
  const locale = language === "ru" ? "ru-RU" : "en-US";

  const [date, setDate] = useState(() =>
    existing ? new Date(existing.date) : new Date(),
  );
  const [category, setCategory] = useState<ExpenseCategory>(
    existing?.category ?? "service",
  );
  const [title, setTitle] = useState(existing?.title ?? "");
  const [amountText, setAmountText] = useState(() =>
    existing ? formatMoneyMinor(existing.amount, locale) : "",
  );
  const [odometerText, setOdometerText] = useState(() =>
    existing?.odometer != null
      ? uf.formatDistanceInput(existing.odometer)
      : initialOdometer != null
        ? uf.formatDistanceInput(initialOdometer)
        : "",
  );
  const [includeOdometer, setIncludeOdometer] = useState(
    existing?.odometer != null || initialOdometer != null,
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const [saving, setSaving] = useState(false);

  async function persist() {
    if (!title.trim()) {
      Alert.alert(es.titleRequired);
      return;
    }
    const amount = parseMoneyToMinor(amountText);
    if (amount == null || amount <= 0) {
      Alert.alert(es.amountRequired);
      return;
    }

    const entryDate = startOfDay(date).getTime();
    if (entryDate > startOfDay(new Date()).getTime()) {
      Alert.alert(strings.fuel.futureDateForbidden);
      return;
    }

    let odometer: number | undefined;
    if (includeOdometer && odometerText.trim()) {
      const parsed = uf.parseDistanceInput(odometerText);
      if (parsed == null || parsed < 0) {
        Alert.alert(es.odometerInvalid);
        return;
      }
      odometer = parsed;
    }

    const warnings: string[] = [];
    if (odometer != null) {
      const currentMax = await getCurrentOdometer(
        db,
        vehicle.id,
        vehicle.initialOdometer,
        undefined,
      );
      if (odometer < currentMax - 0.01 && !existing) {
        warnings.push(strings.fuel.warnOdometerDecrease);
      }
      if (existing && odometer < currentMax - 0.01) {
        warnings.push(strings.fuel.warnOdometerDecrease);
      }
      if (odometer - currentMax > MAX_ODOMETER_JUMP_KM) {
        warnings.push(strings.fuel.warnOdometerJump);
      }
    }

    const save = async () => {
      setSaving(true);
      try {
        const expense: Expense = {
          id: existing?.id ?? createId(),
          vehicleId: vehicle.id,
          date: entryDate,
          odometer,
          category,
          title: title.trim(),
          amount,
          note: note.trim() || undefined,
        };
        if (existing) {
          await updateExpense(db, expense);
        } else {
          await insertExpense(db, expense);
        }
        onSaved();
      } finally {
        setSaving(false);
      }
    };

    if (warnings.length === 0) {
      await save();
      return;
    }

    Alert.alert(strings.fuel.warningsTitle, warnings.join("\n\n"), [
      { text: strings.common.cancel, style: "cancel" },
      { text: strings.fuel.saveAnyway, onPress: () => save() },
    ]);
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert(es.deleteConfirmTitle, es.deleteConfirmMessage, [
      { text: strings.common.cancel, style: "cancel" },
      {
        text: es.delete,
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            await deleteExpense(db, existing.id);
            onSaved();
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        {children}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.toolbar}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={styles.link}>{strings.common.cancel}</Text>
        </Pressable>
        <Pressable onPress={persist} disabled={saving} hitSlop={8}>
          <Text style={[styles.link, saving && styles.linkDisabled]}>
            {es.save}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>{es.category}</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text
                style={[
                  styles.chipText,
                  category === cat && styles.chipTextActive,
                ]}
              >
                {es.categories[cat]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Field label={es.title}>
          <AppTextInput style={styles.input} value={title} onChangeText={setTitle} />
        </Field>
        <Field label={es.amount}>
          <AppTextInput
            style={styles.input}
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
          />
        </Field>

        <Text style={styles.label}>{strings.fuel.date}</Text>
        <DatePickerField
          value={date}
          onChange={setDate}
          locale={locale}
        />

        <Pressable
          style={styles.odometerToggle}
          onPress={() => setIncludeOdometer((v) => !v)}
        >
          <Text style={styles.label}>{es.includeOdometer}</Text>
          <Text style={styles.link}>{includeOdometer ? "✓" : "-"}</Text>
        </Pressable>
        {includeOdometer && (
          <Field
            label={
              uf.distanceUnit === "mi" ? u.odometerMi : u.odometerKm
            }
          >
            <AppTextInput
              style={styles.input}
              value={odometerText}
              onChangeText={setOdometerText}
              keyboardType="decimal-pad"
            />
          </Field>
        )}

        <Field label={es.note}>
          <AppTextInput
            style={[styles.input, styles.noteInput]}
            value={note}
            onChangeText={setNote}
            multiline
          />
        </Field>

        {existing && (
          <Pressable
            style={styles.deleteButton}
            onPress={confirmDelete}
            disabled={saving}
          >
            <Text style={styles.deleteText}>{es.delete}</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
