// ─────────────────────────────────────────────────────────────
//  src/pages/LeaveManagement.jsx  — Fully Responsive
//
//  All original bug fixes preserved (BUG-03, BUG-05).
//  Responsive changes:
//  • Header card: row → stacked on mobile
//  • Stat cards: 4-col → 2-col on mobile, 4-col on lg+
//  • Stat number: 48px → clamp(32px, 6vw, 48px)
//  • Table: hidden on mobile — replaced by card list view
//  • Toolbar: wraps cleanly on mobile, full-width search
//  • Detail modal: bottom-sheet on mobile, centered on sm+
//  • All modals: min(width, 95vw) clamped
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useTheme } from "../App";
import {
  CalendarOff, Check, X, Search,
  Clock, CheckCircle, XCircle, Home,
  ChevronDown, Eye, Calendar, ChevronLeft, ChevronRight
} from "lucide-react";
import {
  subscribeLeaveRequests,
  updateLeaveStatus,
  subscribeEmployees,
  updateEmployee,
  subscribeQuotaRequests,
  updateQuotaRequestStatus,
} from "../firebase/firestoreService";

// ── Helpers ───────────────────────────────────────────
function getInitials(name = "") {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase() || "?";
}

function normalise(doc, employeesMap) {
  const type     = doc.type || doc.leaveType || doc.requestType || "Leave";
  const employee = doc.employee || employeesMap[doc.empId]?.name || doc.empId || "Unknown";
  return { ...doc, type, employee };
}

function getEmpRole(empId, employeesMap) {
  return employeesMap[empId]?.role || employeesMap[empId]?.jobRole || "Employee";
}

function getDeptColor(empId, employeesMap) {
  const dept = employeesMap[empId]?.department || "";
  const map = {
    Engineering: "#00B8B8", Design: "#CC0000", Management: "#C9922A",
    QA: "#00B8B8", HR: "#CC0000", Marketing: "#C9922A",
  };
  return map[dept] || "#00B8B8";
}

