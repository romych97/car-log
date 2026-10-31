import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";

import type { ReminderEvaluation } from "@/domain/reminders/status";
import type { AppLanguage } from "@/types/models";

export function formatReminderDueLine(
  evaluation: ReminderEvaluation,
  language: AppLanguage,
  formatKmRemaining: (km: number) => string,
): string {
  const parts: string[] = [];
  if (evaluation.kmRemaining != null) {
    parts.push(`~${formatKmRemaining(evaluation.kmRemaining)}`);
  }
  if (evaluation.daysRemaining != null) {
    const locale = language === "ru" ? ru : enUS;
    if (evaluation.dueAtMs != null) {
      parts.push(format(evaluation.dueAtMs, "d MMM yyyy", { locale }));
    } else {
      parts.push(`${evaluation.daysRemaining} d`);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function reminderStatusColor(status: ReminderEvaluation["status"]): string {
  switch (status) {
    case "overdue":
      return "#D32F2F";
    case "soon":
      return "#F57C00";
    default:
      return "#2E7D32";
  }
}
