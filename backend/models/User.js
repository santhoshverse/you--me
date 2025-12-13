import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const User = sequelize.define("User", {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    display_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    avatar_url: DataTypes.STRING
}, { tableName: "users", timestamps: false });

export default User;
