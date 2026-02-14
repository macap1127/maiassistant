import { useFamilyData } from "@/lib/store";
import { useState } from "react";
import maiLogo from "@/assets/mai-logo.png";

const SettingsPage = () => {
  const { data, update } = useFamilyData();
  const [familyName, setFamilyName] = useState(data.familyName);
  const [saved, setSaved] = useState(false);

  const save = () => {
    update((d) => ({ ...d, familyName: familyName.trim() || d.familyName }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page-container">
      <h1 className="text-2xl font-serif font-semibold mb-6 animate-fade-in">Settings</h1>

      <div className="flex flex-col items-center mb-8 animate-slide-up">
        <img src={maiLogo} alt="Mai" className="w-20 h-20 rounded-3xl shadow-sm mb-3" />
        <p className="text-lg font-serif font-semibold">Mai</p>
        <p className="text-xs text-muted-foreground">Your Family Assistant</p>
      </div>

      <div className="space-y-4">
        <div className="bg-card rounded-2xl p-4 border border-border animate-slide-up">
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Family Name
          </label>
          <input
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border animate-slide-up" style={{ animationDelay: "80ms" }}>
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Assistant Preferences
          </label>
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Voice Tone</span>
              <span className="text-sm text-muted-foreground">Friendly</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Reminders</span>
              <span className="text-sm text-muted-foreground">Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Language</span>
              <span className="text-sm text-muted-foreground">English</span>
            </div>
          </div>
        </div>

        <button
          onClick={save}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium hover:opacity-90 transition-opacity animate-slide-up"
          style={{ animationDelay: "160ms" }}
        >
          {saved ? "✓ Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
