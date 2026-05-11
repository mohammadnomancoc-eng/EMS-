import { useState, useEffect } from "react";
import { useTheme } from "../../App";
import {
  Megaphone, Bell, Shield, Briefcase,
  Star, ChevronDown, ChevronUp, Pin,
  Calendar, Tag, Filter,
} from "lucide-react";

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

// ── Mock Announcements ─────────────────────────────────────────
const mockAnnouncements = [
  {
    id: 1,
    title: "Office Closed on May 12 – Buddha Purnima",
    category: "Holiday",
    priority: "high",
    pinned: true,
    date: "2026-05-08",
    author: "Pooja Nair",
    authorRole: "HR Manager",
    body: "Dear Team, please note that our office will remain closed on Monday, May 12, 2026 on account of Buddha Purnima. Enjoy the long weekend! Normal operations resume on Tuesday, May 13. Any urgent matters should be escalated to your respective team leads via email.",
  },
  {
    id: 2,
    title: "Q2 Performance Review – Schedule Released",
    category: "HR",
    priority: "medium",
    pinned: true,
    date: "2026-05-06",
    author: "Pooja Nair",
    authorRole: "HR Manager",
    body: "The Q2 performance review cycle kicks off from May 20, 2026. Self-assessments are due by May 25. Manager reviews will be conducted between May 26–30. Please ensure your KPIs and project contributions are up to date in the portal before May 20.",
  },
  {
    id: 3,
    title: "New Leave Policy – Effective June 1, 2026",
    category: "Policy",
    priority: "high",
    pinned: false,
    date: "2026-05-05",
    author: "Sneha Patil",
    authorRole: "Project Manager",
    body: "Effective June 1, 2026, the company's leave policy will be updated. Monthly casual leave quota increases from 2 to 3 days. Carry-forward of unused leave is now capped at 12 days per year. Paternity leave is extended to 10 days. Full policy document will be shared by HR by May 15.",
  },
  {
    id: 4,
    title: "Office Renovation – 3rd Floor Temporarily Unavailable",
    category: "Facilities",
    priority: "medium",
    pinned: false,
    date: "2026-05-04",
    author: "Admin",
    authorRole: "Administration",
    body: "The 3rd floor will undergo renovation work from May 12–16, 2026. Teams currently seated on the 3rd floor (Engineering B and QA) will be temporarily relocated to the 2nd floor co-working spaces. Detailed seating maps will be circulated by May 10.",
  },
  {
    id: 5,
    title: "Team Outing – Vote for Your Preferred Date",
    category: "Events",
    priority: "low",
    pinned: false,
    date: "2026-05-02",
    author: "Pooja Nair",
    authorRole: "HR Manager",
    body: "We are planning a team outing for the month of June! Please fill in the Google Form shared on the company WhatsApp group to vote for your preferred date and activity. Deadline for voting is May 15. Your participation makes it more fun for everyone!",
  },
  {
    id: 6,
    title: "System Maintenance – Sunday May 17, 2026",
    category: "IT",
    priority: "medium",
    pinned: false,
    date: "2026-04-30",
    author: "Vikram Singh",
    authorRole: "DevOps Engineer",
    body: "Scheduled system maintenance will be carried out on Sunday, May 17, 2026 from 11:00 PM to 3:00 AM IST. All internal tools, the employee portal, and project management platforms may be intermittently unavailable during this window. Please plan accordingly.",
  },
];

// ── Category Config ────────────────────────────────────────────
const categoryConfig = {
  Holiday:    { color: "#00B8B8", bg: "rgba(0,184,184,0.10)",   border: "rgba(0,184,184,0.30)",   icon: Star      },
  HR:         { color: "#C9922A", bg: "rgba(201,146,42,0.10)",  border: "rgba(201,146,42,0.30)",  icon: Briefcase },
  Policy:     { color: "#CC0000", bg: "rgba(204,0,0,0.10)",     border: "rgba(204,0,0,0.30)",     icon: Shield    },
  Facilities: { color: "#A0A0A0", bg: "rgba(160,160,160,0.10)", border: "rgba(160,160,160,0.30)", icon: Tag       },
  Events:     { color: "#00B8B8", bg: "rgba(0,184,184,0.10)",   border: "rgba(0,184,184,0.30)",   icon: Bell      },
  IT:         { color: "#C9922A", bg: "rgba(201,146,42,0.10)",  border: "rgba(201,146,42,0.30)",  icon: Tag       },
};

const priorityDot = { high: "#CC0000", medium: "#C9922A", low: "#00B8B8" };
const categories  = ["All", ...Object.keys(categoryConfig)];

