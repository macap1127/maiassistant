import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

export const isPushSupported = () => Capacitor.isNativePlatform();

/**
 * Request permission, register with FCM/APNs, and persist the device token
 * to the `device_tokens` table for the current user.
 * Returns the registered token, or null if unavailable / denied.
 */
export async function registerPushNotifications(): Promise<string | null> {
  if (!isPushSupported()) return null;

  const perm = await PushNotifications.checkPermissions();
  let status = perm.receive;
  if (status === "prompt" || status === "prompt-with-rationale") {
    const req = await PushNotifications.requestPermissions();
    status = req.receive;
  }
  if (status !== "granted") return null;

  const token = await new Promise<string | null>((resolve) => {
    let settled = false;
    const done = (val: string | null) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };
    PushNotifications.addListener("registration", (t) => done(t.value));
    PushNotifications.addListener("registrationError", () => done(null));
    PushNotifications.register().catch(() => done(null));
    setTimeout(() => done(null), 15000);
  });

  if (!token) return null;

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return token;

  const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
  await supabase
    .from("device_tokens")
    .upsert(
      { user_id: user.id, token, platform },
      { onConflict: "token" }
    );

  return token;
}

export async function unregisterPushNotifications(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (user) {
      await supabase.from("device_tokens").delete().eq("user_id", user.id);
    }
    await PushNotifications.removeAllListeners();
  } catch {
    // ignore
  }
}
