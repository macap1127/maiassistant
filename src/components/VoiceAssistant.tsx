import { useConversation, ConversationProvider } from "@elevenlabs/react";
import { useCallback, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AGENT_ID = "agent_1201krd1pcfder390aqp7v76q9tx";

export const VoiceAssistant = () => {
  const [connecting, setConnecting] = useState(false);

  const conversation = useConversation({
    onConnect: () => toast({ title: "Connected to Mai", description: "Start speaking…" }),
    onDisconnect: () => toast({ title: "Conversation ended" }),
    onError: (error) => {
      console.error("ElevenLabs error:", error);
      toast({ variant: "destructive", title: "Connection error", description: "Please try again." });
    },
  });

  const isConnected = conversation.status === "connected";

  const start = useCallback(async () => {
    setConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ agentId: AGENT_ID, connectionType: "webrtc" });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Microphone access required",
        description: "Please allow microphone access to talk to Mai.",
      });
    } finally {
      setConnecting(false);
    }
  }, [conversation]);

  const stop = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  return (
    <button
      onClick={isConnected ? stop : start}
      disabled={connecting}
      aria-label={isConnected ? "End conversation with Mai" : "Talk to Mai"}
      className={`fixed bottom-[calc(var(--nav-height)+1rem)] right-4 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all ${
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
  );
};
