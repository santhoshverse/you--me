import { RoomState, RoomMember } from "./models/index.js";

const peerToSocket = new Map();

export function socketHandler(io) {
    console.log("Using TURN server for ICE fallback.");

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
            socket.join(roomId);
            socket.roomId = roomId;

            await RoomMember.create({
                room_id: roomId,
                user_id: null, // Socket users are guests for now unless mapped
                peer_id: peerId
            });

            // Update everyone about the room change
            io.emit("room-updated");

            const state = await RoomState.findOne({ where: { room_id: roomId } });

            socket.emit("room-state", { state });

            socket.to(roomId).emit("new-peer", { peerId, username: socket.username });
        });

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
                io.to(toSocket).emit("offer", { fromPeerId, sdp });
            }
        });

        // Answer
        socket.on("answer", ({ toPeerId, sdp, fromPeerId }) => {
            const toSocket = peerToSocket.get(toPeerId);
            if (toSocket) {
                io.to(toSocket).emit("answer", { fromPeerId, sdp });
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
            await RoomState.update(
                { media, playback: { time: 0, isPlaying: false, updatedAt: Date.now() } },
                { where: { room_id: roomId } }
            );

            io.to(roomId).emit("media-updated", { media });
        });

        // Host plays/pauses/seek
        socket.on("player-action", async ({ roomId, action }) => {
            action.updatedAt = Date.now();

            await RoomState.update(
                { playback: action },
                { where: { room_id: roomId } }
            );

            socket.to(roomId).emit("player-action", action);
        });

        socket.on("toggle-mic", ({ roomId, peerId, micEnabled }) => {
            socket.to(roomId).emit("mic-toggled", { peerId, micEnabled });
        });

        socket.on("toggle-cam", ({ roomId, peerId, camEnabled }) => {
            socket.to(roomId).emit("cam-toggled", { peerId, camEnabled });
        });

        // Screen Sharing Started
        socket.on("screen-started", async ({ roomId, peerId }) => {
            await RoomState.update(
                { is_screen_sharing: true, screen_sharer_peer_id: peerId },
                { where: { room_id: roomId } }
            );

            socket.to(roomId).emit("screen-started", { peerId });
        });

        // Screen Sharing Stopped
        socket.on("screen-stopped", async ({ roomId }) => {
            await RoomState.update(
                { is_screen_sharing: false, screen_sharer_peer_id: null },
                { where: { room_id: roomId } }
            );

            socket.to(roomId).emit("screen-stopped");
        });

        // Social Features
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
            if (socket.roomId && socket.peerId) {
                await RoomMember.destroy({
                    where: { room_id: socket.roomId, peer_id: socket.peerId }
                });
                io.emit("room-updated");
                socket.to(socket.roomId).emit("peer-left", { peerId: socket.peerId });
            }
        });
    });
}

