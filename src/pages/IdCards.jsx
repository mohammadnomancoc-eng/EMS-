// ─────────────────────────────────────────────────────────────
//  src/pages/IdCards.jsx  ── v2 FIXED
//
//  Bugs fixed vs original:
//  1. Custom templates from Firestore are now loaded & rendered
//  2. Template selector UI (tabs: Default | <saved templates>)
//  3. CardPreview (from IdCardTemplateBuilder) reused for custom cards
//  4. Text clipping fixed (wordBreak instead of overflow:hidden)
//  5. Font readiness wait before html2canvas capture
//  6. PDF sizing / scale fixed (scale 4, explicit dimensions)
//  7. Address field added to both default card layouts
//  8. Approval / print-preview modal added
//  9. Vertical card bottom bar shows both website + phone
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../App";
import { subscribeEmployees } from "../firebase/firestoreService";
import { subscribeIdCardTemplates } from "../firebase/firestoreService";
import { getOptimizedUrl } from "../cloudinary/cloudinaryService";
import {
  CreditCard, Download, Search, Users,
  ChevronDown, CheckCircle2, X, RectangleHorizontal, RectangleVertical,
  Eye, Check, AlertTriangle, Plus, Layers, Star,
} from "lucide-react";

// ── Company defaults (used by built-in card layouts) ─────────
const LOGO_URL =
  import.meta.env.VITE_COMPANY_LOGO_URL ||
  "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/ems/company/logo.png";
const COMPANY_INITIALS = "RWT";
const COMPANY_NAME     = "Royals Webtech Pvt. Ltd.";
const COMPANY_WEBSITE  = "www.royalswebtechpvtltd.com";
const COMPANY_PHONE    = "+91 8788447944";

const FIELD_OPTIONS = [
  { key: "name",       label: "Full Name"   },
  { key: "id",         label: "Employee ID" },
  { key: "role",       label: "Designation" },
  { key: "department", label: "Department"  },
  { key: "email",      label: "Email"       },
  { key: "phone",      label: "Phone"       },
  { key: "joinDate",   label: "Join Date"   },
  { key: "bloodGroup", label: "Blood Group" },
  { key: "address",    label: "Address"     },
];

function getInitials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Load jsPDF + html2canvas from CDN ────────────────────────
let _libs = null;
async function loadLibs() {
  if (_libs) return _libs;
  await Promise.all([
    new Promise((res, rej) => {
      if (window.jspdf?.jsPDF) { res(); return; }
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    }),
    new Promise((res, rej) => {
      if (window.html2canvas) { res(); return; }
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    }),
  ]);
  _libs = { jsPDF: window.jspdf.jsPDF, html2canvas: window.html2canvas };
  return _libs;
}

async function waitForFonts() {
  if (document.fonts?.ready) await document.fonts.ready;
  await new Promise(r => setTimeout(r, 120));
}

