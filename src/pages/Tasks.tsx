import { useState, useMemo } from "react";
import { Plus, Check, Trash2, X, ChevronDown } from "lucide-react";
import { useFamilyData, genId } from "@/lib/store";
import { toast } from "sonner";

type FilterMode = "all" | "mine" | string;

const Tasks = () => {
  const { data, update } = useFamilyData();
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [collapsedDone, setCollapsedDone] = useState(true);

  const memberNames = data.members.map((m) => m.name);

  const addTask = () => {
    const title = newTitle.trim();
    if (!title) return;
    update((d) => ({
      ...d,
      tasks: [
        ...d.tasks,
        {
          id: genId(),
          title,
          assignedTo: newAssignee || "You",
          dueDate: "",
          completed: false,
        },
      ],
    }));
    setNewTitle("");
    setNewAssignee("");
  };

  const toggle = (id: string) =>
    update((d) => ({
      ...d,
      tasks: d.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    }));

  const remove = (id: string) =>
    update((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));

  const clearDone = () => {
    const count = data.tasks.filter((t) => t.completed).length;
    if (!count) return;
    update((d) => ({ ...d, tasks: d.tasks.filter((t) => !t.completed) }));
    toast.success(`Cleared ${count} item${count === 1 ? "" : "s"}`);
  };

  const filtered = useMemo(() => {
    return data.tasks.filter((t) => {
      if (filter === "all") return true;
      if (filter === "mine") return t.assignedTo === "You";
      return t.assignedTo === filter;
    });
  }, [data.tasks, filter]);

  const pending = filtered.filter((t) => !t.completed);
  const completed = filtered.filter((t) => t.completed);

  const memberAvatar = (name: string) =>
    data.members.find((m) => m.name === name)?.avatar || "👤";

  return (
    <div className="page-container">
      <div className="flex items-baseline justify-between mb-1 animate-fade-in">
        <h1 className="text-2xl font-serif font-semibold">To Do List</h1>
        {completed.length > 0 && (
          <button
            onClick={clearDone}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear done
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-5 animate-fade-in">
        {pending.length} to do
      </p>
      <p className="text-xs text-muted-foreground mb-3 -mt-3 animate-fade-in">
        Items with a date or time go on the calendar.
      </p>

      {/* Add card */}
      <div className="bg-card border border-border rounded-2xl p-3 mb-5 animate-slide-up space-y-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="What needs doing?"
          className="w-full bg-transparent px-2 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="flex gap-2 items-center">
          <select
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            className="flex-1 bg-background border border-border rounded-xl px-2 py-1.5 text-xs focus:outline-none"
          >
            <option value="">Assign to…</option>
            <option value="You">You</option>
            {memberNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            onClick={addTask}
            disabled={!newTitle.trim()}
            className="bg-primary text-primary-foreground rounded-xl px-3 py-1.5 flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-2 -mx-1 px-1 scrollbar-none">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterChip>
        <FilterChip
          active={filter === "mine"}
          onClick={() => setFilter("mine")}
        >
          Mine
        </FilterChip>
        {memberNames.map((n) => (
          <FilterChip
            key={n}
            active={filter === n}
            onClick={() => setFilter(n)}
          >
            {memberAvatar(n)} {n}
          </FilterChip>
        ))}
      </div>

      {/* Empty state */}
      {pending.length === 0 && completed.length === 0 && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-sm text-muted-foreground">
            All clear. Add an item above to get started.
          </p>
        </div>
      )}

      {/* Pending list */}
      {pending.length > 0 && (
        <div className="space-y-2 mb-6 animate-slide-up">
          {pending.map((task) => (
            <div
              key={task.id}
              className="bg-card rounded-xl p-3 border border-border flex items-center gap-3 group"
            >
              <button
                onClick={() => toggle(task.id)}
                className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center shrink-0 transition-colors hover:bg-primary/10"
                aria-label="Mark done"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs flex items-center gap-1">
                    <span>{memberAvatar(task.assignedTo)}</span>
                    <span className="text-muted-foreground">
                      {task.assignedTo}
                    </span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => remove(task.id)}
                className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Done section */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setCollapsedDone((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform ${collapsedDone ? "-rotate-90" : ""}`}
            />
            Done ({completed.length})
          </button>
          {!collapsedDone && (
            <div className="space-y-2">
              {completed.map((task) => (
                <div
                  key={task.id}
                  className="bg-card/50 rounded-xl p-3 border border-border flex items-center gap-3 opacity-60"
                >
                  <button
                    onClick={() => toggle(task.id)}
                    className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 text-primary-foreground" />
                  </button>
                  <p className="text-sm line-through flex-1 min-w-0 truncate">
                    {task.title}
                  </p>
                  <button
                    onClick={() => remove(task.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default Tasks;
