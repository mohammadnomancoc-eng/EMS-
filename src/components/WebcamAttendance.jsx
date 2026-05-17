// ─────────────────────────────────────────────────────────────
//  src/components/WebcamAttendance.jsx
//
//  Webcam Attendance with Face Verification
//
//  Flow:
//    1. Employee opens modal → camera + face-api.js models load in parallel
//    2. Employee captures snapshot
//    3. Snapshot is compared against profile photo using face-api.js
//       (SsdMobilenetv1 detector + FaceRecognitionNet descriptor)
//    4. If face distance <= MATCH_THRESHOLD → proceed to save (Present)
//       If face distance >  MATCH_THRESHOLD → show mismatch, allow retake only
//       If no profile photo / no face found  → fail-open with a warning
//
//  face-api.js (@vladmandic build) loaded from jsDelivr CDN, cached by browser.
//  No API key. Runs entirely in the browser.
//
//  MATCH_THRESHOLD 0.50: Euclidean distance between 128-d descriptors.
//  Industry default is 0.6; 0.5 is stricter but still lighting-tolerant.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../App";
import {
  Camera, X, CheckCircle, AlertCircle, RefreshCw,
  Video, VideoOff, MapPin, Navigation, ShieldCheck, ScanFace,
} from "lucide-react";
import { upsertAttendance, getCompanySettings, getEmployee, getOwnAttendanceRecord } from "../firebase/firestoreService";
import { uploadToCloudinary } from "../cloudinary/cloudinaryService";

const MATCH_THRESHOLD = 0.50;
const MODELS_URL      = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model";

// ── Helpers ───────────────────────────────────────────────────
function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatTime12(date) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2,"0");
  const s = String(date.getSeconds()).padStart(2,"0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2,"0")}:${m}:${s} ${ampm}`;
}
function formatTime12NoSec(date) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2,"0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2,"0")}:${m} ${ampm}`;
}
function calcHoursWorked(checkIn, checkOut) {
  try {
    const parse = (t) => {
      const [time, ampm] = t.split(" ");
      let [h, m] = time.split(":").map(Number);
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    const diff = parse(checkOut) - parse(checkIn);
    if (diff <= 0) return "--";
    return `${Math.floor(diff/60)}h ${diff%60}m`;
  } catch { return "--"; }
}
function haversineMetres(lat1,lng1,lat2,lng2) {
  const R=6371000, toRad=d=>d*Math.PI/180;
  const dLat=toRad(lat2-lat1), dLng=toRad(lng2-lng1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ── face-api loader (singleton) ───────────────────────────────
let _faceApiPromise = null;
function loadFaceApi() {
  if (_faceApiPromise) return _faceApiPromise;
  _faceApiPromise = new Promise((resolve, reject) => {
    if (window.faceapi) { resolve(window.faceapi); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js";
    s.async = true;
    s.onload = () => resolve(window.faceapi);
    s.onerror = () => reject(new Error("face-api.js failed to load"));
    document.head.appendChild(s);
  });
  return _faceApiPromise;
}
let _modelsLoaded = false;
async function ensureModels() {
  const fa = await loadFaceApi();
  if (_modelsLoaded) return fa;
  await Promise.all([
    fa.nets.ssdMobilenetv1.loadFromUri(MODELS_URL),
    fa.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
    fa.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
  ]);
  _modelsLoaded = true;
  return fa;
}

// ── Get 128-d descriptor from an image element ────────────────
// Use fetch → blob → object URL so we bypass CORS canvas taint issues.
// Cloudinary images served with crossOrigin="anonymous" can fail silently
// when the CDN returns a cached response without CORS headers.
async function loadImg(src) {
  // If src is already a blob URL (local capture), create img directly
  if (typeof src !== "string" || src.startsWith("blob:")) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload  = () => res(img);
      img.onerror = () => rej(new Error("img load failed"));
      img.src = typeof src === "string" ? src : URL.createObjectURL(src);
    });
  }
  // For remote URLs (profile photo): fetch as blob to avoid CORS canvas taint
  const resp = await fetch(src, { mode: "cors", cache: "no-cache" });
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  const blob = await resp.blob();
  const objUrl = URL.createObjectURL(blob);
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => { res(img); URL.revokeObjectURL(objUrl); };
    img.onerror = () => { rej(new Error("img load failed")); URL.revokeObjectURL(objUrl); };
    img.src = objUrl;
  });
}
async function getDescriptor(faceapi, src) {
  // For Blob/File: create a local blob: URL so loadImg's fast path handles it
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  const img = await loadImg(url);
  const det = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
  return det ? det.descriptor : null;
}
function euclidean(a, b) {
  let s = 0; for (let i = 0; i < a.length; i++) s += (a[i]-b[i])**2; return Math.sqrt(s);
}

