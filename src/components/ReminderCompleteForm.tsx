import { useMemo, useState } from "react";
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

import { insertExpense, listExpensesByVehicle } from "@/db/repositories/expenses";
import { listFuelLogsByVehicle } from "@/db/repositories/fuelLogs";
import { updateReminder } from "@/db/repositories/reminders";
import { computeDailyKmAverage } from "@/domain/reminders/status";
import { t } from "@/i18n/translations";
import { useUnitFormat } from "@/hooks/useUnitFormat";
import { syncReminderNotifications } from "@/notifications/reminders";
import type { Reminder, Vehicle } from "@/types/models";
import { createId } from "@/utils/id";
import { formatMoneyMinor, parseMoneyToMinor } from "@/utils/money";

type Props = {
  vehicle: Vehicle;
  reminder: Reminder;
  suggestedOdometer?: number;
  onSaved: () => void;
  onCancel: () => void;
  language: "ru" | "en";
};

export function ReminderCompleteForm({
  vehicle,
  reminder,
  suggestedOdometer,
  onSaved,
  onCancel,
  language,
}: Props) {
  const db = useSQLiteContext();
  const strings = useMemo(() => t(language), [language]);
  const rs = strings.reminder;
  const uf = useUnitFormat();
  const u = strings.units;
  const locale = language === "ru" ? "ru-RU" : "en-US";

  const [date, setDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [odometerText, setOdometerText] = useState(() =>
    suggestedOdometer != null
      ? uf.formatDistanceInput(suggestedOdometer)
      : uf.formatDistanceInput(reminder.lastOdometer),
  );
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function persist() {
    const amount = parseMoneyToMinor(amountText);
    if (amount == null || amount <= 0) {
      Alert.alert(strings.expense.amountRequired);
      return;
    }
    const odometer = uf.parseDistanceInput(odometerText);
    if (odometer == null || odometer < 0) {
      Alert.alert(strings.expense.odometerInvalid);
      return;
    }
    const entryDate = startOfDay(date).getTime();
    if (entryDate > startOfDay(new Date()).getTime()) {
      Alert.alert(strings.fuel.futureDateForbidden);
      return;
    }

    setSaving(true);
    try {
      await insertExpense(db, {
        id: createId(),
        vehicleId: vehicle.id,
        date: entryDate,
        odometer,
        category: "service",
        title: reminder.title,
        amount,
        note: note.trim() || undefined,
      });

      const updated: Reminder = {
        ...reminder,
        lastOdometer: odometer,
        lastDate: entryDate,
      };
      await updateReminder(db, updated);

      const [fuelLogs, expenses] = await Promise.all([
        listFuelLogsByVehicle(db, vehicle.id),
        listExpensesByVehicle(db, vehicle.id),
      ]);
      const { dailyKm, dataSpanDays } = computeDailyKmAverage(
        fuelLogs,
        expenses,
      );
      await syncReminderNotifications(
        db,
        updated,
        odometer,
        dailyKm,
        dataSpanDays,
        language,
      );

      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{reminder.title}</Text>
        <Text style={styles.hint}>{rs.completeHint}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{strings.fuel.date}</Text>
          <Pressable onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateValue}>
              {date.toLocaleDateString(locale)}
            </Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, d) => {
                setShowDatePicker(Platform.OS === "ios");
                if (d) setDate(d);
              }}
            />
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            {uf.distanceUnit === "mi" ? u.odometerMi : u.odometerKm}
          </Text>
          <TextInput
            style={styles.input}
            value={odometerText}
            onChangeText={setOdometerText}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{strings.expense.amount}</Text>
          <TextInput
            style={styles.input}
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder={formatMoneyMinor(0, locale)}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{strings.expense.note}</Text>
          <TextInput
            style={[styles.input, styles.note]}
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        <Pressable style={styles.primary} onPress={persist} disabled={saving}>
          <Text style={styles.primaryText}>{rs.completeSave}</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={onCancel}>
          <Text style={styles.secondaryText}>{strings.common.cancel}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  heading: { fontSize: 20, fontWeight: "700" },
  hint: { fontSize: 14, color: "#666", lineHeight: 20 },
  field: { gap: 6 },
  label: { fontSize: 14, color: "#444", fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  note: { minHeight: 72, textAlignVertical: "top" },
  dateValue: { fontSize: 16, paddingVertical: 8 },
  primary: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryText: { color: "#fff", fontWeight: "600", fontSize: 17 },
  secondary: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  secondaryText: { fontSize: 16, color: "#333" },
});
