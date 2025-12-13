import React from "react";

export default function ChatPanel() {
    return (
        <div style={{ padding: 20, height: 200, background: "#1a1a1a" }}>
            <h3>Chat</h3>
            <div style={{
                height: 130,
                overflowY: "auto",
                background: "#111",
                padding: 10
            }}>
                <p>No messages yet...</p>
            </div>
            <input
                type="text"
                placeholder="Type message..."
                style={{
                    width: "100%",
                    padding: 10,
                    marginTop: 10
                }}
            />
        </div>
    );
}
