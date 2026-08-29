import { Mic, MicOff, Settings2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMicPermission } from "@/lib/useMicPermission";
import { toast } from "@/hooks/use-toast";

/**
 * Card that shows the microphone permission state and lets the user either
 * grant it (native/browser prompt) or jump to the system app settings page
 * when it was previously denied.
 */
export function MicPermissionCard() {
  const { t } = useTranslation();
  const { status, request, openAppSettings } = useMicPermission();
  const [busy, setBusy] = useState(false);

  const granted = status === "granted";
  const denied = status === "denied";

  const handleEnable = async () => {
    setBusy(true);
    try {
      const next = await request();
      if (next === "denied") {
        toast({
          variant: "destructive",
          title: t("mic.deniedTitle"),
          description: t("mic.deniedDesc"),
        });
      } else if (next === "granted") {
        toast({ title: t("mic.grantedTitle") });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleOpenSettings = async () => {
    setBusy(true);
    try {
      const opened = await openAppSettings();
      if (!opened) {
        toast({ title: t("mic.webHowToTitle"), description: t("mic.webHowToDesc") });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-2">
        {granted ? (
          <Mic className="w-4 h-4 text-primary" />
        ) : (
          <MicOff className="w-4 h-4 text-destructive" />
        )}
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {t("mic.title")}
        </p>
      </div>
      <p className="text-sm text-foreground mb-1">
        {granted ? t("mic.statusOn") : denied ? t("mic.statusOff") : t("mic.statusUnknown")}
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
        {t("mic.explainer")}
      </p>
      {granted ? null : denied ? (
        <button
          onClick={handleOpenSettings}
          disabled={busy}
          className="w-full h-11 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-medium shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
          {t("mic.openSettings")}
        </button>
      ) : (
        <button
          onClick={handleEnable}
          disabled={busy}
          className="w-full h-11 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-medium shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
          {t("mic.enable")}
        </button>
      )}
    </div>
  );
}
