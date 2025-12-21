import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import CouchLayout from "../components/CouchLayout";
import ChatPanel from "../components/ChatPanel";
import YouTubePlayer from "../components/YouTubePlayer";
import SideBar from "../components/SideBar";
import useWebRTC from "../hooks/useWebRTC";
import { generateRandomName } from "../utils/randomName";
import { copyToClipboard } from "../utils/clipboard";

// --- Sub-component: The actual room content ---
function RoomContent({ roomId, username }) {
    const navigate = useNavigate();
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [copied, setCopied] = useState(false);
    const [idCopied, setIdCopied] = useState(false);

    const {
        localStream,
        peers,
        joinRoom,
        leaveRoom,
        startScreenShare,
        stopScreenShare,
        isSharing,
        screenStream,
        toggleMic,
        toggleCam,
        micEnabled,
        camEnabled,
        isHost,
        kickPeer,
        media,
        playback
    } = useWebRTC();

    const [localVideoUrl, setLocalVideoUrl] = useState(null);
    const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);

    const resetMediaModes = () => {
        setLocalVideoUrl(null);
        if (isSharing) stopScreenShare(roomId);
    };

    const [showSecondaryActions, setShowSecondaryActions] = useState(false);

    useEffect(() => {
        joinRoom(roomId, username);
    }, [roomId, username]);

    const handleActualLeave = () => {
        leaveRoom(roomId);
        navigate("/");
    };

    const handleCopyLink = async () => {
        const success = await copyToClipboard(window.location.href);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    function handleURL(url) {
        if (!url) return;
        // Sync Mode: Clear local screen share if any, and set media
        resetMediaModes();
        socket.emit("set-media", {
            roomId,
            media: { type: "url", url }
        });
    }

    const handleSelectMedia = (type, payload) => {
        if (type === "file" && payload) {
            // Screen Share Mode (Local File)
            // 1. Clear Sync Media (so viewers don't see old YouTube)
            socket.emit("set-media", { roomId, media: null });

            // 2. Start Screen Share for others to see
            if (!isSharing) startScreenShare(roomId);

            // 3. Set local URL for Host to see/control
            const url = URL.createObjectURL(payload);
            setLocalVideoUrl(url);

        } else if (type === "screen") {
            if (isSharing) {
                stopScreenShare(roomId);
                socket.emit("set-media", { roomId, media: null }); // Clear state
            } else {
                resetMediaModes();
                socket.emit("set-media", { roomId, media: null });
                startScreenShare(roomId);
            }
        } else {
            const url = prompt("Enter URL:");
            if (url) handleURL(url);
        }
    };

    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");

    useEffect(() => {
        const handleChat = (msg) => setMessages(prev => [...prev, msg]);
        const handleRoomState = ({ state, messages: history }) => {
            if (state?.media?.type && state.media.type !== "file") {
                // If remote sync media is active, clear local file view
                setLocalVideoUrl(null);
            }
            if (state?.is_screen_sharing !== undefined) {
                setIsRemoteScreenSharing(state.is_screen_sharing);
            }

            if (history) {
                const formattedHistory = history.map(m => ({
                    id: m.id,
                    message: m.text || m.message,
                    username: m.username,
                    time: m.createdAt
                }));
                setMessages(formattedHistory);
            }
        };

        socket.on("chat-message", handleChat);
        socket.on("room-state", handleRoomState);

        return () => {
            socket.off("chat-message", handleChat);
            socket.off("room-state", handleRoomState);
        }
    }, []);

    function sendMessage() {
        if (!chatInput.trim()) return;
        socket.emit("chat-message", {
            roomId,
            message: chatInput,
            username: username
        });
        setChatInput("");
    }

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>

            {/* Confirmation Modal Overlay */}
            {showLeaveConfirm && (
                <div style={modalOverlay}>
                    <div style={modalBox}>
                        <h2 style={{ marginBottom: "15px" }}>Leave Room?</h2>
                        <p style={{ color: "#aaa", marginBottom: "25px" }}>Are you sure you want to exit the room? This will stop your stream.</p>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                            <button onClick={() => setShowLeaveConfirm(false)} style={modalCancelBtn}>Cancel</button>
                            <button onClick={handleActualLeave} style={modalLeaveBtn}>Leave</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", height: "100%", borderRight: "1px solid #222", width: "300px" }}>
                <div style={{ padding: "15px", background: "#111", borderBottom: "1px solid #222" }}>
                    <div style={{ marginBottom: "12px" }}>
                        <div style={{ color: "#777", fontSize: "10px", textTransform: "uppercase", fontWeight: "bold", marginBottom: "5px", letterSpacing: "0.5px" }}>Room Details</div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1a1a1a", padding: "8px 12px", borderRadius: "8px", border: "1px solid #333" }}>
                            <span style={{ fontSize: "13px", fontWeight: "600", color: "#ddd", overflow: "hidden", textOverflow: "ellipsis" }}>ID: {roomId}</span>
                            <button
                                onClick={async () => {
                                    const success = await copyToClipboard(roomId);
                                    if (success) {
                                        setIdCopied(true);
                                        setTimeout(() => setIdCopied(false), 2000);
                                    }
                                }}
                                style={{ background: "transparent", border: "none", color: idCopied ? "#00b894" : "#7a35f0", cursor: "pointer", fontSize: "11px", transition: "color 0.2s", fontWeight: "bold" }}
                            >
                                {idCopied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowSecondaryActions(!showSecondaryActions)}
                        style={{ ...shareLinkBtn, background: showSecondaryActions ? "#222" : "#7a35f0", marginBottom: showSecondaryActions ? "10px" : "0" }}
                    >
                        {showSecondaryActions ? "🔼 Hide Options" : "🚀 Share Room"}
                    </button>

                    {showSecondaryActions && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", animation: "slideDown 0.2s ease-out" }}>
                            <style>{`
                                @keyframes slideDown {
                                    from { opacity: 0; transform: translateY(-10px); }
                                    to { opacity: 1; transform: translateY(0); }
                                }
                            `}</style>
                            <button onClick={handleCopyLink} style={{ ...shareLinkBtn, background: copied ? "#00b894" : "#1a1a1a", border: "1px solid #333", py: "8px", fontSize: "12px", boxShadow: "none" }}>
                                {copied ? "✅ Link Copied!" : "🔗 Copy Invite Link"}
                            </button>

                            <button onClick={() => setShowLeaveConfirm(true)} style={{ ...leaveRoomBtn, width: "100%", padding: "8px", fontSize: "12px", background: "transparent", border: "1px solid #444", boxShadow: "none" }}>
                                🚪 Leave Room
                            </button>
                        </div>
                    )}
                </div>
                <ChatPanel
                    messages={messages}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    sendMessage={sendMessage}
                    socket={socket}
                    roomId={roomId}
                    username={username}
                    peers={peers}
                />
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
                <div style={{ background: "#111", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "20px" }}>
                    <div style={{ color: "#777", fontSize: "12px", border: "1px solid #333", padding: "5px 10px", borderRadius: "5px", background: "#000" }}>
                        ROOM: <span style={{ color: "#7a35f0", fontWeight: "bold" }}>{roomId}</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Paste YouTube, Video, or Website URL..."
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleURL(e.target.value);
                                e.target.value = "";
                            }
                        }}
                        style={{
                            width: "60%",
                            padding: "10px",
                            fontSize: "14px",
                            borderRadius: "8px",
                            border: "1px solid #333",
                            background: "#222",
                            color: "white",
                            outline: "none"
                        }}
                    />
                </div>

                <div style={{ flex: 1, background: "black", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <YouTubePlayer
                        roomId={roomId}
                        localVideoUrl={localVideoUrl}
                        setLocalVideoUrl={setLocalVideoUrl}
                        isHost={isHost}
                        media={media}
                        playback={playback}
                    />

                    {screenStream && (
                        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 10, background: "black" }}>
                            <video
                                autoPlay
                                playsInline
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                ref={(video) => {
                                    if (video) video.srcObject = screenStream;
                                }}
                            />
                        </div>
                    )}

                    {/* Floating Camera Overlay (Avatars) */}
                    <div style={{
                        position: "absolute",
                        bottom: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 100,
                        width: "auto",
                        pointerEvents: "none" // Let clicks pass through to video unless on an avatar
                    }}>
                        <div style={{ pointerEvents: "auto" }}>
                            <CouchLayout
                                localStream={localStream}
                                peers={peers}
                                username={username}
                                isHost={isHost}
                                onKick={kickPeer}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <SideBar
                toggleMic={toggleMic}
                toggleCam={toggleCam}
                micEnabled={micEnabled}
                camEnabled={camEnabled}
                roomId={roomId}
                onSelectMedia={handleSelectMedia}
                isHost={isHost}
                isSharing={isSharing}
            />
        </div>
    );
}