// ── Announcement Card ──────────────────────────────────────────
function AnnouncementCard({ item, theme, isMobile }) {
  const [expanded, setExpanded] = useState(false);
  const cfg     = categoryConfig[item.category] || categoryConfig.Facilities;
  const CatIcon = cfg.icon;

  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";
  const subBg     = theme === "dark" ? "#0D0D0D" : "#F8F8F8";

  return (
    <div
      style={{
        background: surface,
        border: `1px solid ${expanded ? "#CC0000" : border}`,
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 200ms",
      }}
    >
      {/* Priority bar */}
      <div style={{ height: "3px", background: priorityDot[item.priority] }} />

      <div style={{ padding: isMobile ? "14px" : "20px" }}>
        {/* Top row: icon + content + toggle */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>

          {/* Category icon — hide on very small screens to save space */}
          {!isMobile && (
            <div style={{
              width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: "2px",
            }}>
              <CatIcon size={18} style={{ color: cfg.color }} />
            </div>
          )}

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Badges row */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
              {/* On mobile, show the category icon inline with badges */}
              {isMobile && (
                <div style={{
                  width: "22px", height: "22px", borderRadius: "5px", flexShrink: 0,
                  background: cfg.bg, border: `1px solid ${cfg.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <CatIcon size={12} style={{ color: cfg.color }} />
                </div>
              )}

              {item.pinned && (
                <span style={{
                  display: "flex", alignItems: "center", gap: "3px",
                  fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
                  color: "#C9922A", letterSpacing: "0.15em",
                }}>
                  <Pin size={9} /> PINNED
                </span>
              )}

              <span style={{
                fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 600,
                color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
                borderRadius: "4px", padding: "1px 8px", whiteSpace: "nowrap",
              }}>
                {item.category}
              </span>

              <span style={{
                fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 600,
                color: priorityDot[item.priority],
                background: `${priorityDot[item.priority]}18`,
                border: `1px solid ${priorityDot[item.priority]}55`,
                borderRadius: "4px", padding: "1px 8px",
                textTransform: "uppercase", whiteSpace: "nowrap",
              }}>
                {item.priority}
              </span>
            </div>

            {/* Title */}
            <h3 style={{
              fontFamily: "Rajdhani, sans-serif",
              fontSize: isMobile ? "15px" : "17px",
              fontWeight: 700, color: textPri, lineHeight: 1.35,
              marginBottom: "6px",
            }}>
              {item.title}
            </h3>

            {/* Meta: date + author */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{
                display: "flex", alignItems: "center", gap: "4px",
                fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted,
              }}>
                <Calendar size={11} />
                {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span style={{ color: theme === "dark" ? "#333" : "#DDD" }}>·</span>
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>
                {item.author}
                {!isMobile && (
                  <span style={{ color: theme === "dark" ? "#444" : "#BBB" }}> ({item.authorRole})</span>
                )}
              </span>
            </div>
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded((p) => !p)}
            style={{
              width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
              background: expanded ? "rgba(204,0,0,0.08)" : subBg,
              border: `1px solid ${expanded ? "rgba(204,0,0,0.3)" : border}`,
              color: expanded ? "#CC0000" : textMuted,
              cursor: "pointer", transition: "all 150ms",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Expanded body */}
        {expanded && (
          <div style={{
            marginTop: "14px", borderRadius: "10px", padding: "14px",
            background: subBg, border: `1px solid ${border}`,
          }}>
            <p style={{
              fontFamily: "Mulish, sans-serif",
              fontSize: isMobile ? "13px" : "13px",
              color: textPri, lineHeight: 1.8,
            }}>
              {item.body}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function Announcements() {
  const { theme }  = useTheme();
  const isMobile   = useIsMobile();
  const [activeCategory, setActiveCategory] = useState("All");
  const [showFilterMenu,  setShowFilterMenu]  = useState(false);

  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";

  const pinned   = mockAnnouncements.filter((a) => a.pinned);
  const filtered = mockAnnouncements.filter(
    (a) => !a.pinned && (activeCategory === "All" || a.category === activeCategory)
  );

  const stats = [
    { label: "Total",     value: mockAnnouncements.length,                                                                             color: theme === "dark" ? "#F0F0F0" : "#111111", sub: "announcements"  },
    { label: "Pinned",    value: mockAnnouncements.filter((a) => a.pinned).length,                                                     color: "#C9922A", sub: "must-read"    },
    { label: "High",      value: mockAnnouncements.filter((a) => a.priority === "high").length,                                        color: "#CC0000", sub: "priority"     },
    { label: "This Week", value: mockAnnouncements.filter((a) => new Date(a.date) >= new Date(Date.now() - 7 * 86400000)).length,      color: "#00B8B8", sub: "new this week" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "16px" : "24px" }}>

      {/* ── Stat Cards — 2-col on mobile, 4-col on desktop ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: isMobile ? "10px" : "16px",
      }}>
        {stats.map(({ label, value, color, sub }) => (
          <div
            key={label}
            style={{
              background: surface, border: `1px solid ${border}`,
              borderRadius: "14px",
              padding: isMobile ? "14px" : "20px",
              display: "flex", flexDirection: "column", gap: isMobile ? "6px" : "8px",
              boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
            }}
          >
            <p style={{
              fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
              color: "#CC0000", letterSpacing: "0.2em", textTransform: "uppercase",
            }}>
              {label}
            </p>
            <p style={{
              fontFamily: "Rajdhani, sans-serif",
              fontSize: isMobile ? "34px" : "42px",
              fontWeight: 700, color, lineHeight: 1,
            }}>
              {value}
            </p>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>
              {sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── Pinned ── */}
      {pinned.length > 0 && (
        <div>
          <p style={{
            fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
            color: "#C9922A", letterSpacing: "0.2em", textTransform: "uppercase",
            marginBottom: "12px",
          }}>
            📌 PINNED
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pinned.map((a) => (
              <AnnouncementCard key={a.id} item={a} theme={theme} isMobile={isMobile} />
            ))}
          </div>
        </div>
      )}

      {/* ── All Announcements ── */}
      <div>
        {/* Header + filter row */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "14px",
        }}>
          <p style={{
            fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
            color: "#CC0000", letterSpacing: "0.2em", textTransform: "uppercase",
            flexShrink: 0,
          }}>
            ALL ANNOUNCEMENTS
          </p>

          {/* ── MOBILE: dropdown filter ── */}
          {isMobile ? (
            <div style={{ position: "relative", width: "100%" }}>
              <button
                onClick={() => setShowFilterMenu((p) => !p)}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: "8px",
                  padding: "9px 14px", borderRadius: "8px", cursor: "pointer",
                  background: surface, border: `1px solid ${showFilterMenu ? "#CC0000" : border}`,
                  fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: 600,
                  color: textPri,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <Filter size={13} style={{ color: "#CC0000" }} />
                  {activeCategory === "All" ? "All Categories" : activeCategory}
                </span>
                {showFilterMenu ? <ChevronUp size={14} style={{ color: textMuted }} /> : <ChevronDown size={14} style={{ color: textMuted }} />}
              </button>

              {showFilterMenu && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                  background: surface, border: `1px solid ${border}`,
                  borderRadius: "10px", zIndex: 50,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                  overflow: "hidden",
                }}>
                  {categories.map((cat, idx) => {
                    const active = activeCategory === cat;
                    const cfg    = categoryConfig[cat];
                    const CatIcon = cfg?.icon;
                    return (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setShowFilterMenu(false); }}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: "10px",
                          padding: "11px 14px", cursor: "pointer",
                          background: active ? (cfg ? cfg.bg : "rgba(204,0,0,0.06)") : "transparent",
                          border: "none",
                          borderBottom: idx < categories.length - 1 ? `1px solid ${theme === "dark" ? "#1A1A1A" : "#F0F0F0"}` : "none",
                          color: active ? (cfg ? cfg.color : "#CC0000") : textPri,
                          fontFamily: "Mulish, sans-serif", fontSize: "13px",
                          fontWeight: active ? 700 : 400,
                          textAlign: "left",
                        }}
                      >
                        {CatIcon && (
                          <div style={{
                            width: "24px", height: "24px", borderRadius: "5px", flexShrink: 0,
                            background: cfg.bg, border: `1px solid ${cfg.border}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <CatIcon size={12} style={{ color: cfg.color }} />
                          </div>
                        )}
                        {!CatIcon && (
                          <div style={{
                            width: "24px", height: "24px", borderRadius: "5px", flexShrink: 0,
                            background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <Megaphone size={12} style={{ color: "#CC0000" }} />
                          </div>
                        )}
                        {cat}
                        {active && (
                          <span style={{
                            marginLeft: "auto",
                            width: "6px", height: "6px", borderRadius: "50%",
                            background: cfg ? cfg.color : "#CC0000",
                            flexShrink: 0,
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── DESKTOP: pill chips ── */
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {categories.map((cat) => {
                const active = activeCategory === cat;
                const cfg    = categoryConfig[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      fontFamily: "Mulish, sans-serif", fontSize: "12px",
                      fontWeight: active ? 700 : 500,
                      padding: "5px 14px", borderRadius: "20px", cursor: "pointer",
                      background: active ? (cfg ? cfg.bg : "rgba(204,0,0,0.08)") : "transparent",
                      border: `1px solid ${active ? (cfg ? cfg.border : "rgba(204,0,0,0.3)") : border}`,
                      color: active ? (cfg ? cfg.color : "#CC0000") : textMuted,
                      transition: "all 150ms",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Announcement list or empty state */}
        {filtered.length === 0 ? (
          <div style={{
            borderRadius: "14px", padding: "64px 20px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
            background: surface, border: `1px solid ${border}`,
          }}>
            <Megaphone size={36} style={{ color: theme === "dark" ? "#333" : "#DDD" }} />
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textMuted }}>
              No announcements in this category.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map((a) => (
              <AnnouncementCard key={a.id} item={a} theme={theme} isMobile={isMobile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}