import { useConversation, ConversationProvider } from "@elevenlabs/react";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, Settings2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import type { GroceryItem } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMicPermission } from "@/lib/useMicPermission";

const AGENT_ID = "agent_1201krd1pcfder390aqp7v76q9tx";

const MIA_SESSION_PROMPT = [
  "You are Mia, a warm and casual family assistant for {{user_name}}. The family members in this household are: {{family_members}}.",
  "Address {{user_name}} naturally by first name sometimes, not in every sentence. Use family member names from the list; if an unknown name is mentioned, ask who they mean.",
  "You help the household manage groceries, tasks, calendar events, receipts, and recipe ingredients.",
  "Use tools silently. Never tell the user which tool you are using, and never say you are checking, pulling up, fetching, looking up, or calling a tool.",
  "Grocery or shopping list questions must use getGroceryList, checkGroceryItem, getGrocery, getGroceries, or getShoppingList. Never use calendar tools for grocery questions.",
  "If the user asks whether a specific grocery item is on the list, use checkGroceryItem or getGroceryList, then answer yes or no naturally.",
  "Task or to-do questions must use getTasks, getTodoList, getToDoList, getTodos, getToDos, or getTaskList. Calendar, date, schedule, appointment, or event questions must use getUpcomingEvents or getEventsForDate with an ISO date.",
  "The current grocery snapshot at session start is: {{grocery_list_snapshot}}",
  "The current to-do snapshot at session start is: {{todo_list_snapshot}}",
  "If a tool returns list data, that tool result is the source of truth. Never say a list is blank unless the tool result or snapshot explicitly says it is empty. Never say you can only see items you added.",
  "Only say something was added, found, or changed if the relevant tool returned success. If something fails, say so plainly without naming the tool.",
  "Keep answers brief, friendly, and direct. Answer from tool results only; never guess household data.",
].join(" ");

const getUserTranscript = (message: MaiMessage) =>
  message.user_transcription_event?.user_transcript ||
  (message.type === "user_transcript" ? message.message : "") ||
  "";

const isGroceryLookup = (text: string) => /\b(grocery|groceries|shopping\s*list|on\s+(?:my|our|the)\s+list)\b/i.test(text);

const isTaskLookup = (text: string) =>
  /\b(to[-\s]?do\s*list|todo\s*list|task\s*list|tasks?|chores?|what\s+(?:do\s+)?(?:i|we)\s+(?:need|have)\s+to\s+do)\b/i.test(text);

const isMicDeniedError = (err: unknown) =>
  (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError")) ||
  (err instanceof Error && /permission|notallowed|denied/i.test(err.message));

const getStartErrorMessage = (err: unknown, fallback?: unknown) => {
  if (err instanceof DOMException && err.name === "NotFoundError") return "No microphone was found on this device.";
  if (err instanceof DOMException && err.name === "NotAllowedError") return "Please allow microphone access to talk to Mia.";
  if (err instanceof DOMException && err.name === "NotReadableError") return "Your microphone is busy in another app or tab.";
  const message = [err, fallback]
    .map((value) => (typeof value === "string" ? value : value instanceof Error || value instanceof DOMException ? `${value.name} ${value.message}` : ""))
    .join(" ");
  if (/requested device not found|notfounderror|no device/i.test(message)) return "No microphone was found on this device.";
  if (/permission|notallowed/i.test(message)) return "Please allow microphone access to talk to Mia.";
  if (/notreadable|busy|in use/i.test(message)) return "Your microphone is busy in another app or tab.";
  return message || "Please allow microphone access and try again.";
};

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : "unknown error");

type MaiMessage = {
  message?: string;
  source?: string;
  type?: string;
  agent_response_event?: { agent_response?: string };
  user_transcription_event?: { user_transcript?: string };
};

