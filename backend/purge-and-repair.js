import { sequelize, User } from "./models/index.js";

async function purgeIndexesAndRepair() {
    try {
        console.log("📡 Starting Automated Index Purge...");

        // 1. Get all indexes on 'users' table
        const [results] = await sequelize.query("SHOW INDEX FROM users");

        // 2. Identify duplicate email indexes (usually named email_2, email_3, etc.)
        const indexesToDrop = results
            .filter(idx => idx.Column_name === 'email' && idx.Key_name !== 'email' && idx.Key_name !== 'PRIMARY')
            .map(idx => idx.Key_name);

        const duplicateUsernames = results
            .filter(idx => idx.Column_name === 'username' && idx.Key_name !== 'username' && idx.Key_name !== 'PRIMARY')
            .map(idx => idx.Key_name);

        const allToDrop = [...new Set([...indexesToDrop, ...duplicateUsernames])];

        if (allToDrop.length === 0) {
            console.log("ℹ️ No duplicate indexes found to purge.");
        } else {
            console.log(`🗑️ Found ${allToDrop.length} duplicate indexes. Purging...`);
            for (const indexName of allToDrop) {
                try {
                    await sequelize.query(`ALTER TABLE users DROP INDEX ${indexName}`);
                    console.log(`✅ Dropped index: ${indexName}`);
                } catch (dropErr) {
                    console.warn(`⚠️ Failed to drop ${indexName}: ${dropErr.message}`);
                }
            }
        }

        // 3. Now try the repair again
        console.log("🛠️ Retrying database synchronization...");
        await sequelize.sync({ alter: true });

        console.log("🎉 Database repaired and indexes purged successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Critical Failure during purge/repair:", error);
        process.exit(1);
    }
}

purgeIndexesAndRepair();
