import { useState, useMemo } from "react";
import { Plus, Check, Trash2, Sparkles, ChevronDown, Trash, Store as StoreIcon } from "lucide-react";
import { useFamilyData, genId, type GroceryItem } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORY_ORDER = [
  "Produce",
  "Dairy",
  "Meat",
  "Bakery",
  "Pantry",
  "Frozen",
  "Beverages",
  "Household",
  "Other",
] as const;

const CATEGORY_EMOJI: Record<string, string> = {
  Produce: "🥬",
  Dairy: "🥛",
  Meat: "🍗",
  Bakery: "🥖",
  Pantry: "🥫",
  Frozen: "🧊",
  Beverages: "🧃",
  Household: "🧺",
  Other: "🛒",
};

const GroceryList = () => {
  const { data, update } = useFamilyData();
  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newStore, setNewStore] = useState("");
  const [storeFilter, setStoreFilter] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [collapsedDone, setCollapsedDone] = useState(true);

  const addItem = async () => {
    const name = newItem.trim();
    if (!name || adding) return;
    setAdding(true);

    const id = genId();
    const store = newStore.trim() || undefined;
    update((d) => ({
      ...d,
      groceryList: [
        ...d.groceryList,
        {
          id,
          name,
          quantity: newQty.trim(),
          addedBy: "You",
          completed: false,
          category: "Other",
          store,
        },
      ],
    }));
    setNewItem("");
    setNewQty("");
    // keep store sticky so the user can add several items for the same store

    try {
      const { data: result, error } = await supabase.functions.invoke(
        "categorize-grocery",
        { body: { name } }
      );
      if (error) throw error;
      const category =
        (result as any)?.category &&
        CATEGORY_ORDER.includes((result as any).category)
          ? (result as any).category
          : "Other";

      update((d) => ({
        ...d,
        groceryList: d.groceryList.map((g) =>
          g.id === id ? { ...g, category } : g
        ),
      }));
    } catch (e: any) {
      console.error("categorize failed", e);
    } finally {
      setAdding(false);
    }
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

  const matchesStore = (g: GroceryItem) => {
    if (storeFilter === null) return true;
    if (storeFilter === "__none__") return !g.store;
    return (g.store || "").toLowerCase() === storeFilter.toLowerCase();
  };

  const clearCompleted = () => {
    const targets = data.groceryList.filter((g) => g.completed && matchesStore(g));
    const count = targets.length;
    if (!count) return;
    const ids = new Set(targets.map((t) => t.id));
    update((d) => ({
      ...d,
      groceryList: d.groceryList.filter((g) => !ids.has(g.id)),
    }));
    toast.success(`Cleared ${count} item${count === 1 ? "" : "s"}`);
  };

  const pending = data.groceryList.filter((g) => !g.completed && matchesStore(g));
  const completed = data.groceryList.filter((g) => g.completed && matchesStore(g));

  const stores = useMemo(() => {
    const set = new Set<string>();
    for (const g of data.groceryList) if (g.store) set.add(g.store);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data.groceryList]);

  const hasUntagged = useMemo(
    () => data.groceryList.some((g) => !g.store),
    [data.groceryList]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, GroceryItem[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const item of pending) {
      const key = CATEGORY_ORDER.includes(item.category as any)
        ? item.category
        : "Other";
      map.get(key)!.push(item);
    }
    return CATEGORY_ORDER.filter((c) => (map.get(c)?.length || 0) > 0).map(
      (c) => ({ category: c, items: map.get(c)! })
    );
  }, [pending]);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-1 animate-fade-in gap-3">
        <h1 className="text-2xl font-serif font-semibold">Grocery List</h1>
        {completed.length > 0 && (
          <button
            onClick={clearCompleted}
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors px-3 py-1.5 rounded-full border border-destructive/20"
          >
            <Trash className="w-3.5 h-3.5" />
            Remove purchased ({completed.length})
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-6 animate-fade-in">
        {pending.length} {pending.length === 1 ? "item" : "items"} to get
        {completed.length > 0 && ` · ${completed.length} done`}
      </p>

      {/* Add input */}
      <div className="bg-card border border-border rounded-2xl p-2 mb-4 animate-slide-up">
        <div className="flex gap-2">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="Add an item..."
            className="flex-1 bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <input
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="Qty"
            className="w-16 bg-transparent px-2 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none border-l border-border"
          />
          <button
            onClick={addItem}
            disabled={adding || !newItem.trim()}
            className="bg-primary text-primary-foreground rounded-xl px-3 flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 px-3 pt-1.5 pb-1 border-t border-border mt-1">
          <StoreIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            list="store-suggestions"
            value={newStore}
            onChange={(e) => setNewStore(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="Store (optional, e.g. Costco)"
            className="flex-1 bg-transparent text-xs placeholder:text-muted-foreground focus:outline-none py-1"
          />
          {newStore && (
            <button
              onClick={() => setNewStore("")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              clear
            </button>
          )}
          <datalist id="store-suggestions">
            {stores.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="flex items-center gap-1.5 px-3 pt-1 pb-1">
          <Sparkles className="w-3 h-3 text-primary" />
          <p className="text-xs text-muted-foreground">
            Auto-sorted into categories with AI
          </p>
        </div>
      </div>

      {/* Store filter chips */}
      {(stores.length > 0 || hasUntagged) && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1 animate-fade-in">
          <button
            onClick={() => setStoreFilter(null)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              storeFilter === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-secondary"
            }`}
          >
            All stores
          </button>
          {stores.map((s) => (
            <button
              key={s}
              onClick={() => setStoreFilter(s)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                storeFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-secondary"
              }`}
            >
              {s}
            </button>
          ))}
          {hasUntagged && (
            <button
              onClick={() => setStoreFilter("__none__")}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                storeFilter === "__none__"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-secondary"
              }`}
            >
              No store
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {pending.length === 0 && completed.length === 0 && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-5xl mb-3">🛒</div>
          <p className="text-sm text-muted-foreground">
            Your list is empty. Add the first item above.
          </p>
        </div>
      )}

      {/* Grouped pending */}
      <div className="space-y-5 mb-6">
        {grouped.map(({ category, items }, gi) => (
          <div
            key={category}
            className="animate-slide-up"
            style={{ animationDelay: `${gi * 60}ms` }}
          >
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-base">{CATEGORY_EMOJI[category]}</span>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {category}
              </p>
              <span className="text-xs text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-card rounded-xl p-3 border border-border flex items-center gap-3 group"
                >
                  <button
                    onClick={() => toggle(item.id)}
                    className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center shrink-0 transition-colors hover:bg-primary/10"
                    aria-label="Mark complete"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {item.quantity && (
                        <span className="text-xs text-muted-foreground">
                          {item.quantity}
                        </span>
                      )}
                      {item.store && (
                        <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          <StoreIcon className="w-2.5 h-2.5" />
                          {item.store}
                        </span>
                      )}
                      {item.addedBy && (
                        <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                          {item.addedBy}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setCollapsedDone((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform ${collapsedDone ? "-rotate-90" : ""}`}
            />
            Completed ({completed.length})
          </button>
          {!collapsedDone && (
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
                  <p className="text-sm line-through flex-1 min-w-0 truncate">
                    {item.name}
                  </p>
                  <button
                    onClick={() => remove(item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
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

export default GroceryList;
