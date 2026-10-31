import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SQLiteProvider } from "expo-sqlite";
import { StyleSheet } from "react-native";

import { AppBootstrap } from "@/components/AppBootstrap";
import { ThemedNavigation } from "@/components/ThemedNavigation";
import { configureNotificationHandler } from "@/notifications/setup";
import { migrateDbIfNeeded } from "@/db/migrate";

configureNotificationHandler();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SQLiteProvider databaseName="carlog.db" onInit={migrateDbIfNeeded}>
        <AppBootstrap>
          <ThemedNavigation />
        </AppBootstrap>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
