import { useState, useRef } from "react";
import { useTheme } from "../../App";
import {
  User, Mail, Phone, Building2, Briefcase,
  Calendar, Shield, Edit3, Save, X,
  KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle,
  Camera, Upload,
} from "lucide-react";
import { uploadEmployeePhoto, getThumbnailUrl } from "../../cloudinary/cloudinaryService";
import { updateEmployeePhoto } from "../../firebase/firestoreService";

// ── Helpers ───────────────────────────────────────────
function getUser() {
  const raw = localStorage.getItem("rwt-user");
  return raw
    ? JSON.parse(raw)
    : { name: "Arjun Sharma", role: "Frontend Developer", initials: "AS", empId: "RWT001" };
}

const mockProfile = {
  empId:      "RWT001",
  name:       "Arjun Sharma",
  role:       "Frontend Developer",
  department: "Engineering",
  email:      "arjun@royalswebtech.com",
  phone:      "+91 98765 43210",
  joinDate:   "2023-01-15",
  status:     "Active",
  initials:   "AS",
  manager:    "Rahul Verma",
  location:   "Nagpur, MH",
  bio:        "Passionate frontend developer with 3+ years of experience building scalable React applications.",
};

function SectionLabel({ children }) {
  return (
    <p style={{
      fontFamily: "Rajdhani, sans-serif", fontSize: "9px", fontWeight: 700,
      color: "#CC0000", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "12px",
    }}>
      {children}
    </p>
  );
}

function InfoRow({ icon: Icon, label, value, theme }) {
  const textMuted = theme === "dark" ? "#555555" : "#999999";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  return (
    <div className="flex items-start gap-3 py-3"
      style={{ borderBottom: `1px solid ${theme === "dark" ? "#1A1A1A" : "#F0F0F0"}` }}>
      <div className="flex-shrink-0 mt-0.5 rounded-md flex items-center justify-center"
        style={{ width: "30px", height: "30px", background: theme === "dark" ? "#1A1A1A" : "#F5F5F5" }}>
        <Icon size={14} style={{ color: "#00B8B8" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: textMuted, marginBottom: "2px" }}>{label}</p>
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", fontWeight: 600, color: textPri }}>{value}</p>
      </div>
    </div>
  );
}

function EditField({ label, value, onChange, theme }) {
  const surface   = theme === "dark" ? "#0D0D0D" : "#F8F8F8";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#555555" : "#999999";
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted, fontWeight: 600 }}>{label}</label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          background: surface, border: `1px solid ${border}`, borderRadius: "8px",
          padding: "9px 12px", fontFamily: "Mulish, sans-serif", fontSize: "13px",
          color: textPri, outline: "none", width: "100%", transition: "border-color 150ms",
        }}
        onFocus={(e) => e.target.style.borderColor = "#CC0000"}
        onBlur={(e) => e.target.style.borderColor = border}
      />
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, theme }) {
  const surface   = theme === "dark" ? "#0D0D0D" : "#F8F8F8";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#555555" : "#999999";
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted, fontWeight: 600 }}>{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)}
          style={{
            background: surface, border: `1px solid ${border}`, borderRadius: "8px",
            padding: "9px 40px 9px 12px", fontFamily: "Mulish, sans-serif", fontSize: "13px",
            color: textPri, outline: "none", width: "100%", transition: "border-color 150ms",
          }}
          onFocus={(e) => e.target.style.borderColor = "#CC0000"}
          onBlur={(e) => e.target.style.borderColor = border}
        />
        <button type="button" onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: textMuted, background: "none", border: "none", cursor: "pointer" }}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  const ok = type === "success";
  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-xl px-4 py-3 z-50"
      style={{
        background: ok ? "rgba(0,184,184,0.12)" : "rgba(204,0,0,0.12)",
        border: `1px solid ${ok ? "rgba(0,184,184,0.4)" : "rgba(204,0,0,0.4)"}`,
        backdropFilter: "blur(8px)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}>
      {ok ? <CheckCircle2 size={15} style={{ color: "#00B8B8" }} /> : <AlertCircle size={15} style={{ color: "#CC0000" }} />}
      <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: ok ? "#00B8B8" : "#CC0000", fontWeight: 600 }}>{msg}</span>
    </div>
  );
}

