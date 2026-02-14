import { useState } from "react";
import { Plus, Check, Trash2 } from "lucide-react";
import { useFamilyData, genId } from "@/lib/store";

const GroceryList = () => {
  const { data, update } = useFamilyData();
  const [newItem, setNewItem] = useState("");

  const addItem = () => {
    const name = newItem.trim();
    if (!name) return;
    update((d) => ({
      ...d,
      groceryList: [
        ...d.groceryList,
        { id: genId(), name, quantity: "", addedBy: "You", completed: false },
      ],
    }));
    setNewItem("");
  };

  const toggle = (id: string) =>
    update((d) => ({
      ...d,
      groceryList: d.groceryList.map((g) =>
        g.id === id ? { ...g, completed: !g.completed } : g
      ),
    }));

  const remove = (id: string) =>
    update((d) => ({
      ...d,
      groceryList: d.groceryList.filter((g) => g.id !== id),
    }));

  const pending = data.groceryList.filter((g) => !g.completed);
  const completed = data.groceryList.filter((g) => g.completed);

  return (
    <div className="page-container">
      <h1 className="text-2xl font-serif font-semibold mb-1 animate-fade-in">Grocery List</h1>
      <p className="text-sm text-muted-foreground mb-6 animate-fade-in">
        {pending.length} items to get
      </p>

      {/* Add input */}
      <div className="flex gap-2 mb-6 animate-slide-up">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Add an item..."
          className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={addItem}
          className="bg-primary text-primary-foreground rounded-xl px-4 flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Pending */}
      <div className="space-y-2 mb-6">
        {pending.map((item, i) => (
          <div
            key={item.id}
            className="bg-card rounded-xl p-3 border border-border flex items-center gap-3 animate-slide-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <button
              onClick={() => toggle(item.id)}
              className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center shrink-0 transition-colors hover:bg-primary/10"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{item.name}</p>
              {item.quantity && (
                <p className="text-xs text-muted-foreground">{item.quantity}</p>
              )}
            </div>
            <button
              onClick={() => remove(item.id)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">
            Completed ({completed.length})
          </p>
          <div className="space-y-2">
            {completed.map((item) => (
              <div
                key={item.id}
                className="bg-card/50 rounded-xl p-3 border border-border flex items-center gap-3 opacity-60"
              >
                <button
                  onClick={() => toggle(item.id)}
                  className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0"
                >
                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                </button>
                <p className="text-sm line-through">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroceryList;
