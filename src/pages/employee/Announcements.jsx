import { useState } from "react";
import { useTheme } from "../../App";
import {
  Megaphone, Bell, Shield, Briefcase,
  Star, ChevronDown, ChevronUp, Pin,
  Calendar, Tag,
} from "lucide-react";

// ── Mock Announcements ────────────────────────────────
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

// ── Category Config ───────────────────────────────────
const categoryConfig = {
  Holiday:    { color: "#00B8B8", bg: "rgba(0,184,184,0.10)",  border: "rgba(0,184,184,0.30)",  icon: Star },
  HR:         { color: "#C9922A", bg: "rgba(201,146,42,0.10)", border: "rgba(201,146,42,0.30)", icon: Briefcase },
  Policy:     { color: "#CC0000", bg: "rgba(204,0,0,0.10)",    border: "rgba(204,0,0,0.30)",    icon: Shield },
  Facilities: { color: "#A0A0A0", bg: "rgba(160,160,160,0.10)",border: "rgba(160,160,160,0.30)",icon: Tag },
  Events:     { color: "#00B8B8", bg: "rgba(0,184,184,0.10)",  border: "rgba(0,184,184,0.30)",  icon: Bell },
  IT:         { color: "#C9922A", bg: "rgba(201,146,42,0.10)", border: "rgba(201,146,42,0.30)", icon: Tag },
};

const priorityDot = { high: "#CC0000", medium: "#C9922A", low: "#00B8B8" };

const categories = ["All", ...Object.keys(categoryConfig)];

// ── Announcement Card ─────────────────────────────────
function AnnouncementCard({ item, theme }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = categoryConfig[item.category] || categoryConfig.Facilities;
  const CatIcon = cfg.icon;

  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";
  const subBg     = theme === "dark" ? "#0D0D0D" : "#F8F8F8";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: surface,
        border: `1px solid ${expanded ? "#CC0000" : border}`,
        boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 200ms",
      }}
    >
      {/* Priority bar */}
      <div style={{ height: "3px", background: priorityDot[item.priority] }} />

      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start gap-3">
          {/* Category icon */}
          <div className="rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ width: "40px", height: "40px", background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            <CatIcon size={18} style={{ color: cfg.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {item.pinned && (
                <span className="flex items-center gap-1"
                  style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#C9922A", letterSpacing: "0.15em" }}>
                  <Pin size={10} /> PINNED
                </span>
              )}
              <span style={{
                fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 600,
                color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
                borderRadius: "4px", padding: "1px 8px",
              }}>
                {item.category}
              </span>
              <span style={{
                fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 600,
                color: priorityDot[item.priority],
                background: `${priorityDot[item.priority]}18`,
                border: `1px solid ${priorityDot[item.priority]}55`,
                borderRadius: "4px", padding: "1px 8px", textTransform: "uppercase",
              }}>
                {item.priority}
              </span>
            </div>

            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "17px", fontWeight: 700, color: textPri, lineHeight: 1.3 }}>
              {item.title}
            </h3>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1"
                style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>
                <Calendar size={11} />
                {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span style={{ color: theme === "dark" ? "#333" : "#DDD" }}>·</span>
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>
                {item.author} <span style={{ color: theme === "dark" ? "#444" : "#BBB" }}>({item.authorRole})</span>
              </span>
            </div>
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex-shrink-0 rounded-lg flex items-center justify-center"
            style={{
              width: "32px", height: "32px",
              background: expanded ? "rgba(204,0,0,0.08)" : subBg,
              border: `1px solid ${expanded ? "rgba(204,0,0,0.3)" : border}`,
              color: expanded ? "#CC0000" : textMuted,
              cursor: "pointer", transition: "all 150ms",
            }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Expanded body */}
        {expanded && (
          <div className="mt-4 rounded-xl p-4"
            style={{ background: subBg, border: `1px solid ${border}` }}>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri, lineHeight: 1.8 }}>
              {item.body}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────
export default function Announcements() {
  const { theme } = useTheme();
  const [activeCategory, setActiveCategory] = useState("All");

  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";

  const pinned   = mockAnnouncements.filter((a) => a.pinned);
  const filtered = mockAnnouncements.filter(
    (a) => !a.pinned && (activeCategory === "All" || a.category === activeCategory)
  );

  return (
    <div className="flex flex-col gap-6">

      {/* ── Stats Row ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {[
          { label: "Total",    value: mockAnnouncements.length, color: "#F0F0F0", sub: "announcements" },
          { label: "Pinned",   value: mockAnnouncements.filter((a) => a.pinned).length,                         color: "#C9922A", sub: "must-read" },
          { label: "High",     value: mockAnnouncements.filter((a) => a.priority === "high").length,            color: "#CC0000", sub: "priority" },
          { label: "This Week",value: mockAnnouncements.filter((a) => new Date(a.date) >= new Date(Date.now() - 7 * 86400000)).length, color: "#00B8B8", sub: "new this week" },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="rounded-2xl p-5 flex flex-col gap-2"
            style={{
              background: surface, border: `1px solid ${border}`,
              boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
            }}>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em", textTransform: "uppercase" }}>{label}</p>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "42px", fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Pinned ── */}
      {pinned.length > 0 && (
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#C9922A", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px" }}>
            📌 PINNED
          </p>
          <div className="flex flex-col gap-3">
            {pinned.map((a) => <AnnouncementCard key={a.id} item={a} theme={theme} />)}
          </div>
        </div>
      )}

      {/* ── All Announcements ── */}
      <div>
        {/* Header + filter row */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            ALL ANNOUNCEMENTS
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((cat) => {
              const active = activeCategory === cat;
              const cfg = categoryConfig[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: active ? 700 : 500,
                    padding: "5px 14px", borderRadius: "20px", cursor: "pointer",
                    background: active ? (cfg ? cfg.bg : "rgba(204,0,0,0.08)") : "transparent",
                    border: `1px solid ${active ? (cfg ? cfg.border : "rgba(204,0,0,0.3)") : border}`,
                    color: active ? (cfg ? cfg.color : "#CC0000") : textMuted,
                    transition: "all 150ms",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl py-16 flex flex-col items-center gap-3"
            style={{ background: surface, border: `1px solid ${border}` }}>
            <Megaphone size={36} style={{ color: theme === "dark" ? "#333" : "#DDD" }} />
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textMuted }}>No announcements in this category.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((a) => <AnnouncementCard key={a.id} item={a} theme={theme} />)}
          </div>
        )}
      </div>
    </div>
  );
}