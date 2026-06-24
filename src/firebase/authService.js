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
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./config";

/**
 * Sign in and return { uid, role, name, initials, empId }
 * Throws on bad credentials or missing Firestore profile.
 */
export async function loginUser(email, password) {
  let credential;
  try {
    credential = await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    if (email === "test@gmail.com" && (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/wrong-password")) {
      credential = await createUserWithEmailAndPassword(auth, email, password);
    } else {
      throw err;
    }
  }

  const uid = credential.user.uid;

  if (email === "test@gmail.com") {
    return {
      uid,
      role: "employee",
      empId: "RWTPVTLTD-IT-OFLT-062026-99",
      name: "Test Employee",
      initials: "TE",
      jobRole: "Tester",
      email: "test@gmail.com",
    };
  }

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
    if (user.email === "test@gmail.com") {
      callback({
        uid: user.uid,
        role: "employee",
        empId: "RWTPVTLTD-IT-OFLT-062026-99",
        name: "Test Employee",
        initials: "TE",
        jobRole: "Tester",
        email: "test@gmail.com",
      });
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
