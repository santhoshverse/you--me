import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import CouchLayout from "../components/CouchLayout";
import ChatPanel from "../components/ChatPanel";
import YouTubePlayer from "../components/YouTubePlayer";
import SideBar from "../components/SideBar";
import useWebRTC from "../hooks/useWebRTC";
import FloatingReactions from "../components/FloatingReactions";
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
        kickPeer
    } = useWebRTC();

    const [localVideoUrl, setLocalVideoUrl] = useState(null);

    const resetMediaModes = () => {
        setLocalVideoUrl(null);
        if (isSharing) stopScreenShare(roomId);
    };

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
        resetMediaModes();
        socket.emit("set-media", {
            roomId,
            media: { type: "url", url }
        });
    }

    const handleSelectMedia = (type, payload) => {
        if (type === "file" && payload) {
            resetMediaModes();
            const url = URL.createObjectURL(payload);
            setLocalVideoUrl(url);
            setTimeout(() => {
                socket.emit("set-media", {
                    roomId,
                    media: { type: "file", filename: payload.name }
                });
            }, 500);
        } else if (type === "screen") {
            if (isSharing) {
                stopScreenShare(roomId);
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
        const handleRoomState = ({ state }) => {
            if (state?.media?.type && state.media.type !== "file") {
                setLocalVideoUrl(null);
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
                <div style={{ padding: "20px", background: "#111", borderBottom: "1px solid #222" }}>
                    <div style={{ marginBottom: "15px" }}>
                        <div style={{ color: "#777", fontSize: "12px", textTransform: "uppercase", fontWeight: "bold", marginBottom: "5px" }}>Room Info</div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1a1a1a", padding: "10px", borderRadius: "8px", border: "1px solid #333" }}>
                            <span style={{ fontSize: "14px", fontWeight: "600", color: "#ddd", overflow: "hidden", textOverflow: "ellipsis" }}>ID: {roomId}</span>
                            <button
                                onClick={async () => {
                                    const success = await copyToClipboard(roomId);
                                    if (success) {
                                        setIdCopied(true);
                                        setTimeout(() => setIdCopied(false), 2000);
                                    }
                                }}
                                style={{ background: "transparent", border: "none", color: idCopied ? "#00b894" : "#7a35f0", cursor: "pointer", fontSize: "12px", transition: "color 0.2s", fontWeight: "bold" }}
                            >
                                {idCopied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                    </div>

                    <button onClick={handleCopyLink} style={{ ...shareLinkBtn, background: copied ? "#00b894" : "#7a35f0" }}>
                        {copied ? "✅ Link Copied!" : "🔗 Copy Invite Link"}
                    </button>

                    <button onClick={() => setShowLeaveConfirm(true)} style={{ ...leaveRoomBtn, marginTop: "15px", width: "100%" }}>
                        🚪 Leave Room
                    </button>
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
                    <FloatingReactions roomId={roomId} />

                    <YouTubePlayer
                        roomId={roomId}
                        localVideoUrl={localVideoUrl}
                        setLocalVideoUrl={setLocalVideoUrl}
                        isHost={isHost}
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

    const [hasJoined, setHasJoined] = useState(false);
    const [name, setName] = useState(localStorage.getItem("name") || "");
    const [tempName, setTempName] = useState(localStorage.getItem("name") || generateRandomName());
    const [isRegistering, setIsRegistering] = useState(false);

    // If already joined (e.g. state persists or we just clicked), show room
    if (hasJoined && name) {
        return <RoomContent roomId={roomId} username={name} />;
    }

    const handleJoin = async () => {
        if (!tempName.trim()) return;

        setIsRegistering(true);
        try {
            // Register guest if not already registered (or just to be sure we have a userId)
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
            const res = await fetch(`${BACKEND_URL}/api/rooms/guest`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: tempName })
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem("userId", data.userId);
                localStorage.setItem("name", data.name);
                setName(data.name);
                setHasJoined(true);
            } else {
                // Fallback if API fails but we want to allow joining
                localStorage.setItem("name", tempName);
                setName(tempName);
                setHasJoined(true);
            }
        } catch (err) {
            console.error("Registration failed:", err);
            localStorage.setItem("name", tempName);
            setName(tempName);
            setHasJoined(true);
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <div style={joinScreenContainer}>
            <div style={joinBox}>
                <h1 style={{ marginBottom: "5px" }}>Ready to join?</h1>
                <p style={{ color: "#7a35f0", fontWeight: "bold", fontSize: "14px", marginBottom: "30px" }}>
                    Room: {roomId}
                </p>
                <p style={{ color: "#aaa", marginBottom: "20px" }}>Enter your name to enter the room</p>

                <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Your Name"
                    style={joinInput}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                />

                <button
                    onClick={handleJoin}
                    style={joinButton}
                    disabled={isRegistering}
                >
                    {isRegistering ? "Joining..." : "Join Room"}
                </button>

                <button
                    onClick={() => navigate("/")}
                    style={{ ...joinButton, background: "transparent", border: "1px solid #444", marginTop: "10px" }}
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
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
