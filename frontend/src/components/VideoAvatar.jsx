import React, { useRef, useEffect } from "react";

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

const micActiveStyle = {
    boxShadow: "0 0 15px 4px #29b6f6"
};

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
            <div className="avatar" style={micEnabled ? micActiveStyle : {}}>
                {camEnabled ? (
                    <video
                        ref={videoRef}
                        muted={label === "You" || label === localStorage.getItem("name")}
                        autoPlay
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                ) : (
                    <div style={noCamStyle}>{label ? label[0].toUpperCase() : "?"}</div>
                )}

                {/* Overlay Icons */}
                <div style={{
                    position: "absolute",
                    bottom: "5px",
                    right: "5px",
                    display: "flex",
                    gap: "5px",
                    background: "rgba(0,0,0,0.6)",
                    borderRadius: "4px",
                    padding: "2px 5px",
                    fontSize: "12px"
                }}>
                    {!micEnabled && <span>🔇</span>}
                    {!camEnabled && <span>🚫</span>}
                </div>
            </div>

            <p style={{ marginTop: "8px", fontWeight: "bold", textShadow: "0 1px 3px black" }}>{label}</p>
        </div>
    );
}
