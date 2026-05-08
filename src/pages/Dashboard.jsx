import { seedDatabase } from "../firebase/seed";
import { useState, useEffect } from "react";
import { useTheme } from "../App";
import {
  Users, UserCheck, UserX, DollarSign,
  TrendingUp, TrendingDown, Download, Plus,
  Check, X
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";
import {
  employees, weeklyAttendance,
  recentJoinings, leaveRequests
} from "../data/mockdata";


// ── helpers ──────────────────────────────────────────
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
      className="rounded-xl p-5 flex flex-col gap-3"
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
            fontSize: "10px",
            fontWeight: 700,
            color: "#CC0000",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: "36px", height: "36px",
            background: theme === "dark" ? "#1A1A1A" : "#F5F5F5",
          }}
        >
          <Icon size={16} style={{ color: "#00B8B8" }} />
        </div>
      </div>

      {/* Number */}
      <div
        style={{
          fontFamily: "Rajdhani, sans-serif",
          fontSize: "54px",
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
        <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: theme === "dark" ? "#A0A0A0" : "#888888" }}>
          {trend}
        </span>
      </div>

      {/* Sparkline */}
      <div style={{ height: "36px" }}>
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

// ── Main Dashboard ────────────────────────────────────
function Dashboard() {
  const { theme } = useTheme();
  const [leaves, setLeaves] = useState(leaveRequests);

  const present = employees.filter((e) => e.status === "Present").length;
  const absent  = employees.filter((e) => e.status === "Absent").length;
  const onLeave = employees.filter((e) => e.status === "Leave").length;
  const totalPayroll = employees.reduce((s, e) => s + e.salary, 0);

  const handleApprove = (id) =>
    setLeaves((prev) => prev.map((l) => l.id === id ? { ...l, status: "Approved" } : l));
  const handleReject  = (id) =>
    setLeaves((prev) => prev.map((l) => l.id === id ? { ...l, status: "Rejected" } : l));

  const spark1 = [28,30,28,31,29,32,employees.length].map((v) => ({ v }));
  const spark2 = [8,10,9,11,10,12,present].map((v) => ({ v }));
  const spark3 = [2,3,2,4,3,3,onLeave].map((v) => ({ v }));
  const spark4 = [600000,620000,615000,630000,628000,635000,totalPayroll].map((v) => ({ v }));

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
    <div className="flex flex-col gap-6">

      {/* ── Greeting Card ── */}
      <div
        className="rounded-xl p-6 flex items-center justify-between"
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
          <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: "#00B8B8", marginBottom: "4px" }}>
            {today.toUpperCase()}
          </p>
          <h2
            style={{
              fontFamily: "Rajdhani, sans-serif",
              fontSize: "32px",
              fontWeight: 700,
              color: textPri,
              lineHeight: 1.1,
            }}
          >
            Good morning, Admin 👋
          </h2>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textMuted, marginTop: "4px" }}>
            Here's what's happening across Royals Webtech today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm"
            style={{
              fontFamily: "Rajdhani, sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              border: `1px solid ${border}`,
              color: textPri,
              background: "transparent",
              letterSpacing: "0.05em",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "#00B8B8"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = border}
          >
            <Download size={14} /> Export
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm"
            style={{
              fontFamily: "Rajdhani, sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              background: "#CC0000",
              color: "#FFFFFF",
              border: "none",
              letterSpacing: "0.05em",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#AA0000"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#CC0000"}
          >
            <Plus size={14} /> Add Employee
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard theme={theme} label="Total Employees" value={employees.length}
          icon={Users} trend="+2 this month" trendUp sparkData={spark1} />
        <StatCard theme={theme} label="Present Today" value={present}
          icon={UserCheck} valueColor="#00B8B8" trend={`${Math.round(present/employees.length*100)}% attendance`} trendUp sparkData={spark2} />
        <StatCard theme={theme} label="On Leave" value={onLeave}
          icon={UserX} valueColor="#CC0000" trend="1 pending approval" trendUp={false} sparkData={spark3} />
        <StatCard theme={theme} label="Payroll May" value={totalPayroll}
          icon={DollarSign} valueColor="#C9922A" prefix="₹" trend="+3.2% vs last month" trendUp sparkData={spark4} />
      </div>

      {/* ── Row 2: Chart + Team Today ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "62fr 38fr" }}>

        {/* Weekly Attendance Chart */}
        <div
          className="rounded-xl p-5"
          style={{ background: surface, border: `1px solid ${border}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textPri }}>
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
              <YAxis tick={{ fontFamily: "Share Tech Mono, monospace", fontSize: 10, fill: textMuted }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip theme={theme} />} />
              <Line type="monotone" dataKey="present" name="Present" stroke="#00B8B8" strokeWidth={2} dot={{ fill: "#00B8B8", r: 3 }} />
              <Line type="monotone" dataKey="absent"  name="Absent"  stroke="#CC0000" strokeWidth={2} dot={{ fill: "#CC0000",  r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Team Today */}
        <div
          className="rounded-xl p-5"
          style={{ background: surface, border: `1px solid ${border}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textPri }}>
              Team Today
            </h3>
            <span
              style={{
                fontFamily: "Rajdhani, sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                color: "#00B8B8",
                background: "rgba(0,184,184,0.1)",
                border: "1px solid rgba(0,184,184,0.3)",
                borderRadius: "4px",
                padding: "2px 8px",
              }}
            >
              {present}/{employees.length}
            </span>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: "220px", scrollbarWidth: "none" }}>
            {employees.slice(0, 8).map((emp) => (
              <div
                key={emp.id}
                className="flex items-center gap-3 px-2 py-2 rounded-md"
                style={{ transition: "background 150ms" }}
                onMouseEnter={(e) => e.currentTarget.style.background = theme === "dark" ? "#161616" : "#F5F5F5"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: "30px", height: "30px", background: "#CC0000" }}
                >
                  <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "10px" }}>
                    {getInitials(emp.name)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 600, fontSize: "13px", color: textPri, lineHeight: 1.2 }}>
                    {emp.name}
                  </p>
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>
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
      <div className="grid grid-cols-2 gap-4">

        {/* Recent Joinings */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: surface, border: `1px solid ${border}` }}
        >
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${border}` }}>
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textPri }}>
              Recent Joinings
            </h3>
          </div>

          {/* Table Header */}
          <div
            className="grid px-5 py-2"
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

          {recentJoinings.map((emp, i) => (
            <div
              key={emp.id}
              className="grid px-5 items-center"
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
                  style={{ width: "28px", height: "28px", background: "#CC0000" }}>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "9px" }}>
                    {getInitials(emp.name)}
                  </span>
                </div>
                <div>
                  <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 600, fontSize: "13px", color: textPri, lineHeight: 1.1 }}>
                    {emp.name}
                  </p>
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: textMuted }}>
                    {emp.role}
                  </p>
                </div>
              </div>
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted }}>
                {emp.department}
              </span>
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: textMuted }}>
                {emp.joinDate}
              </span>
            </div>
          ))}
        </div>

        {/* Pending Approvals */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: surface, border: `1px solid ${border}` }}
        >
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${border}` }}>
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textPri }}>
              Pending Approvals
            </h3>
          </div>

          <div
            className="grid px-5 py-2"
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

          {leaves.map((req, i) => (
            <div
              key={req.id}
              className="grid px-5 items-center"
              style={{
                gridTemplateColumns: "1fr 1fr auto",
                height: "60px",
                borderBottom: i < leaves.length - 1 ? `1px solid ${divider}` : "none",
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
              <div>
                <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 600, fontSize: "13px", color: textPri }}>
                  {req.employee}
                </p>
                <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMuted }}>
                  {req.from} → {req.to}
                </p>
              </div>

              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted }}>
                {req.type}
              </span>

              <div className="flex items-center gap-2">
                {req.status === "Pending" ? (
                  <>
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="rounded flex items-center justify-center"
                      style={{ width: "28px", height: "28px", background: "rgba(0,184,184,0.1)", border: "1px solid rgba(0,184,184,0.3)", color: "#00B8B8" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,184,184,0.2)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,184,184,0.1)"}
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="rounded flex items-center justify-center"
                      style={{ width: "28px", height: "28px", background: "rgba(204,0,0,0.1)", border: "1px solid rgba(204,0,0,0.3)", color: "#CC0000" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(204,0,0,0.2)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(204,0,0,0.1)"}
                    >
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <span
                    style={{
                      fontFamily: "Rajdhani, sans-serif",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: req.status === "Approved" ? "#00B8B8" : "#CC0000",
                      background: req.status === "Approved" ? "rgba(0,184,184,0.1)" : "rgba(204,0,0,0.1)",
                      border: `1px solid ${req.status === "Approved" ? "rgba(0,184,184,0.3)" : "rgba(204,0,0,0.3)"}`,
                      borderRadius: "4px",
                      padding: "2px 8px",
                    }}
                  >
                    {req.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;