import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "./firebase";
import { useAuth } from "./auth";
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";

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
  date: string; // ISO date string YYYY-MM-DD
  time?: string; // HH:mm
  location?: string;
  notes?: string;
  addedBy: string;
  source?: string; // e.g. "Jake's School", "Soccer League"
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


/**
 * Map a Firestore family document to our app's FamilyData shape.
 * The Firestore schema (set by Vapi cloud functions) uses slightly different field names.
 */
function docToFamilyData(raw: Record<string, any>): FamilyData {
  return {
    familyName: raw.name || "My Family",
    members: (raw.familyMembers || []).map((m: any, i: number) => ({
      id: m.id || String(i),
      name: m.name || "",
      role: m.role || "Member",
      phone: m.phone || "",
      avatar: m.avatar || "👤",
    })),
    groceryList: (raw.groceryList || []).map((g: any, i: number) => ({
      id: g.id || String(i),
      name: g.name || "",
      quantity: g.quantity || "",
      addedBy: g.addedBy || "",
      completed: g.completed ?? false,
    })),
    tasks: (raw.tasks || []).map((t: any, i: number) => ({
      id: t.id || String(i),
      title: t.title || "",
      assignedTo: t.assignedTo || "",
      dueDate: t.dueDate || "",
      completed: t.completed ?? false,
    })),
    events: (raw.appointments || []).map((e: any, i: number) => ({
      id: e.id || String(i),
      title: e.title || "",
      date: e.date || "",
      time: e.time || undefined,
      location: e.location || undefined,
      notes: e.notes || undefined,
      addedBy: e.addedBy || "",
      source: e.source || undefined,
    })),
  };
}

/**
 * Convert our app's FamilyData back to the Firestore schema so Vapi can read it.
 */
function familyDataToDoc(data: FamilyData): Record<string, any> {
  return {
    name: data.familyName,
    familyMembers: data.members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      phone: m.phone,
      avatar: m.avatar,
    })),
    groceryList: data.groceryList.map((g) => ({
      id: g.id,
      name: g.name,
      quantity: g.quantity,
      addedBy: g.addedBy,
      completed: g.completed,
    })),
    tasks: data.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      assignedTo: t.assignedTo,
      dueDate: t.dueDate,
      completed: t.completed,
    })),
    appointments: data.events.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time || "",
      location: e.location || "",
      notes: e.notes || "",
      addedBy: e.addedBy,
      source: e.source || "",
    })),
  };
}

/**
 * Real-time Firestore-backed family data hook.
 * Uses the authenticated user's phone number to identify the family document.
 */
export function useFamilyData() {
  const { user } = useAuth();
  const phone = user?.phoneNumber || null;
  const [data, setData] = useState<FamilyData>(defaultData);
  const [loading, setLoading] = useState(true);
  const skipNextSnapshot = useRef(false);

  // Real-time listener
  useEffect(() => {
    if (!phone) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, "families", phone);
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (skipNextSnapshot.current) {
          skipNextSnapshot.current = false;
          return;
        }
        if (snap.exists()) {
          setData(docToFamilyData(snap.data()));
        } else {
          setData(defaultData);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Firestore listener error:", err);
        setLoading(false);
      }
    );

    return unsub;
  }, [phone]);

  // Update function — writes to Firestore (real-time listener will update local state)
  const update = useCallback(
    (updater: (d: FamilyData) => FamilyData) => {
      if (!phone) return;

      setData((prev) => {
        const next = updater(prev);

        // Optimistic update — skip the next snapshot to avoid flicker
        skipNextSnapshot.current = true;

        const docRef = doc(db, "families", phone);
        const payload = familyDataToDoc(next);
        // Use setDoc with merge to create or update
        setDoc(docRef, payload, { merge: true }).catch((err) => {
          console.error("Firestore write error:", err);
          skipNextSnapshot.current = false;
        });

        return next;
      });
    },
    [phone]
  );

  return { data, update, loading, connected: !!phone };
}

let _id = Date.now();
export const genId = () => String(++_id);
