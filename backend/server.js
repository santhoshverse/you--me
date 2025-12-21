import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { PORT, DB_CONFIG } from "./config.js";
import { connectDB, sequelize } from "./db.js";
import roomRoutes from "./routes/roomRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { socketHandler } from "./socket.js";

// Production Server Initialization
const app = express();
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/rooms", roomRoutes);
app.use("/api/auth", authRoutes);

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
        server.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Server running on port ${PORT} (0.0.0.0)`);
        });
    })
    .catch((err) => {
        console.error("❌ Database connection failed!");
        console.error("Error Message:", err.message);
        if (err.original) {
            console.error("Original Error Details:", err.original);
        }
        // Ensure process exits so Render can restart it
        setTimeout(() => process.exit(1), 1000);
    });

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
