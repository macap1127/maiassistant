import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCoWsrT-b3BQdoFYhjBd2DnULAHgo4qCFo",
  authDomain: "my-family-assistant-now.firebaseapp.com",
  projectId: "my-family-assistant-now",
  storageBucket: "my-family-assistant-now.firebasestorage.app",
  messagingSenderId: "468993545822",
  appId: "1:468993545822:web:7ddc759b0b5df44bbd86cf",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
