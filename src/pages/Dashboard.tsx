import { useEffect, useMemo, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { todayISO, bucketForDate, formatDueLabel } from "@/lib/date";
import maiLogo from "@/assets/mai-logo.png";
import { useTranslation } from "react-i18next";

const greetingKeyFor = () => {
  const h = new Date().getHours();
  if (h < 5) return "dash.night";
  if (h < 12) return "dash.morning";
  if (h < 17) return "dash.afternoon";
  if (h < 21) return "dash.evening";
  return "dash.night";
};

const firstNameFrom = (name?: string | null) => {
  const first = String(name || "there").trim().split(/[\s._-]+/)[0] || "there";
  return first.charAt(0).toUpperCase() + first.slice(1);
};

const digitsOnly = (value?: string | null) => String(value || "").replace(/\D/g, "");

const Dashboard = () => {
  const navigate = useNavigate();
  const { data, loading } = useFamilyData();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [linkedMemberName, setLinkedMemberName] = useState("");
  const [loggedInMemberName, setLoggedInMemberName] = useState("");

  // Primary source: family_members row explicitly linked to this user via user_id
  useEffect(() => {
    if (!user?.id) {
      setLinkedMemberName("");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: linked } = await supabase
        .from("family_members")
        .select("name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setLinkedMemberName(linked?.name || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, data.members]);

  const directMemberName = useMemo(() => {
    if (linkedMemberName) return linkedMemberName;
    const meta = (user?.user_metadata || {}) as Record<string, unknown>;
    const userPhone = digitsOnly(user?.phone || meta.phone as string | undefined || meta.phone_number as string | undefined);
    const emailHandle = String(user?.email || "").split("@")[0].toLowerCase();
    const emailParts = emailHandle.split(/[._-]+/).filter(Boolean);

    return (
      data.members.find((member) => {
        const memberPhone = digitsOnly(member.phone);
        return userPhone && memberPhone && memberPhone.endsWith(userPhone.slice(-10));
      })?.name ||
      data.members.find((member) => {
        const memberFirst = firstNameFrom(member.name).toLowerCase();
        return memberFirst && (emailParts.includes(memberFirst) || emailHandle.includes(memberFirst));
      })?.name ||
      ""
    );
  }, [data.members, user, linkedMemberName]);

  useEffect(() => {
    if (!user?.id || data.members.length === 0 || directMemberName) {
      setLoggedInMemberName("");
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: memberships } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .limit(1);

      const householdId = memberships?.[0]?.household_id;
      if (!householdId) return;

      const { data: householdMembers } = await supabase
        .from("household_members")
        .select("user_id, created_at")
        .eq("household_id", householdId)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      const loginIndex = householdMembers?.findIndex((member) => member.user_id === user.id) ?? -1;
      setLoggedInMemberName(loginIndex >= 0 ? data.members[loginIndex]?.name || "" : "");
    })();

    return () => {
      cancelled = true;
    };
  }, [data.members, directMemberName, user?.id]);

  const displayName = firstNameFrom(directMemberName || loggedInMemberName || (data.members.length === 1 ? data.members[0].name : ""));

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
          {t("dash.loadingFamily")}
        </p>
      </div>
    );
  }

  const quickCards = [
    {
      icon: ShoppingCart,
      label: t("dash.groceries"),
      count: pendingGroceries,
      sub: t("dash.toGet"),
      path: "/grocery",
    },
    {
      icon: CheckSquare,
      label: t("dash.todo"),
      count: pendingTasks,
      sub: t("dash.pending"),
      path: "/tasks",
    },
    {
      icon: CalendarIcon,
      label: t("dash.eventsToday"),
      count: todaysEvents.length,
      sub: t("dash.scheduled"),
      path: "/calendar",
    },
    {
      icon: Users,
      label: t("dash.family"),
      count: data.members.length,
      sub: t("dash.members"),
      path: "/family",
    },
  ];

  return (
    <div className="page-container">
      {/* Landing hero */}
      <div className="flex flex-col items-center text-center mb-8 mt-2 animate-fade-in">
        <div className="relative mb-4">
          <img src={maiLogo} alt="MIA" className="w-28 h-28 rounded-3xl relative z-10" />
          <div className="absolute inset-0 rounded-3xl blur-2xl bg-gradient-brand opacity-70 scale-110" />
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono-tech">
          {t(greetingKeyFor())}
        </p>
        <h1 className="text-3xl font-display font-bold tracking-tight mt-1">
          <span dangerouslySetInnerHTML={{ __html: "" }} />
          {t("dash.welcomeBack", { name: "" }).replace("{{name}}", "")}
          <span className="text-gradient">{displayName}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-xs leading-relaxed">
          {t("dash.tagline", { family: data.familyName })}
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
            {t("dash.progress")}
          </p>
          <div className="space-y-3">
            {weekTotalTasks > 0 && (
              <ProgressRow
                label={t("dash.todo")}
                done={weekDoneTasks}
                total={weekTotalTasks}
                value={taskProgress}
              />
            )}
            {groceryTotal > 0 && (
              <ProgressRow
                label={t("dash.groceries")}
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
          <h2 className="text-lg font-serif font-semibold">{t("dash.today")}</h2>
          <button
            onClick={() => navigate("/tasks")}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> {t("dash.addTodo")}
          </button>
        </div>

        {todaysEvents.length === 0 && todaysTasks.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("dash.nothingToday")}
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
