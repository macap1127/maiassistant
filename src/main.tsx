import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { Capacitor } from "@capacitor/core";

createRoot(document.getElementById("root")!).render(<App />);

// Hide the native splash screen as soon as React has mounted the first frame.
// Kept off the web build so it never touches the deployed browser runtime.
if (Capacitor.isNativePlatform()) {
  // Lock the native WebView zoom. Without this, focusing a form field zooms the
  // whole app in and the user can't pinch back out (it persists after login).
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover",
    );

  requestAnimationFrame(() => {
    import("@capacitor/splash-screen")
      .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 250 }))
      .catch(() => {});
  });
}
