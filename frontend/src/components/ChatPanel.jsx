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
                        <MessageItem
                            key={msg.id || i}
                            msg={msg}
                            socket={socket}
                            roomId={roomId}
                            username={username}
                        />
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

function MessageItem({ msg, socket, roomId, username }) {
    const [showPicker, setShowPicker] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);

    const handleReact = (emoji) => {
        socket.emit("chat-reaction", { roomId, messageId: msg.id, reaction: emoji, username });
        setShowPicker(false);
    };

    const reactionList = Object.entries(msg.reactions || {});

    const emojis = [
        { char: "🎉", url: "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Party%20popper/3D/party_popper_3d.png" },
        { char: "❤️", url: "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Red%20heart/3D/red_heart_3d.png" },
        { char: "😂", url: "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Face%20with%20tears%20of%20joy/3D/face_with_tears_of_joy_3d.png" },
        { char: "🔥", url: "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Fire/3D/fire_3d.png" },
        { char: "👍", url: "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Thumbs%20up/Default/3D/thumbs_up_3d.png" },
        { char: "😳", url: "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Flushed%20face/3D/flushed_face_3d.png" }
    ];

    return (
        <div
            style={{ position: "relative", marginBottom: "5px" }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setShowPicker(false); }}
        >
            <div style={{ wordWrap: "break-word", lineHeight: "1.4", padding: "4px 8px", borderRadius: "8px", transition: "background 0.2s", background: isHovered ? "rgba(255,255,255,0.03)" : "transparent" }}>
                <strong style={{ color: "#7a35f0", fontSize: "12px", opacity: 0.8 }}>{msg.username}</strong>
                <div style={{ color: "#eee", fontSize: "14px", marginTop: "1px" }}>{msg.message}</div>

                {/* Reaction Badges */}
                {reactionList.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                        {reactionList.map(([emoji, users]) => {
                            const emojiData = emojis.find(e => e.char === emoji);
                            const hasReacted = users.includes(username);
                            return (
                                <div
                                    key={emoji}
                                    onClick={() => handleReact(emoji)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        background: hasReacted ? "rgba(122, 53, 240, 0.2)" : "#1a1a1a",
                                        border: `1px solid ${hasReacted ? "#7a35f0" : "#333"}`,
                                        padding: "2px 6px",
                                        borderRadius: "12px",
                                        fontSize: "11px",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    {emojiData ? (
                                        <img src={emojiData.url} alt={emoji} style={{ width: "14px", height: "14px" }} />
                                    ) : emoji}
                                    <span style={{ opacity: 0.8 }}>{users.length}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Floating Reaction Button (🙂) */}
            {isHovered && !showPicker && (
                <button
                    onClick={() => setShowPicker(true)}
                    style={{
                        position: "absolute",
                        right: "0",
                        top: "0",
                        background: "#222",
                        border: "1px solid #444",
                        color: "#aaa",
                        borderRadius: "50%",
                        width: "24px",
                        height: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "14px",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.5)"
                    }}
                >
                    🙂
                </button>
            )}

            {/* Mini Picker Row */}
            {showPicker && (
                <div style={{
                    position: "absolute",
                    right: "0",
                    top: "-35px",
                    background: "#1a1a1a",
                    border: "1px solid #333",
                    padding: "5px 8px",
                    borderRadius: "20px",
                    display: "flex",
                    gap: "8px",
                    zIndex: 10,
                    boxShadow: "0 4px 15px rgba(0,0,0,0.6)",
                    animation: "pickerIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                }}>
                    <style>{`
                        @keyframes pickerIn {
                            from { opacity: 0; transform: translateY(10px) scale(0.8); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                        }
                    `}</style>
                    {emojis.map(emoji => (
                        <button
                            key={emoji.char}
                            onClick={() => handleReact(emoji.char)}
                            style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                width: "22px",
                                height: "22px",
                                transition: "transform 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.4)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                            <img src={emoji.url} alt={emoji.char} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
