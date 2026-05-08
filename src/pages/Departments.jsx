import { useState } from "react";
import { useTheme } from "../App";
import {
  Building2, Users, Briefcase, Plus, Edit2,
  Trash2, X, Check, Search, ChevronDown,
  TrendingUp, UserCheck, Mail, Shield
} from "lucide-react";
import { departments, employees } from "../data/mockData";

// ── Helpers ────────────────────────────────────────────
function getInitials(name) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

const accentPalette = ["#CC0000", "#00B8B8", "#C9922A", "#6366F1", "#10B981", "#F59E0B"];

function getDeptColor(id) {
  return accentPalette[(id - 1) % accentPalette.length];
}

// ── Stat Card ──────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent, sub, theme }) {
  const surface  = theme === "dark" ? "#111111" : "#FFFFFF";
  const border   = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri  = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted= theme === "dark" ? "#666666" : "#888888";
  const iconBg   = theme === "dark" ? "#1A1A1A" : "#F5F5F5";

  return (
    <div
      className="rounded-xl p-5 flex items-center gap-4"
      style={{
        background: surface, border: `1px solid ${border}`,
        boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 200ms ease", cursor: "default",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = accent}
      onMouseLeave={e => e.currentTarget.style.borderColor = border}
    >
      <div className="rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ width: "44px", height: "44px", background: iconBg, border: `1px solid ${border}` }}>
        <Icon size={20} style={{ color: accent }} />
      </div>
      <div>
        <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {label}
        </p>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "32px", fontWeight: 700, color: accent, lineHeight: 1.1 }}>
          {value}
        </p>
        {sub && (
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted, marginTop: "2px" }}>{sub}</p>
        )}
      </div>
    </div>
  );
}

// ── Department Card ────────────────────────────────────
function DeptCard({ dept, empList, theme, onEdit, onDelete }) {
  const isDark   = theme === "dark";
  const surface  = isDark ? "#111111" : "#FFFFFF";
  const border   = isDark ? "#1E1E1E" : "#E0E0E0";
  const textPri  = isDark ? "#F0F0F0" : "#111111";
  const textSub  = isDark ? "#A0A0A0" : "#888888";
  const accent   = getDeptColor(dept.id);
  const [hover, setHover] = useState(false);

  // Employees in this dept
  const deptEmps = empList.filter(e => e.department === dept.name);
  const present  = deptEmps.filter(e => e.status === "Present").length;

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        background: surface,
        border: `1px solid ${hover ? accent : border}`,
        boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 200ms ease",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Top accent bar */}
      <div style={{ height: "3px", background: accent }} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ width: "42px", height: "42px", background: accent + "18", border: `1px solid ${accent}33` }}>
              <Building2 size={20} style={{ color: accent }} />
            </div>
            <div>
              <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "17px", color: textPri }}>
                {dept.name}
              </h3>
              <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "9px", color: accent, letterSpacing: "0.1em" }}>
                DEPT — {String(dept.id).padStart(3, "0")}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(dept)}
              className="rounded-md p-1.5"
              style={{ color: textSub, transition: "all 150ms", background: "transparent" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#00B8B8"; e.currentTarget.style.background = isDark ? "#1A1A1A" : "#F0F0F0"; }}
              onMouseLeave={e => { e.currentTarget.style.color = textSub; e.currentTarget.style.background = "transparent"; }}>
              <Edit2 size={14} />
            </button>
            <button onClick={() => onDelete(dept.id)}
              className="rounded-md p-1.5"
              style={{ color: textSub, transition: "all 150ms", background: "transparent" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#CC0000"; e.currentTarget.style.background = isDark ? "#1A1A1A" : "#F0F0F0"; }}
              onMouseLeave={e => { e.currentTarget.style.color = textSub; e.currentTarget.style.background = "transparent"; }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* HOD */}
        <div className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: isDark ? "#0D0D0D" : "#F8F8F8", border: `1px solid ${border}` }}>
          <Shield size={12} style={{ color: accent, flexShrink: 0 }} />
          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub }}>HOD:</span>
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 600, fontSize: "13px", color: textPri }}>{dept.hod}</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg p-3 text-center" style={{ background: isDark ? "#0D0D0D" : "#F8F8F8", border: `1px solid ${border}` }}>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "22px", color: accent }}>{dept.headcount}</p>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: textSub }}>Headcount</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: isDark ? "#0D0D0D" : "#F8F8F8", border: `1px solid ${border}` }}>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "22px", color: "#00B8B8" }}>{present}</p>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: textSub }}>Present</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: isDark ? "#0D0D0D" : "#F8F8F8", border: `1px solid ${border}` }}>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "22px", color: "#C9922A" }}>{dept.openRoles}</p>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: textSub }}>Open Roles</p>
          </div>
        </div>

        {/* Employee avatars */}
        {deptEmps.length > 0 && (
          <div>
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
              color: "#CC0000", letterSpacing: "0.15em", marginBottom: "8px" }}>TEAM MEMBERS</p>
            <div className="flex flex-wrap gap-1">
              {deptEmps.slice(0, 8).map(emp => (
                <div key={emp.id} title={emp.name}
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    width: "30px", height: "30px",
                    background: accentPalette[parseInt(emp.id.replace("RWT","")) % accentPalette.length],
                    border: `2px solid ${isDark ? "#111111" : "#FFFFFF"}`,
                    cursor: "default",
                  }}>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "10px" }}>
                    {getInitials(emp.name)}
                  </span>
                </div>
              ))}
              {deptEmps.length > 8 && (
                <div className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    width: "30px", height: "30px",
                    background: isDark ? "#1A1A1A" : "#E8E8E8",
                    border: `2px solid ${isDark ? "#111111" : "#FFFFFF"}`,
                  }}>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", color: textSub, fontWeight: 700, fontSize: "10px" }}>
                    +{deptEmps.length - 8}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add/Edit Department Modal ──────────────────────────
