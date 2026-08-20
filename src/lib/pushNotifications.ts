import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { getToken } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";
import { getMessagingIfSupported, VAPID_KEY } from "@/lib/firebase";
import { saveDeviceToken } from "@/lib/pushPreference";

/** Push works on native (FCM via Firebase plugin) and on web browsers that support Web Push. */
export const isPushSupported = () =>
  Capacitor.isNativePlatform() || (typeof window !== "undefined" && "Notification" in window);

export class PushPermissionDeniedError extends Error {
  constructor() {
    super("permission-denied");
    this.name = "PushPermissionDeniedError";
  }
}

async function getNativeToken(): Promise<string | null> {
  let perm = await FirebaseMessaging.checkPermissions();
  if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
    perm = await FirebaseMessaging.requestPermissions();
  }
  if (perm.receive !== "granted") throw new PushPermissionDeniedError();

  // On iOS the APNs token must be available before FCM can mint a token.
  // Retry briefly rather than failing immediately after a fresh permission grant.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { token } = await FirebaseMessaging.getToken();
      if (token) return token;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (lastErr) console.error("[push] getToken failed", lastErr);
  return null;
}

async function getWebToken(): Promise<string | null> {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return null;
  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") throw new PushPermissionDeniedError();

  const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  return (await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg })) || null;
}

/**
 * Request permission, register with FCM, and persist the device token
 * to the `device_tokens` table for the current user.
 * Returns the registered token, or null if unavailable.
 * Throws PushPermissionDeniedError when the user/OS denied notifications.
 */
export async function registerPushNotifications(): Promise<string | null> {
  if (!isPushSupported()) return null;

  const token = Capacitor.isNativePlatform() ? await getNativeToken() : await getWebToken();
  if (!token) return null;

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return token;

  const platform = Capacitor.isNativePlatform()
    ? (Capacitor.getPlatform() as "ios" | "android")
    : "web";

  const { error } = await supabase
    .from("device_tokens")
    .upsert({ user_id: user.id, token, platform }, { onConflict: "token" });
  if (error) {
    console.error("[push] failed to save token", error);
    throw new Error(error.message);
  }
  saveDeviceToken(token);
  return token;
}

export async function unregisterPushNotifications(): Promise<void> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (user) {
      await supabase.from("device_tokens").delete().eq("user_id", user.id);
    }
    if (Capacitor.isNativePlatform()) {
      try {
        await FirebaseMessaging.deleteToken();
      } catch {
        // ignore
      }
      await FirebaseMessaging.removeAllListeners();
    }
  } catch {
    // ignore
  }
}
