// ─────────────────────────────────────────────────────────────
//  src/pages/Notifications.jsx  —  Admin panel
//
//  Admin can:
//   • View all sent notifications (real-time)
//   • Create new notifications (to all / specific employee / department)
//   • Delete any notification
//   • See read receipts (how many employees have read)
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useTheme } from "../App";
import {
  Bell, Plus, X, Trash2, Megaphone,
  User, Building2, ChevronDown, Users,
  CheckCheck, Clock, Send,
} from "lucide-react";
import {
  subscribeAllNotifications,
  addNotification,
  deleteNotification,
  subscribeEmployees,
} from "../firebase/firestoreService";

// ── Helpers ────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function getAdminName() {
  try {
    const raw = localStorage.getItem("rwt-user");
    return raw ? JSON.parse(raw).name || "Admin" : "Admin";
  } catch { return "Admin"; }
}

const TYPE_CFG = {
  all:        { label: "Everyone",   icon: Megaphone,  color: "#C9922A" },
  employee:   { label: "Employee",   icon: User,       color: "#00B8B8" },
  department: { label: "Department", icon: Building2,  color: "#6366F1" },
};

const PRIORITY_CFG = {
  high:   { label: "High",   dot: "#CC0000" },
  normal: { label: "Normal", dot: "#00B8B8" },
  low:    { label: "Low",    dot: "#888888" },
};

