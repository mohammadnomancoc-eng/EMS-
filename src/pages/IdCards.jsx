// ─────────────────────────────────────────────────────────────
//  src/pages/IdCards.jsx
//
//  KEY FIX: Cards are rendered at EXACT CR80 print dimensions
//  (85.6mm × 54mm at 96dpi = 324px × 204px landscape,
//   54mm × 85.6mm = 204px × 324px portrait).
//  html2canvas scale:4 → 816×1296px PNG → maps 1:1 into jsPDF.
//  No text gets clipped because the layout is designed for the
//  exact pixel budget available on a real printed card.
//
//  • Print Preview Modal — admin approves before PDF is generated
//  • Standard tab: Horizontal + Vertical layouts
//  • Templates tab: Custom templates from Firestore
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../App";
import { subscribeEmployees } from "../firebase/firestoreService";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import {
  CreditCard, Download, Search, Users, ChevronDown,
  CheckCircle2, X, RectangleHorizontal, RectangleVertical,
  Palette, Plus, Pencil, Trash2, LayoutTemplate, Eye, Printer,
} from "lucide-react";
import { getOptimizedUrl } from "../cloudinary/cloudinaryService";

// ── Constants ───────────────────────────────────────────────────
const LOGO_URL =
  import.meta.env.VITE_COMPANY_LOGO_URL ||
  "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/ems/company/logo.png";

const CO_INIT    = "RWT";
const CO_NAME    = "Royals Webtech Pvt. Ltd.";
const CO_WEBSITE = "www.royalswebtechpvtltd.com";
const CO_PHONE   = "+91 8788447944";
const ACCENT     = "#CC0000";

// CR80 card dimensions at 96 dpi
// 85.6mm × 54mm  → 324px × 204px  (landscape/horizontal)
// 54mm × 85.6mm  → 204px × 324px  (portrait/vertical)
const H_W = 324, H_H = 204;   // horizontal card px
const V_W = 204, V_H = 324;   // vertical card px

function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── CDN libs ─────────────────────────────────────────────────────
let _libs = null;
async function loadLibs() {
  if (_libs) return _libs;
  await Promise.all([
    new Promise((res, rej) => {
      if (window.jspdf?.jsPDF) return res();
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    }),
    new Promise((res, rej) => {
      if (window.html2canvas) return res();
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    }),
  ]);
  _libs = { jsPDF: window.jspdf.jsPDF, html2canvas: window.html2canvas };
  return _libs;
}

