import { useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSQLiteContext } from "expo-sqlite";
import { startOfDay } from "date-fns";

import {
  deleteExpense,
  insertExpense,
  updateExpense,
} from "@/db/repositories/expenses";
import { getCurrentOdometer } from "@/db/repositories/vehicles";
import { MAX_ODOMETER_JUMP_KM } from "@/domain/fuel/calculations";
import { t } from "@/i18n/translations";
import { useUnitFormat } from "@/hooks/useUnitFormat";
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
  const strings = useMemo(() => t(language), [language]);
  const es = strings.expense;
  const uf = useUnitFormat();
  const u = strings.units;
  const locale = language === "ru" ? "ru-RU" : "en-US";

  const [date, setDate] = useState(() =>
    existing ? new Date(existing.date) : new Date(),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
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
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
        </Field>
        <Field label={es.amount}>
          <TextInput
            style={styles.input}
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
          />
        </Field>

        <Text style={styles.label}>{strings.fuel.date}</Text>
        <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text>{date.toLocaleDateString(locale)}</Text>
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            maximumDate={new Date()}
            onChange={(_, selected) => {
              setShowDatePicker(Platform.OS === "ios");
              if (selected) setDate(selected);
            }}
          />
        )}

        <Pressable
          style={styles.odometerToggle}
          onPress={() => setIncludeOdometer((v) => !v)}
        >
          <Text style={styles.label}>{es.includeOdometer}</Text>
          <Text style={styles.link}>{includeOdometer ? "✓" : "—"}</Text>
        </Pressable>
        {includeOdometer && (
          <Field
            label={
              uf.distanceUnit === "mi" ? u.odometerMi : u.odometerKm
            }
          >
            <TextInput
              style={styles.input}
              value={odometerText}
              onChangeText={setOdometerText}
              keyboardType="decimal-pad"
            />
          </Field>
        )}

        <Field label={es.note}>
          <TextInput
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  link: { fontSize: 17, color: "#208AEF" },
  linkDisabled: { opacity: 0.5 },
  form: { padding: 16, gap: 12, paddingBottom: 32 },
  field: { gap: 6 },
  label: { fontSize: 14, color: "#666", fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  noteInput: { minHeight: 72, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },
  chipActive: { backgroundColor: "#208AEF" },
  chipText: { fontSize: 13, color: "#333" },
  chipTextActive: { color: "#fff" },
  odometerToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deleteButton: { marginTop: 16, paddingVertical: 14, alignItems: "center" },
  deleteText: { fontSize: 17, color: "#D32F2F", fontWeight: "500" },
});
