import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useAppTheme } from "@/hooks/useAppTheme";

export function ThemedNavigation() {
  const { colors, isDark } = useAppTheme();

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="vehicle/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="vehicle/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="fuel/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="fuel/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="expense/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="expense/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="reminder/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="reminder/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="reminder/complete/[id]"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen name="settings" />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}
