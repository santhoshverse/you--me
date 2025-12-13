import React, { useRef, useEffect } from "react";

export default function VideoAvatar({ stream, label, micEnabled = true, camEnabled = true }) {
    const videoRef = useRef();

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => { });
        }
    }, [stream]);

    return (
        <div style={{ textAlign: "center", position: "relative" }}>
            <div className="avatar">
                {camEnabled ? (
                    <video
                        ref={videoRef}
                        muted={label === "You"}
                        autoPlay
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                ) : (
                    <div style={noCamStyle}>{label[0]}</div>
                )}
            </div>

            {/* Mic/Cam Indicators */}
            <div style={{ marginTop: "5px" }}>
                {micEnabled ? "🎤" : "🔇"} | {camEnabled ? "📷" : "🚫"}
            </div>

            <p style={{ marginTop: "6px" }}>{label}</p>
        </div>
    );
}

const noCamStyle = {
    width: "100%",
    height: "100%",
    background: "#333",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "50px"
};
