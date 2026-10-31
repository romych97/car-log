import { Stack } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { t } from "@/i18n/translations";
import { useSettingsStore } from "@/store/settingsStore";

export default function SettingsScreen() {
  const language = useSettingsStore((s) => s.language);
  const strings = useMemo(() => t(language), [language]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: strings.settings.title }} />
      <View style={styles.body}>
        <Text style={styles.text}>{strings.settings.comingSoon}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f7" },
  body: { flex: 1, padding: 16 },
  text: { fontSize: 16, color: "#444", lineHeight: 22 },
});
