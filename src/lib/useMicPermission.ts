import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

export type MicStatus = "granted" | "denied" | "prompt" | "unsupported" | "unknown";

/**
 * Shared microphone permission helper.
 * - status: current permission state (best effort across platforms)
 * - request(): asks for the mic (getUserMedia warm-up) and returns the new status
 * - openAppSettings(): on native, jumps straight to the app's system settings
 *   page so the user can enable the Microphone toggle. On web this is not
 *   possible, so it returns false and the caller should show instructions.
 */
export function useMicPermission() {
  const [status, setStatus] = useState<MicStatus>("unknown");

  const refresh = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return "unsupported" as MicStatus;
    }
    try {
      // Permissions API is available in most webviews/browsers.
      const nav = navigator as Navigator & { permissions?: { query: (d: { name: string }) => Promise<{ state: string }> } };
      if (nav.permissions?.query) {
        const result = await nav.permissions.query({ name: "microphone" });
        const state = result.state === "granted" ? "granted" : result.state === "denied" ? "denied" : "prompt";
        setStatus(state);
        return state as MicStatus;
      }
    } catch {
      // Permissions API not supported for microphone — fall through.
    }
    setStatus("prompt");
    return "prompt" as MicStatus;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const request = useCallback(async (): Promise<MicStatus> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return "unsupported";
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setStatus("granted");
      return "granted";
    } catch (err) {
      const denied =
        (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError")) ||
        (err instanceof Error && /permission|notallowed|denied/i.test(err.message));
      const next: MicStatus = denied ? "denied" : "prompt";
      setStatus(next);
      return next;
    }
  }, []);

  const openAppSettings = useCallback(async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      try {
        await App.openSettings();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  return { status, refresh, request, openAppSettings };
}
