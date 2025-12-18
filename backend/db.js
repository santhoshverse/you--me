import { Sequelize } from "sequelize";
import { DB_CONFIG } from "./config.js";

export const sequelize = new Sequelize(
    DB_CONFIG.DATABASE,
    DB_CONFIG.USER,
    DB_CONFIG.PASSWORD,
    {
        host: DB_CONFIG.HOST,
        port: DB_CONFIG.PORT,
        dialect: "mysql",
        logging: false,
        dialectOptions: process.env.NODE_ENV === "production" ? {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        } : {}
    }
);

export async function connectDB() {
    try {
        await sequelize.authenticate();
        console.log("✅ MySQL connected successfully");
    } catch (err) {
        console.error("❌ MySQL connection error:", err);
    }
}
