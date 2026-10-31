import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SQLiteProvider } from "expo-sqlite";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";

import { AppBootstrap } from "@/components/AppBootstrap";
import { configureNotificationHandler } from "@/notifications/setup";
import { migrateDbIfNeeded } from "@/db/migrate";

configureNotificationHandler();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SQLiteProvider databaseName="carlog.db" onInit={migrateDbIfNeeded}>
        <AppBootstrap>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="vehicle/new"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="vehicle/[id]"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="fuel/new"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="fuel/[id]"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="expense/new"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="expense/[id]"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="reminder/new"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="reminder/[id]"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="reminder/complete/[id]"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen name="settings" />
          </Stack>
          <StatusBar style="auto" />
        </AppBootstrap>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
