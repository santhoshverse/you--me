import { sequelize } from "./db.js";

async function checkColumns() {
    try {
        console.log("🕵️ Checking columns in 'users' table...");
        const [results] = await sequelize.query("DESCRIBE users");
        console.log("Columns found:");
        results.forEach(col => console.log(`- ${col.Field} (${col.Type})`));
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to check columns:", error);
        process.exit(1);
    }
}

checkColumns();
