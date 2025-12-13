import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { PORT } from "./config.js";
import { connectDB, sequelize } from "./db.js";
import roomRoutes from "./routes/roomRoutes.js";
import { socketHandler } from "./socket.js";

const app = express();
app.use(cors());
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

// Start server
server.listen(PORT, async () => {
    await connectDB();
    await sequelize.sync();
    console.log(`🚀 Server running on port ${PORT}`);
});
