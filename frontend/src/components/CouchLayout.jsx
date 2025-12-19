import React from "react";
import VideoAvatar from "./VideoAvatar";

export default function CouchLayout({ localStream, peers, username, isHost, onKick }) {
    return (
        <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            gap: "20px", // More compact for floating
            padding: "10px",
            pointerEvents: "none" // Allow clicks through to content if not on avatar
        }}>
            {/* Local user */}
            <div style={{ pointerEvents: "auto" }}>
                <VideoAvatar stream={localStream} label={username || "You"} />
            </div>

            {/* Remote users */}
            {Object.values(peers).map(p => (
                <div key={p.peerId} style={{ position: "relative", pointerEvents: "auto" }}>
                    <VideoAvatar
                        stream={p.stream}
                        label={p.username || p.peerId}
                        micEnabled={p.micEnabled}
                        camEnabled={p.camEnabled}
                    />
                    {isHost && (
                        <button
                            onClick={() => onKick(p.peerId)}
                            style={{
                                position: "absolute",
                                top: "-5px",
                                right: "-5px",
                                background: "rgba(255, 0, 0, 0.8)",
                                border: "none",
                                borderRadius: "50%",
                                width: "20px",
                                height: "20px",
                                cursor: "pointer",
                                color: "white",
                                fontSize: "10px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 10
                            }}
                            title="Kick User"
                        >
                            ✕
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

