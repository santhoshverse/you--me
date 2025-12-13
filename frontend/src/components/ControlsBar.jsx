import React from "react";

export default function ControlsBar({
    toggleMic,
    toggleCam,
    micEnabled,
    camEnabled,
    roomId
}) {
    return (
        <div style={barStyle}>
            {/* Mic Button */}
            <button onClick={() => toggleMic(roomId)} style={btnStyle}>
                {micEnabled ? "🎤 Mic On" : "🔇 Mic Off"}
            </button>

            {/* Camera */}
            <button onClick={() => toggleCam(roomId)} style={btnStyle}>
                {camEnabled ? "📷 Cam On" : "🚫 Cam Off"}
            </button>
        </div>
    );
}

const barStyle = {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    padding: "15px",
    background: "#111",
    borderRadius: "10px",
    margin: "10px auto",
    width: "60%"
};

const btnStyle = {
    padding: "10px 25px",
    background: "#7a35f0",
    border: "none",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer",
};
