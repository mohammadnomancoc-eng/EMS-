import { useState, useEffect } from "react";
import { useTheme } from "../../App";
import {
  CalendarCheck, CalendarX, CalendarOff,
  Home, TrendingUp, TrendingDown, Camera, FileText, X as XIcon,
} from "lucide-react";
import WebcamAttendance from "../../components/WebcamAttendance";
import { getAttendanceByEmployee, getEmployee, getApprovedWfhForDate } from "../../firebase/firestoreService";

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

function workingDaysThisMonth() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const days  = new Date(year, month + 1, 0).getDate();
  let count   = 0;
  for (let d = 1; d <= days; d++) {
    if (new Date(year, month, d).getDay() !== 0) count++;
  }
  return count;
}

function filterThisMonth(records) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();
  return records.filter((r) => {
    const d = new Date(r.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
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
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600,
      borderRadius: "4px", padding: "2px 8px", whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
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
      className="rounded-xl p-4 sm:p-5 flex flex-col gap-2 sm:gap-3"
      style={{
        background: surface, border: `1px solid ${border}`,
        boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 200ms ease", cursor: "default",
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "#CC0000"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = border}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <span style={{
          fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
          color: "#CC0000", letterSpacing: "0.18em", textTransform: "uppercase", lineHeight: 1.3,
        }}>
          {label}
        </span>
        <div className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: "30px", height: "30px", background: iconBg }}>
          <Icon size={13} style={{ color: "#00B8B8" }} />
        </div>
      </div>

      {/* Value */}
      {isQuota ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-1">
            <span style={{
              fontFamily: "Rajdhani, sans-serif",
              fontSize: "clamp(32px, 4.5vw, 52px)",
              fontWeight: 700, lineHeight: 1, color: quotaColor,
            }}>
              {taken}
            </span>
            <span style={{
              fontFamily: "Rajdhani, sans-serif",
              fontSize: "clamp(14px, 2vw, 22px)",
              fontWeight: 600, color: textMuted, marginBottom: "4px",
            }}>
              /{total}
            </span>
          </div>
          <div className="rounded-full overflow-hidden" style={{ height: "4px", background: theme === "dark" ? "#1A1A1A" : "#E8E8E8" }}>
            <div className="h-full rounded-full" style={{
              width: `${total > 0 ? Math.round((taken / total) * 100) : 0}%`,
              background: quotaColor, transition: "width 800ms ease",
            }} />
          </div>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: textMuted }}>
            {total - taken} remaining
          </p>
        </div>
      ) : (
        <div style={{
          fontFamily: "Rajdhani, sans-serif",
          fontSize: "clamp(32px, 4.5vw, 54px)",
          fontWeight: 700, lineHeight: 1, color: valueColor || textPri,
        }}>
          {displayed}{suffix}
        </div>
      )}

      {/* Trend */}
      {trendText && (
        <div className="flex items-center gap-1">
          {trendUp
            ? <TrendingUp  size={11} style={{ color: "#00B8B8", flexShrink: 0 }} />
            : <TrendingDown size={11} style={{ color: "#CC0000", flexShrink: 0 }} />
          }
          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: textMuted, lineHeight: 1.3 }}>
            {trendText}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Loading state ─────────────────────────────────────
function LoadingRow({ theme }) {
  return (
    <div className="px-5 py-8 text-center">
      <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: theme === "dark" ? "#A0A0A0" : "#888888" }}>
        Loading attendance data…
      </p>
    </div>
  );
}

