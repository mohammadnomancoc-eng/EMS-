// ─────────────────────────────────────────────────────────────
//  src/pages/AssignedProjects.jsx
//
//  Admin panel page — Assigned Projects
//  Shows a list of employees; clicking an employee opens a
//  detail view with two sections:
//    • Ongoing Projects  – active projects with start & expected end dates
//    • Completed Projects – finished projects with completion dates
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useTheme } from "../App";
import {
  FolderKanban, Users, ArrowLeft, Clock, CheckCircle2,
  Calendar, CalendarCheck, Search, Plus, Trash2, Edit2,
  ChevronRight, Loader2, X, Save, AlertCircle,
} from "lucide-react";
import {
  subscribeEmployees,
  subscribeProjectsByEmployee,
  addProject,
  updateProject,
  deleteProject,
} from "../firebase/firestoreService";

// ── Utility ───────────────────────────────────────────────────
function fmt(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatEmpId(id = "") {
  return id.replace(/-/g, "/");
}

// ── Status badge ──────────────────────────────────────────────
function Badge({ status }) {
  const cfg = status === "Ongoing"
    ? { bg: "rgba(0,184,184,0.12)", color: "#00B8B8", border: "rgba(0,184,184,0.25)", dot: "#00B8B8" }
    : { bg: "rgba(0,200,100,0.12)", color: "#00C864", border: "rgba(0,200,100,0.25)", dot: "#00C864" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
      fontFamily: "Mulish, sans-serif",
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

// ── Project Form Modal ────────────────────────────────────────
function ProjectModal({ isDark, emp, onClose, existing }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    name: existing?.name || "",
    description: existing?.description || "",
    status: existing?.status || "Ongoing",
    startDate: existing?.startDate || "",
    expectedEndDate: existing?.expectedEndDate || "",
    completionDate: existing?.completionDate || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Project name is required."); return; }
    if (!form.startDate)   { setError("Start date is required."); return; }
    if (form.status === "Ongoing" && !form.expectedEndDate) {
      setError("Expected completion date is required for ongoing projects."); return;
    }
    if (form.status === "Completed" && !form.completionDate) {
      setError("Completion date is required for completed projects."); return;
    }
    setError("");
    setSaving(true);
    try {
      const payload = {
        empId: emp.id,
        name: form.name.trim(),
        description: form.description.trim(),
        status: form.status,
        startDate: form.startDate,
        expectedEndDate: form.status === "Ongoing" ? form.expectedEndDate : null,
        completionDate: form.status === "Completed" ? form.completionDate : null,
      };
      if (isEdit) {
        await updateProject(existing.id, payload);
      } else {
        await addProject(payload);
      }
      onClose();
    } catch (e) {
      setError("Failed to save project. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: "7px", outline: "none",
    fontSize: "13px", fontFamily: "Mulish, sans-serif",
    background: isDark ? "#0D0D0D" : "#F8F8F8",
    border: `1px solid ${isDark ? "#222" : "#DDDDD"}`,
    color: isDark ? "#F0F0F0" : "#111111",
    boxSizing: "border-box",
  };
  const labelStyle = {
    fontFamily: "Mulish, sans-serif", fontSize: "11px", fontWeight: 700,
    color: isDark ? "#888" : "#777", letterSpacing: "0.06em", textTransform: "uppercase",
    marginBottom: "5px", display: "block",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }}>
      <div style={{
        width: "100%", maxWidth: "480px", borderRadius: "12px",
        background: isDark ? "#0A0A0A" : "#FFFFFF",
        border: `1px solid ${isDark ? "#1E1E1E" : "#E0E0E0"}`,
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        maxHeight: "calc(100vh - 32px)",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 20px", borderBottom: `1px solid ${isDark ? "#1A1A1A" : "#EEEEEE"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "17px", color: isDark ? "#F0F0F0" : "#111", margin: 0 }}>
              {isEdit ? "Edit Project" : "Add Project"}
            </h3>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#555" : "#888", margin: "2px 0 0" }}>
              {emp.name} — {formatEmpId(emp.id)}
            </p>
          </div>
          <button onClick={onClose} style={{ color: isDark ? "#555" : "#AAA", cursor: "pointer", background: "none", border: "none", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto", flex: 1 }}>
          {error && (
            <div style={{
              background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.2)",
              borderRadius: "7px", padding: "10px 12px",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <AlertCircle size={14} color="#CC0000" />
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#CC0000" }}>{error}</span>
            </div>
          )}

          <div>
            <label style={labelStyle}>Project Name *</label>
            <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Enter project name" />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: "72px" }}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Brief project description (optional)"
            />
          </div>

          <div>
            <label style={labelStyle}>Status *</label>
            <select style={inputStyle} value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Start Date *</label>
              <input type="date" style={inputStyle} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
            {form.status === "Ongoing" ? (
              <div>
                <label style={labelStyle}>Expected End Date *</label>
                <input type="date" style={inputStyle} value={form.expectedEndDate} onChange={(e) => set("expectedEndDate", e.target.value)} />
              </div>
            ) : (
              <div>
                <label style={labelStyle}>Completion Date *</label>
                <input type="date" style={inputStyle} value={form.completionDate} onChange={(e) => set("completionDate", e.target.value)} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px", borderTop: `1px solid ${isDark ? "#1A1A1A" : "#EEEEEE"}`,
          display: "flex", gap: "10px", justifyContent: "flex-end",
          flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            padding: "8px 18px", borderRadius: "7px", fontSize: "13px", fontFamily: "Mulish, sans-serif",
            background: "transparent", border: `1px solid ${isDark ? "#222" : "#DDD"}`,
            color: isDark ? "#888" : "#555", cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "8px 18px", borderRadius: "7px", fontSize: "13px", fontFamily: "Mulish, sans-serif",
            background: "#CC0000", border: "none", color: "#FFF", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "6px", opacity: saving ? 0.7 : 1,
          }}>
            {saving ? <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <Save size={14} />}
            {saving ? "Saving…" : "Save Project"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────
function ProjectCard({ project, isDark, onEdit, onDelete }) {
  const isOngoing = project.status === "Ongoing";
  return (
    <div style={{
      borderRadius: "10px", padding: "16px 18px",
      background: isDark ? "#0D0D0D" : "#FAFAFA",
      border: `1px solid ${isDark ? "#1A1A1A" : "#EBEBEB"}`,
      transition: "border-color 180ms",
      display: "flex", flexDirection: "column", gap: "10px",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = isOngoing ? "#00B8B8" : "#00C864"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? "#1A1A1A" : "#EBEBEB"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "15px", color: isDark ? "#F0F0F0" : "#111", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {project.name}
          </p>
          {project.description && (
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#555" : "#888", margin: "3px 0 0", lineHeight: 1.4 }}>
              {project.description}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <Badge status={project.status} />
          <button onClick={() => onEdit(project)} title="Edit" style={{ background: "none", border: "none", color: isDark ? "#444" : "#BBB", cursor: "pointer", padding: 4, display: "flex" }}>
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(project)} title="Delete" style={{ background: "none", border: "none", color: isDark ? "#444" : "#BBB", cursor: "pointer", padding: 4, display: "flex" }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <Calendar size={12} color={isDark ? "#555" : "#AAA"} />
          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#666" : "#888" }}>
            Start: <strong style={{ color: isDark ? "#AAAAAA" : "#555" }}>{fmt(project.startDate)}</strong>
          </span>
        </div>
        {isOngoing && project.expectedEndDate && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Clock size={12} color="#00B8B8" />
            <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#666" : "#888" }}>
              Expected: <strong style={{ color: "#00B8B8" }}>{fmt(project.expectedEndDate)}</strong>
            </span>
          </div>
        )}
        {!isOngoing && project.completionDate && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <CalendarCheck size={12} color="#00C864" />
            <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#666" : "#888" }}>
              Completed: <strong style={{ color: "#00C864" }}>{fmt(project.completionDate)}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Employee Detail View ──────────────────────────────────────
function EmployeeDetail({ emp, isDark, onBack }) {
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null); // null | { mode: "add" | "edit", project? }
  const [activeTab, setActiveTab] = useState("ongoing"); // "ongoing" | "completed"

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeProjectsByEmployee(emp.id, (data) => {
      setProjects(data);
      setLoading(false);
    });
    return unsub;
  }, [emp.id]);

  const ongoing   = projects.filter((p) => p.status === "Ongoing");
  const completed = projects.filter((p) => p.status === "Completed");

  const handleDelete = async (project) => {
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    try { await deleteProject(project.id); } catch (_) {}
  };

  const tabStyle = (active) => ({
    display: "flex", alignItems: "center", gap: "7px",
    padding: "9px 18px", borderRadius: "8px", cursor: "pointer", border: "none",
    fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: active ? 700 : 500,
    background: active ? (isDark ? "#111" : "#F0F0F0") : "transparent",
    color: active ? (isDark ? "#F0F0F0" : "#111") : (isDark ? "#555" : "#999"),
    borderBottom: active ? "2px solid #CC0000" : "2px solid transparent",
    transition: "all 150ms",
  });

  return (
    <>
      {/* Back + Header */}
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={onBack}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "none", border: "none", cursor: "pointer",
            color: isDark ? "#555" : "#AAA", fontFamily: "Mulish, sans-serif", fontSize: "13px",
            padding: "4px 0", marginBottom: "16px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#CC0000")}
          onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? "#555" : "#AAA")}
        >
          <ArrowLeft size={15} /> Back to Employees
        </button>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px",
          padding: "18px 20px", borderRadius: "12px",
          background: isDark ? "#0A0A0A" : "#FFFFFF",
          border: `1px solid ${isDark ? "#1A1A1A" : "#E5E5E5"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "46px", height: "46px", borderRadius: "50%",
              background: "linear-gradient(135deg, #CC0000 0%, #990000 100%)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFF", fontWeight: 700, fontSize: "16px" }}>
                {(emp.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "19px", color: isDark ? "#F0F0F0" : "#111", margin: 0 }}>
                {emp.name}
              </h2>
              <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: "#00B8B8", margin: "2px 0 0" }}>
                {formatEmpId(emp.id)} · {emp.designation || emp.department || "Employee"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ textAlign: "center", padding: "8px 16px", borderRadius: "8px", background: "rgba(0,184,184,0.08)", border: "1px solid rgba(0,184,184,0.18)" }}>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "20px", color: "#00B8B8", margin: 0 }}>{ongoing.length}</p>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: isDark ? "#555" : "#999", margin: 0 }}>Ongoing</p>
            </div>
            <div style={{ textAlign: "center", padding: "8px 16px", borderRadius: "8px", background: "rgba(0,200,100,0.08)", border: "1px solid rgba(0,200,100,0.18)" }}>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "20px", color: "#00C864", margin: 0 }}>{completed.length}</p>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: isDark ? "#555" : "#999", margin: 0 }}>Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Add button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          <button style={tabStyle(activeTab === "ongoing")} onClick={() => setActiveTab("ongoing")}>
            <Clock size={14} /> Ongoing Projects
            <span style={{
              marginLeft: "2px", padding: "1px 7px", borderRadius: "20px", fontSize: "11px",
              background: "rgba(0,184,184,0.15)", color: "#00B8B8",
            }}>{ongoing.length}</span>
          </button>
          <button style={tabStyle(activeTab === "completed")} onClick={() => setActiveTab("completed")}>
            <CheckCircle2 size={14} /> Completed Projects
            <span style={{
              marginLeft: "2px", padding: "1px 7px", borderRadius: "20px", fontSize: "11px",
              background: "rgba(0,200,100,0.15)", color: "#00C864",
            }}>{completed.length}</span>
          </button>
        </div>
        <button
          onClick={() => setModal({ mode: "add" })}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "8px 16px", borderRadius: "8px",
            background: "#CC0000", border: "none", color: "#FFF",
            fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: 600, cursor: "pointer",
          }}
        >
          <Plus size={14} /> Add Project
        </button>
      </div>

      {/* Project list */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
          <Loader2 size={24} color="#CC0000" style={{ animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        (() => {
          const list = activeTab === "ongoing" ? ongoing : completed;
          const emptyMsg = activeTab === "ongoing"
            ? "No ongoing projects assigned yet."
            : "No completed projects on record yet.";
          const EmptyIcon = activeTab === "ongoing" ? Clock : CheckCircle2;
          const emptyColor = activeTab === "ongoing" ? "#00B8B8" : "#00C864";

          if (list.length === 0) {
            return (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "56px 24px", gap: "12px",
                borderRadius: "12px", border: `1px dashed ${isDark ? "#1E1E1E" : "#E0E0E0"}`,
              }}>
                <EmptyIcon size={36} color={emptyColor} style={{ opacity: 0.4 }} />
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: isDark ? "#555" : "#AAA", margin: 0 }}>
                  {emptyMsg}
                </p>
                <button
                  onClick={() => setModal({ mode: "add" })}
                  style={{
                    marginTop: "4px", padding: "7px 16px", borderRadius: "7px",
                    background: "transparent", border: `1px solid ${isDark ? "#222" : "#DDD"}`,
                    color: isDark ? "#888" : "#666", fontFamily: "Mulish, sans-serif",
                    fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px",
                  }}
                >
                  <Plus size={13} /> Add a project
                </button>
              </div>
            );
          }

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {list.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  isDark={isDark}
                  onEdit={(proj) => setModal({ mode: "edit", project: proj })}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          );
        })()
      )}

      {/* Modal */}
      {modal && (
        <ProjectModal
          isDark={isDark}
          emp={emp}
          existing={modal.mode === "edit" ? modal.project : null}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

// ── Employee List View ────────────────────────────────────────
function EmployeeList({ isDark, onSelect }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  useEffect(() => {
    const unsub = subscribeEmployees((data) => {
      setEmployees(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      (e.name || "").toLowerCase().includes(q) ||
      (e.department || "").toLowerCase().includes(q) ||
      (e.designation || "").toLowerCase().includes(q) ||
      (e.id || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Search */}
      <div style={{ marginBottom: "18px", position: "relative" }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#555" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employees by name, department, ID…"
          style={{
            width: "100%", padding: "10px 12px 10px 34px", borderRadius: "9px", outline: "none",
            fontFamily: "Mulish, sans-serif", fontSize: "13px",
            background: isDark ? "#0D0D0D" : "#F8F8F8",
            border: `1px solid ${isDark ? "#1E1E1E" : "#E5E5E5"}`,
            color: isDark ? "#F0F0F0" : "#111",
            boxSizing: "border-box",
          }}
          onFocus={(e) => { e.target.style.border = "1px solid #00B8B8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)"; }}
          onBlur={(e) => { e.target.style.border = `1px solid ${isDark ? "#1E1E1E" : "#E5E5E5"}`; e.target.style.boxShadow = "none"; }}
        />
      </div>

      {/* Count */}
      <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#444" : "#AAA", marginBottom: "12px" }}>
        {filtered.length} employee{filtered.length !== 1 ? "s" : ""} found
      </p>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
          <Loader2 size={24} color="#CC0000" style={{ animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "56px 24px", gap: "10px",
          borderRadius: "12px", border: `1px dashed ${isDark ? "#1E1E1E" : "#E0E0E0"}`,
        }}>
          <Users size={36} color={isDark ? "#222" : "#DDD"} />
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: isDark ? "#555" : "#AAA", margin: 0 }}>
            {search ? "No employees match your search." : "No employees found."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
          {filtered.map((emp) => (
            <button
              key={emp.id}
              onClick={() => onSelect(emp)}
              style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "14px 16px", borderRadius: "10px", cursor: "pointer",
                background: isDark ? "#0A0A0A" : "#FFFFFF",
                border: `1px solid ${isDark ? "#1A1A1A" : "#EBEBEB"}`,
                textAlign: "left", transition: "all 180ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#CC0000";
                e.currentTarget.style.background = isDark ? "#0E0E0E" : "#FFF8F8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isDark ? "#1A1A1A" : "#EBEBEB";
                e.currentTarget.style.background = isDark ? "#0A0A0A" : "#FFFFFF";
              }}
            >
              {/* Avatar */}
              <div style={{
                width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #CC0000 0%, #990000 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFF", fontWeight: 700, fontSize: "14px" }}>
                  {(emp.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "14px", color: isDark ? "#F0F0F0" : "#111", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {emp.name}
                </p>
                <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#00B8B8", margin: "2px 0 0" }}>
                  {formatEmpId(emp.id)}
                </p>
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: isDark ? "#555" : "#999", margin: "1px 0 0" }}>
                  {emp.designation || emp.department || "—"}
                </p>
              </div>

              <ChevronRight size={16} color={isDark ? "#333" : "#CCC"} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function AssignedProjects() {
  const { theme }             = useTheme();
  const isDark                = theme === "dark";
  const [selected, setSelected] = useState(null);

  return (
    <div>
      {/* Page heading */}
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "38px", height: "38px", borderRadius: "10px",
          background: "rgba(204,0,0,0.1)", border: "1px solid rgba(204,0,0,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <FolderKanban size={18} color="#CC0000" />
        </div>
        <div>
          <h1 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "22px", color: isDark ? "#F0F0F0" : "#111", margin: 0 }}>
            Assigned Projects
          </h1>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: isDark ? "#555" : "#AAA", margin: "2px 0 0" }}>
            {selected ? `Viewing projects for ${selected.name}` : "Select an employee to view their projects"}
          </p>
        </div>
      </div>

      {selected ? (
        <EmployeeDetail emp={selected} isDark={isDark} onBack={() => setSelected(null)} />
      ) : (
        <EmployeeList isDark={isDark} onSelect={setSelected} />
      )}
    </div>
  );
}
