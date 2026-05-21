// ─────────────────────────────────────────────────────────────
//  src/pages/employee/MyProjects.jsx
//
//  Employee panel page — My Projects
//  Read-only view of all projects assigned to the logged-in
//  employee, split into Ongoing and Completed tabs.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useTheme } from "../../App";
import {
  FolderKanban, Clock, CheckCircle2,
  Calendar, CalendarCheck, Loader2,
} from "lucide-react";
import { subscribeProjectsByEmployee } from "../../firebase/firestoreService";

// ── Helpers ───────────────────────────────────────────────────
function getProfile() {
  try {
    const raw = localStorage.getItem("rwt-user");
    return raw ? JSON.parse(raw) : { empId: null, name: "Employee" };
  } catch {
    return { empId: null, name: "Employee" };
  }
}

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// Days remaining / overdue helper for ongoing projects
function daysLabel(expectedEndDate) {
  if (!expectedEndDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(expectedEndDate);
  end.setHours(0, 0, 0, 0);
  const diff = Math.round((end - today) / 86400000);
  if (diff === 0) return { text: "Due today", color: "#FF9900" };
  if (diff > 0)  return { text: `${diff} day${diff !== 1 ? "s" : ""} left`, color: "#00B8B8" };
  return { text: `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? "s" : ""} overdue`, color: "#CC0000" };
}

// ── Status Badge ──────────────────────────────────────────────
function Badge({ status }) {
  const cfg = status === "Ongoing"
    ? { bg: "rgba(0,184,184,0.12)", color: "#00B8B8", border: "rgba(0,184,184,0.25)", dot: "#00B8B8" }
    : { bg: "rgba(0,200,100,0.12)", color: "#00C864", border: "rgba(0,200,100,0.25)", dot: "#00C864" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "3px 9px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
      fontFamily: "Mulish, sans-serif",
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

// ── Project Card ──────────────────────────────────────────────
function ProjectCard({ project, isDark }) {
  const isOngoing = project.status === "Ongoing";
  const dl = isOngoing ? daysLabel(project.expectedEndDate) : null;

  return (
    <div
      style={{
        borderRadius: "10px", padding: "18px 20px",
        background: isDark ? "#0D0D0D" : "#FFFFFF",
        border: `1px solid ${isDark ? "#1A1A1A" : "#EBEBEB"}`,
        transition: "border-color 180ms, box-shadow 180ms",
        display: "flex", flexDirection: "column", gap: "12px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isOngoing ? "#00B8B8" : "#00C864";
        e.currentTarget.style.boxShadow = isOngoing
          ? "0 4px 16px rgba(0,184,184,0.08)"
          : "0 4px 16px rgba(0,200,100,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isDark ? "#1A1A1A" : "#EBEBEB";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px",
            color: isDark ? "#F0F0F0" : "#111", margin: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {project.name}
          </p>
          {project.description && (
            <p style={{
              fontFamily: "Mulish, sans-serif", fontSize: "12px",
              color: isDark ? "#555" : "#888", margin: "4px 0 0", lineHeight: 1.5,
            }}>
              {project.description}
            </p>
          )}
        </div>
        <Badge status={project.status} />
      </div>

      {/* Date info */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", paddingTop: "4px", borderTop: `1px solid ${isDark ? "#141414" : "#F0F0F0"}` }}>
        {/* Start date */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Calendar size={12} color={isDark ? "#444" : "#BBB"} />
          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#666" : "#999" }}>
            Started: <strong style={{ color: isDark ? "#AAAAAA" : "#555" }}>{fmt(project.startDate)}</strong>
          </span>
        </div>

        {/* Ongoing: expected end + days left */}
        {isOngoing && project.expectedEndDate && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Clock size={12} color="#00B8B8" />
            <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#666" : "#999" }}>
              Due: <strong style={{ color: "#00B8B8" }}>{fmt(project.expectedEndDate)}</strong>
            </span>
            {dl && (
              <span style={{
                fontFamily: "Mulish, sans-serif", fontSize: "11px", fontWeight: 700,
                color: dl.color, background: `${dl.color}18`,
                padding: "1px 7px", borderRadius: "20px",
              }}>
                {dl.text}
              </span>
            )}
          </div>
        )}

        {/* Completed: completion date */}
        {!isOngoing && project.completionDate && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <CalendarCheck size={12} color="#00C864" />
            <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#666" : "#999" }}>
              Completed: <strong style={{ color: "#00C864" }}>{fmt(project.completionDate)}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function MyProjects() {
  const { theme }         = useTheme();
  const isDark            = theme === "dark";
  const profile           = getProfile();
  const empId             = profile.empId || profile.id || null;

  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("ongoing");

  useEffect(() => {
    if (!empId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeProjectsByEmployee(empId, (data) => {
      setProjects(data);
      setLoading(false);
    });
    return unsub;
  }, [empId]);

  const ongoing   = projects.filter((p) => p.status === "Ongoing");
  const completed = projects.filter((p) => p.status === "Completed");
  const list      = activeTab === "ongoing" ? ongoing : completed;

  // ── Tab style ───────────────────────────────────────────────
  const tabStyle = (active) => ({
    display: "flex", alignItems: "center", gap: "7px",
    padding: "9px 18px", borderRadius: "8px 8px 0 0",
    cursor: "pointer", border: "none",
    fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: active ? 700 : 500,
    background: active ? (isDark ? "#0D0D0D" : "#FFFFFF") : "transparent",
    color: active ? (isDark ? "#F0F0F0" : "#111") : (isDark ? "#555" : "#AAA"),
    borderBottom: active ? `2px solid #CC0000` : "2px solid transparent",
    transition: "all 150ms",
  });

  // ── Stat card ───────────────────────────────────────────────
  const StatCard = ({ count, label, color, icon: Icon }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "14px 18px", borderRadius: "10px", flex: "1 1 140px",
      background: isDark ? "#0A0A0A" : "#FFFFFF",
      border: `1px solid ${isDark ? "#1A1A1A" : "#EBEBEB"}`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "9px", flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "22px", color, margin: 0, lineHeight: 1 }}>
          {count}
        </p>
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: isDark ? "#555" : "#AAA", margin: "2px 0 0" }}>
          {label}
        </p>
      </div>
    </div>
  );

  return (
    <div>
      {/* ── Page heading ── */}
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: 38, height: 38, borderRadius: "10px",
          background: "rgba(204,0,0,0.10)", border: "1px solid rgba(204,0,0,0.20)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <FolderKanban size={18} color="#CC0000" />
        </div>
        <div>
          <h1 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "22px", color: isDark ? "#F0F0F0" : "#111", margin: 0 }}>
            My Projects
          </h1>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#555" : "#AAA", margin: "2px 0 0" }}>
            Projects assigned to you by the admin
          </p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      {!loading && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
          <StatCard count={projects.length} label="Total Projects"     color="#CC0000"  icon={FolderKanban}  />
          <StatCard count={ongoing.length}  label="Ongoing Projects"   color="#00B8B8"  icon={Clock}         />
          <StatCard count={completed.length} label="Completed Projects" color="#00C864" icon={CheckCircle2}  />
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{
        display: "flex", gap: "2px", marginBottom: "0",
        borderBottom: `1px solid ${isDark ? "#1A1A1A" : "#E5E5E5"}`,
      }}>
        <button style={tabStyle(activeTab === "ongoing")} onClick={() => setActiveTab("ongoing")}>
          <Clock size={14} />
          Ongoing Projects
          <span style={{
            padding: "1px 7px", borderRadius: "20px", fontSize: "11px",
            background: "rgba(0,184,184,0.15)", color: "#00B8B8",
          }}>{ongoing.length}</span>
        </button>
        <button style={tabStyle(activeTab === "completed")} onClick={() => setActiveTab("completed")}>
          <CheckCircle2 size={14} />
          Completed Projects
          <span style={{
            padding: "1px 7px", borderRadius: "20px", fontSize: "11px",
            background: "rgba(0,200,100,0.15)", color: "#00C864",
          }}>{completed.length}</span>
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{
        padding: "20px",
        background: isDark ? "#0A0A0A" : "#FAFAFA",
        border: `1px solid ${isDark ? "#1A1A1A" : "#E5E5E5"}`,
        borderTop: "none", borderRadius: "0 0 12px 12px",
        marginBottom: "8px",
      }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
            <Loader2 size={24} color="#CC0000" style={{ animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : !empId ? (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <FolderKanban size={36} color={isDark ? "#222" : "#DDD"} style={{ margin: "0 auto 12px" }} />
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: isDark ? "#555" : "#AAA" }}>
              Could not determine your employee ID. Please contact your admin.
            </p>
          </div>
        ) : list.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "56px 24px", gap: "10px",
            borderRadius: "10px", border: `1px dashed ${isDark ? "#1E1E1E" : "#E0E0E0"}`,
            background: isDark ? "#080808" : "#FFFFFF",
          }}>
            {activeTab === "ongoing"
              ? <Clock size={36} color="#00B8B8" style={{ opacity: 0.35 }} />
              : <CheckCircle2 size={36} color="#00C864" style={{ opacity: 0.35 }} />
            }
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: isDark ? "#555" : "#AAA", margin: 0 }}>
              {activeTab === "ongoing"
                ? "You have no ongoing projects right now."
                : "No completed projects on record yet."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {list.map((p) => (
              <ProjectCard key={p.id} project={p} isDark={isDark} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