function DeptModal({ theme, onClose, onSave, initial }) {
  const isEdit = !!initial;
  const isDark = theme === "dark";

  const [form, setForm] = useState(initial || {
    name: "", hod: "", headcount: "", openRoles: 0,
  });
  const [errors, setErrors] = useState({});

  const bg        = isDark ? "#111111" : "#FFFFFF";
  const border    = isDark ? "#1E1E1E" : "#E0E0E0";
  const labelColor= "#CC0000";
  const inputBg   = isDark ? "#0A0A0A" : "#F8F8F8";
  const textColor = isDark ? "#F0F0F0" : "#111111";
  const textSub   = isDark ? "#A0A0A0" : "#888888";
  const overlay   = isDark ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.35)";

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.hod.trim())  e.hod  = "Required";
    if (!form.headcount || isNaN(form.headcount)) e.headcount = "Valid number required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, headcount: Number(form.headcount), openRoles: Number(form.openRoles) || 0 });
  };

  const field = (label, key, type = "text") => (
    <div>
      <label style={{
        fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700,
        color: labelColor, letterSpacing: "0.15em", display: "block", marginBottom: "6px",
      }}>
        {label.toUpperCase()}{errors[key] ? ` — ${errors[key]}` : ""}
      </label>
      <input type={type} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={{
          width: "100%", background: inputBg, border: `1px solid ${errors[key] ? "#CC0000" : border}`,
          color: textColor, borderRadius: "6px", padding: "8px 10px",
          fontFamily: "Mulish, sans-serif", fontSize: "13px", outline: "none",
        }}
        onFocus={e => { e.target.style.border = "1px solid #00B8B8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)"; }}
        onBlur={e => { e.target.style.border = `1px solid ${errors[key] ? "#CC0000" : border}`; e.target.style.boxShadow = "none"; }}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: overlay }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-xl w-full overflow-hidden" style={{ maxWidth: "460px", background: bg, border: `1px solid ${border}` }}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${border}` }}>
          <div>
            <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textColor }}>
              {isEdit ? "EDIT DEPARTMENT" : "ADD DEPARTMENT"}
            </h2>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub, marginTop: "2px" }}>
              {isEdit ? "Update department details" : "Create a new department"}
            </p>
          </div>
          <button onClick={onClose}
            style={{ color: textSub, transition: "color 150ms" }}
            onMouseEnter={e => e.currentTarget.style.color = "#CC0000"}
            onMouseLeave={e => e.currentTarget.style.color = textSub}>
            <X size={18} />
          </button>
        </div>

        {/* Fields */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {field("Department Name", "name")}
          {field("Head of Department", "hod")}
          <div className="grid grid-cols-2 gap-4">
            {field("Headcount", "headcount", "number")}
            {field("Open Roles", "openRoles", "number")}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: `1px solid ${border}` }}>
          <button onClick={onClose}
            className="px-5 py-2 rounded-md"
            style={{
              background: isDark ? "#1A1A1A" : "#F0F0F0",
              border: `1px solid ${border}`,
              color: textSub,
              fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em",
            }}>
            CANCEL
          </button>
          <button onClick={handleSave}
            className="px-5 py-2 rounded-md flex items-center gap-2"
            style={{
              background: "#CC0000", border: "1px solid #CC0000",
              color: "#FFFFFF",
              fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#AA0000"}
            onMouseLeave={e => e.currentTarget.style.background = "#CC0000"}>
            <Check size={14} />
            {isEdit ? "UPDATE" : "CREATE"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ───────────────────────────────
function DeleteConfirm({ dept, theme, onClose, onConfirm }) {
  const isDark = theme === "dark";
  const bg     = isDark ? "#111111" : "#FFFFFF";
  const border = isDark ? "#1E1E1E" : "#E0E0E0";
  const text   = isDark ? "#F0F0F0" : "#111111";
  const sub    = isDark ? "#A0A0A0" : "#888888";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: isDark ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.35)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-xl w-full overflow-hidden" style={{ maxWidth: "380px", background: bg, border: `1px solid ${border}` }}>
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-full flex items-center justify-center"
              style={{ width: "40px", height: "40px", background: "rgba(204,0,0,0.1)", border: "1px solid rgba(204,0,0,0.3)" }}>
              <Trash2 size={18} style={{ color: "#CC0000" }} />
            </div>
            <div>
              <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: text }}>DELETE DEPARTMENT</h3>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: sub }}>This action cannot be undone</p>
            </div>
          </div>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: sub }}>
            Are you sure you want to delete the <strong style={{ color: text }}>{dept?.name}</strong> department?
            All related data will be removed.
          </p>
        </div>
        <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: `1px solid ${border}` }}>
          <button onClick={onClose}
            className="px-5 py-2 rounded-md"
            style={{ background: isDark ? "#1A1A1A" : "#F0F0F0", border: `1px solid ${border}`, color: sub,
              fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em" }}>
            CANCEL
          </button>
          <button onClick={onConfirm}
            className="px-5 py-2 rounded-md flex items-center gap-2"
            style={{ background: "#CC0000", border: "1px solid #CC0000", color: "#FFFFFF",
              fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em" }}
            onMouseEnter={e => e.currentTarget.style.background = "#AA0000"}
            onMouseLeave={e => e.currentTarget.style.background = "#CC0000"}>
            <Trash2 size={13} />
            DELETE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Departments Component ─────────────────────────
export default function Departments() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const surface = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const textPri = isDark ? "#F0F0F0" : "#111111";
  const textSub = isDark ? "#A0A0A0" : "#888888";
  const inputBg = isDark ? "#111111" : "#FFFFFF";

  const [depts, setDepts]           = useState(departments);
  const [search, setSearch]         = useState("");
  const [modal, setModal]           = useState(null); // null | "add" | {dept}
  const [deleteTarget, setDelTarget]= useState(null);
  const [view, setView]             = useState("cards"); // "cards" | "table"

  const totalHeadcount  = depts.reduce((s, d) => s + d.headcount, 0);
  const totalOpenRoles  = depts.reduce((s, d) => s + d.openRoles, 0);

  const filtered = depts.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.hod.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (data) => {
    if (modal === "add") {
      const newId = Math.max(...depts.map(d => d.id)) + 1;
      setDepts(prev => [...prev, { ...data, id: newId, color: getDeptColor(newId) }]);
    } else {
      setDepts(prev => prev.map(d => d.id === modal.id ? { ...d, ...data } : d));
    }
    setModal(null);
  };

  const handleDelete = () => {
    setDepts(prev => prev.filter(d => d.id !== deleteTarget));
    setDelTarget(null);
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Departments" value={depts.length}       icon={Building2}  accent="#CC0000"  theme={theme} />
        <StatCard label="Total Headcount"   value={totalHeadcount}     icon={Users}      accent="#00B8B8"  theme={theme} />
        <StatCard label="Open Roles"        value={totalOpenRoles}     icon={Briefcase}  accent="#C9922A"  theme={theme} />
        <StatCard label="Active Today"      value={employees.filter(e => e.status === "Present").length} icon={UserCheck} accent="#6366F1" theme={theme} />
      </div>

      {/* ── Toolbar ── */}
      <div className="rounded-xl p-4 flex items-center gap-3 flex-wrap"
        style={{ background: surface, border: `1px solid ${border}` }}>
        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: "200px" }}>
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#666666" }} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search department or HOD..."
            className="outline-none text-xs pl-8 pr-4 py-2 rounded-md w-full"
            style={{ background: inputBg, border: `1px solid ${border}`, color: textPri, fontFamily: "Mulish, sans-serif", fontSize: "13px" }}
            onFocus={e => { e.target.style.border = "1px solid #00B8B8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)"; }}
            onBlur={e => { e.target.style.border = `1px solid ${border}`; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* Count badge */}
        <div className="px-3 py-2 rounded-md"
          style={{ background: isDark ? "#1A1A1A" : "#F5F5F5", border: `1px solid ${border}` }}>
          <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: "#00B8B8" }}>
            {filtered.length} DEPT{filtered.length !== 1 ? "S" : ""}
          </span>
        </div>

        {/* View toggle */}
        <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${border}` }}>
          {["cards", "table"].map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-4 py-2"
              style={{
                background: view === v ? "#CC0000" : inputBg,
                color: view === v ? "#FFFFFF" : textSub,
                fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                borderRight: v === "cards" ? `1px solid ${border}` : "none",
                transition: "all 150ms ease",
              }}>
              {v}
            </button>
          ))}
        </div>

        {/* Add button */}
        <button onClick={() => setModal("add")}
          className="flex items-center gap-2 px-4 py-2 rounded-md"
          style={{
            background: "#CC0000", border: "1px solid #CC0000", color: "#FFFFFF",
            fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em",
            transition: "background 150ms ease",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#AA0000"}
          onMouseLeave={e => e.currentTarget.style.background = "#CC0000"}>
          <Plus size={15} />
          ADD DEPARTMENT
        </button>
      </div>

      {/* ── Cards View ── */}
      {view === "cards" && (
        filtered.length === 0 ? (
          <div className="rounded-xl py-20 flex flex-col items-center gap-3"
            style={{ background: surface, border: `1px solid ${border}` }}>
            <Building2 size={40} style={{ color: "#333333" }} />
            <p style={{ fontFamily: "Mulish, sans-serif", color: textSub, fontSize: "14px" }}>No departments found</p>
          </div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {filtered.map(dept => (
              <DeptCard
                key={dept.id}
                dept={dept}
                empList={employees}
                theme={theme}
                onEdit={(d) => setModal(d)}
                onDelete={(id) => setDelTarget(id)}
              />
            ))}
          </div>
        )
      )}

      {/* ── Table View ── */}
      {view === "table" && (
        <div className="rounded-xl overflow-hidden" style={{ background: surface, border: `1px solid ${border}` }}>
          {/* Header */}
          <div className="grid px-5 py-3"
            style={{
              gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 100px",
              borderBottom: `1px solid ${border}`,
              background: isDark ? "#0D0D0D" : "#F8F8F8",
            }}>
            {["Department", "Head of Dept", "Headcount", "Open Roles", "Present Today", "Actions"].map(h => (
              <span key={h} style={{
                fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
                color: "#CC0000", letterSpacing: "0.15em", textTransform: "uppercase",
              }}>{h}</span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-2">
              <Building2 size={32} style={{ color: "#333333" }} />
              <p style={{ fontFamily: "Mulish, sans-serif", color: textSub, fontSize: "14px" }}>No departments found</p>
            </div>
          ) : (
            filtered.map((dept, idx) => {
              const accent = getDeptColor(dept.id);
              const rowBg = idx % 2 === 0 ? (isDark ? "#0D0D0D" : "#FAFAFA") : surface;
              const deptEmps = employees.filter(e => e.department === dept.name);
              const present  = deptEmps.filter(e => e.status === "Present").length;
              return (
                <div key={dept.id}
                  className="grid px-5 py-3 items-center"
                  style={{
                    gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 100px",
                    borderBottom: `1px solid ${border}`,
                    background: rowBg,
                    transition: "background 150ms ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isDark ? "#131313" : "#F0F0F0"}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg}
                >
                  {/* Name */}
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ width: "34px", height: "34px", background: accent + "18", border: `1px solid ${accent}33` }}>
                      <Building2 size={15} style={{ color: accent }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "14px", color: textPri }}>{dept.name}</p>
                      <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "9px", color: accent }}>DEPT-{String(dept.id).padStart(3,"0")}</p>
                    </div>
                  </div>

                  {/* HOD */}
                  <div className="flex items-center">
                    <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textSub }}>{dept.hod}</span>
                  </div>

                  {/* Headcount */}
                  <div className="flex items-center">
                    <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: "#00B8B8" }}>{dept.headcount}</span>
                  </div>

                  {/* Open Roles */}
                  <div className="flex items-center">
                    <span style={{
                      fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px",
                      color: dept.openRoles > 0 ? "#C9922A" : textSub,
                    }}>{dept.openRoles}</span>
                  </div>

                  {/* Present Today */}
                  <div className="flex items-center gap-2">
                    <div className="rounded-full" style={{ width: "8px", height: "8px", background: "#00B8B8", flexShrink: 0 }} />
                    <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: "#00B8B8" }}>{present}</span>
                    <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textSub }}>/ {dept.headcount}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setModal(dept)}
                      className="rounded-md p-1.5"
                      style={{ color: textSub, transition: "all 150ms", background: "transparent" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#00B8B8"; e.currentTarget.style.background = isDark ? "#1A1A1A" : "#F0F0F0"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = textSub; e.currentTarget.style.background = "transparent"; }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDelTarget(dept.id)}
                      className="rounded-md p-1.5"
                      style={{ color: textSub, transition: "all 150ms", background: "transparent" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#CC0000"; e.currentTarget.style.background = isDark ? "#1A1A1A" : "#F0F0F0"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = textSub; e.currentTarget.style.background = "transparent"; }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Footer */}
          <div className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: `1px solid ${border}`, background: isDark ? "#0D0D0D" : "#F8F8F8" }}>
            <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub }}>
              Showing {filtered.length} of {depts.length} departments
            </span>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {(modal === "add" || (modal && modal.id)) && (
        <DeptModal
          theme={theme}
          onClose={() => setModal(null)}
          onSave={handleSave}
          initial={modal === "add" ? null : modal}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          dept={depts.find(d => d.id === deleteTarget)}
          theme={theme}
          onClose={() => setDelTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}