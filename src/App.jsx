import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import EmployeeLayout from "./components/EmployeeLayout";
import Dashboard from "./pages/Dashboard";
import MyAttendance from "./pages/employee/MyAttendance";
import MyLeave from "./pages/employee/MyLeave";
import MyProfile from "./pages/employee/MyProfile";
import Announcements from "./pages/employee/Announcements";
import Employees from "./pages/Employees";
import LeaveManagement from "./pages/LeaveManagement";
// import Attendance from "./pages/Attendance";
// import Payroll from "./pages/Payroll";
// import Departments from "./pages/Departments";
// import Settings from "./pages/Settings";

export const ThemeContext = createContext();
export function useTheme() { return useContext(ThemeContext); }

// Role-based redirect
function RoleRedirect() {
  const role = localStorage.getItem("rwt-role");
  if (role === "admin") return <Navigate to="/dashboard" replace />;
  if (role === "employee") return <Navigate to="/my-attendance" replace />;
  return <Navigate to="/login" replace />;
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("rwt-theme") || "dark");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    localStorage.setItem("rwt-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route path="/" element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="employees" element={<Employees />} />
            {/* <Route path="attendance" element={<Attendance />} /> */}
            <Route path="leave" element={<LeaveManagement />} />
            {/* <Route path="payroll" element={<Payroll />} /> */}
            {/* <Route path="departments" element={<Departments />} /> */}
            {/* <Route path="settings" element={<Settings />} /> */}
          </Route>

          {/* Employee Routes */}
          <Route path="/" element={<EmployeeLayout />}>
            <Route path="my-attendance" element={<MyAttendance />} />
            <Route path="my-leave" element={<MyLeave />} />
            <Route path="my-profile" element={<MyProfile />} />
            <Route path="announcements" element={<Announcements />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}

export default App;