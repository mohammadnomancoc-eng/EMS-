import { useState, useEffect, useRef } from "react";
import { useTheme } from "../../App";
import {
  User, Mail, Phone, Building2, Briefcase,
  Calendar, Shield, Edit3, Save, X,
  KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle,
  Camera, Hash, MapPin, DollarSign, Loader,
} from "lucide-react";
import { uploadEmployeePhoto, getThumbnailUrl } from "../../cloudinary/cloudinaryService";
import {
  getEmployee,
  updateEmployee,
  updateEmployeePhoto,
} from "../../firebase/firestoreService";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth } from "../../firebase/config";

// ── Helpers ───────────────────────────────────────────
function getStoredUser() {
  const raw = localStorage.getItem("rwt-user");
  return raw ? JSON.parse(raw) : {};
}

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
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", fontWeight: 600, color: textPri, wordBreak: "break-word" }}>
          {value || <span style={{ color: textMuted, fontStyle: "italic", fontWeight: 400 }}>Not set</span>}
        </p>
      </div>
    </div>
  );
}

function EditField({ label, value, onChange, theme, disabled }) {
  const surface   = theme === "dark" ? "#0D0D0D" : "#F8F8F8";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#555555" : "#999999";
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted, fontWeight: 600 }}>{label}</label>
      <input
        type="text" value={value || ""} onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          background: disabled ? (theme === "dark" ? "#0A0A0A" : "#F0F0F0") : surface,
          border: `1px solid ${border}`, borderRadius: "8px",
          padding: "9px 12px", fontFamily: "Mulish, sans-serif", fontSize: "13px",
          color: disabled ? textMuted : textPri, outline: "none", width: "100%",
          transition: "border-color 150ms", cursor: disabled ? "not-allowed" : "text",
          boxSizing: "border-box",
        }}
        onFocus={(e) => { if (!disabled) e.target.style.borderColor = "#CC0000"; }}
        onBlur={(e)  => { e.target.style.borderColor = border; }}
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
            padding: "9px 44px 9px 12px", fontFamily: "Mulish, sans-serif", fontSize: "13px",
            color: textPri, outline: "none", width: "100%", transition: "border-color 150ms",
            boxSizing: "border-box",
          }}
          onFocus={(e) => e.target.style.borderColor = "#CC0000"}
          onBlur={(e)  => e.target.style.borderColor = border}
        />
        {/* Full-height tap target */}
        <button type="button" onClick={onToggle}
          className="absolute right-0 top-0 h-full flex items-center justify-center"
          style={{ width: "44px", color: textMuted, background: "none", border: "none", cursor: "pointer" }}>
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
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2 rounded-xl px-4 py-3 z-50"
      style={{
        background: ok ? "rgba(0,184,184,0.12)" : "rgba(204,0,0,0.12)",
        border: `1px solid ${ok ? "rgba(0,184,184,0.4)" : "rgba(204,0,0,0.4)"}`,
        backdropFilter: "blur(8px)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        maxWidth: "calc(100vw - 32px)",
      }}>
      {ok
        ? <CheckCircle2 size={15} style={{ color: "#00B8B8", flexShrink: 0 }} />
        : <AlertCircle  size={15} style={{ color: "#CC0000", flexShrink: 0 }} />}
      <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: ok ? "#00B8B8" : "#CC0000", fontWeight: 600 }}>
        {msg}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────