// --- Main Page Wrapper ---
export default function RoomPage() {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [name, setName] = useState(localStorage.getItem("name") || "");
    const [userId, setUserId] = useState(localStorage.getItem("userId") || "");

    useEffect(() => {
        if (!name || !userId) {
            const guestName = generateRandomName();
            const guestId = `guest_${Math.random().toString(36).substr(2, 9)}`;

            localStorage.setItem("name", guestName);
            localStorage.setItem("userId", guestId);

            setName(guestName);
            setUserId(guestId);
            console.log(`👤 Assigned Guest Identity: ${guestName}`);
        }
    }, [name, userId]);

    if (!userId || !name) {
        return <div style={{ background: "#0a0a0a", height: "100vh", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>Setting up guest session...</div>;
    }

    return <RoomContent roomId={roomId} username={name} />;
}

const joinScreenContainer = {
    height: "100vh",
    width: "100vw",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0a0a0a",
    color: "white"
};

const joinBox = {
    background: "#161616",
    padding: "40px",
    borderRadius: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center"
};

const joinInput = {
    width: "100%",
    padding: "15px",
    fontSize: "18px",
    borderRadius: "10px",
    border: "1px solid #333",
    background: "#222",
    color: "white",
    marginBottom: "20px",
    outline: "none"
};

const joinButton = {
    width: "100%",
    padding: "15px",
    fontSize: "18px",
    borderRadius: "10px",
    border: "none",
    background: "#7a35f0",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "transform 0.2s"
};

const leaveRoomBtn = {
    background: "#ff4757",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
    transition: "all 0.2s",
    boxShadow: "0 4px 10px rgba(255, 71, 87, 0.3)"
};

const modalOverlay = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.85)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(5px)"
};

const modalBox = {
    background: "#1c1c1c",
    padding: "30px",
    borderRadius: "15px",
    width: "90%",
    maxWidth: "400px",
    textAlign: "center",
    boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
    border: "1px solid #333"
};

const modalCancelBtn = {
    background: "#333",
    color: "white",
    border: "none",
    padding: "12px 25px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "16px"
};

const modalLeaveBtn = {
    background: "#ff4757",
    color: "white",
    border: "none",
    padding: "12px 25px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "16px",
    boxShadow: "0 4px 15px rgba(255, 71, 87, 0.4)"
};

const shareLinkBtn = {
    width: "100%",
    padding: "12px",
    fontSize: "14px",
    fontWeight: "bold",
    borderRadius: "8px",
    border: "none",
    color: "white",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 4px 12px rgba(122, 53, 240, 0.3)"
};
