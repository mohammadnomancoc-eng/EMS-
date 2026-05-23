// ─────────────────────────────────────────────────────────────
//  src/pages/Attendance.jsx  —  RESPONSIVE VERSION
//  + Calendar View per employee (added — everything else unchanged)
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../App";
import {
  Search, Filter, Download, CalendarCheck,
  UserCheck, UserX, Home, Clock,
  ChevronDown, ChevronLeft, ChevronRight,
  Edit2, X, Camera, CalendarDays, FileText,
} from "lucide-react";
import {
  subscribeEmployees,
  subscribeAttendanceByDate,
  subscribeLeaveRequests,
  upsertAttendance,
  getAttendanceByEmployee,
} from "../firebase/firestoreService";

// ── Helpers ───────────────────────────────────────────
function getInitials(name = "") {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase() || "?";
}

const avatarColors = [
  "#CC0000", "#00B8B8", "#C9922A", "#6366F1", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16",
];
function getAvatarColor(id = "") {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return avatarColors[hash % avatarColors.length];
}

/** Display format: RWTPVTLTD-IT-OFLT-122025-05 → RWTPVTLTD/IT/OFLT/122025/05 */
function formatEmpId(id) {
  if (!id) return id;
  if (id.startsWith("RWTPVTLTD-")) return id.replace(/-/g, "/");
  return id;
}

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── Status Badge ─────────────────────────────────────
function StatusBadge({ status, theme }) {
  const styles = {
    dark: {
      Present: { bg: "rgba(0,184,184,0.10)",   border: "rgba(0,184,184,0.35)",   color: "#00B8B8" },
      Absent:  { bg: "rgba(204,0,0,0.10)",     border: "rgba(204,0,0,0.35)",     color: "#CC0000" },
      Leave:   { bg: "rgba(201,146,42,0.10)",  border: "rgba(201,146,42,0.35)",  color: "#C9922A" },
      WFH:     { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.2)",  color: "#E8E8E8" },
    },
    light: {
      Present: { bg: "#E6F9F9", border: "#00B8B8", color: "#007A7A" },
      Absent:  { bg: "#FDECEA", border: "#CC0000", color: "#990000" },
      Leave:   { bg: "#FDF3E0", border: "#C9922A", color: "#8A5E00" },
      WFH:     { bg: "#F0F0F0", border: "#888888", color: "#444444" },
    },
  };
  const t = theme === "dark" ? "dark" : "light";
  const s = styles[t][status] || styles[t].Absent;
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

// ── Edit Status Modal ─────────────────────────────────
function EditModal({ record, theme, onClose, onSave }) {
  const isDark = theme === "dark";
  const [status,   setStatus]   = useState(record.status || "Present");
  const [logIn,  setLogIn]  = useState(record.logIn  === "--" ? "" : (record.logIn  || ""));
  const [logOut, setLogOut] = useState(record.logOut === "--" ? "" : (record.logOut || ""));
  const [saving,   setSaving]   = useState(false);

  const inputStyle = {
    width: "100%",
    background: isDark ? "#1A1A1A" : "#F5F5F5",
    border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
    borderRadius: "6px",
    padding: "8px 12px",
    color: isDark ? "#F0F0F0" : "#111111",
    fontFamily: "Mulish, sans-serif",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
  };

  const handleSave = async () => {
    setSaving(true);
    const noTime = ["Absent", "Leave"].includes(status);
    await onSave({
      ...record,
      status,
      logIn:     noTime ? "--" : (logIn  || "--"),
      logOut:    noTime ? "--" : (logOut || "--"),
      hoursWorked: "--",
    });
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: isDark ? "#111111" : "#FFFFFF",
          border: `1px solid ${isDark ? "#1E1E1E" : "#E0E0E0"}`,
          borderRadius: "12px 12px 0 0",
          overflow: "hidden",
        }}
        className="sm:!rounded-xl"
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${isDark ? "#1A1A1A" : "#F0F0F0"}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: isDark ? "#F0F0F0" : "#111111" }}>
              Edit Attendance
            </p>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#666666" }}>
              {record.empName} · {record.dateLabel || record.date}
            </p>
          </div>
          <button onClick={onClose} style={{ color: "#555555", background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600, color: "#CC0000", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>
              STATUS
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["Present", "Absent", "Leave", "WFH"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  style={{
                    padding: "6px 14px", borderRadius: "6px",
                    fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 600,
                    cursor: "pointer",
                    border: status === s ? "1px solid #CC0000" : `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
                    background: status === s ? "rgba(204,0,0,0.12)" : "transparent",
                    color: status === s ? "#CC0000" : isDark ? "#666666" : "#888888",
                    transition: "all 150ms",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {!["Absent", "Leave"].includes(status) && (
            <>
              <div>
                <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600, color: "#CC0000", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>
                  LOG IN
                </label>
                <input type="text" placeholder="e.g. 09:30 AM" value={logIn} onChange={(e) => setLogIn(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600, color: "#CC0000", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>
                  LOG OUT
                </label>
                <input type="text" placeholder="e.g. 06:30 PM" value={logOut} onChange={(e) => setLogOut(e.target.value)} style={inputStyle} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${isDark ? "#1A1A1A" : "#F0F0F0"}`, display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px", borderRadius: "6px",
              fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 600,
              background: "transparent", border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
              color: isDark ? "#666666" : "#888888", cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "8px 18px", borderRadius: "6px",
              fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 600,
              background: saving ? "#880000" : "#CC0000", border: "1px solid #CC0000",
              color: "#FFFFFF", cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Work Description Modal ────────────────────────────
function WorkDescModal({ rec, theme, onClose }) {
  const isDark = theme === "dark";
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "480px",
          background: isDark ? "#111111" : "#FFFFFF",
          border: `1px solid ${isDark ? "#1E1E1E" : "#E0E0E0"}`,
          borderRadius: "12px 12px 0 0",
          overflow: "hidden",
        }}
        className="sm:!rounded-xl"
      >
        {/* Header */}
        <div style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${isDark ? "#1A1A1A" : "#F0F0F0"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "30px", height: "30px", borderRadius: "7px",
              background: "rgba(0,184,184,0.10)", border: "1px solid rgba(0,184,184,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <FileText size={14} style={{ color: "#00B8B8" }} />
            </div>
            <div>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "15px", color: isDark ? "#F0F0F0" : "#111111", margin: 0 }}>
                Work Summary
              </p>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: isDark ? "#555555" : "#999999", margin: "2px 0 0" }}>
                {rec.empName} · {rec.dateLabel}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: "#555555", background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 20px" }}>
          <p style={{
            fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
            color: "#CC0000", letterSpacing: "0.18em", marginBottom: "10px",
          }}>
            TODAY'S COMPLETED WORK
          </p>
          <div style={{
            padding: "14px 16px", borderRadius: "8px",
            background: isDark ? "#0D0D0D" : "#F7F7F7",
            border: `1px solid ${isDark ? "#1A1A1A" : "#EBEBEB"}`,
          }}>
            <p style={{
              fontFamily: "Mulish, sans-serif", fontSize: "13px", lineHeight: "1.7",
              color: isDark ? "#CCCCCC" : "#333333", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {rec.workDescription}
            </p>
          </div>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: isDark ? "#444" : "#BBB", marginTop: "10px", textAlign: "right" }}>
            Submitted at check-out via webcam
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Mobile Card View for each attendance record ───────
function AttendanceMobileCard({ rec, theme, isDark, textPri, textMuted, border, onEdit, onViewSnapshot }) {
  const color = getAvatarColor(rec.empId);
  return (
    <div style={{
      background: isDark ? "#111111" : "#FFFFFF",
      border: `1px solid ${border}`,
      borderRadius: "10px",
      padding: "14px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    }}>
      {/* Top row: avatar + name + status */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "50%",
          background: color, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "12px" }}>
            {getInitials(rec.empName)}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", fontWeight: 600, color: textPri, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {rec.empName}
          </p>
          <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMuted }}>
            {formatEmpId(rec.empId)} · {rec.role}
          </p>
        </div>
        {/* Status badge top-right */}
        <div style={{ flexShrink: 0 }}>
          {rec.status === "No Record" ? (
            <span style={{
              fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600,
              color: isDark ? "#444444" : "#BBBBBB",
              border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
              borderRadius: "4px", padding: "2px 8px",
            }}>No Record</span>
          ) : (
            <StatusBadge status={rec.status} theme={theme} />
          )}
        </div>
      </div>

      {/* Meta row: dept + date */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", marginBottom: "2px" }}>DEPT</p>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#888888" : "#666666" }}>{rec.department}</p>
        </div>
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", marginBottom: "2px" }}>DATE</p>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#888888" : "#666666" }}>{rec.dateLabel}</p>
        </div>
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", marginBottom: "2px" }}>LOG IN</p>
          <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: rec.logIn === "--" ? textMuted : (rec.isLate ? "#6366F1" : "#00B8B8") }}>{rec.logIn}</p>
        </div>
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", marginBottom: "2px" }}>LOG OUT</p>
          <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: rec.logOut === "--" ? textMuted : (isDark ? "#AAAAAA" : "#555555") }}>{rec.logOut}</p>
        </div>
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", marginBottom: "2px" }}>HOURS</p>
          <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: rec.hoursWorked === "--" ? textMuted : "#C9922A" }}>{rec.hoursWorked}</p>
        </div>
      </div>

      {/* Work description — shown inline when present */}
      {rec.workDescription && (
        <div style={{
          padding: "9px 12px", borderRadius: "7px",
          background: isDark ? "#0D0D0D" : "#F5F5F5",
          border: `1px solid ${isDark ? "#1A1A1A" : "rgba(0,184,184,0.2)"}`,
        }}>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", marginBottom: "5px" }}>
            WORK SUMMARY
          </p>
          <p style={{
            fontFamily: "Mulish, sans-serif", fontSize: "12px", lineHeight: "1.6",
            color: isDark ? "#AAAAAA" : "#555555", margin: 0,
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {rec.workDescription}
          </p>
        </div>
      )}

      {/* Tags + actions row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {rec.isLate && rec.status === "Present" && (
            <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 600, color: "#6366F1", letterSpacing: "0.05em" }}>
              LATE ARRIVAL
            </span>
          )}
          {rec.markedBy === "webcam" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#00B8B8", letterSpacing: "0.08em" }}>
              <Camera size={9} style={{ color: "#00B8B8" }} /> WEBCAM
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {rec.webcamSnapshotUrl && (
            <button
              onClick={() => onViewSnapshot(rec.webcamSnapshotUrl)}
              style={{
                width: "30px", height: "30px", borderRadius: "6px",
                border: "1px solid rgba(0,184,184,0.35)",
                background: "rgba(0,184,184,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#00B8B8",
              }}
              title="View webcam snapshot"
            >
              <Camera size={13} />
            </button>
          )}
          <button
            onClick={() => onEdit(rec)}
            style={{
              width: "30px", height: "30px", borderRadius: "6px",
              border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
              background: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: isDark ? "#555555" : "#888888",
            }}
            title="Edit attendance"
          >
            <Edit2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
//  CALENDAR VIEW MODAL
//  Shows a full month calendar for a specific employee
//  with color-coded attendance status on each day cell.
// ─────────────────────────────────────────────────────
const STATUS_COLORS = {
  Present:  { bg: "rgba(0,184,184,0.15)",   border: "#00B8B8", text: "#00B8B8",  dot: "#00B8B8"  },
  Absent:   { bg: "rgba(204,0,0,0.13)",     border: "#CC0000", text: "#CC0000",  dot: "#CC0000"  },
  Leave:    { bg: "rgba(201,146,42,0.15)",  border: "#C9922A", text: "#C9922A",  dot: "#C9922A"  },
  WFH:      { bg: "rgba(100,100,100,0.12)", border: "#777",    text: "#888",     dot: "#888"     },
};

function CalendarViewModal({ employee, theme, onClose }) {
  const isDark = theme === "dark";
  const today  = new Date();

  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-indexed
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tooltip,  setTooltip]  = useState(null); // { dateStr, x, y }

  // Fetch all attendance for this employee once
  useEffect(() => {
    setLoading(true);
    getAttendanceByEmployee(employee.id).then((data) => {
      setRecords(data);
      setLoading(false);
    });
  }, [employee.id]);

  // Build a lookup: "YYYY-MM-DD" → record
  const recMap = Object.fromEntries(records.map((r) => [r.date, r]));

  // Calendar grid helpers
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDow    = new Date(calYear, calMonth, 1).getDay(); // 0=Sun

  const monthName = new Date(calYear, calMonth, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  };

  // Stats for the current viewed month
  const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
  const monthRecords = records.filter((r) => r.date.startsWith(monthPrefix));
  const mPresent  = monthRecords.filter((r) => r.status === "Present").length;
  const mAbsent   = monthRecords.filter((r) => r.status === "Absent").length;
  const mLeave    = monthRecords.filter((r) => r.status === "Leave").length;
  const mWfh      = monthRecords.filter((r) => r.status === "WFH").length;

  const avatarColor = getAvatarColor(employee.id);
  const cardBg = isDark ? "#111111" : "#FFFFFF";
  const border = isDark ? "#1E1E1E" : "#E8E8E8";
  const textPri = isDark ? "#F0F0F0" : "#111111";
  const textMuted = isDark ? "#555555" : "#999999";
  const cellBg = isDark ? "#0D0D0D" : "#F9F9F9";

  // Build grid cells: leading empty slots + day cells
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) => {
    const t = new Date();
    return d === t.getDate() && calMonth === t.getMonth() && calYear === t.getFullYear();
  };

  const dateStr = (d) =>
    `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "640px",
          background: isDark ? "#0A0A0A" : "#F4F4F4",
          border: `1px solid ${border}`,
          borderRadius: "14px", overflow: "hidden",
          maxHeight: "92vh", display: "flex", flexDirection: "column",
        }}
      >
        {/* ── Modal Header ── */}
        <div style={{
          padding: "16px 20px",
          background: cardBg,
          borderBottom: `1px solid ${border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "38px", height: "38px", borderRadius: "50%",
              background: avatarColor, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFF", fontWeight: 700, fontSize: "13px" }}>
                {getInitials(employee.name)}
              </span>
            </div>
            <div>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: textPri, margin: 0 }}>
                {employee.name}
              </p>
              <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMuted, margin: "2px 0 0" }}>
                {formatEmpId(employee.id)} · {employee.department || "—"}
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              marginLeft: "4px", padding: "4px 10px", borderRadius: "20px",
              background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.2)",
            }}>
              <CalendarDays size={12} color="#CC0000" />
              <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, color: "#CC0000" }}>
                CALENDAR VIEW
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ color: textMuted, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: "auto", flex: 1 }}>

          {/* Month summary stats */}
          <div style={{
            display: "flex", gap: "8px", flexWrap: "wrap",
            padding: "14px 16px",
            background: cardBg,
            borderBottom: `1px solid ${border}`,
          }}>
            {[
              { label: "Present", val: mPresent, color: "#00B8B8" },
              { label: "Absent",  val: mAbsent,  color: "#CC0000" },
              { label: "Leave",   val: mLeave,   color: "#C9922A" },
              { label: "WFH",     val: mWfh,     color: "#777"    },
            ].map(({ label, val, color }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "7px 14px", borderRadius: "8px", flex: "1 1 80px",
                background: isDark ? "#0D0D0D" : "#F5F5F5",
                border: `1px solid ${isDark ? "#1A1A1A" : "#E8E8E8"}`,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color, margin: 0, lineHeight: 1 }}>{val}</p>
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: textMuted, margin: "2px 0 0" }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Month nav */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: `1px solid ${border}`,
            background: isDark ? "#0A0A0A" : "#F4F4F4",
          }}>
            <button
              onClick={prevMonth}
              style={{
                width: 32, height: 32, borderRadius: "7px",
                border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
                background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isDark ? "#888" : "#555",
              }}
            >
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: textPri }}>
              {monthName}
            </span>
            <button
              onClick={nextMonth}
              style={{
                width: 32, height: 32, borderRadius: "7px",
                border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
                background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isDark ? "#888" : "#555",
              }}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
            gap: "1px", padding: "10px 16px 4px",
            background: isDark ? "#0A0A0A" : "#F4F4F4",
          }}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
              <div key={d} style={{
                textAlign: "center",
                fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
                fontSize: "10px", letterSpacing: "0.1em",
                color: d === "Sun" || d === "Sat" ? "#CC0000" : textMuted,
                padding: "4px 0",
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center" }}>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted }}>
                Loading attendance records…
              </p>
            </div>
          ) : (
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
              gap: "5px", padding: "4px 16px 16px",
              background: isDark ? "#0A0A0A" : "#F4F4F4",
            }}>
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} />;
                }
                const ds  = dateStr(day);
                const rec = recMap[ds];
                const status = rec?.status;
                const cfg  = STATUS_COLORS[status];
                const todayFlag = isToday(day);
                const isWeekend = ((firstDow + day - 1) % 7 === 0) || ((firstDow + day - 1) % 7 === 6);

                return (
                  <div
                    key={ds}
                    title={status ? `${status}${rec?.logIn && rec.logIn !== "--" ? ` · In: ${rec.logIn}` : ""}${rec?.logOut && rec.logOut !== "--" ? ` · Out: ${rec.logOut}` : ""}` : "No record"}
                    style={{
                      borderRadius: "8px",
                      padding: "6px 4px 8px",
                      minHeight: "58px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                      background: cfg ? cfg.bg : (isDark ? "#111" : "#FFF"),
                      border: todayFlag
                        ? "1.5px solid #CC0000"
                        : cfg
                          ? `1px solid ${cfg.border}30`
                          : `1px solid ${isDark ? "#1A1A1A" : "#EBEBEB"}`,
                      cursor: "default",
                      transition: "transform 100ms",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    {/* Day number */}
                    <span style={{
                      fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
                      fontSize: "13px",
                      color: todayFlag ? "#CC0000" : isWeekend ? (isDark ? "#555" : "#CCC") : textPri,
                    }}>
                      {day}
                    </span>

                    {/* Status dot + short label */}
                    {status ? (
                      <>
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: cfg.dot, flexShrink: 0,
                        }} />
                        <span style={{
                          fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
                          fontSize: "8px", letterSpacing: "0.05em",
                          color: cfg.text, textAlign: "center", lineHeight: 1.1,
                        }}>
                          {status === "Present" ? "PRES" : status === "Absent" ? "ABS" : status === "Leave" ? "LVE" : "WFH"}
                        </span>
                        {/* Check-in time if available */}
                        {rec?.logIn && rec.logIn !== "--" && (
                          <span style={{
                            fontFamily: "Share Tech Mono, monospace",
                            fontSize: "7px", color: isDark ? "#444" : "#BBB",
                            marginTop: "1px",
                          }}>
                            {rec.logIn}
                          </span>
                        )}
                      </>
                    ) : (
                      !isWeekend && (
                        <span style={{
                          fontFamily: "Rajdhani, sans-serif", fontSize: "8px",
                          color: isDark ? "#2A2A2A" : "#DDDDDD",
                        }}>—</span>
                      )
                    )}

                    {/* Today badge */}
                    {todayFlag && (
                      <span style={{
                        position: "absolute", top: 3, right: 4,
                        fontFamily: "Rajdhani, sans-serif", fontSize: "7px", fontWeight: 700,
                        color: "#CC0000", letterSpacing: "0.05em",
                      }}>TODAY</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div style={{
            display: "flex", gap: "12px", flexWrap: "wrap",
            padding: "10px 16px 16px",
            background: isDark ? "#0A0A0A" : "#F4F4F4",
          }}>
            {Object.entries(STATUS_COLORS).map(([status, cfg]) => (
              <div key={status} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot }} />
                <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>
                  {status}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "2px", border: "1.5px solid #CC0000", display: "inline-block" }} />
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>Today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Attendance Page ──────────────────────────────
export default function Attendance() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter,   setDeptFilter]   = useState("All");
  const [dateFilter,   setDateFilter]   = useState(todayString);
  const [editRecord,   setEditRecord]   = useState(null);
  const [page,         setPage]         = useState(1);
  const [viewSnapshotUrl, setViewSnapshotUrl] = useState(null);
  // ── NEW: work description viewer state ──
  const [viewWorkDesc, setViewWorkDesc] = useState(null); // holds the full rec object
  // ── NEW: calendar view state ──
  const [calendarEmployee, setCalendarEmployee] = useState(null);

  const [employees,        setEmployees]        = useState([]);
  const [attendanceByDate, setAttendanceByDate] = useState([]);
  const [leaves,           setLeaves]           = useState([]);
  const [loadingEmp,       setLoadingEmp]       = useState(true);
  const [loadingAtt,       setLoadingAtt]       = useState(true);

  const PER_PAGE = 10;

  const cardBg    = isDark ? "#111111" : "#FFFFFF";
  const border    = isDark ? "#1E1E1E" : "#E8E8E8";
  const textPri   = isDark ? "#F0F0F0" : "#111111";
  const textMuted = isDark ? "#555555" : "#999999";

  useEffect(() => {
    setLoadingEmp(true);
    const unsub = subscribeEmployees((list) => { setEmployees(list); setLoadingEmp(false); });
    return unsub;
  }, []);

  useEffect(() => {
    setLoadingAtt(true);
    const unsub = subscribeAttendanceByDate(dateFilter, (list) => { setAttendanceByDate(list); setLoadingAtt(false); });
    return unsub;
  }, [dateFilter]);

  // Leave requests — source of truth for On Leave / WFH leave approvals
  useEffect(() => {
    const unsub = subscribeLeaveRequests((list) => setLeaves(list));
    return unsub;
  }, []);

  const attMap = Object.fromEntries(attendanceByDate.map((a) => [a.empId, a]));

  const dateObj   = new Date(dateFilter + "T00:00:00");
  const dateLabel = dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const dayName   = dateObj.toLocaleDateString("en-IN", { weekday: "long" });

  const mergedRecords = employees.map((emp) => {
    const att = attMap[emp.id];
    return {
      id:          att?.id       || `${emp.id}_${dateFilter}`,
      empId:       emp.id,
      empName:     emp.name      || emp.id,
      role:        emp.role      || emp.jobRole || "—",
      department:  emp.department || "—",
      date:        dateFilter,
      dateLabel,
      status:      att?.status   || "No Record",
      logIn:     att?.logIn  || "--",
      logOut:    att?.logOut || "--",
      hoursWorked: att?.hoursWorked || "--",
      isLate:      att?.logIn  ? att.logIn > "09:30 AM" : false,
      hasRecord:   !!att,
      markedBy:    att?.markedBy || "manual",
      webcamSnapshotUrl: att?.webcamSnapshotUrl || null,
      workDescription: att?.workDescription || null,
    };
  });

  const presentCount = mergedRecords.filter((r) => r.status === "Present").length;
  // Absent = explicitly marked Absent + employees with no attendance record yet (unmarked = absent)
  const explicitAbsent = mergedRecords.filter((r) => r.status === "Absent").length;
  const noRecordCount  = mergedRecords.filter((r) => r.status === "No Record").length;
  const absentCount    = explicitAbsent + noRecordCount;

  // On Leave — approved leave requests where requestType === "Leave" covering dateFilter
  // Raw leaveRequest docs use `requestType` ("Leave" | "WFH"), not `type`
  const approvedLeaveEmpIds = new Set(
    leaves
      .filter((r) => {
        if (r.status !== "Approved") return false;
        if ((r.requestType || r.type) === "WFH") return false;
        const from = r.from || "";
        const to   = r.to   || from;
        return from <= dateFilter && dateFilter <= to;
      })
      .map((r) => r.empId)
  );
  // Also count attendance records explicitly marked "Leave" for this date
  const attLeaveEmpIds = new Set(
    mergedRecords.filter((r) => r.status === "Leave").map((r) => r.empId)
  );
  const leaveCount = new Set([...approvedLeaveEmpIds, ...attLeaveEmpIds]).size;

  // WFH — approved WFH leave requests covering dateFilter OR attendance records marked "WFH"
  const approvedWfhEmpIds = new Set(
    leaves
      .filter((r) => {
        if (r.status !== "Approved") return false;
        if ((r.requestType || r.type) !== "WFH") return false;
        const from = r.from || "";
        const to   = r.to   || from;
        return from <= dateFilter && dateFilter <= to;
      })
      .map((r) => r.empId)
  );
  const attWfhEmpIds = new Set(
    mergedRecords.filter((r) => r.status === "WFH").map((r) => r.empId)
  );
  const wfhCount = new Set([...approvedWfhEmpIds, ...attWfhEmpIds]).size;

  const lateCount    = mergedRecords.filter((r) => r.isLate && r.status === "Present").length;

  const departments = ["All", ...new Set(employees.map((e) => e.department).filter(Boolean))];

  const filtered = mergedRecords.filter((r) => {
    // "No Record" (unmarked) is treated as Absent — consistent with KPI boxes
    const effectiveStatus = r.status === "No Record" ? "Absent" : r.status;
    const matchStatus = statusFilter === "All" || effectiveStatus === statusFilter;
    const matchDept   = deptFilter   === "All" || r.department === deptFilter;
    const matchSearch = !search ||
      r.empName.toLowerCase().includes(search.toLowerCase()) ||
      r.empId.toLowerCase().includes(search.toLowerCase()) ||
      r.role.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchDept && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSave = async (updated) => {
    await upsertAttendance({
      empId:       updated.empId,
      date:        updated.date,
      status:      updated.status,
      logIn:     updated.logIn,
      logOut:    updated.logOut,
      hoursWorked: updated.hoursWorked,
    });
    setEditRecord(null);
  };

  // ── CSV Export ────────────────────────────────────────
  const handleExport = useCallback(() => {
    const rows = filtered.length > 0 ? filtered : mergedRecords;
    if (rows.length === 0) return;

    const headers = [
      "Employee Name", "Employee ID", "Role", "Department", "Date",
      "Status", "Log In", "Log Out", "Hours Worked", "Late Arrival", "Marked By",
    ];

    const escape = (val) => {
      const str = val == null ? "" : String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const csvRows = [
      headers.join(","),
      ...rows.map((r) =>
        [
          escape(r.empName), escape(r.empId), escape(r.role), escape(r.department),
          escape(r.date), escape(r.status), escape(r.logIn), escape(r.logOut),
          escape(r.hoursWorked),
          r.isLate && r.status === "Present" ? "Yes" : "No",
          escape(r.markedBy),
        ].join(",")
      ),
    ];

    const csvContent = "\uFEFF" + csvRows.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = `attendance_${dateFilter}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filtered, mergedRecords, dateFilter]);

  const statCards = [
    { label: "Present",  value: presentCount, icon: UserCheck,    color: "#00B8B8" },
    { label: "Absent",   value: absentCount,  icon: UserX,        color: "#CC0000" },
    { label: "On Leave", value: leaveCount,   icon: CalendarCheck,color: "#C9922A" },
    { label: "WFH",      value: wfhCount,     icon: Home,         color: isDark ? "#888888" : "#555555" },
    { label: "Late",     value: lateCount,    icon: Clock,        color: "#6366F1" },
  ];

  const StatCard = ({ label, value, icon: Icon, color }) => (
    <div style={{
      background: cardBg, border: `1px solid ${border}`, borderRadius: "10px",
      padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px",
      flex: "1 1 120px",
    }}>
      <div style={{
        width: "36px", height: "36px", borderRadius: "8px", flexShrink: 0,
        background: `${color}14`, border: `1px solid ${color}33`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "20px", color: textPri, lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted, marginTop: "2px" }}>
          {label}
        </p>
      </div>
    </div>
  );

  const TH = ({ children, w }) => (
    <th style={{
      padding: "10px 14px", textAlign: "left",
      fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
      letterSpacing: "0.15em", color: "#CC0000",
      background: isDark ? "#0D0D0D" : "#F5F5F5",
      borderBottom: `1px solid ${border}`, whiteSpace: "nowrap", width: w,
    }}>
      {children}
    </th>
  );

  const loading = loadingEmp || loadingAtt;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textPri, lineHeight: 1 }}>
            Attendance Register
          </h2>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, marginTop: "3px" }}>
            Track and manage daily employee attendance
          </p>
        </div>
        <button
          onClick={handleExport}
          title={`Download ${filtered.length} record(s) as CSV`}
          style={{
            display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px",
            borderRadius: "7px", background: "transparent",
            border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
            color: isDark ? "#888888" : "#666666",
            fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 600,
            cursor: filtered.length === 0 ? "not-allowed" : "pointer",
            whiteSpace: "nowrap", transition: "all 150ms",
            opacity: filtered.length === 0 ? 0.45 : 1,
          }}
          onMouseEnter={(e) => {
            if (filtered.length === 0) return;
            e.currentTarget.style.borderColor = "#00B8B8";
            e.currentTarget.style.color = "#00B8B8";
            e.currentTarget.style.background = "rgba(0,184,184,0.07)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = isDark ? "#2A2A2A" : "#E0E0E0";
            e.currentTarget.style.color = isDark ? "#888888" : "#666666";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Download size={14} />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {statCards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      {/* ── Filters Bar ── */}
      <div style={{
        background: cardBg, border: `1px solid ${border}`, borderRadius: "10px",
        padding: "12px 14px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center",
      }}>
        {/* Date */}
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
          style={{
            padding: "7px 10px", borderRadius: "6px",
            border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
            background: isDark ? "#1A1A1A" : "#F5F5F5",
            color: textPri, fontFamily: "Mulish, sans-serif", fontSize: "13px", outline: "none",
            minWidth: "140px",
          }}
        />

        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 160px", minWidth: "160px" }}>
          <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#666666" }} />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: "100%", paddingLeft: "32px", paddingRight: "12px",
              paddingTop: "7px", paddingBottom: "7px", borderRadius: "6px",
              border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
              background: isDark ? "#1A1A1A" : "#F5F5F5",
              color: textPri, fontFamily: "Mulish, sans-serif", fontSize: "13px", outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Filter size={12} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#666666", pointerEvents: "none" }} />
          <ChevronDown size={12} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "#666666", pointerEvents: "none" }} />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{
              appearance: "none", paddingLeft: "28px", paddingRight: "28px",
              paddingTop: "7px", paddingBottom: "7px", borderRadius: "6px",
              border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
              background: isDark ? "#1A1A1A" : "#F5F5F5",
              color: textPri, fontFamily: "Mulish, sans-serif", fontSize: "13px",
              outline: "none", cursor: "pointer",
            }}
          >
            {["All", "Present", "Absent", "Leave", "WFH"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <ChevronDown size={12} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "#666666", pointerEvents: "none" }} />
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
            style={{
              appearance: "none", paddingLeft: "12px", paddingRight: "28px",
              paddingTop: "7px", paddingBottom: "7px", borderRadius: "6px",
              border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
              background: isDark ? "#1A1A1A" : "#F5F5F5",
              color: textPri, fontFamily: "Mulish, sans-serif", fontSize: "13px",
              outline: "none", cursor: "pointer", maxWidth: "140px",
            }}
          >
            {departments.map((d) => (
              <option key={d} value={d}>{d === "All" ? "All Depts" : d}</option>
            ))}
          </select>
        </div>

        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: textMuted, marginLeft: "auto", whiteSpace: "nowrap" }}>
          {filtered.length} REC{filtered.length !== 1 ? "S" : ""}
        </span>
      </div>

      {/* ── Desktop Table (md+) ── */}
      <div className="hidden md:block" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <TH w="200px">EMPLOYEE</TH>
                <TH w="110px">DEPARTMENT</TH>
                <TH w="110px">DATE</TH>
                <TH w="120px">STATUS</TH>
                <TH w="110px">LOG IN</TH>
                <TH w="110px">LOG OUT</TH>
                <TH w="90px">HOURS</TH>
                <TH w="90px">ACTION</TH>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: "48px", textAlign: "center" }}>
                    <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted }}>Loading attendance data…</p>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "48px", textAlign: "center" }}>
                    <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "15px", color: textMuted }}>No records found</p>
                  </td>
                </tr>
              ) : (
                paginated.map((rec, i) => {
                  const color = getAvatarColor(rec.empId);
                  const rowBg = i % 2 === 0 ? (isDark ? "#111111" : "#FFFFFF") : (isDark ? "#0D0D0D" : "#FAFAFA");
                  return (
                    <tr key={rec.id} style={{ background: rowBg, borderBottom: `1px solid ${isDark ? "#161616" : "#F0F0F0"}` }}>
                      {/* Employee */}
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "11px" }}>{getInitials(rec.empName)}</span>
                          </div>
                          <div>
                            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: 600, color: textPri, lineHeight: 1.2 }}>{rec.empName}</p>
                            <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMuted }}>{formatEmpId(rec.empId)} · {rec.role}</p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#888888" : "#666666" }}>{rec.department}</span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#888888" : "#666666" }}>{rec.dateLabel}</span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                          {rec.status === "No Record" ? (
                            <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600, color: isDark ? "#444444" : "#BBBBBB", border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`, borderRadius: "4px", padding: "2px 8px" }}>No Record</span>
                          ) : (
                            <StatusBadge status={rec.status} theme={theme} />
                          )}
                          {rec.isLate && rec.status === "Present" && (
                            <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 600, color: "#6366F1", letterSpacing: "0.05em" }}>LATE ARRIVAL</span>
                          )}
                          {rec.markedBy === "webcam" && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#00B8B8", letterSpacing: "0.08em" }}>
                              <Camera size={9} style={{ color: "#00B8B8" }} /> WEBCAM
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Log In */}
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: rec.logIn === "--" ? textMuted : (rec.isLate ? "#6366F1" : "#00B8B8") }}>{rec.logIn}</span>
                      </td>

                      {/* Log Out */}
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: rec.logOut === "--" ? textMuted : (isDark ? "#AAAAAA" : "#555555") }}>{rec.logOut}</span>
                      </td>

                      {/* Hours */}
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: rec.hoursWorked === "--" ? textMuted : "#C9922A" }}>{rec.hoursWorked}</span>
                      </td>

                      {/* Action — edit + NEW calendar button */}
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          {rec.webcamSnapshotUrl && (
                            <button
                              onClick={() => setViewSnapshotUrl(rec.webcamSnapshotUrl)}
                              style={{ width: "30px", height: "30px", borderRadius: "6px", border: "1px solid rgba(0,184,184,0.35)", background: "rgba(0,184,184,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#00B8B8", transition: "all 150ms", flexShrink: 0 }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,184,184,0.18)"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,184,184,0.08)"}
                              title="View webcam snapshot"
                            >
                              <Camera size={13} />
                            </button>
                          )}
                          {/* Work Description button */}
                          {rec.workDescription && (
                            <button
                              onClick={() => setViewWorkDesc(rec)}
                              style={{ width: "30px", height: "30px", borderRadius: "6px", border: "1px solid rgba(0,184,184,0.3)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#00B8B8", transition: "all 150ms" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,184,184,0.10)"; e.currentTarget.style.borderColor = "#00B8B8"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(0,184,184,0.3)"; }}
                              title="View work summary"
                            >
                              <FileText size={13} />
                            </button>
                          )}
                          {/* Calendar View button */}
                          <button
                            onClick={() => setCalendarEmployee(employees.find((e) => e.id === rec.empId))}
                            style={{ width: "30px", height: "30px", borderRadius: "6px", border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: isDark ? "#555555" : "#888888", transition: "all 150ms" }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#CC0000"; e.currentTarget.style.color = "#CC0000"; e.currentTarget.style.background = "rgba(204,0,0,0.06)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? "#2A2A2A" : "#E0E0E0"; e.currentTarget.style.color = isDark ? "#555555" : "#888888"; e.currentTarget.style.background = "transparent"; }}
                            title="View calendar"
                          >
                            <CalendarDays size={13} />
                          </button>
                          <button
                            onClick={() => setEditRecord(rec)}
                            style={{ width: "30px", height: "30px", borderRadius: "6px", border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: isDark ? "#555555" : "#888888", transition: "all 150ms" }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#CC0000"; e.currentTarget.style.color = "#CC0000"; e.currentTarget.style.background = "rgba(204,0,0,0.06)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? "#2A2A2A" : "#E0E0E0"; e.currentTarget.style.color = isDark ? "#555555" : "#888888"; e.currentTarget.style.background = "transparent"; }}
                            title="Edit attendance"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: `1px solid ${border}`, flexWrap: "wrap", gap: "8px" }}>
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: textMuted }}>
              PAGE {page} OF {totalPages} · {filtered.length} RECORDS
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ width: "30px", height: "30px", borderRadius: "6px", border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? (isDark ? "#333333" : "#CCCCCC") : (isDark ? "#888888" : "#555555") }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p > totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)} style={{ width: "30px", height: "30px", borderRadius: "6px", border: p === page ? "1px solid #CC0000" : `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`, background: p === page ? "rgba(204,0,0,0.10)" : "transparent", color: p === page ? "#CC0000" : (isDark ? "#888888" : "#555555"), fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                    {p}
                  </button>
                );
              })}
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} style={{ width: "30px", height: "30px", borderRadius: "6px", border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? (isDark ? "#333333" : "#CCCCCC") : (isDark ? "#888888" : "#555555") }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile Card List (below md) ── */}
      <div className="md:hidden flex flex-col gap-3">
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted }}>Loading attendance data…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "15px", color: textMuted }}>No records found</p>
          </div>
        ) : (
          paginated.map((rec) => (
            <div key={rec.id}>
              <AttendanceMobileCard
                rec={rec}
                theme={theme}
                isDark={isDark}
                textPri={textPri}
                textMuted={textMuted}
                border={border}
                onEdit={setEditRecord}
                onViewSnapshot={setViewSnapshotUrl}
              />
              {/* Calendar button below each mobile card */}
              <button
                onClick={() => setCalendarEmployee(employees.find((e) => e.id === rec.empId))}
                style={{
                  marginTop: "6px", width: "100%", padding: "8px",
                  borderRadius: "8px", border: `1px solid ${isDark ? "#1E1E1E" : "#E8E8E8"}`,
                  background: "transparent", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  color: isDark ? "#555" : "#999",
                  fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 600,
                  transition: "all 150ms",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#CC0000"; e.currentTarget.style.color = "#CC0000"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? "#1E1E1E" : "#E8E8E8"; e.currentTarget.style.color = isDark ? "#555" : "#999"; }}
              >
                <CalendarDays size={13} />
                View Calendar
              </button>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", gap: "8px" }}>
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMuted }}>
              {page}/{totalPages} · {filtered.length} REC
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ width: "32px", height: "32px", borderRadius: "6px", border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? (isDark ? "#333333" : "#CCCCCC") : (isDark ? "#888888" : "#555555") }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                const p = page <= 2 ? i + 1 : page - 1 + i;
                if (p > totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)} style={{ width: "32px", height: "32px", borderRadius: "6px", border: p === page ? "1px solid #CC0000" : `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`, background: p === page ? "rgba(204,0,0,0.10)" : "transparent", color: p === page ? "#CC0000" : (isDark ? "#888888" : "#555555"), fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                    {p}
                  </button>
                );
              })}
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} style={{ width: "32px", height: "32px", borderRadius: "6px", border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? (isDark ? "#333333" : "#CCCCCC") : (isDark ? "#888888" : "#555555") }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Webcam Snapshot Viewer Modal ── */}
      {viewSnapshotUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}
          onClick={() => setViewSnapshotUrl(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDark ? "#111111" : "#FFFFFF",
              border: `1px solid ${isDark ? "#1E1E1E" : "#E0E0E0"}`,
              borderRadius: "14px", overflow: "hidden",
              maxWidth: "480px", width: "100%",
            }}
          >
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${isDark ? "#1A1A1A" : "#F0F0F0"}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Camera size={15} style={{ color: "#00B8B8" }} />
                <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "15px", color: isDark ? "#F0F0F0" : "#111111" }}>Webcam Snapshot</span>
              </div>
              <button onClick={() => setViewSnapshotUrl(null)} style={{ color: "#555555", background: "none", border: "none", cursor: "pointer" }}>
                <X size={17} />
              </button>
            </div>
            <div style={{ padding: "16px" }}>
              <img src={viewSnapshotUrl} alt="Webcam attendance snapshot" style={{ width: "100%", borderRadius: "8px", display: "block" }} />
            </div>
            <div style={{ padding: "10px 16px 16px", textAlign: "center" }}>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: isDark ? "#555555" : "#999999" }}>
                Photo captured automatically at time of webcam check-in / check-out
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editRecord && (
        <EditModal
          record={editRecord}
          theme={theme}
          onClose={() => setEditRecord(null)}
          onSave={handleSave}
        />
      )}

      {/* ── Work Description Modal (NEW) ── */}
      {viewWorkDesc && (
        <WorkDescModal
          rec={viewWorkDesc}
          theme={theme}
          onClose={() => setViewWorkDesc(null)}
        />
      )}

      {/* ── Calendar View Modal (NEW) ── */}
      {calendarEmployee && (
        <CalendarViewModal
          employee={calendarEmployee}
          theme={theme}
          onClose={() => setCalendarEmployee(null)}
        />
      )}
    </div>
  );
}