import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function HomePage() {
    const navigate = useNavigate();
    const [name, setName] = useState(localStorage.getItem("name"));

    const handleLogout = () => {
        localStorage.clear();
        setName(null);
        navigate("/auth");
    };

    return (
        <div style={containerStyle}>
            <div style={glowStyle} />
            <h1 style={titleStyle}>Watch Together with Friends – You & Me</h1>

            <p style={subtitleStyle}>
                You & Me is a free watch party platform that lets friends watch videos together,
                share screens, browse websites live, and chat in real time.
            </p>

            <p style={{ ...subtitleStyle, marginTop: '-20px', fontSize: '16px' }}>
                Create a room, invite friends, and enjoy synchronized watching –
                no login required.
            </p>

            {name ? (
                <div style={profileStyle}>
                    <p style={welcomeStyle}>Welcome back, <span style={{ color: "#7a35f0" }}>{name}</span>!</p>
                    <div style={actionGroup}>
                        <Link to="/create">
                            <button style={primaryBtn}>🚀 Create Room</button>
                        </Link>
                        <button onClick={handleLogout} style={logoutBtn}>🚪 Sign Out</button>
                    </div>
                </div>
            ) : (
                <Link to="/auth">
                    <button style={primaryBtn}>🔐 Login / Sign Up</button>
                </Link>
            )}

            <div style={{ marginTop: "40px" }}>
                <Link to="/rooms" style={linkStyle}>
                    Browse Public Rooms →
                </Link>
            </div>
        </div>
    );
}

const containerStyle = {
    textAlign: "center",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#050505",
    color: "white",
    position: "relative",
    overflow: "hidden"
};

const glowStyle = {
    position: "absolute",
    width: "100%",
    height: "100%",
    background: "radial-gradient(circle at center, rgba(122, 53, 240, 0.1) 0%, transparent 70%)",
    pointerEvents: "none"
};

const titleStyle = {
    fontSize: "48px",
    fontWeight: "900",
    marginBottom: "10px",
    letterSpacing: "-2px",
    background: "linear-gradient(to bottom, #fff, #888)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
};

const subtitleStyle = {
    fontSize: "18px",
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: "50px"
};

const profileStyle = {
    background: "rgba(255, 255, 255, 0.03)",
    padding: "30px",
    borderRadius: "20px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(10px)"
};

const welcomeStyle = {
    fontSize: "20px",
    marginBottom: "20px",
    fontWeight: "600"
};

const actionGroup = {
    display: "flex",
    gap: "15px"
};

const primaryBtn = {
    padding: "14px 28px",
    fontSize: "16px",
    fontWeight: "700",
    background: "#7a35f0",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(122, 53, 240, 0.3)",
    transition: "transform 0.2s"
};

const logoutBtn = {
    padding: "14px 28px",
    fontSize: "16px",
    fontWeight: "700",
    background: "transparent",
    color: "rgba(255, 255, 255, 0.6)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    cursor: "pointer"
};

const linkStyle = {
    color: "rgba(255, 255, 255, 0.4)",
    textDecoration: "none",
    fontSize: "14px"
};
