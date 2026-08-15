import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type LimitFeature =
  | "aiCalendarImports"
  | "receiptScans"
  | "voiceMinutes"
  | "members";

const COPY: Record<LimitFeature, { title: string; description: string }> = {
  aiCalendarImports: {
    title: "You've used all your calendar imports",
    description:
      "Your current plan includes a limited number of AI calendar imports each month. Upgrade to keep importing schedules from photos and PDFs.",
  },
  receiptScans: {
    title: "You've used all your receipt scans",
    description:
      "Your current plan includes a limited number of receipt scans each month. Upgrade for unlimited scanning.",
  },
  voiceMinutes: {
    title: "You're out of voice minutes",
    description:
      "You've used all the voice assistant minutes included in your plan for this period. Upgrade for more minutes.",
  },
  members: {
    title: "No family seats left",
    description:
      "Your plan has reached its member limit. Upgrade to add more people to your household.",
  },
};

/**
 * Shared "limit reached" dialog that routes the user to /pricing to upgrade.
 * Usage:
 *   const { promptUpgrade, upgradeDialog } = useUpgradePrompt();
 *   ... promptUpgrade("receiptScans") ... {upgradeDialog}
 */
export function useUpgradePrompt() {
  const navigate = useNavigate();
  const [feature, setFeature] = useState<LimitFeature | null>(null);

  const promptUpgrade = useCallback((f: LimitFeature) => setFeature(f), []);

  const copy = feature ? COPY[feature] : null;

  const upgradeDialog = (
    <Dialog open={!!feature} onOpenChange={(o) => { if (!o) setFeature(null); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {copy?.title}
          </DialogTitle>
          <DialogDescription>{copy?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <button
            onClick={() => setFeature(null)}
            className="bg-secondary text-secondary-foreground rounded-xl px-4 py-2 text-sm"
          >
            Not now
          </button>
          <button
            onClick={() => { setFeature(null); navigate("/pricing"); }}
            className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium"
          >
            View plans
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { promptUpgrade, upgradeDialog };
}

/** Small inline "Upgrade" link/button for quota banners. */
export function UpgradeLink({ className = "", label = "Upgrade" }: { className?: string; label?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/pricing")}
      className={`underline font-medium ${className}`}
    >
      {label}
    </button>
  );
}
