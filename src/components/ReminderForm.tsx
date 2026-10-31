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
  countRemindersByVehicle,
  deleteReminder,
  insertReminder,
  updateReminder,
} from "@/db/repositories/reminders";
import { listExpensesByVehicle } from "@/db/repositories/expenses";
import { listFuelLogsByVehicle } from "@/db/repositories/fuelLogs";
import { getCurrentOdometer } from "@/db/repositories/vehicles";
import { FREE_REMINDER_LIMIT } from "@/domain/reminders/templates";
import { computeDailyKmAverage } from "@/domain/reminders/status";
import { t } from "@/i18n/translations";
import { useUnitFormat } from "@/hooks/useUnitFormat";
import {
  cancelReminderNotifications,
  requestReminderPermissions,
  syncReminderNotifications,
} from "@/notifications/reminders";
import { useSettingsStore } from "@/store/settingsStore";
import type { Reminder, Vehicle } from "@/types/models";
import { createId } from "@/utils/id";

type Props = {
  vehicle: Vehicle;
  existing?: Reminder;
  initialLastOdometer?: number;
  initialTitle?: string;
  initialEveryKm?: number;
  initialEveryMonths?: number;
  onSaved: () => void;
  onCancel: () => void;
  language: "ru" | "en";
};

export function ReminderForm({
  vehicle,
  existing,
  initialLastOdometer,
  initialTitle,
  initialEveryKm,
  initialEveryMonths,
  onSaved,
  onCancel,
  language,
}: Props) {
  const db = useSQLiteContext();
  const strings = useMemo(() => t(language), [language]);
  const rs = strings.reminder;
  const uf = useUnitFormat();
  const u = strings.units;
  const isPremium = useSettingsStore((s) => s.isPremium);
  const locale = language === "ru" ? "ru-RU" : "en-US";

  const [title, setTitle] = useState(existing?.title ?? initialTitle ?? "");
  const [everyKmText, setEveryKmText] = useState(() =>
    existing?.everyKm != null
      ? uf.formatDistanceInput(existing.everyKm)
      : initialEveryKm != null
        ? uf.formatDistanceInput(initialEveryKm)
        : "",
  );
  const [everyMonthsText, setEveryMonthsText] = useState(() =>
    existing?.everyMonths != null
      ? String(existing.everyMonths)
      : initialEveryMonths != null
        ? String(initialEveryMonths)
        : "",
  );
  const [lastDate, setLastDate] = useState(() =>
    existing ? new Date(existing.lastDate) : new Date(),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [lastOdometerText, setLastOdometerText] = useState(() =>
    existing
      ? uf.formatDistanceInput(existing.lastOdometer)
      : initialLastOdometer != null
        ? uf.formatDistanceInput(initialLastOdometer)
        : uf.formatDistanceInput(vehicle.initialOdometer),
  );
  const [saving, setSaving] = useState(false);

  async function persist() {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert(rs.titleRequired);
      return;
    }
    const everyKmParsed = everyKmText.trim()
      ? uf.parseDistanceInput(everyKmText.trim())
      : null;
    const everyKm = everyKmParsed ?? undefined;
    const everyMonths = everyMonthsText.trim()
      ? Number(everyMonthsText)
      : undefined;
    if (everyKm == null && everyMonths == null) {
      Alert.alert(rs.intervalRequired);
      return;
    }
    if (
      (everyKm != null && (!Number.isFinite(everyKm) || everyKm <= 0)) ||
      (everyMonths != null &&
        (!Number.isFinite(everyMonths) || everyMonths <= 0))
    ) {
      Alert.alert(rs.intervalInvalid);
      return;
    }
    const lastOdometer = uf.parseDistanceInput(lastOdometerText);
    if (lastOdometer == null || lastOdometer < 0) {
      Alert.alert(rs.odometerInvalid);
      return;
    }
    const lastDateMs = startOfDay(lastDate).getTime();
    if (lastDateMs > startOfDay(new Date()).getTime()) {
      Alert.alert(strings.fuel.futureDateForbidden);
      return;
    }

    if (!existing && !isPremium) {
      const count = await countRemindersByVehicle(db, vehicle.id);
      if (count >= FREE_REMINDER_LIMIT) {
        Alert.alert(rs.freeLimit);
        return;
      }
    }

    setSaving(true);
    try {
      if (!existing) {
        const granted = await requestReminderPermissions();
        if (!granted) {
          Alert.alert(rs.notificationsDenied);
        }
      }

      const base: Reminder = existing ?? {
        id: createId(),
        vehicleId: vehicle.id,
        title: trimmed,
        everyKm,
        everyMonths,
        lastOdometer,
        lastDate: lastDateMs,
        notificationIds: [],
      };

      const reminder: Reminder = {
        ...base,
        title: trimmed,
        everyKm,
        everyMonths,
        lastOdometer,
        lastDate: lastDateMs,
      };

      if (existing) {
        await updateReminder(db, reminder);
      } else {
        await insertReminder(db, reminder);
      }

      const [fuelLogs, expenses, odometer] = await Promise.all([
        listFuelLogsByVehicle(db, vehicle.id),
        listExpensesByVehicle(db, vehicle.id),
        getCurrentOdometer(db, vehicle.id, vehicle.initialOdometer),
      ]);
      const { dailyKm, dataSpanDays } = computeDailyKmAverage(
        fuelLogs,
        expenses,
      );
      await syncReminderNotifications(
        db,
        reminder,
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

  async function onDelete() {
    if (!existing) return;
    Alert.alert(rs.deleteConfirmTitle, rs.deleteConfirmMessage, [
      { text: strings.common.cancel, style: "cancel" },
      {
        text: rs.delete,
        style: "destructive",
        onPress: async () => {
          await cancelReminderNotifications(existing.notificationIds);
          await deleteReminder(db, existing.id);
          onSaved();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.disclaimer}>{rs.templateDisclaimer}</Text>

        <Field label={rs.fieldTitle}>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={rs.titlePlaceholder}
          />
        </Field>

        <Field
          label={
            uf.distanceUnit === "mi"
              ? `${rs.everyKm.split(",")[0]}, ${u.mi}`
              : rs.everyKm
          }
        >
          <TextInput
            style={styles.input}
            value={everyKmText}
            onChangeText={setEveryKmText}
            keyboardType="numeric"
            placeholder={rs.optional}
          />
        </Field>

        <Field label={rs.everyMonths}>
          <TextInput
            style={styles.input}
            value={everyMonthsText}
            onChangeText={setEveryMonthsText}
            keyboardType="number-pad"
            placeholder={rs.optional}
          />
        </Field>

        <Field label={rs.lastServiceDate}>
          <Pressable onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateValue}>
              {lastDate.toLocaleDateString(locale)}
            </Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={lastDate}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, d) => {
                setShowDatePicker(Platform.OS === "ios");
                if (d) setLastDate(d);
              }}
            />
          )}
        </Field>

        <Field
          label={
            uf.distanceUnit === "mi" ? u.odometerMi : u.odometerKm
          }
        >
          <TextInput
            style={styles.input}
            value={lastOdometerText}
            onChangeText={setLastOdometerText}
            keyboardType="numeric"
          />
        </Field>

        <View style={styles.actions}>
          <Pressable style={styles.primary} onPress={persist} disabled={saving}>
            <Text style={styles.primaryText}>{rs.save}</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={onCancel}>
            <Text style={styles.secondaryText}>{strings.common.cancel}</Text>
          </Pressable>
          {existing && (
            <Pressable style={styles.danger} onPress={onDelete}>
              <Text style={styles.dangerText}>{rs.delete}</Text>
            </Pressable>
          )}
        </View>
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
  scroll: { padding: 16, gap: 16 },
  disclaimer: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
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
  dateValue: { fontSize: 16, paddingVertical: 8 },
  actions: { gap: 10, marginTop: 8 },
  primary: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
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
  danger: { paddingVertical: 12, alignItems: "center" },
  dangerText: { color: "#D32F2F", fontSize: 16, fontWeight: "600" },
});
