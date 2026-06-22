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

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Mia";
  const options = {
    body: payload.notification?.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

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
