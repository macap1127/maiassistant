// Small shared date helpers used by Tasks and Dashboard.

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export function compareDate(a: string, b: string) {
  // ISO strings compare lexicographically as dates.
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export type DueBucket = "overdue" | "today" | "upcoming" | "none";

export function bucketForDate(due: string): DueBucket {
  if (!due || !isISODate(due)) return "none";
  const t = todayISO();
  if (due < t) return "overdue";
  if (due === t) return "today";
  return "upcoming";
}

export function formatDueLabel(due: string): string {
  if (!due) return "No date";
  if (!isISODate(due)) return due; // legacy strings like "Today"
  const t = todayISO();
  if (due === t) return "Today";

  const [y, m, d] = due.split("-").map(Number);
  const dueDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) {
    return dueDate.toLocaleDateString(undefined, { weekday: "long" });
  }
  return dueDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
