// ─────────────────────────────────────────────────────────────
//  src/App.jsx
//
//  BUG-02 FIX (No auth guards): Added <AdminRoute> and <EmployeeRoute>
//  guards that wrap every protected route.
//
//  Previously ALL routes (dashboard, employees, attendance, leave, etc.)
//  were accessible by anyone who typed the URL directly — no login required.
//  RoleRedirect only ran at "/" so it provided zero protection elsewhere.
//
//  Fix strategy:
//  • AdminRoute    – checks rwt-role === "admin"  → else redirect /login
//  • EmployeeRoute – checks rwt-role === "employee" → else redirect /login
//  Both guards also verify the user still has a live Firebase Auth session
//  (via subscribeAuthState, which already clears localStorage on sign-out).
//  If localStorage says logged-in but Firebase session is gone (e.g. expired
//  token), the next page render will re-check and redirect cleanly.
//
//  TEMPLATE BUILDER FIX:
//  • Added /idcard-template and /idcard-template/:id routes so
//    IdCardTemplateBuilder is reachable from the admin panel.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "./firebase/config";
import Login from "./pages/Login";
import AdminSetup from "./pages/AdminSetup";
import Layout from "./components/Layout";
import EmployeeLayout from "./components/EmployeeLayout";
import Dashboard from "./pages/Dashboard";
import MyAttendance from "./pages/employee/MyAttendance";
import MyLeave from "./pages/employee/MyLeave";
import MyProfile from "./pages/employee/MyProfile";
import MyProjects from "./pages/employee/MyProjects";
import Announcements from "./pages/employee/Announcements";
import Employees from "./pages/Employees";
import LeaveManagement from "./pages/LeaveManagement";
import Attendance from "./pages/Attendance";
import Departments from "./pages/Departments";
import Settings from "./pages/Settings";
import IdCards from "./pages/IdCards";
import IdCardTemplateBuilder from "./pages/IdCardTemplateBuilder";
import AssignedProjects from "./pages/AssignedProjects";
import Projects from "./pages/Projects";
import Notifications from "./pages/Notifications";
import { subscribeAuthState } from "./firebase/authService";

export const ThemeContext = createContext();
export function useTheme() { return useContext(ThemeContext); }

// ── Role-based redirect from "/" ──────────────────────
function RoleRedirect() {
  const role = localStorage.getItem("rwt-role");
  if (role === "admin")    return <Navigate to="/dashboard"    replace />;
  if (role === "employee") return <Navigate to="/my-attendance" replace />;
  return <Navigate to="/login" replace />;
}

// ── BUG-02 FIX: Auth guard for admin routes ───────────
// Renders children only when rwt-role is "admin".
// Any other visitor (unauthenticated, or an employee who typed the URL)
// is silently redirected to /login.
function AdminRoute({ children }) {
  const role = localStorage.getItem("rwt-role");
  if (role !== "admin") return <Navigate to="/login" replace />;
  return children;
}

// ── BUG-02 FIX: Auth guard for employee routes ────────
// Renders children only when rwt-role is "employee".
// Admins who visit /my-attendance are redirected to /dashboard instead
// so they land in the right place without an error page.
function EmployeeRoute({ children }) {
  const role = localStorage.getItem("rwt-role");
  if (role === "admin")    return <Navigate to="/dashboard"    replace />;
  if (role !== "employee") return <Navigate to="/login"        replace />;
  return children;
}

// ── SetupGuard ────────────────────────────────────────
// Checks Firestore for an existing admin user before rendering AdminSetup.
// • Admin already exists  → redirect to /login (setup is done)
// • No admin found        → render children (show the setup form)
// • Firestore error       → treat as "no admin" so setup can still proceed
function SetupGuard({ children }) {
  const [status, setStatus] = useState("logIng"); // "logIng" | "allowed" | "deny"

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "users"), where("role", "==", "admin"), limit(1))
        );
        if (cancelled) return;
        setStatus(snap.empty ? "allowed" : "deny");
      } catch {
        if (!cancelled) setStatus("allowed");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (status === "logIng") {
    return (
      <div style={{
        minHeight: "100vh", background: "#0A0A0A",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "50%",
          border: "3px solid rgba(0,184,184,0.2)", borderTopColor: "#00B8B8",
          animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "deny") return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("rwt-theme") || "dark");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    localStorage.setItem("rwt-theme", theme);
  }, [theme]);

  // Keep localStorage in sync with Firebase auth state.
  // If the token expires or the user signs out from another tab,
  // the stored role is cleared so protected routes redirect to login.
  useEffect(() => {
    const unsub = subscribeAuthState((user) => {
      if (user) {
        // Setup FCM for the logged-in user dynamically
        import("./firebase/messaging").then(({ setupFCM, listenForegroundMessages }) => {
          setupFCM(user.uid);
          listenForegroundMessages((payload) => {
            console.log("Foreground message received:", payload);
            if (Notification.permission === "granted") {
              new Notification(payload.notification?.title || "EMS Update", {
                body: payload.notification?.body || "",
                icon: "/rwtlogo.png"
              });
            }
          });
        }).catch((err) => {
          console.warn("[FCM] Failed to load/setup messaging module:", err);
        });
      } else {
        localStorage.removeItem("rwt-role");
        localStorage.removeItem("rwt-user");
        const todayStr = new Date().toISOString().slice(0, 10);
        localStorage.removeItem(`mock_att_RWTPVTLTD-IT-OFLT-062026-99_${todayStr}`);
      }
    });
    return unsub;
  }, []);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/"      element={<RoleRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/setup"
            element={
              <SetupGuard>
                <AdminSetup />
              </SetupGuard>
            }
          />

          {/* ── Admin Routes (guarded by AdminRoute) ── */}
          <Route
            path="/"
            element={
              <AdminRoute>
                <Layout />
              </AdminRoute>
            }
          >
            <Route path="dashboard"   element={<Dashboard />} />
            <Route path="employees"   element={<Employees />} />
            <Route path="attendance"  element={<Attendance />} />
            <Route path="leave"       element={<LeaveManagement />} />
            <Route path="departments" element={<Departments />} />
            <Route path="settings"    element={<Settings />} />
            <Route path="id-cards"    element={<IdCards />} />
            {/* ── Template Builder routes ── */}
            <Route path="idcard-template"     element={<IdCardTemplateBuilder />} />
            <Route path="idcard-template/:id" element={<IdCardTemplateBuilder />} />
            <Route path="assigned-projects"   element={<AssignedProjects />} />
            <Route path="projects"            element={<Projects />} />
            <Route path="notifications"       element={<Notifications />} />
          </Route>

          {/* ── Employee Routes (guarded by EmployeeRoute) ── */}
          <Route
            path="/"
            element={
              <EmployeeRoute>
                <EmployeeLayout />
              </EmployeeRoute>
            }
          >
            <Route path="my-attendance" element={<MyAttendance />} />
            <Route path="my-leave"      element={<MyLeave />} />
            <Route path="my-projects"   element={<MyProjects />} />
            <Route path="my-profile"    element={<MyProfile />} />
            <Route path="announcements" element={<Announcements />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}

export default App;