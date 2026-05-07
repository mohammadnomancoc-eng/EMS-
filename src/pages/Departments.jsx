import { useState } from "react";
import { useTheme } from "../App";
import {
  Building2, Plus, Search, Edit2, Trash2,
  Users, Briefcase, X, Check, ChevronDown,
  UserCircle, TrendingUp
} from "lucide-react";
import { employees, departments as initialDepts } from "../data/mockData";

// ── Helpers ───────────────────────────────────────────
function getInitials(name) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

const avatarColors = [
  "#CC0000", "#00B8B8", "#C9922A", "#6366F1", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#06B6D4", "#84CC16",
];
function getAvatarColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

const DEPT_COLORS = ["#00B8B8", "#CC0000", "#C9922A", "#6366F1", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];

// ── Department Modal (Add / Edit) ─────────────────────
function DeptModal({ theme, onClose, onSave, initial }) {
  const isEdit = !!initial;
  const isDark = theme === "dark";

  const [form, setForm] = useState(
    initial || { name: "", hod: "", openRoles: 0, color: "#00B8B8" }
  );
  const [errors, setErrors] = useState({});

  const bg      = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const inputBg = isDark ? "#0A0A0A" : "#F8F8F8";
  const text    = isDark ? "#F0F0F0" : "#111111";
  const labelC  = "#CC0000";

  const hodOptions = employees.map((e) => e.name);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.hod.trim()) e.hod = "Required";
    if (isNaN(form.openRoles) || form.openRoles < 0) e.openRoles = "Must be ≥ 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, openRoles: Number(form.openRoles) });
  };

  const inputStyle = (key) => ({
    width: "100%",
    background: inputBg,
    border: `1px solid ${errors[key] ? "#CC0000" : border}`,
    color: text,
    borderRadius: "6px",
    padding: "8px 10px",
    fontFamily: "Mulish, sans-serif",
    fontSize: "13px",
    outline: "none",
    transition: "border 150ms",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="rounded-2xl w-full max-w-md mx-4"
        style={{ background: bg, border: `1px solid ${border}`, boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: `1px solid ${border}` }}>
          <div>
            <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: text }}>
              {isEdit ? "Edit Department" : "Add Department"}
            </h2>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: isDark ? "#555555" : "#999999", marginTop: "2px" }}>
              {isEdit ? "Update department details" : "Create a new department"}
            </p>
          </div>
          <button onClick={onClose} style={{ color: isDark ? "#444444" : "#AAAAAA" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#CC0000"}
            onMouseLeave={(e) => e.currentTarget.style.color = isDark ? "#444444" : "#AAAAAA"}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, color: labelC, letterSpacing: "0.15em", display: "block", marginBottom: "6px" }}>
              DEPARTMENT NAME{errors.name ? ` — ${errors.name}` : ""}
            </label>
            <input
              type="text"
              placeholder="e.g. Engineering"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={inputStyle("name")}
              onFocus={(e) => { e.target.style.border = "1px solid #00B8B8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)"; }}
              onBlur={(e) => { e.target.style.border = `1px solid ${errors.name ? "#CC0000" : border}`; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* HOD */}
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, color: labelC, letterSpacing: "0.15em", display: "block", marginBottom: "6px" }}>
              HEAD OF DEPARTMENT{errors.hod ? ` — ${errors.hod}` : ""}
            </label>
            <div className="relative">
              <select
                value={form.hod}
                onChange={(e) => setForm((f) => ({ ...f, hod: e.target.value }))}
                style={{ ...inputStyle("hod"), appearance: "none", paddingRight: "32px", cursor: "pointer" }}
              >
                <option value="">Select HOD</option>
                {hodOptions.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: isDark ? "#555555" : "#AAAAAA" }} />
            </div>
          </div>

          {/* Open Roles */}
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, color: labelC, letterSpacing: "0.15em", display: "block", marginBottom: "6px" }}>
              OPEN ROLES{errors.openRoles ? ` — ${errors.openRoles}` : ""}
            </label>
            <input
              type="number"
              min="0"
              value={form.openRoles}
              onChange={(e) => setForm((f) => ({ ...f, openRoles: e.target.value }))}
              style={inputStyle("openRoles")}
              onFocus={(e) => { e.target.style.border = "1px solid #00B8B8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)"; }}
              onBlur={(e) => { e.target.style.border = `1px solid ${errors.openRoles ? "#CC0000" : border}`; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Color Picker */}
          <div>
            <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, color: labelC, letterSpacing: "0.15em", display: "block", marginBottom: "8px" }}>
              DEPARTMENT COLOR
            </label>
            <div className="flex gap-2 flex-wrap">
              {DEPT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className="rounded-full flex items-center justify-center transition-all"
                  style={{
                    width: "26px", height: "26px",
                    background: c,
                    border: form.color === c ? `2px solid ${isDark ? "#FFFFFF" : "#111111"}` : "2px solid transparent",
                    boxShadow: form.color === c ? `0 0 0 1px ${c}` : "none",
                    transform: form.color === c ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm"
            style={{
              fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em",
              background: "transparent", border: `1px solid ${border}`, color: isDark ? "#555555" : "#AAAAAA",
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2"
            style={{
              fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em",
              background: "#CC0000", border: "1px solid #CC0000", color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            <Check size={14} />
            {isEdit ? "SAVE CHANGES" : "CREATE"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────
function DeleteModal({ theme, dept, onClose, onConfirm }) {
  const isDark = theme === "dark";
  const bg = isDark ? "#111111" : "#FFFFFF";
  const border = isDark ? "#1E1E1E" : "#E0E0E0";
  const text = isDark ? "#F0F0F0" : "#111111";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}>
      <div className="rounded-2xl w-full max-w-sm mx-4"
        style={{ background: bg, border: `1px solid ${border}`, boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
        <div className="p-6">
          <div className="flex items-center justify-center mb-4"
            style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(204,0,0,0.1)", border: "1px solid rgba(204,0,0,0.3)" }}>
            <Trash2 size={22} style={{ color: "#CC0000" }} />
          </div>
          <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: text, marginBottom: "8px" }}>
            Delete Department
          </h2>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: isDark ? "#777777" : "#888888", lineHeight: 1.6 }}>
            Are you sure you want to delete <strong style={{ color: text }}>{dept.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg"
              style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em", background: "transparent", border: `1px solid ${border}`, color: isDark ? "#555555" : "#AAAAAA", cursor: "pointer" }}>
              CANCEL
            </button>
            <button onClick={onConfirm} className="flex-1 py-2 rounded-lg"
              style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em", background: "#CC0000", border: "1px solid #CC0000", color: "#FFFFFF", cursor: "pointer" }}>
              DELETE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Department Card ───────────────────────────────────
function DeptCard({ dept, theme, onEdit, onDelete }) {
  const isDark = theme === "dark";
  const bg = isDark ? "#111111" : "#FFFFFF";
  const border = isDark ? "#1E1E1E" : "#E0E0E0";
  const text = isDark ? "#F0F0F0" : "#111111";
  const sub = isDark ? "#555555" : "#999999";

  const deptEmployees = employees.filter((e) => e.department === dept.name);

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 group"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.06)",
        transition: "border 200ms, box-shadow 200ms",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = `1px solid ${dept.color}40`;
        e.currentTarget.style.boxShadow = isDark ? `0 0 0 1px ${dept.color}20` : `0 4px 20px rgba(0,0,0,0.1)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = `1px solid ${border}`;
        e.currentTarget.style.boxShadow = isDark ? "none" : "0 2px 8px rgba(0,0,0,0.06)";
      }}
    >
      {/* Color accent top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: dept.color, borderRadius: "12px 12px 0 0" }} />

      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl flex items-center justify-center"
            style={{ width: "42px", height: "42px", background: `${dept.color}18`, border: `1px solid ${dept.color}30` }}>
            <Building2 size={20} style={{ color: dept.color }} />
          </div>
          <div>
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: text, lineHeight: 1.2 }}>
              {dept.name}
            </h3>
            <div className="flex items-center gap-1 mt-1">
              <UserCircle size={11} style={{ color: sub }} />
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: sub }}>
                {dept.hod}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1" style={{ opacity: 0, transition: "opacity 150ms" }}
          ref={(el) => {
            if (el) {
              el.closest(".group").addEventListener("mouseenter", () => el.style.opacity = "1");
              el.closest(".group").addEventListener("mouseleave", () => el.style.opacity = "0");
            }
          }}>
          <button
            onClick={() => onEdit(dept)}
            className="rounded-lg p-1.5"
            style={{ background: isDark ? "#1A1A1A" : "#F0F0F0", color: isDark ? "#555555" : "#888888", transition: "all 150ms", border: `1px solid ${border}` }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#00B8B8"; e.currentTarget.style.borderColor = "#00B8B840"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "#555555" : "#888888"; e.currentTarget.style.borderColor = border; }}
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onDelete(dept)}
            className="rounded-lg p-1.5"
            style={{ background: isDark ? "#1A1A1A" : "#F0F0F0", color: isDark ? "#555555" : "#888888", transition: "all 150ms", border: `1px solid ${border}` }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#CC0000"; e.currentTarget.style.borderColor = "#CC000040"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "#555555" : "#888888"; e.currentTarget.style.borderColor = border; }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg p-3" style={{ background: isDark ? "#0A0A0A" : "#F8F8F8", border: `1px solid ${border}` }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={12} style={{ color: sub }} />
            <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: sub, letterSpacing: "0.12em" }}>HEADCOUNT</span>
          </div>
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "22px", color: dept.color, lineHeight: 1 }}>
            {dept.headcount}
          </span>
        </div>
        <div className="rounded-lg p-3" style={{ background: isDark ? "#0A0A0A" : "#F8F8F8", border: `1px solid ${border}` }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Briefcase size={12} style={{ color: sub }} />
            <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: sub, letterSpacing: "0.12em" }}>OPEN ROLES</span>
          </div>
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "22px", color: dept.openRoles > 0 ? "#C9922A" : sub, lineHeight: 1 }}>
            {dept.openRoles}
          </span>
        </div>
      </div>

      {/* Employee Avatars */}
      {deptEmployees.length > 0 && (
        <div>
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: sub, letterSpacing: "0.12em", display: "block", marginBottom: "8px" }}>
            MEMBERS
          </span>
          <div className="flex items-center">
            {deptEmployees.slice(0, 6).map((emp, i) => (
              <div
                key={emp.id}
                title={emp.name}
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  width: "28px", height: "28px",
                  background: getAvatarColor(emp.id),
                  border: `2px solid ${isDark ? "#111111" : "#FFFFFF"}`,
                  marginLeft: i === 0 ? "0" : "-8px",
                  zIndex: 10 - i,
                }}
              >
                <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "10px" }}>
                  {getInitials(emp.name)}
                </span>
              </div>
            ))}
            {deptEmployees.length > 6 && (
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{ width: "28px", height: "28px", background: isDark ? "#1E1E1E" : "#E0E0E0", border: `2px solid ${isDark ? "#111111" : "#FFFFFF"}`, marginLeft: "-8px", zIndex: 0 }}>
                <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "9px", fontWeight: 700, color: sub }}>
                  +{deptEmployees.length - 6}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Departments Table Row ─────────────────────────────
function TableRow({ dept, theme, onEdit, onDelete, index }) {
  const isDark = theme === "dark";
  const text = isDark ? "#F0F0F0" : "#111111";
  const sub = isDark ? "#555555" : "#999999";
  const border = isDark ? "#1A1A1A" : "#F0F0F0";

  return (
    <tr style={{ borderBottom: `1px solid ${border}`, transition: "background 150ms" }}
      onMouseEnter={(e) => e.currentTarget.style.background = isDark ? "#0D0D0D" : "#FAFAFA"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
      <td style={{ padding: "12px 16px" }}>
        <div className="flex items-center gap-3">
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: dept.color, flexShrink: 0 }} />
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "14px", color: text }}>
            {dept.name}
          </span>
        </div>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <div className="flex items-center gap-2">
          <div className="rounded-full flex items-center justify-center"
            style={{ width: "26px", height: "26px", background: getAvatarColor(dept.hod), flexShrink: 0 }}>
            <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "9px" }}>
              {getInitials(dept.hod)}
            </span>
          </div>
          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: text }}>{dept.hod}</span>
        </div>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "15px", color: dept.color }}>
          {dept.headcount}
        </span>
      </td>
      <td style={{ padding: "12px 16px" }}>
        {dept.openRoles > 0 ? (
          <span style={{ background: "rgba(201,146,42,0.1)", border: "1px solid rgba(201,146,42,0.35)", color: "#C9922A", fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600, borderRadius: "4px", padding: "2px 8px" }}>
            {dept.openRoles} Open
          </span>
        ) : (
          <span style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#F0F0F0", border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`, color: sub, fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600, borderRadius: "4px", padding: "2px 8px" }}>
            None
          </span>
        )}
      </td>
      <td style={{ padding: "12px 16px" }}>
        <div className="flex gap-1">
          <button onClick={() => onEdit(dept)}
            className="rounded-lg p-1.5"
            style={{ background: "transparent", color: isDark ? "#444444" : "#BBBBBB", border: "1px solid transparent", transition: "all 150ms", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#00B8B8"; e.currentTarget.style.background = isDark ? "#0D1A1A" : "#E6F9F9"; e.currentTarget.style.borderColor = "#00B8B830"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "#444444" : "#BBBBBB"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(dept)}
            className="rounded-lg p-1.5"
            style={{ background: "transparent", color: isDark ? "#444444" : "#BBBBBB", border: "1px solid transparent", transition: "all 150ms", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#CC0000"; e.currentTarget.style.background = isDark ? "#1A0D0D" : "#FDECEA"; e.currentTarget.style.borderColor = "#CC000030"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "#444444" : "#BBBBBB"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main Departments Page ─────────────────────────────
export default function Departments() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [depts, setDepts]           = useState(initialDepts);
  const [search, setSearch]         = useState("");
  const [view, setView]             = useState("grid"); // "grid" | "table"
  const [showAdd, setShowAdd]       = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const bg     = isDark ? "#0A0A0A" : "#F5F5F5";
  const card   = isDark ? "#111111" : "#FFFFFF";
  const border = isDark ? "#1E1E1E" : "#E0E0E0";
  const text   = isDark ? "#F0F0F0" : "#111111";
  const sub    = isDark ? "#555555" : "#999999";

  const filtered = depts.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.hod.toLowerCase().includes(search.toLowerCase())
  );

  const totalHeadcount = depts.reduce((s, d) => s + d.headcount, 0);
  const totalOpen = depts.reduce((s, d) => s + d.openRoles, 0);

  const handleAdd = (data) => {
    const maxId = depts.reduce((m, d) => Math.max(m, d.id), 0);
    // derive headcount from employees
    const hc = employees.filter((e) => e.department === data.name).length;
    setDepts((prev) => [...prev, { ...data, id: maxId + 1, headcount: hc }]);
    setShowAdd(false);
  };

  const handleEdit = (data) => {
    setDepts((prev) => prev.map((d) => d.id === editTarget.id ? { ...d, ...data } : d));
    setEditTarget(null);
  };

  const handleDelete = () => {
    setDepts((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ── KPI Strip ─────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "TOTAL DEPARTMENTS", value: depts.length, icon: Building2, color: "#00B8B8" },
          { label: "TOTAL HEADCOUNT",   value: totalHeadcount, icon: Users, color: "#CC0000" },
          { label: "OPEN ROLES",        value: totalOpen, icon: TrendingUp, color: "#C9922A" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-5 flex items-center gap-4"
            style={{ background: card, border: `1px solid ${border}`, boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div className="rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ width: "44px", height: "44px", background: `${color}18`, border: `1px solid ${color}30` }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: sub, letterSpacing: "0.15em" }}>{label}</p>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "26px", color, lineHeight: 1.1, marginTop: "2px" }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: sub }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments..."
            className="outline-none text-xs"
            style={{
              paddingLeft: "32px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px",
              width: "240px", borderRadius: "8px",
              background: card, border: `1px solid ${border}`,
              color: text, fontFamily: "Mulish, sans-serif", fontSize: "13px",
              transition: "border 150ms",
            }}
            onFocus={(e) => { e.target.style.border = "1px solid #00B8B8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)"; }}
            onBlur={(e) => { e.target.style.border = `1px solid ${border}`; e.target.style.boxShadow = "none"; }}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${border}` }}>
            {["grid", "table"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "6px 14px",
                  fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
                  background: view === v ? "#CC0000" : "transparent",
                  color: view === v ? "#FFFFFF" : sub,
                  border: "none", cursor: "pointer", transition: "all 150ms",
                  textTransform: "uppercase",
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Add Dept */}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{
              fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "12px", letterSpacing: "0.1em",
              background: "#CC0000", border: "1px solid #CC0000", color: "#FFFFFF", cursor: "pointer",
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#AA0000"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#CC0000"}
          >
            <Plus size={14} />
            ADD DEPARTMENT
          </button>
        </div>
      </div>

      {/* ── Grid View ─────────────────────────── */}
      {view === "grid" && (
        <>
          {filtered.length === 0 ? (
            <div className="rounded-xl py-20 flex flex-col items-center gap-3"
              style={{ background: card, border: `1px solid ${border}` }}>
              <Building2 size={40} style={{ color: isDark ? "#2A2A2A" : "#DDDDDD" }} />
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: sub }}>No departments found</p>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: isDark ? "#3A3A3A" : "#CCCCCC" }}>Try adjusting your search</p>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {filtered.map((dept) => (
                <DeptCard
                  key={dept.id}
                  dept={dept}
                  theme={theme}
                  onEdit={setEditTarget}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Table View ────────────────────────── */}
      {view === "table" && (
        <div className="rounded-xl overflow-hidden" style={{ background: card, border: `1px solid ${border}`, boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                {["Department", "Head of Dept", "Headcount", "Open Roles", "Actions"].map((h) => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left",
                    fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
                    color: "#CC0000", letterSpacing: "0.15em",
                    background: isDark ? "#0D0D0D" : "#FAFAFA",
                  }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "40px", textAlign: "center", fontFamily: "Mulish, sans-serif", fontSize: "13px", color: sub }}>
                    No departments found
                  </td>
                </tr>
              ) : (
                filtered.map((dept, i) => (
                  <TableRow key={dept.id} dept={dept} theme={theme} index={i} onEdit={setEditTarget} onDelete={setDeleteTarget} />
                ))
              )}
            </tbody>
          </table>
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${border}` }}>
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: sub }}>
              {filtered.length} of {depts.length} department{depts.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────── */}
      {showAdd && (
        <DeptModal theme={theme} onClose={() => setShowAdd(false)} onSave={handleAdd} />
      )}
      {editTarget && (
        <DeptModal theme={theme} onClose={() => setEditTarget(null)} onSave={handleEdit} initial={editTarget} />
      )}
      {deleteTarget && (
        <DeleteModal theme={theme} dept={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
}
