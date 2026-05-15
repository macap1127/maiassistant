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

// Format an "HH:MM" 24-hour time string to 12-hour with AM/PM (e.g. "14:30" -> "2:30 PM").
export function formatTime12h(time?: string | null): string {
  if (!time) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return time;
  let h = Number(m[1]);
  const mins = m[2];
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mins} ${period}`;
}
