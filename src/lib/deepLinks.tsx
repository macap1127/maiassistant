import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App, type URLOpenListenerEvent } from "@capacitor/app";

/**
 * Handles Android App Links / iOS Universal Links.
 *
 * When the user taps a link like
 *   https://miafamilyassistant.com/reset-password#access_token=...&type=recovery
 * from their email app, Android (with verified assetlinks.json) opens the app
 * directly and fires `appUrlOpen`. We extract the path + hash/search and route
 * inside the app so the user lands on the in-app reset screen.
 */
export const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: { remove: () => void } | undefined;
    const setup = async () => {
      const listener = await App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
        try {
          const url = new URL(event.url);
          // Only handle our own domain(s) — ignore custom-scheme links here.
          const allowedHosts = ["miafamilyassistant.com", "www.miafamilyassistant.com"];
          if (!allowedHosts.includes(url.hostname)) return;

          const target = `${url.pathname || "/"}${url.search || ""}${url.hash || ""}`;
          navigate(target, { replace: true });
        } catch (err) {
          console.warn("[deepLink] failed to parse url", event.url, err);
        }
      });
      handle = listener;
    };
    setup();

    return () => {
      handle?.remove();
    };
  }, [navigate]);

  return null;
};
