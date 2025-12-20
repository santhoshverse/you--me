import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const User = sequelize.define("User", {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true // Null for guests
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: true // Null for guests
    },
    display_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    avatar_url: DataTypes.STRING,
    createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' }
}, { tableName: "users", timestamps: true, underscored: true });

export default User;
