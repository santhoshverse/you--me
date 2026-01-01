import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const Feedback = sequelize.define("Feedback", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    type: {
        type: DataTypes.ENUM('bug', 'feature', 'other'),
        defaultValue: 'other'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('open', 'in-progress', 'resolved'),
        defaultValue: 'open'
    }
}, {
    timestamps: true
});

export default Feedback;
