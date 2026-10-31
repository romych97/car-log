export type AppThemeMode = "light" | "dark" | "system";

export type AppColors = {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  tint: string;
  tabBar: string;
  tabBarBorder: string;
  optionSelected: string;
  chartBackground: string;
  chartAxis: string;
  categoryTrack: string;
  cardShadow: string;
};

export const lightColors: AppColors = {
  background: "#f5f5f7",
  surface: "#ffffff",
  text: "#000000",
  textSecondary: "#333333",
  textMuted: "#666666",
  border: "#e5e5ea",
  tint: "#208AEF",
  tabBar: "#ffffff",
  tabBarBorder: "#e5e5ea",
  optionSelected: "#E6F4FE",
  chartBackground: "#ffffff",
  chartAxis: "#666666",
  categoryTrack: "#EFEFF0",
  cardShadow: "#000000",
};

export const darkColors: AppColors = {
  background: "#000000",
  surface: "#1C1C1E",
  text: "#ffffff",
  textSecondary: "#E5E5EA",
  textMuted: "#98989D",
  border: "#38383A",
  tint: "#0A84FF",
  tabBar: "#1C1C1E",
  tabBarBorder: "#38383A",
  optionSelected: "#1E3A5F",
  chartBackground: "#1C1C1E",
  chartAxis: "#98989D",
  categoryTrack: "#2C2C2E",
  cardShadow: "#000000",
};

export function resolveIsDark(
  mode: AppThemeMode,
  systemScheme: "light" | "dark" | null | undefined,
): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return systemScheme === "dark";
}
