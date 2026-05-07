import { useState } from "react";
import { useTheme } from "../App";
import {
  Search, Plus, Filter, Download, Edit2, Trash2,
  Mail, Phone, X, Check, ChevronDown, Users,
  UserCheck, UserX, Clock
} from "lucide-react";
import { employees, departments } from "../data/mockData";

function getInitials(name) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

const avatarColors = [
  "#CC0000", "#00B8B8", "#C9922A", "#6366F1", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16",
];
function getAvatarColor(id) {
  const idx = parseInt(id.replace("RWT", "")) % avatarColors.length;
  return avatarColors[idx];
}

function StatusBadge({ status, theme }) {
  const styles = {
    dark: {
      Present: { bg: "rgba(0,184,184,0.10)", border: "rgba(0,184,184,0.35)", color: "#00B8B8" },
      Absent:  { bg: "rgba(204,0,0,0.10)",   border: "rgba(204,0,0,0.35)",   color: "#CC0000" },
      Leave:   { bg: "rgba(201,146,42,0.10)", border: "rgba(201,146,42,0.35)",color: "#C9922A" },
      WFH:     { bg: "rgba(255,255,255,0.06)",border: "rgba(255,255,255,0.2)",color: "#E8E8E8" },
    },
    light: {
      Present: { bg: "#E6F9F9", border: "#00B8B8", color: "#007A7A" },
      Absent:  { bg: "#FDECEA", border: "#CC0000", color: "#990000" },
      Leave:   { bg: "#FDF3E0", border: "#C9922A", color: "#8A5E00" },
      WFH:     { bg: "#F0F0F0", border: "#888888", color: "#444444" },
    },
  };
  const s = (styles[theme] || styles.dark)[status] || (styles[theme] || styles.dark).WFH;
  return (
    <span style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600,
      borderRadius: "4px", padding: "2px 8px",
    }}>
      {status}
    </span>
  );
}

// ── Add/Edit Employee Modal ────────────────────────────
function EmployeeModal({ theme, onClose, onSave, initial }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial || {
    name: "", role: "", department: "Engineering",
    email: "", phone: "", joinDate: "", status: "Present", salary: "",
  });
  const [errors, setErrors] = useState({});

  const isDark = theme === "dark";
  const bg = isDark ? "#111111" : "#FFFFFF";
  const border = isDark ? "#1E1E1E" : "#E0E0E0";
  const labelColor = isDark ? "#A0A0A0" : "#888888";
  const inputBg = isDark ? "#0A0A0A" : "#F8F8F8";
  const textColor = isDark ? "#F0F0F0" : "#111111";

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.role.trim()) e.role = "Required";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "Valid email required";
    if (!form.phone.trim()) e.phone = "Required";
    if (!form.joinDate) e.joinDate = "Required";
    if (!form.salary || isNaN(form.salary)) e.salary = "Valid number required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, salary: Number(form.salary) });
  };

  const field = (label, key, type = "text", opts) => (
    <div>
      <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700,
        color: errors[key] ? "#CC0000" : "#CC0000", letterSpacing: "0.15em", display: "block", marginBottom: "6px" }}>
        {label.toUpperCase()}{errors[key] ? ` — ${errors[key]}` : ""}
      </label>
      {opts ? (
        <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: "100%", background: inputBg, border: `1px solid ${errors[key] ? "#CC0000" : border}`,
            color: textColor, borderRadius: "6px", padding: "8px 10px",
            fontFamily: "Mulish, sans-serif", fontSize: "13px", outline: "none" }}>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: "100%", background: inputBg, border: `1px solid ${errors[key] ? "#CC0000" : border}`,
            color: textColor, borderRadius: "6px", padding: "8px 10px",
            fontFamily: "Mulish, sans-serif", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
      )}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: "12px",
        width: "480px", maxHeight: "90vh", overflowY: "auto", padding: "28px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textColor }}>
            {isEdit ? "EDIT EMPLOYEE" : "ADD NEW EMPLOYEE"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: labelColor }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "grid", gap: "16px" }}>
          {field("Full Name", "name")}
          {field("Role / Designation", "role")}
          {field("Department", "department", "text", departments.map(d => d.name))}
          {field("Email Address", "email", "email")}
          {field("Phone", "phone")}
          {field("Join Date", "joinDate", "date")}
          {field("Status", "status", "text", ["Present", "Absent", "Leave", "WFH"])}
          {field("Monthly Salary (₹)", "salary", "number")}
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px", background: "transparent",
            border: `1px solid ${border}`, borderRadius: "6px",
            color: labelColor, fontFamily: "Rajdhani, sans-serif", fontWeight: 600,
            fontSize: "13px", cursor: "pointer", letterSpacing: "0.05em"
          }}>CANCEL</button>
          <button onClick={handleSave} style={{
            flex: 2, padding: "10px", background: "#CC0000",
            border: "none", borderRadius: "6px",
            color: "#FFFFFF", fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
            fontSize: "13px", cursor: "pointer", letterSpacing: "0.1em"
          }}>{isEdit ? "SAVE CHANGES" : "ADD EMPLOYEE"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Employee Detail Drawer ─────────────────────────────
function EmployeeDrawer({ emp, theme, onClose, onEdit, onDelete }) {
  const isDark = theme === "dark";
  const bg = isDark ? "#111111" : "#FFFFFF";
  const border = isDark ? "#1E1E1E" : "#E0E0E0";
  const labelColor = isDark ? "#666666" : "#999999";
  const textColor = isDark ? "#F0F0F0" : "#111111";
  const color = getAvatarColor(emp.id);

  const row = (label, value) => (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
        color: labelColor, letterSpacing: "0.15em" }}>{label}</span>
      <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textColor, fontWeight: 500 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "360px",
        background: bg, borderLeft: `1px solid ${border}`, display: "flex", flexDirection: "column" }}>
        {/* Top */}
        <div style={{ padding: "20px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "14px",
            color: "#CC0000", letterSpacing: "0.15em" }}>EMPLOYEE PROFILE</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: labelColor }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {/* Avatar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: `${color}20`,
              border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "24px", color }}>{getInitials(emp.name)}</span>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textColor }}>{emp.name}</div>
              <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: labelColor, marginTop: "2px" }}>{emp.role}</div>
              <div style={{ marginTop: "8px" }}><StatusBadge status={emp.status} theme={theme} /></div>
            </div>
          </div>

          {row("EMPLOYEE ID", emp.id)}
          {row("DEPARTMENT", emp.department)}
          {row("EMAIL", emp.email)}
          {row("PHONE", emp.phone)}
          {row("JOIN DATE", new Date(emp.joinDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }))}
          {row("MONTHLY SALARY", `₹${emp.salary.toLocaleString("en-IN")}`)}
        </div>

        {/* Actions */}
        <div style={{ padding: "16px", borderTop: `1px solid ${border}`, display: "flex", gap: "8px" }}>
          <button onClick={() => onEdit(emp)} style={{
            flex: 1, padding: "9px", background: "transparent", border: `1px solid ${border}`,
            borderRadius: "6px", color: textColor, fontFamily: "Rajdhani, sans-serif",
            fontWeight: 600, fontSize: "12px", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", gap: "6px", letterSpacing: "0.05em"
          }}>
            <Edit2 size={13} /> EDIT
          </button>
          <button onClick={() => onDelete(emp.id)} style={{
            flex: 1, padding: "9px", background: "rgba(204,0,0,0.1)", border: "1px solid rgba(204,0,0,0.3)",
            borderRadius: "6px", color: "#CC0000", fontFamily: "Rajdhani, sans-serif",
            fontWeight: 600, fontSize: "12px", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", gap: "6px", letterSpacing: "0.05em"
          }}>
            <Trash2 size={13} /> REMOVE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────
