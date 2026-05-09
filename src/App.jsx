// ─────────────────────────────────────────────────────────────
//  src/App.jsx
//
//  FIX (Bug 3 - Open /setup route): The /setup route previously rendered
//  AdminSetup unconditionally for any visitor, allowing anyone to overwrite
//  the admin profile even after initial setup was complete.
//
//  Fix: the /setup route now renders through a <SetupGuard> wrapper that
//  checks Firestore for an existing admin document on mount.
//  - If an admin doc exists    → redirect to /login (setup already done).
//  - If no admin doc exists    → render AdminSetup (first-time setup).
//  - While the check is in flight → show a neutral loading screen.
//
//  This means the /setup route can safely be left in the codebase for
//  fresh deployments without exposing it to abuse on live systems.
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
import Announcements from "./pages/employee/Announcements";
import Employees from "./pages/Employees";
import LeaveManagement from "./pages/LeaveManagement";
import Attendance from "./pages/Attendance";
import Departments from "./pages/Departments";
import Settings from "./pages/Settings";
import { subscribeAuthState } from "./firebase/authService";

export const ThemeContext = createContext();
export function useTheme() { return useContext(ThemeContext); }

// Role-based redirect — reads from localStorage (set on login)
function RoleRedirect() {
  const role = localStorage.getItem("rwt-role");
  if (role === "admin")    return <Navigate to="/dashboard"    replace />;
  if (role === "employee") return <Navigate to="/my-attendance" replace />;
  return <Navigate to="/login" replace />;
}

// ── SetupGuard ────────────────────────────────────────────────
// Checks Firestore for an existing admin user before rendering AdminSetup.
// • Admin already exists  → redirect to /login (setup is done; refuse access)
// • No admin found        → render children (show the setup form)
// • Firestore error       → treat as "no admin" so setup can still proceed
//   (e.g. fresh project where rules haven't been deployed yet)
function SetupGuard({ children }) {
  const [status, setStatus] = useState("checking"); // "checking" | "allowed" | "deny"

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Query /users for any document with role == "admin".
        // We only need to know if at least one exists — limit(1) keeps it cheap.
        const snap = await getDocs(
          query(collection(db, "users"), where("role", "==", "admin"), limit(1))
        );
        if (cancelled) return;
        if (!snap.empty) {
          // An admin profile already exists — block access to /setup.
          setStatus("deny");
        } else {
          // No admin yet — allow the setup form to render.
          setStatus("allowed");
        }
      } catch {
        // Firestore rules may deny this read on a brand-new project (no rules
        // deployed yet). Treat as "allowed" so first-time setup can proceed.
        if (!cancelled) setStatus("allowed");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (status === "checking") {
    // Neutral full-screen loader — shown only for the brief Firestore check.
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

  if (status === "deny") {
    // Setup already done — silently redirect to login.
    return <Navigate to="/login" replace />;
  }

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
      if (!user) {
        localStorage.removeItem("rwt-role");
        localStorage.removeItem("rwt-user");
      }
    });
    return unsub;
  }, []);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<Login />} />

          {/* /setup is gated: only accessible when no admin profile exists yet */}
          <Route
            path="/setup"
            element={
              <SetupGuard>
                <AdminSetup />
              </SetupGuard>
            }
          />

          {/* Admin Routes */}
          <Route path="/" element={<Layout />}>
            <Route path="dashboard"  element={<Dashboard />} />
            <Route path="employees"  element={<Employees />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave"      element={<LeaveManagement />} />
            <Route path="departments" element={<Departments />} />
            <Route path="settings"   element={<Settings />} />
          </Route>

          {/* Employee Routes */}
          <Route path="/" element={<EmployeeLayout />}>
            <Route path="my-attendance" element={<MyAttendance />} />
            <Route path="my-leave"      element={<MyLeave />} />
            <Route path="my-profile"    element={<MyProfile />} />
            <Route path="announcements" element={<Announcements />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}

export default App;