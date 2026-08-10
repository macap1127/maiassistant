import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// --- Mocks -----------------------------------------------------------------

const badEvents = [
  { id: "1", title: "Missing date", date: undefined as unknown as string, time: "", location: "", notes: "", source: "School" },
  { id: "2", title: "Empty date", date: "", time: "", location: "", notes: "", source: null as unknown as string },
  { id: "3", title: "Garbage date", date: "not-a-date", time: "99:99", location: "", notes: "", source: "Unknown Source" },
  { id: "4", title: "Null date", date: null as unknown as string, time: null as unknown as string, location: "", notes: "" },
  { id: "5", title: "Partial date", date: "2026-13-45", time: "", location: "", notes: "", source: "Sports" },
];

const badTasks = [
  { id: "t1", title: "No due", done: false, dueDate: undefined as unknown as string },
  { id: "t2", title: "Bad due", done: false, dueDate: "nope" },
];

vi.mock("@/lib/store", () => ({
  genId: () => "id",
  useFamilyData: () => ({
    data: { events: badEvents, tasks: badTasks, members: [] },
    update: vi.fn(),
  }),
}));

vi.mock("@/lib/useHousehold", () => ({
  useHousehold: () => ({ household: null, loading: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    from: () => ({ select: () => ({ eq: () => ({ data: [], error: null }) }) }),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? k }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ---------------------------------------------------------------------------

import CalendarPage from "./CalendarPage";

describe("CalendarPage resilience", () => {
  beforeEach(() => vi.clearAllMocks();
  );

  it("renders without throwing when event/task dates are malformed", () => {
    expect(() => render(<CalendarPage />)).not.toThrow();
  });

  it("still renders the month grid", () => {
    render(<CalendarPage />);
    // Weekday header row should be present -> grid rendered, no crash
    expect(screen.getAllByText(/Sun|weekdaySun/).length).toBeGreaterThan(0);
  });
});
