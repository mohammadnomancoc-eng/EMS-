// ─────────────────────────────────────────────────────────────
//  src/firebase/config.js
//  Replace the firebaseConfig values with your own from the
//  Firebase Console → Project Settings → Your apps → Web app
// ─────────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDtxe0BEtHTehAFMIp-7ocDgGTaVNgYzJw",
  authDomain: "ems-royalswebtech.firebaseapp.com",
  projectId: "ems-royalswebtech",
  storageBucket: "ems-royalswebtech.firebasestorage.app",
  messagingSenderId: "843105626057",
  appId: "1:843105626057:web:3e2f4ca9124ab74961ea18",
  measurementId: "G-6KFM43C6FZ"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