const cleanGroceryName = (value: string) =>
  value
    .replace(/[“”"']/g, "")
    .replace(/\b(to|the|my|our|grocery|groceries|shopping|list|please)\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,.;:!?-]+|[\s,.;:!?-]+$/g, "")
    .trim();

const splitGroceryNames = (value: string) =>
  value
    .replace(/\s+and\s+/gi, ",")
    .split(",")
    .map(cleanGroceryName)
    .filter((name) => name.length > 0 && name.length < 80);

const cleanStoreName = (value: string) =>
  value
    .replace(/[“”"']/g, "")
    .replace(/\b(grocery|groceries|shopping|list|please)\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,.;:!?-]+|[\s,.;:!?-]+$/g, "")
    .trim();

const extractGroceryItemsFromUserText = (text: string, awaitingItem: boolean): { name: string; store?: string }[] => {
  const lower = text.toLowerCase();
  const isGroceryCommand = /\b(grocery|groceries|shopping\s*list)\b/.test(lower);
  const isAddCommand = /^\s*(add|put|include)\b/i.test(text);
  const mentionsOtherArea = /\b(task|tasks|to[-\s]?do|todo|chore|chores|calendar|event|events|appointment|appointments|reminder|reminders|schedule)\b/.test(lower);

  // Never treat as grocery if the user is talking about another area.
  if (mentionsOtherArea && !isGroceryCommand) return [];

  const storeMatch = text.match(/^\s*(?:add|put|include)\s+(.+?)\s+(?:to|on|in)\s+(?:my\s+|our\s+|the\s+)?(.+?)\s+(?:grocery|shopping)\s+list\b/i);
  if (storeMatch?.[1] && storeMatch?.[2]) {
    const store = cleanStoreName(storeMatch[2]);
    return splitGroceryNames(storeMatch[1]).map((name) => ({ name, store: store || undefined }));
  }

  if (isGroceryCommand && isAddCommand) {
    const afterAdd = text.replace(/^\s*(add|put|include)\b/i, "").split(/\b(?:to|on|in)\b\s+(?:my\s+|our\s+)?(?:grocery|groceries|shopping\s*list)/i)[0];
    return splitGroceryNames(afterAdd).map((name) => ({ name }));
  }

  // Only fall back to treating speech as grocery items when Mia explicitly asked
  // for grocery items (awaitingItem). Do NOT infer grocery from a bare "add X".
  if (awaitingItem && !mentionsOtherArea) {
    return splitGroceryNames(text.replace(/^\s*(add|put|include)\b/i, "")).map((name) => ({ name }));
  }

  return [];
};

const extractGroceryItemFromAgentConfirmation = (text: string): { name: string; store?: string }[] => {
  // Try patterns that include a store name first
  const storePatterns = [
    /(?:adding|added)\s+(.+?)\s+to\s+(?:your|the)\s+(.+?)\s+(?:grocery\s+)?list/i,
    /(.+?)\s+has\s+been\s+added\s+to\s+(?:your|the)\s+(.+?)\s+(?:grocery\s+)?list/i,
  ];
  for (const pattern of storePatterns) {
    const match = text.match(pattern);
    if (match?.[1] && match?.[2] && !/^grocery$/i.test(match[2].trim())) {
      const store = cleanStoreName(match[2]);
      return splitGroceryNames(match[1]).map((name) => ({ name, store }));
    }
  }

  const plainPatterns = [
    /(?:adding|added)\s+(.+?)\s+to\s+(?:your|the)\s+grocery\s+list/i,
    /(.+?)\s+has\s+been\s+added\s+to\s+(?:your|the)\s+grocery\s+list/i,
  ];
  for (const pattern of plainPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) return splitGroceryNames(match[1]).map((name) => ({ name }));
  }

  return [];
};

const wasRecentlyAdded = (recentAdds: Map<string, number>, name: string, store: string | undefined, now: number) => {
  const key = `${name}:${store || ""}`.toLowerCase();
  if (now - (recentAdds.get(key) ?? 0) <= 20_000) return true;
  if (store) return false;

  const namePrefix = `${name}:`.toLowerCase();
  return Array.from(recentAdds).some(([recentKey, addedAt]) => recentKey.startsWith(namePrefix) && now - addedAt <= 20_000);
};

type GrocerySummaryRow = Pick<GroceryItem, "name" | "quantity" | "completed" | "store" | "category">;
type TokenResponse = { signedUrl?: string; error?: string };
type EventSummaryRow = { title: string; date?: string; time?: string | null; location?: string | null; notes?: string | null; assigned_to?: string | null };
type ReceiptSummaryRow = { store?: string | null; purchase_date?: string | null; total?: number | null; currency?: string | null; items_summary?: string | null; image_path?: string | null };
type GroceryCheckRow = { name: string; quantity?: string | null; store?: string | null; completed: boolean };
type TaskSummaryRow = { title: string; assigned_to?: string | null; due_date?: string | null; time?: string | null; completed: boolean };

const summarizeGroceryRows = (rows: GrocerySummaryRow[], params: { store?: string } = {}) => {
  const store = params.store?.trim().toLowerCase();
  const filtered = store
    ? rows.filter((item) => (item.store || "").toLowerCase().includes(store))
    : rows;
  if (filtered.length === 0) return params.store ? `Nothing on the ${params.store} grocery list.` : `The grocery list is empty.`;

  const open = filtered.filter((item) => !item.completed);
  const done = filtered.filter((item) => item.completed);
  const fmt = (item: GrocerySummaryRow) => {
    const qty = item.quantity ? `${item.quantity} ` : "";
    const where = item.store ? ` (${item.store})` : "";
    return `${qty}${item.name}${where}`;
  };
  const parts: string[] = [];
  if (open.length) parts.push(`Still needed (${open.length}): ${open.map(fmt).join(", ")}`);
  if (done.length) parts.push(`Already got (${done.length}): ${done.map(fmt).join(", ")}`);
  return parts.join(". ") + ".";
};

const summarizeTaskRows = (rows: TaskSummaryRow[], params: { assignedTo?: string } = {}) => {
  const assignedTo = params.assignedTo?.trim().toLowerCase();
  const filtered = assignedTo
    ? rows.filter((task) => (task.assigned_to || "").toLowerCase().includes(assignedTo))
    : rows;
  if (filtered.length === 0) return params.assignedTo ? `No to-do items assigned to ${params.assignedTo}.` : "No to-do items.";

  const open = filtered.filter((task) => !task.completed);
  const done = filtered.filter((task) => task.completed);
  const fmt = (task: TaskSummaryRow) => {
    const who = task.assigned_to ? ` — ${task.assigned_to}` : "";
    const due = task.due_date ? ` (due ${task.due_date}${task.time ? ` at ${task.time}` : ""})` : task.time ? ` (${task.time})` : "";
    return `${task.title}${who}${due}`;
  };
  const parts: string[] = [];
  if (open.length) parts.push(`Open to-dos (${open.length}): ${open.map(fmt).join("; ")}`);
  if (done.length) parts.push(`Done (${done.length}): ${done.map(fmt).join("; ")}`);
  return parts.join(". ") + ".";
};

type VoiceConnection = { signedUrl: string; createdAt: number };
type VoiceAccess = { ok: boolean; reason?: string; checkedAt: number };

const VOICE_CONNECTION_MAX_AGE_MS = 4 * 60 * 1000;
const VOICE_ACCESS_MAX_AGE_MS = 60 * 1000;

const VoiceAssistantInner = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [connecting, setConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [preparingVoice, setPreparingVoice] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number; tier: string } | null>(null);
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(null);
  const [micDenied, setMicDenied] = useState(false);
  const micPermission = useMicPermission();
  const householdIdRef = useRef<string | null>(null);
  const assistantLanguageRef = useRef<string>("en");
  const userNameRef = useRef<string>("");
  const familyMembersRef = useRef<{ name: string; role: string }[]>([]);
  const groceryListRef = useRef<GrocerySummaryRow[]>([]);
  const taskListRef = useRef<TaskSummaryRow[]>([]);
  const awaitingGroceryItemRef = useRef(false);
  const recentGroceryAddsRef = useRef<Map<string, number>>(new Map());
  const voiceConnectionRef = useRef<VoiceConnection | null>(null);
  const voiceConnectionPromiseRef = useRef<Promise<string> | null>(null);
  const voiceAccessRef = useRef<VoiceAccess | null>(null);
  const userEndedSessionRef = useRef(false);
  const wasConnectedRef = useRef(false);
  const sessionStartedAtRef = useRef<number | null>(null);
  const lastStartTapAtRef = useRef<number | null>(null);
  const lastErrorRef = useRef<unknown>(null);

  const loadGrocerySnapshot = useCallback(async (hid = householdIdRef.current) => {
    if (!hid) return [] as GrocerySummaryRow[];
    const { data, error } = await supabase
      .from("grocery_items")
      .select("name, quantity, store, completed, category")
      .eq("household_id", hid)
      .order("completed", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    const rows = (data || []) as GrocerySummaryRow[];
    groceryListRef.current = rows;
    return rows;
  }, []);

  const loadTaskSnapshot = useCallback(async (hid = householdIdRef.current) => {
    if (!hid) return [] as TaskSummaryRow[];
    const { data, error } = await supabase
      .from("tasks")
      .select("title, assigned_to, due_date, time, completed")
      .eq("household_id", hid)
      .order("completed", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    const rows = (data || []) as TaskSummaryRow[];
    taskListRef.current = rows;
    return rows;
  }, []);

  const refreshListSnapshots = useCallback(async (hid = householdIdRef.current) => {
    await Promise.allSettled([loadGrocerySnapshot(hid), loadTaskSnapshot(hid)]);
  }, [loadGrocerySnapshot, loadTaskSnapshot]);

  const refreshQuota = useCallback(async () => {
    const hid = householdIdRef.current;
    if (!hid) return;
    const { data } = await supabase
      .from("households")
      .select("voice_seconds_used, voice_seconds_limit, subscription_tier")
      .eq("id", hid)
      .maybeSingle();
    if (data) setQuota({ used: data.voice_seconds_used, limit: data.voice_seconds_limit, tier: data.subscription_tier });
  }, []);

  // Server-side entitlement check
  const checkAccess = useCallback(async (): Promise<{ ok: boolean; reason?: string }> => {
    let hid = householdIdRef.current;
    if (!hid && user) {
      // Household may not have been resolved yet — fetch it on demand.
      const { data } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .limit(1);
      if (data && data.length > 0) {
        hid = data[0].household_id;
        householdIdRef.current = hid;
        setActiveHouseholdId(hid);
      }
    }
    if (!hid) return { ok: false, reason: "Setting up your household… please try again in a moment." };
    const { data: hasAccess } = await supabase.rpc("household_has_access", { _household_id: hid });
    if (!hasAccess) return { ok: false, reason: "Your subscription has ended or your trial is over. Choose a plan to keep using Mia." };
    const { data: remaining } = await supabase.rpc("voice_seconds_remaining", { _household_id: hid });
    if ((remaining ?? 0) <= 0) return { ok: false, reason: "You've used all your voice minutes for this period. Upgrade to keep talking to Mia." };
    return { ok: true };
  }, [user]);


  const getVoiceAccess = useCallback(async () => {
    const cached = voiceAccessRef.current;
    if (cached && Date.now() - cached.checkedAt < VOICE_ACCESS_MAX_AGE_MS) return cached;
    const result = await checkAccess();
    const checked = { ...result, checkedAt: Date.now() };
    voiceAccessRef.current = checked;
    return checked;
  }, [checkAccess]);

  // Resolve current household once user is known
  useEffect(() => {
    if (!user) {
      householdIdRef.current = null;
      setActiveHouseholdId(null);
      userNameRef.current = "";
      familyMembersRef.current = [];
      groceryListRef.current = [];
      taskListRef.current = [];
      setQuota(null);
      return;
    }
    const meta = (user.user_metadata || {}) as Record<string, unknown>;
    const metaName = (meta.full_name || meta.name || meta.first_name) as string | undefined;
    userNameRef.current = (metaName || user.email?.split("@")[0] || "").trim();

    (async () => {
      const { data, error } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .limit(1);
      if (!error && data && data.length > 0) {
        const hid = data[0].household_id;
        householdIdRef.current = hid;
        setActiveHouseholdId(hid);
        voiceAccessRef.current = null; // invalidate any stale "no household" cache
        void refreshQuota();
        void getVoiceAccess().catch((error) => console.error("[Mia] voice access check failed", error));

        void refreshListSnapshots(hid);
        const { data: hh } = await supabase
          .from("households")
          .select("assistant_language")
          .eq("id", hid)
          .maybeSingle();
        assistantLanguageRef.current = hh?.assistant_language || "en";
        const { data: fam } = await supabase
          .from("family_members")
          .select("name, role, user_id")
          .eq("household_id", hid);
        if (fam) {
          familyMembersRef.current = fam.filter((f) => f?.name);
          const me = fam.find((f) => (f as any).user_id === user.id);
          if (me?.name) userNameRef.current = me.name;
        }
      }
    })();
  }, [user, refreshQuota, getVoiceAccess, refreshListSnapshots]);

  const requireHousehold = () => {
    const hid = householdIdRef.current;
    if (!hid) throw new Error("No household found for current user.");
    return hid;
  };

  const prepareVoiceConnection = useCallback(async () => {
    const cached = voiceConnectionRef.current;
    if (cached && Date.now() - cached.createdAt < VOICE_CONNECTION_MAX_AGE_MS) {
      setVoiceReady(true);
      return cached.signedUrl;
    }
    if (voiceConnectionPromiseRef.current) return voiceConnectionPromiseRef.current;

    setVoiceReady(false);
    setPreparingVoice(true);
    const promise = supabase.functions
      .invoke("elevenlabs-token", { body: { agentId: AGENT_ID, mode: "websocket" } })
      .then(({ data, error }) => {
        const tokenData = data as TokenResponse | null;
        const signedUrl = tokenData?.signedUrl;
        if (error || !signedUrl) throw new Error(error?.message || tokenData?.error || "Failed to prepare Mia");
        voiceConnectionRef.current = { signedUrl: signedUrl as string, createdAt: Date.now() };
        setVoiceReady(true);
        return signedUrl as string;
      })
      .catch((error) => {
        voiceConnectionRef.current = null;
        setVoiceReady(false);
        throw error;
      })
      .finally(() => {
        voiceConnectionPromiseRef.current = null;
        setPreparingVoice(false);
      });

    voiceConnectionPromiseRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    void prepareVoiceConnection().catch((error) => {
      console.error("[Mia] voice connection prepare failed", error);
      setStatusMessage(t("voice.tapToPrepare"));
    });
  }, [prepareVoiceConnection]);

  const addGroceryItems = useCallback(async (items: { name: string; quantity?: string; category?: string; store?: string }[]) => {
    const hid = requireHousehold();
    const now = Date.now();
    const rows = items
      .map((item) => ({ ...item, name: cleanGroceryName(item.name) }))
      .filter((item) => item.name)
      .filter((item) => !wasRecentlyAdded(recentGroceryAddsRef.current, item.name, item.store, now))
      .map((item) => ({
        household_id: hid,
        name: item.name,
        quantity: item.quantity ?? "",
        category: item.category ?? "Other",
        store: item.store?.trim() || null,
        added_by: "Mia",
        completed: false,
      }));

    if (rows.length === 0) return [];
    rows.forEach((row) => recentGroceryAddsRef.current.set(`${row.name}:${row.store || ""}`.toLowerCase(), now));

    const { error } = await supabase.from("grocery_items").insert(rows);
    if (error) {
      rows.forEach((row) => recentGroceryAddsRef.current.delete(`${row.name}:${row.store || ""}`.toLowerCase()));
      throw error;
    }
    void loadGrocerySnapshot(hid).catch((error) => console.error("[Mia] grocery snapshot refresh failed", error));

    return rows.map((row) => row.name);
  }, [loadGrocerySnapshot]);

  const readGroceryList = useCallback(async (params: { store?: string } = {}) => {
    const hid = requireHousehold();
    try {
      const rows = await loadGrocerySnapshot(hid);
      return summarizeGroceryRows(rows, params);
    } catch (error) {
      const localSummary = summarizeGroceryRows(groceryListRef.current, params);
      if (!/empty|Nothing on/i.test(localSummary)) return localSummary;
      return `Couldn't read the grocery list: ${getErrorMessage(error)}`;
    }
  }, [loadGrocerySnapshot]);

  const readTaskList = useCallback(async (params: { assignedTo?: string } = {}) => {
    const hid = requireHousehold();
    try {
      const rows = await loadTaskSnapshot(hid);
      return summarizeTaskRows(rows, params);
    } catch (error) {
      const localSummary = summarizeTaskRows(taskListRef.current, params);
      if (!/No to-do items/i.test(localSummary)) return localSummary;
      return `Couldn't read to-do items: ${getErrorMessage(error)}`;
    }
  }, [loadTaskSnapshot]);

  useEffect(() => {
    if (!activeHouseholdId) return;
    void refreshListSnapshots(activeHouseholdId);
    const channel = supabase
      .channel(`voice-lists-${activeHouseholdId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "grocery_items", filter: `household_id=eq.${activeHouseholdId}` }, () => {
        void loadGrocerySnapshot(activeHouseholdId).catch((error) => console.error("[Mia] grocery snapshot refresh failed", error));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `household_id=eq.${activeHouseholdId}` }, () => {
        void loadTaskSnapshot(activeHouseholdId).catch((error) => console.error("[Mia] task snapshot refresh failed", error));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeHouseholdId, refreshListSnapshots, loadGrocerySnapshot, loadTaskSnapshot]);

  const conversation = useConversation({
    clientTools: {
      addGrocery: async (params: { name: string; quantity?: string; category?: string; store?: string }) => {
        console.log("[Mia] addGrocery called", params);
        try {
          // Reject vague referential phrases — agent should pass actual item names
          const rawName = (params.name || "").trim();
          if (/^(all of (those|them|these)|those|these|them|everything|the items?|the rest)$/i.test(rawName)) {
            return `I need the actual item names — please list each grocery item individually.`;
          }
          // Split on commas / "and" so a single call with "eggs, milk and bread" becomes 3 items
          const names = splitGroceryNames(rawName);
          if (names.length === 0) return `I couldn't catch that item — please say it again.`;
          const items = names.map((name) => ({
            name,
            quantity: names.length === 1 ? params.quantity : undefined,
            category: params.category,
            store: params.store,
          }));
          const added = await addGroceryItems(items);
          if (added.length === 0) return `${names.join(", ")} ${names.length === 1 ? "was" : "were"} already added.`;
          const where = params.store ? ` (${params.store})` : "";
          return `Added ${added.join(", ")}${where} to the grocery list.`;
        } catch (e: unknown) {
          console.error("[Mia] addGrocery threw", e);
          return `Failed to add: ${getErrorMessage(e)}`;
        }
      },
      addTask: async (params: { title: string; assignedTo?: string; dueDate?: string; date?: string; time?: string }) => {
        console.log("[Mia] addTask called", params);
        try {
          // To-do items have no date/time. If a date or time is given, route to calendar instead.
          if (params.dueDate || params.date || params.time) {
            return `That sounds like a calendar event since it has a date or time. Want me to add "${params.title}" to the calendar instead?`;
          }
          const hid = requireHousehold();
          const { error } = await supabase.from("tasks").insert({
            household_id: hid,
            title: params.title,
            assigned_to: params.assignedTo ?? "",
            due_date: null,
            completed: false,
          });
          if (error) {
            console.error("[Mia] addTask insert error", error);
            toast({ variant: "destructive", title: t("voice.toast.couldntAddTodoTitle"), description: error.message });
            return `Failed to add: ${error.message}`;
          }
          toast({ title: t("voice.toast.addedToTodoTitle"), description: params.title });
          return `Added to your to-do list: ${params.title}.`;
        } catch (e: unknown) {
          console.error("[Mia] addTask threw", e);
          return `Failed to add: ${getErrorMessage(e)}`;
        }
      },
      getEventsForDate: async (params: { date: string }) => {
        console.log("[Mia] getEventsForDate called", params);
        try {
          const hid = requireHousehold();
          const { data, error } = await supabase
            .from("events")
            .select("title, date, time, location, notes, assigned_to")
            .eq("household_id", hid)
            .eq("date", params.date)
            .order("time", { ascending: true });
          if (error) return `Couldn't read calendar: ${error.message}`;
          if (!data || data.length === 0) return `Nothing on the calendar for ${params.date}.`;
          const list = (data as EventSummaryRow[]).map((e) => {
            const t = e.time ? ` at ${e.time}` : "";
            const loc = e.location ? ` (${e.location})` : "";
            const who = e.assigned_to ? ` — ${e.assigned_to}` : "";
            return `${e.title}${t}${loc}${who}`;
          }).join("; ");
          return `On ${params.date}: ${list}.`;
        } catch (e) {
          return `Failed to look up calendar: ${getErrorMessage(e)}`;
        }
      },
      searchReceipts: async (params: { query: string; month?: string; minTotal?: number; maxTotal?: number }) => {
        console.log("[Mia] searchReceipts called", params);
        try {
          const hid = requireHousehold();
          const q = (params.query || "").trim();
          if (!q) return `What store or item should I search for?`;
          let req = supabase
            .from("receipts")
            .select("store, purchase_date, total, currency, items_summary, image_path")
            .eq("household_id", hid)
            .or(`store.ilike.%${q}%,items_summary.ilike.%${q}%,notes.ilike.%${q}%`);
          // Optional narrowing: "from March" / "over $50".
          if (params.month && /^\d{4}-\d{2}$/.test(params.month)) {
            const [y, m] = params.month.split("-").map(Number);
            const end = new Date(y, m, 1).toISOString().slice(0, 10);
            req = req.gte("purchase_date", `${params.month}-01`).lt("purchase_date", end);
          }
          if (typeof params.minTotal === "number") req = req.gte("total", params.minTotal);
          if (typeof params.maxTotal === "number") req = req.lte("total", params.maxTotal);
          const { data, error } = await req
            .order("purchase_date", { ascending: false, nullsFirst: false })
            .limit(5);
          if (error) return `Couldn't search receipts: ${error.message}`;
          if (!data || data.length === 0) return `No receipts found for "${q}".`;
          const list = (data as ReceiptSummaryRow[]).map((r) => {
            const date = r.purchase_date || "no date";
            const total = r.total != null ? ` — ${r.currency || "USD"} ${r.total}` : "";
            const items = r.items_summary ? ` (${r.items_summary})` : "";
            return `${r.store || "Unknown store"} on ${date}${total}${items}`;
          }).join("; ");
          // Show the matching receipts on screen so the user sees only those.
          const sp = new URLSearchParams({ q });
          if (params.month) sp.set("month", params.month);
          if (typeof params.minTotal === "number") sp.set("min", String(params.minTotal));
          if (typeof params.maxTotal === "number") sp.set("max", String(params.maxTotal));
          navigate(`/receipts?${sp.toString()}`);
          return `Found ${data.length} receipt${data.length === 1 ? "" : "s"} for "${q}": ${list}. I'm showing them on your Receipts screen now.`;
        } catch (e) {
          return `Failed to search receipts: ${getErrorMessage(e)}`;
        }
      },
      addRecipeToGroceryList: async (params: { dish: string; servings?: number; store?: string }) => {
        console.log("[Mia] addRecipeToGroceryList called", params);
        try {
          const dish = (params.dish || "").trim();
          if (!dish) return `What recipe should I shop for?`;
          const { data, error } = await supabase.functions.invoke("recipe-ingredients", {
            body: { dish, servings: params.servings },
          });
          if (error) return `Couldn't get ingredients: ${error.message}`;
          const ingredients: { name: string; quantity?: string }[] = data?.ingredients || [];
          if (ingredients.length === 0) return `I couldn't find ingredients for ${dish}.`;
          const added = await addGroceryItems(
            ingredients.map((i) => ({ name: i.name, quantity: i.quantity, store: params.store }))
          );
          if (added.length === 0) return `All ingredients for ${dish} were already on the list.`;
          toast({ title: t("voice.toast.addedIngredientsTitle", { dish }), description: added.join(", ") });
          return `Added ${added.length} ingredient${added.length === 1 ? "" : "s"} for ${dish}: ${added.join(", ")}.`;
        } catch (e) {
          return `Failed to add recipe: ${getErrorMessage(e)}`;
        }
      },
      getRecipeIngredients: async (params: { dish: string; servings?: number }) => {
        console.log("[Mia] getRecipeIngredients called", params);
        try {
          const dish = (params.dish || "").trim();
          if (!dish) return `What recipe should I look up?`;
          const { data, error } = await supabase.functions.invoke("recipe-ingredients", {
            body: { dish, servings: params.servings },
          });
          if (error) return `Couldn't get ingredients: ${error.message}`;
          const ingredients: { name: string; quantity?: string }[] = data?.ingredients || [];
          if (ingredients.length === 0) return `I couldn't find ingredients for ${dish}.`;
          const list = ingredients.map((i) => i.quantity ? `${i.quantity} ${i.name}` : i.name).join(", ");
          return `For ${dish} you'll need: ${list}. Want me to add these to the grocery list?`;
        } catch (e) {
          return `Failed: ${getErrorMessage(e)}`;
        }
      },
      addEvent: async (params: {
        title: string;
        date: string;
        time?: string;
        location?: string;
        notes?: string;
      }) => {
        console.log("[Mia] addEvent called", params);
        try {
          const hid = requireHousehold();
          const { error } = await supabase.from("events").insert({
            household_id: hid,
            title: params.title,
            date: params.date,
            time: params.time || null,
            location: params.location || null,
            notes: params.notes || null,
            added_by: "Mia",
          });
          if (error) {
            console.error("[Mia] addEvent insert error", error);
            toast({ variant: "destructive", title: t("voice.toast.couldntAddEventTitle"), description: error.message });
            return `Failed to add: ${error.message}`;
          }
          toast({ title: t("voice.toast.eventAddedTitle"), description: `${params.title} — ${params.date}${params.time ? " " + params.time : ""}` });
          return `Added event: ${params.title} on ${params.date}.`;
        } catch (e: unknown) {
          console.error("[Mia] addEvent threw", e);
          return `Failed to add: ${getErrorMessage(e)}`;
        }
      },
      getGroceryList: async (params: { store?: string } = {}) => {
        console.log("[Mia] getGroceryList called", params);
        try {
          return await readGroceryList(params);
        } catch (e) {
          return `Failed to read grocery list: ${getErrorMessage(e)}`;
        }
      },
      getGrocery: async (params: { store?: string } = {}) => readGroceryList(params),
      getGroceries: async (params: { store?: string } = {}) => readGroceryList(params),
      getShoppingList: async (params: { store?: string } = {}) => readGroceryList(params),
      checkGroceryItem: async (params: { name: string; store?: string }) => {
        console.log("[Mia] checkGroceryItem called", params);
        try {
          const hid = requireHousehold();
          const itemName = cleanGroceryName(params.name || "");
          if (!itemName) return "Which grocery item?";
          let query = supabase
            .from("grocery_items")
            .select("name, quantity, store, completed")
            .eq("household_id", hid)
            .ilike("name", `%${itemName}%`);
          if (params.store?.trim()) query = query.ilike("store", `%${params.store.trim()}%`);
          const { data, error } = await query.limit(10);
          if (error) return `Couldn't read the grocery list: ${error.message}`;
          if (!data || data.length === 0) return `No, ${itemName} isn't on the grocery list.`;
          const matches = (data as GroceryCheckRow[]).map((i) => `${i.completed ? "already got" : "still needed"}: ${i.quantity ? `${i.quantity} ` : ""}${i.name}${i.store ? ` (${i.store})` : ""}`);
          return `Yes — ${matches.join("; ")}.`;
        } catch (e) {
          return `Failed to read grocery list: ${getErrorMessage(e)}`;
        }
      },
      getTasks: async (params: { assignedTo?: string } = {}) => {
        console.log("[Mia] getTasks called", params);
        try {
          return await readTaskList(params);
        } catch (e) {
          return `Failed to read tasks: ${getErrorMessage(e)}`;
        }
      },
      getTodoList: async (params: { assignedTo?: string } = {}) => readTaskList(params),
      getToDoList: async (params: { assignedTo?: string } = {}) => readTaskList(params),
      getTodos: async (params: { assignedTo?: string } = {}) => readTaskList(params),
      getToDos: async (params: { assignedTo?: string } = {}) => readTaskList(params),
      getTaskList: async (params: { assignedTo?: string } = {}) => readTaskList(params),
      getUpcomingEvents: async (params: { days?: number } = {}) => {
        console.log("[Mia] getUpcomingEvents called", params);
        try {
          const hid = requireHousehold();
          const days = Math.max(1, Math.min(60, params.days ?? 7));
          const today = new Date();
          const end = new Date(today);
          end.setDate(end.getDate() + days);
          const iso = (d: Date) => d.toISOString().slice(0, 10);
          const { data, error } = await supabase
            .from("events")
            .select("title, date, time, location, assigned_to")
            .eq("household_id", hid)
            .gte("date", iso(today))
            .lte("date", iso(end))
            .order("date", { ascending: true })
            .order("time", { ascending: true, nullsFirst: true });
          if (error) return `Couldn't read calendar: ${error.message}`;
          if (!data || data.length === 0) return `Nothing on the calendar for the next ${days} day${days === 1 ? "" : "s"}.`;
          const list = (data as EventSummaryRow[]).map((e) => {
            const t = e.time ? ` at ${e.time}` : "";
            const loc = e.location ? ` (${e.location})` : "";
            const who = e.assigned_to ? ` — ${e.assigned_to}` : "";
            return `${e.date}${t}: ${e.title}${loc}${who}`;
          }).join("; ");
          return `Next ${days} day${days === 1 ? "" : "s"} (${data.length} event${data.length === 1 ? "" : "s"}): ${list}.`;
        } catch (e) {
          return `Failed to read calendar: ${getErrorMessage(e)}`;
        }
      },
    },
    onMessage: (message: MaiMessage) => {
      console.log("[Mia] message", message);
      const transcript = getUserTranscript(message);
      if (transcript && isGroceryLookup(transcript)) {
        void (async () => {
          try {
            const summary = await readGroceryList({});
            const answer = /empty|Nothing on/i.test(summary)
              ? summary
              : `On your grocery list: ${summary}`;
            conversation.sendContextualUpdate(`GROCERY_LIST_GROUND_TRUTH: ${summary}`);
            setTimeout(() => {
              if (conversation.status === "connected") conversation.sendUserMessage(`Answer my grocery list question using this exact list and do not call calendar tools: ${answer}`);
            }, 200);
          } catch (e) {
            conversation.sendContextualUpdate(
              "The user is asking about the grocery/shopping list. Silently call getGroceryList and answer only from that result. Do not mention tools, checking, fetching, or the calendar."
            );
          }
        })();
      }
      if (transcript && isTaskLookup(transcript)) {
        void (async () => {
          try {
            const summary = await readTaskList({});
            const answer = /No to-do items/i.test(summary) ? summary : `On your to-do list: ${summary}`;
            conversation.sendContextualUpdate(`TODO_LIST_GROUND_TRUTH: ${summary}`);
            setTimeout(() => {
              if (conversation.status === "connected") conversation.sendUserMessage(`Answer my to-do list question using this exact list and do not call calendar tools: ${answer}`);
            }, 200);
          } catch {
            conversation.sendContextualUpdate(
              "The user is asking about the to-do/task list. Silently call getTasks and answer only from that result. Do not mention tools, checking, fetching, or the calendar."
            );
          }
        })();
      }
      // NOTE: We intentionally do NOT auto-parse user transcripts or agent confirmations
      // to insert grocery items. That heuristic added random words from the conversation
      // (reported during Google Play alpha testing). Items are added ONLY when the agent
      // explicitly calls the `addGrocery` client tool with a real item name.
    },
    onConnect: (...args: unknown[]) => {
      const connectedAt = Date.now();
      sessionStartedAtRef.current = connectedAt;
      console.log("[Mia] 🟢 onConnect fired", {
        at: new Date(connectedAt).toISOString(),
        msSinceStartTap: lastStartTapAtRef.current ? connectedAt - lastStartTapAtRef.current : null,
        args,
      });
      setConnecting(false);
      wasConnectedRef.current = true;
      setStatusMessage(t("voice.status.listening"));
      toast({ title: t("voice.toast.connectedTitle"), description: t("voice.toast.connectedDesc") });
    },
    onDisconnect: (...args: unknown[]) => {
      const disconnectedAt = Date.now();
      const lifetimeMs = sessionStartedAtRef.current ? disconnectedAt - sessionStartedAtRef.current : null;
      console.warn("[Mia] 🔴 onDisconnect fired", {
        at: new Date(disconnectedAt).toISOString(),
        sessionLifetimeMs: lifetimeMs,
        wasConnected: wasConnectedRef.current,
        userEndedSession: userEndedSessionRef.current,
        lastError: lastErrorRef.current,
        rawArgs: args,
      });
      // Log voice usage (atomic increment via RPC)
      if (lifetimeMs && lifetimeMs > 1000 && householdIdRef.current && user) {
        const seconds = Math.ceil(lifetimeMs / 1000);
        const hid = householdIdRef.current;
        void supabase.from("voice_usage_log").insert({
          household_id: hid,
          user_id: user.id,
          seconds,
          started_at: new Date(sessionStartedAtRef.current!).toISOString(),
          ended_at: new Date(disconnectedAt).toISOString(),
        }).then(() => {
          setQuota((q) => q ? { ...q, used: q.used + seconds } : q);
          void supabase.rpc("increment_voice_usage", { _household_id: hid, _seconds: seconds });
        });
      }
      sessionStartedAtRef.current = null;
      setConnecting(false);
      setStatusMessage(null);
      if (!userEndedSessionRef.current) void prepareVoiceConnection().catch((error) => console.error("[Mia] voice reconnect prepare failed", error));
      if (wasConnectedRef.current && !userEndedSessionRef.current) {
        toast({
          variant: "destructive",
          title: t("voice.toast.disconnectedTitle"),
          description: lifetimeMs != null ? t("voice.toast.disconnectedDroppedDesc", { seconds: (lifetimeMs / 1000).toFixed(1) }) : t("voice.toast.disconnectedReconnectDesc"),
        });
      } else if (userEndedSessionRef.current) {
        toast({ title: t("voice.toast.conversationEnded") });
      }
      wasConnectedRef.current = false;
      userEndedSessionRef.current = false;
    },
    onError: (error: unknown, ...rest: unknown[]) => {
      lastErrorRef.current = error;
      console.error("[Mia] ❌ onError fired", {
        at: new Date().toISOString(),
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        rawError: error,
        rest,
      });
      setConnecting(false);
      const message = getStartErrorMessage(error, rest[0]);
      setStatusMessage(message);
      toast({ variant: "destructive", title: t("voice.toast.connectionErrorTitle"), description: message });
    },
    onStatusChange: (status: unknown) => {
      console.log("[Mia] ℹ️ onStatusChange", { at: new Date().toISOString(), status });
    },
    onModeChange: (mode: unknown) => {
      console.log("[Mia] ℹ️ onModeChange", { at: new Date().toISOString(), mode });
    },
  });

  const isConnected = conversation.status === "connected";

  const start = useCallback(async () => {
    const tappedAt = Date.now();
    lastStartTapAtRef.current = tappedAt;
    lastErrorRef.current = null;

    // Unlock browser audio output inside the same user gesture so Mia's first words aren't clipped.
    // The ElevenLabs SDK plays via Web Audio API, so we must create AND resume an AudioContext
    // synchronously inside the gesture (iOS Safari requirement), then play a brief silent buffer
    // through it to fully prime the output graph before the agent's first audio chunks arrive.
    try {
      const silentAudio = new Audio(
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA=="
      );
      void silentAudio.play().catch(() => {});
    } catch {
      // ignore
    }
    try {
      const Ctx: typeof AudioContext | undefined =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === "suspended") void ctx.resume().catch(() => {});
        // Play a short silent buffer to fully warm up the output pipeline
        const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * 0.05)), ctx.sampleRate);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }
    } catch {
      // ignore – best effort
    }

    // Server-authoritative entitlement check (covers expired trial, canceled sub, over quota).
    // If it is not already warmed, prepare it first so mic startup remains directly tied to the tap.
    const access = voiceAccessRef.current;
    if (!access || Date.now() - access.checkedAt >= VOICE_ACCESS_MAX_AGE_MS) {
      setConnecting(true);
      setStatusMessage(t("voice.status.preparing"));
      void getVoiceAccess()
        .then((result) => {
          if (!result.ok) {
            const msg = result.reason || t("voice.status.noAccess");
            setStatusMessage(msg);
            toast({ variant: "destructive", title: t("voice.toast.voiceUnavailableTitle"), description: msg });
            return;
          }
          setStatusMessage(t("voice.status.readyTapAgain"));
          toast({ title: t("voice.toast.readyTitle"), description: t("voice.toast.readyDesc") });
        })
        .catch((error) => {
          console.error("[Mia] start: voice access check failed", error);
          const message = getStartErrorMessage(error);
          setStatusMessage(message);
          toast({ variant: "destructive", title: t("voice.toast.voiceUnavailableTitle"), description: message });
        })
        .finally(() => setConnecting(false));
      return;
    }
    if (!access.ok) {
      const msg = access.reason || t("voice.status.noAccess");
      setStatusMessage(msg);
      toast({ variant: "destructive", title: t("voice.toast.voiceUnavailableTitle"), description: msg });
      return;
    }

    const cached = voiceConnectionRef.current;
    console.log("[Mia] 🎙️ start() tapped", {
      at: new Date(tappedAt).toISOString(),
      hasCachedSignedUrl: !!cached,
      cachedAgeMs: cached ? tappedAt - cached.createdAt : null,
      conversationStatus: conversation.status,
    });
    setConnecting(true);
    setStatusMessage(t("voice.status.connecting"));
    try {
      if (!cached || Date.now() - cached.createdAt >= VOICE_CONNECTION_MAX_AGE_MS) {
        console.log("[Mia] start: no fresh signed URL, preparing…");
        setStatusMessage(t("voice.status.preparing"));
        setConnecting(false);
        void prepareVoiceConnection()
          .then(() => {
            console.log("[Mia] start: prepare complete, awaiting next tap");
            toast({ title: t("voice.toast.readyTitle"), description: t("voice.toast.readyDesc") });
          })
          .catch((error) => {
            console.error("[Mia] start: prepare failed", error);
            const message = getStartErrorMessage(error);
            setStatusMessage(message);
            if (isMicDeniedError(error)) setMicDenied(true);
            toast({ variant: "destructive", title: t("voice.toast.couldntPrepareTitle"), description: message });
          });
        return;
      }

      const signedUrl = cached.signedUrl;
      voiceConnectionRef.current = null;
      setVoiceReady(false);
      userEndedSessionRef.current = false;
      wasConnectedRef.current = false;
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported in this browser.");
      }
      // Ask for the microphone explicitly first. On Android this triggers the
      // native permission dialog (and registers the app under Settings →
      // Permissions → Microphone) before the realtime session starts.
      try {
        const warmup = await navigator.mediaDevices.getUserMedia({ audio: true });
        warmup.getTracks().forEach((track) => track.stop());
      } catch (permError) {
        console.error("[Mia] microphone permission denied", permError);
        throw permError;
      }

      console.log("[Mia] start: calling conversation.startSession()", { connectionType: "websocket" });
      // Always re-fetch the linked family member right before starting,
      // so Mia uses the latest "I am…" selection (set after sign-in, etc.)
      if (user && householdIdRef.current) {
        const { data: fam } = await supabase
          .from("family_members")
          .select("name, role, user_id")
          .eq("household_id", householdIdRef.current);
        if (fam) {
          familyMembersRef.current = fam.filter((f) => f?.name);
          const me = fam.find((f) => (f as any).user_id === user.id);
          if (me?.name) userNameRef.current = me.name;
        }
      }
      const familySummary = familyMembersRef.current
        .map((m) => (m.role && m.role !== "Member" ? `${m.name} (${m.role})` : m.name))
        .join(", ");
      const userName = userNameRef.current?.trim() || "there";
      await refreshListSnapshots(householdIdRef.current);
      const grocerySnapshot = summarizeGroceryRows(groceryListRef.current, {});
      const todoSnapshot = summarizeTaskRows(taskListRef.current, {});
      // Re-read the assistant language right before connecting so a change in
      // Settings applies to the very next conversation.
      if (householdIdRef.current) {
        const { data: hh } = await supabase
          .from("households")
          .select("assistant_language")
          .eq("id", householdIdRef.current)
          .maybeSingle();
        if (hh?.assistant_language) assistantLanguageRef.current = hh.assistant_language;
      }
      const agentLanguage = (assistantLanguageRef.current || "en").split("-")[0];
      console.log("[Mia] start: agent language", agentLanguage);
      const result = conversation.startSession({
        signedUrl,
        connectionType: "websocket",
        useWakeLock: false,
        overrides: {
          agent: {
            // Makes the agent speak (not just understand) the chosen language.
            // Runtime value comes from our own 15-language list; cast to the SDK's literal union.
            language: agentLanguage as "en",
          },
        },
        dynamicVariables: {
          assistant_language: agentLanguage,
          user_name: userName,
          family_members: familySummary || "no family members added yet",
          grocery_list_snapshot: grocerySnapshot,
          todo_list_snapshot: todoSnapshot,
        },
      });
      Promise.resolve(result)
        .then((sessionId) => console.log("[Mia] startSession resolved", { sessionId, at: new Date().toISOString() }))
        .catch((err) => console.error("[Mia] startSession rejected", err));
    } catch (err) {
      console.error("[Mia] start: synchronous throw", err);
      voiceConnectionRef.current = null;
      setVoiceReady(false);
      const message = getStartErrorMessage(err);
      setStatusMessage(message);
      if (isMicDeniedError(err)) setMicDenied(true);
      toast({
        variant: "destructive",
        title: t("voice.toast.couldntStartTitle"),
        description: message,
      });
    } finally {
      setConnecting(false);
    }
  }, [conversation, prepareVoiceConnection, getVoiceAccess, refreshListSnapshots]);

  const stop = useCallback(async () => {
    console.log("[Mia] 🛑 stop() called by user", { at: new Date().toISOString() });
    userEndedSessionRef.current = true;
    await conversation.endSession();
    console.log("[Mia] stop: endSession resolved");
  }, [conversation]);

  useEffect(() => {
    console.log("[Mia] 🔄 conversation.status changed", {
      at: new Date().toISOString(),
      status: conversation.status,
      isSpeaking: conversation.isSpeaking,
    });
  }, [conversation.status, conversation.isSpeaking]);

  return (
    <>
      <DraggableVoiceButton
        isConnected={isConnected}
        connecting={connecting}
        preparingVoice={preparingVoice}
        voiceReady={voiceReady}
        statusMessage={statusMessage}
        quota={quota}
        onToggle={isConnected ? stop : start}
      />
      <Dialog open={micDenied} onOpenChange={setMicDenied}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MicOff className="w-5 h-5 text-destructive" />
              {t("mic.deniedTitle")}
            </DialogTitle>
            <DialogDescription>{t("mic.deniedDialogDesc")}</DialogDescription>
          </DialogHeader>
          <button
            onClick={async () => {
              const opened = await micPermission.openAppSettings();
              if (!opened) {
                toast({ title: t("mic.webHowToTitle"), description: t("mic.webHowToDesc") });
              }
            }}
            className="w-full h-11 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-medium shadow-glow flex items-center justify-center gap-2"
          >
            <Settings2 className="w-4 h-4" />
            {t("mic.openSettings")}
          </button>
          <button
            onClick={async () => {
              const next = await micPermission.request();
              if (next === "granted") {
                setMicDenied(false);
                toast({ title: t("mic.grantedTitle") });
              }
            }}
            className="w-full h-10 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("mic.tryAgain")}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
};

