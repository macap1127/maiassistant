import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Capacitor } from "@capacitor/core";

createRoot(document.getElementById("root")!).render(<App />);

// Hide the native splash screen as soon as React has mounted the first frame.
// Kept off the web build so it never touches the deployed browser runtime.
if (Capacitor.isNativePlatform()) {
  requestAnimationFrame(() => {
    import("@capacitor/splash-screen")
      .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 250 }))
      .catch(() => {});
  });
}