// ─────────────────────────────────────────────────────────────
//  VERTICAL CARD  — 204 × 324 px (= 54mm × 85.6mm at 96dpi)
//  Every dimension is pixel-budget-aware so nothing overflows.
// ─────────────────────────────────────────────────────────────
function IdCardVertical({ emp, cardRef }) {
  const [logoErr, setLogoErr] = useState(false);
  const hasLogo = !logoErr && LOGO_URL && !LOGO_URL.includes("YOUR_CLOUD_NAME");

  // Layout constants (all in px, sum must fit within 324px height)
  // Top bar:4 | Header:68 | Sep:1 | Photo:72 | NameBlock:44 | Sep:1 | Fields:100 | Footer:34
  // Total = 4+68+1+72+44+1+100+34 = 324 ✓

  return (
    <div
      ref={cardRef}
      style={{
        width: `${V_W}px`, height: `${V_H}px`,
        borderRadius: "12px",
        background: "linear-gradient(175deg,#0d0d0d 0%,#181818 55%,#0f0f0f 100%)",
        position: "relative", overflow: "hidden", flexShrink: 0,
        boxShadow: "0 16px 48px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.04)",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      {/* accent bar */}
      <div style={{ position:"absolute",top:0,left:0,right:0,height:"4px",
        background:"linear-gradient(90deg,#990000,#FF3333,#990000)" }}/>

      {/* bg decoration */}
      <div style={{ position:"absolute",right:"-40px",top:"-40px",width:"160px",height:"160px",
        borderRadius:"50%",border:"1px solid rgba(204,0,0,0.08)",pointerEvents:"none" }}/>
      <div style={{ position:"absolute",left:"-28px",bottom:"-28px",width:"110px",height:"110px",
        borderRadius:"50%",border:"1px solid rgba(0,200,200,0.06)",pointerEvents:"none" }}/>
      <div style={{ position:"absolute",inset:0,pointerEvents:"none",
        backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.015) 1px,transparent 1px)",
        backgroundSize:"12px 12px" }}/>

      {/* ── HEADER (top:4, height:68) ── */}
      <div style={{
        position:"absolute",top:"4px",left:0,right:0,height:"68px",
        display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",gap:"4px",padding:"0 10px",
      }}>
        {/* logo */}
        <div style={{
          width:"36px",height:"36px",borderRadius:"8px",
          background:"rgba(204,0,0,0.12)",border:"1.5px solid rgba(204,0,0,0.32)",
          display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0,
        }}>
          {hasLogo ? (
            <img src={getOptimizedUrl?getOptimizedUrl(LOGO_URL):LOGO_URL}
              alt="logo" crossOrigin="anonymous"
              style={{ width:"100%",height:"100%",objectFit:"contain" }}
              onError={() => setLogoErr(true)}/>
          ) : (
            <span style={{ fontSize:"11px",fontWeight:700,color:ACCENT }}>{CO_INIT}</span>
          )}
        </div>
        <div style={{ textAlign:"center",lineHeight:1.3 }}>
          <div style={{ fontSize:"6px",color:ACCENT,fontWeight:700,
            letterSpacing:"0.20em",textTransform:"uppercase" }}>
            EMPLOYEE ID CARD
          </div>
          <div style={{ fontSize:"5.5px",color:"#666",letterSpacing:"0.05em",marginTop:"1px" }}>
            {CO_NAME}
          </div>
        </div>
      </div>

      {/* separator (top:72) */}
      <div style={{ position:"absolute",top:"72px",left:"14px",right:"14px",height:"1px",
        background:"linear-gradient(90deg,transparent,rgba(204,0,0,0.40),transparent)" }}/>

      {/* ── PHOTO (top:73, height:72) ── */}
      <div style={{ position:"absolute",top:"73px",left:"50%",transform:"translateX(-50%)" }}>
        <div style={{
          width:"66px",height:"66px",borderRadius:"10px",
          border:"2px solid #CC0000",
          boxShadow:"0 0 0 3px rgba(204,0,0,0.14),0 4px 14px rgba(0,0,0,0.55)",
          overflow:"hidden",background:"#1a1a1a",
          display:"flex",alignItems:"center",justifyContent:"center",
        }}>
          {emp.photoUrl ? (
            <img src={emp.photoUrl} alt={emp.name} crossOrigin="anonymous"
              style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
          ) : (
            <span style={{ fontSize:"22px",fontWeight:700,color:ACCENT }}>{initials(emp.name)}</span>
          )}
        </div>
      </div>

      {/* ── NAME + ROLE (top:145, height:44) ── */}
      <div style={{
        position:"absolute",top:"145px",left:"8px",right:"8px",height:"44px",
        textAlign:"center",display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",gap:"4px",
      }}>
        <div style={{
          fontSize:"13px",fontWeight:700,color:"#FFFFFF",
          lineHeight:1.1,letterSpacing:"0.005em",
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
          maxWidth:"188px",
        }}>
          {emp.name || "—"}
        </div>
        <div style={{
          display:"inline-flex",alignItems:"center",
          background:"rgba(204,0,0,0.16)",border:"1px solid rgba(204,0,0,0.32)",
          borderRadius:"4px",padding:"2px 8px",maxWidth:"180px",overflow:"hidden",
        }}>
          <span style={{ fontSize:"6.5px",color:"#FF8888",fontWeight:700,
            letterSpacing:"0.06em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
            {emp.role || "Employee"}
          </span>
        </div>
      </div>

      {/* separator (top:189) */}
      <div style={{ position:"absolute",top:"189px",left:"14px",right:"14px",height:"1px",
        background:"linear-gradient(90deg,transparent,rgba(204,0,0,0.32),transparent)" }}/>

      {/* ── INFO FIELDS (top:191, height:99 — leaves 34px for footer) ── */}
      <div style={{
        position:"absolute",top:"191px",left:"12px",right:"12px",bottom:"34px",
        display:"flex",flexDirection:"column",justifyContent:"flex-start",gap:"0px",
        overflow:"hidden",
      }}>
        {/* EMP ID row */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"center",
          background:"rgba(204,0,0,0.10)",border:"1px solid rgba(204,0,0,0.28)",
          borderRadius:"5px",padding:"3px 8px",marginBottom:"5px",
        }}>
          <span style={{ fontSize:"5.5px",color:ACCENT,fontWeight:700,
            letterSpacing:"0.14em",marginRight:"6px",lineHeight:1 }}>EMP ID</span>
          <span style={{ fontSize:"8px",color:"#FFF",
            fontFamily:"'Courier New',Courier,monospace",fontWeight:700,
            letterSpacing:"0.05em",lineHeight:1 }}>
            {emp.id || "—"}
          </span>
        </div>

        {/* Data rows */}
        {[
          ["DEPT",  emp.department],
          ["EMAIL", emp.email],
          ["PHONE", emp.phone],
          ["JOIN",  emp.joinDate],
        ].filter(([,v]) => v).map(([label, value]) => (
          <div key={label} style={{
            display:"flex",alignItems:"baseline",gap:"5px",
            marginBottom:"3px",minHeight:"13px",
          }}>
            <span style={{
              fontSize:"5px",color:ACCENT,fontWeight:700,
              letterSpacing:"0.16em",minWidth:"26px",flexShrink:0,lineHeight:"13px",
            }}>
              {label}
            </span>
            <span style={{
              fontSize:"6.5px",color:"#BBBBBB",lineHeight:"13px",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,
            }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── FOOTER (bottom:0, height:34) ── */}
      <div style={{ position:"absolute",bottom:"1px",left:0,right:0,height:"1px",
        background:"rgba(204,0,0,0.28)" }}/>
      <div style={{
        position:"absolute",bottom:0,left:0,right:0,height:"33px",
        background:"linear-gradient(90deg,#9A0000,#CC0000,#9A0000)",
        display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 10px",
      }}>
        <span style={{ fontSize:"5px",color:"rgba(255,255,255,0.85)",
          letterSpacing:"0.06em",overflow:"hidden",textOverflow:"ellipsis",
          whiteSpace:"nowrap",maxWidth:"100px" }}>
          {CO_WEBSITE}
        </span>
        <div style={{ display:"flex",gap:"1.5px",alignItems:"center",flexShrink:0 }}>
          {[2,4,2,3,2,5,2,3,2,4,2].map((h,i) => (
            <div key={i} style={{ width:"1.5px",height:`${h}px`,background:"rgba(255,255,255,0.55)" }}/>
          ))}
        </div>
        <span style={{ fontSize:"5px",color:"rgba(255,255,255,0.75)",
          letterSpacing:"0.04em",flexShrink:0 }}>
          {CO_PHONE}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  HORIZONTAL CARD  — 324 × 204 px (= 85.6mm × 54mm at 96dpi)
// ─────────────────────────────────────────────────────────────
function IdCardHorizontal({ emp, cardRef }) {
  const [logoErr, setLogoErr] = useState(false);
  const hasLogo = !logoErr && LOGO_URL && !LOGO_URL.includes("YOUR_CLOUD_NAME");

  // Layout: top bar:4 | header row:34 | sep:1 | body:131 | footer:34 = 204 ✓
  // Body split: left 116px (photo+id), right 208px (fields)

  return (
    <div
      ref={cardRef}
      style={{
        width:`${H_W}px`, height:`${H_H}px`,
        borderRadius:"12px",
        background:"linear-gradient(135deg,#0d0d0d 0%,#181818 55%,#0f0f0f 100%)",
        position:"relative",overflow:"hidden",flexShrink:0,
        boxShadow:"0 16px 48px rgba(0,0,0,0.60),0 0 0 1px rgba(255,255,255,0.04)",
        fontFamily:"Arial,Helvetica,sans-serif",
      }}
    >
      {/* accent */}
      <div style={{ position:"absolute",top:0,left:0,right:0,height:"4px",
        background:"linear-gradient(90deg,#990000,#FF3333,#990000)" }}/>
      <div style={{ position:"absolute",right:"-30px",top:"-30px",width:"120px",height:"120px",
        borderRadius:"50%",border:"1px solid rgba(204,0,0,0.08)",pointerEvents:"none" }}/>
      <div style={{ position:"absolute",inset:0,pointerEvents:"none",
        backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.014) 1px,transparent 1px)",
        backgroundSize:"12px 12px" }}/>

      {/* ── HEADER ROW (top:4, height:34) ── */}
      <div style={{
        position:"absolute",top:"4px",left:"10px",right:"10px",height:"34px",
        display:"flex",alignItems:"center",gap:"8px",
      }}>
        <div style={{
          width:"26px",height:"26px",borderRadius:"6px",
          background:"rgba(204,0,0,0.12)",border:"1.5px solid rgba(204,0,0,0.30)",
          display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0,
        }}>
          {hasLogo ? (
            <img src={getOptimizedUrl?getOptimizedUrl(LOGO_URL):LOGO_URL}
              alt="logo" crossOrigin="anonymous"
              style={{ width:"100%",height:"100%",objectFit:"contain" }}
              onError={()=>setLogoErr(true)}/>
          ) : (
            <span style={{ fontSize:"8px",fontWeight:700,color:ACCENT }}>{CO_INIT}</span>
          )}
        </div>
        <div style={{ borderLeft:"1px solid rgba(204,0,0,0.28)",paddingLeft:"8px",flex:1,overflow:"hidden" }}>
          <div style={{ fontSize:"6px",color:ACCENT,fontWeight:700,
            letterSpacing:"0.18em",textTransform:"uppercase",lineHeight:1.3 }}>
            EMPLOYEE IDENTITY CARD
          </div>
          <div style={{ fontSize:"5.5px",color:"#666",letterSpacing:"0.05em",lineHeight:1.3 }}>
            {CO_NAME}
          </div>
        </div>
      </div>

      {/* separator (top:38) */}
      <div style={{ position:"absolute",top:"38px",left:"10px",right:"10px",height:"1px",
        background:"linear-gradient(90deg,transparent,rgba(204,0,0,0.35),transparent)" }}/>

      {/* vertical divider (left:116) */}
      <div style={{ position:"absolute",left:"116px",top:"40px",bottom:"34px",width:"1px",
        background:"linear-gradient(180deg,transparent,rgba(204,0,0,0.35),transparent)" }}/>

      {/* ── LEFT: photo + id (left:10, top:40, width:106) ── */}
      <div style={{
        position:"absolute",left:"10px",top:"40px",width:"106px",bottom:"34px",
        display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",gap:"6px",
      }}>
        {/* photo */}
        <div style={{
          width:"64px",height:"64px",borderRadius:"8px",
          border:"2px solid #CC0000",
          boxShadow:"0 0 0 3px rgba(204,0,0,0.12),0 4px 12px rgba(0,0,0,0.50)",
          overflow:"hidden",background:"#1a1a1a",
          display:"flex",alignItems:"center",justifyContent:"center",
        }}>
          {emp.photoUrl ? (
            <img src={emp.photoUrl} alt={emp.name} crossOrigin="anonymous"
              style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
          ) : (
            <span style={{ fontSize:"20px",fontWeight:700,color:ACCENT }}>{initials(emp.name)}</span>
          )}
        </div>
        {/* id badge */}
        <div style={{
          background:"rgba(204,0,0,0.10)",border:"1px solid rgba(204,0,0,0.28)",
          borderRadius:"4px",padding:"2px 6px",textAlign:"center",
          width:"90px",boxSizing:"border-box",
        }}>
          <div style={{ fontSize:"5px",color:ACCENT,letterSpacing:"0.14em",fontWeight:700,lineHeight:1.3 }}>
            EMP ID
          </div>
          <div style={{
            fontSize:"7px",color:"#FFF",fontFamily:"'Courier New',Courier,monospace",
            fontWeight:700,lineHeight:1.3,letterSpacing:"0.04em",
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
          }}>
            {emp.id || "—"}
          </div>
        </div>
      </div>

      {/* ── RIGHT: details (left:124, top:40, right:10) ── */}
      <div style={{
        position:"absolute",left:"124px",top:"40px",right:"10px",bottom:"34px",
        display:"flex",flexDirection:"column",justifyContent:"center",gap:"4px",
      }}>
        {/* name */}
        <div style={{
          fontSize:"12px",fontWeight:700,color:"#FFF",lineHeight:1.2,
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
        }}>
          {emp.name || "—"}
        </div>
        {/* role */}
        <div style={{
          display:"inline-flex",alignSelf:"flex-start",
          background:"rgba(204,0,0,0.15)",border:"1px solid rgba(204,0,0,0.30)",
          borderRadius:"3px",padding:"2px 6px",
          maxWidth:"180px",overflow:"hidden",
        }}>
          <span style={{ fontSize:"6px",color:"#FF8888",fontWeight:700,
            letterSpacing:"0.05em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
            {emp.role || "Employee"}
          </span>
        </div>
        {/* info rows */}
        {[
          ["DEPT",  emp.department],
          ["EMAIL", emp.email],
          ["PHONE", emp.phone],
          ["JOIN",  emp.joinDate],
        ].filter(([,v]) => v).map(([label, value]) => (
          <div key={label} style={{ display:"flex",alignItems:"baseline",gap:"5px",minHeight:"12px" }}>
            <span style={{
              fontSize:"5px",color:ACCENT,fontWeight:700,
              letterSpacing:"0.14em",minWidth:"24px",flexShrink:0,lineHeight:"12px",
            }}>
              {label}
            </span>
            <span style={{
              fontSize:"6.5px",color:"#BBBBB",lineHeight:"12px",
              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1,
            }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── FOOTER (bottom:0, height:33) ── */}
      <div style={{ position:"absolute",bottom:"33px",left:0,right:0,height:"1px",
        background:"rgba(204,0,0,0.28)" }}/>
      <div style={{
        position:"absolute",bottom:0,left:0,right:0,height:"33px",
        background:"linear-gradient(90deg,#9A0000,#CC0000,#9A0000)",
        display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 10px",
      }}>
        <span style={{ fontSize:"5px",color:"rgba(255,255,255,0.85)",letterSpacing:"0.06em",
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"130px" }}>
          {CO_WEBSITE}
        </span>
        <div style={{ display:"flex",gap:"1.5px",alignItems:"center",flexShrink:0 }}>
          {[2,4,2,3,2,5,2,3,2,4,2].map((h,i) => (
            <div key={i} style={{ width:"1.5px",height:`${h}px`,background:"rgba(255,255,255,0.55)" }}/>
          ))}
        </div>
        <span style={{ fontSize:"5px",color:"rgba(255,255,255,0.75)",letterSpacing:"0.04em",flexShrink:0 }}>
          {CO_PHONE}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  CUSTOM TEMPLATE CARD (from IdCardTemplateBuilder)
// ─────────────────────────────────────────────────────────────
const FIELD_LABEL = {
  name:"NAME", id:"EMP ID", role:"ROLE", department:"DEPT",
  email:"EMAIL", phone:"PHONE", joinDate:"JOIN", bloodGroup:"BLOOD", address:"ADDR",
};

function CustomCard({ emp, tpl, cardRef }) {
  const isH    = tpl.orientation === "horizontal";
  const W      = isH ? H_W : V_W;
  const H      = isH ? H_H : V_H;
  const fs     = tpl.fontScale || 1;
  const photoR = tpl.photoShape === "circle" ? "50%" : tpl.photoShape === "rounded" ? "10px" : "4px";
  const accent = tpl.accentColor || ACCENT;
  const [logoErr, setLogoErr] = useState(false);
  const val = k => emp[k] || "—";

  return (
    <div ref={cardRef} style={{
      width:`${W}px`, height:`${H}px`,
      borderRadius:"12px",
      background:`linear-gradient(${isH?"135deg":"175deg"},${tpl.bgColorTop||"#0d0d0d"},${tpl.bgColorBot||"#181818"})`,
      position:"relative",overflow:"hidden",flexShrink:0,
      boxShadow:"0 16px 48px rgba(0,0,0,0.60),0 0 0 1px rgba(255,255,255,0.04)",
      fontFamily:"Arial,Helvetica,sans-serif",
    }}>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:"4px",
        background:`linear-gradient(90deg,${accent},${accent}bb,${accent})` }}/>
      {tpl.bgImageUrl && (
        <div style={{ position:"absolute",inset:0,zIndex:0,
          backgroundImage:`url(${tpl.bgImageUrl})`,backgroundSize:"cover",backgroundPosition:"center",
          opacity:tpl.bgOpacity??0.12,pointerEvents:"none" }}/>
      )}
      <div style={{ position:"absolute",inset:0,pointerEvents:"none",zIndex:0,
        backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.014) 1px,transparent 1px)",
        backgroundSize:"12px 12px" }}/>

      {/* ── HORIZONTAL layout ── */}
      {isH ? (
        <>
          {tpl.showHeader !== false && (
            <div style={{ position:"absolute",top:"4px",left:"10px",right:"10px",height:"34px",
              display:"flex",alignItems:"center",gap:"8px",zIndex:1 }}>
              <div style={{ width:"26px",height:"26px",borderRadius:"6px",
                background:`${accent}22`,border:`1.5px solid ${accent}44`,
                display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0 }}>
                {!logoErr && tpl.logoUrl ? (
                  <img src={getOptimizedUrl(tpl.logoUrl)} alt="logo" crossOrigin="anonymous"
                    style={{ width:"100%",height:"100%",objectFit:"contain" }}
                    onError={()=>setLogoErr(true)}/>
                ) : (
                  <span style={{ fontSize:"8px",fontWeight:700,color:accent }}>
                    {tpl.logoFallback||CO_INIT}
                  </span>
                )}
              </div>
              <div style={{ borderLeft:`1px solid ${accent}30`,paddingLeft:"8px",flex:1,overflow:"hidden" }}>
                <div style={{ fontSize:`${6*fs}px`,color:accent,fontWeight:700,
                  letterSpacing:"0.18em",textTransform:"uppercase",lineHeight:1.3 }}>
                  EMPLOYEE IDENTITY CARD
                </div>
                <div style={{ fontSize:`${5.5*fs}px`,color:tpl.subTextColor||"#666",
                  letterSpacing:"0.05em",lineHeight:1.3 }}>
                  {tpl.companyName||CO_NAME}
                </div>
              </div>
            </div>
          )}
          <div style={{ position:"absolute",top:"38px",left:"10px",right:"10px",height:"1px",
            background:`linear-gradient(90deg,transparent,${accent}35,transparent)`,zIndex:1 }}/>
          <div style={{ position:"absolute",left:"116px",top:"40px",bottom:"34px",width:"1px",
            background:`linear-gradient(180deg,transparent,${accent}35,transparent)`,zIndex:1 }}/>

          {tpl.showPhoto !== false && (
            <div style={{ position:"absolute",left:"10px",top:"40px",width:"106px",bottom:"34px",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"6px",zIndex:2 }}>
              <div style={{ width:"62px",height:"62px",borderRadius:photoR,
                border:`2px solid ${accent}`,boxShadow:`0 0 0 3px ${accent}22`,
                overflow:"hidden",background:"#1a1a1a",
                display:"flex",alignItems:"center",justifyContent:"center" }}>
                {emp.photoUrl
                  ? <img src={emp.photoUrl} alt={emp.name} crossOrigin="anonymous"
                      style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                  : <span style={{ fontSize:"19px",fontWeight:700,color:accent }}>{initials(emp.name)}</span>
                }
              </div>
              {(tpl.fields||[]).includes("id") && (
                <div style={{ background:`${accent}18`,border:`1px solid ${accent}40`,
                  borderRadius:"4px",padding:"2px 6px",textAlign:"center",width:"90px",boxSizing:"border-box" }}>
                  <div style={{ fontSize:`${5*fs}px`,color:accent,fontWeight:700,letterSpacing:"0.12em",lineHeight:1.3 }}>EMP ID</div>
                  <div style={{ fontSize:`${7*fs}px`,color:tpl.textColor||"#FFF",
                    fontFamily:"'Courier New',monospace",fontWeight:700,lineHeight:1.3,
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                    {emp.id||"—"}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ position:"absolute",left:"124px",top:"40px",right:"10px",bottom:"34px",
            display:"flex",flexDirection:"column",justifyContent:"center",gap:"4px",zIndex:2 }}>
            <div style={{ fontSize:`${12*fs}px`,fontWeight:700,color:tpl.textColor||"#FFF",
              lineHeight:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
              {emp.name||"—"}
            </div>
            {(tpl.fields||[]).includes("role") && (
              <div style={{ display:"inline-flex",alignSelf:"flex-start",
                background:`${accent}22`,border:`1px solid ${accent}40`,
                borderRadius:"3px",padding:"2px 6px",maxWidth:"175px",overflow:"hidden" }}>
                <span style={{ fontSize:`${6*fs}px`,color:`${accent}ee`,fontWeight:700,
                  letterSpacing:"0.05em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                  {emp.role||"—"}
                </span>
              </div>
            )}
            {(tpl.fields||[]).filter(k=>!["name","id","role"].includes(k)).slice(0,4).map(k=>(
              <div key={k} style={{ display:"flex",alignItems:"baseline",gap:"5px",minHeight:"12px" }}>
                <span style={{ fontSize:`${5*fs}px`,color:tpl.labelColor||accent,fontWeight:700,
                  letterSpacing:"0.14em",minWidth:"24px",flexShrink:0,lineHeight:"12px" }}>
                  {(FIELD_LABEL[k]||k).slice(0,5)}
                </span>
                <span style={{ fontSize:`${6.5*fs}px`,color:tpl.subTextColor||"#BBBBBB",
                  lineHeight:"12px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1 }}>
                  {val(k)}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ── VERTICAL layout ── */
        <>
          {tpl.showHeader !== false && (
            <div style={{ position:"absolute",top:"4px",left:0,right:0,height:"68px",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              gap:"4px",padding:"0 10px",zIndex:1 }}>
              <div style={{ width:"36px",height:"36px",borderRadius:"8px",
                background:`${accent}22`,border:`1px solid ${accent}44`,
                display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden" }}>
                {!logoErr && tpl.logoUrl ? (
                  <img src={getOptimizedUrl(tpl.logoUrl)} alt="logo" crossOrigin="anonymous"
                    style={{ width:"100%",height:"100%",objectFit:"contain" }}
                    onError={()=>setLogoErr(true)}/>
                ) : (
                  <span style={{ fontSize:"11px",fontWeight:700,color:accent }}>
                    {tpl.logoFallback||CO_INIT}
                  </span>
                )}
              </div>
              <div style={{ textAlign:"center",lineHeight:1.3 }}>
                <div style={{ fontSize:`${6*fs}px`,color:accent,fontWeight:700,
                  letterSpacing:"0.20em",textTransform:"uppercase" }}>EMPLOYEE ID CARD</div>
                <div style={{ fontSize:`${5.5*fs}px`,color:tpl.subTextColor||"#666",marginTop:"1px" }}>
                  {tpl.companyName||CO_NAME}
                </div>
              </div>
            </div>
          )}

          <div style={{ position:"absolute",top:"72px",left:"14px",right:"14px",height:"1px",
            background:`linear-gradient(90deg,transparent,${accent}40,transparent)`,zIndex:1 }}/>

          {tpl.showPhoto !== false && (
            <div style={{ position:"absolute",top:"73px",left:"50%",transform:"translateX(-50%)",zIndex:2 }}>
              <div style={{ width:"64px",height:"64px",borderRadius:photoR,
                border:`2px solid ${accent}`,boxShadow:`0 0 0 3px ${accent}22`,
                overflow:"hidden",background:"#1a1a1a",
                display:"flex",alignItems:"center",justifyContent:"center" }}>
                {emp.photoUrl
                  ? <img src={emp.photoUrl} alt={emp.name} crossOrigin="anonymous"
                      style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                  : <span style={{ fontSize:"20px",fontWeight:700,color:accent }}>{initials(emp.name)}</span>
                }
              </div>
            </div>
          )}

          <div style={{ position:"absolute",top:"145px",left:"8px",right:"8px",height:"44px",
            textAlign:"center",display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",gap:"4px",zIndex:2 }}>
            <div style={{ fontSize:`${13*fs}px`,fontWeight:700,color:tpl.textColor||"#FFF",
              lineHeight:1.1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"188px" }}>
              {emp.name||"—"}
            </div>
            {(tpl.fields||[]).includes("role") && (
              <div style={{ display:"inline-flex",
                background:`${accent}22`,border:`1px solid ${accent}40`,
                borderRadius:"4px",padding:"2px 8px",maxWidth:"180px",overflow:"hidden" }}>
                <span style={{ fontSize:`${6.5*fs}px`,color:`${accent}ee`,fontWeight:700,
                  letterSpacing:"0.06em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                  {emp.role||"—"}
                </span>
              </div>
            )}
          </div>

          <div style={{ position:"absolute",top:"189px",left:"14px",right:"14px",height:"1px",
            background:`linear-gradient(90deg,transparent,${accent}32,transparent)`,zIndex:1 }}/>

          <div style={{ position:"absolute",top:"191px",left:"12px",right:"12px",bottom:"34px",
            display:"flex",flexDirection:"column",gap:"0px",overflow:"hidden",zIndex:2 }}>
            {(tpl.fields||[]).includes("id") && (
              <div style={{ display:"flex",alignItems:"center",justifyContent:"center",
                background:`${accent}18`,border:`1px solid ${accent}40`,
                borderRadius:"5px",padding:"3px 8px",marginBottom:"5px" }}>
                <span style={{ fontSize:`${5.5*fs}px`,color:tpl.labelColor||accent,fontWeight:700,
                  letterSpacing:"0.14em",marginRight:"6px",lineHeight:1 }}>EMP ID</span>
                <span style={{ fontSize:`${8*fs}px`,color:tpl.textColor||"#FFF",
                  fontFamily:"'Courier New',monospace",fontWeight:700,lineHeight:1 }}>
                  {emp.id||"—"}
                </span>
              </div>
            )}
            {(tpl.fields||[]).filter(k=>!["name","id","role"].includes(k)).slice(0,5).map(k=>(
              <div key={k} style={{ display:"flex",alignItems:"baseline",gap:"5px",marginBottom:"3px",minHeight:"13px" }}>
                <span style={{ fontSize:`${5*fs}px`,color:tpl.labelColor||accent,fontWeight:700,
                  letterSpacing:"0.14em",minWidth:"26px",flexShrink:0,lineHeight:"13px" }}>
                  {(FIELD_LABEL[k]||k).slice(0,5)}
                </span>
                <span style={{ fontSize:`${6.5*fs}px`,color:tpl.subTextColor||"#BBBBBB",
                  lineHeight:"13px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1 }}>
                  {val(k)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* shared footer */}
      <div style={{ position:"absolute",bottom:"33px",left:0,right:0,height:"1px",
        background:`${accent}40`,zIndex:2 }}/>
      <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"33px",
        background:`linear-gradient(90deg,${accent}cc,${accent},${accent}cc)`,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"0 10px",zIndex:3 }}>
        <span style={{ fontSize:`${5*fs}px`,color:"rgba(255,255,255,0.85)",letterSpacing:"0.06em",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"120px" }}>
          {tpl.website||CO_WEBSITE}
        </span>
        {tpl.showBarcode !== false && (
          <div style={{ display:"flex",gap:"1.5px",alignItems:"center",flexShrink:0 }}>
            {[2,4,2,3,2,5,2,3,2].map((h,i) => (
              <div key={i} style={{ width:"1.5px",height:`${h}px`,background:"rgba(255,255,255,0.55)" }}/>
            ))}
          </div>
        )}
        <span style={{ fontSize:`${5*fs}px`,color:"rgba(255,255,255,0.75)",
          letterSpacing:"0.04em",flexShrink:0 }}>
          {tpl.phone||CO_PHONE}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  PRINT PREVIEW MODAL
//  Renders the card at 1.5× scale for the admin to review,
//  but the actual PDF is rendered from the card at 1× (exact px).
// ─────────────────────────────────────────────────────────────
function PrintPreviewModal({ emp, orientation, customTpl, onConfirm, onCancel, downloading }) {
  const printRef = useRef(null);
  const isH = (customTpl?.orientation ?? orientation) === "horizontal";
  const [generated, setGenerated] = useState(false);

  const handleConfirm = async () => {
    if (!printRef.current) return;
    setGenerated(false);
    await onConfirm(printRef);
    setGenerated(true);
  };

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:1000,
      background:"rgba(0,0,0,0.82)",backdropFilter:"blur(6px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"20px",
    }}>
      <div style={{
        background:"#111",borderRadius:"16px",
        border:"1px solid #222",
        boxShadow:"0 40px 120px rgba(0,0,0,0.85)",
        maxWidth:"560px",width:"100%",overflow:"hidden",
        display:"flex",flexDirection:"column",
      }}>
        {/* header */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"16px 20px",borderBottom:"1px solid #1e1e1e",
        }}>
          <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
            <div style={{
              width:"34px",height:"34px",borderRadius:"8px",
              background:"rgba(204,0,0,0.12)",border:"1px solid rgba(204,0,0,0.25)",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>
              <Eye size={15} style={{ color:ACCENT }}/>
            </div>
            <div>
              <div style={{ fontFamily:"Rajdhani,sans-serif",fontWeight:700,fontSize:"16px",color:"#F0F0F0" }}>
                Print Preview
              </div>
              <div style={{ fontFamily:"Mulish,sans-serif",fontSize:"11px",color:"#555" }}>
                Review carefully — this is exactly what will be printed
              </div>
            </div>
          </div>
          <button onClick={onCancel}
            style={{ background:"none",border:"none",cursor:"pointer",color:"#444",padding:"4px" }}>
            <X size={18}/>
          </button>
        </div>

        {/* preview area — card shown at 1.4× via CSS transform for visual comfort */}
        <div style={{
          background:"#080808",
          display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",padding:"32px 24px",gap:"16px",
          minHeight: isH ? "340px" : "540px",
        }}>
          <div style={{ fontSize:"9px",fontFamily:"'Share Tech Mono',monospace",
            color:"#333",letterSpacing:"0.15em",textTransform:"uppercase" }}>
            ── ACTUAL PRINT SIZE PREVIEW ──
          </div>

          {/* Scale wrapper — purely visual, html2canvas targets the inner ref */}
          <div style={{ transform:"scale(1.35)",transformOrigin:"center center",
            margin: isH ? "14px 0" : "52px 0" }}>
            {customTpl ? (
              <CustomCard emp={emp} tpl={customTpl} cardRef={printRef}/>
            ) : isH ? (
              <IdCardHorizontal emp={emp} cardRef={printRef}/>
            ) : (
              <IdCardVertical emp={emp} cardRef={printRef}/>
            )}
          </div>

          <div style={{ fontFamily:"Rajdhani,sans-serif",fontSize:"12px",
            fontWeight:700,color:"#444",letterSpacing:"0.05em" }}>
            {emp.name} &nbsp;·&nbsp; {emp.id}
          </div>
        </div>

        {/* info strip */}
        <div style={{
          background:"rgba(204,0,0,0.06)",borderTop:"1px solid rgba(204,0,0,0.15)",
          borderBottom:"1px solid #1a1a1a",padding:"10px 20px",
          display:"flex",gap:"20px",flexWrap:"wrap",
        }}>
          {[
            ["Format", "CR80 ID Card"],
            ["Size",   isH ? "85.6 × 54 mm" : "54 × 85.6 mm"],
            ["Output", "PDF, 300+ dpi"],
          ].map(([k,v]) => (
            <div key={k} style={{ display:"flex",gap:"6px",alignItems:"center" }}>
              <span style={{ fontSize:"10px",color:"#555",fontFamily:"Mulish,sans-serif" }}>{k}:</span>
              <span style={{ fontSize:"10px",color:"#999",fontWeight:600,fontFamily:"Mulish,sans-serif" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* actions */}
        <div style={{
          display:"flex",gap:"10px",padding:"16px 20px",
          justifyContent:"flex-end",borderTop:"1px solid #1a1a1a",
        }}>
          <button onClick={onCancel}
            style={{
              padding:"9px 18px",borderRadius:"8px",
              border:"1px solid #2a2a2a",background:"transparent",
              color:"#777",cursor:"pointer",
              fontFamily:"Rajdhani,sans-serif",fontWeight:700,
              fontSize:"12px",letterSpacing:"0.05em",
            }}>
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            disabled={downloading}
            style={{
              padding:"9px 22px",borderRadius:"8px",border:"none",
              background: downloading ? "rgba(204,0,0,0.45)" : ACCENT,
              color:"#FFF",cursor: downloading ? "not-allowed" : "pointer",
              fontFamily:"Rajdhani,sans-serif",fontWeight:700,
              fontSize:"12px",letterSpacing:"0.06em",
              display:"flex",alignItems:"center",gap:"8px",transition:"all 200ms",
            }}>
            {downloading
              ? <><Spinner size={12} color="#FFF"/>&nbsp;GENERATING PDF…</>
              : <><Printer size={13}/> CONFIRM & DOWNLOAD</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PDF download ──────────────────────────────────────────────
async function downloadCard(cardEl, emp, orientation) {
  const { jsPDF, html2canvas } = await loadLibs();
  // Temporarily remove CSS transform (if inside scaled preview wrapper)
  // by reading the element directly — the ref always points to the card div
  const canvas = await html2canvas(cardEl, {
    scale: 4,          // 4× → crisp 300+ dpi output
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false,
    // Override any parent CSS transforms so the card captures at true size
    onclone: (clonedDoc) => {
      const clonedEl = clonedDoc.querySelector(`[data-card-id]`);
      if (clonedEl) clonedEl.style.transform = "none";
    },
  });
  const imgData = canvas.toDataURL("image/png");
  const isH = orientation === "horizontal";
  const W = isH ? 85.6 : 54;
  const H = isH ? 54   : 85.6;
  const jdoc = new jsPDF({ orientation: isH ? "landscape" : "portrait", unit:"mm", format:[W,H] });
  jdoc.addImage(imgData, "PNG", 0, 0, W, H);
  const safe = (emp.name || "Employee").replace(/\s+/g, "_");
  jdoc.save(`IDCard_${safe}_${emp.id || "RWT"}.pdf`);
}

async function downloadAllCards(refs, employees, orientation) {
  const { jsPDF, html2canvas } = await loadLibs();
  const isH = orientation === "horizontal";
  const W = isH ? 85.6 : 54;
  const H = isH ? 54   : 85.6;
  const jdoc = new jsPDF({ orientation: isH ? "landscape" : "portrait", unit:"mm", format:[W,H] });
  for (let i = 0; i < refs.current.length; i++) {
    const el = refs.current[i];
    if (!el) continue;
    const canvas = await html2canvas(el, {
      scale:4, useCORS:true, allowTaint:true,
      backgroundColor:null, logging:false,
    });
    if (i > 0) jdoc.addPage([W,H], isH ? "landscape" : "portrait");
    jdoc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, W, H);
  }
  jdoc.save("RWT_All_ID_Cards.pdf");
}

function Spinner({ size = 16, color = ACCENT }) {
  return (
    <div style={{
      width:`${size}px`,height:`${size}px`,borderRadius:"50%",
      border:`2px solid rgba(204,0,0,0.20)`,borderTopColor:color,
      animation:"spin 0.7s linear infinite",flexShrink:0,
    }}/>
  );
}

// ─────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function IdCards() {
  const { theme }                      = useTheme();
  const navigate                       = useNavigate();
  const isDark                         = theme === "dark";

  const [employees,   setEmployees]    = useState([]);
  const [filtered,    setFiltered]     = useState([]);
  const [search,      setSearch]       = useState("");
  const [loading,     setLoading]      = useState(true);
  const [deptFilter,  setDeptFilter]   = useState("All");
  const [orientation, setOrientation]  = useState("vertical");
  const [activeTab,   setActiveTab]    = useState("standard");

  const [templates,        setTemplates]        = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [deletingTpl,      setDeletingTpl]      = useState(null);

  const [previewEmp,     setPreviewEmp]     = useState(null);
  const [previewTpl,     setPreviewTpl]     = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [successId,      setSuccessId]      = useState(null);
  const [dlAll,          setDlAll]          = useState(false);
  const [doneAll,        setDoneAll]        = useState(false);

  const cardRefs = useRef([]);

  const bg     = isDark ? "#0A0A0A" : "#F4F4F4";
  const card   = isDark ? "#111111" : "#FFFFFF";
  const border = isDark ? "#1E1E1E" : "#E0E0E0";
  const text   = isDark ? "#F0F0F0" : "#111111";
  const sub    = isDark ? "#666666" : "#888888";

  useEffect(() => {
    const unsub = subscribeEmployees(emps => {
      setEmployees(emps); setFiltered(emps); setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    let res = employees;
    if (deptFilter !== "All") res = res.filter(e => e.department === deptFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(e =>
        (e.name||"").toLowerCase().includes(q) ||
        (e.email||"").toLowerCase().includes(q) ||
        (e.id||"").toLowerCase().includes(q) ||
        (e.role||"").toLowerCase().includes(q)
      );
    }
    setFiltered(res);
    cardRefs.current = new Array(res.length).fill(null);
  }, [search, deptFilter, employees]);

  const departments = ["All", ...new Set(employees.map(e => e.department).filter(Boolean))];

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const snap = await getDocs(collection(db, "idcard_templates"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTemplates(list);
      if (!selectedTemplate && list.length > 0) setSelectedTemplate(list[0].id);
    } catch (err) { console.error(err); }
    finally { setTemplatesLoading(false); }
  }, [selectedTemplate]);

  useEffect(() => {
    if (activeTab === "templates") fetchTemplates();
  }, [activeTab]);

  const handleDeleteTemplate = async tplId => {
    if (!window.confirm("Delete this template? This cannot be undone.")) return;
    setDeletingTpl(tplId);
    try {
      await deleteDoc(doc(db, "idcard_templates", tplId));
      setTemplates(prev => prev.filter(t => t.id !== tplId));
      if (selectedTemplate === tplId) {
        const rem = templates.filter(t => t.id !== tplId);
        setSelectedTemplate(rem.length ? rem[0].id : null);
      }
    } catch (err) { alert("Failed to delete: " + err.message); }
    finally { setDeletingTpl(null); }
  };

  const openPreview = (emp, tplConfig = null) => {
    setPreviewEmp(emp);
    setPreviewTpl(tplConfig);
    setDownloadingPdf(false);
  };

  const handleConfirmDownload = async (printRef) => {
    if (!printRef.current) return;
    setDownloadingPdf(true);
    try {
      const orient = previewTpl ? (previewTpl.orientation || "vertical") : orientation;
      await downloadCard(printRef.current, previewEmp, orient);
      setSuccessId(previewEmp.id);
      setTimeout(() => setSuccessId(null), 3000);
      setPreviewEmp(null);
    } catch (err) {
      console.error(err);
      alert("PDF generation failed. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadAll = async () => {
    setDlAll(true);
    try {
      const activeTpl = templates.find(t => t.id === selectedTemplate);
      const orient = activeTab === "templates" && activeTpl
        ? (activeTpl.config?.orientation || "vertical") : orientation;
      await downloadAllCards(cardRefs, filtered, orient);
      setDoneAll(true);
      setTimeout(() => setDoneAll(false), 3000);
    } catch (err) { console.error(err); }
    finally { setDlAll(false); }
  };

  const activeTplObj = templates.find(t => t.id === selectedTemplate);
  const gridMin = orientation === "horizontal" ? "350px" : "230px";

  return (
    <div style={{ minHeight:"100vh",background:bg }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Print Preview Modal */}
      {previewEmp && (
        <PrintPreviewModal
          emp={previewEmp}
          orientation={orientation}
          customTpl={previewTpl}
          onConfirm={handleConfirmDownload}
          onCancel={() => setPreviewEmp(null)}
          downloading={downloadingPdf}
        />
      )}

      {/* ── Page Header ── */}
      <div style={{
        background:card,border:`1px solid ${border}`,borderRadius:"12px",
        padding:"18px 22px",marginBottom:"20px",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        flexWrap:"wrap",gap:"12px",
      }}>
        <div style={{ display:"flex",alignItems:"center",gap:"14px" }}>
          <div style={{
            width:"44px",height:"44px",borderRadius:"10px",
            background:"rgba(204,0,0,0.10)",border:"1px solid rgba(204,0,0,0.25)",
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>
            <CreditCard size={22} style={{ color:ACCENT }}/>
          </div>
          <div>
            <h2 style={{ fontFamily:"Rajdhani,sans-serif",fontWeight:700,fontSize:"22px",color:text,margin:0 }}>
              ID Cards
            </h2>
            <p style={{ fontFamily:"Mulish,sans-serif",fontSize:"12px",color:sub,margin:0 }}>
              Preview &amp; download employee ID cards as print-ready PDFs
            </p>
          </div>
        </div>

        <div style={{ display:"flex",gap:"10px",flexWrap:"wrap",alignItems:"center" }}>
          <div style={{
            background:isDark?"#0A0A0A":"#F5F5F5",border:`1px solid ${border}`,
            borderRadius:"8px",padding:"8px 14px",
            display:"flex",alignItems:"center",gap:"8px",
          }}>
            <Users size={14} style={{ color:"#00B8B8" }}/>
            <span style={{ fontFamily:"Rajdhani,sans-serif",fontWeight:700,fontSize:"14px",color:text }}>
              {filtered.length}
            </span>
            <span style={{ fontFamily:"Mulish,sans-serif",fontSize:"11px",color:sub }}>cards</span>
          </div>

          <button onClick={() => navigate("/idcard-template")}
            style={{
              display:"flex",alignItems:"center",gap:"6px",
              padding:"9px 14px",borderRadius:"8px",cursor:"pointer",
              background:"rgba(0,184,184,0.10)",border:"1px solid rgba(0,184,184,0.30)",
              color:"#00B8B8",fontFamily:"Rajdhani,sans-serif",
              fontWeight:700,fontSize:"12px",letterSpacing:"0.05em",
            }}>
            <Palette size={14}/> TEMPLATE BUILDER
          </button>

          {activeTab === "standard" && (
            <div style={{ display:"flex",border:`1px solid ${border}`,borderRadius:"8px",overflow:"hidden" }}>
              {[
                { val:"vertical",   Icon:RectangleVertical,   label:"PORTRAIT"   },
                { val:"horizontal", Icon:RectangleHorizontal, label:"LANDSCAPE" },
              ].map(({ val, Icon, label }, i) => (
                <button key={val} onClick={() => setOrientation(val)}
                  style={{
                    display:"flex",alignItems:"center",gap:"5px",
                    padding:"8px 13px",cursor:"pointer",fontSize:"12px",
                    fontFamily:"Rajdhani,sans-serif",fontWeight:700,letterSpacing:"0.04em",
                    border:"none",transition:"all 150ms",
                    borderRight: i===0 ? `1px solid ${border}` : "none",
                    background: orientation===val ? ACCENT : "transparent",
                    color: orientation===val ? "#FFF" : sub,
                  }}>
                  <Icon size={13}/> {label}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleDownloadAll}
            disabled={dlAll || filtered.length === 0}
            style={{
              display:"flex",alignItems:"center",gap:"7px",
              padding:"9px 16px",borderRadius:"8px",
              cursor: filtered.length===0 ? "not-allowed" : "pointer",
              background: dlAll ? "rgba(204,0,0,0.08)" : doneAll ? "rgba(0,184,100,0.12)" : ACCENT,
              border: (dlAll||doneAll) ? `1px solid ${doneAll?"#00B864":"rgba(204,0,0,0.3)"}` : "none",
              color: dlAll ? ACCENT : doneAll ? "#00B864" : "#FFF",
              fontFamily:"Rajdhani,sans-serif",fontWeight:700,fontSize:"13px",
              letterSpacing:"0.06em",transition:"all 200ms",
            }}>
            {dlAll ? <><Spinner size={13} color={ACCENT}/>&nbsp;GENERATING…</>
              : doneAll ? <><CheckCircle2 size={14}/>ALL DONE</>
              : <><Download size={14}/>DOWNLOAD ALL ({filtered.length})</>}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display:"flex",border:`1px solid ${border}`,borderRadius:"10px",
        overflow:"hidden",marginBottom:"20px",width:"fit-content",
      }}>
        {[
          { key:"standard",  label:"Standard Cards",  icon:<CreditCard size={13}/> },
          { key:"templates", label:"Custom Templates", icon:<LayoutTemplate size={13}/> },
        ].map((tab, i) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              display:"flex",alignItems:"center",gap:"7px",
              padding:"10px 20px",border:"none",cursor:"pointer",
              fontFamily:"Rajdhani,sans-serif",fontWeight:700,
              fontSize:"13px",letterSpacing:"0.05em",transition:"all 150ms",
              borderRight: i===0 ? `1px solid ${border}` : "none",
              background: activeTab===tab.key ? ACCENT : (isDark?"#111":"#FFF"),
              color: activeTab===tab.key ? "#FFF" : sub,
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{
        background:card,border:`1px solid ${border}`,borderRadius:"10px",
        padding:"12px 16px",marginBottom:"20px",
        display:"flex",gap:"12px",flexWrap:"wrap",alignItems:"center",
      }}>
        <div style={{ position:"relative",flex:1,minWidth:"200px" }}>
          <Search size={13} style={{ position:"absolute",left:"12px",top:"50%",
            transform:"translateY(-50%)",color:sub }}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID, role…"
            style={{
              width:"100%",paddingLeft:"34px",paddingRight:"12px",
              paddingTop:"8px",paddingBottom:"8px",borderRadius:"7px",
              outline:"none",fontSize:"12px",
              background:isDark?"#0A0A0A":"#F5F5F5",
              border:`1px solid ${border}`,color:text,
              fontFamily:"Mulish,sans-serif",boxSizing:"border-box",
            }}
            onFocus={e => { e.target.style.border="1px solid #CC0000"; e.target.style.boxShadow="0 0 0 3px rgba(204,0,0,0.08)"; }}
            onBlur={e  => { e.target.style.border=`1px solid ${border}`; e.target.style.boxShadow="none"; }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              style={{ position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",
                background:"none",border:"none",cursor:"pointer",color:sub,padding:"2px" }}>
              <X size={12}/>
            </button>
          )}
        </div>
        <div style={{ position:"relative" }}>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            style={{
              appearance:"none",padding:"8px 28px 8px 12px",borderRadius:"7px",
              outline:"none",fontSize:"12px",
              background:isDark?"#0A0A0A":"#F5F5F5",
              border:`1px solid ${border}`,color:text,
              fontFamily:"Mulish,sans-serif",cursor:"pointer",
            }}>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <ChevronDown size={12} style={{ position:"absolute",right:"8px",top:"50%",
            transform:"translateY(-50%)",color:sub,pointerEvents:"none" }}/>
        </div>
      </div>

      {/* ── STANDARD TAB ── */}
      {activeTab === "standard" && (
        loading ? (
          <div style={{ display:"flex",justifyContent:"center",padding:"60px 0" }}>
            <Spinner size={36}/>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState sub={sub} card={card} border={border}/>
        ) : (
          <div style={{
            display:"grid",
            gridTemplateColumns:`repeat(auto-fill,minmax(${gridMin},1fr))`,
            gap:"20px",
          }}>
            {filtered.map((emp, idx) => (
              <CardTile
                key={emp.id} emp={emp} idx={idx}
                card={card} border={border} text={text} sub={sub}
                accent={ACCENT} successId={successId} cardRefs={cardRefs}
                onPreview={() => openPreview(emp, null)}
              >
                {orientation === "horizontal"
                  ? <IdCardHorizontal emp={emp} cardRef={el => { cardRefs.current[idx] = el; }}/>
                  : <IdCardVertical   emp={emp} cardRef={el => { cardRefs.current[idx] = el; }}/>
                }
              </CardTile>
            ))}
          </div>
        )
      )}

      {/* ── TEMPLATES TAB ── */}
      {activeTab === "templates" && (
        <div>
          {/* Template selector */}
          <div style={{
            background:card,border:`1px solid ${border}`,borderRadius:"12px",
            padding:"16px 18px",marginBottom:"20px",
          }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
              marginBottom:"14px",flexWrap:"wrap",gap:"10px" }}>
              <div style={{ fontFamily:"Rajdhani,sans-serif",fontWeight:700,fontSize:"15px",color:text,
                display:"flex",alignItems:"center",gap:"8px" }}>
                <LayoutTemplate size={16} style={{ color:ACCENT }}/>
                Saved Templates
                <span style={{ fontFamily:"Mulish,sans-serif",fontSize:"11px",fontWeight:400,color:sub,
                  background:isDark?"#1A1A1A":"#F0F0F0",padding:"2px 8px",borderRadius:"20px",marginLeft:"4px" }}>
                  {templates.length}
                </span>
              </div>
              <button onClick={() => navigate("/idcard-template")}
                style={{
                  display:"flex",alignItems:"center",gap:"6px",
                  padding:"8px 14px",borderRadius:"8px",cursor:"pointer",
                  background:ACCENT,border:"none",color:"#FFF",
                  fontFamily:"Rajdhani,sans-serif",fontWeight:700,fontSize:"12px",letterSpacing:"0.05em",
                }}>
                <Plus size={13}/> NEW TEMPLATE
              </button>
            </div>

            {templatesLoading ? (
              <div style={{ display:"flex",justifyContent:"center",padding:"20px 0" }}>
                <Spinner size={24}/>
              </div>
            ) : templates.length === 0 ? (
              <div style={{ textAlign:"center",padding:"28px",color:sub,
                border:`2px dashed ${border}`,borderRadius:"10px" }}>
                <Palette size={28} style={{ color:sub,marginBottom:"8px" }}/>
                <div style={{ fontFamily:"Rajdhani,sans-serif",fontSize:"15px",fontWeight:700,
                  marginBottom:"6px",color:text }}>No templates yet</div>
                <div style={{ fontFamily:"Mulish,sans-serif",fontSize:"12px",marginBottom:"14px" }}>
                  Create your first custom ID card template using the Template Builder.
                </div>
                <button onClick={() => navigate("/idcard-template")}
                  style={{
                    display:"inline-flex",alignItems:"center",gap:"6px",
                    padding:"9px 18px",borderRadius:"8px",cursor:"pointer",
                    background:ACCENT,border:"none",color:"#FFF",
                    fontFamily:"Rajdhani,sans-serif",fontWeight:700,fontSize:"13px",
                  }}>
                  <Plus size={14}/> CREATE FIRST TEMPLATE
                </button>
              </div>
            ) : (
              <div style={{ display:"flex",gap:"10px",flexWrap:"wrap" }}>
                {templates.map(tpl => (
                  <div key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    style={{
                      display:"flex",alignItems:"center",gap:"8px",
                      padding:"8px 14px",borderRadius:"8px",cursor:"pointer",
                      border:`1.5px solid ${selectedTemplate===tpl.id?ACCENT:border}`,
                      background:selectedTemplate===tpl.id?"rgba(204,0,0,0.08)":"transparent",
                      transition:"all 150ms",
                    }}>
                    <div style={{ width:"10px",height:"10px",borderRadius:"50%",
                      background:tpl.config?.accentColor||ACCENT,flexShrink:0 }}/>
                    <span style={{ fontFamily:"Mulish,sans-serif",fontSize:"13px",fontWeight:600,
                      color:selectedTemplate===tpl.id?ACCENT:text }}>
                      {tpl.name||"Untitled"}
                    </span>
                    <span style={{ fontSize:"10px",color:sub }}>
                      {tpl.config?.orientation==="vertical"?"↕ V":"↔ H"}
                    </span>
                    <button onClick={e => { e.stopPropagation(); navigate(`/idcard-template/${tpl.id}`); }}
                      style={{ background:"none",border:"none",cursor:"pointer",color:sub,
                        padding:"2px",display:"flex",alignItems:"center" }} title="Edit">
                      <Pencil size={12}/>
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}
                      disabled={deletingTpl===tpl.id}
                      style={{ background:"none",border:"none",cursor:"pointer",
                        color:deletingTpl===tpl.id?sub:ACCENT,
                        padding:"2px",display:"flex",alignItems:"center" }} title="Delete">
                      {deletingTpl===tpl.id ? <Spinner size={12}/> : <Trash2 size={12}/>}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Template cards grid */}
          {templates.length > 0 && selectedTemplate && activeTplObj && (
            loading ? (
              <div style={{ display:"flex",justifyContent:"center",padding:"60px 0" }}>
                <Spinner size={36}/>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState sub={sub} card={card} border={border}/>
            ) : (
              <div style={{
                display:"grid",
                gridTemplateColumns:`repeat(auto-fill,minmax(${
                  activeTplObj.config?.orientation==="vertical"?"230px":"350px"
                },1fr))`,
                gap:"20px",
              }}>
                {filtered.map((emp, idx) => (
                  <CardTile
                    key={emp.id} emp={emp} idx={idx}
                    card={card} border={border} text={text} sub={sub}
                    accent={activeTplObj.config?.accentColor||ACCENT}
                    successId={successId} cardRefs={cardRefs}
                    onPreview={() => openPreview(emp, activeTplObj.config||{})}
                  >
                    <CustomCard
                      emp={emp}
                      tpl={activeTplObj.config||{}}
                      cardRef={el => { cardRefs.current[idx] = el; }}
                    />
                  </CardTile>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Card tile wrapper ─────────────────────────────────────────
function CardTile({ emp, card, border, text, sub, accent, successId, onPreview, children }) {
  return (
    <div
      style={{
        background:card,border:`1px solid ${border}`,borderRadius:"14px",
        padding:"16px 16px 12px",
        display:"flex",flexDirection:"column",gap:"12px",
        transition:"border-color 200ms,box-shadow 200ms",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor=`${accent}55`;
        e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor=border;
        e.currentTarget.style.boxShadow="none";
      }}
    >
      {/* tile header */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:"Rajdhani,sans-serif",fontWeight:700,fontSize:"15px",color:text }}>
            {emp.name}
          </div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:"10px",
            color:"#00B8B8",marginTop:"1px" }}>
            {emp.id}
          </div>
        </div>
        <div style={{
          padding:"3px 9px",borderRadius:"20px",fontSize:"10px",
          background:`${accent}18`,color:accent,
          fontFamily:"Mulish,sans-serif",fontWeight:600,
          border:`1px solid ${accent}33`,
        }}>
          {emp.department || "—"}
        </div>
      </div>

      {/* card preview */}
      <div style={{ display:"flex",justifyContent:"center" }}>
        {children}
      </div>

      {/* preview & download button */}
      <button
        onClick={onPreview}
        style={{
          width:"100%",padding:"10px",borderRadius:"8px",cursor:"pointer",
          background: successId===emp.id ? "rgba(0,184,100,0.10)" : `${accent}12`,
          border:`1px solid ${successId===emp.id?"rgba(0,184,100,0.35)":`${accent}30`}`,
          color: successId===emp.id ? "#00B864" : accent,
          fontFamily:"Rajdhani,sans-serif",fontWeight:700,fontSize:"12px",
          letterSpacing:"0.10em",
          display:"flex",alignItems:"center",justifyContent:"center",gap:"7px",
          transition:"all 200ms",
        }}
      >
        {successId===emp.id
          ? <><CheckCircle2 size={13}/>DOWNLOADED</>
          : <><Eye size={13}/>PREVIEW &amp; DOWNLOAD</>
        }
      </button>
    </div>
  );
}

function EmptyState({ sub, card, border }) {
  return (
    <div style={{ textAlign:"center",padding:"60px 20px",
      background:card,borderRadius:"12px",border:`1px solid ${border}` }}>
      <CreditCard size={40} style={{ color:sub,marginBottom:"12px" }}/>
      <p style={{ fontFamily:"Rajdhani,sans-serif",fontSize:"18px",color:sub }}>
        No employees found
      </p>
    </div>
  );
}