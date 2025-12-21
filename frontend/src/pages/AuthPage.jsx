import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { generateRandomName } from "../utils/randomName";
import { GoogleLogin } from '@react-oauth/google';

export default function AuthPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const from = location.state?.from?.pathname || "/";
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

    // 1. Auto-Login Check
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    if (res.ok) {
                        navigate(from, { replace: true });
                    }
                } catch (err) {
                    console.error("Auto-auth check failed", err);
                }
            }
        };
        checkAuth();
    }, [navigate, from, BACKEND_URL]);

    // 2. Real Google Login Success
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
                setError(data.error || "Login failed");
            }
        } catch (err) {
            setError("Connection to auth server failed");
        } finally {
            setLoading(false);
        }
    };

    // 3. Simulated Social Login (Keeping for Apple/Testing)
    const handleSocialLogin = async (provider) => {
        setLoading(true);
        setError("");

        // Simulated user data for demo/apple
        const randomNum = Math.floor(Math.random() * 90 + 10);
        const demoEmail = `user${randomNum}@example.com`;

        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/social`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: provider.toLowerCase(),
                    email: demoEmail,
                    name: `User ${randomNum}`,
                    providerUserId: `simulated_${randomNum}`
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
                setError(data.error || "Login failed");
            }
        } catch (err) {
            setError("Connection to auth server failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={backgroundStyle}>
            <div style={overlayGlow} />
            <div style={glassCard}>
                <div style={logoWrapper}>You&Me</div>
                <h1 style={titleStyle}>Watch Together</h1>
                <p style={taglineStyle}>Connect and share experiences in real-time.</p>

                {error && <p style={errorStyle}>{error}</p>}

                <div style={buttonGroup}>
                    <div style={{ display: "flex", justifyContent: "center", width: "100%", marginBottom: "10px" }}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError("Google Login Failed")}
                            theme="filled_black"
                            shape="pill"
                        />
                    </div>

                    <button
                        onClick={() => handleSocialLogin("Apple")}
                        style={socialBtnSecondary}
                        disabled={loading}
                    >
                        <span style={{ fontSize: "20px", marginRight: "10px" }}></span>
                        {loading ? "Connecting..." : "Continue with Apple"}
                    </button>
                </div>

                <p style={footerText}>
                    By continuing, you agree to our Terms of Service.
                </p>
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
    padding: "48px 40px",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
    zIndex: 1,
};

const logoWrapper = {
    fontSize: "24px",
    fontWeight: "800",
    color: "#7a35f0",
    marginBottom: "30px",
    letterSpacing: "-1px"
};

const titleStyle = {
    fontSize: "32px",
    color: "white",
    marginBottom: "12px",
    fontWeight: "700",
    letterSpacing: "-0.5px"
};

const taglineStyle = {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: "15px",
    marginBottom: "40px",
    lineHeight: "1.5"
};

const buttonGroup = {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
};

const socialBtnPrimary = {
    padding: "16px",
    borderRadius: "14px",
    border: "none",
    background: "white",
    color: "#000",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.2s, background 0.2s",
};

const socialBtnSecondary = {
    padding: "16px",
    borderRadius: "14px",
    border: "none",
    background: "#1a1a1a",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.2s, background 0.2s",
};

const errorStyle = {
    color: "#ff4757",
    fontSize: "14px",
    marginBottom: "20px",
    background: "rgba(255, 71, 87, 0.1)",
    padding: "10px",
    borderRadius: "8px"
};

const footerText = {
    marginTop: "30px",
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.3)",
    lineHeight: "1.4"
};
