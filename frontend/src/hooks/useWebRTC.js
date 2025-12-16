
import { useEffect, useRef, useState } from "react";
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
        // Optionally set a state here to show a UI message
      }
    }
    startCamera();
  }, []);

  function toggleMic(roomId) {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];

    if (audioTrack.enabled) {
      audioTrack.stop(); // fully turn off mic
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

          Object.values(peerConnections.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === "audio");
            if (sender) sender.replaceTrack(newAudioTrack);
          });

          localStream.addTrack(newAudioTrack);

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
    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];

    if (videoTrack.enabled) {
      // Turn off camera fully
      videoTrack.stop();
      setCamEnabled(false);

      socket.emit("toggle-cam", {
        roomId,
        peerId: peerId.current,
        camEnabled: false
      });

    } else {
      // Turn camera back on
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(newStream => {
          const newVideoTrack = newStream.getVideoTracks()[0];

          // Replace track in WebRTC connection
          Object.values(peerConnections.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === "video");
            if (sender) sender.replaceTrack(newVideoTrack);
          });

          // Replace local stream
          localStream.addTrack(newVideoTrack);

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
        audio: false
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

  async function joinRoom(roomId) {
    socket.emit("register", { peerId: peerId.current, username });
    socket.emit("join-room", { roomId, peerId: peerId.current });

    socket.on("new-peer", async ({ peerId: remoteId, username: remoteName }) => {
      setPeers(prev => ({
        ...prev,
        [remoteId]: { ...prev[remoteId], username: remoteName }
      }));

      const pc = createPeerConnection(remoteId);

      // Add our tracks
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
    username
  };
}

