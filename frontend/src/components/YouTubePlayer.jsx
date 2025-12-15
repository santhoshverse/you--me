import React, { useEffect, useRef, useState } from "react";
import { socket } from "../socket";

export default function YouTubePlayer({ roomId }) {
    const playerRef = useRef(null);
    const ytContainerRef = useRef(null); // Ref for the safe wrapper
    const [videoId, setVideoId] = useState(null);
    const [webVideo, setWebVideo] = useState(null);
    const [iframeURL, setIframeURL] = useState(null);
    const [isHost] = useState(true); // later replace with role check

    function getMediaType(url) {
        if (!url) return null;
        if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
        if (url.match(/\.(mp4|webm|ogg|mov)$/i)) return "video";
        return "website"; // any other URL
    }

    // Load YouTube API script
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            document.body.appendChild(tag);
        }
    }, []); // Only run once on mount

    // Init player when videoId is set and container is ready
    useEffect(() => {
        if (videoId && window.YT && window.YT.Player) {
            initPlayer();
        } else if (videoId && !window.YT) {
            // If API not ready yet, wait for it
            window.onYouTubeIframeAPIReady = initPlayer;
        }

        return () => {
            // Cleanup: destroy player when unmounting or switching video
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch (e) { console.warn("Player destroy failed", e); }
                playerRef.current = null;
            }
        };
    }, [videoId]);


    function initPlayer() {
        if (!ytContainerRef.current) return;

        // Safety: Ensure any previous iframe is gone before creating new one
        ytContainerRef.current.innerHTML = "";

        // Create a neat placeholder DIV inside our React-controlled container
        // React manages 'ytContainerRef', YouTube manages 'placeholder'
        const placeholder = document.createElement("div");
        ytContainerRef.current.appendChild(placeholder);

        playerRef.current = new window.YT.Player(placeholder, {
            height: "100%",
            width: "100%",
            videoId: videoId,
            playerVars: {
                playsinline: 1,
                origin: window.location.origin,
            },
            events: {
                onReady: onPlayerReady,
                onStateChange: onPlayerStateChange,
            },
        });
    }

    function onPlayerReady() {
        console.log("YT Player Ready");
    }

    const isRemoteUpdate = useRef(false);

    function onPlayerStateChange(event) {
        if (!isHost || !playerRef.current) return;

        // Block updates if they come from remote sync
        if (isRemoteUpdate.current) return;

        // Basic sync for YouTube (only if active)
        const time = playerRef.current.getCurrentTime();
        if (event.data === window.YT.PlayerState.PLAYING) {
            socket.emit("player-action", {
                roomId,
                action: { type: "play", time, isPlaying: true },
            });
        }
        if (event.data === window.YT.PlayerState.PAUSED) {
            socket.emit("player-action", {
                roomId,
                action: { type: "pause", time, isPlaying: false },
            });
        }
    }

    // Reuse helper to extract ID safely
    function getYouTubeID(url) {
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|embed\/))([^&?]*)/);
        return match ? match[1] : null;
    }

    // Receive events from server
    useEffect(() => {
        socket.on("media-updated", ({ media }) => {
            const url = media.url;
            const type = getMediaType(url);

            // Clean up old player if switching types
            if (playerRef.current && type !== "youtube") {
                try { playerRef.current.destroy(); } catch (e) { }
                playerRef.current = null;
            }

            // Reset all first
            setVideoId(null);
            setWebVideo(null);
            setIframeURL(null);

            if (type === "youtube") {
                const id = getYouTubeID(url);
                if (id) {
                    setVideoId(id);
                    // If we already have a player instance, just load new video
                    // BUT: Since we toggle `videoId` state, the effect might re-run.
                    // Actually, setting videoId to null then back to id in same tick *might* loop or flicker.
                    // Better to just set it. 
                    // However, for the crash fix, doing a fresh init is safer.
                    // Let's rely on the Effect to build/rebuild the player for now to be safe.
                }
            } else if (type === "video") {
                setWebVideo(url);
            } else if (type === "website") {
                setIframeURL(url);
            }
        });

        socket.on("player-action", (action) => {
            // Only sync if in YouTube mode and player exists
            if (playerRef.current && typeof playerRef.current.seekTo === "function") {
                const { time, isPlaying } = action;

                // Set lock to prevent this change from triggering an emit
                isRemoteUpdate.current = true;

                const now = Date.now();
                const travel = (now - action.updatedAt) / 1000;
                const syncedTime = time + travel;

                // Only seek if diff is significant to avoid stutter
                if (Math.abs(playerRef.current.getCurrentTime() - syncedTime) > 0.5) {
                    playerRef.current.seekTo(syncedTime, true);
                }

                if (isPlaying) playerRef.current.playVideo();
                else playerRef.current.pauseVideo();

                // Release lock after a short delay to allow state to settle
                setTimeout(() => {
                    isRemoteUpdate.current = false;
                }, 1000);
            }
        });

        return () => {
            socket.off("media-updated");
            socket.off("player-action");
        };
    }, []);

    return (
        <div style={{ textAlign: "center", width: "100%", height: "100%" }}>

            {!videoId && !webVideo && !iframeURL && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#666" }}>
                    <h3>Waiting for content...</h3>
                </div>
            )}

            {/* YouTube */}
            {videoId && (
                <div ref={ytContainerRef} style={{ width: "100%", height: "100%" }}></div>
            )}

            {/* Web Video Player */}
            {webVideo && (
                <video
                    key={webVideo}
                    src={webVideo}
                    controls
                    autoPlay
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
            )}

            {/* Website Viewer */}
            {iframeURL && (
                <iframe
                    src={iframeURL}
                    style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                        background: "white"
                    }}
                    title="Shared Browser"
                />
            )}
        </div>
    );
}