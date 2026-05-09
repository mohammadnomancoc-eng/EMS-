import { useState, useEffect } from "react";
import { useTheme } from "../../App";
import {
  CalendarCheck, CalendarX, CalendarOff,
  Home, TrendingUp, TrendingDown
} from "lucide-react";
import { getAttendanceByEmployee } from "../../firebase/firestoreService";

// ── Count-up hook ─────────────────────────────────────
function useCountUp(target, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return val;
}

// ── Helpers ───────────────────────────────────────────
// FIX (Bug 2 - MyAttendance): Removed all hardcoded mock data.
// Profile and empId are now read from localStorage (set at login).
// Attendance records are loaded from Firestore via getAttendanceByEmployee().

function getProfile() {
  try {
    const raw = localStorage.getItem("rwt-user");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { name: "Employee", role: "", initials: "?", empId: null };
}

function currentMonthLabel() {
  return new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// Count working days in the current calendar month (Mon–Sat, excluding Sun)
function workingDaysThisMonth() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const days  = new Date(year, month + 1, 0).getDate();
  let count   = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow !== 0) count++; // exclude Sunday
  }
  return count;
}

// Filter records to the current calendar month
function filterThisMonth(records) {
  const now   = new Date();
  const y     = now.getFullYear();
  const m     = now.getMonth();
  return records.filter((r) => {
    const d = new Date(r.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
}

// ── Stat Card ─────────────────────────────────────────
function StatCard({ label, value, suffix, icon: Icon, valueColor, trendUp, trendText, theme, isQuota, taken, total, quotaColor }) {
  const displayed = useCountUp(typeof value === "number" ? value : 0);

  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";
  const iconBg    = theme === "dark" ? "#1A1A1A" : "#F5F5F5";

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{
        background: surface,
        border: `1px solid ${border}`,
        boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 200ms ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "#CC0000"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = border}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <span style={{
          fontFamily: "Rajdhani, sans-serif",
          fontSize: "10px",
          fontWeight: 700,
          color: "#CC0000",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}>
          {label}
        </span>
        <div className="rounded-full flex items-center justify-center"
          style={{ width: "36px", height: "36px", background: iconBg }}>
          <Icon size={16} style={{ color: "#00B8B8" }} />
        </div>
      </div>

      {/* Value */}
      {isQuota ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-1">
            <span style={{
              fontFamily: "Rajdhani, sans-serif",
              fontSize: "52px",
              fontWeight: 700,
              lineHeight: 1,
              color: quotaColor,
            }}>
              {taken}
            </span>
            <span style={{
              fontFamily: "Rajdhani, sans-serif",
              fontSize: "22px",
              fontWeight: 600,
              color: textMuted,
              marginBottom: "6px",
            }}>
              /{total}
            </span>
          </div>
          {/* Quota bar */}
          <div className="rounded-full overflow-hidden" style={{ height: "4px", background: theme === "dark" ? "#1A1A1A" : "#E8E8E8" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${total > 0 ? Math.round((taken / total) * 100) : 0}%`,
                background: quotaColor,
                transition: "width 800ms ease",
              }}
            />
          </div>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>
            {total - taken} remaining this month
          </p>
        </div>
      ) : (
        <div style={{
          fontFamily: "Rajdhani, sans-serif",
          fontSize: "54px",
          fontWeight: 700,
          lineHeight: 1,
          color: valueColor || textPri,
        }}>
          {displayed}{suffix}
        </div>
      )}

      {/* Trend */}
      {trendText && (
        <div className="flex items-center gap-1">
          {trendUp
            ? <TrendingUp  size={12} style={{ color: "#00B8B8" }} />
            : <TrendingDown size={12} style={{ color: "#CC0000" }} />
          }
          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>
            {trendText}
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
      Present: { bg: "rgba(0,184,184,0.10)",   border: "rgba(0,184,184,0.35)",  color: "#00B8B8" },
      Absent:  { bg: "rgba(204,0,0,0.10)",     border: "rgba(204,0,0,0.35)",    color: "#CC0000" },
      Leave:   { bg: "rgba(201,146,42,0.10)",  border: "rgba(201,146,42,0.35)", color: "#C9922A" },
      WFH:     { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.2)", color: "#E8E8E8" },
    },
    light: {
      Present: { bg: "#E6F9F9", border: "#00B8B8", color: "#007A7A" },
      Absent:  { bg: "#FDECEA", border: "#CC0000", color: "#990000" },
      Leave:   { bg: "#FDF3E0", border: "#C9922A", color: "#8A5E00" },
      WFH:     { bg: "#F0F0F0", border: "#888888", color: "#444444" },
    },
  };
  const s = styles[theme]?.[status] || styles[theme].WFH;
  return (
    <span style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      color: s.color,
      fontFamily: "Rajdhani, sans-serif",
      fontSize: "11px",
      fontWeight: 600,
      borderRadius: "4px",
      padding: "2px 8px",
    }}>
      {status}
    </span>
  );
}

// ── Loading / Error state ─────────────────────────────
function LoadingRow({ theme }) {
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";
  return (
    <div className="px-5 py-8 text-center">
      <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted }}>
        Loading attendance data…
      </p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────
function MyAttendance() {
  const { theme } = useTheme();
  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";
  const headerBg  = theme === "dark" ? "#0D0D0D" : "#F5F5F5";
  const divider   = theme === "dark" ? "#1A1A1A" : "#EEEEEE";

  // FIX: read profile from localStorage instead of hardcoded mock
  const profile  = getProfile();
  const empId    = profile.empId;

  // Real Firestore data
  const [allRecords, setAllRecords] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    if (!empId) {
      setLoading(false);
      setFetchError("Employee ID not found. Please log in again.");
      return;
    }
    setLoading(true);
    getAttendanceByEmployee(empId)
      .then((records) => {
        setAllRecords(records);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load attendance:", err);
        setFetchError("Failed to load attendance. Please refresh.");
        setLoading(false);
      });
  }, [empId]);

  // Derive stats from real data for the current month
  const monthRecords  = filterThisMonth(allRecords);
  const workingDays   = workingDaysThisMonth();
  const presentCount  = monthRecords.filter((r) => r.status === "Present").length;
  const absentCount   = monthRecords.filter((r) => r.status === "Absent").length;
  const leaveCount    = monthRecords.filter((r) => r.status === "Leave").length;
  const wfhCount      = monthRecords.filter((r) => r.status === "WFH").length;
  const attendancePct = workingDays > 0 ? Math.round((presentCount / workingDays) * 100) : 0;

  // Leave / WFH quotas — month caps (configurable here)
  const LEAVE_QUOTA = 2;
  const WFH_QUOTA   = 2;

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const getHour = new Date().getHours();
  const greeting = getHour < 12 ? "Good morning" : getHour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-6">

      {/* ── Greeting ── */}
      <div
        className="rounded-xl p-6 flex items-center justify-between"
        style={{ background: surface, border: `1px solid ${border}` }}
      >
        <div>
          <p style={{
            fontFamily: "Rajdhani, sans-serif",
            fontSize: "10px",
            fontWeight: 700,
            color: "#CC0000",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "6px",
          }}>
            WORKSPACE
          </p>
          <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: "#00B8B8", marginBottom: "4px" }}>
            {today.toUpperCase()}
          </p>
          <h2 style={{
            fontFamily: "Rajdhani, sans-serif",
            fontSize: "32px",
            fontWeight: 700,
            color: textPri,
            lineHeight: 1.1,
          }}>
            {greeting}, {profile.name} 👋
          </h2>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textMuted, marginTop: "4px" }}>
            Here's your attendance summary for <span style={{ color: "#00B8B8" }}>{currentMonthLabel()}</span>.
          </p>
        </div>

        {/* Attendance % ring */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative flex items-center justify-center"
            style={{ width: "80px", height: "80px" }}>
            <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="40" cy="40" r="32" fill="none" stroke={theme === "dark" ? "#1A1A1A" : "#E8E8E8"} strokeWidth="6" />
              <circle cx="40" cy="40" r="32" fill="none" stroke="#00B8B8" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - attendancePct / 100)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: "#00B8B8", lineHeight: 1 }}>
                {attendancePct}%
              </span>
            </div>
          </div>
          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>
            Attendance
          </span>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          theme={theme} label="Days Present"
          value={presentCount} icon={CalendarCheck}
          valueColor="#00B8B8" trendUp trendText={`out of ${workingDays} working days`}
        />
        <StatCard
          theme={theme} label="Days Absent"
          value={absentCount} icon={CalendarX}
          valueColor="#CC0000" trendUp={false} trendText="this month"
        />
        <StatCard
          theme={theme} label="Attendance %"
          value={attendancePct} suffix="%" icon={TrendingUp}
          valueColor={attendancePct >= 80 ? "#00B8B8" : "#CC0000"}
          trendUp={attendancePct >= 80} trendText={attendancePct >= 80 ? "Good standing" : "Below threshold"}
        />
        <StatCard
          theme={theme} label="Leave This Month"
          icon={CalendarOff} isQuota
          taken={leaveCount} total={LEAVE_QUOTA}
          quotaColor="#C9922A"
        />
        <StatCard
          theme={theme} label="WFH This Month"
          icon={Home} isQuota
          taken={wfhCount} total={WFH_QUOTA}
          quotaColor="#00B8B8"
        />
      </div>

      {/* ── Attendance Log ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: surface, border: `1px solid ${border}` }}
      >
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${border}` }}>
          <div>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em" }}>
              ATTENDANCE
            </p>
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textPri }}>
              Daily Log — {currentMonthLabel()}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {["Present", "Absent", "Leave", "WFH"].map((s) => (
              <div key={s} className="flex items-center gap-1">
                <StatusBadge status={s} theme={theme} />
              </div>
            ))}
          </div>
        </div>

        {/* Table header */}
        <div className="grid px-5 py-2"
          style={{
            gridTemplateColumns: "1fr 1fr 1fr",
            background: headerBg,
            borderBottom: `1px solid ${divider}`,
          }}>
          {["DATE", "DAY", "STATUS"].map((h) => (
            <span key={h} style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <LoadingRow theme={theme} />
        ) : fetchError ? (
          <div className="px-5 py-8 text-center">
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: "#CC0000" }}>{fetchError}</p>
          </div>
        ) : monthRecords.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted }}>
              No attendance records found for this month.
            </p>
          </div>
        ) : (
          monthRecords.map((entry, i) => {
            const dateObj = new Date(entry.date);
            const day = dateObj.toLocaleDateString("en-IN", { weekday: "long" });
            return (
              <div
                key={entry.id || entry.date}
                className="grid px-5 items-center"
                style={{
                  gridTemplateColumns: "1fr 1fr 1fr",
                  height: "52px",
                  borderBottom: i < monthRecords.length - 1 ? `1px solid ${divider}` : "none",
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
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: textPri }}>
                  {entry.date}
                </span>
                <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted }}>
                  {day}
                </span>
                <div>
                  <StatusBadge status={entry.status} theme={theme} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default MyAttendance;