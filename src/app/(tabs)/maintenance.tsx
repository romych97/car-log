import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionSheetModal } from "@/components/ActionSheetModal";
import {
  REMINDER_TEMPLATES,
  type ReminderTemplateId,
} from "@/domain/reminders/templates";
import { useReminders } from "@/hooks/useReminders";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useUnitFormat } from "@/hooks/useUnitFormat";
import { t } from "@/i18n/translations";
import { createMaintenanceScreenStyles } from "@/theme/screenStyles";
import { useSettingsStore } from "@/store/settingsStore";
import {
  formatReminderDueLine,
  reminderStatusColor,
} from "@/utils/reminderFormat";

export default function MaintenanceScreen() {
  const db = useSQLiteContext();
  const language = useSettingsStore((s) => s.language);
  const vehicleId = useSettingsStore((s) => s.selectedVehicleId);
  const { colors } = useAppTheme();
  const styles = useMemo(
    () => createMaintenanceScreenStyles(colors),
    [colors],
  );
  const strings = useMemo(() => t(language), [language]);
  const uf = useUnitFormat();
  const rs = strings.reminder;
  const { items, refresh } = useReminders(db, vehicleId);
  const [addOpen, setAddOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const statusLabel = (status: "ok" | "soon" | "overdue") => {
    switch (status) {
      case "overdue":
        return rs.statusOverdue;
      case "soon":
        return rs.statusSoon;
      default:
        return rs.statusOk;
    }
  };

  const openTemplate = (templateId: ReminderTemplateId) => {
    router.push({
      pathname: "/reminder/new",
      params: { template: templateId },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{rs.screenTitle}</Text>
      </View>

      {!vehicleId ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{strings.home.noVehicleTitle}</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.reminder.id}
            style={{ flex: 1 }}
            contentContainerStyle={
              items.length === 0 ? styles.listEmpty : styles.list
            }
            ListEmptyComponent={
              <View style={styles.emptyBlock}>
                <Text style={styles.emptyTitle}>{rs.empty}</Text>
                <Text style={styles.emptyBody}>{rs.emptyBody}</Text>
              </View>
            }
            renderItem={({ item }) => {
              const color = reminderStatusColor(item.evaluation.status);
              return (
                <Pressable
                  style={styles.card}
                  onPress={() =>
                    router.push(`/reminder/${item.reminder.id}`)
                  }
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{item.reminder.title}</Text>
                    <View style={[styles.badge, { backgroundColor: color }]}>
                      <Text style={styles.badgeText}>
                        {statusLabel(item.evaluation.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardMeta}>
                    {formatReminderDueLine(item.evaluation, language, (km) =>
                      uf.formatDistance(km),
                    )}
                  </Text>
                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.doneButton}
                      onPress={() =>
                        router.push(`/reminder/complete/${item.reminder.id}`)
                      }
                    >
                      <Text style={styles.doneButtonText}>{rs.markDone}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        router.push(`/reminder/${item.reminder.id}`)
                      }
                    >
                      <Text style={styles.editLink}>{rs.edit}</Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            }}
          />

          <View style={styles.footer}>
            <Pressable
              style={styles.primary}
              onPress={() => setAddOpen(true)}
            >
              <Text style={styles.primaryText}>{rs.add}</Text>
            </Pressable>
          </View>
        </>
      )}

      <ActionSheetModal
        visible={addOpen}
        title={rs.pickTemplate}
        onClose={() => setAddOpen(false)}
        options={[
          ...REMINDER_TEMPLATES.map((tpl) => ({
            key: tpl.id,
            label: rs.templates[tpl.id],
            onPress: () => openTemplate(tpl.id),
          })),
          {
            key: "custom",
            label: rs.custom,
            onPress: () => router.push("/reminder/new"),
          },
        ]}
      />
    </SafeAreaView>
  );
}
