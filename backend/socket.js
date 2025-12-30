import { RoomState, RoomMember, Message } from "./models/index.js";

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
        socket.on("join-room", async ({ roomId, peerId, username }) => {
            console.log(`📥 JOIN REQUEST: Room=${roomId}, Peer=${peerId}, Username=${username}, Socket=${socket.id}`);
            socket.join(roomId);
            socket.roomId = roomId;

            console.log(`✅ Socket ${socket.id} joined room: "${roomId}". Current rooms:`, ...socket.rooms);

            if (username) {
                socket.username = username;
            }

            // Set host if first user
            if (!io.sockets.adapter.rooms.get(roomId) || io.sockets.adapter.rooms.get(roomId).size === 1) {
                roomHosts.set(roomId, peerId);
            }

            // Determine screen share permission (Host gets it by default)
            const isHost = !io.sockets.adapter.rooms.get(roomId) || io.sockets.adapter.rooms.get(roomId).size === 0 || roomHosts.get(roomId) === peerId;

            // Try DB, ignore if fails
            try {
                await RoomMember.upsert({
                    room_id: roomId,
                    peer_id: peerId,
                    username: socket.username || "Guest",
                    mic_enabled: true,
                    cam_enabled: true,
                    screen_share_enabled: isHost, // Only host starts with permission
                    is_sharing: false
                });
            } catch (e) { console.warn("DB Error (RoomMember):", e.message); }

            // Update everyone about the room change
            io.emit("room-updated");

            // Fetch state and members
            try {
                const state = await RoomState.findOne({ where: { room_id: roomId } });
                const members = await RoomMember.findAll({ where: { room_id: roomId } });
                const messages = await Message.findAll({
                    where: { room_id: roomId },
                    order: [['created_at', 'ASC']],
                    limit: 50
                });
                socket.emit("room-state", { state, members, messages });
            } catch (e) {
                console.warn("Sync Error:", e.message);
                socket.emit("room-state", { state: { media: null, playback: { isPlaying: false, time: 0 } }, members: [], messages: [] });
            }

            console.log(`📢 Emitting new-peer to room ${roomId} for peer ${peerId}`);
            socket.to(roomId).emit("new-peer", { peerId, username: socket.username });

            // Notify who is host
            socket.emit("host-update", { hostPeerId: roomHosts.get(roomId) });
        });

        // ... [Chat Message, Offer, Answer, ICE handlers same as before] ...

        // Chat Message
        socket.on("chat-message", async ({ roomId, message, username }) => {
            try {
                const savedMsg = await Message.create({
                    room_id: roomId,
                    username: username,
                    text: message
                });

                io.to(roomId).emit("chat-message", {
                    id: savedMsg.id,
                    message,
                    username,
                    time: savedMsg.createdAt
                });
            } catch (e) {
                console.error("Failed to save message:", e);
                // Fallback broadcast without ID (less ideal)
                io.to(roomId).emit("chat-message", {
                    message,
                    username,
                    time: Date.now(),
                });
            }
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

        // When host sets video (Sync Mode)
        socket.on("set-media", async ({ roomId, media }) => {
            const hostId = roomHosts.get(roomId);
            if (hostId !== socket.peerId) {
                console.warn(`⚠️ Non-host ${socket.peerId} tried to set media`);
                return;
            }

            try {
                // 1. Clear Screen Share state if it was active
                // (This forces everyone to switch to Sync Mode)
                await RoomState.update(
                    {
                        media,
                        playback: { time: 0, isPlaying: false, updatedAt: Date.now() },
                        is_screen_sharing: false,
                        screen_sharer_peer_id: null
                    },
                    { where: { room_id: roomId } }
                );

                // Also update the member who was sharing (if any) - this might be tricky to find without a query, 
                // but we can just broadcast the state and let clients handle UI.
                // Better: find the current sharer and unset them? 
                // For simplified logic: just update RoomState is the source of truth for the "Big Screen".

                // Fetch full state for broadcast
                const state = await RoomState.findOne({ where: { room_id: roomId } });
                const members = await RoomMember.findAll({ where: { room_id: roomId } });

                io.to(roomId).emit("room-state", { state, members });

                // Explicitly tell everyone screen share stopped (so they close connections if needed)
                io.to(roomId).emit("screen-stopped");

            } catch (e) { console.warn("Media update failed:", e); }
        });

        // Player Actions (Play/Pause/Seek/Time)
        socket.on("player-action", async ({ roomId, action }) => {
            try {
                // Update DB to persist state
                // Action: { type: "play"|"pause"|"seek", time, isPlaying }
                const updateData = {
                    playback: {
                        time: action.time,
                        isPlaying: action.isPlaying,
                        updatedAt: Date.now()
                    }
                };

                await RoomState.update(updateData, { where: { room_id: roomId } });

                // Broadcast to everyone (including sender to confirm state)
                io.to(roomId).emit("room-state", { state: updateData });

            } catch (e) { console.error("Player Action Error:", e); }
        });

        // Screen Sharing Started (Stream Mode)
        socket.on("screen-started", async ({ roomId, peerId }) => {
            try {
                // 1. Clear Sync Media (YouTube)
                // (This forces everyone to switch to Stream Mode)
                await RoomState.update(
                    {
                        is_screen_sharing: true,
                        screen_sharer_peer_id: peerId,
                        media: null // Clear YouTube
                    },
                    { where: { room_id: roomId } }
                );
                await RoomMember.update({ is_sharing: true }, { where: { room_id: roomId, peer_id: peerId } });

                // Fetch updated state AND members
                const state = await RoomState.findOne({ where: { room_id: roomId } });
                const members = await RoomMember.findAll({ where: { room_id: roomId } });

                io.to(roomId).emit("room-state", { state, members });

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

                // Fetch state AND members
                const state = await RoomState.findOne({ where: { room_id: roomId } });
                const members = await RoomMember.findAll({ where: { room_id: roomId } });

                io.to(roomId).emit("room-state", { state, members });

            } catch (e) { }

            socket.to(roomId).emit("screen-stopped");
        });

        // Host Controls
        socket.on("admin-action", async ({ roomId, action, targetPeerId }) => {
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
            } else if (action === "toggle-screen-share") {
                // Grant/Revoke screen share permission
                try {
                    const member = await RoomMember.findOne({ where: { room_id: roomId, peer_id: targetPeerId } });
                    if (member) {
                        const newStatus = !member.screen_share_enabled;
                        await member.update({ screen_share_enabled: newStatus });

                        // Broadcast update
                        const members = await RoomMember.findAll({ where: { room_id: roomId } });
                        io.to(roomId).emit("room-state", { members });
                    }
                } catch (e) { console.error("Failed to toggle permission", e); }
            }
        });

        // Social Features (Typing, etc implemented)
        socket.on("typing", ({ roomId, isTyping, username }) => {
            socket.to(roomId).emit("typing", { peerId: socket.peerId, isTyping, username });
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

                // Broadcast updated member list to everyone remaining in the room
                try {
                    const members = await RoomMember.findAll({ where: { room_id: socket.roomId } });
                    io.to(socket.roomId).emit("room-state", { members });
                } catch (e) { }
            }
        });
    });
}

