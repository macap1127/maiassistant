// Firebase web SDK initialization. Config values are public by design.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, type Messaging, isSupported } from "firebase/messaging";

export const firebaseConfig = {
  apiKey: "AIzaSyDBhM5yU0nyPp1xuNfbnGBLVHv2fwDs7IM",
  authDomain: "mia-family-assistant.firebaseapp.com",
  projectId: "mia-family-assistant",
  storageBucket: "mia-family-assistant.firebasestorage.app",
  messagingSenderId: "1083180735307",
  appId: "1:1083180735307:web:c54aace3025499e4ece6ce",
};

// Web Push VAPID public key (safe to expose client-side).
export const VAPID_KEY =
  "BPXd1n191t9cJN10k2DptBQr0BmFdSkjVFCMZMYvq8xiBexMHPmycfAHCbNpO2E9YQbXxV3CV34TaJSxhIpZXb8";

let app: FirebaseApp | undefined;
export function getFirebaseApp(): FirebaseApp {
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

export async function getMessagingIfSupported(): Promise<Messaging | null> {
  try {
    if (typeof window === "undefined") return null;
    if (!(await isSupported())) return null;
    return getMessaging(getFirebaseApp());
  } catch {
    return null;
  }
}