type DraggableProps = {
  isConnected: boolean;
  connecting: boolean;
  preparingVoice: boolean;
  voiceReady: boolean;
  statusMessage: string | null;
  quota: { used: number; limit: number; tier: string } | null;
  onToggle: () => void;
};

const POS_KEY = "mia_voice_button_pos_v3";
const BTN_SIZE = 72;

// Keep the floating voice button above the bottom nav bar and safe area.
function getBottomSafeArea() {
  if (typeof window === "undefined") return 104;
  // Prefer the real measured nav bar, it's the source of truth.
  const nav = document.querySelector("nav");
  if (nav) {
    const rect = nav.getBoundingClientRect();
    if (rect.height > 0) {
      // Distance from the viewport bottom to the top of the nav bar + breathing room.
      return Math.max(0, window.innerHeight - rect.top) + 16;
    }
  }
  let navHeight = 0;
  if (!navHeight) {
    // Fall back to the CSS variable, converting rem/px correctly.
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--nav-height")
      .trim();
    const value = parseFloat(raw);
    if (!Number.isNaN(value)) {
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      navHeight = raw.endsWith("rem") ? value * rootPx : value;
    }
  }
  if (!navHeight) navHeight = 80;
  const inset = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--safe-area-bottom"),
  ) || 0;
  // nav height + safe area inset + breathing room.
  return navHeight + inset + 24;
}


