import { StyleSheet } from "react-native";

import type { AppColors } from "@/theme/colors";

/** Shared tab-screen colors (extend locally for layout-specific styles). */
export function createTabScreenStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingVertical: 12 },
    title: { fontSize: 22, fontWeight: "700", color: colors.text },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    cardTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
    hint: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 12 },
    placeholder: {
      fontSize: 15,
      color: colors.textMuted,
      paddingVertical: 24,
    },
    emptyText: { fontSize: 16, color: colors.textSecondary },
  });
}

export function createStatsScreenStyles(colors: AppColors) {
  const base = createTabScreenStyles(colors);
  return StyleSheet.create({
    ...base,
    content: { padding: 16, gap: 16, paddingBottom: 32 },
    empty: { flex: 1, padding: 24, justifyContent: "center" },
    axisText: { fontSize: 10, color: colors.chartAxis },
    legend: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
    categoryChart: { gap: 12 },
    categoryRow: { gap: 6 },
    categoryLabel: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    categoryTrack: {
      height: 22,
      borderRadius: 6,
      backgroundColor: colors.categoryTrack,
      overflow: "hidden",
    },
    categoryFill: {
      height: "100%",
      borderRadius: 6,
      minWidth: 4,
    },
    categoryAmount: {
      fontSize: 13,
      color: colors.textMuted,
      alignSelf: "flex-end",
    },
  });
}

export function createSettingsScreenStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    backLink: { fontSize: 17, color: colors.tint, minWidth: 72 },
    toolbarTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
    toolbarSpacer: { minWidth: 72 },
    content: { padding: 16, paddingBottom: 40, gap: 8 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 8,
    },
    sectionGap: { marginTop: 20 },
    fieldLabel: { fontSize: 16, fontWeight: "600", marginTop: 12, color: colors.text },
    hint: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginTop: 4 },
    optionGroup: {
      marginTop: 8,
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    optionRowSelected: { backgroundColor: colors.optionSelected },
    optionLabel: { fontSize: 16, color: colors.text },
    optionCheck: { color: colors.tint, fontWeight: "700", fontSize: 18 },
    input: {
      marginTop: 8,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    cardTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
    rowButtons: { flexDirection: "row", gap: 12, marginTop: 12 },
    primaryBtn: {
      flex: 1,
      backgroundColor: colors.tint,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    primaryBtnText: { color: "#fff", fontWeight: "600" },
    secondaryBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.tint,
    },
    secondaryBtnText: { color: colors.tint, fontWeight: "600" },
    fullWidthBtn: { marginTop: 8 },
    btnDisabled: { opacity: 0.5 },
  });
}
