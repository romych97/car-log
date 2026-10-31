import { useMemo } from "react";
import { useColorScheme } from "react-native";

import { useSettingsStore } from "@/store/settingsStore";
import {
  darkColors,
  lightColors,
  resolveIsDark,
  type AppColors,
  type AppThemeMode,
} from "@/theme/colors";

export function useAppTheme(): {
  colors: AppColors;
  isDark: boolean;
  themeMode: AppThemeMode;
} {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useColorScheme();
  const isDark = resolveIsDark(themeMode, systemScheme);
  const colors = isDark ? darkColors : lightColors;
  return useMemo(
    () => ({ colors, isDark, themeMode }),
    [colors, isDark, themeMode],
  );
}
