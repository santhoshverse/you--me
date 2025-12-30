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

  // Media Sync State
  const [media, setMedia] = useState(null);
  const [playback, setPlayback] = useState({ isPlaying: false, time: 0 });

  const peerConnections = useRef({});
  const peerId = useRef(uuid());
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const isHostRef = useRef(false); // Ref for immediate access in callbacks

  // Sync refs with state
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { screenStreamRef.current = screenStream; }, [screenStream]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ];

  // State to track if we are ready to join
  const [readyToJoin, setReadyToJoin] = useState(false);
  const [intentRoomId, setIntentRoomId] = useState(null);

  // Initial Camera Setup
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        setReadyToJoin(true);
      } catch (err) {
        console.warn("⚠️ User denied media permissions or device not found:", err);
        setReadyToJoin(true);
      }
    }
    startCamera();
  }, []);

  // Track Replacement Helper - SEARCH BY TRANSCEIVER for stability
  async function replaceTrackInPeers(newTrack, kindHint) {
    const kind = newTrack?.kind || kindHint;
    Object.values(peerConnections.current).forEach(pc => {
      // Find sender via transceiver to ensure we match the correct m-line even if current track is null
      const transceiver = pc.getTransceivers().find(t => t.receiver.track.kind === kind);
      if (transceiver && transceiver.sender) {
        transceiver.sender.replaceTrack(newTrack);
      } else {
        // Fallback (should rarely be reached if we init transceivers correctly)
        console.warn(`⚠️ No transceiver found for kind ${kind}, adding track manually.`);
        if (newTrack) pc.addTrack(newTrack, localStream);
      }
    });
  }

  // --- Media Controls ---
  async function toggleMic(roomId) {
    let newEnabled = !micEnabled;
    let audioTrack = localStream?.getAudioTracks()[0];

    if (!newEnabled) {
      if (audioTrack) {
        audioTrack.enabled = false;
        // Optionally stop it if you want to release HW, but 'enabled=false' is faster for mute
        // For actual privacy or HW release: audioTrack.stop();
      }
      replaceTrackInPeers(null, "audio");
    } else {
      // Logic for unmuting (if we stopped it, we need new stream. If just disabled, enable it)
      if (audioTrack && audioTrack.readyState === "live") {
        audioTrack.enabled = true;
        replaceTrackInPeers(audioTrack);
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const newTrack = stream.getAudioTracks()[0];
          if (localStream) {
            if (audioTrack) localStream.removeTrack(audioTrack);
            localStream.addTrack(newTrack);
            setLocalStream(new MediaStream(localStream.getTracks()));
          } else {
            setLocalStream(stream);
          }
          replaceTrackInPeers(newTrack);
        } catch (err) {
          console.error("Failed to re-enable mic:", err);
          newEnabled = false;
        }
      }
    }
    setMicEnabled(newEnabled);
    socket.emit("toggle-mic", { roomId, peerId: peerId.current, micEnabled: newEnabled });
  }

  async function toggleCam(roomId) {
    let newEnabled = !camEnabled;
    let videoTrack = localStream?.getVideoTracks()[0];

    if (!newEnabled) {
      if (videoTrack) {
        videoTrack.enabled = false;
        videoTrack.stop(); // release HW
      }
      replaceTrackInPeers(null, "video");
    } else {
      try {
        // Stop old track explicitly just in case (NotReadableError fix)
        if (videoTrack) videoTrack.stop();

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = stream.getVideoTracks()[0];

        if (localStream) {
          if (videoTrack) localStream.removeTrack(videoTrack);
          localStream.addTrack(newTrack);
          setLocalStream(new MediaStream(localStream.getTracks()));
        } else {
          setLocalStream(stream);
        }
        replaceTrackInPeers(newTrack);
      } catch (err) {
        console.error("Failed to re-enable cam:", err);
        newEnabled = false;
        alert("Could not start camera. Please ensure no other app is using it.");
      }
    }
    setCamEnabled(newEnabled);
    socket.emit("toggle-cam", { roomId, peerId: peerId.current, camEnabled: newEnabled });
  }

  // --- PEER CONNECTION MANAGEMENT ---

  // "Perfect Negotiation" Pattern Logic
  // Host = Impolite (Starts negotiation & ignores glare offers)
  // Guest = Polite (Accepts and rolls back if collision)

  function createPeerConnection(remoteId) {
    if (peerConnections.current[remoteId]) return peerConnections.current[remoteId];

    const pc = new RTCPeerConnection({ iceServers });

    // Custom property to track negotiation state
    pc.makingOffer = false;
    pc.ignoreOffer = false;

    // --- ENFORCE M-LINE ORDER: [Audio, Video] ---
    // This prevents "InvalidAccessError: m-lines don't match"
    // We explicitly add transceivers in a fixed order.
    // .addTransceiver('audio') -> m-line 0
    // .addTransceiver('video') -> m-line 1

    // Audio
    pc.addTransceiver('audio', { direction: 'sendrecv' });

    // Video (VP9 Preference)
    const videoTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' });
    try {
      if (RTCRtpSender.getCapabilities) {
        const codecs = RTCRtpSender.getCapabilities("video").codecs;
        const vp9Codecs = codecs.filter(c => c.mimeType === "video/VP9");
        if (vp9Codecs.length > 0) videoTransceiver.setCodecPreferences(vp9Codecs);
      }
    } catch (e) { console.warn("Codec pref error:", e); }

    // Polite peer: Guests are polite, Host is impolite
    // We access ref because this runs in callbacks might have stale state
    const polite = !isHostRef.current;


    // --- ON NEGOTIATION NEEDED ---
    pc.onnegotiationneeded = async () => {
      try {
        if (pc.makingOffer) return;
        pc.makingOffer = true;

        // Safety: If we are already processing a remote offer, don't try to make a new one immediately
        if (pc.signalingState !== 'stable') return;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        console.log(`📤 SENDING OFFER to ${remoteId}`);
        socket.emit("offer", {
          toPeerId: remoteId,
          fromPeerId: peerId.current,
          sdp: pc.localDescription
        });
      } catch (err) {
        if (err.name === 'InvalidStateError') {
          console.warn("⚠️ Negotiation race (InvalidStateError) - ignored.");
        } else {
          console.error("Negotiation Error:", err);
        }
      } finally {
        pc.makingOffer = false;
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit("ice-candidate", { toPeerId: remoteId, fromPeerId: peerId.current, candidate });
      }
    };

    pc.ontrack = (event) => {
      // SAFEGUARD: Handle streamless tracks (some browsers/implementations send tracks without streams)
      const stream = event.streams[0] || new MediaStream([event.track]);
      console.log(`🎥 ONTRACK from ${remoteId}: StreamID=${stream.id} Tracks=${stream.getTracks().length} (Streamless=${!event.streams[0]})`);

      setPeers(prev => {
        const currentPeer = prev[remoteId] || {};
        const isKnownScreen = currentPeer.screenStreamId && currentPeer.screenStreamId === stream.id;
        const isHeuristicScreen = currentPeer.stream && currentPeer.stream.id !== stream.id;

        console.log(`   Logic: KnownScreen=${isKnownScreen} Heuristic=${isHeuristicScreen} (ExistingStream=${currentPeer.stream?.id}, ExpectedScreen=${currentPeer.screenStreamId})`);

        if (isKnownScreen || isHeuristicScreen) {
          console.log(`   ✅ Assigning to SCREEN STREAM`);
          return { ...prev, [remoteId]: { ...currentPeer, screenStream: stream } };
        }
        console.log(`   ✅ Assigning to MAIN STREAM (Camera)`);
        return {
          ...prev,
          [remoteId]: {
            ...currentPeer,
            peerId: remoteId,
            stream: stream,
            micEnabled: true,
            camEnabled: true,
            username: prev[remoteId]?.username
          }
        };
      });
    };

    pc.onconnectionstatechange = () => console.log(`PC ${remoteId} State: ${pc.connectionState}`);

    peerConnections.current[remoteId] = pc;
    return pc;
  }

  // --- SCREEN SHARE ---
  async function startScreenShare(roomId, externalStream = null) {
    let displayStream = externalStream;
    try {
      if (!displayStream) {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always", frameRate: 60 },
          audio: { echoCancellation: false }
        });
      }
      setScreenStream(displayStream);
      setIsSharing(true);

      // Add tracks to all peers (This triggers onnegotiationneeded automatically)
      Object.values(peerConnections.current).forEach(pc => {
        displayStream.getTracks().forEach(track => {
          pc.addTrack(track, displayStream);
          // Set bitrates...
          const senders = pc.getSenders();
          const sender = senders.find(s => s.track === track);
          // OPTIMIZED BITRATE (2.5 Mbps, 30 FPS)
          if (track.kind === "video") {
            const params = sender.getParameters();
            params.encodings = [{
              maxBitrate: 8000000,
              maxFramerate: 60,
              scaleResolutionDownBy: 1
            }];
            sender.setParameters(params).catch(() => { });
          }
        });
      });

      socket.emit("screen-started", { roomId, peerId: peerId.current, streamId: displayStream.id });
      displayStream.getVideoTracks()[0].onended = () => stopScreenShare(roomId);
    } catch (err) {
      console.warn("Screen share cancelled", err);
    }
  }

  async function stopScreenShare(roomId) {
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    setScreenStream(null);
    setIsSharing(false);

    // To cleanly stop, safest is to remove the track senders or replace with null
    // But since we are "stopping", simplest is just to tell peers and maybe renegotiate.

    socket.emit("screen-stopped", { roomId, peerId: peerId.current });

    // Restore Camera logic if needed
    if (camEnabled && localStreamRef.current) {
      // Wait, if we never REMOVED the camera tracks, do we need to restore?
      // With addTrack logic, we just added *more* tracks.
      // We need to remove the screen tracks.
      Object.values(peerConnections.current).forEach(pc => {
        const senders = pc.getSenders();
        senders.forEach(sender => {
          // Remove tracks that match the screen stream
          // Ideally we should have tracked which sender is which.
          // Heuristic:
          if (sender.track && !localStreamRef.current.getTracks().includes(sender.track)) {
            pc.removeTrack(sender); // Triggers negotiation to remove
          }
        });
      });
    }
  }

  // --- SOCKET EVENT HANDLERS ---
  useEffect(() => {
    if (!readyToJoin || !intentRoomId) return;

    const roomId = intentRoomId;
    console.log("🚀 JOINING ROOM:", roomId);

    socket.emit("register", { peerId: peerId.current, username });
    socket.emit("join-room", { roomId, peerId: peerId.current, username });

    const handleNewPeer = async ({ peerId: remoteId, username: remoteName }) => {
      console.log("🔔 NEW PEER:", remoteId);
      // Initiate connection
      setPeers(prev => ({
        ...prev,
        [remoteId]: { ...prev[remoteId], peerId: remoteId, username: remoteName }
      }));

      const pc = createPeerConnection(remoteId);

      // Add Local Tracks -> use REPLACE TRACK on the transceivers we just created
      // We don't want to add NEW tracks/transceivers
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          const transceiver = pc.getTransceivers().find(t => t.receiver.track.kind === track.kind);
          if (transceiver && transceiver.sender) {
            transceiver.sender.replaceTrack(track);
          }
        });
      }

      // Screen share tracks are separate. For now, they might still use addTrack if we haven't reserved screen transceivers.
      // But usually screen share adds new m-lines dynamically.
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => {
          // SAFEGUARD for screen tracks
          const senders = pc.getSenders();
          const alreadySending = senders.some(s => s.track === track);
          if (!alreadySending) {
            const sender = pc.addTrack(track, screenStreamRef.current);
            if (track.kind === "video") {
              const params = sender.getParameters();
              params.encodings = [{ maxBitrate: 8000000, maxFramerate: 60 }];
              sender.setParameters(params).catch(() => { });
            }
          }
        });
      }
    };

    const handleOffer = async ({ fromPeerId, sdp }) => {
      console.log(`📩 OFFER from ${fromPeerId} (${sdp.type})`);
      if (sdp.type !== "offer") {
        console.warn(`⚠️ Received SDP of type '${sdp.type}' in handleOffer. Ignoring.`);
        return;
      }

      const pc = createPeerConnection(fromPeerId);
      const polite = !isHostRef.current;

      try {
        // Glare handling
        const isStable = pc.signalingState === 'stable' || (pc.signalingState === 'have-local-offer' && !pc.makingOffer);
        const ignoreOffer = !polite && (pc.signalingState !== 'stable' && pc.makingOffer);

        if (ignoreOffer) {
          console.log("⚠️ Glare detected. Impulse (Host) ignoring offer.");
          return;
        }

        // Check again if state allows
        if (pc.signalingState !== "stable" && pc.signalingState !== "have-remote-offer" && pc.signalingState !== "have-local-offer") {
          // Should rollback if we are 'have-local-offer' (handled below), but if we are closed or something else, abort
          if (pc.signalingState === "closed") return;
        }

        if (pc.signalingState !== "stable") {
          // If we are Impolite and not stable, we ignored above.
          // If we are Polite, we must rollback local offer to accept remote.
          // Note: "have-remote-offer" would mean we are already processing one? (Race condition)
          if (!pc.makingOffer) {
            console.log("🔄 Rolling back local description to accept offer.");
            await Promise.all([
              pc.setLocalDescription({ type: "rollback" }),
              pc.setRemoteDescription(sdp)
            ]);
          } else {
            // Making offer? But we are polite?
            await pc.setRemoteDescription(sdp);
          }
        } else {
          await pc.setRemoteDescription(sdp);
        }

        // --- CRITICAL FIX: ADD LOCAL TRACKS BEFORE ANSWERING ---
        // If we are the answerer, we haven't added our tracks yet!
        const senders = pc.getSenders();
        const hasVideo = senders.some(s => s.track && s.track.kind === "video");

        if (!hasVideo && localStreamRef.current) {
          console.log("🎥 Adding Local Camera Tracks to Answer");
          localStreamRef.current.getTracks().forEach(track => {
            // Check if already added to avoid duplicates (though !hasVideo check helps)
            const alreadySending = pc.getSenders().some(s => s.track === track);
            if (!alreadySending) pc.addTrack(track, localStreamRef.current);
          });
        }
        if (screenStreamRef.current) {
          console.log("💻 Adding Local Screen Tracks to Answer");
          screenStreamRef.current.getTracks().forEach(track => {
            const alreadySending = pc.getSenders().some(s => s.track === track);
            if (!alreadySending) {
              const sender = pc.addTrack(track, screenStreamRef.current);
              if (track.kind === "video") {
                const params = sender.getParameters();
                params.encodings = [{ maxBitrate: 8000000, maxFramerate: 60 }];
                sender.setParameters(params).catch(() => { });
              }
            }
          });
        }

        // Create Answer must happen when we are 'have-remote-offer'
        if (pc.signalingState === "have-remote-offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { toPeerId: fromPeerId, fromPeerId: peerId.current, sdp: answer });
        } else {
          console.warn(`❌ Cannot create answer. Signaling State is: ${pc.signalingState}`);
        }

      } catch (err) {
        console.error("❌ Error handling offer:", err);
      }
    };

    const handleAnswer = async ({ fromPeerId, sdp }) => {
      console.log(`📩 ANSWER from ${fromPeerId}`);
      const pc = peerConnections.current[fromPeerId];
      if (!pc) return;
      try {
        await pc.setRemoteDescription(sdp);
      } catch (e) { console.warn("Answer set failed", e); }
    };

    const handleIceCandidate = async ({ fromPeerId, candidate }) => {
      const pc = peerConnections.current[fromPeerId];
      try {
        if (pc) await pc.addIceCandidate(candidate);
      } catch (e) {
        console.warn("ICE Candidate received before remote description");
      }
    };

    const handleRoomState = ({ members, state }) => {
      if (members) {
        setPeers(prev => {
          const next = { ...prev };
          members.forEach(m => {
            if (m.peer_id !== peerId.current) {
              next[m.peer_id] = {
                ...next[m.peer_id],
                peerId: m.peer_id,
                username: m.username,
                isSharing: m.is_sharing,
                micEnabled: m.mic_enabled,
                camEnabled: m.cam_enabled
              };
            }
          });
          return next;
        });
      }
      if (state) {
        if (state.media !== undefined) setMedia(state.media);
        if (state.playback !== undefined) setPlayback(state.playback);
      }
    };

    const handleScreenStarted = (data) => {
      if (!data) return;
      const { peerId, streamId } = data;
      setPeers(prev => {
        const next = { ...prev };
        const peer = next[peerId];
        if (peer) {
          let updates = { isSharing: true, screenStreamId: streamId };

          // AUTO-CORRECTION: If we previously assigned this streamId to 'stream' (camera), it means 
          // the 'ontrack' event arrived before this 'screen-started' event.
          // We must move it to screenStream and clear the camera stream to fix the swap.
          if (peer.stream && peer.stream.id === streamId) {
            console.log(`🔄 Auto-correcting: Moving stream ${streamId} from Camera to Screen Share.`);
            updates.screenStream = peer.stream;
            updates.stream = null;
          }

          next[peerId] = { ...peer, ...updates };
        }
        return next;
      });
    };

    const handleScreenStopped = (data) => {
      if (!data) return;
      setPeers(prev => {
        const next = { ...prev };
        if (next[data.peerId]) next[data.peerId] = { ...next[data.peerId], isSharing: false, screenStream: null };
        return next;
      });
    };

    // Attach Listeners
    socket.on("new-peer", handleNewPeer);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("host-update", ({ hostPeerId }) => setIsHost(hostPeerId === peerId.current));
    socket.on("room-state", handleRoomState);
    socket.on("screen-started", handleScreenStarted);
    socket.on("screen-stopped", handleScreenStopped);

    return () => {
      socket.off("new-peer", handleNewPeer);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("host-update");
      socket.off("room-state");
      socket.off("screen-started");
      socket.off("screen-stopped");
      socket.emit("leave-room", { roomId, peerId: peerId.current });
    };

  }, [readyToJoin, intentRoomId, username]);

  function joinRoom(roomId, name) {
    if (name) setUsername(name);
    setIntentRoomId(roomId);
  }

  function leaveRoom(roomId) {
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    setPeers({});
    setLocalStream(null);
    socket.emit("leave-room", { roomId, peerId: peerId.current });
  }

  // --- RESTORED FUNCTIONS ---

  async function startFileStream(file, roomId) {
    try {
      const vid = document.createElement("video");
      vid.src = URL.createObjectURL(file);
      vid.loop = true;
      vid.muted = true;
      await vid.play();

      const stream = vid.captureStream();
      setScreenStream(stream);
      setIsSharing(true);

      Object.values(peerConnections.current).forEach(pc => {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      });

      socket.emit("screen-started", { roomId, peerId: peerId.current, streamId: stream.id });
      stream.getVideoTracks()[0].onended = () => {
        vid.pause();
        stopScreenShare(roomId);
      };

      return vid;
    } catch (err) {
      console.error("File stream failed:", err);
    }
  }

  function kickPeer(targetPeerId) {
    socket.emit("admin-action", { roomId: intentRoomId, action: "kick", targetPeerId });
  }

  function muteAll() {
    socket.emit("admin-action", { roomId: intentRoomId, action: "mute-all" });
  }

  return {
    localStream, peers, joinRoom, leaveRoom,
    startScreenShare, stopScreenShare, isSharing, screenStream,
    toggleMic, toggleCam, micEnabled, camEnabled, username, isHost,
    startFileStream, kickPeer, muteAll,
    media, playback,
    screenShareEnabled: peers[peerId.current]?.screen_share_enabled || isHost
  };
}
