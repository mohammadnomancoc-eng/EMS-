// ─────────────────────────────────────────────────────────────
//  src/pages/LeaveManagement.jsx
//
//  BUG-03 FIX: Removed the hardcoded `allLeaveRequests` constant (12 fake
//  records) and the `employees` / `leaveRequests` imports from mockData.
//  The component is now driven entirely by the Firestore real-time listener
//  `subscribeLeaveRequests`, which was already wired up but ignored because
//  the display logic still read from the local constant.
//
//  BUG-05 FIX: `getEmpRole` and `getDeptColor` previously looked up the
//  mock employees array. They now look up the `employees` state fetched from
//  Firestore via `subscribeEmployees`, so real employees get the right role
//  and department colour in the leave table and detail modal.
//
//  Data shape differences handled:
//  • Firestore docs written by MyLeave.jsx store `requestType` ("Leave"|"WFH")
//    and `leaveType` (e.g. "Annual Leave"), not `type`.
//  • The admin panel normalises both field names in `normalise()` so the table
//    and filters work regardless of which field is present.
//  • Employee name is stored as `name` in the /employees collection;
//    leave requests written by employees don't embed the employee name.
//    `getEmpName()` looks it up from the Firestore employees list.
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

// Normalise a Firestore leave doc so the table always has consistent fields.
// MyLeave.jsx writes: { requestType, leaveType, empId, from, to, days, reason, status }
// Legacy/mock docs may have: { type, employee }
function normalise(doc, employeesMap) {
  const type     = doc.type || doc.leaveType || doc.requestType || "Leave";
  const employee = doc.employee || employeesMap[doc.empId]?.name || doc.empId || "Unknown";
  return { ...doc, type, employee };
}

// Look up real employee role from Firestore employees map
function getEmpRole(empId, employeesMap) {
  return employeesMap[empId]?.role || employeesMap[empId]?.jobRole || "Employee";
}

// Look up department colour from Firestore employees map
function getDeptColor(empId, employeesMap) {
  const dept = employeesMap[empId]?.department || "";
  const map = {
    Engineering: "#00B8B8",
    Design:      "#CC0000",
    Management:  "#C9922A",
    QA:          "#00B8B8",
    HR:          "#CC0000",
    Marketing:   "#C9922A",
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
      borderRadius: "4px", padding: "2px 8px",
    }}>
      {status}
    </span>
  );
}

