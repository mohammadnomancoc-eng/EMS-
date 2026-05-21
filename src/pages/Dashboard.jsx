import { useState, useEffect } from "react";
import { useTheme } from "../App";
import {
  Users, UserCheck, UserX, DollarSign,
  TrendingUp, TrendingDown, Download, Plus,
  Check, X, KeyRound, ShieldCheck, Copy, CheckCheck,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";
import {
  subscribeEmployees,
  subscribeLeaveRequests,
  updateLeaveStatus,
  getAttendanceByDate,
  addEmployee,
  getDepartments,
} from "../firebase/firestoreService";
import { createEmployeeAccount, generateEmail } from "../firebase/employeeAuthService";
import { firebaseConfig } from "../firebase/config";


// ── helpers ──────────────────────────────────────────
/** Display format: RWTPVTLTD-IT-OFLT-122025-05 → RWTPVTLTD/IT/OFLT/122025/05 */
function formatEmpId(id) {
  if (!id) return id;
  if (id.startsWith("RWTPVTLTD-")) return id.replace(/-/g, "/");
  return id;
}

function getInitials(name) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
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
  const s = styles[theme][status] || styles[theme].WFH;
  return (
    <span
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        fontFamily: "Rajdhani, sans-serif",
        fontSize: "11px",
        fontWeight: 600,
        borderRadius: "4px",
        padding: "2px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

// ── KPI Card ─────────────────────────────────────────
function StatCard({ label, value, trend, trendUp, icon: Icon, valueColor, sparkData, theme, prefix }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = typeof value === "number" ? value : 0;
    if (end === 0) return setDisplay(0);
    const duration = 800;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div
      className="rounded-xl p-4 sm:p-5 flex flex-col gap-2 sm:gap-3"
      style={{
        background: theme === "dark" ? "#111111" : "#FFFFFF",
        border: `1px solid ${theme === "dark" ? "#1E1E1E" : "#E0E0E0"}`,
        boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 200ms ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "#CC0000"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = theme === "dark" ? "#1E1E1E" : "#E0E0E0"}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <span
          style={{
            fontFamily: "Rajdhani, sans-serif",
            fontSize: "9px",
            fontWeight: 700,
            color: "#CC0000",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            width: "32px", height: "32px",
            background: theme === "dark" ? "#1A1A1A" : "#F5F5F5",
          }}
        >
          <Icon size={14} style={{ color: "#00B8B8" }} />
        </div>
      </div>

      {/* Number */}
      <div
        style={{
          fontFamily: "Rajdhani, sans-serif",
          fontSize: "clamp(32px, 5vw, 48px)",
          fontWeight: 700,
          lineHeight: 1,
          color: valueColor || (theme === "dark" ? "#F0F0F0" : "#111111"),
        }}
      >
        {prefix}{display.toLocaleString()}
      </div>

      {/* Trend */}
      <div className="flex items-center gap-1">
        {trendUp
          ? <TrendingUp size={12} style={{ color: "#00B8B8" }} />
          : <TrendingDown size={12} style={{ color: "#CC0000" }} />
        }
        <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: theme === "dark" ? "#A0A0A0" : "#888888" }}>
          {trend}
        </span>
      </div>

      {/* Sparkline */}
      <div style={{ height: "32px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkData}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={trendUp ? "#00B8B8" : "#CC0000"}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────
function CustomTooltip({ active, payload, label, theme }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: theme === "dark" ? "#161616" : "#FFFFFF",
        border: "1px solid #CC0000",
        borderLeft: "3px solid #CC0000",
        borderRadius: "6px",
        padding: "8px 12px",
        fontFamily: "Mulish, sans-serif",
        fontSize: "12px",
      }}
    >
      <p style={{ color: theme === "dark" ? "#A0A0A0" : "#888888", marginBottom: "4px" }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.stroke, fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ── helpers ──────────────────────────────────────────
function lastNDates(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Credentials Modal (copied from Employees.jsx) ────────────
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

// ── Employee Modal (copied from Employees.jsx) ────────────────
function EmployeeModal({ theme, onClose, onSave, departments }) {
  const [form, setForm] = useState({
    name: "", role: "", department: departments[0]?.name || "Engineering",
    email: "", phone: "", joinDate: "", completionDate: "", status: "Present", salary: "",
    workType: "WFO", photoUrl: "", photoPublicId: "",
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
            ADD NEW EMPLOYEE
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: labelColor, padding: "4px" }}>
            <X size={18} />
          </button>
        </div>

        {/* Photo note */}
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
              color: labelColor, letterSpacing: "0.05em" }}>PHOTO UPLOAD</p>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px",
              color: isDark ? "#666666" : "#AAAAAA", marginTop: "2px" }}>
              Photo can be added after the employee record is saved.
            </p>
          </div>
        </div>

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
          {field("Status", "status", "text", ["Present", "Absent", "Leave", "WFH"])}
          {field("Work Type", "workType", "text", ["WFO", "WFH", "Hybrid"])}
          {field("Monthly Salary (₹)", "salary", "number")}
        </div>

        {/* Auto-credentials preview */}
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
                CREATING ACCOUNT...
              </>
            ) : "ADD EMPLOYEE"}
          </button>
        </div>

        {saveError && (
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#CC0000",
            marginTop: "10px", textAlign: "center", background: "rgba(204,0,0,0.08)",
            border: "1px solid rgba(204,0,0,0.2)", borderRadius: "6px", padding: "8px" }}>
            ⚠ {saveError}
          </p>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────
