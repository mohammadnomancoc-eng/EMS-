import { useState, useEffect } from "react";
import { useTheme } from "../../App";
import { CalendarOff, Home, Plus, X, Calendar, AlertCircle } from "lucide-react";
import {
  getLeaveRequestsByEmployee,
  submitLeaveRequest,
} from "../../firebase/firestoreService";

// ── FIX (Bug 2 - MyLeave): Removed all hardcoded mock data. ──────────────────
// Leave history and WFH history are now fetched from Firestore via
// getLeaveRequestsByEmployee(empId). New requests are written via
// submitLeaveRequest() so they persist across sessions.
// empId is read from localStorage (set at login by authService).

function getProfile() {
  try {
    const raw = localStorage.getItem("rwt-user");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { name: "Employee", role: "", initials: "?", empId: null };
}

// Leave/WFH monthly quotas (configurable here)
const LEAVE_QUOTA = 2;
const WFH_QUOTA   = 2;

// Count how many leave/WFH records fall in the current calendar month
function countThisMonth(records, type) {
  const now   = new Date();
  const y     = now.getFullYear();
  const m     = now.getMonth();
  return records.filter((r) => {
    const d = new Date(r.from);
    return d.getFullYear() === y && d.getMonth() === m && r.requestType === type;
  }).length;
}

// ── Quota Card ────────────────────────────────────────
function QuotaCard({ label, taken, total, color, icon: Icon, theme }) {
  const remaining = total - taken;
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";

  return (
    <div className="rounded-xl p-5 flex flex-col gap-3"
      style={{
        background: surface,
        border: `1px solid ${border}`,
        boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 200ms",
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "#CC0000"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = border}
    >
      <div className="flex items-start justify-between">
        <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          {label}
        </span>
        <div className="rounded-full flex items-center justify-center"
          style={{ width: "36px", height: "36px", background: theme === "dark" ? "#1A1A1A" : "#F5F5F5" }}>
          <Icon size={16} style={{ color: "#00B8B8" }} />
        </div>
      </div>

      <div className="flex items-end gap-2">
        <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "52px", fontWeight: 700, lineHeight: 1, color }}>
          {taken}
        </span>
        <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "22px", fontWeight: 600, color: textMuted, marginBottom: "6px" }}>
          / {total}
        </span>
      </div>

      {/* Bar */}
      <div className="rounded-full overflow-hidden" style={{ height: "4px", background: theme === "dark" ? "#1A1A1A" : "#E8E8E8" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: "width 800ms ease" }} />
      </div>

      <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted }}>
        <span style={{ color, fontWeight: 600 }}>{remaining} remaining</span> · {taken} used this month
      </p>

      {remaining === 0 && (
        <div className="flex items-center gap-2 rounded-md px-3 py-2"
          style={{ background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.2)" }}>
          <AlertCircle size={12} style={{ color: "#CC0000", flexShrink: 0 }} />
          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: "#CC0000" }}>
            Quota exhausted for this month
          </span>
        </div>
      )}
    </div>
  );
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
  const s = styles[theme]?.[status] || styles[theme].Pending;
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

