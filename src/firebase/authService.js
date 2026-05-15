// ─────────────────────────────────────────────────────────────
//  src/firebase/authService.js
//  Wraps Firebase Auth + Firestore user-role lookup.
//
//  Firestore structure expected:
//    users/{uid}  →  { role: "admin" | "employee", empId: "RWT001", name: "...", initials: "..." }
//
//  On first setup: create user accounts in Firebase Auth Console
//  (or via seedUsers below), then add the matching /users/{uid} docs.
// ─────────────────────────────────────────────────────────────
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./config";

/**
 * Sign in and return { uid, role, name, initials, empId }
 * Throws on bad credentials or missing Firestore profile.
 */
export async function loginUser(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  const profileSnap = await getDoc(doc(db, "users", uid));
  if (!profileSnap.exists()) {
    throw new Error("User profile not found in database.");
  }

  const profile = profileSnap.data();
  return { uid, ...profile };
}

/**
 * Sign out the current user.
 */
export async function logoutUser() {
  await signOut(auth);
}

/**
 * Subscribe to auth state changes.
 * callback receives null (logged out) or { uid, role, name, initials, empId }
 */
export function subscribeAuthState(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }
    try {
      const profileSnap = await getDoc(doc(db, "users", user.uid));
      if (profileSnap.exists()) {
        callback({ uid: user.uid, ...profileSnap.data() });
      } else {
        callback(null);
      }
    } catch {
      callback(null);
    }
  });
}
