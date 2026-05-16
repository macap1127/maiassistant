import { useConversation, ConversationProvider } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const AGENT_ID = "agent_1201krd1pcfder390aqp7v76q9tx";

const getStartErrorMessage = (err: unknown) => {
  if (err instanceof DOMException && err.name === "NotFoundError") return "No microphone was found on this device.";
  if (err instanceof DOMException && err.name === "NotAllowedError") return "Please allow microphone access to talk to Mia.";
  if (err instanceof DOMException && err.name === "NotReadableError") return "Your microphone is busy in another app or tab.";
  const message = typeof err === "string" ? err : err instanceof Error ? err.message : "";
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

type VoiceConnection = { signedUrl: string; createdAt: number };

const VOICE_CONNECTION_MAX_AGE_MS = 4 * 60 * 1000;

const VoiceAssistantInner = () => {
  const { user } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [preparingVoice, setPreparingVoice] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number; tier: string } | null>(null);
  const householdIdRef = useRef<string | null>(null);
  const assistantLanguageRef = useRef<string>("en");
  const userNameRef = useRef<string>("");
  const familyMembersRef = useRef<{ name: string; role: string }[]>([]);
  const awaitingGroceryItemRef = useRef(false);
  const recentGroceryAddsRef = useRef<Map<string, number>>(new Map());
  const voiceConnectionRef = useRef<VoiceConnection | null>(null);
  const voiceConnectionPromiseRef = useRef<Promise<string> | null>(null);
  const userEndedSessionRef = useRef(false);
  const wasConnectedRef = useRef(false);
  const sessionStartedAtRef = useRef<number | null>(null);
  const lastStartTapAtRef = useRef<number | null>(null);
  const lastErrorRef = useRef<unknown>(null);

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
    const hid = householdIdRef.current;
    if (!hid) return { ok: false, reason: "No household" };
    const { data: hasAccess } = await supabase.rpc("household_has_access", { _household_id: hid });
    if (!hasAccess) return { ok: false, reason: "Your subscription has ended or your trial is over. Choose a plan to keep using Mia." };
    const { data: remaining } = await supabase.rpc("voice_seconds_remaining", { _household_id: hid });
    if ((remaining ?? 0) <= 0) return { ok: false, reason: "You've used all your voice minutes for this period. Upgrade to keep talking to Mia." };
    return { ok: true };
  }, []);

  // Resolve current household once user is known
  useEffect(() => {
    if (!user) {
      householdIdRef.current = null;
      userNameRef.current = "";
      familyMembersRef.current = [];
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
        void refreshQuota();
        const { data: hh } = await supabase
          .from("households")
          .select("assistant_language")
          .eq("id", hid)
          .maybeSingle();
        assistantLanguageRef.current = ((hh as any)?.assistant_language as string) || "en";
        const { data: fam } = await supabase
          .from("family_members")
          .select("name, role")
          .eq("household_id", hid);
        if (fam) familyMembersRef.current = fam.filter((f: any) => f?.name);
      }
    })();
  }, [user, refreshQuota]);

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
      .invoke("elevenlabs-token", { body: { agentId: AGENT_ID } })
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) throw new Error(error?.message || data?.error || "Failed to prepare Mia");
        voiceConnectionRef.current = { signedUrl: data.signedUrl as string, createdAt: Date.now() };
        setVoiceReady(true);
        return data.signedUrl as string;
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
      setStatusMessage("Tap the microphone to prepare Mia.");
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

    return rows.map((row) => row.name);
  }, []);

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
            toast({ variant: "destructive", title: "Couldn't add to-do", description: error.message });
            return `Failed to add: ${error.message}`;
          }
          toast({ title: "Added to To Do List", description: params.title });
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
          const list = data.map((e: any) => {
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
      searchReceipts: async (params: { query: string }) => {
        console.log("[Mia] searchReceipts called", params);
        try {
          const hid = requireHousehold();
          const q = (params.query || "").trim();
          if (!q) return `What store or item should I search for?`;
          const { data, error } = await supabase
            .from("receipts")
            .select("store, purchase_date, total, currency, items_summary, image_path")
            .eq("household_id", hid)
            .or(`store.ilike.%${q}%,items_summary.ilike.%${q}%,notes.ilike.%${q}%`)
            .order("purchase_date", { ascending: false, nullsFirst: false })
            .limit(5);
          if (error) return `Couldn't search receipts: ${error.message}`;
          if (!data || data.length === 0) return `No receipts found for "${q}".`;
          const list = data.map((r: any) => {
            const date = r.purchase_date || "no date";
            const total = r.total != null ? ` — ${r.currency || "USD"} ${r.total}` : "";
            const items = r.items_summary ? ` (${r.items_summary})` : "";
            return `${r.store || "Unknown store"} on ${date}${total}${items}`;
          }).join("; ");
          return `Found ${data.length} receipt${data.length === 1 ? "" : "s"} for "${q}": ${list}. Open the Receipts tab to view the photo.`;
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
          toast({ title: `Added ${dish} ingredients`, description: added.join(", ") });
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
            toast({ variant: "destructive", title: "Couldn't add event", description: error.message });
            return `Failed to add: ${error.message}`;
          }
          toast({ title: "Event added", description: `${params.title} — ${params.date}${params.time ? " " + params.time : ""}` });
          return `Added event: ${params.title} on ${params.date}.`;
        } catch (e: unknown) {
          console.error("[Mia] addEvent threw", e);
          return `Failed to add: ${getErrorMessage(e)}`;
        }
      },
    },
    onMessage: (message: MaiMessage) => {
      console.log("[Mia] message", message);
      const text =
        message?.message ||
        message?.agent_response_event?.agent_response ||
        message?.user_transcription_event?.user_transcript;
      const source = message?.source || message?.type;
      if (text && (source === "ai" || source === "agent_response")) {
        awaitingGroceryItemRef.current = /\bgrocery list\b/i.test(text) && /\b(quantity|specific|include|just|what would|which item)\b/i.test(text);

        const confirmedItems = extractGroceryItemFromAgentConfirmation(text);
        if (confirmedItems.length > 0) {
          void addGroceryItems(confirmedItems)
            .then((added) => {
              if (added.length > 0) {
                toast({ title: "Added to grocery list", description: added.join(", ") });
              }
            })
            .catch((error) => {
              console.error("[Mia] grocery fallback insert failed", error);
              toast({ variant: "destructive", title: "Couldn't add grocery item", description: getErrorMessage(error) });
            });
        }
      } else if (text && (source === "user" || source === "user_transcript")) {
        const spokenItems = extractGroceryItemsFromUserText(text, awaitingGroceryItemRef.current);
        console.log("[Mia] user transcript parsed grocery items", { text, spokenItems });
        if (spokenItems.length > 0) {
          awaitingGroceryItemRef.current = false;
          void addGroceryItems(spokenItems)
            .then((added) => {
              if (added.length > 0) {
                toast({ title: "Added to grocery list", description: added.join(", ") });
              }
            })
            .catch((error) => {
              console.error("[Mia] user transcript grocery insert failed", error);
              toast({ variant: "destructive", title: "Couldn't add grocery item", description: getErrorMessage(error) });
            });
        }
      }
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
      setStatusMessage("Listening…");
      toast({ title: "Connected to Mia", description: "Start speaking…" });
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
          title: "Mia disconnected",
          description: lifetimeMs != null ? `Dropped after ${(lifetimeMs / 1000).toFixed(1)}s. Tap the mic to reconnect.` : "Tap the microphone to reconnect.",
        });
      } else if (userEndedSessionRef.current) {
        toast({ title: "Conversation ended" });
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
      const message = getStartErrorMessage(error);
      setStatusMessage(message);
      toast({ variant: "destructive", title: "Connection error", description: message });
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

    // Server-authoritative entitlement check (covers expired trial, canceled sub, over quota)
    const access = await checkAccess();
    if (!access.ok) {
      const msg = access.reason || "You don't have access to voice right now.";
      setStatusMessage(msg);
      toast({ variant: "destructive", title: "Voice unavailable", description: msg });
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
    setStatusMessage("Connecting to Mia…");
    try {
      if (!cached || Date.now() - cached.createdAt >= VOICE_CONNECTION_MAX_AGE_MS) {
        console.log("[Mia] start: no fresh signed URL, preparing…");
        setStatusMessage("Preparing Mia… tap the microphone again in a moment.");
        setConnecting(false);
        void prepareVoiceConnection()
          .then(() => {
            console.log("[Mia] start: prepare complete, awaiting next tap");
            toast({ title: "Mia is ready", description: "Tap the microphone again to start talking." });
          })
          .catch((error) => {
            console.error("[Mia] start: prepare failed", error);
            const message = getStartErrorMessage(error);
            setStatusMessage(message);
            toast({ variant: "destructive", title: "Couldn't prepare Mia", description: message });
          });
        return;
      }

      const signedUrl = cached.signedUrl;
      voiceConnectionRef.current = null;
      setVoiceReady(false);
      userEndedSessionRef.current = false;
      wasConnectedRef.current = false;
      console.log("[Mia] start: calling conversation.startSession()", { connectionType: "websocket" });
      const familySummary = familyMembersRef.current
        .map((m) => (m.role && m.role !== "Member" ? `${m.name} (${m.role})` : m.name))
        .join(", ");
      const userName = userNameRef.current?.trim() || "there";
      const result = conversation.startSession({
        signedUrl,
        connectionType: "websocket",
        useWakeLock: false,
        overrides: {
          agent: {
            language: (assistantLanguageRef.current || "en") as any,
            firstMessage: "Hey there! I'm Mia — your family assistant. What can I help you with today?",
          },
        },
        dynamicVariables: {
          user_name: userName,
          family_members: familySummary || "no family members added yet",
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
      toast({
        variant: "destructive",
        title: "Couldn't start Mia",
        description: message,
      });
    } finally {
      setConnecting(false);
    }
  }, [conversation, prepareVoiceConnection, checkAccess]);

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
    <div className="fixed bottom-[calc(var(--nav-height)+1rem)] right-4 z-40 flex flex-col items-end gap-2">
      {statusMessage && (
        <div className="max-w-64 rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg" role="status">
          {statusMessage}
        </div>
      )}
      {quota && (
        <div className="text-[10px] text-muted-foreground bg-card/80 backdrop-blur border border-border rounded-full px-2 py-0.5">
          {Math.floor(quota.used / 60)}/{Math.floor(quota.limit / 60)} min
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={isConnected ? stop : start}
          disabled={connecting}
          aria-label={isConnected ? "End conversation with Mia" : "Talk to Mia"}
          className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all ${
            isConnected
              ? "bg-destructive text-destructive-foreground animate-pulse"
              : voiceReady
                ? "bg-primary text-primary-foreground hover:scale-105"
                : "bg-secondary text-secondary-foreground hover:scale-105"
          }`}
        >
          {connecting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isConnected ? (
            <MicOff className="w-6 h-6" />
          ) : preparingVoice ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  );
};

export const VoiceAssistant = () => (
  <ConversationProvider>
    <VoiceAssistantInner />
  </ConversationProvider>
);
