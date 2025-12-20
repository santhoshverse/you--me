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

    const sendFloatingEmoji = (emoji) => {
        if (socket) {
            socket.emit("floating-emoji", { roomId, emoji });
        }
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
                        <div key={i} style={{ wordWrap: "break-word", lineHeight: "1.4" }}>
                            <strong style={{ color: "#7a35f0", fontSize: "13px" }}>{msg.username}</strong>
                            <div style={{ color: "#eee", fontSize: "14px", marginTop: "2px" }}>{msg.message}</div>
                        </div>
                    ))
                )}
                {typingUsers.size > 0 && (
                    <div style={{ color: "#7a35f0", fontStyle: "italic", fontSize: "11px", marginTop: "5px", opacity: 0.8 }}>
                        {Array.from(typingUsers).join(", ")} {typingUsers.size === 1 ? "is" : "are"} typing...
                    </div>
                )}
            </div>

            {/* Premium 3D Emoji Bar - Positioned just above input */}
            <div style={{
                marginTop: "15px",
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                background: "rgba(30, 30, 30, 0.6)",
                padding: "10px",
                borderRadius: "12px",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.05)"
            }}>
                {[
                    { char: "🎉", url: "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Party%20popper/3D/party_popper_3d.png" },
                    { char: "❤️", url: "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Heart/3D/heart_3d.png" },
                    { char: "😂", url: "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Face%20with%20tears%20of%20joy/3D/face_with_tears_of_joy_3d.png" },
                    { char: "🔥", url: "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Fire/3D/fire_3d.png" },
                    { char: "👍", url: "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Thumbs%20up/3D/thumbs_up_3d.png" },
                    { char: "😳", url: "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Flushed%20face/3D/flushed_face_3d.png" }
                ].map(emoji => (
                    <button
                        key={emoji.char}
                        onClick={() => sendFloatingEmoji(emoji.char)}
                        style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "0",
                            transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                            width: "32px",
                            height: "32px"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.3) translateY(-5px)"}
                        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1) translateY(0)"}
                        onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.9)"}
                    >
                        <img src={emoji.url} alt={emoji.char} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </button>
                ))}
            </div>

            {/* Input Box - Remains fixed at bottom */}
            <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
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
                        borderRadius: "10px",
                        border: "1px solid #333",
                        background: "#1a1a1a",
                        color: "white",
                        outline: "none",
                        fontSize: "14px",
                        transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#7a35f0"}
                    onBlur={(e) => e.target.style.borderColor = "#333"}
                />
            </div>
        </div>
    );
}
