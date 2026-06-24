// ─────────────────────────────────────────────────────────────
//  src/pages/Projects.jsx
//
//  Admin panel page — Projects Management
//  Allows admins to:
//    • Create or add projects (Name, Tech Lead, Client Name & number, Start Date, End Date, Status)
//    • Add employee/developer to a project
//    • View details of the project and employees working on it
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../App";
import {
  FolderKanban, Users, Clock, CheckCircle2, AlertCircle,
  Calendar, CalendarCheck, Search, Plus, Trash2, Edit2,
  ChevronRight, Loader2, X, Save, Phone, User, Briefcase, PlusCircle, MinusCircle
} from "lucide-react";
import {
  subscribeEmployees,
  subscribeTeamProjects,
  addTeamProject,
  updateTeamProject,
  deleteTeamProject,
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
function StatusBadge({ status }) {
  let cfg = { bg: "rgba(0,184,184,0.12)", color: "#00B8B8", border: "rgba(0,184,184,0.25)", dot: "#00B8B8" };
  if (status === "Completed") {
    cfg = { bg: "rgba(0,200,100,0.12)", color: "#00C864", border: "rgba(0,200,100,0.25)", dot: "#00C864" };
  } else if (status === "On Hold") {
    cfg = { bg: "rgba(201,146,42,0.12)", color: "#C9922A", border: "rgba(201,146,42,0.25)", dot: "#C9922A" };
  }
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

// ── Project Details Modal (Pop-up) ────────────────────────────
function ProjectDetailsModal({ theme, project, employees, onClose, onUpdateProject }) {
  const isDark = theme === "dark";
  const bg = isDark ? "#0A0A0A" : "#FFFFFF";
  const border = isDark ? "#1A1A1A" : "#E5E5E5";
  const textPri = isDark ? "#F0F0F0" : "#111111";
  const textSub = isDark ? "#666666" : "#888888";

  // Helper to format employee IDs
  const formatEmpId = (id) => {
    if (!id) return "";
    return id.slice(0, 5).toUpperCase();
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: "12px",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            right: "16px",
            top: "16px",
            background: "none",
            border: "none",
            color: textSub,
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#CC0000")}
          onMouseLeave={(e) => (e.currentTarget.style.color = textSub)}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ borderBottom: `1px solid ${border}`, paddingBottom: "12px", paddingRight: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: "#00B8B8" }}>
              PROJECT DETAILS
            </span>
            <StatusBadge status={project.status} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
            <div style={{
              width: "84px",
              height: "84px",
              borderRadius: "10px",
              background: isDark ? "#121212" : "#F5F5F5",
              border: `1px solid ${border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
              padding: "4px",
              boxSizing: "border-box"
            }}>
              {project.logoUrl ? (
                <img src={project.logoUrl} alt={project.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <FolderKanban size={28} color="#CC0000" />
              )}
            </div>
            <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "20px", color: textPri, margin: 0 }}>
              {project.name}
            </h2>
          </div>
          {project.description && (
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub, margin: "10px 0 0", lineHeight: 1.5 }}>
              {project.description}
            </p>
          )}
        </div>

        {/* Client Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: isDark ? "#0D0D0D" : "#F9F9F9", padding: "12px", borderRadius: "8px", border: `1px solid ${border}` }}>
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.1em" }}>CLIENT INFORMATION</span>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri, fontWeight: 600 }}>{project.clientName || "—"}</span>
            {project.clientPhone && (
              <a href={`tel:${project.clientPhone}`} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#00B8B8", textDecoration: "none", fontFamily: "Mulish, sans-serif" }}>
                <Phone size={12} /> {project.clientPhone}
              </a>
            )}
          </div>
        </div>

        {/* Lead Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.1em" }}>TECH LEAD</span>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri, margin: 0, fontWeight: 600 }}>
            {project.techLead || "—"}
          </p>
        </div>

        {/* Dates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.1em" }}>START DATE</span>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri, margin: "2px 0 0" }}>{fmt(project.startDate)}</p>
          </div>
          <div>
            <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.1em" }}>END DATE</span>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri, margin: "2px 0 0" }}>{fmt(project.endDate)}</p>
          </div>
        </div>

        {/* Members */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.1em" }}>TEAM MEMBERS ({project.memberIds?.length || 0})</span>
          </div>
          
          {/* Add member select box */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <select
              onChange={async (e) => {
                const empId = e.target.value;
                if (!empId) return;
                const currentMembers = project.memberIds || [];
                if (!currentMembers.includes(empId)) {
                  const updatedMembers = [...currentMembers, empId];
                  await updateTeamProject(project.id, { memberIds: updatedMembers });
                  onUpdateProject({ ...project, memberIds: updatedMembers });
                }
                e.target.value = "";
              }}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                outline: "none",
                fontSize: "12px",
                fontFamily: "Mulish, sans-serif",
                background: isDark ? "#0D0D0D" : "#F8F8F8",
                border: `1px solid ${border}`,
                color: textPri,
              }}
            >
              <option value="">+ Assign Developer / Employee...</option>
              {employees
                .filter((emp) => !(project.memberIds || []).includes(emp.id))
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({formatEmpId(emp.id)})
                  </option>
                ))}
            </select>
          </div>

          {/* Assigned members list */}
          {(!project.memberIds || project.memberIds.length === 0) ? (
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub, margin: 0, fontStyle: "italic" }}>
              No developers assigned to this project yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
              {project.memberIds.map((memberId) => {
                const emp = employees.find((e) => e.id === memberId);
                if (!emp) return null;
                return (
                  <div key={memberId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", borderRadius: "6px", background: isDark ? "#0D0D0D" : "#F9F9F9", border: `1px solid ${border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #CC0000 0%, #990000 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFF", fontWeight: 700, fontSize: "9px" }}>
                          {(emp.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textPri, margin: 0, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {emp.name}
                        </p>
                        <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "9px", color: "#00B8B8", margin: 0 }}>
                          {formatEmpId(emp.id)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const updatedMembers = (project.memberIds || []).filter((id) => id !== memberId);
                        await updateTeamProject(project.id, { memberIds: updatedMembers });
                        onUpdateProject({ ...project, memberIds: updatedMembers });
                      }}
                      title="Remove developer"
                      style={{ background: "none", border: "none", color: "#CC0000", cursor: "pointer", display: "flex" }}
                    >
                      <MinusCircle size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Projects() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // State
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [modal, setModal] = useState(null); // null | { mode: "add" | "edit", project? }

  // Load projects and employees
  useEffect(() => {
    setLoading(true);
    const unsubProjects = subscribeTeamProjects((data) => {
      setProjects(data);
      setLoading(false);
    });
    const unsubEmployees = subscribeEmployees((data) => {
      setEmployees(data);
    });
    return () => {
      unsubProjects();
      unsubEmployees();
    };
  }, []);

  const handleDelete = async (project, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    try {
      await deleteTeamProject(project.id);
      if (selectedProject?.id === project.id) {
        setSelectedProject(null);
      }
    } catch (_) {}
  };

  const filteredProjects = projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.clientName || "").toLowerCase().includes(q) ||
      (p.techLead || "").toLowerCase().includes(q)
    );
  });

  const cardBg = isDark ? "#0A0A0A" : "#FFFFFF";
  const border = isDark ? "#1A1A1A" : "#E5E5E5";
  const textPri = isDark ? "#F0F0F0" : "#111111";
  const textSub = isDark ? "#666666" : "#888888";

  return (
    <div>
      {/* Page heading */}
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "38px", height: "38px", borderRadius: "10px",
            background: "rgba(204,0,0,0.1)", border: "1px solid rgba(204,0,0,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <FolderKanban size={18} color="#CC0000" />
          </div>
          <div>
            <h1 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "22px", color: textPri, margin: 0 }}>
              Projects Management
            </h1>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub, margin: "2px 0 0" }}>
              Manage team projects, assign developers, and track client info
            </p>
          </div>
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

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Search bar */}
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#555" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name, client, tech lead..."
            style={{
              width: "100%", padding: "10px 12px 10px 34px", borderRadius: "9px", outline: "none",
              fontFamily: "Mulish, sans-serif", fontSize: "13px",
              background: isDark ? "#0D0D0D" : "#F8F8F8",
              border: `1px solid ${border}`,
              color: textPri,
              boxSizing: "border-box",
            }}
          />
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
            <Loader2 className="animate-spin" size={24} color="#CC0000" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "40px 20px", borderRadius: "12px",
            background: cardBg, border: `1px solid ${border}`,
            color: textSub, fontFamily: "Mulish, sans-serif", fontSize: "13px"
          }}>
            No projects found.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredProjects.map((p) => {
              const count = p.memberIds?.length || 0;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProject(p)}
                  style={{
                    borderRadius: "12px",
                    background: cardBg,
                    border: `1px solid ${selectedProject?.id === p.id ? "#CC0000" : border}`,
                    padding: "16px 20px",
                    cursor: "pointer",
                    transition: "border-color 200ms, transform 200ms",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  {/* Top line: Name, Edit/Delete, Status */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "8px",
                        background: isDark ? "#121212" : "#F5F5F5",
                        border: `1px solid ${border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        flexShrink: 0,
                        padding: "4px",
                        boxSizing: "border-box"
                      }}>
                        {p.logoUrl ? (
                          <img src={p.logoUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        ) : (
                          <FolderKanban size={22} color="#CC0000" />
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "17px", color: textPri, margin: 0 }}>
                          {p.name}
                        </h3>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setModal({ mode: "edit", project: p })}
                        title="Edit project info"
                        style={{
                          background: "none", border: "none", color: textSub, cursor: "pointer",
                          padding: "4px", display: "flex", alignItems: "center", justifyContent: "center"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = "#00B8B8"}
                        onMouseLeave={(e) => e.currentTarget.style.color = textSub}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete "${p.name}"?`)) {
                            await deleteTeamProject(p.id);
                            if (selectedProject?.id === p.id) {
                              setSelectedProject(null);
                            }
                          }
                        }}
                        title="Delete project"
                        style={{
                          background: "none", border: "none", color: textSub, cursor: "pointer",
                          padding: "4px", display: "flex", alignItems: "center", justifyContent: "center"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = "#CC0000"}
                        onMouseLeave={(e) => e.currentTarget.style.color = textSub}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Description if present */}
                  {p.description && (
                    <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub, margin: 0, lineHeight: 1.4 }}>
                      {p.description}
                    </p>
                  )}

                  {/* Details strip */}
                  <div style={{
                    display: "flex", flexWrap: "wrap", gap: "16px",
                    borderTop: `1px solid ${isDark ? "#121212" : "#F0F0F0"}`,
                    paddingTop: "10px", marginTop: "4px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Calendar size={12} color="#CC0000" />
                      <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textSub }}>
                        Start: <strong style={{ color: textPri }}>{fmt(p.startDate)}</strong>
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <CalendarCheck size={12} color="#CC0000" />
                      <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textSub }}>
                        End: <strong style={{ color: textPri }}>{fmt(p.endDate)}</strong>
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <User size={12} color="#00B8B8" />
                      <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textSub }}>
                        Lead: <strong style={{ color: textPri }}>{p.techLead || "—"}</strong>
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Briefcase size={12} color="#00B8B8" />
                      <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textSub }}>
                        Team Size: <strong style={{ color: textPri }}>{count}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Project Details Modal */}
      {selectedProject && (
        <ProjectDetailsModal
          theme={theme}
          project={selectedProject}
          employees={employees}
          onClose={() => setSelectedProject(null)}
          onUpdateProject={(updated) => setSelectedProject(updated)}
        />
      )}

      {/* Project Form Modal */}
      {modal && (
        <ProjectModal
          isDark={isDark}
          existing={modal.mode === "edit" ? modal.project : null}
          employees={employees}
          onClose={() => setModal(null)}
          onSave={(updatedProject) => {
            if (selectedProject?.id === updatedProject.id) {
              setSelectedProject(updatedProject);
            }
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

// ── Project Modal Component ───────────────────────────────────
function ProjectModal({ isDark, existing, employees, onClose, onSave }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    name: existing?.name || "",
    description: existing?.description || "",
    status: existing?.status || "Ongoing",
    techLead: existing?.techLead || "",
    clientName: existing?.clientName || "",
    clientPhone: existing?.clientPhone || "",
    startDate: existing?.startDate || "",
    endDate: existing?.endDate || "",
    logoUrl: existing?.logoUrl || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      set("logoUrl", reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Project name is required."); return; }
    if (!form.startDate)   { setError("Start date is required."); return; }
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        status: form.status,
        techLead: form.techLead,
        clientName: form.clientName.trim(),
        clientPhone: form.clientPhone.trim(),
        startDate: form.startDate,
        endDate: form.endDate || "",
        logoUrl: form.logoUrl || "",
      };
      if (isEdit) {
        await updateTeamProject(existing.id, payload);
        onSave({ id: existing.id, ...existing, ...payload });
      } else {
        const newId = await addTeamProject({ ...payload, memberIds: [] });
        onSave({ id: newId, ...payload, memberIds: [] });
      }
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
    border: `1px solid ${isDark ? "#222" : "#DDD"}`,
    color: isDark ? "#F0F0F0" : "#111111",
    boxSizing: "border-box",
  };
  const labelStyle = {
    fontFamily: "Mulish, sans-serif", fontSize: "11px", fontWeight: 700,
    color: isDark ? "#888" : "#777", letterSpacing: "0.06em", textTransform: "uppercase",
    marginBottom: "5px", display: "block",
  };

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }}>
      <div style={{
        width: "100%", maxWidth: "520px", borderRadius: "12px",
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
          <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "17px", color: isDark ? "#F0F0F0" : "#111", margin: 0 }}>
            {isEdit ? "Edit Project" : "Add Project"}
          </h3>
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

          {/* Logo Upload Section */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", background: isDark ? "#0D0D0D" : "#F9F9F9", padding: "12px", borderRadius: "8px", border: `1px solid ${isDark ? "#1A1A1A" : "#E5E5E5"}` }}>
            <div style={{
              width: "96px",
              height: "96px",
              borderRadius: "10px",
              background: isDark ? "#121212" : "#F5F5F5",
              border: `1px solid ${isDark ? "#222" : "#DDD"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
              padding: "4px",
              boxSizing: "border-box"
            }}>
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <FolderKanban size={32} color="#CC0000" />
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", fontWeight: 700, color: isDark ? "#888" : "#777", letterSpacing: "0.06em", textTransform: "uppercase" }}>PROJECT LOGO</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <label style={{
                  padding: "6px 12px", borderRadius: "6px", background: "#CC0000", color: "#FFF",
                  fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: 600, cursor: "pointer"
                }}>
                  Upload Image
                  <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: "none" }} />
                </label>
                {form.logoUrl && (
                  <button onClick={() => set("logoUrl", "")} style={{
                    padding: "6px 12px", borderRadius: "6px", background: "transparent",
                    border: `1px solid ${isDark ? "#222" : "#DDD"}`, color: "#CC0000",
                    fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: 600, cursor: "pointer"
                  }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Project Name *</label>
            <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Enter project name" />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: "60px" }}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Brief project description (optional)"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Tech Lead / Supervisor</label>
              <select style={inputStyle} value={form.techLead} onChange={(e) => set("techLead", e.target.value)}>
                <option value="">Select Tech Lead...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status *</label>
              <select style={inputStyle} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Client Name</label>
              <input style={inputStyle} value={form.clientName} onChange={(e) => set("clientName", e.target.value)} placeholder="Enter Client Name" />
            </div>
            <div>
              <label style={labelStyle}>Client Number</label>
              <input style={inputStyle} value={form.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} placeholder="Enter Client Number" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Start Date *</label>
              <input type="date" style={inputStyle} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>End Date (Expected / Actual)</label>
              <input type="date" style={inputStyle} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </div>
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
    </div>,
    document.body
  );
}
