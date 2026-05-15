import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import logo from "../assets/logo.png";
import { loginUser } from "../firebase/authService";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
        setError("Invalid email or password.");
      } else if (code.includes("too-many-requests")) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#0A0A0A] flex items-center justify-center relative overflow-hidden px-4 py-8 sm:py-12">

      {/* Background watermark */}
      <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-0">
        <span
          style={{
            fontFamily: "Rajdhani, sans-serif",
            fontSize: "clamp(60px, 18vw, 280px)",
            fontWeight: 700,
            color: "#FFFFFF",
            opacity: 0.025,
            lineHeight: 0.9,
            textAlign: "center",
            letterSpacing: "-0.02em",
          }}
        >
          ROYALS
          <br />
          WEBTECH
        </span>
      </div>

      {/* Red glow top-left */}
      <div
        className="fixed top-0 left-0 pointer-events-none z-0"
        style={{
          width: "clamp(200px, 40vw, 384px)",
          height: "clamp(200px, 40vw, 384px)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(204,0,0,0.06) 0%, transparent 70%)",
        }}
      />
      {/* Teal glow bottom-right */}
      <div
        className="fixed bottom-0 right-0 pointer-events-none z-0"
        style={{
          width: "clamp(200px, 40vw, 384px)",
          height: "clamp(200px, 40vw, 384px)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,184,184,0.05) 0%, transparent 70%)",
        }}
      />

      {/* Login Card */}
      <div className="relative z-10 w-full" style={{ maxWidth: "440px" }}>

        {/* Logo */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <img
            src={logo}
            alt="Royals Webtech Pvt. Ltd."
            style={{
              height: "clamp(48px, 10vw, 64px)",
              objectFit: "contain",
              filter: "drop-shadow(0 0 16px rgba(204,0,0,0.4)) brightness(1.1) contrast(1.05)",
              userSelect: "none",
              WebkitUserSelect: "none",
              pointerEvents: "none",
            }}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            draggable={false}
          />
        </div>

        {/* Card */}
        <div
          className="rounded-xl"
          style={{
            background: "#111111",
            border: "1px solid #1E1E1E",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(204,0,0,0.05)",
            padding: "clamp(20px, 6vw, 32px)",
          }}
        >
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <p
              className="uppercase mb-2"
              style={{
                fontFamily: "Rajdhani, sans-serif",
                color: "#CC0000",
                letterSpacing: "0.2em",
                fontSize: "clamp(9px, 2vw, 11px)",
              }}
            >
              EMPLOYEE MANAGEMENT SYSTEM
            </p>
            <h1
              className="font-bold"
              style={{
                fontFamily: "Rajdhani, sans-serif",
                color: "#F0F0F0",
                fontSize: "clamp(22px, 6vw, 30px)",
                lineHeight: 1.1,
              }}
            >
              Royals Command Center
            </h1>
            <p
              className="mt-1"
              style={{
                fontFamily: "Mulish, sans-serif",
                color: "#A0A0A0",
                fontSize: "clamp(12px, 3vw, 14px)",
              }}
            >
              Sign in to access your workspace
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">

            {/* Email */}
            <div>
              <label
                className="block font-semibold mb-2 uppercase tracking-wide"
                style={{
                  fontFamily: "Mulish, sans-serif",
                  color: "#A0A0A0",
                  fontSize: "11px",
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@royalswebtech.com"
                className="w-full rounded-md outline-none transition-all"
                style={{
                  background: "#0A0A0A",
                  border: "1px solid #1E1E1E",
                  color: "#F0F0F0",
                  fontFamily: "Mulish, sans-serif",
                  fontSize: "clamp(13px, 3.5vw, 14px)",
                  padding: "clamp(10px, 2.5vw, 12px) 16px",
                }}
                onFocus={(e) => {
                  e.target.style.border = "1px solid #00B8B8";
                  e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.border = "1px solid #1E1E1E";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                className="block font-semibold mb-2 uppercase tracking-wide"
                style={{
                  fontFamily: "Mulish, sans-serif",
                  color: "#A0A0A0",
                  fontSize: "11px",
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
                  className="w-full rounded-md outline-none transition-all"
                  style={{
                    background: "#0A0A0A",
                    border: "1px solid #1E1E1E",
                    color: "#F0F0F0",
                    fontFamily: "Mulish, sans-serif",
                    fontSize: "clamp(13px, 3.5vw, 14px)",
                    padding: "clamp(10px, 2.5vw, 12px) 48px clamp(10px, 2.5vw, 12px) 16px",
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "1px solid #00B8B8";
                    e.target.style.boxShadow = "0 0 0 3px rgba(0,184,184,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "1px solid #1E1E1E";
                    e.target.style.boxShadow = "none";
                  }}
                />
                {/* Larger tap target for mobile */}
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
                  }}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p
                className="rounded px-3 py-2"
                style={{
                  color: "#CC0000",
                  background: "rgba(204,0,0,0.08)",
                  border: "1px solid rgba(204,0,0,0.2)",
                  fontFamily: "Mulish, sans-serif",
                  fontSize: "clamp(11px, 3vw, 13px)",
                }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md font-bold flex items-center justify-center gap-2 transition-all"
              style={{
                background: loading ? "#880000" : "#CC0000",
                color: "#FFFFFF",
                fontFamily: "Rajdhani, sans-serif",
                fontSize: "clamp(14px, 4vw, 15px)",
                letterSpacing: "0.05em",
                padding: "clamp(11px, 3vw, 13px) 16px",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                // Minimum 44px touch target
                minHeight: "44px",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = "#AA0000";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = "#CC0000";
              }}
            >
              {loading ? (
                <>
                  <div
                    className="rounded-full border-2"
                    style={{
                      width: "16px", height: "16px",
                      borderColor: "rgba(255,255,255,0.3)",
                      borderTopColor: "#FFFFFF",
                      animation: "spin 0.7s linear infinite",
                      flexShrink: 0,
                    }}
                  />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-5 sm:mt-6 pt-5 sm:pt-6" style={{ borderTop: "1px solid #1A1A1A" }}>
            <a
              href="https://royalswebtechpvtltd.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center mb-3"
              style={{ textDecoration: "none" }}
              onMouseEnter={(e) => {
                const img = e.currentTarget.querySelector("img");
                if (img) {
                  img.style.filter = "brightness(1.1) contrast(1.05) drop-shadow(0 0 12px rgba(204,0,0,0.5))";
                  img.style.transform = "scale(1.05)";
                }
              }}
              onMouseLeave={(e) => {
                const img = e.currentTarget.querySelector("img");
                if (img) {
                  img.style.filter = "brightness(0.8) contrast(1.05) drop-shadow(0 0 6px rgba(204,0,0,0.2))";
                  img.style.transform = "scale(1)";
                }
              }}
            >
              <img
                src={logo}
                alt="Royals Webtech Pvt. Ltd."
                style={{
                  height: "clamp(24px, 6vw, 32px)",
                  objectFit: "contain",
                  filter: "brightness(0.8) contrast(1.05) drop-shadow(0 0 6px rgba(204,0,0,0.2))",
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;