import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  avatar?: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  addedBy: string;
  completed: boolean;
  category: string;
  store?: string;
}

export interface Task {
  id: string;
  title: string;
  assignedTo: string;
  dueDate: string;
  completed: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
  addedBy: string;
  source?: string;
  assignedTo?: string;
}

export interface FamilyData {
  familyName: string;
  members: FamilyMember[];
  groceryList: GroceryItem[];
  tasks: Task[];
  events: CalendarEvent[];
}

const defaultData: FamilyData = {
  familyName: "My Family",
  members: [],
  groceryList: [],
  tasks: [],
  events: [],
};

export const genId = () => crypto.randomUUID();

/**
 * Real-time Supabase-backed family data hook.
 * Uses the user's first household membership.
 */
export function useFamilyData() {
  const { user } = useAuth();
  const [data, setData] = useState<FamilyData>(defaultData);
  const dataRef = useRef<FamilyData>(defaultData);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  const [loading, setLoading] = useState(true);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const householdIdRef = useRef<string | null>(null);

  // Step 1: find household for current user
  useEffect(() => {
    if (!user) {
      setLoading(false);
      setHouseholdId(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: memberships, error } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .limit(1);

      if (cancelled) return;
      if (error) {
        console.error("household lookup error", error);
        setLoading(false);
        return;
      }
      if (memberships && memberships.length > 0) {
        setHouseholdId(memberships[0].household_id);
      } else {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Step 2: load all data + subscribe to realtime
  useEffect(() => {
    if (!householdId) return;
    householdIdRef.current = householdId;

    const loadAll = async () => {
      const [hh, members, groceries, tasks, events] = await Promise.all([
        supabase.from("households").select("name").eq("id", householdId).maybeSingle(),
        supabase.from("family_members").select("*").eq("household_id", householdId),
        supabase.from("grocery_items").select("*").eq("household_id", householdId),
        supabase.from("tasks").select("*").eq("household_id", householdId),
        supabase.from("events").select("*").eq("household_id", householdId),
      ]);

      setData({
        familyName: hh.data?.name || "My Family",
        members: (members.data || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          role: m.role,
          phone: m.phone,
          avatar: m.avatar || "👤",
        })),
        groceryList: (groceries.data || []).map((g: any) => ({
          id: g.id,
          name: g.name,
          quantity: g.quantity,
          addedBy: g.added_by,
          completed: g.completed,
          category: g.category || "Other",
          store: g.store || undefined,
        })),
        tasks: (tasks.data || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          assignedTo: t.assigned_to,
          dueDate: t.due_date || "",
          completed: t.completed,
        })),
        events: (events.data || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          time: e.time || undefined,
          location: e.location || undefined,
          notes: e.notes || undefined,
          addedBy: e.added_by,
          source: e.source || undefined,
          assignedTo: e.assigned_to || undefined,
        })),
      });
      setLoading(false);
    };

    loadAll();

    // Realtime subscriptions
    const channel = supabase
      .channel(`household-${householdId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "households", filter: `id=eq.${householdId}` }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "family_members", filter: `household_id=eq.${householdId}` }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "grocery_items", filter: `household_id=eq.${householdId}` }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `household_id=eq.${householdId}` }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "events", filter: `household_id=eq.${householdId}` }, loadAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId]);

  /**
   * Diff-based updater. Computes changes between old and new FamilyData and
   * issues the corresponding inserts/updates/deletes. Realtime then refreshes.
   */
  const update = useCallback(
    async (updater: (d: FamilyData) => FamilyData) => {
      const hid = householdIdRef.current;
      if (!hid) return;

      const prev = dataRef.current;
      const next = updater(prev);

      // Optimistic local update
      dataRef.current = next;
      setData(next);

      try {
        // Family name
        if (next.familyName !== prev.familyName) {
          await supabase.from("households").update({ name: next.familyName }).eq("id", hid);
        }

        await syncList(
          prev.members,
          next.members,
          (m) => ({
            household_id: hid,
            name: m.name,
            role: m.role,
            phone: m.phone,
            avatar: m.avatar,
          }),
          (m) => ({ name: m.name, role: m.role, phone: m.phone, avatar: m.avatar }),
          "family_members"
        );

        await syncList(
          prev.groceryList,
          next.groceryList,
          (g) => ({
            household_id: hid,
            name: g.name,
            quantity: g.quantity,
            added_by: g.addedBy,
            completed: g.completed,
            category: g.category || "Other",
            store: g.store || null,
          }),
          (g) => ({
            name: g.name,
            quantity: g.quantity,
            added_by: g.addedBy,
            completed: g.completed,
            category: g.category || "Other",
            store: g.store || null,
          }),
          "grocery_items"
        );

        await syncList(
          prev.tasks,
          next.tasks,
          (t) => ({
            household_id: hid,
            title: t.title,
            assigned_to: t.assignedTo,
            due_date: t.dueDate || null,
            completed: t.completed,
          }),
          (t) => ({ title: t.title, assigned_to: t.assignedTo, due_date: t.dueDate || null, completed: t.completed }),
          "tasks"
        );

        await syncList(
          prev.events,
          next.events,
          (e) => ({
            household_id: hid,
            title: e.title,
            date: e.date,
            time: e.time || null,
            location: e.location || null,
            notes: e.notes || null,
            added_by: e.addedBy,
            source: e.source || null,
            assigned_to: e.assignedTo || "",
          }),
          (e) => ({
            title: e.title,
            date: e.date,
            time: e.time || null,
            location: e.location || null,
            notes: e.notes || null,
            added_by: e.addedBy,
            source: e.source || null,
            assigned_to: e.assignedTo || "",
          }),
          "events"
        );
      } catch (err) {
        console.error("update sync error", err);
      }
    },
    [data]
  );

  return { data, update, loading, connected: !!householdId };
}

/**
 * Generic list diff syncer. Treats new items (those whose ID doesn't exist in prev)
 * as inserts (using a fresh server-generated UUID from the row's id, if it's a UUID),
 * removed items as deletes, and items present in both as potential updates.
 */
async function syncList<T extends { id: string }>(
  prev: T[],
  next: T[],
  toInsert: (item: T) => Record<string, any>,
  toUpdate: (item: T) => Record<string, any>,
  table: "family_members" | "grocery_items" | "tasks" | "events"
) {
  const prevMap = new Map(prev.map((p) => [p.id, p]));
  const nextMap = new Map(next.map((n) => [n.id, n]));

  const toAdd = next.filter((n) => !prevMap.has(n.id));
  const toRemove = prev.filter((p) => !nextMap.has(p.id));
  const toModify = next.filter((n) => {
    const p = prevMap.get(n.id);
    return p && JSON.stringify(p) !== JSON.stringify(n);
  });

  if (toAdd.length > 0) {
    const rows = toAdd.map((item) => {
      const row = toInsert(item);
      // If the local id looks like a UUID, use it; otherwise let server generate.
      if (isUuid(item.id)) row.id = item.id;
      return row;
    });
    const { error } = await (supabase.from(table) as any).insert(rows);
    if (error) console.error(`insert ${table}`, error);
  }

  for (const item of toModify) {
    if (!isUuid(item.id)) continue;
    const { error } = await (supabase.from(table) as any).update(toUpdate(item)).eq("id", item.id);
    if (error) console.error(`update ${table}`, error);
  }

  if (toRemove.length > 0) {
    const ids = toRemove.map((r) => r.id).filter(isUuid);
    if (ids.length > 0) {
      const { error } = await supabase.from(table).delete().in("id", ids);
      if (error) console.error(`delete ${table}`, error);
    }
  }
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
