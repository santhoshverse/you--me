import { Room, RoomState, User, RoomMember } from "../models/index.js";
import { v4 as uuidv4 } from "uuid";

export const createRoom = async (req, res) => {
    try {
        const room_id = "room_" + uuidv4().slice(0, 8);

        await Room.create({
            room_id,
            name: "New Room",
            host_user_id: null
        });

        await RoomState.create({
            room_id,
            media: null,
            playback: { time: 0, isPlaying: false, updatedAt: Date.now() }
        });

        res.json({ success: true, roomId: room_id });
    } catch (err) {
        console.log(err);
        res.json({ success: false });
    }
};

export const getRoom = async (req, res) => {
    try {
        const roomId = req.params.roomId;
        const room = await Room.findOne({ where: { room_id: roomId } });
        const state = await RoomState.findOne({ where: { room_id: roomId } });
        res.json({ room, state });
    } catch (err) {
        console.error("Error getting room:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

export const registerGuest = async (req, res) => {
    try {
        const { name } = req.body;
        const user = await User.create({
            display_name: name,
            avatar_url: null
        });
        res.json({ success: true, userId: user.id, name });
    } catch (err) {
        console.error("Error registering guest:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

export const getPublicRooms = async (req, res) => {
    try {
        const rooms = await Room.findAll({
            include: [
                {
                    model: RoomState,
                    attributes: ["media", "is_screen_sharing"]
                },
                {
                    model: RoomMember,
                    attributes: ["user_id"]
                }
            ]
        });

        const formatted = rooms.map(r => ({
            roomId: r.room_id,
            name: r.name,
            members: r.RoomMembers.length,
            media: r.RoomState?.media,
            screen: r.RoomState?.is_screen_sharing
        }));

        res.json({ success: true, rooms: formatted });
    } catch (err) {
        console.error("Error getting public rooms:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
