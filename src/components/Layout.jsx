// ─────────────────────────────────────────────────────────────
//  src/components/Layout.jsx  (Admin — Fully Responsive)
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
//   • Full search bar, breadcrumb, avatar visible
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../App";
import {
  LayoutDashboard, Users, CalendarCheck, CalendarOff,
  Building2, Settings, LogOut,
  Bell, Sun, Moon, Search, Menu, X,
} from "lucide-react";
import { logoutUser } from "../firebase/authService";

const SIDEBAR_W = 252;

const navSections = [
  {
    label: "WORKSPACE",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    label: "PEOPLE",
    items: [
      { to: "/employees",  icon: Users,         label: "Employees"       },
      { to: "/attendance", icon: CalendarCheck,  label: "Attendance"      },
      { to: "/leave",      icon: CalendarOff,    label: "Leave Management" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { to: "/departments", icon: Building2, label: "Departments" },
      { to: "/settings",    icon: Settings,  label: "Settings"   },
    ],
  },
];

// Flat list for the bottom mobile nav (only show key pages)
const pageTitles = {
  "/dashboard":   { title: "Dashboard",       crumb: "WORKSPACE / DASHBOARD"  },
  "/employees":   { title: "Employees",        crumb: "PEOPLE / EMPLOYEES"     },
  "/attendance":  { title: "Attendance",       crumb: "PEOPLE / ATTENDANCE"    },
  "/leave":       { title: "Leave Management", crumb: "PEOPLE / LEAVE"         },
  "/departments": { title: "Departments",      crumb: "SYSTEM / DEPARTMENTS"   },
  "/settings":    { title: "Settings",         crumb: "SYSTEM / SETTINGS"      },
};

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ open, onClose }) {
  const navigate   = useNavigate();
  const { theme }  = useTheme();
  const isDark     = theme === "dark";

  const handleLogout = async () => {
    try { await logoutUser(); } catch (_) {}
    localStorage.removeItem("rwt-role");
    localStorage.removeItem("rwt-user");
    navigate("/login");
  };

  const userRaw = localStorage.getItem("rwt-user");
  const user    = userRaw ? JSON.parse(userRaw) : { initials: "AD", name: "Admin" };

  return (
    <>
      {/* ── Backdrop (mobile only) ── */}
      <div
        onClick={onClose}
        style={{
          position:            "fixed",
          inset:               0,
          background:          "rgba(0,0,0,0.65)",
          backdropFilter:      "blur(2px)",
          WebkitBackdropFilter:"blur(2px)",
          zIndex:              49,
          opacity:             open ? 1 : 0,
          pointerEvents:       open ? "auto" : "none",
          transition:          "opacity 280ms ease",
        }}
        className="md:hidden"
      />

      {/* ── Sidebar panel ── */}
      <div
        className="admin-sidebar-panel"
        style={{
          position:        "fixed",
          left:            0,
          top:             0,
          height:          "100dvh",
          width:           `${SIDEBAR_W}px`,
          background:      isDark ? "#050505" : "#FFFFFF",
          borderRight:     `1px solid ${isDark ? "#1A1A1A" : "#E0E0E0"}`,
          display:         "flex",
          flexDirection:   "column",
          zIndex:          50,
          // Mobile: slide in/out. Desktop: always visible (overridden by CSS below)
          transform:       open ? "translateX(0)" : "translateX(-100%)",
          transition:      "transform 280ms cubic-bezier(0.4,0,0.2,1)",
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
          {navSections.map((section) => (
            <div key={section.label} className="mb-2">
              <div
                className="px-4 py-2"
                style={{ borderTop: `1px solid ${isDark ? "#1A1A1A" : "#EEEEEE"}` }}
              >
                <span style={{
                  fontFamily: "Rajdhani, sans-serif", color: "#CC0000",
                  fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
                }}>
                  {section.label}
                </span>
              </div>

              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  style={({ isActive }) => ({
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 16px", margin: "1px 6px", borderRadius: "6px",
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
                {user.initials || "AD"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: "Rajdhani, sans-serif", color: isDark ? "#F0F0F0" : "#111111", fontWeight: 600, fontSize: "14px", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.name || "Admin"}
              </p>
              <p style={{ fontFamily: "Mulish, sans-serif", color: isDark ? "#666666" : "#888888", fontSize: "11px" }}>
                Super Admin
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

      {/* Desktop: always show sidebar */}
      <style>{`
        @media (min-width: 768px) {
          .admin-sidebar-panel {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </>
  );
}

// ── Header ────────────────────────────────────────────────────
function Header({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const [search,     setSearch]     = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const { pathname } = useLocation();
  const page = pageTitles[pathname] || { title: "Dashboard", crumb: "WORKSPACE / DASHBOARD" };

  const userRaw = localStorage.getItem("rwt-user");
  const user    = userRaw ? JSON.parse(userRaw) : { initials: "AD" };

  return (
    <div
      className="admin-header-bar"
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

      {/* Page title + breadcrumb */}
      <div className="flex-1 min-w-0">
        <h1 style={{
          fontFamily:    "Rajdhani, sans-serif",
          fontWeight:    700,
          fontSize:      "clamp(15px, 2.5vw, 22px)",
          color:         theme === "dark" ? "#F0F0F0" : "#111111",
          lineHeight:    1,
          whiteSpace:    "nowrap",
          overflow:      "hidden",
          textOverflow:  "ellipsis",
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

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Search — desktop */}
        <div className="relative hidden sm:block">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#666666" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="outline-none text-xs pl-8 pr-14 py-2 rounded-md"
            style={{
              width:      "clamp(130px, 16vw, 220px)",
              background: theme === "dark" ? "#111111" : "#F5F5F5",
              border:     `1px solid ${theme === "dark" ? "#1E1E1E" : "#E0E0E0"}`,
              color:      theme === "dark" ? "#F0F0F0" : "#111111",
              fontFamily: "Mulish, sans-serif",
            }}
            onFocus={(e) => { e.target.style.border = "1px solid #00B8B8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)"; }}
            onBlur={(e)  => { e.target.style.border = `1px solid ${theme === "dark" ? "#1E1E1E" : "#E0E0E0"}`; e.target.style.boxShadow = "none"; }}
          />
          <span
            className="absolute right-2 top-1/2 -translate-y-1/2 px-1 rounded"
            style={{
              fontFamily: "Share Tech Mono, monospace", fontSize: "9px", color: "#555555",
              background: theme === "dark" ? "#1A1A1A" : "#E8E8E8",
              border:     `1px solid ${theme === "dark" ? "#252525" : "#D8D8D8"}`,
            }}
          >
            ⌘K
          </span>
        </div>

        {/* Search toggle — mobile */}
        <button
          className="sm:hidden"
          onClick={() => setSearchOpen((v) => !v)}
          style={{ color: theme === "dark" ? "#555555" : "#888888" }}
        >
          {searchOpen ? <X size={18} /> : <Search size={18} />}
        </button>

        {/* Bell */}
        <button className="relative" style={{ color: theme === "dark" ? "#555555" : "#888888" }}>
          <Bell size={18} />
          <span
            className="absolute -top-1 -right-1 rounded-full flex items-center justify-center"
            style={{ width: "14px", height: "14px", background: "#CC0000" }}
          >
            <span style={{ fontFamily: "Mulish, sans-serif", color: "#FFFFFF", fontSize: "8px", fontWeight: 700 }}>3</span>
          </span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-full"
          style={{
            background:  theme === "dark" ? "#111111" : "#F0F0F0",
            border:      `1px solid ${theme === "dark" ? "#1E1E1E" : "#E0E0E0"}`,
            transition:  "all 250ms ease",
          }}
          title="Toggle theme"
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
            width:  "32px", height: "32px", background: "#CC0000",
            border: "2px solid #CC0000",
            boxShadow: `0 0 0 2px ${theme === "dark" ? "#0A0A0A" : "#FFFFFF"}`,
          }}
        >
          <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "11px" }}>
            {user.initials || "AD"}
          </span>
        </div>
      </div>

      {/* Mobile search dropdown */}
      {searchOpen && (
        <div
          className="sm:hidden"
          style={{
            position:    "absolute",
            top:         "100%",
            left:        0,
            right:       0,
            padding:     "8px 16px",
            background:  theme === "dark" ? "#0A0A0A" : "#FFFFFF",
            borderBottom:`1px solid ${theme === "dark" ? "#1E1E1E" : "#E0E0E0"}`,
            zIndex:      39,
          }}
        >
          <div className="relative">
            <Search size={13} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#666666" }} />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              style={{
                width:       "100%",
                paddingLeft: "32px", paddingRight: "12px",
                paddingTop:  "8px",  paddingBottom: "8px",
                borderRadius:"6px",  outline: "none", fontSize: "12px",
                background:  theme === "dark" ? "#111111" : "#F5F5F5",
                border:      "1px solid #00B8B8",
                boxShadow:   "0 0 0 3px rgba(0,184,184,0.1)",
                color:       theme === "dark" ? "#F0F0F0" : "#111111",
                fontFamily:  "Mulish, sans-serif",
              }}
            />
          </div>
        </div>
      )}

      {/* Push header right of sidebar on md+ */}
      <style>{`
        @media (min-width: 768px) {
          .admin-header-bar {
            left: ${SIDEBAR_W}px !important;
            padding-left:  24px !important;
            padding-right: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Layout Wrapper ────────────────────────────────────────────
function Layout() {
  const { theme }                         = useTheme();
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const { pathname }                      = useLocation();

  // Close sidebar on route change (mobile UX)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <div style={{ background: "var(--page-bg)", minHeight: "100vh" }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header  onMenuClick={() => setSidebarOpen(true)} />

      <main
        className="admin-main-content"
        style={{
          paddingTop:    "56px",
          // On mobile add bottom padding so content isn't hidden behind bottom nav
          paddingBottom: "0",
          minHeight:     "100vh",
          background:    "var(--page-bg)",
        }}
      >
        {/* RWT Watermark */}
        <div
          className="fixed pointer-events-none select-none"
          style={{
            top:        "56px",
            right:      "0",
            zIndex:     0,
            fontFamily: "Rajdhani, sans-serif",
            fontSize:   "clamp(80px, 18vw, 280px)",
            fontWeight: 700,
            color:      theme === "dark" ? "#FFFFFF" : "#CCCCCC",
            opacity:    theme === "dark" ? 0.025 : 0.35,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            userSelect: "none",
          }}
        >
          RWT
        </div>

        <div className="relative z-10 p-4 sm:p-6">
          <Outlet />
        </div>
      </main>


      {/* Desktop: offset main content right of sidebar, remove bottom padding */}
      <style>{`
        @media (min-width: 768px) {
          .admin-main-content {
            margin-left:   ${SIDEBAR_W}px;
            padding-bottom: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Layout;