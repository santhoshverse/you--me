import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const RoomMember = sequelize.define("RoomMember", {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    room_id: { type: DataTypes.STRING(64), allowNull: false },
    user_id: DataTypes.BIGINT,
    peer_id: { type: DataTypes.STRING(128), allowNull: false },
    joined_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    role: { type: DataTypes.ENUM("host", "moderator", "guest"), defaultValue: "guest" }
}, { tableName: "room_members", timestamps: false, underscored: true });

export default RoomMember;
