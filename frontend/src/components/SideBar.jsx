import React from "react";

export default function SideBar({
    toggleMic, toggleCam, micEnabled, camEnabled, roomId,
    onSelectMedia
}) {
    const btnStyle = {
        display: "block",
        width: "100%",
        padding: "15px",
        margin: "10px 0",
        background: "#2a2a2a",
        color: "white",
        border: "none",
        borderRadius: "8px",
        textAlign: "left",
        cursor: "pointer",
        fontSize: "16px",
        transition: "background 0.2s"
    };

    const iconStyle = { marginRight: "10px" };

    return (
        <div style={{
            width: "250px",
            background: "#111",
            height: "100%",
            padding: "20px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column"
        }}>
            <h3 style={{ color: "#7a35f0", marginBottom: "30px", textAlign: "center" }}>You&Me</h3>

            <div style={{ marginBottom: "auto" }}>
                <button onClick={() => toggleMic(roomId)} style={{ ...btnStyle, background: micEnabled ? "#7a35f0" : "#ff4444" }}>
                    <span style={iconStyle}>{micEnabled ? "🎤" : "🔇"}</span>
                    {micEnabled ? "Mic On" : "Mic Off"}
                </button>

                <button onClick={() => toggleCam(roomId)} style={{ ...btnStyle, background: camEnabled ? "#7a35f0" : "#ff4444" }}>
                    <span style={iconStyle}>{camEnabled ? "📷" : "🚫"}</span>
                    {camEnabled ? "Cam On" : "Cam Off"}
                </button>

                <hr style={{ borderColor: "#333", margin: "20px 0" }} />

                <button onClick={() => onSelectMedia("youtube")} style={btnStyle}>
                    <span style={iconStyle}>📺</span> YouTube
                </button>

                <button onClick={() => onSelectMedia("web")} style={btnStyle}>
                    <span style={iconStyle}>🌐</span> Website
                </button>

                <label style={btnStyle}>
                    <span style={iconStyle}>📂</span> Local File
                    <input
                        type="file"
                        style={{ display: "none" }}
                        onChange={(e) => onSelectMedia("file", e.target.files[0])}
                    />
                </label>
            </div>

            <button
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                style={{ ...btnStyle, background: "#0099ff", marginTop: "20px", textAlign: "center" }}
            >
                Copy Invite Link 🔗
            </button>
        </div>
    );
}
