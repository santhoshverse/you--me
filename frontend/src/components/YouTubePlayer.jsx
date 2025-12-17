import React, { useEffect, useRef, useState } from "react";
import { socket } from "../socket";

export default function YouTubePlayer({ roomId, localVideoUrl, setLocalVideoUrl }) {
    const playerRef = useRef(null);
    const ytContainerRef = useRef(null);
    const localVideoRef = useRef(null);
    const isRemoteUpdate = useRef(false);

    // Fix: Use ref to track localVideoUrl in the socket closure
    const localVideoUrlRef = useRef(localVideoUrl);
    useEffect(() => {
        localVideoUrlRef.current = localVideoUrl;
    }, [localVideoUrl]);

    const [videoId, setVideoId] = useState(null);
    const [webVideo, setWebVideo] = useState(null);
    const [iframeURL, setIframeURL] = useState(null);
    const [requiredFile, setRequiredFile] = useState(null);

    // Is current user the host? (Strictly speaking, anyone can control now, but we check if we should emit)
    // For now, allow anyone to control.
    const isHost = true;

    // Handle Local Video Prop (from sidebar or file picker)
    useEffect(() => {
        if (localVideoUrl) {
            setVideoId(null);
            setIframeURL(null);
            setRequiredFile(null); // Clear prompt if we have url
            setWebVideo(localVideoUrl);
        }
    }, [localVideoUrl]);

    function getMediaType(url) {
        if (!url) return null;
        if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
        if (url.match(/\.(mp4|webm|ogg|mov)$/i)) return "video";
        return "website";
    }

    function getYouTubeID(url) {
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|embed\/))([^&?]*)/);
        return match ? match[1] : null;
    }

    // Load YouTube API
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            document.body.appendChild(tag);
        }
    }, []);

    // Init YouTube Player
    useEffect(() => {
        if (videoId && window.YT && window.YT.Player) {
            initPlayer();
        } else if (videoId && !window.YT) {
            window.onYouTubeIframeAPIReady = initPlayer;
        }
        return () => {
            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch (e) { }
                playerRef.current = null;
            }
        };
    }, [videoId]);

    function initPlayer() {
        if (!ytContainerRef.current) return;
        ytContainerRef.current.innerHTML = "";
        const placeholder = document.createElement("div");
        ytContainerRef.current.appendChild(placeholder);

        playerRef.current = new window.YT.Player(placeholder, {
            height: "100%",
            width: "100%",
            videoId: videoId,
            playerVars: { playsinline: 1, origin: window.location.origin },
            events: {
                onStateChange: onPlayerStateChange,
            },
        });
    }

    function onPlayerStateChange(event) {
        if (!playerRef.current || isRemoteUpdate.current) return;
        const time = playerRef.current.getCurrentTime();
        if (event.data === window.YT.PlayerState.PLAYING) {
            socket.emit("player-action", { roomId, action: { type: "play", time, isPlaying: true } });
        }
        if (event.data === window.YT.PlayerState.PAUSED) {
            socket.emit("player-action", { roomId, action: { type: "pause", time, isPlaying: false } });
        }
    }

    // Local Video Events
    const handleVideoEvent = (type) => {
        if (!localVideoRef.current || isRemoteUpdate.current) return;
        const video = localVideoRef.current;
        const time = video.currentTime;
        const isPlaying = !video.paused;

        socket.emit("player-action", { roomId, action: { type, time, isPlaying } });
    };

    // Socket Listeners
    useEffect(() => {
        // Shared logic for handling media updates
        const handleMediaUpdate = (media) => {
            if (!media) return;
            const url = media.url;
            // Fix: Use the type provided by the server if available, otherwise guess from URL
            const type = media.type || getMediaType(url);

            if (playerRef.current && type !== "youtube") {
                try { playerRef.current.destroy(); } catch (e) { }
                playerRef.current = null;
            }

            setVideoId(null);
            // setWebVideo(null); // Don't clear immediately; handle in specific types
            setIframeURL(null);
            setRequiredFile(null);

            if (type === "youtube") {
                setWebVideo(null);
                const id = getYouTubeID(url);
                if (id) setVideoId(id);
            } else if (type === "video") {
                setWebVideo(url);
            } else if (type === "file") {
                // Fix: Check ref current value to avoid stale closure
                const currentLocal = localVideoUrlRef.current;

                if (currentLocal && currentLocal.startsWith("blob:")) {
                    setWebVideo(currentLocal);
                } else {
                    setWebVideo(null);
                    setRequiredFile(media.filename);
                }
            } else if (type === "website") {
                setWebVideo(null);
                setIframeURL(url);
            }
        };

        // Shared logic for handling player actions
        const handlePlayerAction = (action) => {
            if (!action) return;
            const { time, isPlaying } = action;
            isRemoteUpdate.current = true; // Lock

            // YouTube Sync
            if (playerRef.current && typeof playerRef.current.seekTo === "function") {
                if (Math.abs(playerRef.current.getCurrentTime() - time) > 1.0) {
                    playerRef.current.seekTo(time, true);
                }
                if (isPlaying) playerRef.current.playVideo();
                else playerRef.current.pauseVideo();
            }

            // Local Video Sync
            if (localVideoRef.current) {
                const video = localVideoRef.current;
                if (Math.abs(video.currentTime - time) > 0.5) {
                    video.currentTime = time;
                }
                if (isPlaying) video.play().catch(() => { });
                else video.pause();
            }

            setTimeout(() => { isRemoteUpdate.current = false; }, 800);
        };

        // Event Listeners
        socket.on("media-updated", ({ media }) => handleMediaUpdate(media));
        socket.on("player-action", (action) => handlePlayerAction(action));

        // Fix: Listen for initial room state when joining
        socket.on("room-state", ({ state }) => {
            if (state?.media) {
                handleMediaUpdate(state.media);
            }
            if (state?.playback) {
                // Small delay to let media load before applying playback state
                setTimeout(() => {
                    handlePlayerAction(state.playback);
                }, 1000);
            }
        });

        return () => {
            socket.off("media-updated");
            socket.off("player-action");
            socket.off("room-state");
        };
    }, []);

    return (
        <div style={{ textAlign: "center", width: "100%", height: "100%" }}>
            {!videoId && !webVideo && !iframeURL && !requiredFile && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#666" }}>
                    <h3>Waiting for content...</h3>
                </div>
            )}

            {/* Guest File Prompt */}
            {requiredFile && !webVideo && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "white" }}>
                    <h3>Host is playing: {requiredFile}</h3>
                    <p>Please select the same file on your device to sync.</p>
                    <label style={{
                        marginTop: "20px",
                        padding: "10px 20px",
                        background: "#7a35f0",
                        borderRadius: "8px",
                        cursor: "pointer"
                    }}>
                        Select File
                        <input
                            type="file"
                            style={{ display: "none" }}
                            onChange={(e) => {
                                if (e.target.files[0]) {
                                    setLocalVideoUrl(URL.createObjectURL(e.target.files[0]));
                                }
                            }}
                        />
                    </label>
                </div>
            )}

            {videoId && <div ref={ytContainerRef} style={{ width: "100%", height: "100%" }}></div>}

            {webVideo && (
                <video
                    ref={localVideoRef}
                    key={webVideo}
                    src={webVideo}
                    controls
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    onPlay={() => handleVideoEvent("play")}
                    onPause={() => handleVideoEvent("pause")}
                    onSeeked={() => handleVideoEvent("seek")}
                />
            )}

            {iframeURL && (
                <div style={{ width: "100%", height: "100%", position: "relative" }}>
                    <iframe
                        src={iframeURL}
                        style={{ width: "100%", height: "100%", border: "none", background: "white" }}
                        title="Shared Browser"
                    />
                </div>
            )}
        </div>
    );
}