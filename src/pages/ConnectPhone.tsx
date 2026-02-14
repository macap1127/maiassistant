import { useState } from "react";
import { Phone } from "lucide-react";
import { savePhone } from "@/lib/store";
import maiLogo from "@/assets/mai-logo.png";

interface Props {
  onConnected: () => void;
}

const ConnectPhone = ({ onConnected }: Props) => {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const handleConnect = () => {
    const cleaned = phone.trim().replace(/\s/g, "");
    if (!cleaned || cleaned.length < 10) {
      setError("Enter a valid phone number (e.g. +16465551234)");
      return;
    }
    savePhone(cleaned);
    onConnected();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center animate-fade-in">
        <img src={maiLogo} alt="Mai" className="w-16 h-16 rounded-2xl shadow-sm mx-auto mb-6" />
        <h1 className="text-2xl font-serif font-semibold mb-2">Welcome to Mai</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Enter your family phone number to connect with your assistant.
        </p>

        <div className="space-y-4">
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              placeholder="+1 (646) 555-1234"
              className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={handleConnect}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Connect
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          This is the phone number linked to your Mai voice assistant.
        </p>
      </div>
    </div>
  );
};

export default ConnectPhone;
