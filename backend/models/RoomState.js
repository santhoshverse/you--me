import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const RoomState = sequelize.define("RoomState", {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    room_id: { type: DataTypes.STRING(64), unique: true },
    is_screen_sharing: { type: DataTypes.BOOLEAN, defaultValue: false },
    screen_sharer_peer_id: DataTypes.STRING,
    media: {
        type: DataTypes.JSON,
        defaultValue: null
    },
    playback: {
        type: DataTypes.JSON,
        defaultValue: { time: 0, isPlaying: false, updatedAt: Date.now() }
    },
    createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' }
}, { tableName: "room_state", timestamps: true, underscored: true });

export default RoomState;
