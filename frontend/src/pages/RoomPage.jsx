import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Draggable from "react-draggable";
import { socket } from "../socket";
import CouchLayout from "../components/CouchLayout";
import ChatPanel from "../components/ChatPanel";
import YouTubePlayer from "../components/YouTubePlayer";
import SideBar from "../components/SideBar";
import useWebRTC from "../hooks/useWebRTC";
import { generateRandomName } from "../utils/randomName";
import { copyToClipboard } from "../utils/clipboard";

// --- Sub-component: The actual room content ---
function URLInputModal({ isOpen, onClose, onSubmit, type }) {
    const [input, setInput] = React.useState("");

    if (!isOpen) return null;

    return (
        <div style={modalOverlay}>
            <div style={modalBox}>
                <h2 style={{ marginBottom: "15px" }}>
                    {type === "youtube" ? "📺 Play YouTube Video" : "🌐 Browse Website"}
                </h2>
                <input
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={type === "youtube" ? "Paste YouTube Link..." : "Enter Website URL (e.g. google.com)"}
                    style={joinInput}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onSubmit(input);
                        if (e.key === "Escape") onClose();
                    }}
                />
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                    <button onClick={onClose} style={modalCancelBtn}>Cancel</button>
                    <button onClick={() => onSubmit(input)} style={joinButton}>Load Content</button>
                </div>
            </div>
        </div>
    );
}

