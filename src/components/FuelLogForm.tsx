import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSQLiteContext } from "expo-sqlite";
import { startOfDay } from "date-fns";

import { insertFuelLog, updateFuelLog } from "@/db/repositories/fuelLogs";
import { getCurrentOdometer } from "@/db/repositories/vehicles";
import {
  MAX_ODOMETER_JUMP_KM,
  syncFuelFields,
  type FuelFieldKey,
} from "@/domain/fuel/calculations";
import { t } from "@/i18n/translations";
import type { FuelLog, Vehicle } from "@/types/models";
import { createId } from "@/utils/id";
import {
  formatMoneyMinor,
  formatPricePerLiterMinor,
  parseDecimal,
  parseMoneyToMinor,
} from "@/utils/money";

type Props = {
  vehicle: Vehicle;
  existing?: FuelLog;
  initialOdometer?: number;
  onSaved: () => void;
  onCancel: () => void;
  language: "ru" | "en";
};

export function FuelLogForm({
  vehicle,
  existing,
  initialOdometer,
  onSaved,
  onCancel,
  language,
}: Props) {
  const db = useSQLiteContext();
  const strings = useMemo(() => t(language), [language]);
  const fs = strings.fuel;

  const locale = language === "ru" ? "ru-RU" : "en-US";

  const [date, setDate] = useState(() =>
    existing ? new Date(existing.date) : new Date(),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [odometerText, setOdometerText] = useState(() =>
    existing
      ? String(existing.odometer)
      : initialOdometer != null
        ? String(Math.round(initialOdometer))
        : "",
  );
  const [volumeText, setVolumeText] = useState(() =>
    existing ? String(existing.volume) : "",
  );
  const [priceText, setPriceText] = useState(() =>
    existing
      ? formatPricePerLiterMinor(existing.pricePerUnit, locale)
      : "",
  );
  const [totalText, setTotalText] = useState(() =>
    existing ? formatMoneyMinor(existing.totalCost, locale) : "",
  );
  const [fullTank, setFullTank] = useState(existing?.fullTank ?? true);
  const [note, setNote] = useState(existing?.note ?? "");
  const [saving, setSaving] = useState(false);

  const applySync = useCallback(
    (field: FuelFieldKey, volume: string, price: string, total: string) => {
      const synced = syncFuelFields(
        {
          volume: parseDecimal(volume),
          pricePerUnit: parseMoneyToMinor(price),
          totalCost: parseMoneyToMinor(total),
        },
        field,
      );

      if (field !== "volume" && synced.volume != null) {
        setVolumeText(String(Math.round(synced.volume * 100) / 100));
      }
      if (field !== "pricePerUnit" && synced.pricePerUnit != null) {
        setPriceText(formatPricePerLiterMinor(synced.pricePerUnit, locale));
      }
      if (field !== "totalCost" && synced.totalCost != null) {
        setTotalText(formatMoneyMinor(synced.totalCost, locale));
      }
    },
    [locale],
  );

  const onVolumeChange = (text: string) => {
    setVolumeText(text);
    applySync("volume", text, priceText, totalText);
  };

  const onPriceChange = (text: string) => {
    setPriceText(text);
    applySync("pricePerUnit", volumeText, text, totalText);
  };

  const onTotalChange = (text: string) => {
    setTotalText(text);
    applySync("totalCost", volumeText, priceText, text);
  };

  async function persist() {
    const odometer = parseDecimal(odometerText);
    const volume = parseDecimal(volumeText);
    const pricePerUnit = parseMoneyToMinor(priceText);
    const totalCost = parseMoneyToMinor(totalText);

    if (odometer == null || odometer < 0) {
      Alert.alert(fs.odometerInvalid);
      return;
    }
    if (volume == null || volume <= 0) {
      Alert.alert(fs.volumeRequired);
      return;
    }
    if (pricePerUnit == null || pricePerUnit <= 0) {
      Alert.alert(fs.priceRequired);
      return;
    }
    if (totalCost == null || totalCost <= 0) {
      Alert.alert(fs.totalRequired);
      return;
    }

    const entryDate = startOfDay(date).getTime();
    const todayEnd = startOfDay(new Date()).getTime();
    if (entryDate > todayEnd) {
      Alert.alert(fs.futureDateForbidden);
      return;
    }

    const currentMax = await getCurrentOdometer(
      db,
      vehicle.id,
      vehicle.initialOdometer,
      existing?.id,
    );

    const warnings: string[] = [];
    if (odometer < currentMax - 0.01) {
      warnings.push(fs.warnOdometerDecrease);
    }
    if (odometer - currentMax > MAX_ODOMETER_JUMP_KM) {
      warnings.push(fs.warnOdometerJump);
    }
    if (
      vehicle.tankCapacity != null &&
      volume > vehicle.tankCapacity + 0.01
    ) {
      warnings.push(fs.warnOverTank);
    }

    const save = async () => {
      setSaving(true);
      try {
        const log: FuelLog = {
          id: existing?.id ?? createId(),
          vehicleId: vehicle.id,
          date: entryDate,
          odometer,
          volume,
          pricePerUnit,
          totalCost,
          fullTank,
          note: note.trim() || undefined,
        };
        if (existing) {
          await updateFuelLog(db, log);
        } else {
          await insertFuelLog(db, log);
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

    Alert.alert(fs.warningsTitle, warnings.join("\n\n"), [
      { text: strings.common.cancel, style: "cancel" },
      { text: fs.saveAnyway, onPress: () => save() },
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
            {fs.save}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>{fs.date}</Text>
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

        <Field label={fs.odometer}>
          <TextInput
            style={styles.input}
            value={odometerText}
            onChangeText={setOdometerText}
            keyboardType="decimal-pad"
          />
        </Field>
        <Field label={fs.volumeLiters}>
          <TextInput
            style={styles.input}
            value={volumeText}
            onChangeText={onVolumeChange}
            keyboardType="decimal-pad"
          />
        </Field>
        <Field label={fs.pricePerLiter}>
          <TextInput
            style={styles.input}
            value={priceText}
            onChangeText={onPriceChange}
            keyboardType="decimal-pad"
          />
        </Field>
        <Field label={fs.total}>
          <TextInput
            style={styles.input}
            value={totalText}
            onChangeText={onTotalChange}
            keyboardType="decimal-pad"
          />
        </Field>

        <View style={styles.switchRow}>
          <Text style={styles.label}>{fs.fullTank}</Text>
          <Switch value={fullTank} onValueChange={setFullTank} />
        </View>

        <Field label={fs.note}>
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={note}
            onChangeText={setNote}
            multiline
          />
        </Field>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
