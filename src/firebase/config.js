// ─────────────────────────────────────────────────────────────
//  src/firebase/config.js
//  Replace the firebaseConfig values with your own from the
//  Firebase Console → Project Settings → Your apps → Web app
// ─────────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyDtxe0BEtHTehAFMIp-7ocDgGTaVNgYzJw",
  authDomain: "ems-royalswebtech.firebaseapp.com",
  projectId: "ems-royalswebtech",
  storageBucket: "ems-royalswebtech.firebasestorage.app",
  messagingSenderId: "843105626057",
  appId: "1:843105626057:web:3e2f4ca9124ab74961ea18",
  measurementId: "G-6KFM43C6FZ",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;

// ─────────────────────────────────────────────────────────────
//  Cloudinary Configuration
//
//  Add these keys to your .env file (project root):
//
//    VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
//    VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset_name
//
//  Steps to get them:
//    1. Sign up at https://cloudinary.com (free tier is enough)
//    2. Dashboard → "Cloud Name" (copy it)
//    3. Settings → Upload → Upload Presets → "Add upload preset"
//       → Signing Mode = Unsigned → Save → copy the preset name
//    4. Paste both values in .env above
//
//  The values are read in src/cloudinary/cloudinaryService.js
//  via import.meta.env.VITE_CLOUDINARY_*
// ─────────────────────────────────────────────────────────────