// ── Work Description Modal ────────────────────────────
function WorkDescModal({ entry, theme, onClose }) {
  const isDark = theme === "dark";
  const dateObj = new Date(entry.date);
  const dateLabel = dateObj.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "480px",
          background: isDark ? "#111111" : "#FFFFFF",
          border: `1px solid ${isDark ? "#1E1E1E" : "#E0E0E0"}`,
          borderRadius: "12px 12px 0 0",
          overflow: "hidden",
        }}
        className="sm:!rounded-xl"
      >
        {/* Header */}
        <div style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${isDark ? "#1A1A1A" : "#F0F0F0"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "30px", height: "30px", borderRadius: "7px",
              background: "rgba(0,184,184,0.10)", border: "1px solid rgba(0,184,184,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <FileText size={14} style={{ color: "#00B8B8" }} />
            </div>
            <div>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "15px", color: isDark ? "#F0F0F0" : "#111111", margin: 0 }}>
                Work Summary
              </p>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: isDark ? "#555555" : "#999999", margin: "2px 0 0" }}>
                {dateLabel}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: "#555555", background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <XIcon size={17} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 20px" }}>
          <p style={{
            fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
            color: "#CC0000", letterSpacing: "0.18em", marginBottom: "10px",
          }}>
            TODAY'S COMPLETED WORK
          </p>
          <div style={{
            padding: "14px 16px", borderRadius: "8px",
            background: isDark ? "#0D0D0D" : "#F7F7F7",
            border: `1px solid ${isDark ? "#1A1A1A" : "#EBEBEB"}`,
          }}>
            <p style={{
              fontFamily: "Mulish, sans-serif", fontSize: "13px", lineHeight: "1.7",
              color: isDark ? "#CCCCCC" : "#333333", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {entry.workDescription}
            </p>
          </div>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: isDark ? "#444" : "#BBB", marginTop: "10px", textAlign: "right" }}>
            Submitted at check-out via webcam
          </p>
        </div>
      </div>
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

  const profile = getProfile();
  const empId   = profile.empId;

  const [showWebcam, setShowWebcam] = useState(false);
  const [allRecords, setAllRecords] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [viewWorkDesc, setViewWorkDesc] = useState(null);

  const [leaveQuota, setLeaveQuota] = useState(2);
  const [wfhQuota,   setWfhQuota]   = useState(4);
  const [workType,   setWorkType]   = useState(null); // "WFO" | "WFH" | "Hybrid"
  const [todayWfhApproval, setTodayWfhApproval] = useState(null);

  useEffect(() => {
    if (!empId) { setLoading(false); setFetchError("Employee ID not found. Please log in again."); return; }
    setLoading(true);
    getAttendanceByEmployee(empId)
      .then((records) => { setAllRecords(records); setLoading(false); })
      .catch((err) => {
        console.error("Failed to load attendance:", err);
        setFetchError("Failed to load attendance. Please refresh.");
        setLoading(false);
      });

    getEmployee(empId)
      .then(async (emp) => {
        if (emp) {
          if (emp.leaveQuota !== undefined) setLeaveQuota(emp.leaveQuota);
          if (emp.wfhQuota !== undefined) setWfhQuota(emp.wfhQuota);
          const wt = (emp.workType || "WFO").toUpperCase();
          setWorkType(wt);
          // For WFO employees, check if they have approved WFH for today
          if (wt === "WFO") {
            try {
              const today = new Date();
              const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
              const approval = await getApprovedWfhForDate(empId, dateStr);
              setTodayWfhApproval(approval);
            } catch (_) {}
          }
        }
      })
      .catch((err) => console.error("Failed to load employee quota:", err));
  }, [empId]);

  const refreshRecords = () => {
    if (!empId) return;
    setLoading(true);
    import("../../firebase/firestoreService").then(({ getAttendanceByEmployee }) => {
      getAttendanceByEmployee(empId)
        .then((records) => { setAllRecords(records); setLoading(false); })
        .catch(() => setLoading(false));
    });
  };

  const monthRecords  = filterThisMonth(allRecords);
  const workingDays   = workingDaysThisMonth();
  const presentCount  = monthRecords.filter((r) => r.status === "Present").length;
  const absentCount   = monthRecords.filter((r) => r.status === "Absent").length;
  const leaveCount    = monthRecords.filter((r) => r.status === "Leave").length;
  const wfhCount      = monthRecords.filter((r) => r.status === "WFH").length;
  const attendancePct = workingDays > 0 ? Math.round((presentCount / workingDays) * 100) : 0;

  const today    = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const getHour  = new Date().getHours();
  const greeting = getHour < 12 ? "Good morning" : getHour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-4 sm:gap-6">

      {/* ── Greeting Card ── */}
      <div
        className="rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ background: surface, border: `1px solid ${border}` }}
      >
        {/* Text block */}
        <div className="flex-1 min-w-0">
          <p style={{
            fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
            color: "#CC0000", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "6px",
          }}>
            WORKSPACE
          </p>
          <p style={{
            fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#00B8B8", marginBottom: "4px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {today.toUpperCase()}
          </p>
          <h2 style={{
            fontFamily: "Rajdhani, sans-serif",
            fontSize: "clamp(20px, 5vw, 32px)",
            fontWeight: 700, color: textPri, lineHeight: 1.1, wordBreak: "break-word",
          }}>
            {greeting}, {profile.name} 👋
          </h2>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted, marginTop: "4px" }}>
            Attendance summary for{" "}
            <span style={{ color: "#00B8B8" }}>{currentMonthLabel()}</span>.
          </p>
        </div>

        {/* Attendance ring — inline with text on mobile, stacked on sm+ */}
        <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-1 flex-shrink-0">
          <div className="relative flex items-center justify-center" style={{ width: "72px", height: "72px" }}>
            <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="36" cy="36" r="28" fill="none"
                stroke={theme === "dark" ? "#1A1A1A" : "#E8E8E8"} strokeWidth="6" />
              <circle cx="36" cy="36" r="28" fill="none" stroke="#00B8B8" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - attendancePct / 100)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <div className="absolute flex items-center justify-center">
              <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "15px", color: "#00B8B8", lineHeight: 1 }}>
                {attendancePct}%
              </span>
            </div>
          </div>
          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>
            Attendance
          </span>
        </div>
      </div>

      {/* ── Webcam Banner ── */}
      <div
        className="rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ background: surface, border: `1px solid ${border}` }}
      >
        <div className="flex-1 min-w-0">
          <p style={{
            fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
            color: "#CC0000", letterSpacing: "0.2em", marginBottom: "4px",
          }}>
            WEBCAM ATTENDANCE
          </p>
          <p style={{
            fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
            fontSize: "clamp(15px, 3.5vw, 18px)", color: textPri, lineHeight: 1.2,
          }}>
            Mark Today's Attendance
          </p>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, marginTop: "3px" }}>
            Use your webcam to log in or log out. Your record goes directly to the admin panel.
          </p>
        </div>

        {/* Full-width button on mobile, auto on sm+ */}
        <button
          onClick={() => setShowWebcam(true)}
          className="flex items-center justify-center gap-2 rounded-lg w-full sm:w-auto"
          style={{
            flexShrink: 0, padding: "11px 22px", minHeight: "44px",
            background: "#CC0000", border: "1px solid #CC0000", color: "#FFFFFF",
            fontFamily: "Rajdhani, sans-serif", fontSize: "14px", fontWeight: 700,
            cursor: "pointer", letterSpacing: "0.05em", transition: "all 150ms", whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#AA0000"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#CC0000"; }}
        >
          <Camera size={16} />
          Open Webcam
        </button>
      </div>

      {/* ── WFO/WFH Info Banner ── */}
      {workType && (
        <div
          className="rounded-xl p-4 sm:p-5"
          style={{
            background: surface,
            border: `1px solid ${border}`,
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <div style={{
            width: "34px", height: "34px", borderRadius: "8px", flexShrink: 0,
            background: workType === "WFH" ? "rgba(0,184,184,0.10)" : workType === "WFO" ? "rgba(204,0,0,0.08)" : "rgba(201,146,42,0.08)",
            border: `1px solid ${workType === "WFH" ? "rgba(0,184,184,0.3)" : workType === "WFO" ? "rgba(204,0,0,0.25)" : "rgba(201,146,42,0.3)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CalendarCheck size={15} style={{ color: workType === "WFH" ? "#00B8B8" : workType === "WFO" ? "#CC0000" : "#C9922A" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
              color: workType === "WFH" ? "#00B8B8" : "#CC0000",
              letterSpacing: "0.18em", marginBottom: "4px",
            }}>
              WORK TYPE: {workType}
            </p>
            {workType === "WFH" ? (
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, lineHeight: 1.5 }}>
                You can mark attendance freely from any location.
              </p>
            ) : workType === "WFO" ? (
              <div>
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, lineHeight: 1.5 }}>
                  You must be within office premises to mark attendance.
                  {!todayWfhApproval && (
                    <span> To work from home, apply for WFH via <strong style={{ color: "#00B8B8" }}>My Leave → Apply for WFH</strong> and get admin approval first.</span>
                  )}
                </p>
                {todayWfhApproval && (
                  <p style={{
                    fontFamily: "Mulish, sans-serif", fontSize: "12px",
                    color: "#00B8B8", lineHeight: 1.5, marginTop: "6px",
                    padding: "6px 10px", borderRadius: "6px",
                    background: "rgba(0,184,184,0.06)",
                    border: "1px solid rgba(0,184,184,0.2)",
                  }}>
                    ✓ WFH approved for today ({todayWfhApproval.from === todayWfhApproval.to ? todayWfhApproval.from : `${todayWfhApproval.from} to ${todayWfhApproval.to}`}) — you can mark attendance from home.
                  </p>
                )}
              </div>
            ) : (
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, lineHeight: 1.5 }}>
                Hybrid mode — attendance rules depend on your schedule.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Stat Cards ── */}
      {/* 2-col on mobile → 3-col on sm → 5-col on xl */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          theme={theme} label="Days Present"
          value={presentCount} icon={CalendarCheck}
          valueColor="#00B8B8" trendUp trendText={`of ${workingDays} working days`}
        />
        <StatCard
          theme={theme} label="Days Absent"
          value={absentCount} icon={CalendarX}
          valueColor="#CC0000" trendUp={false} trendText="this month"
        />
        {/* On 2-col this is the 3rd item — spans both cols so it sits centred */}
        <div className="col-span-2 sm:col-span-1">
          <StatCard
            theme={theme} label="Attendance %"
            value={attendancePct} suffix="%" icon={TrendingUp}
            valueColor={attendancePct >= 80 ? "#00B8B8" : "#CC0000"}
            trendUp={attendancePct >= 80}
            trendText={attendancePct >= 80 ? "Good standing" : "Below threshold"}
          />
        </div>
        <StatCard
          theme={theme} label="Leave This Month"
          icon={CalendarOff} isQuota
          taken={leaveCount} total={leaveQuota}
          quotaColor="#C9922A"
        />
        <StatCard
          theme={theme} label="WFH This Month"
          icon={Home} isQuota
          taken={wfhCount} total={wfhQuota}
          quotaColor="#00B8B8"
        />
      </div>

      {/* ── Attendance Log ── */}
      <div className="rounded-xl overflow-hidden" style={{ background: surface, border: `1px solid ${border}` }}>

        {/* Header */}
        <div
          className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          <div>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em" }}>
              ATTENDANCE
            </p>
            <h3 style={{
              fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
              fontSize: "clamp(15px, 3.5vw, 18px)", color: textPri,
            }}>
              Daily Log — {currentMonthLabel()}
            </h3>
          </div>
          {/* Legend badges — wrap on narrow screens */}
          <div className="flex items-center gap-2 flex-wrap">
            {["Present", "Absent", "Leave", "WFH"].map((s) => (
              <StatusBadge key={s} status={s} theme={theme} />
            ))}
          </div>
        </div>

        {/* Column labels */}
        <div
          className="grid px-4 sm:px-5 py-2"
          style={{
            gridTemplateColumns: "1.2fr 1fr 0.8fr 0.7fr",
            background: headerBg,
            borderBottom: `1px solid ${divider}`,
          }}
        >
          {["DATE", "DAY", "STATUS", "WORK"].map((h) => (
            <span key={h} style={{
              fontFamily: "Rajdhani, sans-serif", fontSize: "10px",
              fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em",
            }}>
              {h}
            </span>
          ))}
        </div>

        {/* Data rows */}
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
            const dateObj  = new Date(entry.date);
            const dayFull  = dateObj.toLocaleDateString("en-IN", { weekday: "long" });
            const dayShort = dateObj.toLocaleDateString("en-IN", { weekday: "short" });

            return (
              <div
                key={entry.id || entry.date}
                className="grid px-4 sm:px-5 items-center"
                style={{
                  gridTemplateColumns: "1.2fr 1fr 0.8fr 0.7fr",
                  height: "50px",
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
                {/* Date */}
                <span style={{
                  fontFamily: "Share Tech Mono, monospace",
                  fontSize: "clamp(10px, 2.5vw, 12px)",
                  color: textPri, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {entry.date}
                </span>

                {/* Weekday — full on sm+, abbreviated on mobile */}
                <span className="hidden sm:inline" style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted }}>
                  {dayFull}
                </span>
                <span className="sm:hidden" style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>
                  {dayShort}
                </span>

                {/* Status */}
                <div>
                  <StatusBadge status={entry.status} theme={theme} />
                </div>

                {/* Work Description button */}
                <div>
                  {entry.workDescription ? (
                    <button
                      onClick={() => setViewWorkDesc(entry)}
                      title="View work summary"
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        gap: "4px", padding: "4px 8px", borderRadius: "6px",
                        border: "1px solid rgba(0,184,184,0.35)",
                        background: "rgba(0,184,184,0.08)",
                        color: "#00B8B8", cursor: "pointer",
                        fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
                        letterSpacing: "0.05em", transition: "all 150ms", whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,184,184,0.18)"; e.currentTarget.style.borderColor = "#00B8B8"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,184,184,0.08)"; e.currentTarget.style.borderColor = "rgba(0,184,184,0.35)"; }}
                    >
                      <FileText size={11} />
                      <span className="hidden sm:inline">VIEW</span>
                    </button>
                  ) : (
                    <span style={{
                      fontFamily: "Share Tech Mono, monospace", fontSize: "11px",
                      color: theme === "dark" ? "#2A2A2A" : "#DDDDDD",
                    }}>—</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Work Description Modal ── */}
      {viewWorkDesc && (
        <WorkDescModal
          entry={viewWorkDesc}
          theme={theme}
          onClose={() => setViewWorkDesc(null)}
        />
      )}

      {/* ── Webcam Modal ── */}
      {showWebcam && (
        <WebcamAttendance
          empId={empId}
          empName={profile.name}
          onClose={() => setShowWebcam(false)}
          onSuccess={() => {
            refreshRecords();
          }}
        />
      )}
    </div>
  );
}

export default MyAttendance;