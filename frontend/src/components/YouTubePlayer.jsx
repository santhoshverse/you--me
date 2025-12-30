import React, { useEffect, useRef, useState } from "react";
import { socket } from "../socket";

export default function YouTubePlayer({ roomId, localVideoUrl, setLocalVideoUrl, isHost, playback, media }) {
    const playerRef = useRef(null);
    const ytContainerRef = useRef(null);
    const localVideoRef = useRef(null);
    const containerRef = useRef(null); // Ref for Fullscreen
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

    // Playback State for UI
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    // Handle Local Video Prop (from sidebar or file picker)
    useEffect(() => {
        if (localVideoUrl) {
            setVideoId(null);
            setIframeURL(null);
            // If we have a local URL, we don't need to prompt for file anymore
            setRequiredFile(null);
            setWebVideo(localVideoUrl);
        } else {
            // If localVideoUrl is cleared, we might need to reset to "Waiting" or show prompt IF media.type is file
            // The media effect below will handle re-setting requiredFile if needed
            if (webVideo && webVideo.startsWith("blob:")) {
                setWebVideo(null);
            }
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
            playerVars: {
                playsinline: 1,
                origin: window.location.origin,
                controls: 0, // IMPORTANT: Hide native controls
                disablekb: 1,
                fs: 0,
                modestbranding: 1,
                rel: 0
            },
            events: {
                onStateChange: onPlayerStateChange,
                onReady: (e) => setDuration(e.target.getDuration())
            },
        });
    }

    function onPlayerStateChange(event) {
        if (!isHost) return; // Only host updates state
        if (!playerRef.current || isRemoteUpdate.current) return;

        const time = playerRef.current.getCurrentTime();

        // BUFFERING (3) usually happens before seeking finishes or playing starts
        // We mainly care about PLAYING (1) and PAUSED (2)
        if (event.data === window.YT.PlayerState.PLAYING) {
            socket.emit("player-action", { roomId, action: { type: "play", time, isPlaying: true } });
        }
        if (event.data === window.YT.PlayerState.PAUSED) {
            socket.emit("player-action", { roomId, action: { type: "pause", time, isPlaying: false } });
        }
    }

    // Local Video Events
    const handleVideoEvent = (type) => {
        if (!isHost) return;
        // If we are currently processing a remote update, do not emit back (feedback loop)
        if (!localVideoRef.current || isRemoteUpdate.current) return;

        const video = localVideoRef.current;
        const time = video.currentTime;
        const isPlaying = !video.paused;

        // Debounce frequent updates? No, direct is fine for now.
        socket.emit("player-action", { roomId, action: { type, time, isPlaying } });
    };

    // Socket Listeners (handled by parent useWebRTC mostly for state, but local player needs direct specific handling strictly when events fire)
    // Actually, useWebRTC passes us `playback` state. We should react to THAT.
    // The parent RoomPage handles `room-state` and updates `playback`.

    // React to `playback` prop changes
    useEffect(() => {
        if (!playback) return;
        const { time, isPlaying, type } = playback;

        // If I am Host and I just triggered this, ignore?
        // Actually, we should sync to confirm, but usually local player is ahead.
        // Let's rely on isRemoteUpdate lock if possible, but props don't have that context.
        // Simple rule: If difference is small, ignore.

        if (isHost && type !== "seek") return; // Host trusts local player unless it's a specific seek correction? No, host is authority.
        // Actually, if Host refreshes, he needs to load state.

        isRemoteUpdate.current = true;

        if (playerRef.current && typeof playerRef.current.seekTo === "function") {
            const current = playerRef.current.getCurrentTime();
            // Sync time if drift > 1s
            if (Math.abs(current - time) > 1.0) {
                playerRef.current.seekTo(time, true);
            }
            // Sync State
            const playerState = playerRef.current.getPlayerState();
            const isYtPlaying = playerState === window.YT.PlayerState.PLAYING || playerState === window.YT.PlayerState.BUFFERING;

            if (isPlaying && !isYtPlaying) playerRef.current.playVideo();
            if (!isPlaying && isYtPlaying) playerRef.current.pauseVideo();
        }

        if (localVideoRef.current) {
            const video = localVideoRef.current;
            if (Math.abs(video.currentTime - time) > 0.5) {
                video.currentTime = time;
            }
            if (isPlaying && video.paused) video.play().catch(() => { });
            if (!isPlaying && !video.paused) video.pause();
        }

        setTimeout(() => { isRemoteUpdate.current = false; }, 500);

    }, [playback, isHost]);

    // Internal Timer for UI Slider
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
                setCurrentTime(playerRef.current.getCurrentTime());
                // Also update duration if not set
                if (duration === 0) setDuration(playerRef.current.getDuration());
            } else if (localVideoRef.current) {
                setCurrentTime(localVideoRef.current.currentTime);
                if (duration === 0) setDuration(localVideoRef.current.duration);
            }
        }, 500);
        return () => clearInterval(interval);
    }, [duration]);


    // Handlers for Custom Controls (Host Only)
    const handleSeek = (e) => {
        if (!isHost) return;
        const newTime = parseFloat(e.target.value);
        setCurrentTime(newTime); // Optimistic UI

        // Emit seek immediately
        // Note: We emit 'play' or 'pause' with new time to sync
        // Or strictly 'seek'
        socket.emit("player-action", {
            roomId,
            action: { type: "seek", time: newTime, isPlaying: playback?.isPlaying }
        });

        // Apply locally
        if (playerRef.current) playerRef.current.seekTo(newTime, true);
        if (localVideoRef.current) localVideoRef.current.currentTime = newTime;
    };

    // Local Playback State for immediate UI response
    const [localIsPlaying, setLocalIsPlaying] = useState(false);

    useEffect(() => {
        if (playback) {
            setLocalIsPlaying(playback.isPlaying);
        }
    }, [playback]);

    const handlePlayPause = () => {
        if (!isHost) return;

        // Toggle based on LOCAL state for immediate feedback
        const newIsPlaying = !localIsPlaying;
        setLocalIsPlaying(newIsPlaying);
        const time = currentTime;

        socket.emit("player-action", {
            roomId,
            action: { type: newIsPlaying ? "play" : "pause", time, isPlaying: newIsPlaying }
        });

        // Apply locally
        if (playerRef.current && typeof playerRef.current.playVideo === "function") {
            if (newIsPlaying) playerRef.current.playVideo();
            else playerRef.current.pauseVideo();
        }
        if (localVideoRef.current) {
            if (newIsPlaying) localVideoRef.current.play();
            else localVideoRef.current.pause();
        }
    };

    const handleSkip = (seconds) => {
        if (!isHost) return;
        let newTime = currentTime + seconds;
        if (newTime < 0) newTime = 0;
        if (newTime > duration) newTime = duration;

        setCurrentTime(newTime);
        socket.emit("player-action", {
            roomId,
            action: { type: "seek", time: newTime, isPlaying: playback?.isPlaying }
        });

        if (playerRef.current) playerRef.current.seekTo(newTime, true);
        if (localVideoRef.current) localVideoRef.current.currentTime = newTime;
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            if (containerRef.current) {
                containerRef.current.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
            }
        } else {
            document.exitFullscreen();
        }
    };

    // Sync Logic for incoming Media Props (reset)
    useEffect(() => {
        // Handle media changes if passed from parent
        // (The parent handles socket 'media-updated' -> passes down as prop?)
        // In previous code `media` wasn't used here, but `localVideoUrl` was.
        // Let's try to infer from `media` prop if provided.
        if (media) {
            const url = media.url;
            let type = media.type || getMediaType(url);
            if (type === "url") type = getMediaType(url);

            if (type === "youtube") {
                const id = getYouTubeID(url);
                if (id) {
                    setVideoId(id);
                    setWebVideo(null);
                    setIframeURL(null);
                    setRequiredFile(null);
                }
            } else if (type === "video" || type === "player") {
                // "player" type comes from our new Upload logic
                setWebVideo(url);
                setVideoId(null);
            } else if (type === "file") {
                if (localVideoUrlRef.current && localVideoUrlRef.current.startsWith("blob:")) {
                    setWebVideo(localVideoUrlRef.current);
                } else {
                    setRequiredFile(media.filename);
                }
                setVideoId(null);
            } else if (type === "website") {
                setIframeURL(url);
                setVideoId(null);
            }
        }
    }, [media]);

    function formatTime(s) {
        if (!s) return "0:00";
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec < 10 ? "0" + sec : sec}`;
    }

    return (
        <div ref={containerRef} style={{ textAlign: "center", width: "100%", height: "100%", position: "relative", group: "player", background: "#000" }}>

            {/* Video Container */}
            <div style={{ height: "calc(100% - 50px)", width: "100%", position: "relative" }}>
                {!videoId && !webVideo && !iframeURL && !requiredFile && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#666" }}>
                        <h3>Waiting for content...</h3>
                    </div>
                )}

                {/* Guest File Prompt */}
                {requiredFile && !webVideo && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#eee", fontFamily: "sans-serif", background: "#111" }}>
                        <div style={{ fontSize: "50px", marginBottom: "20px" }}>🎬</div>
                        <h2 style={{ marginBottom: "10px" }}>Local Video Session</h2>
                        <p style={{ marginBottom: "5px", color: "#aaa" }}>The host has selected a local video file.</p>

                        <div style={{
                            background: "#222",
                            padding: "10px 20px",
                            borderRadius: "8px",
                            border: "1px solid #333",
                            margin: "20px 0",
                            maxWidth: "80%",
                            wordBreak: "break-all"
                        }}>
                            <span style={{ color: "#777", fontSize: "12px", textTransform: "uppercase", display: "block", marginBottom: "5px" }}>Target File</span>
                            <strong style={{ color: "#fff", fontSize: "14px" }}>{requiredFile}</strong>
                        </div>

                        <p style={{ marginBottom: "25px", fontSize: "14px", color: "#bbb" }}>To watch together, please select the same file from your device.</p>

                        <label style={{
                            padding: "12px 30px",
                            background: "linear-gradient(135deg, #7a35f0, #5b2ac2)",
                            borderRadius: "30px",
                            cursor: "pointer",
                            fontWeight: "bold",
                            boxShadow: "0 4px 15px rgba(122, 53, 240, 0.4)",
                            transition: "transform 0.2s"
                        }}>
                            📂 Select Video File
                            <input type="file" style={{ display: "none" }} onChange={(e) => {
                                if (e.target.files[0]) {
                                    setLocalVideoUrl(URL.createObjectURL(e.target.files[0]));
                                }
                            }}
                            />
                        </label>
                    </div>
                )}

                {/* YouTube */}
                <div ref={ytContainerRef} style={{ width: "100%", height: "100%", display: videoId ? "block" : "none", pointerEvents: isHost ? "auto" : "none" }}></div>

                {/* Local Video (or Uploaded Stream) */}
                {webVideo && (
                    <video
                        ref={localVideoRef}
                        key={webVideo}
                        src={webVideo}
                        controls={true} // Enable controls for Host (and Guests) to see time/volume
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        onLoadedMetadata={(e) => setDuration(e.target.duration)}
                        // Host events trigger socket actions
                        onPlay={() => handleVideoEvent("play")}
                        onPause={() => handleVideoEvent("pause")}
                        onSeeked={() => handleVideoEvent("seek")}
                    // Disable interaction for guests via pointer-events (handled below) or just trust them?
                    // Kosmi usually allows local volume but disables seek/pause for guests.
                    />
                )}

                {iframeURL && (
                    <div style={{ width: "100%", height: "100%", position: "relative" }}>
                        <iframe src={iframeURL} style={{ width: "100%", height: "100%", border: "none", background: "white" }} title="Shared Browser" />
                    </div>
                )}

                {/* Viewer blocker for clicks if needed */}
                {!isHost && (videoId || webVideo) && (
                    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1 }}></div>
                )}
            </div>

            {/* CUSTOM CONTROL BAR */}
            {(videoId || webVideo || iframeURL) && (
                <div style={{
                    position: "absolute",
                    bottom: "20px",
                    left: iframeURL ? "auto" : "50%",
                    right: iframeURL ? "20px" : "auto",
                    transform: iframeURL ? "none" : "translateX(-50%)",
                    width: iframeURL ? "auto" : "90%", // Compact for websites
                    maxWidth: "800px",
                    height: "60px",
                    background: "rgba(20, 20, 20, 0.8)",
                    backdropFilter: "blur(10px)",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 20px",
                    gap: "20px",
                    color: "white",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    opacity: 1,
                    transition: "opacity 0.3s",
                    zIndex: 20
                }}>
                    <style>{`
                        input[type=range] {
                            -webkit-appearance: none;
                            background: transparent;
                        }
                        input[type=range]::-webkit-slider-thumb {
                            -webkit-appearance: none;
                            height: 16px;
                            width: 16px;
                            border-radius: 50%;
                            background: #7a35f0;
                            margin-top: -6px;
                            box-shadow: 0 0 10px rgba(122, 53, 240, 0.7);
                            cursor: pointer;
                        }
                        input[type=range]::-webkit-slider-runnable-track {
                            width: 100%;
                            height: 4px;
                            cursor: pointer;
                            background: rgba(255,255,255,0.2);
                            border-radius: 2px;
                        }
                        input[type=range]:focus { outline: none; }
                    `}</style>

                    {!iframeURL && (
                        <>
                            <button onClick={() => handleSkip(-10)} disabled={!isHost} style={controlBtn} title="-10s">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
                                </svg>
                            </button>

                            <button
                                onClick={handlePlayPause}
                                disabled={!isHost}
                                style={{ ...controlBtn, width: "40px", height: "40px", background: "#7a35f0", borderRadius: "50%", color: "white", padding: 0 }}
                            >
                                {localIsPlaying ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                )}
                            </button>

                            <button onClick={() => handleSkip(10)} disabled={!isHost} style={controlBtn} title="+10s">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                                </svg>
                            </button>

                            <input
                                type="range"
                                min="0"
                                max={duration || 100}
                                step="1"
                                value={currentTime}
                                onChange={handleSeek}
                                disabled={!isHost}
                                style={{ flex: 1, cursor: isHost ? "pointer" : "default" }}
                            />

                            <span style={{ fontSize: "14px", fontFamily: "Inter, sans-serif", fontWeight: "600", minWidth: "100px", textAlign: "right" }}>
                                {formatTime(currentTime)} <span style={{ color: "#888" }}>/</span> {formatTime(duration)}
                            </span>
                        </>
                    )}

                    <button onClick={toggleFullscreen} style={controlBtn} title="Toggle Fullscreen">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}

const controlBtn = {
    background: "transparent",
    border: "none",
    color: "#ddd",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
    padding: "8px",
    borderRadius: "8px"
};