// ── Create Modal ───────────────────────────────────────────────
function CreateModal({ isDark, employees, departments, onClose, onSend }) {
  const [title,      setTitle]      = useState("");
  const [message,    setMessage]    = useState("");
  const [type,       setType]       = useState("all");
  const [targetId,   setTargetId]   = useState("");
  const [priority,   setPriority]   = useState("normal");
  const [sending,    setSending]    = useState(false);

  const cardBg  = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const textPri = isDark ? "#F0F0F0" : "#111111";
  const textMut = isDark ? "#555" : "#999";

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: "7px",
    border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
    background: isDark ? "#1A1A1A" : "#F5F5F5",
    color: textPri, fontFamily: "Mulish, sans-serif", fontSize: "13px",
    outline: "none", boxSizing: "border-box",
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    if ((type === "employee" || type === "department") && !targetId) return;
    setSending(true);
    await onSend({ title: title.trim(), message: message.trim(), type, targetId: type === "all" ? null : targetId, priority, createdBy: getAdminName() });
    setSending(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "500px",
          background: cardBg, border: `1px solid ${border}`,
          borderRadius: "12px 12px 0 0", overflow: "hidden",
        }}
        className="sm:!rounded-xl"
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "8px", background: "rgba(204,0,0,0.10)", border: "1px solid rgba(204,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={15} color="#CC0000" />
            </div>
            <div>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: textPri, margin: 0 }}>Send Notification</p>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMut, margin: "2px 0 0" }}>Notify employees instantly</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: textMut, background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "60vh", overflowY: "auto" }}>

          {/* Audience type */}
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", display: "block", marginBottom: "8px" }}>SEND TO</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {Object.entries(TYPE_CFG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const active = type === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setType(key); setTargetId(""); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "7px 14px", borderRadius: "7px",
                      fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 600,
                      cursor: "pointer",
                      border: active ? `1px solid ${cfg.color}` : `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
                      background: active ? `${cfg.color}14` : "transparent",
                      color: active ? cfg.color : textMut,
                      transition: "all 150ms",
                    }}
                  >
                    <Icon size={13} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target selector */}
          {type === "employee" && (
            <div>
              <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", display: "block", marginBottom: "6px" }}>SELECT EMPLOYEE</label>
              <div style={{ position: "relative" }}>
                <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: textMut, pointerEvents: "none" }} />
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={{ ...inputStyle, paddingRight: "30px", appearance: "none", cursor: "pointer" }}>
                  <option value="">— Select employee —</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.department || "—"}</option>)}
                </select>
              </div>
            </div>
          )}

          {type === "department" && (
            <div>
              <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", display: "block", marginBottom: "6px" }}>SELECT DEPARTMENT</label>
              <div style={{ position: "relative" }}>
                <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: textMut, pointerEvents: "none" }} />
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={{ ...inputStyle, paddingRight: "30px", appearance: "none", cursor: "pointer" }}>
                  <option value="">— Select department —</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Priority */}
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", display: "block", marginBottom: "8px" }}>PRIORITY</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {Object.entries(PRIORITY_CFG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setPriority(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 14px", borderRadius: "7px",
                    fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 600,
                    cursor: "pointer",
                    border: priority === key ? `1px solid ${cfg.dot}` : `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
                    background: priority === key ? `${cfg.dot}14` : "transparent",
                    color: priority === key ? cfg.dot : textMut,
                    transition: "all 150ms",
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot }} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em", display: "block", marginBottom: "6px" }}>TITLE</label>
            <input
              type="text"
              placeholder="e.g. Office closed on Monday"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = "#00B8B8"}
              onBlur={(e) => e.target.style.borderColor = isDark ? "#2A2A2A" : "#E0E0E0"}
            />
          </div>

          {/* Message */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>MESSAGE</label>
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: message.length > 450 ? "#CC0000" : textMut }}>{message.length}/500</span>
            </div>
            <textarea
              placeholder="Write your notification message…"
              value={message}
              maxLength={500}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: "vertical", minHeight: "90px", lineHeight: "1.55" }}
              onFocus={(e) => e.target.style.borderColor = "#00B8B8"}
              onBlur={(e) => e.target.style.borderColor = isDark ? "#2A2A2A" : "#E0E0E0"}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${border}`, display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: "7px", fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 600, background: "transparent", border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`, color: textMut, cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim() || ((type === "employee" || type === "department") && !targetId)}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "8px 20px", borderRadius: "7px",
              fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 700,
              background: sending ? "#880000" : "#CC0000", border: "1px solid #CC0000",
              color: "#FFFFFF", cursor: sending ? "not-allowed" : "pointer",
              opacity: (!title.trim() || !message.trim() || ((type === "employee" || type === "department") && !targetId)) ? 0.45 : 1,
              transition: "all 150ms",
            }}
          >
            <Send size={14} />
            {sending ? "Sending…" : "Send Notification"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Notification Card ─────────────────────────────────────────
function NotifCard({ n, isDark, onDelete }) {
  const border  = isDark ? "#1A1A1A" : "#EBEBEB";
  const textPri = isDark ? "#F0F0F0" : "#111";
  const textMut = isDark ? "#555"    : "#999";
  const cfg     = TYPE_CFG[n.type]     || TYPE_CFG.all;
  const pcfg    = PRIORITY_CFG[n.priority] || PRIORITY_CFG.normal;
  const TypeIcon = cfg.icon;

  return (
    <div style={{
      background: isDark ? "#111111" : "#FFFFFF",
      border: `1px solid ${border}`,
      borderRadius: "10px",
      padding: "14px 16px",
      display: "flex", gap: "12px", alignItems: "flex-start",
    }}>
      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: "9px", flexShrink: 0,
        background: `${cfg.color}14`, border: `1px solid ${cfg.color}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <TypeIcon size={16} color={cfg.color} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", flexWrap: "wrap" }}>
          <p style={{ fontFamily: "Mulish, sans-serif", fontWeight: 700, fontSize: "13px", color: textPri, margin: 0, flex: 1 }}>
            {n.title}
          </p>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: pcfg.dot, letterSpacing: "0.08em" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: pcfg.dot }} />
              {pcfg.label}
            </span>
            {n.type !== "all" && (
              <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: cfg.color, background: `${cfg.color}12`, padding: "1px 6px", borderRadius: "4px", letterSpacing: "0.06em" }}>
                {n.type === "department" ? n.targetId : "INDIVIDUAL"}
              </span>
            )}
          </div>
        </div>

        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMut, margin: "5px 0 0", lineHeight: 1.6 }}>
          {n.message}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "8px", flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMut }}>
            <Clock size={10} /> {timeAgo(n.createdAt)}
          </span>
          {n.createdBy && (
            <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: isDark ? "#3A3A3A" : "#CCC" }}>
              by {n.createdBy}
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "Mulish, sans-serif", fontSize: "10px", color: "#00B8B8" }}>
            <CheckCheck size={11} color="#00B8B8" />
            {(n.readBy || []).length} read
          </span>
          {n.type === "all" && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#C9922A", letterSpacing: "0.05em" }}>
              <Users size={10} color="#C9922A" /> ALL EMPLOYEES
            </span>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(n.id)}
        style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: "6px",
          border: "none", background: "transparent", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: isDark ? "#2A2A2A" : "#DDD", transition: "all 150ms",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#CC0000"; e.currentTarget.style.background = "rgba(204,0,0,0.08)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "#2A2A2A" : "#DDD"; e.currentTarget.style.background = "transparent"; }}
        title="Delete notification"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function Notifications() {
  const { theme }  = useTheme();
  const isDark     = theme === "dark";

  const [notifications, setNotifications] = useState([]);
  const [employees,     setEmployees]     = useState([]);
  const [showCreate,    setShowCreate]    = useState(false);
  const [filterType,    setFilterType]    = useState("all_types");
  const [loading,       setLoading]       = useState(true);

  const cardBg  = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E8E8E8";
  const textPri = isDark ? "#F0F0F0" : "#111";
  const textMut = isDark ? "#555"    : "#999";

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeAllNotifications((list) => { setNotifications(list); setLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeEmployees((list) => setEmployees(list));
    return unsub;
  }, []);

  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))];

  const filtered = filterType === "all_types"
    ? notifications
    : notifications.filter((n) => n.type === filterType);

  const handleSend = async (data) => {
    try {
      await addNotification(data);
    } catch (err) {
      console.error("[Notifications] Failed to send notification:", err);
      alert("Failed to send notification. Please check your permissions.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
    } catch (err) {
      console.error("[Notifications] Failed to delete notification:", err);
      alert("Failed to delete notification. Please check your permissions.");
    }
  };

  const totalRead = notifications.reduce((acc, n) => acc + (n.readBy || []).length, 0);

  // Stat cards
  const StatCard = ({ label, value, color, icon: Icon }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", borderRadius: "10px", background: cardBg, border: `1px solid ${border}`, flex: "1 1 120px" }}>
      <div style={{ width: 36, height: 36, borderRadius: "9px", background: `${color}14`, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "22px", color, margin: 0, lineHeight: 1 }}>{value}</p>
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMut, margin: "2px 0 0" }}>{label}</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textPri, margin: 0 }}>Notifications</h2>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMut, margin: "3px 0 0" }}>
            Send and manage notifications for your employees
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "9px 16px", borderRadius: "8px",
            background: "#CC0000", border: "1px solid #CC0000",
            fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 700,
            color: "#FFFFFF", cursor: "pointer", transition: "background 150ms",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#AA0000"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#CC0000"}
        >
          <Plus size={15} />
          New Notification
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <StatCard label="Total Sent"    value={notifications.length} color="#CC0000"  icon={Bell}       />
        <StatCard label="To Everyone"   value={notifications.filter((n) => n.type === "all").length}        color="#C9922A"  icon={Megaphone}  />
        <StatCard label="Individual"    value={notifications.filter((n) => n.type === "employee").length}   color="#00B8B8"  icon={User}        />
        <StatCard label="Department"    value={notifications.filter((n) => n.type === "department").length} color="#6366F1"  icon={Building2}   />
        <StatCard label="Total Read"    value={totalRead}            color="#00C864"  icon={CheckCheck} />
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", padding: "10px 14px", background: cardBg, border: `1px solid ${border}`, borderRadius: "10px" }}>
        <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>FILTER</span>
        {[
          { key: "all_types", label: "All" },
          { key: "all",       label: "Everyone" },
          { key: "employee",  label: "Individual" },
          { key: "department",label: "Department" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterType(key)}
            style={{
              padding: "5px 14px", borderRadius: "20px",
              fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 600,
              cursor: "pointer", transition: "all 150ms",
              border: filterType === key ? "1px solid #CC0000" : `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`,
              background: filterType === key ? "rgba(204,0,0,0.10)" : "transparent",
              color: filterType === key ? "#CC0000" : textMut,
            }}
          >
            {label}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: textMut }}>
          {filtered.length} NOTIF{filtered.length !== 1 ? "S" : ""}
        </span>
      </div>

      {/* ── List ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMut }}>Loading notifications…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: "56px 24px", textAlign: "center",
            border: `1px dashed ${isDark ? "#1E1E1E" : "#E0E0E0"}`, borderRadius: "10px",
            background: isDark ? "#080808" : "#FAFAFA",
          }}>
            <Bell size={32} color={isDark ? "#222" : "#DDD"} style={{ margin: "0 auto 12px" }} />
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textMut, margin: 0 }}>
              No notifications sent yet.{" "}
              <span
                style={{ color: "#CC0000", cursor: "pointer", textDecoration: "underline" }}
                onClick={() => setShowCreate(true)}
              >
                Send one now
              </span>
            </p>
          </div>
        ) : (
          filtered.map((n) => (
            <NotifCard key={n.id} n={n} isDark={isDark} onDelete={handleDelete} />
          ))
        )}
      </div>

      {/* ── Create Modal ── */}
      {showCreate && (
        <CreateModal
          isDark={isDark}
          employees={employees}
          departments={departments}
          onClose={() => setShowCreate(false)}
          onSend={handleSend}
        />
      )}
    </div>
  );
}