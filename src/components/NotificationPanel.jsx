// ─────────────────────────────────────────────────────────────
//  src/components/NotificationPanel.jsx
//
//  Dropdown notification panel — used by both admin Layout
//  and EmployeeLayout.
//
//  Props:
//    notifications  : array of notification objects
//    onRead         : (notifId) => void   – mark one as read
//    onReadAll      : ()        => void   – mark all as read
//    onClose        : ()        => void   – close the panel
//    empId          : string              – current viewer's empId
//    isAdmin        : boolean             – admin sees all; employee sees read status
//    isDark         : boolean
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, BellOff, CheckCheck, Trash2,
  Megaphone, User, Building2, ChevronRight,
} from "lucide-react";
import { deleteNotification } from "../firebase/firestoreService";

const PRIORITY_COLORS = {
  high:   { dot: "#CC0000", bg: "rgba(204,0,0,0.08)",   border: "rgba(204,0,0,0.18)"   },
  normal: { dot: "#00B8B8", bg: "rgba(0,184,184,0.07)", border: "rgba(0,184,184,0.15)" },
  low:    { dot: "#888888", bg: "transparent",           border: "transparent"           },
};

const TYPE_ICONS = {
  all:        { icon: Megaphone,  color: "#C9922A" },
  employee:   { icon: User,       color: "#00B8B8" },
  department: { icon: Building2,  color: "#6366F1" },
};

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationPanel({
  notifications, onRead, onReadAll, onClose,
  empId, isAdmin, isDark,
}) {
  const panelRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const cardBg   = isDark ? "#111111" : "#FFFFFF";
  const border   = isDark ? "#1E1E1E" : "#E8E8E8";
  const textPri  = isDark ? "#F0F0F0" : "#111111";
  const textMut  = isDark ? "#555555" : "#999999";
  const hoverBg  = isDark ? "#161616" : "#F8F8F8";

  const unreadCount = isAdmin ? 0 : notifications.filter(
    (n) => !(n.readBy || []).includes(empId)
  ).length;

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  const handleItemClick = (n) => {
    if (!isAdmin) onRead(n.id);
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 0,
        width: "340px",
        maxWidth: "calc(100vw - 24px)",
        background: isDark ? "#0E0E0E" : "#F4F4F4",
        border: `1px solid ${border}`,
        borderRadius: "12px",
        boxShadow: isDark
          ? "0 16px 48px rgba(0,0,0,0.7)"
          : "0 16px 48px rgba(0,0,0,0.13)",
        zIndex: 999,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        maxHeight: "480px",
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding: "12px 14px",
        background: cardBg,
        borderBottom: `1px solid ${border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Bell size={15} color="#CC0000" />
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "14px", color: textPri }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span style={{
              padding: "1px 7px", borderRadius: "20px",
              background: "rgba(204,0,0,0.12)", border: "1px solid rgba(204,0,0,0.25)",
              fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, color: "#CC0000",
            }}>
              {unreadCount} new
            </span>
          )}
        </div>
        {!isAdmin && unreadCount > 0 && (
          <button
            onClick={onReadAll}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "4px 8px", borderRadius: "6px", border: "none",
              background: "transparent", cursor: "pointer",
              fontFamily: "Mulish, sans-serif", fontSize: "11px", color: "#00B8B8",
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,184,184,0.08)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            title="Mark all as read"
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
        )}
      </div>

      {/* ── List ── */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {notifications.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "40px 24px", gap: "10px",
          }}>
            <BellOff size={28} color={isDark ? "#222" : "#DDD"} />
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMut, margin: 0 }}>
              No notifications yet
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const isUnread = !isAdmin && !(n.readBy || []).includes(empId);
            const priority = PRIORITY_COLORS[n.priority] || PRIORITY_COLORS.normal;
            const typeInfo = TYPE_ICONS[n.type]   || TYPE_ICONS.all;
            const TypeIcon = typeInfo.icon;

            return (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                style={{
                  padding: "11px 14px",
                  borderBottom: `1px solid ${isDark ? "#141414" : "#F0F0F0"}`,
                  cursor: isAdmin ? "default" : "pointer",
                  background: isUnread ? (isDark ? "#131313" : "#FAFAFA") : "transparent",
                  transition: "background 150ms",
                  display: "flex", gap: "10px", alignItems: "flex-start",
                  position: "relative",
                }}
                onMouseEnter={(e) => { if (!isAdmin) e.currentTarget.style.background = hoverBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isUnread ? (isDark ? "#131313" : "#FAFAFA") : "transparent"; }}
              >
                {/* Unread dot */}
                {isUnread && (
                  <span style={{
                    position: "absolute", left: "5px", top: "50%", transform: "translateY(-50%)",
                    width: "5px", height: "5px", borderRadius: "50%", background: "#CC0000", flexShrink: 0,
                  }} />
                )}

                {/* Type icon */}
                <div style={{
                  width: "30px", height: "30px", borderRadius: "8px", flexShrink: 0,
                  background: `${typeInfo.color}14`, border: `1px solid ${typeInfo.color}28`,
                  display: "flex", alignItems: "center", justifyContent: "center", marginTop: "1px",
                }}>
                  <TypeIcon size={13} color={typeInfo.color} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px" }}>
                    <p style={{
                      fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: isUnread ? 700 : 500,
                      color: textPri, margin: 0, lineHeight: 1.4, flex: 1,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {n.title}
                    </p>
                    {/* Priority dot */}
                    {n.priority !== "low" && (
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: priority.dot, flexShrink: 0, marginTop: "4px" }} />
                    )}
                  </div>
                  <p style={{
                    fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMut,
                    margin: "3px 0 0", lineHeight: 1.5,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {n.message}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "5px" }}>
                    <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMut }}>
                      {timeAgo(n.createdAt)}
                    </span>
                    {n.createdBy && (
                      <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: isDark ? "#3A3A3A" : "#CCC" }}>
                        · {n.createdBy}
                      </span>
                    )}
                    {/* Target tag */}
                    {n.type !== "all" && n.targetId && (
                      <span style={{
                        fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
                        color: typeInfo.color, letterSpacing: "0.08em",
                        background: `${typeInfo.color}12`, padding: "1px 5px", borderRadius: "4px",
                      }}>
                        {n.type === "department" ? n.targetId : "YOU"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Admin delete button */}
                {isAdmin && (
                  <button
                    onClick={(e) => handleDelete(e, n.id)}
                    style={{
                      flexShrink: 0, width: "24px", height: "24px", borderRadius: "5px",
                      border: "none", background: "transparent", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: isDark ? "#333" : "#CCC", transition: "all 150ms",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#CC0000"; e.currentTarget.style.background = "rgba(204,0,0,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "#333" : "#CCC"; e.currentTarget.style.background = "transparent"; }}
                    title="Delete notification"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer — admin shortcut ── */}
      {isAdmin && (
        <div style={{
          padding: "10px 14px",
          borderTop: `1px solid ${border}`,
          background: cardBg, flexShrink: 0,
        }}>
          <a
            href="/notifications"
            onClick={(e) => { e.preventDefault(); navigate("/notifications"); onClose(); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700,
              color: "#CC0000", textDecoration: "none", letterSpacing: "0.08em",
            }}
          >
            MANAGE NOTIFICATIONS
            <ChevronRight size={14} />
          </a>
        </div>
      )}
    </div>
  );
}