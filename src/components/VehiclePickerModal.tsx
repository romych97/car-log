import { useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  FlatList,
} from "react-native";

import { useAppTheme } from "@/hooks/useAppTheme";
import { t } from "@/i18n/translations";
import { useSettingsStore } from "@/store/settingsStore";
import type { Vehicle } from "@/types/models";

type Props = {
  visible: boolean;
  vehicles: Vehicle[];
  onClose: () => void;
  onSelect: (vehicle: Vehicle) => void;
};

export function VehiclePickerModal({
  visible,
  vehicles,
  onClose,
  onSelect,
}: Props) {
  const language = useSettingsStore((s) => s.language);
  const { colors } = useAppTheme();
  const strings = useMemo(() => t(language), [language]);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
        },
        sheet: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "60%",
          paddingBottom: 24,
        },
        title: {
          fontSize: 18,
          fontWeight: "600",
          padding: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          color: colors.text,
        },
        row: {
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        rowTitle: {
          fontSize: 16,
          fontWeight: "500",
          color: colors.text,
        },
        rowSubtitle: {
          fontSize: 14,
          color: colors.textMuted,
          marginTop: 2,
        },
        cancel: {
          alignItems: "center",
          paddingTop: 16,
        },
        cancelText: {
          fontSize: 16,
          color: colors.tint,
        },
      }),
    [colors],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{strings.home.selectVehicle}</Text>
          <FlatList
            data={vehicles}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.rowTitle}>{item.name}</Text>
                {(item.make || item.model) && (
                  <Text style={styles.rowSubtitle}>
                    {[item.make, item.model].filter(Boolean).join(" ")}
                  </Text>
                )}
              </Pressable>
            )}
          />
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>{strings.common.cancel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
