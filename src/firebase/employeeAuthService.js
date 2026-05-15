// ─────────────────────────────────────────────────────────────
//  src/firebase/employeeAuthService.js
// ─────────────────────────────────────────────────────────────
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
} from "firebase/auth";
import {
  doc, setDoc, getDocs, deleteDoc,
  collection, query, where, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { auth, db, firebaseConfig } from "./config";

export function generateEmail(name) {
  return (
    name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "") +
    "@royalswebtech.com"
  );
}

export function generatePassword(empId) {
  const year = new Date().getFullYear();
  return `${empId}@${year}`;
}

function getInitials(name) {
  return name.trim().split(/\s+/).map((n) => n[0].toUpperCase()).join("");
}

// ── CREATE employee Auth account ──────────────────────────────
// FIX: firebaseConfig is now imported directly from config.js (which reads
// from env vars) — callers no longer need to pass it as a parameter.
// The secondary app is torn down immediately after Auth user creation,
// before any Firestore work, so the /users write can never race deleteApp().
export async function createEmployeeAccount({ empId, name, role }) {
  const email    = generateEmail(name);
  const password = generatePassword(empId);

  const secondaryApp  = initializeApp(firebaseConfig, `employee-create-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  let uid;
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    uid = credential.user.uid;
  } finally {
    // Tear down the secondary app before Firestore work — safe because the
    // /users write below uses the primary db (admin session), not secondaryApp.
    await deleteApp(secondaryApp);
  }

  // Write /users doc via the primary admin db.
  // Firestore rule `allow write: if isAdmin()` is satisfied by the admin token.
  await setDoc(doc(db, "users", uid), {
    role:     "employee",
    empId,
    name,
    initials: getInitials(name),
    jobRole:  role,
    email,
    createdAt: serverTimestamp(),
  });

  return { email, password, uid };
}

// ── DELETE Firebase Auth user by UID (no password required) ───
//
// FIX (Bug 2): The original implementation signed in as the employee using
// their DEFAULT password to obtain an idToken, then called deleteUser().
// This silently fails whenever the employee has changed their password,
// leaving a ghost Auth account that can still be used to log in.
//
// Fix: use the currently signed-in admin's Firebase ID token to call the
// Firebase Identity Toolkit REST API accounts:delete endpoint directly.
// The endpoint accepts the admin caller's Bearer token and a localId body
// param targeting the employee — no need to know the employee's password.
//
// NOTE: This REST call works when the admin Firebase account has the
// "Firebase Authentication Admin" IAM role on the project. If not, the
// catch block falls through to a password-based fallback, and if that
// also fails (password changed), a clear console.warn tells the developer
// to delete the Auth account manually in the Firebase Console. Firestore
// cleanup always runs regardless of which Auth path succeeds or fails.
//
// Production upgrade: replace deleteAuthUserByUid() with a Cloud Function
// using the Admin SDK — admin.auth().deleteUser(uid) — which is always
// authorised and requires no IAM role configuration.
async function deleteAuthUserByUid(uid) {
  if (!auth.currentUser) {
    throw new Error("No admin session — cannot obtain ID token.");
  }

  // Get the currently signed-in admin's Firebase ID token (force refresh
  // to ensure it is not expired before the REST call).
  const adminIdToken = await auth.currentUser.getIdToken(true);
  const projectId    = firebaseConfig.projectId;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts/${uid}:delete`,
    {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${adminIdToken}`,
      },
      body: JSON.stringify({}),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `Identity Toolkit accounts:delete returned ${res.status}: ` +
      (body?.error?.message || "unknown reason")
    );
  }
}

// ── DELETE employee Auth account + all Firestore data ─────────
/**
 * Fully removes an employee:
 *  1. Finds their /users/{uid} doc (by empId field)
 *  2. Deletes Firebase Auth user by UID via REST (no password guessing)
 *  3. Deletes /users/{uid} doc
 *  4. Deletes all /leaveRequests where empId matches
 *  5. Deletes all /attendance where empId matches
 *  6. Deletes the /employees/{empId} doc — always executed
 *
 * @param {string} empId - e.g. "RWT013"
 */
export async function deleteEmployeeAccount(empId) {
  // 1. Find the /users doc for this employee
  const usersSnap = await getDocs(
    query(collection(db, "users"), where("empId", "==", empId))
  );

  let uid   = null;
  let email = null;

  if (!usersSnap.empty) {
    const userDoc = usersSnap.docs[0];
    uid   = userDoc.id;
    email = userDoc.data().email;
  }

  // 2. Delete Firebase Auth account — wrapped so Auth errors never block cleanup.
  if (uid) {
    try {
      // Primary path: REST API call using the admin ID token — no password needed.
      await deleteAuthUserByUid(uid);
    } catch (restErr) {
      // REST failed (e.g. IAM role not set). Attempt password-based fallback.
      console.warn(
        "REST-based Auth deletion failed — trying password fallback:",
        restErr.message
      );
      if (email) {
        const fallbackApp  = initializeApp(firebaseConfig, `employee-delete-${Date.now()}`);
        const fallbackAuth = getAuth(fallbackApp);
        try {
          const cred = await signInWithEmailAndPassword(
            fallbackAuth, email, generatePassword(empId)
          );
          await deleteUser(cred.user);
        } catch (pwErr) {
          // Fallback also failed — most likely the employee changed their password.
          // Log a clear warning. The /users doc deletion below will block any
          // further login attempts (Firestore rules deny access without a profile),
          // but the Auth account will linger until manually removed.
          console.warn(
            `[ACTION REQUIRED] Auth account for ${empId} (uid: ${uid}) could not be ` +
            `deleted automatically. Please remove it manually: ` +
            `Firebase Console > Authentication > Users > search ${email} > Delete. ` +
            `Reason: ${pwErr.message}`
          );
        } finally {
          await deleteApp(fallbackApp);
        }
      }
    }

    // 3. Delete /users/{uid} doc (uses primary admin db — always safe).
    // This is the most important cleanup: without a /users doc, the Firestore
    // rules deny all reads/writes for this uid, making the account unusable
    // even if the Auth record still exists.
    try {
      await deleteDoc(doc(db, "users", uid));
    } catch (userDocErr) {
      console.warn("Could not delete /users doc:", userDocErr.message);
    }
  }

  // 4. Delete all leaveRequests for this employee
  try {
    const leaveSnap = await getDocs(
      query(collection(db, "leaveRequests"), where("empId", "==", empId))
    );
    const batch1 = writeBatch(db);
    leaveSnap.docs.forEach((d) => batch1.delete(d.ref));
    await batch1.commit();
  } catch (leaveErr) {
    console.warn("Leave requests cleanup failed:", leaveErr.message);
  }

  // 5. Delete all attendance records for this employee
  try {
    const attSnap = await getDocs(
      query(collection(db, "attendance"), where("empId", "==", empId))
    );
    const batch2 = writeBatch(db);
    attSnap.docs.forEach((d) => batch2.delete(d.ref));
    await batch2.commit();
  } catch (attErr) {
    console.warn("Attendance cleanup failed:", attErr.message);
  }

  // 6. Delete the /employees/{empId} doc — runs unconditionally.
  await deleteDoc(doc(db, "employees", empId));
}