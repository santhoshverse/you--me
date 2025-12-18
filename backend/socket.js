import { RoomState, RoomMember } from "./models/index.js";

const peerToSocket = new Map();

export function socketHandler(io) {
    console.log("Using TURN server for ICE fallback.");

    // In-memory fallback for hosts
    const roomHosts = new Map(); // roomId -> peerId

    io.on("connection", (socket) => {
        console.log("🔌 User connected", socket.id);

        // Register peer ID
        socket.on("register", ({ peerId, username }) => {
            peerToSocket.set(peerId, socket.id);
            socket.peerId = peerId;
            socket.username = username;
        });

        // Join room
        socket.on("join-room", async ({ roomId, peerId }) => {
            console.log(`📥 JOIN REQUEST: Room=${roomId}, Peer=${peerId}, Socket=${socket.id}`);
            socket.join(roomId);
            socket.roomId = roomId;

            // Set host if first user
            if (!io.sockets.adapter.rooms.get(roomId) || io.sockets.adapter.rooms.get(roomId).size === 1) {
                roomHosts.set(roomId, peerId);
            }

            // Try DB, ignore if fails
            try {
                await RoomMember.upsert({
                    room_id: roomId,
                    peer_id: peerId,
                    username: socket.username,
                    mic_enabled: true,
                    cam_enabled: true,
                    is_sharing: false
                });
            } catch (e) { console.warn("DB Error (RoomMember):", e.message); }

            // Update everyone about the room change
            io.emit("room-updated");

            try {
                const state = await RoomState.findOne({ where: { room_id: roomId } });
                const members = await RoomMember.findAll({ where: { room_id: roomId } });
                socket.emit("room-state", { state, members });
            } catch (e) {
                // Return default state if DB fails
                socket.emit("room-state", { state: { media: null, playback: { isPlaying: false, time: 0 } }, members: [] });
            }

            console.log(`📢 Emitting new-peer to room ${roomId} for peer ${peerId}`);
            socket.to(roomId).emit("new-peer", { peerId, username: socket.username });

            // Notify who is host
            socket.emit("host-update", { hostPeerId: roomHosts.get(roomId) });
        });

        // ... [Chat Message, Offer, Answer, ICE handlers same as before] ...

        // Chat Message
        socket.on("chat-message", ({ roomId, message, username }) => {
            io.to(roomId).emit("chat-message", {
                message,
                username,
                time: Date.now(),
            });
        });

        // Offer
        socket.on("offer", ({ toPeerId, sdp, fromPeerId }) => {
            const toSocket = peerToSocket.get(toPeerId);
            if (toSocket) {
                console.log(`➡️ OFFER: ${fromPeerId} -> ${toPeerId}`);
                io.to(toSocket).emit("offer", { fromPeerId, sdp });
            } else {
                console.warn(`⚠️ OFFER FAILED: Target ${toPeerId} not found`);
            }
        });

        // Answer
        socket.on("answer", ({ toPeerId, sdp, fromPeerId }) => {
            const toSocket = peerToSocket.get(toPeerId);
            if (toSocket) {
                console.log(`⬅️ ANSWER: ${fromPeerId} -> ${toPeerId}`);
                io.to(toSocket).emit("answer", { fromPeerId, sdp });
            } else {
                console.warn(`⚠️ ANSWER FAILED: Target ${toPeerId} not found`);
            }
        });

        // ICE
        socket.on("ice-candidate", ({ toPeerId, candidate, fromPeerId }) => {
            const toSocket = peerToSocket.get(toPeerId);
            if (toSocket) {
                io.to(toSocket).emit("ice-candidate", { fromPeerId, candidate });
            }
        });

        // When host sets video
        socket.on("set-media", async ({ roomId, media }) => {
            // Check if host? (Optional strictness)
            // For now allow all, or check roomHosts.get(roomId) === socket.peerId

            try {
                // Reset playback state when media changes
                await RoomState.update(
                    { media, playback: { time: 0, isPlaying: false, updatedAt: Date.now() } },
                    { where: { room_id: roomId } }
                );
            } catch (e) { console.warn("DB update failed"); }

            io.to(roomId).emit("media-updated", { media });
        });

        // Host plays/pauses/seek
        socket.on("player-action", async ({ roomId, action }) => {
            action.updatedAt = Date.now();

            try {
                await RoomState.update(
                    { playback: action },
                    { where: { room_id: roomId } }
                );
            } catch (e) { }

            socket.to(roomId).emit("player-action", action);
        });

        socket.on("toggle-mic", async ({ roomId, peerId, micEnabled }) => {
            try {
                await RoomMember.update({ mic_enabled: micEnabled }, { where: { room_id: roomId, peer_id: peerId } });
            } catch (e) { }
            socket.to(roomId).emit("mic-toggled", { peerId, micEnabled });
        });

        socket.on("toggle-cam", async ({ roomId, peerId, camEnabled }) => {
            try {
                await RoomMember.update({ cam_enabled: camEnabled }, { where: { room_id: roomId, peer_id: peerId } });
            } catch (e) { }
            socket.to(roomId).emit("cam-toggled", { peerId, camEnabled });
        });

        // Screen Sharing Started
        socket.on("screen-started", async ({ roomId, peerId }) => {
            try {
                await RoomState.update(
                    { is_screen_sharing: true, screen_sharer_peer_id: peerId },
                    { where: { room_id: roomId } }
                );
                await RoomMember.update({ is_sharing: true }, { where: { room_id: roomId, peer_id: peerId } });
            } catch (e) { }

            socket.to(roomId).emit("screen-started", { peerId });
        });

        // Screen Sharing Stopped
        socket.on("screen-stopped", async ({ roomId, peerId }) => {
            try {
                await RoomState.update(
                    { is_screen_sharing: false, screen_sharer_peer_id: null },
                    { where: { room_id: roomId } }
                );
                await RoomMember.update({ is_sharing: false }, { where: { room_id: roomId, peer_id: peerId } });
            } catch (e) { }

            socket.to(roomId).emit("screen-stopped");
        });

        // Host Controls
        socket.on("admin-action", ({ roomId, action, targetPeerId }) => {
            const hostId = roomHosts.get(roomId);
            if (hostId !== socket.peerId) return; // Only host can do this

            if (action === "kick") {
                const targetSocketId = peerToSocket.get(targetPeerId);
                if (targetSocketId) {
                    io.to(targetSocketId).emit("kicked");
                    io.sockets.sockets.get(targetSocketId)?.disconnect();
                }
            } else if (action === "mute-all") {
                io.to(roomId).emit("force-mute");
            }
        });

        // Social Features (Typing, etc implemented)
        socket.on("typing", ({ roomId, isTyping, username }) => {
            socket.to(roomId).emit("typing", { peerId: socket.peerId, isTyping, username });
        });

        socket.on("chat-reaction", ({ roomId, messageId, reaction, username }) => {
            io.to(roomId).emit("chat-reaction", { messageId, reaction, username });
        });

        socket.on("floating-emoji", ({ roomId, emoji }) => {
            socket.to(roomId).emit("floating-emoji", { emoji, peerId: socket.peerId });
        });

        socket.on("disconnect", async () => {
            // Handle Host leaving
            if (roomHosts.get(socket.roomId) === socket.peerId) {
                // Assign new host?
                // For now, just delete
                roomHosts.delete(socket.roomId);
            }

            if (socket.roomId && socket.peerId) {
                try {
                    await RoomMember.destroy({
                        where: { room_id: socket.roomId, peer_id: socket.peerId }
                    });
                } catch (e) { }
                io.emit("room-updated");
                socket.to(socket.roomId).emit("peer-left", { peerId: socket.peerId });
            }
        });
    });
}

