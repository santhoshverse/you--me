import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CreateRoomPage() {
    const [mode, setMode] = useState("create"); // 'create' | 'join'
    const [loading, setLoading] = useState(false);
    const [roomIdInput, setRoomIdInput] = useState("");
    const navigate = useNavigate();

    async function handleCreateRoom() {
        setLoading(true);
        try {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
            const res = await fetch(`${BACKEND_URL}/api/rooms/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });

            const data = await res.json();
            if (data.success) {
                navigate(`/room/${data.roomId}`);
            }
        } catch (err) {
            console.error("Failed to create room:", err);
            alert(`Failed to create room: ${err.message}. Check if Backend is running on port 5000.`);
        } finally {
            setLoading(false);
        }
    }

    function handleJoinRoom() {
        if (!roomIdInput.trim()) {
            alert("Please enter a Room ID");
            return;
        }
        navigate(`/room/${roomIdInput.trim()}`);
    }

    const [user, setUser] = useState({
        name: localStorage.getItem("name") || "",
        token: localStorage.getItem("token") || ""
    });

    const handleLogout = () => {
        localStorage.clear();
        setUser({ name: "", token: "" });
        navigate("/");
    };

    return (
        <div style={containerStyle}>
            {/* Header / Top Nav */}
            {/* Header Removed */}

            <div style={glassCard}>
                <h1 style={titleStyle}>You & Me</h1>
                <p style={subtitleStyle}>Watch together, anywhere.</p>

                <div style={tabContainer}>
                    <button
                        onClick={() => setMode("create")}
                        style={mode === "create" ? activeTab : inactiveTab}
                    >
                        Create Room
                    </button>
                    <button
                        onClick={() => setMode("join")}
                        style={mode === "join" ? activeTab : inactiveTab}
                    >
                        Join Room
                    </button>
                </div>

                <div style={contentArea}>
                    {mode === "create" ? (
                        <div style={modeContent}>
                            <p style={descText}>Start a new synchronized session and invite others.</p>
                            <button onClick={handleCreateRoom} style={primaryBtn} disabled={loading}>
                                {loading ? "Creating..." : "✨ Create New Room"}
                            </button>
                        </div>
                    ) : (
                        <div style={modeContent}>
                            <p style={descText}>Enter a Room ID to join your friends instantly.</p>
                            <input
                                type="text"
                                placeholder="Room ID (e.g. test-room)"
                                value={roomIdInput}
                                onChange={(e) => setRoomIdInput(e.target.value)}
                                style={inputStyle}
                                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                            />
                            <button onClick={handleJoinRoom} style={primaryBtn}>
                                🚀 Join Room
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const containerStyle = {
    height: "100vh",
    width: "100vw",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(circle at top left, #1a1a2e, #16213e, #0f3460)",
    color: "white",
    fontFamily: "'Inter', sans-serif"
};

const glassCard = {
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(15px)",
    borderRadius: "24px",
    padding: "40px",
    width: "90%",
    maxWidth: "450px",
    textAlign: "center",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.1)"
};

const titleStyle = {
    fontSize: "42px",
    fontWeight: "800",
    marginBottom: "10px",
    background: "linear-gradient(45deg, #fff, #7a35f0)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
};

const subtitleStyle = {
    color: "#aaa",
    marginBottom: "30px",
    fontSize: "16px"
};

const tabContainer = {
    display: "flex",
    background: "rgba(0,0,0,0.3)",
    padding: "5px",
    borderRadius: "12px",
    marginBottom: "30px",
    gap: "5px"
};

const activeTab = {
    flex: 1,
    padding: "10px",
    border: "none",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.1)",
    color: "white",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s"
};

const inactiveTab = {
    flex: 1,
    padding: "10px",
    border: "none",
    borderRadius: "8px",
    background: "transparent",
    color: "#777",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s"
};

const contentArea = {
    minHeight: "150px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
};

const modeContent = {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "20px"
};

const descText = {
    color: "#ddd",
    fontSize: "15px",
    lineHeight: "1.5"
};

const primaryBtn = {
    width: "100%",
    padding: "15px",
    fontSize: "16px",
    fontWeight: "bold",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(45deg, #7a35f0, #9f67ff)",
    color: "white",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(122, 53, 240, 0.4)",
    transition: "transform 0.2s, opacity 0.2s"
};

const inputStyle = {
    width: "100%",
    padding: "15px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(0,0,0,0.2)",
    color: "white",
    fontSize: "16px",
    outline: "none",
    textAlign: "center"
};

const headerStyle = {
    position: "absolute",
    top: "30px",
    right: "40px",
    zIndex: 100
};

const userSection = {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    background: "rgba(255,255,255,0.05)",
    padding: "8px 16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.1)"
};

const userNameText = {
    color: "#ddd",
    fontSize: "14px",
    fontWeight: "600"
};

const loginBtn = {
    background: "rgba(122, 53, 240, 0.2)",
    color: "white",
    border: "1px solid #7a35f0",
    padding: "10px 25px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    transition: "all 0.2s"
};

const logoutBtn = {
    background: "transparent",
    color: "#ff4757",
    border: "none",
    padding: "0",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    textDecoration: "underline"
};
