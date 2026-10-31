import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";

import { VehiclePickerModal } from "@/components/VehiclePickerModal";
import { setSelectedVehicleId } from "@/db/repositories/settings";
import { useVehicleOdometer, useVehicles } from "@/hooks/useVehicles";
import { t } from "@/i18n/translations";
import { useSettingsStore } from "@/store/settingsStore";

export default function HomeScreen() {
  const db = useSQLiteContext();
  const language = useSettingsStore((s) => s.language);
  const selectedVehicleId = useSettingsStore((s) => s.selectedVehicleId);
  const isPremium = useSettingsStore((s) => s.isPremium);
  const setSelected = useSettingsStore((s) => s.setSelectedVehicleId);
  const strings = useMemo(() => t(language), [language]);

  const { vehicles, refresh } = useVehicles();
  const selectedVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) ?? null;
  const { odometer, refresh: refreshOdometer } =
    useVehicleOdometer(selectedVehicle);

  const [pickerOpen, setPickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useFocusEffect(
    useCallback(() => {
      refreshOdometer();
    }, [refreshOdometer]),
  );

  const onSelectVehicle = useCallback(
    async (id: string) => {
      setSelected(id);
      await setSelectedVehicleId(db, id);
    },
    [db, setSelected],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>{strings.home.title}</Text>
        <Link href="/settings" asChild>
          <Pressable hitSlop={8}>
            <Text style={styles.link}>{strings.home.settings}</Text>
          </Pressable>
        </Link>
      </View>

      {!selectedVehicle ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{strings.home.noVehicleTitle}</Text>
          <Text style={styles.emptyBody}>{strings.home.noVehicleBody}</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/vehicle/new")}
          >
            <Text style={styles.primaryButtonText}>
              {strings.home.addVehicle}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
            style={styles.card}
            onPress={() =>
              vehicles.length > 1 ? setPickerOpen(true) : undefined
            }
          >
            <Text style={styles.cardLabel}>{selectedVehicle.name}</Text>
            {(selectedVehicle.make || selectedVehicle.model) && (
              <Text style={styles.cardMeta}>
                {[selectedVehicle.make, selectedVehicle.model]
                  .filter(Boolean)
                  .join(" ")}
              </Text>
            )}
            <Text style={styles.odometerLabel}>
              {strings.home.currentOdometer}
            </Text>
            <Text style={styles.odometerValue}>
              {odometer != null
                ? `${Math.round(odometer).toLocaleString()} ${strings.common.km}`
                : "—"}
            </Text>
            {vehicles.length > 1 && (
              <Text style={styles.tapHint}>{strings.home.selectVehicle}</Text>
            )}
          </Pressable>

          <Text style={styles.placeholder}>{strings.home.placeholderStats}</Text>

          {(isPremium || vehicles.length < 1) && (
            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/vehicle/new")}
            >
              <Text style={styles.secondaryButtonText}>
                {strings.home.addVehicle}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      <VehiclePickerModal
        visible={pickerOpen}
        vehicles={vehicles}
        onClose={() => setPickerOpen(false)}
        onSelect={(v) => onSelectVehicle(v.id)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f5f7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  link: {
    fontSize: 16,
    color: "#208AEF",
  },
  empty: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 16,
    color: "#444",
    lineHeight: 22,
    marginBottom: 24,
  },
  content: {
    padding: 16,
    gap: 16,
  },
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
  cardLabel: {
    fontSize: 20,
    fontWeight: "600",
  },
  cardMeta: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  odometerLabel: {
    marginTop: 16,
    fontSize: 14,
    color: "#666",
  },
  odometerValue: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
  },
  tapHint: {
    marginTop: 12,
    fontSize: 13,
    color: "#208AEF",
  },
  placeholder: {
    fontSize: 15,
    color: "#666",
    lineHeight: 21,
  },
  primaryButton: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#208AEF",
  },
  secondaryButtonText: {
    color: "#208AEF",
    fontSize: 16,
    fontWeight: "600",
  },
});
