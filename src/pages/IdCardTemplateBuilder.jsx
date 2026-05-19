// ─────────────────────────────────────────────────────────────
//  src/pages/IdCardTemplateBuilder.jsx
//
//  Custom ID-card template maker.
//  • Design a card template (colours, logo, fields, background)
//  • Background images are stored on Cloudinary
//  • Save template to Firestore; templates appear in IdCards.jsx
//    when VITE_USE_CUSTOM_TEMPLATES=true
//
//  WIRING REQUIRED (in App.jsx / router):
//    <Route path="/idcard-template" element={<IdCardTemplateBuilder />} />
//    <Route path="/idcard-template/:id" element={<IdCardTemplateBuilder />} />
//
//  This file follows the same pattern as AddTemplate.jsx and
//  Idcardbuilder.jsx (provided by the user) — panel left, live
//  preview right.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../App";
import {
  uploadIdCardBackground,
  uploadCompanyLogo,
  getOptimizedUrl,
} from "../cloudinary/cloudinaryService";
import {
  doc, collection, setDoc, getDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

// ─────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────
const FIELD_OPTIONS = [
  { key: "name",        label: "Full Name",    icon: "👤" },
  { key: "id",          label: "Employee ID",  icon: "🪪" },
  { key: "role",        label: "Designation",  icon: "💼" },
  { key: "department",  label: "Department",   icon: "🏢" },
  { key: "email",       label: "Email",        icon: "✉️"  },
  { key: "phone",       label: "Phone",        icon: "📱" },
  { key: "joinDate",    label: "Join Date",    icon: "📅" },
  { key: "bloodGroup",  label: "Blood Group",  icon: "🩸" },
  { key: "address",     label: "Address",      icon: "📍" },
];

const DEFAULT_TEMPLATE = {
  name: "",
  orientation: "horizontal",   // "horizontal" | "vertical"
  // colours
  accentColor:  "#CC0000",
  bgColorTop:   "#0d0d0d",
  bgColorBot:   "#1c1c1c",
  textColor:    "#FFFFFF",
  subTextColor: "#BBBBBB",
  labelColor:   "#CC0000",
  // logo
  logoUrl:      "",             // Cloudinary URL
  logoFallback: "RWT",          // initials shown if no logo
  // background watermark image
  bgImageUrl:   "",             // Cloudinary URL
  bgOpacity:    0.12,
  // company info shown in footer
  companyName:  "Royals Webtech Pvt. Ltd.",
  website:      "www.royalswebtechpvtltd.com",
  phone:        "+91 8788447944",
  // which fields to show
  fields: ["name", "id", "role", "department", "email", "phone", "joinDate"],
  // photo
  showPhoto: true,
  photoShape: "circle",         // "circle" | "rounded" | "square"
  // header
  showHeader: true,
  headerStyle: "gradient",      // "gradient" | "solid"
  showBarcode: true,
  // font size scale (1 = normal)
  fontScale: 1,
};

// ─────────────────────────────────────────────────────────────
//  LIVE CARD PREVIEW
// ─────────────────────────────────────────────────────────────
function CardPreview({ tpl, emp, cardRef }) {
  const isH        = tpl.orientation === "horizontal";
  const W          = isH ? 340 : 215;
  const H          = isH ? 215 : 340;
  const fs         = tpl.fontScale || 1;
  const photoR     = tpl.photoShape === "circle" ? "50%" : tpl.photoShape === "rounded" ? "10px" : "4px";
  const headerBg   = tpl.headerStyle === "gradient"
    ? `linear-gradient(135deg, ${tpl.bgColorTop}, ${tpl.bgColorBot})`
    : tpl.bgColorTop;
  const [logoErr, setLogoErr] = useState(false);

  const sampleEmp = emp || {
    name: "Sample Employee",
    id: "RWT-0001",
    role: "Software Engineer",
    department: "Engineering",
    email: "sample@company.com",
    phone: "+91 98765 43210",
    joinDate: "01 Jan 2024",
    bloodGroup: "O+",
    address: "Nagpur, Maharashtra",
  };

  return (
    <div
      ref={cardRef}
      style={{
        width: `${W}px`, height: `${H}px`,
        borderRadius: "14px",
        background: `linear-gradient(${isH ? "135deg" : "180deg"}, ${tpl.bgColorTop}, ${tpl.bgColorBot})`,
        position: "relative", overflow: "hidden",
        boxShadow: "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        fontFamily: "'Arial', sans-serif",
        flexShrink: 0,
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:"4px",
        background: `linear-gradient(90deg, ${tpl.accentColor}, ${tpl.accentColor}bb, ${tpl.accentColor})`,
      }} />

      {/* Background watermark */}
      {tpl.bgImageUrl && (
        <div style={{
          position:"absolute", inset:0, zIndex:0,
          backgroundImage: `url(${tpl.bgImageUrl})`,
          backgroundSize: "cover", backgroundPosition: "center",
          opacity: tpl.bgOpacity, pointerEvents:"none",
        }} />
      )}

      {/* Decorative dots */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none", zIndex:0,
        backgroundImage:"radial-gradient(circle, rgba(255,255,255,0.022) 1px, transparent 1px)",
        backgroundSize:"16px 16px",
      }} />

      {/* ── HORIZONTAL layout ── */}
      {isH && (
        <>
          {/* Header */}
          {tpl.showHeader && (
            <div style={{
              position:"absolute", top:"12px", left:"13px", right:"13px",
              display:"flex", alignItems:"center", gap:"8px", zIndex:1,
            }}>
              <LogoBox tpl={tpl} logoErr={logoErr} setLogoErr={setLogoErr} size={30} />
              <div style={{ borderLeft:`1px solid ${tpl.accentColor}55`, paddingLeft:"8px", flex:1 }}>
                <div style={{ fontSize:`${6.5 * fs}px`, color:tpl.accentColor, fontWeight:700,
                  letterSpacing:"0.16em", textTransform:"uppercase" }}>
                  EMPLOYEE IDENTITY CARD
                </div>
                <div style={{ fontSize:`${5.5 * fs}px`, color:tpl.subTextColor,
                  letterSpacing:"0.05em", marginTop:"1px" }}>
                  {tpl.companyName}
                </div>
              </div>
            </div>
          )}

          {/* Vertical divider */}
          <div style={{
            position:"absolute", left:"118px", top:"50px", bottom:"28px", width:"1px",
            background:`linear-gradient(180deg, transparent, ${tpl.accentColor}55, transparent)`,
            zIndex:1,
          }} />

          {/* Left: Photo + ID */}
          {tpl.showPhoto && (
            <div style={{
              position:"absolute", left:"13px", top:"50px",
              width:"98px", display:"flex", flexDirection:"column", alignItems:"center", gap:"6px",
              zIndex:2,
            }}>
              <div style={{
                width:"68px", height:"68px", borderRadius:photoR,
                border:`2px solid ${tpl.accentColor}`,
                boxShadow:`0 0 0 3px ${tpl.accentColor}22`,
                overflow:"hidden", background:"#1a1a1a",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <span style={{ fontSize:"24px" }}>👤</span>
              </div>
              {tpl.fields.includes("id") && (
                <div style={{
                  background:`${tpl.accentColor}18`, border:`1px solid ${tpl.accentColor}44`,
                  borderRadius:"4px", padding:"2px 6px", textAlign:"center", width:"88px",
                  boxSizing:"border-box",
                }}>
                  <div style={{ fontSize:`${5 * fs}px`, color:tpl.accentColor, fontWeight:700,
                    letterSpacing:"0.12em" }}>EMP ID</div>
                  <div style={{ fontSize:`${7 * fs}px`, color:tpl.textColor,
                    fontFamily:"'Courier New',monospace", fontWeight:700, marginTop:"1px" }}>
                    {sampleEmp.id}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right: Fields */}
          <div style={{
            position:"absolute", left:"130px", top:"51px", right:"11px",
            display:"flex", flexDirection:"column", gap:"4px", zIndex:2,
          }}>
            <div style={{ fontSize:`${13 * fs}px`, fontWeight:700, color:tpl.textColor,
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {sampleEmp.name}
            </div>
            {tpl.fields.includes("role") && (
              <div style={{ display:"inline-flex",
                background:`${tpl.accentColor}22`, border:`1px solid ${tpl.accentColor}44`,
                borderRadius:"4px", padding:"2px 7px", alignSelf:"flex-start" }}>
                <span style={{ fontSize:`${7 * fs}px`, color:`${tpl.accentColor}dd`, fontWeight:600 }}>
                  {sampleEmp.role}
                </span>
              </div>
            )}
            {tpl.fields.filter(k => !["name","id","role"].includes(k)).slice(0, 4).map(k => {
              const fo = FIELD_OPTIONS.find(f => f.key === k);
              return (
                <div key={k} style={{ display:"flex", gap:"5px", alignItems:"baseline" }}>
                  <span style={{ fontSize:`${5.5 * fs}px`, color:tpl.labelColor, fontWeight:700,
                    letterSpacing:"0.12em", minWidth:"28px", flexShrink:0 }}>
                    {fo?.label.slice(0,5).toUpperCase()}
                  </span>
                  <span style={{ fontSize:`${7 * fs}px`, color:tpl.subTextColor, lineHeight:1.2,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"155px" }}>
                    {sampleEmp[k] || "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── VERTICAL layout ── */}
      {!isH && (
        <>
          {/* Header */}
          {tpl.showHeader && (
            <div style={{
              position:"absolute", top:"12px", left:0, right:0,
              display:"flex", flexDirection:"column", alignItems:"center", gap:"5px",
              padding:"0 12px", zIndex:1,
            }}>
              <LogoBox tpl={tpl} logoErr={logoErr} setLogoErr={setLogoErr} size={38} />
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:`${6.5 * fs}px`, color:tpl.accentColor, fontWeight:700,
                  letterSpacing:"0.15em", textTransform:"uppercase" }}>
                  EMPLOYEE ID CARD
                </div>
                <div style={{ fontSize:`${5.5 * fs}px`, color:tpl.subTextColor, marginTop:"1px" }}>
                  {tpl.companyName}
                </div>
              </div>
            </div>
          )}

          {/* Photo */}
          {tpl.showPhoto && (
            <div style={{
              position:"absolute", top:"90px", left:"50%", transform:"translateX(-50%)", zIndex:2,
            }}>
              <div style={{
                width:"76px", height:"76px", borderRadius:photoR,
                border:`2.5px solid ${tpl.accentColor}`,
                boxShadow:`0 0 0 3px ${tpl.accentColor}22`,
                overflow:"hidden", background:"#1a1a1a",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <span style={{ fontSize:"28px" }}>👤</span>
              </div>
            </div>
          )}

          {/* Name + Role */}
          <div style={{
            position:"absolute", top:"178px", left:"10px", right:"10px",
            textAlign:"center", zIndex:2,
          }}>
            <div style={{ fontSize:`${13 * fs}px`, fontWeight:700, color:tpl.textColor,
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {sampleEmp.name}
            </div>
            {tpl.fields.includes("role") && (
              <div style={{ display:"inline-flex", marginTop:"4px",
                background:`${tpl.accentColor}22`, border:`1px solid ${tpl.accentColor}44`,
                borderRadius:"4px", padding:"2px 8px" }}>
                <span style={{ fontSize:`${7 * fs}px`, color:`${tpl.accentColor}dd`, fontWeight:600 }}>
                  {sampleEmp.role}
                </span>
              </div>
            )}
          </div>

          {/* Separator */}
          <div style={{
            position:"absolute", top:"213px", left:"14px", right:"14px", height:"1px",
            background:`linear-gradient(90deg, transparent, ${tpl.accentColor}44, transparent)`,
            zIndex:1,
          }} />

          {/* Fields */}
          <div style={{
            position:"absolute", top:"220px", left:"12px", right:"12px",
            display:"flex", flexDirection:"column", gap:"5px", zIndex:2,
          }}>
            {tpl.fields.includes("id") && (
              <div style={{
                display:"flex", justifyContent:"center",
                background:`${tpl.accentColor}18`, border:`1px solid ${tpl.accentColor}44`,
                borderRadius:"5px", padding:"2px 8px",
              }}>
                <span style={{ fontSize:`${5.5 * fs}px`, color:tpl.labelColor, fontWeight:700,
                  letterSpacing:"0.12em", marginRight:"6px" }}>EMP ID</span>
                <span style={{ fontSize:`${7.5 * fs}px`, color:tpl.textColor,
                  fontFamily:"'Courier New',monospace", fontWeight:700 }}>
                  {sampleEmp.id}
                </span>
              </div>
            )}
            {tpl.fields.filter(k => !["name","id","role"].includes(k)).slice(0, 5).map(k => {
              const fo = FIELD_OPTIONS.find(f => f.key === k);
              return (
                <div key={k} style={{ display:"flex", gap:"5px", alignItems:"baseline" }}>
                  <span style={{ fontSize:`${5.5 * fs}px`, color:tpl.labelColor, fontWeight:700,
                    letterSpacing:"0.12em", minWidth:"28px", flexShrink:0 }}>
                    {fo?.label.slice(0,5).toUpperCase()}
                  </span>
                  <span style={{ fontSize:`${7 * fs}px`, color:tpl.subTextColor, lineHeight:1.2,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"150px" }}>
                    {sampleEmp[k] || "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Bottom bar (both orientations) ── */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0, height:"28px",
        background: `linear-gradient(90deg, ${tpl.accentColor}, ${tpl.accentColor}99)`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 12px", zIndex:3,
      }}>
        <span style={{ fontSize:`${5.5 * fs}px`, color:"rgba(255,255,255,0.75)",
          letterSpacing:"0.08em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {tpl.website}
        </span>
        {tpl.showBarcode && (
          <div style={{ display:"flex", gap:"1.5px", alignItems:"center", flexShrink:0 }}>
            {[3,5,2,4,3,6,2,4,3].map((h,i) => (
              <div key={i} style={{ width:"1px", height:`${h}px`, background:"rgba(255,255,255,0.55)" }} />
            ))}
          </div>
        )}
        <span style={{ fontSize:`${5.5 * fs}px`, color:"rgba(255,255,255,0.65)",
          letterSpacing:"0.04em", flexShrink:0 }}>
          {tpl.phone}
        </span>
      </div>
      <div style={{
        position:"absolute", bottom:"28px", left:0, right:0, height:"1px",
        background:`${tpl.accentColor}44`, zIndex:2,
      }} />
    </div>
  );
}

function LogoBox({ tpl, logoErr, setLogoErr, size }) {
  return (
    <div style={{
      width:`${size}px`, height:`${size}px`, borderRadius:`${size * 0.25}px`,
      background:`${tpl.accentColor}22`, border:`1px solid ${tpl.accentColor}55`,
      display:"flex", alignItems:"center", justifyContent:"center",
      overflow:"hidden", flexShrink:0,
    }}>
      {!logoErr && tpl.logoUrl ? (
        <img
          src={getOptimizedUrl(tpl.logoUrl)}
          alt="logo" crossOrigin="anonymous"
          style={{ width:"100%", height:"100%", objectFit:"contain" }}
          onError={() => setLogoErr(true)}
        />
      ) : (
        <span style={{ fontSize:`${size * 0.35}px`, fontWeight:700, color:tpl.accentColor }}>
          {tpl.logoFallback || "CO"}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function IdCardTemplateBuilder() {
  const navigate          = useNavigate();
  const { id: editId }    = useParams();
  const { theme }         = useTheme();
  const isDark            = theme === "dark";

  const [tpl,       setTpl]       = useState(DEFAULT_TEMPLATE);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [bgUploading,  setBgUp]   = useState(false);
  const [logoUploading, setLogoUp]= useState(false);
  const [activeTab, setActiveTab] = useState("design"); // "design" | "fields" | "company"
  const [loadingTpl, setLoadingTpl] = useState(!!editId);

  const bgInputRef   = useRef(null);
  const logoInputRef = useRef(null);
  const cardRef      = useRef(null);

  // Colour tokens for the builder shell
  const bg     = isDark ? "#0A0A0A" : "#F4F4F4";
  const card   = isDark ? "#111111" : "#FFFFFF";
  const border = isDark ? "#1E1E1E" : "#E0E0E0";
  const text   = isDark ? "#F0F0F0" : "#111111";
  const sub    = isDark ? "#666666" : "#888888";

  // Load existing template when editing
  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "idcard_templates", editId));
        if (snap.exists()) {
          setTpl({ ...DEFAULT_TEMPLATE, ...snap.data().config, name: snap.data().name || "" });
        }
      } catch (err) {
        console.error("Failed to load template", err);
      } finally {
        setLoadingTpl(false);
      }
    })();
  }, [editId]);

  const upd = useCallback((key, val) => setTpl(p => ({ ...p, [key]: val })), []);

  // ── Background image upload ──────────────────────────────
  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgUp(true);
    try {
      const res = await uploadIdCardBackground(file, tpl.name || "template");
      upd("bgImageUrl", res.secure_url);
    } catch (err) {
      alert(err.message);
    } finally {
      setBgUp(false);
      e.target.value = "";
    }
  };

  // ── Logo upload ──────────────────────────────────────────
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUp(true);
    try {
      const res = await uploadCompanyLogo(file);
      upd("logoUrl", res.secure_url);
    } catch (err) {
      alert(err.message);
    } finally {
      setLogoUp(false);
      e.target.value = "";
    }
  };

  // ── Toggle a field ──────────────────────────────────────
  const toggleField = (key) => {
    setTpl(p => ({
      ...p,
      fields: p.fields.includes(key)
        ? p.fields.filter(k => k !== key)
        : [...p.fields, key],
    }));
  };

  // ── Save to Firestore ───────────────────────────────────
  const handleSave = async () => {
    if (!tpl.name.trim()) { alert("Please enter a template name."); return; }
    setSaving(true);
    try {
      const colRef  = collection(db, "idcard_templates");
      const docRef  = editId ? doc(db, "idcard_templates", editId) : doc(colRef);
      const { name, ...config } = tpl;
      await setDoc(docRef, {
        name: tpl.name.trim(),
        config,
        updatedAt: serverTimestamp(),
        ...(!editId && { createdAt: serverTimestamp() }),
      }, { merge: true });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        navigate("/id-cards");
      }, 1200);
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingTpl) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh" }}>
        <div style={{ width:"36px", height:"36px", borderRadius:"50%",
          border:"3px solid rgba(204,0,0,0.2)", borderTopColor:"#CC0000",
          animation:"spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Section label helper ─────────────────────────────────
  const SectionLabel = ({ children }) => (
    <div style={{ fontSize:"10px", fontWeight:700, color:sub,
      textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"8px" }}>
      {children}
    </div>
  );

  // ── Color row helper ─────────────────────────────────────
  const ColorRow = ({ label, value, onChange }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"6px 0", borderBottom:`1px solid ${border}` }}>
      <span style={{ fontSize:"12px", color:text }}>{label}</span>
      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width:"26px", height:"26px", borderRadius:"6px",
            border:`1.5px solid ${border}`, padding:"2px", cursor:"pointer" }} />
        <span style={{ fontSize:"10px", fontFamily:"'Courier New',monospace", color:sub }}>
          {value}
        </span>
      </div>
    </div>
  );

  // ── Toggle row helper ────────────────────────────────────
  const ToggleRow = ({ label, desc, value, onChange }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"10px 0", borderBottom:`1px solid ${border}` }}>
      <div>
        <div style={{ fontSize:"12px", color:text, fontWeight:600 }}>{label}</div>
        {desc && <div style={{ fontSize:"10px", color:sub, marginTop:"2px" }}>{desc}</div>}
      </div>
      <div onClick={onChange}
        style={{ width:"38px", height:"22px", borderRadius:"11px",
          background: value ? "#CC0000" : border,
          transition:"background 0.2s", cursor:"pointer", position:"relative", flexShrink:0 }}>
        <div style={{ width:"18px", height:"18px", borderRadius:"50%", background:"#fff",
          position:"absolute", top:"2px", left: value ? "18px" : "2px",
          transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:bg }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Top bar ── */}
      <div style={{
        height:"56px", background:card, borderBottom:`1px solid ${border}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 16px", flexShrink:0, gap:"10px",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px", flex:1, minWidth:0 }}>
          <button onClick={() => navigate("/id-cards")}
            style={{ padding:"6px 12px", borderRadius:"8px", border:`1.5px solid ${border}`,
              background:"transparent", color:text, fontSize:"13px", fontWeight:700,
              cursor:"pointer", flexShrink:0 }}>
            ← Back
          </button>
          {editId && (
            <div style={{ padding:"4px 10px", borderRadius:"20px",
              background:"rgba(204,0,0,0.1)", border:"1px solid rgba(204,0,0,0.25)",
              fontSize:"11px", fontWeight:700, color:"#CC0000", whiteSpace:"nowrap" }}>
              ✎ Editing Template
            </div>
          )}
          <input
            value={tpl.name}
            onChange={e => upd("name", e.target.value)}
            placeholder="Template name…"
            style={{ flex:1, border:`1.5px solid ${border}`, borderRadius:"8px",
              fontSize:"14px", fontWeight:700, color:text, background:card,
              outline:"none", padding:"7px 10px", minWidth:0,
              fontFamily:"'Rajdhani', sans-serif", transition:"border 0.15s" }}
            onFocus={e => e.target.style.borderColor="#CC0000"}
            onBlur={e  => e.target.style.borderColor=border}
          />
        </div>

        <div style={{ display:"flex", gap:"8px", flexShrink:0 }}>
          {/* Orientation quick toggle */}
          <div style={{ display:"flex", border:`1px solid ${border}`, borderRadius:"8px", overflow:"hidden" }}>
            {[["horizontal","🖥 H"],["vertical","📱 V"]].map(([val, lbl]) => (
              <button key={val} onClick={() => upd("orientation", val)}
                style={{ padding:"7px 12px", border:"none", fontSize:"12px",
                  fontWeight:700, cursor:"pointer", transition:"all 150ms",
                  background: tpl.orientation === val ? "#CC0000" : "transparent",
                  color: tpl.orientation === val ? "#FFF" : sub }}>
                {lbl}
              </button>
            ))}
          </div>

          <button onClick={handleSave} disabled={saving}
            style={{ padding:"8px 18px", borderRadius:"8px", border:"none",
              background: saved ? "#00B864" : saving ? border : "#CC0000",
              color:"#FFF", fontSize:"13px", fontWeight:700,
              cursor: saving ? "not-allowed" : "pointer" }}>
            {saved ? "✓ Saved!" : saving ? "Saving…" : editId ? "💾 Update" : "💾 Save"}
          </button>
        </div>
      </div>

      {/* ── Body: Panel + Preview ── */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"280px 1fr", overflow:"hidden" }}>

        {/* LEFT PANEL */}
        <div style={{
          background:card, borderRight:`1px solid ${border}`,
          display:"flex", flexDirection:"column", overflowY:"auto",
        }}>
          {/* Tab bar */}
          <div style={{ display:"flex", borderBottom:`1px solid ${border}`, flexShrink:0 }}>
            {[["design","🎨 Design"],["fields","📋 Fields"],["company","🏢 Company"]].map(([id, lbl]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{ flex:1, padding:"10px 4px", border:"none", fontSize:"11px",
                  fontWeight:700, cursor:"pointer", background:"transparent",
                  color: activeTab === id ? "#CC0000" : sub,
                  borderBottom: activeTab === id ? "2px solid #CC0000" : "2px solid transparent",
                  fontFamily:"inherit", transition:"color 0.15s" }}>
                {lbl}
              </button>
            ))}
          </div>

          <div style={{ padding:"16px 14px", flex:1, display:"flex", flexDirection:"column", gap:"16px" }}>

            {/* ── DESIGN TAB ── */}
            {activeTab === "design" && (
              <>
                <div>
                  <SectionLabel>Colours</SectionLabel>
                  <ColorRow label="Accent / Header"  value={tpl.accentColor}  onChange={v => upd("accentColor", v)} />
                  <ColorRow label="Background Top"   value={tpl.bgColorTop}   onChange={v => upd("bgColorTop", v)} />
                  <ColorRow label="Background Bottom" value={tpl.bgColorBot}  onChange={v => upd("bgColorBot", v)} />
                  <ColorRow label="Primary Text"     value={tpl.textColor}    onChange={v => upd("textColor", v)} />
                  <ColorRow label="Secondary Text"   value={tpl.subTextColor} onChange={v => upd("subTextColor", v)} />
                  <ColorRow label="Label Colour"     value={tpl.labelColor}   onChange={v => upd("labelColor", v)} />
                </div>

                <div>
                  <SectionLabel>Header Style</SectionLabel>
                  <div style={{ display:"flex", gap:"8px" }}>
                    {["gradient","solid"].map(v => (
                      <button key={v} onClick={() => upd("headerStyle", v)}
                        style={{ flex:1, padding:"8px", borderRadius:"8px",
                          border:`1.5px solid ${tpl.headerStyle === v ? "#CC0000" : border}`,
                          background: tpl.headerStyle === v ? "rgba(204,0,0,0.1)" : "transparent",
                          color: tpl.headerStyle === v ? "#CC0000" : sub,
                          fontSize:"12px", fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                          textTransform:"capitalize" }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Photo Shape</SectionLabel>
                  <div style={{ display:"flex", gap:"6px" }}>
                    {["circle","rounded","square"].map(v => (
                      <button key={v} onClick={() => upd("photoShape", v)}
                        style={{ flex:1, padding:"7px 4px", borderRadius:"8px",
                          border:`1.5px solid ${tpl.photoShape === v ? "#CC0000" : border}`,
                          background: tpl.photoShape === v ? "rgba(204,0,0,0.1)" : "transparent",
                          color: tpl.photoShape === v ? "#CC0000" : sub,
                          fontSize:"11px", fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                          textTransform:"capitalize" }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Font Scale</SectionLabel>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                    <span style={{ fontSize:"11px", color:sub }}>Text size</span>
                    <span style={{ fontSize:"11px", color:"#CC0000", fontWeight:700,
                      fontFamily:"'Courier New',monospace" }}>{tpl.fontScale.toFixed(2)}×</span>
                  </div>
                  <input type="range" min={0.7} max={1.5} step={0.05}
                    value={tpl.fontScale}
                    onChange={e => upd("fontScale", parseFloat(e.target.value))}
                    style={{ width:"100%", accentColor:"#CC0000" }} />
                </div>

                <div>
                  <SectionLabel>Background Watermark</SectionLabel>
                  {tpl.bgImageUrl ? (
                    <>
                      <div style={{ width:"100%", height:"70px", borderRadius:"8px",
                        overflow:"hidden", border:`1px solid ${border}`, marginBottom:"8px",
                        position:"relative" }}>
                        <img src={tpl.bgImageUrl}
                          style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="bg" />
                        <button onClick={() => upd("bgImageUrl", "")}
                          style={{ position:"absolute", top:"4px", right:"4px",
                            width:"22px", height:"22px", borderRadius:"50%",
                            border:"none", background:"rgba(0,0,0,0.6)", color:"#fff",
                            cursor:"pointer", fontSize:"12px", display:"flex",
                            alignItems:"center", justifyContent:"center" }}>✕</button>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                        <span style={{ fontSize:"11px", color:sub }}>Opacity</span>
                        <span style={{ fontSize:"11px", color:"#CC0000", fontWeight:700 }}>
                          {Math.round(tpl.bgOpacity * 100)}%
                        </span>
                      </div>
                      <input type="range" min={3} max={60} step={1}
                        value={Math.round(tpl.bgOpacity * 100)}
                        onChange={e => upd("bgOpacity", parseFloat(e.target.value) / 100)}
                        style={{ width:"100%", accentColor:"#CC0000" }} />
                    </>
                  ) : (
                    <div
                      onClick={() => !bgUploading && bgInputRef.current?.click()}
                      style={{
                        padding:"18px 12px", borderRadius:"8px", textAlign:"center",
                        border:`2px dashed ${bgUploading ? "#CC0000" : border}`,
                        background: bgUploading ? "rgba(204,0,0,0.06)" : "transparent",
                        cursor: bgUploading ? "not-allowed" : "pointer",
                        transition:"all 0.15s",
                      }}
                    >
                      <div style={{ fontSize:"22px", marginBottom:"5px" }}>
                        {bgUploading ? "⏳" : "🖼"}
                      </div>
                      <div style={{ fontSize:"12px", fontWeight:700, color:text, marginBottom:"3px" }}>
                        {bgUploading ? "Uploading to Cloudinary…" : "Upload Background"}
                      </div>
                      <div style={{ fontSize:"10px", color:sub }}>
                        JPG, PNG, WEBP · Max 5 MB · Stored on Cloudinary
                      </div>
                    </div>
                  )}
                  <input ref={bgInputRef} type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleBgUpload} style={{ display:"none" }} />
                </div>

                <div>
                  <ToggleRow label="Show Header"  desc="Company name & logo"
                    value={tpl.showHeader} onChange={() => upd("showHeader", !tpl.showHeader)} />
                  <ToggleRow label="Show Photo"
                    value={tpl.showPhoto}  onChange={() => upd("showPhoto",  !tpl.showPhoto)}  />
                  <ToggleRow label="Show Barcode" desc="Decorative barcode in footer"
                    value={tpl.showBarcode} onChange={() => upd("showBarcode", !tpl.showBarcode)} />
                </div>
              </>
            )}

            {/* ── FIELDS TAB ── */}
            {activeTab === "fields" && (
              <>
                <div style={{ padding:"8px 10px", background:"rgba(204,0,0,0.06)",
                  borderRadius:"8px", border:"1px solid rgba(204,0,0,0.2)",
                  fontSize:"11px", color:"#CC0000", lineHeight:1.6 }}>
                  Toggle which fields appear on the card. "Name" is always shown.
                </div>
                {FIELD_OPTIONS.map(f => {
                  const on = tpl.fields.includes(f.key);
                  const disabled = f.key === "name";
                  return (
                    <div key={f.key}
                      onClick={() => !disabled && toggleField(f.key)}
                      style={{
                        display:"flex", alignItems:"center", gap:"10px",
                        padding:"9px 11px", borderRadius:"8px",
                        border:`1.5px solid ${on ? "#CC0000" : border}`,
                        background: on ? "rgba(204,0,0,0.07)" : "transparent",
                        cursor: disabled ? "default" : "pointer",
                        transition:"all 0.15s",
                      }}>
                      <span style={{ fontSize:"16px" }}>{f.icon}</span>
                      <span style={{ flex:1, fontSize:"12px", fontWeight:600,
                        color: on ? "#CC0000" : text }}>{f.label}</span>
                      {disabled
                        ? <span style={{ fontSize:"10px", color:sub }}>always on</span>
                        : <div style={{ width:"16px", height:"16px", borderRadius:"50%",
                            background: on ? "#CC0000" : border,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            flexShrink:0 }}>
                            {on && <span style={{ fontSize:"10px", color:"#FFF" }}>✓</span>}
                          </div>
                      }
                    </div>
                  );
                })}
              </>
            )}

            {/* ── COMPANY TAB ── */}
            {activeTab === "company" && (
              <>
                {/* Logo upload */}
                <div>
                  <SectionLabel>Company Logo</SectionLabel>
                  {tpl.logoUrl ? (
                    <div style={{ display:"flex", alignItems:"center", gap:"12px",
                      padding:"10px", borderRadius:"8px", border:`1px solid ${border}`,
                      marginBottom:"8px" }}>
                      <img src={getOptimizedUrl(tpl.logoUrl)} alt="logo"
                        style={{ width:"48px", height:"48px", objectFit:"contain",
                          borderRadius:"8px", border:`1px solid ${border}` }} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:"12px", color:text, fontWeight:600 }}>Logo uploaded ✓</div>
                        <div style={{ fontSize:"10px", color:sub, marginTop:"2px" }}>Stored on Cloudinary</div>
                      </div>
                      <button onClick={() => upd("logoUrl", "")}
                        style={{ padding:"4px 8px", borderRadius:"6px",
                          border:`1px solid ${border}`, background:"transparent",
                          color:sub, fontSize:"11px", cursor:"pointer" }}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div onClick={() => !logoUploading && logoInputRef.current?.click()}
                      style={{ padding:"16px", borderRadius:"8px", textAlign:"center",
                        border:`2px dashed ${logoUploading ? "#CC0000" : border}`,
                        cursor: logoUploading ? "not-allowed" : "pointer",
                        marginBottom:"8px", transition:"all 0.15s" }}>
                      <div style={{ fontSize:"22px", marginBottom:"4px" }}>
                        {logoUploading ? "⏳" : "🏢"}
                      </div>
                      <div style={{ fontSize:"12px", fontWeight:700, color:text, marginBottom:"2px" }}>
                        {logoUploading ? "Uploading…" : "Upload Logo"}
                      </div>
                      <div style={{ fontSize:"10px", color:sub }}>PNG, SVG, JPG · Max 5 MB</div>
                    </div>
                  )}
                  <input ref={logoInputRef} type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={handleLogoUpload} style={{ display:"none" }} />

                  <div style={{ marginBottom:"6px" }}>
                    <SectionLabel>Initials (shown if no logo)</SectionLabel>
                    <input value={tpl.logoFallback}
                      onChange={e => upd("logoFallback", e.target.value.slice(0,3).toUpperCase())}
                      maxLength={3}
                      style={{ width:"100%", padding:"8px 10px", borderRadius:"7px",
                        border:`1.5px solid ${border}`, background:card, color:text,
                        fontSize:"14px", fontWeight:700, outline:"none", fontFamily:"inherit",
                        boxSizing:"border-box", textAlign:"center", letterSpacing:"0.1em" }}
                      onFocus={e => e.target.style.borderColor="#CC0000"}
                      onBlur={e  => e.target.style.borderColor=border}
                    />
                  </div>
                </div>

                {[
                  ["Company Name", "companyName"],
                  ["Website",      "website"],
                  ["Phone",        "phone"],
                ].map(([label, key]) => (
                  <div key={key}>
                    <SectionLabel>{label}</SectionLabel>
                    <input value={tpl[key]}
                      onChange={e => upd(key, e.target.value)}
                      style={{ width:"100%", padding:"8px 10px", borderRadius:"7px",
                        border:`1.5px solid ${border}`, background:card, color:text,
                        fontSize:"12px", outline:"none", fontFamily:"inherit",
                        boxSizing:"border-box", transition:"border 0.15s" }}
                      onFocus={e => e.target.style.borderColor="#CC0000"}
                      onBlur={e  => e.target.style.borderColor=border}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div style={{
          overflowY:"auto", display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"flex-start",
          padding:"32px 24px", gap:"20px", background:bg,
        }}>
          <div style={{ fontSize:"12px", color:sub, fontFamily:"'Mulish',sans-serif" }}>
            Live Preview — updates as you configure
          </div>

          <CardPreview tpl={tpl} cardRef={cardRef} />

          <div style={{
            background:card, borderRadius:"10px", border:`1px solid ${border}`,
            padding:"14px 18px", maxWidth:"420px", width:"100%",
          }}>
            <div style={{ fontSize:"11px", fontWeight:700, color:sub,
              textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"10px" }}>
              Template Info
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {[
                ["Orientation", tpl.orientation === "horizontal" ? "Horizontal (85.6×54mm)" : "Vertical (54×85.6mm)"],
                ["Fields",      `${tpl.fields.length} of ${FIELD_OPTIONS.length} fields`],
                ["Background",  tpl.bgImageUrl ? "Cloudinary image" : "Solid gradient"],
                ["Logo",        tpl.logoUrl ? "Cloudinary logo" : `Initials (${tpl.logoFallback})`],
              ].map(([k, v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:"12px" }}>
                  <span style={{ color:sub }}>{k}</span>
                  <span style={{ color:text, fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}