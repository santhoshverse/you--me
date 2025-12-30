import React from "react";

export default function UserList({ peers, localUsername, isHost, onTogglePermission }) {
    const remoteMembers = Object.values(peers);
    const totalCount = remoteMembers.length + 1; // +1 for local user

    return (
        <div style={{
            padding: "15px",
            background: "rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            marginBottom: "20px",
            border: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px"
            }}>
                <h4 style={{ margin: 0, color: "#fff", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Members
                </h4>
                <span style={{
                    background: "#7a35f0",
                    color: "white",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    fontSize: "12px",
                    fontWeight: "bold"
                }}>
                    {totalCount}
                </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {/* Local User */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "8px", height: "8px", background: "#4caf50", borderRadius: "50%" }}></div>
                    <span style={{ color: "#fff", fontSize: "14px" }}>{localUsername} (You)</span>
                </div>

                {/* Remote Users */}
                {remoteMembers.map(peer => (
                    <div key={peer.peerId} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "8px", height: "8px", background: "#4caf50", borderRadius: "50%" }}></div>
                        <span style={{ color: "#ccc", fontSize: "14px", flex: 1 }}>{peer.username || "Guest"}</span>

                        {/* Screen Share Permission Toggle (Host Only) */}
                        {isHost && (
                            <button
                                onClick={() => onTogglePermission(peer.peerId)}
                                title={peer.screen_share_enabled ? "Revoke Screen Share" : "Allow Screen Share"}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    color: peer.screen_share_enabled ? "#4caf50" : "#555",
                                    padding: "4px",
                                    display: "flex",
                                    alignItems: "center"
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                    <line x1="8" y1="21" x2="16" y2="21"></line>
                                    <line x1="12" y1="17" x2="12" y2="21"></line>
                                </svg>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
