import { supabase } from "@/integrations/supabase/client";

const PREF_KEY = "mia_push_enabled";
const TOKEN_KEY = "mia_push_token";

export function getPushPreference(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(PREF_KEY);
  return raw === null ? true : raw === "true";
}

export function setPushPreference(enabled: boolean) {
  localStorage.setItem(PREF_KEY, String(enabled));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("push-preference-changed"));
  }
}

export function saveDeviceToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getDeviceToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export async function deleteDeviceToken(userId: string): Promise<void> {
  const token = getDeviceToken();
  if (token) {
    await supabase.from("device_tokens").delete().eq("token", token);
    localStorage.removeItem(TOKEN_KEY);
  }
}
