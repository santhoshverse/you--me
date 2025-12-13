import React from "react";

export default function SideBar({
    toggleMic, toggleCam, micEnabled, camEnabled, roomId,
    onSelectMedia
}) {
    const btnStyle = {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "50px",
        height: "50px",
        margin: "15px auto",
        background: "#2a2a2a",
        color: "white",
        border: "none",
        borderRadius: "12px",
        cursor: "pointer",
        fontSize: "24px",
        transition: "all 0.2s",
        position: "relative"
    };

    const activeStyle = { ...btnStyle, background: "#7a35f0", boxShadow: "0 0 10px #7a35f0" };
    const inactiveStyle = { ...btnStyle, background: "#ff4444" };

    return (
        <div style={{
            width: "80px",
            background: "#111",
            height: "100%",
            padding: "20px 0",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            borderLeft: "1px solid #333"
        }}>
            <h3 style={{ color: "#7a35f0", marginBottom: "30px", fontSize: "14px", textAlign: "center" }}>Y&M</h3>

            <div style={{ marginBottom: "auto", width: "100%" }}>
                {/* Mic */}
                <button
                    onClick={() => toggleMic(roomId)}
                    style={micEnabled ? activeStyle : inactiveStyle}
                    title={micEnabled ? "Mute Mic" : "Unmute Mic"}
                >
                    {micEnabled ? "🎤" : "🔇"}
                </button>

                {/* Cam */}
                <button
                    onClick={() => toggleCam(roomId)}
                    style={camEnabled ? activeStyle : inactiveStyle}
                    title={camEnabled ? "Turn Cam Off" : "Turn Cam On"}
                >
                    {camEnabled ? "📷" : "🚫"}
                </button>

                <hr style={{ borderColor: "#333", width: "50%", margin: "20px auto" }} />

                {/* YouTube */}
                <button onClick={() => onSelectMedia("youtube")} style={btnStyle} title="Watch YouTube">
                    📺
                </button>

                {/* Website */}
                <button onClick={() => onSelectMedia("web")} style={btnStyle} title="Browse Website">
                    🌐
                </button>

                {/* File */}
                <label style={btnStyle} title="Play Local File">
                    📂
                    <input
                        type="file"
                        style={{ display: "none" }}
                        onChange={(e) => onSelectMedia("file", e.target.files[0])}
                    />
                </label>
            </div>

            {/* Invite */}
            <button
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                style={{ ...btnStyle, background: "#0099ff", width: "50px", height: "50px", fontSize: "20px" }}
                title="Copy Invite Link"
            >
                🔗
            </button>
        </div>
    );
}
