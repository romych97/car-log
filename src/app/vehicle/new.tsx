import { AppTextInput } from "@/components/AppTextInput";
import { FormField } from "@/components/FormField";
import { router, Stack } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  countActiveVehicles,
  insertVehicle,
} from "@/db/repositories/vehicles";
import { setSelectedVehicleId } from "@/db/repositories/settings";
import { useAppTheme } from "@/hooks/useAppTheme";
import { t } from "@/i18n/translations";
import { useUnitFormat } from "@/hooks/useUnitFormat";
import { createFormScreenStyles } from "@/theme/screenStyles";
import { useSettingsStore } from "@/store/settingsStore";
import type { FuelType } from "@/types/models";
import { createId } from "@/utils/id";

const FUEL_TYPES: FuelType[] = ["petrol", "diesel", "lpg", "other"];

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

export default function NewVehicleScreen() {
  const db = useSQLiteContext();
  const { colors } = useAppTheme();
  const styles = useMemo(
    () => createFormScreenStyles(colors),
    [colors],
  );
  const language = useSettingsStore((s) => s.language);
  const isPremium = useSettingsStore((s) => s.isPremium);
  const setSelected = useSettingsStore((s) => s.setSelectedVehicleId);
  const strings = useMemo(() => t(language), [language]);
  const vs = strings.vehicle;
  const uf = useUnitFormat();
  const u = strings.units;

  const [name, setName] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("petrol");
  const [tankCapacity, setTankCapacity] = useState("");
  const [initialOdometer, setInitialOdometer] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!name.trim()) {
      Alert.alert(vs.nameRequired);
      return;
    }
    if (!initialOdometer.trim()) {
      Alert.alert(vs.odometerRequired);
      return;
    }
    const odometer = uf.parseDistanceInput(initialOdometer);
    if (odometer == null || odometer < 0) {
      Alert.alert(vs.odometerInvalid);
      return;
    }

    const activeCount = await countActiveVehicles(db);
    if (!isPremium && activeCount >= 1) {
      Alert.alert(vs.freeLimit);
      return;
    }

    const yearNum = parseOptionalNumber(year);
    const tank = uf.parseTankCapacityInput(tankCapacity);

    setSaving(true);
    try {
      const id = createId();
      await insertVehicle(db, {
        id,
        name: name.trim(),
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        year: yearNum != null ? Math.round(yearNum) : undefined,
        fuelType,
        tankCapacity: tank,
        initialOdometer: odometer,
        archived: false,
      });
      await setSelectedVehicleId(db, id);
      setSelected(id);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: vs.newTitle }} />
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
          <FormField label={vs.name} styles={styles}>
            <AppTextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={vs.namePlaceholder}
              autoCapitalize="words"
            />
          </FormField>
          <FormField label={vs.make} styles={styles}>
            <AppTextInput style={styles.input} value={make} onChangeText={setMake} />
          </FormField>
          <FormField label={vs.model} styles={styles}>
            <AppTextInput style={styles.input} value={model} onChangeText={setModel} />
          </FormField>
          <FormField label={vs.year} styles={styles}>
            <AppTextInput
              style={styles.input}
              value={year}
              onChangeText={setYear}
              keyboardType="number-pad"
            />
          </FormField>
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
          <FormField
            label={uf.volumeUnit === "gal" ? u.tankGal : u.tankL}
            styles={styles}
          >
            <AppTextInput
              style={styles.input}
              value={tankCapacity}
              onChangeText={setTankCapacity}
              keyboardType="decimal-pad"
            />
          </FormField>
          <FormField
            label={
              uf.distanceUnit === "mi" ? u.odometerMi : u.odometerKm
            }
            styles={styles}
          >
            <AppTextInput
              style={styles.input}
              value={initialOdometer}
              onChangeText={setInitialOdometer}
              keyboardType="decimal-pad"
            />
          </FormField>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
