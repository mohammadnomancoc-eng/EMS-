// ─────────────────────────────────────────────────────────────
//  src/components/EmployeeLayout.jsx  (Fully Responsive)
//
//  Mobile (<768px):
//   • Sidebar hidden by default, slides in from left on hamburger tap
//   • Dim backdrop closes sidebar on tap-outside
//   • X close button inside sidebar header
//   • Body scroll locked while drawer is open
//   • Sidebar auto-closes on route change
//
//  Desktop (≥768px):
//   • Sidebar permanently visible, fixed left
//   • Header and main content offset by SIDEBAR_W
//   • Full breadcrumb and controls visible
//
//  Bug fixes preserved: BUG-01, BUG-08, BUG-09, BUG-10
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../App";
import {
  CalendarCheck, CalendarOff, User,
  Megaphone, LogOut, Sun, Moon, Bell, Menu, X,
} from "lucide-react";
import { logoutUser } from "../firebase/authService";
import { getLeaveRequestsByEmployee } from "../firebase/firestoreService";

const SIDEBAR_W        = 252; // desktop
const SIDEBAR_W_TABLET = 220; // 768–1023px

// Monthly quota limits — must match MyLeave.jsx constants
const LEAVE_QUOTA = 2;
const WFH_QUOTA   = 2;

const navItems = [
  { to: "/my-attendance", icon: CalendarCheck, label: "My Attendance", section: "WORKSPACE" },
  { to: "/my-leave",      icon: CalendarOff,   label: "Leave & WFH",   section: "WORKSPACE" },
  { to: "/my-profile",    icon: User,          label: "My Profile",    section: "PERSONAL"  },
  { to: "/announcements", icon: Megaphone,     label: "Announcements", section: "COMPANY"   },
];

const pageTitles = {
  "/my-attendance": { title: "My Attendance", crumb: "WORKSPACE / ATTENDANCE"  },
  "/my-leave":      { title: "Leave & WFH",   crumb: "WORKSPACE / LEAVE & WFH" },
  "/my-profile":    { title: "My Profile",    crumb: "PERSONAL / PROFILE"      },
  "/announcements": { title: "Announcements", crumb: "COMPANY / ANNOUNCEMENTS" },
};

// ── Helpers ───────────────────────────────────────────────────
function getStoredUser() {
  try {
    const raw = localStorage.getItem("rwt-user");
    return raw
      ? JSON.parse(raw)
      : { name: "Employee", role: "Staff", initials: "EM", empId: null };
  } catch {
    return { name: "Employee", role: "Staff", initials: "EM", empId: null };
  }
}

function countThisMonth(requests, type) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();
  return requests.filter((r) => {
    const d = new Date(r.from || r.createdAt?.toDate?.() || 0);
    return d.getFullYear() === y && d.getMonth() === m && r.requestType === type;
  }).length;
}

// ── Quota Bar ─────────────────────────────────────────────────
function QuotaBar({ label, taken, total, color }) {
  const remaining = total - taken;
  const pct       = total > 0 ? Math.round((taken / total) * 100) : 0;
  return (
    <div style={{ marginBottom: "12px" }}>
      <div className="flex justify-between items-center mb-1">
        <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: "#888888" }}>
          {label}
        </span>
        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color }}>
          {remaining}/{total}
        </span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: "4px", background: "#DDDDDD" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color, transition: "width 600ms ease" }}
        />
      </div>
      <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: "#888888", marginTop: "2px" }}>
        {taken} used · {remaining} left
      </p>
    </div>
  );
}

