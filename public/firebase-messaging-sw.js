// Firebase Cloud Messaging service worker for web push.
// Must live at the site root so the browser can register it at scope "/".
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDBhM5yU0nyPp1xuNfbnGBLVHv2fwDs7IM",
  authDomain: "mia-family-assistant.firebaseapp.com",
  projectId: "mia-family-assistant",
  storageBucket: "mia-family-assistant.firebasestorage.app",
  messagingSenderId: "1083180735307",
  appId: "1:1083180735307:web:c54aace3025499e4ece6ce",
});

// Initialize messaging so FCM can auto-display notifications from the
// `notification` payload. Do NOT add an onBackgroundMessage handler that
// calls showNotification — FCM already shows it, and a manual call here
// produces duplicate notifications.
firebase.messaging();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
