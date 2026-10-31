import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

import { t } from "@/i18n/translations";
import { useSettingsStore } from "@/store/settingsStore";

export default function TabLayout() {
  const language = useSettingsStore((s) => s.language);
  const strings = t(language);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#208AEF",
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: strings.tabs.home,
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={typeof color === "string" ? color : "#208AEF"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: strings.tabs.vehicles,
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="car-outline"
              size={size}
              color={typeof color === "string" ? color : "#208AEF"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: strings.tabs.journal,
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="list-outline"
              size={size}
              color={typeof color === "string" ? color : "#208AEF"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{
          title: strings.tabs.maintenance,
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="construct-outline"
              size={size}
              color={typeof color === "string" ? color : "#208AEF"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: strings.tabs.stats,
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="bar-chart-outline"
              size={size}
              color={typeof color === "string" ? color : "#208AEF"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
