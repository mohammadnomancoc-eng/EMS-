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
      // Persist role + profile for layout components
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
      // Firebase error codes → friendly messages
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
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center relative overflow-hidden">
      {/* Background watermark */}
      <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-0">
        <span
          style={{
            fontFamily: "Rajdhani, sans-serif",
            fontSize: "clamp(80px, 18vw, 280px)",
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

      {/* Subtle red glow top-left */}
      <div
        className="fixed top-0 left-0 w-96 h-96 rounded-full pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(204,0,0,0.06) 0%, transparent 70%)",
        }}
      />
      {/* Subtle teal glow bottom-right */}
      <div
        className="fixed bottom-0 right-0 w-96 h-96 rounded-full pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(0,184,184,0.05) 0%, transparent 70%)",
        }}
      />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="flex justify-center mb-8 mt-4">
          <img
            src={logo}
            alt="Royals Webtech Pvt. Ltd."
            className="h-16 object-contain"
            style={{
              filter:
                "drop-shadow(0 0 16px rgba(204,0,0,0.4)) brightness(1.1) contrast(1.05)",
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
          className="rounded-xl p-8"
          style={{
            background: "#111111",
            border: "1px solid #1E1E1E",
            boxShadow:
              "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(204,0,0,0.05)",
          }}
        >
          {/* Header */}
          <div className="mb-8">
            <p
              className="text-xs uppercase tracking-widest mb-2"
              style={{
                fontFamily: "Rajdhani, sans-serif",
                color: "#CC0000",
                letterSpacing: "0.2em",
              }}
            >
              EMPLOYEE MANAGEMENT SYSTEM
            </p>
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: "Rajdhani, sans-serif", color: "#F0F0F0" }}
            >
              Royals Command Center
            </h1>
            <p
              className="text-sm mt-1"
              style={{ fontFamily: "Mulish, sans-serif", color: "#A0A0A0" }}
            >
              Sign in to access your workspace
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label
                className="block text-xs font-semibold mb-2 uppercase tracking-wide"
                style={{ fontFamily: "Mulish, sans-serif", color: "#A0A0A0" }}
              >
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@royalswebtech.com"
                className="w-full px-4 py-3 rounded-md text-sm outline-none transition-all"
                style={{
                  background: "#0A0A0A",
                  border: "1px solid #1E1E1E",
                  color: "#F0F0F0",
                  fontFamily: "Mulish, sans-serif",
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
                className="block text-xs font-semibold mb-2 uppercase tracking-wide"
                style={{ fontFamily: "Mulish, sans-serif", color: "#A0A0A0" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-md text-sm outline-none transition-all pr-12"
                  style={{
                    background: "#0A0A0A",
                    border: "1px solid #1E1E1E",
                    color: "#F0F0F0",
                    fontFamily: "Mulish, sans-serif",
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
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#4A4A4A" }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p
                className="text-xs px-3 py-2 rounded"
                style={{
                  color: "#CC0000",
                  background: "rgba(204,0,0,0.08)",
                  border: "1px solid rgba(204,0,0,0.2)",
                  fontFamily: "Mulish, sans-serif",
                }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={{
                background: loading ? "#880000" : "#CC0000",
                color: "#FFFFFF",
                fontFamily: "Rajdhani, sans-serif",
                fontSize: "15px",
                letterSpacing: "0.05em",
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
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
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

          {/* Footer hint */}
          <div className="mt-6 pt-6" style={{ borderTop: "1px solid #1A1A1A" }}>
            <a
              href="https://royalswebtechpvtltd.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center mb-3"
              style={{ textDecoration: "none" }}
              onMouseEnter={(e) => {
                e.currentTarget.querySelector("img").style.filter =
                  "brightness(1.1) contrast(1.05) drop-shadow(0 0 12px rgba(204,0,0,0.5))";
                e.currentTarget.querySelector("img").style.transform =
                  "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.querySelector("img").style.filter =
                  "brightness(0.8) contrast(1.05) drop-shadow(0 0 6px rgba(204,0,0,0.2))";
                e.currentTarget.querySelector("img").style.transform =
                  "scale(1)";
              }}
            >
              <img
                src={logo}
                alt="Royals Webtech Pvt. Ltd."
                className="h-8 object-contain"
                style={{
                  filter:
                    "brightness(0.8) contrast(1.05) drop-shadow(0 0 6px rgba(204,0,0,0.2))",
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
