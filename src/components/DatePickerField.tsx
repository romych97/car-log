import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useSettingsStore } from "@/store/settingsStore";
import { t } from "@/i18n/translations";

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
  locale: string;
};

export function DatePickerField({
  value,
  onChange,
  maximumDate = new Date(),
  locale,
}: Props) {
  const language = useSettingsStore((s) => s.language);
  const { colors } = useAppTheme();
  const strings = useMemo(() => t(language), [language]);
  const [open, setOpen] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        pressable: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 12,
          backgroundColor: colors.surface,
        },
        value: {
          flex: 1,
          fontSize: 16,
          fontWeight: "500",
          color: colors.text,
        },
        hint: {
          marginTop: 4,
          fontSize: 12,
          color: colors.textMuted,
        },
        chevron: {
          color: colors.tint,
        },
        done: {
          marginTop: 8,
          alignSelf: "flex-end",
          paddingVertical: 6,
          paddingHorizontal: 12,
        },
        doneText: {
          fontSize: 16,
          fontWeight: "600",
          color: colors.tint,
        },
      }),
    [colors],
  );

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") {
      setOpen(false);
    }
    if (event.type === "dismissed") {
      setOpen(false);
      return;
    }
    if (selected) {
      onChange(selected);
    }
  }

  return (
    <View>
      <Pressable
        style={styles.pressable}
        onPress={() => setOpen((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={strings.common.pickDateA11y}
      >
        <Ionicons
          name="calendar-outline"
          size={22}
          color={colors.tint}
        />
        <Text style={styles.value}>{value.toLocaleDateString(locale)}</Text>
        <Ionicons
          name="chevron-down"
          size={18}
          style={styles.chevron}
        />
      </Pressable>
      <Text style={styles.hint}>{strings.common.pickDateHint}</Text>
      {open ? (
        <>
          <DateTimePicker
            value={value}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={maximumDate}
            onChange={onPickerChange}
          />
          {Platform.OS === "ios" ? (
            <Pressable style={styles.done} onPress={() => setOpen(false)}>
              <Text style={styles.doneText}>{strings.common.done}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
