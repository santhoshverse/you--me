import React from "react";
import { v4 as uuidv4 } from 'uuid';

export default function ChatPanel({ messages, chatInput, setChatInput, sendMessage, socket, roomId, username }) {
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

    const sendFloatingEmoji = (emoji) => {
        if (socket) {
            socket.emit("floating-emoji", { roomId, emoji });
        }
    };

    return (
        <div style={{ padding: 20, height: "100%", background: "#1a1a1a", boxSizing: "border-box", width: "300px", borderRight: "1px solid #333", display: "flex", flexDirection: "column" }}>
            <h3 style={{ margin: "0 0 10px 0" }}>Chat</h3>

            {/* Floating Emoji Bar */}
            <div style={{ display: "flex", gap: "5px", marginBottom: "10px", justifyContent: "center" }}>
                {["🎉", "❤️", "😂", "🔥", "👍", "😳"].map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => sendFloatingEmoji(emoji)}
                        style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "20px",
                            padding: "2px",
                            transition: "transform 0.1s"
                        }}
                        onMouseDown={(e) => e.target.style.transform = "scale(0.8)"}
                        onMouseUp={(e) => e.target.style.transform = "scale(1)"}
                    >
                        {emoji}
                    </button>
                ))}
            </div>

            <div
                ref={messagesContainerRef}
                style={{
                    flex: 1,
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
                {typingUsers.size > 0 && (
                    <div style={{ color: "#888", fontStyle: "italic", fontSize: "12px", marginTop: "5px" }}>
                        {Array.from(typingUsers).join(", ")} is typing...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <input
                type="text"
                placeholder="Type message..."
                value={chatInput}
                onChange={handleInput}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
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
