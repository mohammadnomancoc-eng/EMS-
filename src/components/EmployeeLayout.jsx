// ─────────────────────────────────────────────────────────────
//  src/components/EmployeeLayout.jsx
//
//  BUG-08 FIX (window.location.pathname → useLocation):
//    EmployeeHeader previously read window.location.pathname to look up the
//    page title. This is a static snapshot taken once at render time and
//    never updates when React Router navigates client-side. After the first
//    navigation the header would keep showing the old page title until some
//    other state change triggered a re-render. Replaced with useLocation()
//    from react-router-dom which is reactive and re-renders on every navigation.
//
//  BUG-10 FIX (hardcoded quota → real Firestore data):
//    The sidebar quota bar was hardcoded to { leave: { taken: 1, total: 2 },
//    wfh: { taken: 0, total: 2 } } — a mock comment acknowledged it.
//    It now fetches the employee's real leave requests for the current month
//    from Firestore (via getLeaveRequestsByEmployee) and counts Approved +
//    Pending leaves/WFH exactly as MyLeave.jsx does.
//
//  BUG-01 partial FIX (employee logout):
//    Employee logout previously only cleared localStorage and navigated to
//    /login without calling Firebase signOut(), leaving the session alive.
//    Now calls logoutUser() from authService before navigating.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../App";
import {
  CalendarCheck, CalendarOff, User,
  Megaphone, LogOut, Sun, Moon, Bell,
} from "lucide-react";
import { logoutUser } from "../firebase/authService";
import { getLeaveRequestsByEmployee } from "../firebase/firestoreService";

// Monthly quota limits — must match MyLeave.jsx constants
const LEAVE_QUOTA = 2;
const WFH_QUOTA   = 2;

const navItems = [
  { to: "/my-attendance", icon: CalendarCheck, label: "My Attendance", section: "WORKSPACE" },
  { to: "/my-leave",      icon: CalendarOff,   label: "Leave & WFH",   section: "WORKSPACE" },
  { to: "/my-profile",    icon: User,           label: "My Profile",    section: "PERSONAL"  },
  { to: "/announcements", icon: Megaphone,      label: "Announcements", section: "COMPANY"   },
];

const pageTitles = {
  "/my-attendance": { title: "My Attendance", crumb: "WORKSPACE / ATTENDANCE" },
  "/my-leave":      { title: "Leave & WFH",   crumb: "WORKSPACE / LEAVE & WFH" },
  "/my-profile":    { title: "My Profile",     crumb: "PERSONAL / PROFILE" },
  "/announcements": { title: "Announcements",  crumb: "COMPANY / ANNOUNCEMENTS" },
};

// ── Helpers ───────────────────────────────────────────
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

// Count requests of a given requestType (Leave | WFH) in the current calendar month.
// Mirrors the countThisMonth() logic in MyLeave.jsx.
function countThisMonth(requests, type) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();
  return requests.filter((r) => {
    const d = new Date(r.from || r.createdAt?.toDate?.() || 0);
    return d.getFullYear() === y && d.getMonth() === m && r.requestType === type;
  }).length;
}

// ── Quota Bar ─────────────────────────────────────────
function QuotaBar({ label, taken, total, color }) {
  const remaining = total - taken;
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: "#A0A0A0" }}>
          {label}
        </span>
        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color }}>
          {remaining}/{total}
        </span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: "4px", background: "#1A1A1A" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color, transition: "width 600ms ease" }}
        />
      </div>
      <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: "#444444", marginTop: "2px" }}>
        {taken} used · {remaining} left
      </p>
    </div>
  );
}