export default function MyProfile() {
  const { theme }  = useTheme();
  const storedUser = getStoredUser();

  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState("");

  const [editing,  setEditing]  = useState(false);
  const [editData, setEditData] = useState({ phone: "", location: "", bio: "" });

  const [pwForm,   setPwForm]   = useState({ current: "", next: "", confirm: "" });
  const [showPw,   setShowPw]   = useState({ current: false, next: false, confirm: false });
  const [pwError,  setPwError]  = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const photoInputRef                       = useRef(null);
  const [photoUrl,       setPhotoUrl]       = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoProgress,  setPhotoProgress]  = useState(0);
  const [photoErr,       setPhotoErr]       = useState("");

  const [toast, setToast] = useState({ msg: "", type: "" });

  useEffect(() => {
    const empId = storedUser.empId;
    if (!empId) {
      setFetchErr("Employee ID missing. Please log out and log in again.");
      setLoading(false);
      return;
    }
    getEmployee(empId)
      .then((doc) => {
        if (!doc) {
          setFetchErr("Profile not found in database. Contact HR/Admin.");
          setLoading(false);
          return;
        }
        setProfile(doc);
        setPhotoUrl(doc.photoUrl || null);
        setEditData({ phone: doc.phone || "", location: doc.location || "", bio: doc.bio || "" });
        setLoading(false);
      })
      .catch((err) => {
        setFetchErr(err.message || "Failed to load profile.");
        setLoading(false);
      });
  }, [storedUser.empId]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3000);
  }

  async function handlePhotoUpload(file) {
    if (!file || !profile) return;
    setPhotoErr(""); setPhotoUploading(true); setPhotoProgress(0);
    const objUrl = URL.createObjectURL(file);
    setPhotoUrl(objUrl);
    try {
      const result = await uploadEmployeePhoto(file, profile.id, (pct) => setPhotoProgress(pct));
      await updateEmployeePhoto(profile.id, result.secure_url, result.public_id);
      setPhotoUrl(result.secure_url);
      setProfile((p) => ({ ...p, photoUrl: result.secure_url, photoPublicId: result.public_id }));
      showToast("Profile photo updated");
    } catch (err) {
      setPhotoErr(err.message || "Upload failed.");
      setPhotoUrl(profile.photoUrl || null);
    } finally {
      setPhotoUploading(false); setPhotoProgress(0); URL.revokeObjectURL(objUrl);
    }
  }

  async function handleSaveProfile() {
    if (!profile) return;
    try {
      await updateEmployee(profile.id, { phone: editData.phone, location: editData.location, bio: editData.bio });
      setProfile((p) => ({ ...p, ...editData }));
      setEditing(false);
      showToast("Profile updated successfully");
    } catch (err) {
      showToast(err.message || "Save failed.", "error");
    }
  }

  function handleCancelEdit() {
    setEditData({ phone: profile?.phone || "", location: profile?.location || "", bio: profile?.bio || "" });
    setEditing(false);
  }

  async function handleChangePassword() {
    setPwError("");
    if (!pwForm.current) return setPwError("Enter your current password.");
    if (pwForm.next.length < 8) return setPwError("New password must be at least 8 characters.");
    if (pwForm.next !== pwForm.confirm) return setPwError("Passwords do not match.");
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return setPwError("Session expired. Please log in again.");
    setPwSaving(true);
    try {
      const cred = EmailAuthProvider.credential(firebaseUser.email, pwForm.current);
      await reauthenticateWithCredential(firebaseUser, cred);
      await updatePassword(firebaseUser, pwForm.next);
      setPwForm({ current: "", next: "", confirm: "" });
      showToast("Password changed successfully");
    } catch (err) {
      const code = err.code || "";
      setPwError(
        code.includes("wrong-password") || code.includes("invalid-credential")
          ? "Current password is incorrect."
          : err.message || "Password change failed."
      );
    } finally {
      setPwSaving(false);
    }
  }

  const togglePw = (f) => setShowPw((p) => ({ ...p, [f]: !p[f] }));

  // ── Theme tokens ─────────────────────────────────
  const surface   = theme === "dark" ? "#111111" : "#FFFFFF";
  const border    = theme === "dark" ? "#1E1E1E" : "#E0E0E0";
  const textPri   = theme === "dark" ? "#F0F0F0" : "#111111";
  const textMuted = theme === "dark" ? "#A0A0A0" : "#888888";
  const card      = {
    background: surface,
    border: `1px solid ${border}`,
    boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
  };

  // ── Loading / error ───────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Loader size={28} style={{ color: "#00B8B8", animation: "spin 1s linear infinite" }} />
      <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textMuted }}>Loading your profile…</p>
    </div>
  );

  if (fetchErr) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: "400px", padding: "0 16px" }}>
        <AlertCircle size={40} style={{ color: "#CC0000", margin: "0 auto 12px" }} />
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", color: textPri }}>{fetchErr}</p>
      </div>
    </div>
  );

  // ── Derived values ────────────────────────────────
  const displayName     = profile.name      || storedUser.name     || "—";
  const displayInitials = profile.initials   || storedUser.initials || displayName.slice(0, 2).toUpperCase();
  const displayEmpId    = profile.id         || storedUser.empId    || "—";
  const displayRole     = profile.role       || profile.jobRole     || "—";
  const displayDept     = profile.department || "—";
  const displayEmail    = profile.email      || "—";
  const displayStatus   = profile.status     || "Active";
  const displaySalary   = profile.salary     ? `₹${Number(profile.salary).toLocaleString("en-IN")}` : "—";
  const joinDisplay     = profile.joinDate
    ? new Date(profile.joinDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const st = ({
    Active:  { bg: "rgba(0,184,184,0.10)",  border: "rgba(0,184,184,0.35)",  color: "#00B8B8" },
    Present: { bg: "rgba(0,184,184,0.10)",  border: "rgba(0,184,184,0.35)",  color: "#00B8B8" },
    Inactive:{ bg: "rgba(204,0,0,0.10)",    border: "rgba(204,0,0,0.35)",    color: "#CC0000" },
    Absent:  { bg: "rgba(204,0,0,0.10)",    border: "rgba(204,0,0,0.35)",    color: "#CC0000" },
    Leave:   { bg: "rgba(201,146,42,0.10)", border: "rgba(201,146,42,0.35)", color: "#C9922A" },
    WFH:     { bg: "rgba(255,255,255,0.06)",border: "rgba(255,255,255,0.2)", color: "#E8E8E8" },
  })[displayStatus] || { bg: "rgba(0,184,184,0.10)", border: "rgba(0,184,184,0.35)", color: "#00B8B8" };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Hero Card ── */}
      <div className="rounded-2xl overflow-hidden" style={card}>
        {/* Banner */}
        <div style={{ height: "72px", background: "linear-gradient(135deg, #CC0000 0%, #8A0000 100%)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px)" }} />
          <span style={{ position: "absolute", right: "16px", bottom: "6px", fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "clamp(32px, 8vw, 56px)", color: "rgba(255,255,255,0.06)", lineHeight: 1, userSelect: "none" }}>
            {displayEmpId}
          </span>
        </div>

        {/* Profile row */}
        <div
          className="flex items-end gap-3 sm:gap-5 px-4 sm:px-6 pb-4 sm:pb-5"
          style={{ marginTop: "-28px" }}
        >
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div className="rounded-full flex items-center justify-center"
              style={{
                width: "64px", height: "64px", overflow: "hidden",
                background: photoUrl ? "transparent" : "#CC0000",
                border: `3px solid ${surface}`,
                boxShadow: "0 4px 16px rgba(204,0,0,0.4)",
              }}>
              {photoUrl ? (
                <img src={getThumbnailUrl(photoUrl, 128)} alt={displayName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "22px" }}>
                  {displayInitials}
                </span>
              )}
              {photoUploading && (
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "12px", color: "#00B8B8" }}>{photoProgress}%</span>
                </div>
              )}
            </div>
            <button onClick={() => photoInputRef.current?.click()} disabled={photoUploading}
              style={{ position: "absolute", bottom: 0, right: 0, width: "20px", height: "20px", borderRadius: "50%", background: "#CC0000", border: `2px solid ${surface}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: photoUploading ? "not-allowed" : "pointer", padding: 0 }}>
              <Camera size={10} color="#fff" />
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => handlePhotoUpload(e.target.files?.[0])} />
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0" style={{ paddingTop: "28px" }}>
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div className="min-w-0">
                <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "clamp(18px, 5vw, 26px)", fontWeight: 700, color: textPri, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayName}
                </h2>
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, marginTop: "3px" }}>
                  {displayRole}{displayDept !== "—" ? ` · ${displayDept}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#C9922A", background: "rgba(201,146,42,0.1)", border: "1px solid rgba(201,146,42,0.3)", borderRadius: "4px", padding: "2px 8px", whiteSpace: "nowrap" }}>
                  {displayEmpId}
                </span>
                <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 600, background: st.bg, border: `1px solid ${st.border}`, color: st.color, borderRadius: "4px", padding: "2px 8px", whiteSpace: "nowrap" }}>
                  {displayStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo upload progress / error banner */}
      {(photoErr || photoUploading) && (
        <div style={{ padding: "10px 16px", borderRadius: "10px", background: photoErr ? "rgba(204,0,0,0.08)" : "rgba(0,184,184,0.08)", border: `1px solid ${photoErr ? "rgba(204,0,0,0.3)" : "rgba(0,184,184,0.3)"}`, display: "flex", alignItems: "center", gap: "10px" }}>
          {photoUploading ? (
            <>
              <div style={{ flex: 1, height: "4px", borderRadius: "2px", background: theme === "dark" ? "#1E1E1E" : "#E0E0E0", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${photoProgress}%`, background: "#00B8B8", borderRadius: "2px", transition: "width 300ms" }} />
              </div>
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#00B8B8", whiteSpace: "nowrap" }}>Uploading… {photoProgress}%</span>
            </>
          ) : (
            <>
              <AlertCircle size={14} style={{ color: "#CC0000", flexShrink: 0 }} />
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#CC0000" }}>{photoErr}</span>
            </>
          )}
        </div>
      )}

      {/* ── Two-column grid: stacks on mobile, side-by-side on lg ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-4 sm:gap-5">

          {/* Personal Info */}
          <div className="rounded-2xl p-4 sm:p-5" style={card}>
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
                  <button onClick={handleCancelEdit} style={{ background: "transparent", border: "none", color: textMuted, cursor: "pointer", padding: "4px" }}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {!editing ? (
              <>
                <InfoRow icon={User}   label="Full Name" value={displayName}     theme={theme} />
                <InfoRow icon={Mail}   label="Email"     value={displayEmail}    theme={theme} />
                <InfoRow icon={Phone}  label="Phone"     value={profile.phone}   theme={theme} />
                <InfoRow icon={MapPin} label="Location"  value={profile.location} theme={theme} />
                <div className="pt-3">
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "10px", color: textMuted, marginBottom: "4px" }}>Bio</p>
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: profile.bio ? textPri : textMuted, lineHeight: 1.6, fontStyle: profile.bio ? "normal" : "italic" }}>
                    {profile.bio || "No bio added yet."}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <EditField label="Full Name"    value={displayName}       onChange={() => {}} theme={theme} disabled />
                <EditField label="Email"        value={displayEmail}      onChange={() => {}} theme={theme} disabled />
                <EditField label="Phone Number" value={editData.phone}    onChange={(v) => setEditData((p) => ({ ...p, phone: v }))}    theme={theme} />
                <EditField label="Location"     value={editData.location} onChange={(v) => setEditData((p) => ({ ...p, location: v }))} theme={theme} />
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted, fontWeight: 600 }}>Bio</label>
                  <textarea value={editData.bio} onChange={(e) => setEditData((p) => ({ ...p, bio: e.target.value }))} rows={3}
                    style={{ background: theme === "dark" ? "#0D0D0D" : "#F8F8F8", border: `1px solid ${border}`, borderRadius: "8px", padding: "9px 12px", fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textPri, outline: "none", width: "100%", resize: "vertical", transition: "border-color 150ms", boxSizing: "border-box" }}
                    onFocus={(e) => e.target.style.borderColor = "#CC0000"}
                    onBlur={(e)  => e.target.style.borderColor = border} />
                </div>
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>
                  * Name and email can only be changed by HR/Admin.
                </p>
              </div>
            )}
          </div>

          {/* Employment Details */}
          <div className="rounded-2xl p-4 sm:p-5" style={card}>
            <SectionLabel>Employment Details</SectionLabel>
            <InfoRow icon={Briefcase}  label="Job Role"     value={displayRole}   theme={theme} />
            <InfoRow icon={Building2}  label="Department"   value={displayDept}   theme={theme} />
            <InfoRow icon={Hash}       label="Employee ID"  value={displayEmpId}  theme={theme} />
            <InfoRow icon={Calendar}   label="Date Joined"  value={joinDisplay}   theme={theme} />
            <InfoRow icon={DollarSign} label="Salary (CTC)" value={displaySalary} theme={theme} />
            <InfoRow icon={Shield}     label="Access Level" value="Employee"       theme={theme} />
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="flex flex-col gap-4 sm:gap-5">

          {/* Change Password */}
          <div className="rounded-2xl p-4 sm:p-5" style={card}>
            <SectionLabel>Change Password</SectionLabel>
            <div className="flex flex-col gap-4">
              <PasswordField label="Current Password"     value={pwForm.current} onChange={(v) => setPwForm((p) => ({ ...p, current: v }))} show={showPw.current} onToggle={() => togglePw("current")} theme={theme} />
              <PasswordField label="New Password"         value={pwForm.next}    onChange={(v) => setPwForm((p) => ({ ...p, next: v }))}    show={showPw.next}    onToggle={() => togglePw("next")}    theme={theme} />
              <PasswordField label="Confirm New Password" value={pwForm.confirm} onChange={(v) => setPwForm((p) => ({ ...p, confirm: v }))} show={showPw.confirm} onToggle={() => togglePw("confirm")} theme={theme} />
              {pwError && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.2)" }}>
                  <AlertCircle size={13} style={{ color: "#CC0000", flexShrink: 0 }} />
                  <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#CC0000" }}>{pwError}</span>
                </div>
              )}
              <button onClick={handleChangePassword} disabled={pwSaving}
                className="flex items-center justify-center gap-2 rounded-xl py-2.5"
                style={{ background: pwSaving ? "#991111" : "#CC0000", color: "#FFFFFF", fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "14px", letterSpacing: "0.08em", border: "none", cursor: pwSaving ? "not-allowed" : "pointer", transition: "opacity 150ms", minHeight: "44px" }}
                onMouseEnter={(e) => { if (!pwSaving) e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
                {pwSaving
                  ? <><Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> Updating…</>
                  : <><KeyRound size={15} /> UPDATE PASSWORD</>}
              </button>
              <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted, textAlign: "center" }}>
                Use at least 8 characters with a mix of letters and numbers.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-2xl p-4 sm:p-5" style={card}>
            <SectionLabel>This Month at a Glance</SectionLabel>
            {/* 2×2 grid always — compact enough on all screens */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Days Present", value: "—", color: "#00B8B8" },
                { label: "Days Absent",  value: "—", color: "#CC0000" },
                { label: "Leave Used",   value: "—", color: "#C9922A" },
                { label: "WFH Days",     value: "—", color: "#00B8B8" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl p-3 sm:p-4 flex flex-col gap-1"
                  style={{ background: theme === "dark" ? "#0D0D0D" : "#F8F8F8", border: `1px solid ${theme === "dark" ? "#1A1A1A" : "#EBEBEB"}` }}>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
                  <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted }}>{label}</span>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textMuted, marginTop: "12px", textAlign: "center" }}>
              View detailed stats in My Attendance.
            </p>
          </div>

          {/* Account */}
          <div className="rounded-2xl p-4 sm:p-5" style={card}>
            <SectionLabel>Account</SectionLabel>
            <div className="flex flex-col gap-3">
              {[
                { label: "Employee ID",    value: displayEmpId },
                { label: "Portal Access",  value: "Employee Portal" },
                { label: "Account Status", value: displayStatus },
                { label: "Email",          value: displayEmail },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 gap-3"
                  style={{ borderBottom: `1px solid ${theme === "dark" ? "#1A1A1A" : "#F0F0F0"}` }}>
                  <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: textPri, textAlign: "right", wordBreak: "break-all" }}>{value}</span>
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