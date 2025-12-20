import React from "react";
import UserList from "./UserList";

export default function ChatPanel({ messages, chatInput, setChatInput, sendMessage, socket, roomId, username, peers }) {
    const messagesContainerRef = React.useRef(null);
    const [typingUsers, setTypingUsers] = React.useState(new Set());
    const typingTimeoutRef = React.useRef(null);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    React.useEffect(() => {
        scrollToBottom();
    }, [messages, typingUsers]);

    React.useEffect(() => {
        if (!socket) return;

        const handleTyping = ({ username: typer, isTyping }) => {
            setTypingUsers(prev => {
                const next = new Set(prev);
                if (isTyping) next.add(typer);
                else next.delete(typer);
                return next;
            });
        };

        socket.on("typing", handleTyping);
        return () => socket.off("typing", handleTyping);
    }, [socket]);

    const handleInput = (e) => {
        setChatInput(e.target.value);

        if (socket) {
            socket.emit("typing", { roomId, isTyping: true, username });

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

            typingTimeoutRef.current = setTimeout(() => {
                socket.emit("typing", { roomId, isTyping: false, username });
            }, 2000);
        }
    };

    const handleSend = () => {
        if (!chatInput.trim()) return;
        sendMessage(); // Parent handles emit
        socket.emit("typing", { roomId, isTyping: false, username });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };

    return (
        <div style={{
            padding: "15px",
            height: "100%",
            background: "#121212",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden" // Prevent overall panel from growing
        }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#7a35f0", fontSize: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>Chat</h3>

            {/* Member List - Stays fixed at top or scrolls independently if needed */}
            <div style={{ marginBottom: "15px", maxHeight: "150px", overflowY: "auto" }}>
                <UserList peers={peers} localUsername={username} />
            </div>

            {/* Messages Area - Only this part scrolls */}
            <div
                ref={messagesContainerRef}
                style={{
                    flex: 1,
                    overflowY: "auto",
                    background: "#0a0a0a",
                    padding: "12px",
                    borderRadius: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    border: "1px solid #222"
                }}>
                {(!messages || messages.length === 0) ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.3 }}>
                        <p style={{ color: "gray", fontSize: "14px" }}>No messages yet...</p>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div key={msg.id || i} style={{ wordWrap: "break-word", lineHeight: "1.4", padding: "4px 8px" }}>
                            <strong style={{ color: "#7a35f0", fontSize: "12px", opacity: 0.8 }}>{msg.username}</strong>
                            <div style={{ color: "#eee", fontSize: "14px", marginTop: "1px" }}>{msg.message}</div>
                        </div>
                    ))
                )}
                {typingUsers.size > 0 && (
                    <div style={{ color: "#7a35f0", fontStyle: "italic", fontSize: "11px", marginTop: "5px", opacity: 0.8 }}>
                        {Array.from(typingUsers).join(", ")} {typingUsers.size === 1 ? "is" : "are"} typing...
                    </div>
                )}
            </div>

            {/* Chat Input Bar */}
            <div style={{
                marginTop: "15px",
                background: "#1a1a1a",
                borderRadius: "12px",
                border: "1px solid #333",
                display: "flex",
                overflow: "hidden"
            }}>
                <input
                    type="text"
                    placeholder="Message..."
                    value={chatInput}
                    onChange={handleInput}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    style={{
                        flex: 1,
                        padding: "12px",
                        boxSizing: "border-box",
                        border: "none",
                        background: "transparent",
                        color: "white",
                        outline: "none",
                        fontSize: "14px"
                    }}
                />
            </div>
        </div>
    );
}


