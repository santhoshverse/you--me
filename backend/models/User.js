import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const User = sequelize.define("User", {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
    },
    auth_provider: {
        type: DataTypes.STRING, // 'google', 'apple'
        allowNull: true
    },
    provider_user_id: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
    },
    display_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: true
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: "user" // 'user', 'admin'
    },
    avatar_url: DataTypes.STRING,
    createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' }
}, { tableName: "users", timestamps: true, underscored: true });

export default User;
