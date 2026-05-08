// ─────────────────────────────────────────────────────────────
//  src/pages/AdminSetup.jsx
//
//  ONE-TIME setup page. Visit /setup after first deploy.
//  It signs in with your admin credentials and writes the
//  /users/{uid} document with role:"admin" so Firestore rules
//  work correctly.
//
//  After setup succeeds, REMOVE the /setup route from App.jsx.
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";

export default function AdminSetup() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [status,   setStatus]   = useState("idle"); // idle | loading | done | error
  const [message,  setMessage]  = useState("");

  async function handleSetup(e) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      // 1. Sign in as admin
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid  = cred.user.uid;

      // 2. Check if doc already exists
      const existing = await getDoc(doc(db, "users", uid));
      if (existing.exists() && existing.data().role === "admin") {
        setStatus("done");
        setMessage(`✅ Admin doc already exists for UID: ${uid}\nYour rules are already set up correctly.`);
        return;
      }

      // 3. Write /users/{uid} with role: "admin"
      const initials = name
        .trim()
        .split(/\s+/)
        .map(n => n[0].toUpperCase())
        .join("");

      await setDoc(doc(db, "users", uid), {
        role:      "admin",
        name:      name.trim() || "Admin",
        initials:  initials || "AD",
        email,
        empId:     null,
        createdAt: serverTimestamp(),
      });

      setStatus("done");
      setMessage(
        `✅ Success!\n\nAdmin profile created:\n  UID: ${uid}\n  Email: ${email}\n  Role: admin\n\n` +
        `Now remove the /setup route from App.jsx and redeploy.`
      );
    } catch (err) {
      setStatus("error");
      setMessage(`❌ Error: ${err.message}`);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0A",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Mulish, sans-serif",
    }}>
      <div style={{
        background: "#111111", border: "1px solid #1E1E1E",
        borderRadius: "14px", padding: "36px", width: "420px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
      }}>
        <div style={{
          fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
          fontSize: "10px", color: "#CC0000", letterSpacing: "0.2em",
          marginBottom: "6px",
        }}>
          ONE-TIME SETUP
        </div>
        <h1 style={{
          fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
          fontSize: "24px", color: "#F0F0F0", marginBottom: "6px",
        }}>
          Create Admin Profile
        </h1>
        <p style={{ fontSize: "12px", color: "#666", marginBottom: "28px", lineHeight: 1.6 }}>
          This writes your <code style={{ color: "#00B8B8" }}>/users/&#123;uid&#125;</code> doc
          with <code style={{ color: "#00B8B8" }}>role: "admin"</code> so Firestore
          rules recognise you as admin. Run once, then remove this route.
        </p>

        {status !== "done" && (
          <form onSubmit={handleSetup} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { label: "Your Name",       value: name,     onChange: setName,     type: "text",     placeholder: "e.g. Rahul Admin" },
              { label: "Admin Email",     value: email,    onChange: setEmail,    type: "email",    placeholder: "admin@royalswebtech.com" },
              { label: "Admin Password",  value: password, onChange: setPassword, type: "password", placeholder: "••••••••" },
            ].map(({ label, value, onChange, type, placeholder }) => (
              <div key={label}>
                <label style={{ fontSize: "10px", fontWeight: 700, color: "#CC0000",
                  letterSpacing: "0.15em", display: "block", marginBottom: "6px",
                  fontFamily: "Rajdhani, sans-serif" }}>
                  {label.toUpperCase()}
                </label>
                <input
                  type={type}
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  placeholder={placeholder}
                  required
                  style={{
                    width: "100%", background: "#0A0A0A", border: "1px solid #1E1E1E",
                    borderRadius: "7px", padding: "10px 12px", color: "#F0F0F0",
                    fontSize: "13px", outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            {status === "error" && (
              <div style={{
                padding: "10px 12px", borderRadius: "7px",
                background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.25)",
                fontSize: "12px", color: "#CC0000", whiteSpace: "pre-wrap",
              }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                padding: "12px", background: status === "loading" ? "#880000" : "#CC0000",
                border: "none", borderRadius: "7px", color: "#fff",
                fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
                fontSize: "14px", letterSpacing: "0.08em", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
            >
              {status === "loading" ? (
                <>
                  <div style={{ width: "14px", height: "14px", borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                    animation: "spin 0.7s linear infinite" }} />
                  SETTING UP...
                </>
              ) : "CREATE ADMIN PROFILE"}
            </button>
          </form>
        )}

        {status === "done" && (
          <div style={{
            padding: "14px", borderRadius: "8px",
            background: "rgba(0,184,184,0.08)", border: "1px solid rgba(0,184,184,0.3)",
            fontSize: "12px", color: "#00B8B8", whiteSpace: "pre-wrap", lineHeight: 1.7,
          }}>
            {message}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