const DraggableVoiceButton = ({ isConnected, connecting, preparingVoice, voiceReady, statusMessage, quota, onToggle }: DraggableProps) => {
  const { t } = useTranslation();
  const safeBottom = getBottomSafeArea();
  const [showHint, setShowHint] = useState(() => {
    try {
      return localStorage.getItem("mia_voice_hint_seen") !== "1";
    } catch { return true; }
  });
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // If the saved position is below the nav bar, reset it.
        const h = typeof window !== "undefined" ? window.innerHeight : 800;
        if (parsed.y > h - BTN_SIZE - safeBottom) {
          return { x: parsed.x, y: h - BTN_SIZE - safeBottom };
        }
        return parsed;
      }
    } catch { /* noop */ }
    const w = typeof window !== "undefined" ? window.innerWidth : 400;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    return { x: w - BTN_SIZE - 20, y: h - BTN_SIZE - safeBottom };
  });
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  const clamp = useCallback((p: { x: number; y: number }) => {
    const sb = getBottomSafeArea();
    return {
      x: Math.min(Math.max(12, p.x), window.innerWidth - BTN_SIZE - 12),
      y: Math.min(Math.max(12, p.y), window.innerHeight - BTN_SIZE - sb),
    };
  }, []);

  useEffect(() => {
    // Re-clamp once mounted: the nav bar can only be measured after render.
    const id = requestAnimationFrame(() => setPos((p) => clamp(p)));
    const handleResize = () => setPos((p) => clamp(p));
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", handleResize);
    };
  }, [clamp]);


  useEffect(() => {
    if (!showHint) return;
    const timer = setTimeout(() => {
      setShowHint(false);
      try { localStorage.setItem("mia_voice_hint_seen", "1"); } catch { /* noop */ }
    }, 6000);
    return () => clearTimeout(timer);
  }, [showHint]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    movedRef.current = false;
    offsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const nx = e.clientX - offsetRef.current.x;
    const ny = e.clientY - offsetRef.current.y;
    if (Math.abs(nx - pos.x) > 3 || Math.abs(ny - pos.y) > 3) movedRef.current = true;
    setPos(clamp({ x: nx, y: ny }));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    if (movedRef.current) {
      try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* noop */ }
    } else {
      setShowHint(false);
      try { localStorage.setItem("mia_voice_hint_seen", "1"); } catch { /* noop */ }
      onToggle();
    }
  };

  const onLeftHalf = pos.x < (typeof window !== "undefined" ? window.innerWidth : 400) / 2;

  return (
    <div
      className="fixed z-[60] flex flex-col gap-2 touch-none select-none"
      style={{ left: pos.x, top: pos.y, alignItems: onLeftHalf ? "flex-start" : "flex-end" }}
    >
      {showHint && (
        <div className="max-w-56 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground shadow-lg animate-fade-in">
          {t("voice.hint")}
        </div>
      )}
      {statusMessage && (
        <div className="max-w-64 rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg" role="status">
          {statusMessage}
        </div>
      )}
      {quota && (
        <div className="text-xs text-muted-foreground bg-card/80 backdrop-blur border border-border rounded-full px-2 py-0.5">
          {t("voice.quota.minutes", { used: Math.floor(quota.used / 60), limit: Math.floor(quota.limit / 60) })}
        </div>
      )}
      <div
        role="button"
        aria-label={isConnected ? t("voice.aria.endConversation") : t("voice.aria.talkToMia")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ width: BTN_SIZE, height: BTN_SIZE, opacity: connecting ? 0.7 : 1 }}
        className={`relative flex items-center justify-center rounded-full shadow-xl transition-all cursor-grab active:cursor-grabbing ${
          isConnected
            ? "bg-destructive text-destructive-foreground"
            : voiceReady
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground"
        }`}
      >
        {/* Pulsing glow ring to make the button more discoverable. */}
        {!isConnected && (
          <span className="absolute inset-[-6px] rounded-full border-2 border-primary/40 animate-ping-slow pointer-events-none" />
        )}
        {connecting ? (
          <Loader2 className="w-7 h-7 animate-spin" />
        ) : isConnected ? (
          <MicOff className="w-7 h-7" />
        ) : preparingVoice ? (
          <Loader2 className="w-7 h-7 animate-spin" />
        ) : (
          <Mic className="w-7 h-7" />
        )}
      </div>
    </div>
  );
};

export const VoiceAssistant = () => (
  <ConversationProvider>
    <VoiceAssistantInner />
  </ConversationProvider>
);
