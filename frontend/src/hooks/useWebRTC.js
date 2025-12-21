import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "../socket";
import { v4 as uuid } from "uuid";

export default function useWebRTC() {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({});
  const [isSharing, setIsSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [username, setUsername] = useState(localStorage.getItem("name") || "Guest");
  const [isHost, setIsHost] = useState(false);

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

  // State to track if we are ready to join
  const [readyToJoin, setReadyToJoin] = useState(false);
  const [intentRoomId, setIntentRoomId] = useState(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        setReadyToJoin(true); // Stream ready
      } catch (err) {
        console.warn("⚠️ User denied media permissions or device not found:", err);
        // Still allow joining without media if explicit failure, but warn user
        setReadyToJoin(true);
      }
    }
    startCamera();
  }, []);

  async function replaceTrackInPeers(newTrack, kindHint) {
    Object.values(peerConnections.current).forEach(pc => {
      const kind = newTrack?.kind || kindHint;
      const sender = pc.getSenders().find(s => s.track && s.track.kind === kind);
      if (sender && newTrack) {
        sender.replaceTrack(newTrack);
      } else if (newTrack) {
        // If no sender for this kind (e.g. joined while off), add it
        pc.addTrack(newTrack, localStream);
      } else if (sender && !newTrack) {
        // If we want to explicitly stop sending a track
        sender.replaceTrack(null);
      }
    });
  }

  async function toggleMic(roomId) {
    let newEnabled = !micEnabled;
    let audioTrack = localStream?.getAudioTracks()[0];

    if (!newEnabled) {
      // STOP: Release mic hardware
      if (audioTrack) {
        audioTrack.stop();
        audioTrack.enabled = false; // Just in case
      }
      replaceTrackInPeers(null, "audio");
    } else {
      // START: Request new mic track
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newTrack = stream.getAudioTracks()[0];

        // Add to existing localStream
        if (localStream) {
          if (audioTrack) localStream.removeTrack(audioTrack);
          localStream.addTrack(newTrack);
          // Update reference to trigger React updates
          setLocalStream(new MediaStream(localStream.getTracks()));
        } else {
          setLocalStream(stream);
        }

        audioTrack = newTrack;
        replaceTrackInPeers(newTrack);
      } catch (err) {
        console.error("Failed to re-enable mic:", err);
        newEnabled = false;
      }
    }

    setMicEnabled(newEnabled);
    socket.emit("toggle-mic", {
      roomId,
      peerId: peerId.current,
      micEnabled: newEnabled
    });
  }

  async function toggleCam(roomId) {
    let newEnabled = !camEnabled;
    let videoTrack = localStream?.getVideoTracks()[0];

    if (!newEnabled) {
      // STOP: Release camera hardware
      if (videoTrack) {
        videoTrack.stop();
        videoTrack.enabled = false;
      }
      replaceTrackInPeers(null, "video");
    } else {
      // START: Request new camera track
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = stream.getVideoTracks()[0];

        // Add to existing localStream
        if (localStream) {
          if (videoTrack) localStream.removeTrack(videoTrack);
          localStream.addTrack(newTrack);
          // Update reference to trigger React updates
          setLocalStream(new MediaStream(localStream.getTracks()));
        } else {
          setLocalStream(stream);
        }

        videoTrack = newTrack;
        replaceTrackInPeers(newTrack);
      } catch (err) {
        console.error("Failed to re-enable cam:", err);
        newEnabled = false;
      }
    }

    setCamEnabled(newEnabled);
    socket.emit("toggle-cam", {
      roomId,
      peerId: peerId.current,
      camEnabled: newEnabled
    });
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
          pc.addTrack(track, displayStream);
        });
      });

      socket.emit("screen-started", { roomId, peerId: peerId.current });

      displayStream.getVideoTracks()[0].onended = () => stopScreenShare(roomId);
    } catch (err) {
      console.warn("⚠️ Screen share permission denied or cancelled:", err);
    }
  }

  async function stopScreenShare(roomId) {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    setScreenStream(null);
    setIsSharing(false);

    // RESTORE CAMERA if it was enabled
    // We do this by toggling cam off and on, or just adding the track back
    // Toggling is safer as it handles socket events
    if (camEnabled) {
      // Force re-enable cam
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = stream.getVideoTracks()[0];

        if (localStream) {
          const oldTrack = localStream.getVideoTracks()[0];
          if (oldTrack) localStream.removeTrack(oldTrack);
          localStream.addTrack(newTrack);
          setLocalStream(new MediaStream(localStream.getTracks()));
        } else {
          setLocalStream(stream);
        }
        replaceTrackInPeers(newTrack, "video");
      } catch (e) { console.warn("Failed to restore cam", e); }
    }

    socket.emit("screen-stopped", { roomId, peerId: peerId.current });
  }

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

  // Renamed tryingToJoin -> joinRoom
  // This sets the INTENT to join. The effect below handles the actual join when ready.
  function joinRoom(roomId, name) {
    if (name) setUsername(name);
    setIntentRoomId(roomId);
  }

  // Media Sync State
  const [media, setMedia] = useState(null);
  const [playback, setPlayback] = useState({ isPlaying: false, time: 0 });

  // Actual join logic
  useEffect(() => {
    // Only join if we have an intent AND are ready (media initialized or failed)
    if (readyToJoin && intentRoomId) {
      initSocketJoin(intentRoomId);
      // We don't nullify intentRoomId here because we might want to stay "joined" in state
      // preventing re-joins is handled by checking if we are already in that room? 
      // Or just let it run once if deps change.
      // But if intentRoomId doesn't change, this effect won't re-run.
      // So this is safe.
    }
  }, [readyToJoin, intentRoomId]);

  async function initSocketJoin(roomId) {
    console.log("🚀 JOINING ROOM:", roomId, "Stream Ready:", !!localStream);

    socket.emit("register", { peerId: peerId.current, username: username });
    // IMPORTANT: Wait a bit or ensure register is handled? Usually socket.io handles order.
    socket.emit("join-room", { roomId, peerId: peerId.current, username: username });

    socket.on("host-update", ({ hostPeerId }) => {
      setIsHost(hostPeerId === peerId.current);
    });

    socket.on("kicked", () => {
      alert("You have been kicked by the host.");
      window.location.href = "/";
    });

    socket.on("force-mute", () => {
      if (micEnabled) toggleMic(roomId);
      alert("The host muted everyone.");
    });

    socket.on("room-state", ({ state, members, messages }) => {
      if (state) {
        if (state.media !== undefined) setMedia(state.media);
        if (state.playback !== undefined) setPlayback(state.playback);
      }

      if (members) {
        setPeers(prev => {
          const next = { ...prev };
          const memberIds = new Set(members.map(m => m.peer_id));

          // Removed members
          Object.keys(next).forEach(pid => {
            if (!memberIds.has(pid)) {
              delete next[pid];
            }
          });

          // Added or Updated members
          members.forEach(m => {
            if (m.peer_id !== peerId.current) {
              next[m.peer_id] = {
                ...next[m.peer_id], // Preserve stream if it exists
                peerId: m.peer_id,
                micEnabled: m.mic_enabled,
                camEnabled: m.cam_enabled,
                isSharing: m.is_sharing,
                username: m.username || "Guest"
              };
            }
          });
          return next;
        });
      }
    });

    socket.on("new-peer", async ({ peerId: remoteId, username: remoteName }) => {
      console.log("🔔 NEW PEER CONNECTED:", remoteId, "(", remoteName, ")");

      setPeers(prev => ({
        ...prev,
        [remoteId]: { ...prev[remoteId], username: remoteName }
      }));

      const pc = createPeerConnection(remoteId);

      if (localStream) {
        localStream.getTracks().forEach(track =>
          pc.addTrack(track, localStream)
        );
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log("📤 SENDING OFFER TO:", remoteId);
      socket.emit("offer", {
        toPeerId: remoteId,
        fromPeerId: peerId.current,
        sdp: offer
      });
    });

    socket.on("offer", async ({ fromPeerId: remoteId, sdp }) => {
      console.log("📩 OFFER RECEIVED FROM:", remoteId);
      const pc = createPeerConnection(remoteId);

      if (localStream) {
        localStream.getTracks().forEach(track =>
          pc.addTrack(track, localStream)
        );
      }

      await pc.setRemoteDescription(sdp);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log("📤 SENDING ANSWER TO:", remoteId);
      socket.emit("answer", {
        toPeerId: remoteId,
        fromPeerId: peerId.current,
        sdp: answer
      });
    });

    socket.on("answer", async ({ fromPeerId: remoteId, sdp }) => {
      console.log("📩 ANSWER RECEIVED FROM:", remoteId);
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

  function leaveRoom(roomId) {
    console.log("🚪 LEAVING ROOM:", roomId);

    // 1. Stop all local tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    // 2. Close all PeerConnections
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};

    // 3. Notify Backend
    socket.emit("leave-room", { roomId, peerId: peerId.current });

    // 4. Reset state
    setPeers({});
    setLocalStream(null);
    setScreenStream(null);
    setIsSharing(false);
  }

  return {
    localStream,
    peers,
    joinRoom,
    leaveRoom,
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
    media,
    playback
  };
}