// ── Employee Sidebar ──────────────────────────────────
function EmployeeSidebar() {
  const navigate = useNavigate();
  const user = getStoredUser();

  // BUG-10 FIX: fetch real monthly quota from Firestore
  const [leaveTaken, setLeaveTaken] = useState(0);
  const [wfhTaken,   setWfhTaken]   = useState(0);
  const [quotaLoaded, setQuotaLoaded] = useState(false);

  useEffect(() => {
    if (!user.empId) {
      setQuotaLoaded(true);
      return;
    }
    getLeaveRequestsByEmployee(user.empId)
      .then((requests) => {
        setLeaveTaken(countThisMonth(requests, "Leave"));
        setWfhTaken(countThisMonth(requests, "WFH"));
        setQuotaLoaded(true);
      })
      .catch(() => setQuotaLoaded(true)); // on error show 0/2 rather than crash
  }, [user.empId]);

  // BUG-01 FIX: call Firebase signOut before clearing localStorage
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

  const sections = [...new Set(navItems.map((n) => n.section))];

  return (
    <div
      className="fixed left-0 top-0 h-screen flex flex-col z-50"
      style={{ width: "252px", background: "#050505", borderRight: "1px solid #1A1A1A" }}
    >
      {/* Logo */}
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
        {sections.map((section) => (
          <div key={section} className="mb-2">
            <div className="px-4 py-2" style={{ borderTop: "1px solid #1A1A1A" }}>
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
                style={({ isActive }) => ({
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 16px", margin: "1px 6px", borderRadius: "6px",
                  textDecoration: "none",
                  borderLeft: isActive ? "3px solid #CC0000" : "3px solid transparent",
                  background: isActive ? "rgba(204,0,0,0.06)" : "transparent",
                  transition: "all 150ms ease",
                })}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} style={{ color: isActive ? "#00B8B8" : "#333333", flexShrink: 0 }} />
                    <span style={{
                      fontFamily: "Mulish, sans-serif", fontSize: "13px",
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? "#FFFFFF" : "#555555",
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
          <div className="rounded-lg p-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
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
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: "#444444" }}>
                Loading…
              </p>
            )}
          </div>
        </div>
      </nav>

      {/* User Card */}
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
            style={{ color: "#333333", transition: "color 150ms", flexShrink: 0 }}
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

// ── Employee Header ───────────────────────────────────
function EmployeeHeader() {
  const { theme, toggleTheme } = useTheme();

  // BUG-08 FIX: useLocation() is reactive and re-renders on every client-side
  // navigation. window.location.pathname is a static read that never triggers
  // a re-render, causing the header title to stay stale after nav clicks.
  const { pathname } = useLocation();
  const page = pageTitles[pathname] || { title: "Employee Portal", crumb: "EMPLOYEE / PORTAL" };

  const user = getStoredUser();

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
      {/* Page Title */}
      <div className="flex-1">
        <h1 style={{
          fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "22px",
          color: theme === "dark" ? "#F0F0F0" : "#111111", lineHeight: 1,
        }}>
          {page.title}
        </h1>
        <p style={{
          fontFamily: "Share Tech Mono, monospace", fontSize: "10px",
          color: theme === "dark" ? "#555555" : "#999999", marginTop: "2px",
        }}>
          {page.crumb}
        </p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">

        {/* Employee Portal Badge */}
        <span style={{
          fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
          color: "#00B8B8", background: "rgba(0,184,184,0.08)",
          border: "1px solid rgba(0,184,184,0.25)", borderRadius: "4px",
          padding: "3px 10px", letterSpacing: "0.1em",
        }}>
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

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full"
          style={{
            background: theme === "dark" ? "#111111" : "#F0F0F0",
            border: `1px solid ${theme === "dark" ? "#1E1E1E" : "#E0E0E0"}`,
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
          className="rounded-full flex items-center justify-center cursor-pointer"
          style={{
            width: "32px", height: "32px", background: "#CC0000",
            border: "2px solid #CC0000", boxShadow: "0 0 0 2px #0A0A0A",
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

// ── Layout Wrapper ────────────────────────────────────
function EmployeeLayout() {
  const { theme } = useTheme();

  return (
    <div style={{ background: "var(--page-bg)", minHeight: "100vh" }}>
      <EmployeeSidebar />
      <EmployeeHeader />

      <main style={{ marginLeft: "252px", paddingTop: "56px", minHeight: "100vh", background: "var(--page-bg)" }}>
        {/* RWT Watermark */}
        <div
          className="fixed pointer-events-none select-none"
          style={{
            top: "56px", right: "0", zIndex: 0,
            fontFamily: "Rajdhani, sans-serif", fontSize: "280px", fontWeight: 700,
            color: theme === "dark" ? "#FFFFFF" : "#CCCCCC",
            opacity: theme === "dark" ? 0.025 : 0.35,
            lineHeight: 1, letterSpacing: "-0.02em", userSelect: "none",
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

export default EmployeeLayout;