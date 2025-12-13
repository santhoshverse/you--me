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

    const [mediaType, setMediaType] = React.useState("youtube"); // youtube, web, file, screen
    const [webUrl, setWebUrl] = React.useState(null);

    React.useEffect(() => {
        joinRoom(roomId);
    }, [roomId]);

    // Handle media selection
    const handleSelectMedia = (type, payload) => {
        setMediaType(type);

        if (type === "web") {
            const url = prompt("Enter Website URL (https://...):");
            if (url) setWebUrl(url);
        } else if (type === "file") {
            alert(`File selected: ${payload?.name} (Coming Soon)`);
        } else if (type === "youtube") {
            const url = prompt("Enter YouTube URL:");
            if (url) {
                const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|embed\/))([^&?]*)/);
                const id = match ? match[1] : null;

                if (id) {
                    socket.emit("set-media", {
                        roomId,
                        media: { type: "youtube", videoId: id }
                    });
                } else {
                    alert("Invalid YouTube URL");
                }
            }
        }
    };

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>

            {/* Left: Chat Panel */}
            <ChatPanel />

            {/* Center: Main Content Area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>

                {/* Media Area (YouTube / Screen / Web) */}
                <div style={{ flex: 1, background: "black", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {/* Render based on selected media type */}
                    {mediaType === "youtube" && <YouTubePlayer roomId={roomId} />}

                    {mediaType === "web" && webUrl && (
                        <iframe
                            src={webUrl}
                            style={{ width: "100%", height: "100%", border: "none" }}
                            title="Web Browser"
                        />
                    )}

                    {mediaType === "screen" && screenStream && (
                        <video
                            autoPlay
                            playsInline
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            ref={(video) => {
                                if (video) video.srcObject = screenStream;
                            }}
                        />
                    )}
                </div>

                {/* Avatars at Bottom */}
                <div style={{ height: "180px" }}> {/* Fixed height for avatars */}
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
