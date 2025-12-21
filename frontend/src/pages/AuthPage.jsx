import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { generateRandomName } from "../utils/randomName";

export default function AuthPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [mode, setMode] = useState("choice"); // choice, login, signup
    const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const from = location.state?.from?.pathname || "/";
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

    const handleAction = async (e) => {
        if (e) e.preventDefault();
        setError("");

        // Client-side validation
        if (mode === "signup" && form.password !== form.confirmPassword) {
            return setError("Passwords do not match");
        }

        setLoading(true);
        const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";

        // Strict Payload
        const payload = mode === "login"
            ? { username: form.username, password: form.password }
            : { username: form.username, email: form.email, password: form.password, confirmPassword: form.confirmPassword };

        try {
            const res = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("userId", data.userId);
                localStorage.setItem("name", data.name);
                if (data.username) localStorage.setItem("username", data.username);
                navigate(from, { replace: true });
            } else {
                console.error("❌ Auth Error Response:", data);
                setError(data.error || "Something went wrong");
            }
        } catch (err) {
            setError("Connection failed");
        } finally {
            setLoading(false);
        }
    };

    const handleSocial = (provider) => {
        alert(`${provider} login coming soon!`);
    };

    const renderCard = () => {
        if (mode === "choice") {
            return (
                <>
                    <h1 style={titleStyle}>Welcome to You&Me</h1>
                    <p style={taglineStyle}>Watch, chat, and connect together</p>

                    <div style={buttonGroup}>
                        <button onClick={() => setMode("login")} style={primaryBtn}>🔐 Login</button>
                        <button onClick={() => setMode("signup")} style={secondaryBtn}>✨ Sign Up</button>
                    </div>
                </>
            );
        }

        return (
            <form onSubmit={handleAction} style={formStyle}>
                <h2 style={{ marginBottom: "10px", color: "white" }}>
                    {mode === "login" ? "Login" : "Create Account"}
                </h2>

                {error && <p style={errorStyle}>{error}</p>}

                <input
                    type="text"
                    placeholder="Username"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    style={inputStyle}
                    required
                />

                {mode === "signup" && (
                    <input
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        style={inputStyle}
                        required
                    />
                )}

                <input
                    type="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    style={inputStyle}
                    required
                />

                {mode === "signup" && (
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={form.confirmPassword}
                        onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                        style={inputStyle}
                        required
                    />
                )}

                <button type="submit" disabled={loading} style={primaryBtn}>
                    {loading ? "Processing..." : (mode === "login" ? "Login" : "Sign Up")}
                </button>

                <div style={divider}>or continue with</div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button type="button" onClick={() => handleSocial("Google")} style={socialBtn}>
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="G" style={{ width: "14px", marginRight: "6px" }} />
                        Google
                    </button>
                    <button type="button" onClick={() => handleSocial("Apple")} style={socialBtn}>
                        <span style={{ fontSize: "16px", marginRight: "6px" }}></span>
                        Apple
                    </button>
                </div>

                <button type="button" onClick={() => setMode("choice")} style={backBtn}>
                    Back
                </button>
            </form>
        );
    };

    return (
        <div style={backgroundStyle}>
            <div style={overlayGlow} />
            <div style={glassCard}>
                <div style={logoWrapper}>You&Me</div>
                {renderCard()}
            </div>
        </div>
    );
}

// --- Styles ---
const backgroundStyle = {
    height: "100vh",
    width: "100vw",
    background: "#050505",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Inter', system-ui, sans-serif"
};

const overlayGlow = {
    position: "absolute",
    width: "100%",
    height: "100%",
    background: "radial-gradient(circle at 20% 30%, rgba(122, 53, 240, 0.15) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(0, 153, 255, 0.1) 0%, transparent 40%)",
    pointerEvents: "none"
};

const glassCard = {
    background: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "24px",
    padding: "40px",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
    zIndex: 1,
    animation: "fadeIn 0.5s ease-out"
};

const logoWrapper = {
    fontSize: "24px",
    fontWeight: "800",
    color: "#7a35f0",
    marginBottom: "30px",
    letterSpacing: "-1px"
};

const titleStyle = {
    fontSize: "28px",
    color: "white",
    marginBottom: "10px",
    fontWeight: "700"
};

const taglineStyle = {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: "14px",
    marginBottom: "35px"
};

const buttonGroup = {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
};

const primaryBtn = {
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #7a35f0, #5d1bc1)",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 4px 15px rgba(122, 53, 240, 0.3)"
};

const secondaryBtn = {
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s"
};

const socialBtn = {
    flex: 1,
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "white",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s"
};

const backBtn = {
    marginTop: "15px",
    border: "none",
    background: "transparent",
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: "13px",
    cursor: "pointer"
};

const divider = {
    color: "rgba(255, 255, 255, 0.2)",
    fontSize: "12px",
    margin: "5px 0"
};

const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    animation: "slideUp 0.3s ease-out"
};

const inputStyle = {
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(0, 0, 0, 0.2)",
    color: "white",
    fontSize: "15px",
    outline: "none",
    transition: "border 0.2s"
};

const errorStyle = {
    color: "#ff4757",
    fontSize: "13px",
    marginBottom: "5px"
};
