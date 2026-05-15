import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import logo from "../assets/logo.png";
import { loginUser } from "../firebase/authService";

/* ─── Keyframe + class injection (runs once at module load) ─── */
const STYLE_ID = "rwt-login-styles";
if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Mulish:wght@400;500;600;700&display=swap');

    @keyframes spin       { to { transform: rotate(360deg); } }
    @keyframes breathe    { 0%,100%{opacity:.022} 50%{opacity:.042} }
    @keyframes floatCard  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
    @keyframes rotatRing  { to { transform:rotate(360deg); } }
    @keyframes pulsGlow   { 0%,100%{opacity:.55} 50%{opacity:1} }
    @keyframes driftA     { 0%{transform:translate(0,0)} 33%{transform:translate(18px,-12px)} 66%{transform:translate(-10px,20px)} 100%{transform:translate(0,0)} }
    @keyframes driftB     { 0%{transform:translate(0,0)} 40%{transform:translate(-20px,14px)} 80%{transform:translate(12px,-18px)} 100%{transform:translate(0,0)} }
    @keyframes gridFade   { 0%,100%{opacity:.035} 50%{opacity:.055} }
    @keyframes shimmerBtn { 0%{left:-60%} 100%{left:160%} }
    @keyframes scanline   { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
    @keyframes borderGlow { 0%,100%{box-shadow:0 0 0 1px rgba(204,0,0,.18),0 0 24px rgba(204,0,0,.06),0 32px 80px rgba(0,0,0,.7)} 50%{box-shadow:0 0 0 1px rgba(204,0,0,.32),0 0 40px rgba(204,0,0,.12),0 32px 80px rgba(0,0,0,.7)} }
    @keyframes vignetteB  { 0%,100%{opacity:.55} 50%{opacity:.75} }
    @keyframes reveal     { from{opacity:0;transform:translateY(18px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes logoReveal { from{opacity:0;transform:translateY(-10px) scale(.92)} to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes particleFlt{ 0%{transform:translateY(0) translateX(0);opacity:0} 10%{opacity:1} 90%{opacity:.6} 100%{transform:translateY(-60px) translateX(12px);opacity:0} }
    @keyframes sweepShine { 0%{left:-60%} 100%{left:160%} }
    @keyframes rippleK    { to{transform:scale(2.5);opacity:0} }

    .rwt-card {
      animation: reveal .65s cubic-bezier(.22,1,.36,1) both,
                 borderGlow 4s ease-in-out 1s infinite;
    }
    .rwt-logo-wrap  { animation: logoReveal .55s cubic-bezier(.22,1,.36,1) .1s both; }
    .rwt-card-float { animation: floatCard 6s ease-in-out 1s infinite; }
    .rwt-watermark  { animation: breathe 6s ease-in-out infinite; }
    .rwt-ring       { animation: rotatRing 18s linear infinite; }
    .rwt-logo-glow  { animation: pulsGlow 3s ease-in-out infinite; }
    .rwt-grid       { animation: gridFade 8s ease-in-out infinite; }
    .rwt-vignette   { animation: vignetteB 10s ease-in-out infinite; }

    .rwt-btn-shimmer {
      position:absolute;
      top:0; left:0; right:0; bottom:0;
      border-radius: inherit;
      overflow: hidden;
      pointer-events: none;
    }
    .rwt-btn-shimmer::after {
      content:'';
      position:absolute;
      top:-10%; left:-60%;
      width:45%; height:120%;
      background: linear-gradient(
        105deg,
        transparent 0%,
        rgba(255,255,255,.06) 20%,
        rgba(255,255,255,.22) 50%,
        rgba(255,255,255,.06) 80%,
        transparent 100%
      );
      animation: shimmerBtn 2.8s ease-in-out 1.5s infinite;
      pointer-events: none;
    }

    .rwt-input {
      background: rgba(8,8,8,.85) !important;
      border: 1px solid rgba(40,40,40,.9) !important;
      color: #F0F0F0 !important;
      font-family: 'Mulish', sans-serif !important;
      transition: border-color 200ms, box-shadow 200ms !important;
      backdrop-filter: blur(4px);
    }
    .rwt-input:focus {
      border-color: rgba(0,184,184,.7) !important;
      box-shadow: 0 0 0 3px rgba(0,184,184,.12), inset 0 0 12px rgba(0,184,184,.04) !important;
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
      }
    }
    @media (max-width: 640px) {
      .rwt-card       { animation: reveal .5s ease both; }
      .rwt-card-float { animation: none; }
      .rwt-ring       { animation: none; }
    }
  `;
  document.head.appendChild(s);
}

/* ─── Floating particle dot ─── */
function Particle({ x, y, delay, size, red }) {
  return (
    <div
      style={{
        position: "fixed",
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        background: red ? "rgba(204,0,0,.7)" : "rgba(0,184,184,.6)",
        animation: `particleFlt ${4 + delay}s ease-in-out ${delay}s infinite`,
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}

/* ─── Subtle teal scanline sweep ─── */
function Scanline() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        overflow: "hidden",
        opacity: 0.018,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: "2px",
          background: "rgba(0,184,184,.8)",
          animation: "scanline 8s linear infinite",
        }}
      />
    </div>
  );
}

/* ─── Corner accent decoration ─── */
function CornerAccent({ style }) {
  return (
    <div
      style={{
        position: "absolute",
        width: 18,
        height: 18,
        ...style,
      }}
    />
  );
}

/* ═══════════════════════════════════════
   MAIN LOGIN COMPONENT
═══════════════════════════════════════ */
function Login() {
  const navigate = useNavigate();

  /* ── state (unchanged) ── */
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  /* stable particle data – generated once */
  const [particles] = useState(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: 5 + Math.random() * 90,
      y: 5 + Math.random() * 90,
      delay: Math.random() * 4,
      size: 1.5 + Math.random() * 2,
      red: Math.random() > 0.5,
    }))
  );

  const btnRef = useRef(null);

  /* ── ripple effect on button click ── */
  const handleRipple = (e) => {
    const btn = btnRef.current;
    if (!btn || loading) return;
    const r = document.createElement("span");
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.cssText = `
      position:absolute; border-radius:50%;
      background:rgba(255,255,255,.18);
      width:${size}px; height:${size}px;
      left:${e.clientX - rect.left - size / 2}px;
      top:${e.clientY - rect.top - size / 2}px;
      transform:scale(0);
      animation:rippleK .55s ease-out;
      pointer-events:none;
    `;
    btn.appendChild(r);
    r.addEventListener("animationend", () => r.remove());
  };

  /* ── handleLogin (unchanged business logic) ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const user = await loginUser(email, password);
      localStorage.setItem("rwt-role", user.role);
      localStorage.setItem(
        "rwt-user",
        JSON.stringify({
          name: user.name,
          role: user.role,
          initials: user.initials,
          empId: user.empId ?? null,
          uid: user.uid,
        })
      );
      navigate(user.role === "admin" ? "/dashboard" : "/my-attendance");
    } catch (err) {
      const code = err.code ?? "";
      if (
        code.includes("invalid-credential") ||
        code.includes("wrong-password") ||
        code.includes("user-not-found")
      ) {
        setError("Invalid email or password.");
      } else if (code.includes("too-many-requests")) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
      setLoading(false);
    }
  };

  /* ── shared inline-style helpers ── */
  const onInputFocus = (e) => {
    e.target.style.border     = "1px solid rgba(0,184,184,.65)";
    e.target.style.boxShadow  = "0 0 0 3px rgba(0,184,184,.1), inset 0 0 10px rgba(0,184,184,.03)";
  };
  const onInputBlur = (e) => {
    e.target.style.border    = "1px solid rgba(40,40,40,.9)";
    e.target.style.boxShadow = "none";
  };

  const onBtnEnter = (e) => {
    if (loading) return;
    e.currentTarget.style.background  = "linear-gradient(135deg,#CC0000 0%,#EE1111 50%,#CC0000 100%)";
    e.currentTarget.style.boxShadow   = "0 0 28px rgba(204,0,0,.4),0 6px 24px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.1)";
    e.currentTarget.style.transform   = "translateY(-1px)";
  };
  const onBtnLeave = (e) => {
    if (loading) return;
    e.currentTarget.style.background  = "linear-gradient(135deg,#AA0000 0%,#CC0000 50%,#BB0000 100%)";
    e.currentTarget.style.boxShadow   = "0 0 18px rgba(204,0,0,.25),0 4px 16px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.08)";
    e.currentTarget.style.transform   = "translateY(0)";
  };

  const onEyeEnter = (e) => {
    e.currentTarget.style.color     = "#00B8B8";
    e.currentTarget.style.transform = "scale(1.15) rotate(8deg)";
  };
  const onEyeLeave = (e) => {
    e.currentTarget.style.color     = "#4A4A4A";
    e.currentTarget.style.transform = "scale(1) rotate(0deg)";
  };

  const onFooterLogoEnter = (e) => {
    const img = e.currentTarget.querySelector("img");
    if (img) {
      img.style.filter    = "brightness(1.15) contrast(1.05) drop-shadow(0 0 14px rgba(204,0,0,.6))";
      img.style.transform = "scale(1.06)";
    }
  };
  const onFooterLogoLeave = (e) => {
    const img = e.currentTarget.querySelector("img");
    if (img) {
      img.style.filter    = "brightness(0.75) contrast(1.05) drop-shadow(0 0 6px rgba(204,0,0,.2))";
      img.style.transform = "scale(1)";
    }
  };

  /* ════════════════════════════════════ */
  return (
    <div
      className="min-h-screen min-h-[100dvh] flex items-center justify-center relative overflow-hidden px-4 py-8 sm:py-12"
      style={{ background: "#06060A" }}
    >

      {/* ── Animated grid overlay ── */}
      <div
        className="rwt-grid fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage:
            "linear-gradient(rgba(0,184,184,.08) 1px,transparent 1px)," +
            "linear-gradient(90deg,rgba(0,184,184,.08) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── Radial vignette ── */}
      <div
        className="rwt-vignette fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%,transparent 30%,#06060A 100%)",
        }}
      />

      {/* ── Red ambient glow — top-left ── */}
      <div
        className="fixed pointer-events-none"
        style={{
          zIndex: 0,
          top: "-80px",
          left: "-80px",
          width: "clamp(280px,50vw,560px)",
          height: "clamp(280px,50vw,560px)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(204,0,0,.09) 0%,transparent 68%)",
          animation: "driftA 22s ease-in-out infinite",
        }}
      />

      {/* ── Teal ambient glow — bottom-right ── */}
      <div
        className="fixed pointer-events-none"
        style={{
          zIndex: 0,
          bottom: "-80px",
          right: "-80px",
          width: "clamp(280px,50vw,560px)",
          height: "clamp(280px,50vw,560px)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(0,184,184,.07) 0%,transparent 68%)",
          animation: "driftB 26s ease-in-out infinite",
        }}
      />

      {/* ── Scanline ── */}
      <Scanline />

      {/* ── Floating particles (sm+ only) ── */}
      <div className="hidden sm:block">
        {particles.map((p) => (
          <Particle key={p.id} {...p} />
        ))}
      </div>

      {/* ── Background watermark ── */}
      <div
        className="rwt-watermark fixed inset-0 flex flex-col items-center justify-center pointer-events-none select-none"
        style={{ zIndex: 0 }}
      >
        <div style={{ position: "relative", overflow: "hidden", lineHeight: 0.9, textAlign: "center" }}>
          <span
            style={{
              fontFamily: "Rajdhani, sans-serif",
              fontSize: "clamp(60px,18vw,280px)",
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "-0.02em",
              display: "block",
            }}
          >
            ROYALS
            <br />
            WEBTECH
          </span>
          {/* Light sweep */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "30%",
              background:
                "linear-gradient(105deg,transparent,rgba(255,255,255,.06),transparent)",
              animation: "sweepShine 9s ease-in-out 2s infinite",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {/* ════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════ */}
      <div
        className="rwt-card-float relative z-10 w-full"
        style={{ maxWidth: "440px" }}
      >

        {/* ── LOGO ── */}
        <div
          className="rwt-logo-wrap flex justify-center mb-6 sm:mb-8"
          style={{ position: "relative" }}
        >
          {/* Rotating ring */}
          <div
            className="rwt-ring absolute"
            style={{
              width: "clamp(76px,16vw,100px)",
              height: "clamp(76px,16vw,100px)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              borderRadius: "50%",
              border: "1px solid rgba(204,0,0,.22)",
              borderTopColor: "rgba(0,184,184,.4)",
            }}
          />
          {/* Glow halo */}
          <div
            className="rwt-logo-glow absolute"
            style={{
              width: "clamp(60px,13vw,84px)",
              height: "clamp(60px,13vw,84px)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(204,0,0,.22) 0%,transparent 70%)",
              filter: "blur(8px)",
            }}
          />
          <img
            src={logo}
            alt="Royals Webtech Pvt. Ltd."
            style={{
              height: "clamp(48px,10vw,64px)",
              objectFit: "contain",
              filter:
                "drop-shadow(0 0 18px rgba(204,0,0,.55)) drop-shadow(0 0 6px rgba(0,184,184,.2)) brightness(1.12) contrast(1.06)",
              userSelect: "none",
              WebkitUserSelect: "none",
              pointerEvents: "none",
              position: "relative",
              zIndex: 2,
            }}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            draggable={false}
          />
        </div>

        {/* ── CARD ── */}
        <div
          className="rwt-card rounded-xl"
          style={{
            background:
              "linear-gradient(145deg,rgba(16,14,14,.97) 0%,rgba(10,10,12,.98) 100%)",
            border: "1px solid rgba(204,0,0,.18)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow:
              "0 0 0 1px rgba(204,0,0,.08),0 32px 80px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.04)",
            padding: "clamp(20px,6vw,32px)",
            position: "relative",
            overflow: "hidden",
          }}
        >

          {/* Holographic corner accents */}
          <CornerAccent style={{ top: 0, left: 0, borderTop: "2px solid rgba(204,0,0,.5)", borderLeft: "2px solid rgba(204,0,0,.5)", borderRadius: "12px 0 0 0" }} />
          <CornerAccent style={{ top: 0, right: 0, borderTop: "2px solid rgba(0,184,184,.4)", borderRight: "2px solid rgba(0,184,184,.4)", borderRadius: "0 12px 0 0" }} />
          <CornerAccent style={{ bottom: 0, left: 0, borderBottom: "2px solid rgba(0,184,184,.3)", borderLeft: "2px solid rgba(0,184,184,.3)", borderRadius: "0 0 0 12px" }} />
          <CornerAccent style={{ bottom: 0, right: 0, borderBottom: "2px solid rgba(204,0,0,.3)", borderRight: "2px solid rgba(204,0,0,.3)", borderRadius: "0 0 12px 0" }} />

          {/* Inner card sheen */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              borderRadius: "inherit",
              background:
                "linear-gradient(135deg,rgba(204,0,0,.04) 0%,transparent 40%,rgba(0,184,184,.03) 100%)",
            }}
          />

          {/* ── Header ── */}
          <div className="mb-6 sm:mb-8" style={{ position: "relative", zIndex: 1 }}>
            <p
              className="uppercase mb-2"
              style={{
                fontFamily: "Rajdhani, sans-serif",
                color: "#CC0000",
                letterSpacing: "0.22em",
                fontSize: "clamp(9px,2vw,11px)",
                textShadow: "0 0 12px rgba(204,0,0,.4)",
              }}
            >
              EMPLOYEE MANAGEMENT SYSTEM
            </p>
            <h1
              className="font-bold"
              style={{
                fontFamily: "Rajdhani, sans-serif",
                color: "#F0F0F0",
                fontSize: "clamp(22px,6vw,30px)",
                lineHeight: 1.1,
                textShadow: "0 0 24px rgba(255,255,255,.06)",
              }}
            >
              Royals Command Center
            </h1>
            <p
              className="mt-1"
              style={{
                fontFamily: "Mulish, sans-serif",
                color: "#686868",
                fontSize: "clamp(12px,3vw,14px)",
              }}
            >
              Sign in to access your workspace
            </p>
            {/* Decorative divider */}
            <div
              style={{
                marginTop: "16px",
                height: "1px",
                background:
                  "linear-gradient(90deg,rgba(204,0,0,.4),rgba(0,184,184,.25),transparent)",
              }}
            />
          </div>

          {/* ── Form ── */}
          <form
            onSubmit={handleLogin}
            className="space-y-4 sm:space-y-5"
            style={{ position: "relative", zIndex: 1 }}
          >

            {/* Email */}
            <div>
              <label
                className="block font-semibold mb-2 uppercase tracking-wide"
                style={{
                  fontFamily: "Mulish, sans-serif",
                  color: "#555",
                  fontSize: "11px",
                  letterSpacing: "0.14em",
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="rwt-input w-full rounded-md outline-none"
                style={{
                  background: "rgba(8,8,8,.85)",
                  border: "1px solid rgba(40,40,40,.9)",
                  color: "#F0F0F0",
                  fontFamily: "Mulish, sans-serif",
                  fontSize: "clamp(13px,3.5vw,14px)",
                  padding: "clamp(10px,2.5vw,12px) 16px",
                }}
                onFocus={onInputFocus}
                onBlur={onInputBlur}
              />
            </div>

            {/* Password */}
            <div>
              <label
                className="block font-semibold mb-2 uppercase tracking-wide"
                style={{
                  fontFamily: "Mulish, sans-serif",
                  color: "#555",
                  fontSize: "11px",
                  letterSpacing: "0.14em",
                }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rwt-input w-full rounded-md outline-none"
                  style={{
                    background: "rgba(8,8,8,.85)",
                    border: "1px solid rgba(40,40,40,.9)",
                    color: "#F0F0F0",
                    fontFamily: "Mulish, sans-serif",
                    fontSize: "clamp(13px,3.5vw,14px)",
                    padding: "clamp(10px,2.5vw,12px) 48px clamp(10px,2.5vw,12px) 16px",
                  }}
                  onFocus={onInputFocus}
                  onBlur={onInputBlur}
                />
                {/* Password visibility toggle */}
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-0 top-0 h-full flex items-center justify-center"
                  style={{
                    width: "44px",
                    color: "#4A4A4A",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    transition: "color 200ms, transform 200ms",
                  }}
                  onMouseEnter={onEyeEnter}
                  onMouseLeave={onEyeLeave}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                className="rounded-md px-3 py-2.5 flex items-center gap-2"
                style={{
                  color: "#FF4444",
                  background: "rgba(204,0,0,.07)",
                  border: "1px solid rgba(204,0,0,.22)",
                  fontFamily: "Mulish, sans-serif",
                  fontSize: "clamp(11px,3vw,13px)",
                  boxShadow: "inset 0 0 12px rgba(204,0,0,.04)",
                }}
              >
                <span style={{ color: "#CC0000", fontSize: "14px" }}>⚠</span>
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              ref={btnRef}
              type="submit"
              disabled={loading}
              onClick={handleRipple}
              className="w-full rounded-md font-bold flex items-center justify-center gap-2"
              style={{
                background: loading
                  ? "linear-gradient(135deg,#6a0000,#880000)"
                  : "linear-gradient(135deg,#AA0000 0%,#CC0000 50%,#BB0000 100%)",
                color: "#FFFFFF",
                fontFamily: "Rajdhani, sans-serif",
                fontSize: "clamp(14px,4vw,15px)",
                letterSpacing: "0.08em",
                padding: "clamp(11px,3vw,13px) 16px",
                border: "1px solid rgba(255,80,80,.15)",
                cursor: loading ? "not-allowed" : "pointer",
                minHeight: "44px",
                position: "relative",
                overflow: "hidden",
                boxShadow: loading
                  ? "none"
                  : "0 0 18px rgba(204,0,0,.25),0 4px 16px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.08)",
                transition: "all 200ms ease",
              }}
              onMouseEnter={onBtnEnter}
              onMouseLeave={onBtnLeave}
            >
              {/* Shimmer sweep — contained div so it never clips */}
              {!loading && <div className="rwt-btn-shimmer" />}

              {loading ? (
                <>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,.15)",
                      borderTopColor: "#FFFFFF",
                      animation: "spin 0.65s linear infinite",
                      flexShrink: 0,
                      boxShadow: "0 0 8px rgba(255,255,255,.3)",
                    }}
                  />
                  <span style={{ letterSpacing: "0.12em", fontSize: "13px" }}>
                    AUTHENTICATING...
                  </span>
                </>
              ) : (
                <>
                  <LogIn size={15} />
                  SIGN IN
                </>
              )}
            </button>
          </form>

          {/* ── Footer ── */}
          <div
            className="mt-5 sm:mt-6 pt-5 sm:pt-6"
            style={{
              borderTop: "1px solid rgba(255,255,255,.04)",
              position: "relative",
              zIndex: 1,
            }}
          >
            <a
              href="https://royalswebtechpvtltd.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center mb-3"
              style={{ textDecoration: "none" }}
              onMouseEnter={onFooterLogoEnter}
              onMouseLeave={onFooterLogoLeave}
            >
              <img
                src={logo}
                alt="Royals Webtech Pvt. Ltd."
                style={{
                  height: "clamp(24px,6vw,32px)",
                  objectFit: "contain",
                  filter:
                    "brightness(0.75) contrast(1.05) drop-shadow(0 0 6px rgba(204,0,0,.2))",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  pointerEvents: "none",
                  transition: "filter 250ms ease, transform 250ms ease",
                }}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                draggable={false}
              />
            </a>
            <p
              style={{
                textAlign: "center",
                fontFamily: "Rajdhani, sans-serif",
                color: "rgba(60,60,60,.8)",
                fontSize: "10px",
                letterSpacing: "0.18em",
              }}
            >
              © ROYALS WEBTECH PVT. LTD.
            </p>
          </div>

        </div>{/* end card */}
      </div>{/* end content */}
    </div>
  );
}

export default Login;