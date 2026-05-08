import { useState } from "react";
import { useTheme } from "../App";
import {
  Settings, User, Bell, Shield, Palette,
  Building2, Clock, Mail, Phone, Globe,
  Lock, Eye, EyeOff, Check, AlertTriangle,
  Sun, Moon, Monitor, ChevronRight, ToggleLeft,
  ToggleRight, Download, Trash2, RefreshCw, Save,
  Key, Database, Wifi, HardDrive, LogOut
} from "lucide-react";

// ── Section Tab ────────────────────────────────────────
function Tab({ label, icon: Icon, active, onClick, theme }) {
  const isDark  = theme === "dark";
  const textSub = isDark ? "#555555" : "#AAAAAA";
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left"
      style={{
        background: active ? (isDark ? "rgba(204,0,0,0.08)" : "rgba(204,0,0,0.06)") : "transparent",
        borderLeft: active ? "3px solid #CC0000" : "3px solid transparent",
        transition: "all 150ms ease",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = isDark ? "#111111" : "#F5F5F5"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <Icon size={16} style={{ color: active ? "#00B8B8" : textSub, flexShrink: 0 }} />
      <span style={{
        fontFamily: "Mulish, sans-serif", fontSize: "13px",
        fontWeight: active ? 700 : 500,
        color: active ? (isDark ? "#F0F0F0" : "#111111") : textSub,
      }}>
        {label}
      </span>
    </button>
  );
}

// ── Section Heading ────────────────────────────────────
function SectionTitle({ title, sub }) {
  return (
    <div className="mb-5">
      <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "20px", color: "inherit", lineHeight: 1.2 }}>
        {title}
      </h2>
      {sub && <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: "inherit", opacity: 0.6, marginTop: "4px" }}>{sub}</p>}
    </div>
  );
}

// ── Setting Row ────────────────────────────────────────
function SettingRow({ label, sub, children, theme }) {
  const isDark = theme === "dark";
  const border = isDark ? "#1E1E1E" : "#E0E0E0";
  const textPri = isDark ? "#F0F0F0" : "#111111";
  const textSub = isDark ? "#666666" : "#999999";
  return (
    <div className="flex items-center justify-between py-4"
      style={{ borderBottom: `1px solid ${border}` }}>
      <div className="flex-1 pr-6">
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", fontWeight: 600, color: textPri }}>{label}</p>
        {sub && <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub, marginTop: "2px" }}>{sub}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ── Toggle Switch ──────────────────────────────────────
function Toggle({ on, onChange, accent = "#00B8B8", theme }) {
  const isDark = theme === "dark";
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative rounded-full flex-shrink-0"
      style={{
        width: "44px", height: "24px",
        background: on ? accent : (isDark ? "#2A2A2A" : "#D8D8D8"),
        transition: "background 200ms ease",
        border: "none", cursor: "pointer",
      }}
    >
      <span
        className="absolute rounded-full"
        style={{
          width: "18px", height: "18px",
          background: "#FFFFFF",
          top: "3px",
          left: on ? "23px" : "3px",
          transition: "left 200ms ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

// ── Input Field ────────────────────────────────────────
function Field({ label, value, onChange, type = "text", placeholder = "", theme, readOnly = false }) {
  const isDark   = theme === "dark";
  const border   = isDark ? "#1E1E1E" : "#E0E0E0";
  const inputBg  = isDark ? "#0A0A0A" : "#F8F8F8";
  const textColor= isDark ? "#F0F0F0" : "#111111";
  const labelCol = "#CC0000";
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: labelCol, letterSpacing: "0.15em" }}>
        {label.toUpperCase()}
      </label>
      <input
        type={type} value={value}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{
          background: readOnly ? (isDark ? "#0D0D0D" : "#F0F0F0") : inputBg,
          border: `1px solid ${border}`,
          color: readOnly ? (isDark ? "#555555" : "#AAAAAA") : textColor,
          borderRadius: "8px", padding: "9px 12px",
          fontFamily: "Mulish, sans-serif", fontSize: "13px", outline: "none",
          cursor: readOnly ? "not-allowed" : "text",
        }}
        onFocus={e => { if (!readOnly) { e.target.style.border = "1px solid #00B8B8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)"; }}}
        onBlur={e => { e.target.style.border = `1px solid ${border}`; e.target.style.boxShadow = "none"; }}
      />
    </div>
  );
}