// ── Status Badge ──────────────────────────────────────
function StatusBadge({ status, theme }) {
  const styles = {
    dark: {
      Approved: { bg: "rgba(0,184,184,0.10)",  border: "rgba(0,184,184,0.35)",  color: "#00B8B8" },
      Pending:  { bg: "rgba(201,146,42,0.10)", border: "rgba(201,146,42,0.35)", color: "#C9922A" },
      Rejected: { bg: "rgba(204,0,0,0.10)",    border: "rgba(204,0,0,0.35)",    color: "#CC0000" },
    },
    light: {
      Approved: { bg: "#E6F9F9", border: "#00B8B8", color: "#007A7A" },
      Pending:  { bg: "#FDF3E0", border: "#C9922A", color: "#8A5E00" },
      Rejected: { bg: "#FDECEA", border: "#CC0000", color: "#990000" },
    },
  };
  const s = (styles[theme] || styles.dark)[status] || (styles[theme] || styles.dark).Pending;
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

// ── Leave Type Badge ──────────────────────────────────
function TypeBadge({ type, theme }) {
  const map = {
    "Annual Leave": "#C9922A", "Sick Leave": "#CC0000",
    "Casual Leave": "#00B8B8", "WFH": theme === "dark" ? "#888888" : "#555555",
    "Leave": "#C9922A",
  };
  const color = map[type] || "#888888";
  return (
    <span style={{
      background: `${color}14`, border: `1px solid ${color}55`, color,
      fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600,
      borderRadius: "4px", padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {type}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, theme }) {
  const surface = theme === "dark" ? "#111111" : "#FFFFFF";
  const border  = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  return (
    <div
      className="rounded-xl p-4 sm:p-5 flex flex-col gap-2 sm:gap-3"
      style={{
        background: surface, border: `1px solid ${border}`,
        boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 200ms",
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = color}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = border}
    >
      <div className="flex items-start justify-between">
        <span style={{
          fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
          color: "#CC0000", letterSpacing: "0.2em",
        }}>
          {label}
        </span>
        <div className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: "32px", height: "32px", background: theme === "dark" ? "#1A1A1A" : "#F5F5F5" }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <span style={{
        fontFamily: "Rajdhani, sans-serif",
        fontSize: "clamp(28px, 5vw, 48px)",
        fontWeight: 700, lineHeight: 1, color,
      }}>
        {value}
      </span>
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────
function DetailModal({ req, employeesMap, onClose, onApprove, onReject, theme }) {
  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#666666";
  const divider   = theme === "dark" ? "#1A1A1A" : "#EEEEEE";
  const color     = getDeptColor(req.empId, employeesMap);
  const days      = req.days ?? 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Bottom-sheet on mobile, centered card on sm+ */}
      <div
        style={{
          background: surface,
          border: `1px solid ${border}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          width: "min(480px, 100%)",
          maxHeight: "90dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        className="rounded-t-2xl sm:rounded-xl w-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${border}` }}>
          <div>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em" }}>
              LEAVE REQUEST
            </p>
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "clamp(16px, 4vw, 20px)", color: textPri }}>
              Request Details
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ color: "#555555", transition: "color 150ms", flexShrink: 0 }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#CC0000"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#555555"}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {/* Employee Info */}
          <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${divider}` }}>
            <div className="rounded-full flex-shrink-0 overflow-hidden"
              style={{ width: "44px", height: "44px",
                background: employeesMap[req.empId]?.photoUrl ? "transparent" : `${color}22`,
                border: `2px solid ${color}55`,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
              {employeesMap[req.empId]?.photoUrl
                ? <img src={employeesMap[req.empId].photoUrl} alt={req.employee} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "14px", color }}>{getInitials(req.employee)}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "clamp(14px, 4vw, 17px)", color: textPri, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {req.employee}
              </p>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted }}>
                {getEmpRole(req.empId, employeesMap)} · {req.empId}
              </p>
            </div>
            <div className="flex-shrink-0">
              <StatusBadge status={req.status} theme={theme} />
            </div>
          </div>

          {/* Details Grid */}
          <div className="px-5 py-4 grid grid-cols-2 gap-4">
            {[
              { label: "LEAVE TYPE", value: req.type },
              { label: "DURATION",   value: `${days} day${days !== 1 ? "s" : ""}` },
              { label: "FROM",       value: req.from },
              { label: "TO",         value: req.to },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", marginBottom: "4px" }}>{label}</p>
                <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "13px", color: textPri, wordBreak: "break-word" }}>{value}</p>
              </div>
            ))}
            <div className="col-span-2">
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", marginBottom: "4px" }}>REASON</p>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted, lineHeight: 1.5 }}>{req.reason || "—"}</p>
            </div>
          </div>
        </div>

        {/* Actions — always visible at bottom */}
        {req.status === "Pending" && (
          <div className="px-5 py-4 flex items-center gap-3 flex-shrink-0"
            style={{ borderTop: `1px solid ${border}` }}>
            <button
              onClick={() => onReject(req.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md"
              style={{
                fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px",
                border: "1px solid rgba(204,0,0,0.4)", color: "#CC0000", background: "rgba(204,0,0,0.06)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(204,0,0,0.12)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(204,0,0,0.06)"}
            >
              <XCircle size={14} /> Reject
            </button>
            <button
              onClick={() => onApprove(req.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md"
              style={{
                fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px",
                background: "#00B8B8", color: "#000000", border: "none", cursor: "pointer",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#009A9A"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#00B8B8"}
            >
              <CheckCircle size={14} /> Approve
            </button>
          </div>
        )}
        {req.status !== "Pending" && (
          <div className="px-5 py-4 flex justify-end flex-shrink-0"
            style={{ borderTop: `1px solid ${border}` }}>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-md"
              style={{
                fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px",
                border: `1px solid ${border}`, color: textPri, background: "transparent", cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mobile Card (replaces table row on small screens) ─
function MobileLeaveCard({ req, theme, border, divider, textPri, textMuted, onView, onApprove, onReject }) {
  const color = "#00B8B8"; // will be overridden via getDeptColor in parent
  const days  = req.days ?? 1;
  return (
    <div style={{
      padding: "14px 16px",
      borderBottom: `1px solid ${divider}`,
      display: "flex", flexDirection: "column", gap: "10px",
    }}>
      {/* Top: avatar + name + status */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div className="rounded-full flex-shrink-0 overflow-hidden"
          style={{ width: "36px", height: "36px",
            background: req._photoUrl ? "transparent" : `${req._color}22`,
            border: `1.5px solid ${req._color}55`,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          {req._photoUrl
            ? <img src={req._photoUrl} alt={req.employee} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "11px", color: req._color }}>{getInitials(req.employee)}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: 600, color: textPri, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {req.employee}
          </p>
          <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMuted }}>{req.empId}</p>
        </div>
        <StatusBadge status={req.status} theme={theme} />
      </div>

      {/* Middle: type + dates + days */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <TypeBadge type={req.type} theme={theme} />
        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: textMuted }}>
          {req.from} → {req.to}
        </span>
        <span style={{
          fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, color: textPri,
          background: theme === "dark" ? "#1A1A1A" : "#F0F0F0",
          border: `1px solid ${border}`, borderRadius: "4px", padding: "1px 7px",
        }}>
          {days}d
        </span>
      </div>

      {/* Bottom: action buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        {req.status === "Pending" && (
          <>
            <button
              onClick={() => onApprove(req.id)}
              style={{
                flex: 1, padding: "7px 0", borderRadius: "6px", cursor: "pointer",
                background: "rgba(0,184,184,0.1)", border: "1px solid rgba(0,184,184,0.3)",
                color: "#00B8B8", fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
                fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
              }}
            >
              <Check size={12} /> Approve
            </button>
            <button
              onClick={() => onReject(req.id)}
              style={{
                flex: 1, padding: "7px 0", borderRadius: "6px", cursor: "pointer",
                background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.3)",
                color: "#CC0000", fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
                fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
              }}
            >
              <X size={12} /> Reject
            </button>
          </>
        )}
        <button
          onClick={() => onView(req)}
          style={{
            flex: req.status === "Pending" ? "0 0 36px" : 1,
            padding: "7px 0", borderRadius: "6px", cursor: "pointer",
            background: theme === "dark" ? "#1A1A1A" : "#F0F0F0",
            border: `1px solid ${border}`,
            color: textMuted, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
            fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "12px",
          }}
        >
          <Eye size={13} />
          {req.status !== "Pending" && <span>View</span>}
        </button>
      </div>
    </div>
  );
}

// ── Quota Edit Modal ─────────────────────────────────
function QuotaEditModal({ employee, theme, onClose, onSave }) {
  const [leaveQuota, setLeaveQuota] = useState(employee.leaveQuota ?? 2);
  const [wfhQuota, setWfhQuota] = useState(employee.wfhQuota ?? 4);
  const [saving, setSaving] = useState(false);

  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#666666";
  const inputBg   = theme === "dark" ? "#0A0A0A" : "#FFFFFF";
  const inputBd   = theme === "dark" ? "#1E1E1E" : "#D0D0D0";

  const inputStyle = {
    width: "100%",
    background: inputBg,
    border: `1px solid ${inputBd}`,
    borderRadius: "6px",
    padding: "10px 12px",
    color: textPri,
    fontFamily: "Mulish, sans-serif",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(employee.id, {
      leaveQuota: Number(leaveQuota),
      wfhQuota: Number(wfhQuota),
    });
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: surface,
          border: `1px solid ${border}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          width: "min(400px, 100%)",
          maxHeight: "90dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        className="rounded-t-2xl sm:rounded-xl w-full"
      >
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
          <div>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em" }}>
              EDIT LIMITS
            </p>
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "20px", color: textPri }}>
              Edit Monthly Quotas
            </h3>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, marginTop: "2px" }}>
              {employee.name} · {employee.id}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: textMuted }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", display: "block", marginBottom: "6px" }}>
              MONTHLY LEAVE QUOTA
            </label>
            <input
              type="number"
              min="0"
              value={leaveQuota}
              onChange={(e) => setLeaveQuota(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", display: "block", marginBottom: "6px" }}>
              MONTHLY WFH QUOTA
            </label>
            <input
              type="number"
              min="0"
              value={wfhQuota}
              onChange={(e) => setWfhQuota(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${border}`, display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: "7px",
              cursor: "pointer",
              fontFamily: "Rajdhani, sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              border: `1px solid ${border}`,
              color: textPri,
              background: "transparent",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "9px 20px",
              borderRadius: "7px",
              fontFamily: "Rajdhani, sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              background: saving ? "#880000" : "#CC0000",
              color: "#FFFFFF",
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mobile Quota Card (replaces table row on small screens) ─
function MobileQuotaCard({ emp, theme, border, divider, textPri, textMuted, leaveTaken, wfhTaken, onEdit }) {
  const initialsColor = "#00B8B8";
  return (
    <div style={{
      padding: "14px 16px",
      borderBottom: `1px solid ${divider}`,
      display: "flex", flexDirection: "column", gap: "10px",
    }}>
      {/* Top: avatar + name + dept */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div className="rounded-full flex-shrink-0 overflow-hidden"
          style={{ width: "36px", height: "36px",
            background: emp.photoUrl ? "transparent" : `${initialsColor}22`,
            border: `1.5px solid ${initialsColor}55`,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          {emp.photoUrl
            ? <img src={emp.photoUrl} alt={emp.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "11px", color: initialsColor }}>{getInitials(emp.name)}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: 600, color: textPri, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {emp.name}
          </p>
          <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {emp.id} · {emp.department}
          </p>
        </div>
      </div>

      {/* Middle: Leave Quota & Taken / WFH Quota & Taken */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: theme === "dark" ? "#0D0D0D" : "#F9F9F9", padding: "10px", borderRadius: "8px", border: `1px solid ${border}` }}>
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.12em", marginBottom: "2px" }}>LEAVE STATUS</p>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "14px", fontWeight: 700, color: textPri }}>
            {leaveTaken} <span style={{ color: textMuted, fontWeight: 500, fontSize: "11px" }}>used of</span> {emp.leaveQuota ?? 2}
          </p>
        </div>
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.12em", marginBottom: "2px" }}>WFH STATUS</p>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "14px", fontWeight: 700, color: textPri }}>
            {wfhTaken} <span style={{ color: textMuted, fontWeight: 500, fontSize: "11px" }}>used of</span> {emp.wfhQuota ?? 4}
          </p>
        </div>
      </div>

      {/* Edit button */}
      <button
        onClick={onEdit}
        style={{
          width: "100%",
          padding: "8px 0",
          borderRadius: "6px",
          background: theme === "dark" ? "#1A1A1A" : "#F0F0F0",
          border: `1px solid ${border}`,
          color: textPri,
          fontFamily: "Rajdhani, sans-serif",
          fontWeight: 700,
          fontSize: "12px",
          cursor: "pointer"
        }}
      >
        Edit Quotas
      </button>
    </div>
  );
}

// ── Quota Reply Modal ────────────────────────────────
function QuotaReplyModal({ req, onClose, onAction, theme }) {
  const [replyText, setReplyText] = useState(req.adminReply || "");
  const [approvedQuota, setApprovedQuota] = useState(req.requestedQuota || (req.currentQuota + 1));
  const [submitting, setSubmitting] = useState(false);

  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#666666";
  const inputBg   = theme === "dark" ? "#0A0A0A" : "#FFFFFF";
  const inputBd   = theme === "dark" ? "#1E1E1E" : "#D0D0D0";

  const handleAction = async (status) => {
    setSubmitting(true);
    const targetQuota = status === "Approved" ? approvedQuota : null;
    await onAction(req.id, status, replyText, req.empId, req.type, targetQuota);
    setSubmitting(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)", padding: "16px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: surface,
          border: `1px solid ${border}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          width: "min(460px, 100%)",
          maxHeight: "90dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        className="rounded-t-2xl sm:rounded-xl w-full"
      >
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
          <div>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em" }}>
              QUOTA REQUEST
            </p>
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "20px", color: textPri }}>
              Review Quota Request
            </h3>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, marginTop: "2px" }}>
              {req.employeeName} · {req.empId}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: textMuted }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
          {/* Details */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: textMuted, letterSpacing: "0.12em", marginBottom: "2px" }}>REQUEST TYPE</p>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "16px", fontWeight: 700, color: textPri }}>{req.type} Quota</p>
            </div>
            <div>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: textMuted, letterSpacing: "0.12em", marginBottom: "2px" }}>STATUS</p>
              <div style={{ display: "inline-block" }}>
                <StatusBadge status={req.status} theme={theme} />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "center" }}>
            <div>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: textMuted, letterSpacing: "0.12em", marginBottom: "2px" }}>CURRENT LIMIT</p>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "18px", fontWeight: 700, color: textPri }}>{req.currentQuota} days</p>
            </div>
            <div>
              {req.status === "Pending" ? (
                <>
                  <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#00B8B8", letterSpacing: "0.12em", display: "block", marginBottom: "4px" }}>
                    APPROVED LIMIT
                  </label>
                  <input
                    type="number"
                    min={req.currentQuota + 1}
                    value={approvedQuota}
                    onChange={(e) => setApprovedQuota(Number(e.target.value))}
                    disabled={submitting}
                    style={{
                      width: "100%",
                      background: inputBg,
                      border: `1px solid ${inputBd}`,
                      borderRadius: "6px",
                      padding: "6px 10px",
                      color: textPri,
                      fontFamily: "Mulish, sans-serif",
                      fontSize: "14px",
                      fontWeight: 700,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </>
              ) : (
                <>
                  <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#00B8B8", letterSpacing: "0.12em", marginBottom: "2px" }}>APPROVED LIMIT</p>
                  <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "18px", fontWeight: 700, color: "#00B8B8" }}>
                    {req.requestedQuota ? `${req.requestedQuota} days` : "—"}
                  </p>
                </>
              )}
            </div>
          </div>

          <div>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: textMuted, letterSpacing: "0.12em", marginBottom: "4px" }}>EMPLOYEE REASON</p>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri, background: theme === "dark" ? "#161616" : "#F9F9F9", padding: "10px 12px", borderRadius: "6px", border: `1px solid ${border}`, margin: 0, lineHeight: 1.4 }}>
              {req.reason}
            </p>
          </div>

          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: textMuted, letterSpacing: "0.12em", display: "block", marginBottom: "6px" }}>
              ADMIN REPLY / REMARKS
            </label>
            <textarea
              placeholder="Provide a reason or notes for the employee..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={req.status !== "Pending" || submitting}
              rows={3}
              style={{
                width: "100%",
                background: inputBg,
                border: `1px solid ${inputBd}`,
                borderRadius: "6px",
                padding: "8px 12px",
                color: textPri,
                fontFamily: "Mulish, sans-serif",
                fontSize: "13px",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${border}`, display: "flex", justifyContent: "flex-end", gap: "10px", background: theme === "dark" ? "#0E0E0E" : "#FBFBFB" }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "9px 18px",
              borderRadius: "7px",
              cursor: "pointer",
              fontFamily: "Rajdhani, sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              border: `1px solid ${border}`,
              color: textPri,
              background: "transparent",
            }}
          >
            Close
          </button>
          {req.status === "Pending" && (
            <>
              <button
                onClick={() => handleAction("Rejected")}
                disabled={submitting}
                style={{
                  padding: "9px 18px",
                  borderRadius: "7px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "Rajdhani, sans-serif",
                  fontWeight: 700,
                  fontSize: "13px",
                  border: "1px solid rgba(204,0,0,0.3)",
                  color: "#CC0000",
                  background: "transparent",
                }}
              >
                Reject Request
              </button>
              <button
                onClick={() => handleAction("Approved")}
                disabled={submitting}
                style={{
                  padding: "9px 20px",
                  borderRadius: "7px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "Rajdhani, sans-serif",
                  fontWeight: 700,
                  fontSize: "13px",
                  background: "#00B8B8",
                  color: "#000000",
                  border: "none",
                }}
              >
                Approve & Update Limit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Mobile Quota Request Card ────────────────────────
function MobileQuotaRequestCard({ req, theme, border, divider, textPri, textMuted, onReview }) {
  const accentColor = {
    Approved: "#00B8B8",
    Rejected: "#CC0000",
    Pending:  "#C9922A",
  }[req.status] || "#C9922A";

  return (
    <div style={{
      padding: "14px 16px",
      borderBottom: `1px solid ${divider}`,
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      borderLeft: `3px solid ${accentColor}`,
    }}>
      {/* Top: employee + badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <div>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: 600, color: textPri }}>
            {req.employeeName}
          </p>
          <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMuted }}>
            {req.empId}
          </p>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <TypeBadge type={req.type} theme={theme} />
          <StatusBadge status={req.status} theme={theme} />
        </div>
      </div>

      {/* Middle: Limits & Reason */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px",
        background: theme === "dark" ? "#0D0D0D" : "#F9F9F9",
        padding: "10px",
        borderRadius: "8px",
        border: `1px solid ${border}`
      }}>
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: textMuted, letterSpacing: "0.12em", marginBottom: "2px" }}>CURRENT LIMIT</p>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "14px", fontWeight: 700, color: textPri }}>
            {req.currentQuota} days
          </p>
        </div>
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#00B8B8", letterSpacing: "0.12em", marginBottom: "2px" }}>APPROVED LIMIT</p>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "14px", fontWeight: 700, color: "#00B8B8" }}>
            {req.requestedQuota ? `${req.requestedQuota} days` : "—"}
          </p>
        </div>
      </div>

      <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted }}>
        <span style={{ fontWeight: 600, color: textPri }}>Reason:</span> {req.reason}
      </div>

      {/* Action */}
      <button
        onClick={onReview}
        style={{
          width: "100%",
          padding: "8px 0",
          borderRadius: "6px",
          background: theme === "dark" ? "#1A1A1A" : "#F0F0F0",
          border: `1px solid ${border}`,
          color: textPri,
          fontFamily: "Rajdhani, sans-serif",
          fontWeight: 700,
          fontSize: "12px",
          cursor: "pointer",
        }}
      >
        {req.status === "Pending" ? "Review Request" : "View Details"}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────
function LeaveManagement() {
  const { theme } = useTheme();

  const [rawRequests,  setRawRequests]  = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType,   setFilterType]   = useState("All");
  const [selectedReq,  setSelectedReq]  = useState(null);

  const employeesMap = Object.fromEntries(employeeList.map((e) => [e.id, e]));

  useEffect(() => {
    const unsub = subscribeLeaveRequests((list) => setRawRequests(list));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeEmployees((list) => setEmployeeList(list));
    return unsub;
  }, []);

  const requests = rawRequests.map((doc) => normalise(doc, employeesMap));

  const [activePanelTab, setActivePanelTab] = useState("Requests"); // "Requests" | "Quotas" | "QuotaRequests"
  const [editingQuotaEmp, setEditingQuotaEmp] = useState(null);
  const [quotaRequests, setQuotaRequests] = useState([]);
  const [selectedQuotaReq, setSelectedQuotaReq] = useState(null);

  useEffect(() => {
    const unsub = subscribeQuotaRequests((list) => setQuotaRequests(list));
    return unsub;
  }, []);

  const handleQuotaAction = async (id, status, adminReply, empId, type, requestedQuota) => {
    try {
      await updateQuotaRequestStatus(id, status, adminReply, empId, type, requestedQuota);
      alert(`Quota request has been ${status.toLowerCase()}!`);
    } catch (err) {
      console.error("Failed to update quota request status:", err);
      alert("Failed to update status: " + err.message);
    }
  };

  const filteredQuotaRequests = quotaRequests.filter((req) => {
    const empName = (req.employeeName || "").toLowerCase();
    const empId = (req.empId || "").toLowerCase();
    const type = (req.type || "").toLowerCase();
    const query = search.toLowerCase();
    const matchSearch = empName.includes(query) || empId.includes(query) || type.includes(query);
    const matchStatus = filterStatus === "All" || req.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getTakenCount = (empId, type) => {
    const now = new Date();
    const y   = now.getFullYear();
    const m   = now.getMonth();
    return rawRequests.filter((r) => {
      if (r.empId !== empId || r.status !== "Approved") return false;
      
      const reqType = r.requestType || r.type || r.leaveType || "Leave";
      const isWfh = reqType === "WFH" || reqType.toLowerCase().includes("wfh");
      const matchType = type === "WFH" ? isWfh : !isWfh;
      
      const d = new Date(r.from);
      return matchType && d.getFullYear() === y && d.getMonth() === m;
    }).reduce((sum, r) => sum + (Number(r.days) || 1), 0);
  };

  const filteredEmployees = employeeList.filter((emp) => {
    const name = (emp.name || "").toLowerCase();
    const id = (emp.id || "").toLowerCase();
    const dept = (emp.department || "").toLowerCase();
    const role = (emp.role || emp.jobRole || "").toLowerCase();
    const query = search.toLowerCase();
    return name.includes(query) || id.includes(query) || dept.includes(query) || role.includes(query);
  });

  const handleSaveQuotas = async (empId, { leaveQuota, wfhQuota }) => {
    try {
      await updateEmployee(empId, { leaveQuota, wfhQuota });
      setEditingQuotaEmp(null);
    } catch (err) {
      console.error("Failed to update employee quotas:", err);
      alert("Failed to update quotas: " + err.message);
    }
  };

  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";
  const headerBg  = theme === "dark" ? "#0D0D0D" : "#F5F5F5";
  const divider   = theme === "dark" ? "#1A1A1A" : "#EEEEEE";
  const inputBg   = theme === "dark" ? "#0A0A0A" : "#FFFFFF";
  const inputBd   = theme === "dark" ? "#1E1E1E" : "#D0D0D0";

  const pending  = requests.filter((r) => r.status === "Pending").length;
  const approved = requests.filter((r) => r.status === "Approved").length;
  const rejected = requests.filter((r) => r.status === "Rejected").length;
  const wfhCount = requests.filter((r) => (r.type === "WFH" || r.requestType === "WFH") && r.status === "Approved").length;

  const filtered = requests
    .map((r) => ({ ...r, _color: getDeptColor(r.empId, employeesMap), _photoUrl: employeesMap[r.empId]?.photoUrl || null }))
    .filter((r) => {
      const empName    = (r.employee || "").toLowerCase();
      const matchSearch = empName.includes(search.toLowerCase()) ||
                          (r.empId || "").toLowerCase().includes(search.toLowerCase()) ||
                          (r.type  || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "All" || r.status === filterStatus;
      const matchType   = filterType   === "All" || r.type   === filterType;
      return matchSearch && matchStatus && matchType;
    });

  const handleApprove = async (id) => {
    await updateLeaveStatus(id, "Approved");
    if (selectedReq?.id === id) setSelectedReq((r) => ({ ...r, status: "Approved" }));
    setSelectedReq(null);
  };

  const handleReject = async (id) => {
    await updateLeaveStatus(id, "Rejected");
    if (selectedReq?.id === id) setSelectedReq((r) => ({ ...r, status: "Rejected" }));
    setSelectedReq(null);
  };

  const selectStyle = {
    padding: "8px 32px 8px 12px",
    borderRadius: "6px",
    outline: "none",
    fontFamily: "Mulish, sans-serif",
    fontSize: "12px",
    background: inputBg,
    border: `1px solid ${inputBd}`,
    color: textPri,
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    width: "100%",
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">

      {/* Detail Modal */}
      {selectedReq && (
        <DetailModal
          req={selectedReq}
          employeesMap={employeesMap}
          theme={theme}
          onClose={() => setSelectedReq(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* Quota Edit Modal */}
      {editingQuotaEmp && (
        <QuotaEditModal
          employee={editingQuotaEmp}
          theme={theme}
          onClose={() => setEditingQuotaEmp(null)}
          onSave={handleSaveQuotas}
        />
      )}

      {/* Quota Reply Modal */}
      {selectedQuotaReq && (
        <QuotaReplyModal
          req={selectedQuotaReq}
          theme={theme}
          onClose={() => setSelectedQuotaReq(null)}
          onAction={handleQuotaAction}
        />
      )}

      {/* ── Header Card ── */}
      <div
        className="rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
        style={{ background: surface, border: `1px solid ${border}` }}
      >
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em", marginBottom: "6px" }}>
            PEOPLE
          </p>
          <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: textPri, lineHeight: 1.1 }}>
            Leave Management
          </h2>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "clamp(12px, 3vw, 14px)", color: textMuted, marginTop: "4px" }}>
            Review and manage all employee leave and WFH requests.
          </p>
        </div>
        {/* Pending badge */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg self-start sm:self-auto flex-shrink-0"
          style={{ background: "rgba(201,146,42,0.08)", border: "1px solid rgba(201,146,42,0.25)" }}
        >
          <Clock size={14} style={{ color: "#C9922A" }} />
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 700, color: "#C9922A", whiteSpace: "nowrap" }}>
            {pending} Pending Review
          </span>
        </div>
      </div>

      {/* ── Stat Cards: 2-col mobile, 4-col lg+ ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard theme={theme} label="PENDING"    value={pending}  icon={Clock}       color="#C9922A" />
        <StatCard theme={theme} label="APPROVED"   value={approved} icon={CheckCircle} color="#00B8B8" />
        <StatCard theme={theme} label="REJECTED"   value={rejected} icon={XCircle}     color="#CC0000" />
        <StatCard theme={theme} label="WFH ACTIVE" value={wfhCount} icon={Home}        color="#888888" />
      </div>

      {/* ── Table / Card Panel ── */}
      <div className="rounded-xl overflow-hidden flex flex-col"
        style={{ background: surface, border: `1px solid ${border}` }}>

        {/* ── Sub-Tabs ── */}
        <div style={{ display: "flex", borderBottom: `1px solid ${divider}`, background: headerBg }}>
          {[
            { id: "Requests", label: "Requests List", icon: Clock },
            { id: "Quotas", label: "Employee Quotas", icon: CalendarOff },
            { id: "QuotaRequests", label: "Quota Requests", icon: Clock },
            { id: "Calendar", label: "See Leave & WFH Dates", icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activePanelTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePanelTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "14px 24px",
                  fontFamily: "Rajdhani, sans-serif",
                  fontWeight: 700,
                  fontSize: "14px",
                  color: isActive ? "#00B8B8" : textMuted,
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive ? "2px solid #00B8B8" : "2px solid transparent",
                  cursor: "pointer",
                  transition: "all 200ms",
                  marginBottom: "-1px",
                }}
              >
                <Icon size={14} style={{ color: isActive ? "#00B8B8" : textMuted }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activePanelTab === "Requests" && (
          <>
            {/* ── Toolbar ── */}
            <div
              className="px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap"
              style={{ borderBottom: `1px solid ${border}` }}
            >
              {/* Search — full width on mobile */}
              <div className="flex items-center gap-2 rounded-md px-3 py-2 w-full sm:flex-1 sm:min-w-48"
                style={{ background: inputBg, border: `1px solid ${inputBd}` }}>
                <Search size={14} style={{ color: textMuted, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search employee, ID or type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    background: "transparent", border: "none", outline: "none",
                    fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri,
                    width: "100%",
                  }}
                />
              </div>

              {/* Filters row — side by side on mobile */}
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                {/* Status Filter */}
                <div className="relative flex-1 sm:flex-none">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={selectStyle}
                  >
                    <option>All</option>
                    <option>Pending</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                  </select>
                  <ChevronDown size={12} style={{ color: textMuted, position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                </div>

                {/* Type Filter */}
                <div className="relative flex-1 sm:flex-none">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={selectStyle}
                  >
                    <option>All</option>
                    <option>Annual Leave</option>
                    <option>Sick Leave</option>
                    <option>Casual Leave</option>
                    <option>WFH</option>
                  </select>
                  <ChevronDown size={12} style={{ color: textMuted, position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                </div>
              </div>

              {/* Record count */}
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, whiteSpace: "nowrap" }}
                className="hidden sm:block sm:ml-auto">
                {filtered.length} request{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* ── Empty States ── */}
            {requests.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <CalendarOff size={32} style={{ color: textMuted, margin: "0 auto 12px" }} />
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textMuted }}>
                  No leave requests yet. They will appear here once employees submit them.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <CalendarOff size={32} style={{ color: textMuted, margin: "0 auto 12px" }} />
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textMuted }}>
                  No requests match your filters.
                </p>
              </div>
            ) : (
              <>
                {/* ── Desktop Table (hidden on mobile) ── */}
                <div className="hidden sm:block overflow-x-auto">
                  {/* Table Header */}
                  <div
                    className="grid px-5 py-3"
                    style={{
                      gridTemplateColumns: "2fr 1.4fr 1.2fr 1.2fr 0.7fr 1fr 1fr",
                      background: headerBg,
                      borderBottom: `1px solid ${divider}`,
                      minWidth: "640px",
                    }}
                  >
                    {["EMPLOYEE", "TYPE", "FROM", "TO", "DAYS", "STATUS", "ACTION"].map((h) => (
                      <span key={h} style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>
                        {h}
                      </span>
                    ))}
                  </div>

                  {/* Table Rows */}
                  <div style={{ minWidth: "640px" }}>
                    {filtered.map((req, i) => {
                      const days = req.days ?? 1;
                      return (
                        <div
                          key={req.id}
                          className="grid px-5 items-center"
                          style={{
                            gridTemplateColumns: "2fr 1.4fr 1.2fr 1.2fr 0.7fr 1fr 1fr",
                            height: "60px",
                            borderBottom: i < filtered.length - 1 ? `1px solid ${divider}` : "none",
                            borderLeft: "3px solid transparent",
                            transition: "all 150ms",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = theme === "dark" ? "#161616" : "#F9F9F9";
                            e.currentTarget.style.borderLeftColor = req._color;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.borderLeftColor = "transparent";
                          }}
                        >
                          {/* Employee */}
                          <div className="flex items-center gap-3">
                            <div className="rounded-full flex-shrink-0 overflow-hidden"
                              style={{ width: "32px", height: "32px",
                                background: req._photoUrl ? "transparent" : `${req._color}22`,
                                border: `1.5px solid ${req._color}55`,
                                display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {req._photoUrl
                                ? <img src={req._photoUrl} alt={req.employee} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "11px", color: req._color }}>{getInitials(req.employee)}</span>
                              }
                            </div>
                            <div className="min-w-0">
                              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: 600, color: textPri, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {req.employee}
                              </p>
                              <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMuted }}>{req.empId}</p>
                            </div>
                          </div>

                          {/* Type */}
                          <TypeBadge type={req.type} theme={theme} />

                          {/* From */}
                          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: textPri }}>{req.from}</span>

                          {/* To */}
                          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: textPri }}>{req.to}</span>

                          {/* Days */}
                          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: textPri }}>{days}d</span>

                          {/* Status */}
                          <StatusBadge status={req.status} theme={theme} />

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {req.status === "Pending" ? (
                              <>
                                <button
                                  onClick={() => handleApprove(req.id)}
                                  title="Approve"
                                  className="flex items-center justify-center rounded"
                                  style={{ width: "28px", height: "28px", background: "rgba(0,184,184,0.1)", border: "1px solid rgba(0,184,184,0.3)", color: "#00B8B8", transition: "all 150ms", cursor: "pointer" }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,184,184,0.2)"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,184,184,0.1)"}
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  onClick={() => handleReject(req.id)}
                                  title="Reject"
                                  className="flex items-center justify-center rounded"
                                  style={{ width: "28px", height: "28px", background: "rgba(204,0,0,0.1)", border: "1px solid rgba(204,0,0,0.3)", color: "#CC0000", transition: "all 150ms", cursor: "pointer" }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(204,0,0,0.2)"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(204,0,0,0.1)"}
                                >
                                  <X size={13} />
                                </button>
                              </>
                            ) : (
                              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>—</span>
                            )}
                            <button
                              onClick={() => setSelectedReq(req)}
                              title="View Details"
                              className="flex items-center justify-center rounded"
                              style={{ width: "28px", height: "28px", background: theme === "dark" ? "#1A1A1A" : "#F0F0F0", border: `1px solid ${border}`, color: textMuted, transition: "all 150ms", cursor: "pointer" }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#00B8B8"; e.currentTarget.style.color = "#00B8B8"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = textMuted; }}
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Mobile Card List (shown only on mobile) ── */}
                <div className="sm:hidden">
                  {/* Mobile record count */}
                  <div className="px-4 py-2" style={{ borderBottom: `1px solid ${divider}`, background: headerBg }}>
                    <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#CC0000", letterSpacing: "0.1em" }}>
                      {filtered.length} REQUEST{filtered.length !== 1 ? "S" : ""}
                    </span>
                  </div>
                  {filtered.map((req) => (
                    <MobileLeaveCard
                      key={req.id}
                      req={req}
                      theme={theme}
                      border={border}
                      divider={divider}
                      textPri={textPri}
                      textMuted={textMuted}
                      onView={setSelectedReq}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {activePanelTab === "Quotas" && (
          <>
            {/* ── Quota Toolbar ── */}
            <div
              className="px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap"
              style={{ borderBottom: `1px solid ${border}` }}
            >
              {/* Search — full width on mobile */}
              <div className="flex items-center gap-2 rounded-md px-3 py-2 w-full sm:flex-1 sm:min-w-48"
                style={{ background: inputBg, border: `1px solid ${inputBd}` }}>
                <Search size={14} style={{ color: textMuted, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search employee by name, ID or department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    background: "transparent", border: "none", outline: "none",
                    fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri,
                    width: "100%",
                  }}
                />
              </div>

              {/* Record count */}
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, whiteSpace: "nowrap" }}
                className="hidden sm:block sm:ml-auto">
                {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* ── Desktop Quota Table (hidden on mobile) ── */}
            <div className="hidden sm:block overflow-x-auto">
              <div
                className="grid px-5 py-3"
                style={{
                  gridTemplateColumns: "1.8fr 1.5fr 1.2fr 1.2fr 1.2fr 1.2fr 0.8fr",
                  background: headerBg,
                  borderBottom: `1px solid ${divider}`,
                  minWidth: "750px",
                }}
              >
                {["EMPLOYEE", "DEPT / ROLE", "LEAVE QUOTA", "WFH QUOTA", "LEAVE TAKEN", "WFH TAKEN", "ACTION"].map((h) => (
                  <span key={h} style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>
                    {h}
                  </span>
                ))}
              </div>

              <div style={{ minWidth: "750px" }}>
                {filteredEmployees.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textMuted }}>
                      No employees match your search query.
                    </p>
                  </div>
                ) : (
                  filteredEmployees.map((emp, i) => {
                    const color = getDeptColor(emp.id, employeesMap);
                    const leaveTaken = getTakenCount(emp.id, "Leave");
                    const wfhTaken = getTakenCount(emp.id, "WFH");
                    return (
                      <div
                        key={emp.id}
                        className="grid px-5 items-center"
                        style={{
                          gridTemplateColumns: "1.8fr 1.5fr 1.2fr 1.2fr 1.2fr 1.2fr 0.8fr",
                          height: "60px",
                          borderBottom: i < filteredEmployees.length - 1 ? `1px solid ${divider}` : "none",
                          borderLeft: "3px solid transparent",
                          transition: "all 150ms",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = theme === "dark" ? "#161616" : "#F9F9F9";
                          e.currentTarget.style.borderLeftColor = color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.borderLeftColor = "transparent";
                        }}
                      >
                        {/* Employee info */}
                        <div className="flex items-center gap-3">
                          <div className="rounded-full flex-shrink-0 overflow-hidden"
                            style={{ width: "32px", height: "32px",
                              background: emp.photoUrl ? "transparent" : `${color}22`,
                              border: `1.5px solid ${color}55`,
                              display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {emp.photoUrl
                              ? <img src={emp.photoUrl} alt={emp.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "11px", color }}>{getInitials(emp.name)}</span>
                            }
                          </div>
                          <div className="min-w-0">
                            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: 600, color: textPri, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {emp.name}
                            </p>
                            <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMuted }}>{emp.id}</p>
                          </div>
                        </div>

                        {/* Dept / Role */}
                        <div className="min-w-0">
                          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: 600, color: textPri, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {emp.department}
                          </p>
                          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {emp.role || emp.jobRole || "Employee"}
                          </p>
                        </div>

                        {/* Leave Quota */}
                        <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: textPri }}>
                          {emp.leaveQuota ?? 2}
                        </span>

                        {/* WFH Quota */}
                        <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: textPri }}>
                          {emp.wfhQuota ?? 4}
                        </span>

                        {/* Leave Taken */}
                        <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: leaveTaken > 0 ? "#C9922A" : textMuted }}>
                          {leaveTaken}
                        </span>

                        {/* WFH Taken */}
                        <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: wfhTaken > 0 ? "#00B8B8" : textMuted }}>
                          {wfhTaken}
                        </span>

                        {/* Actions */}
                        <div>
                          <button
                            onClick={() => setEditingQuotaEmp(emp)}
                            className="flex items-center justify-center rounded px-3 py-1 gap-1"
                            style={{
                              height: "28px",
                              background: theme === "dark" ? "#1A1A1A" : "#F0F0F0",
                              border: `1px solid ${border}`,
                              color: textPri,
                              fontFamily: "Rajdhani, sans-serif",
                              fontWeight: 700,
                              fontSize: "11px",
                              letterSpacing: "0.05em",
                              cursor: "pointer",
                              transition: "all 150ms"
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#00B8B8"; e.currentTarget.style.color = "#00B8B8"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = textPri; }}
                          >
                            EDIT
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Mobile Quota Card List (shown only on mobile) ── */}
            <div className="sm:hidden">
              <div className="px-4 py-2" style={{ borderBottom: `1px solid ${divider}`, background: headerBg }}>
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#CC0000", letterSpacing: "0.1em" }}>
                  {filteredEmployees.length} EMPLOYEE{filteredEmployees.length !== 1 ? "S" : ""}
                </span>
              </div>
              {filteredEmployees.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted }}>
                    No employees match your search query.
                  </p>
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const leaveTaken = getTakenCount(emp.id, "Leave");
                  const wfhTaken = getTakenCount(emp.id, "WFH");
                  return (
                    <MobileQuotaCard
                      key={emp.id}
                      emp={emp}
                      theme={theme}
                      border={border}
                      divider={divider}
                      textPri={textPri}
                      textMuted={textMuted}
                      leaveTaken={leaveTaken}
                      wfhTaken={wfhTaken}
                      onEdit={() => setEditingQuotaEmp(emp)}
                    />
                  );
                })
              )}
            </div>
          </>
        )}

        {activePanelTab === "QuotaRequests" && (
          <>
            {/* ── Quota Requests Toolbar ── */}
            <div
              className="px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap"
              style={{ borderBottom: `1px solid ${border}` }}
            >
              <div className="flex items-center gap-2 rounded-md px-3 py-2 w-full sm:flex-1 sm:min-w-48"
                style={{ background: inputBg, border: `1px solid ${inputBd}` }}>
                <Search size={14} style={{ color: textMuted, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search quota requests by employee name, ID or type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    background: "transparent", border: "none", outline: "none",
                    fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri,
                    width: "100%",
                  }}
                />
              </div>
              
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={selectStyle}
                  >
                    <option>All</option>
                    <option>Pending</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                  </select>
                  <ChevronDown size={12} style={{ color: textMuted, position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                </div>
              </div>

              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, whiteSpace: "nowrap" }}
                className="hidden sm:block sm:ml-auto">
                {filteredQuotaRequests.length} request{filteredQuotaRequests.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* ── Desktop Quota Requests Table (hidden on mobile) ── */}
            <div className="hidden sm:block overflow-x-auto">
              <div
                className="grid px-5 py-3"
                style={{
                  gridTemplateColumns: "2fr 1.2fr 1.2fr 1.2fr 2fr 1fr 1fr",
                  background: headerBg,
                  borderBottom: `1px solid ${divider}`,
                  minWidth: "750px",
                }}
              >
                 {["EMPLOYEE", "TYPE", "CURRENT LIMIT", "APPROVED LIMIT", "REASON", "STATUS", "ACTION"].map((h) => (
                  <span key={h} style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>
                    {h}
                  </span>
                ))}
              </div>

              <div style={{ minWidth: "750px" }}>
                {filteredQuotaRequests.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textMuted }}>
                      No quota requests found.
                    </p>
                  </div>
                ) : (
                  filteredQuotaRequests.map((req, i) => {
                    const color = getDeptColor(req.empId, employeesMap);
                    return (
                      <div
                        key={req.id}
                        className="grid px-5 items-center"
                        style={{
                          gridTemplateColumns: "2fr 1.2fr 1.2fr 1.2fr 2fr 1fr 1fr",
                          height: "60px",
                          borderBottom: i < filteredQuotaRequests.length - 1 ? `1px solid ${divider}` : "none",
                          borderLeft: "3px solid transparent",
                          transition: "all 150ms",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = theme === "dark" ? "#161616" : "#F9F9F9";
                          e.currentTarget.style.borderLeftColor = color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.borderLeftColor = "transparent";
                        }}
                      >
                        {/* Employee */}
                        <div className="flex items-center gap-3">
                          <div className="rounded-full flex-shrink-0 overflow-hidden"
                            style={{ width: "32px", height: "32px",
                              background: employeesMap[req.empId]?.photoUrl ? "transparent" : `${color}22`,
                              border: `1.5px solid ${color}55`,
                              display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {employeesMap[req.empId]?.photoUrl
                              ? <img src={employeesMap[req.empId].photoUrl} alt={req.employeeName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "11px", color }}>{getInitials(req.employeeName)}</span>
                            }
                          </div>
                          <div className="min-w-0">
                            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: 600, color: textPri, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {req.employeeName}
                            </p>
                            <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMuted }}>{req.empId}</p>
                          </div>
                        </div>

                        {/* Type */}
                        <TypeBadge type={req.type} theme={theme} />

                        {/* Current Limit */}
                        <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "15px", color: textPri }}>
                          {req.currentQuota}d
                        </span>

                        {/* Requested Limit */}
                        <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "15px", color: "#00B8B8" }}>
                          {req.requestedQuota}d
                        </span>

                        {/* Reason */}
                        <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "10px" }}>
                          {req.reason}
                        </span>

                        {/* Status */}
                        <StatusBadge status={req.status} theme={theme} />

                        {/* Action */}
                        <div>
                          <button
                            onClick={() => setSelectedQuotaReq(req)}
                            className="flex items-center justify-center rounded px-3 py-1 gap-1"
                            style={{
                              height: "28px",
                              background: theme === "dark" ? "#1A1A1A" : "#F0F0F0",
                              border: `1px solid ${border}`,
                              color: textPri,
                              fontFamily: "Rajdhani, sans-serif",
                              fontWeight: 700,
                              fontSize: "11px",
                              letterSpacing: "0.05em",
                              cursor: "pointer",
                              transition: "all 150ms"
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#00B8B8"; e.currentTarget.style.color = "#00B8B8"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = textPri; }}
                          >
                            {req.status === "Pending" ? "REVIEW" : "VIEW"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Mobile Quota Requests List ── */}
            <div className="sm:hidden">
              <div className="px-4 py-2" style={{ borderBottom: `1px solid ${divider}`, background: headerBg }}>
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#CC0000", letterSpacing: "0.1em" }}>
                  {filteredQuotaRequests.length} REQUEST{filteredQuotaRequests.length !== 1 ? "S" : ""}
                </span>
              </div>
              {filteredQuotaRequests.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted }}>
                    No quota requests found.
                  </p>
                </div>
              ) : (
                filteredQuotaRequests.map((req) => (
                  <MobileQuotaRequestCard
                    key={req.id}
                    req={req}
                    theme={theme}
                    border={border}
                    divider={divider}
                    textPri={textPri}
                    textMuted={textMuted}
                    onReview={() => setSelectedQuotaReq(req)}
                  />
                ))
              )}
            </div>
          </>
        )}

        {activePanelTab === "Calendar" && (
          <LeaveCalendarPanel
            requests={requests}
            employeesMap={employeesMap}
            theme={theme}
            surface={surface}
            border={border}
            textPri={textPri}
            textMuted={textMuted}
            divider={divider}
            headerBg={headerBg}
            getDeptColor={getDeptColor}
          />
        )}
      </div>
    </div>
  );
}

// ── Calendar Panel Component ──
function LeaveCalendarPanel({
  requests,
  employeesMap,
  theme,
  surface,
  border,
  textPri,
  textMuted,
  divider,
  headerBg,
  getDeptColor
}) {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null); // format: YYYY-MM-DD

  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();

  const handlePrevMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(null);
  };

  const handleToday = () => {
    setCalendarDate(new Date());
    setSelectedDay(null);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const daysCount = getDaysInMonth(currentYear, currentMonth);
  const startOffset = getFirstDayOfMonth(currentYear, currentMonth);

  const pad = (num) => String(num).padStart(2, "0");

  const cells = [];
  // Leading empty cells
  for (let i = 0; i < startOffset; i++) {
    cells.push({ isCurrentMonth: false });
  }
  // Days of month
  for (let d = 1; d <= daysCount; d++) {
    const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(d)}`;
    cells.push({
      isCurrentMonth: true,
      dayNumber: d,
      dateStr,
    });
  }

  const getRequestsForDate = (dateStr) => {
    return requests.filter((r) => {
      if (r.status !== "Approved") return false;
      return r.from <= dateStr && r.to >= dateStr;
    });
  };

  const activeDateStr = selectedDay || (
    new Date().getFullYear() === currentYear && new Date().getMonth() === currentMonth
      ? `${currentYear}-${pad(currentMonth + 1)}-${pad(new Date().getDate())}`
      : `${currentYear}-${pad(currentMonth + 1)}-01`
  );

  const selectedDayRequests = getRequestsForDate(activeDateStr);

  // Helper to extract initials
  const getInitials = (name = "") => {
    return name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase() || "?";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px" }}>
      {/* Month Navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }} className="flex justify-between">
        <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "20px", fontWeight: 700, color: textPri, margin: 0 }}>
          {monthNames[currentMonth]} {currentYear}
        </h3>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handlePrevMonth}
            style={{
              padding: "6px 12px", borderRadius: "6px", cursor: "pointer",
              background: theme === "dark" ? "#1A1A1A" : "#F0F0F0", border: `1px solid ${border}`,
              color: textPri, display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleToday}
            style={{
              padding: "6px 16px", borderRadius: "6px", cursor: "pointer",
              background: theme === "dark" ? "#1A1A1A" : "#F0F0F0", border: `1px solid ${border}`,
              color: textPri, fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px"
            }}
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            style={{
              padding: "6px 12px", borderRadius: "6px", cursor: "pointer",
              background: theme === "dark" ? "#1A1A1A" : "#F0F0F0", border: `1px solid ${border}`,
              color: textPri, display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Grid + Sidebar Split */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Calendar Grid */}
        <div className="flex-1 lg:flex-[2.5] flex flex-col gap-2">
          {/* Weekday Headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", borderBottom: `1px solid ${divider}`, paddingBottom: "8px" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day} style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.1em" }}>
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
            {cells.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={`empty-${idx}`}
                    style={{
                      aspectRatio: "1.2",
                      background: theme === "dark" ? "#141414" : "#FAF9F9",
                      borderRadius: "6px",
                      opacity: 0.3
                    }}
                  />
                );
              }

              const { dayNumber, dateStr } = cell;
              const dateRequests = getRequestsForDate(dateStr);
              const isSelected = activeDateStr === dateStr;
              const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, dayNumber).toDateString();

              // Categorize
              const leaves = dateRequests.filter(r => r.type !== "WFH" && !r.type.toLowerCase().includes("wfh"));
              const wfhs = dateRequests.filter(r => r.type === "WFH" || r.type.toLowerCase().includes("wfh"));

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDay(dateStr)}
                  style={{
                    aspectRatio: "1.2",
                    background: isSelected
                      ? (theme === "dark" ? "rgba(0,184,184,0.08)" : "#E6F9F9")
                      : (theme === "dark" ? "#0D0D0D" : "#FFFFFF"),
                    border: isSelected
                      ? "1px solid #00B8B8"
                      : (isToday ? "1px solid #CC0000" : `1px solid ${border}`),
                    borderRadius: "6px",
                    padding: "6px",
                    cursor: "pointer",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "all 150ms",
                    overflow: "hidden"
                  }}
                >
                  {/* Day Number */}
                  <span style={{
                    fontFamily: "Share Tech Mono, monospace",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: isToday ? "#CC0000" : textPri,
                    alignSelf: "flex-end"
                  }}>
                    {dayNumber}
                  </span>

                  {/* Summary indicators */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%", overflow: "hidden" }}>
                    {leaves.length > 0 && (
                      <div style={{
                        background: "rgba(204,0,0,0.1)",
                        border: "1px solid rgba(204,0,0,0.25)",
                        borderRadius: "3px",
                        padding: "1px 4px",
                        fontSize: "9px",
                        fontFamily: "Rajdhani, sans-serif",
                        fontWeight: 700,
                        color: "#CC0000",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap"
                      }}>
                        {leaves.length} Leave{leaves.length > 1 ? "s" : ""}
                      </div>
                    )}
                    {wfhs.length > 0 && (
                      <div style={{
                        background: "rgba(0,184,184,0.1)",
                        border: "1px solid rgba(0,184,184,0.25)",
                        borderRadius: "3px",
                        padding: "1px 4px",
                        fontSize: "9px",
                        fontFamily: "Rajdhani, sans-serif",
                        fontWeight: 700,
                        color: "#00B8B8",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap"
                      }}>
                        {wfhs.length} WFH
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details Panel */}
        <div
          className="w-full lg:w-80 flex-shrink-0"
          style={{
            background: theme === "dark" ? "#0A0A0A" : "#FAFAFA",
            border: `1px solid ${border}`,
            borderRadius: "8px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            minHeight: "200px",
            boxSizing: "border-box"
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: `1px solid ${divider}`, paddingBottom: "8px" }}>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", margin: "0 0 4px 0" }}>
              SELECTED DAY
            </p>
            <h4 style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "16px", fontWeight: 700, color: textPri, margin: 0 }}>
              {new Date(activeDateStr.replace(/-/g, '/')).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h4>
          </div>

          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", maxHeight: "400px" }}>
            {selectedDayRequests.length === 0 ? (
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted, textAlign: "center", margin: "20px 0" }}>
                No active leaves or WFH requests approved for this day.
              </p>
            ) : (
              selectedDayRequests.map((req) => {
                const color = getDeptColor(req.empId, employeesMap);
                const isWfh = req.type === "WFH" || req.type.toLowerCase().includes("wfh");
                return (
                  <div
                    key={req.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      background: theme === "dark" ? "#141414" : "#FFFFFF",
                      border: `1px solid ${border}`,
                      borderLeft: `3px solid ${isWfh ? "#00B8B8" : "#CC0000"}`
                    }}
                  >
                    <div className="rounded-full flex-shrink-0 overflow-hidden"
                      style={{ width: "30px", height: "30px",
                        background: employeesMap[req.empId]?.photoUrl ? "transparent" : `${color}22`,
                        border: `1px solid ${color}55`,
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {employeesMap[req.empId]?.photoUrl
                        ? <img src={employeesMap[req.empId].photoUrl} alt={req.employee} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "10px", color }}>{getInitials(req.employee)}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: 600, color: textPri, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {req.employee}
                      </p>
                      <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "9px", color: textMuted, margin: 0 }}>
                        {isWfh ? "Work From Home" : req.type}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeaveManagement;