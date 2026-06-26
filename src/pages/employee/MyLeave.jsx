import { useState, useEffect } from "react";
import { useTheme } from "../../App";
import { CalendarOff, Home, Plus, X, AlertCircle, Check } from "lucide-react";
import {
  getLeaveRequestsByEmployee,
  submitLeaveRequest,
} from "../../firebase/firestoreService";
import { sendOneSignalPush } from "../../utils/onesignal";

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
function getProfile() {
  try {
    const raw = localStorage.getItem("rwt-user");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { name: "Employee", role: "", initials: "?", empId: null };
}

const LEAVE_QUOTA = 2;
const WFH_QUOTA   = 2;

function countThisMonth(records, type) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();
  return records.filter((r) => {
    const d = new Date(r.from);
    return d.getFullYear() === y && d.getMonth() === m && r.requestType === type;
  }).length;
}

// ── Status Badge ───────────────────────────────────────────────
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
  const s = styles[theme]?.[status] || styles[theme]?.Pending;
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

// ── Quota Card ─────────────────────────────────────────────────
function QuotaCard({ label, taken, total, color, icon: Icon, theme, isMobile }) {
  const remaining = total - taken;
  const pct       = total > 0 ? Math.round((taken / total) * 100) : 0;
  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";

  return (
    <div
      style={{
        background: surface, border: `1px solid ${border}`,
        borderRadius: "12px",
        padding: isMobile ? "14px" : "20px",
        display: "flex", flexDirection: "column", gap: isMobile ? "10px" : "12px",
        boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 200ms",
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "#CC0000"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = border}
    >
      {/* Label + Icon */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <span style={{
          fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
          color: "#CC0000", letterSpacing: "0.2em", textTransform: "uppercase",
        }}>
          {label}
        </span>
        <div style={{
          width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
          background: theme === "dark" ? "#1A1A1A" : "#F5F5F5",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={15} style={{ color: "#00B8B8" }} />
        </div>
      </div>

      {/* Count */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
        <span style={{
          fontFamily: "Rajdhani, sans-serif",
          fontSize: isMobile ? "40px" : "52px",
          fontWeight: 700, lineHeight: 1, color,
        }}>
          {taken}
        </span>
        <span style={{
          fontFamily: "Rajdhani, sans-serif",
          fontSize: isMobile ? "18px" : "22px",
          fontWeight: 600, color: textMuted, marginBottom: "5px",
        }}>
          / {total}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: "4px", borderRadius: "2px", background: theme === "dark" ? "#1A1A1A" : "#E8E8E8", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "2px", transition: "width 800ms ease" }} />
      </div>

      {/* Footer text */}
      <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted }}>
        <span style={{ color, fontWeight: 600 }}>{remaining} remaining</span> · {taken} used this month
      </p>

      {/* Quota exhausted warning */}
      {remaining === 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          borderRadius: "6px", padding: "8px 12px",
          background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.2)",
        }}>
          <AlertCircle size={12} style={{ color: "#CC0000", flexShrink: 0 }} />
          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: "#CC0000" }}>
            Quota exhausted for this month
          </span>
        </div>
      )}
    </div>
  );
}