// ── Select Field ───────────────────────────────────────
function SelectField({ label, value, onChange, options, theme }) {
  const isDark   = theme === "dark";
  const border   = isDark ? "#1E1E1E" : "#E0E0E0";
  const inputBg  = isDark ? "#0A0A0A" : "#F8F8F8";
  const textColor= isDark ? "#F0F0F0" : "#111111";
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>
        {label.toUpperCase()}
      </label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="appearance-none w-full outline-none"
          style={{
            background: inputBg, border: `1px solid ${border}`,
            color: textColor, borderRadius: "8px", padding: "9px 36px 9px 12px",
            fontFamily: "Mulish, sans-serif", fontSize: "13px", cursor: "pointer",
          }}>
          {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
        <ChevronRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90"
          style={{ color: "#666666" }} />
      </div>
    </div>
  );
}

// ── Save Button ────────────────────────────────────────
function SaveBtn({ onClick, saved, theme }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-5 py-2.5 rounded-lg mt-6"
      style={{
        background: saved ? "#00B8B8" : "#CC0000",
        border: `1px solid ${saved ? "#00B8B8" : "#CC0000"}`,
        color: "#FFFFFF",
        fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em",
        transition: "all 250ms ease",
      }}>
      {saved ? <Check size={15} /> : <Save size={15} />}
      {saved ? "SAVED!" : "SAVE CHANGES"}
    </button>
  );
}

// ── Password Field ─────────────────────────────────────
function PasswordField({ label, value, onChange, theme }) {
  const [show, setShow] = useState(false);
  const isDark   = theme === "dark";
  const border   = isDark ? "#1E1E1E" : "#E0E0E0";
  const inputBg  = isDark ? "#0A0A0A" : "#F8F8F8";
  const textColor= isDark ? "#F0F0F0" : "#111111";
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>
        {label.toUpperCase()}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"} value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: "100%", background: inputBg, border: `1px solid ${border}`,
            color: textColor, borderRadius: "8px", padding: "9px 40px 9px 12px",
            fontFamily: "Mulish, sans-serif", fontSize: "13px", outline: "none",
          }}
          onFocus={e => { e.target.style.border = "1px solid #00B8B8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)"; }}
          onBlur={e => { e.target.style.border = `1px solid ${border}`; e.target.style.boxShadow = "none"; }}
        />
        <button onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: "#666666", background: "none", border: "none", cursor: "pointer" }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Danger Zone Button ─────────────────────────────────
