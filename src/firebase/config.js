// ─────────────────────────────────────────────────────────────
//  src/firebase/config.js
//
//  FIX (Bug 1 - Hardcoded API keys): All Firebase credentials are
//  now read from environment variables so they are never committed
//  to source control.
//
//  ── Setup ────────────────────────────────────────────────────
//  1. Copy .env.example (project root) to .env
//  2. Fill in your values from:
//       Firebase Console → Project Settings → Your apps → Web app
//  3. .env is already listed in .gitignore — never commit it.
//
//  ── Why the Firebase apiKey is still "safe" in .env ─────────
//  The Firebase Web apiKey is a PUBLIC identifier (it is embedded
//  in every production bundle). Its purpose is to identify your
//  Firebase project to the SDK, NOT to authorise writes.
//  Security is enforced by Firestore rules and Auth token checks.
//  Moving it to .env prevents it from being trivially scraped
//  from your git history and keeps the config pattern consistent
//  with genuinely secret values (Cloudinary secret, etc.).
// ─────────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// All values come from .env (Vite exposes VITE_* vars at build time).
// Fallback strings are intentionally empty — the app will throw a
// clear Firebase error rather than silently misbehave.
export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     || "",
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