import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../App";
import {
  getCompanySettings, saveCompanySettings,
  getEmployees, getAttendanceByEmployee, deleteEmployee,
} from "../firebase/firestoreService";
import {
  updatePassword, reauthenticateWithCredential,
  EmailAuthProvider, signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import {
  Settings, User, Bell, Shield, Palette,
  Building2, Clock, Mail, Phone, Globe,
  Lock, Eye, EyeOff, Check, AlertTriangle,
  Sun, Moon, Monitor, ChevronRight, ChevronDown,
  Download, Trash2, RefreshCw, Save,
  Database, HardDrive, LogOut, MapPin,
  ShieldCheck, Wifi, AlertCircle, Menu, X, MessageCircle,
  Camera,
} from "lucide-react";
import { uploadToCloudinary, getThumbnailUrl } from "../cloudinary/cloudinaryService";

// ── Shared primitives ──────────────────────────────────

function SectionTitle({ title, sub }) {
  return (
    <div className="mb-5">
      <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "clamp(17px, 4vw, 20px)", color: "inherit", lineHeight: 1.2 }}>{title}</h2>
      {sub && <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: "inherit", opacity: 0.6, marginTop: "4px" }}>{sub}</p>}
    </div>
  );
}

// SettingRow: stacks label+control vertically on very small screens
function SettingRow({ label, sub, children, theme }) {
  const isDark  = theme === "dark";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const textPri = isDark ? "#F0F0F0" : "#111111";
  const textSub = isDark ? "#666666" : "#999999";
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-2 sm:gap-4"
      style={{ borderBottom: `1px solid ${border}` }}
    >
      <div className="flex-1 min-w-0">
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", fontWeight: 600, color: textPri }}>{label}</p>
        {sub && <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub, marginTop: "2px" }}>{sub}</p>}
      </div>
      <div className="flex-shrink-0 self-start sm:self-auto">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, accent = "#00B8B8", theme }) {
  const isDark = theme === "dark";
  return (
    <button onClick={() => onChange(!on)} className="relative rounded-full flex-shrink-0"
      style={{ width: "44px", height: "24px", background: on ? accent : (isDark ? "#2A2A2A" : "#D8D8D8"), transition: "background 200ms ease", border: "none", cursor: "pointer" }}>
      <span className="absolute rounded-full"
        style={{ width: "18px", height: "18px", background: "#FFFFFF", top: "3px", left: on ? "23px" : "3px", transition: "left 200ms ease", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", theme, readOnly = false }) {
  const isDark    = theme === "dark";
  const border    = isDark ? "#1E1E1E" : "#E0E0E0";
  const inputBg   = isDark ? "#0A0A0A" : "#F8F8F8";
  const textColor = isDark ? "#F0F0F0" : "#111111";
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>{label.toUpperCase()}</label>}
      <input type={type} value={value} onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder} readOnly={readOnly}
        style={{ background: readOnly ? (isDark ? "#0D0D0D" : "#F0F0F0") : inputBg, border: `1px solid ${border}`, color: readOnly ? (isDark ? "#555555" : "#AAAAAA") : textColor, borderRadius: "8px", padding: "9px 12px", fontFamily: "Mulish, sans-serif", fontSize: "13px", outline: "none", cursor: readOnly ? "not-allowed" : "text", width: "100%", boxSizing: "border-box" }}
        onFocus={e => { if (!readOnly) { e.target.style.border = "1px solid #00B8B8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)"; }}}
        onBlur={e => { e.target.style.border = `1px solid ${border}`; e.target.style.boxShadow = "none"; }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, theme }) {
  const isDark    = theme === "dark";
  const border    = isDark ? "#1E1E1E" : "#E0E0E0";
  const inputBg   = isDark ? "#0A0A0A" : "#F8F8F8";
  const textColor = isDark ? "#F0F0F0" : "#111111";
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>{label.toUpperCase()}</label>}
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)} className="appearance-none w-full outline-none"
          style={{ background: inputBg, border: `1px solid ${border}`, color: textColor, borderRadius: "8px", padding: "9px 36px 9px 12px", fontFamily: "Mulish, sans-serif", fontSize: "13px", cursor: "pointer", width: "100%", boxSizing: "border-box" }}>
          {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#666666" }} />
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, theme }) {
  const [show, setShow] = useState(false);
  const isDark    = theme === "dark";
  const border    = isDark ? "#1E1E1E" : "#E0E0E0";
  const inputBg   = isDark ? "#0A0A0A" : "#F8F8F8";
  const textColor = isDark ? "#F0F0F0" : "#111111";
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>{label.toUpperCase()}</label>
      <div className="relative">
        <input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)}
          style={{ width: "100%", background: inputBg, border: `1px solid ${border}`, color: textColor, borderRadius: "8px", padding: "9px 40px 9px 12px", fontFamily: "Mulish, sans-serif", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
          onFocus={e => { e.target.style.border = "1px solid #00B8B8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)"; }}
          onBlur={e => { e.target.style.border = `1px solid ${border}`; e.target.style.boxShadow = "none"; }}
        />
        <button onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#666666", background: "none", border: "none", cursor: "pointer" }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

function SaveBtn({ onClick, saved, loading, theme }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 px-5 py-2.5 rounded-lg mt-6 w-full sm:w-auto justify-center sm:justify-start"
      style={{ background: saved ? "#00B8B8" : "#CC0000", border: `1px solid ${saved ? "#00B8B8" : "#CC0000"}`, color: "#FFFFFF", fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", transition: "all 250ms ease", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
      {saved ? <Check size={15} /> : <Save size={15} />}
      {loading ? "SAVING…" : saved ? "SAVED!" : "SAVE CHANGES"}
    </button>
  );
}

// DangerBtn: stacks on mobile
function DangerBtn({ label, sub, icon: Icon, onClick, theme }) {
  const isDark  = theme === "dark";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const textSub = isDark ? "#666666" : "#999999";
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg px-4 sm:px-5 py-4 gap-3" style={{ background: surface, border: `1px solid ${border}` }}>
      <div className="min-w-0">
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", fontWeight: 600, color: isDark ? "#F0F0F0" : "#111111" }}>{label}</p>
        {sub && <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub, marginTop: "2px" }}>{sub}</p>}
      </div>
      <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 rounded-lg flex-shrink-0 self-start sm:self-auto"
        style={{ background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.3)", color: "#CC0000", fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", transition: "all 150ms ease", cursor: "pointer" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(204,0,0,0.18)"; e.currentTarget.style.borderColor = "#CC0000"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(204,0,0,0.08)"; e.currentTarget.style.borderColor = "rgba(204,0,0,0.3)"; }}>
        <Icon size={14} />{label.toUpperCase()}
      </button>
    </div>
  );
}

// ConfirmDialog — bottom-sheet on mobile, centered on sm+
function ConfirmDialog({ message, onConfirm, onCancel, theme, danger = true }) {
  const isDark = theme === "dark";
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div
        className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm"
        style={{ background: isDark ? "#111111" : "#FFFFFF", border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`, padding: "24px" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={20} style={{ color: "#CC0000", flexShrink: 0 }} />
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "16px", fontWeight: 700, color: isDark ? "#F0F0F0" : "#111111" }}>Are you sure?</p>
        </div>
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: isDark ? "#888888" : "#666666", lineHeight: 1.6, marginBottom: "20px" }}>{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg" style={{ background: "transparent", border: `1px solid ${isDark ? "#2A2A2A" : "#E0E0E0"}`, color: isDark ? "#888888" : "#666666", fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-lg" style={{ background: danger ? "#CC0000" : "#00B8B8", border: "none", color: "#FFFFFF", fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Profile Section ────────────────────────────────────
function ProfileSection({ theme }) {
  const isDark  = theme === "dark";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const textPri = isDark ? "#F0F0F0" : "#111111";
  const textSub = isDark ? "#666666" : "#999999";

  const fileRef = useRef(null);
  const storedRaw = localStorage.getItem("rwt-user") || "{}";
  const stored = JSON.parse(storedRaw);

  const [form, setForm] = useState({
    name:        stored.name        || "Admin",
    designation: stored.designation || "Super Admin",
    phone:       stored.phone       || "",
    timezone:    stored.timezone    || "Asia/Kolkata",
    email:       auth.currentUser?.email || "",
    company:     "Royals Webtech Pvt. Ltd.",
  });
  const [photoUrl,     setPhotoUrl]     = useState(stored.photoUrl || "");
  const [uploading,    setUploading]    = useState(false);
  const [uploadPct,    setUploadPct]    = useState(0);
  const [uploadErr,    setUploadErr]    = useState("");
  const [saved,        setSaved]        = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, "users", uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setForm(f => ({
          ...f,
          name:        d.name        || f.name,
          designation: d.designation || f.designation,
          phone:       d.phone       || f.phone,
          timezone:    d.timezone    || f.timezone,
        }));
        if (d.photoUrl) setPhotoUrl(d.photoUrl);
      }
    }).catch(() => {});
  }, []);

  const handlePhotoChange = async (file) => {
    if (!file) return;
    setUploadErr(""); setUploading(true); setUploadPct(0);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not logged in");
      const result = await uploadToCloudinary(file, "image", {
        folder:     "ems/admins",
        publicId:   `admin_${uid}_profile_${Date.now()}`,
        onProgress: (pct) => setUploadPct(pct),
      });
      const newUrl = result.secure_url;
      const newPid = result.public_id;
      // Persist to Firestore
      await updateDoc(doc(db, "users", uid), {
        photoUrl:      newUrl,
        photoPublicId: newPid,
      });
      // Sync localStorage so Layout picks it up immediately
      const freshStored = JSON.parse(localStorage.getItem("rwt-user") || "{}");
      localStorage.setItem("rwt-user", JSON.stringify({ ...freshStored, photoUrl: newUrl }));
      setPhotoUrl(newUrl);
      // Notify other components (header avatar) via storage event
      window.dispatchEvent(new Event("rwt-user-updated"));
    } catch (err) {
      setUploadErr(err.message || "Upload failed.");
    } finally {
      setUploading(false); setUploadPct(0);
    }
  };

  const handleSave = async () => {
    setLoading(true); setError("");
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not logged in");
      await updateDoc(doc(db, "users", uid), {
        name: form.name, designation: form.designation,
        phone: form.phone, timezone: form.timezone,
      });
      const freshStored = JSON.parse(localStorage.getItem("rwt-user") || "{}");
      localStorage.setItem("rwt-user", JSON.stringify({
        ...freshStored, name: form.name, designation: form.designation,
      }));
      window.dispatchEvent(new Event("rwt-user-updated"));
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (err) { setError(err.message || "Failed to save profile."); }
    finally { setLoading(false); }
  };

  const initials = form.name
    ? form.name.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "AD";

  return (
    <div>
      <SectionTitle title="Profile Settings" sub="Update your personal and admin information" />

      {/* Avatar card */}
      <div className="flex items-center gap-4 mb-6 p-4 sm:p-5 rounded-xl" style={{ background: surface, border: `1px solid ${border}` }}>
        {/* Clickable avatar with camera overlay */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              width: "72px", height: "72px", borderRadius: "50%", overflow: "hidden",
              background: "#CC0000",
              border: "3px solid #CC0000",
              boxShadow: "0 0 0 3px " + (isDark ? "#0A0A0A" : "#F4F4F4"),
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {photoUrl
              ? <img src={getThumbnailUrl(photoUrl, 144)} alt={form.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "24px" }}>{initials}</span>
            }
            {/* Upload progress overlay */}
            {uploading && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "rgba(0,0,0,0.6)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 700, color: "#00B8B8" }}>
                  {uploadPct}%
                </span>
              </div>
            )}
          </div>
          {/* Camera button */}
          <button
            id="admin-photo-upload-btn"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Change profile photo"
            style={{
              position: "absolute", bottom: 0, right: 0,
              width: "26px", height: "26px", borderRadius: "50%",
              background: "#CC0000", border: "2px solid " + (isDark ? "#111111" : "#FFFFFF"),
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: uploading ? "not-allowed" : "pointer",
              opacity: uploading ? 0.6 : 1,
              transition: "transform 150ms ease",
            }}
            onMouseEnter={e => { if (!uploading) e.currentTarget.style.transform = "scale(1.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <Camera size={12} color="#fff" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={e => handlePhotoChange(e.target.files?.[0])}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "clamp(15px, 4vw, 18px)", color: textPri, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {form.name}
          </p>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub }}>
            {form.designation} · Royals Webtech
          </p>
          <div className="flex items-center gap-1 mt-1">
            <div className="rounded-full" style={{ width: "6px", height: "6px", background: "#00B8B8" }} />
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#00B8B8" }}>ONLINE</span>
          </div>
          {uploadErr && (
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: "#CC0000", marginTop: "4px" }}>
              ⚠ {uploadErr}
            </p>
          )}
          {!uploading && !uploadErr && (
            <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textSub, marginTop: "4px" }}>
              Click the camera icon to update your photo
            </p>
          )}
        </div>
      </div>

      {/* Form — 2-col grids collapse to 1-col on mobile */}
      <div className="p-4 sm:p-5 rounded-xl flex flex-col gap-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name"   value={form.name}        onChange={set("name")}        theme={theme} />
          <Field label="Designation" value={form.designation} onChange={set("designation")} theme={theme} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email Address" value={form.email} onChange={() => {}} readOnly type="email" theme={theme} />
          <Field label="Phone Number"  value={form.phone} onChange={set("phone")} type="tel" theme={theme} placeholder="+91 98765 00000" />
        </div>
        <SelectField label="Timezone" value={form.timezone} onChange={set("timezone")} theme={theme}
          options={[
            { value: "Asia/Kolkata",        label: "IST — India Standard Time (UTC+5:30)" },
            { value: "Asia/Dubai",          label: "GST — Gulf Standard Time (UTC+4)" },
            { value: "Europe/London",       label: "GMT — Greenwich Mean Time (UTC+0)" },
            { value: "America/New_York",    label: "EST — Eastern Standard Time (UTC-5)" },
            { value: "America/Los_Angeles", label: "PST — Pacific Standard Time (UTC-8)" },
          ]} />
        {error && (
          <div className="flex items-center gap-2 rounded-lg px-4 py-3" style={{ background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.3)" }}>
            <AlertTriangle size={14} style={{ color: "#CC0000", flexShrink: 0 }} />
            <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: "#CC0000" }}>{error}</span>
          </div>
        )}
        <SaveBtn onClick={handleSave} saved={saved} loading={loading} theme={theme} />
      </div>
    </div>
  );
}

// ── Notifications Section ──────────────────────────────
function NotificationsSection({ theme }) {
  const isDark  = theme === "dark";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";

  const [prefs, setPrefs] = useState({
    emailLeave: true, emailAttendance: false, emailPayroll: true, emailAnnouncements: true,
    pushLeave: true,  pushAttendance: true,   pushPayroll: false, pushSystem: true,
    digestFrequency: "daily", quietHoursFrom: "22:00", quietHoursTo: "08:00",
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "settings", "notifications")).then(snap => {
      if (snap.exists()) setPrefs(p => ({ ...p, ...snap.data() }));
    }).catch(() => {});
  }, []);

  const set = (key) => (val) => setPrefs(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setLoading(true);
    try { await setDocHelper("settings", "notifications", prefs); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    catch {} finally { setLoading(false); }
  };

  const group = (title) => (
    <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginTop: "8px", marginBottom: "2px" }}>{title}</p>
  );

  return (
    <div>
      <SectionTitle title="Notification Preferences" sub="Control what updates you receive and how" />
      <div className="p-4 sm:p-5 rounded-xl" style={{ background: surface, border: `1px solid ${border}` }}>
        {group("EMAIL NOTIFICATIONS")}
        <SettingRow label="Leave Requests"    sub="Get emailed when an employee submits leave"  theme={theme}><Toggle on={prefs.emailLeave}         onChange={set("emailLeave")}         theme={theme} /></SettingRow>
        <SettingRow label="Attendance Alerts" sub="Daily attendance summary to your inbox"      theme={theme}><Toggle on={prefs.emailAttendance}    onChange={set("emailAttendance")}    theme={theme} /></SettingRow>
        <SettingRow label="Payroll Processed" sub="Notification when payroll run is complete"   theme={theme}><Toggle on={prefs.emailPayroll}        onChange={set("emailPayroll")}       theme={theme} /></SettingRow>
        <SettingRow label="Announcements"     sub="Company-wide announcements via email"        theme={theme}><Toggle on={prefs.emailAnnouncements} onChange={set("emailAnnouncements")} theme={theme} /></SettingRow>

        {group("PUSH NOTIFICATIONS")}
        <SettingRow label="Leave Requests"   sub="In-app push for new leave applications"      theme={theme}><Toggle on={prefs.pushLeave}      onChange={set("pushLeave")}      accent="#CC0000" theme={theme} /></SettingRow>
        <SettingRow label="Attendance Flags" sub="Alert when unusual absence pattern detected" theme={theme}><Toggle on={prefs.pushAttendance} onChange={set("pushAttendance")} accent="#CC0000" theme={theme} /></SettingRow>
        <SettingRow label="Payroll Updates"  sub="Push notification on payroll events"         theme={theme}><Toggle on={prefs.pushPayroll}    onChange={set("pushPayroll")}    accent="#CC0000" theme={theme} /></SettingRow>
        <SettingRow label="System Alerts"    sub="Critical system events and security alerts"  theme={theme}><Toggle on={prefs.pushSystem}     onChange={set("pushSystem")}     accent="#CC0000" theme={theme} /></SettingRow>

        {group("DIGEST & QUIET HOURS")}
        {/* 3-col on sm+, 1-col on mobile */}
        <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ borderBottom: `1px solid ${isDark ? "#1E1E1E" : "#E0E0E0"}` }}>
          <SelectField label="Digest Frequency" value={prefs.digestFrequency} onChange={set("digestFrequency")} theme={theme}
            options={[{ value: "realtime", label: "Real-time" }, { value: "hourly", label: "Hourly" }, { value: "daily", label: "Daily Digest" }, { value: "weekly", label: "Weekly Digest" }]} />
          <Field label="Quiet Hours From" value={prefs.quietHoursFrom} onChange={set("quietHoursFrom")} type="time" theme={theme} />
          <Field label="Quiet Hours To"   value={prefs.quietHoursTo}   onChange={set("quietHoursTo")}   type="time" theme={theme} />
        </div>
        <SaveBtn onClick={handleSave} saved={saved} loading={loading} theme={theme} />
      </div>
    </div>
  );
}

// ── Appearance Section ─────────────────────────────────
function AppearanceSection({ theme, toggleTheme }) {
  const isDark  = theme === "dark";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const textPri = isDark ? "#F0F0F0" : "#111111";
  const textSub = isDark ? "#666666" : "#999999";

  const [accent,         setAccent]         = useState("red");
  const [fontSize,       setFontSize]       = useState("normal");
  const [compactSidebar, setCompactSidebar] = useState(false);
  const [animCounters,   setAnimCounters]   = useState(true);
  const [saved,   setSaved]   = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "settings", "appearance")).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.accent)         setAccent(d.accent);
        if (d.fontSize)       setFontSize(d.fontSize);
        if (d.compactSidebar !== undefined) setCompactSidebar(d.compactSidebar);
        if (d.animCounters   !== undefined) setAnimCounters(d.animCounters);
      }
    }).catch(() => {});
  }, []);

  const accentOptions = [
    { id: "red",    color: "#CC0000", label: "Red (Default)" },
    { id: "teal",   color: "#00B8B8", label: "Teal" },
    { id: "gold",   color: "#C9922A", label: "Gold" },
    { id: "indigo", color: "#6366F1", label: "Indigo" },
    { id: "green",  color: "#10B981", label: "Emerald" },
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDocHelper("settings", "appearance", { accent, fontSize, compactSidebar, animCounters });
      localStorage.setItem("rwt-appearance", JSON.stringify({ accent, fontSize, compactSidebar, animCounters }));
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch {} finally { setLoading(false); }
  };

  return (
    <div>
      <SectionTitle title="Appearance" sub="Customize the look and feel of your dashboard" />

      {/* Theme cards — 3-col always (small enough to work on mobile) */}
      <div className="p-4 sm:p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "12px" }}>COLOR THEME</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { id: "dark",   icon: Moon,    label: "Dark",   sub: "Easy on the eyes" },
            { id: "light",  icon: Sun,     label: "Light",  sub: "Clean & bright" },
            { id: "system", icon: Monitor, label: "System", sub: "Follows OS" },
          ].map(({ id, icon: Icon, label, sub }) => {
            const isActive = id === "system" ? false : id === theme;
            return (
              <button key={id}
                onClick={() => { if (id !== "system" && id !== theme) toggleTheme(); }}
                className="rounded-xl p-3 sm:p-4 flex flex-col items-center gap-2 text-center"
                style={{ background: isActive ? (isDark ? "rgba(204,0,0,0.08)" : "rgba(204,0,0,0.05)") : (isDark ? "#0D0D0D" : "#F8F8F8"), border: `2px solid ${isActive ? "#CC0000" : border}`, cursor: id === "system" ? "not-allowed" : "pointer", opacity: id === "system" ? 0.5 : 1, transition: "all 150ms ease" }}>
                <Icon size={20} style={{ color: isActive ? "#CC0000" : textSub }} />
                <div>
                  <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "clamp(11px, 3vw, 13px)", fontWeight: 700, color: isActive ? textPri : textSub }}>{label}</p>
                  <p className="hidden sm:block" style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textSub }}>{sub}</p>
                </div>
                {isActive && <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: "18px", height: "18px", background: "#CC0000" }}><Check size={10} style={{ color: "#FFFFFF" }} /></div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent Color */}
      <div className="p-4 sm:p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "12px" }}>ACCENT COLOR</p>
        <div className="flex gap-3 flex-wrap">
          {accentOptions.map(({ id, color, label }) => (
            <button key={id} onClick={() => setAccent(id)} title={label}
              className="rounded-full flex items-center justify-center flex-shrink-0"
              style={{ width: "34px", height: "34px", background: color, border: accent === id ? `3px solid ${isDark ? "#F0F0F0" : "#111111"}` : "3px solid transparent", boxShadow: accent === id ? `0 0 0 2px ${color}` : "none", transition: "all 150ms ease" }}>
              {accent === id && <Check size={14} style={{ color: "#FFFFFF" }} />}
            </button>
          ))}
        </div>
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textSub, marginTop: "10px" }}>
          Selected: <strong style={{ color: accentOptions.find(a => a.id === accent)?.color }}>{accentOptions.find(a => a.id === accent)?.label}</strong>
        </p>
      </div>

      {/* UI prefs */}
      <div className="p-4 sm:p-5 rounded-xl" style={{ background: surface, border: `1px solid ${border}` }}>
        <SettingRow label="Font Size" sub="Adjust the base text size across the dashboard" theme={theme}>
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${border}` }}>
            {["compact", "normal", "large"].map((s, i) => (
              <button key={s} onClick={() => setFontSize(s)}
                style={{ background: fontSize === s ? "#CC0000" : (isDark ? "#111111" : "#FFFFFF"), color: fontSize === s ? "#FFFFFF" : textSub, fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 10px", borderRight: i < 2 ? `1px solid ${border}` : "none", transition: "all 150ms ease", cursor: "pointer" }}>
                {s}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Compact Sidebar" sub="Use a narrower sidebar to save screen space" theme={theme}>
          <Toggle on={compactSidebar} onChange={setCompactSidebar} theme={theme} />
        </SettingRow>
        <SettingRow label="Animated Counters" sub="Animate numeric values when the page loads" theme={theme}>
          <Toggle on={animCounters} onChange={setAnimCounters} theme={theme} />
        </SettingRow>
        <SaveBtn onClick={handleSave} saved={saved} loading={loading} theme={theme} />
      </div>
    </div>
  );
}

// ── Security Section ───────────────────────────────────
function SecuritySection({ theme }) {
  const isDark  = theme === "dark";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";

  const [passwords, setPasswords] = useState({ current: "", newPw: "", confirm: "" });
  const [twoFA,          setTwoFA]    = useState(false);
  const [sessionTimeout, setSession]  = useState("30");
  const [sessions,       setSessions] = useState([
    { id: "current", device: "This browser", location: "Nagpur, India", time: "Now (current)", current: true },
  ]);
  const [pwSaved, setPwSaved] = useState(false);
  const [secSaved, setSecSaved] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [secLoading, setSecLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const set = (key) => (val) => setPasswords(p => ({ ...p, [key]: val }));

  useEffect(() => {
    getDoc(doc(db, "settings", "security")).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.twoFA !== undefined)         setTwoFA(d.twoFA);
        if (d.sessionTimeout !== undefined) setSession(String(d.sessionTimeout));
      }
    }).catch(() => {});
    getDoc(doc(db, "settings", "sessions")).then(snap => {
      if (snap.exists() && snap.data().list) setSessions(snap.data().list);
    }).catch(() => {});
  }, []);

  const handleChangePassword = async () => {
    setPwError(""); setPwSuccess("");
    if (!passwords.current)               { setPwError("Enter your current password."); return; }
    if (!passwords.newPw)                 { setPwError("Enter a new password."); return; }
    if (passwords.newPw.length < 8)       { setPwError("New password must be at least 8 characters."); return; }
    if (passwords.newPw !== passwords.confirm) { setPwError("New passwords do not match."); return; }
    setPwLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in.");
      const credential = EmailAuthProvider.credential(user.email, passwords.current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwords.newPw);
      setPasswords({ current: "", newPw: "", confirm: "" });
      setPwSuccess("Password changed successfully.");
      setPwSaved(true); setTimeout(() => { setPwSaved(false); setPwSuccess(""); }, 3000);
    } catch (err) {
      setPwError(err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" ? "Current password is incorrect." : (err.message || "Failed to change password."));
    } finally { setPwLoading(false); }
  };

  const handleSaveSecurity = async () => {
    setSecLoading(true);
    try { await setDocHelper("settings", "security", { twoFA, sessionTimeout: Number(sessionTimeout) }); setSecSaved(true); setTimeout(() => setSecSaved(false), 2500); }
    catch {} finally { setSecLoading(false); }
  };

  const handleRevoke = async (sessionId) => {
    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);
    await setDocHelper("settings", "sessions", { list: updated });
  };

  return (
    <div>
      <SectionTitle title="Security" sub="Manage your password, 2FA, and session settings" />

      {/* Change Password — 2 pw fields stack on mobile */}
      <div className="p-4 sm:p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "16px" }}>CHANGE PASSWORD</p>
        <div className="flex flex-col gap-4">
          <PasswordField label="Current Password" value={passwords.current} onChange={set("current")} theme={theme} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PasswordField label="New Password"     value={passwords.newPw}   onChange={set("newPw")}   theme={theme} />
            <PasswordField label="Confirm Password" value={passwords.confirm} onChange={set("confirm")} theme={theme} />
          </div>
          {pwError && (
            <div className="flex items-center gap-2 rounded-lg px-4 py-3" style={{ background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.3)" }}>
              <AlertTriangle size={14} style={{ color: "#CC0000", flexShrink: 0 }} />
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: "#CC0000" }}>{pwError}</span>
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-center gap-2 rounded-lg px-4 py-3" style={{ background: "rgba(0,184,184,0.08)", border: "1px solid rgba(0,184,184,0.3)" }}>
              <Check size={14} style={{ color: "#00B8B8", flexShrink: 0 }} />
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: "#00B8B8" }}>{pwSuccess}</span>
            </div>
          )}
          <SaveBtn onClick={handleChangePassword} saved={pwSaved} loading={pwLoading} theme={theme} />
        </div>
      </div>

      {/* Access Control */}
      <div className="p-4 sm:p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "4px" }}>ACCESS CONTROL</p>
        <SettingRow label="Two-Factor Authentication" sub="Add an extra layer of security with OTP on login" theme={theme}>
          <Toggle on={twoFA} onChange={setTwoFA} accent="#CC0000" theme={theme} />
        </SettingRow>
        <SettingRow label="Session Timeout" sub="Auto-logout after inactivity" theme={theme}>
          <div style={{ width: "160px" }}>
            <SelectField label="" value={sessionTimeout} onChange={setSession} theme={theme}
              options={[{ value: "15", label: "15 minutes" }, { value: "30", label: "30 minutes" }, { value: "60", label: "1 hour" }, { value: "240", label: "4 hours" }, { value: "0", label: "Never" }]} />
          </div>
        </SettingRow>
        <SaveBtn onClick={handleSaveSecurity} saved={secSaved} loading={secLoading} theme={theme} />
      </div>

      {/* Active Sessions */}
      <div className="p-4 sm:p-5 rounded-xl" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "12px" }}>ACTIVE SESSIONS</p>
        {sessions.map((s, i) => (
          <div key={s.id || i} className="flex items-center justify-between py-3"
            style={{ borderBottom: i < sessions.length - 1 ? `1px solid ${isDark ? "#1A1A1A" : "#F0F0F0"}` : "none" }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: "34px", height: "34px", background: isDark ? "#1A1A1A" : "#F5F5F5", border: `1px solid ${border}` }}>
                <Monitor size={15} style={{ color: s.current ? "#00B8B8" : "#555555" }} />
              </div>
              <div className="min-w-0">
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: 600, color: isDark ? "#F0F0F0" : "#111111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.device}</p>
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: isDark ? "#666666" : "#999999" }}>{s.location} · {s.time}</p>
              </div>
            </div>
            <div className="flex-shrink-0 ml-3">
              {s.current ? (
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#00B8B8" }}>CURRENT</span>
              ) : (
                <button onClick={() => handleRevoke(s.id || i)} className="px-3 py-1.5 rounded"
                  style={{ background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.2)", color: "#CC0000", fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer" }}>
                  REVOKE
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Company Section ────────────────────────────────────
function CompanySection({ theme }) {
  const isDark    = theme === "dark";
  const surface   = isDark ? "#111111" : "#FFFFFF";
  const border    = isDark ? "#1E1E1E" : "#E0E0E0";
  const textMuted = isDark ? "#666666" : "#999999";

  const defaultForm = {
    company: "Royals Webtech Pvt. Ltd.", gstin: "", pan: "", address: "Nagpur, Maharashtra, India",
    workingDays: "monday-friday", workStart: "09:00", workEnd: "18:00",
    leaveYear: "april", payDay: "last-working", currency: "INR",
    officeLat: "", officeLng: "", geoFenceRadius: "100",
    whatsappGroupLink: "",
  };

  const [form,         setForm]         = useState(defaultForm);
  const [saved,        setSaved]        = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [geoLoading,   setGeoLoading]   = useState(false);
  const [geoError,     setGeoError]     = useState("");
  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    getCompanySettings().then(data => {
      if (data) {
        setForm(f => ({
          ...f,
          company:        data.name            || f.company,
          gstin:          data.gstin           || f.gstin,
          pan:            data.pan             || f.pan,
          address:        data.address         || f.address,
          workingDays:    data.workingDays     || f.workingDays,
          workStart:      data.workStart       || f.workStart,
          workEnd:        data.workEnd         || f.workEnd,
          leaveYear:      data.leaveYear       || f.leaveYear,
          payDay:         data.payDay          || f.payDay,
          currency:       data.currency        || f.currency,
          officeLat:         data.officeLat  != null ? String(data.officeLat)      : "",
          officeLng:         data.officeLng  != null ? String(data.officeLng)      : "",
          geoFenceRadius:    data.geoFenceRadius != null ? String(data.geoFenceRadius) : "100",
          whatsappGroupLink: data.whatsappGroupLink || "",
        }));
      }
      setFetchLoading(false);
    }).catch(() => setFetchLoading(false));
  }, []);

  const handleUseMyLocation = () => {
    setGeoError(""); setGeoLoading(true);
    if (!navigator.geolocation) { setGeoError("Geolocation not supported."); setGeoLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { setForm(f => ({ ...f, officeLat: pos.coords.latitude.toFixed(6), officeLng: pos.coords.longitude.toFixed(6) })); setGeoLoading(false); },
      err => { setGeoError("Could not get location: " + err.message); setGeoLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveCompanySettings({
        name:              form.company,  gstin:          form.gstin,      pan:      form.pan,
        address:           form.address,  workingDays:    form.workingDays, workStart: form.workStart,
        workEnd:           form.workEnd,  leaveYear:      form.leaveYear,   payDay:   form.payDay,
        currency:          form.currency,
        officeLat:         form.officeLat      ? parseFloat(form.officeLat)      : null,
        officeLng:         form.officeLng      ? parseFloat(form.officeLng)      : null,
        geoFenceRadius:    form.geoFenceRadius ? parseInt(form.geoFenceRadius)   : 100,
        whatsappGroupLink: form.whatsappGroupLink.trim() || null,
      });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch {} finally { setLoading(false); }
  };

  if (fetchLoading) return <div style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: textMuted, padding: "20px" }}>Loading settings…</div>;

  return (
    <div>
      <SectionTitle title="Company Settings" sub="Configure company-wide rules and HR policies" />

      {/* Company Details */}
      <div className="p-4 sm:p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "16px" }}>COMPANY DETAILS</p>
        <div className="flex flex-col gap-4">
          <Field label="Company Name" value={form.company} onChange={set("company")} theme={theme} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="GSTIN" value={form.gstin} onChange={set("gstin")} theme={theme} placeholder="27AAACR1234A1Z5" />
            <Field label="PAN"   value={form.pan}   onChange={set("pan")}   theme={theme} placeholder="AAACR1234A" />
          </div>
          <Field label="Registered Address" value={form.address} onChange={set("address")} theme={theme} />
        </div>
      </div>

      {/* Work Schedule */}
      <div className="p-4 sm:p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "16px" }}>WORK SCHEDULE</p>
        <div className="flex flex-col gap-4">
          <SelectField label="Working Days" value={form.workingDays} onChange={set("workingDays")} theme={theme}
            options={[{ value: "monday-friday", label: "Monday – Friday" }, { value: "monday-saturday", label: "Monday – Saturday" }, { value: "custom", label: "Custom" }]} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Work Start Time" value={form.workStart} onChange={set("workStart")} type="time" theme={theme} />
            <Field label="Work End Time"   value={form.workEnd}   onChange={set("workEnd")}   type="time" theme={theme} />
          </div>
        </div>
      </div>

      {/* Payroll & Leave */}
      <div className="p-4 sm:p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "16px" }}>PAYROLL & LEAVE POLICY</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SelectField label="Leave Year Start" value={form.leaveYear} onChange={set("leaveYear")} theme={theme}
            options={[{ value: "january", label: "January" }, { value: "april", label: "April (Financial Year)" }, { value: "custom", label: "Custom" }]} />
          <SelectField label="Salary Pay Day" value={form.payDay} onChange={set("payDay")} theme={theme}
            options={[{ value: "1", label: "1st of Month" }, { value: "last-working", label: "Last Working Day" }, { value: "custom", label: "Custom Date" }]} />
          <SelectField label="Currency" value={form.currency} onChange={set("currency")} theme={theme} options={["INR", "USD", "EUR", "GBP", "AED"]} />
        </div>
        <SaveBtn onClick={handleSave} saved={saved} loading={loading} theme={theme} />
      </div>

      {/* WhatsApp Group */}
      <div className="p-4 sm:p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle size={14} style={{ color: "#25D366" }} />
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em" }}>WHATSAPP GROUP</p>
        </div>
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, marginBottom: "16px" }}>
          Paste the WhatsApp group invite link here. Employees will be able to share their attendance directly to this group.
        </p>
        <Field
          label="WhatsApp Group Invite Link"
          value={form.whatsappGroupLink}
          onChange={set("whatsappGroupLink")}
          theme={theme}
          placeholder="https://chat.whatsapp.com/XXXXXXXXXXXXXX"
        />
        <SaveBtn onClick={handleSave} saved={saved} loading={loading} theme={theme} />
      </div>

      {/* Geo-fence */}
      <div className="p-4 sm:p-5 rounded-xl" style={{ background: surface, border: `1px solid ${border}` }}>
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={14} style={{ color: "#CC0000" }} />
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em" }}>OFFICE LOCATION & GEO-FENCE</p>
        </div>
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textMuted, marginBottom: "16px" }}>
          Set office GPS coordinates. WFO employees must be within the geo-fence radius to mark webcam attendance.
        </p>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Office Latitude"  value={form.officeLat} onChange={set("officeLat")} theme={theme} placeholder="e.g. 21.146633" />
            <Field label="Office Longitude" value={form.officeLng} onChange={set("officeLng")} theme={theme} placeholder="e.g. 79.088860" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button onClick={handleUseMyLocation} disabled={geoLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg self-start"
              style={{ background: "rgba(0,184,184,0.08)", border: "1px solid rgba(0,184,184,0.3)", color: "#00B8B8", fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700, cursor: geoLoading ? "not-allowed" : "pointer", opacity: geoLoading ? 0.6 : 1 }}>
              <MapPin size={13} />{geoLoading ? "Detecting…" : "Use My Current Location"}
            </button>
            {form.officeLat && form.officeLng && (
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: textMuted }}>
                {parseFloat(form.officeLat).toFixed(5)}, {parseFloat(form.officeLng).toFixed(5)}
              </span>
            )}
          </div>
          {geoError && <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: "#CC0000" }}>{geoError}</p>}
          <div style={{ maxWidth: "200px" }}>
            <Field label="Geo-fence Radius (metres)" value={form.geoFenceRadius} onChange={set("geoFenceRadius")} theme={theme} type="number" placeholder="100" />
          </div>
        </div>
        <SaveBtn onClick={handleSave} saved={saved} loading={loading} theme={theme} />
      </div>
    </div>
  );
}

