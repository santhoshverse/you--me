import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const Message = sequelize.define("Message", {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    room_id: DataTypes.STRING,
    user_id: DataTypes.BIGINT,
    username: DataTypes.STRING, // Added for quick display
    text: DataTypes.TEXT,
    createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' }
}, { tableName: "messages", timestamps: true, underscored: true });

export default Message;
