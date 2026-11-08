import { AppTextInput } from "@/components/AppTextInput";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { DatePickerField } from "@/components/DatePickerField";
import { useSQLiteContext } from "expo-sqlite";
import { startOfDay } from "date-fns";

import { deleteFuelLog, insertFuelLog, updateFuelLog } from "@/db/repositories/fuelLogs";
import { getCurrentOdometer } from "@/db/repositories/vehicles";
import {
  MAX_ODOMETER_JUMP_KM,
  syncFuelFields,
  type FuelFieldKey,
} from "@/domain/fuel/calculations";
import { useAppTheme } from "@/hooks/useAppTheme";
import { t } from "@/i18n/translations";
import { useUnitFormat } from "@/hooks/useUnitFormat";
import { createFormScreenStyles } from "@/theme/screenStyles";
import type { FuelLog, Vehicle } from "@/types/models";
import { createId } from "@/utils/id";
import { formatMoneyMinor, parseMoneyToMinor } from "@/utils/money";

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
  const { colors } = useAppTheme();
  const styles = useMemo(
    () => createFormScreenStyles(colors),
    [colors],
  );
  const strings = useMemo(() => t(language), [language]);
  const fs = strings.fuel;
  const uf = useUnitFormat();
  const u = strings.units;

  const locale = language === "ru" ? "ru-RU" : "en-US";

  const [date, setDate] = useState(() =>
    existing ? new Date(existing.date) : new Date(),
  );
  const [odometerText, setOdometerText] = useState(() =>
    existing
      ? uf.formatDistanceInput(existing.odometer)
      : initialOdometer != null
        ? uf.formatDistanceInput(initialOdometer)
        : "",
  );
  const [volumeText, setVolumeText] = useState(() =>
    existing ? uf.formatVolumeInput(existing.volume) : "",
  );
  const [priceText, setPriceText] = useState(() =>
    existing
      ? uf.formatPricePerVolumeMinor(existing.pricePerUnit)
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
          volume: uf.parseVolumeInput(volume),
          pricePerUnit: uf.parsePricePerVolumeInput(price),
          totalCost: parseMoneyToMinor(total),
        },
        field,
      );

      if (field !== "volume" && synced.volume != null) {
        setVolumeText(uf.formatVolumeInput(synced.volume));
      }
      if (field !== "pricePerUnit" && synced.pricePerUnit != null) {
        setPriceText(uf.formatPricePerVolumeMinor(synced.pricePerUnit));
      }
      if (field !== "totalCost" && synced.totalCost != null) {
        setTotalText(formatMoneyMinor(synced.totalCost, locale));
      }
    },
    [locale, uf],
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
    const odometer = uf.parseDistanceInput(odometerText);
    const volume = uf.parseVolumeInput(volumeText);
    const pricePerUnit = uf.parsePricePerVolumeInput(priceText);
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

  function confirmDelete() {
    if (!existing) return;
    Alert.alert(fs.deleteConfirmTitle, fs.deleteConfirmMessage, [
      { text: strings.common.cancel, style: "cancel" },
      {
        text: fs.delete,
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            await deleteFuelLog(db, existing.id);
            onSaved();
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
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
        <DatePickerField
          value={date}
          onChange={setDate}
          locale={locale}
        />

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
        <Field label={uf.volumeUnit === "gal" ? u.volumeGal : u.volumeL}>
          <AppTextInput
            style={styles.input}
            value={volumeText}
            onChangeText={onVolumeChange}
            keyboardType="decimal-pad"
          />
        </Field>
        <Field
          label={
            uf.volumeUnit === "gal" ? u.pricePerGal : u.pricePerLiter
          }
        >
          <AppTextInput
            style={styles.input}
            value={priceText}
            onChangeText={onPriceChange}
            keyboardType="decimal-pad"
          />
        </Field>
        <Field label={fs.total}>
          <AppTextInput
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
            <Text style={styles.deleteText}>{fs.delete}</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
