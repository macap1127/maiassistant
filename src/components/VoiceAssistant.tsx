import { useConversation, ConversationProvider } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, MessageSquare, Send, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const AGENT_ID = "agent_1201krd1pcfder390aqp7v76q9tx";

const getStartErrorMessage = (err: unknown) => {
  if (err instanceof DOMException && err.name === "NotFoundError") return "No microphone was found on this device.";
  if (err instanceof DOMException && err.name === "NotAllowedError") return "Please allow microphone access to talk to Mai.";
  return err instanceof Error ? err.message : "Please allow microphone access and try again.";
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

const extractGroceryItemsFromUserText = (text: string, awaitingItem: boolean) => {
  const lower = text.toLowerCase();
  const isGroceryCommand = /\b(grocery|groceries|shopping list)\b/.test(lower);
  const isAddCommand = /^\s*(add|put|include)\b/i.test(text);
  const mentionsOtherArea = /\b(task|chore|calendar|event|appointment|reminder)\b/.test(lower);

  if (isGroceryCommand && isAddCommand) {
    const afterAdd = text.replace(/^\s*(add|put|include)\b/i, "").split(/\b(?:to|on|in)\b\s+(?:my\s+|our\s+)?(?:grocery|groceries|shopping list)/i)[0];
    return splitGroceryNames(afterAdd);
  }

  if (awaitingItem || (isAddCommand && !mentionsOtherArea)) {
    return splitGroceryNames(text.replace(/^\s*(add|put|include)\b/i, ""));
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
      const store = match[2].trim().replace(/\s+(grocery|shopping)$/i, "").trim();
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

type TextSessionOptions = Parameters<ReturnType<typeof useConversation>["startSession"]>[0] & { textOnly?: boolean };

const VoiceAssistantInner = () => {
  const { user } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [chatLog, setChatLog] = useState<{ from: "you" | "mai"; text: string }[]>([]);
  const householdIdRef = useRef<string | null>(null);
  const awaitingGroceryItemRef = useRef(false);
  const recentGroceryAddsRef = useRef<Map<string, number>>(new Map());

  // Resolve current household once user is known
  useEffect(() => {
    if (!user) {
      householdIdRef.current = null;
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .limit(1);
      if (!error && data && data.length > 0) {
        householdIdRef.current = data[0].household_id;
      }
    })();
  }, [user]);

  const requireHousehold = () => {
    const hid = householdIdRef.current;
    if (!hid) throw new Error("No household found for current user.");
    return hid;
  };

  const addGroceryItems = useCallback(async (items: { name: string; quantity?: string; category?: string; store?: string }[]) => {
    const hid = requireHousehold();
    const now = Date.now();
    const rows = items
      .map((item) => ({ ...item, name: cleanGroceryName(item.name) }))
      .filter((item) => item.name)
      .filter((item) => now - (recentGroceryAddsRef.current.get(item.name.toLowerCase()) ?? 0) > 20_000)
      .map((item) => ({
        household_id: hid,
        name: item.name,
        quantity: item.quantity ?? "",
        category: item.category ?? "Other",
        store: item.store?.trim() || null,
        added_by: "Mai",
        completed: false,
      }));

    if (rows.length === 0) return [];
    rows.forEach((row) => recentGroceryAddsRef.current.set(row.name.toLowerCase(), now));

    const { error } = await supabase.from("grocery_items").insert(rows);
    if (error) {
      rows.forEach((row) => recentGroceryAddsRef.current.delete(row.name.toLowerCase()));
      throw error;
    }

    return rows.map((row) => row.name);
  }, []);

  const conversation = useConversation({
    clientTools: {
      addGrocery: async (params: { name: string; quantity?: string; category?: string; store?: string }) => {
        console.log("[Mai] addGrocery called", params);
        try {
          const added = await addGroceryItems([params]);
          if (added.length === 0) return `${params.name} was already added.`;
          const where = params.store ? ` (${params.store})` : "";
          return `Added ${params.name}${where} to the grocery list.`;
        } catch (e: unknown) {
          console.error("[Mai] addGrocery threw", e);
          return `Failed to add: ${getErrorMessage(e)}`;
        }
      },
      addTask: async (params: { title: string; assignedTo?: string; dueDate?: string }) => {
        console.log("[Mai] addTask called", params);
        try {
          const hid = requireHousehold();
          const { error } = await supabase.from("tasks").insert({
            household_id: hid,
            title: params.title,
            assigned_to: params.assignedTo ?? "",
            due_date: params.dueDate || null,
            completed: false,
          });
          if (error) {
            console.error("[Mai] addTask insert error", error);
            return `Failed to add: ${error.message}`;
          }
          return `Added task: ${params.title}.`;
        } catch (e: unknown) {
          console.error("[Mai] addTask threw", e);
          return `Failed to add: ${getErrorMessage(e)}`;
        }
      },
      addEvent: async (params: {
        title: string;
        date: string;
        time?: string;
        location?: string;
        notes?: string;
      }) => {
        console.log("[Mai] addEvent called", params);
        try {
          const hid = requireHousehold();
          const { error } = await supabase.from("events").insert({
            household_id: hid,
            title: params.title,
            date: params.date,
            time: params.time || null,
            location: params.location || null,
            notes: params.notes || null,
            added_by: "Mai",
          });
          if (error) {
            console.error("[Mai] addEvent insert error", error);
            return `Failed to add: ${error.message}`;
          }
          return `Added event: ${params.title} on ${params.date}.`;
        } catch (e: unknown) {
          console.error("[Mai] addEvent threw", e);
          return `Failed to add: ${getErrorMessage(e)}`;
        }
      },
    },
    onMessage: (message: MaiMessage) => {
      console.log("[Mai] message", message);
      const text =
        message?.message ||
        message?.agent_response_event?.agent_response ||
        message?.user_transcription_event?.user_transcript;
      const source = message?.source || message?.type;
      if (text && (source === "ai" || source === "agent_response")) {
        setChatLog((l) => [...l, { from: "mai", text }]);
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
              console.error("[Mai] grocery fallback insert failed", error);
              toast({ variant: "destructive", title: "Couldn't add grocery item", description: getErrorMessage(error) });
            });
        }
      }
    },
    onConnect: () => {
      setStatusMessage("Listening…");
      toast({ title: "Connected to Mai", description: "Start speaking…" });
    },
    onDisconnect: () => {
      setStatusMessage(null);
      toast({ title: "Conversation ended" });
    },
    onError: (error) => {
      console.error("ElevenLabs error:", error);
      toast({ variant: "destructive", title: "Connection error", description: "Please try again." });
    },
  });

  const isConnected = conversation.status === "connected";

  const start = useCallback(async () => {
    setConnecting(true);
    setStatusMessage("Connecting to Mai…");
    let micStream: MediaStream | null = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const { data, error } = await supabase.functions.invoke("elevenlabs-token", {
        body: { agentId: AGENT_ID },
      });
      if (error || !data?.signedUrl) throw new Error(error?.message || "Failed to get signed URL");
      await conversation.startSession({
        signedUrl: data.signedUrl,
        connectionType: "websocket",
      });
    } catch (err) {
      console.error(err);
      const message = getStartErrorMessage(err);
      setStatusMessage(message);
      toast({
        variant: "destructive",
        title: "Couldn't start Mai",
        description: message,
      });
    } finally {
      micStream?.getTracks().forEach((track) => track.stop());
      setConnecting(false);
    }
  }, [conversation]);

  const startText = useCallback(async () => {
    setConnecting(true);
    setStatusMessage("Connecting to Mai…");
    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-token", {
        body: { agentId: AGENT_ID },
      });
      if (error || !data?.signedUrl) throw new Error(error?.message || "Failed to get signed URL");
      await conversation.startSession({
        signedUrl: data.signedUrl,
        connectionType: "websocket",
        textOnly: true,
      } as TextSessionOptions);
      setStatusMessage("Type a message to Mai");
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to connect";
      setStatusMessage(message);
      toast({ variant: "destructive", title: "Couldn't start Mai", description: message });
    } finally {
      setConnecting(false);
    }
  }, [conversation]);

  const stop = useCallback(async () => {
    await conversation.endSession();
    setChatLog([]);
  }, [conversation]);

  const sendText = useCallback(async () => {
    const t = textInput.trim();
    if (!t) return;
    setChatLog((l) => [...l, { from: "you", text: t }]);
    setTextInput("");
    const textGroceryItems = extractGroceryItemsFromUserText(t, awaitingGroceryItemRef.current);
    if (textGroceryItems.length > 0) {
      awaitingGroceryItemRef.current = false;
      try {
        const added = await addGroceryItems(textGroceryItems.map((name) => ({ name })));
        if (added.length > 0) {
          setChatLog((l) => [...l, { from: "mai", text: `Added ${added.join(", ")} to your grocery list.` }]);
          toast({ title: "Added to grocery list", description: added.join(", ") });
          return;
        }
      } catch (e: unknown) {
        console.error("[Mai] text grocery add failed", e);
        toast({ variant: "destructive", title: "Couldn't add grocery item", description: getErrorMessage(e) });
        return;
      }
    }
    if ((conversation.status as string) !== "connected") {
      await startText();
      // wait briefly for connection to settle
      for (let i = 0; i < 50; i++) {
        if ((conversation.status as string) === "connected") break;
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    try {
      conversation.sendUserMessage(t);
    } catch (e) {
      console.error("[Mai] sendUserMessage failed", e);
      toast({ variant: "destructive", title: "Send failed", description: "Try again in a moment." });
    }
  }, [textInput, addGroceryItems, startText, conversation]);

  return (
    <div className="fixed bottom-[calc(var(--nav-height)+1rem)] right-4 z-40 flex flex-col items-end gap-2">
      {statusMessage && !textMode && (
        <div className="max-w-64 rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg" role="status">
          {statusMessage}
        </div>
      )}

      {textMode && (
        <div className="w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover shadow-lg flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="text-sm font-medium text-popover-foreground">Type to Mai</div>
            <button
              onClick={() => { setTextMode(false); if (isConnected) stop(); }}
              aria-label="Close text chat"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto p-3 space-y-2 text-sm">
            {chatLog.length === 0 ? (
              <div className="text-muted-foreground">
                Try: "add eggs and milk to the grocery list"
              </div>
            ) : (
              chatLog.map((m, i) => (
                <div key={i} className={m.from === "you" ? "text-right" : "text-left"}>
                  <span className={`inline-block px-2 py-1 rounded ${m.from === "you" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {m.text}
                  </span>
                </div>
              ))
            )}
            {statusMessage && (
              <div className="text-xs text-muted-foreground">{statusMessage}</div>
            )}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); sendText(); }}
            className="flex items-center gap-2 p-2 border-t border-border"
          >
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={connecting || !textInput.trim()}
              aria-label="Send"
              className="flex items-center justify-center w-8 h-8 rounded bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!textMode && (
          <button
            onClick={() => setTextMode(true)}
            aria-label="Type to Mai"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-secondary-foreground shadow-lg hover:scale-105"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={isConnected ? stop : start}
          disabled={connecting}
          aria-label={isConnected ? "End conversation with Mai" : "Talk to Mai"}
          className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all ${
            isConnected
              ? "bg-destructive text-destructive-foreground animate-pulse"
              : "bg-primary text-primary-foreground hover:scale-105"
          }`}
        >
          {connecting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isConnected ? (
            <MicOff className="w-6 h-6" />
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
