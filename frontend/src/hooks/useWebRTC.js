
import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "../socket";
import { v4 as uuid } from "uuid";
import useVirtualBackground from "./useVirtualBackground";

export default function useWebRTC() {
  const [rawStream, setRawStream] = useState(null); // Camera source
  const [localStream, setLocalStream] = useState(null); // Exposed stream
  const [peers, setPeers] = useState({});
  const [isSharing, setIsSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [username] = useState(localStorage.getItem("name") || "Guest");
  const [isHost, setIsHost] = useState(false);

  // Virtual Background
  const [backgroundEffect, setBackgroundEffect] = useState("none");
  const hiddenVideoRef = useRef(document.createElement("video"));
  const animationFrameRef = useRef(null);
  const { processStream, getCanvasStream, isReady: isBgReady } = useVirtualBackground();

  const peerConnections = useRef({});
  const peerId = useRef(uuid());

  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:YOUR_PUBLIC_IP:3478",
      username: "user",
      credential: "pass"
    }
  ];

  // Initialize hidden video for processing
  useEffect(() => {
    hiddenVideoRef.current.muted = true;
    hiddenVideoRef.current.playsInline = true;
    hiddenVideoRef.current.autoplay = true;
  }, []);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setRawStream(stream);
        setLocalStream(stream);
      } catch (err) {
        console.warn("⚠️ User denied media permissions or device not found:", err);
      }
    }
    startCamera();
  }, []);

  // Background Processing Loop
  const processFrame = useCallback(async () => {
    if (backgroundEffect !== "none" && rawStream && isBgReady) {
      await processStream(hiddenVideoRef.current, backgroundEffect);
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [backgroundEffect, rawStream, isBgReady, processStream]);

  // Handle Effect Changes
  useEffect(() => {
    if (!rawStream) return;

    const handleEffectChange = async () => {
      if (backgroundEffect === "none") {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        // Restore raw stream tracks
        // We need to preserve audio track from rawStream
        // And use video track from rawStream
        const audioTrack = rawStream.getAudioTracks()[0];
        const videoTrack = rawStream.getVideoTracks()[0];

        // If localStream is currently processed, we need to update it
        if (localStream !== rawStream) {
          setLocalStream(rawStream);

          // Update Peers
          Object.values(peerConnections.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === "video");
            if (sender && videoTrack) sender.replaceTrack(videoTrack);
          });
        }
      } else {
        // Start Processing
        if (!isBgReady) return;

        hiddenVideoRef.current.srcObject = rawStream;
        await hiddenVideoRef.current.play().catch(e => console.error("Hidden video play error", e));

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        processFrame();

        const canvasStream = getCanvasStream();
        const processedVideoTrack = canvasStream.getVideoTracks()[0];
        const audioTrack = rawStream.getAudioTracks()[0];

        const finalStream = new MediaStream([processedVideoTrack, audioTrack].filter(Boolean));
        setLocalStream(finalStream);

        // Update Peers
        Object.values(peerConnections.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender && processedVideoTrack) sender.replaceTrack(processedVideoTrack);
        });
      }
    };
    handleEffectChange();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [backgroundEffect, rawStream, isBgReady, processFrame, getCanvasStream]); // Removed localStream to avoid loop

  function forceStopMic(roomId) {
    if (!rawStream) return;
    const audioTrack = rawStream.getAudioTracks()[0];
    if (audioTrack && audioTrack.enabled) {
      audioTrack.stop();
      setMicEnabled(false);
      socket.emit("toggle-mic", { roomId, peerId: peerId.current, micEnabled: false });
    }
  }

  function toggleMic(roomId) {
    if (!rawStream) return;

    const audioTrack = rawStream.getAudioTracks()[0];

    if (audioTrack.enabled) {
      audioTrack.stop();
      setMicEnabled(false);
      socket.emit("toggle-mic", {
        roomId,
        peerId: peerId.current,
        micEnabled: false
      });

    } else {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(newStream => {
          const newAudioTrack = newStream.getAudioTracks()[0];

          // Update raw stream
          rawStream.removeTrack(audioTrack);
          rawStream.addTrack(newAudioTrack);

          // Helper to update peer sender
          Object.values(peerConnections.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === "audio");
            if (sender) sender.replaceTrack(newAudioTrack);
          });

          // Update local stream if separate
          // Note: if using processed stream, it uses valid audio track? 
          // We might need to update localStream's audio track too if it's a mix
          if (localStream && localStream !== rawStream) {
            const oldAudio = localStream.getAudioTracks()[0];
            if (oldAudio) localStream.removeTrack(oldAudio);
            localStream.addTrack(newAudioTrack);
          }

          setMicEnabled(true);
          socket.emit("toggle-mic", {
            roomId,
            peerId: peerId.current,
            micEnabled: true
          });
        });
    }
  }

  function toggleCam(roomId) {
    if (!rawStream) return;

    const videoTrack = rawStream.getVideoTracks()[0];

    if (videoTrack.enabled) {
      videoTrack.stop();
      setCamEnabled(false);
      socket.emit("toggle-cam", {
        roomId,
        peerId: peerId.current,
        camEnabled: false
      });
    } else {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(newStream => {
          const newVideoTrack = newStream.getVideoTracks()[0];

          // Update raw
          if (videoTrack) rawStream.removeTrack(videoTrack);
          rawStream.addTrack(newVideoTrack);

          // Trigger effect re-eval naturally via rawStream dependency (though identity constraint)
          // Ideally invoke setRawStream(newStream) to trigger effects?
          // Since rawStream state is object, let's update it
          // But we need to keep Audio track!
          const newRaw = new MediaStream([newVideoTrack, ...rawStream.getAudioTracks()]);
          setRawStream(newRaw);

          // If effect is None, manually update peers/local
          if (backgroundEffect === "none") {
            setLocalStream(newRaw);
            Object.values(peerConnections.current).forEach(pc => {
              const sender = pc.getSenders().find(s => s.track?.kind === "video");
              if (sender) sender.replaceTrack(newVideoTrack);
            });
          }
          // If effect is active, the useEffect [rawStream] will handle it? 
          // Yes, setRawStream triggers it.

          setCamEnabled(true);
          socket.emit("toggle-cam", {
            roomId,
            peerId: peerId.current,
            camEnabled: true
          });
        });
    }
  }

  function createPeerConnection(remoteId) {
    const pc = new RTCPeerConnection({ iceServers });

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      setPeers(prev => ({
        ...prev,
        [remoteId]: {
          peerId: remoteId,
          stream,
          micEnabled: true,
          camEnabled: true,
          username: prev[remoteId]?.username
        }
      }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          toPeerId: remoteId,
          fromPeerId: peerId.current,
          candidate: event.candidate
        });
      }
    };

    peerConnections.current[remoteId] = pc;
    return pc;
  }

  async function startScreenShare(roomId) {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      setScreenStream(displayStream);
      setIsSharing(true);

      Object.values(peerConnections.current).forEach(pc => {
        displayStream.getTracks().forEach(track => {
          // Note: addTrack returns sender
          pc.addTrack(track, displayStream);
        });
      });

      socket.emit("screen-started", { roomId, peerId: peerId.current });

      displayStream.getVideoTracks()[0].onended = () => stopScreenShare(roomId);
    } catch (err) {
      console.warn("⚠️ Screen share permission denied or cancelled:", err);
    }
  }

  function stopScreenShare(roomId) {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    setScreenStream(null);
    setIsSharing(false);

    socket.emit("screen-stopped", { roomId });
  }

  // Admin Actions
  function kickPeer(targetPeerId) {
    socket.emit("admin-action", {
      roomId: socket.roomId,
      action: "kick",
      targetPeerId
    });
  }

  function muteAll() {
    socket.emit("admin-action", {
      roomId: socket.roomId,
      action: "mute-all"
    });
  }

  async function joinRoom(roomId) {
    socket.emit("register", { peerId: peerId.current, username });
    socket.emit("join-room", { roomId, peerId: peerId.current });

    // Host Checks
    socket.on("host-update", ({ hostPeerId }) => {
      setIsHost(hostPeerId === peerId.current);
    });

    socket.on("kicked", () => {
      alert("You have been kicked by the host.");
      window.location.href = "/";
    });

    socket.on("force-mute", () => {
      forceStopMic(roomId);
      alert("The host muted everyone.");
    });

    socket.on("new-peer", async ({ peerId: remoteId, username: remoteName }) => {
      setPeers(prev => ({
        ...prev,
        [remoteId]: { ...prev[remoteId], username: remoteName }
      }));

      const pc = createPeerConnection(remoteId);

      // Add our tracks (localStream is what we send)
      if (localStream) {
        localStream.getTracks().forEach(track =>
          pc.addTrack(track, localStream)
        );
      }

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("offer", {
        toPeerId: remoteId,
        fromPeerId: peerId.current,
        sdp: offer
      });
    });

    socket.on("offer", async ({ fromPeerId: remoteId, sdp }) => {
      const pc = createPeerConnection(remoteId);

      if (localStream) {
        localStream.getTracks().forEach(track =>
          pc.addTrack(track, localStream)
        );
      }

      await pc.setRemoteDescription(sdp);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", {
        toPeerId: remoteId,
        fromPeerId: peerId.current,
        sdp: answer
      });
    });

    socket.on("answer", async ({ fromPeerId: remoteId, sdp }) => {
      const pc = peerConnections.current[remoteId];
      if (!pc) return;
      await pc.setRemoteDescription(sdp);
    });

    socket.on("ice-candidate", async ({ fromPeerId, candidate }) => {
      const pc = peerConnections.current[fromPeerId];
      if (!pc) return;
      await pc.addIceCandidate(candidate);
    });

    socket.on("screen-started", ({ peerId }) => {
      console.log("Screen started by:", peerId);
    });

    socket.on("screen-stopped", () => {
      console.log("Screen stopped");
    });

    socket.on("mic-toggled", ({ peerId, micEnabled }) => {
      setPeers(prev => ({
        ...prev,
        [peerId]: {
          ...prev[peerId],
          micEnabled
        }
      }));
    });

    socket.on("cam-toggled", ({ peerId, camEnabled }) => {
      setPeers(prev => ({
        ...prev,
        [peerId]: {
          ...prev[peerId],
          camEnabled
        }
      }));
    });
  }

  return {
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
    kickPeer,
    muteAll,
    setBackgroundEffect
  };
}
