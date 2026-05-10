import { useState, useEffect, useRef } from "react";
import { useTheme } from "../App";
import {
  Search, Plus, Filter, Download, Edit2, Trash2,
  Mail, Phone, X, Check, ChevronDown, Users,
  UserCheck, UserX, Clock, Copy, CheckCheck, KeyRound, ShieldCheck,
  Camera, Upload, Image as ImageIcon,
} from "lucide-react";

import {
  subscribeEmployees,
  addEmployee,
  updateEmployee,
  updateEmployeePhoto,
  getDepartments,
} from "../firebase/firestoreService";
import { createEmployeeAccount, deleteEmployeeAccount, generateEmail, generatePassword } from "../firebase/employeeAuthService";
import { firebaseConfig } from "../firebase/config";
import { uploadEmployeePhoto, getThumbnailUrl } from "../cloudinary/cloudinaryService";

function getInitials(name) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

const avatarColors = [
  "#CC0000", "#00B8B8", "#C9922A", "#6366F1", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16",
];
function getAvatarColor(id) {
  const idx = parseInt(id.replace("RWT", "")) % avatarColors.length;
  return avatarColors[idx];
}

function StatusBadge({ status, theme }) {
  const styles = {
    dark: {
      Present: { bg: "rgba(0,184,184,0.10)", border: "rgba(0,184,184,0.35)", color: "#00B8B8" },
      Absent:  { bg: "rgba(204,0,0,0.10)",   border: "rgba(204,0,0,0.35)",   color: "#CC0000" },
      Leave:   { bg: "rgba(201,146,42,0.10)", border: "rgba(201,146,42,0.35)",color: "#C9922A" },
      WFH:     { bg: "rgba(255,255,255,0.06)",border: "rgba(255,255,255,0.2)",color: "#E8E8E8" },
    },
    light: {
      Present: { bg: "#E6F9F9", border: "#00B8B8", color: "#007A7A" },
      Absent:  { bg: "#FDECEA", border: "#CC0000", color: "#990000" },
      Leave:   { bg: "#FDF3E0", border: "#C9922A", color: "#8A5E00" },
      WFH:     { bg: "#F0F0F0", border: "#888888", color: "#444444" },
    },
  };
  const s = (styles[theme] || styles.dark)[status] || (styles[theme] || styles.dark).WFH;
  return (
    <span style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600,
      borderRadius: "4px", padding: "2px 8px",
    }}>
      {status}
    </span>
  );
}

