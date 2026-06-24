import { useState, useEffect, useRef } from "react";
import { useTheme } from "../App";
import {
  Search, Plus, Filter, Download, Edit2, Trash2,
  Mail, Phone, X, Check, ChevronDown, Users,
  UserCheck, UserX, Clock, Copy, CheckCheck, KeyRound, ShieldCheck,
  Camera, Upload, Image as ImageIcon, FileText, ExternalLink,
} from "lucide-react";

import {
  subscribeEmployees,
  addEmployee,
  updateEmployee,
  updateEmployeePhoto,
  getDepartments,
  subscribeAttendanceByDate,
  subscribeLeaveRequests,
  saveEmployeeCredentials,
  markCredentialsViewed,
} from "../firebase/firestoreService";
import { createEmployeeAccount, deleteEmployeeAccount, generateEmail, generatePassword, provisionTestEmployee } from "../firebase/employeeAuthService";
import { firebaseConfig } from "../firebase/config";
import { uploadEmployeePhoto, getThumbnailUrl, getOfferLetterViewUrl, getOfferLetterDownloadUrl, getGoogleDocsViewerUrl } from "../cloudinary/cloudinaryService";
import { generateOfferLetter } from "../utils/generateOfferLetter";

// ── Offer Letter Viewer ────────────────────────────────────────
// Uses Google Docs Viewer inside an iframe for PDFs, and <img> for images.
// Google Docs Viewer works cross-origin with Cloudinary raw/image URLs without
// any CORS or plugin issues — works on all browsers and mobile.
// Admin gets a VIEW toggle and a DOWNLOAD button.
function OfferLetterViewer({ url, fileName, uploadedAt, theme, border, isDark, labelColor, textColor }) {
  const [open, setOpen] = useState(false);

  const cleanUrl    = getOfferLetterViewUrl(url);
  const downloadUrl = getOfferLetterDownloadUrl(url);
  const isImage     = /\.(jpe?g|png|webp)(\?|$)/i.test(cleanUrl);
  // Google Docs Viewer handles both raw and image Cloudinary URLs for PDFs
  const viewerUrl   = isImage ? cleanUrl : getGoogleDocsViewerUrl(cleanUrl);

  const uploadDate = uploadedAt
    ? new Date(uploadedAt.toDate?.() ?? uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Uploaded";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* File chip row */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px", padding: "12px",
        borderRadius: "10px", background: isDark ? "#0A0A0A" : "#F5F5F5", border: `1px solid ${border}`,
      }}>
        {/* File icon */}
        <div style={{
          width: "36px", height: "36px", borderRadius: "8px", flexShrink: 0,
          background: "rgba(0,184,184,0.10)", border: "1px solid rgba(0,184,184,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <FileText size={16} style={{ color: "#00B8B8" }} />
        </div>
        {/* Name + date */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: 600,
            color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fileName || "Offer Letter"}
          </div>
          <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: labelColor, marginTop: "1px" }}>
            {uploadDate}
          </div>
        </div>
        {/* Action buttons */}
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          {/* Download — force-downloads the file */}
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Download"
            style={{
              width: "30px", height: "30px", borderRadius: "6px", cursor: "pointer",
              background: "rgba(201,146,42,0.08)", border: "1px solid rgba(201,146,42,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#C9922A", textDecoration: "none",
            }}>
            <Download size={13} />
          </a>
          {/* View toggle — opens Google Docs Viewer inline */}
          <button
            onClick={() => setOpen(v => !v)}
            style={{
              padding: "0 12px", height: "30px", borderRadius: "6px", cursor: "pointer",
              background: open ? "rgba(0,184,184,0.15)" : "rgba(0,184,184,0.08)",
              border: "1px solid rgba(0,184,184,0.3)", color: "#00B8B8",
              fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "11px",
              letterSpacing: "0.06em", whiteSpace: "nowrap",
            }}>
            {open ? "HIDE" : "VIEW"}
          </button>
        </div>
      </div>

      {/* Inline viewer — only mounts when open */}
      {open && (
        <div style={{
          borderRadius: "10px", overflow: "hidden", border: `1px solid ${border}`,
          background: isDark ? "#0D0D0D" : "#F0F0F0", position: "relative",
        }}>
          {/* Loading shimmer shown behind iframe */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px",
          }}>
            <div style={{
              width: "18px", height: "18px", borderRadius: "50%",
              border: "2px solid #00B8B8", borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: labelColor }}>
              Loading…
            </span>
          </div>
          {isImage ? (
            <img
              src={viewerUrl}
              alt="Offer Letter"
              style={{ width: "100%", display: "block", objectFit: "contain", maxHeight: "420px", position: "relative", zIndex: 1 }}
            />
          ) : (
            <iframe
              src={viewerUrl}
              title="Offer Letter"
              style={{ width: "100%", height: "500px", border: "none", display: "block", position: "relative", zIndex: 1 }}
              allowFullScreen
            />
          )}
        </div>
      )}
      {open && !isImage && (
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: labelColor, textAlign: "center" }}>
          If the document doesn't load, use the Download button above to open it directly.
        </p>
      )}
    </div>
  );
}

// ── Responsive hook ────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ── Helpers ────────────────────────────────────────────────────
/** Convert stored Firestore ID (hyphens) to the display format (slashes).
 *  e.g. "RWTPVTLTD-IT-OFLT-122025-05" → "RWTPVTLTD/IT/OFLT/122025/05"
 *  Old-style IDs like "RWT001" are returned unchanged.
 */
function formatEmpId(id) {
  if (!id) return id;
  // New-style IDs start with RWTPVTLTD- and use hyphens as separators
  if (id.startsWith("RWTPVTLTD-")) return id.replace(/-/g, "/");
  return id;
}

function getInitials(name) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

const avatarColors = [
  "#CC0000", "#00B8B8", "#C9922A", "#6366F1", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16",
];
function getAvatarColor(id) {
  // String hash — works for any ID format (old RWT### or new RWTPVTLTD/…)
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return avatarColors[hash % avatarColors.length];
}