// ── Employee Sidebar ──────────────────────────────────────────
function EmployeeSidebar({ open, onClose }) {
  const navigate  = useNavigate();
  const { theme } = useTheme();
  const isDark    = theme === "dark";
  const user      = getStoredUser();

  // BUG-10 FIX: fetch real monthly quota from Firestore
  const [leaveTaken,  setLeaveTaken]  = useState(0);
  const [wfhTaken,    setWfhTaken]    = useState(0);
  const [quotaLoaded, setQuotaLoaded] = useState(false);

  useEffect(() => {
    if (!user.empId) { setQuotaLoaded(true); return; }
    getLeaveRequestsByEmployee(user.empId)
      .then((requests) => {
        setLeaveTaken(countThisMonth(requests, "Leave"));
        setWfhTaken(countThisMonth(requests, "WFH"));
        setQuotaLoaded(true);
      })
      .catch(() => setQuotaLoaded(true));
  }, [user.empId]);

  // BUG-01 FIX: call Firebase signOut before clearing localStorage
  const handleLogout = async () => {
    try { await logoutUser(); } catch (err) { console.warn("SignOut error:", err.message); }
    finally {
      localStorage.removeItem("rwt-role");
      localStorage.removeItem("rwt-user");
      navigate("/login");
    }
  };

  const sections = [...new Set(navItems.map((n) => n.section))];

  return (
    <>
      {/* ── Backdrop (mobile only) ── */}
      <div
        onClick={onClose}
        style={{
          position:             "fixed",
          inset:                0,
          background:           "rgba(0,0,0,0.65)",
          backdropFilter:       "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          zIndex:               49,
          opacity:              open ? 1 : 0,
          pointerEvents:        open ? "auto" : "none",
          transition:           "opacity 280ms ease",
        }}
        className="md:hidden"
      />

      {/* ── Sidebar panel ── */}
      <div
        className="emp-sidebar-panel"
        style={{
          position:      "fixed",
          left:          0,
          top:           0,
          height:        "100dvh",
          width:         `${SIDEBAR_W}px`, /* overridden to SIDEBAR_W_TABLET on tablet via CSS */
          background:    isDark ? "#050505" : "#FFFFFF",
          borderRight:   `1px solid ${isDark ? "#1A1A1A" : "#E0E0E0"}`,
          display:       "flex",
          flexDirection: "column",
          zIndex:        50,
          transform:     open ? "translateX(0)" : "translateX(-100%)",
          transition:    "transform 280ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Logo + Close */}
        <div
          className="flex items-center gap-3 px-4"
          style={{ height: "72px", borderBottom: `1px solid ${isDark ? "#1A1A1A" : "#E0E0E0"}`, flexShrink: 0 }}
        >
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{ width: "38px", height: "38px", border: "1px solid #CC0000" }}
          >
            <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#CC0000", fontWeight: 700, fontSize: "13px" }}>
              RWT
            </span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span style={{ fontFamily: "Rajdhani, sans-serif", color: isDark ? "#F0F0F0" : "#111111", fontWeight: 600, fontSize: "14px", lineHeight: 1.2 }}>
              Royals Webtech
            </span>
            <span style={{ fontFamily: "Mulish, sans-serif", color: isDark ? "#666666" : "#888888", fontSize: "11px", lineHeight: 1.2 }}>
              Pvt. Ltd.
            </span>
            <span style={{ fontFamily: "Share Tech Mono, monospace", color: "#00B8B8", fontSize: "8px", letterSpacing: "0.1em", marginTop: "2px" }}>
              OPTIMIZED FOR WORK
            </span>
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden flex-shrink-0"
            style={{ color: isDark ? "#555555" : "#AAAAAA", padding: "4px" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#CC0000")}
            onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? "#555555" : "#AAAAAA")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3" style={{ scrollbarWidth: "none" }}>
          {sections.map((section) => (
            <div key={section} className="mb-2">
              <div className="px-4 py-2" style={{ borderTop: `1px solid ${isDark ? "#1A1A1A" : "#EEEEEE"}` }}>
                <span style={{
                  fontFamily: "Rajdhani, sans-serif", color: "#CC0000",
                  fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
                }}>
                  {section}
                </span>
              </div>

              {navItems.filter((n) => n.section === section).map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  style={({ isActive }) => ({
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 13px 10px 16px", margin: "1px 6px", borderRadius: "6px",
                    textDecoration: "none",
                    borderLeft: isActive ? "3px solid #CC0000" : "3px solid transparent",
                    background:  isActive ? "rgba(204,0,0,0.06)" : "transparent",
                    transition:  "all 150ms ease",
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={18} style={{ color: isActive ? "#00B8B8" : (isDark ? "#333333" : "#AAAAAA"), flexShrink: 0 }} />
                      <span style={{
                        fontFamily: "Mulish, sans-serif", fontSize: "13px",
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? (isDark ? "#FFFFFF" : "#111111") : (isDark ? "#555555" : "#888888"),
                      }}>
                        {label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}

          {/* Monthly Quota Card — BUG-10 FIX: real Firestore counts */}
          <div className="mx-3 mt-4">
            <div
              className="rounded-lg p-3"
              style={{ background: isDark ? "#0D0D0D" : "#F5F5F5", border: `1px solid ${isDark ? "#1A1A1A" : "#E0E0E0"}` }}
            >
              <p style={{
                fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
                color: "#CC0000", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "10px",
              }}>
                THIS MONTH
              </p>
              {quotaLoaded ? (
                <>
                  <QuotaBar label="Leave" taken={leaveTaken} total={LEAVE_QUOTA} color="#CC0000" />
                  <QuotaBar label="WFH"   taken={wfhTaken}   total={WFH_QUOTA}   color="#00B8B8" />
                </>
              ) : (
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: isDark ? "#444444" : "#888888" }}>
                  Loading…
                </p>
              )}
            </div>
          </div>
        </nav>

        {/* User Card */}
        <div className="p-3" style={{ borderTop: `1px solid ${isDark ? "#1A1A1A" : "#E0E0E0"}`, flexShrink: 0 }}>
          <div
            className="rounded-lg p-3 flex items-center gap-3"
            style={{ background: isDark ? "#111111" : "#F5F5F5", border: `1px solid ${isDark ? "#1E1E1E" : "#E0E0E0"}` }}
          >
            <div
              className="rounded-full flex items-center justify-center flex-shrink-0"
              style={{ width: "34px", height: "34px", background: "#CC0000" }}
            >
              <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "12px" }}>
                {user.initials}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: "Rajdhani, sans-serif", color: isDark ? "#F0F0F0" : "#111111", fontWeight: 600, fontSize: "14px", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.name}
              </p>
              <p style={{ fontFamily: "Mulish, sans-serif", color: isDark ? "#666666" : "#888888", fontSize: "11px" }}>
                {user.role}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <div className="rounded-full" style={{ width: "6px", height: "6px", background: "#00B8B8" }} />
                <span style={{ fontFamily: "Mulish, sans-serif", color: "#00B8B8", fontSize: "10px" }}>Online</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{ color: isDark ? "#333333" : "#AAAAAA", transition: "color 150ms", flexShrink: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#CC0000")}
              onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? "#333333" : "#AAAAAA")}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Global responsive tweaks */}
      <style>{`
        /* Sidebar nav link active — no layout shift from left border */
        .emp-nav-link { border-left: 3px solid transparent; }
        /* Quota card: hide on very small sidebar */
        @media (max-width: 767px) {
          .emp-quota-card { display: none; }
        }
        }
      `}</style>

      {/* Desktop: always show sidebar */}
      <style>{`
        /* Tablet: sidebar narrower, always visible */
        @media (min-width: 768px) and (max-width: 1023px) {
          .emp-sidebar-panel {
            transform: translateX(0) !important;
            width: ${SIDEBAR_W_TABLET}px !important;
          }
        }
        /* Desktop: full width, always visible */
        @media (min-width: 1024px) {
          .emp-sidebar-panel {
            transform: translateX(0) !important;
            width: ${SIDEBAR_W}px !important;
          }
        }
      `}</style>
    </>
  );
}

// ── Employee Header ───────────────────────────────────────────
function EmployeeHeader({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const { pathname }           = useLocation();
  const page = pageTitles[pathname] || { title: "Employee Portal", crumb: "EMPLOYEE / PORTAL" };
  const user = getStoredUser();

  return (
    <div
      className="emp-header-bar"
      style={{
        position:    "fixed",
        top:         0,
        right:       0,
        left:        0,
        height:      "56px",
        background:  theme === "dark" ? "#0A0A0A" : "#FFFFFF",
        borderBottom:`1px solid ${theme === "dark" ? "#1E1E1E" : "#E0E0E0"}`,
        display:     "flex",
        alignItems:  "center",
        zIndex:      40,
        paddingLeft: "16px",
        paddingRight:"16px",
      }}
    >
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="md:hidden flex-shrink-0"
        style={{ color: theme === "dark" ? "#666666" : "#888888", marginRight: "12px" }}
      >
        <Menu size={20} />
      </button>

      {/* Page Title */}
      <div className="flex-1 min-w-0">
        <h1 style={{
          fontFamily:   "Rajdhani, sans-serif",
          fontWeight:   700,
          fontSize:     "clamp(15px, 2.5vw, 22px)",
          color:        theme === "dark" ? "#F0F0F0" : "#111111",
          lineHeight:   1,
          whiteSpace:   "nowrap",
          overflow:     "hidden",
          textOverflow: "ellipsis",
        }}>
          {page.title}
        </h1>
        <p
          className="hidden sm:block"
          style={{
            fontFamily: "Share Tech Mono, monospace",
            fontSize:   "10px",
            color:      theme === "dark" ? "#555555" : "#999999",
            marginTop:  "2px",
          }}
        >
          {page.crumb}
        </p>
      </div>

      {/* Right controls — shrink gracefully on tiny phones */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3" style={{ flexShrink: 0 }}>

        {/* Employee Portal Badge — hidden on small screens */}
        <span
          className="hidden sm:inline"
          style={{
            fontFamily:  "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
            color:       "#00B8B8", background: "rgba(0,184,184,0.08)",
            border:      "1px solid rgba(0,184,184,0.25)", borderRadius: "4px",
            padding:     "3px 10px", letterSpacing: "0.1em", whiteSpace: "nowrap",
          }}
        >
          EMPLOYEE PORTAL
        </span>

        {/* Bell */}
        <button className="relative" style={{ color: theme === "dark" ? "#555555" : "#888888" }}>
          <Bell size={18} />
          <span
            className="absolute -top-1 -right-1 rounded-full flex items-center justify-center"
            style={{ width: "14px", height: "14px", background: "#CC0000" }}
          >
            <span style={{ fontFamily: "Mulish, sans-serif", color: "#FFFFFF", fontSize: "8px", fontWeight: 700 }}>1</span>
          </span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-full"
          style={{
            background: theme === "dark" ? "#111111" : "#F0F0F0",
            border:     `1px solid ${theme === "dark" ? "#1E1E1E" : "#E0E0E0"}`,
            transition: "all 250ms ease",
          }}
        >
          {theme === "dark"
            ? <Sun  size={14} style={{ color: "#C9922A" }} />
            : <Moon size={14} style={{ color: "#555555" }} />
          }
        </button>

        {/* Avatar */}
        <div
          className="rounded-full flex items-center justify-center cursor-pointer flex-shrink-0"
          style={{
            width:     "32px", height: "32px", background: "#CC0000",
            border:    "2px solid #CC0000",
            boxShadow: `0 0 0 2px ${theme === "dark" ? "#0A0A0A" : "#FFFFFF"}`,
          }}
        >
          <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "11px" }}>
            {user.initials}
          </span>
        </div>
      </div>

      {/* Push header right of sidebar on md+ */}
      <style>{`
        /* Tablet: offset by tablet sidebar width */
        @media (min-width: 768px) and (max-width: 1023px) {
          .emp-header-bar {
            left: ${SIDEBAR_W_TABLET}px !important;
            padding-left:  20px !important;
            padding-right: 20px !important;
          }
        }
        /* Desktop: offset by full sidebar width */
        @media (min-width: 1024px) {
          .emp-header-bar {
            left: ${SIDEBAR_W}px !important;
            padding-left:  28px !important;
            padding-right: 28px !important;
          }
        }
      `}</style>
    </div>
  );
}


// ── Layout Wrapper ────────────────────────────────────────────
function EmployeeLayout() {
  const { theme }                     = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname }                  = useLocation();

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow  = sidebarOpen ? "hidden" : "";
    document.body.style.position  = sidebarOpen ? "fixed"  : "";
    document.body.style.width     = sidebarOpen ? "100%"   : "";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width    = "";
    };
  }, [sidebarOpen]);

  return (
    <div style={{ background: "var(--page-bg)", minHeight: "100vh" }}>
      <EmployeeSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <EmployeeHeader  onMenuClick={() => setSidebarOpen(true)} />

      <main
        className="emp-main-content"
        style={{
          paddingTop:    "56px",
          paddingBottom: "0",
          minHeight:     "100vh",
          background:    "var(--page-bg)",
        }}
      >
        {/* RWT Watermark */}
        <div
          className="fixed pointer-events-none select-none"
          style={{
            top: "56px", right: "0", bottom: "0", zIndex: 0, overflow: "hidden",
            fontFamily: "Rajdhani, sans-serif",
            fontSize:   "clamp(80px, 18vw, 280px)",
            fontWeight: 700,
            color:      theme === "dark" ? "#FFFFFF" : "#CCCCCC",
            opacity:    theme === "dark" ? 0.025 : 0.35,
            lineHeight: 1, letterSpacing: "-0.02em", userSelect: "none",
          }}
        >
          RWT
        </div>

        <div className="relative z-10 p-3 sm:p-5 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Desktop/Tablet: offset main content, remove bottom nav padding */}
      <style>{`
        /* Tablet */
        @media (min-width: 768px) and (max-width: 1023px) {
          .emp-main-content {
            margin-left:    ${SIDEBAR_W_TABLET}px;
            padding-bottom: 0;
          }
        }
        /* Desktop */
        @media (min-width: 1024px) {
          .emp-main-content {
            margin-left:    ${SIDEBAR_W}px;
            padding-bottom: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default EmployeeLayout;