function DangerBtn({ label, sub, icon: Icon, onClick, theme }) {
  const isDark  = theme === "dark";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const textSub = isDark ? "#666666" : "#999999";
  return (
    <div className="flex items-center justify-between rounded-lg px-5 py-4"
      style={{ background: surface, border: `1px solid ${border}` }}>
      <div>
        <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "14px", fontWeight: 600, color: isDark ? "#F0F0F0" : "#111111" }}>{label}</p>
        {sub && <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub, marginTop: "2px" }}>{sub}</p>}
      </div>
      <button onClick={onClick}
        className="flex items-center gap-2 px-4 py-2 rounded-lg"
        style={{
          background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.3)",
          color: "#CC0000", fontFamily: "Rajdhani, sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em",
          transition: "all 150ms ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(204,0,0,0.18)"; e.currentTarget.style.borderColor = "#CC0000"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(204,0,0,0.08)"; e.currentTarget.style.borderColor = "rgba(204,0,0,0.3)"; }}>
        <Icon size={14} />
        {label.toUpperCase()}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// SECTION COMPONENTS
// ══════════════════════════════════════════════════════

function ProfileSection({ theme }) {
  const isDark = theme === "dark";
  const textPri = isDark ? "#F0F0F0" : "#111111";
  const textSub = isDark ? "#666666" : "#999999";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";

  const [form, setForm] = useState({
    name: "Admin", email: "admin@royalswebtech.com",
    phone: "+91 98765 00000", designation: "Super Admin",
    company: "Royals Webtech Pvt. Ltd.", timezone: "Asia/Kolkata",
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div>
      <SectionTitle title="Profile Settings" sub="Update your personal and company information" />

      {/* Avatar */}
      <div className="flex items-center gap-5 mb-6 p-5 rounded-xl"
        style={{ background: surface, border: `1px solid ${border}` }}>
        <div className="relative">
          <div className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: "72px", height: "72px", background: "#CC0000", border: "3px solid #CC0000", boxShadow: "0 0 0 3px " + (isDark ? "#0A0A0A" : "#F4F4F4") }}>
            <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#FFFFFF", fontWeight: 700, fontSize: "24px" }}>AD</span>
          </div>
          <div className="absolute -bottom-1 -right-1 rounded-full flex items-center justify-center"
            style={{ width: "22px", height: "22px", background: "#00B8B8", border: `2px solid ${isDark ? "#0A0A0A" : "#F4F4F4"}` }}>
            <span style={{ color: "#FFFFFF", fontSize: "10px" }}>✎</span>
          </div>
        </div>
        <div>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "18px", color: textPri }}>Admin</p>
          <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: textSub }}>Super Admin · Royals Webtech</p>
          <div className="flex items-center gap-1 mt-1">
            <div className="rounded-full" style={{ width: "6px", height: "6px", background: "#00B8B8" }} />
            <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#00B8B8" }}>ONLINE</span>
          </div>
        </div>
        <div className="ml-auto">
          <button className="px-4 py-2 rounded-lg"
            style={{
              background: isDark ? "#1A1A1A" : "#F0F0F0", border: `1px solid ${border}`,
              color: textSub, fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
            }}>
            CHANGE PHOTO
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="p-5 rounded-xl flex flex-col gap-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name"    value={form.name}        onChange={set("name")}        theme={theme} />
          <Field label="Designation"  value={form.designation} onChange={set("designation")} theme={theme} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email Address" value={form.email}   onChange={set("email")}   type="email" theme={theme} />
          <Field label="Phone Number"  value={form.phone}   onChange={set("phone")}   type="tel"   theme={theme} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name" value={form.company}   onChange={set("company")}   theme={theme} />
          <SelectField label="Timezone" value={form.timezone} onChange={set("timezone")} theme={theme}
            options={[
              { value: "Asia/Kolkata",    label: "IST — India Standard Time (UTC+5:30)" },
              { value: "Asia/Dubai",      label: "GST — Gulf Standard Time (UTC+4)" },
              { value: "Europe/London",   label: "GMT — Greenwich Mean Time (UTC+0)" },
              { value: "America/New_York",label: "EST — Eastern Standard Time (UTC-5)" },
              { value: "America/Los_Angeles", label: "PST — Pacific Standard Time (UTC-8)" },
            ]}
          />
        </div>
        <SaveBtn onClick={handleSave} saved={saved} theme={theme} />
      </div>
    </div>
  );
}

