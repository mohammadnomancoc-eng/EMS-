import { useState } from "react";
import { useTheme } from "../../App";
import { CalendarOff, Home, Plus, X, Calendar, AlertCircle } from "lucide-react";

// ── Mock Data ─────────────────────────────────────────
const mockLeaveHistory = [
  { id: 1, type: "Annual Leave", from: "2026-04-10", to: "2026-04-10", days: 1, reason: "Personal work", status: "Approved" },
  { id: 2, type: "Sick Leave",   from: "2026-03-22", to: "2026-03-23", days: 2, reason: "Fever and cold", status: "Approved" },
  { id: 3, type: "Casual Leave", from: "2026-05-09", to: "2026-05-09", days: 1, reason: "Family function", status: "Pending" },
];

const mockWFHHistory = [
  { id: 1, from: "2026-05-03", to: "2026-05-03", days: 1, reason: "Internet maintenance at office", status: "Approved" },
  { id: 2, from: "2026-05-04", to: "2026-05-04", days: 1, reason: "Personal convenience",          status: "Approved" },
];

const leaveQuota  = { taken: 1, total: 2 };
const wfhQuota    = { taken: 2, total: 2 };

// ── Quota Card ────────────────────────────────────────
function QuotaCard({ label, taken, total, color, icon: Icon, theme }) {
  const remaining = total - taken;
  const pct = Math.round((taken / total) * 100);
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
  const s = styles[theme][status] || styles[theme].Pending;
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
function ApplyModal({ type, onClose, onSubmit, quota, theme }) {
  const [from, setFrom]     = useState("");
  const [to, setTo]         = useState("");
  const [reason, setReason] = useState("");
  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [error, setError]   = useState("");

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
    onSubmit({ from, to, reason, leaveType });
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
          <button onClick={handleSubmit}
            className="px-5 py-2 rounded-md"
            style={{
              fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px",
              background: "#CC0000", color: "#FFFFFF", border: "none",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#AA0000"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#CC0000"}>
            Submit Request
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
                {row.type}
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
  const [activeTab, setActiveTab]   = useState("Leave");
  const [showModal, setShowModal]   = useState(false);
  const [leaveHistory, setLeaveHistory] = useState(mockLeaveHistory);
  const [wfhHistory, setWFHHistory]     = useState(mockWFHHistory);
  const [leaveQuotaState, setLeaveQuota] = useState(leaveQuota);
  const [wfhQuotaState, setWFHQuota]     = useState(wfhQuota);

  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";

  const handleSubmit = ({ from, to, reason, leaveType }) => {
    const newEntry = {
      id: Date.now(), from, to,
      days: Math.max(1, Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1),
      reason, status: "Pending",
      ...(activeTab === "Leave" && { type: leaveType }),
    };
    if (activeTab === "Leave") {
      setLeaveHistory((prev) => [newEntry, ...prev]);
      setLeaveQuota((prev) => ({ ...prev, taken: prev.taken + 1 }));
    } else {
      setWFHHistory((prev) => [newEntry, ...prev]);
      setWFHQuota((prev) => ({ ...prev, taken: prev.taken + 1 }));
    }
    setShowModal(false);
  };

  const quota = activeTab === "Leave" ? leaveQuotaState : wfhQuotaState;

  return (
    <div className="flex flex-col gap-6">

      {/* Modal */}
      {showModal && (
        <ApplyModal
          type={activeTab}
          quota={quota}
          theme={theme}
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
          Apply {activeTab}
        </button>
      </div>

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
          {["Leave", "WFH", "Apply"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-6 py-4 flex items-center gap-2"
              style={{
                fontFamily: "Rajdhani, sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                color: activeTab === tab
                  ? tab === "Apply" ? "#CC0000" : "#00B8B8"
                  : textMuted,
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab
                  ? `2px solid ${tab === "Apply" ? "#CC0000" : "#00B8B8"}`
                  : "2px solid transparent",
                cursor: "pointer",
                transition: "all 200ms",
                marginBottom: "-1px",
              }}
            >
              {tab === "Leave" && <CalendarOff size={15} />}
              {tab === "WFH"   && <Home size={15} />}
              {tab === "Apply" && <Plus size={15} />}
              {tab === "Leave" ? "Leave History" : tab === "WFH" ? "WFH History" : "Apply Request"}
              {tab !== "Apply" && (
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
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === "Apply" ? (
            <ApplyInline
              leaveQuota={leaveQuotaState}
              wfhQuota={wfhQuotaState}
              theme={theme}
              onSubmit={(data) => {
                const newEntry = {
                  id: Date.now(),
                  from: data.from,
                  to: data.to,
                  days: Math.max(1, Math.ceil((new Date(data.to) - new Date(data.from)) / 86400000) + 1),
                  reason: data.reason,
                  status: "Pending",
                  ...(data.type === "Leave" && { type: data.leaveType }),
                };
                if (data.type === "Leave") {
                  setLeaveHistory((prev) => [newEntry, ...prev]);
                  setLeaveQuota((prev) => ({ ...prev, taken: prev.taken + 1 }));
                } else {
                  setWFHHistory((prev) => [newEntry, ...prev]);
                  setWFHQuota((prev) => ({ ...prev, taken: prev.taken + 1 }));
                }
                setActiveTab(data.type === "Leave" ? "Leave" : "WFH");
              }}
            />
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