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

      <div style={{ display: "grid", gridTemplateColumns: "1fr md(350px)", gap: "24px" }} className="grid grid-cols-1 lg:grid-cols-3">
        {/* Left Side: Projects List & Search */}
        <div className="lg:col-span-2" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
              onFocus={(e) => { e.target.style.border = "1px solid #00B8B8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)"; }}
              onBlur={(e) => { e.target.style.border = `1px solid ${border}`; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
              <Loader2 size={24} color="#CC0000" style={{ animation: "spin 0.8s linear infinite" }} />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center",
              padding: "56px 24px", gap: "10px",
              borderRadius: "12px", border: `1px dashed ${border}`, background: cardBg,
            }}>
              <FolderKanban size={36} color={isDark ? "#222" : "#DDD"} />
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textSub, margin: 0 }}>
                {search ? "No projects match your search." : "No projects found."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredProjects.map((p) => {
                const isSelected = selectedProject?.id === p.id;
                const isOngoing = p.status === "Ongoing";
                const isHold = p.status === "On Hold";
                const memberCount = p.memberIds?.length || 0;
                
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProject(p)}
                    style={{
                      borderRadius: "10px", padding: "16px 18px",
                      background: cardBg,
                      border: `1px solid ${isSelected ? "#CC0000" : border}`,
                      cursor: "pointer",
                      transition: "all 180ms",
                      display: "flex", flexDirection: "column", gap: "10px",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = isDark ? "#333" : "#CCC"; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = border; }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "16px", color: textPri, margin: 0 }}>
                          {p.name}
                        </p>
                        {p.description && (
                          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub, margin: "3px 0 0", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {p.description}
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        <StatusBadge status={p.status} />
                        <button onClick={(e) => { e.stopPropagation(); setModal({ mode: "edit", project: p }); }} title="Edit" style={{ background: "none", border: "none", color: textSub, cursor: "pointer", padding: 4, display: "flex" }}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={(e) => handleDelete(p, e)} title="Delete" style={{ background: "none", border: "none", color: textSub, cursor: "pointer", padding: 4, display: "flex" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", borderTop: `1px solid ${border}`, paddingTop: "10px", marginTop: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <Calendar size={12} color={isDark ? "#555" : "#AAA"} />
                        <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub }}>
                          Start: <strong style={{ color: textPri }}>{fmt(p.startDate)}</strong>
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <CalendarCheck size={12} color={isDark ? "#555" : "#AAA"} />
                        <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub }}>
                          End: <strong style={{ color: textPri }}>{fmt(p.endDate)}</strong>
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <User size={12} color={isDark ? "#555" : "#AAA"} />
                        <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub }}>
                          Lead: <strong style={{ color: textPri }}>{p.techLead || "—"}</strong>
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <Users size={12} color={isDark ? "#555" : "#AAA"} />
                        <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub }}>
                          Team Size: <strong style={{ color: textPri }}>{memberCount}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Selected Project Details & Team Member Assignment */}
        <div className="lg:col-span-1">
          {selectedProject ? (
            <div style={{
              borderRadius: "12px", padding: "20px",
              background: cardBg,
              border: `1px solid ${border}`,
              display: "flex", flexDirection: "column", gap: "18px",
              position: "sticky", top: "80px"
            }}>
              {/* Header */}
              <div style={{ borderBottom: `1px solid ${border}`, paddingBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: "#00B8B8" }}>
                    PROJECT DETAILS
                  </span>
                  <StatusBadge status={selectedProject.status} />
                </div>
                <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "20px", color: textPri, margin: 0 }}>
                  {selectedProject.name}
                </h2>
                {selectedProject.description && (
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub, margin: "6px 0 0", lineHeight: 1.5 }}>
                    {selectedProject.description}
                  </p>
                )}
              </div>

              {/* Client Info */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: isDark ? "#0A0A0A" : "#F9F9F9", padding: "12px", borderRadius: "8px", border: `1px solid ${border}` }}>
                <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.1em" }}>CLIENT INFORMATION</span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri, fontWeight: 600 }}>{selectedProject.clientName || "—"}</span>
                  {selectedProject.clientPhone && (
                    <a href={`tel:${selectedProject.clientPhone}`} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#00B8B8", textDecoration: "none", fontFamily: "Mulish, sans-serif" }}>
                      <Phone size={12} /> {selectedProject.clientPhone}
                    </a>
                  )}
                </div>
              </div>

              {/* Lead Info */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.1em" }}>TECH LEAD</span>
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri, margin: 0, fontWeight: 600 }}>
                  {selectedProject.techLead || "—"}
                </p>
              </div>

              {/* Dates */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.1em" }}>START DATE</span>
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri, margin: "2px 0 0" }}>{fmt(selectedProject.startDate)}</p>
                </div>
                <div>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.1em" }}>END DATE</span>
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri, margin: "2px 0 0" }}>{fmt(selectedProject.endDate)}</p>
                </div>
              </div>

              {/* Members */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.1em" }}>TEAM MEMBERS ({selectedProject.memberIds?.length || 0})</span>
                </div>
                
                {/* Add member select box */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <select
                    onChange={async (e) => {
                      const empId = e.target.value;
                      if (!empId) return;
                      const currentMembers = selectedProject.memberIds || [];
                      if (!currentMembers.includes(empId)) {
                        const updatedMembers = [...currentMembers, empId];
                        await updateTeamProject(selectedProject.id, { memberIds: updatedMembers });
                        setSelectedProject({ ...selectedProject, memberIds: updatedMembers });
                      }
                      e.target.value = "";
                    }}
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: "8px", outline: "none",
                      fontSize: "12px", fontFamily: "Mulish, sans-serif",
                      background: isDark ? "#0D0D0D" : "#F8F8F8",
                      border: `1px solid ${border}`,
                      color: textPri,
                    }}
                  >
                    <option value="">+ Assign Developer / Employee...</option>
                    {employees
                      .filter((emp) => !(selectedProject.memberIds || []).includes(emp.id))
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({formatEmpId(emp.id)})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Assigned members list */}
                {(!selectedProject.memberIds || selectedProject.memberIds.length === 0) ? (
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub, margin: 0, fontStyle: "italic" }}>
                    No developers assigned to this project yet.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
                    {selectedProject.memberIds.map((memberId) => {
                      const emp = employees.find((e) => e.id === memberId);
                      if (!emp) return null;
                      return (
                        <div key={memberId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", borderRadius: "6px", background: isDark ? "#0D0D0D" : "#F9F9F9", border: `1px solid ${border}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{
                              width: "24px", height: "24px", borderRadius: "50%",
                              background: "linear-gradient(135deg, #CC0000 0%, #990000 100%)",
                              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
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
                              const updatedMembers = (selectedProject.memberIds || []).filter((id) => id !== memberId);
                              await updateTeamProject(selectedProject.id, { memberIds: updatedMembers });
                              setSelectedProject({ ...selectedProject, memberIds: updatedMembers });
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
          ) : (
            <div style={{
              borderRadius: "12px", padding: "32px 24px",
              background: cardBg,
              border: `1px solid ${border}`,
              textAlign: "center",
              display: "flex", flexDirection: "column", gap: "10px",
              alignItems: "center"
            }}>
              <Briefcase size={32} color={isDark ? "#222" : "#DDD"} />
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textSub, margin: 0 }}>
                Select a project from the list to view full details and manage team members.
              </p>
            </div>
          )}
        </div>
      </div>

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
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

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

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
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
    </div>
  );
}