// ── LiveClock ─────────────────────────────────────────────────
function LiveClock({ isDark }) {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id=setInterval(()=>setT(new Date()),1000); return()=>clearInterval(id); },[]);
  return (
    <div style={{ textAlign:"center" }}>
      <p style={{ fontFamily:"Share Tech Mono,monospace", fontSize:"clamp(22px,6vw,32px)", fontWeight:700, color:"#00B8B8", letterSpacing:"0.05em", lineHeight:1 }}>{formatTime12(t)}</p>
      <p style={{ fontFamily:"Mulish,sans-serif", fontSize:"clamp(10px,2.5vw,12px)", color:isDark?"#666666":"#999999", marginTop:"4px" }}>
        {t.toLocaleDateString("en-IN",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}
      </p>
    </div>
  );
}
function LiveClockMinimal() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id=setInterval(()=>setT(new Date()),1000); return()=>clearInterval(id); },[]);
  return <span style={{ fontFamily:"Share Tech Mono,monospace", fontSize:"11px", color:"#FFFFFF", letterSpacing:"0.05em" }}>{formatTime12(t)}</span>;
}

// ── Main Component ────────────────────────────────────────────
export default function WebcamAttendance({ empId, empName, onClose, onSuccess }) {
  const { theme } = useTheme();
  const isDark    = theme === "dark";

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const faceApiRef        = useRef(null);
  const profileDescRef    = useRef(null);
  const profilePhotoUrlRef = useRef(null); // mirrors state — avoids stale closure in verifyFace

  const [camStatus,         setCamStatus]         = useState("idle");
  const [snapshotObjectUrl, setSnapshotObjectUrl] = useState(null);
  const [snapshotBlob,      setSnapshotBlob]      = useState(null);
  const [uploadProgress,    setUploadProgress]    = useState(0);
  const [action,            setAction]            = useState(null);
  const [saving,            setSaving]            = useState(false);
  const [saved,             setSaved]             = useState(false);
  const [savedRecord,       setSavedRecord]       = useState(null);
  const [errorMsg,          setErrorMsg]          = useState("");
  const [todayRecord,       setTodayRecord]       = useState(null);

  // face verification
  // idle | loading_models | verifying | matched | mismatch | no_profile | no_face_snapshot | no_face_profile | error
  const [faceStatus,  setFaceStatus]  = useState("idle");
  const [faceScore,   setFaceScore]   = useState(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);

  // geo
  const [geoStatus,       setGeoStatus]       = useState("idle");
  const [geoDistance,     setGeoDistance]     = useState(null);
  const [geoRequired,     setGeoRequired]     = useState(false);
  const [companySettings, setCompanySettings] = useState(null);

  // ── Mount: load models + data in parallel ────────────────
  useEffect(() => {
    if (!empId) return;
    // kick off model loading immediately so it's ready by capture time
    ensureModels().then(api => { faceApiRef.current = api; }).catch(()=>{});

    Promise.all([
      getOwnAttendanceRecord(empId, todayString()),
      getCompanySettings(),
      getEmployee(empId),
    ]).then(([ownRecord, settings, empData]) => {
      if (ownRecord)         setTodayRecord(ownRecord);
      if (settings)          setCompanySettings(settings);
      if (empData?.photoUrl) {
        const photoUrl = empData.photoUrl.trim(); // guard against empty-string stored by older form
        if (photoUrl) {
          setProfilePhotoUrl(photoUrl);
          profilePhotoUrlRef.current = photoUrl; // keep ref in sync immediately
        }
      }

      const wt    = (empData?.workType || "WFO").toUpperCase();
      const isWFO = wt === "WFO";
      setGeoRequired(isWFO);
      if (!isWFO)                                     { setGeoStatus("wfh_skip"); return; }
      if (!settings?.officeLat || !settings?.officeLng){ setGeoStatus("allowed");  return; }

      setGeoStatus("checking");
      if (!navigator.geolocation) { setGeoStatus("error"); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const dist   = haversineMetres(pos.coords.latitude, pos.coords.longitude, settings.officeLat, settings.officeLng);
          const radius = settings.geoFenceRadius ?? 100;
          setGeoDistance(Math.round(dist));
          setGeoStatus(dist <= radius ? "allowed" : "blocked");
        },
        () => setGeoStatus("error"),
        { enableHighAccuracy:true, timeout:10000 }
      );
    }).catch(() => setGeoStatus("allowed"));
  }, [empId]);

  useEffect(() => {
    if (todayRecord) {
      const hasIn  = todayRecord.checkIn  && todayRecord.checkIn  !== "--";
      const hasOut = todayRecord.checkOut && todayRecord.checkOut !== "--";
      setAction(hasIn && !hasOut ? "checkout" : "checkin");
    } else {
      setAction("checkin");
    }
  }, [todayRecord]);

  // Keep ref in sync with state AND bust cached descriptor whenever URL changes
  useEffect(() => {
    profilePhotoUrlRef.current = profilePhotoUrl;
    profileDescRef.current = null; // force re-extraction on next verify
  }, [profilePhotoUrl]);

  // ── Camera ────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCamStatus("loading"); setErrorMsg("");
    setSnapshotObjectUrl(null); setSnapshotBlob(null);
    setFaceStatus("idle"); setFaceScore(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ width:{ideal:640}, height:{ideal:480}, facingMode:"user" }, audio:false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCamStatus("active");
    } catch(err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCamStatus("denied"); setErrorMsg("Camera access denied. Please allow camera permission in your browser settings.");
      } else {
        setCamStatus("error"); setErrorMsg("Could not access camera: " + (err.message||"Unknown error"));
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
    if (videoRef.current)  { videoRef.current.srcObject = null; }
    setCamStatus("idle");
  }, []);

  useEffect(() => {
    return () => { stopCamera(); if (snapshotObjectUrl) URL.revokeObjectURL(snapshotObjectUrl); };
  }, [stopCamera]); // eslint-disable-line

  // ── Capture → verify ─────────────────────────────────────
  const verifyFace = useCallback(async (blob) => {
    setFaceStatus("verifying"); setFaceScore(null);

    try {
      // ── Step 1: Always fetch the LATEST photo from Firestore right now ──
      // Guarantees we use whatever photo admin/employee last uploaded,
      // ignoring anything cached at modal-open time.
      let faceapi = faceApiRef.current;
      if (!faceapi) { setFaceStatus("loading_models"); faceapi = await ensureModels(); faceApiRef.current = faceapi; }

      const freshEmpData  = await getEmployee(empId);
      const latestPhotoUrl = (freshEmpData?.photoUrl || "").trim();

      setProfilePhotoUrl(latestPhotoUrl || null);
      profilePhotoUrlRef.current = latestPhotoUrl || null;

      if (!latestPhotoUrl) { setFaceStatus("no_profile"); return; }

      // ── Step 2: Get profile face descriptor (re-compute if URL changed) ──
      const urlChanged  = profilePhotoUrlRef._usedUrl !== latestPhotoUrl;
      let profileDesc   = (!urlChanged && profileDescRef.current) ? profileDescRef.current : null;

      if (!profileDesc) {
        // Strip Cloudinary transformation params but preserve version token (v1234...)
        const rawUrl = latestPhotoUrl.includes("cloudinary.com")
          ? latestPhotoUrl.replace(/\/upload\/(?!v\d)([^/]+\/)+/, "/upload/")
          : latestPhotoUrl;
        profileDesc = await getDescriptor(faceapi, rawUrl);
        if (!profileDesc) { setFaceStatus("no_face_profile"); return; }
        profileDescRef.current          = profileDesc;
        profilePhotoUrlRef._usedUrl     = latestPhotoUrl;
      }

      // ── Step 3: Get snapshot descriptor and compare ──
      const snapshotDesc = await getDescriptor(faceapi, blob);
      if (!snapshotDesc) { setFaceStatus("no_face_snapshot"); return; }

      const dist = euclidean(profileDesc, snapshotDesc);
      setFaceScore(dist);
      setFaceStatus(dist <= MATCH_THRESHOLD ? "matched" : "mismatch");
    } catch(e) {
      console.warn("Face verify error:", e);
      setFaceStatus("error");
    }
  }, [empId]); // empId is stable — modal is re-mounted per open

  const captureSnapshot = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video=videoRef.current, canvas=canvasRef.current;
    canvas.width = video.videoWidth||640; canvas.height = video.videoHeight||480;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width,0); ctx.scale(-1,1);
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    stopCamera();
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setSnapshotBlob(blob);
      setSnapshotObjectUrl(URL.createObjectURL(blob));
      await verifyFace(blob);
    }, "image/jpeg", 0.85);
  }, [stopCamera, verifyFace]);

  const retake = useCallback(() => {
    if (snapshotObjectUrl) URL.revokeObjectURL(snapshotObjectUrl);
    setSnapshotObjectUrl(null); setSnapshotBlob(null);
    setUploadProgress(0); setFaceStatus("idle"); setFaceScore(null);
    startCamera();
  }, [startCamera, snapshotObjectUrl]);

  // ── Save ──────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!snapshotObjectUrl || !snapshotBlob || !empId || !action) return;
    // Strict: only a confirmed face match is allowed to mark attendance
    if (faceStatus !== "matched") return;
    setSaving(true); setUploadProgress(0); setErrorMsg("");
    const now=new Date(), timeStr=formatTime12NoSec(now), date=todayString();
    try {
      const actionLabel = action==="checkin" ? "checkin" : "checkout";
      const file = new File([snapshotBlob], `${empId}_${date}_${actionLabel}.jpg`, { type:"image/jpeg" });
      const uploadResult = await uploadToCloudinary(file, "image", {
        folder:    `ems/attendance/${empId}`,
        publicId:  `${empId}_${date}_${actionLabel}_${Date.now()}`,
        onProgress: pct => setUploadProgress(pct),
      });

      let checkIn=todayRecord?.checkIn||"--", checkOut=todayRecord?.checkOut||"--";
      let status=todayRecord?.status||"Present", hoursWorked=todayRecord?.hoursWorked||"--";
      if (action==="checkin")  { checkIn=timeStr; status="Present"; hoursWorked="--"; }
      if (action==="checkout") { checkOut=timeStr; status=todayRecord?.status||"Present"; hoursWorked=checkIn!=="--"?calcHoursWorked(checkIn,timeStr):"--"; }

      await upsertAttendance({
        empId, date, status, checkIn, checkOut, hoursWorked,
        markedBy:              "webcam",
        webcamSnapshotUrl:     uploadResult.secure_url,
        webcamSnapshotPublicId:uploadResult.public_id,
        webcamTimestamp:       now.toISOString(),
        geoDistance, geoVerified: geoStatus==="allowed",
        faceVerified:  faceStatus==="matched",
        faceDistance:  faceScore ?? null,
      });

      const record = { empId,date,status,checkIn,checkOut,hoursWorked,action,time:timeStr };
      setSavedRecord(record); setSaved(true);
      if (onSuccess) onSuccess(record);
    } catch(err) {
      setErrorMsg("Failed to save: "+(err.message||"Please try again."));
      setSaving(false); setUploadProgress(0);
    }
  }, [snapshotObjectUrl,snapshotBlob,empId,action,todayRecord,onSuccess,geoStatus,geoDistance,faceStatus,faceScore]);

  // ── Theme ─────────────────────────────────────────────────
  const cardBg   = isDark ? "#111111" : "#FFFFFF";
  const border   = isDark ? "#1E1E1E" : "#E8E8E8";
  const textPri  = isDark ? "#F0F0F0" : "#111111";
  const textMuted= isDark ? "#555555" : "#999999";

  const alreadyCheckedIn  = todayRecord?.checkIn  && todayRecord.checkIn  !== "--";
  const alreadyCheckedOut = todayRecord?.checkOut && todayRecord.checkOut !== "--";

  // Only a confirmed face match allows saving — all skip/error/no_profile states are BLOCKED
  const verificationPassed = faceStatus === "matched";
  const canSave = !!snapshotObjectUrl && !!snapshotBlob && verificationPassed && !saving
    && geoStatus !== "blocked" && geoStatus !== "checking";

  // Banner config for each face status
  const FACE_BANNERS = {
    loading_models:  { color:"#C9922A", bg:"rgba(201,146,42,0.08)", bdr:"rgba(201,146,42,0.3)", spinning:true,  text:"Loading face recognition models…" },
    verifying:       { color:"#C9922A", bg:"rgba(201,146,42,0.08)", bdr:"rgba(201,146,42,0.3)", spinning:true,  text:"Verifying your face against profile photo…" },
    matched:         { color:"#00B8B8", bg:"rgba(0,184,184,0.08)",  bdr:"rgba(0,184,184,0.3)",  spinning:false, text:"Face matched ✓ — you can confirm attendance" },
    mismatch:        { color:"#CC0000", bg:"rgba(204,0,0,0.08)",    bdr:"rgba(204,0,0,0.3)",    spinning:false, text:"Face does not match your profile photo. Please retake or contact admin." },
    no_profile:      { color:"#CC0000", bg:"rgba(204,0,0,0.08)",    bdr:"rgba(204,0,0,0.3)",    spinning:false, text:"No profile photo found — attendance cannot be marked. Ask your admin to upload your profile photo first." },
    no_face_snapshot:{ color:"#CC0000", bg:"rgba(204,0,0,0.08)",    bdr:"rgba(204,0,0,0.3)",    spinning:false, text:"No face detected in capture. Retake in better lighting facing the camera directly." },
    no_face_profile: { color:"#CC0000", bg:"rgba(204,0,0,0.08)",    bdr:"rgba(204,0,0,0.3)",    spinning:false, text:"No face detectable in your profile photo — attendance blocked. Ask admin to re-upload a clear face photo." },
    error:           { color:"#CC0000", bg:"rgba(204,0,0,0.08)",    bdr:"rgba(204,0,0,0.3)",    spinning:false, text:"Face verification failed — attendance cannot be marked. Please retry or contact admin." },
  };
  const faceBanner = FACE_BANNERS[faceStatus];

  // ── Success screen ────────────────────────────────────────
  if (saved && savedRecord) return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background:"rgba(0,0,0,0.85)", backdropFilter:"blur(4px)", padding:"16px" }}
      onClick={onClose}
    >
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          width:"min(440px,100%)",
          maxHeight:"min(600px,90dvh)",
          display:"flex",
          flexDirection:"column",
          background:cardBg,
          border:`1px solid ${border}`,
          borderRadius:"16px",
          overflow:"hidden",
        }}
      >
        {/* Success Header */}
        <div style={{ padding:"14px 18px", borderBottom:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:"rgba(0,184,184,0.12)", border:"1px solid rgba(0,184,184,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Camera size={15} style={{ color:"#00B8B8" }} />
            </div>
            <p style={{ fontFamily:"Rajdhani,sans-serif", fontWeight:700, fontSize:"15px", color:textPri }}>Webcam Attendance</p>
          </div>
          <button onClick={onClose} style={{ color:textMuted, background:"none", border:"none", cursor:"pointer", padding:"4px" }}><X size={18}/></button>
        </div>

        {/* Success Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 18px", display:"flex", flexDirection:"column", alignItems:"center", gap:"16px" }}>
          <div style={{ width:"52px", height:"52px", borderRadius:"50%", background:"rgba(0,184,184,0.12)", border:"2px solid #00B8B8", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <CheckCircle size={26} style={{ color:"#00B8B8" }} />
          </div>
          <div style={{ textAlign:"center" }}>
            <p style={{ fontFamily:"Rajdhani,sans-serif", fontWeight:700, fontSize:"clamp(17px,5vw,22px)", color:"#00B8B8", lineHeight:1 }}>
              {savedRecord.action==="checkin" ? "Checked In!" : "Checked Out!"}
            </p>
            <p style={{ fontFamily:"Mulish,sans-serif", fontSize:"clamp(11px,3vw,13px)", color:textMuted, marginTop:"6px" }}>
              Recorded at <span style={{ color:textPri, fontWeight:600 }}>{savedRecord.time}</span>
            </p>
          </div>

          <div style={{ width:"100%", background:isDark?"#0D0D0D":"#F5F5F5", border:`1px solid ${border}`, borderRadius:"10px", padding:"14px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
            {[
              { label:"DATE",          val:savedRecord.date },
              { label:"STATUS",        val:savedRecord.status },
              { label:"CHECK IN",      val:savedRecord.checkIn },
              { label:"CHECK OUT",     val:savedRecord.checkOut },
              { label:"HOURS WORKED",  val:savedRecord.hoursWorked },
              { label:"FACE VERIFIED", val:faceStatus==="matched" ? "Yes ✓" : "Skipped" },
            ].map(({label,val}) => (
              <div key={label}>
                <p style={{ fontFamily:"Rajdhani,sans-serif", fontSize:"9px", fontWeight:700, color:"#CC0000", letterSpacing:"0.15em" }}>{label}</p>
                <p style={{ fontFamily:"Share Tech Mono,monospace", fontSize:"clamp(11px,3vw,13px)", color:textPri, marginTop:"3px", wordBreak:"break-word" }}>{val}</p>
              </div>
            ))}
          </div>

          <p style={{ fontFamily:"Mulish,sans-serif", fontSize:"11px", color:textMuted, textAlign:"center", lineHeight:1.5 }}>
            This record has been sent to the admin panel automatically.
          </p>
          <button
            onClick={onClose}
            style={{ width:"100%", padding:"11px", borderRadius:"8px", background:"#CC0000", border:"none", color:"#FFFFFF", fontFamily:"Rajdhani,sans-serif", fontSize:"14px", fontWeight:700, cursor:"pointer", letterSpacing:"0.08em" }}
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main modal ────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50"
      style={{
        background:"rgba(0,0,0,0.85)",
        backdropFilter:"blur(4px)",
        display:"flex",
        alignItems:"flex-end",
        justifyContent:"center",
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }

        /* ── Modal card ── */
        .wc-card {
          width: 100%;
          max-height: 96dvh;
          border-radius: 18px 18px 0 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Tablet: centred, capped width, rounded all corners */
        @media (min-width: 600px) {
          .wc-outer {
            align-items: center !important;
            padding: 20px;
          }
          .wc-card {
            width: min(520px, 100%);
            max-height: 92dvh;
            border-radius: 16px;
          }
        }

        /* Desktop / laptop: slightly wider, more padding */
        @media (min-width: 1024px) {
          .wc-card {
            width: min(560px, 100%);
            max-height: 90dvh;
          }
        }

        /* ── Footer buttons ── */
        .wc-btn {
          padding: 10px 16px;
          border-radius: 7px;
          font-family: "Rajdhani", sans-serif;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 150ms;
        }
        /* On very small phones, shrink button text */
        @media (max-width: 360px) {
          .wc-btn { padding: 9px 10px; font-size: 11px; }
        }

        /* ── Action selector ── */
        .wc-action-row { display: flex; gap: 8px; }
        .wc-action-btn {
          flex: 1;
          padding: 10px 8px;
          border-radius: 8px;
          font-family: "Rajdhani", sans-serif;
          font-weight: 700;
          transition: all 150ms;
        }
        .wc-action-label { font-size: clamp(12px, 3.8vw, 14px); display: block; }
        .wc-action-sub   { font-size: clamp(9px, 2.5vw, 10px); display: block; margin-top: 3px; font-weight: 400; }

        /* ── Camera area: fixed aspect ratio, max height so it never dominates ── */
        .wc-camera-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          max-height: 280px;
          border-radius: 10px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        @media (min-width: 600px) {
          .wc-camera-wrap { max-height: 320px; }
        }
        @media (min-width: 1024px) {
          .wc-camera-wrap { max-height: 360px; }
        }

        /* ── Clock: compact on phone, normal on larger ── */
        .wc-clock-time { font-family:"Share Tech Mono",monospace; font-weight:700; color:#00B8B8; letter-spacing:0.05em; line-height:1; font-size:clamp(20px,6vw,30px); }
        .wc-clock-date { font-family:"Mulish",sans-serif; margin-top:3px; font-size:clamp(9px,2.5vw,11px); }

        /* ── Banners ── */
        .wc-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1.5;
        }
        @media (max-width: 360px) {
          .wc-banner { font-size: 11px; padding: 8px 10px; }
        }
      `}</style>

      <div
        onClick={e=>e.stopPropagation()}
        className="wc-card"
        style={{ background:cardBg, border:`1px solid ${border}` }}
      >

        {/* ── Header ── */}
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", minWidth:0 }}>
            <div style={{ width:"34px", height:"34px", borderRadius:"8px", background:"rgba(204,0,0,0.10)", border:"1px solid rgba(204,0,0,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Camera size={15} style={{ color:"#CC0000" }}/>
            </div>
            <div style={{ minWidth:0 }}>
              <p style={{ fontFamily:"Rajdhani,sans-serif", fontWeight:700, fontSize:"clamp(13px,4vw,16px)", color:textPri, lineHeight:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                Webcam Attendance
              </p>
              <p style={{ fontFamily:"Mulish,sans-serif", fontSize:"clamp(9px,2.5vw,11px)", color:textMuted, marginTop:"2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {empName} · {todayString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ color:textMuted, background:"none", border:"none", cursor:"pointer", padding:"4px", flexShrink:0, marginLeft:"8px" }}
          >
            <X size={18}/>
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 16px", display:"flex", flexDirection:"column", gap:"10px" }}>

          {/* Clock */}
          <div style={{ textAlign:"center", paddingBottom:"2px" }}>
            <LiveClock isDark={isDark}/>
          </div>

          {/* Action selector */}
          <div>
            <p style={{ fontFamily:"Rajdhani,sans-serif", fontSize:"9px", fontWeight:700, color:"#CC0000", letterSpacing:"0.18em", marginBottom:"7px" }}>
              MARK ATTENDANCE AS
            </p>
            <div className="wc-action-row">
              {["checkin","checkout"].map(a => {
                const label    = a==="checkin" ? "Check In" : "Check Out";
                const disabled = a==="checkin" ? alreadyCheckedIn : (!alreadyCheckedIn||alreadyCheckedOut);
                const isSel    = action===a;
                return (
                  <button
                    key={a}
                    onClick={()=>!disabled&&setAction(a)}
                    disabled={disabled}
                    className="wc-action-btn"
                    style={{
                      cursor:    disabled?"not-allowed":"pointer",
                      border:    isSel?"1px solid #CC0000":`1px solid ${isDark?"#2A2A2A":"#E0E0E0"}`,
                      background:isSel?"rgba(204,0,0,0.12)":"transparent",
                      color:     disabled?(isDark?"#333333":"#CCCCCC"):isSel?"#CC0000":(isDark?"#666666":"#888888"),
                      opacity:   disabled?0.5:1,
                    }}
                  >
                    <span className="wc-action-label">{label}</span>
                    {a==="checkin"  && alreadyCheckedIn  && (
                      <span className="wc-action-sub">{alreadyCheckedOut?"Already done":`Done · ${todayRecord?.checkIn}`}</span>
                    )}
                    {a==="checkout" && alreadyCheckedOut && (
                      <span className="wc-action-sub">Done · {todayRecord?.checkOut}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Geo banners */}
          {geoRequired && geoStatus==="checking" && (
            <div className="wc-banner" style={{ background:"rgba(201,146,42,0.08)", border:"1px solid rgba(201,146,42,0.3)" }}>
              <Navigation size={14} style={{ color:"#C9922A", flexShrink:0, marginTop:"1px" }}/>
              <p style={{ fontFamily:"Mulish,sans-serif", color:"#C9922A" }}>Verifying your location…</p>
            </div>
          )}
          {geoRequired && geoStatus==="blocked" && (
            <div style={{ padding:"12px 14px", borderRadius:"8px", background:"rgba(204,0,0,0.08)", border:"1px solid rgba(204,0,0,0.3)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"7px", marginBottom:"5px" }}>
                <MapPin size={13} style={{ color:"#CC0000", flexShrink:0 }}/>
                <p style={{ fontFamily:"Rajdhani,sans-serif", fontSize:"13px", fontWeight:700, color:"#CC0000" }}>Outside Office Premises</p>
              </div>
              <p style={{ fontFamily:"Mulish,sans-serif", fontSize:"12px", color:isDark?"#888888":"#666666", lineHeight:1.5 }}>
                You are <strong style={{ color:"#CC0000" }}>{geoDistance}m</strong> away. WFO employees must be within <strong>{companySettings?.geoFenceRadius??100}m</strong>.
              </p>
            </div>
          )}
          {geoRequired && geoStatus==="allowed" && geoDistance!==null && (
            <div className="wc-banner" style={{ background:"rgba(0,184,184,0.07)", border:"1px solid rgba(0,184,184,0.25)" }}>
              <ShieldCheck size={14} style={{ color:"#00B8B8", flexShrink:0, marginTop:"1px" }}/>
              <p style={{ fontFamily:"Mulish,sans-serif", color:"#00B8B8" }}>Location verified — <strong>{geoDistance}m</strong> from office ✓</p>
            </div>
          )}
          {geoRequired && geoStatus==="error" && (
            <div className="wc-banner" style={{ background:"rgba(204,0,0,0.08)", border:"1px solid rgba(204,0,0,0.3)" }}>
              <AlertCircle size={14} style={{ color:"#CC0000", flexShrink:0, marginTop:"1px" }}/>
              <p style={{ fontFamily:"Mulish,sans-serif", color:"#CC0000" }}>Could not access your location. Please enable GPS and try again.</p>
            </div>
          )}

          {/* Camera area */}
          {geoStatus!=="blocked" && geoStatus!=="checking" && (
            <div
              className="wc-camera-wrap"
              style={{ background:isDark?"#0D0D0D":"#F0F0F0", border:`1px solid ${border}` }}
            >
              <canvas ref={canvasRef} style={{ display:"none" }}/>
              <video
                ref={videoRef}
                muted
                playsInline
                style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)", display:camStatus==="active"?"block":"none" }}
              />

              {snapshotObjectUrl && (
                <img src={snapshotObjectUrl} alt="Captured" style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", inset:0 }}/>
              )}

              {!snapshotObjectUrl && camStatus!=="active" && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"10px", padding:"20px", textAlign:"center" }}>
                  {camStatus==="loading" && (
                    <>
                      <div style={{ width:"36px", height:"36px", borderRadius:"50%", border:"3px solid rgba(0,184,184,0.2)", borderTopColor:"#00B8B8", animation:"spin 0.8s linear infinite" }}/>
                      <p style={{ fontFamily:"Mulish,sans-serif", fontSize:"12px", color:textMuted }}>Starting camera…</p>
                    </>
                  )}
                  {camStatus==="idle" && (
                    <>
                      <VideoOff size={36} style={{ color:isDark?"#333333":"#CCCCCC" }}/>
                      <p style={{ fontFamily:"Mulish,sans-serif", fontSize:"12px", color:textMuted, maxWidth:"220px" }}>Camera is off. Tap "Open Camera" to start.</p>
                      <button
                        onClick={startCamera}
                        style={{ padding:"8px 18px", borderRadius:"7px", background:"transparent", border:`1px solid ${isDark?"#2A2A2A":"#E0E0E0"}`, color:isDark?"#888888":"#666666", fontFamily:"Rajdhani,sans-serif", fontSize:"12px", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:"6px" }}
                      >
                        <Video size={13}/> Open Camera
                      </button>
                    </>
                  )}
                  {(camStatus==="error"||camStatus==="denied") && (
                    <>
                      <AlertCircle size={32} style={{ color:"#CC0000" }}/>
                      <p style={{ fontFamily:"Mulish,sans-serif", fontSize:"11px", color:"#CC0000", maxWidth:"240px", lineHeight:1.5 }}>{errorMsg}</p>
                      {camStatus==="error" && (
                        <button
                          onClick={startCamera}
                          style={{ padding:"7px 14px", borderRadius:"7px", background:"rgba(204,0,0,0.10)", border:"1px solid rgba(204,0,0,0.3)", color:"#CC0000", fontFamily:"Rajdhani,sans-serif", fontSize:"11px", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:"5px" }}
                        >
                          <RefreshCw size={12}/> Retry
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Clock overlay on live feed */}
              {camStatus==="active" && !snapshotObjectUrl && (
                <div style={{ position:"absolute", bottom:"8px", left:"8px", background:"rgba(0,0,0,0.65)", borderRadius:"5px", padding:"3px 8px" }}>
                  <LiveClockMinimal/>
                </div>
              )}

              {/* Retake overlay button */}
              {snapshotObjectUrl && (
                <button
                  onClick={retake}
                  style={{ position:"absolute", top:"8px", right:"8px", padding:"5px 10px", borderRadius:"6px", background:"rgba(0,0,0,0.70)", border:"1px solid rgba(255,255,255,0.2)", color:"#FFFFFF", fontFamily:"Rajdhani,sans-serif", fontSize:"11px", fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:"5px" }}
                >
                  <RefreshCw size={11}/> Retake
                </button>
              )}

              {/* Face scanning overlay */}
              {snapshotObjectUrl && (faceStatus==="verifying"||faceStatus==="loading_models") && (
                <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"10px" }}>
                  <ScanFace size={40} style={{ color:"#00B8B8", animation:"spin 2s linear infinite" }}/>
                  <p style={{ fontFamily:"Rajdhani,sans-serif", fontWeight:700, fontSize:"12px", color:"#FFFFFF", letterSpacing:"0.12em" }}>
                    {faceStatus==="loading_models" ? "LOADING MODELS…" : "VERIFYING FACE…"}
                  </p>
                </div>
              )}

              {/* Matched badge */}
              {snapshotObjectUrl && faceStatus==="matched" && (
                <div style={{ position:"absolute", bottom:"8px", left:"8px", background:"rgba(0,150,136,0.90)", borderRadius:"5px", padding:"3px 10px", display:"flex", alignItems:"center", gap:"5px" }}>
                  <ShieldCheck size={11} style={{ color:"#FFFFFF" }}/>
                  <span style={{ fontFamily:"Rajdhani,sans-serif", fontWeight:700, fontSize:"11px", color:"#FFFFFF", letterSpacing:"0.08em" }}>FACE MATCHED</span>
                </div>
              )}

              {/* Mismatch red border */}
              {snapshotObjectUrl && ["mismatch","no_face_snapshot","no_profile","no_face_profile","error"].includes(faceStatus) && (
                <div style={{ position:"absolute", inset:0, border:"3px solid #CC0000", borderRadius:"10px", pointerEvents:"none", boxShadow:"inset 0 0 20px rgba(204,0,0,0.3)" }}/>
              )}
            </div>
          )}

          {/* Face verification banner */}
          {faceBanner && snapshotObjectUrl && (
            <div className="wc-banner" style={{ background:faceBanner.bg, border:`1px solid ${faceBanner.bdr}`, alignItems:"flex-start" }}>
              <ScanFace size={14} style={{ color:faceBanner.color, flexShrink:0, marginTop:"2px", ...(faceBanner.spinning?{animation:"spin 1.5s linear infinite"}:{}) }}/>
              <div style={{ flex:1 }}>
                <p style={{ fontFamily:"Mulish,sans-serif", fontSize:"12px", color:faceBanner.color, lineHeight:1.5 }}>{faceBanner.text}</p>
                {["mismatch","no_face_snapshot"].includes(faceStatus) && (
                  <button
                    onClick={retake}
                    style={{ marginTop:"6px", padding:"5px 10px", borderRadius:"5px", background:"rgba(204,0,0,0.12)", border:"1px solid rgba(204,0,0,0.35)", color:"#CC0000", fontFamily:"Rajdhani,sans-serif", fontWeight:700, fontSize:"11px", cursor:"pointer", display:"flex", alignItems:"center", gap:"5px" }}
                  >
                    <RefreshCw size={11}/> Retake Photo
                  </button>
                )}
                {faceScore !== null && faceStatus === "matched" && (
                  <p style={{ fontFamily:"Share Tech Mono,monospace", fontSize:"10px", color:faceBanner.color, marginTop:"3px", opacity:0.7 }}>
                    similarity: {(1 - faceScore).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* General save error */}
          {errorMsg && camStatus!=="error" && camStatus!=="denied" && (
            <div style={{ padding:"10px 12px", borderRadius:"7px", background:"rgba(204,0,0,0.08)", border:"1px solid rgba(204,0,0,0.25)" }}>
              <p style={{ fontFamily:"Mulish,sans-serif", fontSize:"12px", color:"#CC0000" }}>{errorMsg}</p>
            </div>
          )}

          {/* Upload progress bar */}
          {saving && uploadProgress > 0 && uploadProgress < 100 && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                <span style={{ fontFamily:"Rajdhani,sans-serif", fontSize:"9px", fontWeight:700, color:"#CC0000", letterSpacing:"0.14em" }}>UPLOADING SNAPSHOT</span>
                <span style={{ fontFamily:"Share Tech Mono,monospace", fontSize:"10px", color:textMuted }}>{uploadProgress}%</span>
              </div>
              <div style={{ height:"3px", borderRadius:"2px", background:isDark?"#1A1A1A":"#E8E8E8", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${uploadProgress}%`, background:"linear-gradient(90deg,#CC0000,#00B8B8)", borderRadius:"2px", transition:"width 200ms ease" }}/>
              </div>
            </div>
          )}

          <p style={{ fontFamily:"Mulish,sans-serif", fontSize:"10px", color:textMuted, textAlign:"center", lineHeight:1.5 }}>
            Your photo and face verification result will be recorded in the admin panel.
          </p>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding:"10px 16px",
          borderTop:`1px solid ${border}`,
          display:"flex",
          alignItems:"center",
          justifyContent:"space-between",
          gap:"8px",
          flexShrink:0,
          flexWrap:"wrap",
        }}>
          {/* Cancel — left */}
          <button
            onClick={onClose}
            className="wc-btn"
            style={{ background:"transparent", border:`1px solid ${isDark?"#2A2A2A":"#E0E0E0"}`, color:isDark?"#666666":"#888888" }}
          >
            Cancel
          </button>

          {/* Right-side action buttons */}
          <div style={{ display:"flex", gap:"8px", flex:1, justifyContent:"flex-end" }}>
            {camStatus==="active" && !snapshotObjectUrl && (
              <button
                onClick={captureSnapshot}
                className="wc-btn"
                style={{ background:"rgba(0,184,184,0.12)", border:"1px solid rgba(0,184,184,0.4)", color:"#00B8B8", display:"flex", alignItems:"center", gap:"6px" }}
              >
                <Camera size={13}/> Capture
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="wc-btn"
              style={{
                background: !canSave?(isDark?"#1A1A1A":"#E8E8E8"):"#CC0000",
                border:     !canSave?`1px solid ${isDark?"#2A2A2A":"#E0E0E0"}`:"1px solid #CC0000",
                color:      !canSave?(isDark?"#444444":"#BBBBBB"):"#FFFFFF",
                cursor:     !canSave?"not-allowed":"pointer",
                letterSpacing:"0.05em",
              }}
            >
              {saving
                ? (uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : "Saving…")
                : (action==="checkin" ? "Confirm Check In" : "Confirm Check Out")
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}