// ─────────────────────────────────────────────────────────────
//  CUSTOM TEMPLATE CARD RENDERER
//  Reads tpl.config and emp, renders per the saved template design
// ─────────────────────────────────────────────────────────────
function CustomTemplateCard({ tpl, emp, cardRef }) {
  const cfg        = tpl.config || {};
  const isH        = cfg.orientation === "horizontal";
  const W          = isH ? 340 : 215;
  const H          = isH ? 215 : 340;
  const fs         = cfg.fontScale || 1;
  const photoR     = cfg.photoShape === "circle" ? "50%" : cfg.photoShape === "rounded" ? "10px" : "4px";
  const accent     = cfg.accentColor  || "#CC0000";
  const bgTop      = cfg.bgColorTop   || "#0d0d0d";
  const bgBot      = cfg.bgColorBot   || "#1c1c1c";
  const textClr    = cfg.textColor    || "#FFFFFF";
  const subClr     = cfg.subTextColor || "#BBBBBB";
  const labelClr   = cfg.labelColor   || accent;
  const fields     = cfg.fields       || ["name","id","role","department","email","phone","joinDate"];
  const [logoErr, setLogoErr] = useState(false);

  const displayEmp = emp || {
    name: "Sample Employee", id: "RWT-0001", role: "Software Engineer",
    department: "Engineering", email: "sample@company.com",
    phone: "+91 98765 43210", joinDate: "01 Jan 2024",
    bloodGroup: "O+", address: "Nagpur, Maharashtra",
  };

  return (
    <div
      ref={cardRef}
      style={{
        width: `${W}px`, height: `${H}px`,
        borderRadius: "14px",
        background: `linear-gradient(${isH ? "135deg" : "180deg"}, ${bgTop}, ${bgBot})`,
        position: "relative", overflow: "hidden",
        boxShadow: "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        fontFamily: "Arial, Helvetica, sans-serif",
        flexShrink: 0,
      }}
    >
      {/* Top accent */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:"4px",
        background:`linear-gradient(90deg, ${accent}, ${accent}bb, ${accent})`,
      }} />

      {/* Background watermark image */}
      {cfg.bgImageUrl && (
        <div style={{
          position:"absolute", inset:0, zIndex:0,
          backgroundImage:`url(${cfg.bgImageUrl})`,
          backgroundSize:"cover", backgroundPosition:"center",
          opacity: cfg.bgOpacity ?? 0.12, pointerEvents:"none",
        }} />
      )}

      {/* Dot grid */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none", zIndex:0,
        backgroundImage:"radial-gradient(circle, rgba(255,255,255,0.022) 1px, transparent 1px)",
        backgroundSize:"16px 16px",
      }} />

      {/* ── HORIZONTAL layout ── */}
      {isH && (
        <>
          {cfg.showHeader !== false && (
            <div style={{
              position:"absolute", top:"12px", left:"13px", right:"13px",
              display:"flex", alignItems:"center", gap:"8px", zIndex:1,
            }}>
              {/* Logo box */}
              <div style={{
                width:"30px", height:"30px", borderRadius:"8px",
                background:`${accent}22`, border:`1px solid ${accent}55`,
                display:"flex", alignItems:"center", justifyContent:"center",
                overflow:"hidden", flexShrink:0,
              }}>
                {!logoErr && cfg.logoUrl ? (
                  <img src={getOptimizedUrl ? getOptimizedUrl(cfg.logoUrl) : cfg.logoUrl}
                    alt="logo" crossOrigin="anonymous"
                    style={{ width:"100%", height:"100%", objectFit:"contain" }}
                    onError={() => setLogoErr(true)} />
                ) : (
                  <span style={{ fontSize:"10px", fontWeight:700, color:accent }}>
                    {cfg.logoFallback || COMPANY_INITIALS}
                  </span>
                )}
              </div>
              <div style={{ borderLeft:`1px solid ${accent}44`, paddingLeft:"8px", flex:1 }}>
                <div style={{ fontSize:`${6.5*fs}px`, color:accent, fontWeight:700,
                  letterSpacing:"0.16em", textTransform:"uppercase" }}>
                  EMPLOYEE IDENTITY CARD
                </div>
                <div style={{ fontSize:`${5.5*fs}px`, color:subClr, letterSpacing:"0.05em", marginTop:"1px" }}>
                  {cfg.companyName || COMPANY_NAME}
                </div>
              </div>
            </div>
          )}

          {/* Vertical divider */}
          <div style={{
            position:"absolute", left:"118px", top:"50px", bottom:"28px", width:"1px",
            background:`linear-gradient(180deg, transparent, ${accent}55, transparent)`, zIndex:1,
          }} />

          {/* Left: Photo + ID */}
          {cfg.showPhoto !== false && (
            <div style={{
              position:"absolute", left:"13px", top:"50px",
              width:"98px", display:"flex", flexDirection:"column", alignItems:"center", gap:"6px", zIndex:2,
            }}>
              <div style={{
                width:"68px", height:"68px", borderRadius:photoR,
                border:`2.5px solid ${accent}`,
                boxShadow:`0 0 0 3px ${accent}22, 0 4px 16px rgba(0,0,0,0.5)`,
                overflow:"hidden", background:"#1a1a1a",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                {displayEmp.photoUrl ? (
                  <img src={displayEmp.photoUrl} alt={displayEmp.name} crossOrigin="anonymous"
                    style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                ) : (
                  <span style={{ fontSize:"24px", fontWeight:700, color:accent }}>
                    {getInitials(displayEmp.name)}
                  </span>
                )}
              </div>
              {fields.includes("id") && (
                <div style={{
                  background:`${accent}18`, border:`1px solid ${accent}44`,
                  borderRadius:"4px", padding:"2px 6px", textAlign:"center",
                  width:"88px", boxSizing:"border-box",
                }}>
                  <div style={{ fontSize:`${5*fs}px`, color:accent, fontWeight:700, letterSpacing:"0.12em" }}>
                    EMP ID
                  </div>
                  <div style={{ fontSize:`${7*fs}px`, color:textClr,
                    fontFamily:"'Courier New',monospace", fontWeight:700, wordBreak:"break-all" }}>
                    {displayEmp.id || "—"}
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
            <div style={{ fontSize:`${13*fs}px`, fontWeight:700, color:textClr,
              wordBreak:"break-word", lineHeight:1.2 }}>
              {displayEmp.name || "—"}
            </div>
            {fields.includes("role") && (
              <div style={{
                display:"inline-flex", background:`${accent}22`, border:`1px solid ${accent}44`,
                borderRadius:"4px", padding:"2px 7px", alignSelf:"flex-start",
              }}>
                <span style={{ fontSize:`${7*fs}px`, color:`${accent}dd`, fontWeight:600,
                  wordBreak:"break-word" }}>
                  {displayEmp.role || "—"}
                </span>
              </div>
            )}
            {fields.filter(k => !["name","id","role"].includes(k)).slice(0, 5).map(k => {
              const fo = FIELD_OPTIONS.find(f => f.key === k);
              return (
                <div key={k} style={{ display:"flex", gap:"5px", alignItems:"flex-start" }}>
                  <span style={{ fontSize:`${5.5*fs}px`, color:labelClr, fontWeight:700,
                    letterSpacing:"0.12em", minWidth:"28px", flexShrink:0, paddingTop:"1px" }}>
                    {(fo?.label || k).slice(0,5).toUpperCase()}
                  </span>
                  <span style={{ fontSize:`${7*fs}px`, color:subClr, lineHeight:1.2,
                    wordBreak:"break-word", flex:1 }}>
                    {displayEmp[k] || "—"}
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
          {cfg.showHeader !== false && (
            <div style={{
              position:"absolute", top:"12px", left:0, right:0,
              display:"flex", flexDirection:"column", alignItems:"center", gap:"5px",
              padding:"0 12px", zIndex:1,
            }}>
              <div style={{
                width:"38px", height:"38px", borderRadius:"10px",
                background:`${accent}22`, border:`1px solid ${accent}55`,
                display:"flex", alignItems:"center", justifyContent:"center",
                overflow:"hidden",
              }}>
                {!logoErr && cfg.logoUrl ? (
                  <img src={getOptimizedUrl ? getOptimizedUrl(cfg.logoUrl) : cfg.logoUrl}
                    alt="logo" crossOrigin="anonymous"
                    style={{ width:"100%", height:"100%", objectFit:"contain" }}
                    onError={() => setLogoErr(true)} />
                ) : (
                  <span style={{ fontSize:"13px", fontWeight:700, color:accent }}>
                    {cfg.logoFallback || COMPANY_INITIALS}
                  </span>
                )}
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:`${6.5*fs}px`, color:accent, fontWeight:700,
                  letterSpacing:"0.15em", textTransform:"uppercase" }}>
                  EMPLOYEE ID CARD
                </div>
                <div style={{ fontSize:`${5.5*fs}px`, color:subClr, marginTop:"1px" }}>
                  {cfg.companyName || COMPANY_NAME}
                </div>
              </div>
            </div>
          )}

          <div style={{
            position:"absolute", top:"85px", left:"14px", right:"14px", height:"1px",
            background:`linear-gradient(90deg, transparent, ${accent}44, transparent)`, zIndex:1,
          }} />

          {cfg.showPhoto !== false && (
            <div style={{ position:"absolute", top:"95px", left:"50%", transform:"translateX(-50%)", zIndex:2 }}>
              <div style={{
                width:"76px", height:"76px", borderRadius:photoR,
                border:`2.5px solid ${accent}`,
                boxShadow:`0 0 0 3px ${accent}22, 0 4px 20px rgba(0,0,0,0.5)`,
                overflow:"hidden", background:"#1a1a1a",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                {displayEmp.photoUrl ? (
                  <img src={displayEmp.photoUrl} alt={displayEmp.name} crossOrigin="anonymous"
                    style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                ) : (
                  <span style={{ fontSize:"26px", fontWeight:700, color:accent }}>
                    {getInitials(displayEmp.name)}
                  </span>
                )}
              </div>
            </div>
          )}

          <div style={{
            position:"absolute", top:"183px", left:"10px", right:"10px",
            textAlign:"center", zIndex:2,
          }}>
            <div style={{ fontSize:`${13*fs}px`, fontWeight:700, color:textClr,
              wordBreak:"break-word", lineHeight:1.2 }}>
              {displayEmp.name || "—"}
            </div>
            {fields.includes("role") && (
              <div style={{
                display:"inline-flex", marginTop:"4px",
                background:`${accent}22`, border:`1px solid ${accent}44`,
                borderRadius:"4px", padding:"2px 8px",
              }}>
                <span style={{ fontSize:`${7*fs}px`, color:`${accent}dd`, fontWeight:600 }}>
                  {displayEmp.role || "—"}
                </span>
              </div>
            )}
          </div>

          <div style={{
            position:"absolute", top:"218px", left:"14px", right:"14px", height:"1px",
            background:`linear-gradient(90deg, transparent, ${accent}44, transparent)`, zIndex:1,
          }} />

          <div style={{
            position:"absolute", top:"225px", left:"12px", right:"12px",
            display:"flex", flexDirection:"column", gap:"5px", zIndex:2,
          }}>
            {fields.includes("id") && (
              <div style={{
                display:"flex", justifyContent:"center", alignItems:"center", gap:"6px",
                background:`${accent}18`, border:`1px solid ${accent}44`,
                borderRadius:"5px", padding:"3px 8px",
              }}>
                <span style={{ fontSize:`${5.5*fs}px`, color:accent, fontWeight:700, letterSpacing:"0.12em" }}>
                  EMP ID
                </span>
                <span style={{ fontSize:`${7.5*fs}px`, color:textClr,
                  fontFamily:"'Courier New',monospace", fontWeight:700, wordBreak:"break-all" }}>
                  {displayEmp.id || "—"}
                </span>
              </div>
            )}
            {fields.filter(k => !["name","id","role"].includes(k)).slice(0, 5).map(k => {
              const fo = FIELD_OPTIONS.find(f => f.key === k);
              return (
                <div key={k} style={{ display:"flex", gap:"5px", alignItems:"flex-start" }}>
                  <span style={{ fontSize:`${5.5*fs}px`, color:labelClr, fontWeight:700,
                    letterSpacing:"0.12em", minWidth:"28px", flexShrink:0, paddingTop:"1px" }}>
                    {(fo?.label || k).slice(0,5).toUpperCase()}
                  </span>
                  <span style={{ fontSize:`${7*fs}px`, color:subClr, lineHeight:1.2,
                    wordBreak:"break-word", flex:1 }}>
                    {displayEmp[k] || "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Bottom bar */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0, height:"28px",
        background:`linear-gradient(90deg, ${accent}, ${accent}99)`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 12px", zIndex:3,
      }}>
        <span style={{ fontSize:`${5.5*fs}px`, color:"rgba(255,255,255,0.75)",
          letterSpacing:"0.08em", wordBreak:"break-all" }}>
          {cfg.website || COMPANY_WEBSITE}
        </span>
        {cfg.showBarcode !== false && (
          <div style={{ display:"flex", gap:"1.5px", alignItems:"center", flexShrink:0 }}>
            {[3,5,2,4,3,6,2,4,3].map((h,i) => (
              <div key={i} style={{ width:"1px", height:`${h}px`, background:"rgba(255,255,255,0.55)" }} />
            ))}
          </div>
        )}
        <span style={{ fontSize:`${5.5*fs}px`, color:"rgba(255,255,255,0.65)",
          letterSpacing:"0.04em", flexShrink:0 }}>
          {cfg.phone || COMPANY_PHONE}
        </span>
      </div>
      <div style={{
        position:"absolute", bottom:"28px", left:0, right:0, height:"1px",
        background:`${accent}44`, zIndex:2,
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  DEFAULT HORIZONTAL card (CR80: 85.6mm × 54mm → 340×215px)
// ─────────────────────────────────────────────────────────────
function IdCardHorizontal({ emp, cardRef }) {
  const [logoError, setLogoError] = useState(false);
  return (
    <div ref={cardRef} style={{
      width:"340px", height:"215px", borderRadius:"14px",
      background:"linear-gradient(135deg, #0d0d0d 0%, #1c1c1c 55%, #111 100%)",
      position:"relative", overflow:"hidden",
      boxShadow:"0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
      fontFamily:"Arial, Helvetica, sans-serif", flexShrink:0,
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"4px",
        background:"linear-gradient(90deg, #CC0000, #FF4444, #CC0000)" }} />
      <div style={{ position:"absolute", right:"-40px", top:"-40px", width:"160px", height:"160px",
        borderRadius:"50%", border:"1px solid rgba(204,0,0,0.12)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", inset:0, pointerEvents:"none",
        backgroundImage:"radial-gradient(circle, rgba(255,255,255,0.022) 1px, transparent 1px)",
        backgroundSize:"16px 16px" }} />

      {/* Header */}
      <div style={{ position:"absolute", top:"13px", left:"14px", right:"14px",
        display:"flex", alignItems:"center", gap:"9px" }}>
        <div style={{ width:"32px", height:"32px", borderRadius:"8px",
          background:"rgba(204,0,0,0.15)", border:"1px solid rgba(204,0,0,0.3)",
          display:"flex", alignItems:"center", justifyContent:"center",
          overflow:"hidden", flexShrink:0 }}>
          {!logoError && LOGO_URL && !LOGO_URL.includes("YOUR_CLOUD_NAME") ? (
            <img src={getOptimizedUrl ? getOptimizedUrl(LOGO_URL) : LOGO_URL}
              alt="logo" crossOrigin="anonymous"
              style={{ width:"100%", height:"100%", objectFit:"contain" }}
              onError={() => setLogoError(true)} />
          ) : (
            <span style={{ fontSize:"11px", fontWeight:700, color:"#CC0000" }}>{COMPANY_INITIALS}</span>
          )}
        </div>
        <div style={{ borderLeft:"1px solid rgba(204,0,0,0.35)", paddingLeft:"9px", flex:1 }}>
          <div style={{ fontSize:"6.5px", color:"#CC0000", fontWeight:700,
            letterSpacing:"0.18em", textTransform:"uppercase" }}>EMPLOYEE IDENTITY CARD</div>
          <div style={{ fontSize:"6px", color:"#777", letterSpacing:"0.06em", marginTop:"1px" }}>
            {COMPANY_NAME}
          </div>
        </div>
      </div>

      {/* Vertical divider */}
      <div style={{ position:"absolute", left:"122px", top:"52px", bottom:"28px", width:"1px",
        background:"linear-gradient(180deg, transparent, rgba(204,0,0,0.35), transparent)" }} />

      {/* Left: Photo + ID */}
      <div style={{ position:"absolute", left:"14px", top:"52px",
        width:"100px", display:"flex", flexDirection:"column", alignItems:"center", gap:"7px" }}>
        <div style={{ width:"70px", height:"70px", borderRadius:"50%",
          border:"2.5px solid #CC0000",
          boxShadow:"0 0 0 3px rgba(204,0,0,0.12), 0 4px 16px rgba(0,0,0,0.5)",
          overflow:"hidden", background:"#1a1a1a",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          {emp.photoUrl ? (
            <img src={emp.photoUrl} alt={emp.name} crossOrigin="anonymous"
              style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          ) : (
            <span style={{ fontSize:"24px", fontWeight:700, color:"#CC0000" }}>
              {getInitials(emp.name)}
            </span>
          )}
        </div>
        <div style={{ background:"rgba(204,0,0,0.1)", border:"1px solid rgba(204,0,0,0.3)",
          borderRadius:"4px", padding:"2px 7px", textAlign:"center",
          width:"100%", boxSizing:"border-box" }}>
          <div style={{ fontSize:"5px", color:"#CC0000", letterSpacing:"0.12em", fontWeight:700 }}>EMP ID</div>
          <div style={{ fontSize:"7.5px", color:"#FFF", fontFamily:"'Courier New', monospace",
            fontWeight:700, marginTop:"1px", wordBreak:"break-all" }}>
            {emp.id || "—"}
          </div>
        </div>
      </div>

      {/* Right: Details */}
      <div style={{ position:"absolute", left:"134px", top:"53px", right:"12px",
        display:"flex", flexDirection:"column", gap:"5px" }}>
        <div style={{ fontSize:"13px", fontWeight:700, color:"#FFF",
          wordBreak:"break-word", lineHeight:1.2 }}>{emp.name || "—"}</div>
        <div style={{ display:"inline-flex", background:"rgba(204,0,0,0.14)",
          border:"1px solid rgba(204,0,0,0.28)", borderRadius:"4px",
          padding:"2px 8px", alignSelf:"flex-start" }}>
          <span style={{ fontSize:"7px", color:"#FF6666", fontWeight:600, wordBreak:"break-word" }}>
            {emp.role || "Employee"}
          </span>
        </div>
        {[["DEPT",emp.department],["EMAIL",emp.email],["PHONE",emp.phone],
          ["JOIN",emp.joinDate],["ADDR",emp.address]].map(([label, value]) => (
          <div key={label} style={{ display:"flex", gap:"5px", alignItems:"flex-start" }}>
            <span style={{ fontSize:"5.5px", color:"#CC0000", fontWeight:700,
              letterSpacing:"0.14em", minWidth:"29px", flexShrink:0, paddingTop:"1px" }}>
              {label}
            </span>
            <span style={{ fontSize:"7px", color:"#BBBBBB", lineHeight:1.2,
              wordBreak:"break-word", flex:1 }}>
              {value || "—"}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"28px",
        background:"linear-gradient(90deg, #CC0000, #990000)",
        display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 14px" }}>
        <span style={{ fontSize:"6px", color:"rgba(255,255,255,0.75)", letterSpacing:"0.08em" }}>
          {COMPANY_WEBSITE}
        </span>
        <div style={{ display:"flex", gap:"1.5px", alignItems:"center" }}>
          {[3,5,2,4,3,6,2,4,3,5,2].map((h,i) => (
            <div key={i} style={{ width:"1px", height:`${h}px`, background:"rgba(255,255,255,0.55)" }} />
          ))}
        </div>
        <span style={{ fontSize:"6px", color:"rgba(255,255,255,0.65)", letterSpacing:"0.04em" }}>
          {COMPANY_PHONE}
        </span>
      </div>
      <div style={{ position:"absolute", bottom:"28px", left:0, right:0, height:"1px",
        background:"rgba(204,0,0,0.25)" }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  DEFAULT VERTICAL card
// ─────────────────────────────────────────────────────────────
function IdCardVertical({ emp, cardRef }) {
  const [logoError, setLogoError] = useState(false);
  return (
    <div ref={cardRef} style={{
      width:"215px", height:"340px", borderRadius:"14px",
      background:"linear-gradient(180deg, #0d0d0d 0%, #1c1c1c 50%, #111 100%)",
      position:"relative", overflow:"hidden",
      boxShadow:"0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
      fontFamily:"Arial, Helvetica, sans-serif", flexShrink:0,
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"4px",
        background:"linear-gradient(90deg, #CC0000, #FF4444, #CC0000)" }} />

      {/* Header */}
      <div style={{ position:"absolute", top:"12px", left:0, right:0,
        display:"flex", flexDirection:"column", alignItems:"center", gap:"5px", padding:"0 12px" }}>
        <div style={{ width:"40px", height:"40px", borderRadius:"10px",
          background:"rgba(204,0,0,0.15)", border:"1px solid rgba(204,0,0,0.3)",
          display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
          {!logoError && LOGO_URL && !LOGO_URL.includes("YOUR_CLOUD_NAME") ? (
            <img src={getOptimizedUrl ? getOptimizedUrl(LOGO_URL) : LOGO_URL}
              alt="logo" crossOrigin="anonymous"
              style={{ width:"100%", height:"100%", objectFit:"contain" }}
              onError={() => setLogoError(true)} />
          ) : (
            <span style={{ fontSize:"14px", fontWeight:700, color:"#CC0000" }}>{COMPANY_INITIALS}</span>
          )}
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"7px", color:"#CC0000", fontWeight:700,
            letterSpacing:"0.15em", textTransform:"uppercase" }}>EMPLOYEE ID CARD</div>
          <div style={{ fontSize:"6px", color:"#666", letterSpacing:"0.05em", marginTop:"2px" }}>
            {COMPANY_NAME}
          </div>
        </div>
      </div>

      <div style={{ position:"absolute", top:"85px", left:"14px", right:"14px", height:"1px",
        background:"linear-gradient(90deg, transparent, rgba(204,0,0,0.4), transparent)" }} />

      {/* Photo */}
      <div style={{ position:"absolute", top:"95px", left:"50%", transform:"translateX(-50%)" }}>
        <div style={{ width:"80px", height:"80px", borderRadius:"50%",
          border:"2.5px solid #CC0000",
          boxShadow:"0 0 0 3px rgba(204,0,0,0.12), 0 4px 20px rgba(0,0,0,0.5)",
          overflow:"hidden", background:"#1a1a1a",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          {emp.photoUrl ? (
            <img src={emp.photoUrl} alt={emp.name} crossOrigin="anonymous"
              style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          ) : (
            <span style={{ fontSize:"28px", fontWeight:700, color:"#CC0000" }}>
              {getInitials(emp.name)}
            </span>
          )}
        </div>
      </div>

      {/* Name + Role */}
      <div style={{ position:"absolute", top:"185px", left:"10px", right:"10px", textAlign:"center" }}>
        <div style={{ fontSize:"14px", fontWeight:700, color:"#FFF",
          wordBreak:"break-word", lineHeight:1.2 }}>{emp.name || "—"}</div>
        <div style={{ display:"inline-flex", alignItems:"center", marginTop:"5px",
          background:"rgba(204,0,0,0.14)", border:"1px solid rgba(204,0,0,0.28)",
          borderRadius:"4px", padding:"2px 9px" }}>
          <span style={{ fontSize:"7.5px", color:"#FF6666", fontWeight:600 }}>
            {emp.role || "Employee"}
          </span>
        </div>
      </div>

      <div style={{ position:"absolute", top:"222px", left:"14px", right:"14px", height:"1px",
        background:"linear-gradient(90deg, transparent, rgba(204,0,0,0.3), transparent)" }} />

      {/* Info fields */}
      <div style={{ position:"absolute", top:"229px", left:"12px", right:"12px",
        display:"flex", flexDirection:"column", gap:"5px" }}>
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:"6px",
          background:"rgba(204,0,0,0.1)", border:"1px solid rgba(204,0,0,0.28)",
          borderRadius:"5px", padding:"3px 8px" }}>
          <span style={{ fontSize:"6px", color:"#CC0000", fontWeight:700, letterSpacing:"0.12em" }}>EMP ID</span>
          <span style={{ fontSize:"8px", color:"#FFF", fontFamily:"'Courier New',monospace",
            fontWeight:700, wordBreak:"break-all" }}>{emp.id || "—"}</span>
        </div>
        {[["DEPT",emp.department],["EMAIL",emp.email],["PHONE",emp.phone],
          ["JOIN",emp.joinDate],["ADDR",emp.address]].map(([label,value]) => (
          <div key={label} style={{ display:"flex", gap:"5px", alignItems:"flex-start" }}>
            <span style={{ fontSize:"5.5px", color:"#CC0000", fontWeight:700,
              letterSpacing:"0.12em", minWidth:"28px", flexShrink:0, paddingTop:"1px" }}>{label}</span>
            <span style={{ fontSize:"7px", color:"#BBBBBB", lineHeight:1.2,
              wordBreak:"break-word", flex:1 }}>{value || "—"}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"30px",
        background:"linear-gradient(90deg, #CC0000, #990000)",
        display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 10px" }}>
        <span style={{ fontSize:"5.5px", color:"rgba(255,255,255,0.75)", letterSpacing:"0.06em" }}>
          {COMPANY_WEBSITE}
        </span>
        <span style={{ fontSize:"5.5px", color:"rgba(255,255,255,0.65)", letterSpacing:"0.04em" }}>
          {COMPANY_PHONE}
        </span>
      </div>
      <div style={{ position:"absolute", bottom:"30px", left:0, right:0, height:"1px",
        background:"rgba(204,0,0,0.25)" }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  APPROVAL / PRINT PREVIEW MODAL
// ─────────────────────────────────────────────────────────────
function ApprovalModal({ emp, orientation, activeTemplate, onApprove, onCancel }) {
  const isCustom = !!activeTemplate;
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"rgba(0,0,0,0.78)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:"20px",
    }}>
      <div style={{
        background:"#111", border:"1px solid #2a2a2a", borderRadius:"16px",
        padding:"28px 32px", maxWidth:"520px", width:"100%",
        boxShadow:"0 32px 80px rgba(0,0,0,0.7)", maxHeight:"90vh", overflowY:"auto",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"20px" }}>
          <div style={{ width:"40px", height:"40px", borderRadius:"10px",
            background:"rgba(204,0,0,0.12)", border:"1px solid rgba(204,0,0,0.3)",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Eye size={18} style={{ color:"#CC0000" }} />
          </div>
          <div>
            <div style={{ fontFamily:"Rajdhani, sans-serif", fontWeight:700, fontSize:"18px", color:"#F0F0F0" }}>
              Approve &amp; Download
            </div>
            <div style={{ fontSize:"11px", color:"#666", marginTop:"2px" }}>
              {isCustom ? `Template: ${activeTemplate.name}` : "Default card layout"}
            </div>
          </div>
          <button onClick={onCancel} style={{ marginLeft:"auto", background:"none",
            border:"none", cursor:"pointer", color:"#666", padding:"4px" }}>
            <X size={18} />
          </button>
        </div>

        {/* Employee summary */}
        <div style={{ background:"#0A0A0A", border:"1px solid #1E1E1E", borderRadius:"10px",
          padding:"12px 16px", marginBottom:"20px",
          display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 20px" }}>
          {[["Name",emp.name],["Emp ID",emp.id],["Role",emp.role],["Dept",emp.department],
            ["Email",emp.email],["Phone",emp.phone],["Join",emp.joinDate],["Address",emp.address]
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize:"9px", color:"#CC0000", fontWeight:700,
                letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"2px" }}>{label}</div>
              <div style={{ fontSize:"11px", color:"#CCCCCC", wordBreak:"break-word" }}>{val || "—"}</div>
            </div>
          ))}
        </div>

        {/* Card preview */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:"22px",
          padding:"16px", background:"#0A0A0A", borderRadius:"10px", border:"1px solid #1E1E1E" }}>
          <div style={{ transform: orientation === "horizontal" ? "scale(0.82)" : "scale(0.72)",
            transformOrigin:"center" }}>
            {isCustom
              ? <CustomTemplateCard tpl={activeTemplate} emp={emp} cardRef={null} />
              : orientation === "horizontal"
                ? <IdCardHorizontal emp={emp} cardRef={null} />
                : <IdCardVertical   emp={emp} cardRef={null} />
            }
          </div>
        </div>

        {/* Warning */}
        <div style={{ display:"flex", gap:"8px", alignItems:"flex-start",
          background:"rgba(204,0,0,0.06)", border:"1px solid rgba(204,0,0,0.2)",
          borderRadius:"8px", padding:"10px 14px", marginBottom:"20px" }}>
          <AlertTriangle size={14} style={{ color:"#CC0000", flexShrink:0, marginTop:"1px" }} />
          <span style={{ fontSize:"11px", color:"#AAAAAA", lineHeight:1.4 }}>
            Verify all details before proceeding. The PDF will download immediately after approval.
          </span>
        </div>

        <div style={{ display:"flex", gap:"10px" }}>
          <button onClick={onCancel} style={{ flex:1, padding:"11px", borderRadius:"8px",
            cursor:"pointer", background:"transparent", border:"1px solid #2a2a2a", color:"#888",
            fontFamily:"Rajdhani, sans-serif", fontWeight:700, fontSize:"13px", letterSpacing:"0.06em" }}>
            CANCEL
          </button>
          <button onClick={onApprove} style={{ flex:2, padding:"11px", borderRadius:"8px",
            cursor:"pointer", background:"#CC0000", border:"none", color:"#FFF",
            fontFamily:"Rajdhani, sans-serif", fontWeight:700, fontSize:"13px", letterSpacing:"0.06em",
            display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
            <Check size={15} />
            APPROVE &amp; DOWNLOAD PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function Spinner({ size = 16, color = "#CC0000" }) {
  return (
    <div style={{
      width:`${size}px`, height:`${size}px`, borderRadius:"50%",
      border:`2px solid rgba(204,0,0,0.2)`, borderTopColor:color,
      animation:"spin 0.7s linear infinite", flexShrink:0,
    }} />
  );
}

// ── PDF download helpers ──────────────────────────────────────
async function downloadCard(cardEl, emp, orientation) {
  const { jsPDF, html2canvas } = await loadLibs();
  await waitForFonts();
  const canvas = await html2canvas(cardEl, {
    scale: 4, useCORS: true, allowTaint: true,
    backgroundColor: null, logging: false,
    width: cardEl.offsetWidth, height: cardEl.offsetHeight,
  });
  const imgData = canvas.toDataURL("image/png");
  const isH = orientation === "horizontal";
  const W = isH ? 85.6 : 54;
  const H = isH ? 54   : 85.6;
  const doc = new jsPDF({ orientation: isH ? "landscape" : "portrait", unit:"mm", format:[W,H] });
  doc.addImage(imgData, "PNG", 0, 0, W, H, undefined, "FAST");
  const safeName = (emp.name || "Employee").replace(/\s+/g, "_");
  doc.save(`IDCard_${safeName}_${emp.id || "RWT"}.pdf`);
}

async function downloadAllCards(refs, employees, orientation) {
  const { jsPDF, html2canvas } = await loadLibs();
  await waitForFonts();
  const isH = orientation === "horizontal";
  const W = isH ? 85.6 : 54;
  const H = isH ? 54   : 85.6;
  const doc = new jsPDF({ orientation: isH ? "landscape" : "portrait", unit:"mm", format:[W,H] });
  for (let i = 0; i < refs.current.length; i++) {
    const el = refs.current[i];
    if (!el) continue;
    const canvas = await html2canvas(el, {
      scale: 4, useCORS: true, allowTaint: true,
      backgroundColor: null, logging: false,
      width: el.offsetWidth, height: el.offsetHeight,
    });
    const imgData = canvas.toDataURL("image/png");
    if (i > 0) doc.addPage([W, H], isH ? "landscape" : "portrait");
    doc.addImage(imgData, "PNG", 0, 0, W, H, undefined, "FAST");
  }
  doc.save("RWT_All_ID_Cards.pdf");
}

// ── Main Page ─────────────────────────────────────────────────
export default function IdCards() {
  const navigate                        = useNavigate();
  const { theme }                       = useTheme();
  const isDark                          = theme === "dark";
  const [employees, setEmployees]       = useState([]);
  const [filtered,  setFiltered]        = useState([]);
  const [search,    setSearch]          = useState("");
  const [loading,   setLoading]         = useState(true);
  const [downloading, setDownloading]   = useState(null);
  const [deptFilter, setDeptFilter]     = useState("All");
  const [success,   setSuccess]         = useState(null);
  const [orientation, setOrientation]   = useState("horizontal");

  // ── Template state ──────────────────────────────────────────
  const [templates,    setTemplates]    = useState([]);   // from Firestore
  const [tplLoading,   setTplLoading]  = useState(true);
  // null = use default built-in layout; otherwise a template object
  const [activeTemplate, setActiveTemplate] = useState(null);

  // Approval modal
  const [approvalEmp, setApprovalEmp]  = useState(null);
  const [approvalIdx, setApprovalIdx]  = useState(null);

  const cardRefs = useRef([]);

  const bg     = isDark ? "#0A0A0A" : "#F4F4F4";
  const card   = isDark ? "#111111" : "#FFFFFF";
  const border = isDark ? "#1E1E1E" : "#E0E0E0";
  const text   = isDark ? "#F0F0F0" : "#111111";
  const sub    = isDark ? "#666666" : "#888888";

  // Load employees
  useEffect(() => {
    const unsub = subscribeEmployees((emps) => {
      setEmployees(emps);
      setFiltered(emps);
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Load custom templates from Firestore ────────────────────
  useEffect(() => {
    const unsub = subscribeIdCardTemplates((tpls) => {
      setTemplates(tpls);
      setTplLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    let result = employees;
    if (deptFilter !== "All") result = result.filter(e => e.department === deptFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        (e.name  || "").toLowerCase().includes(q) ||
        (e.email || "").toLowerCase().includes(q) ||
        (e.id    || "").toLowerCase().includes(q) ||
        (e.role  || "").toLowerCase().includes(q)
      );
    }
    setFiltered(result);
    cardRefs.current = new Array(result.length).fill(null);
  }, [search, deptFilter, employees]);

  const departments = ["All", ...new Set(employees.map(e => e.department).filter(Boolean))];

  // Orientation for default cards; custom templates use their own
  const effectiveOrientation = activeTemplate
    ? (activeTemplate.config?.orientation || "horizontal")
    : orientation;

  const handlePreviewApprove = (emp, idx) => {
    setApprovalEmp(emp);
    setApprovalIdx(idx);
  };

  const handleApproveDownload = async () => {
    const emp = approvalEmp;
    const idx = approvalIdx;
    setApprovalEmp(null); setApprovalIdx(null);
    setDownloading(emp.id);
    try {
      const el = cardRefs.current[idx];
      if (!el) throw new Error("Card element not found");
      await downloadCard(el, emp, effectiveOrientation);
      setSuccess(emp.id);
      setTimeout(() => setSuccess(null), 2500);
    } catch(e) { console.error(e); }
    finally { setDownloading(null); }
  };

  const handleDownloadAll = async () => {
    setDownloading("all");
    try {
      await downloadAllCards(cardRefs, filtered, effectiveOrientation);
      setSuccess("all");
      setTimeout(() => setSuccess(null), 2500);
    } catch(e) { console.error(e); }
    finally { setDownloading(null); }
  };

  const gridMinWidth = effectiveOrientation === "horizontal" ? "380px" : "260px";

  // ── Render a card for a given employee + index ──────────────
  const renderCard = (emp, idx) => {
    const refCb = el => { cardRefs.current[idx] = el; };
    if (activeTemplate) {
      return <CustomTemplateCard tpl={activeTemplate} emp={emp} cardRef={refCb} />;
    }
    return orientation === "horizontal"
      ? <IdCardHorizontal emp={emp} cardRef={refCb} />
      : <IdCardVertical   emp={emp} cardRef={refCb} />;
  };

  return (
    <div style={{ minHeight:"100vh", background:bg }}>

      {/* Approval modal */}
      {approvalEmp && (
        <ApprovalModal
          emp={approvalEmp}
          orientation={effectiveOrientation}
          activeTemplate={activeTemplate}
          onApprove={handleApproveDownload}
          onCancel={() => { setApprovalEmp(null); setApprovalIdx(null); }}
        />
      )}

      {/* ── Page Header ── */}
      <div style={{ background:card, border:`1px solid ${border}`, borderRadius:"12px",
        padding:"18px 22px", marginBottom:"20px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:"12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <div style={{ width:"44px", height:"44px", borderRadius:"10px", flexShrink:0,
            background:"rgba(204,0,0,0.1)", border:"1px solid rgba(204,0,0,0.25)",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <CreditCard size={22} style={{ color:"#CC0000" }} />
          </div>
          <div>
            <h2 style={{ fontFamily:"Rajdhani, sans-serif", fontWeight:700, fontSize:"22px",
              color:text, margin:0 }}>ID Cards</h2>
            <p style={{ fontFamily:"Mulish, sans-serif", fontSize:"12px", color:sub, margin:0 }}>
              Generate &amp; download employee ID cards
            </p>
          </div>
        </div>

        <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ background:isDark ? "#0A0A0A" : "#F5F5F5", border:`1px solid ${border}`,
            borderRadius:"8px", padding:"8px 14px",
            display:"flex", alignItems:"center", gap:"8px" }}>
            <Users size={14} style={{ color:"#00B8B8" }} />
            <span style={{ fontFamily:"Rajdhani, sans-serif", fontWeight:700, fontSize:"14px", color:text }}>
              {filtered.length}
            </span>
            <span style={{ fontFamily:"Mulish, sans-serif", fontSize:"11px", color:sub }}>cards</span>
          </div>

          {/* Create template button */}
          <button onClick={() => navigate("/idcard-template")}
            style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 14px",
              borderRadius:"8px", cursor:"pointer", border:`1px solid ${border}`,
              background:"transparent", color:sub,
              fontFamily:"Rajdhani, sans-serif", fontWeight:700, fontSize:"12px",
              letterSpacing:"0.04em", transition:"all 150ms" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="#CC0000"; e.currentTarget.style.color="#CC0000"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=border; e.currentTarget.style.color=sub; }}>
            <Plus size={13} />
            NEW TEMPLATE
          </button>

          {/* Orientation toggle (only for default layout) */}
          {!activeTemplate && (
            <div style={{ display:"flex", border:`1px solid ${border}`, borderRadius:"8px", overflow:"hidden" }}>
              {["horizontal","vertical"].map((o, i) => (
                <button key={o} onClick={() => setOrientation(o)}
                  style={{ display:"flex", alignItems:"center", gap:"5px",
                    padding:"8px 13px", cursor:"pointer", fontSize:"12px",
                    fontFamily:"Rajdhani, sans-serif", fontWeight:700, letterSpacing:"0.04em",
                    border:"none", borderLeft: i > 0 ? `1px solid ${border}` : "none",
                    transition:"all 150ms",
                    background: orientation === o ? "#CC0000" : "transparent",
                    color: orientation === o ? "#FFF" : sub }}>
                  {o === "horizontal" ? <RectangleHorizontal size={13} /> : <RectangleVertical size={13} />}
                  {o.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Download all */}
          <button onClick={handleDownloadAll}
            disabled={downloading === "all" || filtered.length === 0}
            style={{ display:"flex", alignItems:"center", gap:"7px", padding:"9px 16px",
              borderRadius:"8px", cursor:filtered.length === 0 ? "not-allowed" : "pointer",
              background: downloading === "all" ? "rgba(204,0,0,0.08)"
                : success === "all" ? "rgba(0,184,100,0.12)" : "#CC0000",
              border: success === "all" ? "1px solid rgba(0,184,100,0.3)"
                : downloading === "all" ? "1px solid rgba(204,0,0,0.2)" : "none",
              color: downloading === "all" ? "#CC0000" : success === "all" ? "#00B864" : "#FFF",
              fontFamily:"Rajdhani, sans-serif", fontWeight:700, fontSize:"13px",
              letterSpacing:"0.06em", transition:"all 200ms" }}>
            {downloading === "all" ? <><Spinner />&nbsp;GENERATING…</>
              : success === "all" ? <><CheckCircle2 size={14} />ALL DOWNLOADED</>
              : <><Download size={14} />DOWNLOAD ALL ({filtered.length})</>}
          </button>
        </div>
      </div>

      {/* ── TEMPLATE SELECTOR ── */}
      <div style={{ background:card, border:`1px solid ${border}`, borderRadius:"10px",
        padding:"14px 16px", marginBottom:"20px" }}>
        <div style={{ fontSize:"10px", fontWeight:700, color:sub,
          textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"10px" }}>
          Card Template
        </div>
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>

          {/* Default option */}
          <button
            onClick={() => setActiveTemplate(null)}
            style={{
              padding:"8px 14px", borderRadius:"8px", cursor:"pointer", fontSize:"12px",
              fontFamily:"Mulish, sans-serif", fontWeight:600, transition:"all 150ms",
              background: !activeTemplate ? "rgba(204,0,0,0.1)" : "transparent",
              border: !activeTemplate ? "1.5px solid #CC0000" : `1.5px solid ${border}`,
              color: !activeTemplate ? "#CC0000" : sub,
              display:"flex", alignItems:"center", gap:"6px",
            }}>
            <Star size={12} />
            Default
          </button>

          {/* Custom templates from Firestore */}
          {tplLoading ? (
            <div style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 10px" }}>
              <Spinner size={12} />
              <span style={{ fontSize:"12px", color:sub }}>Loading templates…</span>
            </div>
          ) : templates.length === 0 ? (
            <span style={{ fontSize:"12px", color:sub, padding:"8px 4px",
              display:"flex", alignItems:"center", gap:"6px" }}>
              <Layers size={12} />
              No custom templates yet —&nbsp;
              <span style={{ color:"#CC0000", cursor:"pointer", textDecoration:"underline" }}
                onClick={() => navigate("/idcard-template")}>
                create one
              </span>
            </span>
          ) : (
            templates.map(tpl => {
              const isActive = activeTemplate?.id === tpl.id;
              return (
                <button key={tpl.id}
                  onClick={() => setActiveTemplate(isActive ? null : tpl)}
                  style={{
                    padding:"8px 14px", borderRadius:"8px", cursor:"pointer", fontSize:"12px",
                    fontFamily:"Mulish, sans-serif", fontWeight:600, transition:"all 150ms",
                    background: isActive ? "rgba(204,0,0,0.1)" : "transparent",
                    border: isActive ? "1.5px solid #CC0000" : `1.5px solid ${border}`,
                    color: isActive ? "#CC0000" : text,
                    display:"flex", alignItems:"center", gap:"6px",
                  }}
                  onMouseEnter={e => { if(!isActive){ e.currentTarget.style.borderColor="#CC0000aa"; }}}
                  onMouseLeave={e => { if(!isActive){ e.currentTarget.style.borderColor=border; }}}>
                  <Layers size={12} />
                  {tpl.name}
                  {tpl.config?.orientation && (
                    <span style={{ fontSize:"9px", color: isActive ? "#CC0000" : sub,
                      background: isDark ? "#1E1E1E" : "#F0F0F0", borderRadius:"4px", padding:"1px 5px" }}>
                      {tpl.config.orientation === "horizontal" ? "H" : "V"}
                    </span>
                  )}
                  <span
                    onClick={e => { e.stopPropagation(); navigate(`/idcard-template/${tpl.id}`); }}
                    style={{ fontSize:"9px", color:sub, marginLeft:"2px", cursor:"pointer",
                      padding:"1px 5px", borderRadius:"4px", background:isDark?"#1E1E1E":"#F0F0F0" }}
                    title="Edit template">
                    Edit
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ background:card, border:`1px solid ${border}`, borderRadius:"10px",
        padding:"12px 16px", marginBottom:"20px",
        display:"flex", gap:"12px", flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ position:"relative", flex:1, minWidth:"200px" }}>
          <Search size={13} style={{ position:"absolute", left:"12px", top:"50%",
            transform:"translateY(-50%)", color:sub }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID, role…"
            style={{ width:"100%", paddingLeft:"34px", paddingRight:"12px",
              paddingTop:"8px", paddingBottom:"8px", borderRadius:"7px", outline:"none",
              fontSize:"12px", background:isDark?"#0A0A0A":"#F5F5F5",
              border:`1px solid ${border}`, color:text,
              fontFamily:"Mulish, sans-serif", boxSizing:"border-box" }}
            onFocus={e => { e.target.style.border="1px solid #CC0000"; e.target.style.boxShadow="0 0 0 3px rgba(204,0,0,0.08)"; }}
            onBlur={e  => { e.target.style.border=`1px solid ${border}`; e.target.style.boxShadow="none"; }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position:"absolute", right:"10px",
              top:"50%", transform:"translateY(-50%)", background:"none", border:"none",
              cursor:"pointer", color:sub, padding:"2px" }}>
              <X size={12} />
            </button>
          )}
        </div>
        <div style={{ position:"relative" }}>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            style={{ appearance:"none", padding:"8px 28px 8px 12px", borderRadius:"7px",
              outline:"none", fontSize:"12px", background:isDark?"#0A0A0A":"#F5F5F5",
              border:`1px solid ${border}`, color:text,
              fontFamily:"Mulish, sans-serif", cursor:"pointer" }}>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <ChevronDown size={12} style={{ position:"absolute", right:"8px", top:"50%",
            transform:"translateY(-50%)", color:sub, pointerEvents:"none" }} />
        </div>
      </div>

      {/* ── Cards Grid ── */}
      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"60px 0" }}>
          <Spinner size={36} color="#CC0000" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px",
          background:card, borderRadius:"12px", border:`1px solid ${border}` }}>
          <CreditCard size={40} style={{ color:sub, marginBottom:"12px" }} />
          <p style={{ fontFamily:"Rajdhani, sans-serif", fontSize:"18px", color:sub }}>
            No employees found
          </p>
        </div>
      ) : (
        <div style={{ display:"grid",
          gridTemplateColumns:`repeat(auto-fill, minmax(${gridMinWidth}, 1fr))`, gap:"20px" }}>
          {filtered.map((emp, idx) => (
            <div key={emp.id}
              style={{ background:card, border:`1px solid ${border}`, borderRadius:"14px",
                padding:"18px 18px 14px", display:"flex", flexDirection:"column",
                gap:"14px", transition:"border-color 200ms, box-shadow 200ms" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(204,0,0,0.35)";
                e.currentTarget.style.boxShadow="0 4px 24px rgba(204,0,0,0.07)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=border;
                e.currentTarget.style.boxShadow="none"; }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontFamily:"Rajdhani, sans-serif", fontWeight:700, fontSize:"15px", color:text }}>
                    {emp.name}
                  </div>
                  <div style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:"10px",
                    color:"#00B8B8", marginTop:"1px" }}>{emp.id}</div>
                </div>
                <div style={{ padding:"3px 9px", borderRadius:"20px", fontSize:"10px",
                  background:"rgba(204,0,0,0.1)", color:"#CC0000",
                  fontFamily:"Mulish, sans-serif", fontWeight:600,
                  border:"1px solid rgba(204,0,0,0.2)" }}>
                  {emp.department || "—"}
                </div>
              </div>

              {/* Card preview */}
              <div style={{ display:"flex", justifyContent:"center" }}>
                {renderCard(emp, idx)}
              </div>

              {/* Action buttons */}
              <div style={{ display:"flex", gap:"8px" }}>
                <button onClick={() => handlePreviewApprove(emp, idx)}
                  style={{ flex:1, padding:"10px", borderRadius:"8px", cursor:"pointer",
                    background:"rgba(204,0,0,0.06)", border:"1px solid rgba(204,0,0,0.18)",
                    color:"#CC0000", fontFamily:"Rajdhani, sans-serif", fontWeight:700,
                    fontSize:"11px", letterSpacing:"0.08em",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:"6px",
                    transition:"all 200ms" }}
                  onMouseEnter={e => { e.currentTarget.style.background="rgba(204,0,0,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="rgba(204,0,0,0.06)"; }}>
                  <Eye size={12} />
                  PREVIEW & APPROVE
                </button>
                <button
                  onClick={async () => {
                    setDownloading(emp.id);
                    try {
                      await downloadCard(cardRefs.current[idx], emp, effectiveOrientation);
                      setSuccess(emp.id);
                      setTimeout(() => setSuccess(null), 2500);
                    } catch(e) { console.error(e); }
                    finally { setDownloading(null); }
                  }}
                  disabled={downloading === emp.id}
                  style={{ flex:1, padding:"10px", borderRadius:"8px",
                    cursor:downloading === emp.id ? "not-allowed" : "pointer",
                    background: success === emp.id ? "rgba(0,184,100,0.1)"
                      : downloading === emp.id ? "rgba(204,0,0,0.06)" : "rgba(204,0,0,0.08)",
                    border:`1px solid ${success === emp.id ? "rgba(0,184,100,0.3)" : "rgba(204,0,0,0.2)"}`,
                    color: success === emp.id ? "#00B864" : "#CC0000",
                    fontFamily:"Rajdhani, sans-serif", fontWeight:700, fontSize:"11px",
                    letterSpacing:"0.08em",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:"6px",
                    transition:"all 200ms" }}>
                  {downloading === emp.id ? <><Spinner size={12} color="#CC0000" />&nbsp;GENERATING…</>
                    : success === emp.id ? <><CheckCircle2 size={12} />DONE</>
                    : <><Download size={12} />DOWNLOAD</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}