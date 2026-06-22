import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Registers the device with FCM/APNs and stores the resulting token in
 * the `device_tokens` table for the current user. Native platforms only.
 */
export function usePushNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        // Request permission (iOS prompts; Android 13+ also prompts)
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== "granted") {
          console.warn("[push] permission not granted");
          return;
        }

        await PushNotifications.register();

        const regListener = await PushNotifications.addListener(
          "registration",
          async (tokenResult) => {
            const platform = Capacitor.getPlatform() as "ios" | "android" | "web";
            const { error } = await supabase
              .from("device_tokens")
              .upsert(
                {
                  user_id: userId,
                  token: tokenResult.value,
                  platform,
                },
                { onConflict: "token" }
              );
            if (error) console.error("[push] failed to save token", error);
            else console.log("[push] token saved", platform);
          }
        );

        const errListener = await PushNotifications.addListener(
          "registrationError",
          (err) => {
            console.error("[push] registration error", err);
          }
        );

        const recvListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            toast({
              title: notification.title ?? "Notification",
              description: notification.body ?? "",
            });
          }
        );

        cleanup = () => {
          regListener.remove();
          errListener.remove();
          recvListener.remove();
        };
      } catch (e) {
        console.error("[push] setup failed", e);
      }
    })();

    return () => cleanup?.();
  }, [userId]);
}
