// ─────────────────────────────────────────────────────────────
//  src/components/WebcamAttendance.jsx
//
//  NEW FEATURE: Webcam Attendance
//
//  Provides employees with a webcam-based check-in / check-out modal.
//  Captures a photo snapshot at the moment of action, uploads it to
//  Cloudinary (folder: ems/attendance/{empId}/), stores the returned
//  secure_url in Firestore via upsertAttendance() — which the admin
//  panel already subscribes to in real time. No base64 is stored.
//
//  Usage:
//    <WebcamAttendance
//      empId="RWT001"
//      empName="John Doe"
//      onClose={() => setShowWebcam(false)}
//      onSuccess={(record) => console.log("Marked:", record)}
//    />
//
//  Props:
//    empId    {string}   – employee ID from localStorage ("rwt-user")
//    empName  {string}   – employee name for display
//    onClose  {Function} – called when the modal is dismissed
//    onSuccess{Function} – called with the saved attendance record
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../App";
import { Camera, X, CheckCircle, Clock, AlertCircle, RefreshCw, Video, VideoOff } from "lucide-react";
import { upsertAttendance } from "../firebase/firestoreService";
import { uploadToCloudinary } from "../cloudinary/cloudinaryService";

// ── Helpers ───────────────────────────────────────────────────

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime12(date) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m}:${s} ${ampm}`;
}

function formatTime12NoSec(date) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

function calcHoursWorked(checkIn, checkOut) {
  // Both in "HH:MM AM/PM" format
  try {
    const parse = (t) => {
      const [time, ampm] = t.split(" ");
      let [h, m] = time.split(":").map(Number);
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    const diff = parse(checkOut) - parse(checkIn);
    if (diff <= 0) return "--";
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hrs}h ${mins}m`;
  } catch {
    return "--";
  }
}

// ── Live Clock Component ───────────────────────────────────────
function LiveClock({ isDark }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = time.toLocaleDateString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{
        fontFamily: "Share Tech Mono, monospace",
        fontSize: "32px",
        fontWeight: 700,
        color: "#00B8B8",
        letterSpacing: "0.05em",
        lineHeight: 1,
      }}>
        {formatTime12(time)}
      </p>
      <p style={{
        fontFamily: "Mulish, sans-serif",
        fontSize: "12px",
        color: isDark ? "#666666" : "#999999",
        marginTop: "4px",
      }}>
        {dateStr}
      </p>
    </div>
  );
}

