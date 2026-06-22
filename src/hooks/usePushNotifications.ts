import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { getToken, onMessage } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getMessagingIfSupported, VAPID_KEY } from "@/lib/firebase";

async function registerWebPush(userId: string): Promise<(() => void) | undefined> {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

  const messaging = await getMessagingIfSupported();
  if (!messaging) return;

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    console.warn("[push/web] permission not granted");
    return;
  }

  const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swReg,
  });
  if (!token) return;

  const { error } = await supabase
    .from("device_tokens")
    .upsert({ user_id: userId, token, platform: "web" }, { onConflict: "token" });
  if (error) console.error("[push/web] failed to save token", error);
  else console.log("[push/web] FCM token saved");

  const unsub = onMessage(messaging, (payload) => {
    toast({
      title: payload.notification?.title ?? "Notification",
      description: payload.notification?.body ?? "",
    });
  });
  return () => unsub();
}

/**
 * Registers the device with Firebase Cloud Messaging (FCM) on both iOS and
 * Android, then stores the FCM token in `device_tokens` for the current user.
 * Native platforms only.
 */
export function usePushNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    let cleanup: (() => void) | undefined;

    // Web (browser) push path
    if (!Capacitor.isNativePlatform()) {
      registerWebPush(userId)
        .then((fn) => {
          if (fn) cleanup = fn;
        })
        .catch((e) => console.error("[push/web] setup failed", e));
      return () => cleanup?.();
    }


    (async () => {
      try {
        let perm = await FirebaseMessaging.checkPermissions();
        if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
          perm = await FirebaseMessaging.requestPermissions();
        }
        if (perm.receive !== "granted") {
          console.warn("[push] permission not granted");
          return;
        }

        const saveToken = async (token: string) => {
          const platform = Capacitor.getPlatform() as "ios" | "android" | "web";
          const { error } = await supabase
            .from("device_tokens")
            .upsert(
              { user_id: userId, token, platform },
              { onConflict: "token" }
            );
          if (error) console.error("[push] failed to save token", error);
          else console.log("[push] FCM token saved", platform);
        };

        // Get initial token
        try {
          const { token } = await FirebaseMessaging.getToken();
          if (token) await saveToken(token);
        } catch (e) {
          console.error("[push] getToken failed", e);
        }

        const tokenListener = await FirebaseMessaging.addListener(
          "tokenReceived",
          async ({ token }) => {
            if (token) await saveToken(token);
          }
        );

        const recvListener = await FirebaseMessaging.addListener(
          "notificationReceived",
          ({ notification }) => {
            toast({
              title: notification?.title ?? "Notification",
              description: notification?.body ?? "",
            });
          }
        );

        cleanup = () => {
          tokenListener.remove();
          recvListener.remove();
        };
      } catch (e) {
        console.error("[push] setup failed", e);
      }
    })();

    return () => cleanup?.();
  }, [userId]);
}
