// ─────────────────────────────────────────────────────────────
//  src/pages/Departments.jsx  — Fully Responsive
//
//  All original bug fixes preserved (BUG-11).
//  Responsive changes:
//  • Stat cards  : 4-col → 2-col on mobile, 4-col on lg+
//  • Stat numbers: 32px → clamp(22px, 4vw, 32px)
//  • StatCard    : row layout kept, icon + text side-by-side
//  • Toolbar     : stacks on mobile; search full-width; ADD btn
//                  shows icon-only on xs, full label on sm+
//  • View toggle : hidden on mobile (cards always shown); visible sm+
//  • Cards grid  : minmax(320px,1fr) → minmax(280px,1fr)
//  • DeptCard    : no changes needed (already flex-col)
//  • Table view  : horizontally scrollable on mobile
//  • Table rows  : minWidth so columns never crush
//  • DeptModal   : bottom-sheet on mobile, centered on sm+
//                  w full on mobile → maxWidth 460px on sm+
//                  maxHeight + body scroll
//  • DeleteConfirm: same bottom-sheet treatment
//  • All modals  : rounded-t-2xl sm:rounded-xl
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useTheme } from "../App";
import {
  Building2, Users, Briefcase, Plus, Edit2,
  Trash2, X, Check, Search,
  TrendingUp, UserCheck, Shield,
} from "lucide-react";
import {
  subscribeEmployees,
  subscribeDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
} from "../firebase/firestoreService";

// ── Helpers ────────────────────────────────────────────
function getInitials(name = "") {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase() || "?";
}

const accentPalette = ["#CC0000", "#00B8B8", "#C9922A", "#6366F1", "#10B981", "#F59E0B"];

function getDeptColor(id = "") {
  let hash = 0;
  for (let i = 0; i < String(id).length; i++) {
    hash = String(id).charCodeAt(i) + ((hash << 5) - hash);
  }
  return accentPalette[Math.abs(hash) % accentPalette.length];
}

