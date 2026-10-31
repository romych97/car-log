import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
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
import { t } from "@/i18n/translations";
import { useSettingsStore } from "@/store/settingsStore";
import {
  formatReminderDueLine,
  reminderStatusColor,
} from "@/utils/reminderFormat";

export default function MaintenanceScreen() {
  const db = useSQLiteContext();
  const language = useSettingsStore((s) => s.language);
  const vehicleId = useSettingsStore((s) => s.selectedVehicleId);
  const strings = useMemo(() => t(language), [language]);
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
                    {formatReminderDueLine(
                      item.evaluation,
                      language,
                      strings.common.km,
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f7" },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  listEmpty: { flexGrow: 1, padding: 16 },
  empty: { flex: 1, padding: 24, justifyContent: "center" },
  emptyText: { fontSize: 16, color: "#444" },
  emptyBlock: { paddingVertical: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  emptyBody: { fontSize: 15, color: "#666", lineHeight: 22 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: { fontSize: 17, fontWeight: "600", flex: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  cardMeta: { marginTop: 8, fontSize: 14, color: "#555" },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  doneButton: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  doneButtonText: { color: "#fff", fontWeight: "600" },
  editLink: { color: "#208AEF", fontSize: 15 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#f5f5f7",
  },
  primary: {
    backgroundColor: "#208AEF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
