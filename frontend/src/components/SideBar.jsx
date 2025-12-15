import React, { useState } from "react";

export default function SideBar({
    toggleMic, toggleCam, micEnabled, camEnabled, roomId,
    onSelectMedia
}) {
    const [copied, setCopied] = useState(false);

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
        transition: "transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.2s", // Pop animation
        position: "relative"
    };

    // Helper for adding active click effect (simple wrapper could work, but using inline style for simplicity in this context)
    // The transition 'transform' handles the "pop" when :active is triggered by browser, 
    // but better to add a class or just rely on CSS :active. 
    // Since we are inline, let's just make sure the transition is set. User asked for "Pop animation".
    // I will add a <style> block or just rely on the transition property above and standard button behavior.
    // Actually, to make it really pop, a keyframe is cool, but 'transform: scale(0.9)' on :active is standard "pop".
    // I will stick to the transition above, and maybe add a style tag for the active state to ensure it works.

    const activeStyle = { ...btnStyle, background: "#7a35f0", boxShadow: "0 0 10px #7a35f0" };
    const inactiveStyle = { ...btnStyle, background: "#ff4444" };

    const handleCopy = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
            <style>
                {`
                    button:active { transform: scale(0.9) !important; }
                    button:hover { transform: scale(1.1); }
                `}
            </style>

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
                onClick={handleCopy}
                style={{ ...btnStyle, background: copied ? "#00b894" : "#0099ff", width: "50px", height: "50px", fontSize: "20px" }}
                title="Copy Invite Link"
            >
                {copied ? "✅" : "🔗"}
            </button>
        </div>
    );
}
