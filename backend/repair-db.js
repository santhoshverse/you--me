import { User } from "./models/index.js";
import { sequelize } from "./db.js";

async function repairDB() {
    try {
        console.log("📡 Starting Database Repair...");

        // This will add missing columns without dropping data
        // It's the "Safe" version of alter: true for a single run
        await sequelize.sync({ alter: true });

        console.log("✅ Database columns synchronized successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Repair failed:", error);
        process.exit(1);
    }
}

repairDB();
