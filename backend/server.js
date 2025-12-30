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

// File Uploads (Local Streaming)
import multer from "multer";
import fs from "fs";
import path from "path";

// Ensure uploads dir exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // Sanitize filename and add timestamp to avoid collisions
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + "-" + file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_"));
    }
});

const upload = multer({ storage: storage });

// Serve uploaded files statically
app.use("/uploads", express.static("uploads"));

// Upload Endpoint
app.post("/api/upload", upload.single("video"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Return the URL that clients can use to access the file
    // Assumes server is reachable at the host/port in frontend config
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ streamUrl: fileUrl, filename: req.file.originalname });
});


// Start HTTP server
const server = http.createServer(app);

// WebSocket server
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true
});
socketHandler(io);

const maskedHost = DB_CONFIG.HOST ? (DB_CONFIG.HOST.length > 5 ? DB_CONFIG.HOST.substring(0, 5) + "..." : DB_CONFIG.HOST) : "undefined";
console.log(`📡 Attempting to connect to DB at host: ${maskedHost}...`);

// Start HTTP server immediately to satisfy Render's port binding requirement
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT} (0.0.0.0)`);
});

connectDB()
    .then(async () => {
        console.log("🛠️ Syncing database models...");
        await sequelize.sync();
        console.log("✅ Database synced and schema updated successfully");
    })
    .catch((err) => {
        console.error("❌ Database connection failed!");
        console.error("Error Message:", err.message);
        if (err.original) {
            console.error("Original Error Details:", err.original);
        }
        // Do not exit process to keep the server alive for debugging/logging
        // The app will run in a degraded state (no DB persistence)
    });

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
