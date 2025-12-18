import React from "react";

export default function UserList({ peers, localUsername }) {
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
                        <span style={{ color: "#ccc", fontSize: "14px" }}>{peer.username || "Guest"}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