// ── Stat Card ──────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent, sub, theme }) {
  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textMuted = theme === "dark" ? "#666666" : "#888888";
  const iconBg    = theme === "dark" ? "#1A1A1A" : "#F5F5F5";

  return (
    <div
      className="rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4"
      style={{
        background: surface,
        border: `1px solid ${border}`,
        boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 200ms ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = accent}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = border}
    >
      <div
        className="rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ width: "40px", height: "40px", background: iconBg, border: `1px solid ${border}` }}
      >
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p style={{
          fontFamily: "Share Tech Mono, monospace", fontSize: "9px",
          color: textMuted, letterSpacing: "0.1em", textTransform: "uppercase",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {label}
        </p>
        <p style={{
          fontFamily: "Rajdhani, sans-serif",
          fontSize: "clamp(22px, 4vw, 32px)",
          fontWeight: 700, color: accent, lineHeight: 1.1,
        }}>
          {value}
        </p>
        {sub && (
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted, marginTop: "2px" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Department Card ────────────────────────────────────
function DeptCard({ dept, empList, theme, onEdit, onDelete }) {
  const isDark  = theme === "dark";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const textPri = isDark ? "#F0F0F0" : "#111111";
  const textSub = isDark ? "#A0A0A0" : "#888888";
  const accent  = getDeptColor(dept.id);
  const [hover, setHover] = useState(false);

  // BUG-11 FIX: derive from real Firestore employee list
  const deptEmps = empList.filter((e) => e.department === dept.name);
  const present  = deptEmps.filter((e) => e.status === "Present").length;

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

      <div className="p-4 sm:p-5 flex flex-col gap-4 flex-1">
        {/* Header row: icon + name + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ width: "40px", height: "40px", background: accent + "18", border: `1px solid ${accent}33` }}
            >
              <Building2 size={19} style={{ color: accent }} />
            </div>
            <div className="min-w-0">
              <h3 style={{
                fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
                fontSize: "clamp(14px, 3.5vw, 17px)", color: textPri,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {dept.name}
              </h3>
              <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "9px", color: accent, letterSpacing: "0.1em" }}>
                {dept.id}
              </p>
            </div>
          </div>

          {/* Edit / Delete */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(dept)}
              className="rounded-md p-1.5"
              style={{ color: textSub, transition: "all 150ms", background: "transparent" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#00B8B8"; e.currentTarget.style.background = isDark ? "#1A1A1A" : "#F0F0F0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = textSub; e.currentTarget.style.background = "transparent"; }}
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => onDelete(dept.id)}
              className="rounded-md p-1.5"
              style={{ color: textSub, transition: "all 150ms", background: "transparent" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#CC0000"; e.currentTarget.style.background = isDark ? "#1A1A1A" : "#F0F0F0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = textSub; e.currentTarget.style.background = "transparent"; }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* HOD strip */}
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: isDark ? "#0D0D0D" : "#F8F8F8", border: `1px solid ${border}` }}
        >
          <Shield size={12} style={{ color: accent, flexShrink: 0 }} />
          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub }}>HOD:</span>
          <span style={{
            fontFamily: "Rajdhani, sans-serif", fontWeight: 600, fontSize: "13px", color: textPri,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {dept.hod || "—"}
          </span>
        </div>

        {/* Stats 3-col mini grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { val: dept.headcount ?? deptEmps.length, label: "Headcount", color: accent },
            { val: deptEmps.length,                   label: "Assigned",  color: "#00B8B8" },
            { val: dept.openRoles ?? 0,               label: "Open Roles",color: "#C9922A" },
          ].map(({ val, label, color }) => (
            <div
              key={label}
              className="rounded-lg p-2 sm:p-3 text-center"
              style={{ background: isDark ? "#0D0D0D" : "#F8F8F8", border: `1px solid ${border}` }}
            >
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "20px", color, lineHeight: 1 }}>
                {val}
              </p>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: textSub, marginTop: "2px" }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Team member avatars */}
        {deptEmps.length > 0 && (
          <div>
            <p style={{
              fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
              color: "#CC0000", letterSpacing: "0.15em", marginBottom: "8px",
            }}>
              TEAM MEMBERS
            </p>
            <div className="flex flex-wrap gap-1">
              {deptEmps.slice(0, 8).map((emp) => (
                <div
                  key={emp.id}
                  title={emp.name}
                  className="rounded-full flex-shrink-0 overflow-hidden"
                  style={{
                    width: "28px", height: "28px",
                    background: emp.photoUrl ? "transparent" : accentPalette[Math.abs(emp.id.charCodeAt(0) || 0) % accentPalette.length],
                    border: `2px solid ${isDark ? "#111111" : "#FFFFFF"}`,
                    cursor: "default",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {emp.photoUrl
                    ? <img src={emp.photoUrl} alt={emp.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "9px" }}>{getInitials(emp.name)}</span>
                  }
                </div>
              ))}
              {deptEmps.length > 8 && (
                <div
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    width: "28px", height: "28px",
                    background: isDark ? "#1A1A1A" : "#E8E8E8",
                    border: `2px solid ${isDark ? "#111111" : "#FFFFFF"}`,
                  }}
                >
                  <span style={{ fontFamily: "Rajdhani, sans-serif", color: textSub, fontWeight: 700, fontSize: "9px" }}>
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

// ── Add / Edit Modal ───────────────────────────────────
function DeptModal({ theme, onClose, onSave, initial, saving }) {
  const isEdit = !!initial;
  const isDark = theme === "dark";

  const [form, setForm] = useState(initial
    ? { name: initial.name || "", hod: initial.hod || "", headcount: initial.headcount ?? "", openRoles: initial.openRoles ?? 0 }
    : { name: "", hod: "", headcount: "", openRoles: 0 }
  );
  const [errors, setErrors] = useState({});

  const bg        = isDark ? "#111111" : "#FFFFFF";
  const border    = isDark ? "#1E1E1E" : "#E0E0E0";
  const inputBg   = isDark ? "#0A0A0A" : "#F8F8F8";
  const textColor = isDark ? "#F0F0F0" : "#111111";
  const textSub   = isDark ? "#A0A0A0" : "#888888";
  const overlay   = isDark ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.45)";

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
        color: "#CC0000", letterSpacing: "0.15em", display: "block", marginBottom: "6px",
      }}>
        {label.toUpperCase()}{errors[key] ? ` — ${errors[key]}` : ""}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        style={{
          width: "100%", background: inputBg,
          border: `1px solid ${errors[key] ? "#CC0000" : border}`,
          color: textColor, borderRadius: "6px", padding: "8px 10px",
          fontFamily: "Mulish, sans-serif", fontSize: "13px", outline: "none",
          boxSizing: "border-box",
        }}
        onFocus={(e) => { e.target.style.border = "1px solid #00B8B8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)"; }}
        onBlur={(e) => { e.target.style.border = `1px solid ${errors[key] ? "#CC0000" : border}`; e.target.style.boxShadow = "none"; }}
      />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: overlay }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-t-2xl sm:rounded-xl w-full overflow-hidden flex flex-col"
        style={{
          maxWidth: "460px",
          maxHeight: "92dvh",
          background: bg,
          border: `1px solid ${border}`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          <div>
            <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "clamp(15px, 4vw, 18px)", color: textColor }}>
              {isEdit ? "EDIT DEPARTMENT" : "ADD DEPARTMENT"}
            </h2>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub, marginTop: "2px" }}>
              {isEdit ? "Update department details" : "Create a new department"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ color: textSub, transition: "color 150ms", flexShrink: 0 }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#CC0000"}
            onMouseLeave={(e) => e.currentTarget.style.color = textSub}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable fields */}
        <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1">
          {field("Department Name", "name")}
          {field("Head of Department", "hod")}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {field("Headcount", "headcount", "number")}
            {field("Open Roles", "openRoles", "number")}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 flex gap-3 justify-end flex-shrink-0"
          style={{ borderTop: `1px solid ${border}` }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md"
            style={{
              background: isDark ? "#1A1A1A" : "#F0F0F0",
              border: `1px solid ${border}`, color: textSub,
              fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-md flex items-center gap-2"
            style={{
              background: saving ? "#880000" : "#CC0000",
              border: "1px solid #CC0000", color: "#FFFFFF",
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em",
            }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = "#AA0000"; }}
            onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = saving ? "#880000" : "#CC0000"; }}
          >
            <Check size={14} />
            {saving ? "SAVING…" : (isEdit ? "UPDATE" : "CREATE")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ───────────────────────────────
function DeleteConfirm({ dept, theme, onClose, onConfirm, deleting }) {
  const isDark = theme === "dark";
  const bg     = isDark ? "#111111" : "#FFFFFF";
  const border = isDark ? "#1E1E1E" : "#E0E0E0";
  const text   = isDark ? "#F0F0F0" : "#111111";
  const sub    = isDark ? "#A0A0A0" : "#888888";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: isDark ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-t-2xl sm:rounded-xl w-full overflow-hidden"
        style={{ maxWidth: "400px", background: bg, border: `1px solid ${border}` }}
      >
        <div className="px-5 py-5">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="rounded-full flex items-center justify-center flex-shrink-0"
              style={{ width: "40px", height: "40px", background: "rgba(204,0,0,0.1)", border: "1px solid rgba(204,0,0,0.3)" }}
            >
              <Trash2 size={18} style={{ color: "#CC0000" }} />
            </div>
            <div>
              <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: text }}>
                DELETE DEPARTMENT
              </h3>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: sub }}>
                This action cannot be undone
              </p>
            </div>
          </div>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: sub, lineHeight: 1.5 }}>
            Are you sure you want to delete the{" "}
            <strong style={{ color: text }}>{dept?.name}</strong> department?
          </p>
        </div>

        <div
          className="px-5 py-4 flex gap-3 justify-end"
          style={{ borderTop: `1px solid ${border}` }}
        >
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none px-5 py-2 rounded-md"
            style={{
              background: isDark ? "#1A1A1A" : "#F0F0F0",
              border: `1px solid ${border}`, color: sub,
              fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 sm:flex-none px-5 py-2 rounded-md flex items-center justify-center gap-2"
            style={{
              background: deleting ? "#880000" : "#CC0000",
              border: "1px solid #CC0000", color: "#FFFFFF",
              cursor: deleting ? "not-allowed" : "pointer",
              fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em",
            }}
            onMouseEnter={(e) => { if (!deleting) e.currentTarget.style.background = "#AA0000"; }}
            onMouseLeave={(e) => { if (!deleting) e.currentTarget.style.background = deleting ? "#880000" : "#CC0000"; }}
          >
            <Trash2 size={13} />
            {deleting ? "DELETING…" : "DELETE"}
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

  // BUG-11 FIX: real-time Firestore state
  const [depts,     setDepts]     = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const [search,       setSearch]    = useState("");
  const [modal,        setModal]     = useState(null);
  const [deleteTarget, setDelTarget] = useState(null);
  const [view,         setView]      = useState("cards");
  const [saving,       setSaving]    = useState(false);
  const [deleting,     setDeleting]  = useState(false);

  useEffect(() => {
    const unsubDepts = subscribeDepartments((list) => {
      setDepts(list);
      setLoading(false);
    });
    const unsubEmps = subscribeEmployees((list) => setEmployees(list));
    return () => { unsubDepts(); unsubEmps(); };
  }, []);

  // BUG-11 FIX: stats from real Firestore data
  const totalHeadcount = depts.reduce((s, d) => s + (d.headcount ?? 0), 0);
  const totalOpenRoles = depts.reduce((s, d) => s + (d.openRoles  ?? 0), 0);
  const activeToday    = employees.filter((e) => e.status === "Present").length;

  const filtered = depts.filter((d) =>
    (d.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.hod  || "").toLowerCase().includes(search.toLowerCase())
  );

  // BUG-11 FIX: CRUD writes to Firestore
  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (modal === "add") {
        await addDepartment(data);
      } else {
        await updateDepartment(modal.id, data);
      }
      setModal(null);
    } catch (err) {
      console.error("Failed to save department:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDepartment(deleteTarget);
      setDelTarget(null);
    } catch (err) {
      console.error("Failed to delete department:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">

      {/* ── Stat Cards: 2-col mobile → 4-col lg+ ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Departments" value={depts.length}   icon={Building2} accent="#CC0000" theme={theme} />
        <StatCard label="Total Headcount"   value={totalHeadcount} icon={Users}     accent="#00B8B8" theme={theme} />
        <StatCard label="Open Roles"        value={totalOpenRoles} icon={Briefcase} accent="#C9922A" theme={theme} />
        {/* BUG-11 FIX: activeToday from real Firestore employees */}
        <StatCard label="Active Today"      value={activeToday}    icon={UserCheck} accent="#6366F1" theme={theme} />
      </div>

      {/* ── Toolbar ── */}
      <div
        className="rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3"
        style={{ background: surface, border: `1px solid ${border}` }}
      >
        {/* Search — full width on mobile */}
        <div className="relative w-full sm:flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#666666" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search department or HOD..."
            className="outline-none pl-8 pr-4 py-2 rounded-md w-full"
            style={{
              background: inputBg, border: `1px solid ${border}`,
              color: textPri, fontFamily: "Mulish, sans-serif", fontSize: "13px",
            }}
            onFocus={(e) => { e.target.style.border = "1px solid #00B8B8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)"; }}
            onBlur={(e) => { e.target.style.border = `1px solid ${border}`; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* Right-side controls row */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Count badge */}
          <div
            className="px-3 py-2 rounded-md flex-shrink-0"
            style={{ background: isDark ? "#1A1A1A" : "#F5F5F5", border: `1px solid ${border}` }}
          >
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: "#00B8B8" }}>
              {filtered.length} DEPT{filtered.length !== 1 ? "S" : ""}
            </span>
          </div>

          {/* View toggle — hidden on mobile (cards always shown), shown sm+ */}
          <div className="hidden sm:flex rounded-md overflow-hidden flex-shrink-0"
            style={{ border: `1px solid ${border}` }}>
            {["cards", "table"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-4 py-2"
                style={{
                  background: view === v ? "#CC0000" : inputBg,
                  color: view === v ? "#FFFFFF" : textSub,
                  fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  borderRight: v === "cards" ? `1px solid ${border}` : "none",
                  transition: "all 150ms ease",
                  cursor: "pointer",
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Add button — icon only on xs, full label on sm+ */}
          <button
            onClick={() => setModal("add")}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md flex-shrink-0"
            style={{
              background: "#CC0000", border: "1px solid #CC0000", color: "#FFFFFF",
              fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700,
              letterSpacing: "0.08em", transition: "background 150ms ease", cursor: "pointer",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#AA0000"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#CC0000"}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">ADD DEPARTMENT</span>
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div
          className="rounded-xl py-20 flex flex-col items-center gap-3"
          style={{ background: surface, border: `1px solid ${border}` }}
        >
          <p style={{ fontFamily: "Mulish, sans-serif", color: textSub, fontSize: "14px" }}>
            Loading departments…
          </p>
        </div>
      )}

      {/* ── Cards View (always shown on mobile, togglable on sm+) ── */}
      {!loading && (view === "cards" || window.innerWidth < 640) && (
        filtered.length === 0 ? (
          <div
            className="rounded-xl py-20 flex flex-col items-center gap-3"
            style={{ background: surface, border: `1px solid ${border}` }}
          >
            <Building2 size={40} style={{ color: "#333333" }} />
            <p style={{ fontFamily: "Mulish, sans-serif", color: textSub, fontSize: "14px", textAlign: "center", padding: "0 24px" }}>
              {depts.length === 0 ? "No departments yet. Add one to get started." : "No departments match your search."}
            </p>
          </div>
        ) : (
          <div
            className="grid gap-4 sm:gap-5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))" }}
          >
            {filtered.map((dept) => (
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

      {/* ── Table View (sm+ only) ── */}
      {!loading && view === "table" && (
        <div
          className="hidden sm:block rounded-xl overflow-hidden"
          style={{ background: surface, border: `1px solid ${border}` }}
        >
          <div style={{ overflowX: "auto" }}>
            {/* Table Header */}
            <div
              className="grid px-5 py-3"
              style={{
                gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 100px",
                borderBottom: `1px solid ${border}`,
                background: isDark ? "#0D0D0D" : "#F8F8F8",
                minWidth: "620px",
              }}
            >
              {["Department", "Head of Dept", "Headcount", "Open Roles", "Assigned", "Actions"].map((h) => (
                <span key={h} style={{
                  fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
                  color: "#CC0000", letterSpacing: "0.15em", textTransform: "uppercase",
                }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Table Rows */}
            {filtered.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-2">
                <Building2 size={32} style={{ color: "#333333" }} />
                <p style={{ fontFamily: "Mulish, sans-serif", color: textSub, fontSize: "14px" }}>
                  No departments found
                </p>
              </div>
            ) : (
              filtered.map((dept, idx) => {
                const accent   = getDeptColor(dept.id);
                const rowBg    = idx % 2 === 0 ? (isDark ? "#0D0D0D" : "#FAFAFA") : surface;
                // BUG-11 FIX: live count from real Firestore employees
                const deptEmps = employees.filter((e) => e.department === dept.name);
                return (
                  <div
                    key={dept.id}
                    className="grid px-5 py-3 items-center"
                    style={{
                      gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 100px",
                      borderBottom: `1px solid ${border}`,
                      background: rowBg,
                      transition: "background 150ms ease",
                      minWidth: "620px",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = isDark ? "#131313" : "#F0F0F0"}
                    onMouseLeave={(e) => e.currentTarget.style.background = rowBg}
                  >
                    {/* Name + icon */}
                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ width: "34px", height: "34px", background: accent + "18", border: `1px solid ${accent}33` }}
                      >
                        <Building2 size={15} style={{ color: accent }} />
                      </div>
                      <div className="min-w-0">
                        <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "14px", color: textPri, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {dept.name}
                        </p>
                        <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "9px", color: accent }}>
                          {dept.id}
                        </p>
                      </div>
                    </div>

                    {/* HOD */}
                    <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {dept.hod || "—"}
                    </span>

                    {/* Headcount (planned) */}
                    <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: "#00B8B8" }}>
                      {dept.headcount ?? "—"}
                    </span>

                    {/* Open Roles */}
                    <span style={{
                      fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px",
                      color: (dept.openRoles ?? 0) > 0 ? "#C9922A" : textSub,
                    }}>
                      {dept.openRoles ?? 0}
                    </span>

                    {/* Assigned (live) */}
                    <div className="flex items-center gap-2">
                      <div className="rounded-full flex-shrink-0" style={{ width: "8px", height: "8px", background: "#00B8B8" }} />
                      <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: "#00B8B8" }}>
                        {deptEmps.length}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setModal(dept)}
                        className="rounded-md p-1.5"
                        style={{ color: textSub, transition: "all 150ms", background: "transparent", cursor: "pointer" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#00B8B8"; e.currentTarget.style.background = isDark ? "#1A1A1A" : "#F0F0F0"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = textSub; e.currentTarget.style.background = "transparent"; }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDelTarget(dept.id)}
                        className="rounded-md p-1.5"
                        style={{ color: textSub, transition: "all 150ms", background: "transparent", cursor: "pointer" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#CC0000"; e.currentTarget.style.background = isDark ? "#1A1A1A" : "#F0F0F0"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = textSub; e.currentTarget.style.background = "transparent"; }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Footer */}
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderTop: `1px solid ${border}`, background: isDark ? "#0D0D0D" : "#F8F8F8" }}
            >
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub }}>
                Showing {filtered.length} of {depts.length} departments
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {(modal === "add" || (modal && modal.id)) && (
        <DeptModal
          theme={theme}
          onClose={() => setModal(null)}
          onSave={handleSave}
          initial={modal === "add" ? null : modal}
          saving={saving}
        />
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <DeleteConfirm
          dept={depts.find((d) => d.id === deleteTarget)}
          theme={theme}
          onClose={() => setDelTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}