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

// --- Sub-component: The actual room content ---
function RoomContent({ roomId, username }) {
    const {
        localStream,
        peers,
        joinRoom,
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

    useEffect(() => {
        joinRoom(roomId, username);
    }, [roomId, username]);

    function handleURL(url) {
        if (!url) return;
        setLocalVideoUrl(null);
        if (isSharing) stopScreenShare(roomId);
        socket.emit("set-media", {
            roomId,
            media: { type: "url", url }
        });
    }

    const handleSelectMedia = (type, payload) => {
        if (type === "file" && payload) {
            const url = URL.createObjectURL(payload);
            setLocalVideoUrl(url);
            if (isSharing) stopScreenShare(roomId);
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

            <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
                <div style={{ background: "#111", padding: "10px", textAlign: "center" }}>
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
                            width: "70%",
                            padding: "12px",
                            fontSize: "18px",
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
                </div>

                <div style={{ height: "180px" }}>
                    <CouchLayout
                        localStream={localStream}
                        peers={peers}
                        username={username}
                        isHost={isHost}
                        onKick={kickPeer}
                    />
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
                <h1 style={{ marginBottom: "10px" }}>Ready to join?</h1>
                <p style={{ color: "#aaa", marginBottom: "30px" }}>Enter your name to enter the room</p>

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
