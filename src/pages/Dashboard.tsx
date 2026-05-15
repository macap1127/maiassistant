import { useMemo } from "react";
import {
  ShoppingCart,
  CheckSquare,
  Users,
  Calendar as CalendarIcon,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFamilyData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { todayISO, bucketForDate, formatDueLabel } from "@/lib/date";
import maiLogo from "@/assets/mai-logo.png";

const greetingFor = () => {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { data, loading } = useFamilyData();

  const today = todayISO();

  const todaysEvents = useMemo(
    () =>
      data.events
        .filter((e) => e.date === today)
        .sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    [data.events, today]
  );

  const todaysTasks = useMemo(
    () =>
      data.tasks
        .filter(
          (t) =>
            !t.completed &&
            (bucketForDate(t.dueDate) === "today" ||
              bucketForDate(t.dueDate) === "overdue")
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [data.tasks]
  );

  const pendingGroceries = data.groceryList.filter((g) => !g.completed).length;
  const pendingTasks = data.tasks.filter((t) => !t.completed).length;
  const memberAvatar = (name: string) =>
    data.members.find((m) => m.name === name)?.avatar || "👤";

  // Weekly progress
  const weekDoneTasks = data.tasks.filter((t) => t.completed).length;
  const weekTotalTasks = data.tasks.length;
  const taskProgress =
    weekTotalTasks > 0 ? (weekDoneTasks / weekTotalTasks) * 100 : 0;

  const groceryDone = data.groceryList.filter((g) => g.completed).length;
  const groceryTotal = data.groceryList.length;
  const groceryProgress =
    groceryTotal > 0 ? (groceryDone / groceryTotal) * 100 : 0;

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading family data…
        </p>
      </div>
    );
  }

  const quickCards = [
    {
      icon: ShoppingCart,
      label: "Groceries",
      count: pendingGroceries,
      sub: "to get",
      path: "/grocery",
    },
    {
      icon: CheckSquare,
      label: "To Do",
      count: pendingTasks,
      sub: "pending",
      path: "/tasks",
    },
    {
      icon: CalendarIcon,
      label: "Events today",
      count: todaysEvents.length,
      sub: "scheduled",
      path: "/calendar",
    },
    {
      icon: Users,
      label: "Family",
      count: data.members.length,
      sub: "members",
      path: "/family",
    },
  ];

  return (
    <div className="page-container">
      {/* Landing hero */}
      <div className="flex flex-col items-center text-center mb-8 mt-2 animate-fade-in">
        <div className="relative mb-4">
          <img src={maiLogo} alt="MAI" className="w-28 h-28 rounded-3xl relative z-10" />
          <div className="absolute inset-0 rounded-3xl blur-2xl bg-gradient-brand opacity-70 scale-110" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-mono-tech">
          {greetingFor()}
        </p>
        <h1 className="text-4xl font-display font-bold tracking-tight text-gradient mt-1">
          MAI
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Welcome back to <span className="text-foreground font-medium">{data.familyName}</span> — your AI-powered family command center.
        </p>
      </div>

      {/* Quick cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {quickCards.map(({ icon: Icon, label, count, sub, path }, i) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="bg-card rounded-2xl p-4 text-left border border-border hover:shadow-md hover:border-primary/30 transition-all animate-slide-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Icon className="w-5 h-5 text-primary mb-3" />
            <p className="text-2xl font-serif font-semibold">{count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sub} · {label}
            </p>
          </button>
        ))}
      </div>

      {/* Progress strip */}
      {(weekTotalTasks > 0 || groceryTotal > 0) && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 animate-slide-up">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Progress
          </p>
          <div className="space-y-3">
            {weekTotalTasks > 0 && (
              <ProgressRow
                label="To Do"
                done={weekDoneTasks}
                total={weekTotalTasks}
                value={taskProgress}
              />
            )}
            {groceryTotal > 0 && (
              <ProgressRow
                label="Groceries"
                done={groceryDone}
                total={groceryTotal}
                value={groceryProgress}
              />
            )}
          </div>
        </div>
      )}

      {/* Today panel */}
      <div
        className="animate-slide-up mb-6"
        style={{ animationDelay: "180ms" }}
      >
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-serif font-semibold">Today</h2>
          <button
            onClick={() => navigate("/tasks")}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add to-do
          </button>
        </div>

        {todaysEvents.length === 0 && todaysTasks.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing scheduled today. Enjoy the breathing room. 🌿
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaysEvents.map((e) => (
              <div
                key={e.id}
                className="bg-card rounded-xl p-3 border border-border flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-info/15 text-info flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.time || "All day"}
                    {e.location && ` · ${e.location}`}
                  </p>
                </div>
              </div>
            ))}
            {todaysTasks.slice(0, 5).map((task) => {
              const overdue = bucketForDate(task.dueDate) === "overdue";
              return (
                <div
                  key={task.id}
                  className="bg-card rounded-xl p-3 border border-border flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-base shrink-0">
                    {memberAvatar(task.assignedTo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.assignedTo} ·{" "}
                      <span
                        className={overdue ? "text-destructive" : "text-primary"}
                      >
                        {formatDueLabel(task.dueDate)}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function ProgressRow({
  label,
  done,
  total,
  value,
}: {
  label: string;
  done: number;
  total: number;
  value: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">
          {done}/{total}
        </span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default Dashboard;
