import type { Expense, FuelLog } from "@/types/models";

export type JournalEntry =
  | { kind: "fuel"; id: string; date: number; data: FuelLog }
  | { kind: "expense"; id: string; date: number; data: Expense };

export function mergeJournalEntries(
  fuelLogs: FuelLog[],
  expenses: Expense[],
): JournalEntry[] {
  const fuel: JournalEntry[] = fuelLogs.map((data) => ({
    kind: "fuel" as const,
    id: `fuel:${data.id}`,
    date: data.date,
    data,
  }));
  const ex: JournalEntry[] = expenses.map((data) => ({
    kind: "expense" as const,
    id: `expense:${data.id}`,
    date: data.date,
    data,
  }));
  return [...fuel, ...ex].sort(
    (a, b) => b.date - a.date || b.id.localeCompare(a.id),
  );
}

export type JournalFilter = "all" | "fuel" | "expense";

export function filterJournalEntries(
  entries: JournalEntry[],
  filter: JournalFilter,
): JournalEntry[] {
  if (filter === "all") return entries;
  return entries.filter((e) => e.kind === filter);
}
