
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
  const [isHost, setIsHost] = useState(false);

  // ... (existing code)

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
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack && audioTrack.enabled) {
          // Determine we need to mute
          // Re-use toggleMic logic or just stop track
          audioTrack.stop();
          setMicEnabled(false);
          socket.emit("toggle-mic", {
            roomId,
            peerId: peerId.current,
            micEnabled: false
          });
          alert("The host muted everyone.");
        }
      }
    });

    socket.on("new-peer", async ({ peerId: remoteId, username: remoteName }) => {
      // ... (rest of joinRoom)

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

