import React from "react";
import { useParams } from "react-router-dom";
import { socket } from "../socket";
import CouchLayout from "../components/CouchLayout";
import ChatPanel from "../components/ChatPanel";
import YouTubePlayer from "../components/YouTubePlayer";
import SideBar from "../components/SideBar";
import useWebRTC from "../hooks/useWebRTC";

import FloatingReactions from "../components/FloatingReactions";

export default function RoomPage() {
    const { roomId } = useParams();

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
        username,
        isHost,
        kickPeer
    } = useWebRTC();

    // No local media state needed anymore - everything is driven by the Universal Player via socket
    // EXCEPT local file playback which is personal
    const [localVideoUrl, setLocalVideoUrl] = React.useState(null);

    React.useEffect(() => {
        joinRoom(roomId);
    }, [roomId]);

    // ... (rest of code)

    function handleURL(url) {
        if (!url) return;

        // Reset local states completely
        setLocalVideoUrl(null);
        if (isSharing) stopScreenShare(roomId);

        socket.emit("set-media", {
            roomId,
            media: { type: "url", url }
        });
    }

    // Keep Sidebar callbacks compatible, though they're less critical now
    const handleSelectMedia = (type, payload) => {
        if (type === "file" && payload) {
            const url = URL.createObjectURL(payload);
            setLocalVideoUrl(url);
            if (isSharing) stopScreenShare(roomId);

            // Notify room about the filename so they can sync
            // Fix: Delay emit slightly to allow React state/refs to update first
            setTimeout(() => {
                socket.emit("set-media", {
                    roomId,
                    media: { type: "file", filename: payload.name }
                });
            }, 500);

        } else if (type === "screen") {
            // Screen share logic
            if (isSharing) {
                stopScreenShare(roomId);
            } else {
                // If starting screen share, maybe clear other media? 
                // The user said three modes. Let's clear media if starting screen.
                socket.emit("set-media", { roomId, media: null });
                startScreenShare(roomId);
            }
        } else {
            // For buttons that might still be clicked
            const url = prompt("Enter URL:");
            if (url) handleURL(url);
        }
    };

    // Chat State
    const [messages, setMessages] = React.useState([]);
    const [chatInput, setChatInput] = React.useState("");

    React.useEffect(() => {
        socket.on("chat-message", (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        // Listen for remote media changes to clear local file state
        socket.on("room-state", ({ state }) => {
            if (state?.media?.type && state.media.type !== "file") {
                setLocalVideoUrl(null);
            }
        });

        return () => {
            socket.off("chat-message");
            socket.off("room-state");
        }
    }, [socket]);

    function sendMessage() {
        if (!chatInput.trim()) return;

        socket.emit("chat-message", {
            roomId,
            message: chatInput,
            username: localStorage.getItem("name") || "Guest",
        });

        setChatInput("");
    }

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>

            {/* Left: Chat Panel */}
            <ChatPanel
                messages={messages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sendMessage={sendMessage}
                socket={socket}
                roomId={roomId}
                username={username}
            />

            {/* Center: Main Content Area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>

                {/* URL Input Bar */}
                <div style={{ background: "#111", padding: "10px", textAlign: "center" }}>
                    <input
                        type="text"
                        placeholder="Paste YouTube, Video, or Website URL..."
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleURL(e.target.value);
                                e.target.value = ""; // Clear input after send
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

                {/* Media Area (Universal Player) */}
                <div style={{ flex: 1, background: "black", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>

                    {/* Floating Reactions Overlay */}
                    <FloatingReactions roomId={roomId} />

                    {/* The Universal Player */}
                    <YouTubePlayer
                        roomId={roomId}
                        localVideoUrl={localVideoUrl}
                        setLocalVideoUrl={setLocalVideoUrl}
                    />

                    {/* Screen Share Overlay (Preserving functionality if active) */}
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

                {/* Avatars at Bottom */}
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

            {/* Right: Sidebar (Slim) */}
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