export default function Employees() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [data, setData] = useState(employees);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [drawer, setDrawer] = useState(null);

  const bg = isDark ? "#0A0A0A" : "#F4F4F4";
  const cardBg = isDark ? "#111111" : "#FFFFFF";
  const border = isDark ? "#1E1E1E" : "#E0E0E0";
  const textColor = isDark ? "#F0F0F0" : "#111111";
  const subColor = isDark ? "#A0A0A0" : "#888888";
  const inputBg = isDark ? "#111111" : "#FFFFFF";

  const filtered = data.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "All" || e.department === deptFilter;
    const matchStatus = statusFilter === "All" || e.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  // Stats
  const stats = [
    { label: "TOTAL EMPLOYEES", value: data.length, icon: Users, color: "#00B8B8" },
    { label: "PRESENT TODAY", value: data.filter(e => e.status === "Present").length, icon: UserCheck, color: "#00B8B8" },
    { label: "ABSENT TODAY", value: data.filter(e => e.status === "Absent").length, icon: UserX, color: "#CC0000" },
    { label: "ON LEAVE / WFH", value: data.filter(e => e.status === "Leave" || e.status === "WFH").length, icon: Clock, color: "#C9922A" },
  ];

  const handleAdd = (form) => {
    const newId = `RWT${String(data.length + 1).padStart(3, "0")}`;
    setData(d => [...d, { ...form, id: newId }]);
    setShowModal(false);
  };

  const handleEdit = (form) => {
    setData(d => d.map(e => e.id === form.id ? form : e));
    setEditEmp(null);
    setDrawer(null);
  };

  const handleDelete = (id) => {
    setData(d => d.filter(e => e.id !== id));
    setDrawer(null);
  };

  const openEdit = (emp) => {
    setDrawer(null);
    setEditEmp(emp);
  };

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "24px" }}>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: cardBg, border: `1px solid ${border}`,
            borderRadius: "10px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "8px",
              background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "26px", color: textColor, lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
                color: "#CC0000", letterSpacing: "0.15em", marginTop: "2px" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: "10px",
        padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>

        {/* Search */}
        <div style={{ flex: 1, minWidth: "180px", position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: subColor }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, role, ID…"
            style={{ width: "100%", paddingLeft: "32px", paddingRight: "10px", height: "36px",
              background: inputBg, border: `1px solid ${border}`, borderRadius: "6px",
              color: textColor, fontFamily: "Mulish, sans-serif", fontSize: "13px",
              outline: "none", boxSizing: "border-box" }} />
        </div>

        {/* Dept Filter */}
        <div style={{ position: "relative" }}>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            style={{ appearance: "none", paddingLeft: "12px", paddingRight: "28px", height: "36px",
              background: inputBg, border: `1px solid ${border}`, borderRadius: "6px",
              color: textColor, fontFamily: "Mulish, sans-serif", fontSize: "13px", cursor: "pointer", outline: "none" }}>
            <option value="All">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: "absolute", right: "8px", top: "50%",
            transform: "translateY(-50%)", color: subColor, pointerEvents: "none" }} />
        </div>

        {/* Status Filter */}
        <div style={{ position: "relative" }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ appearance: "none", paddingLeft: "12px", paddingRight: "28px", height: "36px",
              background: inputBg, border: `1px solid ${border}`, borderRadius: "6px",
              color: textColor, fontFamily: "Mulish, sans-serif", fontSize: "13px", cursor: "pointer", outline: "none" }}>
            <option value="All">All Status</option>
            {["Present", "Absent", "Leave", "WFH"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: "absolute", right: "8px", top: "50%",
            transform: "translateY(-50%)", color: subColor, pointerEvents: "none" }} />
        </div>

        {/* Add Button */}
        <button onClick={() => setShowModal(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px",
            padding: "0 16px", background: "#CC0000", border: "none", borderRadius: "6px",
            color: "#FFFFFF", fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
            fontSize: "13px", cursor: "pointer", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
          <Plus size={14} /> ADD EMPLOYEE
        </button>
      </div>

      {/* Table */}
      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: "10px", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 1fr 110px 120px 80px",
          padding: "10px 16px", borderBottom: `1px solid ${border}`,
          background: isDark ? "#0D0D0D" : "#F8F8F8" }}>
          {["#", "EMPLOYEE", "ROLE", "DEPARTMENT", "STATUS", "SALARY", ""].map((h, i) => (
            <span key={i} style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "9px",
              fontWeight: 700, color: "#CC0000", letterSpacing: "0.2em" }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: subColor,
            fontFamily: "Mulish, sans-serif", fontSize: "13px" }}>
            No employees found
          </div>
        ) : (
          filtered.map((emp, idx) => {
            const color = getAvatarColor(emp.id);
            return (
              <div key={emp.id}
                onClick={() => setDrawer(emp)}
                style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr 1fr 110px 120px 80px",
                  padding: "12px 16px", borderBottom: idx < filtered.length - 1 ? `1px solid ${border}` : "none",
                  cursor: "pointer", transition: "background 150ms",
                  background: "transparent" }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? "#161616" : "#F9F9F9"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {/* Index */}
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px",
                  color: subColor, display: "flex", alignItems: "center" }}>{String(idx + 1).padStart(2, "0")}</span>

                {/* Name + ID */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                    background: `${color}20`, border: `1.5px solid ${color}`,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "11px", color }}>{getInitials(emp.name)}</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: "Mulish, sans-serif", fontWeight: 600, fontSize: "13px", color: textColor }}>{emp.name}</div>
                    <div style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#00B8B8" }}>{emp.id}</div>
                  </div>
                </div>

                {/* Role */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: subColor }}>{emp.role}</span>
                </div>

                {/* Department */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textColor }}>{emp.department}</span>
                </div>

                {/* Status */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <StatusBadge status={emp.status} theme={theme} />
                </div>

                {/* Salary */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: "#00B8B8" }}>
                    ₹{emp.salary.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(emp)}
                    style={{ width: "28px", height: "28px", background: "transparent",
                      border: `1px solid ${border}`, borderRadius: "4px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", color: subColor }}>
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => handleDelete(emp.id)}
                    style={{ width: "28px", height: "28px", background: "transparent",
                      border: "1px solid rgba(204,0,0,0.3)", borderRadius: "4px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "#CC0000" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Footer count */}
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${border}`,
          background: isDark ? "#0D0D0D" : "#F8F8F8",
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: subColor }}>
            Showing {filtered.length} of {data.length} employees
          </span>
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#00B8B8" }}>
            ROYALS WEBTECH
          </span>
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <EmployeeModal theme={theme} onClose={() => setShowModal(false)} onSave={handleAdd} />
      )}
      {editEmp && (
        <EmployeeModal theme={theme} onClose={() => setEditEmp(null)} onSave={handleEdit} initial={editEmp} />
      )}
      {drawer && (
        <EmployeeDrawer emp={drawer} theme={theme}
          onClose={() => setDrawer(null)} onEdit={openEdit} onDelete={handleDelete} />
      )}
    </div>
  );
}