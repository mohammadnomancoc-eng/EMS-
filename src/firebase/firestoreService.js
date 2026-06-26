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
import { sendOneSignalPush } from "../utils/onesignal";

// ── Helpers ───────────────────────────────────────────────────
const col = (name) => collection(db, name);

// ════════════════════════════════════════════════════════════
//  EMPLOYEES
// ════════════════════════════════════════════════════════════

/** Fetch a single employee by their RWT ID */
export async function getEmployee(empId) {
  if (empId === "RWTPVTLTD-IT-OFLT-062026-99") {
    return {
      id: empId,
      name: "Test Employee",
      email: "test@gmail.com",
      loginEmail: "test@gmail.com",
      loginPassword: "test123",
      role: "IT",
      department: "IT",
      designation: "Tester",
      status: "Active",
      salary: 50000,
      photoUrl: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
      photoPublicId: "test_placeholder",
    };
  }
  const snap = await getDoc(doc(db, "employees", empId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/** Fetch all employees (one-time) */
export async function getEmployees() {
  const snap = await getDocs(col("employees"));
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, empId: data.empId || d.id, ...data };
  });
}

/** Real-time employees listener — returns unsubscribe fn */
export function subscribeEmployees(callback) {
  return onSnapshot(col("employees"), (snap) => {
    callback(snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, empId: data.empId || d.id, ...data };
    }));
  });
}

/** Add a new employee with a generated RWT-style ID.
 *
 *  ID format: RWTPVTLTD-IT-OFLT-MMYYYY-DD
 *    MM   = month of offer letter generation (2 digits, e.g. 12)
 *    YYYY = year  of offer letter generation (4 digits, e.g. 2025)
 *    DD   = day   of offer letter generation (2 digits, e.g. 05)
 *
 *  Display format (for UI): RWTPVTLTD/IT/OFLT/122025/05
 *  Storage format (Firestore doc ID): RWTPVTLTD-IT-OFLT-122025-05
 *
 *  IMPORTANT: Firestore treats forward-slashes (“/”) in document IDs as
 *  subcollection separators, which breaks writes and causes permission errors.
 *  We store hyphens in Firestore and convert to slashes only for display in the UI.
 *
 *  If multiple employees are added on the same date, a numeric suffix
 *  (_2, _3, …) is appended to keep IDs unique.
 *
 *  Accepted fields (in addition to existing ones):
 *    photoUrl      {string}  – Cloudinary secure_url for profile photo
 *    photoPublicId {string}  – Cloudinary public_id (for future transforms/deletes)
 */