// ── Leave Type Badge ──────────────────────────────────
function TypeBadge({ type, theme }) {
  const map = {
    "Annual Leave": "#C9922A",
    "Sick Leave":   "#CC0000",
    "Casual Leave": "#00B8B8",
    "WFH":          theme === "dark" ? "#888888" : "#555555",
    "Leave":        "#C9922A",
  };
  const color = map[type] || "#888888";
  return (
    <span style={{
      background: `${color}14`,
      border: `1px solid ${color}55`,
      color,
      fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600,
      borderRadius: "4px", padding: "2px 8px",
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
    <div className="rounded-xl p-5 flex flex-col gap-3"
      style={{
        background: surface,
        border: `1px solid ${border}`,
        boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 200ms",
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = color}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = border}
    >
      <div className="flex items-start justify-between">
        <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em" }}>
          {label}
        </span>
        <div className="rounded-full flex items-center justify-center"
          style={{ width: "36px", height: "36px", background: theme === "dark" ? "#1A1A1A" : "#F5F5F5" }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "48px", fontWeight: 700, lineHeight: 1, color }}>
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

  const color = getDeptColor(req.empId, employeesMap);
  const days  = req.days ?? 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-xl w-full max-w-md mx-4"
        style={{ background: surface, border: `1px solid ${border}`, boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${border}` }}>
          <div>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em" }}>
              LEAVE REQUEST
            </p>
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "20px", color: textPri }}>
              Request Details
            </h3>
          </div>
          <button onClick={onClose}
            style={{ color: "#555555", transition: "color 150ms" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#CC0000"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#555555"}>
            <X size={20} />
          </button>
        </div>

        {/* Employee Info */}
        <div className="px-6 py-4 flex items-center gap-4" style={{ borderBottom: `1px solid ${divider}` }}>
          <div className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: "48px", height: "48px", background: `${color}22`, border: `2px solid ${color}55` }}>
            <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "15px", color }}>
              {getInitials(req.employee)}
            </span>
          </div>
          <div>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "17px", color: textPri }}>
              {req.employee}
            </p>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted }}>
              {getEmpRole(req.empId, employeesMap)} · {req.empId}
            </p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={req.status} theme={theme} />
          </div>
        </div>

        {/* Details Grid */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          {[
            { label: "LEAVE TYPE", value: req.type },
            { label: "DURATION",   value: `${days} day${days !== 1 ? "s" : ""}` },
            { label: "FROM",       value: req.from },
            { label: "TO",         value: req.to },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", marginBottom: "4px" }}>{label}</p>
              <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "13px", color: textPri }}>{value}</p>
            </div>
          ))}
          <div className="col-span-2">
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", marginBottom: "4px" }}>REASON</p>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted }}>{req.reason || "—"}</p>
          </div>
        </div>

        {/* Actions */}
        {req.status === "Pending" && (
          <div className="px-6 py-4 flex items-center gap-3" style={{ borderTop: `1px solid ${border}` }}>
            <button onClick={() => onReject(req.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md"
              style={{
                fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px",
                border: "1px solid rgba(204,0,0,0.4)", color: "#CC0000", background: "rgba(204,0,0,0.06)",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(204,0,0,0.12)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(204,0,0,0.06)"}>
              <XCircle size={14} /> Reject
            </button>
            <button onClick={() => onApprove(req.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md"
              style={{
                fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px",
                background: "#00B8B8", color: "#000000", border: "none",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#009A9A"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#00B8B8"}>
              <CheckCircle size={14} /> Approve
            </button>
          </div>
        )}
        {req.status !== "Pending" && (
          <div className="px-6 py-4 flex justify-end" style={{ borderTop: `1px solid ${border}` }}>
            <button onClick={onClose}
              className="px-5 py-2 rounded-md"
              style={{
                fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px",
                border: `1px solid ${border}`, color: textPri, background: "transparent",
              }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────
function LeaveManagement() {
  const { theme } = useTheme();

  // BUG-03 FIX: use Firestore real-time data, not the hardcoded constant
  const [rawRequests,  setRawRequests]  = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType,   setFilterType]   = useState("All");
  const [selectedReq,  setSelectedReq]  = useState(null);

  // Build an empId → employee object map for O(1) look-ups
  const employeesMap = Object.fromEntries(employeeList.map((e) => [e.id, e]));

  // Real-time listener: leave requests from Firestore
  useEffect(() => {
    const unsub = subscribeLeaveRequests((list) => setRawRequests(list));
    return unsub;
  }, []);

  // BUG-05 FIX: real-time listener for employees (used by getEmpRole / getDeptColor)
  useEffect(() => {
    const unsub = subscribeEmployees((list) => setEmployeeList(list));
    return unsub;
  }, []);

  // Normalise field names (requestType/leaveType → type, look up employee name)
  const requests = rawRequests.map((doc) => normalise(doc, employeesMap));

  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";
  const headerBg  = theme === "dark" ? "#0D0D0D" : "#F5F5F5";
  const divider   = theme === "dark" ? "#1A1A1A" : "#EEEEEE";
  const inputBg   = theme === "dark" ? "#0A0A0A" : "#FFFFFF";
  const inputBd   = theme === "dark" ? "#1E1E1E" : "#D0D0D0";

  // Stats — derived from real Firestore data
  const pending  = requests.filter((r) => r.status === "Pending").length;
  const approved = requests.filter((r) => r.status === "Approved").length;
  const rejected = requests.filter((r) => r.status === "Rejected").length;
  const wfhCount = requests.filter((r) => (r.type === "WFH" || r.requestType === "WFH") && r.status === "Approved").length;

  // Filter
  const filtered = requests.filter((r) => {
    const empName = (r.employee || "").toLowerCase();
    const matchSearch = empName.includes(search.toLowerCase()) ||
                        (r.empId  || "").toLowerCase().includes(search.toLowerCase()) ||
                        (r.type   || "").toLowerCase().includes(search.toLowerCase());
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
  };

  return (
    <div className="flex flex-col gap-6">

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

      {/* ── Header ── */}
      <div className="rounded-xl p-6 flex items-center justify-between"
        style={{ background: surface, border: `1px solid ${border}` }}>
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em", marginBottom: "6px" }}>
            PEOPLE
          </p>
          <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "28px", fontWeight: 700, color: textPri, lineHeight: 1.1 }}>
            Leave Management
          </h2>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textMuted, marginTop: "4px" }}>
            Review and manage all employee leave and WFH requests.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ background: "rgba(201,146,42,0.08)", border: "1px solid rgba(201,146,42,0.25)" }}>
          <Clock size={14} style={{ color: "#C9922A" }} />
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 700, color: "#C9922A" }}>
            {pending} Pending Review
          </span>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard theme={theme} label="PENDING"    value={pending}  icon={Clock}       color="#C9922A" />
        <StatCard theme={theme} label="APPROVED"   value={approved} icon={CheckCircle} color="#00B8B8" />
        <StatCard theme={theme} label="REJECTED"   value={rejected} icon={XCircle}     color="#CC0000" />
        <StatCard theme={theme} label="WFH ACTIVE" value={wfhCount} icon={Home}        color="#888888" />
      </div>

      {/* ── Table Panel ── */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: surface, border: `1px solid ${border}` }}>

        {/* Toolbar */}
        <div className="px-5 py-4 flex items-center gap-3 flex-wrap"
          style={{ borderBottom: `1px solid ${border}` }}>

          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-48 rounded-md px-3 py-2"
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

          {/* Status Filter */}
          <div className="relative flex items-center">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
              <option>All</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
            <ChevronDown size={12} style={{ color: textMuted, position: "absolute", right: "10px", pointerEvents: "none" }} />
          </div>

          {/* Type Filter */}
          <div className="relative flex items-center">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={selectStyle}>
              <option>All</option>
              <option>Annual Leave</option>
              <option>Sick Leave</option>
              <option>Casual Leave</option>
              <option>WFH</option>
            </select>
            <ChevronDown size={12} style={{ color: textMuted, position: "absolute", right: "10px", pointerEvents: "none" }} />
          </div>

          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, marginLeft: "auto" }}>
            {filtered.length} request{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table Header */}
        <div className="grid px-5 py-3"
          style={{
            gridTemplateColumns: "2fr 1.4fr 1.2fr 1.2fr 0.7fr 1fr 1fr",
            background: headerBg,
            borderBottom: `1px solid ${divider}`,
          }}>
          {["EMPLOYEE", "TYPE", "FROM", "TO", "DAYS", "STATUS", "ACTION"].map((h) => (
            <span key={h} style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>
              {h}
            </span>
          ))}
        </div>

        {/* Table Rows */}
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
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textMuted }}>No requests match your filters.</p>
          </div>
        ) : (
          filtered.map((req, i) => {
            const color = getDeptColor(req.empId, employeesMap);
            const days  = req.days ?? 1;
            return (
              <div key={req.id}
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
                  e.currentTarget.style.borderLeftColor = color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderLeftColor = "transparent";
                }}
              >
                {/* Employee */}
                <div className="flex items-center gap-3">
                  <div className="rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ width: "32px", height: "32px", background: `${color}22`, border: `1.5px solid ${color}55` }}>
                    <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "11px", color }}>
                      {getInitials(req.employee)}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: 600, color: textPri, lineHeight: 1.2 }}>
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
                        style={{ width: "28px", height: "28px", background: "rgba(0,184,184,0.1)", border: "1px solid rgba(0,184,184,0.3)", color: "#00B8B8", transition: "all 150ms" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,184,184,0.2)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,184,184,0.1)"; }}>
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        title="Reject"
                        className="flex items-center justify-center rounded"
                        style={{ width: "28px", height: "28px", background: "rgba(204,0,0,0.1)", border: "1px solid rgba(204,0,0,0.3)", color: "#CC0000", transition: "all 150ms" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(204,0,0,0.2)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(204,0,0,0.1)"; }}>
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
                    style={{ width: "28px", height: "28px", background: theme === "dark" ? "#1A1A1A" : "#F0F0F0", border: `1px solid ${border}`, color: textMuted, transition: "all 150ms" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#00B8B8"; e.currentTarget.style.color = "#00B8B8"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = textMuted; }}>
                    <Eye size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default LeaveManagement;