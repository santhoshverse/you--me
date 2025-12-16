import React from "react";

export default function ChatPanel({ messages, chatInput, setChatInput, sendMessage }) {
    const messagesEndRef = React.useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    React.useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div style={{ padding: 20, height: "100%", background: "#1a1a1a", boxSizing: "border-box", width: "300px", borderRight: "1px solid #333", display: "flex", flexDirection: "column" }}>
            <h3 style={{ margin: "0 0 20px 0" }}>Chat</h3>
            <div style={{
                flex: 1, // Take remaining height
                overflowY: "auto",
                background: "#111",
                padding: 10,
                borderRadius: "5px",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
            }}>
                {(!messages || messages.length === 0) ? (
                    <p style={{ color: "gray" }}>No messages yet...</p>
                ) : (
                    messages.map((msg, i) => (
                        <div key={i} style={{ wordWrap: "break-word" }}>
                            <strong style={{ color: "#29b6f6" }}>{msg.username}: </strong>
                            <span style={{ color: "#eee" }}>{msg.message}</span>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
            <input
                type="text"
                placeholder="Type message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
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
