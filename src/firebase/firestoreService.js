// ─────────────────────────────────────────────────────────────
//  src/firebase/firestoreService.js
//  All Firestore read / write operations used by the app.
//
//  Collections:
//    employees       – employee master records
//    departments     – department records
//    leaveRequests   – leave / WFH requests
//    attendance      – daily attendance records
// ─────────────────────────────────────────────────────────────
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

// ── Helpers ───────────────────────────────────────────────────
const col = (name) => collection(db, name);

// ════════════════════════════════════════════════════════════
//  EMPLOYEES
// ════════════════════════════════════════════════════════════

/** Fetch all employees (one-time) */
export async function getEmployees() {
  const snap = await getDocs(col("employees"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Real-time employees listener — returns unsubscribe fn */
export function subscribeEmployees(callback) {
  return onSnapshot(col("employees"), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** Add a new employee with a generated RWT-style ID */
export async function addEmployee(data) {
  // Find the next available RWT number
  const snap = await getDocs(col("employees"));
  const existingNums = snap.docs
    .map((d) => parseInt(d.id.replace("RWT", "")) || 0)
    .filter((n) => !isNaN(n));
  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
  const newId = `RWT${String(nextNum).padStart(3, "0")}`;

  await setDoc(doc(db, "employees", newId), {
    id: newId,
    ...data,
    createdAt: serverTimestamp(),
  });
  return newId;
}

/** Update fields on an existing employee */
export async function updateEmployee(id, data) {
  await updateDoc(doc(db, "employees", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Delete an employee */
export async function deleteEmployee(id) {
  await deleteDoc(doc(db, "employees", id));
}

// ════════════════════════════════════════════════════════════
//  DEPARTMENTS
// ════════════════════════════════════════════════════════════

/** Fetch all departments (one-time) */
export async function getDepartments() {
  const snap = await getDocs(col("departments"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Real-time departments listener */
export function subscribeDepartments(callback) {
  return onSnapshot(col("departments"), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** Add a department */
export async function addDepartment(data) {
  const ref = await addDoc(col("departments"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update a department */
export async function updateDepartment(id, data) {
  await updateDoc(doc(db, "departments", id), data);
}

/** Delete a department */
export async function deleteDepartment(id) {
  await deleteDoc(doc(db, "departments", id));
}

// ════════════════════════════════════════════════════════════
//  LEAVE REQUESTS
// ════════════════════════════════════════════════════════════

/** Fetch all leave requests (one-time) */
export async function getLeaveRequests() {
  const snap = await getDocs(query(col("leaveRequests"), orderBy("from", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Real-time leave requests listener */
export function subscribeLeaveRequests(callback) {
  return onSnapshot(
    query(col("leaveRequests"), orderBy("from", "desc")),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
  );
}

/** Fetch leave requests for a specific employee */
export async function getLeaveRequestsByEmployee(empId) {
  const q = query(col("leaveRequests"), where("empId", "==", empId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Submit a new leave request */
export async function submitLeaveRequest(data) {
  const ref = await addDoc(col("leaveRequests"), {
    ...data,
    status: "Pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update leave request status (admin: Approved / Rejected) */
export async function updateLeaveStatus(id, status) {
  await updateDoc(doc(db, "leaveRequests", id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a leave request */
export async function deleteLeaveRequest(id) {
  await deleteDoc(doc(db, "leaveRequests", id));
}

// ════════════════════════════════════════════════════════════
//  ATTENDANCE
// ════════════════════════════════════════════════════════════

/**
 * Fetch attendance records for a given date (YYYY-MM-DD).
 * Each document id = "{empId}_{date}"
 */
export async function getAttendanceByDate(date) {
  const q = query(col("attendance"), where("date", "==", date));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Fetch all attendance for a specific employee */
export async function getAttendanceByEmployee(empId) {
  const q = query(
    col("attendance"),
    where("empId", "==", empId),
    orderBy("date", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Upsert a single attendance record.
 * id = "{empId}_{date}" ensures one record per employee per day.
 */
export async function upsertAttendance({ empId, date, status, checkIn, checkOut, hoursWorked }) {
  const id = `${empId}_${date}`;
  await setDoc(
    doc(db, "attendance", id),
    { empId, date, status, checkIn, checkOut, hoursWorked, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** Real-time attendance listener for a specific date */
export function subscribeAttendanceByDate(date, callback) {
  const q = query(col("attendance"), where("date", "==", date));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}