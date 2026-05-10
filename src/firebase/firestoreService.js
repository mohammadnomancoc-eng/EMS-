// ─────────────────────────────────────────────────────────────
//  src/firebase/firestoreService.js
//  All Firestore read / write operations used by the app.
//
//  Collections:
//    employees       – employee master records
//                      NEW: photoUrl, photoPublicId fields
//    departments     – department records
//    leaveRequests   – leave / WFH requests
//    attendance      – daily attendance records
//    media           – NEW: company images & videos uploaded via Cloudinary
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

/** Fetch a single employee by their RWT ID */
export async function getEmployee(empId) {
  const snap = await getDoc(doc(db, "employees", empId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

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

/** Add a new employee with a generated RWT-style ID.
 *
 *  Accepted fields (in addition to existing ones):
 *    photoUrl      {string}  – Cloudinary secure_url for profile photo
 *    photoPublicId {string}  – Cloudinary public_id (for future transforms/deletes)
 */
export async function addEmployee(data) {
  // Find the next available RWT number
  const snap = await getDocs(col("employees"));
  const existingNums = snap.docs
    .map((d) => parseInt(d.id.replace("RWT", "")) || 0)
    .filter((n) => !isNaN(n));
  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
  const newId   = `RWT${String(nextNum).padStart(3, "0")}`;

  await setDoc(doc(db, "employees", newId), {
    id: newId,
    ...data,
    // Ensure these fields are always present (null if not provided)
    photoUrl:      data.photoUrl      ?? null,
    photoPublicId: data.photoPublicId ?? null,
    createdAt: serverTimestamp(),
  });
  return newId;
}

/** Update fields on an existing employee.
 *
 *  To update the profile photo pass:
 *    { photoUrl: "https://res.cloudinary.com/...", photoPublicId: "ems/employees/RWT001_profile" }
 */
export async function updateEmployee(id, data) {
  await updateDoc(doc(db, "employees", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Update only the employee's profile photo (Cloudinary URL). */
export async function updateEmployeePhoto(id, photoUrl, photoPublicId) {
  await updateDoc(doc(db, "employees", id), {
    photoUrl,
    photoPublicId,
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
  const q    = query(col("leaveRequests"), where("empId", "==", empId));
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
  const q    = query(col("attendance"), where("date", "==", date));
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
 *
 * WEBCAM FIELDS (optional — only written when provided so manual
 * admin edits never overwrite webcam data):
 *   markedBy               {string} – "webcam" | "manual" (default "manual")
 *   webcamSnapshotUrl      {string} – Cloudinary secure_url (HTTPS image URL)
 *   webcamSnapshotPublicId {string} – Cloudinary public_id (for transforms/deletion)
 *   webcamTimestamp        {string} – ISO timestamp of the webcam capture
 */
export async function upsertAttendance({
  empId,
  date,
  status,
  checkIn,
  checkOut,
  hoursWorked,
  markedBy = "manual",
  webcamSnapshotUrl = null,
  webcamSnapshotPublicId = null,
  webcamTimestamp = null,
}) {
  const id = `${empId}_${date}`;
  const payload = {
    empId,
    date,
    status,
    checkIn,
    checkOut,
    hoursWorked,
    markedBy,
    updatedAt: serverTimestamp(),
  };
  // Only persist webcam fields when they are provided.
  // This ensures manual admin edits (EditModal) never wipe out the Cloudinary URL.
  if (webcamSnapshotUrl)      payload.webcamSnapshotUrl      = webcamSnapshotUrl;
  if (webcamSnapshotPublicId) payload.webcamSnapshotPublicId = webcamSnapshotPublicId;
  if (webcamTimestamp)        payload.webcamTimestamp        = webcamTimestamp;

  await setDoc(doc(db, "attendance", id), payload, { merge: true });
}

/** Real-time attendance listener for a specific date */
export function subscribeAttendanceByDate(date, callback) {
  const q = query(col("attendance"), where("date", "==", date));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// ════════════════════════════════════════════════════════════
//  MEDIA  (NEW — Cloudinary-backed)
//
//  Each document stores metadata about a Cloudinary asset.
//  The actual file lives on Cloudinary; Firestore holds the URL.
//
//  Document shape:
//    {
//      type        : "image" | "video"
//      secureUrl   : string   – Cloudinary HTTPS URL
//      publicId    : string   – Cloudinary public_id
//      uploadedBy  : string   – empId of uploader
//      label       : string   – human-readable name
//      folder      : string   – e.g. "ems/employees/RWT001"
//      bytes       : number
//      format      : string   – "jpg" | "mp4" etc.
//      createdAt   : Timestamp
//    }
// ════════════════════════════════════════════════════════════

/**
 * Save a Cloudinary upload result to the /media collection in Firestore.
 *
 * @param {Object} params
 * @param {"image"|"video"} params.type
 * @param {string} params.secureUrl    – from Cloudinary upload result
 * @param {string} params.publicId     – from Cloudinary upload result
 * @param {string} params.uploadedBy   – empId
 * @param {string} [params.label]      – optional human label
 * @param {number} [params.bytes]
 * @param {string} [params.format]
 * @returns {Promise<string>} Firestore document id
 */
export async function saveMediaRecord({ type, secureUrl, publicId, uploadedBy, label = "", bytes = 0, format = "" }) {
  const ref = await addDoc(col("media"), {
    type,
    secureUrl,
    publicId,
    uploadedBy,
    label,
    bytes,
    format,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Fetch all media records, newest first.
 * @returns {Promise<Array>}
 */
export async function getMediaRecords() {
  const snap = await getDocs(query(col("media"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch media records uploaded by a specific employee.
 * @param {string} empId
 * @returns {Promise<Array>}
 */
export async function getMediaByEmployee(empId) {
  const q    = query(col("media"), where("uploadedBy", "==", empId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Real-time listener for all media records.
 * @param {Function} callback  – receives array of media docs
 * @returns {Function} unsubscribe
 */
export function subscribeMedia(callback) {
  return onSnapshot(
    query(col("media"), orderBy("createdAt", "desc")),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

/**
 * Delete a media record from Firestore.
 * Note: this does NOT delete the asset from Cloudinary (that requires the Admin API + server).
 * @param {string} id – Firestore document id
 */
export async function deleteMediaRecord(id) {
  await deleteDoc(doc(db, "media", id));
}