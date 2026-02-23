import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

function getDb() {
  return admin.firestore();
}

// ─── Types ───────────────────────────────────────────────────────────

interface VapiToolCallPayload {
  message: {
    type: "tool-calls";
    toolCallList: Array<{
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: Record<string, any>;
      };
    }>;
    call?: {
      customer?: {
        number?: string;
      };
    };
  };
}

interface HouseholdDoc {
  name?: string;
  primaryPhone?: string;
  familyMembers?: any[];
  groceryList?: any[];
  tasks?: any[];
  appointments?: any[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Normalize phone to digits-only (e.g. "16462352143").
 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return digits;
  return digits;
}

/**
 * Look up the household doc for a caller's phone number.
 * Queries the `households` collection where `primaryPhone` matches.
 */
async function getHouseholdDoc(phone: string): Promise<{
  ref: admin.firestore.DocumentReference;
  data: HouseholdDoc;
} | null> {
  const normalized = normalizePhone(phone);
  const snap = await getDb()
    .collection("households")
    .where("primaryPhone", "==", normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { ref: doc.ref, data: doc.data() as HouseholdDoc };
}

// ─── Tool Handlers ───────────────────────────────────────────────────

async function addGroceryItem(phone: string, args: { item: string; quantity?: string }) {
  const household = await getHouseholdDoc(phone);
  if (!household) return { success: false, message: "Household not found for this phone number." };

  const newItem = {
    id: genId(),
    name: args.item,
    quantity: args.quantity || "",
    addedBy: "Mai Assistant",
    completed: false,
  };

  const list = household.data.groceryList || [];
  list.push(newItem);
  await household.ref.update({ groceryList: list });

  return { success: true, message: `Added "${args.item}" to the grocery list.` };
}

async function removeGroceryItem(phone: string, args: { item: string }) {
  const household = await getHouseholdDoc(phone);
  if (!household) return { success: false, message: "Household not found." };

  const list = household.data.groceryList || [];
  const idx = list.findIndex(
    (g: any) => g.name.toLowerCase() === args.item.toLowerCase()
  );
  if (idx === -1) return { success: false, message: `"${args.item}" is not on the grocery list.` };

  list.splice(idx, 1);
  await household.ref.update({ groceryList: list });

  return { success: true, message: `Removed "${args.item}" from the grocery list.` };
}

async function getGroceryList(phone: string) {
  const household = await getHouseholdDoc(phone);
  if (!household) return { success: false, message: "Household not found." };

  const pending = (household.data.groceryList || []).filter((g: any) => !g.completed);
  if (pending.length === 0) return { success: true, message: "Your grocery list is empty." };

  const items = pending.map((g: any) => g.quantity ? `${g.name} (${g.quantity})` : g.name);
  return {
    success: true,
    message: `You have ${pending.length} items on your grocery list: ${items.join(", ")}.`,
  };
}

async function addCalendarEvent(phone: string, args: {
  title: string;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
  source?: string;
}) {
  const household = await getHouseholdDoc(phone);
  if (!household) return { success: false, message: "Household not found." };

  const newEvent = {
    id: genId(),
    title: args.title,
    date: args.date,
    time: args.time || "",
    location: args.location || "",
    notes: args.notes || "",
    addedBy: "Mai Assistant",
    source: args.source || "",
  };

  const appointments = household.data.appointments || [];
  appointments.push(newEvent);
  await household.ref.update({ appointments });

  return { success: true, message: `Added "${args.title}" on ${args.date} to the calendar.` };
}

async function getCalendarEvents(phone: string, args: { date?: string }) {
  const household = await getHouseholdDoc(phone);
  if (!household) return { success: false, message: "Household not found." };

  let events = household.data.appointments || [];

  if (args.date) {
    events = events.filter((e: any) => e.date === args.date);
  } else {
    const today = new Date().toISOString().split("T")[0];
    events = events.filter((e: any) => e.date === today);
  }

  if (events.length === 0) {
    return { success: true, message: args.date ? `No events on ${args.date}.` : "No events today." };
  }

  const descriptions = events.map((e: any) => {
    let desc = e.title;
    if (e.time) desc += ` at ${e.time}`;
    if (e.location) desc += ` (${e.location})`;
    return desc;
  });

  return {
    success: true,
    message: `You have ${events.length} event${events.length > 1 ? "s" : ""}: ${descriptions.join("; ")}.`,
  };
}

async function addTask(phone: string, args: {
  title: string;
  assignedTo?: string;
  dueDate?: string;
}) {
  const household = await getHouseholdDoc(phone);
  if (!household) return { success: false, message: "Household not found." };

  const newTask = {
    id: genId(),
    title: args.title,
    assignedTo: args.assignedTo || "",
    dueDate: args.dueDate || new Date().toISOString().split("T")[0],
    completed: false,
  };

  const tasks = household.data.tasks || [];
  tasks.push(newTask);
  await household.ref.update({ tasks });

  return { success: true, message: `Added task "${args.title}".` };
}

async function completeTask(phone: string, args: { title: string }) {
  const household = await getHouseholdDoc(phone);
  if (!household) return { success: false, message: "Household not found." };

  const tasks = household.data.tasks || [];
  const task = tasks.find(
    (t: any) => t.title.toLowerCase().includes(args.title.toLowerCase()) && !t.completed
  );
  if (!task) return { success: false, message: `No pending task matching "${args.title}".` };

  task.completed = true;
  await household.ref.update({ tasks });

  return { success: true, message: `Marked "${task.title}" as complete.` };
}

async function getTasks(phone: string) {
  const household = await getHouseholdDoc(phone);
  if (!household) return { success: false, message: "Household not found." };

  const pending = (household.data.tasks || []).filter((t: any) => !t.completed);
  if (pending.length === 0) return { success: true, message: "No pending tasks." };

  const descriptions = pending.map((t: any) => {
    let desc = t.title;
    if (t.assignedTo) desc += ` (assigned to ${t.assignedTo})`;
    return desc;
  });

  return {
    success: true,
    message: `You have ${pending.length} pending task${pending.length > 1 ? "s" : ""}: ${descriptions.join("; ")}.`,
  };
}

async function getFamilyInfo(phone: string) {
  const household = await getHouseholdDoc(phone);
  if (!household) return { success: false, message: "Household not found." };

  const members = household.data.familyMembers || [];
  if (members.length === 0) return { success: true, message: "No family members registered yet." };

  const descriptions = members.map((m: any) => `${m.name} (${m.role})`);
  return {
    success: true,
    message: `Your household "${household.data.name}" has ${members.length} member${members.length > 1 ? "s" : ""}: ${descriptions.join(", ")}.`,
  };
}

// ─── Main Vapi Webhook ──────────────────────────────────────────────

const toolHandlers: Record<string, (phone: string, args: any) => Promise<any>> = {
  addGroceryItem,
  removeGroceryItem,
  getGroceryList,
  addCalendarEvent,
  getCalendarEvents,
  addTask,
  completeTask,
  getTasks,
  getFamilyInfo,
};

export const vapiWebhook = onRequest({ cors: true }, async (req, res) => {

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const payload = req.body as VapiToolCallPayload;

    const callerPhone = payload.message?.call?.customer?.number;
    if (!callerPhone) {
      res.status(400).json({ error: "No caller phone number found" });
      return;
    }

    if (payload.message?.type !== "tool-calls") {
      res.status(200).json({});
      return;
    }

    const results = [];

    for (const toolCall of payload.message.toolCallList) {
      const handler = toolHandlers[toolCall.function.name];

      let result: string;
      if (handler) {
        const response = await handler(callerPhone, toolCall.function.arguments);
        result = response.message;
      } else {
        result = `Unknown tool: ${toolCall.function.name}`;
      }

      results.push({
        toolCallId: toolCall.id,
        result,
      });
    }

    res.status(200).json({ results });
  } catch (error: any) {
    console.error("Vapi webhook error:", error);
    res.status(500).json({ error: error.message || "Internal error" });
  }
});