// ── Apply Modal ────────────────────────────────────────────────
function ApplyModal({ type, onClose, onSubmit, quota, theme, submitting }) {
  const [from,      setFrom]      = useState("");
  const [to,        setTo]        = useState("");
  const [reason,    setReason]    = useState("");
  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [error,     setError]     = useState("");

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
    transition: "border 200ms, box-shadow 200ms", boxSizing: "border-box",
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
    if (!from || !to || !reason.trim()) { setError("Please fill in all fields."); return; }
    if (new Date(to) < new Date(from))  { setError("End date cannot be before start date."); return; }
    if (quota.taken >= quota.total)     { setError(`You have exhausted your ${type} quota for this month.`); return; }
    onSubmit({ from, to, reason, leaveType, requestType: type });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", padding: "16px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: surface, border: `1px solid ${border}`,
        borderRadius: "12px", width: "100%", maxWidth: "460px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)", overflow: "hidden",
        maxHeight: "92vh", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: `1px solid ${border}`, flexShrink: 0,
        }}>
          <div>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
              color: "#CC0000", letterSpacing: "0.2em" }}>APPLY</p>
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "20px", color: textPri }}>
              {type === "Leave" ? "Apply for Leave" : "Apply for WFH"}
            </h3>
          </div>
          <button onClick={onClose} style={{ color: "#555555", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#CC0000"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#555555"}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
          {/* Quota pill */}
          <div style={{
            borderRadius: "8px", padding: "10px 14px",
            display: "flex", alignItems: "center", gap: "10px",
            background: quota.taken >= quota.total ? "rgba(204,0,0,0.08)" : "rgba(0,184,184,0.06)",
            border: `1px solid ${quota.taken >= quota.total ? "rgba(204,0,0,0.25)" : "rgba(0,184,184,0.2)"}`,
          }}>
            <AlertCircle size={14} style={{ color: quota.taken >= quota.total ? "#CC0000" : "#00B8B8", flexShrink: 0 }} />
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px",
              color: quota.taken >= quota.total ? "#CC0000" : "#00B8B8" }}>
              {quota.taken >= quota.total
                ? `Quota exhausted — ${quota.total}/${quota.total} used this month.`
                : `${quota.total - quota.taken} of ${quota.total} remaining this month.`}
            </p>
          </div>

          {/* Leave type */}
          {type === "Leave" && (
            <div>
              <label style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: 600,
                color: textMuted, display: "block", marginBottom: "6px" }}>LEAVE TYPE</label>
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
                onFocus={handleFocus} onBlur={handleBlur}>
                <option>Annual Leave</option>
                <option>Sick Leave</option>
                <option>Casual Leave</option>
              </select>
            </div>
          )}

          {/* Date range — side by side on all sizes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: 600,
                color: textMuted, display: "block", marginBottom: "6px" }}>FROM</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                style={{ ...inputStyle, colorScheme: theme === "dark" ? "dark" : "light" }}
                onFocus={handleFocus} onBlur={handleBlur} />
            </div>
            <div>
              <label style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: 600,
                color: textMuted, display: "block", marginBottom: "6px" }}>TO</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                style={{ ...inputStyle, colorScheme: theme === "dark" ? "dark" : "light" }}
                onFocus={handleFocus} onBlur={handleBlur} />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: 600,
              color: textMuted, display: "block", marginBottom: "6px" }}>REASON</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe your reason..."
              rows={3}
              style={{ ...inputStyle, resize: "none" }}
              onFocus={handleFocus} onBlur={handleBlur}
            />
          </div>

          {/* Error */}
          {error && (
            <p style={{
              fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#CC0000",
              background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.2)",
              borderRadius: "6px", padding: "8px 12px",
            }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px", borderTop: `1px solid ${border}`,
          display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px",
          flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            padding: "9px 18px", borderRadius: "7px", cursor: "pointer",
            fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px",
            border: `1px solid ${border}`, color: textPri, background: "transparent",
          }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "#00B8B8"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = border}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting} style={{
            padding: "9px 20px", borderRadius: "7px",
            fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px",
            background: submitting ? "#880000" : "#CC0000", color: "#FFFFFF", border: "none",
            cursor: submitting ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: "6px",
          }}
            onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = "#AA0000"; }}
            onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = submitting ? "#880000" : "#CC0000"; }}>
            {submitting ? (
              <>
                <div style={{ width: "13px", height: "13px", borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                  animation: "spin 0.7s linear infinite" }} />
                Submitting…
              </>
            ) : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── History Row Card (Mobile) ──────────────────────────────────
function HistoryCard({ row, type, theme }) {
  const isDark    = theme === "dark";
  const surface   = isDark ? "#111111" : "#FFFFFF";
  const border    = isDark ? "#1E1E1E" : "#E0E0E0";
  const divider   = isDark ? "#1A1A1A" : "#F0F0F0";
  const textPri   = isDark ? "#F0F0F0" : "#111111";
  const textMuted = isDark ? "#A0A0A0" : "#888888";

  const accentColor = {
    Approved: "#00B8B8",
    Rejected: "#CC0000",
    Pending:  "#C9922A",
  }[row.status] || "#C9922A";

  return (
    <div style={{
      background: surface, border: `1px solid ${border}`,
      borderRadius: "10px", overflow: "hidden",
      borderLeft: `3px solid ${accentColor}`,
    }}>
      {/* Top row: date range + status */}
      <div style={{
        padding: "12px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
      }}>
        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: textPri }}>
          {row.from === row.to ? row.from : `${row.from} → ${row.to}`}
        </span>
        <StatusBadge status={row.status} theme={theme} />
      </div>

      {/* Bottom row: type + reason */}
      <div style={{
        padding: "10px 14px",
        borderTop: `1px solid ${divider}`,
        display: "flex", flexDirection: "column", gap: "4px",
      }}>
        {type === "Leave" && (
          <span style={{
            fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700,
            color: "#C9922A", letterSpacing: "0.08em",
          }}>
            {row.leaveType || row.type || "—"}
          </span>
        )}
        <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, lineHeight: 1.4 }}>
          {row.reason || "—"}
        </span>
      </div>
    </div>
  );
}