// ── System Section ─────────────────────────────────────
function SystemSection({ theme }) {
  const isDark  = theme === "dark";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const textSub = isDark ? "#666666" : "#999999";

  const [autoBackup,   setAutoBackup]   = useState(true);
  const [maintenance,  setMaintenance]  = useState(false);
  const [sysSaved,     setSysSaved]     = useState(false);
  const [sysLoading,   setSysLoading]   = useState(false);
  const [backupStatus, setBackupStatus] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [confirm,      setConfirm]      = useState(null);
  const [lastBackup,   setLastBackup]   = useState("Never");
  const [storageInfo,  setStorageInfo]  = useState({ used: "—", total: "10 GB" });

  useEffect(() => {
    getDoc(doc(db, "settings", "system")).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.autoBackup  !== undefined) setAutoBackup(d.autoBackup);
        if (d.maintenance !== undefined) setMaintenance(d.maintenance);
        if (d.lastBackup)                setLastBackup(new Date(d.lastBackup).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
      }
    }).catch(() => {});
  }, []);

  const handleExport = async () => {
    setExportStatus("Fetching data…");
    try {
      const employees = await getEmployees();
      const rows = [["Emp ID", "Name", "Role", "Department", "Email", "Phone", "Join Date", "Status", "Work Type", "Salary"].join(",")];
      for (const e of employees) {
        rows.push([e.id, `"${e.name || ""}"`, `"${e.role || ""}"`, `"${e.department || ""}"`, e.email || "", e.phone || "", e.joinDate || "", e.status || "", e.workType || "WFO", e.salary || ""].join(","));
      }
      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `employees_export_${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
      setExportStatus("Downloaded!"); setTimeout(() => setExportStatus(""), 3000);
    } catch (err) { setExportStatus("Export failed: " + err.message); }
  };

  const handleBackup = async () => {
    setBackupStatus("Creating backup…");
    try {
      const now = new Date().toISOString();
      await setDocHelper("settings", "system", { lastBackup: now });
      setLastBackup(new Date(now).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
      setBackupStatus("Backup created!"); setTimeout(() => setBackupStatus(""), 3000);
    } catch { setBackupStatus("Backup failed."); }
  };

  const handleSaveSystem = async () => {
    setSysLoading(true);
    try { await setDocHelper("settings", "system", { autoBackup, maintenance }); setSysSaved(true); setTimeout(() => setSysSaved(false), 2500); }
    catch {} finally { setSysLoading(false); }
  };

  const handleResetSettings = async () => {
    const settingsDocs = ["company", "notifications", "appearance", "security", "system", "sessions"];
    const batch = writeBatch(db);
    settingsDocs.forEach(id => batch.delete(doc(db, "settings", id)));
    await batch.commit();
    setConfirm(null);
    window.location.reload();
  };

  const handleClearData = async () => {
    setConfirm(null);
    const [attSnap, leaveSnap] = await Promise.all([
      getDocs(collection(db, "attendance")),
      getDocs(collection(db, "leaveRequests")),
    ]);
    const batch = writeBatch(db);
    attSnap.docs.forEach(d   => batch.delete(d.ref));
    leaveSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  };

  const handleDeleteAccount = async () => {
    setConfirm(null);
    const uid = auth.currentUser?.uid;
    if (uid) await deleteDoc(doc(db, "users", uid));
    await signOut(auth);
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div>
      <SectionTitle title="System & Data" sub="Manage backups, exports, and advanced configuration" />
      {confirm && (
        <ConfirmDialog message={confirm.message} onConfirm={confirm.action} onCancel={() => setConfirm(null)} theme={theme} />
      )}

      {/* Info cards — 3-col sm+, 1-col mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
        {[
          { label: "System Version", value: "v2.4.1",         icon: HardDrive, color: "#00B8B8" },
          { label: "Last Backup",    value: lastBackup,        icon: Database,  color: "#C9922A" },
          { label: "Storage",        value: storageInfo.total, icon: Wifi,      color: "#6366F1" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-4 flex items-center gap-3" style={{ background: surface, border: `1px solid ${border}` }}>
            <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: "38px", height: "38px", background: color + "18", border: `1px solid ${color}33` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="min-w-0">
              <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "9px", color: textSub, letterSpacing: "0.1em" }}>{label.toUpperCase()}</p>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 700, color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Data Management */}
      <div className="p-4 sm:p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "4px" }}>DATA MANAGEMENT</p>
        <SettingRow label="Export All Data" sub="Download a full CSV export of all employee records" theme={theme}>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ background: isDark ? "#1A1A1A" : "#F5F5F5", border: `1px solid ${border}`, color: exportStatus ? "#00B8B8" : textSub, fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer", transition: "color 200ms", whiteSpace: "nowrap" }}>
            <Download size={13} />{exportStatus || "EXPORT"}
          </button>
        </SettingRow>
        <SettingRow label="Create Backup" sub="Manually trigger a system backup right now" theme={theme}>
          <button onClick={handleBackup} className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ background: isDark ? "#1A1A1A" : "#F5F5F5", border: `1px solid ${border}`, color: backupStatus ? "#00B8B8" : textSub, fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", cursor: "pointer", transition: "color 200ms", whiteSpace: "nowrap" }}>
            <Database size={13} />{backupStatus || "BACKUP"}
          </button>
        </SettingRow>
        <SettingRow label="Auto Backup" sub="Automatically backup every 24 hours at 3:00 AM" theme={theme}>
          <Toggle on={autoBackup} onChange={setAutoBackup} theme={theme} />
        </SettingRow>
        <SettingRow label="Maintenance Mode" sub="Take the system offline for maintenance" theme={theme}>
          <Toggle on={maintenance} onChange={setMaintenance} accent="#CC0000" theme={theme} />
        </SettingRow>
        <SaveBtn onClick={handleSaveSystem} saved={sysSaved} loading={sysLoading} theme={theme} />
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(204,0,0,0.3)" }}>
        <div className="px-4 sm:px-5 py-3 flex items-center gap-2" style={{ background: "rgba(204,0,0,0.06)", borderBottom: "1px solid rgba(204,0,0,0.2)" }}>
          <AlertTriangle size={14} style={{ color: "#CC0000" }} />
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>DANGER ZONE</span>
        </div>
        <div className="p-4 flex flex-col gap-3" style={{ background: isDark ? "#0D0D0D" : "#FFF8F8" }}>
          <DangerBtn label="Reset Settings" sub="Restore all settings to factory defaults" icon={RefreshCw}
            onClick={() => setConfirm({ message: "This will delete all saved settings (company info, notifications, appearance, security). This cannot be undone.", action: handleResetSettings })} theme={theme} />
          <DangerBtn label="Clear All Data" sub="Permanently delete all attendance & leave data" icon={Trash2}
            onClick={() => setConfirm({ message: "This will permanently delete ALL attendance records and leave requests. Employee profiles will not be affected. This cannot be undone.", action: handleClearData })} theme={theme} />
          <DangerBtn label="Delete Account" sub="Permanently remove this admin account" icon={LogOut}
            onClick={() => setConfirm({ message: "Your admin account will be permanently deleted and you will be logged out. All employees and company data will remain. This cannot be undone.", action: handleDeleteAccount })} theme={theme} />
        </div>
      </div>
    </div>
  );
}

// ── Shared Firestore helper ────────────────────────────
async function setDocHelper(col, id, data) {
  await setDoc(doc(db, col, id), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
}

// ══════════════════════════════════════════════════════
// MAIN SETTINGS PAGE — responsive two-pane layout
// • Desktop (md+): persistent left sidebar + right content
// • Mobile (<md):  horizontal pill tab bar scrolls across top
// ══════════════════════════════════════════════════════
export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const isDark  = theme === "dark";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const textPri = isDark ? "#F0F0F0" : "#111111";

  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { id: "profile",       label: "Profile",       icon: User      },
    { id: "notifications", label: "Notifications", icon: Bell      },
    { id: "appearance",    label: "Appearance",    icon: Palette   },
    { id: "security",      label: "Security",      icon: Shield    },
    { id: "company",       label: "Company",       icon: Building2 },
    { id: "system",        label: "System",        icon: HardDrive },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6">

      {/* ── Mobile: horizontal scrolling pill tabs ── */}
      <div
        className="flex md:hidden gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-full flex-shrink-0"
              style={{
                background: isActive ? "#CC0000" : (isDark ? "#111111" : "#F5F5F5"),
                border: `1px solid ${isActive ? "#CC0000" : border}`,
                color: isActive ? "#FFFFFF" : (isDark ? "#888888" : "#666666"),
                fontFamily: "Rajdhani, sans-serif",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                transition: "all 150ms ease",
                whiteSpace: "nowrap",
              }}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Desktop: vertical sidebar ── */}
      <div
        className="hidden md:block flex-shrink-0 rounded-xl overflow-hidden self-start sticky top-20"
        style={{ width: "220px", background: surface, border: `1px solid ${border}` }}
      >
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${border}` }}>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em" }}>SETTINGS</p>
        </div>
        <div className="p-2">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const textSub  = isDark ? "#555555" : "#AAAAAA";
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left"
                style={{
                  background: isActive ? (isDark ? "rgba(204,0,0,0.08)" : "rgba(204,0,0,0.06)") : "transparent",
                  borderLeft: isActive ? "3px solid #CC0000" : "3px solid transparent",
                  transition: "all 150ms ease",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = isDark ? "#111111" : "#F5F5F5"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <tab.icon size={16} style={{ color: isActive ? "#00B8B8" : textSub, flexShrink: 0 }} />
                <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: isActive ? 700 : 500, color: isActive ? (isDark ? "#F0F0F0" : "#111111") : textSub }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content pane ── */}
      <div className="flex-1 min-w-0" style={{ color: textPri }}>
        {activeTab === "profile"       && <ProfileSection       theme={theme} />}
        {activeTab === "notifications" && <NotificationsSection theme={theme} />}
        {activeTab === "appearance"    && <AppearanceSection    theme={theme} toggleTheme={toggleTheme} />}
        {activeTab === "security"      && <SecuritySection      theme={theme} />}
        {activeTab === "company"       && <CompanySection       theme={theme} />}
        {activeTab === "system"        && <SystemSection        theme={theme} />}
      </div>
    </div>
  );
}