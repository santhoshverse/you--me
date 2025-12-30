import React, { useRef, useEffect } from "react";

const avatarSize = "110px"; // Slightly smaller for floating

const noCamStyle = {
    width: "100%",
    height: "100%",
    background: "linear-gradient(135deg, #2c3e50, #000000)",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "30px",
    borderRadius: "50%",
    border: "2px solid rgba(122, 53, 240, 0.5)"
};

const micActiveStyle = {
    boxShadow: "0 0 20px 5px rgba(41, 182, 246, 0.6)",
    border: "2px solid #29b6f6"
};

const idleStyle = {
    boxShadow: "0 8px 16px rgba(0,0,0,0.5)",
    border: "2px solid rgba(255,255,255,0.2)"
};

export default function VideoAvatar({ stream, label, micEnabled = true, camEnabled = true }) {
    const videoRef = useRef();

    const [isPiP, setIsPiP] = React.useState(false);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (videoEl && stream) {
            videoEl.srcObject = stream;
            videoEl.play().catch(() => { });

            // PiP Events
            const onEnterPiP = () => setIsPiP(true);
            const onLeavePiP = () => setIsPiP(false);

            videoEl.addEventListener("enterpictureinpicture", onEnterPiP);
            videoEl.addEventListener("leavepictureinpicture", onLeavePiP);

            return () => {
                videoEl.removeEventListener("enterpictureinpicture", onEnterPiP);
                videoEl.removeEventListener("leavepictureinpicture", onLeavePiP);
            };
        }
    }, [stream]);

    const isSelf = label === "You" || label === localStorage.getItem("name");

    // Hide visually but keep in DOM to maintain PiP connection
    const containerStyle = isPiP ? {
        width: 0,
        height: 0,
        overflow: "hidden",
        opacity: 0,
        margin: 0,
        padding: 0,
        position: "absolute" // Ensure it takes no layout space
    } : {
        textAlign: "center",
        position: "relative"
    };

    return (
        <div style={containerStyle}>
            <div
                className="avatar-container"
                style={{
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: "50%",
                    overflow: "hidden",
                    position: "relative",
                    background: "#000",
                    transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    ...(micEnabled ? micActiveStyle : idleStyle)
                }}
            >
                {camEnabled && stream ? (
                    <video
                        ref={videoRef}
                        muted={isSelf}
                        autoPlay
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                ) : (
                    <div style={noCamStyle}>{label ? label[0].toUpperCase() : "?"}</div>
                )}

                {/* Status Icons Overlay */}
                <div style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "8px",
                    display: "flex",
                    gap: "4px",
                    background: "rgba(0,0,0,0.7)",
                    borderRadius: "50%",
                    padding: "4px",
                    border: "1px solid rgba(255,255,255,0.1)"
                }}>
                    {!micEnabled && <span style={{ fontSize: "10px" }}>🔇</span>}
                    {!camEnabled && <span style={{ fontSize: "10px" }}>🚫</span>}
                </div>
            </div>

            <p style={{
                marginTop: "10px",
                fontWeight: "700",
                color: "white",
                fontSize: "13px",
                textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                background: "rgba(0,0,0,0.4)",
                padding: "2px 8px",
                borderRadius: "10px",
                display: "inline-block"
            }}>
                {label}
            </p>
        </div>
    );
}
