import { AppTextInput } from "@/components/AppTextInput";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  archiveVehicle,
  getVehicleById,
  listActiveVehicles,
  updateVehicle,
} from "@/db/repositories/vehicles";
import { setSelectedVehicleId } from "@/db/repositories/settings";
import { useUnitFormat } from "@/hooks/useUnitFormat";
import { t } from "@/i18n/translations";
import { useSettingsStore } from "@/store/settingsStore";
import { kmToDisplay, litersToDisplay } from "@/utils/units";
import type { FuelType, Vehicle } from "@/types/models";

const FUEL_TYPES: FuelType[] = ["petrol", "diesel", "lpg", "other"];

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

export default function EditVehicleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const language = useSettingsStore((s) => s.language);
  const selectedId = useSettingsStore((s) => s.selectedVehicleId);
  const setSelected = useSettingsStore((s) => s.setSelectedVehicleId);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const volumeUnit = useSettingsStore((s) => s.volumeUnit);
  const strings = useMemo(() => t(language), [language]);
  const vs = strings.vehicle;
  const uf = useUnitFormat();
  const u = strings.units;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [name, setName] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("petrol");
  const [tankCapacity, setTankCapacity] = useState("");
  const [initialOdometer, setInitialOdometer] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getVehicleById(db, id).then((v) => {
      if (!v) return;
      setVehicle(v);
      setName(v.name);
      setMake(v.make ?? "");
      setModel(v.model ?? "");
      setYear(v.year != null ? String(v.year) : "");
      setFuelType(v.fuelType);
      setTankCapacity(
        v.tankCapacity != null
          ? String(Math.round(litersToDisplay(v.tankCapacity, volumeUnit) * 10) / 10)
          : "",
      );
      setInitialOdometer(String(Math.round(kmToDisplay(v.initialOdometer, distanceUnit))));
    });
  }, [db, distanceUnit, id, volumeUnit]);

  async function onSave() {
    if (!vehicle || !name.trim()) {
      Alert.alert(vs.nameRequired);
      return;
    }
    const odometer = uf.parseDistanceInput(initialOdometer);
    if (odometer == null || odometer < 0) {
      Alert.alert(vs.odometerInvalid);
      return;
    }
    const yearNum = parseOptionalNumber(year);
    const tank = uf.parseTankCapacityInput(tankCapacity);

    setSaving(true);
    try {
      const next: Vehicle = {
        ...vehicle,
        name: name.trim(),
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        year: yearNum != null ? Math.round(yearNum) : undefined,
        fuelType,
        tankCapacity: tank,
        initialOdometer: odometer,
      };
      await updateVehicle(db, next);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function onArchive() {
    if (!vehicle) return;
    Alert.alert(vs.archiveConfirmTitle, vs.archiveConfirmMessage, [
      { text: strings.common.cancel, style: "cancel" },
      {
        text: vs.archive,
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            await archiveVehicle(db, vehicle.id);
            if (selectedId === vehicle.id) {
              const active = await listActiveVehicles(db);
              const nextId = active[0]?.id ?? null;
              await setSelectedVehicleId(db, nextId);
              setSelected(nextId);
            }
            router.replace("/(tabs)/vehicles");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  if (!vehicle) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: vs.editTitle }} />
        <Text style={styles.loading}>{strings.common.loading}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: vs.editTitle }} />
      <View style={styles.toolbar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.link}>{strings.common.cancel}</Text>
        </Pressable>
        <Pressable onPress={onSave} disabled={saving} hitSlop={8}>
          <Text style={[styles.link, saving && styles.linkDisabled]}>
            {vs.save}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <Field label={vs.name}>
            <AppTextInput style={styles.input} value={name} onChangeText={setName} />
          </Field>
          <Field label={vs.make}>
            <AppTextInput style={styles.input} value={make} onChangeText={setMake} />
          </Field>
          <Field label={vs.model}>
            <AppTextInput style={styles.input} value={model} onChangeText={setModel} />
          </Field>
          <Field label={vs.year}>
            <AppTextInput
              style={styles.input}
              value={year}
              onChangeText={setYear}
              keyboardType="number-pad"
            />
          </Field>
          <Text style={styles.label}>{vs.fuelType}</Text>
          <View style={styles.chips}>
            {FUEL_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[styles.chip, fuelType === type && styles.chipActive]}
                onPress={() => setFuelType(type)}
              >
                <Text
                  style={[
                    styles.chipText,
                    fuelType === type && styles.chipTextActive,
                  ]}
                >
                  {vs.fuel[type]}
                </Text>
              </Pressable>
            ))}
          </View>
          <Field label={uf.volumeUnit === "gal" ? u.tankGal : u.tankL}>
            <AppTextInput
              style={styles.input}
              value={tankCapacity}
              onChangeText={setTankCapacity}
              keyboardType="decimal-pad"
            />
          </Field>
          <Field
            label={uf.distanceUnit === "mi" ? u.odometerMi : u.odometerKm}
          >
            <AppTextInput
              style={styles.input}
              value={initialOdometer}
              onChangeText={setInitialOdometer}
              keyboardType="decimal-pad"
            />
          </Field>
          {!vehicle.archived && (
            <Pressable style={styles.archiveBtn} onPress={onArchive}>
              <Text style={styles.archiveText}>{vs.archive}</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  safe: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  loading: { padding: 24, fontSize: 16 },
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
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  chipActive: { backgroundColor: "#208AEF" },
  chipText: { fontSize: 14, color: "#333" },
  chipTextActive: { color: "#fff" },
  archiveBtn: { marginTop: 24, paddingVertical: 14, alignItems: "center" },
  archiveText: { color: "#D32F2F", fontSize: 17, fontWeight: "600" },
});
