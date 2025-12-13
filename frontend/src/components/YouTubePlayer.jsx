import React, { useEffect, useRef, useState } from "react";
import { socket } from "../socket";

export default function YouTubePlayer({ roomId }) {
    const playerRef = useRef(null);
    const [videoId, setVideoId] = useState(null);
    const [isHost] = useState(true); // later replace with role check

    // Load YouTube API script
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            document.body.appendChild(tag);
        } else {
            initPlayer();
        }

        window.onYouTubeIframeAPIReady = initPlayer;
    }, []);

    function initPlayer() {
        playerRef.current = new window.YT.Player("yt-player", {
            height: "360",
            width: "640",
            videoId: videoId || "dQw4w9WgXcQ", // Default to Rick Roll to ensure valid ID prevents null crash
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

    function onPlayerStateChange(event) {
        if (!isHost) return;

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

    // When host enters a URL
    const addVideo = () => {
        const url = prompt("Enter YouTube URL:");
        const id = url.split("v=")[1];
        setVideoId(id);

        socket.emit("set-media", {
            roomId,
            media: { type: "youtube", videoId: id }
        });
    };

    // Receive events from server
    useEffect(() => {
        socket.on("media-updated", ({ media }) => {
            setVideoId(media.videoId);
            playerRef.current.loadVideoById(media.videoId);
        });

        socket.on("player-action", (action) => {
            const { time, isPlaying } = action;

            const now = Date.now();
            const travel = (now - action.updatedAt) / 1000;
            const syncedTime = time + travel;

            playerRef.current.seekTo(syncedTime, true);

            if (isPlaying) playerRef.current.playVideo();
            else playerRef.current.pauseVideo();
        });
    }, []);

    return (
        <div style={{ textAlign: "center" }}>
            <button onClick={addVideo} style={{ padding: 10, marginBottom: 20 }}>
                Add YouTube Video 🎥
            </button>

            <div id="yt-player"></div>
        </div>
    );
}
