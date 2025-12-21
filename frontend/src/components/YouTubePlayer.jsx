import React, { useEffect, useRef, useState } from "react";
import { socket } from "../socket";

export default function YouTubePlayer({ roomId, localVideoUrl, setLocalVideoUrl, isHost, playback, media }) {
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

    // Playback State for UI
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    // Handle Local Video Prop (from sidebar or file picker)
    useEffect(() => {
        if (localVideoUrl) {
            setVideoId(null);
            setIframeURL(null);
            setRequiredFile(null); // Clear prompt if we have url
            setWebVideo(localVideoUrl);
        } else {
            // If localVideoUrl is cleared from parent, clear webVideo if it was a local video
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
        if (!localVideoRef.current || isRemoteUpdate.current) return;
        const video = localVideoRef.current;
        const time = video.currentTime;
        const isPlaying = !video.paused;

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

    const handlePlayPause = () => {
        if (!isHost) return;
        const newIsPlaying = !playback?.isPlaying;
        const time = currentTime;

        socket.emit("player-action", {
            roomId,
            action: { type: newIsPlaying ? "play" : "pause", time, isPlaying: newIsPlaying }
        });

        // Apply locally (although prop update will catch it, better responsiveness)
        if (playerRef.current) {
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
            } else if (type === "video") {
                // handled by localVideoUrl prop usually?
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
        <div style={{ textAlign: "center", width: "100%", height: "100%", position: "relative", group: "player" }}>

            {/* Video Container */}
            <div style={{ height: "calc(100% - 50px)", width: "100%", position: "relative" }}>
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
                        <label style={{ marginTop: "20px", padding: "10px 20px", background: "#7a35f0", borderRadius: "8px", cursor: "pointer" }}>
                            Select File
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

                {/* Local Video */}
                {webVideo && (
                    <video
                        ref={localVideoRef}
                        key={webVideo}
                        src={webVideo}
                        controls={false} // Always false, use custom UI
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        onLoadedMetadata={(e) => setDuration(e.target.duration)}
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
            {(videoId || webVideo) && (
                <div style={{
                    height: "50px",
                    background: "#111",
                    borderTop: "1px solid #333",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 15px",
                    gap: "15px",
                    color: "white"
                }}>
                    <button onClick={handlePlayPause} disabled={!isHost} style={controlBtn}>
                        {playback?.isPlaying ? "⏸" : "▶"}
                    </button>

                    <button onClick={() => handleSkip(-10)} disabled={!isHost} style={controlBtn}>
                        ⏪ 10s
                    </button>

                    <button onClick={() => handleSkip(10)} disabled={!isHost} style={controlBtn}>
                        ⏩ 10s
                    </button>

                    <span style={{ fontSize: "12px", fontFamily: "monospace" }}>
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>

                    <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        step="1"
                        value={currentTime}
                        onChange={handleSeek}
                        disabled={!isHost}
                        style={{ flex: 1, cursor: isHost ? "pointer" : "default", accentColor: "#7a35f0" }}
                    />
                </div>
            )}
        </div>
    );
}

const controlBtn = {
    background: "transparent",
    border: "none",
    color: "white",
    fontSize: "18px",
    cursor: "pointer",
    padding: "5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.2s"
};