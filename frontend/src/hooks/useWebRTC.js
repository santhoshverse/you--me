
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
  const roomIdRef = useRef(null);

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

  async function replaceTrackInPeers(newTrack) {
    if (!newTrack) return;
    Object.values(peerConnections.current).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === newTrack.kind);
      if (sender) {
        sender.replaceTrack(newTrack);
      }
    });
  }

  async function toggleMic(roomId) {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    const newEnabled = !micEnabled;

    if (!newEnabled) {
      if (audioTrack) {
        audioTrack.stop();
        localStream.removeTrack(audioTrack);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newTrack = stream.getAudioTracks()[0];
        localStream.addTrack(newTrack);
        await replaceTrackInPeers(newTrack);
      } catch (e) {
        console.warn("Failed to re-enable mic:", e);
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
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    const newEnabled = !camEnabled;

    if (!newEnabled) {
      if (videoTrack) {
        videoTrack.stop();
        localStream.removeTrack(videoTrack);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = stream.getVideoTracks()[0];
        localStream.addTrack(newTrack);
        await replaceTrackInPeers(newTrack);
      } catch (e) {
        console.warn("Failed to re-enable cam:", e);
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

  function stopScreenShare(roomId) {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    setScreenStream(null);
    setIsSharing(false);

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
  // This just sets the INTENT to join. The effect below handles the actual join when ready.
  function joinRoom(roomId, name) {
    if (name) setUsername(name);
    roomIdRef.current = roomId;
  }

  // Actual join logic
  useEffect(() => {
    if (readyToJoin && roomIdRef.current) {
      initSocketJoin(roomIdRef.current);
      roomIdRef.current = null; // Prevent re-joining
    }
  }, [readyToJoin]);

  async function initSocketJoin(roomId) {
    console.log("🚀 JOINING ROOM:", roomId, "Stream Ready:", !!localStream);

    socket.emit("register", { peerId: peerId.current, username: username });
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

    socket.on("room-state", ({ members }) => {
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
    muteAll
  };
}