// ── Apply Modal ───────────────────────────────────────
function ApplyModal({ type, onClose, onSubmit, quota, theme, submitting }) {
  const [from, setFrom]           = useState("");
  const [to, setTo]               = useState("");
  const [reason, setReason]       = useState("");
  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [error, setError]         = useState("");

  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#555555";
  const inputBg   = theme === "dark" ? "#0A0A0A" : "#FFFFFF";
  const inputBd   = theme === "dark" ? "#1E1E1E" : "#D0D0D0";

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: "6px",
    outline: "none", fontFamily: "Mulish, sans-serif", fontSize: "13px",
    background: inputBg, border: `1px solid ${inputBd}`, color: textPri,
    transition: "border 200ms, box-shadow 200ms",
  };

  const handleFocus = (e) => {
    e.target.style.border = "1px solid #00B8B8";
    e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)";
  };
  const handleBlur = (e) => {
    e.target.style.border = `1px solid ${inputBd}`;
    e.target.style.boxShadow = "none";
  };

  const handleSubmit = () => {
    if (!from || !to || !reason.trim()) {
      setError("Please fill in all fields."); return;
    }
    if (new Date(to) < new Date(from)) {
      setError("End date cannot be before start date."); return;
    }
    if (quota.taken >= quota.total) {
      setError(`You have exhausted your ${type} quota for this month.`); return;
    }
    onSubmit({ from, to, reason, leaveType, requestType: type });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-xl w-full max-w-md mx-4"
        style={{ background: surface, border: `1px solid ${border}`, boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${border}` }}>
          <div>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em" }}>
              APPLY
            </p>
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "20px", color: textPri }}>
              {type === "Leave" ? "Apply for Leave" : "Apply for WFH"}
            </h3>
          </div>
          <button onClick={onClose}
            style={{ color: "#555555", transition: "color 150ms" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#CC0000"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#555555"}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">

          {/* Quota warning */}
          <div className="rounded-lg px-4 py-3 flex items-center gap-3"
            style={{
              background: quota.taken >= quota.total
                ? "rgba(204,0,0,0.08)" : "rgba(0,184,184,0.06)",
              border: `1px solid ${quota.taken >= quota.total
                ? "rgba(204,0,0,0.25)" : "rgba(0,184,184,0.2)"}`,
            }}>
            <AlertCircle size={14} style={{ color: quota.taken >= quota.total ? "#CC0000" : "#00B8B8", flexShrink: 0 }} />
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: quota.taken >= quota.total ? "#CC0000" : "#00B8B8" }}>
              {quota.taken >= quota.total
                ? `Quota exhausted — ${quota.total}/${quota.total} used this month.`
                : `${quota.total - quota.taken} of ${quota.total} remaining this month.`}
            </p>
          </div>

          {/* Leave type (only for leave) */}
          {type === "Leave" && (
            <div>
              <label style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: 600, color: textMuted, display: "block", marginBottom: "6px" }}>
                LEAVE TYPE
              </label>
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
                onFocus={handleFocus} onBlur={handleBlur}>
                <option>Annual Leave</option>
                <option>Sick Leave</option>
                <option>Casual Leave</option>
              </select>
            </div>
          )}

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: 600, color: textMuted, display: "block", marginBottom: "6px" }}>
                FROM
              </label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                style={{ ...inputStyle, colorScheme: theme === "dark" ? "dark" : "light" }}
                onFocus={handleFocus} onBlur={handleBlur} />
            </div>
            <div>
              <label style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: 600, color: textMuted, display: "block", marginBottom: "6px" }}>
                TO
              </label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                style={{ ...inputStyle, colorScheme: theme === "dark" ? "dark" : "light" }}
                onFocus={handleFocus} onBlur={handleBlur} />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: 600, color: textMuted, display: "block", marginBottom: "6px" }}>
              REASON
            </label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe your reason..."
              rows={3}
              style={{ ...inputStyle, resize: "none" }}
              onFocus={handleFocus} onBlur={handleBlur}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded px-3 py-2"
              style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#CC0000", background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.2)" }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-3"
          style={{ borderTop: `1px solid ${border}` }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-md text-sm"
            style={{
              fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px",
              border: `1px solid ${border}`, color: textPri, background: "transparent",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "#00B8B8"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = border}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-5 py-2 rounded-md"
            style={{
              fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px",
              background: submitting ? "#880000" : "#CC0000", color: "#FFFFFF", border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = "#AA0000"; }}
            onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = "#CC0000"; }}>
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── History Table ─────────────────────────────────────
function HistoryTable({ data, type, theme }) {
  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";
  const headerBg  = theme === "dark" ? "#0D0D0D" : "#F5F5F5";
  const divider   = theme === "dark" ? "#1A1A1A" : "#EEEEEE";

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: surface, border: `1px solid ${border}` }}>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em" }}>
          HISTORY
        </p>
        <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textPri }}>
          {type === "Leave" ? "Leave History" : "WFH History"}
        </h3>
      </div>

      {/* Header */}
      <div className="grid px-5 py-2"
        style={{
          gridTemplateColumns: type === "Leave" ? "1.5fr 1fr 2fr 1fr" : "1fr 2fr 1fr",
          background: headerBg, borderBottom: `1px solid ${divider}`,
        }}>
        {(type === "Leave"
          ? ["DATE RANGE", "TYPE", "REASON", "STATUS"]
          : ["DATE RANGE", "REASON", "STATUS"]
        ).map((h) => (
          <span key={h} style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>
            {h}
          </span>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted }}>
            No {type.toLowerCase()} requests yet.
          </p>
        </div>
      ) : (
        data.map((row, i) => (
          <div key={row.id}
            className="grid px-5 items-center"
            style={{
              gridTemplateColumns: type === "Leave" ? "1.5fr 1fr 2fr 1fr" : "1fr 2fr 1fr",
              height: "56px",
              borderBottom: i < data.length - 1 ? `1px solid ${divider}` : "none",
              borderLeft: "3px solid transparent",
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme === "dark" ? "#161616" : "#F9F9F9";
              e.currentTarget.style.borderLeftColor = "#00B8B8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderLeftColor = "transparent";
            }}
          >
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: textPri }}>
              {row.from === row.to ? row.from : `${row.from} → ${row.to}`}
            </span>
            {type === "Leave" && (
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted }}>
                {row.leaveType || row.type || "—"}
              </span>
            )}
            <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted }}>
              {row.reason}
            </span>
            <StatusBadge status={row.status} theme={theme} />
          </div>
        ))
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────
function MyLeave() {
  const { theme } = useTheme();

  // FIX: read empId from localStorage instead of using hardcoded mock data
  const profile = getProfile();
  const empId   = profile.empId;

  const [activeTab,    setActiveTab]   = useState("Leave");
  const [showModal,    setShowModal]   = useState(false);
  const [allRequests,  setAllRequests] = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [submitting,   setSubmitting]  = useState(false);
  const [fetchError,   setFetchError]  = useState("");

  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";

  // Load all leave/WFH requests for this employee from Firestore
  useEffect(() => {
    if (!empId) {
      setLoading(false);
      setFetchError("Employee ID not found. Please log in again.");
      return;
    }
    setLoading(true);
    getLeaveRequestsByEmployee(empId)
      .then((records) => {
        setAllRequests(records);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load leave requests:", err);
        setFetchError("Failed to load requests. Please refresh.");
        setLoading(false);
      });
  }, [empId]);

  // Derive filtered lists from real data
  const leaveHistory = allRequests.filter((r) => r.requestType === "Leave");
  const wfhHistory   = allRequests.filter((r) => r.requestType === "WFH");

  // Compute month quota usage from real data
  const leaveThisMonth = countThisMonth(allRequests, "Leave");
  const wfhThisMonth   = countThisMonth(allRequests, "WFH");

  const leaveQuotaState = { taken: leaveThisMonth, total: LEAVE_QUOTA };
  const wfhQuotaState   = { taken: wfhThisMonth,   total: WFH_QUOTA   };
  const quota = activeTab === "Leave" ? leaveQuotaState : wfhQuotaState;

  // Submit to Firestore and optimistically update local state
  const handleSubmit = async ({ from, to, reason, leaveType, requestType }) => {
    if (!empId) return;
    setSubmitting(true);
    try {
      const days = Math.max(1, Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1);
      const id   = await submitLeaveRequest({
        empId,
        from,
        to,
        days,
        reason,
        leaveType: requestType === "Leave" ? leaveType : null,
        requestType,   // "Leave" | "WFH"
      });
      // Optimistic update — add new pending entry to local state immediately
      setAllRequests((prev) => [{
        id,
        empId,
        from,
        to,
        days,
        reason,
        leaveType: requestType === "Leave" ? leaveType : null,
        requestType,
        status: "Pending",
      }, ...prev]);
      setShowModal(false);
      setActiveTab(requestType === "Leave" ? "Leave" : "WFH");
    } catch (err) {
      console.error("Failed to submit request:", err);
      alert("Failed to submit request: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Modal */}
      {showModal && (
        <ApplyModal
          type={activeTab === "Apply" ? "Leave" : activeTab}
          quota={activeTab === "WFH" ? wfhQuotaState : leaveQuotaState}
          theme={theme}
          submitting={submitting}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}

      {/* ── Header ── */}
      <div className="rounded-xl p-6 flex items-center justify-between"
        style={{ background: surface, border: `1px solid ${border}` }}>
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em", marginBottom: "6px" }}>
            WORKSPACE
          </p>
          <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "28px", fontWeight: 700, color: textPri, lineHeight: 1.1 }}>
            Leave & WFH Requests
          </h2>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textMuted, marginTop: "4px" }}>
            Manage your leave and work-from-home requests for this month.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-md"
          style={{
            fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "14px",
            background: "#CC0000", color: "#FFFFFF", border: "none", letterSpacing: "0.05em",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#AA0000"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#CC0000"}>
          <Plus size={15} />
          Apply {activeTab === "Apply" ? "Request" : activeTab}
        </button>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="rounded-xl px-5 py-4"
          style={{ background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.25)" }}>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: "#CC0000" }}>{fetchError}</p>
        </div>
      )}

      {/* ── Quota Cards ── */}
      <div className="grid grid-cols-2 gap-4">
        <QuotaCard theme={theme} label="Leave This Month"
          taken={leaveQuotaState.taken} total={leaveQuotaState.total}
          color="#C9922A" icon={CalendarOff} />
        <QuotaCard theme={theme} label="WFH This Month"
          taken={wfhQuotaState.taken} total={wfhQuotaState.total}
          color="#00B8B8" icon={Home} />
      </div>

      {/* ── Tabs ── */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: surface, border: `1px solid ${border}` }}>

        {/* Tab Bar */}
        <div className="flex" style={{ borderBottom: `1px solid ${border}` }}>
          {["Leave", "WFH"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-6 py-4 flex items-center gap-2"
              style={{
                fontFamily: "Rajdhani, sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                color: activeTab === tab ? "#00B8B8" : textMuted,
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab ? "2px solid #00B8B8" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 200ms",
                marginBottom: "-1px",
              }}
            >
              {tab === "Leave" && <CalendarOff size={15} />}
              {tab === "WFH"   && <Home size={15} />}
              {tab === "Leave" ? "Leave History" : "WFH History"}
              <span style={{
                fontFamily: "Rajdhani, sans-serif",
                fontSize: "11px",
                background: activeTab === tab ? "rgba(0,184,184,0.1)" : (theme === "dark" ? "#1A1A1A" : "#F0F0F0"),
                color: activeTab === tab ? "#00B8B8" : textMuted,
                border: `1px solid ${activeTab === tab ? "rgba(0,184,184,0.3)" : "transparent"}`,
                borderRadius: "4px",
                padding: "1px 6px",
              }}>
                {tab === "Leave" ? leaveHistory.length : wfhHistory.length}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {loading ? (
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted, textAlign: "center", padding: "32px 0" }}>
              Loading requests…
            </p>
          ) : (
            <HistoryTable
              data={activeTab === "Leave" ? leaveHistory : wfhHistory}
              type={activeTab}
              theme={theme}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default MyLeave;