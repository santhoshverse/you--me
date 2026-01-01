import { sequelize } from "../db.js";
import User from "./User.js";
import Room from "./Room.js";
import RoomState from "./RoomState.js";
import RoomMember from "./RoomMember.js";
import Message from "./Message.js";
import Feedback from "./feedback.js";

// associations
Room.hasOne(RoomState, { foreignKey: "room_id", sourceKey: "room_id" });
Room.hasMany(RoomMember, { foreignKey: "room_id", sourceKey: "room_id" });

export {
    sequelize,
    User,
    Room,
    RoomState,
    RoomMember,
    Message,
    Feedback
};
