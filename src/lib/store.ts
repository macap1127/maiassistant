import { useState, useCallback } from "react";

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
}

export interface FamilyData {
  familyName: string;
  members: FamilyMember[];
  groceryList: GroceryItem[];
  tasks: Task[];
  events: CalendarEvent[];
}

const STORAGE_KEY = "mai-family-data";

const defaultData: FamilyData = {
  familyName: "My Family",
  members: [
    { id: "1", name: "Mom", role: "Parent", phone: "+16465551234", avatar: "👩" },
    { id: "2", name: "Dad", role: "Parent", phone: "+16465555678", avatar: "👨" },
    { id: "3", name: "Jake", role: "Child", phone: "", avatar: "👦" },
  ],
  groceryList: [
    { id: "g1", name: "Milk", quantity: "1 gallon", addedBy: "Mom", completed: false },
    { id: "g2", name: "Bread", quantity: "1 loaf", addedBy: "Dad", completed: false },
    { id: "g3", name: "Apples", quantity: "6", addedBy: "Mom", completed: true },
  ],
  tasks: [
    { id: "t1", title: "Pick up Jake at 3pm", assignedTo: "Dad", dueDate: "Today", completed: false },
    { id: "t2", title: "Dentist appointment", assignedTo: "Mom", dueDate: "Tomorrow", completed: false },
    { id: "t3", title: "Homework review", assignedTo: "Mom", dueDate: "Today", completed: true },
  ],
  events: [
    { id: "e1", title: "Soccer Practice", date: new Date().toISOString().slice(0, 10), time: "16:00", location: "City Park", addedBy: "Mom" },
    { id: "e2", title: "Family Dinner", date: new Date().toISOString().slice(0, 10), time: "19:00", location: "Home", addedBy: "Dad" },
  ],
};

function loadData(): FamilyData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultData;
}

function saveData(data: FamilyData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useFamilyData() {
  const [data, setData] = useState<FamilyData>(loadData);

  const update = useCallback((updater: (d: FamilyData) => FamilyData) => {
    setData((prev) => {
      const next = updater(prev);
      saveData(next);
      return next;
    });
  }, []);

  return { data, update };
}

let _id = 100;
export const genId = () => String(++_id);
