import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const RoomMember = sequelize.define("RoomMember", {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    room_id: DataTypes.STRING,
    user_id: DataTypes.BIGINT,
    peer_id: DataTypes.STRING
}, { tableName: "room_members", timestamps: false, underscored: true });

export default RoomMember;
