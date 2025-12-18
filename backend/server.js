import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { PORT } from "./config.js";
import { connectDB, sequelize } from "./db.js";
import roomRoutes from "./routes/roomRoutes.js";
import { socketHandler } from "./socket.js";

const app = express();
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(express.json());

// Routes
app.use("/api/rooms", roomRoutes);

// Start HTTP server
const server = http.createServer(app);

// WebSocket server
const io = new Server(server, {
    cors: { origin: "*" }
});
socketHandler(io);

const maskedHost = DB_CONFIG.HOST ? (DB_CONFIG.HOST.length > 5 ? DB_CONFIG.HOST.substring(0, 5) + "..." : DB_CONFIG.HOST) : "undefined";
console.log(`📡 Attempting to connect to DB at host: ${maskedHost}...`);

connectDB()
    .then(async () => {
        console.log("🛠️ Syncing database models...");
        await sequelize.sync({ alter: true });
        console.log("✅ Database synced and schema updated successfully");
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("❌ Database connection failed!");
        console.error("Error Details:", err.message);
        console.error("Error Code:", err.original?.code || err.code);
        process.exit(1);
    });