function Dashboard() {
  const { theme } = useTheme();

  const [employees,         setEmployees]         = useState([]);
  const [leaves,            setLeaves]            = useState([]);
  const [weeklyAttendance,  setWeeklyAttendance]  = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [showModal,         setShowModal]         = useState(false);
  const [newCredentials,    setNewCredentials]    = useState(null);
  const [departments,       setDepartments]       = useState([]);

  useEffect(() => {
    const unsub = subscribeEmployees((list) => setEmployees(list));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeLeaveRequests((list) => setLeaves(list));
    return unsub;
  }, []);

  useEffect(() => {
    const dates = lastNDates(6);
    Promise.all(dates.map((d) => getAttendanceByDate(d))).then((results) => {
      const chart = results.map((records, i) => {
        const date = new Date(dates[i]);
        return {
          day: DAY_LABELS[date.getDay()],
          present: records.filter((r) => r.status === "Present" || r.status === "WFH").length,
          absent:  records.filter((r) => r.status === "Absent").length,
        };
      });
      setWeeklyAttendance(chart);
      setLoadingAttendance(false);
    });
  }, []);

  const present      = employees.filter((e) => e.status === "Present").length;
  const onLeave      = employees.filter((e) => e.status === "Leave").length;
  const totalPayroll = employees.reduce((s, e) => s + (e.salary || 0), 0);

  const recentJoinings = [...employees]
    .sort((a, b) => (b.joinDate || "").localeCompare(a.joinDate || ""))
    .slice(0, 4);

  const pendingLeaves = leaves.filter((l) => l.status === "Pending");

  useEffect(() => {
    getDepartments().then((list) => { if (list.length > 0) setDepartments(list); });
  }, []);

  const handleApprove = async (id) => { await updateLeaveStatus(id, "Approved"); };
  const handleReject  = async (id) => { await updateLeaveStatus(id, "Rejected"); };

  // ── Add Employee ──────────────────────────────────────
  const handleAdd = async (form) => {
    const empId = await addEmployee({ ...form, salary: Number(form.salary) });
    const creds = await createEmployeeAccount({ empId, name: form.name, role: form.role }, firebaseConfig);
    setShowModal(false);
    setNewCredentials({ ...creds, empId, name: form.name });
  };

  // ── Export employees as CSV ───────────────────────────
  const handleExport = () => {
    if (employees.length === 0) return;

    const escape = (val) => {
      const s = val == null ? "" : String(val);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = [
      "Name", "Role", "Department", "Email",
      "Phone", "Join Date", "Status", "Salary (₹)",
    ];

    const rows = employees.map((e) =>
      [
        escape(e.name),
        escape(e.role),
        escape(e.department),
        escape(e.email),
        escape(e.phone),
        escape(e.joinDate),
        escape(e.status),
        e.salary || 0,
      ].join(",")
    );

    const csv  = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const spark1 = [28,30,28,31,29,32, employees.length].map((v) => ({ v }));
  const spark2 = [8,10,9,11,10,12,   present].map((v)            => ({ v }));
  const spark3 = [2,3,2,4,3,3,        onLeave].map((v)           => ({ v }));
  const spark4 = [600000,620000,615000,630000,628000,635000, totalPayroll].map((v) => ({ v }));

  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";
  const divider   = theme === "dark" ? "#1A1A1A" : "#EEEEEE";
  const headerBg  = theme === "dark" ? "#0D0D0D" : "#F5F5F5";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <>
    <div className="flex flex-col gap-4 sm:gap-6">

      {/* ── Greeting Card ── */}
      <div
        className="rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ background: surface, border: `1px solid ${border}` }}
      >
        <div>
          <p
            style={{
              fontFamily: "Rajdhani, sans-serif",
              fontSize: "10px",
              fontWeight: 700,
              color: "#CC0000",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            WORKSPACE
          </p>
          <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#00B8B8", marginBottom: "4px" }}>
            {today.toUpperCase()}
          </p>
          <h2
            style={{
              fontFamily: "Rajdhani, sans-serif",
              fontSize: "clamp(22px, 4vw, 32px)",
              fontWeight: 700,
              color: textPri,
              lineHeight: 1.1,
            }}
          >
            Good morning, Admin 👋
          </h2>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted, marginTop: "4px" }}>
            Here's what's happening across Royals Webtech today.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md"
            title={`Download ${employees.length} employee record(s) as CSV`}
            style={{
              fontFamily: "Rajdhani, sans-serif",
              fontWeight: 700,
              fontSize: "12px",
              border: `1px solid ${border}`,
              color: textPri,
              background: "transparent",
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
              cursor: employees.length === 0 ? "not-allowed" : "pointer",
              opacity: employees.length === 0 ? 0.45 : 1,
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => {
              if (employees.length === 0) return;
              e.currentTarget.style.borderColor = "#00B8B8";
              e.currentTarget.style.color = "#00B8B8";
              e.currentTarget.style.background = "rgba(0,184,184,0.07)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = border;
              e.currentTarget.style.color = textPri;
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
      
     
          
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {/* 2-col on mobile, 4-col on lg+ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard theme={theme} label="Total Employees" value={employees.length}
          icon={Users} trend="+2 this month" trendUp sparkData={spark1} />
        <StatCard theme={theme} label="Present Today" value={present}
          icon={UserCheck} valueColor="#00B8B8"
          trend={employees.length ? `${Math.round(present / employees.length * 100)}% attendance` : "—"}
          trendUp sparkData={spark2} />
        <StatCard theme={theme} label="On Leave" value={onLeave}
          icon={UserX} valueColor="#CC0000"
          trend={`${pendingLeaves.length} pending`} trendUp={false} sparkData={spark3} />
        <StatCard theme={theme} label="Payroll" value={totalPayroll}
          icon={DollarSign} valueColor="#C9922A" prefix="₹" trend="+3.2% vs last month" trendUp sparkData={spark4} />
      </div>

      {/* ── Row 2: Chart + Team Today ── */}
      {/* Stacked on mobile/tablet, side-by-side on lg+ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Weekly Attendance Chart */}
        <div
          className="lg:col-span-3 rounded-xl p-4 sm:p-5"
          style={{ background: surface, border: `1px solid ${border}` }}
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "17px", color: textPri }}>
              Weekly Attendance
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="rounded-full" style={{ width: "8px", height: "8px", background: "#00B8B8" }} />
                <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>Present</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="rounded-full" style={{ width: "8px", height: "8px", background: "#CC0000" }} />
                <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>Absent</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyAttendance}>
              <CartesianGrid stroke={theme === "dark" ? "#1A1A1A" : "#E8E8E8"} strokeDasharray="0" />
              <XAxis dataKey="day" tick={{ fontFamily: "Share Tech Mono, monospace", fontSize: 10, fill: textMuted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily: "Share Tech Mono, monospace", fontSize: 10, fill: textMuted }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CustomTooltip theme={theme} />} />
              <Line type="monotone" dataKey="present" name="Present" stroke="#00B8B8" strokeWidth={2} dot={{ fill: "#00B8B8", r: 3 }} />
              <Line type="monotone" dataKey="absent"  name="Absent"  stroke="#CC0000" strokeWidth={2} dot={{ fill: "#CC0000",  r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Team Today */}
        <div
          className="lg:col-span-2 rounded-xl p-4 sm:p-5"
          style={{ background: surface, border: `1px solid ${border}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "17px", color: textPri }}>
              Team Today
            </h3>
            <span
              style={{
                fontFamily: "Rajdhani, sans-serif",
                fontWeight: 700,
                fontSize: "13px",
                color: "#00B8B8",
                background: "rgba(0,184,184,0.1)",
                border: "1px solid rgba(0,184,184,0.3)",
                borderRadius: "4px",
                padding: "2px 8px",
              }}
            >
              {present} / {employees.length}
            </span>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: "220px", scrollbarWidth: "none" }}>
            {employees.slice(0, 8).map((emp) => (
              <div
                key={emp.id}
                className="flex items-center gap-2 sm:gap-3 px-2 py-2 rounded-md"
                style={{ transition: "background 150ms" }}
                onMouseEnter={(e) => e.currentTarget.style.background = theme === "dark" ? "#161616" : "#F5F5F5"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: "28px", height: "28px", background: "#CC0000" }}
                >
                  <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "9px" }}>
                    {getInitials(emp.name)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 600, fontSize: "13px", color: textPri, lineHeight: 1.2 }}>
                    {emp.name}
                  </p>
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: textMuted }}>
                    {emp.role}
                  </p>
                </div>
                <StatusBadge status={emp.status} theme={theme} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Recent Joinings + Pending Approvals ── */}
      {/* Stacked on mobile, side-by-side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Recent Joinings */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: surface, border: `1px solid ${border}` }}
        >
          <div className="px-4 sm:px-5 py-4" style={{ borderBottom: `1px solid ${border}` }}>
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "17px", color: textPri }}>
              Recent Joinings
            </h3>
          </div>

          {/* Scrollable table wrapper for small screens */}
          <div className="overflow-x-auto">
            {/* Table Header */}
            <div
              className="grid px-4 sm:px-5 py-2 min-w-[400px]"
              style={{
                gridTemplateColumns: "1fr 1fr 1fr",
                background: headerBg,
                borderBottom: `1px solid ${divider}`,
              }}
            >
              {["EMPLOYEE", "DEPARTMENT", "JOINED"].map((h) => (
                <span key={h} style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>
                  {h}
                </span>
              ))}
            </div>

            {recentJoinings.length === 0 ? (
              <div className="px-5 py-6 text-center" style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted }}>
                No employees yet.
              </div>
            ) : recentJoinings.map((emp, i) => (
              <div
                key={emp.id}
                className="grid px-4 sm:px-5 items-center min-w-[400px]"
                style={{
                  gridTemplateColumns: "1fr 1fr 1fr",
                  height: "52px",
                  borderBottom: i < recentJoinings.length - 1 ? `1px solid ${divider}` : "none",
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
                <div className="flex items-center gap-2">
                  <div className="rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ width: "26px", height: "26px", background: "#CC0000" }}>
                    <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "9px" }}>
                      {getInitials(emp.name)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 600, fontSize: "12px", color: textPri, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {emp.name}
                    </p>
                    <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: textMuted }}>
                      {emp.role}
                    </p>
                  </div>
                </div>
                <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {emp.department}
                </span>
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMuted }}>
                  {emp.joinDate}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: surface, border: `1px solid ${border}` }}
        >
          <div className="px-4 sm:px-5 py-4" style={{ borderBottom: `1px solid ${border}` }}>
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "17px", color: textPri }}>
              Pending Approvals
            </h3>
          </div>

          {/* Scrollable table wrapper for small screens */}
          <div className="overflow-x-auto">
            <div
              className="grid px-4 sm:px-5 py-2 min-w-[380px]"
              style={{
                gridTemplateColumns: "1fr 1fr auto",
                background: headerBg,
                borderBottom: `1px solid ${divider}`,
              }}
            >
              {["EMPLOYEE", "LEAVE TYPE", "ACTION"].map((h) => (
                <span key={h} style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>
                  {h}
                </span>
              ))}
            </div>

            {leaves.filter(req => req.status === "Pending" || req.status === "Approved" || req.status === "Rejected").slice(0, 5).map((req, i, arr) => {
              const empName = req.employee || req.name ||
                employees.find(e => e.id === req.empId)?.name || req.empId || "—";
              const leaveType = req.type || req.leaveType || req.requestType || "Leave";
              return (
                <div
                  key={req.id}
                  className="grid px-4 sm:px-5 items-center min-w-[380px]"
                  style={{
                    gridTemplateColumns: "1fr 1fr auto",
                    height: "60px",
                    borderBottom: i < arr.length - 1 ? `1px solid ${divider}` : "none",
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
                  <div className="min-w-0">
                    <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 600, fontSize: "12px", color: textPri, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {empName}
                    </p>
                    <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "9px", color: textMuted }}>
                      {req.from} → {req.to}
                    </p>
                  </div>

                  <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>
                    {leaveType}
                  </span>

                  <div className="flex items-center gap-1 sm:gap-2">
                    {req.status === "Pending" ? (
                      <>
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="rounded flex items-center justify-center"
                          style={{ width: "26px", height: "26px", background: "rgba(0,184,184,0.1)", border: "1px solid rgba(0,184,184,0.3)", color: "#00B8B8", flexShrink: 0 }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,184,184,0.2)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,184,184,0.1)"}
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          className="rounded flex items-center justify-center"
                          style={{ width: "26px", height: "26px", background: "rgba(204,0,0,0.1)", border: "1px solid rgba(204,0,0,0.3)", color: "#CC0000", flexShrink: 0 }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(204,0,0,0.2)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(204,0,0,0.1)"}
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <span
                        style={{
                          fontFamily: "Rajdhani, sans-serif",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: req.status === "Approved" ? "#00B8B8" : "#CC0000",
                          background: req.status === "Approved" ? "rgba(0,184,184,0.1)" : "rgba(204,0,0,0.1)",
                          border: `1px solid ${req.status === "Approved" ? "rgba(0,184,184,0.3)" : "rgba(204,0,0,0.3)"}`,
                          borderRadius: "4px",
                          padding: "2px 6px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {req.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>

    {/* ── Modals ── */}
    {showModal && (
      <EmployeeModal
        theme={theme}
        onClose={() => setShowModal(false)}
        onSave={handleAdd}
        departments={departments}
      />
    )}
    {newCredentials && (
      <CredentialsModal
        theme={theme}
        credentials={newCredentials}
        onClose={() => setNewCredentials(null)}
      />
    )}
    </>
  );
}

export default Dashboard;