function NotificationsSection({ theme }) {
  const isDark  = theme === "dark";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const textPri = isDark ? "#F0F0F0" : "#111111";

  const [prefs, setPrefs] = useState({
    emailLeave: true,
    emailAttendance: false,
    emailPayroll: true,
    emailAnnouncements: true,
    pushLeave: true,
    pushAttendance: true,
    pushPayroll: false,
    pushSystem: true,
    digestFrequency: "daily",
    quietHoursFrom: "22:00",
    quietHoursTo: "08:00",
  });

  const [saved, setSaved] = useState(false);
  const set = (key) => (val) => setPrefs(p => ({ ...p, [key]: val }));

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const group = (title) => (
    <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
      color: "#CC0000", letterSpacing: "0.18em", marginTop: "8px", marginBottom: "2px" }}>
      {title}
    </p>
  );

  return (
    <div>
      <SectionTitle title="Notification Preferences" sub="Control what updates you receive and how" />
      <div className="p-5 rounded-xl" style={{ background: surface, border: `1px solid ${border}` }}>
        {group("EMAIL NOTIFICATIONS")}
        <SettingRow label="Leave Requests"       sub="Get emailed when an employee submits leave"   theme={theme}><Toggle on={prefs.emailLeave}          onChange={set("emailLeave")}          theme={theme} /></SettingRow>
        <SettingRow label="Attendance Alerts"    sub="Daily attendance summary to your inbox"       theme={theme}><Toggle on={prefs.emailAttendance}     onChange={set("emailAttendance")}     theme={theme} /></SettingRow>
        <SettingRow label="Payroll Processed"    sub="Notification when payroll run is complete"    theme={theme}><Toggle on={prefs.emailPayroll}         onChange={set("emailPayroll")}        theme={theme} /></SettingRow>
        <SettingRow label="Announcements"        sub="Company-wide announcements via email"         theme={theme}><Toggle on={prefs.emailAnnouncements}  onChange={set("emailAnnouncements")}  theme={theme} /></SettingRow>

        {group("PUSH NOTIFICATIONS")}
        <SettingRow label="Leave Requests"       sub="In-app push for new leave applications"       theme={theme}><Toggle on={prefs.pushLeave}     onChange={set("pushLeave")}     accent="#CC0000" theme={theme} /></SettingRow>
        <SettingRow label="Attendance Flags"     sub="Alert when unusual absence pattern detected"  theme={theme}><Toggle on={prefs.pushAttendance} onChange={set("pushAttendance")} accent="#CC0000" theme={theme} /></SettingRow>
        <SettingRow label="Payroll Updates"      sub="Push notification on payroll events"          theme={theme}><Toggle on={prefs.pushPayroll}    onChange={set("pushPayroll")}    accent="#CC0000" theme={theme} /></SettingRow>
        <SettingRow label="System Alerts"        sub="Critical system events and security alerts"   theme={theme}><Toggle on={prefs.pushSystem}     onChange={set("pushSystem")}     accent="#CC0000" theme={theme} /></SettingRow>

        {group("DIGEST & QUIET HOURS")}
        <div className="py-4 grid grid-cols-3 gap-4" style={{ borderBottom: `1px solid ${isDark ? "#1E1E1E" : "#E0E0E0"}` }}>
          <SelectField label="Digest Frequency" value={prefs.digestFrequency} onChange={set("digestFrequency")} theme={theme}
            options={[
              { value: "realtime", label: "Real-time" },
              { value: "hourly",   label: "Hourly" },
              { value: "daily",    label: "Daily Digest" },
              { value: "weekly",   label: "Weekly Digest" },
            ]} />
          <Field label="Quiet Hours From" value={prefs.quietHoursFrom} onChange={set("quietHoursFrom")} type="time" theme={theme} />
          <Field label="Quiet Hours To"   value={prefs.quietHoursTo}   onChange={set("quietHoursTo")}   type="time" theme={theme} />
        </div>

        <SaveBtn onClick={handleSave} saved={saved} theme={theme} />
      </div>
    </div>
  );
}

