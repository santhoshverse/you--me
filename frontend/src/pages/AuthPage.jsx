import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GoogleLogin } from '@react-oauth/google';

export default function AuthPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [mode, setMode] = useState("login"); // 'login', 'signup', 'admin'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        username: "",
        displayName: ""
    });

    const from = location.state?.from?.pathname || "/";
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) navigate(from, { replace: true });
    }, [navigate, from]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        let endpoint = `${BACKEND_URL}/api/auth/${mode}`;
        let payload = { email: formData.email, password: formData.password };

        if (mode === "signup") {
            payload = { ...formData, display_name: formData.displayName };
        }

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("userId", data.userId);
                localStorage.setItem("name", data.name);
                localStorage.setItem("username", data.username);
                navigate(from, { replace: true });
            } else {
                setError(data.error || "Authentication failed");
            }
        } catch (err) {
            setError("Connection to auth server failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/social`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: "google",
                    idToken: credentialResponse.credential
                })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("userId", data.userId);
                localStorage.setItem("name", data.name);
                localStorage.setItem("username", data.username);
                navigate(from, { replace: true });
            } else {
                setError(data.error || "Social login failed");
            }
        } catch (err) {
            setError("Google login connection failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/demo-login`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("userId", data.userId);
                localStorage.setItem("name", data.name);
                localStorage.setItem("username", data.username);
                navigate(from, { replace: true });
            } else {
                setError(data.error || "Demo login failed");
            }
        } catch (err) {
            setError("Demo login connection failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={backgroundStyle}>
            <div style={overlayGlow} />
            <div style={glassCard}>
                <div style={logoWrapper}>You&Me</div>

                <div style={tabsContainer}>
                    <button
                        onClick={() => { setMode("login"); setError(""); }}
                        style={mode === "login" ? activeTab : tabStyle}
                    >Login</button>
                    <button
                        onClick={() => { setMode("signup"); setError(""); }}
                        style={mode === "signup" ? activeTab : tabStyle}
                    >Sign Up</button>
                </div>

                <h1 style={titleStyle}>
                    {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Admin Portal"}
                </h1>

                {error && <p style={errorStyle}>{error}</p>}

                <form onSubmit={handleAuth} style={formStyle}>
                    {mode === "signup" && (
                        <>
                            <input
                                name="username"
                                placeholder="Username"
                                value={formData.username}
                                onChange={handleChange}
                                style={inputStyle}
                                required
                            />
                            <input
                                name="displayName"
                                placeholder="Display Name (Optional)"
                                value={formData.displayName}
                                onChange={handleChange}
                                style={inputStyle}
                            />
                        </>
                    )}
                    <input
                        name="email"
                        type="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        style={inputStyle}
                        required
                    />
                    <input
                        name="password"
                        type="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        style={inputStyle}
                        required
                    />
                    <button type="submit" style={primaryBtn} disabled={loading}>
                        {loading ? "Processing..." : mode === "signup" ? "Create Account" : "Sign In"}
                    </button>
                </form>

                <div style={divider}>
                    <span style={dividerText}>or continue with</span>
                </div>

                <div style={socialGroup}>
                    <div style={googleWrapper}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError("Google Login Failed")}
                            theme="filled_black"
                            shape="pill"
                            width="100%"
                        />
                    </div>
                    <button onClick={handleDemoLogin} style={demoBtn} disabled={loading}>
                        Try Demo Mode
                    </button>
                </div>

                <div style={footerSection}>
                    {mode !== "admin" ? (
                        <button onClick={() => setMode("admin")} style={adminLink}>
                            Administrator Login
                        </button>
                    ) : (
                        <button onClick={() => setMode("login")} style={adminLink}>
                            Back to User Login
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Premium Styles ---
const backgroundStyle = {
    height: "100vh",
    width: "100vw",
    background: "#080808",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "white"
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
    backdropFilter: "blur(30px)",
    WebkitBackdropFilter: "blur(30px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "28px",
    padding: "40px",
    width: "90%",
    maxWidth: "420px",
    textAlign: "center",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    animation: "fadeIn 0.6s ease-out"
};

const logoWrapper = {
    fontSize: "28px",
    fontWeight: "800",
    color: "#a855f7",
    marginBottom: "24px",
    letterSpacing: "-1.5px",
    background: "linear-gradient(to right, #a855f7, #6366f1)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
};

const tabsContainer = {
    display: "flex",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "12px",
    padding: "4px",
    marginBottom: "32px"
};

const tabStyle = {
    flex: 1,
    padding: "10px",
    border: "none",
    background: "transparent",
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    borderRadius: "8px",
    transition: "all 0.2s ease"
};

const activeTab = {
    ...tabStyle,
    background: "rgba(255, 255, 255, 0.1)",
    color: "white",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
};

const titleStyle = {
    fontSize: "24px",
    marginBottom: "24px",
    fontWeight: "700",
    letterSpacing: "-0.5px"
};

const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "24px"
};

const inputStyle = {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    padding: "14px 16px",
    color: "white",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 0.2s",
};

const primaryBtn = {
    background: "linear-gradient(to right, #a855f7, #6366f1)",
    color: "white",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "8px",
    boxShadow: "0 10px 15px -3px rgba(168, 85, 247, 0.3)",
    transition: "transform 0.2s"
};

const divider = {
    display: "flex",
    alignItems: "center",
    margin: "20px 0",
    color: "rgba(255, 255, 255, 0.2)",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "1px"
};

const dividerText = {
    padding: "0 10px"
};

const socialGroup = {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
};

const googleWrapper = {
    display: "flex",
    justifyContent: "center"
};

const demoBtn = {
    background: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "white",
    padding: "12px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background 0.2s"
};

const footerSection = {
    marginTop: "24px",
    paddingTop: "16px",
    borderTop: "1px solid rgba(255, 255, 255, 0.05)"
};

const adminLink = {
    background: "none",
    border: "none",
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: "13px",
    cursor: "pointer",
    textDecoration: "underline",
    padding: "4px"
};

const errorStyle = {
    color: "#ef4444",
    fontSize: "13px",
    marginBottom: "16px",
    background: "rgba(239, 68, 68, 0.1)",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid rgba(239, 68, 68, 0.2)"
};
