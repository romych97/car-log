import { addMonths, startOfDay } from "date-fns";

import {
  evaluateReminder,
  MIN_DAYS_FOR_KM_ESTIMATE,
} from "@/domain/reminders/status";
import type { Reminder } from "@/types/models";

describe("evaluateReminder", () => {
  const now = startOfDay(new Date("2026-10-31")).getTime();

  it("marks overdue when odometer passed km target", () => {
    const reminder: Reminder = {
      id: "1",
      vehicleId: "v",
      title: "Oil",
      everyKm: 10_000,
      everyMonths: 12,
      lastOdometer: 0,
      lastDate: now - 30 * 86400000,
      notificationIds: [],
    };
    const result = evaluateReminder(reminder, 10_500, 100, 30, now);
    expect(result.status).toBe("overdue");
  });

  it("uses date only when odometer history span is under 14 days", () => {
    const lastDate = addMonths(new Date(now), -12).getTime();
    const reminder: Reminder = {
      id: "1",
      vehicleId: "v",
      title: "Oil",
      everyKm: 10_000,
      everyMonths: 12,
      lastOdometer: 0,
      lastDate,
      notificationIds: [],
    };
    const result = evaluateReminder(reminder, 1000, 200, 5, now);
    expect(result.status).toBe("soon");
    expect(result.dueAtMs).toBe(startOfDay(addMonths(new Date(lastDate), 12)).getTime());
  });

  it("marks soon within 500 km", () => {
    const reminder: Reminder = {
      id: "1",
      vehicleId: "v",
      title: "Oil",
      everyKm: 10_000,
      lastOdometer: 0,
      lastDate: now,
      notificationIds: [],
    };
    const result = evaluateReminder(reminder, 9600, 50, MIN_DAYS_FOR_KM_ESTIMATE, now);
    expect(result.status).toBe("soon");
    expect(result.kmRemaining).toBe(400);
  });
});
