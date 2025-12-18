import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const Room = sequelize.define("Room", {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    room_id: { type: DataTypes.STRING(64), unique: true },
    name: DataTypes.STRING,
    host_user_id: DataTypes.BIGINT,
    is_private: { type: DataTypes.BOOLEAN, defaultValue: false },
    settings: DataTypes.JSON
}, { tableName: "rooms", timestamps: true, underscored: true });

export default Room;