// ── Status Badge ───────────────────────────────────────────────
function StatusBadge({ status, theme }) {
  const styles = {
    dark: {
      Present: { bg: "rgba(0,184,184,0.10)", border: "rgba(0,184,184,0.35)", color: "#00B8B8" },
      Absent:  { bg: "rgba(204,0,0,0.10)",   border: "rgba(204,0,0,0.35)",   color: "#CC0000" },
      Leave:   { bg: "rgba(201,146,42,0.10)", border: "rgba(201,146,42,0.35)", color: "#C9922A" },
      WFH:     { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.2)", color: "#E8E8E8" },
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
      borderRadius: "4px", padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

// ── Confirm Delete Modal ───────────────────────────────────────
function ConfirmDeleteModal({ theme, emp, onConfirm, onCancel, deleting }) {
  const isDark = theme === "dark";
  const bg     = isDark ? "#111111" : "#FFFFFF";
  const border = isDark ? "#1E1E1E" : "#E0E0E0";
  const text   = isDark ? "#F0F0F0" : "#111111";
  const sub    = isDark ? "#A0A0A0" : "#888888";
  const color  = getAvatarColor(emp.id);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{
        background: bg, border: "1px solid rgba(204,0,0,0.4)",
        borderRadius: "14px", width: "100%", maxWidth: "420px",
        padding: "24px", boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "18px" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: "rgba(204,0,0,0.1)", border: "2px solid rgba(204,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Trash2 size={22} style={{ color: "#CC0000" }} />
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "6px" }}>
          <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "20px", color: text }}>
            Delete Employee?
          </div>
          <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: sub, marginTop: "6px" }}>
            This will permanently remove all data for
          </div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "12px 16px", borderRadius: "8px", margin: "14px 0",
          background: isDark ? "#0A0A0A" : "#F8F8F8", border: `1px solid ${border}`,
        }}>
          <div style={{
            width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
            background: emp.photoUrl ? "transparent" : `${color}20`, border: `2px solid ${color}`,
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}>
            {emp.photoUrl
              ? <img src={emp.photoUrl} alt={emp.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px", color }}>{getInitials(emp.name)}</span>
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "Mulish, sans-serif", fontWeight: 700, fontSize: "14px", color: text,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {emp.name}
            </div>
            <div style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: "#00B8B8", marginTop: "1px" }}>
              {formatEmpId(emp.id)} · {emp.role}
            </div>
          </div>
        </div>

        <div style={{
          padding: "12px 14px", borderRadius: "8px",
          background: "rgba(204,0,0,0.06)", border: "1px solid rgba(204,0,0,0.2)",
          marginBottom: "20px",
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

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} disabled={deleting} style={{
            flex: 1, padding: "11px", borderRadius: "7px",
            cursor: deleting ? "not-allowed" : "pointer",
            background: "transparent", border: `1px solid ${border}`,
            color: sub, fontFamily: "Rajdhani, sans-serif", fontWeight: 600,
            fontSize: "13px", letterSpacing: "0.05em",
          }}>CANCEL</button>
          <button onClick={onConfirm} disabled={deleting} style={{
            flex: 1, padding: "11px", borderRadius: "7px",
            cursor: deleting ? "not-allowed" : "pointer",
            background: deleting ? "#880000" : "#CC0000", border: "none",
            color: "#fff", fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
            fontSize: "13px", letterSpacing: "0.08em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
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

// ── Credentials Modal ──────────────────────────────────────────
function CredentialsModal({ theme, credentials, onClose }) {
  const isDark  = theme === "dark";
  const bg      = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const inputBg = isDark ? "#0A0A0A" : "#F4F4F4";
  const text    = isDark ? "#F0F0F0" : "#111111";
  const sub     = isDark ? "#A0A0A0" : "#888888";

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPass,  setCopiedPass]  = useState(false);
  const [copiedAll,   setCopiedAll]   = useState(false);
  const [genLoading,  setGenLoading]  = useState(false);

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
      `Emp ID:   ${formatEmpId(credentials.empId)}\n` +
      `\nLogin at: ${window.location.origin}/login`;
    copy(msg, setCopiedAll);
  };

  const handleDownloadOfferLetter = async () => {
    setGenLoading(true);
    try {
      await generateOfferLetter({
        empId:          credentials.empId,
        name:           credentials.name,
        role:           credentials.role        || "Jr. Software Developer Intern",
        joinDate:       credentials.joinDate    || "",
        completionDate: credentials.completionDate || "",
        department:     credentials.department  || "",
      });
    } catch (err) {
      console.error("Offer letter generation failed:", err);
      alert("Could not generate offer letter: " + (err.message || "Unknown error"));
    } finally {
      setGenLoading(false);
    }
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
        transition: "all 200ms", flexShrink: 0,
      }}
    >
      {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
      {copied ? "COPIED" : "COPY"}
    </button>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{
        background: bg, border: `1px solid ${border}`, borderRadius: "14px",
        width: "100%", maxWidth: "460px", padding: "24px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
            background: "rgba(0,184,184,0.12)", border: "1px solid rgba(0,184,184,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ShieldCheck size={20} style={{ color: "#00B8B8" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: text }}>
              Employee Account Created
            </div>
            <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: sub, marginTop: "1px" }}>
              Share with <strong style={{ color: text }}>{credentials.name}</strong>
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${border}`, margin: "18px 0" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Emp ID */}
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
              color: "#CC0000", letterSpacing: "0.18em", display: "block", marginBottom: "6px" }}>
              EMPLOYEE ID
            </label>
            <div style={{ background: inputBg, border: `1px solid ${border}`, borderRadius: "6px",
              padding: "9px 12px", fontFamily: "Share Tech Mono, monospace", fontSize: "14px",
              color: "#00B8B8", letterSpacing: "0.08em" }}>
              {formatEmpId(credentials.empId)}
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
              color: "#CC0000", letterSpacing: "0.18em", display: "block", marginBottom: "6px" }}>
              LOGIN EMAIL
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ flex: 1, minWidth: 0, background: inputBg, border: `1px solid ${border}`,
                borderRadius: "6px", padding: "9px 12px", fontFamily: "Mulish, sans-serif",
                fontSize: "13px", color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
              <div style={{ flex: 1, background: inputBg, border: "1px solid rgba(0,184,184,0.3)",
                borderRadius: "6px", padding: "9px 12px", fontFamily: "Share Tech Mono, monospace",
                fontSize: "14px", color: "#00B8B8", letterSpacing: "0.08em" }}>
                {credentials.password}
              </div>
              <CopyBtn value={credentials.password} copied={copiedPass} setter={setCopiedPass} label="password" />
            </div>
          </div>
        </div>

        <div style={{
          marginTop: "16px", padding: "10px 12px", borderRadius: "7px",
          background: "rgba(201,146,42,0.08)", border: "1px solid rgba(201,146,42,0.25)",
          fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#C9922A", lineHeight: 1.5,
        }}>
          💡 Ask the employee to change their password after first login. These credentials are auto-generated.
        </div>

        {/* ── Download Offer Letter ── */}
        <button
          onClick={handleDownloadOfferLetter}
          disabled={genLoading}
          style={{
            width: "100%", marginTop: "14px", padding: "11px", borderRadius: "7px",
            cursor: genLoading ? "not-allowed" : "pointer",
            background: genLoading ? "rgba(0,184,184,0.06)" : "rgba(0,184,184,0.12)",
            border: "1px solid rgba(0,184,184,0.35)", color: "#00B8B8",
            fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px",
            letterSpacing: "0.1em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            transition: "all 200ms",
          }}
        >
          {genLoading ? (
            <>
              <div style={{ width: "13px", height: "13px", borderRadius: "50%",
                border: "2px solid rgba(0,184,184,0.3)", borderTopColor: "#00B8B8",
                animation: "spin 0.7s linear infinite" }} />
              GENERATING PDF…
            </>
          ) : (
            <><Download size={14} /> DOWNLOAD OFFER LETTER (PDF)</>
          )}
        </button>

        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
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
            background: "#CC0000", border: "none", color: "#FFFFFF",
            fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px",
            letterSpacing: "0.1em",
          }}>
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Photo Upload Widget ────────────────────────────────────────
function PhotoUploader({ theme, currentUrl, empName, onUploaded, empId }) {
  const fileRef    = useRef(null);
  const isDark     = theme === "dark";
  const border     = isDark ? "#1E1E1E" : "#E0E0E0";
  const subColor   = isDark ? "#666666" : "#999999";

  const [preview,   setPreview]   = useState(currentUrl || null);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [uploadErr, setUploadErr] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    setUploadErr("");
    const objUrl = URL.createObjectURL(file);
    setPreview(objUrl);
    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadEmployeePhoto(
        file, empId || `temp_${Date.now()}`, (pct) => setProgress(pct)
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
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", overflow: "hidden",
          border: "2px solid #CC0000", background: "#CC000020",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          {preview
            ? <img src={getThumbnailUrl(preview, 128)} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "22px", color: "#CC0000" }}>{initials}</span>
          }
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ position: "absolute", bottom: 0, right: 0, width: "22px", height: "22px",
            borderRadius: "50%", background: "#CC0000", border: "2px solid " + (isDark ? "#111" : "#fff"),
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: uploading ? "not-allowed" : "pointer", padding: 0 }}>
          <Camera size={11} color="#fff" />
        </button>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
          color: "#CC0000", letterSpacing: "0.18em", marginBottom: "4px" }}>
          PROFILE PHOTO
        </div>
        <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: subColor, marginBottom: "8px" }}>
          JPG, PNG or WEBP · Max 10 MB
        </div>
        {uploading ? (
          <div>
            <div style={{ height: "4px", borderRadius: "2px", background: border, overflow: "hidden", marginBottom: "4px" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "#00B8B8", transition: "width 300ms", borderRadius: "2px" }} />
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
          <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: "#CC0000", marginTop: "4px" }}>
            ⚠ {uploadErr}
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  );
}

// ── Add / Edit Employee Modal ──────────────────────────────────
function EmployeeModal({ theme, onClose, onSave, initial, departments }) {
  const isEdit = !!initial;
  // Always merge with defaults so every field has a defined value.
  // Older Firestore docs may be missing newer fields — those arrive as undefined,
  // which makes React treat the input as uncontrolled (the warning in the console).
  const defaults = {
    name: "", role: "", department: "Engineering",
    email: "", phone: "", joinDate: "", completionDate: "", salary: "",
    workType: "WFO", gender: "Male", employeeType: "Full Time",
    photoUrl: null, photoPublicId: null,
  };
  const [form, setForm] = useState(() => {
    if (!initial) return defaults;
    const merged = { ...defaults, ...initial };
    // Coerce any remaining undefined string fields to "" so inputs stay controlled
    Object.keys(defaults).forEach(k => {
      if (merged[k] === undefined || merged[k] === null) {
        merged[k] = defaults[k];
      }
    });
    return merged;
  });
  const [errors,    setErrors]    = useState({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState("");

  const isDark     = theme === "dark";
  const bg         = isDark ? "#111111" : "#FFFFFF";
  const border     = isDark ? "#1E1E1E" : "#E0E0E0";
  const labelColor = isDark ? "#A0A0A0" : "#888888";
  const inputBg    = isDark ? "#0A0A0A" : "#F8F8F8";
  const textColor  = isDark ? "#F0F0F0" : "#111111";

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
    setSaving(true); setSaveError("");
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

  const previewEmail = form.name ? generateEmail(form.name) : "—";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: "12px",
        width: "100%", maxWidth: "500px", maxHeight: "92vh", overflowY: "auto", padding: "24px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textColor }}>
            {isEdit ? "EDIT EMPLOYEE" : "ADD NEW EMPLOYEE"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: labelColor, padding: "4px" }}>
            <X size={18} />
          </button>
        </div>

        {/* Photo section */}
        {isEdit ? (
          <PhotoUploader
            theme={theme} currentUrl={form.photoUrl} empName={form.name} empId={form.id}
            onUploaded={(url, publicId) => setForm(f => ({ ...f, photoUrl: url, photoPublicId: publicId }))}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px",
            padding: "12px 14px", borderRadius: "8px", background: isDark ? "#0A0A0A" : "#F8F8F8",
            border: `1px solid ${border}` }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
              background: "rgba(0,184,184,0.1)", border: "2px dashed rgba(0,184,184,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "18px" }}>📷</span>
            </div>
            <div>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "12px",
                color: isDark ? "#A0A0A0" : "#888888", letterSpacing: "0.05em" }}>PHOTO UPLOAD</p>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {field("Join Date", "joinDate", "date")}
            {field("Completion Date", "completionDate", "date")}
          </div>
          {field("Work Type", "workType", "text", ["WFO", "WFH", "Hybrid"])}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {field("Gender", "gender", "text", ["Male", "Female", "Other"])}
            {field("Employee Type", "employeeType", "text", ["Full Time", "Trainee", "Intern"])}
          </div>
          {field("Monthly Salary (₹)", "salary", "number")}
        </div>

        {!isEdit && (
          <div style={{ marginTop: "18px", padding: "12px 14px", borderRadius: "8px",
            background: "rgba(0,184,184,0.06)", border: "1px solid rgba(0,184,184,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
              <KeyRound size={13} style={{ color: "#00B8B8" }} />
              <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700,
                color: "#00B8B8", letterSpacing: "0.15em" }}>AUTO-GENERATED LOGIN CREDENTIALS</span>
            </div>
            <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: labelColor, lineHeight: 1.7 }}>
              <span style={{ color: textColor, fontWeight: 600 }}>Email: </span>{previewEmail}<br />
              <span style={{ color: textColor, fontWeight: 600 }}>Password: </span>
              <span style={{ fontFamily: "Share Tech Mono, monospace", color: "#00B8B8" }}>
                EmpId@{new Date().getFullYear()}&nbsp;
              </span>
              <span style={{ fontSize: "11px" }}>(e.g. RWTPVTLTD/IT/OFLT/122025/05@{new Date().getFullYear()})</span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onClose} disabled={saving} style={{
            flex: 1, padding: "10px", background: "transparent",
            border: `1px solid ${border}`, borderRadius: "6px",
            color: labelColor, fontFamily: "Rajdhani, sans-serif", fontWeight: 600,
            fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.05em",
          }}>CANCEL</button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 2, padding: "10px", background: saving ? "#880000" : "#CC0000",
            border: "none", borderRadius: "6px", color: "#FFFFFF",
            fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px",
            cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.1em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
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
function EmployeeDrawer({ emp, theme, onClose, onEdit, onDelete, onPhotoUpdated, isMobile }) {
  const isDark     = theme === "dark";
  const bg         = isDark ? "#111111" : "#FFFFFF";
  const border     = isDark ? "#1E1E1E" : "#E0E0E0";
  const labelColor = isDark ? "#666666" : "#999999";
  const textColor  = isDark ? "#F0F0F0" : "#111111";
  const color      = getAvatarColor(emp.id);

  const fileRef = useRef(null);
  const [uploading,       setUploading]       = useState(false);
  const [uploadProgress,  setUploadProgress]  = useState(0);
  const [uploadErr,       setUploadErr]       = useState("");
  const [offerGenLoading, setOfferGenLoading] = useState(false);

  // ── Credentials reveal state ──
  const [credsRevealed,   setCredsRevealed]   = useState(false);
  const [copiedCredEmail, setCopiedCredEmail] = useState(false);
  const [copiedCredPass,  setCopiedCredPass]  = useState(false);
  // ── Edit stored password ──
  const [editingPw,  setEditingPw]  = useState(false);
  const [editPwVal,  setEditPwVal]  = useState("");
  const [pwSaving,   setPwSaving]   = useState(false);
  const [pwSaved,    setPwSaved]    = useState(false);
  const [pwSaveErr,  setPwSaveErr]  = useState("");

  const handleUpdateStoredPassword = async () => {
    if (!editPwVal.trim()) { setPwSaveErr("Password cannot be empty."); return; }
    setPwSaving(true); setPwSaveErr("");
    try {
      await updateEmployee(emp.id, { loginPassword: editPwVal.trim() });
      emp.loginPassword = editPwVal.trim(); // reflect locally without refetch
      setPwSaved(true);
      setEditingPw(false);
      setEditPwVal("");
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err) {
      setPwSaveErr(err.message || "Failed to update.");
    } finally {
      setPwSaving(false);
    }
  };

  const hasCredentials = !!(emp.loginEmail && emp.loginPassword);

  const handleRevealCredentials = async () => {
    setCredsRevealed(true);
    // Mark as viewed in Firestore (only first time — if not already marked)
    if (!emp.credentialsViewedAt) {
      try { await markCredentialsViewed(emp.id); } catch (_) {}
    }
  };

  const copyCredential = (value, setter) => {
    navigator.clipboard.writeText(value);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handlePhotoChange = async (file) => {
    if (!file) return;
    setUploadErr(""); setUploading(true); setUploadProgress(0);
    try {
      const result = await uploadEmployeePhoto(file, emp.id, (pct) => setUploadProgress(pct));
      await updateEmployeePhoto(emp.id, result.secure_url, result.public_id);
      onPhotoUpdated?.();
    } catch (err) {
      setUploadErr(err.message || "Upload failed.");
    } finally {
      setUploading(false); setUploadProgress(0);
    }
  };

  const row = (label, value) => (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${border}`,
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
      <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
        color: labelColor, letterSpacing: "0.15em", flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textColor,
        fontWeight: 500, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "72px 16px 16px",
      backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: "100%", maxWidth: "420px", maxHeight: "calc(100vh - 88px)",
        background: bg, border: `1px solid ${border}`, borderRadius: "16px",
        display: "flex", flexDirection: "column",
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ padding: "20px", borderBottom: `1px solid ${border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "14px",
            color: "#CC0000", letterSpacing: "0.15em" }}>EMPLOYEE PROFILE</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer",
            color: labelColor, padding: "4px" }}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {/* Avatar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "50%", overflow: "hidden",
                background: `${color}20`, border: `2px solid ${color}`,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {emp.photoUrl
                  ? <img src={getThumbnailUrl(emp.photoUrl, 144)} alt={emp.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "24px", color }}>{getInitials(emp.name)}</span>
                }
                {uploading && (
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
                    background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center",
                    justifyContent: "center" }}>
                    <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 700, color: "#00B8B8" }}>
                      {uploadProgress}%
                    </span>
                  </div>
                )}
              </div>
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
            </div>
            {uploadErr && (
              <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: "#CC0000",
                textAlign: "center", padding: "4px 8px", background: "rgba(204,0,0,0.08)",
                border: "1px solid rgba(204,0,0,0.2)", borderRadius: "4px" }}>
                ⚠ {uploadErr}
              </div>
            )}
          </div>

          {row("EMPLOYEE ID", formatEmpId(emp.id))}
          {row("DEPARTMENT", emp.department)}
          {row("EMAIL", emp.email)}
          {row("PHONE", emp.phone)}
          {row("JOIN DATE", emp.joinDate ? new Date(emp.joinDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—")}
          {row("COMPLETION DATE", emp.completionDate ? new Date(emp.completionDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not set")}
          {row("MONTHLY SALARY", `₹${Number(emp.salary).toLocaleString("en-IN")}`)}

          {/* ── Login Credentials Section ── */}
          <div style={{ marginTop: "20px" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "10px",
            }}>
              <div style={{
                fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
                color: "#CC0000", letterSpacing: "0.2em", textTransform: "uppercase",
                display: "flex", alignItems: "center", gap: "6px",
              }}>
                <ShieldCheck size={11} style={{ color: "#00B8B8" }} />
                LOGIN CREDENTIALS
              </div>
              {hasCredentials && emp.credentialsViewedAt && (
                <span style={{
                  fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
                  color: labelColor, letterSpacing: "0.1em",
                  background: isDark ? "#1A1A1A" : "#F0F0F0",
                  border: `1px solid ${border}`, borderRadius: "4px", padding: "2px 6px",
                }}>
                  VIEWED BEFORE
                </span>
              )}
            </div>

            {!hasCredentials ? (
              <div style={{
                padding: "14px", borderRadius: "10px", textAlign: "center",
                background: isDark ? "#0A0A0A" : "#F8F8F8",
                border: `1px dashed ${isDark ? "#2A2A2A" : "#D8D8D8"}`,
              }}>
                <KeyRound size={18} style={{ color: labelColor, margin: "0 auto 6px" }} />
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: labelColor }}>
                  No credentials stored
                </p>
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: isDark ? "#444444" : "#BBBBBB", marginTop: "3px" }}>
                  Only employees created after this update have stored credentials.
                </p>
              </div>
            ) : !credsRevealed ? (
              /* Locked state */
              <div style={{
                padding: "16px", borderRadius: "10px", textAlign: "center",
                background: isDark ? "#0A0A0A" : "#F8F8F8",
                border: `1px solid rgba(0,184,184,0.25)`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
              }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "50%",
                  background: "rgba(0,184,184,0.10)", border: "1px solid rgba(0,184,184,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <KeyRound size={18} style={{ color: "#00B8B8" }} />
                </div>
                <div>
                  <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px", color: textColor }}>
                    Credentials Hidden
                  </p>
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: labelColor, marginTop: "3px" }}>
                    {emp.credentialsViewedAt
                      ? "These credentials have been viewed before."
                      : "These credentials have never been revealed."}
                  </p>
                </div>
                <button
                  onClick={handleRevealCredentials}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "8px 20px", borderRadius: "7px", cursor: "pointer",
                    background: "rgba(0,184,184,0.12)", border: "1px solid rgba(0,184,184,0.4)",
                    color: "#00B8B8", fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
                    fontSize: "12px", letterSpacing: "0.1em",
                  }}
                >
                  <ShieldCheck size={13} /> REVEAL CREDENTIALS
                </button>
              </div>
            ) : (
              /* Revealed state */
              <div style={{
                borderRadius: "10px", overflow: "hidden",
                border: "1px solid rgba(0,184,184,0.3)",
                background: isDark ? "#0A0A0A" : "#F8F8F8",
              }}>
                {/* Header bar */}
                <div style={{
                  padding: "8px 12px", background: "rgba(0,184,184,0.08)",
                  borderBottom: "1px solid rgba(0,184,184,0.2)",
                  display: "flex", alignItems: "center", gap: "6px",
                }}>
                  <ShieldCheck size={11} style={{ color: "#00B8B8" }} />
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
                    color: "#00B8B8", letterSpacing: "0.15em" }}>ADMIN EYES ONLY</span>
                </div>

                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {/* Login Email */}
                  <div>
                    <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
                      color: "#CC0000", letterSpacing: "0.18em", marginBottom: "5px" }}>LOGIN EMAIL</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{
                        flex: 1, minWidth: 0, padding: "7px 10px", borderRadius: "6px",
                        background: isDark ? "#111111" : "#FFFFFF", border: `1px solid ${border}`,
                        fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textColor,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {emp.loginEmail}
                      </div>
                      <button
                        onClick={() => copyCredential(emp.loginEmail, setCopiedCredEmail)}
                        style={{
                          flexShrink: 0, padding: "6px 10px", borderRadius: "5px", cursor: "pointer",
                          background: copiedCredEmail ? "rgba(0,184,184,0.15)" : "transparent",
                          border: `1px solid ${copiedCredEmail ? "#00B8B8" : border}`,
                          color: copiedCredEmail ? "#00B8B8" : labelColor,
                          fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
                          display: "flex", alignItems: "center", gap: "4px",
                        }}
                      >
                        {copiedCredEmail ? <CheckCheck size={11} /> : <Copy size={11} />}
                        {copiedCredEmail ? "COPIED" : "COPY"}
                      </button>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
                      color: "#CC0000", letterSpacing: "0.18em", marginBottom: "5px",
                      display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      PASSWORD
                      <button
                        onClick={() => { setEditingPw(v => !v); setEditPwVal(emp.loginPassword || ""); setPwSaveErr(""); }}
                        style={{ background: "none", border: "none", cursor: "pointer",
                          fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
                          color: editingPw ? "#CC0000" : "#00B8B8", letterSpacing: "0.1em" }}
                      >
                        {editingPw ? "CANCEL" : "UPDATE"}
                      </button>
                    </div>

                    {!editingPw ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{
                          flex: 1, padding: "7px 10px", borderRadius: "6px",
                          background: isDark ? "#111111" : "#FFFFFF",
                          border: "1px solid rgba(0,184,184,0.3)",
                          fontFamily: "Share Tech Mono, monospace", fontSize: "13px",
                          color: "#00B8B8", letterSpacing: "0.05em",
                          wordBreak: "break-all",
                        }}>
                          {emp.loginPassword}
                        </div>
                        <button
                          onClick={() => copyCredential(emp.loginPassword, setCopiedCredPass)}
                          style={{
                            flexShrink: 0, padding: "6px 10px", borderRadius: "5px", cursor: "pointer",
                            background: copiedCredPass ? "rgba(0,184,184,0.15)" : "transparent",
                            border: `1px solid ${copiedCredPass ? "#00B8B8" : border}`,
                            color: copiedCredPass ? "#00B8B8" : labelColor,
                            fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
                            display: "flex", alignItems: "center", gap: "4px",
                          }}
                        >
                          {copiedCredPass ? <CheckCheck size={11} /> : <Copy size={11} />}
                          {copiedCredPass ? "COPIED" : "COPY"}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <input
                          type="text"
                          value={editPwVal}
                          onChange={e => setEditPwVal(e.target.value)}
                          placeholder="Enter new password to store…"
                          style={{
                            width: "100%", padding: "7px 10px", borderRadius: "6px", outline: "none",
                            background: isDark ? "#111111" : "#FFFFFF",
                            border: "1px solid rgba(204,0,0,0.4)",
                            fontFamily: "Share Tech Mono, monospace", fontSize: "12px",
                            color: textColor, boxSizing: "border-box",
                          }}
                        />
                        {pwSaveErr && (
                          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: "#CC0000" }}>
                            ⚠ {pwSaveErr}
                          </span>
                        )}
                        <button
                          onClick={handleUpdateStoredPassword}
                          disabled={pwSaving}
                          style={{
                            padding: "7px", borderRadius: "6px", cursor: pwSaving ? "not-allowed" : "pointer",
                            background: pwSaved ? "rgba(0,184,184,0.15)" : "rgba(204,0,0,0.9)",
                            border: "none", color: "#FFFFFF",
                            fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "12px",
                            letterSpacing: "0.08em", transition: "background 200ms",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                          }}
                        >
                          {pwSaving ? "SAVING…" : pwSaved ? "✓ SAVED" : "SAVE PASSWORD"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Warning note */}
                  <div style={{
                    padding: "8px 10px", borderRadius: "6px",
                    background: "rgba(201,146,42,0.08)", border: "1px solid rgba(201,146,42,0.25)",
                    fontFamily: "Mulish, sans-serif", fontSize: "11px", color: "#C9922A", lineHeight: 1.5,
                  }}>
                    💡 Remind the employee to change their password after first login.
                  </div>

                  {/* Hide button */}
                  <button
                    onClick={() => setCredsRevealed(false)}
                    style={{
                      width: "100%", padding: "7px", borderRadius: "6px", cursor: "pointer",
                      background: "transparent", border: `1px solid ${border}`,
                      color: labelColor, fontFamily: "Rajdhani, sans-serif", fontWeight: 600,
                      fontSize: "11px", letterSpacing: "0.08em",
                    }}
                  >
                    HIDE
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Offer Letter section ── */}
          <div style={{ marginTop: "20px" }}>
            <div style={{
              fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
              color: "#CC0000", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "10px",
            }}>
              OFFER LETTER
            </div>

            {emp.offerLetterUrl ? (
              <OfferLetterViewer
                url={emp.offerLetterUrl}
                fileName={emp.offerLetterFileName}
                uploadedAt={emp.offerLetterUploadedAt}
                theme={theme}
                border={border}
                isDark={isDark}
                labelColor={labelColor}
                textColor={textColor}
              />
            ) : (
              /* No letter uploaded yet */
              <div style={{
                padding: "14px", borderRadius: "10px", textAlign: "center",
                background: isDark ? "#0A0A0A" : "#F8F8F8",
                border: `1px dashed ${isDark ? "#2A2A2A" : "#D8D8D8"}`,
              }}>
                <FileText size={20} style={{ color: labelColor, margin: "0 auto 6px" }} />
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: labelColor }}>
                  No offer letter uploaded yet
                </p>
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: isDark ? "#444444" : "#BBBBBB", marginTop: "3px" }}>
                  Employee can upload it from their profile
                </p>
              </div>
            )}
          </div>

          {/* ── Generate Offer Letter button ── */}
          <div style={{ marginTop: "14px" }}>
            <button
              onClick={async () => {
                setOfferGenLoading(true);
                try {
                  await generateOfferLetter({
                    empId:          emp.id,
                    name:           emp.name,
                    role:           emp.role           || "Jr. Software Developer Intern",
                    joinDate:       emp.joinDate       || "",
                    completionDate: emp.completionDate || "",
                    department:     emp.department     || "",
                  });
                } catch (err) {
                  console.error("Offer letter error:", err);
                  alert("Could not generate: " + (err.message || "Unknown error"));
                } finally {
                  setOfferGenLoading(false);
                }
              }}
              disabled={offerGenLoading}
              style={{
                width: "100%", padding: "10px", borderRadius: "8px",
                cursor: offerGenLoading ? "not-allowed" : "pointer",
                background: offerGenLoading ? "rgba(0,184,184,0.06)" : "rgba(0,184,184,0.10)",
                border: "1px solid rgba(0,184,184,0.35)", color: "#00B8B8",
                fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "12px",
                letterSpacing: "0.1em",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
              }}
            >
              {offerGenLoading ? (
                <>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%",
                    border: "2px solid rgba(0,184,184,0.3)", borderTopColor: "#00B8B8",
                    animation: "spin 0.7s linear infinite" }} />
                  GENERATING…
                </>
              ) : (
                <><Download size={13} /> DOWNLOAD OFFER LETTER</>
              )}
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ padding: "16px", borderTop: `1px solid ${border}`, display: "flex", gap: "8px" }}>
          <button onClick={() => onEdit(emp)} style={{
            flex: 1, padding: "10px", background: "transparent", border: `1px solid ${border}`,
            borderRadius: "6px", color: textColor, fontFamily: "Rajdhani, sans-serif",
            fontWeight: 600, fontSize: "13px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          }}>
            <Edit2 size={14} /> EDIT
          </button>
          <button onClick={() => onDelete(emp)} style={{
            flex: 1, padding: "10px", background: "rgba(204,0,0,0.1)", border: "1px solid rgba(204,0,0,0.3)",
            borderRadius: "6px", color: "#CC0000", fontFamily: "Rajdhani, sans-serif",
            fontWeight: 600, fontSize: "13px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          }}>
            <Trash2 size={14} /> REMOVE
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => handlePhotoChange(e.target.files?.[0])} />
      </div>
    </div>
  );
}

// ── Mobile Employee Card ───────────────────────────────────────
function EmployeeCard({ emp, theme, onTap, onEdit, onDelete }) {
  const isDark    = theme === "dark";
  const cardBg    = isDark ? "#111111" : "#FFFFFF";
  const border    = isDark ? "#1E1E1E" : "#E0E0E0";
  const textColor = isDark ? "#F0F0F0" : "#111111";
  const subColor  = isDark ? "#A0A0A0" : "#888888";
  const color     = getAvatarColor(emp.id);

  return (
    <div
      onClick={() => onTap(emp)}
      style={{
        background: cardBg, border: `1px solid ${border}`, borderRadius: "12px",
        padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px",
        cursor: "pointer", transition: "border-color 150ms",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#CC0000"}
      onMouseLeave={e => e.currentTarget.style.borderColor = border}
    >
      {/* Avatar */}
      <div style={{ width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
        background: `${color}20`, border: `1.5px solid ${color}`, overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        {emp.photoUrl
          ? <img src={getThumbnailUrl(emp.photoUrl, 88)} alt={emp.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "14px", color }}>{getInitials(emp.name)}</span>
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "Mulish, sans-serif", fontWeight: 600, fontSize: "14px",
          color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {emp.name}
        </div>
        <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: subColor, marginTop: "1px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {emp.role} · {emp.department}
        </div>
        <div style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#00B8B8", marginTop: "1px" }}>
          {formatEmpId(emp.id)}
        </div>
      </div>

      {/* Right side: action buttons */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: "6px" }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(emp)} style={{
            width: "30px", height: "30px", background: "transparent",
            border: `1px solid ${border}`, borderRadius: "6px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: subColor,
          }}>
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(emp)} style={{
            width: "30px", height: "30px", background: "transparent",
            border: "1px solid rgba(204,0,0,0.3)", borderRadius: "6px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#CC0000",
          }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function Employees() {
  const { theme } = useTheme();
  const isMobile  = useIsMobile();
  const isDark    = theme === "dark";

  const [data,           setData]           = useState([]);
  const [departments,    setDepartments]    = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [leaves,          setLeaves]          = useState([]);
  const [search,         setSearch]         = useState("");
  const [deptFilter,     setDeptFilter]     = useState("All");
  const [showModal,      setShowModal]      = useState(false);
  const [editEmp,        setEditEmp]        = useState(null);
  const [drawer,         setDrawer]         = useState(null);
  const [newCredentials, setNewCredentials] = useState(null);
  const [confirmDelete,  setConfirmDelete]  = useState(null);
  const [deleting,       setDeleting]       = useState(false);

  // Today's date string (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    provisionTestEmployee();
    const unsub = subscribeEmployees((list) => setData(list));
    return unsub;
  }, []);

  // Keep the open drawer in sync with live Firestore data.
  // When an employee updates their password (or any field), Firestore fires the
  // subscribeEmployees listener above → data refreshes → this effect picks up the
  // updated employee object and refreshes the drawer automatically.
  useEffect(() => {
    if (!drawer) return;
    const fresh = data.find((e) => e.id === drawer.id);
    if (fresh) setDrawer(fresh);
  }, [data]);

  useEffect(() => {
    getDepartments().then((list) => { if (list.length > 0) setDepartments(list); });
  }, []);

  // Real-time today's attendance — same source as Attendance tab & Dashboard
  useEffect(() => {
    const unsub = subscribeAttendanceByDate(todayStr, (records) => {
      setTodayAttendance(records);
    });
    return unsub;
  }, [todayStr]);

  // Leave requests — same source as Leave Management tab & Dashboard
  useEffect(() => {
    const unsub = subscribeLeaveRequests((list) => setLeaves(list));
    return unsub;
  }, []);

  // ── Theme tokens ──
  const bg        = isDark ? "#0A0A0A" : "#F4F4F4";
  const cardBg    = isDark ? "#111111" : "#FFFFFF";
  const border    = isDark ? "#1E1E1E" : "#E0E0E0";
  const textColor = isDark ? "#F0F0F0" : "#111111";
  const subColor  = isDark ? "#A0A0A0" : "#888888";
  const inputBg   = isDark ? "#111111" : "#FFFFFF";

  // ── Filtered list ──
  const filtered = data.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = e.name.toLowerCase().includes(q)
      || e.role.toLowerCase().includes(q)
      || e.id.toLowerCase().includes(q);
    const matchDept   = deptFilter   === "All" || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  // ── KPI stats — same logic as Dashboard ──────────────────────
  // Present: employees with attendance record "Present" or "WFH" today
  const presentToday = todayAttendance.filter(
    (r) => r.status === "Present" || r.status === "WFH"
  ).length;

  // Absent: explicitly marked Absent + employees with NO record yet (unmarked = absent)
  const markedEmpIds     = new Set(todayAttendance.map((r) => r.empId));
  const explicitlyAbsent = todayAttendance.filter((r) => r.status === "Absent").length;
  const unmarkedCount    = data.filter((e) => !markedEmpIds.has(e.id)).length;
  const absentToday      = explicitlyAbsent + unmarkedCount;

  // On Leave / WFH: approved leave requests whose date range covers today
  const onLeaveToday = leaves.filter((r) => {
    if (r.status !== "Approved") return false;
    const from = r.from || "";
    const to   = r.to   || from;
    return from <= todayStr && todayStr <= to;
  }).length;

  const stats = [
    { label: "TOTAL EMPLOYEES", value: data.length,    icon: Users,     color: "#00B8B8" },
    { label: "PRESENT TODAY",   value: presentToday,   icon: UserCheck, color: "#00B8B8" },
    { label: "ABSENT TODAY",    value: absentToday,    icon: UserX,     color: "#CC0000" },
    { label: "ON LEAVE / WFH",  value: onLeaveToday,   icon: Clock,     color: "#C9922A" },
  ];

  // ── Handlers ──
  const handleAdd = async (form) => {
    const empId = await addEmployee({ ...form, salary: Number(form.salary) });
    const creds = await createEmployeeAccount({ empId, name: form.name, role: form.role }, firebaseConfig);
    // Persist credentials into the employee doc so admin can retrieve them from the drawer
    await saveEmployeeCredentials(empId, creds.email, creds.password);
    setShowModal(false);
    setNewCredentials({ ...creds, empId, name: form.name, role: form.role, joinDate: form.joinDate, completionDate: form.completionDate, department: form.department });
  };

  const handleEdit = async (form) => {
    await updateEmployee(form.id, form);
    setEditEmp(null);
    setDrawer(null);
  };

  const handleDelete = (emp) => { setDrawer(null); setConfirmDelete(emp); };

  const confirmDeleteEmployee = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteEmployeeAccount(confirmDelete.id, firebaseConfig);
      setData(prev => prev.filter(e => e.id !== confirmDelete.id));
      setConfirmDelete(null);
      setDrawer(null);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed: " + (err.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (emp) => { setDrawer(null); setEditEmp(emp); };

  // ── Shared select style ──
  const selectStyle = {
    appearance: "none",
    paddingLeft: "10px",
    paddingRight: "26px",
    height: "38px",
    background: inputBg,
    border: `1px solid ${border}`,
    borderRadius: "6px",
    color: textColor,
    fontFamily: "Mulish, sans-serif",
    fontSize: "13px",
    cursor: "pointer",
    outline: "none",
    width: "100%",
  };

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: isMobile ? "12px" : "24px" }}>

      {/* ── Stat Cards ── 2-col on mobile, 4-col on desktop */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: "10px",
        marginBottom: "16px",
      }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: cardBg, border: `1px solid ${border}`,
            borderRadius: "10px", padding: isMobile ? "12px 14px" : "16px 20px",
            display: "flex", alignItems: "center", gap: "12px",
          }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "8px", flexShrink: 0,
              background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <s.icon size={17} style={{ color: s.color }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
                fontSize: isMobile ? "22px" : "26px", color: textColor, lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
                color: "#CC0000", letterSpacing: "0.12em", marginTop: "2px",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: "10px",
        padding: "12px 14px", marginBottom: "14px",
        display: "flex", flexDirection: "column", gap: "10px" }}>

        {/* Row 1: Search (always full-width) */}
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%",
            transform: "translateY(-50%)", color: subColor, pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, role, ID…"
            style={{ width: "100%", paddingLeft: "34px", paddingRight: "10px", height: "38px",
              background: inputBg, border: `1px solid ${border}`, borderRadius: "6px",
              color: textColor, fontFamily: "Mulish, sans-serif", fontSize: "13px",
              outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Row 2: filters + add button */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>

          {/* Dept filter */}
          <div style={{ position: "relative", flex: "1 1 130px", minWidth: "110px" }}>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={selectStyle}>
              <option value="All">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: "absolute", right: "8px", top: "50%",
              transform: "translateY(-50%)", color: subColor, pointerEvents: "none" }} />
          </div>

          {/* Add employee button — pushes to far right */}
          <button
            onClick={() => setShowModal(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", height: "38px",
              padding: "0 16px", background: "#CC0000", border: "none", borderRadius: "6px",
              color: "#FFFFFF", fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
              fontSize: "13px", cursor: "pointer", letterSpacing: "0.08em",
              whiteSpace: "nowrap", marginLeft: "auto" }}
          >
            <Plus size={14} />
            {isMobile ? "ADD" : "ADD EMPLOYEE"}
          </button>
        </div>
      </div>

      {/* ── MOBILE: Card list ── */}
      {isMobile && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", fontFamily: "Mulish, sans-serif",
              fontSize: "13px", color: subColor }}>
              No employees found
            </div>
          ) : filtered.map(emp => (
            <EmployeeCard
              key={emp.id}
              emp={emp}
              theme={theme}
              onTap={setDrawer}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}

          {/* Footer count */}
          {filtered.length > 0 && (
            <div style={{ padding: "12px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: subColor }}>
                Showing {filtered.length} of {data.length} employees
              </span>
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#00B8B8" }}>
                ROYALS WEBTECH
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── DESKTOP: Table ── */}
      {!isMobile && (
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: "10px", overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 1fr 110px 120px 80px",
            padding: "10px 16px", borderBottom: `1px solid ${border}`,
            background: isDark ? "#0D0D0D" : "#F8F8F8" }}>
            {["#", "EMPLOYEE", "ROLE", "DEPARTMENT", "STATUS", "SALARY", ""].map((h, i) => (
              <span key={i} style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px",
                fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em" }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: subColor,
              fontFamily: "Mulish, sans-serif", fontSize: "13px" }}>
              No employees found
            </div>
          ) : filtered.map((emp, idx) => {
            const color = getAvatarColor(emp.id);
            return (
              <div
                key={emp.id}
                onClick={() => setDrawer(emp)}
                style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 1fr 110px 120px 80px",
                  padding: "12px 16px",
                  borderBottom: idx < filtered.length - 1 ? `1px solid ${border}` : "none",
                  cursor: "pointer", transition: "background 150ms", background: "transparent" }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? "#161616" : "#F9F9F9"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {/* # */}
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px",
                  color: subColor, display: "flex", alignItems: "center" }}>
                  {String(idx + 1).padStart(2, "0")}
                </span>

                {/* Employee */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                    background: `${color}20`, border: `1.5px solid ${color}`, overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {emp.photoUrl
                      ? <img src={getThumbnailUrl(emp.photoUrl, 64)} alt={emp.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "11px", color }}>{getInitials(emp.name)}</span>
                    }
                  </div>
                  <div>
                    <div style={{ fontFamily: "Mulish, sans-serif", fontWeight: 600, fontSize: "13px", color: textColor }}>
                      {emp.name}
                    </div>
                    <div style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#00B8B8" }}>
                      {formatEmpId(emp.id)}
                    </div>
                  </div>
                </div>

                {/* Role */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: subColor }}>{emp.role}</span>
                </div>

                {/* Department */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textColor }}>{emp.department}</span>
                </div>

                {/* Salary */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: "#00B8B8" }}>
                    ₹{Number(emp.salary).toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(emp)} style={{
                    width: "28px", height: "28px", background: "transparent",
                    border: `1px solid ${border}`, borderRadius: "4px", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", color: subColor,
                  }}>
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => handleDelete(emp)} style={{
                    width: "28px", height: "28px", background: "transparent",
                    border: "1px solid rgba(204,0,0,0.3)", borderRadius: "4px", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#CC0000",
                  }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}

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
      )}

      {/* ── Modals ── */}
      {showModal && (
        <EmployeeModal theme={theme} onClose={() => setShowModal(false)}
          onSave={handleAdd} departments={departments} />
      )}
      {editEmp && (
        <EmployeeModal theme={theme} onClose={() => setEditEmp(null)}
          onSave={handleEdit} initial={editEmp} departments={departments} />
      )}
      {drawer && (
        <EmployeeDrawer emp={drawer} theme={theme} isMobile={isMobile}
          onClose={() => setDrawer(null)} onEdit={openEdit}
          onDelete={handleDelete} onPhotoUpdated={() => {}} />
      )}
      {confirmDelete && (
        <ConfirmDeleteModal theme={theme} emp={confirmDelete} deleting={deleting}
          onConfirm={confirmDeleteEmployee}
          onCancel={() => !deleting && setConfirmDelete(null)} />
      )}
      {newCredentials && (
        <CredentialsModal theme={theme} credentials={newCredentials}
          onClose={() => setNewCredentials(null)} />
      )}
    </div>
  );
}