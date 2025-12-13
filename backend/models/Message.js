import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const Message = sequelize.define("Message", {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    room_id: DataTypes.STRING,
    user_id: DataTypes.BIGINT,
    text: DataTypes.TEXT
}, { tableName: "messages", timestamps: false });

export default Message;
