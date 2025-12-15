import React from "react";
import { useParams } from "react-router-dom";
import { socket } from "../socket";
import CouchLayout from "../components/CouchLayout";
import ChatPanel from "../components/ChatPanel";
import YouTubePlayer from "../components/YouTubePlayer";
import SideBar from "../components/SideBar";
import useWebRTC from "../hooks/useWebRTC";

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
        username
    } = useWebRTC();

    // No local media state needed anymore - everything is driven by the Universal Player via socket

    React.useEffect(() => {
        joinRoom(roomId);
    }, [roomId]);

    function handleURL(url) {
        if (!url) return;

        socket.emit("set-media", {
            roomId,
            media: { type: "url", url }
        });
    }

    // Keep Sidebar callbacks compatible, though they're less critical now
    const handleSelectMedia = (type, payload) => {
        if (type === "screen") {
            // Screen share logic remains separate or integrated based on future reqs, 
            // but current "screen" type in sidebar likely triggers webRTC screen share.
            // Actually, the original MediaArea had specific logic for "screen".
            // The user ignored screen share in the new request.
            // I will leave screen share logic aside for a moment, but since I am "Inserting new code statements",
            // I notice the user's snippet replaced "media-updated" logic. 
            // Let's keep screen share trigger separate in Sidebar if it was there?
            // Original: Screen share was in Sidebar but just alerted "Coming Soon" in one spot, 
            // but `mediaType === 'screen'` showed `screenStream`.
            // I should probably keep the screen share video element if `screenStream` is present? 
            // The user said: "Replace your return JSX" with just the player.
            // But screen share is a separate WebRTC feature. 
            // I will add the handleURL input, and use the Universal Player. 
            // I will ALSO render existing Screen Share conditionally if active, to not break that feature if it's working.
            // Wait, user's request: "Now your feature works like this...". They didn't mention screen share.
            // I will strictly follow their JSX for the media area but add back screen share if I see it fits, or trust their "Universal Player" handles the main "media" content.
            // Screen share is usually an overlay or separate mode. 
            // Original RoomPage had: `{mediaType === "screen" && screenStream && (...)`.
            // I will add screen share back as a safeguard if `screenStream` is active.
        } else {
            // For buttons that might still be clicked
            const url = prompt("Enter URL:");
            if (url) handleURL(url);
        }
    };

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>

            {/* Left: Chat Panel */}
            <ChatPanel />

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
                <div style={{ flex: 1, background: "black", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

                    {/* The Universal Player */}
                    <YouTubePlayer roomId={roomId} />

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
                    <CouchLayout localStream={localStream} peers={peers} username={username} />
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
            />
        </div>
    );
}
