import { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../App";
import {
  LayoutDashboard, Users, CalendarCheck, CalendarOff,
  Building2, Settings, LogOut,
  Bell, Sun, Moon, Search,
} from "lucide-react";
import { logoutUser } from "../firebase/authService";

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
      { to: "/employees", icon: Users, label: "Employees" },
      { to: "/attendance", icon: CalendarCheck, label: "Attendance" },
      { to: "/leave", icon: CalendarOff, label: "Leave Management" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { to: "/departments", icon: Building2, label: "Departments" },
      { to: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

const pageTitles = {
  "/dashboard":  { title: "Dashboard",       crumb: "WORKSPACE / DASHBOARD" },
  "/employees":  { title: "Employees",        crumb: "PEOPLE / EMPLOYEES" },
  "/attendance": { title: "Attendance",       crumb: "PEOPLE / ATTENDANCE" },
  "/leave":      { title: "Leave Management", crumb: "PEOPLE / LEAVE" },
  "/departments":{ title: "Departments",      crumb: "SYSTEM / DEPARTMENTS" },
  "/settings":   { title: "Settings",         crumb: "SYSTEM / SETTINGS" },
};

// ── Sidebar ───────────────────────────────────────────
function Sidebar() {
  const navigate = useNavigate();

  // BUG-09 FIX: read real admin name/initials saved to localStorage at login
  const userRaw = localStorage.getItem("rwt-user");
  const user = userRaw
    ? JSON.parse(userRaw)
    : { name: "Admin", initials: "AD" };

  // BUG-01 FIX: call Firebase signOut + clear localStorage before navigating.
  // Previously only navigate("/login") was called, leaving the Firebase Auth
  // session alive — any direct URL visit would re-enter the dashboard.
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn("Firebase signOut error:", err.message);
    } finally {
      localStorage.removeItem("rwt-role");
      localStorage.removeItem("rwt-user");
      navigate("/login");
    }
  };

  return (
    <div
      className="fixed left-0 top-0 h-screen flex flex-col z-50"
      style={{
        width: "252px",
        background: "#050505",
        borderRight: "1px solid #1A1A1A",
      }}
    >
      {/* Logo Area */}
      <div
        className="flex items-center gap-3 px-4"
        style={{ height: "72px", borderBottom: "1px solid #1A1A1A" }}
      >
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{ width: "38px", height: "38px", border: "1px solid #CC0000" }}
        >
          <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#CC0000", fontWeight: 700, fontSize: "13px" }}>
            RWT
          </span>
        </div>
        <div className="flex flex-col">
          <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#F0F0F0", fontWeight: 600, fontSize: "14px", lineHeight: 1.2 }}>
            Royals Webtech
          </span>
          <span style={{ fontFamily: "Mulish, sans-serif", color: "#666666", fontSize: "11px", lineHeight: 1.2 }}>
            Pvt. Ltd.
          </span>
          <span style={{ fontFamily: "Share Tech Mono, monospace", color: "#00B8B8", fontSize: "8px", letterSpacing: "0.1em", marginTop: "2px" }}>
            OPTIMIZED FOR WORK
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3" style={{ scrollbarWidth: "none" }}>
        {navSections.map((section) => (
          <div key={section.label} className="mb-2">
            <div
              className="px-4 py-2 flex items-center gap-2"
              style={{ borderTop: "1px solid #1A1A1A" }}
            >
              <span
                style={{
                  fontFamily: "Rajdhani, sans-serif",
                  color: "#CC0000",
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                {section.label}
              </span>
            </div>

            {section.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 16px",
                  margin: "1px 6px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  borderLeft: isActive ? "3px solid #CC0000" : "3px solid transparent",
                  background: isActive ? "rgba(204,0,0,0.06)" : "transparent",
                  transition: "all 150ms ease",
                })}
                className="nav-item group"
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      style={{ color: isActive ? "#00B8B8" : "#333333", flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontFamily: "Mulish, sans-serif",
                        fontSize: "13px",
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? "#FFFFFF" : "#555555",
                      }}
                    >
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom User Card */}
      <div className="p-3" style={{ borderTop: "1px solid #1A1A1A" }}>
        <div
          className="rounded-lg p-3 flex items-center gap-3"
          style={{ background: "#111111", border: "1px solid #1E1E1E" }}
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
            <p style={{ fontFamily: "Rajdhani, sans-serif", color: "#F0F0F0", fontWeight: 600, fontSize: "14px", lineHeight: 1.2 }}>
              {user.name}
            </p>
            <p style={{ fontFamily: "Mulish, sans-serif", color: "#666666", fontSize: "11px" }}>
              Super Admin
            </p>
            <div className="flex items-center gap-1 mt-1">
              <div className="rounded-full" style={{ width: "6px", height: "6px", background: "#00B8B8" }} />
              <span style={{ fontFamily: "Mulish, sans-serif", color: "#00B8B8", fontSize: "10px" }}>Online</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex-shrink-0"
            title="Logout"
            style={{ color: "#333333", transition: "color 150ms" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#CC0000"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#333333"}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Header ────────────────────────────────────────────
function Header() {
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState("");

  // BUG-08 FIX: useLocation() re-renders on every client-side navigation.
  // window.location.pathname is read once at render and never updates.
  const { pathname } = useLocation();
  const page = pageTitles[pathname] || { title: "Dashboard", crumb: "WORKSPACE / DASHBOARD" };

  const userRaw = localStorage.getItem("rwt-user");
  const user = userRaw ? JSON.parse(userRaw) : { initials: "AD" };

  return (
    <div
      className="fixed top-0 right-0 flex items-center px-6 z-40"
      style={{
        left: "252px",
        height: "56px",
        background: theme === "dark" ? "#0A0A0A" : "#FFFFFF",
        borderBottom: `1px solid ${theme === "dark" ? "#1E1E1E" : "#E0E0E0"}`,
      }}
    >
      <div className="flex-1">
        <h1
          style={{
            fontFamily: "Rajdhani, sans-serif",
            fontWeight: 700,
            fontSize: "22px",
            color: theme === "dark" ? "#F0F0F0" : "#111111",
            lineHeight: 1,
          }}
        >
          {page.title}
        </h1>
        <p
          style={{
            fontFamily: "Share Tech Mono, monospace",
            fontSize: "10px",
            color: theme === "dark" ? "#555555" : "#999999",
            marginTop: "2px",
          }}
        >
          {page.crumb}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#666666" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="outline-none text-xs pl-8 pr-16 py-2 rounded-md"
            style={{
              width: "220px",
              background: theme === "dark" ? "#111111" : "#F5F5F5",
              border: `1px solid ${theme === "dark" ? "#1E1E1E" : "#E0E0E0"}`,
              color: theme === "dark" ? "#F0F0F0" : "#111111",
              fontFamily: "Mulish, sans-serif",
            }}
            onFocus={(e) => {
              e.target.style.border = "1px solid #00B8B8";
              e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)";
            }}
            onBlur={(e) => {
              e.target.style.border = `1px solid ${theme === "dark" ? "#1E1E1E" : "#E0E0E0"}`;
              e.target.style.boxShadow = "none";
            }}
          />
          <span
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-1 rounded"
            style={{
              fontFamily: "Share Tech Mono, monospace",
              fontSize: "9px",
              color: "#555555",
              background: theme === "dark" ? "#1A1A1A" : "#E8E8E8",
              border: `1px solid ${theme === "dark" ? "#252525" : "#D8D8D8"}`,
            }}
          >
            ⌘K
          </span>
        </div>

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

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full"
          style={{
            background: theme === "dark" ? "#111111" : "#F0F0F0",
            border: `1px solid ${theme === "dark" ? "#1E1E1E" : "#E0E0E0"}`,
            transition: "all 250ms ease",
          }}
          title="Toggle theme"
        >
          {theme === "dark"
            ? <Sun size={14} style={{ color: "#C9922A" }} />
            : <Moon size={14} style={{ color: "#555555" }} />
          }
        </button>

        {/* Avatar */}
        <div
          className="rounded-full flex items-center justify-center cursor-pointer"
          style={{
            width: "32px", height: "32px",
            background: "#CC0000",
            border: "2px solid #CC0000",
            boxShadow: "0 0 0 2px #0A0A0A",
          }}
        >
          <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "11px" }}>
            {user.initials}
          </span>
        </div>
      </div>
    </div>
  );
}

function Layout() {
  const { theme } = useTheme();

  return (
    <div style={{ background: "var(--page-bg)", minHeight: "100vh" }}>
      <Sidebar />
      <Header />

      <main
        style={{
          marginLeft: "252px",
          paddingTop: "56px",
          minHeight: "100vh",
          background: "var(--page-bg)",
        }}
      >
        {/* RWT Watermark */}
        <div
          className="fixed pointer-events-none select-none"
          style={{
            top: "56px",
            right: "0",
            zIndex: 0,
            fontFamily: "Rajdhani, sans-serif",
            fontSize: "280px",
            fontWeight: 700,
            color: theme === "dark" ? "#FFFFFF" : "#CCCCCC",
            opacity: theme === "dark" ? 0.025 : 0.35,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            userSelect: "none",
          }}
        >
          RWT
        </div>

        <div className="relative z-10 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;