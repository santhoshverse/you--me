
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
  const [username] = useState(localStorage.getItem("name") || "Guest");
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

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
      } catch (err) {
        console.warn("⚠️ User denied media permissions or device not found:", err);
      }
    }
    startCamera();
  }, []);

  function forceStopMic(roomId) {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack && audioTrack.enabled) {
      audioTrack.stop();
      setMicEnabled(false);
      socket.emit("toggle-mic", { roomId, peerId: peerId.current, micEnabled: false });
    }
  }

  function toggleMic(roomId) {
    if (!localStream) return;

    if (micEnabled) {
      // Turn OFF
      localStream.getAudioTracks().forEach(track => track.stop());
      setMicEnabled(false);
      socket.emit("toggle-mic", {
        roomId,
        peerId: peerId.current,
        micEnabled: false
      });
    } else {
      // Turn ON
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(newStream => {
          const newAudioTrack = newStream.getAudioTracks()[0];

          Object.values(peerConnections.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === "audio");
            if (sender) sender.replaceTrack(newAudioTrack);
          });

          // Recreate stream to force UI update
          const videoTracks = localStream.getVideoTracks();
          const newLocalStream = new MediaStream([newAudioTrack, ...videoTracks]);
          setLocalStream(newLocalStream);

          setMicEnabled(true);
          socket.emit("toggle-mic", {
            roomId,
            peerId: peerId.current,
            micEnabled: true
          });
        })
        .catch(err => console.error("Error accessing mic:", err));
    }
  }

  function toggleCam(roomId) {
    if (!localStream) return;

    if (camEnabled) {
      // Turn OFF
      localStream.getVideoTracks().forEach(track => track.stop());
      setCamEnabled(false);
      socket.emit("toggle-cam", {
        roomId,
        peerId: peerId.current,
        camEnabled: false
      });
    } else {
      // Turn ON
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(newStream => {
          const newVideoTrack = newStream.getVideoTracks()[0];

          Object.values(peerConnections.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === "video");
            if (sender) sender.replaceTrack(newVideoTrack);
          });

          // Recreate stream to force UI update
          const audioTracks = localStream.getAudioTracks();
          const newLocalStream = new MediaStream([newVideoTrack, ...audioTracks]);
          setLocalStream(newLocalStream);

          setCamEnabled(true);
          socket.emit("toggle-cam", {
            roomId,
            peerId: peerId.current,
            camEnabled: true
          });
        })
        .catch(err => console.error("Error accessing cam:", err));
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

      if (localStream) {
        localStream.getTracks().forEach(track =>
          pc.addTrack(track, localStream)
        );
      }

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
    muteAll
  };
}