// ── History Table (Desktop) ────────────────────────────────────
function HistoryTable({ data, type, theme }) {
  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";
  const headerBg  = theme === "dark" ? "#0D0D0D" : "#F5F5F5";
  const divider   = theme === "dark" ? "#1A1A1A" : "#EEEEEE";

  const cols = type === "Leave"
    ? "1.5fr 1fr 2fr 1fr"
    : "1fr 2fr 1fr";
  const headers = type === "Leave"
    ? ["DATE RANGE", "TYPE", "REASON", "STATUS"]
    : ["DATE RANGE", "REASON", "STATUS"];

  return (
    <div style={{ borderRadius: "10px", overflow: "hidden", border: `1px solid ${border}` }}>
      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: cols,
        padding: "10px 20px", background: headerBg, borderBottom: `1px solid ${divider}` }}>
        {headers.map((h) => (
          <span key={h} style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px",
            fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>{h}</span>
        ))}
      </div>

      {data.length === 0 ? (
        <div style={{ padding: "32px", textAlign: "center" }}>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted }}>
            No {type.toLowerCase()} requests yet.
          </p>
        </div>
      ) : data.map((row, i) => (
        <div key={row.id}
          style={{
            display: "grid", gridTemplateColumns: cols,
            padding: "0 20px", height: "56px", alignItems: "center",
            borderBottom: i < data.length - 1 ? `1px solid ${divider}` : "none",
            borderLeft: "3px solid transparent", transition: "all 150ms",
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
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
function MyLeave() {
  const { theme } = useTheme();
  const isMobile  = useIsMobile();

  const profile = getProfile();
  const empId   = profile.empId;

  const [activeTab,   setActiveTab]   = useState("Leave");
  const [showModal,   setShowModal]   = useState(false);
  const [allRequests, setAllRequests] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [fetchError,  setFetchError]  = useState("");

  // ── Theme tokens ──
  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";
  const divider   = theme === "dark" ? "#1A1A1A" : "#EEEEEE";

  useEffect(() => {
    if (!empId) {
      setLoading(false);
      setFetchError("Employee ID not found. Please log in again.");
      return;
    }
    setLoading(true);
    getLeaveRequestsByEmployee(empId)
      .then((records) => { setAllRequests(records); setLoading(false); })
      .catch((err) => {
        console.error("Failed to load leave requests:", err);
        setFetchError("Failed to load requests. Please refresh.");
        setLoading(false);
      });
  }, [empId]);

  const leaveHistory   = allRequests.filter((r) => r.requestType === "Leave");
  const wfhHistory     = allRequests.filter((r) => r.requestType === "WFH");
  const leaveThisMonth = countThisMonth(allRequests, "Leave");
  const wfhThisMonth   = countThisMonth(allRequests, "WFH");
  const leaveQuotaState = { taken: leaveThisMonth, total: LEAVE_QUOTA };
  const wfhQuotaState   = { taken: wfhThisMonth,   total: WFH_QUOTA   };
  const quota = activeTab === "Leave" ? leaveQuotaState : wfhQuotaState;

  const handleSubmit = async ({ from, to, reason, leaveType, requestType }) => {
    if (!empId) return;
    setSubmitting(true);
    try {
      const days = Math.max(1, Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1);
      const id   = await submitLeaveRequest({
        empId, from, to, days, reason,
        leaveType: requestType === "Leave" ? leaveType : null,
        requestType,
        employeeName: profile.name,
      });

      console.log("[OneSignal] Calling sendOneSignalPush...");
      try {
        const dates = from === to ? from : `${from} to ${to}`;
        const title = requestType === "Leave" ? "New Leave Request" : "New WFH Request";
        const body = requestType === "Leave"
          ? `${profile.name} requested ${leaveType} leave for ${dates}`
          : `${profile.name} requested WFH for ${dates}`;
        
        await sendOneSignalPush({
          title,
          body,
          actionUrl: "/leave",
          targetRole: "admin"
        });
      } catch (pushErr) {
        console.error("[OneSignal] Failed to send push notification:", pushErr);
      }
      console.log("[OneSignal] sendOneSignalPush called.");

      setAllRequests((prev) => [{
        id, empId, from, to, days, reason,
        leaveType: requestType === "Leave" ? leaveType : null,
        requestType, status: "Pending",
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

  const activeData = activeTab === "Leave" ? leaveHistory : wfhHistory;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "14px" : "24px" }}>

      {/* Apply Modal */}
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

      {/* ── Page Header ── */}
      <div style={{
        background: surface, border: `1px solid ${border}`,
        borderRadius: "12px", padding: isMobile ? "16px" : "24px",
      }}>
        {/* Mobile: stacked; Desktop: side-by-side */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: "14px",
        }}>
          <div>
            <p style={{
              fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
              color: "#CC0000", letterSpacing: "0.2em", marginBottom: "6px",
            }}>
              WORKSPACE
            </p>
            <h2 style={{
              fontFamily: "Rajdhani, sans-serif",
              fontSize: isMobile ? "22px" : "28px",
              fontWeight: 700, color: textPri, lineHeight: 1.1,
            }}>
              Leave & WFH Requests
            </h2>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textMuted, marginTop: "4px" }}>
              Manage your leave and work-from-home requests for this month.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: isMobile ? "10px 18px" : "10px 20px",
              borderRadius: "8px", cursor: "pointer",
              fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "14px",
              background: "#CC0000", color: "#FFFFFF", border: "none",
              letterSpacing: "0.05em", flexShrink: 0,
              alignSelf: isMobile ? "flex-start" : "center",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#AA0000"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#CC0000"}
          >
            <Plus size={15} />
            Apply {activeTab === "Apply" ? "Request" : activeTab}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div style={{
          borderRadius: "10px", padding: "14px 18px",
          background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.25)",
        }}>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: "#CC0000" }}>{fetchError}</p>
        </div>
      )}

      {/* ── Quota Cards — always 2-col (works well on mobile too) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isMobile ? "10px" : "16px" }}>
        <QuotaCard theme={theme} isMobile={isMobile} label="Leave This Month"
          taken={leaveQuotaState.taken} total={leaveQuotaState.total}
          color="#C9922A" icon={CalendarOff} />
        <QuotaCard theme={theme} isMobile={isMobile} label="WFH This Month"
          taken={wfhQuotaState.taken} total={wfhQuotaState.total}
          color="#00B8B8" icon={Home} />
      </div>

      {/* ── History Section ── */}
      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: "12px", overflow: "hidden" }}>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: `1px solid ${border}` }}>
          {["Leave", "WFH"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: isMobile ? "12px 16px" : "14px 24px",
                fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
                fontSize: isMobile ? "13px" : "14px",
                color: activeTab === tab ? "#00B8B8" : textMuted,
                background: "transparent", border: "none",
                borderBottom: activeTab === tab ? "2px solid #00B8B8" : "2px solid transparent",
                cursor: "pointer", transition: "all 200ms",
                marginBottom: "-1px",
              }}
            >
              {tab === "Leave" && <CalendarOff size={14} />}
              {tab === "WFH"   && <Home size={14} />}
              {/* On mobile shorten label */}
              {isMobile ? tab : (tab === "Leave" ? "Leave History" : "WFH History")}
              <span style={{
                fontFamily: "Rajdhani, sans-serif", fontSize: "11px",
                background: activeTab === tab ? "rgba(0,184,184,0.1)" : (theme === "dark" ? "#1A1A1A" : "#F0F0F0"),
                color: activeTab === tab ? "#00B8B8" : textMuted,
                border: `1px solid ${activeTab === tab ? "rgba(0,184,184,0.3)" : "transparent"}`,
                borderRadius: "4px", padding: "1px 6px",
              }}>
                {tab === "Leave" ? leaveHistory.length : wfhHistory.length}
              </span>
            </button>
          ))}
        </div>

        {/* Section title */}
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${divider}` }}>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
            color: "#CC0000", letterSpacing: "0.2em" }}>HISTORY</p>
          <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textPri }}>
            {activeTab === "Leave" ? "Leave History" : "WFH History"}
          </h3>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "12px" : "16px 20px" }}>
          {loading ? (
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted,
              textAlign: "center", padding: "32px 0" }}>
              Loading requests…
            </p>
          ) : activeData.length === 0 ? (
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted,
              textAlign: "center", padding: "32px 0" }}>
              No {activeTab.toLowerCase()} requests yet.
            </p>
          ) : isMobile ? (
            /* Mobile: card list */
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {activeData.map((row) => (
                <HistoryCard key={row.id} row={row} type={activeTab} theme={theme} />
              ))}
            </div>
          ) : (
            /* Desktop: table */
            <HistoryTable data={activeData} type={activeTab} theme={theme} />
          )}
        </div>
      </div>
    </div>
  );
}

export default MyLeave;