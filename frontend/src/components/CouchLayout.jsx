
import React from "react";
import VideoAvatar from "./VideoAvatar";

export default function CouchLayout({ localStream, peers, username, isHost, onKick }) {
    return (
        <div className="couch-bg">
            <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-end",
                gap: "60px",
                height: "100%"
            }}>

                {/* Local user */}
                {localStream && (
                    <VideoAvatar stream={localStream} label={username || "You"} />
                )}

                {/* Remote users */}
                {Object.values(peers).map(p => (
                    <div key={p.peerId} style={{ position: "relative" }}>
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
                                    top: "-10px",
                                    right: "-10px",
                                    background: "red",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "24px",
                                    height: "24px",
                                    cursor: "pointer",
                                    color: "white",
                                    fontSize: "12px"
                                }}
                                title="Kick User"
                            >
                                👢
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

