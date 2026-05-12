import { useConversation, ConversationProvider } from "@elevenlabs/react";
import { useCallback, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AGENT_ID = "agent_1201krd1pcfder390aqp7v76q9tx";
const SARAH_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

const getStartErrorMessage = (err: unknown) => {
  if (err instanceof DOMException && err.name === "NotFoundError") return "No microphone was found on this device.";
  if (err instanceof DOMException && err.name === "NotAllowedError") return "Please allow microphone access to talk to Mai.";
  return err instanceof Error ? err.message : "Please allow microphone access and try again.";
};

const VoiceAssistantInner = () => {
  const [connecting, setConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const conversation = useConversation({
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
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("elevenlabs-token", {
        body: { agentId: AGENT_ID },
      });
      if (error || !data?.signedUrl) throw new Error(error?.message || "Failed to get signed URL");
      await conversation.startSession({
        signedUrl: data.signedUrl,
        connectionType: "websocket",
        overrides: { tts: { voiceId: SARAH_VOICE_ID } },
      });
    } catch (err) {
      console.error(err);
      const message = getStartErrorMessage(err);
      setStatusMessage(message);
      toast({
        variant: "destructive",
        title: "Couldn’t start Mai",
        description: message,
      });
    } finally {
      micStream?.getTracks().forEach((track) => track.stop());
      setConnecting(false);
    }
  }, [conversation]);

  const stop = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  return (
    <div className="fixed bottom-[calc(var(--nav-height)+1rem)] right-4 z-40 flex flex-col items-end gap-2">
      {statusMessage && (
        <div className="max-w-64 rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg" role="status">
          {statusMessage}
        </div>
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
  );
};

export const VoiceAssistant = () => (
  <ConversationProvider>
    <VoiceAssistantInner />
  </ConversationProvider>
);
