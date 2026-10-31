import { SQLiteProvider } from "expo-sqlite";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppBootstrap } from "@/components/AppBootstrap";
import { migrateDbIfNeeded } from "@/db/migrate";

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="carlog.db" onInit={migrateDbIfNeeded}>
      <AppBootstrap>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="vehicle/new"
            options={{ presentation: "modal", headerShown: false }}
          />
          <Stack.Screen
            name="fuel/new"
            options={{ presentation: "modal", headerShown: false }}
          />
          <Stack.Screen
            name="fuel/[id]"
            options={{ presentation: "modal", headerShown: false }}
          />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
        </Stack>
        <StatusBar style="auto" />
      </AppBootstrap>
    </SQLiteProvider>
  );
}