export default function MyProfile() {
  const { theme } = useTheme();
  const user      = getUser();
  const profile   = { ...mockProfile, ...user };

  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";

  const [editing, setEditing]   = useState(false);
  const [editData, setEditData] = useState({ phone: profile.phone, bio: profile.bio, location: profile.location });
  const [toast, setToast]       = useState({ msg: "", type: "" });
  const [pwForm, setPwForm]     = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw]     = useState({ current: false, next: false, confirm: false });
  const [pwError, setPwError]   = useState("");

  // Photo upload state
  const photoInputRef               = useRef(null);
  const [photoUrl, setPhotoUrl]     = useState(profile.photoUrl || null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoProgress, setPhotoProgress]  = useState(0);
  const [photoErr, setPhotoErr]     = useState("");

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3000);
  }

  async function handlePhotoUpload(file) {
    if (!file) return;
    setPhotoErr("");
    setPhotoUploading(true);
    setPhotoProgress(0);
    // Optimistic preview
    const objUrl = URL.createObjectURL(file);
    setPhotoUrl(objUrl);
    try {
      const result = await uploadEmployeePhoto(file, profile.empId, (pct) => setPhotoProgress(pct));
      await updateEmployeePhoto(profile.empId, result.secure_url, result.public_id);
      setPhotoUrl(result.secure_url);
      showToast("Profile photo updated successfully");
    } catch (err) {
      setPhotoErr(err.message || "Upload failed.");
      setPhotoUrl(profile.photoUrl || null);
    } finally {
      setPhotoUploading(false);
      setPhotoProgress(0);
      URL.revokeObjectURL(objUrl);
    }
  }

  function handleSaveProfile() {
    setEditing(false);
    showToast("Profile updated successfully");
  }

  function handleCancelEdit() {
    setEditData({ phone: profile.phone, bio: profile.bio, location: profile.location });
    setEditing(false);
  }

  function handleChangePassword() {
    setPwError("");
    if (!pwForm.current) return setPwError("Enter your current password.");
    if (pwForm.next.length < 8) return setPwError("New password must be at least 8 characters.");
    if (pwForm.next !== pwForm.confirm) return setPwError("Passwords do not match.");
    setPwForm({ current: "", next: "", confirm: "" });
    showToast("Password changed successfully");
  }

  const togglePw = (f) => setShowPw((p) => ({ ...p, [f]: !p[f] }));

  const st = {
    Active:   { bg: "rgba(0,184,184,0.10)",  border: "rgba(0,184,184,0.35)",  color: "#00B8B8" },
    Inactive: { bg: "rgba(204,0,0,0.10)",    border: "rgba(204,0,0,0.35)",    color: "#CC0000" },
  }[profile.status] || { bg: "rgba(0,184,184,0.10)", border: "rgba(0,184,184,0.35)", color: "#00B8B8" };

  const card = { background: surface, border: `1px solid ${border}`, boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none" };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Hero Card ── */}
      <div className="rounded-2xl overflow-hidden" style={card}>
        <div style={{ height: "80px", background: "linear-gradient(135deg, #CC0000 0%, #8A0000 100%)", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px)" }} />
          <span style={{ position: "absolute", right: "20px", bottom: "10px", fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "56px", color: "rgba(255,255,255,0.06)", lineHeight: 1, userSelect: "none" }}>
            {profile.empId}
          </span>
        </div>
        <div className="flex items-end gap-5 px-6 pb-5" style={{ marginTop: "-32px" }}>
          {/* Avatar with upload */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div className="rounded-full flex items-center justify-center"
              style={{ width: "72px", height: "72px", overflow: "hidden",
                background: photoUrl ? "transparent" : "#CC0000",
                border: `3px solid ${surface}`, boxShadow: "0 4px 16px rgba(204,0,0,0.4)" }}>
              {photoUrl ? (
                <img src={getThumbnailUrl(photoUrl, 144)} alt={profile.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "26px" }}>
                  {profile.initials || profile.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              {photoUploading && (
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
                  background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center",
                  justifyContent: "center" }}>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
                    fontSize: "14px", color: "#00B8B8" }}>{photoProgress}%</span>
                </div>
              )}
            </div>
            {/* Camera button */}
            <button onClick={() => photoInputRef.current?.click()} disabled={photoUploading}
              title="Change profile photo"
              style={{ position: "absolute", bottom: 0, right: 0, width: "22px", height: "22px",
                borderRadius: "50%", background: "#CC0000", border: `2px solid ${surface}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: photoUploading ? "not-allowed" : "pointer", padding: 0 }}>
              <Camera size={11} color="#fff" />
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => handlePhotoUpload(e.target.files?.[0])} />
          </div>
          <div className="flex-1 pt-10">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "26px", fontWeight: 700, color: textPri, lineHeight: 1 }}>{profile.name}</h2>
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted, marginTop: "3px" }}>{profile.role} · {profile.department}</p>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: "#C9922A", background: "rgba(201,146,42,0.1)", border: "1px solid rgba(201,146,42,0.3)", borderRadius: "4px", padding: "2px 10px" }}>{profile.empId}</span>
                <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 600, background: st.bg, border: `1px solid ${st.border}`, color: st.color, borderRadius: "4px", padding: "2px 10px" }}>{profile.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo upload status banner */}
      {(photoErr || photoUploading) && (
        <div style={{
          padding: "10px 16px", borderRadius: "10px",
          background: photoErr ? "rgba(204,0,0,0.08)" : "rgba(0,184,184,0.08)",
          border: `1px solid ${photoErr ? "rgba(204,0,0,0.3)" : "rgba(0,184,184,0.3)"}`,
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          {photoUploading ? (
            <>
              <div style={{ flex: 1, height: "4px", borderRadius: "2px",
                background: theme === "dark" ? "#1E1E1E" : "#E0E0E0", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${photoProgress}%`,
                  background: "#00B8B8", borderRadius: "2px", transition: "width 300ms" }} />
              </div>
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px",
                color: "#00B8B8", whiteSpace: "nowrap" }}>Uploading photo… {photoProgress}%</span>
            </>
          ) : (
            <>
              <AlertCircle size={14} style={{ color: "#CC0000", flexShrink: 0 }} />
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#CC0000" }}>{photoErr}</span>
            </>
          )}
        </div>
      )}

      {/* ── Two-column grid ── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>

        {/* LEFT */}
        <div className="flex flex-col gap-5">

          {/* Personal Info */}
          <div className="rounded-2xl p-5" style={card}>
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>Personal Information</SectionLabel>
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                  style={{ background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.2)", color: "#CC0000", fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                  <Edit3 size={12} /> Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleSaveProfile}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                    style={{ background: "rgba(0,184,184,0.10)", border: "1px solid rgba(0,184,184,0.3)", color: "#00B8B8", fontFamily: "Mulish, sans-serif", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                    <Save size={12} /> Save
                  </button>
                  <button onClick={handleCancelEdit} style={{ background: "transparent", border: "none", color: textMuted, cursor: "pointer" }}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
            {!editing ? (
              <>
                <InfoRow icon={User}      label="Full Name" value={profile.name}      theme={theme} />
                <InfoRow icon={Mail}      label="Email"     value={profile.email}     theme={theme} />
                <InfoRow icon={Phone}     label="Phone"     value={editData.phone}    theme={theme} />
                <InfoRow icon={Building2} label="Location"  value={editData.location} theme={theme} />
                <div className="pt-3">
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: textMuted, marginBottom: "4px" }}>Bio</p>
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri, lineHeight: 1.6 }}>{editData.bio || "—"}</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <EditField label="Phone Number" value={editData.phone}    onChange={(v) => setEditData((p) => ({ ...p, phone: v }))}    theme={theme} />
                <EditField label="Location"     value={editData.location} onChange={(v) => setEditData((p) => ({ ...p, location: v }))} theme={theme} />
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted, fontWeight: 600 }}>Bio</label>
                  <textarea value={editData.bio} onChange={(e) => setEditData((p) => ({ ...p, bio: e.target.value }))} rows={3}
                    style={{ background: theme === "dark" ? "#0D0D0D" : "#F8F8F8", border: `1px solid ${border}`, borderRadius: "8px", padding: "9px 12px", fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri, outline: "none", width: "100%", resize: "vertical", transition: "border-color 150ms" }}
                    onFocus={(e) => e.target.style.borderColor = "#CC0000"}
                    onBlur={(e) => e.target.style.borderColor = border}
                  />
                </div>
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>* Name and email can only be changed by HR/Admin.</p>
              </div>
            )}
          </div>

          {/* Employment Details */}
          <div className="rounded-2xl p-5" style={card}>
            <SectionLabel>Employment Details</SectionLabel>
            <InfoRow icon={Briefcase}  label="Role"         value={profile.role}       theme={theme} />
            <InfoRow icon={Building2}  label="Department"   value={profile.department} theme={theme} />
            <InfoRow icon={User}       label="Manager"      value={profile.manager}    theme={theme} />
            <InfoRow icon={Calendar}   label="Joined"       value={new Date(profile.joinDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} theme={theme} />
            <InfoRow icon={Shield}     label="Access Level" value="Employee"           theme={theme} />
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-5">

          {/* Change Password */}
          <div className="rounded-2xl p-5" style={card}>
            <SectionLabel>Change Password</SectionLabel>
            <div className="flex flex-col gap-4">
              <PasswordField label="Current Password"      value={pwForm.current} onChange={(v) => setPwForm((p) => ({ ...p, current: v }))} show={showPw.current} onToggle={() => togglePw("current")} theme={theme} />
              <PasswordField label="New Password"          value={pwForm.next}    onChange={(v) => setPwForm((p) => ({ ...p, next: v }))}    show={showPw.next}    onToggle={() => togglePw("next")}    theme={theme} />
              <PasswordField label="Confirm New Password"  value={pwForm.confirm} onChange={(v) => setPwForm((p) => ({ ...p, confirm: v }))} show={showPw.confirm} onToggle={() => togglePw("confirm")} theme={theme} />
              {pwError && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.2)" }}>
                  <AlertCircle size={13} style={{ color: "#CC0000", flexShrink: 0 }} />
                  <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#CC0000" }}>{pwError}</span>
                </div>
              )}
              <button onClick={handleChangePassword}
                className="flex items-center justify-center gap-2 rounded-xl py-2.5"
                style={{ background: "#CC0000", color: "#FFFFFF", fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "14px", letterSpacing: "0.08em", border: "none", cursor: "pointer", transition: "opacity 150ms" }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>
                <KeyRound size={15} /> UPDATE PASSWORD
              </button>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted, textAlign: "center" }}>Use at least 8 characters with a mix of letters and numbers.</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-2xl p-5" style={card}>
            <SectionLabel>This Month at a Glance</SectionLabel>
            <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {[
                { label: "Days Present", value: "18",  color: "#00B8B8" },
                { label: "Days Absent",  value: "2",   color: "#CC0000" },
                { label: "Leave Used",   value: "1/2", color: "#C9922A" },
                { label: "WFH Days",     value: "2/2", color: "#00B8B8" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl p-4 flex flex-col gap-1"
                  style={{ background: theme === "dark" ? "#0D0D0D" : "#F8F8F8", border: `1px solid ${theme === "dark" ? "#1A1A1A" : "#EBEBEB"}` }}>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "28px", fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
                  <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Account */}
          <div className="rounded-2xl p-5" style={card}>
            <SectionLabel>Account</SectionLabel>
            <div className="flex flex-col gap-3">
              {[
                { label: "Employee ID",    value: profile.empId },
                { label: "Portal Access",  value: "Employee Portal" },
                { label: "Account Status", value: profile.status },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2"
                  style={{ borderBottom: `1px solid ${theme === "dark" ? "#1A1A1A" : "#F0F0F0"}` }}>
                  <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted }}>{label}</span>
                  <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "12px", color: textPri }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}