function AppearanceSection({ theme, toggleTheme }) {
  const isDark  = theme === "dark";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const textPri = isDark ? "#F0F0F0" : "#111111";
  const textSub = isDark ? "#666666" : "#999999";

  const [accent, setAccent] = useState("red");
  const [fontSize, setFontSize] = useState("normal");
  const [saved, setSaved] = useState(false);

  const accentOptions = [
    { id: "red",  color: "#CC0000", label: "Red (Default)" },
    { id: "teal", color: "#00B8B8", label: "Teal" },
    { id: "gold", color: "#C9922A", label: "Gold" },
    { id: "indigo",color:"#6366F1", label: "Indigo" },
    { id: "green", color:"#10B981", label: "Emerald" },
  ];

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div>
      <SectionTitle title="Appearance" sub="Customize the look and feel of your dashboard" />

      {/* Theme */}
      <div className="p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "12px" }}>COLOR THEME</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "dark",   icon: Moon,    label: "Dark Mode",   sub: "Easy on the eyes" },
            { id: "light",  icon: Sun,     label: "Light Mode",  sub: "Clean & bright" },
            { id: "system", icon: Monitor, label: "System",      sub: "Follows OS setting" },
          ].map(({ id, icon: Icon, label, sub }) => {
            const isActive = id === "system" ? false : id === theme;
            return (
              <button key={id}
                onClick={() => { if (id !== "system" && id !== theme) toggleTheme(); }}
                className="rounded-xl p-4 flex flex-col items-center gap-2 text-center"
                style={{
                  background: isActive ? (isDark ? "rgba(204,0,0,0.08)" : "rgba(204,0,0,0.05)") : (isDark ? "#0D0D0D" : "#F8F8F8"),
                  border: `2px solid ${isActive ? "#CC0000" : border}`,
                  cursor: id === "system" ? "not-allowed" : "pointer",
                  opacity: id === "system" ? 0.5 : 1,
                  transition: "all 150ms ease",
                }}>
                <Icon size={22} style={{ color: isActive ? "#CC0000" : textSub }} />
                <div>
                  <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "13px", fontWeight: 700, color: isActive ? textPri : textSub }}>{label}</p>
                  <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: textSub }}>{sub}</p>
                </div>
                {isActive && (
                  <div className="rounded-full flex items-center justify-center"
                    style={{ width: "18px", height: "18px", background: "#CC0000" }}>
                    <Check size={10} style={{ color: "#FFFFFF" }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent Color */}
      <div className="p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "12px" }}>ACCENT COLOR</p>
        <div className="flex gap-3 flex-wrap">
          {accentOptions.map(({ id, color, label }) => (
            <button key={id} onClick={() => setAccent(id)} title={label}
              className="rounded-full flex items-center justify-center"
              style={{
                width: "34px", height: "34px", background: color,
                border: accent === id ? `3px solid ${isDark ? "#F0F0F0" : "#111111"}` : "3px solid transparent",
                boxShadow: accent === id ? `0 0 0 2px ${color}` : "none",
                transition: "all 150ms ease",
              }}>
              {accent === id && <Check size={14} style={{ color: "#FFFFFF" }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="p-5 rounded-xl mb-0" style={{ background: surface, border: `1px solid ${border}` }}>
        <SettingRow label="Font Size" sub="Adjust the base text size across the dashboard" theme={theme}>
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${border}` }}>
            {["compact", "normal", "large"].map((s, i) => (
              <button key={s} onClick={() => setFontSize(s)}
                className="px-4 py-2"
                style={{
                  background: fontSize === s ? "#CC0000" : (isDark ? "#111111" : "#FFFFFF"),
                  color: fontSize === s ? "#FFFFFF" : textSub,
                  fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  borderRight: i < 2 ? `1px solid ${border}` : "none",
                  transition: "all 150ms ease",
                }}>
                {s}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Compact Sidebar" sub="Use a narrower sidebar to save screen space" theme={theme}>
          <Toggle on={false} onChange={() => {}} theme={theme} />
        </SettingRow>
        <SettingRow label="Animated Counters" sub="Animate numeric values when the page loads" theme={theme}>
          <Toggle on={true} onChange={() => {}} theme={theme} />
        </SettingRow>
        <SaveBtn onClick={handleSave} saved={saved} theme={theme} />
      </div>
    </div>
  );
}

function SecuritySection({ theme }) {
  const isDark  = theme === "dark";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";

  const [passwords, setPasswords] = useState({ current: "", newPw: "", confirm: "" });
  const [twoFA, setTwoFA]         = useState(false);
  const [sessionTimeout, setSession] = useState("30");
  const [saved, setSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  const set = (key) => (val) => setPasswords(p => ({ ...p, [key]: val }));

  const handleSave = () => {
    if (passwords.newPw && passwords.newPw !== passwords.confirm) {
      setPwError("New passwords do not match"); return;
    }
    if (passwords.newPw && passwords.newPw.length < 8) {
      setPwError("Password must be at least 8 characters"); return;
    }
    setPwError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <SectionTitle title="Security" sub="Manage your password, 2FA, and session settings" />

      {/* Change Password */}
      <div className="p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "16px" }}>CHANGE PASSWORD</p>
        <div className="flex flex-col gap-4">
          <PasswordField label="Current Password" value={passwords.current} onChange={set("current")} theme={theme} />
          <div className="grid grid-cols-2 gap-4">
            <PasswordField label="New Password"     value={passwords.newPw}  onChange={set("newPw")}  theme={theme} />
            <PasswordField label="Confirm Password" value={passwords.confirm} onChange={set("confirm")} theme={theme} />
          </div>
          {pwError && (
            <div className="flex items-center gap-2 rounded-lg px-4 py-3"
              style={{ background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.3)" }}>
              <AlertTriangle size={14} style={{ color: "#CC0000", flexShrink: 0 }} />
              <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", color: "#CC0000" }}>{pwError}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2FA & Session */}
      <div className="p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "4px" }}>ACCESS CONTROL</p>
        <SettingRow label="Two-Factor Authentication" sub="Add an extra layer of security with OTP on login" theme={theme}>
          <Toggle on={twoFA} onChange={setTwoFA} accent="#CC0000" theme={theme} />
        </SettingRow>
        <SettingRow label="Session Timeout" sub="Auto-logout after inactivity" theme={theme}>
          <div style={{ width: "160px" }}>
            <SelectField label="" value={sessionTimeout} onChange={setSession} theme={theme}
              options={[
                { value: "15",  label: "15 minutes" },
                { value: "30",  label: "30 minutes" },
                { value: "60",  label: "1 hour" },
                { value: "240", label: "4 hours" },
                { value: "0",   label: "Never" },
              ]} />
          </div>
        </SettingRow>
      </div>

      {/* Active Sessions */}
      <div className="p-5 rounded-xl mb-0" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "12px" }}>ACTIVE SESSIONS</p>
        {[
          { device: "Chrome on Windows", location: "Nagpur, India", time: "Now (current)", current: true },
          { device: "Safari on iPhone",  location: "Nagpur, India", time: "2 hours ago",   current: false },
          { device: "Firefox on Mac",    location: "Mumbai, India", time: "3 days ago",    current: false },
        ].map((s, i) => (
          <div key={i} className="flex items-center justify-between py-3"
            style={{ borderBottom: i < 2 ? `1px solid ${isDark ? "#1A1A1A" : "#F0F0F0"}` : "none" }}>
            <div className="flex items-center gap-3">
              <div className="rounded-lg flex items-center justify-center"
                style={{ width: "34px", height: "34px", background: isDark ? "#1A1A1A" : "#F5F5F5", border: `1px solid ${border}` }}>
                <Monitor size={15} style={{ color: s.current ? "#00B8B8" : "#555555" }} />
              </div>
              <div>
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "13px", fontWeight: 600, color: isDark ? "#F0F0F0" : "#111111" }}>{s.device}</p>
                <p style={{ fontFamily: "Mulish, sans-serif", fontSize: "11px", color: isDark ? "#666666" : "#999999" }}>{s.location} · {s.time}</p>
              </div>
            </div>
            {s.current ? (
              <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "10px", color: "#00B8B8" }}>CURRENT</span>
            ) : (
              <button className="px-3 py-1.5 rounded"
                style={{ background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.2)", color: "#CC0000",
                  fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em" }}>
                REVOKE
              </button>
            )}
          </div>
        ))}
        <SaveBtn onClick={handleSave} saved={saved} theme={theme} />
      </div>
    </div>
  );
}

function CompanySection({ theme }) {
  const isDark  = theme === "dark";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const [form, setForm] = useState({
    company: "Royals Webtech Pvt. Ltd.",
    gstin: "27AAACR1234A1Z5",
    pan: "AAACR1234A",
    address: "Nagpur, Maharashtra, India",
    workingDays: "monday-friday",
    workStart: "09:00",
    workEnd: "18:00",
    leaveYear: "april",
    payDay: "last-working",
    currency: "INR",
  });
  const [saved, setSaved] = useState(false);
  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div>
      <SectionTitle title="Company Settings" sub="Configure company-wide rules and HR policies" />

      <div className="p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "16px" }}>COMPANY DETAILS</p>
        <div className="flex flex-col gap-4">
          <Field label="Company Name"  value={form.company} onChange={set("company")} theme={theme} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="GSTIN"  value={form.gstin} onChange={set("gstin")} theme={theme} />
            <Field label="PAN"    value={form.pan}   onChange={set("pan")}   theme={theme} />
          </div>
          <Field label="Registered Address" value={form.address} onChange={set("address")} theme={theme} />
        </div>
      </div>

      <div className="p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "16px" }}>WORK SCHEDULE</p>
        <div className="flex flex-col gap-4">
          <SelectField label="Working Days" value={form.workingDays} onChange={set("workingDays")} theme={theme}
            options={[
              { value: "monday-friday",   label: "Monday – Friday" },
              { value: "monday-saturday", label: "Monday – Saturday" },
              { value: "custom",          label: "Custom" },
            ]} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Work Start Time" value={form.workStart} onChange={set("workStart")} type="time" theme={theme} />
            <Field label="Work End Time"   value={form.workEnd}   onChange={set("workEnd")}   type="time" theme={theme} />
          </div>
        </div>
      </div>

      <div className="p-5 rounded-xl" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "16px" }}>PAYROLL & LEAVE POLICY</p>
        <div className="grid grid-cols-3 gap-4">
          <SelectField label="Leave Year Start" value={form.leaveYear} onChange={set("leaveYear")} theme={theme}
            options={[
              { value: "january", label: "January" },
              { value: "april",   label: "April (Financial Year)" },
              { value: "custom",  label: "Custom" },
            ]} />
          <SelectField label="Salary Pay Day" value={form.payDay} onChange={set("payDay")} theme={theme}
            options={[
              { value: "1",             label: "1st of Month" },
              { value: "last-working",  label: "Last Working Day" },
              { value: "custom",        label: "Custom Date" },
            ]} />
          <SelectField label="Currency" value={form.currency} onChange={set("currency")} theme={theme}
            options={["INR", "USD", "EUR", "GBP", "AED"]} />
        </div>
        <SaveBtn onClick={handleSave} saved={saved} theme={theme} />
      </div>
    </div>
  );
}

function SystemSection({ theme }) {
  const isDark  = theme === "dark";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const textSub = isDark ? "#666666" : "#999999";

  return (
    <div>
      <SectionTitle title="System & Data" sub="Manage backups, exports, and advanced configuration" />

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: "System Version", value: "v2.4.1", icon: HardDrive, color: "#00B8B8" },
          { label: "Last Backup",    value: "Today 03:00",  icon: Database,  color: "#C9922A" },
          { label: "Storage Used",   value: "1.2 GB / 10 GB", icon: Wifi, color: "#6366F1" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: surface, border: `1px solid ${border}` }}>
            <div className="rounded-lg flex items-center justify-center"
              style={{ width: "38px", height: "38px", background: color + "18", border: `1px solid ${color}33` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "9px", color: textSub, letterSpacing: "0.1em" }}>{label.toUpperCase()}</p>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "14px", fontWeight: 700, color: color }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="p-5 rounded-xl mb-4" style={{ background: surface, border: `1px solid ${border}` }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.18em", marginBottom: "4px" }}>DATA MANAGEMENT</p>
        <SettingRow label="Export All Data"      sub="Download a full CSV export of all employee records" theme={theme}>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ background: isDark ? "#1A1A1A" : "#F5F5F5", border: `1px solid ${border}`, color: textSub, fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em" }}>
            <Download size={13} /> EXPORT
          </button>
        </SettingRow>
        <SettingRow label="Create Backup"        sub="Manually trigger a system backup right now" theme={theme}>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ background: isDark ? "#1A1A1A" : "#F5F5F5", border: `1px solid ${border}`, color: textSub, fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em" }}>
            <Database size={13} /> BACKUP
          </button>
        </SettingRow>
        <SettingRow label="Auto Backup"  sub="Automatically backup every 24 hours at 3:00 AM" theme={theme}>
          <Toggle on={true} onChange={() => {}} theme={theme} />
        </SettingRow>
        <SettingRow label="Maintenance Mode" sub="Take the system offline for maintenance" theme={theme}>
          <Toggle on={false} onChange={() => {}} accent="#CC0000" theme={theme} />
        </SettingRow>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(204,0,0,0.3)" }}>
        <div className="px-5 py-3 flex items-center gap-2"
          style={{ background: "rgba(204,0,0,0.06)", borderBottom: "1px solid rgba(204,0,0,0.2)" }}>
          <AlertTriangle size={14} style={{ color: "#CC0000" }} />
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "11px", fontWeight: 700, color: "#CC0000", letterSpacing: "0.15em" }}>
            DANGER ZONE
          </span>
        </div>
        <div className="p-4 flex flex-col gap-3" style={{ background: isDark ? "#0D0D0D" : "#FFF8F8" }}>
          <DangerBtn label="Reset Settings"   sub="Restore all settings to factory defaults"       icon={RefreshCw}  onClick={() => {}} theme={theme} />
          <DangerBtn label="Clear All Data"   sub="Permanently delete all attendance & leave data"  icon={Trash2}     onClick={() => {}} theme={theme} />
          <DangerBtn label="Delete Account"   sub="Permanently remove this admin account"           icon={LogOut}     onClick={() => {}} theme={theme} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════
export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const isDark  = theme === "dark";
  const surface = isDark ? "#111111" : "#FFFFFF";
  const border  = isDark ? "#1E1E1E" : "#E0E0E0";
  const textPri = isDark ? "#F0F0F0" : "#111111";

  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { id: "profile",       label: "Profile",        icon: User      },
    { id: "notifications", label: "Notifications",  icon: Bell      },
    { id: "appearance",    label: "Appearance",     icon: Palette   },
    { id: "security",      label: "Security",       icon: Shield    },
    { id: "company",       label: "Company",        icon: Building2 },
    { id: "system",        label: "System & Data",  icon: HardDrive },
  ];

  return (
    <div className="flex gap-6">

      {/* ── Sidebar ── */}
      <div className="flex-shrink-0 rounded-xl overflow-hidden self-start sticky top-20"
        style={{ width: "220px", background: surface, border: `1px solid ${border}` }}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${border}` }}>
          <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "10px", fontWeight: 700,
            color: "#CC0000", letterSpacing: "0.18em" }}>SETTINGS</p>
        </div>
        <div className="p-2">
          {tabs.map(tab => (
            <Tab key={tab.id} {...tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} theme={theme} />
          ))}
        </div>
      </div>

      {/* ── Content ── */}
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
