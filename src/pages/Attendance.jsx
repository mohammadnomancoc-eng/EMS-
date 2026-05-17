// ─────────────────────────────────────────────────────────────
//  src/pages/Attendance.jsx  —  RESPONSIVE VERSION
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../App";
import {
  Search, Filter, Download, CalendarCheck,
  UserCheck, UserX, Home, Clock,
  ChevronDown, ChevronLeft, ChevronRight,
  Edit2, X, Camera,
} from "lucide-react";
import {
  subscribeEmployees,
  subscribeAttendanceByDate,
  upsertAttendance,
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
  // String hash — works for any ID format (old RWT### or new RWTPVTLTD/…)
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
  const [checkIn,  setCheckIn]  = useState(record.checkIn  === "--" ? "" : (record.checkIn  || ""));
  const [checkOut, setCheckOut] = useState(record.checkOut === "--" ? "" : (record.checkOut || ""));
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
      checkIn:     noTime ? "--" : (checkIn  || "--"),
      checkOut:    noTime ? "--" : (checkOut || "--"),
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
                  CHECK IN
                </label>
                <input type="text" placeholder="e.g. 09:30 AM" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600, color: "#CC0000", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>
                  CHECK OUT
                </label>
                <input type="text" placeholder="e.g. 06:30 PM" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} style={inputStyle} />
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
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", marginBottom: "2px" }}>CHECK IN</p>
          <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: rec.checkIn === "--" ? textMuted : (rec.isLate ? "#6366F1" : "#00B8B8") }}>{rec.checkIn}</p>
        </div>
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", marginBottom: "2px" }}>CHECK OUT</p>
          <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: rec.checkOut === "--" ? textMuted : (isDark ? "#AAAAAA" : "#555555") }}>{rec.checkOut}</p>
        </div>
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", marginBottom: "2px" }}>HOURS</p>
          <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: rec.hoursWorked === "--" ? textMuted : "#C9922A" }}>{rec.hoursWorked}</p>
        </div>
      </div>

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

  const [employees,        setEmployees]        = useState([]);
  const [attendanceByDate, setAttendanceByDate] = useState([]);
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
      checkIn:     att?.checkIn  || "--",
      checkOut:    att?.checkOut || "--",
      hoursWorked: att?.hoursWorked || "--",
      isLate:      att?.checkIn  ? att.checkIn > "09:30 AM" : false,
      hasRecord:   !!att,
      markedBy:    att?.markedBy || "manual",
      webcamSnapshotUrl: att?.webcamSnapshotUrl || null,
    };
  });

  const presentCount = mergedRecords.filter((r) => r.status === "Present").length;
  const absentCount  = mergedRecords.filter((r) => r.status === "Absent").length;
  const leaveCount   = mergedRecords.filter((r) => r.status === "Leave").length;
  const wfhCount     = mergedRecords.filter((r) => r.status === "WFH").length;
  const lateCount    = mergedRecords.filter((r) => r.isLate && r.status === "Present").length;

  const departments = ["All", ...new Set(employees.map((e) => e.department).filter(Boolean))];

  const filtered = mergedRecords.filter((r) => {
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
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
      checkIn:     updated.checkIn,
      checkOut:    updated.checkOut,
      hoursWorked: updated.hoursWorked,
    });
    setEditRecord(null);
  };

  // ── CSV Export ────────────────────────────────────────
  // Exports ALL currently-filtered records (not just the current page)
  // as a downloadable .csv file named after the selected date.
  const handleExport = useCallback(() => {
    const rows = filtered.length > 0 ? filtered : mergedRecords;
    if (rows.length === 0) return;

    const headers = [
      "Employee Name",
      "Employee ID",
      "Role",
      "Department",
      "Date",
      "Status",
      "Check In",
      "Check Out",
      "Hours Worked",
      "Late Arrival",
      "Marked By",
    ];

    const escape = (val) => {
      const str = val == null ? "" : String(val);
      // Wrap in quotes if it contains commas, quotes, or newlines
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const csvRows = [
      headers.join(","),
      ...rows.map((r) =>
        [
          escape(r.empName),
          escape(r.empId),
          escape(r.role),
          escape(r.department),
          escape(r.date),
          escape(r.status),
          escape(r.checkIn),
          escape(r.checkOut),
          escape(r.hoursWorked),
          r.isLate && r.status === "Present" ? "Yes" : "No",
          escape(r.markedBy),
        ].join(",")
      ),
    ];

    const csvContent = "\uFEFF" + csvRows.join("\r\n"); // BOM for Excel UTF-8
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
      {/* Wraps naturally: 3 on mobile, 5 on wider screens */}
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

        {/* Search — grows to fill available space */}
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
            {["All", "Present", "Absent", "Leave", "WFH", "No Record"].map((s) => (
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
                <TH w="110px">CHECK IN</TH>
                <TH w="110px">CHECK OUT</TH>
                <TH w="90px">HOURS</TH>
                <TH w="70px">ACTION</TH>
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

                      {/* Check In */}
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: rec.checkIn === "--" ? textMuted : (rec.isLate ? "#6366F1" : "#00B8B8") }}>{rec.checkIn}</span>
                      </td>

                      {/* Check Out */}
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: rec.checkOut === "--" ? textMuted : (isDark ? "#AAAAAA" : "#555555") }}>{rec.checkOut}</span>
                      </td>

                      {/* Hours */}
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: rec.hoursWorked === "--" ? textMuted : "#C9922A" }}>{rec.hoursWorked}</span>
                      </td>

                      {/* Action */}
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
            <AttendanceMobileCard
              key={rec.id}
              rec={rec}
              theme={theme}
              isDark={isDark}
              textPri={textPri}
              textMuted={textMuted}
              border={border}
              onEdit={setEditRecord}
              onViewSnapshot={setViewSnapshotUrl}
            />
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
    </div>
  );
}