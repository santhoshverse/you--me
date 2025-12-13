
import React from "react";
import VideoAvatar from "./VideoAvatar";

export default function CouchLayout({ localStream, peers, username }) {
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
                    <VideoAvatar
                        key={p.peerId}
                        stream={p.stream}
                        label={p.username || p.peerId}
                        micEnabled={p.micEnabled}
                        camEnabled={p.camEnabled}
                    />
                ))}

            </div>
        </div>
    );
}