export async function addEmployee(data) {
  // Build the date-based ID from the current date (offer-letter generation date)
  const now  = new Date();
  const mm   = String(now.getMonth() + 1).padStart(2, "0"); // 01–12
  const yyyy = String(now.getFullYear());                    // e.g. 2025
  const dd   = String(now.getDate()).padStart(2, "0");       // 01–31
  // Hyphens used in Firestore doc ID (slashes are path separators in Firestore).
  // formatEmpId() converts hyphens back to slashes for display in the UI.
  const baseId = `RWTPVTLTD-IT-OFLT-${mm}${yyyy}-${dd}`;

  // Ensure uniqueness: check if any doc with this base ID (or suffix) exists
  const snap = await getDocs(col("employees"));
  const existingIds = new Set(snap.docs.map((d) => d.id));

  let newId = baseId;
  let counter = 2;
  while (existingIds.has(newId)) {
    newId = `${baseId}_${counter}`;
    counter++;
  }

  await setDoc(doc(db, "employees", newId), {
    id: newId,
    ...data,
    // Ensure these fields are always present (null if not provided)
    photoUrl:      data.photoUrl      ?? null,
    photoPublicId: data.photoPublicId ?? null,
    createdAt: serverTimestamp(),
  });

  // Notify all about the new onboarded employee
  try {
    await addNotification({
      title: "New Employee Onboarded",
      message: `Welcome ${data.name} to the team! They are joining the ${data.department || "—"} department as ${data.designation || "Staff"}.`,
      type: "all",
      priority: "normal"
    });
  } catch (err) {
    console.error("Failed to add onboarding notification:", err);
  }

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

/**
 * Update the employee's offer letter (Cloudinary URL).
 * Stores the secure URL, Cloudinary public_id, original file name, and upload timestamp.
 *
 * The URL is stored exactly as Cloudinary returns it:
 *   - PDFs  → /raw/upload/ URL  (correct Cloudinary resource type for documents)
 *   - Images → /image/upload/ URL
 *
 * Display and download helpers in cloudinaryService.js handle URL transforms at
 * read time (getOfferLetterViewUrl, getOfferLetterDownloadUrl, getGoogleDocsViewerUrl).
 * We intentionally do NOT rewrite /raw/ → /image/ here because that produces a
 * broken image-type URL for PDFs that Cloudinary cannot render inline.
 *
 * We DO strip any accidental transformation flags (fl_attachment, c_fill, etc.)
 * that older app versions may have written to Firestore.
 *
 * @param {string} id                  – employee doc ID (e.g. "RWT013")
 * @param {string} offerLetterUrl      – Cloudinary secure_url from uploadOfferLetter()
 * @param {string} offerLetterPublicId – Cloudinary public_id
 * @param {string} offerLetterFileName – original file name shown in the UI
 */
export async function updateEmployeeOfferLetter(id, offerLetterUrl, offerLetterPublicId, offerLetterFileName) {
  let cleanUrl = offerLetterUrl || null;
  if (cleanUrl) {
    // Strip any accidental transformation segment between /upload/ and the version token.
    // e.g. /upload/fl_attachment/v1234... → /upload/v1234...
    // e.g. /upload/c_fill,w_200/v1234...  → /upload/v1234...
    // Leaves /raw/upload/ and /image/upload/ paths untouched (no /raw/ ↔ /image/ rewriting).
    cleanUrl = cleanUrl.replace(/\/upload\/(?!v\d)([^/]+\/)+/, "/upload/");
  }

  await updateDoc(doc(db, "employees", id), {
    offerLetterUrl:        cleanUrl,
    offerLetterPublicId,
    offerLetterFileName,
    offerLetterUploadedAt: serverTimestamp(),
    updatedAt:             serverTimestamp(),
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

  // Notify admins
  try {
    await addNotification({
      title: `New ${data.requestType || "Leave"} Request`,
      message: `${data.employeeName || "An employee"} has submitted a ${data.requestType?.toLowerCase() || "leave"} request from ${data.from} to ${data.to}.`,
      type: "all",
      recipientRole: "admin",
      priority: "normal",
      actionUrl: "/leave"
    });
  } catch (err) {
    console.error("Failed to add leave request notification:", err);
  }

  return ref.id;
}

/** Update leave request status (admin: Approved / Rejected) */
export async function updateLeaveStatus(id, status) {
  await updateDoc(doc(db, "leaveRequests", id), {
    status,
    updatedAt: serverTimestamp(),
  });

  try {
    const leaveSnap = await getDoc(doc(db, "leaveRequests", id));
    if (leaveSnap.exists()) {
      const leaveData = leaveSnap.data();
      await addNotification({
        title: `${leaveData.requestType || "Leave"} Request ${status}`,
        message: `Your ${leaveData.requestType?.toLowerCase() || "leave"} request from ${leaveData.from} to ${leaveData.to} has been ${status.toLowerCase()}.`,
        type: "employee",
        targetId: leaveData.empId,
        recipientId: leaveData.empId,
        priority: status === "Approved" ? "normal" : "high",
        actionUrl: "/my-leave"
      });
    }
  } catch (err) {
    console.error("Failed to add leave status notification:", err);
  }
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
 * NOTE: This query requires admin-level Firestore access.
 * Employees must use getOwnAttendanceRecord() instead.
 */
export async function getAttendanceByDate(date) {
  const q    = query(col("attendance"), where("date", "==", date));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch a single employee's own attendance record for a specific date.
 * Uses getDoc() on the known document ID "{empId}_{date}" so it works
 * under employee Firestore rules (no collection-level query needed).
 * Returns null if no record exists yet.
 */
export async function getOwnAttendanceRecord(empId, date) {
  if (empId === "RWTPVTLTD-IT-OFLT-062026-99") {
    const key = `mock_att_${empId}_${date}`;
    const local = localStorage.getItem(key);
    return local ? JSON.parse(local) : null;
  }
  const id   = `${empId}_${date}`;
  const snap = await getDoc(doc(db, "attendance", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
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
 * Optional webcam / geo fields (only written when provided):
 *   markedBy               {string}  – "webcam" | "manual" (default "manual")
 *   webcamSnapshotUrl      {string}  – Cloudinary secure_url (NOT base64)
 *   webcamSnapshotPublicId {string}  – Cloudinary public_id
 *   webcamTimestamp        {string}  – ISO timestamp of the capture
 *   geoDistance            {number}  – metres from office at time of marking
 *   geoVerified            {boolean} – employee was within geo-fence
 */
export async function upsertAttendance({
  empId,
  date,
  status,
  logIn,
  logOut,
  hoursWorked,
  markedBy = "manual",
  webcamSnapshotUrl = null,
  webcamSnapshotPublicId = null,
  webcamTimestamp = null,
  geoDistance = null,
  geoVerified = null,
  faceVerified = null,
  faceDistance = null,
  workDescription = null,
}) {
  if (empId === "RWTPVTLTD-IT-OFLT-062026-99") {
    const key = `mock_att_${empId}_${date}`;
    const payload = {
      empId, date, status, logIn, logOut, hoursWorked, markedBy,
      updatedAt: new Date().toISOString(),
    };
    if (webcamSnapshotUrl)      payload.webcamSnapshotUrl      = webcamSnapshotUrl;
    if (webcamSnapshotPublicId) payload.webcamSnapshotPublicId = webcamSnapshotPublicId;
    if (webcamTimestamp)        payload.webcamTimestamp        = webcamTimestamp;
    if (geoDistance !== null)   payload.geoDistance            = geoDistance;
    if (geoVerified !== null)   payload.geoVerified            = geoVerified;
    if (faceVerified !== null)  payload.faceVerified           = faceVerified;
    if (faceDistance !== null)  payload.faceDistance           = faceDistance;
    if (workDescription)        payload.workDescription        = workDescription;
    localStorage.setItem(key, JSON.stringify(payload));
    
    // Trigger notification for testing purposes
    try {
      const actionLabel = logOut && logOut !== "--" ? "Logged Out" : "Logged In";
      const timeStr = logOut && logOut !== "--" ? logOut : logIn;
      await addNotification({
        title: "Attendance Marked (Test)",
        message: `Test Employee successfully marked ${actionLabel.toLowerCase()} at ${timeStr}.`,
        type: "employee",
        targetId: empId,
        recipientId: empId,
        priority: "normal",
        actionUrl: "/my-attendance"
      });
    } catch (_) {}
    return;
  }
  const id = `${empId}_${date}`;
  const payload = {
    empId, date, status, logIn, logOut, hoursWorked, markedBy,
    updatedAt: serverTimestamp(),
  };
  // Only store optional fields when provided — manual admin edits never wipe webcam/geo/face data
  if (webcamSnapshotUrl)      payload.webcamSnapshotUrl      = webcamSnapshotUrl;
  if (webcamSnapshotPublicId) payload.webcamSnapshotPublicId = webcamSnapshotPublicId;
  if (webcamTimestamp)        payload.webcamTimestamp        = webcamTimestamp;
  if (geoDistance !== null)   payload.geoDistance            = geoDistance;
  if (geoVerified !== null)   payload.geoVerified            = geoVerified;
  if (faceVerified !== null)  payload.faceVerified           = faceVerified;
  if (faceDistance !== null)  payload.faceDistance           = faceDistance;
  if (workDescription)        payload.workDescription        = workDescription;

  await setDoc(doc(db, "attendance", id), payload, { merge: true });

  // Trigger notification for production employee
  try {
    const actionLabel = logOut && logOut !== "--" ? "Logged Out" : "Logged In";
    const timeStr = logOut && logOut !== "--" ? logOut : logIn;
    await addNotification({
      title: "Attendance Marked Successfully",
      message: `You successfully marked your ${actionLabel.toLowerCase()} at ${timeStr}.`,
      type: "employee",
      targetId: empId,
      recipientId: empId,
      priority: "normal",
      actionUrl: "/my-attendance"
    });
  } catch (err) {
    console.error("Failed to add attendance success notification:", err);
  }
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

// ════════════════════════════════════════════════════════════
//  COMPANY SETTINGS  (/settings/company)
//
//  Shape: {
//    name, gstin, pan, address,
//    workingDays, workStart, workEnd,
//    leaveYear, payDay, currency,
//    officeLat, officeLng, geoFenceRadius,
//    updatedAt
//  }
// ════════════════════════════════════════════════════════════

const SETTINGS_DOC = doc(db, "settings", "company");

/** Fetch company settings once. Returns null if not configured yet. */
export async function getCompanySettings() {
  const snap = await getDoc(SETTINGS_DOC);
  return snap.exists() ? snap.data() : null;
}

/** Save / merge company settings. */
export async function saveCompanySettings(data) {
  await setDoc(SETTINGS_DOC, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

/** Real-time listener for company settings. */
export function subscribeCompanySettings(callback) {
  return onSnapshot(SETTINGS_DOC, (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}
// ════════════════════════════════════════════════════════════
//  ID CARD TEMPLATES
// ════════════════════════════════════════════════════════════

/** Fetch all saved ID card templates (one-time). */
export async function getIdCardTemplates() {
  const snap = await getDocs(col("idcard_templates"));
  return snap.docs.map((d) => ({ id: d.id, name: d.data().name, config: d.data().config, ...d.data() }));
}

/** Real-time listener for ID card templates — returns unsubscribe fn. */
export function subscribeIdCardTemplates(callback) {
  return onSnapshot(col("idcard_templates"), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, name: d.data().name, config: d.data().config })));
  });
}

/** Delete a template by its Firestore doc ID. */
export async function deleteIdCardTemplate(templateId) {
  await deleteDoc(doc(db, "idcard_templates", templateId));
}

// ════════════════════════════════════════════════════════════
//  PROJECTS
//
//  Collection: projects
//  Document shape:
//    {
//      empId           : string   – employee doc ID
//      name            : string   – project name
//      description     : string   – optional description
//      status          : "Ongoing" | "Completed"
//      startDate       : string   – YYYY-MM-DD
//      expectedEndDate : string | null – YYYY-MM-DD (Ongoing only)
//      completionDate  : string | null – YYYY-MM-DD (Completed only)
//      createdAt       : Timestamp
//      updatedAt       : Timestamp
//    }
// ════════════════════════════════════════════════════════════

/** Real-time listener for all projects assigned to a specific employee. */
export function subscribeProjectsByEmployee(empId, callback) {
  const q = query(col("projects"), where("empId", "==", empId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** Fetch all projects for a specific employee (one-time). */
export async function getProjectsByEmployee(empId) {
  if (empId === "RWTPVTLTD-IT-OFLT-062026-99") {
    return [{ id: "mock-proj-1", name: "EMS Testing", status: "Ongoing" }];
  }
  const q    = query(col("projects"), where("empId", "==", empId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Add a new project. */
export async function addProject(data) {
  const ref = await addDoc(col("projects"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await addNotification({
      title: "New Project Assigned",
      message: `You have been assigned to a new project: "${data.name}".`,
      type: "employee",
      targetId: data.empId,
      recipientId: data.empId,
      priority: "normal",
      actionUrl: "/my-projects"
    });
  } catch (err) {
    console.error("Failed to add project notification:", err);
  }

  return ref.id;
}

/** Update an existing project. */
export async function updateProject(id, data) {
  await updateDoc(doc(db, "projects", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });

  try {
    if (data.status) {
      const projSnap = await getDoc(doc(db, "projects", id));
      if (projSnap.exists()) {
        const projData = projSnap.data();
        await addNotification({
          title: "Project Status Updated",
          message: `The status of your project "${projData.name}" has been updated to "${data.status}".`,
          type: "employee",
          targetId: projData.empId,
          recipientId: projData.empId,
          priority: "normal",
          actionUrl: "/my-projects"
        });
      }
    }
  } catch (err) {
    console.error("Failed to add project update notification:", err);
  }
}

/** Delete a project. */
export async function deleteProject(id) {
  await deleteDoc(doc(db, "projects", id));
}





// ════════════════════════════════════════════════════════════
//  NOTIFICATIONS
//
//  Collection: notifications
//  Document shape:
//    {
//      title      : string          – short heading
//      message    : string          – body text
//      type       : "all" | "employee" | "department"
//      targetId   : string | null   – empId or department name (when type != "all")
//      priority   : "low" | "normal" | "high"
//      createdAt  : Timestamp
//      createdBy  : string          – admin display name
//      readBy     : string[]        – array of empIds who have read it
//    }
// ════════════════════════════════════════════════════════════

/** Real-time listener — all notifications (admin view, newest first). */
export function subscribeAllNotifications(callback) {
  const q = query(col("notifications"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    (error) => {
      console.warn("[Notifications] Admin snapshot error:", error.code);
      callback([]);
    }
  );
}

/** Real-time listener — notifications visible to a specific employee.
 *
 *  NOTE: Firestore rules do not allow employees to query the full collection
 *  (no `list` on filtered queries). We fetch docs individually via onSnapshot
 *  on the whole collection and filter client-side. The updated firestore.rules
 *  includes `allow list: if isAuthed()` on /notifications so this works.
 */
export function subscribeNotificationsForEmployee(empId, department, callback) {
  const q = query(col("notifications"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const visible = all.filter((n) => {
        if (n.type === "all") return true;
        if (n.type === "employee" && (n.recipientId === empId || n.targetId === empId)) return true;
        if (n.type === "department" && (n.department === department || n.targetId === department)) return true;
        return false;
      });
      callback(visible);
    },
    (error) => {
      // Silently swallow permission errors — employee may not yet have a valid session
      console.warn("[Notifications] Snapshot error (ignored):", error.code);
      callback([]);
    }
  );
}

/** Create a new notification. */
export async function addNotification(data) {
  const ref = await addDoc(col("notifications"), {
    title: data.title || "",
    body: data.message || data.body || "",
    message: data.message || data.body || "", // backward compatibility
    type: data.type || "all", // "all" | "employee" | "department"
    priority: data.priority || "normal", // "low" | "normal" | "high"
    senderId: data.senderId || "system",
    recipientId: data.recipientId || data.targetId || null,
    targetId: data.recipientId || data.targetId || null, // backward compatibility
    recipientRole: data.recipientRole || null,
    department: data.department || (data.type === "department" ? data.targetId : null),
    actionUrl: data.actionUrl || "/announcements",
    read: false,
    readAt: null,
    readBy: [],
    createdAt: serverTimestamp(),
    delivered: false,
    deliveredAt: null,
    pushSent: false,
    pushSentAt: null,
    createdBy: data.createdBy || "System"
  });

  // Dispatch OneSignal Web Push notification asynchronously
  try {
    const title = data.title || "EMS Notification";
    const body = data.message || data.body || "";
    const actionUrl = data.actionUrl || "/announcements";

    sendOneSignalPush({
      title,
      body,
      actionUrl,
      targetRole: data.recipientRole === "admin" ? "admin" : null,
      targetEmpId: data.type === "employee" ? (data.recipientId || data.targetId) : null,
      targetDepartment: data.type === "department" ? (data.recipientId || data.targetId) : null
    });
  } catch (oneSignalErr) {
    console.warn("[OneSignal] Failed to trigger push notification:", oneSignalErr);
  }

  return ref.id;
}

/** Mark a notification as read by an employee. */
export async function markNotificationRead(notifId, empId) {
  const ref = doc(db, "notifications", notifId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const readBy = snap.data().readBy || [];
  if (readBy.includes(empId)) return;
  await updateDoc(ref, { readBy: [...readBy, empId] });
}

/** Mark ALL visible notifications as read for an employee. */
export async function markAllNotificationsRead(notifIds, empId) {
  await Promise.all(notifIds.map((id) => markNotificationRead(id, empId)));
}

/** Delete a notification (admin only). */
export async function deleteNotification(id) {
  await deleteDoc(doc(db, "notifications", id));
}
/** Save login credentials to the employee doc (admin-only, set at creation time). */
export async function saveEmployeeCredentials(empId, email, password) {
  await updateDoc(doc(db, "employees", empId), {
    loginEmail:    email,
    loginPassword: password,
    credentialsViewedAt: null,
  });
}

/** Mark the employee credentials as viewed by the admin (stores first-viewed timestamp). */
export async function markCredentialsViewed(empId) {
  await updateDoc(doc(db, "employees", empId), {
    credentialsViewedAt: serverTimestamp(),
  });
}

// ════════════════════════════════════════════════════════════
//  TEAM PROJECTS  (project-centric, multi-member)
//
//  Collection: teamProjects
//  Document shape:
//    {
//      name         : string   – project name
//      description  : string   – optional description
//      techLead     : string   – name or empId of tech lead
//      clientName   : string   – client name
//      clientPhone  : string   – client phone / number
//      startDate    : string   – YYYY-MM-DD
//      endDate      : string   – YYYY-MM-DD  (expected / actual)
//      status       : "Ongoing" | "Completed" | "On Hold"
//      memberIds    : string[] – array of employee doc IDs
//      createdAt    : Timestamp
//      updatedAt    : Timestamp
//    }
// ════════════════════════════════════════════════════════════

/** Real-time listener for all team projects (newest first). */
export function subscribeTeamProjects(callback) {
  const q = query(col("teamProjects"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** Fetch all team projects once. */
export async function getTeamProjects() {
  const q    = query(col("teamProjects"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Create a new team project. */
export async function addTeamProject(data) {
  const ref = await addDoc(col("teamProjects"), {
    name:        data.name        || "",
    description: data.description || "",
    techLead:    data.techLead    || "",
    clientName:  data.clientName  || "",
    clientPhone: data.clientPhone || "",
    startDate:   data.startDate   || "",
    endDate:     data.endDate     || "",
    status:      data.status      || "Ongoing",
    memberIds:   data.memberIds   || [],
    logoUrl:     data.logoUrl     || "",
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  });
  return ref.id;
}

/** Update a team project (any fields). */
export async function updateTeamProject(id, data) {
  await updateDoc(doc(db, "teamProjects", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a team project. */
export async function deleteTeamProject(id) {
  await deleteDoc(doc(db, "teamProjects", id));
}