// ── Confirm Delete Modal ───────────────────────────────────────
function ConfirmDeleteModal({ theme, emp, onConfirm, onCancel, deleting }) {
  const isDark  = theme === "dark";
  const bg      = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const text    = isDark ? "#F0F0F0" : "#111111";
  const sub     = isDark ? "#A0A0A0" : "#888888";
  const color   = getAvatarColor(emp.id);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: bg, border: `1px solid rgba(204,0,0,0.4)`,
        borderRadius: "14px", width: "420px", padding: "28px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5)"
      }}>
        {/* Icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "18px" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: "rgba(204,0,0,0.1)", border: "2px solid rgba(204,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Trash2 size={22} style={{ color: "#CC0000" }} />
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "6px" }}>
          <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "20px", color: text }}>
            Delete Employee?
          </div>
          <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: sub, marginTop: "6px" }}>
            This will permanently remove all data for
          </div>
        </div>

        {/* Employee chip */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "12px 16px", borderRadius: "8px", margin: "14px 0",
          background: isDark ? "#0A0A0A" : "#F8F8F8",
          border: `1px solid ${border}`
        }}>
          <div style={{
            width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
            background: `${color}20`, border: `2px solid ${color}`,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px", color }}>
              {getInitials(emp.name)}
            </span>
          </div>
          <div>
            <div style={{ fontFamily: "Mulish, sans-serif", fontWeight: 700, fontSize: "14px", color: text }}>
              {emp.name}
            </div>
            <div style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: "#00B8B8", marginTop: "1px" }}>
              {emp.id} · {emp.role}
            </div>
          </div>
        </div>

        {/* Warning list */}
        <div style={{
          padding: "12px 14px", borderRadius: "8px",
          background: "rgba(204,0,0,0.06)", border: "1px solid rgba(204,0,0,0.2)",
          marginBottom: "20px"
        }}>
          <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700,
            color: "#CC0000", letterSpacing: "0.12em", marginBottom: "8px" }}>
            THE FOLLOWING WILL BE DELETED:
          </div>
          {[
            "Employee profile & all details",
            "Firebase login account (email + password)",
            "All leave requests & history",
            "All attendance records",
          ].map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: "7px",
              fontFamily: "Mulish, sans-serif", fontSize: "12px", color: sub, marginBottom: "4px" }}>
              <X size={11} style={{ color: "#CC0000", flexShrink: 0 }} /> {item}
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} disabled={deleting} style={{
            flex: 1, padding: "11px", borderRadius: "7px", cursor: deleting ? "not-allowed" : "pointer",
            background: "transparent", border: `1px solid ${border}`,
            color: sub, fontFamily: "Rajdhani, sans-serif", fontWeight: 600,
            fontSize: "13px", letterSpacing: "0.05em"
          }}>CANCEL</button>
          <button onClick={onConfirm} disabled={deleting} style={{
            flex: 1, padding: "11px", borderRadius: "7px", cursor: deleting ? "not-allowed" : "pointer",
            background: deleting ? "#880000" : "#CC0000", border: "none",
            color: "#fff", fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
            fontSize: "13px", letterSpacing: "0.08em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "7px"
          }}>
            {deleting ? (
              <>
                <div style={{ width: "13px", height: "13px", borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                  animation: "spin 0.7s linear infinite" }} />
                DELETING...
              </>
            ) : (
              <><Trash2 size={13} /> YES, DELETE</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Credentials Popup shown after employee is created ──────────
function CredentialsModal({ theme, credentials, onClose }) {
  const isDark = theme === "dark";
  const bg     = isDark ? "#111111" : "#FFFFFF";
  const border = isDark ? "#1E1E1E" : "#E0E0E0";
  const inputBg= isDark ? "#0A0A0A" : "#F4F4F4";
  const text   = isDark ? "#F0F0F0" : "#111111";
  const sub    = isDark ? "#A0A0A0" : "#888888";

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPass,  setCopiedPass]  = useState(false);
  const [copiedAll,   setCopiedAll]   = useState(false);

  const copy = (value, setter) => {
    navigator.clipboard.writeText(value);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const copyAll = () => {
    const msg =
      `Employee Login Credentials\n` +
      `---------------------------\n` +
      `Email:    ${credentials.email}\n` +
      `Password: ${credentials.password}\n` +
      `Emp ID:   ${credentials.empId}\n` +
      `\nLogin at: ${window.location.origin}/login`;
    copy(msg, setCopiedAll);
  };

  const CopyBtn = ({ value, copied, setter, label }) => (
    <button
      onClick={() => copy(value, setter)}
      title={`Copy ${label}`}
      style={{
        background: copied ? "rgba(0,184,184,0.15)" : "transparent",
        border: `1px solid ${copied ? "#00B8B8" : border}`,
        borderRadius: "5px", padding: "4px 8px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: "4px",
        color: copied ? "#00B8B8" : sub,
        fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600,
        transition: "all 200ms",
      }}
    >
      {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
      {copied ? "COPIED" : "COPY"}
    </button>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: bg, border: `1px solid ${border}`, borderRadius: "14px",
        width: "460px", padding: "28px", boxShadow: "0 32px 80px rgba(0,0,0,0.5)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px",
            background: "rgba(0,184,184,0.12)", border: "1px solid rgba(0,184,184,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ShieldCheck size={20} style={{ color: "#00B8B8" }} />
          </div>
          <div>
            <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: text }}>
              Employee Account Created
            </div>
            <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: sub, marginTop: "1px" }}>
              Share these credentials with <strong style={{ color: text }}>{credentials.name}</strong>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${border}`, margin: "18px 0" }} />

        {/* Credentials */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Emp ID */}
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
              color: "#CC0000", letterSpacing: "0.18em", display: "block", marginBottom: "6px" }}>
              EMPLOYEE ID
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ flex: 1, background: inputBg, border: `1px solid ${border}`, borderRadius: "6px",
                padding: "9px 12px", fontFamily: "Share Tech Mono, monospace", fontSize: "14px",
                color: "#00B8B8", letterSpacing: "0.08em" }}>
                {credentials.empId}
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
              color: "#CC0000", letterSpacing: "0.18em", display: "block", marginBottom: "6px" }}>
              LOGIN EMAIL
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ flex: 1, background: inputBg, border: `1px solid ${border}`, borderRadius: "6px",
                padding: "9px 12px", fontFamily: "Mulish, sans-serif", fontSize: "13px", color: text }}>
                {credentials.email}
              </div>
              <CopyBtn value={credentials.email} copied={copiedEmail} setter={setCopiedEmail} label="email" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
              color: "#CC0000", letterSpacing: "0.18em", display: "block", marginBottom: "6px" }}>
              DEFAULT PASSWORD
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ flex: 1, background: inputBg, border: `1px solid rgba(0,184,184,0.3)`,
                borderRadius: "6px", padding: "9px 12px",
                fontFamily: "Share Tech Mono, monospace", fontSize: "14px", color: "#00B8B8",
                letterSpacing: "0.08em" }}>
                {credentials.password}
              </div>
              <CopyBtn value={credentials.password} copied={copiedPass} setter={setCopiedPass} label="password" />
            </div>
          </div>
        </div>

        {/* Info note */}
        <div style={{
          marginTop: "16px", padding: "10px 12px", borderRadius: "7px",
          background: "rgba(201,146,42,0.08)", border: "1px solid rgba(201,146,42,0.25)",
          fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#C9922A", lineHeight: 1.5
        }}>
          💡 Ask the employee to change their password after first login. These credentials are auto-generated.
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={copyAll} style={{
            flex: 1, padding: "10px", borderRadius: "6px", cursor: "pointer",
            background: copiedAll ? "rgba(0,184,184,0.15)" : "transparent",
            border: `1px solid ${copiedAll ? "#00B8B8" : border}`,
            color: copiedAll ? "#00B8B8" : sub,
            fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "12px",
            letterSpacing: "0.08em", display: "flex", alignItems: "center",
            justifyContent: "center", gap: "6px", transition: "all 200ms",
          }}>
            {copiedAll ? <CheckCheck size={14} /> : <Copy size={14} />}
            {copiedAll ? "COPIED ALL" : "COPY ALL"}
          </button>
          <button onClick={onClose} style={{
            flex: 2, padding: "10px", borderRadius: "6px", cursor: "pointer",
            background: "#CC0000", border: "none",
            color: "#FFFFFF", fontFamily: "Rajdhani, sans-serif",
            fontWeight: 700, fontSize: "13px", letterSpacing: "0.1em",
          }}>
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add/Edit Employee Modal ────────────────────────────────────
// ── Photo Upload Widget (shared by modal & drawer) ─────────────
function PhotoUploader({ theme, currentUrl, empName, onUploaded, empId }) {
  const fileRef  = useRef(null);
  const isDark   = theme === "dark";
  const border   = isDark ? "#1E1E1E" : "#E0E0E0";
  const inputBg  = isDark ? "#0A0A0A" : "#F4F4F4";
  const subColor = isDark ? "#666666" : "#999999";

  const [preview,  setPreview]  = useState(currentUrl || null);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [uploadErr, setUploadErr] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    setUploadErr("");
    // Local preview
    const objUrl = URL.createObjectURL(file);
    setPreview(objUrl);
    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadEmployeePhoto(
        file,
        empId || `temp_${Date.now()}`,
        (pct) => setProgress(pct)
      );
      onUploaded(result.secure_url, result.public_id);
    } catch (err) {
      setUploadErr(err.message || "Upload failed.");
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
      setProgress(0);
      URL.revokeObjectURL(objUrl);
    }
  };

  const initials = empName
    ? empName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px",
      padding: "14px", borderRadius: "8px", background: isDark ? "#0A0A0A" : "#F8F8F8",
      border: `1px solid ${border}` }}>

      {/* Avatar preview */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", overflow: "hidden",
          border: "2px solid #CC0000", background: "#CC000020",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          {preview ? (
            <img src={getThumbnailUrl(preview, 128)} alt="preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
              fontSize: "22px", color: "#CC0000" }}>{initials}</span>
          )}
        </div>
        {/* Camera overlay button */}
        <button onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ position: "absolute", bottom: 0, right: 0, width: "22px", height: "22px",
            borderRadius: "50%", background: "#CC0000", border: "2px solid " + (isDark ? "#111" : "#fff"),
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: uploading ? "not-allowed" : "pointer", padding: 0 }}>
          <Camera size={11} color="#fff" />
        </button>
      </div>

      {/* Text + button */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
          color: "#CC0000", letterSpacing: "0.18em", marginBottom: "4px" }}>
          PROFILE PHOTO
        </div>
        <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: subColor, marginBottom: "8px" }}>
          JPG, PNG or WEBP · Max 10 MB · Stored on Cloudinary
        </div>

        {uploading ? (
          <div>
            <div style={{ height: "4px", borderRadius: "2px", background: border, overflow: "hidden", marginBottom: "4px" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "#00B8B8",
                transition: "width 300ms", borderRadius: "2px" }} />
            </div>
            <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: "#00B8B8" }}>
              Uploading… {progress}%
            </span>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "5px 12px", borderRadius: "5px", cursor: "pointer",
              background: "transparent", border: `1px solid ${border}`,
              fontFamily: "Rajdhani, sans-serif", fontWeight: 600, fontSize: "11px",
              color: isDark ? "#E0E0E0" : "#333333", letterSpacing: "0.05em" }}>
            <Upload size={11} /> {preview ? "CHANGE PHOTO" : "UPLOAD PHOTO"}
          </button>
        )}

        {uploadErr && (
          <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px",
            color: "#CC0000", marginTop: "4px" }}>⚠ {uploadErr}</div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  );
}

function EmployeeModal({ theme, onClose, onSave, initial, departments }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial || {
    name: "", role: "", department: "Engineering",
    email: "", phone: "", joinDate: "", status: "Present", salary: "",
    photoUrl: "", photoPublicId: "",
  });
  const [errors,    setErrors]    = useState({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState("");

  const isDark    = theme === "dark";
  const bg        = isDark ? "#111111" : "#FFFFFF";
  const border    = isDark ? "#1E1E1E" : "#E0E0E0";
  const labelColor= isDark ? "#A0A0A0" : "#888888";
  const inputBg   = isDark ? "#0A0A0A" : "#F8F8F8";
  const textColor = isDark ? "#F0F0F0" : "#111111";

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = "Required";
    if (!form.role.trim())  e.role  = "Required";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "Valid email required";
    if (!form.phone.trim()) e.phone = "Required";
    if (!form.joinDate)     e.joinDate = "Required";
    if (!form.salary || isNaN(form.salary)) e.salary = "Valid number required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError("");
    try {
      await onSave({ ...form, salary: Number(form.salary) });
    } catch (err) {
      setSaveError(err.message || "Failed to save. Please try again.");
      setSaving(false);
    }
  };

  const field = (label, key, type = "text", opts) => (
    <div>
      <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700,
        color: "#CC0000", letterSpacing: "0.15em", display: "block", marginBottom: "6px" }}>
        {label.toUpperCase()}{errors[key] ? ` — ${errors[key]}` : ""}
      </label>
      {opts ? (
        <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: "100%", background: inputBg, border: `1px solid ${errors[key] ? "#CC0000" : border}`,
            color: textColor, borderRadius: "6px", padding: "8px 10px",
            fontFamily: "Mulish, sans-serif", fontSize: "13px", outline: "none" }}>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: "100%", background: inputBg, border: `1px solid ${errors[key] ? "#CC0000" : border}`,
            color: textColor, borderRadius: "6px", padding: "8px 10px",
            fontFamily: "Mulish, sans-serif", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
      )}
    </div>
  );

  // Preview auto-generated credentials (shown only for new employee)
  const previewEmail = form.name ? generateEmail(form.name) : "—";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: "12px",
        width: "500px", maxHeight: "92vh", overflowY: "auto", padding: "28px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textColor }}>
            {isEdit ? "EDIT EMPLOYEE" : "ADD NEW EMPLOYEE"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: labelColor }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Photo Upload ── */}
        {/* FIX (Bug 1 - Photo/null empId): For new employees the Firestore
            empId does not exist yet, so uploading here would put the photo
            in the wrong Cloudinary folder (ems/employees/temp_<ts>).
            We only render the uploader for existing employees (isEdit).
            For new employees a reminder is shown; the photo can be added
            from the employee drawer after the record is saved. */}
        {isEdit ? (
          <PhotoUploader
            theme={theme}
            currentUrl={form.photoUrl}
            empName={form.name}
            empId={form.id}
            onUploaded={(url, publicId) => setForm(f => ({ ...f, photoUrl: url, photoPublicId: publicId }))}
          />
        ) : (
          <div style={{
            display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px",
            padding: "12px 14px", borderRadius: "8px",
            background: isDark ? "#0A0A0A" : "#F8F8F8",
            border: `1px solid ${border}`,
          }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
              background: "rgba(0,184,184,0.1)", border: "2px dashed rgba(0,184,184,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: "18px" }}>📷</span>
            </div>
            <div>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "12px",
                color: isDark ? "#A0A0A0" : "#888888", letterSpacing: "0.05em" }}>
                PHOTO UPLOAD
              </p>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px",
                color: isDark ? "#666666" : "#AAAAAA", marginTop: "2px" }}>
                Photo can be added after the employee record is saved.
              </p>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: "14px" }}>
          {field("Full Name", "name")}
          {field("Role / Designation", "role")}
          {field("Department", "department", "text", departments.map(d => d.name))}
          {field("Email Address", "email", "email")}
          {field("Phone", "phone")}
          {field("Join Date", "joinDate", "date")}
          {field("Status", "status", "text", ["Present", "Absent", "Leave", "WFH"])}
          {field("Monthly Salary (₹)", "salary", "number")}
        </div>

        {/* Auto-credentials preview — only for new employee */}
        {!isEdit && (
          <div style={{
            marginTop: "18px", padding: "12px 14px", borderRadius: "8px",
            background: "rgba(0,184,184,0.06)", border: "1px solid rgba(0,184,184,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
              <KeyRound size={13} style={{ color: "#00B8B8" }} />
              <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700,
                color: "#00B8B8", letterSpacing: "0.15em" }}>
                AUTO-GENERATED LOGIN CREDENTIALS
              </span>
            </div>
            <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: labelColor, lineHeight: 1.7 }}>
              <span style={{ color: textColor, fontWeight: 600 }}>Email: </span>{previewEmail}<br />
              <span style={{ color: textColor, fontWeight: 600 }}>Password: </span>
              <span style={{ fontFamily: "Share Tech Mono, monospace", color: "#00B8B8" }}>
                EmpId@{new Date().getFullYear()} &nbsp;
              </span>
              <span style={{ fontSize: "11px" }}>(e.g. RWT013@{new Date().getFullYear()})</span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onClose} disabled={saving} style={{
            flex: 1, padding: "10px", background: "transparent",
            border: `1px solid ${border}`, borderRadius: "6px",
            color: labelColor, fontFamily: "Rajdhani, sans-serif", fontWeight: 600,
            fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.05em"
          }}>CANCEL</button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 2, padding: "10px", background: saving ? "#880000" : "#CC0000",
            border: "none", borderRadius: "6px", color: "#FFFFFF",
            fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px",
            cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.1em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
          }}>
            {saving ? (
              <>
                <div style={{ width: "14px", height: "14px", borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                  animation: "spin 0.7s linear infinite" }} />
                {isEdit ? "SAVING..." : "CREATING ACCOUNT..."}
              </>
            ) : (isEdit ? "SAVE CHANGES" : "ADD EMPLOYEE")}
          </button>
        </div>

        {saveError && (
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#CC0000",
            marginTop: "10px", textAlign: "center", background: "rgba(204,0,0,0.08)",
            border: "1px solid rgba(204,0,0,0.2)", borderRadius: "6px", padding: "8px" }}>
            ⚠ {saveError}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Employee Detail Drawer ─────────────────────────────────────
function EmployeeDrawer({ emp, theme, onClose, onEdit, onDelete, onPhotoUpdated }) {
  const isDark     = theme === "dark";
  const bg         = isDark ? "#111111" : "#FFFFFF";
  const border     = isDark ? "#1E1E1E" : "#E0E0E0";
  const labelColor = isDark ? "#666666" : "#999999";
  const textColor  = isDark ? "#F0F0F0" : "#111111";
  const color      = getAvatarColor(emp.id);

  const fileRef    = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErr, setUploadErr] = useState("");

  const handlePhotoChange = async (file) => {
    if (!file) return;
    setUploadErr("");
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadEmployeePhoto(file, emp.id, (pct) => setUploadProgress(pct));
      await updateEmployeePhoto(emp.id, result.secure_url, result.public_id);
      onPhotoUpdated?.();
    } catch (err) {
      setUploadErr(err.message || "Upload failed.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const row = (label, value) => (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${border}`,
      display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
        color: labelColor, letterSpacing: "0.15em" }}>{label}</span>
      <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textColor, fontWeight: 500 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "360px",
        background: bg, borderLeft: `1px solid ${border}`, display: "flex", flexDirection: "column" }}>
        {/* Top */}
        <div style={{ padding: "20px", borderBottom: `1px solid ${border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "14px",
            color: "#CC0000", letterSpacing: "0.15em" }}>EMPLOYEE PROFILE</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: labelColor }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {/* Avatar with photo support */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "50%", overflow: "hidden",
                background: `${color}20`, border: `2px solid ${color}`,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {emp.photoUrl ? (
                  <img src={getThumbnailUrl(emp.photoUrl, 144)} alt={emp.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "24px", color }}>
                    {getInitials(emp.name)}
                  </span>
                )}
                {uploading && (
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
                    background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center",
                    justifyContent: "center", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "13px",
                      fontWeight: 700, color: "#00B8B8" }}>{uploadProgress}%</span>
                  </div>
                )}
              </div>
              {/* Camera button */}
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ position: "absolute", bottom: 0, right: 0, width: "22px", height: "22px",
                  borderRadius: "50%", background: "#CC0000", border: "2px solid " + bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: uploading ? "not-allowed" : "pointer", padding: 0 }}>
                <Camera size={11} color="#fff" />
              </button>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textColor }}>
                {emp.name}
              </div>
              <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: labelColor, marginTop: "2px" }}>
                {emp.role}
              </div>
              <div style={{ marginTop: "8px" }}><StatusBadge status={emp.status} theme={theme} /></div>
            </div>
            {uploadErr && (
              <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: "#CC0000",
                textAlign: "center", padding: "4px 8px", background: "rgba(204,0,0,0.08)",
                border: "1px solid rgba(204,0,0,0.2)", borderRadius: "4px" }}>
                ⚠ {uploadErr}
              </div>
            )}
          </div>

          {row("EMPLOYEE ID", emp.id)}
          {row("DEPARTMENT", emp.department)}
          {row("EMAIL", emp.email)}
          {row("PHONE", emp.phone)}
          {row("JOIN DATE", new Date(emp.joinDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }))}
          {row("MONTHLY SALARY", `₹${Number(emp.salary).toLocaleString("en-IN")}`)}
        </div>

        {/* Actions */}
        <div style={{ padding: "16px", borderTop: `1px solid ${border}`, display: "flex", gap: "8px" }}>
          <button onClick={() => onEdit(emp)} style={{
            flex: 1, padding: "9px", background: "transparent", border: `1px solid ${border}`,
            borderRadius: "6px", color: textColor, fontFamily: "Rajdhani, sans-serif",
            fontWeight: 600, fontSize: "12px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", letterSpacing: "0.05em"
          }}>
            <Edit2 size={13} /> EDIT
          </button>
          <button onClick={() => onDelete(emp)} style={{
            flex: 1, padding: "9px", background: "rgba(204,0,0,0.1)", border: "1px solid rgba(204,0,0,0.3)",
            borderRadius: "6px", color: "#CC0000", fontFamily: "Rajdhani, sans-serif",
            fontWeight: 600, fontSize: "12px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", letterSpacing: "0.05em"
          }}>
            <Trash2 size={13} /> REMOVE
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => handlePhotoChange(e.target.files?.[0])} />
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function Employees() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [data,         setData]         = useState([]);
  const [departments,  setDepartments]  = useState([]);
  const [search,       setSearch]       = useState("");
  const [deptFilter,   setDeptFilter]   = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal,    setShowModal]    = useState(false);
  const [editEmp,      setEditEmp]      = useState(null);
  const [drawer,       setDrawer]       = useState(null);
  // Credentials popup state
  const [newCredentials, setNewCredentials] = useState(null);
  // Confirm delete state
  const [confirmDelete, setConfirmDelete]   = useState(null); // emp object
  const [deleting,      setDeleting]        = useState(false);

  // Real-time employees from Firestore
  useEffect(() => {
    const unsub = subscribeEmployees((list) => setData(list));
    return unsub;
  }, []);

  // Load departments
  useEffect(() => {
    getDepartments().then((list) => {
      if (list.length > 0) setDepartments(list);
    });
  }, []);

  const bg       = isDark ? "#0A0A0A" : "#F4F4F4";
  const cardBg   = isDark ? "#111111" : "#FFFFFF";
  const border   = isDark ? "#1E1E1E" : "#E0E0E0";
  const textColor= isDark ? "#F0F0F0" : "#111111";
  const subColor = isDark ? "#A0A0A0" : "#888888";
  const inputBg  = isDark ? "#111111" : "#FFFFFF";

  const filtered = data.filter(e => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase());
    const matchDept   = deptFilter   === "All" || e.department === deptFilter;
    const matchStatus = statusFilter === "All" || e.status     === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  const stats = [
    { label: "TOTAL EMPLOYEES", value: data.length, icon: Users,     color: "#00B8B8" },
    { label: "PRESENT TODAY",   value: data.filter(e => e.status === "Present").length, icon: UserCheck, color: "#00B8B8" },
    { label: "ABSENT TODAY",    value: data.filter(e => e.status === "Absent").length,  icon: UserX,     color: "#CC0000" },
    { label: "ON LEAVE / WFH",  value: data.filter(e => e.status === "Leave" || e.status === "WFH").length, icon: Clock, color: "#C9922A" },
  ];

  // ── Add employee: save to Firestore + create Firebase Auth account ──
  const handleAdd = async (form) => {
    // 1. Save employee record to Firestore and get the new RWT ID
    const empId = await addEmployee({ ...form, salary: Number(form.salary) });

    // 2. Create Firebase Auth + /users profile automatically
    const creds = await createEmployeeAccount(
      { empId, name: form.name, role: form.role },
      firebaseConfig
    );

    // 3. Close modal and show credentials popup
    setShowModal(false);
    setNewCredentials({ ...creds, empId, name: form.name });
  };

  const handleEdit = async (form) => {
    await updateEmployee(form.id, form);
    setEditEmp(null);
    setDrawer(null);
  };

  const handleDelete = (emp) => {
    setDrawer(null);
    setConfirmDelete(emp);
  };

  const confirmDeleteEmployee = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteEmployeeAccount(confirmDelete.id, firebaseConfig);
      // FIX (Bug 1): Optimistically remove the employee from local state for
      // instant UI feedback without waiting for the Firestore listener.
      setData((prev) => prev.filter((e) => e.id !== confirmDelete.id));
      setConfirmDelete(null);
      setDrawer(null);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed: " + (err.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (emp) => {
    setDrawer(null);
    setEditEmp(emp);
  };

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "24px" }}>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: cardBg, border: `1px solid ${border}`,
            borderRadius: "10px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "8px",
              background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "26px",
                color: textColor, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
                color: "#CC0000", letterSpacing: "0.15em", marginTop: "2px" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: "10px",
        padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px",
        marginBottom: "16px", flexWrap: "wrap" }}>

        {/* Search */}
        <div style={{ flex: 1, minWidth: "180px", position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%",
            transform: "translateY(-50%)", color: subColor }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, role, ID…"
            style={{ width: "100%", paddingLeft: "32px", paddingRight: "10px", height: "36px",
              background: inputBg, border: `1px solid ${border}`, borderRadius: "6px",
              color: textColor, fontFamily: "Mulish, sans-serif", fontSize: "13px",
              outline: "none", boxSizing: "border-box" }} />
        </div>

        {/* Dept Filter */}
        <div style={{ position: "relative" }}>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            style={{ appearance: "none", paddingLeft: "12px", paddingRight: "28px", height: "36px",
              background: inputBg, border: `1px solid ${border}`, borderRadius: "6px",
              color: textColor, fontFamily: "Mulish, sans-serif", fontSize: "13px",
              cursor: "pointer", outline: "none" }}>
            <option value="All">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: "absolute", right: "8px", top: "50%",
            transform: "translateY(-50%)", color: subColor, pointerEvents: "none" }} />
        </div>

        {/* Status Filter */}
        <div style={{ position: "relative" }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ appearance: "none", paddingLeft: "12px", paddingRight: "28px", height: "36px",
              background: inputBg, border: `1px solid ${border}`, borderRadius: "6px",
              color: textColor, fontFamily: "Mulish, sans-serif", fontSize: "13px",
              cursor: "pointer", outline: "none" }}>
            <option value="All">All Status</option>
            {["Present", "Absent", "Leave", "WFH"].map(s =>
              <option key={s} value={s}>{s}</option>
            )}
          </select>
          <ChevronDown size={12} style={{ position: "absolute", right: "8px", top: "50%",
            transform: "translateY(-50%)", color: subColor, pointerEvents: "none" }} />
        </div>

        {/* Add Button */}
        <button onClick={() => setShowModal(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px",
            padding: "0 16px", background: "#CC0000", border: "none", borderRadius: "6px",
            color: "#FFFFFF", fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
            fontSize: "13px", cursor: "pointer", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
          <Plus size={14} /> ADD EMPLOYEE
        </button>
      </div>

      {/* Table */}
      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: "10px", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 1fr 110px 120px 80px",
          padding: "10px 16px", borderBottom: `1px solid ${border}`,
          background: isDark ? "#0D0D0D" : "#F8F8F8" }}>
          {["#", "EMPLOYEE", "ROLE", "DEPARTMENT", "STATUS", "SALARY", ""].map((h, i) => (
            <span key={i} style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px",
              fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em" }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: subColor,
            fontFamily: "Mulish, sans-serif", fontSize: "13px" }}>
            No employees found
          </div>
        ) : (
          filtered.map((emp, idx) => {
            const color = getAvatarColor(emp.id);
            return (
              <div key={emp.id}
                onClick={() => setDrawer(emp)}
                style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 1fr 110px 120px 80px",
                  padding: "12px 16px",
                  borderBottom: idx < filtered.length - 1 ? `1px solid ${border}` : "none",
                  cursor: "pointer", transition: "background 150ms", background: "transparent" }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? "#161616" : "#F9F9F9"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px",
                  color: subColor, display: "flex", alignItems: "center" }}>
                  {String(idx + 1).padStart(2, "0")}
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                    background: `${color}20`, border: `1.5px solid ${color}`, overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {emp.photoUrl ? (
                      <img src={getThumbnailUrl(emp.photoUrl, 64)} alt={emp.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "11px", color }}>
                        {getInitials(emp.name)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontFamily: "Mulish, sans-serif", fontWeight: 600, fontSize: "13px", color: textColor }}>
                      {emp.name}
                    </div>
                    <div style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#00B8B8" }}>
                      {emp.id}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: subColor }}>{emp.role}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textColor }}>{emp.department}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center" }}>
                  <StatusBadge status={emp.status} theme={theme} />
                </div>

                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: "#00B8B8" }}>
                    ₹{Number(emp.salary).toLocaleString("en-IN")}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(emp)}
                    style={{ width: "28px", height: "28px", background: "transparent",
                      border: `1px solid ${border}`, borderRadius: "4px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", color: subColor }}>
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => handleDelete(emp)}
                    style={{ width: "28px", height: "28px", background: "transparent",
                      border: "1px solid rgba(204,0,0,0.3)", borderRadius: "4px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "#CC0000" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Footer */}
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${border}`,
          background: isDark ? "#0D0D0D" : "#F8F8F8",
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: subColor }}>
            Showing {filtered.length} of {data.length} employees
          </span>
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#00B8B8" }}>
            ROYALS WEBTECH
          </span>
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <EmployeeModal
          theme={theme}
          onClose={() => setShowModal(false)}
          onSave={handleAdd}
          departments={departments}
        />
      )}
      {editEmp && (
        <EmployeeModal
          theme={theme}
          onClose={() => setEditEmp(null)}
          onSave={handleEdit}
          initial={editEmp}
          departments={departments}
        />
      )}
      {drawer && (
        <EmployeeDrawer
          emp={drawer}
          theme={theme}
          onClose={() => setDrawer(null)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onPhotoUpdated={() => {/* subscribeEmployees auto-refreshes */}}
        />
      )}

      {/* Confirm delete popup */}
      {confirmDelete && (
        <ConfirmDeleteModal
          theme={theme}
          emp={confirmDelete}
          deleting={deleting}
          onConfirm={confirmDeleteEmployee}
          onCancel={() => !deleting && setConfirmDelete(null)}
        />
      )}

      {/* Credentials popup — shown after new employee is created */}
      {newCredentials && (
        <CredentialsModal
          theme={theme}
          credentials={newCredentials}
          onClose={() => setNewCredentials(null)}
        />
      )}
    </div>
  );
}