import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Sparkles, Mic, ScanLine, ShieldCheck } from "lucide-react";

const STORAGE_PREFIX = "mia_ai_consent_v1_";

export function AIConsentModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const key = STORAGE_PREFIX + user.id;
    const stored = localStorage.getItem(key);
    if (!stored) setOpen(true);
  }, [user?.id]);

  if (!open || !user?.id) return null;

  const key = STORAGE_PREFIX + user.id;

  const accept = () => {
    localStorage.setItem(key, "accepted");
    setOpen(false);
  };
  const decline = () => {
    localStorage.setItem(key, "declined");
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-title"
    >
      <div className="glass-strong w-full max-w-md rounded-3xl p-6 border border-border ring-glow animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-brand flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="ai-consent-title" className="text-lg font-display font-semibold">
              AI features & content moderation
            </h2>
            <p className="text-xs text-muted-foreground">Please review before continuing</p>
          </div>
        </div>

        <p className="text-sm text-foreground/90 leading-relaxed mb-4">
          MIA uses generative AI to power the voice assistant, receipt scanning, and calendar
          imports. By continuing you agree that:
        </p>

        <ul className="space-y-2.5 mb-5 text-sm text-foreground/85">
          <li className="flex gap-2.5">
            <Mic className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>Voice, photo and text you submit are sent to our AI providers for processing.</span>
          </li>
          <li className="flex gap-2.5">
            <ScanLine className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>Objectionable, illegal, or abusive content is not tolerated and is filtered.</span>
          </li>
          <li className="flex gap-2.5">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              You can report or block content and users via <a href="mailto:support@miafamilyassistant.com" className="text-primary underline">support@miafamilyassistant.com</a>. Reports are reviewed within 24 hours.
            </span>
          </li>
        </ul>

        <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
          See our{" "}
          <a href="/terms" target="_blank" rel="noreferrer" className="underline text-foreground/80">Terms</a>
          {" "}and{" "}
          <a href="/privacy" target="_blank" rel="noreferrer" className="underline text-foreground/80">Privacy Policy</a>.
        </p>

        <div className="flex gap-2">
          <button
            onClick={decline}
            className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-foreground/80 hover:bg-muted transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="flex-1 h-11 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-lg hover:opacity-95 transition-opacity"
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
