import { sequelize } from "./models/index.js";

async function syncDB() {
    try {
        console.log("📡 Attempting to sync database schema...");
        await sequelize.sync();
        console.log("✅ Database schema updated successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error syncing database:", error);
        process.exit(1);
    }
}

syncDB();
