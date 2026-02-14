import { useState } from "react";
import { Plus, Check, Trash2 } from "lucide-react";
import { useFamilyData, genId } from "@/lib/store";

const Tasks = () => {
  const { data, update } = useFamilyData();
  const [newTask, setNewTask] = useState("");

  const addTask = () => {
    const title = newTask.trim();
    if (!title) return;
    update((d) => ({
      ...d,
      tasks: [
        ...d.tasks,
        { id: genId(), title, assignedTo: "You", dueDate: "Today", completed: false },
      ],
    }));
    setNewTask("");
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

  const pending = data.tasks.filter((t) => !t.completed);
  const completed = data.tasks.filter((t) => t.completed);

  return (
    <div className="page-container">
      <h1 className="text-2xl font-serif font-semibold mb-1 animate-fade-in">Tasks & Reminders</h1>
      <p className="text-sm text-muted-foreground mb-6 animate-fade-in">
        {pending.length} pending
      </p>

      <div className="flex gap-2 mb-6 animate-slide-up">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task..."
          className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={addTask}
          className="bg-primary text-primary-foreground rounded-xl px-4 flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2 mb-6">
        {pending.map((task, i) => (
          <div
            key={task.id}
            className="bg-card rounded-xl p-3 border border-border flex items-center gap-3 animate-slide-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <button
              onClick={() => toggle(task.id)}
              className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center shrink-0 transition-colors hover:bg-primary/10"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                {task.assignedTo} · {task.dueDate}
              </p>
            </div>
            <button
              onClick={() => remove(task.id)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {completed.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">
            Done ({completed.length})
          </p>
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
                <p className="text-sm line-through">{task.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
