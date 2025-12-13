import React from "react";
import { useParams } from "react-router-dom";
import CouchLayout from "../components/CouchLayout";
import ChatPanel from "../components/ChatPanel";
import YouTubePlayer from "../components/YouTubePlayer";
import ScreenShareButton from "../components/ScreenShareButton";
import ControlsBar from "../components/ControlsBar";
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

    React.useEffect(() => {
        joinRoom(roomId);
    }, [roomId]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <h2 style={{ textAlign: "center" }}>Room: {roomId}</h2>

            <button
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                style={{
                    padding: "10px 20px",
                    background: "#0099ff",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    marginBottom: "10px",
                    cursor: "pointer",
                    margin: "0 auto"
                }}
            >
                Copy Invite Link 🔗
            </button>

            <ControlsBar
                toggleMic={toggleMic}
                toggleCam={toggleCam}
                micEnabled={micEnabled}
                camEnabled={camEnabled}
                roomId={roomId}
            />

            <ScreenShareButton
                startShare={() => startScreenShare(roomId)}
                stopShare={() => stopScreenShare(roomId)}
                isSharing={isSharing}
            />
            <CouchLayout localStream={localStream} peers={peers} username={username} />

            {screenStream ? (
                <video
                    autoPlay
                    playsInline
                    style={{ width: "100%", borderRadius: "10px", marginTop: "10px" }}
                    ref={(video) => {
                        if (video) video.srcObject = screenStream;
                    }}
                />
            ) : (
                <YouTubePlayer roomId={roomId} />
            )}

            <ChatPanel />
        </div>
    );
}
