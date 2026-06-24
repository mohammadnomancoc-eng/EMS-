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
  ChevronDown, Eye
} from "lucide-react";
import {
  subscribeLeaveRequests,
  updateLeaveStatus,
  subscribeEmployees,
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
      <div className="rounded-xl overflow-hidden"
        style={{ background: surface, border: `1px solid ${border}` }}>

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
      </div>
    </div>
  );
}

export default LeaveManagement;