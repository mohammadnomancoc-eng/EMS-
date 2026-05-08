// ─────────────────────────────────────────────────────────────
//  src/firebase/employeeAuthService.js
// ─────────────────────────────────────────────────────────────
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from "firebase/auth";
import { doc, setDoc, getDocs, deleteDoc, collection, query, where, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "./config";

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
export async function createEmployeeAccount({ empId, name, role }, firebaseConfig) {
  const email    = generateEmail(name);
  const password = generatePassword(empId);

  const secondaryApp  = initializeApp(firebaseConfig, `employee-create-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = credential.user.uid;

    await setDoc(doc(db, "users", uid), {
      role: "employee",
      empId,
      name,
      initials: getInitials(name),
      jobRole: role,
      email,
      createdAt: serverTimestamp(),
    });

    return { email, password, uid };
  } finally {
    await deleteApp(secondaryApp);
  }
}

// ── DELETE employee Auth account + all Firestore data ─────────
/**
 * Fully removes an employee:
 *  1. Finds their /users/{uid} doc (by empId field)
 *  2. Signs into their account on a secondary app → deletes Firebase Auth user
 *  3. Deletes /users/{uid} doc
 *  4. Deletes all /leaveRequests where empId matches
 *  5. Deletes all /attendance where empId matches
 *  6. Deletes the /employees/{empId} doc
 *
 * @param {string} empId          - e.g. "RWT013"
 * @param {object} firebaseConfig - config object from config.js
 */
export async function deleteEmployeeAccount(empId, firebaseConfig) {
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

  // 2. Delete Firebase Auth account via secondary app
  //    We sign in as the employee on a temp app, then delete that user.
  if (uid && email) {
    const password = generatePassword(empId);
    const secondaryApp  = initializeApp(firebaseConfig, `employee-delete-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const cred = await signInWithEmailAndPassword(secondaryAuth, email, password);
      await deleteUser(cred.user);
    } catch (authErr) {
      // Auth account may already be gone or password changed — continue cleanup
      console.warn("Auth deletion skipped:", authErr.message);
    } finally {
      await deleteApp(secondaryApp);
    }

    // 3. Delete /users/{uid} doc
    await deleteDoc(doc(db, "users", uid));
  }

  // 4. Delete all leaveRequests for this employee
  const leaveSnap = await getDocs(
    query(collection(db, "leaveRequests"), where("empId", "==", empId))
  );
  const batch1 = writeBatch(db);
  leaveSnap.docs.forEach((d) => batch1.delete(d.ref));
  await batch1.commit();

  // 5. Delete all attendance records for this employee
  const attSnap = await getDocs(
    query(collection(db, "attendance"), where("empId", "==", empId))
  );
  const batch2 = writeBatch(db);
  attSnap.docs.forEach((d) => batch2.delete(d.ref));
  await batch2.commit();

  // 6. Delete the /employees/{empId} doc
  await deleteDoc(doc(db, "employees", empId));
}