function RoomContent({ roomId, username }) {
    const navigate = useNavigate();
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [copied, setCopied] = useState(false);
    const [idCopied, setIdCopied] = useState(false);
    const avatarDragRef = React.useRef(null);

    const {
        localStream,
        peers,
        joinRoom,
        leaveRoom,
        startScreenShare,
        startFileStream,
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
        playback,
        screenShareEnabled
    } = useWebRTC();

    // --- MODE & STATE ---
    const [localVideoUrl, setLocalVideoUrl] = useState(null); // Deprecated but keeping for prop compat if needed (we pass null now)
    const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
    const [remoteScreenPeerId, setRemoteScreenPeerId] = useState(null);
    const [showSecondaryActions, setShowSecondaryActions] = useState(false);
    const [showLocalPreview, setShowLocalPreview] = useState(false);
    const [scaleMode, setScaleMode] = useState("contain"); // "contain" or "cover"

    // URL Modal State
    const [urlModal, setUrlModal] = useState({ isOpen: false, type: null });

    // Mode Logic
    const isSyncMode = !!media; // Any media (YouTube, File, URL) is Sync Mode
    const isStreamMode = isRemoteScreenSharing || isSharing;

    // Detect who is sharing screen remotely
    // Detect who is sharing screen remotely
    useEffect(() => {
        if (!peers) return;
        const sharerId = Object.keys(peers).find(pid => peers[pid]?.isSharing);

        if (sharerId) {
            setRemoteScreenPeerId(sharerId);
            setIsRemoteScreenSharing(true);
        } else {
            setRemoteScreenPeerId(null);
            setIsRemoteScreenSharing(false);
        }
    }, [peers]);

    // Active Stream for Stream Mode
    const activeStream = isSharing ? screenStream : (remoteScreenPeerId ? (peers[remoteScreenPeerId]?.screenStream || peers[remoteScreenPeerId]?.stream) : null);

    useEffect(() => {
        joinRoom(roomId, username);
        return () => { leaveRoom(roomId); };
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
        if (!isHost) return alert("Only Host can change content.");

        // Sync Mode: Set media. Backend will clear screen share.
        // We also stop local screen share just in case.
        if (isSharing) stopScreenShare(roomId);

        socket.emit("set-media", {
            roomId,
            media: { type: "url", url }
        });
    }

    // URL Join Logic
    useEffect(() => {
        if (roomId) {
            joinRoom(roomId);
        }
    }, [roomId]);

    const handleSelectMedia = (type, payload) => {
        // PERMISSION CHECK FOR SCREEN SHARE
        if (type === "screen") {
            if (!isHost && !screenShareEnabled) {
                return alert("🚫 Permission Denied\n\nOnly the Host can stream screens.\nAsk the Host to enable 'Screen Share' for you.");
            }
            // Proceed to share logic below...
        } else {
            // For YouTube/Files, ONLY HOST can control
            if (!isHost) return alert("Only Host can change content.");
        }

        if (type === "file" && payload) {
            // STREAM MODE: Host plays local file, shares TAB.
            // 1. Play locally
            const url = URL.createObjectURL(payload);
            setLocalVideoUrl(url);

            // 2. Clear Sync State (YouTube) so guests don't see conflicts
            socket.emit("set-media", { roomId, media: null });

            // 3. Trigger Screen Share
            // We explain this clearly to the user
            alert("👉 FOR BEST QUALITY:\n\n1. Select 'This Tab' in the popup.\n2. Enable 'Share Tab Audio'.\n3. The video will play locally and stream to friends.");
            startScreenShare(roomId);

        } else if (type === "screen") {
            if (isSharing) {
                stopScreenShare(roomId);
                setLocalVideoUrl(null);
            } else {
                // Clear Sync Media
                socket.emit("set-media", { roomId, media: null });
                setLocalVideoUrl(null);
                startScreenShare(roomId);
            }
        } else {
            // YouTube or Web: Open Modal
            setUrlModal({ isOpen: true, type });
        }
    };

    const handleUrlSubmit = (url) => {
        if (!url) return;

        // Stop screen share if active
        if (isSharing) stopScreenShare(roomId);

        let finalUrl = url.trim();
        // Auto-fix website URLs
        if (urlModal.type === "web" && !/^https?:\/\//i.test(finalUrl)) {
            finalUrl = "https://" + finalUrl;
        }

        handleURL(finalUrl);
        setUrlModal({ isOpen: false, type: null });
    };

    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");

    useEffect(() => {
        socket.on("chat-message", (msg) => {
            setMessages((prev) => [...prev, msg]);
        });

        // Also listen for room-state to get history if not handled by hook
        socket.on("room-state", ({ messages: history }) => {
            if (history) setMessages(history);
        });

        return () => {
            socket.off("chat-message");
            socket.off("room-state");
        };
    }, []);

    const sendMessage = () => {
        if (!chatInput.trim()) return;

        // Optimistic update? No, wait for server ack usually, but for simplicity:
        // We let the server broadcast it back (including to sender) to ensure ordering/timestamp.
        // Or if server doesn't echo to sender, we add it. 
        // Backend (socket.js line 86): io.to(roomId).emit(...) -> Broadcasts to ALL in room.

        socket.emit("chat-message", {
            roomId,
            message: chatInput,
            username
        });
        setChatInput("");
    };

    // Simplified Render Logic for Content Area
    // Priorities:
    // 1. Host Local Player (if Host & File) - localVideoUrl
    // 2. Active Screen Share Stream (activeStream)
    // 3. Sync Player (YouTube/URL) - media
    // 4. Waiting State

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

            {/* URL Input Modal */}
            <URLInputModal
                isOpen={urlModal.isOpen}
                onClose={() => setUrlModal({ ...urlModal, isOpen: false })}
                onSubmit={handleUrlSubmit}
                type={urlModal.type}
            />

            <div style={{ display: "flex", flexDirection: "column", height: "100%", borderRight: "1px solid #222", width: "300px", minWidth: "300px", background: "#111", zIndex: 50 }}>
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
                    isHost={isHost}
                    onTogglePermission={(targetPeerId) => {
                        socket.emit("admin-action", {
                            roomId,
                            action: "toggle-screen-share",
                            targetPeerId
                        });
                    }}
                />
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
                {/* Top Bar */}
                <div style={{ background: "#111", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "20px" }}>
                    {/* ... (Invite UI matches original) ... */}



                    {!isHost && !media && !activeStream && (
                        <div style={{ color: "#555", fontSize: "12px", fontStyle: "italic" }}>
                            Waiting for host to select content...
                        </div>
                    )}
                </div>

                <div style={{ flex: 1, background: "black", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>

                    {/* 1. HOST LOCAL PLAYER (Source of truth for stream) */}
                    {isHost && localVideoUrl && (
                        <div style={{ width: "100%", height: "100%", zIndex: 11, background: "black", display: "flex", flexDirection: "column" }}>
                            {/* Hint Overlay */}
                            <div style={{ position: "absolute", top: 10, left: 10, zIndex: 100, background: "rgba(0,0,0,0.6)", padding: "5px 10px", borderRadius: "4px", color: "white", fontSize: "12px" }}>
                                🔴 You are playing this file locally. Ensure Screen Share is active!
                            </div>
                            <video
                                src={localVideoUrl}
                                controls
                                style={{ width: "100%", height: "100%" }}
                            />
                        </div>
                    )}

                    {/* 2. ACTIVE STREAM (Screen Share) */}
                    {/* We show this if:
                        a) We are NOT the host playing a local file (handled above)
                        b) There is an active stream (either ours or remote)
                    */}
                    {!localVideoUrl && activeStream && (
                        <div id="stream-container" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 10, background: "black", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ position: "absolute", top: "10px", left: "10px", zIndex: 20, background: "rgba(0,0,0,0.7)", padding: "5px 10px", borderRadius: "5px", color: "white", fontSize: "12px", pointerEvents: "none" }}>
                                {isSharing ? "You are sharing your screen" : `${peers[remoteScreenPeerId]?.username || "Host"} is sharing`}
                            </div>

                            {/* IF SHARING & PREVIEW HIDDEN */}
                            {isSharing && !showLocalPreview ? (
                                <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#666", gap: "15px" }}>
                                    <div style={{ fontSize: "50px" }}>♾️</div>
                                    <div style={{ fontSize: "16px", fontWeight: "bold", color: "#aaa" }}>Preview Hidden</div>
                                    <div style={{ fontSize: "12px", maxWidth: "400px", textAlign: "center" }}>
                                        To prevent the "Infinite Mirror" effect, your screen preview is hidden locally.
                                        <br />Your friends can still see your stream perfectly!
                                    </div>
                                    <button
                                        onClick={() => setShowLocalPreview(true)}
                                        style={{ marginTop: "10px", padding: "8px 16px", background: "#333", border: "1px solid #555", color: "#ddd", borderRadius: "5px", cursor: "pointer" }}
                                    >
                                        Show Preview Anyway
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            const el = document.getElementById("stream-container");
                                            if (!document.fullscreenElement) {
                                                el.requestFullscreen().catch(err => console.log(err));
                                            } else {
                                                document.exitFullscreen();
                                            }
                                        }}
                                        style={{
                                            position: "absolute",
                                            top: "10px",
                                            right: "10px",
                                            zIndex: 20,
                                            background: "rgba(0,0,0,0.6)",
                                            border: "1px solid rgba(255,255,255,0.2)",
                                            borderRadius: "4px",
                                            color: "white",
                                            cursor: "pointer",
                                            padding: "5px 8px",
                                            fontSize: "14px",
                                            transition: "background 0.2s"
                                        }}
                                        title="Toggle Fullscreen"
                                    >
                                        ⛶
                                    </button>

                                    {isSharing && showLocalPreview && (
                                        <button
                                            onClick={() => setShowLocalPreview(false)}
                                            style={{
                                                position: "absolute",
                                                top: "10px",
                                                right: "50px", // Updated to not overlap
                                                zIndex: 20,
                                                background: "rgba(0,0,0,0.6)",
                                                border: "1px solid rgba(255,255,255,0.2)",
                                                borderRadius: "4px",
                                                color: "#e17055",
                                                cursor: "pointer",
                                                padding: "5px 8px",
                                                fontSize: "12px",
                                            }}
                                        >
                                            Hide Preview
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setScaleMode(prev => prev === "contain" ? "cover" : "contain")}
                                        style={{
                                            position: "absolute",
                                            top: "10px",
                                            right: "90px", // Left of Fullscreen
                                            zIndex: 20,
                                            background: "rgba(0,0,0,0.6)",
                                            border: "1px solid rgba(255,255,255,0.2)",
                                            borderRadius: "4px",
                                            color: "white",
                                            cursor: "pointer",
                                            padding: "5px 8px",
                                            fontSize: "14px",
                                            fontWeight: "bold"
                                        }}
                                        title="Toggle Fit/Fill"
                                    >
                                        {scaleMode === "contain" ? "⤢ Fill" : "⬜ Fit"}
                                    </button>

                                    <video
                                        autoPlay
                                        playsInline
                                        ref={(video) => {
                                            if (video && video.srcObject !== activeStream) {
                                                video.srcObject = activeStream;
                                            }
                                        }}
                                        style={{ width: "100%", height: "100%", objectFit: scaleMode, backgroundColor: "black" }}
                                    />
                                </>
                            )}
                        </div>
                    )}

                    {/* 3. SYNC PLAYER (YouTube) */}
                    {/* Show only if NO stream is active (Stream takes priority) */}
                    {!activeStream && media && (
                        <div style={{ width: "100%", height: "100%" }}>
                            <YouTubePlayer
                                roomId={roomId}
                                localVideoUrl={localVideoUrl}
                                setLocalVideoUrl={setLocalVideoUrl}
                                isHost={isHost}
                                media={media}
                                playback={playback}
                            />
                        </div>
                    )}

                    {/* 4. WAITING STATE */}
                    {!localVideoUrl && !activeStream && !media && (
                        <div style={{ color: "#444", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                            <div style={{ fontSize: "40px" }}>📺</div>
                            <div>Waiting for content...</div>
                            {!isHost && <div style={{ fontSize: "12px", color: "#666" }}>The host hasn't started streaming yet.</div>}
                        </div>
                    )}


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
                isSharing={isSharing && !localVideoUrl} // Only show screen share active if NOT playing a local file
            />

            {/* Floating Avatars (Draggable Anywhere) */}
            <Draggable nodeRef={avatarDragRef}>
                <div
                    ref={avatarDragRef}
                    style={{
                        position: "fixed",
                        bottom: "20px",
                        left: 0,
                        right: 0,
                        margin: "auto",
                        width: "fit-content",
                        zIndex: 999, // High z-index to float over sidebars
                        cursor: "grab"
                    }}
                >
                    <div style={{ pointerEvents: "auto" }}>
                        <CouchLayout localStream={localStream} peers={peers} username={username} isHost={isHost} onKick={kickPeer} />
                    </div>
                </div>
            </Draggable>
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
