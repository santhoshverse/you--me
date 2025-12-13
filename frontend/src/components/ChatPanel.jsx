import React from "react";

export default function ChatPanel() {
    return (
        <div style={{ padding: 20, height: "100%", background: "#1a1a1a", boxSizing: "border-box", width: "300px", borderRight: "1px solid #333" }}>
            <h3 style={{ margin: "0 0 20px 0" }}>Chat</h3>
            <div style={{
                height: "calc(100% - 100px)",
                overflowY: "auto",
                background: "#111",
                padding: 10,
                borderRadius: "5px"
            }}>
                <p>No messages yet...</p>
            </div>
            <input
                type="text"
                placeholder="Type message..."
                style={{
                    width: "100%",
                    padding: 10,
                    marginTop: 10,
                    boxSizing: "border-box",
                    borderRadius: "5px",
                    border: "none",
                    background: "#333",
                    color: "white"
                }}
            />
        </div>
    );
}