// ── Main WebcamAttendance Modal ───────────────────────────────
export default function WebcamAttendance({ empId, empName, onClose, onSuccess }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [camStatus, setCamStatus] = useState("idle"); // idle | loading | active | error | denied
  const [snapshot, setSnapshot] = useState(null);     // base64 data URL for local preview only
  const [snapshotBlob, setSnapshotBlob] = useState(null); // Blob for Cloudinary upload
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [action, setAction] = useState(null);         // "checkin" | "checkout"
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedRecord, setSavedRecord] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [todayRecord, setTodayRecord] = useState(null); // existing attendance for today

  // ── Load today's existing attendance record ───────────────
  useEffect(() => {
    if (!empId) return;
    import("../firebase/firestoreService").then(({ getAttendanceByDate }) => {
      getAttendanceByDate(todayString()).then((records) => {
        const mine = records.find((r) => r.empId === empId);
        if (mine) setTodayRecord(mine);
      }).catch(() => {});
    });
  }, [empId]);

  // ── Determine default action from existing record ─────────
  useEffect(() => {
    if (todayRecord) {
      if (todayRecord.checkIn && todayRecord.checkIn !== "--" && (!todayRecord.checkOut || todayRecord.checkOut === "--")) {
        setAction("checkout");
      } else if (!todayRecord.checkIn || todayRecord.checkIn === "--") {
        setAction("checkin");
      } else {
        // Both recorded already
        setAction("checkin");
      }
    } else {
      setAction("checkin");
    }
  }, [todayRecord]);

  // ── Start webcam ──────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCamStatus("loading");
    setErrorMsg("");
    setSnapshot(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamStatus("active");
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCamStatus("denied");
        setErrorMsg("Camera access denied. Please allow camera permission in your browser settings.");
      } else {
        setCamStatus("error");
        setErrorMsg("Could not access camera: " + (err.message || "Unknown error"));
      }
    }
  }, []);

  // ── Stop webcam ───────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamStatus("idle");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // ── Capture snapshot ──────────────────────────────────────
  const captureSnapshot = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    // Mirror the image (since webcam is mirrored in preview)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Keep base64 for local preview only — never stored in Firestore
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setSnapshot(dataUrl);
    // Also get a Blob for Cloudinary upload (avoids large base64 strings)
    canvas.toBlob(
      (blob) => setSnapshotBlob(blob),
      "image/jpeg",
      0.85
    );
    stopCamera();
  }, [stopCamera]);

  // ── Retake photo ──────────────────────────────────────────
  const retake = useCallback(() => {
    setSnapshot(null);
    setSnapshotBlob(null);
    setUploadProgress(0);
    startCamera();
  }, [startCamera]);

  // ── Save attendance record to Firestore ──────────────────
  const handleSave = useCallback(async () => {
    if (!snapshot || !snapshotBlob || !empId || !action) return;
    setSaving(true);
    setUploadProgress(0);
    setErrorMsg("");

    const now = new Date();
    const timeStr = formatTime12NoSec(now);
    const date = todayString();

    try {
      // Step 1: Upload snapshot to Cloudinary
      // Converts the blob to a File so uploadToCloudinary can use it
      const actionLabel = action === "checkin" ? "checkin" : "checkout";
      const fileName = `${empId}_${date}_${actionLabel}.jpg`;
      const file = new File([snapshotBlob], fileName, { type: "image/jpeg" });

      const uploadResult = await uploadToCloudinary(file, "image", {
        folder: `ems/attendance/${empId}`,
        publicId: `${empId}_${date}_${actionLabel}`,
        onProgress: (pct) => setUploadProgress(pct),
      });

      const webcamSnapshotUrl      = uploadResult.secure_url;
      const webcamSnapshotPublicId = uploadResult.public_id;

      // Step 2: Build attendance payload
      let checkIn     = todayRecord?.checkIn  || "--";
      let checkOut    = todayRecord?.checkOut || "--";
      let status      = todayRecord?.status   || "Present";
      let hoursWorked = todayRecord?.hoursWorked || "--";

      if (action === "checkin") {
        checkIn     = timeStr;
        status      = "Present";
        hoursWorked = "--";
      } else if (action === "checkout") {
        checkOut    = timeStr;
        status      = todayRecord?.status || "Present";
        hoursWorked = checkIn !== "--" ? calcHoursWorked(checkIn, timeStr) : "--";
      }

      // Step 3: Write to Firestore — admin panel auto-updates via subscribeAttendanceByDate
      await upsertAttendance({
        empId,
        date,
        status,
        checkIn,
        checkOut,
        hoursWorked,
        markedBy:               "webcam",
        webcamSnapshotUrl,       // Cloudinary HTTPS URL (not base64)
        webcamSnapshotPublicId,  // for future deletion / transforms
        webcamTimestamp:         now.toISOString(),
      });

      const record = { empId, date, status, checkIn, checkOut, hoursWorked, action, time: timeStr };
      setSavedRecord(record);
      setSaved(true);
      if (onSuccess) onSuccess(record);
    } catch (err) {
      setErrorMsg("Failed to save: " + (err.message || "Please try again."));
      setSaving(false);
      setUploadProgress(0);
    }
  }, [snapshot, snapshotBlob, empId, action, todayRecord, onSuccess]);

  // ── Colors ────────────────────────────────────────────────
  const bg = isDark ? "#0A0A0A" : "#F8F8F8";
  const cardBg = isDark ? "#111111" : "#FFFFFF";
  const border = isDark ? "#1E1E1E" : "#E8E8E8";
  const textPri = isDark ? "#F0F0F0" : "#111111";
  const textMuted = isDark ? "#555555" : "#999999";

  const alreadyCheckedIn = todayRecord?.checkIn && todayRecord.checkIn !== "--";
  const alreadyCheckedOut = todayRecord?.checkOut && todayRecord.checkOut !== "--";

  // ── Render: Success State ─────────────────────────────────
  if (saved && savedRecord) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "420px",
            background: cardBg,
            border: `1px solid ${border}`,
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "20px 24px 16px",
            borderBottom: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "8px",
                background: "rgba(0,184,184,0.12)", border: "1px solid rgba(0,184,184,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Camera size={16} style={{ color: "#00B8B8" }} />
              </div>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: textPri }}>
                Webcam Attendance
              </p>
            </div>
            <button onClick={onClose} style={{ color: textMuted, background: "none", border: "none", cursor: "pointer" }}>
              <X size={18} />
            </button>
          </div>

          {/* Success body */}
          <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "50%",
              background: "rgba(0,184,184,0.12)", border: "2px solid #00B8B8",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <CheckCircle size={32} style={{ color: "#00B8B8" }} />
            </div>

            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "20px", color: "#00B8B8" }}>
                {savedRecord.action === "checkin" ? "Checked In!" : "Checked Out!"}
              </p>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted, marginTop: "4px" }}>
                Attendance recorded at <span style={{ color: textPri, fontWeight: 600 }}>{savedRecord.time}</span>
              </p>
            </div>

            {/* Summary */}
            <div style={{
              width: "100%",
              background: isDark ? "#0D0D0D" : "#F5F5F5",
              border: `1px solid ${border}`,
              borderRadius: "10px",
              padding: "16px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}>
              {[
                { label: "DATE", val: savedRecord.date },
                { label: "STATUS", val: savedRecord.status },
                { label: "CHECK IN", val: savedRecord.checkIn },
                { label: "CHECK OUT", val: savedRecord.checkOut },
                { label: "HOURS WORKED", val: savedRecord.hoursWorked },
              ].map(({ label, val }) => (
                <div key={label}>
                  <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>{label}</p>
                  <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "13px", color: textPri, marginTop: "2px" }}>{val}</p>
                </div>
              ))}
            </div>

            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted, textAlign: "center" }}>
              This record has been sent to the admin panel automatically.
            </p>

            <button
              onClick={onClose}
              style={{
                padding: "10px 32px",
                borderRadius: "8px",
                background: "#CC0000",
                border: "1px solid #CC0000",
                color: "#FFFFFF",
                fontFamily: "Rajdhani, sans-serif",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.05em",
              }}
            >
              DONE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Main Modal ────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "520px",
          maxWidth: "95vw",
          background: cardBg,
          border: `1px solid ${border}`,
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: `1px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "8px",
              background: "rgba(204,0,0,0.10)", border: "1px solid rgba(204,0,0,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Camera size={16} style={{ color: "#CC0000" }} />
            </div>
            <div>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: textPri, lineHeight: 1 }}>
                Webcam Attendance
              </p>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted, marginTop: "2px" }}>
                {empName} · {todayString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: textMuted, background: "none", border: "none", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Live Clock */}
          <LiveClock isDark={isDark} />

          {/* Action selector */}
          <div>
            <p style={{
              fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
              color: "#CC0000", letterSpacing: "0.15em", marginBottom: "8px",
            }}>
              MARK ATTENDANCE AS
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              {["checkin", "checkout"].map((a) => {
                const label = a === "checkin" ? "Check In" : "Check Out";
                const disabled = a === "checkin" && alreadyCheckedIn && !alreadyCheckedOut ? false
                  : a === "checkout" && !alreadyCheckedIn ? true
                  : a === "checkin" && alreadyCheckedIn && alreadyCheckedOut ? true
                  : false;
                const isSelected = action === a;
                return (
                  <button
                    key={a}
                    onClick={() => !disabled && setAction(a)}
                    disabled={disabled}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: "8px",
                      fontFamily: "Rajdhani, sans-serif",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: disabled ? "not-allowed" : "pointer",
                      border: isSelected ? "1px solid #CC0000" : `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
                      background: isSelected ? "rgba(204,0,0,0.12)" : "transparent",
                      color: disabled
                        ? (isDark ? "#333333" : "#CCCCCC")
                        : isSelected ? "#CC0000" : (isDark ? "#666666" : "#888888"),
                      transition: "all 150ms",
                      opacity: disabled ? 0.5 : 1,
                    }}
                  >
                    {label}
                    {a === "checkin" && alreadyCheckedIn && (
                      <span style={{ fontSize: "10px", display: "block", marginTop: "2px", fontWeight: 400 }}>
                        {alreadyCheckedOut ? "Already done" : `Done at ${todayRecord?.checkIn}`}
                      </span>
                    )}
                    {a === "checkout" && alreadyCheckedOut && (
                      <span style={{ fontSize: "10px", display: "block", marginTop: "2px", fontWeight: 400 }}>
                        Done at {todayRecord?.checkOut}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Camera area */}
          <div style={{
            position: "relative",
            borderRadius: "10px",
            overflow: "hidden",
            background: isDark ? "#0D0D0D" : "#F0F0F0",
            border: `1px solid ${border}`,
            aspectRatio: "4/3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Video feed */}
            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)", // mirror for natural selfie view
                display: camStatus === "active" ? "block" : "none",
              }}
            />

            {/* Snapshot preview */}
            {snapshot && (
              <img
                src={snapshot}
                alt="Captured"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}

            {/* Idle / loading / error overlays */}
            {!snapshot && camStatus !== "active" && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: "12px", padding: "24px", textAlign: "center",
              }}>
                {camStatus === "loading" && (
                  <>
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "50%",
                      border: "3px solid rgba(0,184,184,0.2)", borderTopColor: "#00B8B8",
                      animation: "spin 0.8s linear infinite",
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted }}>
                      Starting camera…
                    </p>
                  </>
                )}
                {camStatus === "idle" && (
                  <>
                    <VideoOff size={40} style={{ color: isDark ? "#333333" : "#CCCCCC" }} />
                    <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted }}>
                      Camera is off. Click "Open Camera" to start.
                    </p>
                    <button
                      onClick={startCamera}
                      style={{
                        padding: "9px 20px", borderRadius: "7px",
                        background: "transparent",
                        border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
                        color: isDark ? "#888888" : "#666666",
                        fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 600,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                      }}
                    >
                      <Video size={14} /> Open Camera
                    </button>
                  </>
                )}
                {(camStatus === "error" || camStatus === "denied") && (
                  <>
                    <AlertCircle size={36} style={{ color: "#CC0000" }} />
                    <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#CC0000", maxWidth: "280px" }}>
                      {errorMsg}
                    </p>
                    {camStatus === "error" && (
                      <button
                        onClick={startCamera}
                        style={{
                          padding: "8px 16px", borderRadius: "7px",
                          background: "rgba(204,0,0,0.10)", border: "1px solid rgba(204,0,0,0.3)",
                          color: "#CC0000",
                          fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 600,
                          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                        }}
                      >
                        <RefreshCw size={13} /> Retry
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Corner clock overlay on live feed */}
            {camStatus === "active" && !snapshot && (
              <div style={{
                position: "absolute", bottom: "10px", left: "10px",
                background: "rgba(0,0,0,0.65)", borderRadius: "6px",
                padding: "4px 10px",
              }}>
                <LiveClockMinimal />
              </div>
            )}

            {/* Snapshot overlay: retake button */}
            {snapshot && (
              <button
                onClick={retake}
                style={{
                  position: "absolute", top: "10px", right: "10px",
                  padding: "6px 12px", borderRadius: "6px",
                  background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.2)",
                  color: "#FFFFFF",
                  fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "5px",
                }}
              >
                <RefreshCw size={11} /> Retake
              </button>
            )}
          </div>

          {/* Error message */}
          {errorMsg && camStatus !== "error" && camStatus !== "denied" && (
            <div style={{
              padding: "10px 14px", borderRadius: "7px",
              background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.25)",
            }}>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#CC0000" }}>
                {errorMsg}
              </p>
            </div>
          )}

          {/* Upload progress bar */}
          {saving && uploadProgress > 0 && uploadProgress < 100 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.12em" }}>
                  UPLOADING TO CLOUDINARY
                </span>
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: isDark ? "#666666" : "#999999" }}>
                  {uploadProgress}%
                </span>
              </div>
              <div style={{
                height: "4px", borderRadius: "2px",
                background: isDark ? "#1A1A1A" : "#E8E8E8",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${uploadProgress}%`,
                  background: "linear-gradient(90deg, #CC0000, #00B8B8)",
                  borderRadius: "2px",
                  transition: "width 200ms ease",
                }} />
              </div>
            </div>
          )}

          {/* Info note */}
          <p style={{
            fontFamily: "Mulish, sans-serif", fontSize: "11px",
            color: textMuted, textAlign: "center",
          }}>
            Your photo will be uploaded to Cloudinary and attendance sent to the admin panel.
          </p>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "14px 24px",
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px", borderRadius: "7px",
              background: "transparent",
              border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
              color: isDark ? "#666666" : "#888888",
              fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            {/* Capture button — only shown when camera is active */}
            {camStatus === "active" && !snapshot && (
              <button
                onClick={captureSnapshot}
                style={{
                  padding: "9px 20px", borderRadius: "7px",
                  background: "rgba(0,184,184,0.12)", border: "1px solid rgba(0,184,184,0.4)",
                  color: "#00B8B8",
                  fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                }}
              >
                <Camera size={14} /> Capture Photo
              </button>
            )}

            {/* Confirm & Save button */}
            <button
              onClick={handleSave}
              disabled={!snapshot || !snapshotBlob || saving}
              style={{
                padding: "9px 24px", borderRadius: "7px",
                background: !snapshot || !snapshotBlob || saving ? (isDark ? "#1A1A1A" : "#E8E8E8") : "#CC0000",
                border: !snapshot || !snapshotBlob || saving ? `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}` : "1px solid #CC0000",
                color: !snapshot || !snapshotBlob || saving ? (isDark ? "#444444" : "#BBBBBB") : "#FFFFFF",
                fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 700,
                cursor: !snapshot || !snapshotBlob || saving ? "not-allowed" : "pointer",
                letterSpacing: "0.05em",
                transition: "all 150ms",
              }}
            >
              {saving
              ? uploadProgress < 100
                ? `Uploading… ${uploadProgress}%`
                : "Saving…"
              : action === "checkin" ? "Confirm Check In" : "Confirm Check Out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Minimal live clock for camera overlay ─────────────────────
function LiveClockMinimal() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{
      fontFamily: "Share Tech Mono, monospace",
      fontSize: "11px",
      color: "#FFFFFF",
      letterSpacing: "0.05em",
    }}>
      {formatTime12(time)}
    </span>
  );
}